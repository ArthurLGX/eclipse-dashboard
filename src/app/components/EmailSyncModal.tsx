'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconLoader2,
  IconCheck,
  IconMail,
  IconAlertCircle,
  IconUserPlus,
} from '@tabler/icons-react';

interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  unknownSenders?: Array<{ email: string; name: string }>;
}

interface EmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SyncResult | null;
  isLoading: boolean;
}

export default function EmailSyncModal({ isOpen, onClose, result, isLoading }: EmailSyncModalProps) {
  const [progress, setProgress] = useState(0);

  // Animation de la barre de progression pendant le chargement
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (result) {
      setProgress(100);
    }
  }, [isLoading, result]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isLoading ? onClose : undefined}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-card border border-default rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isLoading 
                  ? 'bg-accent/10' 
                  : result?.errors && result.errors.length > 0
                    ? 'bg-warning-light'
                    : 'bg-success-light'
              }`}>
                {isLoading ? (
                  <IconLoader2 className="w-6 h-6 text-accent animate-spin" />
                ) : result?.errors && result.errors.length > 0 ? (
                  <IconAlertCircle className="w-6 h-6 text-warning" />
                ) : (
                  <IconCheck className="w-6 h-6 text-success" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary">
                  {isLoading ? 'Synchronisation en cours' : 'Synchronisation terminée'}
                </h3>
                <p className="text-sm text-muted">
                  {isLoading 
                    ? 'Récupération des emails depuis votre boîte de réception...' 
                    : 'Vos emails ont été synchronisés'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Progression</span>
                  <span className="text-accent font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-muted text-center mt-2">
                  Analyse des nouveaux messages...
                </p>
              </div>
            )}

            {/* Results */}
            {!isLoading && result && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-success-light border border-success/20">
                    <div className="flex items-center gap-2 mb-1">
                      <IconMail className="w-4 h-4 text-success" />
                      <span className="text-xs font-medium text-success-text">Nouveaux</span>
                    </div>
                    <p className="text-2xl font-bold text-success-text">{result.synced}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary border border-default">
                    <div className="flex items-center gap-2 mb-1">
                      <IconCheck className="w-4 h-4 text-muted" />
                      <span className="text-xs font-medium text-muted">Ignorés</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{result.skipped}</p>
                  </div>
                </div>

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <div className="p-4 rounded-xl bg-warning-light border border-warning">
                    <div className="flex items-center gap-2 mb-2">
                      <IconAlertCircle className="w-4 h-4 text-warning-text" />
                      <span className="text-sm font-medium text-warning-text">
                        Avertissements ({result.errors.length})
                      </span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 3).map((error, idx) => (
                        <p key={idx} className="text-xs text-warning-text opacity-80">
                          • {error}
                        </p>
                      ))}
                      {result.errors.length > 3 && (
                        <p className="text-xs text-warning-text opacity-60">
                          ... et {result.errors.length - 3} autre(s)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Unknown Senders (future feature) */}
                {result.unknownSenders && result.unknownSenders.length > 0 && (
                  <div className="p-4 rounded-xl bg-info-light border border-info">
                    <div className="flex items-center gap-2 mb-3">
                      <IconUserPlus className="w-4 h-4 text-info-text" />
                      <span className="text-sm font-medium text-info-text">
                        Expéditeurs inconnus ({result.unknownSenders.length})
                      </span>
                    </div>
                    <p className="text-xs text-info-text opacity-80 mb-3">
                      Ces emails proviennent de contacts non enregistrés. Voulez-vous les ajouter ?
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {result.unknownSenders.slice(0, 3).map((sender, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-info-text font-medium">
                            {sender.name || sender.email}
                          </span>
                          <button className="px-2 py-1 bg-info text-white rounded-lg text-xs hover:opacity-90">
                            Ajouter
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {result.synced === 0 && result.errors.length === 0 && (
                  <div className="text-center py-4">
                    <IconCheck className="w-12 h-12 text-success mx-auto mb-2" />
                    <p className="text-sm text-muted">
                      Votre boîte de réception est à jour
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && (
            <div className="p-6 border-t border-default flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg btn-primary"
              >
                Fermer
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
