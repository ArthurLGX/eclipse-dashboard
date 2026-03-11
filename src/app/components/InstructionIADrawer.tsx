'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconX, IconSparkles, IconCheck } from '@tabler/icons-react';

const QUICK_PROMPTS = [
  'Pour les leads Walego (domaine prioritaire), privilégier les suggestions du bloc Lead Status si présent dans l\'email.',
  'Relancer rapidement les leads dont le domaine est dans mes priorités ICP.',
  'Proposer des créneaux courts (5-10 min) pour les contacts très sollicités.',
  'Rester concis et actionnable dans les suggestions.',
  'Prioriser les devis en attente de signature.',
];

interface InstructionIADrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeInstruction: string;
  history: string[];
  onSave: (instruction: string) => Promise<void>;
}

export default function InstructionIADrawer({
  isOpen,
  onClose,
  activeInstruction,
  history,
  onSave,
}: InstructionIADrawerProps) {
  const [value, setValue] = useState(activeInstruction);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) setValue(activeInstruction);
  }, [isOpen, activeInstruction]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    setSuccess(false);
    try {
      await onSave(trimmed);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  }, [value, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[199]"
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l border-default shadow-xl z-[200] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-default">
              <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                <IconSparkles className="w-5 h-5 text-accent" />
                Instruction IA
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-hover rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Instruction active
                </label>
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Pour les leads Walego, utiliser les suggestions du bloc Lead Status..."
                  className="w-full min-h-[120px] p-3 rounded-lg border border-default bg-secondary text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
                  rows={5}
                />
                <p className="mt-1.5 text-xs text-muted">⌘ + Entrée pour enregistrer</p>
              </div>

              {history.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Historique (cliquer pour réutiliser)
                  </label>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((h, i) => (
                      <button
                        key={i}
                        onClick={() => setValue(h)}
                        className="w-full text-left p-2.5 rounded-lg bg-secondary border border-default hover:bg-hover text-sm text-primary line-clamp-2 transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Suggestions rapides
                </label>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setValue((v) => (v ? `${v}\n\n${prompt}` : prompt))}
                      className="w-full text-left p-2.5 rounded-lg bg-accent-light border border-default hover:bg-card-hover text-sm text-primary line-clamp-2 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-default">
              <button
                onClick={handleSubmit}
                disabled={saving || !value.trim()}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                  success
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-accent text-accent-text hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement...</span>
                ) : success ? (
                  <>
                    <IconCheck className="w-5 h-5" />
                    Enregistré
                  </>
                ) : (
                  'Enregistrer l\'instruction'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
