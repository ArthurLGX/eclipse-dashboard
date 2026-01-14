'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconCheck, 
  IconX, 
  IconLoader2,
  IconAlertCircle,
  IconPlayerSkipForward
} from '@tabler/icons-react';
import { useModalScroll } from '@/hooks/useModalFocus';

export interface ImportProgressItem {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'uploading_image' | 'creating' | 'success' | 'error' | 'skipped';
  error?: string;
}

interface ImportProgressModalProps {
  isOpen: boolean;
  items: ImportProgressItem[];
  totalCount: number;
  currentIndex: number;
  onClose: () => void;
  isComplete: boolean;
  t: (key: string) => string;
}

export default function ImportProgressModal({ 
  isOpen, 
  items, 
  totalCount, 
  currentIndex,
  onClose,
  isComplete,
  t 
}: ImportProgressModalProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Bloquer le scroll du body quand la modale est ouverte
  useModalScroll(isOpen);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [items]);

  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const skippedCount = items.filter(i => i.status === 'skipped').length;
  const progressPercent = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0;

  if (!isOpen) return null;

  const getStatusIcon = (status: ImportProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-zinc-500" />;
      case 'uploading_image':
        return <IconLoader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'creating':
        return <IconLoader2 className="w-5 h-5 text-accent animate-spin" />;
      case 'success':
        return <IconCheck className="w-5 h-5 text-success" />;
      case 'error':
        return <IconX className="w-5 h-5 text-danger" />;
      case 'skipped':
        return <IconPlayerSkipForward className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusText = (status: ImportProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return t('import_status_pending') || 'En attente...';
      case 'uploading_image':
        return t('import_status_uploading') || 'Upload image...';
      case 'creating':
        return t('import_status_creating') || 'Création...';
      case 'success':
        return t('import_status_success') || 'Ajouté !';
      case 'error':
        return t('import_status_error') || 'Erreur';
      case 'skipped':
        return t('import_status_skipped') || 'Ignoré';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card border border-default rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-default">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-3">
              {t('import_progress_title') || 'Import en cours...'}
            </h2>
            {isComplete && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-card-hover transition-colors"
              >
                <IconX className="w-5 h-5 text-secondary" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">
                {currentIndex} / {totalCount} {t('clients') || 'clients'}
              </span>
              <span className="text-primary font-medium">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-light text-success text-sm">
              <IconCheck className="w-4 h-4" />
              {successCount} {t('import_success_count') || 'ajouté(s)'}
            </div>
            {skippedCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-light text-warning text-sm">
                <IconPlayerSkipForward className="w-4 h-4" />
                {skippedCount} {t('import_skipped_count') || 'ignoré(s)'}
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-light text-danger text-sm">
                <IconAlertCircle className="w-4 h-4" />
                {errorCount} {t('import_error_count') || 'erreur(s)'}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable list with animation */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px] max-h-[400px]"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.02,
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
                className={`
                  flex items-center gap-4 p-3 rounded-xl border transition-all
                  ${item.status === 'success' 
                    ? 'bg-success-light border-success' 
                    : item.status === 'error'
                      ? 'bg-danger-light border-danger'
                      : item.status === 'skipped'
                        ? 'bg-warning-light border-warning'
                        : 'bg-card-hover border-default'
                  }
                `}
              >
                {/* Status icon with animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {getStatusIcon(item.status)}
                </motion.div>

                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${
                    item.status === 'error' 
                      ? 'text-danger' 
                      : item.status === 'skipped'
                        ? 'text-warning'
                        : 'text-primary'
                  }`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-secondary truncate">{item.email}</p>
                </div>

                {/* Status text */}
                <div className="text-right">
                  <p className={`text-sm ${
                    item.status === 'success' 
                      ? 'text-success' 
                      : item.status === 'error'
                        ? 'text-danger'
                        : item.status === 'skipped'
                          ? 'text-warning'
                          : 'text-secondary'
                  }`}>
                    {getStatusText(item.status)}
                  </p>
                  {item.error && (
                      <p className="text-xs text-danger max-w-[200px] truncate" title={item.error}>
                      {item.error}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state while waiting */}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-secondary">
              <IconLoader2 className="w-8 h-8 animate-spin mb-2" />
              <p>{t('import_starting') || 'Démarrage de l\'import...'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="!p-6 border-t border-default bg-card-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary font-medium">
                  {t('import_complete') || 'Import terminé !'}
                </p>
                <p className="text-sm text-secondary">
                  <span className="text-success">{successCount} {t('import_clients_added') || 'ajouté(s)'}</span>
                  {skippedCount > 0 && (
                    <span className="text-warning">, {skippedCount} {t('import_clients_skipped') || 'ignoré(s)'}</span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-danger">, {errorCount} {t('import_clients_failed') || 'erreur(s)'}</span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="btn-primary px-6 py-2 rounded-lg"
              >
                {t('close') || 'Fermer'}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

