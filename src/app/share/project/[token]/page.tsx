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
          <IconLoader2 className="w-12 h-12 text-accent-light animate-spin mx-auto mb-4" />
          <p className="text-secondary">{t('loading_project')}</p>
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

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter(task => task.task_status === 'completed').length;
  const overallProgress = tasks.length > 0
    ? Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length)
    : 0;

  const daysRemaining = project.end_date 
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusConfig = {
    planning: { label: t('planning'), colorClass: 'bg-info-light text-info border-info' },
    in_progress: { label: t('in_progress'), colorClass: 'bg-warning-light text-warning border-warning' },
    completed: { label: t('done'), colorClass: 'bg-success-light text-success border-success' },
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
              <div className="text-3xl font-bold text-success">{completedTasks}</div>
              <div className="text-sm text-muted">{t('on_tasks')} {tasks.length} {t('tasks_label')}</div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-secondary text-sm mb-2">
                <IconProgress className="w-4 h-4" />
                {t('in_progress')}
              </div>
              <div className="text-3xl font-bold text-info">
                {tasks.filter(task => task.task_status === 'in_progress').length}
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

        {/* Gantt Chart */}
        {shareConfig.showGantt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
              <IconTimeline className="w-5 h-5 text-accent-light" />
              {t('gantt_diagram')}
            </h2>
            {tasks.length > 0 ? (
              <PublicGanttView 
                tasks={tasks} 
                projectName={project.title}
                taskStatusOptions={TASK_STATUS_OPTIONS}
              />
            ) : (
              <div className="card p-8 text-center">
                <IconTimeline className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-secondary">{t('no_tasks_yet') || 'Aucune tâche dans ce projet pour le moment'}</p>
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
              <IconProgress className="w-5 h-5 text-accent-light" />
              {t('tasks_list')}
            </h2>
            <div className="card overflow-hidden">
              <div className="space-y-1 bg-page p-1">
                {tasks.map((task, index) => (
                  <TaskRow 
                    key={task.documentId || index} 
                    task={task} 
                    taskStatusOptions={TASK_STATUS_OPTIONS}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* CTA Section - Inciter à collaborer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 card bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-accent/20 p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                <IconUserPlus className="w-6 h-6 text-accent" />
                {t('want_to_collaborate')}
              </h3>
              <p className="text-secondary">
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
      success: 'bg-success-light text-success border-success',
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
            <IconCheck className="w-4 h-4 text-success" />
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
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-1 transition-colors"
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

// Composant Gantt simplifié pour la vue publique
function PublicGanttView({ tasks, projectName, taskStatusOptions }: { 
  tasks: ProjectTask[]; 
  projectName: string;
  taskStatusOptions: StatusOption[];
}) {
  const { t } = useLanguage();
  const ganttRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'light' | 'dark'>('light');
  const [exportFileName, setExportFileName] = useState(`gantt-${projectName.replace(/\s+/g, '-').toLowerCase()}`);

  const normalizeDate = useCallback((date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);

  const getISOWeekNumber = useCallback((date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  const today = useMemo(() => normalizeDate(new Date()), [normalizeDate]);
  const tasksWithDates = useMemo(() => tasks.filter(task => task.start_date || task.due_date), [tasks]);

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

    // Grouper par semaines
    const weeks: { start: Date; days: Date[] }[] = [];
    let currentWeek: Date[] = [];
    let weekStart = dayHeaders[0];
    dayHeaders.forEach((date, i) => {
      if (date.getDay() === 1 && currentWeek.length > 0) {
        weeks.push({ start: weekStart, days: currentWeek });
        currentWeek = [];
        weekStart = date;
      }
      currentWeek.push(date);
      if (i === dayHeaders.length - 1) {
        weeks.push({ start: weekStart, days: currentWeek });
      }
    });

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

    return { minDate, totalDays, dayHeaders, weeks, months, todayIndex };
  }, [tasksWithDates, today, normalizeDate]);

  const getTaskPosition = useCallback((task: ProjectTask) => {
    if (!ganttData) return { startOffset: 0, duration: 1 };
    const { minDate } = ganttData;
    const start = normalizeDate(task.start_date ? new Date(task.start_date) : new Date(task.due_date || today));
    const end = normalizeDate(task.due_date ? new Date(task.due_date) : start);
    
    const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return { startOffset: Math.max(0, startOffset), duration };
  }, [ganttData, normalizeDate, today]);

  const isToday = useCallback((date: Date) => {
    return date.getTime() === today.getTime();
  }, [today]);

  const getStatusColor = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'bg-accent';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500/50';
      default: return 'bg-secondary';
    }
  }, []);

  // Fonction pour générer le HTML d'export avec couleurs HEX (compatibles html2pdf)
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
      blue: '#3b82f6',
      green: '#22c55e',
      red: '#ef4444',
      gray: '#9ca3af',
      accent: '#7c3aed',
      accentLight: '#ede9fe',
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
      blue: '#60a5fa',
      green: '#4ade80',
      red: '#f87171',
      gray: '#6b7280',
      accent: '#a78bfa',
      accentLight: '#4c1d95',
      headerBg: '#1f2937',
      headerText: '#e5e7eb',
    };
    
    const colors = mode === 'dark' ? darkColors : lightColors;

    let tasksHTML = '';
    tasks.forEach((task) => {
      const start = normalizeDate(task.start_date ? new Date(task.start_date) : new Date(task.due_date || today));
      const end = normalizeDate(task.due_date ? new Date(task.due_date) : start);
      const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
      const widthPercent = (duration / totalDays) * 100;
      
      const statusColor = task.task_status === 'completed' ? colors.green 
        : task.task_status === 'in_progress' ? colors.blue 
        : task.task_status === 'cancelled' ? colors.red 
        : colors.gray;
      
      const statusLabel = taskStatusOptions.find(o => o.value === task.task_status)?.label || task.task_status;
      
      tasksHTML += `
        <tr style="border-bottom: 1px solid ${colors.border};">
          <td style="padding: 12px; width: 200px; font-size: 13px; background: ${colors.bg};">
            <div style="font-weight: 600; color: ${colors.textPrimary};">${task.title}</div>
            <div style="font-size: 11px; color: ${colors.textMuted}; margin-top: 2px;">${statusLabel}</div>
          </td>
          <td style="padding: 8px 0; position: relative; background: ${colors.bg};">
            <div style="position: relative; height: 24px;">
              <div style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%; min-width: 40px; height: 24px; background: ${statusColor}; border-radius: 4px; display: table; table-layout: fixed;">
                <span style="display: table-cell; vertical-align: middle; text-align: center; color: #ffffff; font-size: 11px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3); white-space: nowrap; padding: 0 4px;">${task.progress || 0}%</span>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    // Générer les en-têtes de mois pour l'export
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
      const bgColor = isTodayDate ? colors.accentLight : isWeekend ? colors.bgTertiary : colors.headerBg;
      const textColor = isTodayDate ? colors.accent : colors.headerText;
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
          <div style="margin-top: 16px; display: flex; gap: 20px; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 14px; height: 14px; background: ${colors.blue}; border-radius: 3px;"></div>
              <span style="color: ${colors.textSecondary}; font-weight: 500;">${t('in_progress') || 'En cours'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 14px; height: 14px; background: ${colors.green}; border-radius: 3px;"></div>
              <span style="color: ${colors.textSecondary}; font-weight: 500;">${t('completed') || 'Terminé'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 14px; height: 14px; background: ${colors.gray}; border-radius: 3px;"></div>
              <span style="color: ${colors.textSecondary}; font-weight: 500;">${t('todo') || 'À faire'}</span>
            </div>
          </div>
        </div>
      `,
      colors
    };
  }, [ganttData, tasks, taskStatusOptions, today, projectName, t, normalizeDate]);

  // Fonction d'export PDF
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

  // Générer l'aperçu HTML en temps réel
  const previewHTML = useMemo(() => {
    return generateExportHTML(exportMode).html;
  }, [generateExportHTML, exportMode]);

  if (!ganttData || tasksWithDates.length === 0) {
    return (
      <div className="text-center py-12 card">
        <IconTimeline className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-secondary">{t('no_tasks_for_gantt')}</p>
      </div>
    );
  }

  const { dayHeaders, weeks, months, todayIndex, totalDays } = ganttData;

  return (
    <div className="space-y-2">
      {/* Modal d'export avec aperçu */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-default rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
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

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
              {/* Options panel */}
              <div className="w-full sm:w-72 flex-shrink-0 p-4 border-b sm:border-b-0 sm:border-r border-default space-y-4 overflow-y-auto">
                {/* Nom du fichier */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('file_name') || 'Nom du fichier'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={exportFileName}
                      onChange={(e) => setExportFileName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-muted border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-secondary text-sm">.pdf</span>
                  </div>
                </div>

                {/* Thème */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('choose_export_theme') || 'Thème'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportMode('light')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                        exportMode === 'light' 
                          ? 'border-accent bg-accent/10' 
                          : 'border-default bg-muted/50 hover:border-accent/50'
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
                          ? 'border-accent bg-accent/10' 
                          : 'border-default bg-muted/50 hover:border-accent/50'
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

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleExportPDF(exportMode)}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

              {/* Preview panel */}
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

      <div className="flex justify-end">
        <button
          onClick={() => setShowExportModal(true)}
          disabled={isExporting}
          className="btn btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <IconFileTypePdf className="w-4 h-4" />
          {isExporting ? t('exporting') : t('export_pdf')}
        </button>
      </div>

      <div className="overflow-x-auto card" ref={ganttRef}>
        <div style={{ minWidth: `${Math.max(800, 200 + dayHeaders.length * 32)}px` }}>
          {/* Header */}
          <div className="flex border-b border-default sticky top-0 z-10 bg-card">
            {/* Colonne titre sticky */}
            <div className="w-48 flex-shrink-0 bg-card sticky left-0 z-20 border-r border-default">
              <div className="py-2 px-3 text-xs font-medium text-secondary uppercase tracking-wider h-full flex items-end">
                {t('task')}
              </div>
            </div>
            {/* Colonnes dates */}
            <div className="flex-1 flex flex-col">
              {/* Ligne des mois */}
              <div className="flex border-b border-default">
                {months.map((month, i) => (
                  <div 
                    key={i} 
                    style={{ flex: month.days, minWidth: `${month.days * 32}px` }}
                    className="text-xs font-semibold text-primary text-center py-1.5 bg-muted/50 border-l border-default first:border-l-0"
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              {/* Ligne des semaines */}
              <div className="flex border-b border-default">
                {weeks.map((week, i) => (
                  <div 
                    key={i} 
                    style={{ flex: week.days.length, minWidth: `${week.days.length * 32}px` }} 
                    className="text-xs text-muted text-center py-1 border-l border-default first:border-l-0"
                  >
                    {t('week_short') || 'Sem.'} {getISOWeekNumber(week.days[0])}
                  </div>
                ))}
              </div>
              {/* Ligne des jours */}
              <div className="flex">
                {dayHeaders.map((day, i) => (
                  <div 
                    key={i}
                    style={{ width: '32px', minWidth: '32px' }}
                    className={`text-center py-1 text-xs border-l border-default first:border-l-0 ${
                      isToday(day) 
                        ? 'bg-accent/20 text-accent font-medium' 
                        : day.getDay() === 0 || day.getDay() === 6
                          ? 'text-muted bg-muted/30'
                          : 'text-secondary'
                    }`}>
                  {day.getDate()}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="relative">
            {todayIndex >= 0 && (
              <div 
                className="absolute w-0.5 bg-accent z-20 pointer-events-none"
                style={{
                  left: `calc(192px + ((100% - 192px) * ${todayIndex} / ${dayHeaders.length}) + ((100% - 192px) / ${dayHeaders.length} / 2))`,
                  top: 0,
                  bottom: 0,
                }}
              />
            )}

            {tasks.map((task, index) => {
              const { startOffset, duration } = getTaskPosition(task);
              const widthPercent = (duration / totalDays) * 100;
              const leftPercent = (startOffset / totalDays) * 100;

              return (
                <div 
                  key={task.documentId || index}
                  className="flex border-b border-muted hover:bg-hover group"
                >
                  {/* Titre de la tâche - sticky */}
                  <div className="w-48 flex-shrink-0 py-3 px-3 bg-card sticky left-0 z-10 border-r border-default group-hover:bg-hover">
                    <p className="text-sm text-primary truncate">{task.title}</p>
                    <span className={`text-xs ${
                      task.task_status === 'completed' ? 'text-success' :
                      task.task_status === 'in_progress' ? 'text-info' : 'text-muted'
                    }`}>
                      {taskStatusOptions.find(o => o.value === task.task_status)?.label}
                    </span>
                  </div>

                  <div className="flex-1 relative py-2" style={{ minWidth: `${dayHeaders.length * 32}px` }}>
                    <div className="absolute inset-0 flex">
                      {dayHeaders.map((day, i) => (
                        <div 
                          key={i}
                          style={{ width: '32px', minWidth: '32px' }}
                          className={`border-l border-muted first:border-l-0 ${
                            isToday(day) ? 'bg-accent/10' : ''
                          } ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/30' : ''}`}
                        />
                      ))}
                    </div>

                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-6 rounded transition-all hover:h-7"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: '40px',
                      }}
                    >
                      <div className={`w-full h-full ${getStatusColor(task.task_status)} rounded relative overflow-hidden`}>
                        <div 
                          className="absolute inset-y-0 left-0 bg-white/20"
                          style={{ width: `${task.progress || 0}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium px-2 truncate">
                          {task.progress || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
