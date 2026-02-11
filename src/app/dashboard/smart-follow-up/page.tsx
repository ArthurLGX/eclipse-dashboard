'use client';

import { useState } from 'react';
import DataTable, { Column } from '@/app/components/DataTable';
import { useSmartFollowUpStats, useFollowUpTasks, useAutomationActions } from '@/hooks/useSmartFollowUp';
import { approveAutomationAction, rejectAutomationAction, updateFollowUpTask } from '@/lib/smart-follow-up-api';
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
  const { data: stats, isLoading: statsLoading } = useSmartFollowUpStats();
  const { data: tasks, mutate: mutateTasks } = useFollowUpTasks();
  const { data: actions, mutate: mutateActions } = useAutomationActions('pending');
  
  const [activeTab, setActiveTab] = useState<'actions' | 'tasks'>('actions');

  const handleApprove = async (actionId: number, documentId: string) => {
    try {
      await approveAutomationAction(documentId);
      mutateActions();
      alert('Action approuvée avec succès');
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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.confidence_score >= 0.8 
              ? 'bg-success-light text-success-text' 
              : row.confidence_score >= 0.6
                ? 'bg-warning-light text-warning-text'
                : 'bg-error-light text-error-text'
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
            className="px-3 py-1 bg-error text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
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
        const priorityLabels: Record<string, { label: string; className: string }> = {
          'urgent': { label: 'Urgent', className: 'bg-error-light text-error-text' },
          'high': { label: 'Haute', className: 'bg-warning-light text-warning-text' },
          'medium': { label: 'Moyenne', className: 'bg-info-light text-info-text' },
          'low': { label: 'Basse', className: 'bg-muted text-secondary' },
        };
        const priority = priorityLabels[row.priority] || priorityLabels['medium'];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.className}`}>
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
        const statusLabels: Record<string, { label: string; className: string }> = {
          'pending': { label: 'En attente', className: 'bg-info-light text-info-text' },
          'in_progress': { label: 'En cours', className: 'bg-warning-light text-warning-text' },
          'completed': { label: 'Terminé', className: 'bg-success-light text-success-text' },
          'cancelled': { label: 'Annulé', className: 'bg-muted text-secondary' },
          'failed': { label: 'Échoué', className: 'bg-error-light text-error-text' },
        };
        const status = statusLabels[row.status_follow_up] || statusLabels['pending'];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
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

  return (
    <div className="w-full max-w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Smart Follow-Up</h1>
        <p className="text-muted">Gestion automatisée des relances clients</p>
      </div>

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
        />
      )}

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
