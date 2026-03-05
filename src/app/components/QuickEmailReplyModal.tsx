'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconSend,
  IconWand,
  IconLoader2,
} from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import { useAIFeatures } from '@/app/context/AIFeaturesContext';
import { usePopup } from '@/app/context/PopupContext';
import type { AutomationAction } from '@/types/smart-follow-up';

interface QuickEmailReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: AutomationAction | null;
  onSuccess?: () => void;
}

export default function QuickEmailReplyModal({
  isOpen,
  onClose,
  action,
  onSuccess,
}: QuickEmailReplyModalProps) {
  const { user } = useAuth();
  const { isFeatureEnabled } = useAIFeatures();
  const { showGlobalPopup } = usePopup();
  
  const [replyContent, setReplyContent] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sending, setSending] = useState(false);

  const handleGenerateAIReply = async () => {
    if (!action || !isFeatureEnabled('email_suggestions')) {
      showGlobalPopup('Fonctionnalité IA désactivée', 'warning');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/email-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: 'reply',
          context: {
            originalSubject: action.proposed_content.subject,
            originalBody: action.proposed_content.body,
            senderName: action.client?.name,
            senderEmail: action.client?.email,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur génération IA');
      }

      const data = await response.json();
      setReplyContent(data.content || data.body || '');
      showGlobalPopup('✨ Réponse générée avec succès', 'success');
    } catch (error) {
      console.error('Error generating AI reply:', error);
      showGlobalPopup('Erreur lors de la génération IA', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSend = async () => {
    if (!replyContent.trim()) {
      showGlobalPopup('Veuillez saisir un message', 'warning');
      return;
    }

    if (!action?.client?.email) {
      showGlobalPopup('Email du destinataire non trouvé', 'error');
      return;
    }

    setSending(true);
    try {
      // Envoyer via l'API d'emails
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [action.client.email],
          subject: `Re: ${action.proposed_content.subject}`,
          body: replyContent,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur envoi email');
      }

      showGlobalPopup('✓ Email envoyé avec succès !', 'success');
      setReplyContent('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup('Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!action) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-card border border-default rounded-2xl shadow-2xl z-[9999] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-default">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-primary mb-1">
                  Répondre à {action.client?.name || 'ce contact'}
                </h2>
                <p className="text-sm text-muted truncate">
                  {action.client?.email}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Email original (contexte) */}
            <div className="px-6 py-4 bg-secondary/50 border-b border-default">
              <p className="text-xs text-muted mb-1">Sujet original :</p>
              <p className="text-sm font-medium text-primary">
                {action.proposed_content.subject}
              </p>
            </div>

            {/* Corps du message */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Votre réponse
                  </label>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Tapez votre réponse ici..."
                    rows={12}
                    className="w-full px-4 py-3 bg-secondary border border-default rounded-xl text-primary placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer avec actions */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-default bg-secondary/30">
              <div className="text-sm text-muted">
                {replyContent.length} caractères
              </div>
              
              <div className="flex items-center gap-3">
                {/* Bouton Génération IA */}
                {isFeatureEnabled('email_suggestions') && (
                  <button
                    onClick={handleGenerateAIReply}
                    disabled={generatingAI}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-600 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-50 border border-purple-500/20"
                  >
                    {generatingAI ? (
                      <IconLoader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <IconWand className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {generatingAI ? 'Génération...' : 'Générer avec IA'}
                    </span>
                  </button>
                )}

                {/* Bouton Envoyer */}
                <button
                  onClick={handleSend}
                  disabled={sending || !replyContent.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                >
                  {sending ? (
                    <>
                      <IconLoader2 className="w-5 h-5 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <IconSend className="w-5 h-5" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
