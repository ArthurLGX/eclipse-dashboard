'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddClientModal from '@/app/dashboard/clients/AddClientModal';
import Image from 'next/image';
import { 
  IconSettings, 
  IconPlayerPause, 
  IconPlayerPlay,
  IconAlertCircle,
  IconFilter,
  IconCheck,
  IconX,
  IconUser,
  IconTarget,
  IconTrash,
  IconBriefcase,
  IconBuilding,
  IconSearch,
  IconSparkles,
  IconSend,
  IconRefresh,
  IconPlug,
} from '@tabler/icons-react';
import DataTable, { Column, CustomAction } from '@/app/components/DataTable';
import { Switch } from '@/components/ui/switch';
import LeadDetailModal from '@/app/components/LeadDetailModal';
import TaskDetailModal from '@/app/components/TaskDetailModal';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import InstructionIADrawer from '@/app/components/InstructionIADrawer';
import WalegoSimulationDrawer from '@/app/components/WalegoSimulationDrawer';
import SFUOnboarding, { hasSeenSFUOnboarding } from '@/app/components/onboarding/SFUOnboarding';
import SyncInboxToast from '@/app/components/SyncInboxToast';
import { DailyDigestCard } from '@/app/components/smart-follow-up/DailyDigestCard';
import { SourcesManager } from '@/app/components/smart-follow-up/SourcesManager';
import { usePopup } from '@/app/context/PopupContext';
import { 
  useSmartFollowUpStats, 
  useFollowUpTasks, 
  useAutomationActions,
  useAutomationSettings,
  useDailyDigest,
} from '@/hooks/useSmartFollowUp';
import { 
  approveAutomationAction, 
  rejectAutomationAction, 
  updateFollowUpTask,
  deleteFollowUpTask,
  updateAutomationSettings,
} from '@/lib/smart-follow-up-api';
import { addClientUser, syncInboxStream, type ProcessedEmail } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { clearCache } from '@/hooks/useApi';
import { extractWalegoLeadName } from '@/utils/walego-lead-status';
import { getDefaultContactAvatar } from '@/lib/jazz-avatar';
import type { AutomationAction, FollowUpTask } from '@/types/smart-follow-up';
import type { CreateClientData } from '@/types';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'il y a quelques secondes';
  if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `il y a ${Math.floor(diffInSeconds / 86400)}j`;
  return `il y a ${Math.floor(diffInSeconds / 2592000)} mois`;
}

