'use client';

import { useParams, useRouter } from 'next/navigation';
import { updateProject, updateProjectStatusWithSync, fetchFacturesByProject, fetchProjectTasks, fetchMeetingNotes } from '@/lib/api';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  IconCalendar,
  IconEdit,
  IconFileText,
  IconCheck,
  IconProgress,
  IconClockPause,
  IconFileInvoice,
  IconPlus,
  IconShare,
  IconListCheck,
  IconX,
  IconCode,
  IconPalette,
  IconTool,
  IconNotes,
  IconClock,
  IconUsers,
  IconPlayerPlay,
  IconCopy,
  IconArrowLeft,
  IconArchive,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { usePopup } from '@/app/context/PopupContext';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { extractIdFromSlug, generateSlug } from '@/utils/slug';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { useProjectByDocumentId, clearCache } from '@/hooks/useApi';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import ShareProjectModal from '@/app/components/ShareProjectModal';
import ProjectTasks from '@/app/components/ProjectTasks';
import TaskWorkflowView, { type WorkflowTask } from '@/app/components/TaskWorkflowView';
import RichTextEditor from '@/app/components/RichTextEditor';
import ProjectGuidedTour, { useProjectGuidedTour } from '@/app/components/ProjectGuidedTour';
import QuickProjectModal from '@/app/components/QuickProjectModal';
import { 
  canDeleteProject, 
  fetchProjectCollaborators, 
  fetchUserCollaborationRequest,
  createCollaborationRequest,
  createNotification,
  isUserProjectCollaborator,
} from '@/lib/api';
import type { Project, Facture, ProjectCollaborator, ProjectTask, MeetingNote } from '@/types';
import { IconUserPlus, IconHourglass } from '@tabler/icons-react';



type TabType = 'overview' | 'tasks' | 'workflow' | 'invoices' | 'meetings';

export default function ProjectDetailsPage() {
  
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const { showGlobalPopup } = usePopup();

  // Extraire le documentId du slug
  const slug = params.slug as string;
  const documentId = extractIdFromSlug(slug);

  // Hooks avec cache
  const { data: projectData, loading, refetch: refetchProject } = useProjectByDocumentId(documentId || undefined);
  const project = projectData as Project | null;
  
  // Mettre à jour le titre de l'onglet avec le nom du projet
  useDocumentTitle(project?.title, { prefix: t('project') });

  // État local pour l'édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loadingFactures, setLoadingFactures] = useState(false);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loadingMeetingNotes, setLoadingMeetingNotes] = useState(false);

  // États pour le partage et les onglets
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSaving, setIsSaving] = useState(false);
  
  // États pour les demandes de collaboration
  const [isCollaborator, setIsCollaborator] = useState<boolean | null>(null);
  const [collaborationRequestStatus, setCollaborationRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);

  // Tour guidé pour les nouveaux projets (onboarding)
  const { isOpen: isTourOpen, openTour, closeTour } = useProjectGuidedTour();

  const PROJECT_STATUS = [
  { value: 'planning', label: t('planning'), color: 'blue', icon: IconClockPause },
  { value: 'in_progress', label: t('in_progress'), color: 'amber', icon: IconProgress },
  { value: 'completed', label: t('completed'), color: 'emerald', icon: IconCheck },
  { value: 'maintenance', label: t('maintenance'), color: 'teal', icon: IconTool },
  { value: 'on_hold', label: t('project_status_on_hold'), color: 'amber', icon: IconClockPause },
  { value: 'archived', label: t('archived'), color: 'zinc', icon: IconArchive },
];

