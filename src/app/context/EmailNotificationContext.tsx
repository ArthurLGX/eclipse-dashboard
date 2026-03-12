'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { syncInbox, type ReceivedEmail } from '@/lib/api';
import { fetchAutomationActions } from '@/lib/smart-follow-up-api';
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

  // Sync inbox and check for new emails (ONLY from Smart Follow-Up)
  const syncNow = useCallback(async () => {
    // Ne pas faire d'appels API si l'utilisateur n'est pas authentifié
    if (!authenticated || !user?.id || isSyncing) return;
    
    // Ne pas synchroniser si l'URL API n'est pas configurée (évite "Failed to fetch")
    if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_STRAPI_URL) return;
    
    // Ne pas synchroniser si on sait déjà que l'IMAP n'est pas configuré
    if (imapConfigured === false) return;
    
    setIsSyncing(true);
    try {
      // First, sync from IMAP (this processes emails via backend ICP filter)
      await syncInbox();
      
      // Si on arrive ici, l'IMAP est configuré et fonctionne
      if (imapConfigured === null) {
        setImapConfigured(true);
      }
      
      // Fetch ONLY emails that passed ICP filter (automation-actions with status 'pending')
      const actions = await fetchAutomationActions('pending');
      
      // Count pending actions as unread count
      setUnreadCount(actions?.length || 0);
      
      // Check for new actions (we haven't notified about)
      if (actions && actions.length > 0) {
        for (const action of actions) {
          // Convertir l'automation-action en format ReceivedEmail pour réutiliser le système de notification
          const email: ReceivedEmail = {
            id: action.id,
            documentId: action.documentId,
            from_email: action.client?.email || '',
            from_name: action.client?.name || '',
            subject: action.proposed_content?.subject || 'Sans objet',
            content_text: action.proposed_content?.body || '',
            content_html: action.proposed_content?.body || '',
            received_at: action.createdAt,
            is_read: false,
            is_starred: false,
            is_archived: false,
            has_attachments: false,
            createdAt: action.createdAt,
            updatedAt: action.updatedAt,
          };
          
          // Only show notification for actions created in the last 30 minutes
          const actionDate = new Date(action.createdAt).getTime();
          const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
          
          if (actionDate > thirtyMinutesAgo && !knownEmailIdsRef.current.has(action.id)) {
            addNotification(email);
          } else {
            // Mark as known without showing notification
            knownEmailIdsRef.current.add(action.id);
          }
        }
      }
      
      lastSyncRef.current = Date.now();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Erreur de configuration IMAP manquante
      const isImapNotConfigured = errorMessage.includes('No SMTP/IMAP configuration') || 
                                   errorMessage.includes('IMAP configuration not found') ||
                                   errorMessage.includes('400');
      
      // Erreur réseau (CORS, API indisponible, URL invalide)
      const isNetworkError = errorMessage.includes('Failed to fetch') || 
                             errorMessage.includes('NetworkError') ||
                             errorMessage.includes('Load failed');
      
      if (isImapNotConfigured) {
        setImapConfigured(false);
        if (!imapErrorLoggedRef.current) {
          console.info('ℹ️ Configuration IMAP non trouvée - Synchronisation automatique désactivée.');
          imapErrorLoggedRef.current = true;
        }
      } else if (isNetworkError) {
        // Ne pas spammer la console pour les erreurs réseau récurrentes
        if (!imapErrorLoggedRef.current) {
          console.warn('Email sync: erreur réseau (API indisponible ou CORS). La synchro réessaiera plus tard.');
          imapErrorLoggedRef.current = true;
        }
      } else {
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

