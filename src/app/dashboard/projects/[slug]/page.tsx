'use client';

import { useParams, useRouter } from 'next/navigation';
import { updateProject, updateProjectStatusWithSync, fetchFacturesByProject, fetchProjectTasks, fetchMeetingNotes } from '@/lib/api';
import { useEffect, useState, useRef, useMemo } from 'react';
import {
  IconCalendar,
  IconBuilding,
  IconEdit,
  IconArrowLeft,
  IconFileText,
  IconCheck,
  IconProgress,
  IconClockPause,
  IconFileInvoice,
  IconPlus,
  IconShare,
  IconCurrencyEuro,
  IconListCheck,
  IconChartBar,
  IconX,
  IconExternalLink,
  IconCalendarEvent,
  IconCode,
  IconPalette,
  IconTool,
  IconNotes,
  IconClock,
  IconUsers,
  IconPlayerPlay,
  IconCopy,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { usePopup } from '@/app/context/PopupContext';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { extractIdFromSlug, generateSlug, generateClientSlug } from '@/utils/slug';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { useProjectByDocumentId, useClients, clearCache } from '@/hooks/useApi';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import ShareProjectModal from '@/app/components/ShareProjectModal';
import ProjectTasks from '@/app/components/ProjectTasks';
import RichTextEditor from '@/app/components/RichTextEditor';
import ProjectProfitabilityCard from '@/app/components/ProjectProfitabilityCard';
import ProjectGuidedTour, { useProjectGuidedTour } from '@/app/components/ProjectGuidedTour';
import QuickProjectModal from '@/app/components/QuickProjectModal';
import { ProfitabilityBadge, getProfitabilityStatus } from '@/app/components/StatusBadge';
import { 
  canDeleteProject, 
  fetchProjectCollaborators, 
  fetchUserCollaborationRequest,
  createCollaborationRequest,
  createNotification,
  isUserProjectCollaborator,
} from '@/lib/api';
import type { Project, Client, Facture, ProjectCollaborator, ProjectTask, MeetingNote } from '@/types';
import { IconUserPlus, IconHourglass } from '@tabler/icons-react';



type TabType = 'overview' | 'tasks' | 'invoices' | 'meetings';

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
  
  const { data: clientsData } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);

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
  const [bannerColor, setBannerColor] = useState<string>('auto');
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
];

