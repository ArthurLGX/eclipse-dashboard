'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconMail,
   IconX,
  IconClock,
  IconSend,
  IconUser,
  IconBuilding,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { markEmailAsRead, archiveEmail, type ReceivedEmail } from '@/lib/api';

interface EmailNotification {
  id: string;
  email: ReceivedEmail;
  timestamp: number;
}

interface EmailReplyNotificationProps {
  notifications: EmailNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export default function EmailReplyNotification({
  notifications,
  onDismiss,
  onDismissAll,
}: EmailReplyNotificationProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get sender name
  const getSenderName = (email: ReceivedEmail): string => {
    if (email.client) {
      if (email.client.first_name && email.client.last_name) {
        return `${email.client.first_name} ${email.client.last_name}`;
      }
      if (email.client.enterprise) {
        return email.client.enterprise;
      }
    }
    return email.from_name || email.from_email.split('@')[0];
  };

  // Handle "Yes" - Reply now
  const handleReplyNow = async (notification: EmailNotification) => {
    setProcessingId(notification.id);
    try {
      // Mark as read
      await markEmailAsRead(notification.email.id);
      
      // Navigate to compose with pre-filled reply and original email data
      const replySubject = notification.email.subject?.startsWith('Re:') 
        ? notification.email.subject 
        : `Re: ${notification.email.subject || ''}`;
      
      const senderName = getSenderName(notification.email);
      const params = new URLSearchParams({
        to: notification.email.from_email,
        subject: replySubject,
        replyTo: 'true',
        replyToName: senderName,
        replyToEmail: notification.email.from_email,
        replyToSubject: notification.email.subject || '(Sans objet)',
        replyToSnippet: notification.email.snippet || '',
        replyToDate: notification.email.received_at,
      });
      
      if (notification.email.client?.enterprise) {
        params.set('replyToEnterprise', notification.email.client.enterprise);
      }
      
      router.push(`/dashboard/emails/compose?${params.toString()}`);
      
      onDismiss(notification.id);
    } catch (error) {
      console.error('Error handling reply:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle "No" - Archive
  const handleArchive = async (notification: EmailNotification) => {
    setProcessingId(notification.id);
    try {
      await markEmailAsRead(notification.email.id);
      await archiveEmail(notification.email.id);
      onDismiss(notification.id);
    } catch (error) {
      console.error('Error archiving:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle "Later" - Just dismiss notification
  const handleLater = (notification: EmailNotification) => {
    onDismiss(notification.id);
  };

  // Handle click on notification body - go to inbox
  const handleViewEmail = async (notification: EmailNotification) => {
    try {
      await markEmailAsRead(notification.email.id);
      router.push(`/dashboard/emails/inbox`);
      onDismiss(notification.id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.slice(0, 3).map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-xl shadow-2xl border border-muted overflow-hidden"
          >
            {/* Header */}
            <div 
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-secondary transition-colors"
              onClick={() => handleViewEmail(notification)}
            >
              <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                {notification.email.client?.enterprise ? (
                  <IconBuilding className="w-5 h-5 text-accent" />
                ) : (
                  <IconUser className="w-5 h-5 text-accent" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-accent" />
                  <span className="!text-xs text-accent font-medium">
                    {t('new_reply') || 'Nouvelle réponse'}
                  </span>
                </div>
                <p className="font-semibold text-primary truncate">
                  {getSenderName(notification.email)}
                </p>
                <p className="text-sm text-muted truncate">
                  {notification.email.subject || '(Sans objet)'}
                </p>
                <p className="!text-xs text-muted mt-1 line-clamp-2">
                  {notification.email.snippet || ''}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex border-t border-muted">
              <button
                onClick={() => handleReplyNow(notification)}
                disabled={processingId === notification.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                <IconSend className="w-4 h-4" />
                {t('reply_yes') || 'Oui'}
              </button>
              
              <button
                onClick={() => handleArchive(notification)}
                disabled={processingId === notification.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted hover:text-danger hover:bg-danger-light border-l border-muted transition-colors disabled:opacity-50"
              >
                <IconX className="w-4 h-4" />
                {t('reply_no') || 'Non'}
              </button>
              
              <button
                onClick={() => handleLater(notification)}
                disabled={processingId === notification.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted hover:text-primary hover:bg-secondary border-l border-muted transition-colors disabled:opacity-50"
              >
                <IconClock className="w-4 h-4" />
                {t('reply_later') || 'Plus tard'}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Dismiss all button if multiple notifications */}
      {notifications.length > 1 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onDismissAll}
          className="!text-xs text-muted hover:text-primary text-center py-2"
        >
          {t('dismiss_all') || 'Tout fermer'} ({notifications.length})
        </motion.button>
      )}
    </div>
  );
}

