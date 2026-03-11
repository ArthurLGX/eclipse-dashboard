'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconX, IconBrain, IconLoader2, IconRefresh } from '@tabler/icons-react';
import type { FollowUpTask } from '@/types/smart-follow-up';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: FollowUpTask | null;
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
}: TaskDetailModalProps) {
  const [analysis, setAnalysis] = useState<{ reasoning: string; suggestion: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!task) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/task-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      if (!res.ok) throw new Error('Erreur génération');
      const data = await res.json();
      setAnalysis({ reasoning: data.reasoning, suggestion: data.suggestion });
    } catch {
      setError('Impossible de générer l\'analyse IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && task) {
      setAnalysis(null);
      setError(null);
      if (task.ai_analysis?.reasoning && task.ai_analysis?.suggestion) {
        setAnalysis({
          reasoning: task.ai_analysis.reasoning,
          suggestion: task.ai_analysis.suggestion,
        });
      } else {
        fetchAnalysis();
      }
    }
  }, [isOpen, task?.documentId]);

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border w-full max-w-5xl border-default rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-default">
              <h2 className="text-lg font-semibold text-primary">
                Analyse – {task.contact?.name || ctx.from_name || 'Contact'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-hover rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contexte */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3">Contexte</h3>
                <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
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
                    <span className="px-2 py-1 text-xs bg-accent/10 text-accent rounded">
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
                    //changer couleur selon sentiment: positive: bg-green-100 text-green-700, neutral: bg-yellow-100 text-yellow-700, negative: bg-red-100 text-red-700
                    <span className={`px-2 py-1 text-xs rounded ${
                      ai.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                      ai.sentiment === 'neutral' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {sentimentLabels[ai.sentiment] || ai.sentiment}
                    </span>
                  )}
                  {ai.confidence != null && (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted">
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
                  <IconBrain className="w-4 h-4 text-accent" />
                  Réflexion et suggestion
                </h3>
                {loading && (
                  <div className="flex items-center gap-2 py-8 text-muted">
                    <IconLoader2 className="w-5 h-5 animate-spin" />
                    <span>{`Génération de l'analyse...`}</span>
                  </div>
                )}
                {error && (
                  <div className="p-4 bg-error-light text-error rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={fetchAnalysis}
                      className="flex items-center gap-1 text-sm hover:underline"
                    >
                      <IconRefresh className="w-4 h-4" />
                      Réessayer
                    </button>
                  </div>
                )}
                {analysis && !loading && (
                  <div className="!space-y-4">
                    <div className="bg-secondary rounded-lg p-4">
                      <p className="text-xs font-medium text-muted uppercase mb-2">Raisonnement</p>
                      <p className="text-sm text-primary whitespace-pre-wrap">{analysis.reasoning}</p>
                    </div>
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                      <p className="text-xs font-medium text-accent uppercase mb-2">Suggestion d&apos;action</p>
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