const PROJECT_TYPES = [
    { value: 'development', label: t('development'), color: 'blue', icon: IconCode },
    { value: 'design', label: t('design'), color: 'amber', icon: IconPalette },
    { value: 'maintenance', label: t('maintenance'), color: 'emerald', icon: IconTool },
];

  // Options de couleurs de bannière - utilise les classes CSS définies dans globals.css
  const BANNER_COLORS = [
    { value: 'auto', label: t('automatic_status') || 'Automatique (selon statut)', className: '' },
    { value: 'blue', label: t('blue') || 'Bleu', className: 'banner-blue' },
    { value: 'emerald', label: t('emerald') || 'Émeraude', className: 'banner-emerald' },
    { value: 'amber', label: t('amber') || 'Ambre', className: 'banner-amber' },
    { value: 'purple', label: t('purple') || 'Violet', className: 'banner-purple' },
    { value: 'rose', label: t('rose') || 'Rose', className: 'banner-rose' },
    { value: 'cyan', label: t('cyan') || 'Cyan', className: 'banner-cyan' },
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

  // Charger les tâches du projet
  useEffect(() => {
    const loadTasks = async () => {
      if (!project?.documentId) return;
      try {
        const response = await fetchProjectTasks(project.documentId);
        setTasks(response.data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };
    loadTasks();
  }, [project?.documentId]);

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
    };
    return { ...config, colors: colorMap[config.color] };
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
          project.documentId,
          selectedStatus as 'planning' | 'in_progress' | 'development' | 'review' | 'completed' | 'on_hold' | 'archived',
          project.client?.documentId
        );
        
        // Mettre à jour les autres champs séparément
        await updateProject(project.documentId, {
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
        await updateProject(project.documentId, {
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
      setBannerColor('auto');

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
  const totalFactures = factures.reduce((sum, f) => sum + (f.number || 0), 0);
  const paidFactures = factures.filter(f => f.facture_status === 'paid').reduce((sum, f) => sum + (f.number || 0), 0);
  const daysRemaining = project?.end_date 
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Stats des tâches
  const completedTasks = tasks.filter(t => t.task_status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.task_status !== 'completed' && t.task_status !== 'cancelled').length;
  const tasksProgress = tasks.length > 0 
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-success/30 border-t-success rounded-full animate-spin" />
          <p className="text-muted">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-2">
          <IconFileText className="w-10 h-10 text-muted" />
        </div>
        <h1 className="text-2xl font-semibold text-primary">Projet non trouvé</h1>
        <p className="text-muted">Ce projet n&apos;existe pas ou a été supprimé</p>
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-2 px-4 py-2 btn-primary rounded-lg transition-colors mt-2"
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
          className="max-w-2xl mx-auto"
        >
          {/* En-tête du projet (infos basiques) */}
          <div className="card p-8 text-center mb-6">
            <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
              <IconFileText className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">{project.title}</h1>
            {project.user?.username && (
              <p className="text-muted mb-4">{t('by')} {project.user.username}</p>
            )}
            {(() => {
              const sc = getStatusConfig(project.project_status);
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${sc.colors.bg} ${sc.colors.text} ${sc.colors.border}`}>
                  {sc.label}
                </span>
              );
            })()}
          </div>

          {/* Message d'accès limité */}
          <div className="card p-8 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-warning/20">
            {collaborationRequestStatus === 'pending' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconHourglass className="w-8 h-8 text-warning" />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">{t('pending_request')}</h2>
                <p className="text-secondary mb-4">{t('collaboration_request_pending')}</p>
              </div>
            ) : collaborationRequestStatus === 'rejected' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconX className="w-8 h-8 text-danger" />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">{t('collaboration_rejected')}</h2>
                <p className="text-secondary mb-4">{t('your_request_was_rejected')}</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconUserPlus className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">{t('request_collaboration')}</h2>
                <p className="text-secondary mb-6">{t('collaboration_request_description')}</p>
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
          <div className="text-center mt-6">
            <Link
              href="/dashboard/projects"
              className="text-accent hover:text-accent/80 flex items-center gap-2 justify-center"
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
  const StatusIcon = statusConfig.icon;
  const canEdit = isOwner || collaborators.some(c => c.user?.id === user?.id && c.permission === 'edit');

  // Couleur de bannière - personnalisée ou basée sur le statut (utilise les classes CSS)
  const statusBannerClasses: Record<string, string> = {
    planning: 'banner-blue',
    in_progress: 'banner-amber',
    completed: 'banner-emerald',
  };
  
  const currentBannerClass = bannerColor === 'auto' 
    ? statusBannerClasses[selectedStatus] || statusBannerClasses.planning
    : BANNER_COLORS.find(c => c.value === bannerColor)?.className || statusBannerClasses.planning;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      {/* Hero Header - Couleur personnalisée selon le statut */}
      <div className={`relative ${currentBannerClass} border-b border-default`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div className="relative px-6 lg:px-10 py-6">
          {/* Breadcrumb & Actions */}
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors group"
            >
              <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">{t('projects') || 'Projets'}</span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <>
                  <button
                    onClick={() => setShowDuplicateModal(true)}
                    className="flex items-center gap-2 px-3 py-2 btn-ghost rounded-lg transition-colors text-sm"
                    title={t('duplicate_project') || 'Dupliquer ce projet'}
                  >
                    <IconCopy className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('duplicate') || 'Dupliquer'}</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-3 py-2 btn-ghost rounded-lg transition-colors text-sm"
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
                          setBannerColor('auto');
                        }}
                        className="flex items-center gap-2 px-3 py-2 btn-ghost rounded-lg transition-colors text-sm"
                      >
                        <IconX className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('cancel') || 'Annuler'}</span>
                      </button>
                      {/* Bouton Sauvegarder */}
                      <button
                        onClick={() => formRef.current?.requestSubmit()}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 btn-primary rounded-lg transition-colors text-sm disabled:opacity-50"
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
                      className="flex items-center gap-2 px-3 py-2 btn-ghost rounded-lg transition-colors text-sm"
                    >
                      <IconEdit className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('edit') || 'Modifier'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Project Header - Icône + Titre collés, infos en dessous */}
          <div className="flex flex-col gap-4">
            {/* Row 1: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${statusConfig.colors.bg} border ${statusConfig.colors.border} flex-shrink-0`}>
                <ProjectTypeIcon type={project.type} className={`w-6 h-6 ${statusConfig.colors.text}`} />
              </div>
              
              {isEditMode ? (
                <form ref={formRef} onSubmit={handleSave} id="edit-form" className="flex-1">
                  <input
                    type="text"
                    name="title"
                    defaultValue={project.title}
                    className="text-xl md:text-2xl font-bold input px-3 py-1.5 w-full max-w-xl"
                  />
                </form>
              ) : (
                <h1 className="text-xl md:text-2xl font-bold text-primary truncate">{project.title}</h1>
              )}
            </div>

            {/* Row 2: Status, Type, Client, Couleur - alignés à gauche */}
            <div className="flex flex-wrap items-center gap-3">
              {isEditMode ? (
                <>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="input px-3 py-1.5 text-sm"
                  >
                    {PROJECT_STATUS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="input px-3 py-1.5 text-sm"
                  >
                    {PROJECT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-sm">Couleur :</span>
                    <select
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="input px-3 py-1.5 text-sm"
                    >
                      {BANNER_COLORS.map(color => (
                        <option key={color.value} value={color.value}>{color.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.colors.bg} ${statusConfig.colors.text} ${statusConfig.colors.border}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusConfig.label}
                  </span>
                  <span className="text-secondary text-sm flex items-center gap-1.5">
                    <ProjectTypeIcon type={project.type} className="w-4 h-4" />
                    {PROJECT_TYPES.find(t => t.value === project.type)?.label}
                  </span>
                  {project.client && (
                    <Link 
                      href={`/dashboard/clients/${generateClientSlug(project.client.name)}`}
                      className="text-secondary hover:text-accent text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <IconBuilding className="w-4 h-4" />
                      {project.client.name}
                    </Link>
                  )}
                  {/* Badges de rentabilité */}
                  {(() => {
                    const activeTasks = tasks.filter(t => t.task_status !== 'cancelled');
                    const estimatedHours = activeTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
                    const actualHours = activeTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
                    if (estimatedHours > 0) {
                      const status = getProfitabilityStatus(actualHours, estimatedHours);
                      return <ProfitabilityBadge status={status} />;
                    }
                    return null;
                  })()}
                </>
              )}
            </div>

            {/* Row 3: Quick Stats Cards */}
            <div className="flex gap-3 flex-wrap md:flex-nowrap mt-2">
              <div className="flex-1 min-w-[120px] bg-muted backdrop-blur rounded-xl p-4 border border-default">
                <div className="flex items-center gap-2 text-muted text-xs mb-1">
                  <IconCurrencyEuro className="w-3.5 h-3.5" />
                  {t('billed') || 'Facturé'}
                </div>
                <p className="text-xl font-bold text-primary">
                  {totalFactures.toLocaleString('fr-FR')} €
                </p>
                <p className="text-xs text-success">
                  {paidFactures.toLocaleString('fr-FR')} € {t('paid') || 'payé'}
                </p>
              </div>
              
              <div className="flex-1 min-w-[120px] bg-muted backdrop-blur rounded-xl p-4 border border-default">
                <div className="flex items-center gap-2 text-muted text-xs mb-1">
                  <IconFileInvoice className="w-3.5 h-3.5" />
                  {t('invoices') || 'Factures'}
                </div>
                <p className="text-xl font-bold text-primary">{factures.length}</p>
                <p className="text-xs text-muted">
                  {factures.filter(f => f.facture_status === 'paid').length} {t('paid') || 'payées'}
                </p>
              </div>

              <div className="flex-1 min-w-[120px] bg-muted backdrop-blur rounded-xl p-4 border border-default">
                <div className="flex items-center gap-2 text-muted text-xs mb-1">
                  <IconListCheck className="w-3.5 h-3.5" />
                  {t('tasks')}
                </div>
                <div className="flex items-center gap-2">
                  {pendingTasks > 0 && (
                    <p className="text-xl font-bold text-warning">{pendingTasks} {t('tasks_pending')}</p>
                  )}
                </div>
                <p className="text-xs text-success">
                  {completedTasks} {t('tasks_completed')} • {tasksProgress}% {t('progress')}
                </p>
              </div>
              
              <div className="flex-1 min-w-[120px] bg-muted backdrop-blur rounded-xl p-4 border border-default">
                <div className="flex items-center gap-2 text-muted text-xs mb-1">
                  <IconCalendarEvent className="w-3.5 h-3.5" />
                  {t('due_date')}
                </div>
                <p className={`text-xl font-bold ${daysRemaining !== null && daysRemaining < 0 ? 'text-danger' : daysRemaining !== null && daysRemaining < 7 ? 'text-warning' : 'text-primary'}`}>
                  {daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)}j` : `${daysRemaining}j`) : t('no_date') || 'Aucune date' || '—'}
                </p>
                <p className="text-xs text-muted">
                  {daysRemaining !== null && daysRemaining < 0 ? t('overdue') || 'En retard' : t('remaining') || 'Restant'}
                </p> 
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex gap-1 mt-8 -mb-px">
            {[
              { id: 'overview' as TabType, label: t('overview'), icon: IconChartBar },
              { id: 'tasks' as TabType, label: t('tasks'), icon: IconListCheck, count: pendingTasks, isOrange: true },
              { id: 'meetings' as TabType, label: t('meetings') || 'Réunions', icon: IconNotes, count: meetingNotes.length },
              { id: 'invoices' as TabType, label: t('invoices'), icon: IconFileInvoice, count: factures.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-page text-accent border-t border-x border-default'
                    : 'text-secondary hover:text-primary hover:bg-hover'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
                    tab.isOrange 
                      ? 'bg-warning text-accent-text' 
                      : activeTab === tab.id 
                        ? 'bg-accent-light text-accent' 
                        : 'bg-muted text-secondary'
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
      <div className="px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Column */}
          <div className="xl:col-span-3 space-y-6">
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
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                      <IconFileText className="w-5 h-5 text-success" />
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
                        className="text-secondary leading-relaxed prose prose-sm max-w-none dark:prose-invert
                          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2
                          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2
                          [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                          [&_a]:text-accent [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: project.description }}
                      />
                    ) : (
                      <p className="text-secondary leading-relaxed italic text-muted">
                        {t('no_description_available')}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {(project.notes || isEditMode) && (
                    <div className="card p-6">
                      <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <IconFileText className="w-5 h-5 text-info" />
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
                          className="text-secondary leading-relaxed prose prose-sm max-w-none dark:prose-invert
                            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2
                            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2
                            [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                            [&_a]:text-accent [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full"
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
                        className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        form="edit-form"
                        className="px-6 py-2 btn-primary rounded-lg transition-colors font-medium"
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
                  <div className="card p-6">
                    <ProjectTasks
                      projectDocumentId={project.documentId}
                      userId={user?.id || 0}
                      canEdit={canEdit}
                      collaborators={collaborators}
                      ownerInfo={project.user ? {
                        id: project.user.id,
                        documentId: project.user.documentId || '',
                        username: project.user.username,
                        email: project.user.email,
                      } : undefined}
                      onTaskAssigned={async (taskTitle, assignedTo) => {
                        // TODO: Implémenter l'envoi d'email ici
                        showGlobalPopup(
                          `${t('task_assigned_notification') || 'Notification envoyée à'} ${assignedTo.username}`, 
                          'success'
                        );
                      }}
                      onAllTasksCompleted={async () => {
                        // Mettre le projet en statut "completed" automatiquement et synchroniser le pipeline
                        if (project.project_status !== 'completed') {
                          try {
                            await updateProjectStatusWithSync(
                              project.documentId,
                              'completed',
                              project.client?.documentId
                            );
                            setSelectedStatus('completed');
                            showGlobalPopup(
                              t('project_auto_completed') || 'Toutes les tâches terminées ! Projet marqué comme terminé.',
                              'success'
                            );
                            clearCache('clients'); // Rafraîchir les clients (pipeline mis à jour)
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

              {activeTab === 'meetings' && (
                <motion.div
                  key="meetings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <IconNotes className="w-5 h-5 text-info" />
                        {t('meeting_notes') || 'Notes de réunion'}
                      </h2>
                    </div>

                    {loadingMeetingNotes ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-info/30 border-t-info rounded-full animate-spin" />
                      </div>
                    ) : meetingNotes.length > 0 ? (
                      <div className="space-y-4">
                        {meetingNotes.map((note) => (
                          <div
                            key={note.documentId}
                            className="p-4 bg-hover rounded-xl border border-transparent hover:border-default transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium text-primary truncate">
                                    {note.title}
                                  </h3>
                                  {note.source === 'phantom_ai' && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-accent-light text-accent font-medium">
                                      Fathom AI
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted mb-3">
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
                                  <p className="text-sm text-secondary line-clamp-2 mb-3">
                                    {note.summary}
                                  </p>
                                )}

                                {note.action_items && note.action_items.length > 0 && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <IconListCheck className="w-4 h-4 text-warning" />
                                    <span className="text-muted">
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
                                    className="p-2 rounded-lg bg-accent-light text-accent hover:opacity-80 transition-colors"
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
                                <summary className="cursor-pointer text-sm text-accent hover:underline list-none flex items-center gap-1">
                                  <IconFileText className="w-4 h-4" />
                                  Voir la transcription
                                </summary>
                                <div className="mt-3 p-4 bg-page rounded-lg border border-default max-h-64 overflow-y-auto">
                                  <p className="text-sm text-secondary whitespace-pre-wrap">
                                    {note.transcription}
                                  </p>
                                </div>
                              </details>
                            )}

                            {/* Action items list */}
                            {note.action_items && note.action_items.length > 0 && (
                              <details className="mt-3 group">
                                <summary className="cursor-pointer text-sm text-accent hover:underline list-none flex items-center gap-1">
                                  <IconListCheck className="w-4 h-4" />
                                  Voir les actions ({note.action_items.length})
                                </summary>
                                <div className="mt-3 space-y-2">
                                  {note.action_items.map((item) => (
                                    <div
                                      key={item.id}
                                      className={`flex items-start gap-2 p-2 rounded-lg ${
                                        item.completed ? 'bg-success-light' : 'bg-warning-light'
                                      }`}
                                    >
                                      <IconCheck className={`w-4 h-4 mt-0.5 ${
                                        item.completed ? 'text-success' : 'text-warning'
                                      }`} />
                                      <div className="flex-1">
                                        <p className={`text-sm ${item.completed ? 'line-through text-muted' : 'text-primary'}`}>
                                          {item.text}
                                        </p>
                                        {item.assignee && (
                                          <p className="text-xs text-muted mt-0.5">
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
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconNotes className="w-8 h-8 text-muted" />
                        </div>
                        <p className="text-muted mb-2">{t('no_meeting_notes') || 'Aucune note de réunion'}</p>
                        <p className="text-sm text-muted">
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
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <IconFileInvoice className="w-5 h-5 text-warning" />
                        {t('project_invoices')}
                      </h2>
                      <Link
                        href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                        className="flex items-center gap-2 px-4 py-2 btn-primary rounded-lg transition-colors text-sm"
                      >
                        <IconPlus className="w-4 h-4" />
                        {t('new_invoice')}
                      </Link>
                    </div>

                    {loadingFactures ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                      </div>
                    ) : factures.length > 0 ? (
                      <div className="space-y-3">
                        {factures.map((facture) => (
                          <Link
                            key={facture.documentId}
                            href={`/dashboard/factures/${generateSlug(`${facture.reference}-${facture.client_id?.name || 'facture'}`, facture.documentId)}`}
                            className="flex items-center justify-between p-4 bg-hover rounded-xl hover:bg-muted transition-all group border border-transparent hover:border-default"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${
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
                                <p className="text-primary font-medium group-hover:text-accent transition-colors">
                                  {facture.reference}
                                </p>
                                <p className="text-sm text-muted">
                                  {new Date(facture.date).toLocaleDateString('fr-FR')}
                                  {facture.client_id?.name && ` • ${facture.client_id.name}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-primary">
                                {(facture.number || 0).toLocaleString('fr-FR')} €
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                facture.facture_status === 'paid' ? 'bg-success-light text-success' :
                                facture.facture_status === 'sent' ? 'bg-info-light text-info' :
                                'bg-warning-light text-warning'
                              }`}>
                                {facture.facture_status === 'paid' ? 'Payée' :
                                 facture.facture_status === 'sent' ? 'Envoyée' : 'Brouillon'}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconFileInvoice className="w-8 h-8 text-muted" />
                        </div>
                        <p className="text-muted mb-4">{t('no_invoices_for_this_project')}</p>
                        <Link
                          href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-light text-accent rounded-lg hover:opacity-80 transition-colors"
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Profitability Card - Nouveau bloc rentabilité */}
            <ProjectProfitabilityCard tasks={tasks} />

            {/* Dates Card */}
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('due_dates')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-success-light rounded-lg">
                    <IconCalendar className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-0.5">{t('start_date')}</p>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full input rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <p className="text-primary text-sm font-medium">
                        {project.start_date 
                          ? new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-danger-light rounded-lg">
                    <IconCalendar className="w-4 h-4 text-danger" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-0.5">{t('due_date')}</p>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full input rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <p className={`text-sm font-medium ${daysRemaining !== null && daysRemaining < 0 ? 'text-danger' : 'text-primary'}`}>
                        {project.end_date 
                          ? new Date(project.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Card */}
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('client')}
              </h3>
              {isEditMode ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full input px-3 py-2 text-sm"
                >
                    <option value="">{t('no_client_assigned')}</option>
                  {clients.map(client => (
                    <option key={client.documentId} value={client.documentId}>
                      {client.name}
                    </option>
                  ))}
                </select>
              ) : project.client ? (
                <Link
                  href={`/dashboard/clients/${generateClientSlug(project.client.name)}`}
                  className="flex items-center gap-3 p-3 bg-hover rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="w-10 h-10 bg-info-light rounded-full flex items-center justify-center">
                    <span className="text-info font-semibold">
                      {project.client.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary font-medium truncate group-hover:text-accent transition-colors">
                      {project.client.name}
                    </p>
                    {project.client.email && (
                      <p className="text-xs text-muted truncate">{project.client.email}</p>
                    )}
                  </div>
                  <IconExternalLink className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                </Link>
              ) : (
                <p className="text-muted text-sm">{t('no_client_assigned')}</p>
              )}
            </div>

            {/* Team Card */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                  {t('team')}
                </h3>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="text-xs text-accent hover:opacity-80 transition-colors"
                >
                  {t('manage')}
                </button>
              </div>
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center gap-3 p-2 bg-warning-light rounded-lg border border-warning">
                  <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center">
                    <span className="text-accent-text text-sm font-medium">
                      {project.user?.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary truncate">{project.user?.username}</p>
                    <p className="text-xs text-warning">{t('owner')}</p>
                  </div>
                </div>
                
                {/* Collaborators */}
                {collaborators.filter(c => !c.is_owner).map(collab => (
                  <div key={collab.documentId} className="flex items-center gap-3 p-2 bg-hover rounded-lg">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <span className="text-accent-text text-sm font-medium">
                        {collab.user?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary truncate">{collab.user?.username}</p>
                      <p className="text-xs text-muted">
                        {collab.permission === 'edit' ? t('editor') : t('reader')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {collaborators.filter(c => !c.is_owner).length === 0 && (
                  <p className="text-xs text-muted text-center py-2">
                    {t('no_collaborators')}
                  </p>
                )}
              </div>
            </div>

            {/* Meta Card */}
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('information')}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">{t('created_at')}</span>
                  <span className="text-secondary">
                    {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t('updated_at')}</span>
                  <span className="text-secondary">
                    {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {!isOwner && (
                  <div className="flex justify-between pt-2 border-t border-default">
                    <span className="text-muted">{t('your_role')}</span>
                    <span className="text-warning font-medium">{t('collaborator')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
