'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import {
  IconClock,
  IconPlayerStop,
  IconExternalLink,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconGripVertical,
  IconChevronRight,
  IconChevronLeft,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import { useUserPreferencesOptional } from '@/app/context/UserPreferencesContext';
import {
  fetchRunningTimeEntry,
  stopTimeEntry,
  updateTimeEntry,
} from '@/lib/api';
import type { TimeEntry } from '@/types';

type TimerCompletionStatus = 'completed' | 'exceeded_continue' | 'exceeded_success' | 'exceeded_failed';

export default function TimerIndicator() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const preferencesContext = useUserPreferencesOptional();
  const router = useRouter();
  
  const enabledModules = preferencesContext?.enabledModules;

  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [runningTime, setRunningTime] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showExceededModal, setShowExceededModal] = useState(false);
  const [exceededModalShown, setExceededModalShown] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Vérifier si le module time_tracking est activé
  const isTimeTrackingEnabled = enabledModules?.includes('time_tracking') ?? false;

  // Charger le timer en cours
  useEffect(() => {
    if (!user?.id || !isTimeTrackingEnabled) return;

    const loadRunningEntry = async () => {
      try {
        const entry = await fetchRunningTimeEntry(user.id);
        setRunningEntry(entry);
        // Reset modal shown state if new entry
        if (entry && (!runningEntry || entry.documentId !== runningEntry.documentId)) {
          setExceededModalShown(false);
        }
      } catch {
        setRunningEntry(null);
      }
    };

    loadRunningEntry();
    const interval = setInterval(loadRunningEntry, 10000);

    return () => clearInterval(interval);
  }, [user?.id, isTimeTrackingEnabled, runningEntry?.documentId]);

  // Mettre à jour le timer en temps réel
  useEffect(() => {
    if (runningEntry) {
      const startTime = new Date(runningEntry.start_time).getTime();

      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRunningTime(elapsed);
        
        // Vérifier si le temps imparti est dépassé
        if (runningEntry.estimated_duration && !exceededModalShown) {
          const estimatedSeconds = runningEntry.estimated_duration * 60;
          if (elapsed >= estimatedSeconds) {
            setShowExceededModal(true);
            setExceededModalShown(true);
          }
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    } else {
      setRunningTime(0);
    }
  }, [runningEntry, exceededModalShown]);

  // Format seconds to HH:MM:SS
  const formatSeconds = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format minutes to display
  const formatMinutes = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
    }
    return `${mins}min`;
  }, []);

  // Calculer la progression
  const progressPercent = runningEntry?.estimated_duration 
    ? Math.min((runningTime / (runningEntry.estimated_duration * 60)) * 100, 100)
    : 0;

  const isExceeded = runningEntry?.estimated_duration 
    ? runningTime >= runningEntry.estimated_duration * 60
    : false;

  // Obtenir le nom de la tâche
  const taskName = runningEntry?.task?.title 
    || runningEntry?.project?.title 
    || runningEntry?.description 
    || t('task_in_progress') || 'Tâche en cours';

  // Arrêter le timer avec un statut
  const handleStopTimer = async (status?: TimerCompletionStatus) => {
    if (!runningEntry) return;
    setLoading(true);
    try {
      // Mettre à jour le statut si nécessaire
      if (status) {
        const timerStatus = status === 'completed' || status === 'exceeded_success' 
          ? 'completed' 
          : status === 'exceeded_failed' 
            ? 'exceeded'
            : 'active';
        
        await updateTimeEntry(runningEntry.documentId, { 
          timer_status: timerStatus as 'active' | 'completed' | 'exceeded'
        });
      }
      
      await stopTimeEntry(runningEntry.documentId);
      setRunningEntry(null);
      setRunningTime(0);
      setShowExceededModal(false);
      
      const message = status === 'exceeded_success' || status === 'completed'
        ? t('task_completed_success') || 'Tâche terminée avec succès !'
        : status === 'exceeded_failed'
          ? t('task_completed_incomplete') || 'Tâche marquée comme incomplète'
          : t('timer_stopped') || 'Timer arrêté';
      
      const popupType = status === 'exceeded_success' || status === 'completed'
        ? 'success'
        : status === 'exceeded_failed'
          ? 'warning'
          : 'success';
      
      showGlobalPopup(message, popupType);
    } catch {
      showGlobalPopup(t('timer_error') || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Continuer après dépassement
  const handleContinue = () => {
    setShowExceededModal(false);
  };

  // Ne pas afficher si le module n'est pas activé ou pas de timer
  if (!isTimeTrackingEnabled || !runningEntry) {
    return null;
  }

  return (
    <>
      {/* Drag Constraints Container */}
      <div 
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-[1001]"
      />

      {/* Timer Bar - Draggable & Collapsible */}
      <motion.div 
        ref={timerRef}
        drag={!isCollapsed}
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          setPosition(prev => ({
            x: prev.x + info.offset.x,
            y: prev.y + info.offset.y,
          }));
        }}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          x: position.x,
          y: position.y,
        }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[1002] flex items-center pointer-events-auto"
        style={{ touchAction: 'none' }}
      >
        {/* Collapse Toggle Button - Always visible */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-center w-8 h-20 rounded-l-xl shadow-lg transition-all cursor-pointer ${
            isExceeded 
              ? 'bg-danger hover:bg-danger-light' 
              : 'bg-warning hover:bg-warning-light'
          }`}
          title={isCollapsed ? (t('expand') || 'Ouvrir') : (t('collapse') || 'Réduire')}
        >
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            {isCollapsed ? (
              <>
                <IconClock className="w-4 h-4 text-white animate-pulse" />
                <IconChevronLeft className="w-4 h-4 text-white" />
              </>
            ) : (
              <IconChevronRight className="w-4 h-4 text-white" />
            )}
          </div>
        </button>

        {/* Main Timer Panel - Collapsible */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative overflow-hidden rounded-r-xl shadow-2xl cursor-grab active:cursor-grabbing ${
                isExceeded 
                  ? 'bg-danger-light' 
                  : 'bg-warning-light'
              }`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
          {/* Progress Bar Background */}
          <div className="absolute inset-0 bg-black/10" />
          <motion.div 
            className={`absolute inset-y-0 left-0 ${isExceeded ? 'bg-black/20' : 'bg-black/15'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Content */}
          <div className="relative p-3 min-w-[220px]">
            {/* Drag Handle + Task Name */}
            <div className="flex items-center gap-2 mb-2">
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-white/10 rounded"
              >
                <IconGripVertical className="w-4 h-4 !text-white" />
              </div>
              <IconClock className="w-4 h-4 text-warning animate-pulse" />
              <span className="text-sm font-medium text-warning truncate max-w-[140px]">
                {taskName}
              </span>
            </div>

            {/* Timer Display */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-mono font-bold text-warning drop-shadow-md">
                {formatSeconds(runningTime)}
              </span>
              {runningEntry.estimated_duration && (
                <span className="text-xs text-warning/80 font-medium">
                  / {formatMinutes(runningEntry.estimated_duration)}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {runningEntry.estimated_duration && (
              <div className="h-2 bg-white/30 rounded-full overflow-hidden mb-3">
                <motion.div 
                  className={`h-full rounded-full ${isExceeded ? 'bg-white' : 'bg-white'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStopTimer(isExceeded ? undefined : 'completed')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white/25 hover:bg-white/35 text-warning text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <IconPlayerStop className="w-4 h-4" />
                    {t('stop') || 'Stop'}
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard/time-tracking')}
                className="p-2 bg-white/25 hover:bg-white/35 text-warning rounded-lg transition-colors shadow-sm"
                title={t('view_details') || 'Voir détails'}
              >
                <IconExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Exceeded Time Modal */}
      <AnimatePresence>
        {showExceededModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-default rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 bg-warning-light border-b border-warning">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-warning-light flex items-center justify-center">
                    <IconAlertTriangle className="w-6 h-6 text-warning-light" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {t('time_exceeded') || 'Temps imparti écoulé'}
                    </h3>
                    <p className="text-sm text-muted">
                      {formatMinutes(runningEntry?.estimated_duration || 0)} {t('elapsed') || 'écoulé(s)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-secondary mb-6">
                  {t('time_exceeded_question') || 'Le temps imparti pour cette tâche est écoulé. Que souhaitez-vous faire ?'}
                </p>

                <div className="space-y-3">
                  {/* Continue */}
                  <button
                    onClick={handleContinue}
                    className="w-full flex items-center gap-3 p-4 bg-warning/10 hover:bg-warning/20 border border-warning/30 rounded-xl transition-colors text-left"
                  >
                    <IconClock className="w-5 h-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">{t('continue_task') || 'Continuer la tâche'}</p>
                      <p className="text-xs text-muted">{t('continue_task_desc') || 'Rallonger le temps de travail'}</p>
                    </div>
                  </button>

                  {/* Mark as completed */}
                  <button
                    onClick={() => handleStopTimer('exceeded_success')}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-4 bg-success/10 hover:bg-success/20 border border-success/30 rounded-xl transition-colors text-left disabled:opacity-50"
                  >
                    <IconCheck className="w-5 h-5 text-success flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">{t('objectives_completed') || 'Objectifs atteints'}</p>
                      <p className="text-xs text-muted">{t('objectives_completed_desc') || 'La tâche est terminée avec succès'}</p>
                    </div>
                  </button>

                  {/* Mark as incomplete */}
                  <button
                    onClick={() => handleStopTimer('exceeded_failed')}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-4 bg-danger/10 hover:bg-danger/20 border border-danger/30 rounded-xl transition-colors text-left disabled:opacity-50"
                  >
                    <IconX className="w-5 h-5 text-danger flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">{t('objectives_not_completed') || 'Objectifs non atteints'}</p>
                      <p className="text-xs text-muted">{t('objectives_not_completed_desc') || 'Arrêter et marquer comme incomplet'}</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