export default function SmartFollowUpPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const { data: stats, isLoading: statsLoading } = useSmartFollowUpStats();
  const { data: tasks, mutate: mutateTasks } = useFollowUpTasks();
  const { data: allActions, mutate: mutateActions } = useAutomationActions('pending');
  const { data: sentActions = [], mutate: mutateSentActions } = useAutomationActions(['executed', 'failed']);
  const { data: settings, mutate: mutateSettings } = useAutomationSettings();
  const { data: todayDigest } = useDailyDigest();
  
  const [activeTab, setActiveTab] = useState<'actions' | 'tasks' | 'sent' | 'sources'>('actions');
  const [filterSentStatus, setFilterSentStatus] = useState<'Tous' | 'Envoyés' | 'Échoués'>('Tous');
  const [selectedAction, setSelectedAction] = useState<AutomationAction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLowScoreEmails, setShowLowScoreEmails] = useState(false);
  const [cleaningNonICP, setCleaningNonICP] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; task: FollowUpTask | null }>({
    isOpen: false,
    task: null,
  });
  const [selectedTask, setSelectedTask] = useState<FollowUpTask | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showInstructionDrawer, setShowInstructionDrawer] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [filterPrio, setFilterPrio] = useState<'Toutes' | 'Urgent' | 'Prioritaire' | 'Normal'>('Toutes');
  const [filterStatut, setFilterStatut] = useState<'Tous' | 'En attente' | 'Annulé' | 'Terminé'>('Tous');
  const [showSimulationDrawer, setShowSimulationDrawer] = useState(false);
  const [addClientModal, setAddClientModal] = useState<{
    isOpen: boolean;
    initialData?: Partial<CreateClientData>;
  }>({ isOpen: false });
  const [syncingEmails, setSyncingEmails] = useState(false);
  const [syncToast, setSyncToast] = useState<{
    isOpen: boolean;
    loading: boolean;
    processedEmails: Array<{
      name: string;
      email: string;
      snippet: string;
      confidence: number;
      status: 'lead' | 'rejected' | 'duplicate';
      reason: string;
    }>;
  }>({ isOpen: false, loading: false, processedEmails: [] });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !hasSeenSFUOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  // min_score_threshold est sur 15 points, confidence_score est 0-1 → seuil = threshold/15
  const minScoreThreshold = (settings?.icp_settings?.min_score_threshold ?? 3) / 15;
  const priorityKeywords = settings?.priority_keywords ?? [];

  const isLeadFromPriorityDomain = (action: AutomationAction): boolean => {
    if (priorityKeywords.length === 0) return false;
    const email = action.client?.email || action.proposed_content?.to?.[0] || '';
    const domain = email.includes('@') ? email.split('@')[1]?.toLowerCase() : '';
    const domainBase = domain?.split('.')[0] ?? '';
    return priorityKeywords.some((kw) => {
      const k = kw.toLowerCase().trim();
      return domain?.includes(k) || domainBase?.includes(k) || k.includes(domainBase);
    });
  };

  const qualifiedActions = allActions?.filter((a) => {
    const meetsScore = a.confidence_score >= minScoreThreshold;
    const fromPriorityDomain = isLeadFromPriorityDomain(a);
    return meetsScore || fromPriorityDomain;
  }) ?? [];
  const nonQualifiedActions = allActions?.filter((a) => {
    const meetsScore = a.confidence_score >= minScoreThreshold;
    const fromPriorityDomain = isLeadFromPriorityDomain(a);
    return !meetsScore && !fromPriorityDomain;
  }) ?? [];
  // Filtrage par source (email / whatsapp / both)
  const sourceFilter = (settings?.source_filter as 'both' | 'email' | 'whatsapp') || 'both';
  const notificationChannel = (settings?.notification_preferences as { channel?: 'both' | 'email' | 'whatsapp' })?.channel || 'both';
  const enabledLeadSourcesCount =
    Array.isArray(settings?.lead_sources) && settings.lead_sources.length > 0
      ? settings.lead_sources.filter((s) => s.enabled).length
      : 3;

  const isActionWhatsApp = (a: AutomationAction) => {
    const ctx = a.follow_up_task?.context;
    const fromEmail = a.follow_up_task?.received_email?.from_email ?? '';
    const subject = a.proposed_content?.subject ?? '';
    return ctx?.source === 'whatsapp' || fromEmail?.endsWith('@whatsapp') || subject?.startsWith('WhatsApp ·');
  };
  const filterBySource = (list: AutomationAction[]) => {
    if (sourceFilter === 'both') return list;
    return list.filter((a) => {
      const isWa = isActionWhatsApp(a);
      if (sourceFilter === 'whatsapp') return isWa;
      if (sourceFilter === 'email') return !isWa;
      return true;
    });
  };

  const baseActions = showLowScoreEmails ? allActions : qualifiedActions;
  const actions = useMemo(() => filterBySource(baseActions ?? []), [baseActions, sourceFilter]);

  const handleToggleSystem = async (newEnabled?: boolean) => {
    if (!settings?.documentId) {
      showGlobalPopup('⚠️ Veuillez d\'abord configurer le système', 'warning');
      router.push('/dashboard/smart-follow-up/settings');
      return;
    }

    setTogglingPause(true);
    try {
      const enabled = newEnabled ?? !settings.enabled;
      await updateAutomationSettings(settings.documentId, { enabled });
      mutateSettings();
      showGlobalPopup(enabled ? '✓ Smart Follow-Up activé' : '⏸️ Smart Follow-Up mis en pause', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showGlobalPopup('Erreur lors du changement d\'état', 'error');
    } finally {
      setTogglingPause(false);
    }
  };

  const handleSourceFilterChange = async (value: 'both' | 'email' | 'whatsapp') => {
    if (!settings?.documentId) return;
    setSavingFilter(true);
    try {
      await updateAutomationSettings(settings.documentId, { source_filter: value });
      mutateSettings();
    } catch {
      showGlobalPopup('Erreur mise à jour filtre', 'error');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleNotificationChannelChange = async (value: 'both' | 'email' | 'whatsapp') => {
    if (!settings?.documentId) return;
    setSavingFilter(true);
    try {
      const prefs = (settings.notification_preferences as Record<string, unknown>) || {};
      await updateAutomationSettings(settings.documentId, {
        notification_preferences: {
          email: (prefs.email as boolean) ?? true,
          dashboard: (prefs.dashboard as boolean) ?? true,
          frequency: (prefs.frequency as string) ?? 'daily',
          ...prefs,
          channel: value,
        },
      });
      mutateSettings();
    } catch {
      showGlobalPopup('Erreur mise à jour notifications', 'error');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleRefetchEmails = async () => {
    setSyncingEmails(true);
    setSyncToast({ isOpen: true, loading: true, processedEmails: [] });
    try {
      const result = await syncInboxStream((email: ProcessedEmail) => {
        setSyncToast((prev) => ({
          ...prev,
          processedEmails: [...prev.processedEmails, email],
        }));
      });
      setSyncToast((prev) => ({ ...prev, loading: false }));
      const { synced, skipped, errors } = result;
      if (errors.length > 0) {
        showGlobalPopup(`Sync terminé avec ${errors.length} erreur(s). ${synced} email(s) récupéré(s).`, 'warning');
      } else if (synced > 0 || skipped > 0) {
        showGlobalPopup(`${synced} email(s) récupéré(s)${skipped > 0 ? `, ${skipped} ignoré(s)` : ''}. Les leads apparaîtront sous ~1 min.`, 'success');
      } else {
        showGlobalPopup('Aucun nouvel email trouvé.', 'info');
      }
      mutateActions();
      mutateTasks();
    } catch (error) {
      console.error('Refetch emails error:', error);
      setSyncToast({ isOpen: false, loading: false, processedEmails: [] });
      showGlobalPopup(error instanceof Error ? error.message : 'Erreur lors de la récupération des emails', 'error');
    } finally {
      setSyncingEmails(false);
    }
  };

  const handleQualifyLead = async (action: AutomationAction, status: 'qualified' | 'rejected') => {
    try {
      if (status === 'qualified') {
        await approveAutomationAction(action.documentId);
        showGlobalPopup('✓ Lead qualifié', 'success');
      } else {
        await rejectAutomationAction(action.documentId, 'Lead non qualifié');
        showGlobalPopup('Lead rejeté', 'info');
      }
      mutateActions();
      mutateSentActions();
    } catch (error) {
      console.error('Erreur:', error);
      showGlobalPopup('Erreur', 'error');
    }
  };

  const handleAddClient = async (clientData: CreateClientData) => {
    if (!user?.id) {
      showGlobalPopup(t('error_not_authenticated') || 'Vous devez être connecté', 'error');
      throw new Error('Not authenticated');
    }
    try {
      await addClientUser(user.id, {
        name: clientData.name,
        email: clientData.email,
        number: clientData.number || '',
        enterprise: clientData.enterprise || '',
        adress: clientData.adress || '',
        website: clientData.website || '',
        processStatus: clientData.processStatus,
        isActive: clientData.isActive,
      });
      showGlobalPopup(t('client_added_success') || 'Contact créé avec succès', 'success');
      clearCache('clients');
      mutateActions();
      setAddClientModal({ isOpen: false });
    } catch (err) {
      throw err;
    }
  };

  const handleCleanNonICP = async () => {
    if (!nonQualifiedActions || nonQualifiedActions.length === 0) return;

    if (!confirm(`Rejeter ${nonQualifiedActions.length} emails non qualifiés ?`)) return;

    setCleaningNonICP(true);
    try {
      let rejected = 0;
      for (const action of nonQualifiedActions) {
        try {
          await rejectAutomationAction(action.documentId, `Score ICP < ${Math.round(minScoreThreshold * 100)}%`);
          rejected++;
        } catch (error) {
          console.error(`Erreur:`, error);
        }
      }
      mutateActions();
      showGlobalPopup(`✓ ${rejected} emails rejetés`, 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showGlobalPopup('Erreur', 'error');
    } finally {
      setCleaningNonICP(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteModal.task?.documentId) return;
    
    try {
      await deleteFollowUpTask(deleteModal.task.documentId);
      showGlobalPopup('Tâche supprimée', 'success');
      mutateTasks();
      setDeleteModal({ isOpen: false, task: null });
    } catch (error) {
      console.error('Erreur:', error);
      showGlobalPopup('Erreur lors de la suppression', 'error');
    }
  };

  const handleUpdateTask = (task: FollowUpTask, updates: Partial<FollowUpTask>) => {
    updateFollowUpTask(task.documentId, updates)
      .then(() => {
        mutateTasks();
        showGlobalPopup('Tâche mise à jour', 'success');
      })
      .catch((error) => {
        console.error('Erreur:', error);
        showGlobalPopup('Erreur', 'error');
      });
  };

const getContactType = (action: AutomationAction) => {
    const subject = action.proposed_content.subject.toLowerCase();
    const body = action.proposed_content.body.toLowerCase();
    const text = `${subject} ${body}`;

    if (text.includes('freelance') || text.includes('indépendant')) return { label: 'Freelance', icon: IconUser, color: 'text-blue-500' };
    if (text.includes('agence') || text.includes('agency')) return { label: 'Agence', icon: IconBriefcase, color: 'text-purple-500' };
    if (text.includes('b2b') || text.includes('entreprise')) return { label: 'B2B', icon: IconBuilding, color: 'text-green-500' };
    return { label: 'B2C', icon: IconUser, color: 'text-orange-500' };
  };

  const getSourceBadge = (action: AutomationAction) => {
    const ctx = action.follow_up_task?.context;
    const fromEmail = action.follow_up_task?.received_email?.from_email ?? '';
    const subject = action.proposed_content?.subject ?? '';

    if (ctx?.source === 'whatsapp' || fromEmail?.endsWith('@whatsapp') || subject?.startsWith('WhatsApp ·')) {
      return { label: 'WhatsApp', color: 'bg-[#25d366]/15 text-[#25d366]' };
    }
    if (ctx?.source === 'contact') return { label: 'Contact', color: 'bg-emerald-100 text-emerald-700' };
    if (fromEmail?.toLowerCase().includes('walego') || subject?.toLowerCase().includes('walego')) {
      return { label: 'Walego', color: 'bg-blue-100 text-blue-700' };
    }
    if (fromEmail?.toLowerCase().includes('folk') || subject?.toLowerCase().includes('folk')) {
      return { label: 'Folk', color: 'bg-purple-100 text-purple-700' };
    }
    if (ctx?.source === 'inbound' || subject?.toLowerCase().includes('inbound')) {
      return { label: 'Inbound', color: 'bg-orange-100 text-orange-700' };
    }
    return { label: 'Email', color: 'bg-gray-100 text-gray-700' };
  };

  const isSystemEnabled = settings?.enabled ?? true;

  // Filtrage des tâches
  const getTaskPriority = (task: FollowUpTask): 'Urgent' | 'Prioritaire' | 'Normal' => {
    const u = task.ai_analysis?.urgency;
    if (u === 'urgent') return 'Urgent';
    if (u === 'high') return 'Prioritaire';
    return 'Normal';
  };
  const getTaskStatusLabel = (task: FollowUpTask): string => {
    const s = task.status_follow_up;
    if (s === 'pending' || s === 'in_progress') return 'En attente';
    if (s === 'cancelled') return 'Annulé';
    if (s === 'completed') return 'Terminé';
    return 'En attente';
  };

  const filteredTasks = useMemo(() => {
    const list = tasks || [];
    return list.filter(t => {
      const mp = filterPrio === 'Toutes' || getTaskPriority(t) === filterPrio;
      const ms = filterStatut === 'Tous' || getTaskStatusLabel(t) === filterStatut;
      const contact = (t.contact?.name || t.context?.from_name || t.context?.from_email || '').toLowerCase();
      const subject = (t.context?.original_subject || '').toLowerCase();
      const mq = !taskSearch || contact.includes(taskSearch.toLowerCase()) || subject.includes(taskSearch.toLowerCase());
      return mp && ms && mq;
    });
  }, [tasks, filterPrio, filterStatut, taskSearch]);

  const taskCounts = useMemo(() => ({
    attente: (tasks || []).filter(t => getTaskStatusLabel(t) === 'En attente').length,
    annule: (tasks || []).filter(t => getTaskStatusLabel(t) === 'Annulé').length,
    urgent: (tasks || []).filter(t => getTaskPriority(t) === 'Urgent').length,
  }), [tasks]);

  const filteredSentActions = useMemo(() => {
    const list = sentActions || [];
    if (filterSentStatus === 'Tous') return list;
    if (filterSentStatus === 'Envoyés') return list.filter(a => a.status_automation_action === 'executed');
    return list.filter(a => a.status_automation_action === 'failed');
  }, [sentActions, filterSentStatus]);

  const getContentSent = (action: AutomationAction) =>
    (action.edited_content as { subject?: string; body?: string; to?: string[] } | null) || action.proposed_content;

  const getBodyPreview = (body: string | undefined, maxLen = 120) => {
    if (!body) return '—';
    const text = body.replace(/<[^>]*>/g, '').trim();
    return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
  };

  // Colonnes pour les actions (leads)
  const actionColumns: Column<AutomationAction>[] = useMemo(() => [
    {
      key: 'client',
      label: 'Contact',
      render: (_, action) => {
        const contactType = getContactType(action);
        const ContactIcon = contactType.icon;
        const isLowScore = action.confidence_score < minScoreThreshold;
        const fromPriorityDomain = isLeadFromPriorityDomain(action);
        const avatarPath = action.avatar_path ?? getDefaultContactAvatar(action.client?.documentId ?? action.documentId).avatarUrl;
        const displayName = action.client?.name ?? extractWalegoLeadName(action.proposed_content.subject) ?? 'Contact inconnu';

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                !action.avatar_path && (fromPriorityDomain ? 'bg-emerald-100' : isLowScore ? 'bg-red-100' : 'bg-accent/10')
              }`}
            >
              {avatarPath ? (
                <>
                  <Image
                    src={avatarPath}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div
                    className={`w-full h-full hidden items-center justify-center ${
                      fromPriorityDomain ? 'bg-emerald-100' : isLowScore ? 'bg-red-100' : 'bg-accent/10'
                    }`}
                  >
                    <ContactIcon className={`w-5 h-5 ${fromPriorityDomain ? 'text-emerald-600' : isLowScore ? 'text-red-500' : contactType.color}`} />
                  </div>
                </>
              ) : (
                <ContactIcon className={`w-5 h-5 ${fromPriorityDomain ? 'text-emerald-600' : isLowScore ? 'text-red-500' : contactType.color}`} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-primary truncate">
                  {displayName}
                </p>
                {fromPriorityDomain && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700">
                    Priorité domaine
                  </span>
                )}
                {!fromPriorityDomain && isLowScore && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-600">
                    Non qualifié
                  </span>
                )}
              </div>
              <p className="text-xs text-muted truncate">{action.client?.email || 'aucun email'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'subject',
      label: 'Sujet',
      className: 'min-w-[280px]',
      render: (_, action) => {
        const name = action.client?.name ?? extractWalegoLeadName(action.proposed_content.subject) ?? 'Contact';
        const title = action.lead_title || '';
        const preview = action.follow_up_task?.context?.lead_response_preview as string | undefined;
        const subjectLine = [name, title].filter(Boolean).join(' · ');
        const previewLine = preview ? `"${preview}"` : '';
        return (
          <div className="min-w-0 break-words">
            <p className="text-sm font-medium text-primary mb-0.5">
              {subjectLine || action.proposed_content.subject}
            </p>
            {previewLine ? (
              <p className="text-xs text-muted italic break-words">
                {previewLine}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, action) => {
        const contactType = getContactType(action);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${contactType.color} bg-current/10`}>
            {contactType.label}
          </span>
        );
      },
    },
    {
      key: 'source',
      label: 'Source',
      render: (_, action) => {
        const badge = getSourceBadge(action);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'score',
      label: 'Score ICP',
      render: (_, action) => {
        const fromPriorityDomain = isLeadFromPriorityDomain(action);
        const displayScore = fromPriorityDomain ? 1 : action.confidence_score;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
              fromPriorityDomain || displayScore >= 0.8
                ? 'bg-success-light text-success-text' 
                : displayScore >= 0.6
                  ? 'bg-warning-light text-warning-text'
                  : 'bg-error-light text-error-text'
            }`}>
              {fromPriorityDomain ? '100%' : `${(action.confidence_score * 100).toFixed(0)}%`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Reçu',
      render: (_, action) => (
        <span className="text-xs text-muted whitespace-nowrap">
          {formatRelativeTime(new Date(action.createdAt))}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, action) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {!action.client && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const email = action.proposed_content?.to?.[0] || '';
                const nameFromSubject = extractWalegoLeadName(action.proposed_content?.subject || '');
                setAddClientModal({
                  isOpen: true,
                  initialData: {
                    name: nameFromSubject || email?.split('@')[0] || '',
                    email,
                    enterprise: action.lead_title || '',
                  },
                });
              }}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:opacity-90"
              title="Créer fiche contact"
            >
              <IconUser className="w-3.5 h-3.5 !text-white" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQualifyLead(action, 'qualified');
            }}
            className="px-2 py-1 bg-success text-white rounded text-xs font-medium hover:opacity-90"
            title="Qualifier"
          >
            <IconCheck className="w-3.5 h-3.5 !text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQualifyLead(action, 'rejected');
            }}
            className="px-2 py-1 bg-danger rounded text-xs font-medium hover:bg-danger"
            title="Rejeter"
          >
            <IconX className="w-3.5 h-3.5 !text-white" />
          </button>
        </div>
      ),
    },
  ], [minScoreThreshold, priorityKeywords, handleQualifyLead, isLeadFromPriorityDomain]);

  // Colonnes pour les tâches
  const taskColumns: Column<FollowUpTask>[] = useMemo(() => [
    {
      key: 'contact',
      label: 'Contact',
      render: (_, task) => (
        <div className="min-w-0">
          <p className="font-medium text-primary truncate">
            {task.contact?.name || task.context?.from_name || extractWalegoLeadName(task.context?.original_subject || task.received_email?.subject || '') || task.context?.from_email || 'Contact inconnu'}
          </p>
          {task.context?.from_email && (
            <p className="text-xs text-muted truncate">{task.context.from_email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Sujet',
      className: 'min-w-[280px]',
      render: (_, task) => (
        <p className="text-sm text-primary break-words">
          {task.context?.original_subject || 'N/A'}
        </p>
      ),
    },
    {
      key: 'task_type',
      label: 'Type',
      render: (_, task) => (
        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-600 whitespace-nowrap">
          {task.task_type === 'payment_reminder' ? 'Relance paiement' :
           task.task_type === 'proposal_follow_up' ? 'Suivi devis' :
           task.task_type === 'meeting_follow_up' ? 'Suivi réunion' :
           task.task_type === 'check_in' ? 'Prise de nouvelles' :
           task.task_type === 'thank_you' ? 'Remerciement' : 'Autre'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_, task) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
          task.status_follow_up === 'pending' ? 'bg-info-light text-info-text' :
          task.status_follow_up === 'in_progress' ? 'bg-warning-light text-warning-text' :
          task.status_follow_up === 'completed' ? 'bg-success-light text-success-text' :
          'bg-muted text-muted'
        }`}>
          {task.status_follow_up === 'pending' ? 'En attente' :
           task.status_follow_up === 'in_progress' ? 'En cours' :
           task.status_follow_up === 'completed' ? 'Terminé' :
           task.status_follow_up === 'cancelled' ? 'Annulé' : 'Échoué'}
        </span>
      ),
    },
    {
      key: 'ai_analysis',
      label: 'Analyse',
      render: (_, task) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {task.ai_analysis?.sentiment && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
              task.ai_analysis.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
              task.ai_analysis.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {task.ai_analysis.sentiment === 'positive' ? '😊' :
               task.ai_analysis.sentiment === 'negative' ? '😟' : '😐'}
            </span>
          )}
          {task.ai_analysis?.urgency && (
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
              task.ai_analysis.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
              task.ai_analysis.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
              task.ai_analysis.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {task.ai_analysis.urgency === 'urgent' ? 'URGENT' :
               task.ai_analysis.urgency === 'high' ? 'Prioritaire' :
               task.ai_analysis.urgency === 'medium' ? 'Normal' : 'Faible'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'scheduled_for',
      label: 'Planifié',
      render: (_, task) => (
        <span className="text-xs text-muted whitespace-nowrap">
          {new Date(task.scheduled_for).toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      ),
    },
    {
      key: 'task_actions',
      label: 'Actions',
      render: (_, task) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpdateTask(task, { 
                status_follow_up: task.status_follow_up === 'cancelled' ? 'pending' : 'cancelled' 
              });
            }}
            disabled={task.status_follow_up === 'completed'}
            className="p-1.5 hover:bg-secondary rounded transition-colors disabled:opacity-50"
            title={task.status_follow_up === 'cancelled' ? 'Réactiver' : 'Mettre en pause'}
          >
            {task.status_follow_up === 'cancelled' ? (
              <IconPlayerPlay className="w-4 h-4 text-success" />
            ) : (
              <IconPlayerPause className="w-4 h-4 text-warning" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ isOpen: true, task });
            }}
            className="p-1.5 hover:bg-secondary rounded transition-colors"
            title="Supprimer"
          >
            <IconTrash className="w-4 h-4 text-error" />
          </button>
        </div>
      ),
    },
  ], [handleUpdateTask, setDeleteModal]);

  // Colonnes pour l'historique des relances envoyées
  const sentColumns: Column<AutomationAction>[] = useMemo(() => [
    {
      key: 'client',
      label: 'Contact',
      render: (_, action) => (
        <div className="min-w-0">
          <p className="font-medium text-primary truncate">
            {action.client?.name ?? extractWalegoLeadName(action.proposed_content?.subject) ?? 'Contact inconnu'}
          </p>
          <p className="text-xs text-muted truncate">{action.client?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'to',
      label: 'Destinataire(s)',
      render: (_, action) => {
        const content = getContentSent(action);
        const to = content?.to;
        const toStr = Array.isArray(to) ? to.join(', ') : typeof to === 'string' ? to : '—';
        return <span className="text-sm truncate max-w-[200px] block" title={toStr}>{toStr || '—'}</span>;
      },
    },
    {
      key: 'subject',
      label: 'Sujet',
      className: 'min-w-[200px]',
      render: (_, action) => {
        const content = getContentSent(action);
        return <p className="text-sm text-primary truncate">{content?.subject || '—'}</p>;
      },
    },
    {
      key: 'body_preview',
      label: 'Contenu envoyé',
      className: 'max-w-[280px]',
      render: (_, action) => {
        const content = getContentSent(action);
        const preview = getBodyPreview(content?.body);
        return (
          <p className="text-xs text-muted truncate" title={preview}>
            {preview}
          </p>
        );
      },
    },
    {
      key: 'executed_at',
      label: 'Date d\'envoi',
      render: (_, action) => (
        <span className="text-xs text-muted whitespace-nowrap">
          {action.executed_at
            ? new Date(action.executed_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'status_sent',
      label: 'Statut',
      render: (_, action) => {
        const isSuccess = action.status_automation_action === 'executed';
        const msg = isSuccess
          ? 'Envoyé'
          : (action.execution_result as { message?: string })?.message || 'Échec';
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              isSuccess ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text'
            }`}
            title={!isSuccess ? msg : undefined}
          >
            {isSuccess ? '✓ Envoyé' : '✗ Échec'}
          </span>
        );
      },
    },
  ], []);

  const handleDeleteMultipleTasks = async (tasksToDelete: FollowUpTask[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const task of tasksToDelete) {
      if (!task.documentId) continue;
      try {
        await deleteFollowUpTask(task.documentId);
        successCount++;
      } catch (error) {
        console.error(`Erreur suppression tâche ${task.id}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showGlobalPopup(
        `${successCount} tâche(s) supprimée(s)`,
        errorCount > 0 ? 'warning' : 'success'
      );
    }

    if (errorCount > 0) {
      showGlobalPopup(`${errorCount} erreur(s)`, 'error');
    }

    mutateTasks();
  };

  const aiInstruction = settings?.ai_instruction ?? '';
  const aiInstructionHistory = settings?.ai_instruction_history ?? [];
  const hasAiInstruction = !!aiInstruction?.trim();

  const handleSaveAiInstruction = async (instruction: string) => {
    if (!settings?.documentId) return;
    const prev = aiInstruction?.trim();
    const newHistory = prev && prev !== instruction
      ? [prev, ...aiInstructionHistory.filter((h) => h !== prev)].slice(0, 10)
      : aiInstructionHistory;
    await updateAutomationSettings(settings.documentId, {
      ai_instruction: instruction,
      ai_instruction_history: newHistory,
    });
    mutateSettings();
    showGlobalPopup('✓ Instruction IA enregistrée', 'success');
  };

  const customTaskActions: CustomAction<FollowUpTask>[] = useMemo(() => [
    {
      label: 'Mettre en pause',
      icon: <IconPlayerPause className="w-4 h-4" />,
      onClick: async (tasksToUpdate) => {
        tasksToUpdate.forEach(task => handleUpdateTask(task, { status_follow_up: 'cancelled' }));
      },
      variant: 'warning',
    },
    {
      label: 'Marquer comme terminé',
      icon: <IconCheck className="w-4 h-4" />,
      onClick: async (tasksToUpdate) => {
        tasksToUpdate.forEach(task => handleUpdateTask(task, { status_follow_up: 'completed' }));
      },
      variant: 'success',
    },
  ], [handleUpdateTask]);

  return (
    <>
      <div className="min-h-screen w-full flex flex-col justify-start ">
        {/* Header épuré */}
        <div className="border-b flex justify-center border-default">
          <div className="w-full py-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="!text-[20px] font-bold tracking-tight !text-primary">Smart Follow-Up</h1>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full !text-[11px] font-semibold ${
                    isSystemEnabled ? 'bg-emerald-100 !text-emerald-600' : 'bg-muted !text-muted'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSystemEnabled ? 'bg-emerald-500' : 'bg-muted'}`} />
                    {isSystemEnabled ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefetchEmails}
                  disabled={syncingEmails}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg !text-xs font-medium !text-primary border border-default hover:bg-hover transition-colors disabled:opacity-50"
                  title={t('sync_inbox') || 'Récupérer les emails reçus'}
                >
                  <IconRefresh className={`w-3.5 h-3.5 ${syncingEmails ? 'animate-spin' : ''}`} />
                  {t('sync_inbox') || 'Récupérer les emails'}
                </button>
                <button
                  onClick={() => router.push('/dashboard/smart-follow-up/settings#icp')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg !text-xs font-medium !text-primary border border-default hover:bg-hover transition-colors"
                >
                  <IconTarget className="w-3.5 h-3.5" />
                  ICP
                </button>
                <button
                  onClick={() => setShowInstructionDrawer(true)}
                  className={`flex items-center gap-1.5 px-3 py-2  !text-xs font-medium transition-colors ${
                    showInstructionDrawer
                      ? 'bg-primary !text-white rounded-lg'
                      : 'bg-secondary !text-primary border border-default hover:bg-hover rounded-lg'
                  }`}
                >
                  <span className={`relative flex ${hasAiInstruction ? 'animate-pulse' : ''}`}>
                    <IconSparkles className="w-3.5 h-3.5" />
                    {hasAiInstruction && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </span>
                  Instruction IA
                  {hasAiInstruction && (
                    <span className="!text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/30">
                      1
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg !text-xs font-medium bg-secondary !text-primary border border-default hover:bg-hover transition-colors"
                >
                  <IconFilter className="w-3.5 h-3.5" />
                  Filtres
                </button>
                {nonQualifiedActions && nonQualifiedActions.length > 0 && (
                  <button
                    onClick={handleCleanNonICP}
                    disabled={cleaningNonICP}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg !text-xs font-medium bg-error/15 border border-error/30 !text-error hover:bg-error/25 transition-colors disabled:opacity-50"
                    title={`Nettoyer ${nonQualifiedActions.length} emails non qualifiés`}
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                    Nettoyer ({nonQualifiedActions.length})
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard/smart-follow-up/settings')}
                  className="group flex items-center gap-1.5 px-3 py-2  !text-xs font-semibold btn-primary transition-all ease-in-out"
                >
                  <IconSettings className="w-3.5 h-3.5 !text-white group-hover:!text-primary" />
                  Paramètres
                </button>
                <Switch
                  checked={!!isSystemEnabled}
                  onCheckedChange={(checked) => handleToggleSystem(checked)}
                  disabled={togglingPause}
                  title={isSystemEnabled ? 'Mettre en pause' : 'Activer'}
                />
              </div>
            </div>

            {/* Tabs pills */}
            <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 w-fit">
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5  !text-sm font-medium transition-all ${
                  activeTab === 'actions' ? 'bg-card !text-primary shadow-sm border border-default rounded-lg' : '!text-muted hover:!text-primary rounded-lg'
                }`}
              >
                Leads
                <span className={`!text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  activeTab === 'actions' ? 'bg-emerald-600 !text-white' : 'bg-muted !text-muted'
                }`}>
                  {qualifiedActions.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5  !text-sm font-medium transition-all ${
                  activeTab === 'sources' ? 'bg-card !text-primary shadow-sm border border-default rounded-lg' : '!text-muted hover:!text-primary rounded-lg'
                }`}
              >
                <IconPlug className="w-3.5 h-3.5" />
                Sources
                <span className={`!text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  activeTab === 'sources' ? 'bg-emerald-600 !text-white' : 'bg-muted !text-muted'
                }`}>
                  {enabledLeadSourcesCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5  !text-sm font-medium transition-all ${
                  activeTab === 'tasks' ? 'bg-card !text-primary shadow-sm border border-default rounded-lg' : '!text-muted hover:!text-primary rounded-lg'
                }`}
              >
                Tâches
                <span className={`!text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  activeTab === 'tasks' ? 'bg-emerald-600 !text-white' : 'bg-muted !text-muted'
                }`}>
                  {tasks?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5  !text-sm font-medium transition-all ${
                  activeTab === 'sent' ? 'bg-card !text-primary shadow-sm border border-default rounded-lg' : '!text-muted hover:!text-primary rounded-lg'
                }`}
              >
                <IconSend className="w-3.5 h-3.5" />
                Envoyés
                <span className={`!text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  activeTab === 'sent' ? 'bg-emerald-600 !text-white' : 'bg-muted !text-muted'
                }`}>
                  {sentActions?.length || 0}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className=" w-full py-6">
          {/* Résumé du jour (Home View quotidienne) */}
          {todayDigest && (todayDigest.totalActionable > 0 || (todayDigest.stalledLeads?.length || 0) > 0) && (
            <DailyDigestCard
              digest={todayDigest}
              userName={user?.firstname || user?.username}
              onOpenLead={(id) => {
                const action = (allActions || []).find((a) => a.documentId === id)
                  ?? (sentActions || []).find((a) => a.documentId === id);
                if (action) {
                  setSelectedAction(action);
                  setShowDetailModal(true);
                }
              }}
            />
          )}

          {/* Bannière instruction IA active */}
          {hasAiInstruction && (
            <>
            <p className="!text-xs !text-primary mb-2">Instruction IA :</p>  
            <div className="p-3 bg-accent-light border border-accent  flex items-center justify-between mb-4 w-fit rounded-lg ">
              <div className="flex items-center gap-2 !text-sm !text-primary min-w-0 flex-1">
                <IconSparkles className="w-4 h-4 shrink-0 text-accent-text" />
                <span className="truncate !text-xs text-primary">{aiInstruction}</span>
              </div>
              <button
                onClick={() => setShowInstructionDrawer(true)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-success-light !text-success-text !text-xs font-medium whitespace-nowrap ml-2 hover:opacity-90 transition-opacity"
              >
                Modifier →
              </button>
            </div>
            </>
          )}

          {/* KPIs */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {[
              { label: 'Qualifiés ICP', value: statsLoading ? '...' : qualifiedActions.length, color: '!text-muted' },
              { label: "Aujourd'hui", value: statsLoading ? '...' : (stats?.dueToday ?? taskCounts.attente), color: '!text-blue-500' },
              { label: 'Cette semaine', value: statsLoading ? '...' : (stats?.sentThisWeek ?? 0), color: '!text-primary' },
              { label: 'Taux de succès', value: statsLoading ? '...' : `${stats?.successRate?.toFixed(0) ?? 0}%`, color: '!text-violet-500' },
            ].map(k => (
              <div key={k.label} className="bg-card flex-1 min-w-[140px] p-3.5 rounded-lg">
                <div className="!text-xs !text-muted mb-1">{k.label}</div>
                <div className={`!text-[22px] font-bold tracking-tight ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Bannière filtre ICP */}
          {activeTab === 'actions' && nonQualifiedActions && nonQualifiedActions.length > 0 && !showLowScoreEmails && (
            <div className="p-3 bg-blue-50 border border-blue-200  flex items-center justify-between mb-4 rounded-lg">
              <div className="flex items-center gap-2 !text-sm !text-blue-600">
                <IconFilter className="w-4 h-4" />
                <span>{nonQualifiedActions.length} emails filtrés (score ICP &lt; {Math.round(minScoreThreshold * 100)}%)</span>
              </div>
              <button onClick={() => setShowLowScoreEmails(true)} className="!text-xs !text-blue-600 hover:underline font-medium">
                Afficher
              </button>
            </div>
          )}
          {activeTab === 'actions' && showLowScoreEmails && nonQualifiedActions && nonQualifiedActions.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200  flex items-center justify-between mb-4 rounded-lg">
              <div className="flex items-center gap-2 !text-sm !text-amber-700">
                <IconAlertCircle className="w-4 h-4" />
                <span>{nonQualifiedActions.length} emails non qualifiés affichés</span>
              </div>
              <button onClick={() => setShowLowScoreEmails(false)} className="!text-xs !text-amber-600 hover:underline font-medium">
                Masquer
              </button>
            </div>
          )}

          {activeTab === 'actions' ? (
            /* LEADS */
            <>
            {/* Filtres Source + Notifications */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="!text-sm !text-muted">Source :</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => handleSourceFilterChange(e.target.value as 'both' | 'email' | 'whatsapp')}
                  disabled={savingFilter}
                  className="!text-sm py-1.5 pl-2 pr-8 rounded-lg border border-default bg-card !text-primary"
                >
                  <option value="both">Les deux</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="!text-sm !text-muted">Notifications :</span>
                <select
                  value={notificationChannel}
                  onChange={(e) => handleNotificationChannelChange(e.target.value as 'both' | 'email' | 'whatsapp')}
                  disabled={savingFilter}
                  className="!text-sm py-1.5 pl-2 pr-8 rounded-lg border border-default bg-card !text-primary"
                >
                  <option value="both">Les deux</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <span className="!text-xs !text-muted ml-auto">
                {actions?.length ?? 0} lead{(actions?.length ?? 0) > 1 ? 's' : ''} affiché{(actions?.length ?? 0) > 1 ? 's' : ''}
              </span>
            </div>
            {(actions?.length ?? 0) === 0 ? (
              <div className="bg-card p-16 text-center rounded-lg">
                <div className="w-14 h-14 bg-muted  flex items-center justify-center mx-auto mb-4 !text-2xl">◎</div>
                <div className="!text-base font-semibold !text-primary mb-1.5">Aucun lead en attente</div>
                <div className="!text-sm !text-muted max-w-xs mx-auto">
                  Les leads qualifiés ICP apparaîtront ici une fois reçus et analysés.
                </div>
              </div>
            ) : (
              <div className="bg-card border border-default  overflow-hidden">
                <DataTable<AutomationAction>
                  columns={actionColumns}
                  data={actions || []}
                  emptyMessage="Aucun lead en attente"
                  onRowClick={(row) => { setSelectedAction(row); setShowDetailModal(true); }}
                  loading={statsLoading}
                />
              </div>
            )}
            </>
          ) : activeTab === 'sources' ? (
            /* SOURCES DE LEADS */
            <div className="bg-card border border-default rounded-lg overflow-visible p-4 mb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-default flex items-center justify-center shrink-0">
                  <IconPlug className="w-4 h-4 !text-primary" />
                </div>
                <div>
                  <h3 className="!text-sm font-semibold !text-primary">Sources de prospection</h3>
                  <p className="font-mono !text-[11px] !text-muted mt-0.5 max-w-2xl">
                    Définissez les outils (domaines, sujets) pour le bypass ICP et les notifications. Identique aux
                    paramètres → Sources de leads.
                  </p>
                </div>
              </div>
              {settings?.documentId ? (
                <SourcesManager settingsId={settings.documentId} initialSources={settings.lead_sources} />
              ) : (
                <div className="p-6 text-center rounded-lg border border-dashed border-default">
                  <p className="!text-sm !text-muted mb-3">Créez d’abord la configuration Smart Follow-Up.</p>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/smart-follow-up/settings')}
                    className="px-4 py-2 rounded-lg bg-primary !text-white !text-xs font-semibold"
                  >
                    Ouvrir les paramètres
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'sent' ? (
            /* RELANCES ENVOYÉES */
            <>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="!text-sm !text-muted">Filtrer par statut :</span>
                <div className="flex gap-1">
                  {(['Tous', 'Envoyés', 'Échoués'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterSentStatus(s)}
                      className={`px-2.5 py-1.5 !text-xs font-medium transition-all whitespace-nowrap ${
                        filterSentStatus === s
                          ? 'bg-muted border border-default !text-primary'
                          : 'bg-card border border-default !text-muted hover:!text-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <span className="ml-auto !text-xs !text-muted">
                  {filteredSentActions.length} relance{filteredSentActions.length > 1 ? 's' : ''} affichée{filteredSentActions.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="bg-card border border-default overflow-hidden">
                <DataTable<AutomationAction>
                  columns={sentColumns}
                  data={filteredSentActions}
                  emptyMessage="Aucune relance envoyée"
                  onRowClick={(row) => { setSelectedAction(row); setShowDetailModal(true); }}
                  loading={statsLoading}
                />
              </div>
            </>
          ) : (
            /* TÂCHES */
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <div className="relative w-64">
                  <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 !text-muted z-10" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Rechercher…"
                    className="w-full !pl-9 !pr-3 py-2 rounded-lg !text-sm border border-default bg-card focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-1">
                  {(['Toutes', 'Urgent', 'Prioritaire', 'Normal'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPrio(p)}
                      className={`px-2.5 py-1.5  !text-xs font-medium transition-all whitespace-nowrap ${
                        filterPrio === p
                          ? 'bg-muted border border-default !text-primary rounded-lg'
                          : 'bg-card border border-default !text-muted hover:!text-primary rounded-lg'
                      }`}
                    >
                      {p !== 'Toutes' && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                        p === 'Urgent' ? 'bg-red-500' : p === 'Prioritaire' ? 'bg-amber-500' : 'bg-muted'
                      }`} />}
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {(['Tous', 'En attente', 'Annulé'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatut(s)}
                      className={`px-2.5 py-1.5  !text-xs font-medium transition-all ${
                        filterStatut === s ? 'bg-muted border border-default !text-primary' : 'bg-card border border-default !text-muted hover:!text-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex gap-3 !text-xs !text-muted items-center">
                  <span><strong className="!text-primary">{taskCounts.attente}</strong> en attente</span>
                  <span><strong className="!text-red-500">{taskCounts.urgent}</strong> urgents</span>
                </div>
              </div>

              <div className="bg-card border border-default  overflow-hidden">
                <DataTable<FollowUpTask>
                  columns={taskColumns}
                  data={filteredTasks}
                  emptyMessage="Aucune tâche trouvée"
                  selectable={true}
                  onRowClick={(row) => {
                    setSelectedTask(row);
                    setShowTaskDetailModal(true);
                  }}
                  onDeleteSelected={handleDeleteMultipleTasks}
                  customActions={customTaskActions}
                  getItemId={(item) => item.documentId || ''}
                  getItemName={(item) => item.contact?.name || item.context?.from_name || 'Contact'}
                  loading={statsLoading}
                />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="!text-xs !text-muted">{filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''} affichée{filteredTasks.length > 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <LeadDetailModal
        action={selectedAction}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAction(null);
        }}
        onSuccess={() => {
          mutateActions();
          mutateSentActions();
          setShowDetailModal(false);
          setSelectedAction(null);
        }}
        hotLeadKeywords={settings?.priority_keywords}
      />

      <RuleManagementModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        rules={settings?.custom_rules || []}
        onSaveRules={async (newRules) => {
          if (settings?.documentId) {
            try {
              await updateAutomationSettings(settings.documentId, { custom_rules: newRules });
              mutateSettings();
              setShowRulesModal(false);
              showGlobalPopup('✓ Règles enregistrées', 'success');
            } catch (error) {
              console.error('Erreur:', error);
              showGlobalPopup('Erreur', 'error');
            }
          }
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, task: null })}
        onConfirm={handleDeleteTask}
        title="Supprimer la tâche"
        itemName={deleteModal.task?.context?.original_subject || 'cette tâche'}
        itemType="tâche"
      />

      <TaskDetailModal
        isOpen={showTaskDetailModal}
        onClose={() => {
          setShowTaskDetailModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        aiInstruction={aiInstruction || undefined}
        hotLeadKeywords={settings?.priority_keywords}
      />

      <AddClientModal
        isOpen={addClientModal.isOpen}
        onClose={() => setAddClientModal({ isOpen: false })}
        onAdd={handleAddClient}
        t={t}
        initialData={addClientModal.initialData}
      />

      <InstructionIADrawer
        isOpen={showInstructionDrawer}
        onClose={() => setShowInstructionDrawer(false)}
        activeInstruction={aiInstruction || ''}
        history={aiInstructionHistory}
        onSave={handleSaveAiInstruction}
      />

      <WalegoSimulationDrawer
        isOpen={showSimulationDrawer}
        onClose={() => setShowSimulationDrawer(false)}
        onOpenAsLead={(simulatedDetail) => {
          setSelectedAction(simulatedDetail);
          setShowDetailModal(true);
        }}
      />

      <SFUOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <SyncInboxToast
        isOpen={syncToast.isOpen}
        loading={syncToast.loading}
        processedEmails={syncToast.processedEmails}
        onClose={() => setSyncToast((s) => ({ ...s, isOpen: false }))}
      />
    </>
  );
}
