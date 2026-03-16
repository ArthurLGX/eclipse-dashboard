'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalFocus } from '@/hooks/useModalFocus';
import { IconX, IconBrain } from '@tabler/icons-react';
import type { FollowUpTask } from '@/types/smart-follow-up';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: FollowUpTask | null;
  aiInstruction?: string | null;
  /** Mots-clés qui, s'ils apparaissent dans le sujet/corps, signent un lead chaud */
  hotLeadKeywords?: string[];
}

const urgencyLabels: Record<string, string> = {
  urgent: 'Urgent',
  high: 'Prioritaire',
  medium: 'Normal',
  low: 'Faible',
};

const sentimentLabels: Record<string, string> = {
  positive: 'Positif',
  neutral: 'Neutre',
  negative: 'Négatif',
};

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  aiInstruction,
  hotLeadKeywords,
}: TaskDetailModalProps) {
  const [analysis, setAnalysis] = useState<{ reasoning: string; suggestion: string } | null>(null);
  const modalRef = useModalFocus(isOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Aucune génération IA à l'ouverture : on affiche uniquement l'analyse déjà présente (créée lors de la lecture du mail)
  useEffect(() => {
    if (isOpen && task) {
      if (task.ai_analysis?.reasoning && task.ai_analysis?.suggestion) {
        setAnalysis({
          reasoning: task.ai_analysis.reasoning,
          suggestion: task.ai_analysis.suggestion,
        });
      } else {
        setAnalysis(null);
      }
    }
  }, [isOpen, task?.documentId, task?.ai_analysis]);

  useEffect(() => {
    if (isOpen) {
      const el = scrollRef.current;
      el?.scrollTo(0, 0);
      const t = setTimeout(() => el?.focus({ preventScroll: true }), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!task) return null;

  const ctx = task.context || {};
  const ai = task.ai_analysis || {};

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border w-full max-h-[90vh] max-w-5xl border-default  shadow-xl z-50 flex flex-col overflow-hidden outline-none"
          >
            <div className="flex items-center justify-between p-4 border-b border-default">
              <h2 className="text-lg font-semibold text-primary">
                Analyse – {task.contact?.name || ctx.from_name || 'Contact'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-hover  transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contexte */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3">Contexte</h3>
                <div className="bg-secondary  p-4 space-y-2 text-sm">
                  <p><span className="text-muted">Email :</span> {ctx.from_email || task.contact?.email || 'N/A'}</p>
                  <p><span className="text-muted">Sujet :</span> {ctx.original_subject || task.received_email?.subject || 'N/A'}</p>
                  <p><span className="text-muted">Reçu le :</span> {ctx.received_at ? new Date(ctx.received_at).toLocaleString('fr-FR') : 'N/A'}</p>
                  {ctx.extracted_entities && ctx.extracted_entities.length > 0 && (
                    <p><span className="text-muted">Entités :</span> {ctx.extracted_entities.join(', ')}</p>
                  )}
                </div>
              </section>

              {/* Analyse IA existante */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3">Analyse IA existante</h3>
                <div className="flex flex-wrap gap-2">
                  {ai.intent && (
                    <span className="px-2 py-1 text-xs bg-accent-light !text-accent-text rounded">
                      Intention : {ai.intent}
                    </span>
                  )}
                  {ai.urgency && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      ai.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                      ai.urgency === 'high' ? 'bg-amber-100 text-amber-700' :
                      'bg-muted text-muted'
                    }`}>
                      {urgencyLabels[ai.urgency] || ai.urgency}
                    </span>
                  )}
                  {ai.sentiment && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      ai.sentiment === 'positive' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      ai.sentiment === 'neutral' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                      'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      {sentimentLabels[ai.sentiment] || ai.sentiment}
                    </span>
                  )}
                  {ai.confidence != null && (
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      ai.confidence >= 0.8 ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      ai.confidence >= 0.5 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                      'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      Confiance : {(ai.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  {ai.language && (
                    <span className="px-2 py-1 text-xs rounded bg-muted text-muted">
                      {ai.language.toUpperCase()}
                    </span>
                  )}
                </div>
              </section>

              {/* Raisonnement et suggestion IA */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <IconBrain className="w-4 h-4 text-accent-text" />
                  Réflexion et suggestion
                </h3>
                {!analysis && (
                  <p className="py-4 text-sm text-muted">
                    L&apos;analyse sera disponible après traitement du mail (lecture automatique).
                  </p>
                )}
                {analysis && (
                  <div className="!space-y-4 !p-0 ">
                    <div className="bg-secondary  p-4">
                      <p className="text-xs font-medium text-muted uppercase mb-2">Raisonnement</p>
                      <p className="text-sm text-primary whitespace-pre-wrap">{analysis.reasoning}</p>
                    </div>
                    <div className="bg-green-500/5 border border-default  p-4">
                      <p className="text-xs !text-green-600 font-medium !text-accent-text uppercase mb-2">Suggestion d&apos;action</p>
                      <p className="text-sm text-primary font-medium whitespace-pre-wrap">{analysis.suggestion}</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
