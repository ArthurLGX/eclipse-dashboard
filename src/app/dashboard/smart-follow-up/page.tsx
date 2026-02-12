'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSettings, IconPlayerPause, IconPlayerPlay, IconAlertCircle } from '@tabler/icons-react';
import DataTable, { Column } from '@/app/components/DataTable';
import AutomationActionDetailModal from '@/app/components/AutomationActionDetailModal';
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
  updateAutomationSettings 
} from '@/lib/smart-follow-up-api';
import type { AutomationAction, FollowUpTask } from '@/types/smart-follow-up';

// Helper pour formater les dates relativement
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'il y a quelques secondes';
  if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)} minutes`;
  if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)} heures`;
  if (diffInSeconds < 2592000) return `il y a ${Math.floor(diffInSeconds / 86400)} jours`;
  return `il y a ${Math.floor(diffInSeconds / 2592000)} mois`;
}

export default function SmartFollowUpPage() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useSmartFollowUpStats();
  const { data: tasks, mutate: mutateTasks } = useFollowUpTasks();
  const { data: actions, mutate: mutateActions } = useAutomationActions('pending');
  const { data: settings, mutate: mutateSettings } = useAutomationSettings();
  
  const [activeTab, setActiveTab] = useState<'actions' | 'tasks'>('actions');
  const [selectedAction, setSelectedAction] = useState<AutomationAction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  const handleRowClick = (action: AutomationAction) => {
    setSelectedAction(action);
    setShowDetailModal(true);
  };

  const handleApprove = async (actionId: number, documentId: string) => {
    try {
      await approveAutomationAction(documentId);
      mutateActions();
      alert('✓ Action approuvée ! L\'email sera envoyé automatiquement dans les prochaines minutes.');
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      alert('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (actionId: number, documentId: string) => {
    try {
      await rejectAutomationAction(documentId, 'Rejeté manuellement');
      mutateActions();
      alert('Action rejetée');
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  const handlePauseTask = async (taskId: number, documentId: string) => {
    try {
      await updateFollowUpTask(documentId, { status_follow_up: 'cancelled' });
      mutateTasks();
      alert('Tâche mise en pause');
    } catch (error) {
      console.error('Erreur lors de la mise en pause:', error);
      alert('Erreur lors de la mise en pause');
    }
  };

  const handleToggleSystem = async () => {
    if (!settings?.documentId) {
      alert('⚠️ Veuillez d\'abord configurer le système dans les paramètres');
      router.push('/dashboard/smart-follow-up/settings');
      return;
    }

    setTogglingPause(true);
    try {
      const newEnabled = !settings.enabled;
      await updateAutomationSettings(settings.documentId, { enabled: newEnabled });
      mutateSettings();
      alert(newEnabled ? '✓ Smart Follow-Up activé !' : '⏸️ Smart Follow-Up mis en pause');
    } catch (error) {
      console.error('Erreur lors du changement d\'état:', error);
      alert('Erreur lors du changement d\'état');
    } finally {
      setTogglingPause(false);
    }
  };

  // Colonnes pour les actions
  const actionColumns: Column<AutomationAction>[] = [
    { 
      key: 'contact', 
      label: 'Contact',
      render: (_value, row: AutomationAction) => (
        <span className="font-medium">{row.client?.name || 'N/A'}</span>
      ),
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (_value, row: AutomationAction) => {
        const type = row.follow_up_task?.task_type || 'N/A';
        const typeLabels: Record<string, string> = {
          'payment_reminder': 'Rappel paiement',
          'proposal_follow_up': 'Suivi devis',
          'meeting_follow_up': 'Suivi réunion',
          'thank_you': 'Remerciement',
          'check_in': 'Prise de contact',
          'custom': 'Personnalisé',
        };
        return typeLabels[type] || type;
      },
    },
    { 
      key: 'subject', 
      label: 'Sujet',
      render: (_value, row: AutomationAction) => (
        <span className="max-w-xs truncate block">{row.proposed_content.subject}</span>
      ),
    },
    { 
      key: 'confidence', 
      label: 'Confiance',
      render: (_value, row: AutomationAction) => {
        const score = (row.confidence_score * 100).toFixed(0);
        return (
          <span className={`badge font-medium ${
            row.confidence_score >= 0.8 
              ? 'badge-success' 
              : row.confidence_score >= 0.6
                ? 'badge-warning'
                : 'badge-error'
          }`}>
            {score}%
          </span>
        );
      },
    },
    {
      key: 'created',
      label: 'Créé',
      render: (_value, row: AutomationAction) => formatRelativeTime(new Date(row.createdAt)),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row: AutomationAction) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleApprove(row.id, row.documentId)}
            className="px-3 py-1 bg-accent text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Approuver
          </button>
          <button
            onClick={() => handleReject(row.id, row.documentId)}
            className="px-3 py-1 bg-error text-primary rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Rejeter
          </button>
        </div>
      ),
    },
  ];

  // Colonnes pour les tâches
  const taskColumns: Column<FollowUpTask>[] = [
    { 
      key: 'contact', 
      label: 'Contact',
      render: (_value, row: FollowUpTask) => (
        <span className="font-medium">{row.contact?.name || 'N/A'}</span>
      ),
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (_value, row: FollowUpTask) => {
        const typeLabels: Record<string, string> = {
          'payment_reminder': 'Rappel paiement',
          'proposal_follow_up': 'Suivi devis',
          'meeting_follow_up': 'Suivi réunion',
          'thank_you': 'Remerciement',
          'check_in': 'Prise de contact',
          'custom': 'Personnalisé',
        };
        return typeLabels[row.task_type] || row.task_type;
      },
    },
    { 
      key: 'priority', 
      label: 'Priorité',
      render: (_value, row: FollowUpTask) => {
        const priorityLabels: Record<string, { label: string; badge: string }> = {
          'urgent': { label: 'Urgent', badge: 'badge-danger' },
          'high': { label: 'Haute', badge: 'badge-warning' },
          'medium': { label: 'Moyenne', badge: 'badge-info' },
          'low': { label: 'Basse', badge: 'badge-muted' },
        };
        const priority = priorityLabels[row.priority] || priorityLabels['medium'];
        return (
          <span className={`badge font-medium ${priority.badge}`}>
            {priority.label}
          </span>
        );
      },
    },
    {
      key: 'scheduled',
      label: 'Planifié pour',
      render: (_value, row: FollowUpTask) => new Date(row.scheduled_for).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    },
    { 
      key: 'status', 
      label: 'Statut',
      render: (_value, row: FollowUpTask) => {
        const statusLabels: Record<string, { label: string; badge: string }> = {
          'pending': { label: 'En attente', badge: 'badge-info' },
          'in_progress': { label: 'En cours', badge: 'badge-warning' },
          'completed': { label: 'Terminé', badge: 'badge-success' },
          'cancelled': { label: 'Annulé', badge: 'badge-muted' },
          'failed': { label: 'Échoué', badge: 'badge-error' },
        };
        const status = statusLabels[row.status_follow_up] || statusLabels['pending'];
        return (
          <span className={`badge font-medium ${status.badge}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row: FollowUpTask) => (
        <button
          onClick={() => handlePauseTask(row.id, row.documentId)}
          className="px-3 py-1 bg-muted text-primary rounded-lg text-sm hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={row.status_follow_up === 'cancelled' || row.status_follow_up === 'completed'}
        >
          Mettre en pause
        </button>
      ),
    },
  ];

  const isSystemEnabled = settings?.enabled ?? true;

  return (
    <div className="w-full max-w-full">
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-primary">Smart Follow-Up</h1>
            {settings && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isSystemEnabled 
                  ? 'bg-success-light text-success-text' 
                  : 'bg-warning-light text-warning-text'
              }`}>
                {isSystemEnabled ? '● Actif' : '⏸ En pause'}
              </span>
            )}
          </div>
          <p className="text-muted">Gestion automatisée des relances clients</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleToggleSystem}
            disabled={togglingPause}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              isSystemEnabled
                ? 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20'
                : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSystemEnabled ? (
              <>
                <IconPlayerPause className="w-5 h-5" />
                Mettre en pause
              </>
            ) : (
              <>
                <IconPlayerPlay className="w-5 h-5" />
                Activer
              </>
            )}
          </button>

          <button
            onClick={() => router.push('/dashboard/smart-follow-up/settings')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-primary rounded-xl hover:bg-hover transition-colors border border-default"
          >
            <IconSettings className="w-5 h-5" />
            Paramètres
          </button>
        </div>
      </div>

      {/* Warning si système désactivé */}
      {!isSystemEnabled && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-3">
          <IconAlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-warning mb-1">Système en pause</h3>
            <p className="text-sm text-warning/80">
              Le Smart Follow-Up est actuellement désactivé. Aucune nouvelle action ne sera créée.
              Les actions existantes restent disponibles.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-default rounded-xl p-6">
          <div className="text-sm text-muted mb-2">Actions en attente</div>
          <div className="text-3xl font-bold text-primary">
            {statsLoading ? '...' : stats?.activeActions || 0}
          </div>
        </div>
        
        <div className="bg-card border border-default rounded-xl p-6">
          <div className="text-sm text-muted mb-2">À traiter aujourd&apos;hui</div>
          <div className="text-3xl font-bold text-accent">
            {statsLoading ? '...' : stats?.dueToday || 0}
          </div>
        </div>
        
        <div className="bg-card border border-default rounded-xl p-6">
          <div className="text-sm text-muted mb-2">Envoyés (7 jours)</div>
          <div className="text-3xl font-bold text-success">
            {statsLoading ? '...' : stats?.sentThisWeek || 0}
          </div>
        </div>
        
        <div className="bg-card border border-default rounded-xl p-6">
          <div className="text-sm text-muted mb-2">Taux de succès</div>
          <div className="text-3xl font-bold text-primary">
            {statsLoading ? '...' : `${stats?.successRate.toFixed(0) || 0}%`}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-default">
        <button
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'actions'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted hover:text-primary'
          }`}
          onClick={() => setActiveTab('actions')}
        >
          Actions en attente ({actions?.length || 0})
        </button>
        <button
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted hover:text-primary'
          }`}
          onClick={() => setActiveTab('tasks')}
        >
          Tâches planifiées ({tasks?.length || 0})
        </button>
      </div>

      {/* Actions Table */}
      {activeTab === 'actions' && (
        <DataTable<AutomationAction>
          data={actions || []}
          columns={actionColumns}
          emptyMessage="Aucune action en attente"
          onRowClick={handleRowClick}
        />
      )}

      {/* Action Detail Modal */}
      <AutomationActionDetailModal
        action={selectedAction}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAction(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Tasks Table */}
      {activeTab === 'tasks' && (
        <DataTable<FollowUpTask>
          data={tasks || []}
          columns={taskColumns}
          emptyMessage="Aucune tâche planifiée"
        />
      )}
    </div>
  );
}
