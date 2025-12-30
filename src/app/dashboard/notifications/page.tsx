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
} from '@/lib/api';
import type { Notification } from '@/types';

type FilterType = 'all' | 'unread' | 'read';
type NotificationTypeFilter = 'all' | 'project_invitation' | 'project_update' | 'system';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [filterType, setFilterType] = useState<NotificationTypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Charger les notifications
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
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

  // Statistiques
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const invitations = notifications.filter(n => n.type === 'project_invitation').length;
    return { total, unread, invitations };
  }, [notifications]);

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
          className="w-10 h-10 rounded-full object-cover"
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
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
          <span className="text-sm font-bold text-violet-400">{initials}</span>
        </div>
      );
    }

    if (notification.type === 'project_invitation') {
      return (
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
          <IconUsers className="w-5 h-5 text-violet-400" />
        </div>
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
        <IconBell className="w-5 h-5 text-blue-400" />
      </div>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project_invitation':
        return t('invitation') || 'Invitation';
      case 'project_update':
        return t('update') || 'Mise à jour';
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('notifications') || 'Notifications'}
            </h1>
            <p className="text-zinc-400">
              {t('notifications_description') || 'Gérez vos notifications et invitations'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadNotifications}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title={t('refresh') || 'Actualiser'}
            >
              <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <IconBell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">{t('total') || 'Total'}</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <IconBellOff className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">{t('unread') || 'Non lues'}</p>
              <p className="text-2xl font-bold text-white">{stats.unread}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <IconUsers className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">{t('invitations') || 'Invitations'}</p>
              <p className="text-2xl font-bold text-white">{stats.invitations}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            <IconFilter className="w-4 h-4" />
            <span className="text-sm">{t('filters') || 'Filtres'}</span>
            <IconChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Filtres de statut rapides */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800">
            {(['all', 'unread', 'read'] as FilterType[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-violet-500 text-white'
                    : 'text-zinc-400 hover:text-white'
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
            <span className="text-sm text-zinc-400">
              {selectedNotifications.size} {t('selected') || 'sélectionnée(s)'}
            </span>
            <button
              onClick={handleMarkSelectedAsRead}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 text-sm transition-colors"
            >
              <IconCheck className="w-4 h-4" />
              {t('mark_read') || 'Marquer lu'}
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
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
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    {t('notification_type') || 'Type de notification'}
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as NotificationTypeFilter)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="all">{t('all_types') || 'Tous les types'}</option>
                    <option value="project_invitation">{t('invitations') || 'Invitations'}</option>
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
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        {/* Header de la liste */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0
                  ? 'bg-violet-500 border-violet-500'
                  : 'border-zinc-600 hover:border-zinc-500'
              }`}
            >
              {selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0 && (
                <IconCheck className="w-3 h-3 text-white" />
              )}
            </button>
            <span className="text-sm text-zinc-400">
              {filteredNotifications.length} {t('notifications') || 'notification(s)'}
            </span>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <IconInbox className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">
              {t('no_notifications') || 'Aucune notification'}
            </h3>
            <p className="text-sm text-zinc-500 text-center">
              {t('no_notifications_desc') || 'Vous n\'avez aucune notification pour le moment.'}
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
              <div key={groupName}>
                {/* En-tête du groupe */}
                <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {groupName}
                  </span>
                </div>

                {/* Notifications du groupe */}
                {groupNotifications.map((notification) => (
                  <motion.div
                    key={notification.documentId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group flex items-start gap-4 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                      !notification.read ? 'bg-violet-500/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelectNotification(notification.documentId)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                        selectedNotifications.has(notification.documentId)
                          ? 'bg-violet-500 border-violet-500'
                          : 'border-zinc-600 hover:border-zinc-500'
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
                          <h4 className={`font-medium ${!notification.read ? 'text-white' : 'text-zinc-300'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-400 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          notification.type === 'project_invitation' 
                            ? 'bg-violet-500/20 text-violet-400'
                            : notification.type === 'project_update'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>

                      {/* Actions pour les invitations */}
                      {notification.type === 'project_invitation' && !notification.read && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptInvitation(notification)}
                            className="flex items-center gap-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <IconCheck className="w-4 h-4" />
                            {t('accept') || 'Accepter'}
                          </button>
                          <button
                            onClick={() => handleRejectInvitation(notification)}
                            className="flex items-center gap-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
                          >
                            <IconX className="w-4 h-4" />
                            {t('reject') || 'Refuser'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions rapides */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 transition-colors"
                          title={t('mark_as_read') || 'Marquer comme lu'}
                        >
                          <IconCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.documentId)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
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

