'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconSettings, 
  IconPlayerPause, 
  IconPlayerPlay, 
  IconAlertCircle, 
  IconFilter,
  IconCheck,
  IconX,
  IconUser,
  IconMail,
  IconTarget,
  IconTrash,
  IconBriefcase,
  IconBuilding,
} from '@tabler/icons-react';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column, CustomAction } from '@/app/components/DataTable';
import QuickEmailReplyModal from '@/app/components/QuickEmailReplyModal';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
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
  updateAutomationSettings 
} from '@/lib/smart-follow-up-api';
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
  
  const minScore = settings?.icp_settings?.min_score_threshold ?? 50;
  const qualifiedActions = allActions?.filter(a => a.confidence_score >= minScore) ?? [];
  const nonQualifiedActions = allActions?.filter(a => a.confidence_score < minScore) ?? [];
  const actions = showLowScoreEmails ? allActions : qualifiedActions;

  const handleToggleSystem = async () => {
    if (!settings?.documentId) {
      showGlobalPopup('⚠️ Veuillez d\'abord configurer le système', 'warning');
      router.push('/dashboard/smart-follow-up/settings');
      return;
    }

    setTogglingPause(true);
    try {
      const newEnabled = !settings.enabled;
      await updateAutomationSettings(settings.documentId, { enabled: newEnabled });
      mutateSettings();
      showGlobalPopup(newEnabled ? '✓ Smart Follow-Up activé' : '⏸️ Smart Follow-Up mis en pause', 'success');
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
          await rejectAutomationAction(action.documentId, `Score ICP < ${minScore}`);
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
    return { label: 'B2C', icon: IconMail, color: 'text-orange-500' };
  };

  const isSystemEnabled = settings?.enabled ?? true;

  // Colonnes pour les actions (leads)
  const actionColumns: Column<AutomationAction>[] = useMemo(() => [
    {
      key: 'client',
      label: 'Contact',
      render: (_, action) => {
        const contactType = getContactType(action);
        const ContactIcon = contactType.icon;
        const isLowScore = action.confidence_score < minScore / 100;
        
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isLowScore ? 'bg-red-100' : 'bg-accent/10'
            }`}>
              <ContactIcon className={`w-5 h-5 ${isLowScore ? 'text-red-500' : contactType.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-primary truncate">
                  {action.client?.name || 'Contact inconnu'}
                </p>
                {isLowScore && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-600">
                    Non qualifié
                  </span>
                )}
              </div>
              <p className="text-xs text-muted truncate">{action.client?.email || 'N/A'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'subject',
      label: 'Sujet',
      render: (_, action) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary truncate mb-0.5">
            {action.proposed_content.subject}
          </p>
          <p className="text-xs text-muted line-clamp-1">
            {action.proposed_content.body}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, action) => {
        const contactType = getContactType(action);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${contactType.color} bg-current/10`}>
            {contactType.label}
          </span>
        );
      },
    },
    {
      key: 'score',
      label: 'Score ICP',
      render: (_, action) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          action.confidence_score >= 0.8 
            ? 'bg-success-light text-success-text' 
            : action.confidence_score >= 0.6
              ? 'bg-warning-light text-warning-text'
              : 'bg-error-light text-error-text'
        }`}>
          {(action.confidence_score * 100).toFixed(0)}%
        </span>
      ),
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
        <div className="flex items-center gap-2">
          {!action.client && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/clients/new?email=${encodeURIComponent(action.proposed_content.to[0] || '')}&name=${encodeURIComponent(action.proposed_content.to[0]?.split('@')[0] || '')}`);
              }}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:opacity-90"
              title="Créer fiche contact"
            >
              <IconUser className="w-3.5 h-3.5" />
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
            <IconCheck className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQualifyLead(action, 'rejected');
            }}
            className="px-2 py-1 bg-error/10 text-error rounded text-xs font-medium hover:bg-error/20"
            title="Rejeter"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [minScore, router]);

  // Colonnes pour les tâches
  const taskColumns: Column<FollowUpTask>[] = useMemo(() => [
    {
      key: 'contact',
      label: 'Contact',
      render: (_, task) => (
        <div className="min-w-0">
          <p className="font-medium text-primary truncate">
            {task.contact?.name || task.context?.from_name || task.context?.from_email || 'Contact inconnu'}
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
      render: (_, task) => (
        <p className="text-sm text-primary truncate">
          {task.context?.original_subject || 'N/A'}
        </p>
      ),
    },
    {
      key: 'task_type',
      label: 'Type',
      render: (_, task) => (
        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-600">
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
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
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
        <div className="flex items-center gap-1 flex-wrap">
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
        <div className="flex items-center gap-1">
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

  const customTaskActions: CustomAction<FollowUpTask>[] = useMemo(() => [
    {
      label: 'Mettre en pause',
      icon: <IconPlayerPause className="w-4 h-4" />,
      onClick: async (tasks) => {
        tasks.forEach(task => handleUpdateTask(task, { status_follow_up: 'cancelled' }));
      },
      variant: 'warning',
    },
    {
      label: 'Marquer comme terminé',
      icon: <IconCheck className="w-4 h-4" />,
      onClick: async (tasks) => {
        tasks.forEach(task => handleUpdateTask(task, { status_follow_up: 'completed' }));
      },
      variant: 'success',
    },
  ], []);

  // Header Extra avec tabs et contrôles
  const headerExtra = (
    <>
      {/* Contrôles compacts */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'actions'
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-secondary'
            }`}
          >
            Leads ({qualifiedActions.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'tasks'
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-secondary'
            }`}
          >
            Tâches ({tasks?.length || 0})
          </button>
        </div>

        <div className="flex gap-2">
          {isSystemEnabled && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-light text-success-text">
              ● Actif
            </span>
          )}
          
          <button
            onClick={() => router.push('/dashboard/smart-follow-up/settings#icp')}
            className="px-2 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20"
            title="Configuration ICP"
          >
            <IconTarget className="w-4 h-4" />
          </button>

          {nonQualifiedActions && nonQualifiedActions.length > 0 && (
            <button
              onClick={handleCleanNonICP}
              disabled={cleaningNonICP}
              className="px-2 py-1.5 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50"
              title={`Nettoyer ${nonQualifiedActions.length} emails non qualifiés`}
            >
              <IconTrash className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowRulesModal(true)}
            className="px-2 py-1.5 bg-purple-500/10 text-purple-600 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20"
            title="Règles"
          >
            <IconFilter className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleSystem}
            disabled={togglingPause}
            className={`px-2 py-1.5 rounded-lg font-medium transition-all ${
              isSystemEnabled ? 'badge-warning' : 'badge-success'
            } disabled:opacity-50`}
          >
            {isSystemEnabled ? <IconPlayerPause className="w-4 h-4" /> : <IconPlayerPlay className="w-4 h-4" />}
          </button>

          <button
            onClick={() => router.push('/dashboard/smart-follow-up/settings')}
            className="px-2 py-1.5 bg-secondary text-primary rounded-lg hover:bg-hover transition-colors border border-default"
          >
            <IconSettings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bannière filtre ICP */}
      {activeTab === 'actions' && nonQualifiedActions && nonQualifiedActions.length > 0 && !showLowScoreEmails && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <IconFilter className="w-4 h-4" />
            <span>
              {nonQualifiedActions.length} emails filtrés (score ICP &lt; {minScore})
            </span>
          </div>
          <button
            onClick={() => setShowLowScoreEmails(true)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Afficher
          </button>
        </div>
      )}

      {activeTab === 'actions' && showLowScoreEmails && nonQualifiedActions && nonQualifiedActions.length > 0 && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <IconAlertCircle className="w-4 h-4" />
            <span>
              {nonQualifiedActions.length} emails non qualifiés affichés
            </span>
          </div>
          <button
            onClick={() => setShowLowScoreEmails(false)}
            className="text-xs text-orange-600 hover:underline font-medium"
          >
            Masquer
          </button>
        </div>
      )}
    </>
  );

  const sharedProps = {
    title: "Smart Follow-Up",
    actionButtonLabel: "Paramètres",
    onActionButtonClick: () => router.push('/dashboard/smart-follow-up/settings'),
    stats: [
      {
        label: 'Qualifiés ICP',
        value: qualifiedActions?.length || 0,
        colorClass: 'text-accent',
        icon: <IconAlertCircle className="w-6 h-6 text-accent" />,
      },
      {
        label: 'Aujourd\'hui',
        value: statsLoading ? '...' : stats?.dueToday || 0,
        colorClass: 'text-warning',
        icon: <IconMail className="w-6 h-6 text-warning" />,
      },
      {
        label: 'Cette semaine',
        value: statsLoading ? '...' : stats?.sentThisWeek || 0,
        colorClass: 'text-success',
        icon: <IconCheck className="w-6 h-6 text-success" />,
      },
      {
        label: 'Taux succès',
        value: statsLoading ? '...' : `${stats?.successRate.toFixed(0) || 0}%`,
        colorClass: 'text-primary',
        icon: <span className="text-lg font-bold text-purple-500">%</span>,
      },
    ],
    loading: statsLoading,
    headerExtra,
    showViewToggle: false,
    sortable: false,
  };

  return (
    <>
      {activeTab === 'actions' ? (
        <DashboardPageTemplate<AutomationAction>
          {...sharedProps}
          columns={actionColumns}
          data={actions || []}
          emptyMessage="Aucun lead en attente"
          onRowClick={(row) => {
            setSelectedAction(row);
            setShowDetailModal(true);
          }}
          selectable={false}
          getItemId={(item) => item.documentId || ''}
          getItemName={(item) => item.client?.name || 'Contact'}
        />
      ) : (
        <DashboardPageTemplate<FollowUpTask>
          {...sharedProps}
          columns={taskColumns}
          data={tasks || []}
          emptyMessage="Aucune tâche planifiée"
          selectable={true}
          onDeleteSelected={handleDeleteMultipleTasks}
          customActions={customTaskActions}
          getItemId={(item) => item.documentId || ''}
          getItemName={(item) => item.contact?.name || item.context?.from_name || 'Contact'}
        />
      )}

      <QuickEmailReplyModal
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
    </>
  );
}
