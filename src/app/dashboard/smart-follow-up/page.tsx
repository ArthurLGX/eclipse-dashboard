'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { mergeLeadSourcesWithDefaults } from '@/data/lead-sources-default';
import { detectLeadSource } from '@/lib/lead-source-detector';
import { useRouter } from 'next/navigation';
import AddClientModal from '@/app/dashboard/clients/AddClientModal';
import Image from 'next/image';
import {
  IconSettings,
  IconAlertCircle,
  IconFilter,
  IconCheck,
  IconX,
  IconUser,
  IconTarget,
  IconTrash,
  IconSparkles,
  IconRefresh,
  IconPlug,
  IconLoader2,
} from '@tabler/icons-react';
import DataTable, { Column } from '@/app/components/DataTable';
import { Switch } from '@/components/ui/switch';
import LeadDetailModal from '@/app/components/LeadDetailModal';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import InstructionIADrawer from '@/app/components/InstructionIADrawer';
import WalegoSimulationDrawer from '@/app/components/WalegoSimulationDrawer';
import SFUOnboarding, { hasSeenSFUOnboarding } from '@/app/components/onboarding/SFUOnboarding';
import SyncInboxToast from '@/app/components/SyncInboxToast';
import { DailyDigestCard } from '@/app/components/smart-follow-up/DailyDigestCard';
import { usePopup } from '@/app/context/PopupContext';
import { useSfuLeadsAll, useAutomationSettings, useDailyDigest } from '@/hooks/useSmartFollowUp';
import {
  updateSfuLead,
  archiveSfuLead,
  sfuLeadToAutomationAction,
  updateAutomationSettings,
} from '@/lib/smart-follow-up-api';
import { addClientUser, syncInboxStream, fetchSmtpConfig, type ProcessedEmail } from '@/lib/api';
import type { SmtpConfig } from '@/types';
import { shouldShowSfuFullPageOnboarding } from '@/lib/sfu-onboarding-gate';
import SFUOnboardingPage from '@/app/components/smart-follow-up/SFUOnboardingPage';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { clearCache, useClients } from '@/hooks/useApi';
import { extractWalegoLeadName } from '@/utils/walego-lead-status';
import {
  buildContactAvatarLookup,
  resolveLeadDisplayName,
  resolveLeadTableAvatarUrl,
} from '@/lib/lead-display';
import { getDefaultContactAvatar } from '@/lib/jazz-avatar';
import { getGmailOAuthErrorMessage } from '@/lib/gmail-oauth-feedback';
import type { AutomationAction, SfuLead } from '@/types/smart-follow-up';
import type { CreateClientData } from '@/types';

