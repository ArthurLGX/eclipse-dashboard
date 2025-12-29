'use client';

import { useParams, useRouter } from 'next/navigation';
import { updateProject, fetchFacturesByProject, fetchProjectTasks } from '@/lib/api';
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
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { usePopup } from '@/app/context/PopupContext';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { extractIdFromSlug, generateSlug, generateClientSlug } from '@/utils/slug';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { useProjectByDocumentId, useClients, clearCache } from '@/hooks/useApi';
import ShareProjectModal from '@/app/components/ShareProjectModal';
import ProjectTasks from '@/app/components/ProjectTasks';
import { canDeleteProject, fetchProjectCollaborators } from '@/lib/api';
import type { Project, Client, Facture, ProjectCollaborator, ProjectTask } from '@/types';

const PROJECT_STATUS = [
  { value: 'planning', label: 'Planification', color: 'blue', icon: IconClockPause },
  { value: 'in_progress', label: 'En cours', color: 'amber', icon: IconProgress },
  { value: 'completed', label: 'Terminé', color: 'emerald', icon: IconCheck },
];

const PROJECT_TYPES = [
  { value: 'development', label: 'Développement' },
  { value: 'design', label: 'Design' },
  { value: 'maintenance', label: 'Maintenance' },
];

type TabType = 'overview' | 'tasks' | 'invoices';

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
  
  const { data: clientsData } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);

  // État local pour l'édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loadingFactures, setLoadingFactures] = useState(false);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);

  // États pour le partage et les onglets
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [bannerColor, setBannerColor] = useState<string>('auto');
  const [isSaving, setIsSaving] = useState(false);

  // Options de couleurs de bannière
  const BANNER_COLORS = [
    { value: 'auto', label: 'Automatique (selon statut)', gradient: '' },
    { value: 'blue', label: 'Bleu', gradient: 'from-blue-950/80 via-zinc-900 to-zinc-900' },
    { value: 'emerald', label: 'Émeraude', gradient: 'from-emerald-950/60 via-zinc-900 to-zinc-900' },
    { value: 'amber', label: 'Ambre', gradient: 'from-amber-950/60 via-zinc-900 to-zinc-900' },
    { value: 'purple', label: 'Violet', gradient: 'from-purple-950/60 via-zinc-900 to-zinc-900' },
    { value: 'rose', label: 'Rose', gradient: 'from-rose-950/60 via-zinc-900 to-zinc-900' },
    { value: 'cyan', label: 'Cyan', gradient: 'from-cyan-950/60 via-zinc-900 to-zinc-900' },
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

  // Vérifier les permissions et charger les collaborateurs
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id || !project?.documentId) return;
      try {
        const [canDelete, collabResponse] = await Promise.all([
          canDeleteProject(project.documentId, user.id).catch(() => project.user?.id === user.id),
          fetchProjectCollaborators(project.documentId).catch(() => ({ data: [] })),
        ]);
        setIsOwner(canDelete);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCollaborators((collabResponse as any).data || []);
      } catch {
        setIsOwner(project.user?.id === user.id);
        setCollaborators([]);
      }
    };
    checkPermissions();
  }, [user?.id, project?.documentId, project?.user?.id]);

  const getStatusConfig = (status: string) => {
    const config = PROJECT_STATUS.find(s => s.value === status) || PROJECT_STATUS[0];
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
      amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
      emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
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
      await updateProject(project.documentId, {
        title: newTitle,
        description: (formData.get('description') as string) || '',
        notes: (formData.get('notes') as string) || '',
        project_status: selectedStatus,
        type: selectedType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        client: selectedClientId || null,
      });

      showGlobalPopup(t('project_updated_success') || 'Projet mis à jour avec succès', 'success');
      setIsEditMode(false);
      setBannerColor('auto');

      clearCache('project');
      
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
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-2">
          <IconFileText className="w-10 h-10 text-zinc-600" />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-200">Projet non trouvé</h1>
        <p className="text-zinc-500">Ce projet n&apos;existe pas ou a été supprimé</p>
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors mt-2"
        >
          <IconArrowLeft className="w-4 h-4" />
          Retour aux projets
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.project_status);
  const StatusIcon = statusConfig.icon;
  const canEdit = isOwner || collaborators.some(c => c.user?.id === user?.id && c.permission === 'edit');

  // Couleur de bannière - personnalisée ou basée sur le statut
  const statusGradients: Record<string, string> = {
    planning: 'from-blue-950/80 via-zinc-900 to-zinc-900',
    in_progress: 'from-amber-950/60 via-zinc-900 to-zinc-900',
    completed: 'from-emerald-950/60 via-zinc-900 to-zinc-900',
  };
  
  const currentBannerGradient = bannerColor === 'auto' 
    ? statusGradients[selectedStatus] || statusGradients.planning
    : BANNER_COLORS.find(c => c.value === bannerColor)?.gradient || statusGradients.planning;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      {/* Hero Header - Couleur personnalisée selon le statut */}
      <div className={`relative bg-gradient-to-br ${currentBannerGradient} border-b border-zinc-800`}>
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
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Projets</span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 backdrop-blur hover:bg-zinc-700/80 text-zinc-300 rounded-lg transition-colors text-sm border border-zinc-700/50"
                >
                  <IconShare className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </button>
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
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 backdrop-blur hover:bg-zinc-700/80 text-zinc-300 rounded-lg transition-colors text-sm border border-zinc-700/50"
                      >
                        <IconX className="w-4 h-4" />
                        <span className="hidden sm:inline">Annuler</span>
                      </button>
                      {/* Bouton Sauvegarder */}
                      <button
                        onClick={() => formRef.current?.requestSubmit()}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm border border-emerald-500 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <IconCheck className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 backdrop-blur hover:bg-zinc-700/80 text-zinc-300 rounded-lg transition-colors text-sm border border-zinc-700/50"
                    >
                      <IconEdit className="w-4 h-4" />
                      <span className="hidden sm:inline">Modifier</span>
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
                    className="text-xl md:text-2xl font-bold bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500 w-full max-w-xl"
                  />
                </form>
              ) : (
                <h1 className="text-xl md:text-2xl font-bold text-zinc-100 truncate">{project.title}</h1>
              )}
            </div>

            {/* Row 2: Status, Type, Client, Couleur - alignés à gauche */}
            <div className="flex flex-wrap items-center gap-3">
              {isEditMode ? (
                <>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {PROJECT_STATUS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {PROJECT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm">Couleur :</span>
                    <select
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500"
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
                  <span className="text-zinc-400 text-sm flex items-center gap-1.5">
                    <ProjectTypeIcon type={project.type} className="w-4 h-4" />
                    {PROJECT_TYPES.find(t => t.value === project.type)?.label}
                  </span>
                  {project.client && (
                    <Link 
                      href={`/dashboard/clients/${generateClientSlug(project.client.name)}`}
                      className="text-zinc-400 hover:text-emerald-400 text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <IconBuilding className="w-4 h-4" />
                      {project.client.name}
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Row 3: Quick Stats Cards */}
            <div className="flex gap-3 flex-wrap md:flex-nowrap mt-2">
              <div className="flex-1 min-w-[120px] bg-zinc-800/40 backdrop-blur rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                  <IconCurrencyEuro className="w-3.5 h-3.5" />
                  Facturé
                </div>
                <p className="text-xl font-bold text-zinc-100">
                  {totalFactures.toLocaleString('fr-FR')} €
                </p>
                <p className="text-xs text-emerald-400">
                  {paidFactures.toLocaleString('fr-FR')} € payé
                </p>
              </div>
              
              <div className="flex-1 min-w-[120px] bg-zinc-800/40 backdrop-blur rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                  <IconFileInvoice className="w-3.5 h-3.5" />
                  Factures
                </div>
                <p className="text-xl font-bold text-zinc-100">{factures.length}</p>
                <p className="text-xs text-zinc-500">
                  {factures.filter(f => f.facture_status === 'paid').length} payées
                </p>
              </div>

              <div className="flex-1 min-w-[120px] bg-zinc-800/40 backdrop-blur rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                  <IconListCheck className="w-3.5 h-3.5" />
                  Tâches
                </div>
                <div className="flex items-center gap-2">
                  {pendingTasks > 0 && (
<p className="text-xl font-bold !text-orange-400">{pendingTasks} {t('tasks_pending')}</p>
                  )}
                </div>
                <p className="text-xs text-emerald-400">
                  {completedTasks} {t('tasks_completed')} • {tasksProgress}% {t('progress')}
                </p>
              </div>
              
              <div className="flex-1 min-w-[120px] bg-zinc-800/40 backdrop-blur rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                  <IconCalendarEvent className="w-3.5 h-3.5" />
                  Échéance
                </div>
                <p className={`text-xl font-bold ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-400' : daysRemaining !== null && daysRemaining < 7 ? 'text-amber-400' : 'text-zinc-100'}`}>
                  {daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)}j` : `${daysRemaining}j`) : '—'}
                </p>
                <p className="text-xs text-zinc-500">
                  {daysRemaining !== null && daysRemaining < 0 ? 'en retard' : 'restants'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex gap-1 mt-8 -mb-px">
            {[
              { id: 'overview' as TabType, label: 'Aperçu', icon: IconChartBar },
              { id: 'tasks' as TabType, label: 'Tâches', icon: IconListCheck, count: pendingTasks, isOrange: true },
              { id: 'invoices' as TabType, label: 'Factures', icon: IconFileInvoice, count: factures.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-zinc-950 text-emerald-400 border-t border-x border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
                    tab.isOrange 
                      ? 'bg-amber-500 text-white' 
                      : activeTab === tab.id 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-zinc-700 text-zinc-400'
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
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <IconFileText className="w-5 h-5 text-emerald-400" />
                      Description
                    </h2>
                    {isEditMode ? (
                      <textarea
                        name="description"
                        form="edit-form"
                        defaultValue={project.description}
                        rows={5}
                        placeholder="Décrivez votre projet..."
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    ) : (
                      <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {project.description || (
                          <span className="italic text-zinc-600">Aucune description</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {(project.notes || isEditMode) && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                      <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                        <IconFileText className="w-5 h-5 text-blue-400" />
                        Notes internes
                      </h2>
                      {isEditMode ? (
                        <textarea
                          name="notes"
                          form="edit-form"
                          defaultValue={project.notes || ''}
                          rows={3}
                          placeholder="Notes privées..."
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 focus:outline-none focus:border-emerald-500 resize-none"
                        />
                      ) : (
                        <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {project.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Save Button */}
                  {isEditMode && (
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        form="edit-form"
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
                      >
                        Enregistrer les modifications
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
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                    <ProjectTasks
                      projectDocumentId={project.documentId}
                      userId={user?.id || 0}
                      canEdit={canEdit}
                    />
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
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                        <IconFileInvoice className="w-5 h-5 text-amber-400" />
                        Factures du projet
                      </h2>
                      <Link
                        href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm"
                      >
                        <IconPlus className="w-4 h-4" />
                        Nouvelle facture
                      </Link>
                    </div>

                    {loadingFactures ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      </div>
                    ) : factures.length > 0 ? (
                      <div className="space-y-3">
                        {factures.map((facture) => (
                          <Link
                            key={facture.documentId}
                            href={`/dashboard/factures/${generateSlug(`${facture.reference}-${facture.client_id?.name || 'facture'}`, facture.documentId)}`}
                            className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all group border border-transparent hover:border-zinc-700"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${
                                facture.facture_status === 'paid' ? 'bg-emerald-500/10' :
                                facture.facture_status === 'sent' ? 'bg-blue-500/10' :
                                'bg-amber-500/10'
                              }`}>
                                <IconFileInvoice className={`w-5 h-5 ${
                                  facture.facture_status === 'paid' ? 'text-emerald-400' :
                                  facture.facture_status === 'sent' ? 'text-blue-400' :
                                  'text-amber-400'
                                }`} />
                              </div>
                              <div>
                                <p className="text-zinc-200 font-medium group-hover:text-emerald-400 transition-colors">
                                  {facture.reference}
                                </p>
                                <p className="text-sm text-zinc-500">
                                  {new Date(facture.date).toLocaleDateString('fr-FR')}
                                  {facture.client_id?.name && ` • ${facture.client_id.name}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-zinc-100">
                                {(facture.number || 0).toLocaleString('fr-FR')} €
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                facture.facture_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                                facture.facture_status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-amber-500/20 text-amber-400'
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
                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <IconFileInvoice className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 mb-4">Aucune facture pour ce projet</p>
                        <Link
                          href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors"
                        >
                          <IconPlus className="w-4 h-4" />
                          Créer une facture
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
            {/* Dates Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Échéances
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <IconCalendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-0.5">Début</p>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <p className="text-zinc-200 text-sm font-medium">
                        {project.start_date 
                          ? new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <IconCalendar className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-0.5">Échéance</p>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <p className={`text-sm font-medium ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-400' : 'text-zinc-200'}`}>
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
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Client
              </h3>
              {isEditMode ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Aucun client</option>
                  {clients.map(client => (
                    <option key={client.documentId} value={client.documentId}>
                      {client.name}
                    </option>
                  ))}
                </select>
              ) : project.client ? (
                <Link
                  href={`/dashboard/clients/${generateClientSlug(project.client.name)}`}
                  className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <span className="text-blue-400 font-semibold">
                      {project.client.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 font-medium truncate group-hover:text-emerald-400 transition-colors">
                      {project.client.name}
                    </p>
                    {project.client.email && (
                      <p className="text-xs text-zinc-500 truncate">{project.client.email}</p>
                    )}
                  </div>
                  <IconExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                </Link>
              ) : (
                <p className="text-zinc-500 text-sm">Aucun client assigné</p>
              )}
            </div>

            {/* Team Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Équipe
                </h3>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Gérer
                </button>
              </div>
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center gap-3 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <span className="text-amber-400 text-sm font-medium">
                      {project.user?.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{project.user?.username}</p>
                    <p className="text-xs text-amber-400">Propriétaire</p>
                  </div>
                </div>
                
                {/* Collaborators */}
                {collaborators.filter(c => !c.is_owner).map(collab => (
                  <div key={collab.documentId} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <span className="text-emerald-400 text-sm font-medium">
                        {collab.user?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{collab.user?.username}</p>
                      <p className="text-xs text-zinc-500">
                        {collab.permission === 'edit' ? 'Éditeur' : 'Lecture'}
                      </p>
                    </div>
                  </div>
                ))}
                
                {collaborators.filter(c => !c.is_owner).length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    Aucun collaborateur
                  </p>
                )}
              </div>
            </div>

            {/* Meta Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Informations
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Créé le</span>
                  <span className="text-zinc-300">
                    {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Modifié le</span>
                  <span className="text-zinc-300">
                    {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {!isOwner && (
                  <div className="flex justify-between pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500">Votre rôle</span>
                    <span className="text-amber-400 font-medium">Collaborateur</span>
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
    </motion.div>
  );
}
