'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconFileDescription,
  IconClock,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconChevronRight,
  IconMail,
  IconLoader2,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { updateFactureById } from '@/lib/api';
import type { Facture, Client } from '@/types';

interface PendingQuotesWidgetProps {
  quotes: Facture[];
  onQuoteUpdated?: () => void;
}

export default function PendingQuotesWidget({ quotes, onQuoteUpdated }: PendingQuotesWidgetProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [showConversionModal, setShowConversionModal] = useState<Facture | null>(null);

  // Filtrer les devis envoyés sans réponse (statut 'sent')
  const pendingQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.document_type === 'quote' && 
      (q.quote_status === 'sent' || q.quote_status === 'draft')
    ).sort((a, b) => {
      // Trier par date d'envoi, les plus anciens en premier
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  }, [quotes]);

  // Calculer le nombre de jours depuis l'envoi
  const getDaysSinceSent = (quote: Facture): number => {
    const sentDate = new Date(quote.updatedAt || quote.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - sentDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Mettre à jour le statut d'un devis
  const handleUpdateStatus = async (quote: Facture, status: 'accepted' | 'rejected') => {
    if (!quote.documentId) return;
    
    setUpdatingQuoteId(quote.documentId);
    
    try {
      await updateFactureById(quote.documentId, {
        quote_status: status,
      });
      
      if (status === 'accepted') {
        // Ouvrir la modale de conversion en projet
        setShowConversionModal(quote);
      }
      
      onQuoteUpdated?.();
    } catch (error) {
      console.error('Error updating quote status:', error);
    } finally {
      setUpdatingQuoteId(null);
    }
  };

  // Relancer le client par email
  const handleFollowUp = (quote: Facture) => {
    router.push(`/dashboard/emails/quote?quoteId=${quote.documentId}`);
  };

  // Ne pas afficher si aucun devis en attente
  if (pendingQuotes.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-default rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-default bg-gradient-to-r from-violet-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                <IconFileDescription className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">
                  {t('pending_quotes_widget_title') || 'Devis en attente de réponse'}
                </h3>
                <p className="text-sm text-muted">
                  {pendingQuotes.length} {pendingQuotes.length > 1 ? (t('quotes_plural') || 'devis') : (t('quote_singular') || 'devis')} {t('awaiting_response') || 'en attente'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/factures?type=quote')}
              className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1"
            >
              {t('view_all') || 'Voir tout'}
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liste des devis */}
        <div className="divide-y divide-default max-h-[400px] overflow-y-auto">
          {pendingQuotes.slice(0, 5).map((quote) => {
            const daysSince = getDaysSinceSent(quote);
            const isUrgent = daysSince >= 7;
            const clientData = quote.client || quote.client_id;
            const clientName = clientData && typeof clientData === 'object' 
              ? (clientData as Client).name 
              : 'Client';
            const isUpdating = updatingQuoteId === quote.documentId;

            return (
              <div
                key={quote.documentId}
                className={`p-4 hover:bg-hover transition-colors ${isUrgent ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Infos du devis */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-primary truncate">
                        {quote.reference}
                      </span>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          <IconAlertTriangle className="w-3 h-3" />
                          {t('urgent') || 'Urgent'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted">
                      <span>{clientName}</span>
                      <span>•</span>
                      <span className="font-medium text-violet-500">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: quote.currency || 'EUR' })
                          .format(quote.number || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted mt-1">
                      <IconClock className="w-3 h-3" />
                      {t('sent_days_ago', { days: daysSince }) || `Envoyé il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isUpdating ? (
                      <IconLoader2 className="w-5 h-5 text-muted animate-spin" />
                    ) : (
                      <>
                        {/* Bouton Relancer */}
                        <button
                          onClick={() => handleFollowUp(quote)}
                          className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title={t('follow_up') || 'Relancer'}
                        >
                          <IconMail className="w-4 h-4" />
                        </button>

                        {/* Bouton Accepté */}
                        <button
                          onClick={() => handleUpdateStatus(quote, 'accepted')}
                          className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title={t('mark_accepted') || 'Marquer comme accepté'}
                        >
                          <IconCheck className="w-4 h-4" />
                        </button>

                        {/* Bouton Refusé */}
                        <button
                          onClick={() => handleUpdateStatus(quote, 'rejected')}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('mark_rejected') || 'Marquer comme refusé'}
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer si plus de 5 devis */}
        {pendingQuotes.length > 5 && (
          <div className="px-6 py-3 border-t border-default bg-hover/50 text-center">
            <button
              onClick={() => router.push('/dashboard/factures?type=quote')}
              className="text-sm text-violet-500 hover:text-violet-600"
            >
              {t('and_more_quotes', { count: pendingQuotes.length - 5 }) || `+ ${pendingQuotes.length - 5} autres devis`}
            </button>
          </div>
        )}
      </motion.div>

      {/* Modale de conversion devis accepté → projet */}
      <AnimatePresence>
        {showConversionModal && (
          <QuoteAcceptedModal
            quote={showConversionModal}
            onClose={() => setShowConversionModal(null)}
            onCreateProject={() => {
              // TODO: Implémenter la création de projet
              router.push(`/dashboard/projects?createFrom=quote&quoteId=${showConversionModal.documentId}`);
              setShowConversionModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Modale affichée quand un devis est accepté
interface QuoteAcceptedModalProps {
  quote: Facture;
  onClose: () => void;
  onCreateProject: () => void;
}

function QuoteAcceptedModal({ quote, onClose, onCreateProject }: QuoteAcceptedModalProps) {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <IconCheck className="w-8 h-8 text-green-500" stroke={2.5} />
          </div>
          <h2 className="text-xl font-bold text-white">
            {t('quote_accepted_title') || 'Devis accepté !'}
          </h2>
          <p className="text-white/80 text-sm mt-1">
            {quote.reference}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-center text-secondary">
            {t('quote_accepted_description') || 'Félicitations ! Que souhaitez-vous faire maintenant ?'}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onCreateProject}
              className="w-full py-3 px-4 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"
            >
              <IconFileDescription className="w-5 h-5" />
              {t('create_project_from_quote') || 'Créer le projet automatiquement'}
            </button>

            <button
              onClick={() => {
                router.push(`/dashboard/emails/invoice?createFrom=quote&quoteId=${quote.documentId}`);
                onClose();
              }}
              className="w-full py-3 px-4 border border-default text-secondary rounded-xl hover:bg-hover transition-colors flex items-center justify-center gap-2"
            >
              <IconMail className="w-5 h-5" />
              {t('send_deposit_invoice') || 'Envoyer une facture d\'acompte'}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-muted hover:text-primary transition-colors"
            >
              {t('later') || 'Plus tard'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

