'use client';

import { motion, AnimatePresence } from 'motion/react';
import { IconAlertTriangle, IconTrash, IconX, IconLoader2 } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  itemName: string;
  itemType: 'client' | 'project' | 'facture' | 'prospect' | 'mentor';
  warningMessage?: string;
}

const itemTypeLabels: Record<string, { fr: string; article: string }> = {
  client: { fr: 'client', article: 'ce' },
  project: { fr: 'projet', article: 'ce' },
  facture: { fr: 'facture', article: 'cette' },
  prospect: { fr: 'prospect', article: 'ce' },
  mentor: { fr: 'mentor', article: 'ce' },
};

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  warningMessage,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const typeInfo = itemTypeLabels[itemType] || { fr: 'élément', article: 'cet' };
  
  // Phrase à réécrire pour confirmer
  const confirmPhrase = `supprimer ${itemName}`.toLowerCase();
  const isConfirmValid = confirmText.toLowerCase().trim() === confirmPhrase;

  // Reset le champ quand le modal s'ouvre/ferme
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      setConfirmText('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card border border-default rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-danger-light flex items-center justify-center">
                <IconAlertTriangle className="w-6 h-6 text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-1 text-sm text-muted">
                  Cette action est irréversible. Êtes-vous sûr de vouloir supprimer {typeInfo.article} {typeInfo.fr} ?
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="p-1 text-muted hover:text-primary transition-colors disabled:opacity-50"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Item Name */}
            <div className="mt-4 p-3 bg-hover rounded-lg border border-default">
              <p className="text-primary font-medium truncate">{itemName}</p>
            </div>

            {/* Warning */}
            {warningMessage && (
              <div className="mt-4 p-3 bg-warning-light border border-warning rounded-lg">
                <p className="text-warning text-sm">{warningMessage}</p>
              </div>
            )}

            {/* Confirmation Input - Style GitHub */}
            <div className="mt-5">
              <label className="block text-sm text-muted mb-2">
                Pour confirmer, tapez{' '}
                <span className="font-mono text-danger bg-danger-light px-1.5 py-0.5 rounded">
                  {confirmPhrase}
                </span>{' '}
                ci-dessous :
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmPhrase}
                disabled={isDeleting}
                className={`
                  input w-full px-3 py-2.5
                  focus:outline-none focus:ring-2
                  transition-colors disabled:opacity-50
                  ${isConfirmValid 
                    ? 'border-success focus:ring-success' 
                    : 'focus:ring-danger focus:border-danger'
                  }
                `}
                autoComplete="off"
                spellCheck="false"
              />
              {confirmText && !isConfirmValid && (
                <p className="mt-1.5 text-xs text-danger">
                  Le texte ne correspond pas
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-danger-light border border-danger rounded-lg"
              >
                <p className="text-danger text-sm">{error}</p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="btn-ghost flex-1 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting || !isConfirmValid}
                className={`
                  flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all
                  flex items-center justify-center gap-2
                  ${isConfirmValid
                    ? 'btn-danger'
                    : 'btn-ghost cursor-not-allowed'
                  }
                  disabled:opacity-50
                `}
              >
                {isDeleting ? (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <IconTrash className="w-4 h-4" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
