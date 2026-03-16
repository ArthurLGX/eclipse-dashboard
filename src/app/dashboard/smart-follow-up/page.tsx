'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@tabler/icons-react';
import DataTable, { Column, CustomAction } from '@/app/components/DataTable';
import { Switch } from '@/components/ui/switch';
import LeadDetailModal from '@/app/components/LeadDetailModal';
import TaskDetailModal from '@/app/components/TaskDetailModal';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import InstructionIADrawer from '@/app/components/InstructionIADrawer';
import WalegoSimulationDrawer from '@/app/components/WalegoSimulationDrawer';
import { usePopup } from '@/app/context/PopupContext';
import { 
  useSmartFollowUpStats, 
  useFollowUpTasks, 
  useAutomationActions,
  useAutomationSettings 
} from '@/hooks/useSmartFollowUp';
import { 
  approveAutomationAction, 
  rejectAutomationAction, 
  updateFollowUpTask,
  deleteFollowUpTask,
  updateAutomationSettings,
} from '@/lib/smart-follow-up-api';
import { extractWalegoLeadName } from '@/utils/walego-lead-status';
import { getDefaultContactAvatar } from '@/lib/jazz-avatar';
import type { AutomationAction, FollowUpTask } from '@/types/smart-follow-up';

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
  const { showGlobalPopup } = usePopup();
  const { data: stats, isLoading: statsLoading } = useSmartFollowUpStats();
  const { data: tasks, mutate: mutateTasks } = useFollowUpTasks();
  const { data: allActions, mutate: mutateActions } = useAutomationActions('pending');
  const { data: settings, mutate: mutateSettings } = useAutomationSettings();
  
  const [activeTab, setActiveTab] = useState<'actions' | 'tasks'>('actions');
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
  const actions = showLowScoreEmails ? allActions : qualifiedActions;

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
    } catch (error) {
      console.error('Erreur:', error);
      showGlobalPopup('Erreur', 'error');
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
                router.push(`/dashboard/clients/new?email=${encodeURIComponent(action.proposed_content.to[0] || '')}&name=${encodeURIComponent(action.proposed_content.to[0]?.split('@')[0] || '')}`);
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
            className="px-2 py-1 bg-danger rounded text-xs font-medium hover:bg-danger/20"
            title="Rejeter"
          >
            <IconX className="w-3.5 h-3.5 !text-white" />
          </button>
        </div>
      ),
    },
  ], [minScoreThreshold, router, priorityKeywords, handleQualifyLead, isLeadFromPriorityDomain]);

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
                  onClick={() => router.push('/dashboard/smart-follow-up/settings#icp')}
                  className="flex items-center gap-1.5 px-3 py-2  !text-xs font-medium  !text-primary border border-default hover:bg-hover transition-colors"
                >
                  <IconTarget className="w-3.5 h-3.5" />
                  ICP
                </button>
                <button
                  onClick={() => setShowInstructionDrawer(true)}
                  className={`flex items-center gap-1.5 px-3 py-2  !text-xs font-medium transition-colors ${
                    showInstructionDrawer
                      ? 'bg-primary !text-white'
                      : 'bg-secondary !text-primary border border-default hover:bg-hover'
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
                  className="flex items-center gap-1.5 px-3 py-2  !text-xs font-medium bg-secondary !text-primary border border-default hover:bg-hover transition-colors"
                >
                  <IconFilter className="w-3.5 h-3.5" />
                  Filtres
                </button>
                {nonQualifiedActions && nonQualifiedActions.length > 0 && (
                  <button
                    onClick={handleCleanNonICP}
                    disabled={cleaningNonICP}
                    className="flex items-center gap-1.5 px-3 py-2  !text-xs font-medium bg-error/15 border border-error/30 !text-error hover:bg-error/25 transition-colors disabled:opacity-50"
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
            <div className="flex gap-0.5 bg-muted  p-0.5 w-fit">
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5  !text-sm font-medium transition-all ${
                  activeTab === 'actions' ? 'bg-card !text-primary shadow-sm border border-default' : '!text-muted hover:!text-primary'
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
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5  !text-sm font-medium transition-all ${
                  activeTab === 'tasks' ? 'bg-card !text-primary shadow-sm border border-default' : '!text-muted hover:!text-primary'
                }`}
              >
                Tâches
                <span className={`!text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  activeTab === 'tasks' ? 'bg-emerald-600 !text-white' : 'bg-muted !text-muted'
                }`}>
                  {tasks?.length || 0}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className=" w-full py-6">
          {/* Bannière instruction IA active */}
          {hasAiInstruction && (
            <>
            <p className="!text-xs !text-primary mb-2">Instruction IA :</p>  
            <div className="p-3 bg-accent-light border border-accent  flex items-center justify-between mb-4 w-fit">
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
              <div key={k.label} className="bg-card flex-1 min-w-[140px] p-3.5">
                <div className="!text-xs !text-muted mb-1">{k.label}</div>
                <div className={`!text-[22px] font-bold tracking-tight ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Bannière filtre ICP */}
          {activeTab === 'actions' && nonQualifiedActions && nonQualifiedActions.length > 0 && !showLowScoreEmails && (
            <div className="p-3 bg-blue-50 border border-blue-200  flex items-center justify-between mb-4">
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
            <div className="p-3 bg-amber-50 border border-amber-200  flex items-center justify-between mb-4">
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
            (actions?.length ?? 0) === 0 ? (
              <div className="bg-card p-16 text-center">
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
            )
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
                    className="w-full !pl-9 !pr-3 py-2 !text-sm border border-default  bg-card focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-1">
                  {(['Toutes', 'Urgent', 'Prioritaire', 'Normal'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPrio(p)}
                      className={`px-2.5 py-1.5  !text-xs font-medium transition-all whitespace-nowrap ${
                        filterPrio === p
                          ? 'bg-muted border border-default !text-primary'
                          : 'bg-card border border-default !text-muted hover:!text-primary'
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
    </>
  );
}
