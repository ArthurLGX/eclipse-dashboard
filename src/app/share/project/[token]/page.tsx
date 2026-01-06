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
} from '@tabler/icons-react';
import type { ProjectTask, TaskStatus, TaskPriority } from '@/types';
import { useLanguage } from '@/app/context/LanguageContext';

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
    <div className="min-h-screen bg-page">
      {/* Header fixe */}
      <header className="bg-card border-b border-default fixed top-0 left-0 right-0 z-50 shadow-theme-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo Eclipse Studio */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <IconTimeline className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-muted hidden sm:block">Eclipse Studio</span>
              </div>
              <div className="h-6 w-px bg-default hidden sm:block" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-primary line-clamp-1">{project.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.colorClass}`}>
                    {statusConfig.label}
                  </span>
                  {project.user?.username && (
                    <span className="text-muted text-xs hidden sm:block">
                      {t('by')} {project.user.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:?subject=${t('project_progress')} - ${project.title}&body=${t('view_project_progress')} : ${typeof window !== 'undefined' ? window.location.href : ''}`}
                className="btn btn-ghost flex items-center gap-2 px-3 py-2 text-sm"
              >
                <IconMail className="w-4 h-4" />
                <span className="hidden sm:inline">{t('share_button')}</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer pour le header fixe */}
      <div className="h-20 sm:h-24" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Description */}
        {project.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-6"
          >
            <p className="text-secondary leading-relaxed">{project.description}</p>
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
              <div className="divide-y divide-default">
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
    <div className={`p-4 hover:bg-hover transition-colors ${isOverdue ? 'border-l-2 border-danger' : ''}`}>
      <div className="flex items-center gap-4">
        {/* Status icon */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          task.task_status === 'completed' ? 'bg-success-light' : 
          task.task_status === 'in_progress' ? 'bg-info-light' : 'bg-hover'
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
            <p className="text-sm text-secondary mt-1 line-clamp-1">{task.description}</p>
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
        <div className="w-24 hidden sm:block">
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

  const normalizeDate = useCallback((date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
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

    const todayIndex = dayHeaders.findIndex(d => d.getTime() === today.getTime());

    return { minDate, totalDays, dayHeaders, todayIndex };
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
      case 'completed': return 'bg-success';
      case 'in_progress': return 'bg-info';
      case 'cancelled': return 'bg-danger/50';
      default: return 'bg-muted';
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      if (ganttRef.current) {
        await html2pdf().set({
          margin: [10, 10, 10, 10],
          filename: `gantt-${projectName}-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        }).from(ganttRef.current).save();
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [projectName]);

  if (!ganttData || tasksWithDates.length === 0) {
    return (
      <div className="text-center py-12 card">
        <IconTimeline className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-secondary">{t('no_tasks_for_gantt')}</p>
      </div>
    );
  }

  const { dayHeaders, todayIndex, totalDays } = ganttData;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="btn btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <IconFileTypePdf className="w-4 h-4" />
          {isExporting ? t('exporting') : t('export_pdf')}
        </button>
      </div>

      <div className="overflow-x-auto card" ref={ganttRef}>
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-default">
            <div className="w-48 flex-shrink-0 py-2 px-3 text-xs font-medium text-secondary uppercase tracking-wider">
              {t('task')}
            </div>
            <div className="flex-1 flex">
              {dayHeaders.map((day, i) => (
                <div 
                  key={i}
                  className={`flex-1 text-center py-2 text-xs ${
                    isToday(day) 
                      ? 'bg-accent-light text-accent-light font-medium' 
                      : day.getDay() === 0 || day.getDay() === 6
                        ? 'text-muted'
                        : 'text-secondary'
                  }`}
                >
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
                  <div className="w-48 flex-shrink-0 py-3 px-3">
                    <p className="text-sm text-primary truncate">{task.title}</p>
                    <span className={`text-xs ${
                      task.task_status === 'completed' ? 'text-success' :
                      task.task_status === 'in_progress' ? 'text-info' : 'text-muted'
                    }`}>
                      {taskStatusOptions.find(o => o.value === task.task_status)?.label}
                    </span>
                  </div>

                  <div className="flex-1 relative py-2">
                    <div className="absolute inset-0 flex">
                      {dayHeaders.map((day, i) => (
                        <div 
                          key={i}
                          className={`flex-1 border-l border-muted ${
                            isToday(day) ? 'bg-accent-light' : ''
                          } ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-hover/50' : ''}`}
                        />
                      ))}
                    </div>

                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-6 rounded"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: '20px',
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
  );
}
