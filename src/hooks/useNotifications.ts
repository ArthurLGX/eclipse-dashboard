'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/lib/api';
import type { Notification } from '@/types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationDocumentId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (notificationDocumentId: string) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [notifResponse, countResponse] = await Promise.all([
        fetchNotifications(user.id).catch(() => ({ data: [] })),
        fetchUnreadNotificationCount(user.id).catch(() => 0),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notifData = (notifResponse as any).data || [];
      setNotifications(notifData);
      setUnreadCount(typeof countResponse === 'number' ? countResponse : 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Erreur lors du chargement des notifications');
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Charger au montage et à chaque changement de user
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Polling toutes les 30 secondes
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id, loadNotifications]);

  const markAsRead = useCallback(async (notificationDocumentId: string) => {
    try {
      await markNotificationAsRead(notificationDocumentId);
      setNotifications(prev =>
        prev.map(n =>
          n.documentId === notificationDocumentId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  }, [user?.id]);

  const remove = useCallback(async (notificationDocumentId: string) => {
    try {
      await deleteNotification(notificationDocumentId);
      const removedNotif = notifications.find(n => n.documentId === notificationDocumentId);
      setNotifications(prev => prev.filter(n => n.documentId !== notificationDocumentId));
      if (removedNotif && !removedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    remove,
  };
}

