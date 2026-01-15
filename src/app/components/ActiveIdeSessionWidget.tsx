'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { fetchActiveIdeSession, fetchRecentIdeSessions } from '@/lib/api';
import { TimeEntry } from '@/types';
import { IconCode, IconClock, IconFolder, IconUser, IconRefresh } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { generateClientSlug } from '@/utils/slug';

interface ActiveIdeSessionWidgetProps {
  className?: string;
  compact?: boolean;
}

export default function ActiveIdeSessionWidget({ className = '', compact = false }: ActiveIdeSessionWidgetProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<TimeEntry | null>(null);
  const [recentSessions, setRecentSessions] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const [active, recent] = await Promise.all([
        fetchActiveIdeSession(user.id),
        fetchRecentIdeSessions(user.id),
      ]);
      
      setActiveSession(active);
      setRecentSessions(recent);
      
      // Considérer comme "live" si la session a été mise à jour dans les 5 dernières minutes
      if (active?.end_time) {
        const endTime = new Date(active.end_time);
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        setIsLive(endTime > fiveMinutesAgo);
      } else {
        setIsLive(false);
      }
    } catch (error) {
      console.error('Error loading IDE sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSessions();
    // Refresh every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalTodayMinutes = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return recentSessions
      .filter(s => new Date(s.start_time) >= today)
      .reduce((acc, s) => acc + (s.duration || 0), 0);
  };

  if (loading) {
    return (
      <div className={`bg-card border border-default rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // No IDE sessions at all
  if (!activeSession && recentSessions.length === 0) {
    return (
      <div className={`bg-card border border-default rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3 text-muted">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <IconCode size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">
              {t('no_ide_session') || 'Aucune session IDE'}
            </p>
            <p className="text-xs text-muted">
              {t('ide_session_hint') || 'Connectez VS Code/Cursor avec votre token API'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compact mode - just show status indicator
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-success-light rounded-full"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-xs font-medium text-success">
                {activeSession?.project?.title || 'VS Code'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {!isLive && recentSessions.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
            <IconCode size={14} className="text-muted" />
            <span className="text-xs text-muted">
              {formatDuration(getTotalTodayMinutes())} {t('today') || "aujourd'hui"}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full widget
  return (
    <div className={`bg-card border border-default rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCode size={18} className="!text-accent" />
          <h3 className="font-medium text-primary text-sm">
            {t('ide_tracker') || 'Tracker IDE'}
          </h3>
        </div>
        <button
          onClick={loadSessions}
          className="p-1.5 hover:bg-hover rounded-lg transition-colors text-muted hover:text-primary"
          title={t('refresh') || 'Actualiser'}
        >
          <IconRefresh size={16} />
        </button>
      </div>

      {/* Active Session */}
      <AnimatePresence>
        {isLive && activeSession && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-default"
          >
            <div className="p-4 bg-success-light">
              <div className="flex items-start gap-3">
                {/* Live indicator */}
                <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center flex-shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-success">
                      {t('live') || 'En cours'}
                    </span>
                  </div>
                  
                  {/* Project */}
                  {activeSession.project && (
                    <Link
                      href={`/dashboard/projects/${activeSession.project.documentId}`}
                      className="flex items-center gap-1.5 mt-1 group"
                    >
                      <IconFolder size={14} className="text-success" />
                      <span className="text-sm font-medium text-primary group-hover:text-accent transition-colors truncate">
                        {activeSession.project.title}
                      </span>
                    </Link>
                  )}
                  
                  {/* Client */}
                  {activeSession.client && (
                    <Link
                      href={`/dashboard/clients/${generateClientSlug(activeSession.client.name, activeSession.client.documentId)}`}
                      className="flex items-center gap-1.5 mt-0.5 group"
                    >
                      <IconUser size={14} className="text-muted" />
                      <span className="text-xs text-muted group-hover:text-accent transition-colors truncate">
                        {activeSession.client.name}
                      </span>
                    </Link>
                  )}
                  
                  {/* Duration */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <IconClock size={14} className="text-muted" />
                    <span className="text-xs text-secondary">
                      {formatDuration(activeSession.duration || 0)}
                      {' • '}
                      {t('started_at') || 'Démarré à'} {formatTime(activeSession.start_time)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's summary */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            {t('today') || "Aujourd'hui"}
          </span>
          <span className="text-sm font-semibold text-primary">
            {formatDuration(getTotalTodayMinutes())}
          </span>
        </div>

        {/* Recent sessions list */}
        {recentSessions.length > 0 && (
          <div className="space-y-2">
            {recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                  <IconCode size={16} className="!text-accent" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary truncate">
                    {session.project?.title || session.description || 'Session IDE'}
                  </p>
                  <p className="text-xs text-muted">
                    {session.client?.name && (
                      <span>{session.client.name} • </span>
                    )}
                    {formatTime(session.start_time)} - {session.end_time ? formatTime(session.end_time) : '...'}
                  </p>
                </div>
                
                <span className="text-xs font-medium text-secondary">
                  {formatDuration(session.duration || 0)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Link to time tracking page */}
        <Link
          href="/dashboard/time-tracking"
          className="block mt-3 text-center text-xs !text-accent hover:underline"
        >
          {t('view_all_time_entries') || 'Voir toutes les entrées →'}
        </Link>
      </div>
    </div>
  );
}

