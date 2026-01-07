'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconClock,
  IconPlayerPlay,
  IconPlayerStop,
  IconExternalLink,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import { useUserPreferencesOptional } from '@/app/context/UserPreferencesContext';
import {
  fetchRunningTimeEntry,
  createTimeEntry,
  stopTimeEntry,
} from '@/lib/api';
import type { TimeEntry } from '@/types';

export default function TimerIndicator() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { userPreferences, isModuleEnabled } = useUserPreferencesOptional();
  const router = useRouter();

  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [runningTime, setRunningTime] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Vérifier si le module time_tracking est activé
  const isTimeTrackingEnabled = isModuleEnabled?.('time_tracking') ?? false;

  // Charger le timer en cours
  useEffect(() => {
    if (!user?.id || !isTimeTrackingEnabled) return;

    const loadRunningEntry = async () => {
      try {
        const entry = await fetchRunningTimeEntry(user.id);
        setRunningEntry(entry);
      } catch {
        setRunningEntry(null);
      }
    };

    loadRunningEntry();
    const interval = setInterval(loadRunningEntry, 10000); // Refresh toutes les 10s

    return () => clearInterval(interval);
  }, [user?.id, isTimeTrackingEnabled]);

  // Mettre à jour le timer en temps réel
  useEffect(() => {
    if (runningEntry) {
      const startTime = new Date(runningEntry.start_time).getTime();

      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRunningTime(elapsed);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    } else {
      setRunningTime(0);
    }
  }, [runningEntry]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format seconds to HH:MM:SS
  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Démarrer un nouveau timer
  const handleStartTimer = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await createTimeEntry(user.id, {
        start_time: new Date().toISOString(),
        is_running: true,
        billable: true,
      });
      const entry = await fetchRunningTimeEntry(user.id);
      setRunningEntry(entry);
      showGlobalPopup(t('timer_started') || 'Timer démarré', 'success');
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Arrêter le timer
  const handleStopTimer = async () => {
    if (!runningEntry) return;
    setLoading(true);
    try {
      await stopTimeEntry(runningEntry.documentId);
      setRunningEntry(null);
      setRunningTime(0);
      showGlobalPopup(t('timer_stopped') || 'Timer arrêté', 'success');
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Ne pas afficher si le module n'est pas activé ou si les préférences ne sont pas chargées
  if (!userPreferences || !isTimeTrackingEnabled) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="fixed top-4 right-24 z-[1002]">
      {/* Timer Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl backdrop-blur-sm border transition-all shadow-theme-lg ${
          runningEntry
            ? 'bg-accent/10 border-accent text-accent hover:bg-accent/20'
            : 'bg-card border-default text-muted hover:text-primary hover:bg-hover'
        }`}
      >
        <IconClock className={`w-5 h-5 ${runningEntry ? 'animate-pulse' : ''}`} />
        
        {runningEntry ? (
          <span className="font-mono text-sm font-semibold min-w-[70px]">
            {formatSeconds(runningTime)}
          </span>
        ) : null}

        {/* Indicateur actif */}
        {runningEntry && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-card"
          >
            <span className="absolute inset-0 bg-success rounded-full animate-ping opacity-75" />
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-card border border-default rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-default">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">
                  {t('time_tracking') || 'Suivi du temps'}
                </h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/dashboard/time-tracking');
                  }}
                  className="text-muted hover:text-accent transition-colors"
                  title={t('view_all') || 'Voir tout'}
                >
                  <IconExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="p-4">
              {runningEntry ? (
                <div className="space-y-4">
                  {/* Timer actif */}
                  <div className="text-center">
                    <p className="text-xs text-muted mb-1">
                      {t('timer_running') || 'Timer en cours'}
                    </p>
                    <p className="text-3xl font-mono font-bold text-accent">
                      {formatSeconds(runningTime)}
                    </p>
                    {runningEntry.project?.title && (
                      <p className="text-sm text-secondary mt-1 truncate">
                        {runningEntry.project.title}
                      </p>
                    )}
                    {runningEntry.description && !runningEntry.project?.title && (
                      <p className="text-sm text-secondary mt-1 truncate">
                        {runningEntry.description}
                      </p>
                    )}
                  </div>

                  {/* Stop Button */}
                  <button
                    onClick={handleStopTimer}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-error hover:bg-error/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <IconPlayerStop className="w-5 h-5" />
                        {t('stop') || 'Arrêter'}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pas de timer */}
                  <div className="text-center py-2">
                    <IconClock className="w-10 h-10 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">
                      {t('no_timer') || 'Aucun timer actif'}
                    </p>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={handleStartTimer}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <IconPlayerPlay className="w-5 h-5" />
                        {t('start') || 'Démarrer'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {runningEntry && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between text-xs text-muted bg-hover rounded-lg p-2">
                  <span>{t('started_at') || 'Démarré à'}</span>
                  <span className="font-mono">
                    {new Date(runningEntry.start_time).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

