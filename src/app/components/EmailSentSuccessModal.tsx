'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconMail, IconFileInvoice, IconFileDescription, IconX } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface EmailSentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'invoice' | 'quote' | 'classic' | 'newsletter';
  recipientCount?: number;
  documentReference?: string;
}

export default function EmailSentSuccessModal({
  isOpen,
  onClose,
  type,
  recipientCount = 1,
  documentReference,
}: EmailSentSuccessModalProps) {
  const { t } = useLanguage();

  const getConfig = () => {
    switch (type) {
      case 'invoice':
        return {
          icon: IconFileInvoice,
          title: t('invoice_sent_success') || 'Facture envoyée !',
          description: t('invoice_sent_description') || 'Votre facture a été envoyée avec succès.',
          color: 'amber',
          bgColor: 'bg-amber-500',
          lightBg: 'bg-amber-100 dark:bg-amber-900/30',
          textColor: 'text-amber-500',
        };
      case 'quote':
        return {
          icon: IconFileDescription,
          title: t('quote_sent_success') || 'Devis envoyé !',
          description: t('quote_sent_description') || 'Votre devis a été envoyé avec succès.',
          color: 'violet',
          bgColor: 'bg-violet-500',
          lightBg: 'bg-violet-100 dark:bg-violet-900/30',
          textColor: 'text-violet-500',
        };
      case 'newsletter':
        return {
          icon: IconMail,
          title: t('newsletter_sent_success') || 'Newsletter envoyée !',
          description: t('newsletter_sent_description') || 'Votre newsletter a été envoyée avec succès.',
          color: 'emerald',
          bgColor: 'bg-emerald-500',
          lightBg: 'bg-emerald-100 dark:bg-emerald-900/30',
          textColor: 'text-emerald-500',
        };
      default:
        return {
          icon: IconMail,
          title: t('email_sent_success') || 'Email envoyé !',
          description: t('email_sent_description') || 'Votre email a été envoyé avec succès.',
          color: 'blue',
          bgColor: 'bg-blue-500',
          lightBg: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-500',
        };
    }
  };

  const config = getConfig();

  return (
    <AnimatePresence>
      {isOpen && (
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
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with animation */}
            <div className={`${config.bgColor} p-8 relative overflow-hidden`}>
              {/* Animated circles background */}
              <motion.div
                className="absolute inset-0 opacity-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full" />
              </motion.div>

              {/* Success icon */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', damping: 15 }}
                  >
                    <IconCheck className={`w-10 h-10 ${config.textColor}`} stroke={1} />
                  </motion.div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-white text-center"
                >
                  {config.title}
                </motion.h2>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-secondary mb-4"
              >
                {config.description}
              </motion.p>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`${config.lightBg} rounded-xl p-4 space-y-2`}
              >
                {documentReference && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{t('reference') || 'Référence'}</span>
                    <span className={`font-medium ${config.textColor}`}>{documentReference}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t('recipients_count') || 'Destinataires'}</span>
                  <span className="font-medium text-primary">
                    {recipientCount} {recipientCount > 1 ? (t('people') || 'personnes') : (t('person') || 'personne')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t('sent_at') || 'Envoyé à'}</span>
                  <span className="font-medium text-primary">
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>

              {/* Action button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className={`w-full mt-6 py-3 ${config.bgColor} text-white font-medium rounded-xl hover:opacity-90 transition-opacity`}
              >
                {t('continue') || 'Continuer'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