const PROJECT_TYPES = [
    { value: 'development', label: t('development'), color: 'blue', icon: IconCode },
    { value: 'design', label: t('design'), color: 'amber', icon: IconPalette },
    { value: 'maintenance', label: t('maintenance'), color: 'emerald', icon: IconTool },
];


  // Initialiser les valeurs d'édition quand le projet change
  useEffect(() => {
    if (project) {
      setSelectedClientId(project.client?.documentId || '');
      setSelectedStatus(project.project_status || 'planning');
      setSelectedType(project.type || 'development');
      setStartDate(project.start_date?.split('T')[0] || '');
      setEndDate(project.end_date?.split('T')[0] || '');

      // Rediriger vers le bon slug si nécessaire
      const correctSlug = generateSlug(project.title, project.documentId);
      if (slug !== correctSlug) {
        router.replace(`/dashboard/projects/${correctSlug}`, { scroll: false });
      }
    }
  }, [project, slug, router]);

  // Ouvrir le tour guidé après l'onboarding
  useEffect(() => {
    if (project && !loading) {
      // Check if coming from onboarding (via localStorage flag)
      const fromOnboarding = localStorage.getItem('eclipse_show_project_tour');
      if (fromOnboarding === 'true') {
        localStorage.removeItem('eclipse_show_project_tour');
        // Small delay to let the page render
        setTimeout(() => {
          openTour(project.title);
        }, 500);
      }
    }
  }, [project, loading, openTour]);

  // Charger les factures du projet
  useEffect(() => {
    const loadFactures = async () => {
      if (!user?.id || !project?.id) return;
      try {
        setLoadingFactures(true);
        const response = await fetchFacturesByProject(user.id, project.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFactures((response as any).data || []);
      } catch (error) {
        console.error('Error fetching factures:', error);
      } finally {
        setLoadingFactures(false);
      }
    };
    loadFactures();
  }, [user?.id, project?.id]);

  // Fonction pour charger les tâches du projet (réutilisable pour refresh)
  const loadTasks = useCallback(async () => {
    if (!project?.documentId) return;
    try {
      const response = await fetchProjectTasks(project.documentId);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [project?.documentId]);

  // Charger les tâches du projet
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Refresh automatique des tâches quand l'onglet workflow devient actif
  useEffect(() => {
    if (activeTab === 'workflow') {
      loadTasks();
    }
  }, [activeTab, loadTasks]);

  // Synchronisation automatique du statut du projet basé sur les tâches (React state + API sync)
  useEffect(() => {
    if (!project?.documentId || !isOwner || tasks.length === 0) return;
    
    // Compter les tâches par statut (incluant sous-tâches)
    const allTasks = tasks.flatMap(t => [t, ...(t.subtasks || [])]);
    const inProgressCount = allTasks.filter(t => t.task_status === 'in_progress').length;
    const completedCount = allTasks.filter(t => t.task_status === 'completed').length;
    const todoCount = allTasks.filter(t => t.task_status === 'todo').length;
    const totalTasks = allTasks.length;
    
    // Déterminer le nouveau statut basé sur les tâches
    let newStatus: string | null = null;
    
    // Si au moins une tâche est en cours → projet en cours
    if (inProgressCount > 0 && selectedStatus === 'planning') {
      newStatus = 'in_progress';
    }
    // Si toutes les tâches sont terminées → projet terminé
    else if (completedCount === totalTasks && totalTasks > 0 && selectedStatus !== 'completed' && selectedStatus !== 'archived') {
      newStatus = 'completed';
    }
    // Si toutes les tâches sont à faire et projet était en cours → revenir en planification
    else if (todoCount === totalTasks && totalTasks > 0 && selectedStatus === 'in_progress') {
      newStatus = 'planning';
    }
    
    // Mise à jour optimiste du state local + sync API en background
    if (newStatus && newStatus !== selectedStatus) {
      // 1. Mise à jour immédiate du state React (UI réactive)
      setSelectedStatus(newStatus);
      
      // 2. Persistance en background (fire & forget)
      updateProjectStatusWithSync(
        project,
        newStatus as 'planning' | 'in_progress' | 'development' | 'review' | 'completed' | 'on_hold' | 'archived',
        project.client?.documentId
      ).catch(error => {
        console.error('Error syncing project status:', error);
        // Rollback en cas d'erreur
        setSelectedStatus(project.project_status || 'planning');
      });
    }
  }, [tasks, project?.documentId, project?.client?.documentId, project?.project_status, selectedStatus, isOwner]);

  // Charger les notes de réunion du projet
  useEffect(() => {
    const loadMeetingNotes = async () => {
      if (!user?.id || !project?.documentId) return;
      try {
        setLoadingMeetingNotes(true);
        const notes = await fetchMeetingNotes(user.id, { projectId: project.documentId });
        setMeetingNotes(notes);
      } catch (error) {
        console.error('Error fetching meeting notes:', error);
      } finally {
        setLoadingMeetingNotes(false);
      }
    };
    loadMeetingNotes();
  }, [user?.id, project?.documentId]);

  // Vérifier les permissions et charger les collaborateurs
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id || !project?.documentId) return;
      try {
        const [canDelete, collabResponse, isCollab, requestResponse] = await Promise.all([
          canDeleteProject(project.documentId, user.id).catch(() => project.user?.id === user.id),
          fetchProjectCollaborators(project.documentId).catch(() => ({ data: [] })),
          isUserProjectCollaborator(project.documentId, user.id).catch(() => false),
          fetchUserCollaborationRequest(project.documentId, user.id).catch(() => ({ data: [] })),
        ]);
        setIsOwner(canDelete);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCollaborators((collabResponse as any).data || []);
        
        // Vérifier si l'utilisateur est collaborateur (propriétaire ou collaborateur ajouté)
        const isOwnerOrCollab = canDelete || isCollab;
        setIsCollaborator(isOwnerOrCollab);
        
        // Vérifier si l'utilisateur a une demande de collaboration en cours
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requests = (requestResponse as any).data || [];
        if (requests.length > 0) {
          setCollaborationRequestStatus(requests[0].status || 'pending');
        } else {
          setCollaborationRequestStatus('none');
        }
      } catch {
        setIsOwner(project.user?.id === user.id);
        setCollaborators([]);
        setIsCollaborator(project.user?.id === user.id);
      }
    };
    checkPermissions();
  }, [user?.id, project?.documentId, project?.user?.id]);

  const getStatusConfig = (status: string) => {
    const config = PROJECT_STATUS.find(s => s.value === status) || PROJECT_STATUS[0];
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-info-light', text: 'text-info', border: 'border-info' },
      amber: { bg: 'bg-warning-light', text: 'text-warning', border: 'border-warning' },
      emerald: { bg: 'bg-success-light', text: 'text-success', border: 'border-success' },
      teal: { bg: 'bg-teal-100 dark:bg-teal-600/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500' },
      zinc: { bg: 'bg-zinc-100 dark:bg-zinc-700', text: 'text-zinc-600 dark:text-zinc-300', border: 'border-zinc-400' },
    };
    return { ...config, colors: colorMap[config.color] || colorMap.blue };
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;

    const formData = new FormData(e.currentTarget);
    const newTitle = formData.get('title') as string;

    setIsSaving(true);

    try {
      // Vérifier si le statut a changé
      const statusChanged = selectedStatus !== project.project_status;
      
      // Si le statut a changé, utiliser la synchronisation du pipeline
      if (statusChanged && selectedStatus) {
        await updateProjectStatusWithSync(
          project,
          selectedStatus as 'planning' | 'in_progress' | 'development' | 'review' | 'completed' | 'on_hold' | 'archived',
          project.client?.documentId
        );
        
        // Mettre à jour les autres champs séparément
        await updateProject(project, {
          title: newTitle,
          description: editDescription || '',
          notes: editNotes || '',
          type: selectedType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          client: selectedClientId || null,
        });
      } else {
        // Mise à jour normale
        await updateProject(project, {
          title: newTitle,
          description: editDescription || '',
          notes: editNotes || '',
          project_status: selectedStatus,
          type: selectedType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          client: selectedClientId || null,
        });
      }

      showGlobalPopup(t('project_updated_success') || 'Projet mis à jour avec succès', 'success');
      setIsEditMode(false);

      clearCache('project');
      clearCache('clients'); // Rafraîchir les clients si le pipeline a été mis à jour
      
      // Rediriger vers le nouveau slug si le titre a changé
      const newSlug = generateSlug(newTitle, project.documentId);
      if (newSlug !== slug) {
        router.replace(`/dashboard/projects/${newSlug}`);
      } else {
        await refetchProject();
      }
    } catch (error) {
      console.error('Error updating project:', error);
      showGlobalPopup('Erreur lors de la mise à jour', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculs pour les stats
  const daysRemaining = project?.end_date 
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Stats des tâches
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.task_status === 'completed').length;
  const tasksProgress = tasks.length > 0 
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border success border-t-success rounded-full animate-spin" />
          <p className="!text-muted">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-2">
          <IconFileText className="w-10 h-10 !text-muted" />
        </div>
        <h1 className="!text-2xl font-semibold !text-primary">Projet non trouvé</h1>
        <p className="!text-muted">Ce projet n&apos;existe pas ou a été supprimé</p>
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-2 px-4 py-2 btn-primary  transition-colors mt-2"
        >
          <IconArrowLeft className="w-4 h-4" />
          Retour aux projets
        </Link>
      </div>
    );
  }

  // Fonction pour demander l'accès au projet
  const handleRequestAccess = async () => {
    if (!user?.id || !project?.documentId) return;
    
    setIsRequestingAccess(true);
    try {
      // Créer la demande de collaboration
      await createCollaborationRequest({
        project: project.documentId,
        requester: user.id,
      });
      
      // Notifier le propriétaire et les collaborateurs
      const allCollaborators = collaborators.filter(c => c.user?.id);
      for (const collab of allCollaborators) {
        if (collab.user?.id) {
          await createNotification({
            user: collab.user.id,
            type: 'collaboration_request',
            title: t('new_collaboration_request'),
            message: `${user.username || user.email} ${t('user_wants_to_collaborate')} "${project.title}"`,
            data: {
              project_id: project.documentId,
              project_title: project.title,
              sender_name: user.username || user.email,
            },
            action_url: `/dashboard/projects/${slug}`,
          });
        }
      }
      
      setCollaborationRequestStatus('pending');
      showGlobalPopup(t('collaboration_request_sent'), 'success');
    } catch (error) {
      console.error('Error requesting access:', error);
      showGlobalPopup(t('error_occurred'), 'error');
    } finally {
      setIsRequestingAccess(false);
    }
  };

  // Afficher une page d'accès limité si l'utilisateur n'est pas collaborateur
  if (isCollaborator === false && collaborationRequestStatus !== 'approved') {
    return (
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          {/* En-tête du projet (infos basiques) */}
          <div className="bg-card p-8 !text-center mb-6">
            <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
              <IconFileText className="w-10 h-10 !text-accent-text" />
            </div>
            <h1 className="!text-2xl font-bold !text-primary mb-2">{project.title}</h1>
            {project.user?.username && (
              <p className="!text-muted mb-4">{t('by')} {project.user.username}</p>
            )}
            {(() => {
              const sc = getStatusConfig(project.project_status);
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full !text-sm font-medium border ${sc.colors.bg} ${sc.colors.text} ${sc.colors.border}`}>
                  {sc.label}
                </span>
              );
            })()}
          </div>

          {/* Message d'accès limité */}
          <div className="bg-card p-8 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-warning">
            {collaborationRequestStatus === 'pending' ? (
              <div className="!text-center">
                <div className="w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconHourglass className="w-8 h-8 !text-warning" />
                </div>
                <h2 className="!text-xl font-bold !text-primary mb-2">{t('pending_request')}</h2>
                <p className="!text-primary mb-4">{t('collaboration_request_pending')}</p>
              </div>
            ) : collaborationRequestStatus === 'rejected' ? (
              <div className="!text-center">
                <div className="w-16 h-16 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconX className="w-8 h-8 !text-danger" />
                </div>
                <h2 className="!text-xl font-bold !text-primary mb-2">{t('collaboration_rejected')}</h2>
                <p className="!text-primary mb-4">{t('your_request_was_rejected')}</p>
              </div>
            ) : (
              <div className="!text-center">
                <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconUserPlus className="w-8 h-8 !text-accent-text" />
                </div>
                <h2 className="!text-xl font-bold !text-primary mb-2">{t('request_collaboration')}</h2>
                <p className="!text-primary mb-6">{t('collaboration_request_description')}</p>
                <button
                  onClick={handleRequestAccess}
                  disabled={isRequestingAccess}
                  className="btn btn-primary flex items-center gap-2 px-6 py-3 mx-auto"
                >
                  {isRequestingAccess ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('sending')}...
                    </>
                  ) : (
                    <>
                      <IconUserPlus className="w-5 h-5" />
                      {t('request_access')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Lien retour */}
          <div className="!text-center mt-6">
            <Link
              href="/dashboard/projects"
              className="!text-accent-text hover:!text-accent/80 flex items-center gap-2 justify-center"
            >
              <IconArrowLeft className="w-4 h-4" />
              {t('back_to_projects')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.project_status);
  const canEdit = isOwner || collaborators.some(c => c.user?.id === user?.id && c.permission === 'edit');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      {/* Header moderne épuré */}
      <div className="border-b border-default">
        <div className="relative py-4">
          {/* Breadcrumb & Actions */}
          <div className="flex items-center justify-between mb-4">
            {/* Breadcrumb simplifié */}
            <div className="flex items-center gap-1.5">
              <span className="!text-muted !text-xs">{t('projects') || 'Projets'}</span>
              <span className="!text-border-default !text-xs">/</span>
              <span className="!text-secondary !text-xs font-medium">
                {PROJECT_TYPES.find(t => t.value === project.type)?.label}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <>
                  <button
                    onClick={() => setShowDuplicateModal(true)}
                    className="flex items-center gap-2 px-3 py-2 btn-ghost  transition-colors !text-sm"
                    title={t('duplicate_project') || 'Dupliquer ce projet'}
                  >
                    <IconCopy className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('duplicate') || 'Dupliquer'}</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-3 py-2 btn-ghost  transition-colors !text-sm"
                  >
                    <IconShare className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('share') || 'Partager'}</span>
                  </button>
                </>
              )}
              
              {canEdit && (
                <>
                  {isEditMode ? (
                    <>
                      {/* Bouton Annuler */}
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 btn-ghost  transition-colors !text-sm"
                      >
                        <IconX className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('cancel') || 'Annuler'}</span>
                      </button>
                      {/* Bouton Sauvegarder */}
                      <button
                        onClick={() => formRef.current?.requestSubmit()}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 btn-primary  transition-colors !text-sm disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <IconCheck className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">{isSaving ? t('saving') || 'Sauvegarde...' : t('save') || 'Sauvegarder'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditDescription(project?.description || '');
                        setEditNotes(project?.notes || '');
                        setIsEditMode(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 btn-ghost  transition-colors !text-sm"
                    >
                      <IconEdit className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('edit') || 'Modifier'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Title Row: Icon + Title + Badges */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="w-8 h-8 bg-accent  flex items-center justify-center flex-shrink-0">
              <ProjectTypeIcon type={project.type} className="w-4 h-4 !text-white" />
            </div>
            
            {isEditMode ? (
              <form ref={formRef} onSubmit={handleSave} id="edit-form" className="flex-1">
                <input
                  type="text"
                  name="title"
                  defaultValue={project.title}
                  className="!text-lg font-bold input px-3 py-1.5 w-full"
                />
              </form>
            ) : (
              <h1 className="!text-lg font-bold !text-primary tracking-tight">{project.title}</h1>
            )}
            
            {!isEditMode && (
              <>
                <span className={`badge badge-status-${project.project_status} whitespace-nowrap`}>
                  {statusConfig.label}
                </span>
                <span className="px-2 py-1 !text-xs font-medium rounded bg-muted !text-secondary whitespace-nowrap">
                  {PROJECT_TYPES.find(t => t.value === project.type)?.label}
                </span>
              </>
            )}
          </div>

          {/* Stats Row - Inline */}
          <div className="flex items-center gap-6 flex-wrap pb-5">
            <div className="flex items-center gap-2 !text-secondary !text-sm">
              <IconCalendar className="w-3.5 h-3.5" />
              <span>{t('due_date') || 'Échéance dans'}</span>
              <span className={`font-semibold flex items-center gap-1 ${
                daysRemaining !== null && daysRemaining < 0 ? '!text-danger' : '!text-primary'
              }`}>
                {daysRemaining !== null && daysRemaining < 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
                )}
                {daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)}j — En retard` : `${daysRemaining}j`) : t('no_date') || 'Non définie'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 !text-secondary !text-sm">
              <IconListCheck className="w-3.5 h-3.5" />
              <span>
                <strong className="!text-primary">{completedTasks} / {totalTasks}</strong> {t('tasks') || 'tâches'} {t('tasks_completed') || 'terminées'}
              </span>
            </div>

            {/* Global progress inline */}
            <div className="flex items-center gap-2.5 ml-auto">
              <span className="!text-xs !text-muted">{t('progress') || 'Progression'}</span>
              <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${tasksProgress}%` }}
                />
              </div>
              <span className="!text-sm font-semibold !text-primary min-w-[2.5rem] text-right">
                {tasksProgress}%
              </span>
            </div>
          </div>

          {/* Tabs - Pills style */}
          <div className="flex gap-1 bg-muted  p-1 w-fit overflow-x-auto">
            {[
              { id: 'overview' as TabType, label: t('overview') || 'Aperçu' },
              { id: 'tasks' as TabType, label: t('tasks') || 'Tâches', count: totalTasks },
              { id: 'workflow' as TabType, label: t('task_workflow') || 'Workflow' },
              { id: 'meetings' as TabType, label: t('meetings') || 'Réunions' },
              { id: 'invoices' as TabType, label: t('invoices') || 'Factures' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 !text-sm font-medium  transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-card !text-primary shadow-sm'
                    : '!text-secondary hover:!text-primary'
                }`}
              >
                {tab.label}
                {tab.id === 'tasks' && tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 !text-[10px] font-bold rounded ${
                    activeTab === tab.id ? 'bg-primary !text-white dark:bg-white dark:!text-black' : 'bg-secondary !text-secondary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Pleine largeur */}
      <div className="py-6">
        <div className="!space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Description */}
                  <div className="p-4">
                    <h2 className="!text-lg font-semibold !text-primary mb-4 flex items-center gap-2">
                      <IconFileText className="w-5 h-5 !text-success-text -text" />
                      {t('description')}
                    </h2>
                    {isEditMode ? (
                      <RichTextEditor
                        value={editDescription}
                        onChange={setEditDescription}
                        placeholder={t('describe_your_project')}
                        minHeight="150px"
                        maxHeight="400px"
                      />
                    ) : project.description ? (
                      <div 
                        className="!text-primary leading-relaxed prose prose-sm max-w-none dark:prose-invert
                          [&_h1]:!text-xl [&_h1]:font-bold [&_h1]:mb-2
                          [&_h2]:!text-lg [&_h2]:font-semibold [&_h2]:mb-2
                          [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                          [&_a]:!text-accent-text [&_a]:underline [&_img]: [&_img]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: project.description }}
                      />
                    ) : (
                      <p className="!text-primary leading-relaxed italic !text-muted">
                        {t('no_description_available')}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {(project.notes || isEditMode) && (
                    <div className="bg-card p-4">
                      <h2 className="!text-lg font-semibold !text-primary mb-4 flex items-center gap-2">
                        <IconFileText className="w-5 h-5 !text-info" />
                        {t('internal_notes')}
                      </h2>
                      {isEditMode ? (
                        <RichTextEditor
                          value={editNotes}
                          onChange={setEditNotes}
                          placeholder={t('private_notes')}
                          minHeight="100px"
                          maxHeight="300px"
                        />
                      ) : (
                        <div 
                          className="!text-primary leading-relaxed prose prose-sm max-w-none dark:prose-invert
                            [&_h1]:!text-xl [&_h1]:font-bold [&_h1]:mb-2
                            [&_h2]:!text-lg [&_h2]:font-semibold [&_h2]:mb-2
                            [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                            [&_a]:!text-accent-text [&_a]:underline [&_img]: [&_img]:max-w-full"
                          dangerouslySetInnerHTML={{ __html: project.notes || '' }}
                        />
                      )}
                    </div>
                  )}

                  {/* Save Button */}
                  {isEditMode && (
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        className="px-4 py-2 !text-primary hover:!text-primary transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        form="edit-form"
                        className="px-6 py-2 btn-primary !text-  transition-colors font-medium"
                      >
                        {t('save_changes')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-4">
                    <ProjectTasks
                      projectDocumentId={project.documentId}
                      projectName={project.title}
                      projectStartDate={project.start_date || null}
                      projectEndDate={project.end_date || null}
                      userId={user?.id || 0}
                      canEdit={canEdit}
                      collaborators={collaborators}
                      ownerInfo={project.user ? {
                        id: project.user.id,
                        documentId: project.user.documentId || '',
                        username: project.user.username,
                        email: project.user.email,
                      } : undefined}
                      useListRedesign
                      onTaskAssigned={async (taskTitle, assignedTo) => {
                        showGlobalPopup(
                          `${t('task_assigned_notification') || 'Notification envoyée à'} ${assignedTo.username}`,
                          'success'
                        );
                      }}
                      onAllTasksCompleted={async () => {
                        if (project.project_status !== 'completed') {
                          try {
                            await updateProjectStatusWithSync(
                              project,
                              'completed',
                              project.client?.documentId
                            );
                            setSelectedStatus('completed');
                            showGlobalPopup(
                              t('project_auto_completed') || 'Toutes les tâches terminées ! Projet marqué comme terminé.',
                              'success'
                            );
                            clearCache('clients');
                            await refetchProject();
                          } catch (error) {
                            console.error('Error auto-completing project:', error);
                          }
                        }
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'workflow' && (
                <motion.div
                  key="workflow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="overflow-hidden">
                    <TaskWorkflowView
                      onRefresh={loadTasks}
                      tasks={tasks.filter(t => !t.parent_task).map((task): WorkflowTask => ({
                        id: task.documentId,
                        title: task.title,
                        description: task.description,
                        status: task.task_status === 'todo' ? 'not_started' 
                              : task.task_status === 'in_progress' ? 'in_progress'
                              : task.task_status === 'completed' ? 'completed'
                              : task.task_status === 'cancelled' ? 'blocked'
                              : 'on_hold',
                        progress: task.progress,
                        priority: task.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
                        assignee: task.assigned_to?.username,
                        startDate: task.start_date || undefined,
                        endDate: task.due_date || undefined,
                        subtasks: task.subtasks?.map((st): WorkflowTask => ({
                          id: st.documentId,
                          title: st.title,
                          description: st.description,
                          status: st.task_status === 'todo' ? 'not_started'
                                : st.task_status === 'in_progress' ? 'in_progress'
                                : st.task_status === 'completed' ? 'completed'
                                : st.task_status === 'cancelled' ? 'blocked'
                                : 'on_hold',
                          progress: st.progress,
                          priority: st.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
                          assignee: st.assigned_to?.username,
                          startDate: st.start_date || undefined,
                          endDate: st.due_date || undefined,
                        })),
                      }))}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'meetings' && (
                <motion.div
                  key="meetings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="bg-card p-4">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="!text-lg font-semibold !text-primary flex items-center gap-2">
                        <IconNotes className="w-5 h-5 !text-info" />
                        {t('meeting_notes') || 'Notes de réunion'}
                      </h2>
                    </div>

                    {loadingMeetingNotes ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-info border-t-info rounded-full animate-spin" />
                      </div>
                    ) : meetingNotes.length > 0 ? (
                      <div className="space-y-4">
                        {meetingNotes.map((note) => (
                          <div
                            key={note.documentId}
                            className="p-4 bg-muted  border border-transparent hover:border-default transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium !text-primary truncate">
                                    {note.title}
                                  </h3>
                                  {note.source === 'phantom_ai' && (
                                    <span className="px-2 py-0.5 !text-xs rounded-full bg-accent-light !text-accent-text font-medium">
                                      Fathom AI
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4 !text-sm !text-muted mb-3">
                                  <span className="flex items-center gap-1">
                                    <IconCalendar className="w-4 h-4" />
                                    {new Date(note.meeting_date).toLocaleDateString('fr-FR', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  {note.duration_minutes && (
                                    <span className="flex items-center gap-1">
                                      <IconClock className="w-4 h-4" />
                                      {note.duration_minutes} min
                                    </span>
                                  )}
                                  {note.attendees && note.attendees.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <IconUsers className="w-4 h-4" />
                                      {note.attendees.length} participant{note.attendees.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>

                                {note.summary && (
                                  <p className="!text-sm !text-primary line-clamp-2 mb-3">
                                    {note.summary}
                                  </p>
                                )}

                                {note.action_items && note.action_items.length > 0 && (
                                  <div className="flex items-center gap-2 !text-sm">
                                    <IconListCheck className="w-4 h-4 !text-warning" />
                                    <span className="!text-muted">
                                      {note.action_items.filter(item => !item.completed).length} action{note.action_items.filter(item => !item.completed).length > 1 ? 's' : ''} en attente
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {note.recording_url && (
                                  <a
                                    href={note.recording_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2  bg-accent-light !text-accent-text hover:opacity-80 transition-colors"
                                    title="Voir l'enregistrement"
                                  >
                                    <IconPlayerPlay className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Expandable transcription */}
                            {note.transcription && (
                              <details className="mt-4 group">
                                <summary className="cursor-pointer !text-sm !text-accent-text hover:underline list-none flex items-center gap-1">
                                  <IconFileText className="w-4 h-4" />
                                  Voir la transcription
                                </summary>
                                <div className="mt-3 p-4 bg-page  border border-default max-h-64 overflow-y-auto">
                                  <p className="!text-sm !text-primary whitespace-pre-wrap">
                                    {note.transcription}
                                  </p>
                                </div>
                              </details>
                            )}

                            {/* Action items list */}
                            {note.action_items && note.action_items.length > 0 && (
                              <details className="mt-3 group">
                                <summary className="cursor-pointer !text-sm !text-accent-text hover:underline list-none flex items-center gap-1">
                                  <IconListCheck className="w-4 h-4" />
                                  Voir les actions ({note.action_items.length})
                                </summary>
                                <div className="mt-3 !space-y-2">
                                  {note.action_items.map((item) => (
                                    <div
                                      key={item.id}
                                      className={`flex items-start gap-2 p-2  ${
                                        item.completed ? 'bg-success-light' : 'bg-warning-light'
                                      }`}
                                    >
                                      <IconCheck className={`w-4 h-4 mt-0.5 ${
                                        item.completed ? 'text-success' : 'text-warning'
                                      }`} />
                                      <div className="flex-1">
                                        <p className={`text-sm ${item.completed ? 'line-through !text-muted' : 'text-primary'}`}>
                                          {item.text}
                                        </p>
                                        {item.assignee && (
                                          <p className="!text-xs !text-muted mt-0.5">
                                            Assigné à : {item.assignee}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="!text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconNotes className="w-8 h-8 !text-muted" />
                        </div>
                        <p className="!text-muted mb-2">{t('no_meeting_notes') || 'Aucune note de réunion'}</p>
                        <p className="!text-sm !text-muted">
                          Les notes seront ajoutées automatiquement via Fathom AI ou manuellement depuis le calendrier.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'invoices' && (
                <motion.div
                  key="invoices"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="bg-card p-4">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="!text-lg font-semibold !text-primary flex items-center gap-2">
                        <IconFileInvoice className="w-5 h-5 !text-warning" />
                        {t('project_invoices')}
                      </h2>
                      <Link
                        href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                        className="flex items-center gap-2 px-4 py-2 btn-primary  transition-colors !text-sm"
                      >
                        <IconPlus className="w-4 h-4" />
                        {t('new_invoice')}
                      </Link>
                    </div>

                    {loadingFactures ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border success border-t-success rounded-full animate-spin" />
                      </div>
                    ) : factures.length > 0 ? (
                      <div className="space-y-3">
                        {factures.map((facture) => (
                          <Link
                            key={facture.documentId}
                            href={`/dashboard/factures/${generateSlug(`${facture.reference}-${facture.client_id?.name || 'facture'}`, facture.documentId)}`}
                            className="flex items-center justify-between p-4 bg-muted  hover:bg-muted transition-all group border border-transparent hover:border-default"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3  ${
                                facture.facture_status === 'paid' ? 'bg-success-light' :
                                facture.facture_status === 'sent' ? 'bg-info-light' :
                                'bg-warning-light'
                              }`}>
                                <IconFileInvoice className={`w-5 h-5 ${
                                  facture.facture_status === 'paid' ? 'text-success' :
                                  facture.facture_status === 'sent' ? 'text-info' :
                                  'text-warning'
                                }`} />
                              </div>
                              <div>
                                <p className="!text-primary font-medium group-hover:!text-accent-text transition-colors">
                                  {facture.reference}
                                </p>
                                <p className="!text-sm !text-muted">
                                  {new Date(facture.date).toLocaleDateString('fr-FR')}
                                  {facture.client_id?.name && ` • ${facture.client_id.name}`}
                                </p>
                              </div>
                            </div>
                            <div className="!text-right">
                              <p className="!text-lg font-semibold !text-primary">
                                {(facture.number || 0).toLocaleString('fr-FR')} €
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                facture.facture_status === 'paid' ? 'badge badge-success' :
                                facture.facture_status === 'sent' ? 'badge badge-info' :
                                'badge badge-warning'
                              }`}>
                                {facture.facture_status === 'paid' ? 'Payée' :
                                 facture.facture_status === 'sent' ? 'Envoyée' : 'Brouillon'}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="!text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconFileInvoice className="w-8 h-8 !text-muted" />
                        </div>
                        <p className="!text-muted mb-4">{t('no_invoices_for_this_project')}</p>
                        <Link
                          href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                          className="inline-flex items-center gap-2 px-4 py-2 btn-primary  hover:opacity-80 transition-colors"
                        >
                          <IconPlus className="w-4 h-4" />
                          {t('create_invoice')}
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>

      {/* Share Modal */}
      <ShareProjectModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projectDocumentId={project.documentId}
        projectTitle={project.title}
        userId={user?.id || 0}
        isOwner={isOwner}
        ownerName={project.user?.username}
        ownerEmail={project.user?.email}
      />

      {/* Duplicate Project Modal */}
      <QuickProjectModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        defaultSourceProject={project}
        onProjectCreated={(newProject) => {
          clearCache('projects');
          router.push(`/dashboard/projects/${generateSlug(newProject.title, newProject.documentId)}`);
        }}
      />

      {/* Guided Tour */}
      <ProjectGuidedTour
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={closeTour}
        projectTitle={project.title}
      />
    </motion.div>
  );
}
