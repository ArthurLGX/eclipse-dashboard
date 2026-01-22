'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconProgress,
  IconClock,
  IconX,
  IconCalendar,
  IconFlag,
  IconTimeline,
  IconChartBar,
  IconFileTypePdf,
  IconMail,
  IconChevronDown,
  IconChevronUp,
  IconList,
  IconCircle,
  IconFilter,
  IconUserPlus,
  IconLogin,
  IconExternalLink,
} from '@tabler/icons-react';
import type { ProjectTask, TaskStatus, TaskPriority } from '@/types';
import { useLanguage } from '@/app/context/LanguageContext';
import useLenis from '@/utils/useLenis';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { generateSlug } from '@/utils/slug';
// Rich text description is now HTML from RichTextEditor

// API call pour récupérer les données du projet partagé
async function fetchSharedProject(token: string, t: (key: string) => string) {
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  
  // Utiliser l'endpoint public personnalisé (sans authentification requise)
  const shareResponse = await fetch(
    `${baseUrl}/api/project-share-links/public/${token}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Toujours récupérer les données fraîches
    }
  );
  
  if (shareResponse.status === 404) {
    throw new Error(t('share_link_not_found'));
  }
  
  if (shareResponse.status === 410) {
    throw new Error(t('share_link_expired'));
  }
  
  if (!shareResponse.ok) {
    const errorText = await shareResponse.text();
    console.error('API Error:', shareResponse.status, errorText);
    throw new Error(t('share_link_not_found'));
  }
  
  const shareData = await shareResponse.json();
  
  if (!shareData.data) {
    throw new Error(t('share_link_not_found'));
  }
  
  const shareLink = shareData.data;
  
  return {
    project: shareLink.project,
    shareConfig: {
      showGantt: shareLink.show_gantt ?? true,
      showProgress: shareLink.show_progress ?? true,
      showTasks: shareLink.show_tasks ?? true,
    },
    expiresAt: shareLink.expires_at,
  };
}

// Types
interface ProjectData {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  project_status: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  tasks?: ProjectTask[];
  user?: {
    username?: string;
    email?: string;
  };
}

interface ShareConfig {
  showGantt: boolean;
  showProgress: boolean;
  showTasks: boolean;
}

// Composant principal
export default function SharedProjectPage() {
  const params = useParams();
  const token = params.token as string;
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    showGantt: true,
    showProgress: true,
    showTasks: true,
  });
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  // Activer Lenis pour le smooth scroll
  useLenis();
  
  // Mettre à jour le titre de l'onglet avec le nom du projet
  useDocumentTitle(project?.title, { prefix: t('project') });

  // Options statut avec traductions
  const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = useMemo(() => [
    { value: 'todo', label: t('todo'), color: 'muted' },
    { value: 'in_progress', label: t('in_progress'), color: 'info' },
    { value: 'completed', label: t('done'), color: 'success' },
    { value: 'cancelled', label: t('cancelled'), color: 'danger' },
  ], [t]);

  // Les tâches du projet (mémorisées pour éviter les re-calculs)
  const tasks = useMemo(() => project?.tasks || [], [project?.tasks]);

  // Séparer les tâches parentes des sous-tâches pour l'affichage
  const parentTasksForDisplay = useMemo(() => tasks.filter(t => !t.parent_task), [tasks]);

  // Statistiques par statut pour les filtres (basées sur les tâches parentes)
  const taskStats = useMemo(() => ({
    all: parentTasksForDisplay.length,
    todo: parentTasksForDisplay.filter(t => t.task_status === 'todo').length,
    in_progress: parentTasksForDisplay.filter(t => t.task_status === 'in_progress').length,
    completed: parentTasksForDisplay.filter(t => t.task_status === 'completed').length,
    cancelled: parentTasksForDisplay.filter(t => t.task_status === 'cancelled').length,
    archived: parentTasksForDisplay.filter(t => t.task_status === 'archived').length,
  }), [parentTasksForDisplay]);

  // Tâches filtrées selon le statut sélectionné (uniquement les tâches parentes)
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return parentTasksForDisplay;
    return parentTasksForDisplay.filter(task => task.task_status === statusFilter);
  }, [parentTasksForDisplay, statusFilter]);

  // Options de filtres avec icônes
  const FILTER_OPTIONS: { value: TaskStatus | 'all'; label: string; icon: React.ReactNode; color: string }[] = useMemo(() => [
    { value: 'all', label: t('all'), icon: <IconList className="w-4 h-4" />, color: 'text-primary' },
    { value: 'todo', label: t('todo'), icon: <IconCircle className="w-4 h-4" />, color: 'text-muted' },
    { value: 'in_progress', label: t('in_progress'), icon: <IconProgress className="w-4 h-4" />, color: 'text-info' },
    { value: 'completed', label: t('done'), icon: <IconCheck className="w-4 h-4" />, color: 'text-success' },
    { value: 'cancelled', label: t('cancelled'), icon: <IconX className="w-4 h-4" />, color: 'text-danger' },
  ], [t]);

  useEffect(() => {
    const loadProject = async () => {
      if (!token) {
        setError(t('invalid_share_link'));
        setLoading(false);
        return;
      }

      try {
        const data = await fetchSharedProject(token, t);
        setProject(data.project);
        setShareConfig(data.shareConfig);
      } catch (err) {
        console.error('Error loading shared project:', err);
        setError(err instanceof Error ? err.message : t('loading_error'));
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [token, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <IconLoader2 className="w-12 h-12 !text-accent-light animate-spin mx-auto mb-4" />
          <p className="text-primary">{t('loading_project')}</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-page">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-default rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-6">
            <IconAlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h1 className="text-xl font-semibold text-primary mb-2">
            {t('invalid_link')}
          </h1>
          <p className="text-secondary mb-6">{error || t('link_expired_or_not_found')}</p>
          <p className="text-sm text-muted">
            {t('contact_owner_for_new_link')}
          </p>
        </motion.div>
      </div>
    );
  }

  // Calculer les stats en tenant compte des sous-tâches
  // On ne compte que les tâches parentes (les sous-tâches sont comptées via leurs parents)
  const parentTasks = tasks.filter(task => !task.parent_task);
  const completedTasks = parentTasks.filter(task => task.task_status === 'completed').length;
  
  // Calculer la progression effective (moyenne des sous-tâches si présentes)
  const getTaskEffectiveProgress = (task: ProjectTask): number => {
    if (task.subtasks && task.subtasks.length > 0) {
      const totalProgress = task.subtasks.reduce((sum, s) => sum + (s.progress || 0), 0);
      return Math.round(totalProgress / task.subtasks.length);
    }
    return task.progress || 0;
  };
  
  const overallProgress = parentTasks.length > 0
    ? Math.round(parentTasks.reduce((sum, task) => sum + getTaskEffectiveProgress(task), 0) / parentTasks.length)
    : 0;

  const daysRemaining = project.end_date 
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusConfig = {
    planning: { label: t('planning'), colorClass: 'bg-info-light text-info border-info' },
    in_progress: { label: t('in_progress'), colorClass: 'bg-warning-light text-warning-text border-warning' },
    completed: { label: t('done'), colorClass: 'bg-success-light !text-success-text -text border-success' },
  }[project.project_status] || { label: project.project_status, colorClass: 'bg-muted text-muted border-muted' };

  return (
    <div className="min-h-screen bg-page w-full px-8 pt-32 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header du projet */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Titre et infos du projet */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">{project.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.colorClass}`}>
                  {statusConfig.label}
                </span>
                {project.user?.username && (
                  <span className="text-secondary text-sm">
                    {t('by')} {project.user.username}
                  </span>
                )}
                {project.end_date && (
                  <span className="text-muted text-sm flex items-center gap-1">
                    <IconCalendar className="w-4 h-4" />
                    {t('deadline')}: {new Date(project.end_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:?subject=${t('project_progress')} - ${project.title}&body=${t('view_project_progress')} : ${typeof window !== 'undefined' ? window.location.href : ''}`}
                className="btn btn-ghost flex items-center gap-2 px-4 py-2 text-sm"
              >
                <IconMail className="w-4 h-4" />
                {t('share_button')}
              </a>
              <a
                href={`/dashboard/projects/${generateSlug(project.title, project.documentId)}`}
                className="btn btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <IconExternalLink className="w-4 h-4" />
                {t('access_project')}
              </a>
            </div>
          </div>
        </motion.div>
        {/* Description */}
        {project.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-6"
          >
            <div 
              className="text-secondary leading-relaxed prose prose-sm max-w-none dark:prose-invert
                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2
                [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                [&_a]:text-accent [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: project.description }}
            />
          </motion.div>
        )}

        {/* Stats Cards */}
        {shareConfig.showProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <div className="card p-5">
              <div className="flex items-center gap-2 text-secondary text-sm mb-2">
                <IconChartBar className="w-4 h-4" />
                {t('progression')}
              </div>
              <div className="text-3xl font-bold text-primary mb-2">{overallProgress}%</div>
              <div className="h-2 bg-hover rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-secondary text-sm mb-2">
                <IconCheck className="w-4 h-4" />
                {t('tasks_completed')}
              </div>
              <div className="text-3xl font-bold !text-success-text -text">{completedTasks}</div>
              <div className="text-sm text-muted">{t('on_tasks')} {parentTasks.length} {t('tasks_label')}</div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-secondary text-sm mb-2">
                <IconProgress className="w-4 h-4" />
                {t('in_progress')}
              </div>
              <div className="text-3xl font-bold text-info">
                {parentTasks.filter(task => task.task_status === 'in_progress').length}
              </div>
              <div className="text-sm text-muted">{t('active_tasks')}</div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-secondary text-sm mb-2">
                <IconCalendar className="w-4 h-4" />
                {t('deadline')}
              </div>
              <div className={`text-3xl font-bold ${
                daysRemaining !== null && daysRemaining < 0 ? 'text-danger' : 
                daysRemaining !== null && daysRemaining < 7 ? 'text-warning' : 'text-primary'
              }`}>
                {daysRemaining !== null ? (
                  daysRemaining < 0 ? `${Math.abs(daysRemaining)}j` : `${daysRemaining}j`
                ) : '—'}
              </div>
              <div className="text-sm text-muted">
                {daysRemaining !== null && daysRemaining < 0 ? t('days_late') : t('days_remaining')}
              </div>
            </div>
          </motion.div>
        )}

        {/* Barre de filtres */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2 text-secondary">
                  <IconFilter className="w-5 h-5" />
                  <span className="font-medium">{t('filter_by_status') || 'Filtrer par statut'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {FILTER_OPTIONS.map(option => {
                    const count = taskStats[option.value];
                    const isActive = statusFilter === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => setStatusFilter(option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-muted text-secondary hover:bg-hover hover:text-primary'
                        }`}
                      >
                        <span className={isActive ? 'text-white' : option.color}>
                          {option.icon}
                        </span>
                        {option.label}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          isActive ? 'bg-white/20' : 'bg-page'
                        }`}>
                          {count}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              
              {/* Résumé du filtre actif */}
              {statusFilter !== 'all' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-default"
                >
                  <p className="text-sm text-secondary">
                    {t('showing') || 'Affichage de'}{' '}
                    <span className="font-semibold text-primary">{filteredTasks.length}</span>{' '}
                    {t('tasks_on') || 'tâche(s) sur'}{' '}
                    <span className="font-semibold text-primary">{parentTasksForDisplay.length}</span>
                    {' • '}
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className="text-accent hover:underline"
                    >
                      {t('show_all') || 'Voir toutes'}
                    </button>
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Gantt Chart */}
        {shareConfig.showGantt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
              <IconTimeline className="w-5 h-5 !text-accent-light" />
              {t('gantt_diagram')}
              {statusFilter !== 'all' && (
                <span className="text-sm font-normal text-muted">
                  ({filteredTasks.length} {t('tasks') || 'tâches'})
                </span>
              )}
            </h2>
            {filteredTasks.length > 0 ? (
              <PublicGanttView 
                tasks={filteredTasks} 
                projectName={project.title}
              />
            ) : (
              <div className="card p-8 text-center">
                <IconTimeline className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-primary">
                  {statusFilter !== 'all' 
                    ? (t('no_tasks_with_status') || 'Aucune tâche avec ce statut')
                    : (t('no_tasks_yet') || 'Aucune tâche dans ce projet pour le moment')}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Tasks List */}
        {shareConfig.showTasks && tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
              <IconProgress className="w-5 h-5 !text-accent-light" />
              {t('tasks_list')}
              {statusFilter !== 'all' && (
                <span className="text-sm font-normal text-muted">
                  ({filteredTasks.length} {t('tasks') || 'tâches'})
                </span>
              )}
            </h2>
            {filteredTasks.length > 0 ? (
              <div className="card overflow-hidden">
                <div className="space-y-1 bg-page p-1">
                  {filteredTasks.map((task, index) => (
                    <TaskRow 
                      key={task.documentId || index} 
                      task={task} 
                      taskStatusOptions={TASK_STATUS_OPTIONS}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <IconProgress className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-primary">
                  {t('no_tasks_with_status') || 'Aucune tâche avec ce statut'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* CTA Section - Inciter à collaborer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 card bg-gradient-to-r from-accent-light via-accent/5 to-transparent border-accent-light p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                <IconUserPlus className="w-6 h-6 !text-accent" />
                {t('want_to_collaborate')}
              </h3>
              <p className="text-primary">
                {t('collaborate_description')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/login"
                className="btn btn-ghost flex items-center justify-center gap-2 px-6 py-3"
              >
                <IconLogin className="w-5 h-5" />
                {t('already_have_account')}
              </a>
              <a
                href={`/register?redirect=/dashboard/projects/${generateSlug(project.title, project.documentId)}`}
                className="btn btn-primary flex items-center justify-center gap-2 px-6 py-3"
              >
                <IconUserPlus className="w-5 h-5" />
                {t('create_account_collaborate')}
              </a>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 text-center text-muted text-sm">
          <p>{t('generated_with')}</p>
        </div>
      </div>
    </div>
  );
}

// Types pour les options
interface StatusOption {
  value: TaskStatus;
  label: string;
  color: string;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Basse', color: 'muted' },
  { value: 'medium', label: 'Moyenne', color: 'info' },
  { value: 'high', label: 'Haute', color: 'warning' },
  { value: 'urgent', label: 'Urgente', color: 'danger' },
];

// Composant ligne de tâche
function TaskRow({ task, taskStatusOptions }: { task: ProjectTask; taskStatusOptions: StatusOption[] }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = taskStatusOptions.find(s => s.value === task.task_status) || taskStatusOptions[0];
  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1];
  
  const getStatusStyle = () => {
    const colorMap: Record<string, string> = {
      muted: 'bg-muted text-muted border-muted',
      info: 'bg-info-light text-info border-info',
      success: 'bg-success-light !text-success-text -text border-success',
      danger: 'bg-danger-light text-danger border-danger',
    };
    return colorMap[statusConfig.color] || colorMap.muted;
  };

  const getPriorityStyle = () => {
    const colorMap: Record<string, string> = {
      muted: 'text-muted',
      info: 'text-info',
      warning: 'text-warning',
      danger: 'text-danger',
    };
    return colorMap[priorityConfig.color] || colorMap.muted;
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed';

  return (
    <div className={`p-4 rounded-lg bg-card hover:bg-hover transition-colors ${isOverdue ? 'border-l-2 border-danger' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          task.task_status === 'completed' ? 'bg-success-light' : 
          task.task_status === 'in_progress' ? 'bg-info-light' : 'bg-muted/30'
        }`}>
          {task.task_status === 'completed' ? (
            <IconCheck className="w-4 h-4 !text-success-text -text" />
          ) : task.task_status === 'in_progress' ? (
            <IconProgress className="w-4 h-4 text-info" />
          ) : task.task_status === 'cancelled' ? (
            <IconX className="w-4 h-4 text-danger" />
          ) : (
            <IconClock className="w-4 h-4 text-muted" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium ${
              task.task_status === 'completed' ? 'text-muted line-through' : 'text-primary'
            }`}>
              {task.title}
            </h4>
            <IconFlag className={`w-4 h-4 ${getPriorityStyle()}`} />
            <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusStyle()}`}>
              {statusConfig.label}
            </span>
          </div>
          
          {task.description && (
            <div className="mt-2">
              <div 
                className={`text-secondary leading-relaxed prose prose-sm max-w-none dark:prose-invert
                  [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:text-primary
                  [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:text-primary
                  [&_p]:mb-1 [&_p]:text-secondary
                  [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1
                  [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1
                  [&_li]:mb-0.5 [&_li]:text-secondary
                  [&_a]:text-accent [&_a]:underline
                  [&_strong]:font-semibold [&_strong]:text-primary
                  [&_em]:italic
                  [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2
                  ${!isExpanded ? 'line-clamp-2' : ''}`}
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs !text-accent hover:text-accent/80 mt-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <IconChevronUp className="w-3.5 h-3.5" />
                    {t('show_less') || 'Réduire'}
                  </>
                ) : (
                  <>
                    <IconChevronDown className="w-3.5 h-3.5" />
                    {t('show_more') || 'Voir plus'}
                  </>
                )}
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger' : ''}`}>
                <IconCalendar className="w-3.5 h-3.5" />
                {new Date(task.due_date).toLocaleDateString('fr-FR')}
              </span>
            )}
            <span>{task.progress || 0}% {t('completed_percent')}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-24 hidden sm:block flex-shrink-0">
          <div className="h-1.5 bg-hover rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                task.task_status === 'completed' ? 'bg-success' : 'bg-accent'
              }`}
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>
          <span className="text-xs text-muted mt-1 block text-center">{task.progress || 0}%</span>
        </div>
      </div>
    </div>
  );
}

// Couleurs par défaut pour les groupes de tâches
const DEFAULT_TASK_COLORS = [
  '#7c3aed', // Violet
  '#3b82f6', // Bleu
  '#10b981', // Vert
  '#f59e0b', // Orange
  '#ef4444', // Rouge
  '#ec4899', // Rose
  '#06b6d4', // Cyan
  '#8b5cf6', // Indigo
];

// Composant Gantt style Gamma pour la vue publique
function PublicGanttView({ tasks, projectName }: { 
  tasks: ProjectTask[]; 
  projectName: string;
}) {
  const { t } = useLanguage();
  const ganttRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'light' | 'dark'>('light');
  const [exportFileName, setExportFileName] = useState(`gantt-${projectName.replace(/\s+/g, '-').toLowerCase()}`);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const normalizeDate = useCallback((date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);

  const today = useMemo(() => normalizeDate(new Date()), [normalizeDate]);
  const tasksWithDates = useMemo(() => tasks.filter(task => task.start_date || task.due_date), [tasks]);

  // Grouper les tâches par couleur
  const taskGroups = useMemo(() => {
    const groups: { color: string; tasks: ProjectTask[] }[] = [];
    const colorMap = new Map<string, ProjectTask[]>();
    
    // Séparer les tâches principales des sous-tâches
    const mainTasks = tasks.filter(t => !t.parent_task);
    
    mainTasks.forEach((task, index) => {
      const color = task.color || DEFAULT_TASK_COLORS[index % DEFAULT_TASK_COLORS.length];
      if (!colorMap.has(color)) {
        colorMap.set(color, []);
      }
      colorMap.get(color)!.push(task);
    });
    
    colorMap.forEach((groupTasks, color) => {
      groups.push({ color, tasks: groupTasks });
    });
    
    return groups;
  }, [tasks]);

  // Générer un nom de couleur lisible
  const getColorName = useCallback((color: string) => {
    const colorNames: Record<string, string> = {
      '#7c3aed': 'Violet',
      '#3b82f6': 'Bleu',
      '#10b981': 'Vert',
      '#f59e0b': 'Orange',
      '#ef4444': 'Rouge',
      '#ec4899': 'Rose',
      '#06b6d4': 'Cyan',
      '#8b5cf6': 'Indigo',
    };
    return colorNames[color] || t('group') || 'Groupe';
  }, [t]);

  const toggleGroup = useCallback((color: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(color)) {
        newSet.delete(color);
      } else {
        newSet.add(color);
      }
      return newSet;
    });
  }, []);

  const ganttData = useMemo(() => {
    if (tasksWithDates.length === 0) return null;

    const allDates = tasksWithDates.flatMap(task => [
      task.start_date ? normalizeDate(new Date(task.start_date)) : null,
      task.due_date ? normalizeDate(new Date(task.due_date)) : null,
    ]).filter((d): d is Date => d !== null);

    const minDateRaw = new Date(Math.min(...allDates.map(d => d.getTime()), today.getTime()));
    const maxDateRaw = new Date(Math.max(...allDates.map(d => d.getTime()), today.getTime()));
    
    const minDate = normalizeDate(new Date(minDateRaw));
    minDate.setDate(minDate.getDate() - 3);
    const maxDate = normalizeDate(new Date(maxDateRaw));
    maxDate.setDate(maxDate.getDate() + 14);

    const totalDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const dayHeaders: Date[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      dayHeaders.push(normalizeDate(date));
    }

    // Grouper par mois
    const months: { month: number; year: number; label: string; days: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    dayHeaders.forEach((date) => {
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        months.push({ month, year, label: `${monthNames[month]} ${year}`, days: 1 });
        currentMonth = month;
        currentYear = year;
      } else {
        months[months.length - 1].days++;
      }
    });

    const todayIndex = dayHeaders.findIndex(d => d.getTime() === today.getTime());

    return { minDate, totalDays, dayHeaders, months, todayIndex };
  }, [tasksWithDates, today, normalizeDate]);

  // Scroll jusqu'à aujourd'hui avec animation
  const scrollToToday = useCallback(() => {
    if (!timelineRef.current || !ganttData) return;
    
    const { todayIndex } = ganttData;
    if (todayIndex < 0) return;
    
    // Colonnes fixes: 260px + 90px + 60px = 410px, chaque jour = 32px
    const fixedColumnsWidth = 410;
    const dayWidth = 32;
    const containerWidth = timelineRef.current.clientWidth;
    
    // Centrer la colonne d'aujourd'hui dans la vue visible
    const targetScroll = (todayIndex * dayWidth) - (containerWidth / 2) + fixedColumnsWidth + (dayWidth / 2);
    
    // Animation smooth avec requestAnimationFrame
    const startScroll = timelineRef.current.scrollLeft;
    const distance = Math.max(0, targetScroll) - startScroll;
    const duration = 600; // ms
    let startTime: number | null = null;
    
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    
    const animateScroll = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutCubic(progress);
      
      if (timelineRef.current) {
        timelineRef.current.scrollLeft = startScroll + (distance * easeProgress);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  }, [ganttData]);

  // Calculer la position d'une tâche (pour les tâches parentes, utilise les dates englobantes des sous-tâches)
  const getTaskPosition = useCallback((task: ProjectTask, useSubtasksDates: boolean = true) => {
    if (!ganttData) return { startOffset: 0, duration: 1 };
    const { minDate } = ganttData;
    
    // Pour les tâches avec sous-tâches, calculer les dates englobantes
    let effectiveStartDate = task.start_date;
    let effectiveEndDate = task.due_date;
    
    if (useSubtasksDates && task.subtasks && task.subtasks.length > 0) {
      // Collecter toutes les dates (tâche + sous-tâches)
      const allStartDates = [task.start_date, ...task.subtasks.map(s => s.start_date)]
        .filter((d): d is string => !!d)
        .map(d => new Date(d));
      const allEndDates = [task.due_date, ...task.subtasks.map(s => s.due_date)]
        .filter((d): d is string => !!d)
        .map(d => new Date(d));
      
      if (allStartDates.length > 0) {
        effectiveStartDate = new Date(Math.min(...allStartDates.map(d => d.getTime()))).toISOString().split('T')[0];
      }
      if (allEndDates.length > 0) {
        effectiveEndDate = new Date(Math.max(...allEndDates.map(d => d.getTime()))).toISOString().split('T')[0];
      }
    }
    
    const start = normalizeDate(effectiveStartDate ? new Date(effectiveStartDate) : new Date(effectiveEndDate || today));
    const end = normalizeDate(effectiveEndDate ? new Date(effectiveEndDate) : start);
    
    const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return { startOffset: Math.max(0, startOffset), duration };
  }, [ganttData, normalizeDate, today]);

  // Calculer le pourcentage effectif d'une tâche (moyenne des sous-tâches si présentes)
  const getEffectiveProgress = useCallback((task: ProjectTask): number => {
    if (task.subtasks && task.subtasks.length > 0) {
      // Moyenne des progrès des sous-tâches
      const totalProgress = task.subtasks.reduce((sum, s) => sum + (s.progress || 0), 0);
      return Math.round(totalProgress / task.subtasks.length);
    }
    return task.progress || 0;
  }, []);

  const isToday = useCallback((date: Date) => {
    return date.getTime() === today.getTime();
  }, [today]);

  const formatDateRange = useCallback((startDate?: string | null, dueDate?: string | null) => {
    if (!startDate && !dueDate) return '—';
    const start = startDate ? new Date(startDate) : null;
    const end = dueDate ? new Date(dueDate) : null;
    const formatDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
    if (start) return formatDate(start);
    if (end) return formatDate(end);
    return '—';
  }, []);

  const getDurationDays = useCallback((startDate?: string | null, dueDate?: string | null) => {
    if (!startDate || !dueDate) return 0;
    const start = new Date(startDate);
    const end = new Date(dueDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, []);

  // Fonction pour générer le HTML d'export
  const generateExportHTML = useCallback((mode: 'light' | 'dark') => {
    if (!ganttData) {
      return { html: '', colors: { bg: '#ffffff' } };
    }

    const { minDate, totalDays, dayHeaders } = ganttData;

    const lightColors = {
      bg: '#ffffff',
      bgSecondary: '#f9fafb',
      bgTertiary: '#f3f4f6',
      border: '#e5e7eb',
      textPrimary: '#111827',
      textSecondary: '#374151',
      textMuted: '#6b7280',
      headerBg: '#f3f4f6',
      headerText: '#374151',
    };
    
    const darkColors = {
      bg: '#111827',
      bgSecondary: '#1f2937',
      bgTertiary: '#374151',
      border: '#374151',
      textPrimary: '#f9fafb',
      textSecondary: '#e5e7eb',
      textMuted: '#9ca3af',
      headerBg: '#1f2937',
      headerText: '#e5e7eb',
    };
    
    const colors = mode === 'dark' ? darkColors : lightColors;

    let tasksHTML = '';
    taskGroups.forEach(group => {
      group.tasks.forEach((task) => {
        const start = normalizeDate(task.start_date ? new Date(task.start_date) : new Date(task.due_date || today));
        const end = normalizeDate(task.due_date ? new Date(task.due_date) : start);
        const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
        const widthPercent = (duration / totalDays) * 100;
        
        tasksHTML += `
          <tr style="border-bottom: 1px solid ${colors.border};">
            <td style="padding: 12px; width: 200px; font-size: 13px; background: ${colors.bg};">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${group.color};"></div>
                <span style="font-weight: 600; color: ${colors.textPrimary};">${task.title}</span>
              </div>
            </td>
            <td style="padding: 8px 0; position: relative; background: ${colors.bg};">
              <div style="position: relative; height: 24px;">
                <div style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%; min-width: 40px; height: 24px; background: ${group.color}; border-radius: 4px; display: table; table-layout: fixed;">
                  <span style="display: table-cell; vertical-align: middle; text-align: center; color: #ffffff; font-size: 11px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3); white-space: nowrap; padding: 0 4px;">${task.progress || 0}%</span>
                </div>
              </div>
            </td>
          </tr>
        `;
      });
    });

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthsForExport: { label: string; days: number }[] = [];
    let currentMonthExport = -1;
    let currentYearExport = -1;
    dayHeaders.forEach((date) => {
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month !== currentMonthExport || year !== currentYearExport) {
        monthsForExport.push({ label: `${monthNames[month]} ${year}`, days: 1 });
        currentMonthExport = month;
        currentYearExport = year;
      } else {
        monthsForExport[monthsForExport.length - 1].days++;
      }
    });

    let monthsHTML = '';
    monthsForExport.forEach((month) => {
      monthsHTML += `<th colspan="${month.days}" style="padding: 6px 4px; text-align: center; font-size: 12px; font-weight: 700; background: ${colors.bgTertiary}; color: ${colors.textPrimary}; border-left: 1px solid ${colors.border}; border-bottom: 1px solid ${colors.border};">${month.label}</th>`;
    });

    let datesHTML = '';
    dayHeaders.forEach((day) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isTodayDate = day.getTime() === today.getTime();
      const bgColor = isTodayDate ? '#fee2e2' : isWeekend ? colors.bgTertiary : colors.headerBg;
      const textColor = isTodayDate ? '#ef4444' : colors.headerText;
      datesHTML += `<th style="padding: 4px 2px; text-align: center; font-size: 11px; font-weight: ${isTodayDate ? '700' : '500'}; background: ${bgColor}; color: ${textColor}; min-width: 20px; border-left: 1px solid ${colors.border};">${day.getDate()}</th>`;
    });

    return {
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background: ${colors.bg}; padding: 20px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: ${colors.textPrimary};">
            ${projectName} - Gantt
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 12px; color: ${colors.textMuted};">
            ${t('exported_on') || 'Exporté le'} ${new Date().toLocaleDateString('fr-FR')}
          </p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid ${colors.border};">
            <thead>
              <tr style="background: ${colors.bgTertiary};">
                <th rowspan="2" style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: ${colors.headerText}; text-transform: uppercase; width: 180px; border-bottom: 2px solid ${colors.border}; background: ${colors.headerBg}; vertical-align: bottom;">
                  ${t('task') || 'Tâche'}
                </th>
                ${monthsHTML}
              </tr>
              <tr style="background: ${colors.headerBg};">
                ${datesHTML}
              </tr>
            </thead>
            <tbody>${tasksHTML}</tbody>
          </table>
          <div style="margin-top: 16px; display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px;">
            ${taskGroups.map(g => `
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 12px; background: ${g.color}; border-radius: 3px;"></div>
                <span style="color: ${colors.textSecondary}; font-weight: 500;">${getColorName(g.color)} (${g.tasks.length})</span>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      colors
    };
  }, [ganttData, taskGroups, today, projectName, t, normalizeDate, getColorName]);

  const handleExportPDF = useCallback(async (mode: 'light' | 'dark') => {
    setIsExporting(true);
    setShowExportModal(false);
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const { html, colors } = generateExportHTML(mode);
      
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = html;
      tempContainer.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 1100px;';
      document.body.appendChild(tempContainer);
      
      const exportElement = tempContainer.querySelector('div');
      if (!exportElement) {
        throw new Error('Export element not found');
      }
      
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${exportFileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: colors.bg },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
      }).from(exportElement).save();
      
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [generateExportHTML, exportFileName]);

  const previewHTML = useMemo(() => {
    return generateExportHTML(exportMode).html;
  }, [generateExportHTML, exportMode]);

  if (!ganttData || tasksWithDates.length === 0) {
    return (
      <div className="text-center py-12 card">
        <IconTimeline className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-primary">{t('no_tasks_for_gantt')}</p>
      </div>
    );
  }

  const { dayHeaders, months, todayIndex } = ganttData;

  return (
    <div className="space-y-2">
      {/* Modal d'export avec aperçu */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-default rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">
                {t('export_pdf') || 'Export PDF'}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 text-secondary hover:text-primary transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
              <div className="w-full sm:w-72 flex-shrink-0 p-4 border-b sm:border-b-0 sm:border-r border-default space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('file_name') || 'Nom du fichier'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={exportFileName}
                      onChange={(e) => setExportFileName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-muted border border-default rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <span className="text-secondary text-sm">.pdf</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('choose_export_theme') || 'Thème'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportMode('light')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                        exportMode === 'light' 
                          ? 'border-accent bg-accent-light' 
                          : 'border-default bg-muted hover:border-accent'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-800 rounded"></div>
                        </div>
                        <span className="text-xs font-medium text-primary">{t('light') || 'Clair'}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setExportMode('dark')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                        exportMode === 'dark' 
                          ? 'border-accent bg-accent-light' 
                          : 'border-default bg-muted hover:border-accent'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded bg-gray-800 border border-gray-600 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-100 rounded"></div>
                        </div>
                        <span className="text-xs font-medium text-primary">{t('dark') || 'Sombre'}</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleExportPDF(exportMode)}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 bg-accent text-white rounded-lg font-medium hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        {t('exporting') || 'Export...'}
                      </>
                    ) : (
                      <>
                        <IconFileTypePdf className="w-4 h-4" />
                        {t('export_pdf') || 'Export PDF'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-auto bg-muted">
                <div 
                  className="rounded-lg shadow-lg overflow-hidden transform scale-75 origin-top-left"
                  style={{ width: '133%' }}
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {/* Bouton Today */}
        <motion.button
          onClick={scrollToToday}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent text-white rounded-lg font-medium hover:bg-[var(--color-accent)] transition-colors shadow-sm"
        >
          <IconCalendar className="w-4 h-4" />
          {t('today') || "Aujourd'hui"}
        </motion.button>
        
        <button
          onClick={() => setShowExportModal(true)}
          disabled={isExporting}
          className="btn btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <IconFileTypePdf className="w-4 h-4" />
          {isExporting ? t('exporting') : t('export_pdf')}
        </button>
      </div>

      {/* Design Gantt style Gamma - Structure unifiée */}
      <div className="bg-card rounded-xl border border-default overflow-hidden" ref={ganttRef}>
        <div className="overflow-x-auto" ref={timelineRef}>
          <table className="w-full border-collapse" style={{ minWidth: `${450 + dayHeaders.length * 32}px` }}>
            {/* En-tête */}
            <thead className="sticky top-0 z-20">
              <tr>
                {/* Colonnes fixes */}
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider sticky left-0 z-30 w-[260px] min-w-[260px] bg-card border-b border-muted/30">
                  {t('task_name') || 'Tâche'}
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider sticky left-[260px] z-30 w-[90px] min-w-[90px] bg-card border-b border-muted/30">
                  {t('due_range') || 'Échéance'}
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider sticky left-[350px] z-30 w-[60px] min-w-[60px] bg-card border-b border-muted/30 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  {t('duration') || 'Durée'}
                </th>
                {/* Timeline header - Mois */}
                {months.map((month, i) => (
                  <th 
                    key={i}
                    colSpan={month.days}
                    className="text-center py-2 text-xs font-semibold text-primary bg-muted/10 border-b border-muted/30"
                  >
                    {month.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-30 bg-card h-7 border-b border-muted/20" />
                <th className="sticky left-[260px] z-30 bg-card border-b border-muted/20" />
                <th className="sticky left-[350px] z-30 bg-card border-b border-muted/20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" />
                {/* Timeline header - Jours */}
                {dayHeaders.map((day, j) => (
                  <th 
                    key={j}
                    className={`text-center py-1.5 text-[10px] font-medium w-8 min-w-[32px] border-b border-muted/20 ${
                      isToday(day) 
                        ? 'bg-red-500/15 text-red-500 font-bold' 
                        : day.getDay() === 0 || day.getDay() === 6
                          ? 'text-muted/60 bg-muted/5'
                          : 'text-muted'
                    }`}
                  >
                    {day.getDate()}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {taskGroups.map((group) => {
                const isExpanded = !collapsedGroups.has(group.color);
                const groupName = getColorName(group.color);
                
                return (
                  <React.Fragment key={group.color}>
                    {/* En-tête du groupe */}
                    <tr 
                      className="cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => toggleGroup(group.color)}
                    >
                      <td className="py-2.5 px-4 sticky left-0 z-20 bg-card" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: group.color }} />
                          <span className="font-medium text-primary text-sm">{groupName}</span>
                          <span className="text-xs text-muted">({group.tasks.length})</span>
                          {isExpanded ? <IconChevronUp className="w-4 h-4 text-muted ml-auto" /> : <IconChevronDown className="w-4 h-4 text-muted ml-auto" />}
                        </div>
                      </td>
                      <td className="sticky left-[260px] z-20 bg-card" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }} />
                      <td className="sticky left-[350px] z-20 bg-card shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted), 2px 0 4px rgba(0,0,0,0.1)' }} />
                      <td colSpan={dayHeaders.length} className="h-[40px] p-0 overflow-hidden" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                        <div className="relative w-full h-full">
                          <div className="absolute inset-0 flex">
                            {dayHeaders.map((day, i) => (
                              <div key={i} className={`w-8 min-w-[32px] ${isToday(day) ? 'bg-red-500/5' : ''}`} />
                            ))}
                          </div>
                          {todayIndex >= 0 && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                              style={{ left: `${(todayIndex * 32) + 16}px` }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Tâches du groupe */}
                    {isExpanded && group.tasks.map((task) => {
                      const { startOffset, duration } = getTaskPosition(task, true); // true = utiliser dates des sous-tâches
                      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                      const subtaskCount = task.subtasks?.length || 0;
                      const completedSubtasks = task.subtasks?.filter(s => s.task_status === 'completed').length || 0;
                      const effectiveProgress = getEffectiveProgress(task);
                      
                      // Calculer les dates effectives pour l'affichage (englobe sous-tâches)
                      let effectiveStartDate = task.start_date;
                      let effectiveEndDate = task.due_date;
                      if (hasSubtasks && task.subtasks) {
                        const allStartDates = [task.start_date, ...task.subtasks.map(s => s.start_date)]
                          .filter((d): d is string => !!d).map(d => new Date(d));
                        const allEndDates = [task.due_date, ...task.subtasks.map(s => s.due_date)]
                          .filter((d): d is string => !!d).map(d => new Date(d));
                        if (allStartDates.length > 0) {
                          effectiveStartDate = new Date(Math.min(...allStartDates.map(d => d.getTime()))).toISOString().split('T')[0];
                        }
                        if (allEndDates.length > 0) {
                          effectiveEndDate = new Date(Math.max(...allEndDates.map(d => d.getTime()))).toISOString().split('T')[0];
                        }
                      }

                      return (
                        <React.Fragment key={task.documentId}>
                          {/* Ligne de tâche principale */}
                          <tr className="hover:bg-muted/5 group h-[44px]">
                            {/* Task Name */}
                            <td className="py-2 px-4 sticky left-0 z-20 bg-card group-hover:bg-muted/5" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    task.task_status === 'completed' ? 'border-transparent' : ''
                                  }`}
                                  style={{ 
                                    backgroundColor: task.task_status === 'completed' ? group.color : 'transparent',
                                    borderColor: task.task_status !== 'completed' ? group.color + '50' : undefined
                                  }}
                                >
                                  {task.task_status === 'completed' && <IconCheck className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className={`text-sm truncate max-w-[160px] ${task.task_status === 'completed' ? 'text-muted line-through' : 'text-primary'}`}>
                                  {task.title}
                                </span>
                                {hasSubtasks && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-muted bg-muted/30 px-1 py-0.5 rounded">
                                    {completedSubtasks}/{subtaskCount}
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Due Range - utilise les dates effectives */}
                            <td className="py-2 px-1 text-center sticky left-[260px] z-20 bg-card group-hover:bg-muted/5" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                              <span 
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
                                style={{ backgroundColor: group.color + '20', color: group.color }}
                              >
                                {formatDateRange(effectiveStartDate, effectiveEndDate)}
                              </span>
                            </td>
                            {/* Duration - utilise les dates effectives */}
                            <td className="py-2 px-1 text-center sticky left-[350px] z-20 bg-card group-hover:bg-muted/5 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted), 2px 0 4px rgba(0,0,0,0.1)' }}>
                              <span className="text-xs text-muted whitespace-nowrap">
                                {getDurationDays(effectiveStartDate, effectiveEndDate)} {t('days_short') || 'j'}
                              </span>
                            </td>
                            {/* Timeline - Barre de Gantt avec pourcentage effectif */}
                            <td colSpan={dayHeaders.length} className="h-[44px] p-0 overflow-hidden" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                              <div className="relative w-full h-full">
                                <div className="absolute inset-0 flex">
                                  {dayHeaders.map((day, i) => (
                                    <div 
                                      key={i} 
                                      className={`w-8 min-w-[32px] ${isToday(day) ? 'bg-red-500/5' : ''} ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/3' : ''}`} 
                                    />
                                  ))}
                                </div>
                                {todayIndex >= 0 && (
                                  <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                                    style={{ left: `${(todayIndex * 32) + 16}px` }}
                                  />
                                )}
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md shadow-sm"
                                  style={{
                                    left: `${startOffset * 32}px`,
                                    width: `${Math.max(duration * 32, 32)}px`,
                                    backgroundColor: task.task_status === 'cancelled' ? 'rgb(239 68 68 / 0.4)' : group.color,
                                  }}
                                >
                                  <div className="absolute inset-y-0 left-0 bg-black/15 rounded-l-md" style={{ width: `${effectiveProgress}%` }} />
                                  <div className="relative h-full flex items-center justify-between px-2 overflow-hidden">
                                    <span className="text-[11px] text-white font-medium truncate">
                                      {duration > 3 ? task.title : ''}
                                    </span>
                                    {/* Afficher le pourcentage effectif */}
                                    {duration > 2 && (
                                      <span className="text-[10px] text-white/90 font-semibold ml-1 flex-shrink-0">
                                        {effectiveProgress}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Sous-tâches */}
                          {hasSubtasks && task.subtasks?.map(subtask => {
                            const subPos = getTaskPosition(subtask, false); // false = pas de sous-sous-tâches
                            return (
                              <tr 
                                key={subtask.documentId}
                                className="hover:bg-muted/5 h-[34px]"
                              >
                                <td className="py-1 !pl-10 !pr-4 sticky left-0 z-20 bg-card" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                      style={{ 
                                        backgroundColor: subtask.task_status === 'completed' ? group.color : 'transparent',
                                        borderColor: subtask.task_status !== 'completed' ? group.color + '40' : 'transparent'
                                      }}
                                    >
                                      {subtask.task_status === 'completed' && <IconCheck className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className={`text-xs truncate max-w-[140px] ${subtask.task_status === 'completed' ? 'text-muted line-through' : 'text-secondary'}`}>
                                      {subtask.title}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-1 px-1 text-center sticky left-[260px] z-20 bg-card" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                                  <span className="text-[9px] text-muted whitespace-nowrap">{formatDateRange(subtask.start_date, subtask.due_date)}</span>
                                </td>
                                <td className="py-1 px-1 text-center sticky left-[350px] z-20 bg-card shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted), 2px 0 4px rgba(0,0,0,0.1)' }}>
                                  <span className="text-[9px] text-muted whitespace-nowrap">{getDurationDays(subtask.start_date, subtask.due_date)} {t('days_short') || 'j'}</span>
                                </td>
                                <td colSpan={dayHeaders.length} className="h-[34px] p-0 overflow-hidden" style={{ boxShadow: 'inset 0 -1px 0 var(--color-border-muted)' }}>
                                  <div className="relative w-full h-full">
                                    <div className="absolute inset-0 flex">
                                      {dayHeaders.map((day, i) => (
                                        <div key={i} className={`w-8 min-w-[32px] ${isToday(day) ? 'bg-red-500/5' : ''}`} />
                                      ))}
                                    </div>
                                    {todayIndex >= 0 && (
                                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${(todayIndex * 32) + 16}px` }} />
                                    )}
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 h-4 rounded opacity-70"
                                      style={{
                                        left: `${subPos.startOffset * 32}px`,
                                        width: `${Math.max(subPos.duration * 32, 24)}px`,
                                        backgroundColor: subtask.task_status === 'cancelled' ? 'rgb(239 68 68 / 0.4)' : group.color,
                                      }}
                                    >
                                      <div className="absolute inset-y-0 left-0 bg-black/15 rounded-l" style={{ width: `${subtask.progress || 0}%` }} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>{t('today') || "Aujourd'hui"}</span>
        </div>
        {taskGroups.map(group => (
          <div key={group.color} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: group.color }} />
            <span>{getColorName(group.color)} ({group.tasks.length})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
