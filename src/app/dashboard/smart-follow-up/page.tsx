'use client';

import { useState } from 'react';
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
  IconBriefcase,
  IconBuilding,
  IconMail,
  IconChevronRight,
} from '@tabler/icons-react';
import AutomationActionDetailModal from '@/app/components/AutomationActionDetailModal';
import RuleManagementModal from '@/app/components/RuleManagementModal';
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
import type { AutomationAction } from '@/types/smart-follow-up';

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
  const [showRulesModal, setShowRulesModal] = useState(false);

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

  const isSystemEnabled = settings?.enabled ?? true;

  // Qualifier un lead
  const handleQualifyLead = async (action: AutomationAction, status: 'qualified' | 'rejected') => {
    try {
      if (status === 'qualified') {
        await approveAutomationAction(action.documentId);
        alert('✓ Lead qualifié avec succès !');
      } else {
        await rejectAutomationAction(action.documentId, 'Lead non qualifié');
        alert('Lead rejeté');
      }
      mutateActions();
    } catch (error) {
      console.error('Erreur lors de la qualification:', error);
      alert('Erreur lors de la qualification');
    }
  };

  // Déterminer le type de contact
  const getContactType = (action: AutomationAction) => {
    const subject = action.proposed_content.subject.toLowerCase();
    const body = action.proposed_content.body.toLowerCase();
    const text = `${subject} ${body}`;
    
    if (text.includes('freelance') || text.includes('indépendant')) return { label: 'Freelance', icon: IconUser, color: 'text-blue-500' };
    if (text.includes('agence') || text.includes('agency')) return { label: 'Agence', icon: IconBriefcase, color: 'text-purple-500' };
    if (text.includes('b2b') || text.includes('entreprise')) return { label: 'B2B', icon: IconBuilding, color: 'text-green-500' };
    return { label: 'B2C', icon: IconMail, color: 'text-orange-500' };
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Compact Header avec Breadcrumb et Actions */}
      <div className="flex-shrink-0 border-b border-default bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Dashboard</span>
            <IconChevronRight className="w-4 h-4" />
            <span className="!text-accent font-medium">Smart Follow-Up</span>
            {settings && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                isSystemEnabled 
                  ? 'bg-success-light text-success-text' 
                  : 'bg-warning-light text-warning-text'
              }`}>
                {isSystemEnabled ? '● Actif' : '⏸ Pause'}
              </span>
            )}
          </div>

          {/* Actions compactes */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-500/10 text-purple-600 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20"
              title="Règles"
            >
              <IconFilter className="w-4 h-4" />
              {settings?.custom_rules && settings.custom_rules.filter(r => r.enabled).length > 0 && (
                <span className="!text-xs font-medium">
                  {settings.custom_rules.filter(r => r.enabled).length}
                </span>
              )}
            </button>

            <button
              onClick={handleToggleSystem}
              disabled={togglingPause}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                isSystemEnabled
                  ? 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20'
                  : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
              } disabled:opacity-50`}
            >
              {isSystemEnabled ? <IconPlayerPause className="w-4 h-4" /> : <IconPlayerPlay className="w-4 h-4" />}
            </button>

            <button
              onClick={() => router.push('/dashboard/smart-follow-up/settings')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary text-primary rounded-lg hover:bg-hover transition-colors border border-default"
            >
              <IconSettings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Compacts */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-3 px-6 py-3 bg-card/50 border-b border-default">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <IconAlertCircle className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="!text-xs text-muted">En attente</div>
            <div className="!text-xl font-bold text-primary">
              {statsLoading ? '...' : stats?.activeActions || 0}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <IconMail className="w-5 h-5 text-warning" />
          </div>
          <div>
            <div className="!text-xs text-muted">Aujourd&apos;hui</div>
            <div className="!text-xl font-bold text-accent">
              {statsLoading ? '...' : stats?.dueToday || 0}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <IconCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <div className="!text-xs text-muted">Cette semaine</div>
            <div className="!text-xl font-bold text-success">
              {statsLoading ? '...' : stats?.sentThisWeek || 0}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <span className="!text-lg font-bold text-purple-500">%</span>
          </div>
          <div>
            <div className="!text-xs text-muted">Taux succès</div>
            <div className="!text-xl font-bold text-primary">
              {statsLoading ? '...' : `${stats?.successRate.toFixed(0) || 0}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Warning si système désactivé */}
      {!isSystemEnabled && (
        <div className="flex-shrink-0 mx-6 mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
          <IconAlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="!text-xs text-warning">
            Système en pause - Aucune nouvelle action ne sera créée
          </p>
        </div>
      )}

      {/* Tabs compacts */}
      <div className="flex-shrink-0 flex gap-1 px-6 pt-3 pb-2 bg-card">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'actions'
              ? 'bg-accent text-white'
              : 'text-muted hover:bg-secondary'
          }`}
          onClick={() => setActiveTab('actions')}
        >
          Leads ({actions?.length || 0})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'tasks'
              ? 'bg-accent text-white'
              : 'text-muted hover:bg-secondary'
          }`}
          onClick={() => setActiveTab('tasks')}
        >
          Tâches ({tasks?.length || 0})
        </button>
      </div>

      {/* Liste des conversations (style Walego) */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'actions' && (
          <div className="space-y-2">
            {!actions || actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <IconMail className="w-16 h-16 text-muted opacity-50 mb-4" />
                <p className="!text-muted">Aucun lead en attente de qualification</p>
              </div>
            ) : (
              actions.map((action) => {
                const contactType = getContactType(action);
                const ContactIcon = contactType.icon;
                
                return (
                  <div
                    key={action.id}
                    className="group bg-card border border-default rounded-xl p-4 hover:border-accent/50 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleRowClick(action)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar/Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <ContactIcon className={`w-6 h-6 ${contactType.color}`} />
                      </div>

                      {/* Contenu principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-primary">
                                {action.client?.name || 'Contact inconnu'}
                              </h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${contactType.color} bg-current/10`}>
                                {contactType.label}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                action.confidence_score >= 0.8 
                                  ? 'bg-success-light text-success-text' 
                                  : action.confidence_score >= 0.6
                                    ? 'bg-warning-light text-warning-text'
                                    : 'bg-error-light text-error-text'
                              }`}>
                                {(action.confidence_score * 100).toFixed(0)}% confiance
                              </span>
                            </div>
                            <div className="!text-sm text-muted mb-1">
                              {action.client?.email || 'Email non disponible'}
                            </div>
                          </div>
                          <span className="!text-xs text-muted whitespace-nowrap">
                            {formatRelativeTime(new Date(action.createdAt))}
                          </span>
                        </div>

                        <div className="mb-3">
                          <p className="!text-sm font-medium text-primary mb-1">
                            {action.proposed_content.subject}
                          </p>
                          <p className="!text-sm text-muted line-clamp-2">
                            {action.proposed_content.body}
                          </p>
                        </div>

                        {/* Actions rapides */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQualifyLead(action, 'qualified');
                            }}
                            className="px-3 py-1.5 bg-success text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
                          >
                            <IconCheck className="w-4 h-4" />
                            Qualifier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQualifyLead(action, 'rejected');
                            }}
                            className="px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-medium hover:bg-error/20 transition-colors flex items-center gap-1"
                          >
                            <IconX className="w-4 h-4" />
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tasks Table (mode compact) */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {!tasks || tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <IconAlertCircle className="w-16 h-16 text-muted opacity-50 mb-4" />
                <p className="!text-muted">Aucune tâche planifiée</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-card border border-default rounded-xl p-4 hover:border-accent/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-primary">
                          {task.contact?.name || 'N/A'}
                        </h3>
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
                      </div>
                      <div className="!text-sm text-muted">
                        Planifié pour le {new Date(task.scheduled_for).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePauseTask(task.id, task.documentId)}
                      disabled={task.status_follow_up === 'cancelled' || task.status_follow_up === 'completed'}
                      className="px-3 py-1.5 bg-muted text-primary rounded-lg text-xs hover:bg-hover transition-colors disabled:opacity-50"
                    >
                      Pause
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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

      {/* Rule Management Modal */}
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
              alert('✓ Règles enregistrées avec succès !');
            } catch (error) {
              console.error('Erreur lors de la sauvegarde des règles:', error);
              alert('❌ Erreur lors de la sauvegarde des règles');
            }
          }
        }}
      />
    </div>
  );
}
