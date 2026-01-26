'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconMinus,
  IconMaximize,
  IconMinimize,
  IconChevronDown,
  IconMail,
  IconFileDescription,
  IconFileInvoice,
  IconNews,
} from '@tabler/icons-react';
import CompactEmailForm from './CompactEmailForm';
import { useLanguage } from '@/app/context/LanguageContext';
import type { EmailComposerType } from './EmailComposer';

interface GmailStyleComposerProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: EmailComposerType;
  replyToEmail?: {
    id: number;
    from_email: string;
    from_name?: string;
    subject?: string;
    content_html?: string;
    content_text?: string;
    received_at: string;
  };
}

export default function GmailStyleComposer({
  isOpen,
  onClose,
  initialType = 'compose',
  replyToEmail,
}: GmailStyleComposerProps) {
  const { t } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [emailType, setEmailType] = useState<EmailComposerType>(initialType);

  // Reset type when opening
  useEffect(() => {
    if (isOpen) {
      setEmailType(initialType);
      setIsMinimized(false);
      setIsMaximized(false);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const getTypeIcon = (type: EmailComposerType) => {
    switch (type) {
      case 'quote':
        return <IconFileDescription className="w-4 h-4" />;
      case 'invoice':
        return <IconFileInvoice className="w-4 h-4" />;
      default:
        return <IconMail className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: EmailComposerType) => {
    switch (type) {
      case 'quote':
        return t('send_quote') || 'Envoyer un devis';
      case 'invoice':
        return t('send_invoice') || 'Envoyer une facture';
      default:
        return t('new_message') || 'Nouveau message';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay subtle pour le mode maximisé */}
          {isMaximized && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[99]"
              onClick={() => setIsMaximized(false)}
            />
          )}
          
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-[100] bg-card border border-default shadow-2xl flex flex-col"
            style={{
              bottom: isMaximized ? 0 : 0,
              right: isMaximized ? 0 : '24px',
              top: isMaximized ? 0 : 'auto',
              left: isMaximized ? 0 : 'auto',
              width: isMaximized ? '100vw' : isMinimized ? '320px' : '600px',
              height: isMaximized ? '100vh' : isMinimized ? '56px' : '680px',
              borderRadius: isMaximized ? '0' : '16px 16px 0 0',
            }}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-accent text-white rounded-t-xl flex-shrink-0">
            <div className="flex items-center gap-2">
              {getTypeIcon(emailType)}
              <span className="font-medium text-sm">{getTypeLabel(emailType)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title={isMinimized ? t('maximize') : t('minimize')}
              >
                <IconMinus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title={isMaximized ? t('restore') : t('fullscreen')}
              >
                {isMaximized ? (
                  <IconMinimize className="w-4 h-4" />
                ) : (
                  <IconMaximize className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title={t('close')}
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              <CompactEmailForm
                type={emailType}
                replyToEmail={replyToEmail || undefined}
                onSuccess={() => {
                  onClose();
                }}
              />
            </div>
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