type LeadTableRow = { lead: SfuLead; action: AutomationAction };

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
  const { allLeads: allLeadsRaw, mutateLeads, isLoading: leadsLoading } = useSfuLeadsAll();
  const { data: settings, mutate: mutateSettings, isLoading: settingsLoading } = useAutomationSettings();
  const { data: todayDigest } = useDailyDigest();
  const { data: clientsList } = useClients(user?.id);
  const contactAvatarLookup = useMemo(
    () => buildContactAvatarLookup(clientsList ?? []),
    [clientsList]
  );

  const [leadStatusTab, setLeadStatusTab] = useState<SfuLead['status']>('new');
  const [selectedAction, setSelectedAction] = useState<AutomationAction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLowScoreEmails, setShowLowScoreEmails] = useState(false);
  const [cleaningNonICP, setCleaningNonICP] = useState(false);
  const [showInstructionDrawer, setShowInstructionDrawer] = useState(false);
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
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [smtpReady, setSmtpReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !hasSeenSFUOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSmtpReady(true);
      return;
    }
    fetchSmtpConfig(user.id)
      .then(setSmtpConfig)
      .finally(() => setSmtpReady(true));
  }, [user?.id]);

  const showFullPageOnboarding =
    !!user &&
    smtpReady &&
    !settingsLoading &&
    shouldShowSfuFullPageOnboarding(settings, smtpConfig);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!smtpReady || settingsLoading || !user) return;
    if (showFullPageOnboarding) return;
    const sp = new URLSearchParams(window.location.search);
    const gmail = sp.get('gmail');
    if (gmail !== 'connected' && gmail !== 'error') return;
    if (gmail === 'connected') {
      const email = sp.get('email');
      showGlobalPopup(
        email ? `Gmail connecté (${decodeURIComponent(email)})` : 'Gmail connecté',
        'success'
      );
    } else {
      showGlobalPopup(getGmailOAuthErrorMessage(sp.get('gmail_err')), 'error');
    }
    router.replace('/dashboard/smart-follow-up', { scroll: false });
  }, [smtpReady, settingsLoading, user, showFullPageOnboarding, router, showGlobalPopup]);

  // min_score_threshold est sur 15 points, confidence_score est 0-1 → seuil = threshold/15
  const minScoreThreshold = (settings?.icp_settings?.min_score_threshold ?? 3) / 15;
  const priorityKeywords = settings?.priority_keywords ?? [];

  const mergedLeadSources = useMemo(
    () => mergeLeadSourcesWithDefaults(settings?.lead_sources ?? null),
    [settings?.lead_sources]
  );

  const isLeadFromPriorityDomain = (action: AutomationAction): boolean => {
    if (priorityKeywords.length === 0) return false;
    const email =
      action.client?.email ||
      action.follow_up_task?.received_email?.from_email ||
      action.proposed_content?.to?.[0] ||
      '';
    const domain = email.includes('@') ? email.split('@')[1]?.toLowerCase() : '';
    const domainBase = domain?.split('.')[0] ?? '';
    return priorityKeywords.some((kw) => {
      const k = kw.toLowerCase().trim();
      return domain?.includes(k) || domainBase?.includes(k) || k.includes(domainBase);
    });
  };

  /** Aligné sur lead_sources + detectLeadSource (notification de lead, pas tout mail outil). */
  const isLeadSourceBypassICP = useCallback(
    (action: AutomationAction): boolean => {
      const ctx = action.follow_up_task?.context;
      const fromEmail = action.follow_up_task?.received_email?.from_email ?? '';
      const subject = action.proposed_content?.subject ?? '';
      const detected = detectLeadSource(
        { from_email: fromEmail, subject, source: ctx?.source as string | undefined },
        mergedLeadSources
      );
      return Boolean(detected?.bypass_icp);
    },
    [mergedLeadSources]
  );

  const leadQualifies = useCallback(
    (lead: SfuLead) => {
      const a = sfuLeadToAutomationAction(lead);
      const meetsScore = a.confidence_score >= minScoreThreshold;
      const fromPriorityDomain = isLeadFromPriorityDomain(a);
      const sourceBypass = isLeadSourceBypassICP(a);
      return meetsScore || fromPriorityDomain || sourceBypass;
    },
    [minScoreThreshold, isLeadFromPriorityDomain, isLeadSourceBypassICP]
  );

  const allActions = useMemo(
    () => (allLeadsRaw ?? []).map((l) => sfuLeadToAutomationAction(l)) as AutomationAction[],
    [allLeadsRaw]
  );

  const nonQualifiedActions = useMemo(() => {
    return (allLeadsRaw ?? [])
      .filter((l) => ['new', 'seen', 'snoozed'].includes(l.status))
      .filter((l) => !leadQualifies(l))
      .map((l) => sfuLeadToAutomationAction(l)) as AutomationAction[];
  }, [allLeadsRaw, leadQualifies]);

  // Filtrage par source (email / whatsapp / both)
  const sourceFilter = (settings?.source_filter as 'both' | 'email' | 'whatsapp') || 'both';
  const notificationChannel = (settings?.notification_preferences as { channel?: 'both' | 'email' | 'whatsapp' })?.channel || 'both';
  const enabledLeadSourcesCount = useMemo(
    () => mergedLeadSources.filter((s) => s.enabled).length,
    [mergedLeadSources]
  );

  const isLeadWhatsApp = useCallback((lead: SfuLead) => {
    const fromEmail = lead.received_email?.from_email ?? '';
    const subject = (lead.proposed_content as { subject?: string } | null)?.subject ?? '';
    return (
      lead.source === 'whatsapp' ||
      fromEmail.endsWith('@whatsapp') ||
      subject.startsWith('WhatsApp ·')
    );
  }, []);

  const filterLeadsBySource = useCallback(
    (list: SfuLead[]) => {
      if (sourceFilter === 'both') return list;
      return list.filter((l) => {
        const isWa = isLeadWhatsApp(l);
        if (sourceFilter === 'whatsapp') return isWa;
        if (sourceFilter === 'email') return !isWa;
        return true;
      });
    },
    [sourceFilter, isLeadWhatsApp]
  );

  const leadsInTab = useMemo(() => {
    const list = (allLeadsRaw ?? []).filter((l) => l.status === leadStatusTab);
    return filterLeadsBySource(list);
  }, [allLeadsRaw, leadStatusTab, filterLeadsBySource]);

  const qualifiedLeadsInTab = useMemo(
    () => leadsInTab.filter((l) => leadQualifies(l)),
    [leadsInTab, leadQualifies]
  );

  const displayedLeads = useMemo(
    () => (showLowScoreEmails ? leadsInTab : qualifiedLeadsInTab),
    [showLowScoreEmails, leadsInTab, qualifiedLeadsInTab]
  );

  const leadRows: LeadTableRow[] = useMemo(
    () => displayedLeads.map((lead) => ({ lead, action: sfuLeadToAutomationAction(lead) })),
    [displayedLeads]
  );

  const statsLeads = useMemo(() => (allLeadsRaw ?? []).filter((l) => l.status !== 'archived'), [allLeadsRaw]);
  const hotCount = useMemo(() => statsLeads.filter((l) => l.score === 'hot').length, [statsLeads]);
  const warmCount = useMemo(() => statsLeads.filter((l) => l.score === 'warm').length, [statsLeads]);
  const totalActiveLeads = statsLeads.length;
  const repliedCount = useMemo(
    () => (allLeadsRaw ?? []).filter((l) => l.status === 'replied').length,
    [allLeadsRaw]
  );
  const pipelineForRate = useMemo(
    () => (allLeadsRaw ?? []).filter((l) => ['new', 'seen', 'snoozed', 'replied'].includes(l.status)).length,
    [allLeadsRaw]
  );
  const responseRatePct =
    pipelineForRate > 0 ? Math.round((repliedCount / pipelineForRate) * 1000) / 10 : 0;

  const statusCounts = useMemo(() => {
    const list = allLeadsRaw ?? [];
    return {
      new: list.filter((l) => l.status === 'new').length,
      seen: list.filter((l) => l.status === 'seen').length,
      replied: list.filter((l) => l.status === 'replied').length,
      snoozed: list.filter((l) => l.status === 'snoozed').length,
      archived: list.filter((l) => l.status === 'archived').length,
    };
  }, [allLeadsRaw]);

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
      mutateLeads();
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
        await updateSfuLead(action.documentId, {
          status: 'seen',
          seen_at: new Date().toISOString(),
        });
        showGlobalPopup('✓ Lead qualifié', 'success');
      } else {
        await archiveSfuLead(action.documentId);
        showGlobalPopup('Lead rejeté', 'info');
      }
      mutateLeads();
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
      mutateLeads();
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
          await archiveSfuLead(action.documentId);
          rejected++;
        } catch (error) {
          console.error(`Erreur:`, error);
        }
      }
      mutateLeads();
      showGlobalPopup(`✓ ${rejected} emails rejetés`, 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showGlobalPopup('Erreur', 'error');
    } finally {
      setCleaningNonICP(false);
    }
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

  const leadLeadScoreLabel = (lead: SfuLead) => {
    const s = lead.score;
    if (s === 'hot') return '🔴 Chaud';
    if (s === 'warm') return '🟠 Tiède';
    if (s === 'cold') return '⚫ Froid';
    if (s === 'neutral') return '🟡 Neutre';
    return '—';
  };

  const leadColumns: Column<LeadTableRow>[] = useMemo(
    () => [
      {
        key: 'client',
        label: 'Contact',
        render: (_, row) => {
          const action = row.action;
          const fromPriorityDomain = isLeadFromPriorityDomain(action);
          const sourceBypass = isLeadSourceBypassICP(action);
          const isLowScore = action.confidence_score < minScoreThreshold && !fromPriorityDomain && !sourceBypass;
          const { src: resolvedAvatar, hasLeadPhoto: hasResolvedPhoto } = resolveLeadTableAvatarUrl(
            action,
            contactAvatarLookup
          );
          const avatarPath =
            resolvedAvatar ?? getDefaultContactAvatar(action.client?.documentId ?? action.documentId).avatarUrl;
          const displayName = resolveLeadDisplayName(action);
          const hasLeadPhoto = hasResolvedPhoto;

          return (
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                  !hasLeadPhoto &&
                  (fromPriorityDomain || sourceBypass ? 'bg-emerald-100' : isLowScore ? 'bg-red-100' : 'bg-accent/10')
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
                        fromPriorityDomain || sourceBypass ? 'bg-emerald-100' : isLowScore ? 'bg-red-100' : 'bg-accent/10'
                      }`}
                    >
                      <IconUser
                        className={`w-5 h-5 ${fromPriorityDomain || sourceBypass ? 'text-emerald-600' : isLowScore ? 'text-red-500' : 'text-muted'}`}
                      />
                    </div>
                  </>
                ) : (
                  <IconUser
                    className={`w-5 h-5 ${fromPriorityDomain || sourceBypass ? 'text-emerald-600' : isLowScore ? 'text-red-500' : 'text-muted'}`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-primary truncate">{displayName}</p>
                  {fromPriorityDomain && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700">
                      Priorité domaine
                    </span>
                  )}
                  {sourceBypass && !fromPriorityDomain && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-700">
                      Source partenaire
                    </span>
                  )}
                  {!fromPriorityDomain && !sourceBypass && isLowScore && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-600">
                      Non qualifié
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted truncate">
                  {action.client?.email ||
                    action.follow_up_task?.received_email?.from_email ||
                    'aucun email'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'signal',
        label: 'Signal',
        className: 'min-w-[200px] max-w-[320px]',
        render: (_, row) => {
          const preview = row.action.follow_up_task?.context?.lead_response_preview as string | undefined;
          const raw =
            row.lead.signal?.trim() ||
            preview ||
            row.action.proposed_content.subject ||
            '—';
          const short = raw.length > 140 ? `${raw.slice(0, 140)}…` : raw;
          return (
            <p className="text-sm text-primary line-clamp-2" title={raw}>
              {short}
            </p>
          );
        },
      },
      {
        key: 'score',
        label: 'Score',
        render: (_, row) => {
          const action = row.action;
          const lead = row.lead;
          const fromPriorityDomain = isLeadFromPriorityDomain(action);
          const sourceBypass = isLeadSourceBypassICP(action);
          const pct = fromPriorityDomain ? '100%' : `${(action.confidence_score * 100).toFixed(0)}%`;
          const tier = leadLeadScoreLabel(lead);
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-primary whitespace-nowrap">{tier}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full w-fit ${
                  fromPriorityDomain || sourceBypass || action.confidence_score >= 0.8
                    ? 'bg-success-light text-success-text'
                    : action.confidence_score >= 0.6
                      ? 'bg-warning-light text-warning-text'
                      : 'bg-error-light text-error-text'
                }`}
              >
                ICP {pct}
              </span>
            </div>
          );
        },
      },
      {
        key: 'source',
        label: 'Source',
        render: (_, row) => {
          const badge = getSourceBadge(row.action);
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${badge.color}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        key: 'createdAt',
        label: 'Date',
        render: (_, row) => (
          <span className="text-xs text-muted whitespace-nowrap">
            {formatRelativeTime(new Date(row.action.createdAt))}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => {
          const action = row.action;
          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              {!action.client && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const email =
                      action.follow_up_task?.received_email?.from_email ||
                      action.proposed_content?.to?.[0] ||
                      '';
                    const resolvedName = resolveLeadDisplayName(action);
                    const nameForClient =
                      resolvedName !== 'Contact inconnu'
                        ? resolvedName
                        : extractWalegoLeadName(action.proposed_content?.subject || '') || email?.split('@')[0] || '';
                    setAddClientModal({
                      isOpen: true,
                      initialData: {
                        name: nameForClient,
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
                title="Qualifier / vu"
              >
                <IconCheck className="w-3.5 h-3.5 !text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQualifyLead(action, 'rejected');
                }}
                className="px-2 py-1 bg-danger rounded text-xs font-medium hover:bg-danger"
                title="Archiver"
              >
                <IconX className="w-3.5 h-3.5 !text-white" />
              </button>
            </div>
          );
        },
      },
    ],
    [minScoreThreshold, handleQualifyLead, isLeadFromPriorityDomain, isLeadSourceBypassICP, contactAvatarLookup]
  );

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

  if (!smtpReady || settingsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted" />
      </div>
    );
  }

  if (showFullPageOnboarding) {
    return (
      <SFUOnboardingPage
        settings={settings ?? null}
        smtpConfig={smtpConfig}
        mutateSettings={mutateSettings}
        onSmtpRefresh={async () => {
          if (user?.id) setSmtpConfig(await fetchSmtpConfig(user.id));
        }}
      />
    );
  }

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

            {/* Onglets statut lead */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 w-fit flex-wrap">
                {(
                  [
                    { id: 'new' as const, label: 'Nouveaux' },
                    { id: 'seen' as const, label: 'Vus' },
                    { id: 'replied' as const, label: 'Répondus' },
                    { id: 'snoozed' as const, label: 'Reportés' },
                    { id: 'archived' as const, label: 'Archivés' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLeadStatusTab(id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 !text-sm font-medium transition-all ${
                      leadStatusTab === id
                        ? 'bg-card !text-primary shadow-sm border border-default rounded-lg'
                        : '!text-muted hover:!text-primary rounded-lg'
                    }`}
                  >
                    {label}
                    <span
                      className={`!text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        leadStatusTab === id ? 'bg-emerald-600 !text-white' : 'bg-muted !text-muted'
                      }`}
                    >
                      {statusCounts[id]}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/smart-follow-up/settings')}
                className="flex items-center gap-1.5 px-3 py-1.5 !text-xs font-medium !text-muted border border-dashed border-default rounded-lg hover:!text-primary hover:bg-hover transition-colors"
              >
                <IconPlug className="w-3.5 h-3.5" />
                Sources ({enabledLeadSourcesCount})
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
                const action = (allActions || []).find((a) => a.documentId === id);
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

          {/* Stats bar */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {(
              [
                { label: 'Leads chauds 🔴', value: leadsLoading ? '…' : hotCount, color: '!text-red-600' },
                { label: 'Leads tièdes 🟠', value: leadsLoading ? '…' : warmCount, color: '!text-orange-600' },
                { label: 'Total', value: leadsLoading ? '…' : totalActiveLeads, color: '!text-primary' },
                {
                  label: 'Taux de réponse',
                  value: leadsLoading ? '…' : `${responseRatePct}%`,
                  color: '!text-violet-600',
                },
              ] as const
            ).map((k) => (
              <div key={k.label} className="bg-card flex-1 min-w-[120px] p-3.5 rounded-lg border border-default">
                <div className="!text-xs !text-muted mb-1">{k.label}</div>
                <div className={`!text-[22px] font-bold tracking-tight ${k.color}`}>{k.value}</div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => router.push('/dashboard/smart-follow-up/settings')}
              className="bg-card flex-1 min-w-[120px] p-3.5 rounded-lg border border-default text-left cursor-pointer hover:bg-hover transition-colors"
            >
              <div className="!text-xs !text-muted mb-1">Sources actives</div>
              <div className="!text-[22px] font-bold tracking-tight !text-emerald-600">
                {leadsLoading ? '…' : enabledLeadSourcesCount}
              </div>
            </button>
          </div>

          {/* Bannière filtre ICP */}
          {['new', 'seen', 'snoozed'].includes(leadStatusTab) &&
            nonQualifiedActions &&
            nonQualifiedActions.length > 0 &&
            !showLowScoreEmails && (
            <div className="p-2 bg-info border border-info  flex items-center justify-between mb-4 rounded-lg">
                <div className="flex items-center gap-2 !text-sm !text-info">
                <IconFilter className="w-4 h-4 !text-info" />
                <span className="!text-[11px]">{nonQualifiedActions.length} emails filtrés (score ICP &lt; {Math.round(minScoreThreshold * 100)}%)</span>
              </div>
              <button onClick={() => setShowLowScoreEmails(true)} className="!text-xs !text-info hover:underline font-medium">
                Afficher
              </button>
            </div>
          )}
          {['new', 'seen', 'snoozed'].includes(leadStatusTab) &&
            showLowScoreEmails &&
            nonQualifiedActions &&
            nonQualifiedActions.length > 0 && (
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
                {leadRows.length} lead{leadRows.length > 1 ? 's' : ''} affiché{leadRows.length > 1 ? 's' : ''}
              </span>
            </div>
            {leadRows.length === 0 ? (
              <div className="bg-card p-16 text-center rounded-lg border border-default">
                <div className="w-14 h-14 bg-muted flex items-center justify-center mx-auto mb-4 !text-2xl">◎</div>
                <div className="!text-base font-semibold !text-primary mb-1.5">Aucun lead dans cet onglet</div>
                <div className="!text-sm !text-muted max-w-xs mx-auto">
                  Les leads apparaissent ici selon leur statut (nouveau, vu, répondu, etc.).
                </div>
              </div>
            ) : (
              <div className="bg-card border border-default overflow-hidden">
                <DataTable<LeadTableRow>
                  columns={leadColumns}
                  data={leadRows}
                  emptyMessage="Aucun lead"
                  onRowClick={(row) => {
                    setSelectedAction(row.action);
                    setShowDetailModal(true);
                  }}
                  loading={leadsLoading}
                />
              </div>
            )}
          </>
        </div>
      </div>

      <LeadDetailModal
        action={selectedAction}
        isOpen={showDetailModal}
        variant="drawer"
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAction(null);
        }}
        onSuccess={() => {
          mutateLeads();
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
