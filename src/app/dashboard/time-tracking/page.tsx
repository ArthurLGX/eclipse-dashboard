'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconClock,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconPlus,
  IconCalendar,
  IconCurrencyEuro,
  IconBriefcase,
  IconTrash,
  IconEdit,
  IconFilter,
} from '@tabler/icons-react';
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
import { useProjects, useClients } from '@/hooks/useApi';
import type { TimeEntry, Project, Client } from '@/types';
import useSWR from 'swr';

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
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [projectFilter, setProjectFilter] = useState<string>('');
  
  // Running timer state
  const [runningTime, setRunningTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch data
  const { data: projectsData } = useProjects(user?.id);
  const projects = useMemo(() => (projectsData as Project[]) || [], [projectsData]);
  
  const { data: clientsData } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);

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
  const handleStartTimer = async (projectId?: number, description?: string) => {
    try {
      await createTimeEntry(user!.id, {
        start_time: new Date().toISOString(),
        is_running: true,
        billable: true,
        description,
        project: projectId,
      });
      await mutateRunning();
      await mutate();
      showGlobalPopup(t('timer_started') || 'Timer démarré', 'success');
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur lors du démarrage', 'error');
    }
  };

  // Stop timer
  const handleStopTimer = async () => {
    if (!runningEntry) return;
    try {
      await stopTimeEntry(runningEntry.documentId);
      await mutateRunning();
      await mutate();
      showGlobalPopup(t('timer_stopped') || 'Timer arrêté', 'success');
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur lors de l\'arrêt', 'error');
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconClock className="w-7 h-7 text-accent" />
              {t('time_tracking') || 'Suivi du temps'}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('time_tracking_desc') || 'Gérez le temps passé sur vos projets'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 flex items-center gap-2 rounded-lg"
          >
            <IconPlus className="w-4 h-4" />
            {t('add_entry') || 'Ajouter une entrée'}
          </button>
        </div>

        {/* Active Timer */}
        <div className={`card p-6 ${runningEntry ? 'border-2 border-accent bg-accent/5' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${runningEntry ? 'bg-accent text-white animate-pulse' : 'bg-muted'}`}>
                <IconClock className="w-8 h-8" />
              </div>
              <div>
                {runningEntry ? (
                  <>
                    <p className="text-sm text-muted">{t('timer_running') || 'Timer en cours'}</p>
                    <p className="text-3xl font-mono font-bold text-accent">
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
            
            <div className="flex items-center gap-2">
              {runningEntry ? (
                <button
                  onClick={handleStopTimer}
                  className="btn-primary bg-error hover:bg-error/90 px-6 py-3 rounded-xl flex items-center gap-2"
                >
                  <IconPlayerStop className="w-5 h-5" />
                  {t('stop') || 'Arrêter'}
                </button>
              ) : (
                <button
                  onClick={() => handleStartTimer()}
                  className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
                >
                  <IconPlayerPlay className="w-5 h-5" />
                  {t('start') || 'Démarrer'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <IconClock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatDuration(stats.totalTime)}</p>
                <p className="text-xs text-muted">{t('total_time') || 'Temps total'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <IconBriefcase className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{formatDuration(stats.billableTime)}</p>
                <p className="text-xs text-muted">{t('billable_time') || 'Temps facturable'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <IconCurrencyEuro className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{formatCurrency(stats.billableAmount)}</p>
                <p className="text-xs text-muted">{t('to_invoice') || 'À facturer'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-hover rounded-lg p-1">
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
                  <span className="text-sm text-accent font-mono">
                    {formatDuration(dateEntries.reduce((acc, e) => acc + (e.duration || 0), 0))}
                  </span>
                </div>
                <div className="card divide-y divide-default">
                  {dateEntries.map((entry) => (
                    <div key={entry.documentId} className="p-4 flex items-center justify-between hover:bg-hover transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-1 h-10 rounded-full ${entry.billable ? 'bg-success' : 'bg-muted'}`} />
                        <div>
                          <p className="font-medium text-primary">
                            {entry.project?.title || entry.description || t('no_description') || 'Sans description'}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(entry.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                            {entry.client && ` • ${entry.client.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-primary">{formatDuration(entry.duration || 0)}</span>
                        {entry.billable && entry.hourly_rate && (
                          <span className="text-xs text-success">
                            {formatCurrency((entry.duration || 0) / 60 * entry.hourly_rate)}
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
                  ))}
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
          message={t('delete_entry_confirm') || 'Êtes-vous sûr de vouloir supprimer cette entrée ?'}
        />
      </motion.div>
    </ProtectedRoute>
  );
}

