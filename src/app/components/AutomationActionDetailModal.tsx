'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconUser,
  IconMail,
  IconCalendar,
  IconBan,
  IconEdit,
  IconSend,
  IconLoader2,
  IconBrain,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { AutomationAction } from '@/types/smart-follow-up';

interface AutomationActionDetailModalProps {
  action: AutomationAction | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (actionId: number, documentId: string) => Promise<void>;
  onReject: (actionId: number, documentId: string) => Promise<void>;
}

export default function AutomationActionDetailModal({
  action,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: AutomationActionDetailModalProps) {
  const { t } = useLanguage();
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Générer le récap IA quand l'action change
  useEffect(() => {
    if (action && isOpen) {
      generateAISummary(action);
      setEditedContent(action.proposed_content.body);
      setIsEditing(false);
    }
  }, [action, isOpen]);

  const generateAISummary = async (action: AutomationAction) => {
    setLoadingSummary(true);
    try {
      const response = await fetch('/api/ai/action-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            client: action.client?.name || 'Contact inconnu',
            taskType: action.follow_up_task?.task_type || 'custom',
            subject: action.proposed_content.subject,
            body: action.proposed_content.body,
            confidence: action.confidence_score,
            createdAt: action.createdAt,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      } else {
        setAiSummary('Impossible de générer le résumé pour le moment.');
      }
    } catch (error) {
      console.error('Erreur génération résumé IA:', error);
      setAiSummary('Erreur lors de la génération du résumé.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!action) return;
    setProcessing(true);
    try {
      // Si le contenu a été édité, le sauvegarder d'abord
      if (isEditing && editedContent !== action.proposed_content.body) {
        // TODO: Appeler une API pour mettre à jour le contenu
        // await updateAutomationActionContent(action.documentId, editedContent);
      }
      await onApprove(action.id, action.documentId);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!action) return;
    setProcessing(true);
    try {
      await onReject(action.id, action.documentId);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'payment_reminder': 'Rappel de paiement',
      'proposal_follow_up': 'Suivi de devis',
      'meeting_follow_up': 'Suivi de réunion',
      'thank_you': 'Remerciement',
      'check_in': 'Prise de contact',
      'custom': 'Personnalisé',
    };
    return labels[type] || type;
  };

  if (!action) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-card border border-default rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-default">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <IconBrain className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">
                    {t('action_details') || 'Détails de l\'action'}
                  </h2>
                  <p className="text-sm text-muted">
                    {getTaskTypeLabel(action.follow_up_task?.task_type || 'custom')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-hover rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Summary */}
              <div className="bg-gradient-to-br from-purple-500/5 to-accent/5 border border-purple-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <IconBrain className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-primary">
                    {t('ai_summary') || 'Résumé par IA'}
                  </h3>
                </div>
                {loadingSummary ? (
                  <div className="flex items-center gap-2 text-muted">
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {t('generating_summary') || 'Génération du résumé en cours...'}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">
                    {aiSummary}
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted text-sm">
                    <IconUser className="w-4 h-4" />
                    <span>Contact</span>
                  </div>
                  <p className="text-primary font-medium pl-6">
                    {action.client?.name || 'Contact inconnu'}
                  </p>
                  {action.client?.email && (
                    <p className="text-sm text-muted pl-6">{action.client.email}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted text-sm">
                    <IconCalendar className="w-4 h-4" />
                    <span>Créé</span>
                  </div>
                  <p className="text-primary pl-6">
                    {new Date(action.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">
                    {t('confidence_score') || 'Score de confiance'} :
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    action.confidence_score >= 0.8 
                      ? 'bg-success-light text-success-text' 
                      : action.confidence_score >= 0.6
                        ? 'bg-warning-light text-warning-text'
                        : 'bg-error-light text-error-text'
                  }`}>
                    {(action.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                {action.confidence_score < 0.7 && (
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <IconAlertCircle className="w-4 h-4" />
                    <span>{t('low_confidence_warning') || 'Score faible - Vérifiez le contenu avant d\'envoyer'}</span>
                  </div>
                )}
              </div>

              {/* Email Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <IconMail className="w-5 h-5 text-accent" />
                    {t('proposed_email') || 'Email proposé'}
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-accent hover:text-accent-light flex items-center gap-1"
                    >
                      <IconEdit className="w-4 h-4" />
                      {t('edit_content') || 'Modifier'}
                    </button>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-xs text-muted uppercase tracking-wide">
                    {t('email_subject') || 'Objet'}
                  </label>
                  <div className="p-3 bg-secondary border border-default rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      {action.proposed_content.subject}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <label className="text-xs text-muted uppercase tracking-wide">
                    {t('email_body') || 'Message'}
                  </label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={12}
                        className="w-full p-4 bg-page border border-default rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditedContent(action.proposed_content.body);
                            setIsEditing(false);
                          }}
                          className="px-4 py-2 text-sm text-muted hover:text-primary"
                        >
                          {t('cancel_edit') || 'Annuler'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:opacity-90"
                        >
                          {t('save_changes') || 'Enregistrer les modifications'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-page border border-default rounded-lg">
                      <pre className="text-sm text-primary whitespace-pre-wrap font-sans leading-relaxed">
                        {editedContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-default bg-secondary/50">
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconBan className="w-5 h-5" />
                  {t('reject_action') || 'Rejeter'}
                </button>
                <button
                  onClick={handleApproveAndSend}
                  disabled={processing}
                  className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-accent to-purple-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? (
                    <>
                      <IconLoader2 className="w-5 h-5 animate-spin" />
                      {t('processing_action') || 'Traitement en cours...'}
                    </>
                  ) : (
                    <>
                      <IconSend className="w-5 h-5" />
                      {t('approve_and_send') || 'Approuver et envoyer'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted text-center mt-3">
                {t('email_will_be_sent') || 'L\'email sera envoyé automatiquement par le système dans les minutes suivant l\'approbation'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
