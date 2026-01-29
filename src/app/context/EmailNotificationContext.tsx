'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchInbox, syncInbox, type ReceivedEmail } from '@/lib/api';
import EmailReplyNotification from '@/app/components/EmailReplyNotification';

interface EmailNotification {
  id: string;
  email: ReceivedEmail;
  timestamp: number;
}

interface EmailNotificationContextValue {
  notifications: EmailNotification[];
  unreadCount: number;
  addNotification: (email: ReceivedEmail) => void;
  dismissNotification: (id: string) => void;
  dismissAllNotifications: () => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

const EmailNotificationContext = createContext<EmailNotificationContextValue | null>(null);

// Check interval: 5 minutes
const SYNC_INTERVAL = 5 * 60 * 1000;

export function EmailNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated } = useAuth();
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [imapConfigured, setImapConfigured] = useState<boolean | null>(null); // null = pas encore vérifié, false = pas configuré, true = configuré
  const lastSyncRef = useRef<number>(0);
  const knownEmailIdsRef = useRef<Set<number>>(new Set());
  const imapErrorLoggedRef = useRef<boolean>(false); // Pour ne logger l'erreur qu'une seule fois

  // Add a notification
  const addNotification = useCallback((email: ReceivedEmail) => {
    // Don't add if already exists
    if (knownEmailIdsRef.current.has(email.id)) return;
    
    knownEmailIdsRef.current.add(email.id);
    
    const notification: EmailNotification = {
      id: `email-${email.id}-${Date.now()}`,
      email,
      timestamp: Date.now(),
    };
    
    setNotifications(prev => [notification, ...prev].slice(0, 10)); // Max 10 notifications
  }, []);

  // Dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Dismiss all notifications
  const dismissAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Sync inbox and check for new emails
  const syncNow = useCallback(async () => {
    // Ne pas faire d'appels API si l'utilisateur n'est pas authentifié
    if (!authenticated || !user?.id || isSyncing) return;
    
    // Ne pas synchroniser si on sait déjà que l'IMAP n'est pas configuré
    if (imapConfigured === false) return;
    
    setIsSyncing(true);
    try {
      // First, sync from IMAP
      await syncInbox();
      
      // Si on arrive ici, l'IMAP est configuré et fonctionne
      if (imapConfigured === null) {
        setImapConfigured(true);
      }
      
      // Then fetch recent unread emails
      const response = await fetchInbox({
        isRead: false,
        isArchived: false,
        pageSize: 10,
      });
      
      setUnreadCount(response.meta?.unreadCount || 0);
      
      // Check for new emails (emails we haven't seen before)
      if (response.data) {
        for (const email of response.data) {
          // Only show notification for emails received in the last 30 minutes
          const emailDate = new Date(email.received_at).getTime();
          const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
          
          if (emailDate > thirtyMinutesAgo && !knownEmailIdsRef.current.has(email.id)) {
            addNotification(email);
          } else {
            // Mark as known without showing notification
            knownEmailIdsRef.current.add(email.id);
          }
        }
      }
      
      lastSyncRef.current = Date.now();
    } catch (error: unknown) {
      // Vérifier si c'est une erreur de configuration IMAP manquante
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isImapNotConfigured = errorMessage.includes('No SMTP/IMAP configuration') || 
                                   errorMessage.includes('IMAP configuration not found') ||
                                   errorMessage.includes('400');
      
      if (isImapNotConfigured) {
        // Marquer l'IMAP comme non configuré pour arrêter les tentatives
        setImapConfigured(false);
        
        // Ne logger qu'une seule fois
        if (!imapErrorLoggedRef.current) {
          console.info('ℹ️ Configuration IMAP non trouvée - Synchronisation automatique désactivée. Configurez votre IMAP dans les paramètres pour activer la réception automatique d\'emails.');
          imapErrorLoggedRef.current = true;
        }
      } else {
        // Autre type d'erreur, logger normalement
        console.error('Email sync error:', error);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [authenticated, user?.id, isSyncing, imapConfigured, addNotification]);

  // Initial sync and periodic sync
  useEffect(() => {
    // Ne synchroniser que si l'utilisateur est authentifié
    if (!authenticated || !user?.id) return;

    // Initial sync after a short delay
    const initialTimeout = setTimeout(() => {
      syncNow();
    }, 3000);

    // Periodic sync
    const interval = setInterval(() => {
      syncNow();
    }, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [authenticated, user?.id, syncNow]);

  // Auto-dismiss old notifications after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const thirtySecondsAgo = Date.now() - 30000;
      setNotifications(prev => prev.filter(n => n.timestamp > thirtySecondsAgo));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const value: EmailNotificationContextValue = {
    notifications,
    unreadCount,
    addNotification,
    dismissNotification,
    dismissAllNotifications,
    syncNow,
    isSyncing,
  };

  return (
    <EmailNotificationContext.Provider value={value}>
      {children}
      <EmailReplyNotification
        notifications={notifications}
        onDismiss={dismissNotification}
        onDismissAll={dismissAllNotifications}
      />
    </EmailNotificationContext.Provider>
  );
}

export function useEmailNotifications() {
  const context = useContext(EmailNotificationContext);
  if (!context) {
    throw new Error('useEmailNotifications must be used within EmailNotificationProvider');
  }
  return context;
}

// Optional hook that doesn't throw if context is missing
export function useEmailNotificationsOptional() {
  return useContext(EmailNotificationContext);
}

