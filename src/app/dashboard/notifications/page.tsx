'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconBell,
  IconBellOff,
  IconCheck,
  IconCheckbox,
  IconTrash,
  IconFilter,
  IconX,
  IconInbox,
  IconUsers,
  IconRefresh,
  IconChevronDown,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  acceptInvitation,
  rejectInvitation,
  approveCollaborationRequest,
  rejectCollaborationRequest,
} from '@/lib/api';
import type { Notification } from '@/types';
import { useQuota, QuotaNotification } from '@/app/context/QuotaContext';
import { IconAlertTriangle, IconClock, IconArrowRight } from '@tabler/icons-react';

type FilterType = 'all' | 'unread' | 'read';
type NotificationTypeFilter = 'all' | 'project_invitation' | 'project_update' | 'collaboration_request' | 'system';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  const { notifications: quotaNotifications } = useQuota();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedQuotaAlerts, setDismissedQuotaAlerts] = useState<string[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [filterType, setFilterType] = useState<NotificationTypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Charger les notifications
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  // Alertes de quota visibles
  const visibleQuotaAlerts = useMemo(() => {
    return quotaNotifications.filter(n => !dismissedQuotaAlerts.includes(n.id));
  }, [quotaNotifications, dismissedQuotaAlerts]);

  const handleDismissQuotaAlert = (id: string) => {
    setDismissedQuotaAlerts(prev => [...prev, id]);
  };

  const handleUpgrade = () => {
    router.push('/dashboard/profile/your-subscription');
  };

  // Statistiques
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const invitations = notifications.filter(n => n.type === 'project_invitation').length;
    const quotaAlerts = visibleQuotaAlerts.length;
    return { total, unread, invitations, quotaAlerts };
  }, [notifications, visibleQuotaAlerts]);

  // Filtrer les notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Filtre par statut lu/non lu
      if (filterStatus === 'unread' && notification.read) return false;
      if (filterStatus === 'read' && !notification.read) return false;
      
      // Filtre par type
      if (filterType !== 'all' && notification.type !== filterType) return false;
      
      return true;
    });
  }, [notifications, filterStatus, filterType]);

  // Grouper les notifications par date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    filteredNotifications.forEach(notification => {
      const notifDate = new Date(notification.createdAt);
      notifDate.setHours(0, 0, 0, 0);

      let groupKey: string;
      if (notifDate.getTime() === today.getTime()) {
        groupKey = t('today') || 'Aujourd\'hui';
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groupKey = t('yesterday') || 'Hier';
      } else if (notifDate >= weekAgo) {
        groupKey = t('this_week') || 'Cette semaine';
      } else {
        groupKey = t('older') || 'Plus ancien';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications, t]);

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await markNotificationAsRead(notification.documentId);
      setNotifications(prev =>
        prev.map(n =>
          n.documentId === notification.documentId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showGlobalPopup(t('all_marked_read') || 'Toutes les notifications ont été marquées comme lues', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    for (const docId of selectedNotifications) {
      const notification = notifications.find(n => n.documentId === docId);
      if (notification && !notification.read) {
        await handleMarkAsRead(notification);
      }
    }
    setSelectedNotifications(new Set());
    showGlobalPopup(t('selected_marked_read') || 'Notifications sélectionnées marquées comme lues', 'success');
  };

  const handleDelete = async (notificationDocumentId: string) => {
    try {
      await deleteNotification(notificationDocumentId);
      setNotifications(prev => prev.filter(n => n.documentId !== notificationDocumentId));
      setSelectedNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationDocumentId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteSelected = async () => {
    for (const docId of selectedNotifications) {
      await handleDelete(docId);
    }
    setSelectedNotifications(new Set());
    showGlobalPopup(t('selected_deleted') || 'Notifications supprimées', 'success');
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

  const handleApproveCollaborationRequest = async (notification: Notification) => {
    if (!user?.id || !notification.data?.collaboration_request_id) return;
    
    try {
      await approveCollaborationRequest(notification.data.collaboration_request_id, user.id);
      await handleMarkAsRead(notification);
      showGlobalPopup(
        t('collaboration_approved') || 'Demande de collaboration approuvée !',
        'success'
      );
      loadNotifications();
    } catch (error) {
      console.error('Error approving collaboration request:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleRejectCollaborationRequest = async (notification: Notification) => {
    if (!user?.id || !notification.data?.collaboration_request_id) return;
    
    try {
      await rejectCollaborationRequest(notification.data.collaboration_request_id, user.id);
      await handleMarkAsRead(notification);
      showGlobalPopup(t('collaboration_rejected') || 'Demande de collaboration refusée', 'success');
      loadNotifications();
    } catch (error) {
      console.error('Error rejecting collaboration request:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const toggleSelectNotification = (docId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.documentId)));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'project_invitation' && notification.data?.sender_profile_picture) {
      return (
        <Image
          src={notification.data.sender_profile_picture}
          alt={notification.data.sender_name || 'User'}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover "
        />
      );
    }
    
    if (notification.type === 'project_invitation' && notification.data?.sender_name) {
      const initials = notification.data.sender_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return (
        <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
          <span className="text-sm font-boldtext-accent">{initials}</span>
        </div>
      );
    }

    if (notification.type === 'project_invitation') {
      return (
        <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
          <IconUsers className="w-5 h-5 !text-accent" />
        </div>
      );
    }

    if (notification.type === 'collaboration_request') {
      if (notification.data?.sender_name) {
        const initials = notification.data.sender_name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="w-10 h-10 rounded-full bg-warning-light flex items-center justify-center">
            <span className="text-sm font-bold text-warning">{initials}</span>
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-full bg-warning-light flex items-center justify-center">
          <IconUsers className="w-5 h-5 text-warning" />
        </div>
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-info-light flex items-center justify-center">
        <IconBell className="w-5 h-5 text-info" />
      </div>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project_invitation':
        return t('invitation') || 'Invitation';
      case 'project_update':
        return t('update') || 'Mise à jour';
      case 'collaboration_request':
        return t('collaboration_request_label') || 'Demande de collaboration';
      case 'system':
        return t('system') || 'Système';
      default:
        return type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {/* Alertes de quota */}
      {visibleQuotaAlerts.length > 0 && (
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {visibleQuotaAlerts.map((alert: QuotaNotification) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`card p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                  alert.type === 'quota_exceeded' || alert.type === 'trial_expired'
                    ? 'border-danger bg-danger-light' 
                    : 'border-warning bg-warning-light'
                }`}
              >
                <div className="flex items-center gap-3">
                  {alert.type === 'quota_exceeded' || alert.type === 'trial_expired' ? (
                    <IconAlertTriangle className="text-danger flex-shrink-0" size={24} />
                  ) : (
                    <IconClock className="text-warning-text flex-shrink-0" size={24} />
                  )}
                  <div>
                    <p className={`font-medium ${
                      alert.type === 'quota_exceeded' || alert.type === 'trial_expired'
                        ? 'text-danger' 
                        : 'text-warning'
                    }`}>
                      {alert.message}
                    </p>
                    {alert.type !== 'trial_ending' && (
                      <p className="text-secondary text-sm mt-1">
                        {t('upgrade_to_unlock') || 'Passez à un plan supérieur pour débloquer.'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleUpgrade}
                    className="btn-primary px-4 py-2 flex items-center gap-2 text-sm"
                  >
                    {t('upgrade') || 'Mettre à niveau'}
                    <IconArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => handleDismissQuotaAlert(alert.id)}
                    className="btn-ghost p-2"
                    title={t('dismiss') || 'Fermer'}
                  >
                    <IconX size={18} className="text-muted" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              {t('notifications') || 'Notifications'}
            </h1>
            <p className="text-primary">
              {t('notifications_description') || 'Gérez vos notifications et invitations'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadNotifications}
              className="btn-ghost p-2"
              title={t('refresh') || 'Actualiser'}
            >
              <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="btn-secondary px-4 py-2"
              >
                <IconCheckbox className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t('mark_all_read') || 'Tout marquer comme lu'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${stats.quotaAlerts > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info">
              <IconBell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-secondary">{t('total') || 'Total'}</p>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning">
              <IconBellOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-secondary">{t('unread') || 'Non lues'}</p>
              <p className="text-2xl font-bold text-primary">{stats.unread}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <IconUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-secondary">{t('invitations') || 'Invitations'}</p>
              <p className="text-2xl font-bold text-primary">{stats.invitations}</p>
            </div>
          </div>
        </motion.div>

        {stats.quotaAlerts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger">
                <IconAlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{t('alerts') || 'Alertes'}</p>
                <p className="text-2xl font-bold text-danger">{stats.quotaAlerts}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-accent-light border-accent !text-accent' 
                : 'btn-ghost border-default'
            }`}
          >
            <IconFilter className="w-4 h-4" />
            <span className="text-sm">{t('filters') || 'Filtres'}</span>
            <IconChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Filtres de statut rapides */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            {(['all', 'unread', 'read'] as FilterType[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-accent text-white'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {status === 'all' && (t('all') || 'Toutes')}
                {status === 'unread' && (t('unread') || 'Non lues')}
                {status === 'read' && (t('read') || 'Lues')}
              </button>
            ))}
          </div>
        </div>

        {/* Actions sur la sélection */}
        {selectedNotifications.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <span className="text-sm text-secondary">
              {selectedNotifications.size} {t('selected') || 'sélectionnée(s)'}
            </span>
            <button
              onClick={handleMarkSelectedAsRead}
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              <IconCheck className="w-4 h-4" />
              {t('mark_read') || 'Marquer lu'}
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-danger-light text-danger hover:opacity-80 text-sm transition-colors"
            >
              <IconTrash className="w-4 h-4" />
              {t('delete') || 'Supprimer'}
            </button>
          </motion.div>
        )}
      </div>

      {/* Filtres avancés */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="card p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('notification_type') || 'Type de notification'}
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as NotificationTypeFilter)}
                    className="input px-3 py-2 text-sm"
                  >
                    <option value="all">{t('all_types') || 'Tous les types'}</option>
                    <option value="project_invitation">{t('invitations') || 'Invitations'}</option>
                    <option value="collaboration_request">{t('collaboration_requests') || 'Demandes de collaboration'}</option>
                    <option value="project_update">{t('updates') || 'Mises à jour'}</option>
                    <option value="system">{t('system') || 'Système'}</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des notifications */}
      <div className="card overflow-hidden">
        {/* Header de la liste */}
        <div className="flex items-center justify-between p-4 border-b border-default">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0
                  ? 'bg-accent border-accent'
                  : 'border-muted hover:border-secondary'
              }`}
            >
              {selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0 && (
                <IconCheck className="w-3 h-3 text-white" />
              )}
            </button>
            <span className="text-sm text-secondary">
              {filteredNotifications.length} {t('notifications') || 'notification(s)'}
            </span>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent-light border-t-accent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <IconInbox className="w-16 h-16 text-muted mb-4" />
            <h3 className="text-lg font-medium text-secondary mb-2">
              {t('no_notifications') || 'Aucune notification'}
            </h3>
            <p className="text-sm text-muted text-center">
              {t('no_notifications_desc') || 'Vous n\'avez aucune notification pour le moment.'}
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
              <div key={groupName}>
                {/* En-tête du groupe */}
                <div className="px-4 py-2 bg-muted border-b border-default">
                  <span className="!text-xs font-semibold text-muted uppercase tracking-wider">
                    {groupName}
                  </span>
                </div>

                {/* Notifications du groupe */}
                {groupNotifications.map((notification) => (
                  <motion.div
                    key={notification.documentId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group flex items-start gap-4 p-4 border-b border-muted hover:bg-hover transition-colors ${
                      !notification.read ? 'bg-accent-light' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelectNotification(notification.documentId)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                        selectedNotifications.has(notification.documentId)
                          ? 'bg-accent border-accent'
                          : 'border-muted hover:border-secondary'
                      }`}
                    >
                      {selectedNotifications.has(notification.documentId) && (
                        <IconCheck className="w-3 h-3 text-white" />
                      )}
                    </button>

                    {/* Icône / Avatar */}
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification)}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${!notification.read ? 'text-primary' : 'text-secondary'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          )}
                        </div>
                        <span className="!text-xs text-muted whitespace-nowrap">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-secondary mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          notification.type === 'project_invitation' 
                            ? 'bg-accent text-accent'
                            : notification.type === 'project_update'
                            ? 'bg-infotext-accent'
                            : 'bg-muted text-secondary'
                        }`}>
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>

                      {/* Actions pour les invitations */}
                      {notification.type === 'project_invitation' && !notification.read && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptInvitation(notification)}
                            className="btn-primary px-4 py-2 text-sm font-medium"
                          >
                            <IconCheck className="w-4 h-4" />
                            {t('accept') || 'Accepter'}
                          </button>
                          <button
                            onClick={() => handleRejectInvitation(notification)}
                            className="btn-ghost px-4 py-2 text-sm font-medium"
                          >
                            <IconX className="w-4 h-4" />
                            {t('reject') || 'Refuser'}
                          </button>
                        </div>
                      )}

                      {/* Actions pour les demandes de collaboration */}
                      {notification.type === 'collaboration_request' && !notification.read && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApproveCollaborationRequest(notification)}
                            className="btn-primary px-4 py-2 text-sm font-medium"
                          >
                            <IconCheck className="w-4 h-4" />
                            {t('approve_request') || 'Approuver'}
                          </button>
                          <button
                            onClick={() => handleRejectCollaborationRequest(notification)}
                            className="btn-ghost px-4 py-2 text-sm font-medium"
                          >
                            <IconX className="w-4 h-4" />
                            {t('reject_request') || 'Refuser'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions rapides */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification)}
                          className="btn-ghost p-2"
                          title={t('mark_as_read') || 'Marquer comme lu'}
                        >
                          <IconCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.documentId)}
                        className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-hover transition-colors"
                        title={t('delete') || 'Supprimer'}
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

