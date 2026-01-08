'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconClock,
  IconMail,
  IconUsers,
  IconTrash,
  IconLoader2,
  IconArrowLeft,
  IconX,
  IconCalendar,
  IconAlertTriangle,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { fetchSentEmails, deleteSentEmail } from '@/lib/api';
import type { SentEmail } from '@/types';

export default function ScheduledEmailsPage() {
  return (
    <ProtectedRoute>
      <ScheduledEmails />
    </ProtectedRoute>
  );
}

function ScheduledEmails() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [scheduledEmails, setScheduledEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const loadScheduledEmails = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const emails = await fetchSentEmails(user.id);
      // Filtrer uniquement les emails planifiés
      const scheduled = emails.filter(email => email.status_mail === 'scheduled');
      // Trier par date de planification
      scheduled.sort((a, b) => {
        const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return dateA - dateB;
      });
      setScheduledEmails(scheduled);
    } catch (error) {
      console.error('Error loading scheduled emails:', error);
      showGlobalPopup(t('error_loading') || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showGlobalPopup, t]);

  useEffect(() => {
    loadScheduledEmails();
  }, [loadScheduledEmails]);

  const handleCancelEmail = async (documentId: string) => {
    setCancellingId(documentId);
    try {
      await deleteSentEmail(documentId);
      showGlobalPopup(t('email_cancelled') || 'Email annulé', 'success');
      setConfirmCancel(null);
      loadScheduledEmails();
    } catch (error) {
      console.error('Error cancelling email:', error);
      showGlobalPopup(t('cancel_error') || 'Erreur lors de l\'annulation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const target = new Date(dateString);
    const diff = target.getTime() - now.getTime();
    
    if (diff < 0) return t('overdue') || 'En retard';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-default px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/emails"
              className="p-2 text-muted hover:text-primary hover:bg-accent-light rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </Link>
            
            <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
              <IconClock className="w-6 h-6 text-purple-500" />
              {t('scheduled_emails') || 'Emails planifiés'}
            </h1>
          </div>
          
          <Link
            href="/dashboard/emails/compose"
            className="flex items-center gap-2 px-4 py-2 btn-primary !text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <IconMail className="w-4 h-4" />
            {t('new_email') || 'Nouvel email'}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <IconLoader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : scheduledEmails.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/10 flex items-center justify-center">
              <IconCalendar className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold !text-primary mb-2">
              {t('no_scheduled_emails') || 'Aucun email planifié'}
            </h2>
            <p className="text-muted max-w-7xl mx-auto">
              {t('no_scheduled_emails_desc') || 'Vous n\'avez aucun email en attente d\'envoi. Créez un nouvel email et utilisez la planification pour l\'envoyer plus tard.'}
            </p>
            <Link
              href="/dashboard/emails/compose"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 btn-primary text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <IconClock className="w-5 h-5" />
              {t('schedule_email') || 'Planifier un email'}
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted mb-4">
              {scheduledEmails.length} {t('emails_scheduled') || 'email(s) planifié(s)'}
            </div>
            
            <AnimatePresence>
              {scheduledEmails.map((email) => (
                <motion.div
                  key={email.documentId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-card border border-default rounded-xl p-5 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <IconClock className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-primary truncate">
                            {email.subject}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <IconUsers className="w-4 h-4" />
                            <span className="truncate">
                              {Array.isArray(email.recipients) 
                                ? email.recipients.join(', ') 
                                : email.recipients}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {email.scheduled_at && (
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg">
                            <IconCalendar className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-300">
                              {formatDate(email.scheduled_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg">
                            <IconClock className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-300">
                              {formatTime(email.scheduled_at)}
                            </span>
                          </div>
                          <div className="text-muted">
                            Dans {getTimeUntil(email.scheduled_at)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {confirmCancel === email.documentId ? (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg">
                          <span className="text-sm text-red-400">
                            {t('confirm_cancel') || 'Confirmer ?'}
                          </span>
                          <button
                            onClick={() => handleCancelEmail(email.documentId)}
                            disabled={cancellingId === email.documentId}
                            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {cancellingId === email.documentId ? (
                              <IconLoader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <IconTrash className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmCancel(null)}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors"
                          >
                            <IconX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setConfirmCancel(email.documentId)}
                            className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t('cancel_email') || 'Annuler l\'envoi'}
                          >
                            <IconTrash className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              {t('cancel') || 'Annuler'}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <IconAlertTriangle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-300">
            <strong>{t('scheduled_info_title') || 'Comment ça marche ?'}</strong>
            <p className="mt-1 text-purple-300/80">
              {t('scheduled_info_desc') || 'Les emails planifiés sont envoyés automatiquement à la date et l\'heure prévues. Vous pouvez annuler un email planifié à tout moment avant son envoi.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


