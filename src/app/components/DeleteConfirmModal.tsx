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
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <IconAlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Cette action est irréversible. Êtes-vous sûr de vouloir supprimer {typeInfo.article} {typeInfo.fr} ?
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Item Name */}
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <p className="text-zinc-200 font-medium truncate">{itemName}</p>
            </div>

            {/* Warning */}
            {warningMessage && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-sm">{warningMessage}</p>
              </div>
            )}

            {/* Confirmation Input - Style GitHub */}
            <div className="mt-5">
              <label className="block text-sm text-zinc-400 mb-2">
                Pour confirmer, tapez{' '}
                <span className="font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
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
                  w-full px-3 py-2.5 rounded-lg border bg-zinc-950 text-zinc-100
                  placeholder:text-zinc-600 focus:outline-none focus:ring-2
                  transition-colors disabled:opacity-50
                  ${isConfirmValid 
                    ? 'border-emerald-500/50 focus:ring-emerald-500/30' 
                    : 'border-zinc-700 focus:ring-red-500/30 focus:border-red-500/50'
                  }
                `}
                autoComplete="off"
                spellCheck="false"
              />
              {confirmText && !isConfirmValid && (
                <p className="mt-1.5 text-xs text-red-400">
                  Le texte ne correspond pas
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
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
                    ? 'text-white bg-red-600 hover:bg-red-700'
                    : 'text-zinc-500 bg-zinc-800 cursor-not-allowed'
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
