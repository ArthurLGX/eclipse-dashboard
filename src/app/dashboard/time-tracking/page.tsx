'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconClock,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconCurrencyEuro,
  IconBriefcase,
  IconTrash,
  IconEdit,
  IconChartBar,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { 
  fetchTimeEntries, 
  createTimeEntry,
  updateTimeEntry,
  stopTimeEntry,
  deleteTimeEntry,
  fetchRunningTimeEntry,
} from '@/lib/api';
import { useProjects } from '@/hooks/useApi';
import type { TimeEntry, Project, TimeEntrySource } from '@/types';
import { TimeSourceBadge } from '@/app/components/StatusBadge';
import useSWR from 'swr';
import { TIMER_REFRESH_EVENT } from '@/app/components/TimerIndicator';

// Helper to trigger timer refresh across components
const triggerTimerRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TIMER_REFRESH_EVENT));
  }
};

export default function TimeTrackingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { formatCurrency } = usePreferences();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; entry: TimeEntry | null }>({
    isOpen: false,
    entry: null,
  });
  
  // Close modal helper
  const closeModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
  };
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [projectFilter, setProjectFilter] = useState<string>('');
  
  // Running timer state
  const [runningTime, setRunningTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isTimerLoading, setIsTimerLoading] = useState(false);

  // Fetch data
  const { data: projectsData } = useProjects(user?.id);
  const projects = useMemo(() => (projectsData as Project[]) || [], [projectsData]);
  

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const from = new Date();
    
    switch (dateFilter) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      default:
        return undefined;
    }
    
    return { from: from.toISOString(), to: now.toISOString() };
  }, [dateFilter]);

  // Fetch time entries
  const { data: entries, mutate, isLoading } = useSWR(
    user?.id ? ['time-entries', user.id, dateFilter, projectFilter] : null,
    () => fetchTimeEntries(user!.id, {
      ...dateRange,
      projectId: projectFilter || undefined,
    }),
    { refreshInterval: 30000 }
  );

  // Fetch running entry
  const { data: runningEntry, mutate: mutateRunning } = useSWR(
    user?.id ? ['running-time-entry', user.id] : null,
    () => fetchRunningTimeEntry(user!.id),
    { refreshInterval: 5000 }
  );

  // Update running timer
  useEffect(() => {
    if (runningEntry) {
      const startTime = new Date(runningEntry.start_time).getTime();
      
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRunningTime(elapsed);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      setTimerInterval(interval);
      
      return () => clearInterval(interval);
    } else {
      setRunningTime(0);
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [runningEntry]);

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // Format seconds to HH:MM:SS
  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Stats
  const stats = useMemo(() => {
    if (!entries) return { totalTime: 0, billableTime: 0, billableAmount: 0 };
    
    const totalTime = entries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const billableEntries = entries.filter(e => e.billable && !e.billed);
    const billableTime = billableEntries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const billableAmount = billableEntries.reduce((acc, e) => {
      const hours = (e.duration || 0) / 60;
      return acc + (hours * (e.hourly_rate || 0));
    }, 0);
    
    return { totalTime, billableTime, billableAmount };
  }, [entries]);

  // Start timer
  const handleStartTimer = async (
    projectId?: number, 
    description?: string, 
    estimatedDuration?: number,
    billable?: boolean,
    hourlyRate?: number
  ) => {
    // Éviter les doubles clics ET vérifier qu'il n'y a pas déjà un timer en cours
    if (isTimerLoading || runningEntry) {
      if (runningEntry) {
        showGlobalPopup(t('timer_already_running') || 'Un timer est déjà en cours', 'warning');
      }
      return;
    }
    setIsTimerLoading(true);
    try {
      await createTimeEntry(user!.id, {
        start_time: new Date().toISOString(),
        is_running: true,
        billable: billable ?? true,
        hourly_rate: hourlyRate || 0,
        description,
        project: projectId,
        estimated_duration: estimatedDuration,
        timer_status: 'active',
      });
      await mutateRunning();
      await mutate();
      triggerTimerRefresh(); // Synchroniser TimerIndicator
      showGlobalPopup(t('timer_started') || 'Timer démarré', 'success');
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur lors du démarrage', 'error');
    } finally {
      setIsTimerLoading(false);
    }
  };

  // Stop timer
  const handleStopTimer = async () => {
    if (!runningEntry || isTimerLoading) return; // Éviter les doubles clics
    setIsTimerLoading(true);
    try {
      await stopTimeEntry(runningEntry.documentId);
      await mutateRunning();
      await mutate();
      triggerTimerRefresh(); // Synchroniser TimerIndicator
      showGlobalPopup(t('timer_stopped') || 'Timer arrêté', 'success');
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur lors de l\'arrêt', 'error');
    } finally {
      setIsTimerLoading(false);
    }
  };

  // Delete entry
  const handleDelete = async () => {
    if (!deleteModal.entry) return;
    try {
      await deleteTimeEntry(deleteModal.entry.documentId);
      await mutate();
      showGlobalPopup(t('entry_deleted') || 'Entrée supprimée', 'success');
      setDeleteModal({ isOpen: false, entry: null });
    } catch {
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    }
  };

  // Group entries by date
  const groupedEntries = useMemo(() => {
    if (!entries) return {};
    
    const groups: Record<string, TimeEntry[]> = {};
    entries.forEach(entry => {
      const date = new Date(entry.start_time).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    
    return groups;
  }, [entries]);

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconClock className="w-7 h-7 !text-accent" />
              {t('time_tracking') || 'Suivi du temps'}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('time_tracking_desc') || 'Gérez le temps passé sur vos projets'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/time-tracking/analytics"
              className="px-4 py-2 flex items-center gap-2 rounded-lg border border-default text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <IconChartBar className="w-4 h-4" />
              {t('analytics') || 'Analyses'}
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-4 py-2 flex items-center gap-2 rounded-lg"
            >
              <IconPlus className="w-4 h-4" color="white" />
              {t('start_task') || 'Démarrer une tâche'}
            </button>
          </div>
        </div>

        {/* Active Timer */}
        <div className={`card p-6 ${runningEntry ? 'border-2 border-accent bg-accent-light' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${runningEntry ? 'bg-accent text-white animate-pulse' : 'bg-muted'}`}>
                <IconClock className="w-8 h-8" />
              </div>
              <div>
                {runningEntry ? (
                  <>
                    <p className="text-sm text-muted">{t('timer_running') || 'Timer en cours'}</p>
                    <p className="text-3xl font-mono font-bold !text-accent">
                      {formatSeconds(runningTime)}
                    </p>
                    <p className="text-sm text-secondary">
                      {runningEntry.project?.title || runningEntry.description || t('no_project') || 'Sans projet'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">{t('no_timer') || 'Aucun timer actif'}</p>
                    <p className="text-2xl font-mono font-bold text-muted">00:00:00</p>
                  </>
                )}
              </div>
            </div>
            
            {runningEntry && (
              <button
                onClick={handleStopTimer}
                disabled={isTimerLoading}
                className="btn-primary bg-error hover:bg-error/90 px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                {isTimerLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconPlayerStop className="w-5 h-5" />
                )}
                {t('stop') || 'Arrêter'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-light rounded-lg">
                <IconClock className="w-5 h-5 !text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatDuration(stats.totalTime)}</p>
                <p className="!text-xs text-muted">{t('total_time') || 'Temps total'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-light rounded-lg">
                <IconBriefcase className="w-5 h-5 !text-success-text -text" />
              </div>
              <div>
                <p className="text-2xl font-bold !text-success-text -text">{formatDuration(stats.billableTime)}</p>
                <p className="!text-xs text-muted">{t('billable_time') || 'Temps facturable'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-light rounded-lg">
                <IconCurrencyEuro className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{formatCurrency(stats.billableAmount)}</p>
                <p className="!text-xs text-muted">{t('to_invoice') || 'À facturer'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['today', 'week', 'month', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === filter
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {filter === 'today' ? (t('today') || "Aujourd'hui") :
                 filter === 'week' ? (t('this_week') || 'Cette semaine') :
                 filter === 'month' ? (t('this_month') || 'Ce mois') :
                 (t('all') || 'Tout')}
              </button>
            ))}
          </div>
          
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input px-3 py-2 text-sm"
          >
            <option value="">{t('all_projects') || 'Tous les projets'}</option>
            {projects.map((project) => (
              <option key={project.documentId} value={project.documentId}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        {/* Entries List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="card p-8 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : Object.keys(groupedEntries).length === 0 ? (
            <div className="card p-8 text-center">
              <IconClock className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">{t('no_entries') || 'Aucune entrée de temps'}</p>
            </div>
          ) : (
            Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted capitalize">{date}</h3>
                  <span className="text-sm !text-accent font-mono">
                    {formatDuration(dateEntries.reduce((acc, e) => acc + (e.duration || 0), 0))}
                  </span>
                </div>
                <div className="card">
                  {dateEntries.map((entry, index) => {
                    // Calculer la durée réelle (en temps réel pour les entrées en cours)
                    const isRunning = entry.is_running && entry.documentId === runningEntry?.documentId;
                    const actualDuration = isRunning 
                      ? Math.floor(runningTime / 60) // Convertir secondes en minutes
                      : (entry.duration || 0);
                    
                    // Calculer la progression si temps estimé
                    const progressPercent = entry.estimated_duration && actualDuration
                      ? Math.min((actualDuration / entry.estimated_duration) * 100, 100)
                      : 0;
                    const isOverEstimate = entry.estimated_duration && actualDuration 
                      ? actualDuration > entry.estimated_duration 
                      : false;
                    const statusColor = entry.timer_status === 'completed' 
                      ? 'bg-success' 
                      : entry.timer_status === 'exceeded' || isOverEstimate
                        ? 'bg-danger'
                        : isRunning
                          ? 'bg-warning animate-pulse'
                          : entry.billable 
                            ? 'bg-accent' 
                            : 'bg-muted';
                    
                    return (
                      <div key={entry.documentId} className={`p-4 hover:bg-hover transition-colors ${index > 0 ? 'border-t border-default' : ''} ${isRunning ? 'bg-warning-light' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`w-1 h-12 rounded-full ${statusColor}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-primary truncate flex items-center gap-2">
                                {entry.description || t('no_description') || 'Sans description'}
                                {isRunning && <span className="!text-xs text-warning-text font-normal">({t('running') || 'en cours'})</span>}
                                {entry.source && entry.source !== 'manual' && (
                                  <TimeSourceBadge source={entry.source as TimeEntrySource} />
                                )}
                              </p>
                              <p className="!text-xs text-muted flex items-center gap-1">
                                {new Date(entry.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                {isRunning && entry.estimated_duration ? (
                                  ` - ${new Date(new Date(entry.start_time).getTime() + entry.estimated_duration * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                ) : entry.end_time ? (
                                  ` - ${new Date(entry.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                ) : isRunning ? (
                                  ` - ${t('now') || 'maintenant'}`
                                ) : null}
                                {entry.project && (
                                  <span className="flex items-center gap-1 ml-2">
                                    <IconBriefcase className="w-3 h-3" />
                                    <span>{entry.project.title}</span>
                                  </span>
                                )}
                                {entry.client && ` • ${entry.client.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Temps réel et estimé */}
                            <div className="text-right">
                              <span className={`font-mono ${isRunning ? 'text-warning' : 'text-primary'}`}>
                                {isRunning ? formatSeconds(runningTime) : formatDuration(actualDuration)}
                              </span>
                              {entry.estimated_duration && (
                                <span className={`text-xs ml-1 ${isOverEstimate ? 'text-danger' : 'text-muted'}`}>
                                  / {formatDuration(entry.estimated_duration)}
                                </span>
                              )}
                            </div>
                            {entry.billable && entry.hourly_rate && (
                              <span className="!text-xs !text-success-text -text">
                                {formatCurrency(actualDuration / 60 * entry.hourly_rate)}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingEntry(entry)}
                                className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded-lg"
                              >
                                <IconEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, entry })}
                                className="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded-lg"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Barre de progression */}
                        {entry.estimated_duration && actualDuration > 0 && (
                          <div className="mt-2 ml-5">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${isOverEstimate ? 'bg-danger' : isRunning ? 'bg-warning' : 'bg-accent'}`}
                                style={{ width: `${progressPercent}%`, backgroundColor: isOverEstimate ? 'var(--color-danger)' : isRunning ? 'var(--color-warning)' : 'var(--color-accent)' }}
                              >
                                {progressPercent}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, entry: null })}
          onConfirm={handleDelete}
          title={t('delete_entry') || 'Supprimer l\'entrée'}
          itemName={deleteModal.entry?.description || ''}
          itemType="entry"
        />

        {/* Add/Edit Modal */}
        {(showAddModal || editingEntry) && (
          <TimeEntryModal
            entry={editingEntry}
            projects={projects}
            onClose={closeModal}
            onSave={async () => {
              await mutate();
              await mutateRunning();
              triggerTimerRefresh(); // Synchroniser TimerIndicator après mise à jour
              closeModal();
            }}
            onStartTimer={handleStartTimer}
          />
        )}
      </motion.div>
    </ProtectedRoute>
  );
}

// Time Entry Modal Component
interface TimeEntryModalProps {
  entry: TimeEntry | null;
  projects: Project[];
  onClose: () => void;
  onSave: () => Promise<void>;
  onStartTimer?: (projectId?: number, description?: string, estimatedDuration?: number, billable?: boolean, hourlyRate?: number) => Promise<void>;
}

function TimeEntryModal({ entry, projects, onClose, onSave, onStartTimer }: TimeEntryModalProps) {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  
  const [description, setDescription] = useState(entry?.description || '');
  const [projectId, setProjectId] = useState<string>(entry?.project?.documentId || '');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(entry?.estimated_duration || 60); // minutes
  const [billable, setBillable] = useState(entry?.billable ?? true);
  const [hourlyRate, setHourlyRate] = useState(entry?.hourly_rate || 0);
  const [saving, setSaving] = useState(false);

  // Mode édition uniquement pour les entrées existantes
  const isEditMode = !!entry;
  const isRunningEntry = entry?.is_running ?? false;
  const [date, setDate] = useState(entry ? new Date(entry.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(entry ? new Date(entry.start_time).toTimeString().slice(0, 5) : '');
  const [endTime, setEndTime] = useState(entry?.end_time ? new Date(entry.end_time).toTimeString().slice(0, 5) : '');

  // Synchroniser l'heure de fin avec la durée estimée (pour tâches en cours)
  useEffect(() => {
    if (isRunningEntry && startTime && estimatedDuration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + estimatedDuration * 60000);
      setEndTime(endDate.toTimeString().slice(0, 5));
    }
  }, [isRunningEntry, startTime, estimatedDuration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Find project by documentId to get numeric id
    const selectedProject = projectId ? projects.find(p => p.documentId === projectId) : undefined;

    if (entry) {
      // Update existing entry
      try {
        const startDateTime = new Date(`${date}T${startTime}`);
        
        // Préparer les données de mise à jour
        const updateData: Record<string, unknown> = {
          description,
          start_time: startDateTime.toISOString(),
          estimated_duration: estimatedDuration,
          billable,
          hourly_rate: billable ? hourlyRate : 0,
          project: selectedProject?.id,
        };
        
        // Ajouter end_time et duration seulement si endTime est défini (entrée terminée)
        if (endTime) {
          const endDateTime = new Date(`${date}T${endTime}`);
          const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000);
          updateData.end_time = endDateTime.toISOString();
          updateData.duration = duration;
        }

        await updateTimeEntry(entry.documentId, updateData);
        
        showGlobalPopup(t('entry_updated') || 'Entrée mise à jour', 'success');
        await onSave();
      } catch (error) {
        console.error('Update error:', error);
        showGlobalPopup(t('save_error') || 'Erreur lors de l\'enregistrement', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      // Start a new timer - handleStartTimer gère ses propres erreurs et popups
      if (onStartTimer) {
        await onStartTimer(
          selectedProject?.id,
          description,
          estimatedDuration,
          billable,
          billable ? hourlyRate : 0
        );
      }
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md p-6 m-4"
      >
        <h2 className="text-xl font-bold text-primary mb-4">
          {entry ? (t('edit_entry') || 'Modifier l\'entrée') : (t('start_task') || 'Démarrer une tâche')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">{t('description') || 'Description'}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              placeholder={t('what_did_you_work_on') || 'Sur quoi travaillez-vous ?'}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">{t('project') || 'Projet'}</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input w-full"
            >
              <option value="">{t('no_project') || 'Sans projet'}</option>
              {projects.map((project) => (
                <option key={project.documentId} value={project.documentId}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date/Heure uniquement en mode édition */}
          {isEditMode && (
            <>
              <div>
                <label className="block text-sm text-muted mb-1">{t('date') || 'Date'}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">{t('start_time') || 'Début'}</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">{t('end_time') || 'Fin'}</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>
            </>
          )}

          {/* Temps imparti - en mode création OU pour les tâches en cours */}
          {(!isEditMode || isRunningEntry) && (
            <div>
              <label className="block text-sm text-muted mb-1">{t('estimated_duration') || 'Temps imparti'}</label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Math.max(1, Number(e.target.value)))}
                  className="input w-20"
                  min="1"
                />
                <span className="text-sm text-muted">min</span>
                <div className="flex gap-1">
                  {[15, 30, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEstimatedDuration(mins)}
                      className={`px-2 py-1 !text-xs rounded transition-colors ${
                        estimatedDuration === mins 
                          ? 'bg-accent text-white' 
                          : 'bg-hover text-muted hover:text-primary hover:bg-hover'
                      }`}
                    >
                      {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm text-secondary">{t('billable') || 'Facturable'}</span>
            </label>
            
            {billable && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="input w-24 text-right"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-muted">€/h</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted hover:text-primary transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <IconPlayerPlay className="w-4 h-4" />
              )}
              {isEditMode ? (t('save') || 'Enregistrer') : (t('start') || 'Démarrer')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

