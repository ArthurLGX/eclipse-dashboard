'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconBell,
  IconCheck,
  IconX,
  IconCheckbox,
  IconTrash,
  IconAlertTriangle,
  IconClock,
  IconArrowRight,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useQuota, QuotaNotification } from '@/app/context/QuotaContext';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  acceptInvitation,
  rejectInvitation,
} from '@/lib/api';
import type { Notification } from '@/types';

export default function NotificationBell() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { preferences } = usePreferences();
  const { notifications: quotaNotifications } = useQuota();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dismissedQuotaAlerts, setDismissedQuotaAlerts] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Alertes de quota visibles
  const visibleQuotaAlerts = useMemo(() => {
    return quotaNotifications.filter(n => !dismissedQuotaAlerts.includes(n.id));
  }, [quotaNotifications, dismissedQuotaAlerts]);

  const handleDismissQuotaAlert = (id: string) => {
    setDismissedQuotaAlerts(prev => [...prev, id]);
  };

  const handleUpgrade = () => {
    setIsOpen(false);
    router.push('/dashboard/profile/your-subscription');
  };

  // Filtrer les notifications selon les préférences utilisateur
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // Filtrer selon le type de notification et les préférences
      if (notif.type === 'project_invitation') {
        return preferences.notifications.emailCollaboration;
      }
      // Les autres types (project_update, system) sont toujours affichés
      return true;
    });
  }, [notifications, preferences.notifications]);

  // Charger les notifications au montage et toutes les 30 secondes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUnreadCount();

      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await fetchNotifications(user.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notifs = (response as any).data || [];
      setNotifications(notifs);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const count = await fetchUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await markNotificationAsRead(notification.documentId);
      setNotifications(prev =>
        prev.map(n =>
          n.documentId === notification.documentId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showGlobalPopup(t('all_marked_read') || 'Toutes les notifications ont été marquées comme lues', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationDocumentId: string) => {
    try {
      await deleteNotification(notificationDocumentId);
      setNotifications(prev => prev.filter(n => n.documentId !== notificationDocumentId));
      showGlobalPopup(t('notification_deleted') || 'Notification supprimée', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    if (!user?.id || !notification.data?.invitation_id) return;
    
    try {
      await acceptInvitation(notification.data.invitation_id, user.id);
      await handleMarkAsRead(notification);
      showGlobalPopup(
        t('invitation_accepted') || 'Invitation acceptée ! Le projet a été ajouté à votre liste.',
        'success'
      );
      
      // Naviguer vers le projet
      if (notification.data.project_id) {
        router.push(`/dashboard/projects`);
      }
      
      loadNotifications();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    if (!notification.data?.invitation_id) return;
    
    try {
      await rejectInvitation(notification.data.invitation_id);
      await handleMarkAsRead(notification);
      showGlobalPopup(t('invitation_rejected') || 'Invitation refusée', 'success');
      loadNotifications();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    // Pour les invitations de projet, afficher la photo de profil de l'expéditeur
    if (notification.type === 'project_invitation' && notification.data?.sender_profile_picture) {
      return (
        <Image
          src={notification.data.sender_profile_picture}
          alt={notification.data.sender_name || 'User'}
          width={20}
          height={20}
          className="w-5 h-5 rounded-full object-cover"
        />
      );
    }
    
    // Fallback: initiales de l'expéditeur ou icône par défaut
    if (notification.type === 'project_invitation' && notification.data?.sender_name) {
      const initials = notification.data.sender_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return (
        <span className="text-xs font-bold text-accent">
          {initials}
        </span>
      );
    }
    
    return <IconBell className="w-5 h-5 text-info" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('just_now') || 'À l\'instant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <>
      {/* Bell Button - Fixed en haut à droite (desktop only) */}
      <div ref={dropdownRef} className="hidden lg:block fixed top-5 right-5 z-[1002]">
        <button
          onClick={handleToggle}
          className="relative p-3 rounded-xl bg-card backdrop-blur-sm border border-default hover:bg-hover text-muted hover:text-primary transition-all shadow-theme-lg"
        >
          <IconBell className="w-5 h-5" />
          
          {/* Badge */}
          {(unreadCount + visibleQuotaAlerts.length) > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
            >
              {(unreadCount + visibleQuotaAlerts.length) > 99 ? '99+' : (unreadCount + visibleQuotaAlerts.length)}
            </motion.span>
          )}
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-card border border-default rounded-xl shadow-2xl overflow-hidden"
            >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-default">
              <h3 className="text-sm font-semibold text-primary">
                {t('notifications') || 'Notifications'}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-accent hover:text-accent-light flex items-center gap-1"
                >
                  <IconCheckbox className="w-3 h-3" />
                  {t('mark_all_read') || 'Tout marquer comme lu'}
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {/* Alertes de quota */}
              {visibleQuotaAlerts.length > 0 && (
                <div >
                  {visibleQuotaAlerts.map((alert: QuotaNotification) => (
                    <div
                      key={alert.id}
                      className={`p-4 ${
                        alert.type === 'quota_exceeded' || alert.type === 'trial_expired'
                          ? 'bg-danger-light border-l-4 border-l-danger'
                          : 'bg-warning-light border-l-4 border-l-warning'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
                          {alert.type === 'quota_exceeded' || alert.type === 'trial_expired' ? (
                            <IconAlertTriangle className="w-5 h-5 text-danger" />
                          ) : (
                            <IconClock className="w-5 h-5 text-warning" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            alert.type === 'quota_exceeded' || alert.type === 'trial_expired'
                              ? 'text-danger'
                              : 'text-warning'
                          }`}>
                            {alert.message}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleUpgrade}
                              className="btn-primary py-1 px-3 text-xs font-medium rounded-lg flex items-center gap-1"
                            >
                              {t('upgrade') || 'Mettre à niveau'}
                              <IconArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDismissQuotaAlert(alert.id)}
                              className="btn-ghost py-1 px-2 text-xs"
                            >
                              <IconX className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent-light border-t-accent rounded-full animate-spin" />
                </div>
              ) : filteredNotifications.length === 0 && visibleQuotaAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <IconBell className="w-12 h-12 text-muted mb-3" />
                  <p className="text-muted text-sm text-center">
                    {t('no_notifications') || 'Aucune notification'}
                  </p>
                </div>
              ) : filteredNotifications.length > 0 && (
                <div >
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.documentId}
                      className={`p-4 hover:bg-hover transition-colors ${
                        !notification.read ? 'bg-accent-light' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {getNotificationIcon(notification)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-primary">
                              {notification.title}
                            </p>
                            <span className="text-xs text-muted whitespace-nowrap">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-secondary mt-1 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Actions pour les invitations */}
                          {notification.type === 'project_invitation' && !notification.read && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleAcceptInvitation(notification)}
                                className="btn-primary flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <IconCheck className="w-4 h-4" />
                                {t('accept') || 'Accepter'}
                              </button>
                              <button
                                onClick={() => handleRejectInvitation(notification)}
                                className="btn-ghost flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <IconX className="w-4 h-4" />
                                {t('reject') || 'Refuser'}
                              </button>
                            </div>
                          )}

                          {/* Actions générales */}
                          {notification.read && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleDelete(notification.documentId)}
                                className="text-xs text-muted hover:text-danger flex items-center gap-1"
                              >
                                <IconTrash className="w-3 h-3" />
                                {t('delete') || 'Supprimer'}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Indicateur non lu */}
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-default bg-muted">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/dashboard/notifications');
                  }}
                  className="w-full py-2 text-sm text-secondary hover:text-primary text-center transition-colors"
                >
                  {t('view_all_notifications') || 'Voir toutes les notifications'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
