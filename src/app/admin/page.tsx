'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  IconUsers,
  IconCreditCard,
  IconMail,
  IconNews,
  IconServer,
  IconDatabase,
  IconClock,
  IconTrendingUp,
  IconTrendingDown,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconRefresh,
  IconUserPlus,
  IconActivity,
  IconHistory,
  IconSettings,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface ServerHealth {
  status: 'ok' | 'error' | 'loading';
  timestamp: string;
  database: string;
  version: string;
  responseTime?: number;
}

interface AdminStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
  totalSubscriptions: number;
  totalRevenue: number;
  emailsSentToday: number;
  newslettersSent: number;
  storageUsed: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'subscription_changed' | 'email_sent' | 'error';
  message: string;
  timestamp: string;
  user?: string;
}

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function AdminOverviewPage() {
  const [serverHealth, setServerHealth] = useState<ServerHealth>({
    status: 'loading',
    timestamp: '',
    database: '',
    version: '',
  });
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    activeUsersToday: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    emailsSentToday: 0,
    newslettersSent: 0,
    storageUsed: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();

  const checkServerHealth = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setServerHealth({
          ...data,
          responseTime,
        });
      } else {
        setServerHealth({
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'unknown',
          version: 'unknown',
          responseTime,
        });
      }
    } catch {
      setServerHealth({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        version: 'unknown',
        responseTime: Date.now() - startTime,
      });
    }
  };

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const usersRes = await fetch(`${API_URL}/api/users?pagination[pageSize]=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      
      const subsRes = await fetch(`${API_URL}/api/subscriptions?pagination[pageSize]=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subsData = await subsRes.json();

      const today = new Date().toISOString().split('T')[0];
      const emailsRes = await fetch(
        `${API_URL}/api/sent-emails?pagination[pageSize]=1&filters[createdAt][$gte]=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const emailsData = await emailsRes.json();

      const newslettersRes = await fetch(`${API_URL}/api/newsletters?pagination[pageSize]=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newslettersData = await newslettersRes.json();

      setStats({
        totalUsers: usersData.length || usersData.meta?.pagination?.total || 0,
        newUsersThisMonth: 0,
        activeUsersToday: 0,
        totalSubscriptions: subsData.meta?.pagination?.total || 0,
        totalRevenue: 0,
        emailsSentToday: emailsData.meta?.pagination?.total || 0,
        newslettersSent: newslettersData.meta?.pagination?.total || 0,
        storageUsed: 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/audit-logs?page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const activities: RecentActivity[] = (data.data || []).map((log: {
          id: number;
          documentId?: string;
          type: string;
          action: string;
          createdAt: string;
          user?: { email?: string; username?: string };
        }) => ({
          id: log.documentId || log.id.toString(),
          type: mapLogTypeToActivityType(log.type),
          message: log.action,
          timestamp: log.createdAt,
          user: log.user?.email || log.user?.username,
        }));
        setRecentActivity(activities);
      } else {
        // Fallback si l'API n'est pas disponible
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  const mapLogTypeToActivityType = (type: string): RecentActivity['type'] => {
    switch (type) {
      case 'register': return 'user_registered';
      case 'update': return 'subscription_changed';
      case 'email': return 'email_sent';
      case 'error': return 'error';
      default: return 'email_sent';
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      checkServerHealth(),
      fetchAdminStats(),
      fetchRecentActivity(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await refreshData();
      setLoading(false);
    };
    loadData();

    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-success-text';
      case 'error': return 'text-danger';
      default: return 'text-warning';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <IconCheck className="w-4 h-4" />;
      case 'error': return <IconX className="w-4 h-4" />;
      default: return <IconAlertTriangle className="w-4 h-4" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered': return <IconUserPlus className="w-4 h-4 !text-success-text -text" />;
      case 'subscription_changed': return <IconCreditCard className="w-4 h-4 !text-info" />;
      case 'email_sent': return <IconMail className="w-4 h-4 !text-accent" />;
      case 'error': return <IconAlertTriangle className="w-4 h-4 !text-danger" />;
      default: return <IconActivity className="w-4 h-4 !text-muted" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold !text-primary">{t('admin_dashboard') || 'Dashboard Admin'}</h1>
          <p className="text-sm !text-muted">{t('platform_overview') || 'Vue d\'ensemble de votre plateforme'}</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-hover ease-in-out duration-300 disabled:opacity-50"
        >
          <IconRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('refresh') || 'Actualiser'}
        </button>
      </div>

      {/* Server Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold !text-primary flex items-center gap-2">
            <IconServer className="w-5 h-5 !text-accent" />
            {t('server_health') || 'Santé du Serveur'}
          </h2>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            serverHealth.status === 'ok' ? 'bg-success-light' : 'bg-danger-light'
          }`}>
            <span className={getHealthStatusColor(serverHealth.status)}>
              {getHealthStatusIcon(serverHealth.status)}
            </span>
            <span className={`text-sm font-medium ${getHealthStatusColor(serverHealth.status)}`}>
              {serverHealth.status === 'ok' ? t('operational') || 'Opérationnel' : t('issue_detected') || 'Problème détecté'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/5 border border-muted">
            <div className="flex items-center gap-2 !text-muted mb-1">
              <IconDatabase className="w-4 h-4" />
              <span className="!text-xs">{t('database') || 'Base de données'}</span>
            </div>
            <p className={`text-sm font-medium ${
              serverHealth.database === 'connected' ? 'text-success-text' : 'text-danger'
            }`}>
              {serverHealth.database === 'connected' ? t('connected') || 'Connectée' : t('disconnected') || 'Déconnectée'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/5 border border-muted">
            <div className="flex items-center gap-2 !text-muted mb-1">
              <IconClock className="w-4 h-4" />
              <span className="!text-xs">{t('response_time') || 'Temps de réponse'}</span>
            </div>
            <p className={`text-sm font-medium ${
              (serverHealth.responseTime || 0) < 200 ? 'text-success-text' : 
              (serverHealth.responseTime || 0) < 500 ? 'text-warning' : 'text-danger'
            }`}>
              {serverHealth.responseTime ? `${serverHealth.responseTime}ms` : '-'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/5 border border-muted">
            <div className="flex items-center gap-2 !text-muted mb-1">
              <IconServer className="w-4 h-4" />
              <span className="!text-xs">{t('strapi_version') || 'Version Strapi'}</span>
            </div>
            <p className="text-sm font-medium !text-primary">
              {serverHealth.version || '-'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/5 border border-muted">
            <div className="flex items-center gap-2 !text-muted mb-1">
              <IconClock className="w-4 h-4" />
              <span className="!text-xs">{t('last_check') || 'Dernière vérification'}</span>
            </div>
            <p className="text-sm font-medium !text-primary">
              {serverHealth.timestamp
                ? new Date(serverHealth.timestamp).toLocaleTimeString('fr-FR')
                : '-'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('users') || 'Utilisateurs',
            value: stats.totalUsers,
            icon: IconUsers,
            color: 'text-info',
            bgColor: 'bg-info-light',
            trend: '+12%',
            trendUp: true,
          },
          {
            label: t('active_subscriptions') || 'Abonnements actifs',
            value: stats.totalSubscriptions,
            icon: IconCreditCard,
            color: 'text-success-text',
            bgColor: 'bg-success-light',
            trend: '+5%',
            trendUp: true,
          },
          {
            label: t('emails_sent_24h') || 'Emails envoyés (24h)',
            value: stats.emailsSentToday,
            icon: IconMail,
            color: 'text-accent',
            bgColor: 'bg-accent-light',
            trend: '+23%',
            trendUp: true,
          },
          {
            label: t('newsletters') || 'Newsletters',
            value: stats.newslettersSent,
            icon: IconNews,
            color: 'text-warning',
            bgColor: 'bg-warning-light',
            trend: '-2%',
            trendUp: false,
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 !text-xs font-medium ${
                  stat.trendUp ? 'text-success-text' : 'text-danger'
                }`}>
                  {stat.trendUp ? (
                    <IconTrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <IconTrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>{stat.trend}</span>
                </div>
              </div>
              <p className="text-2xl font-bold !text-primary mb-1">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-sm !text-muted">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold !text-primary mb-4 flex items-center gap-2">
            <IconActivity className="w-5 h-5 !text-accent" />
            {t('recent_activity') || 'Activité récente'}
          </h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/5 border border-muted"
                >
                  <div className="p-2 rounded-lg bg-card border border-muted">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium !text-primary">
                      {activity.message}
                    </p>
                    {activity.user && (
                      <p className="!text-xs !text-muted truncate">{activity.user}</p>
                    )}
                  </div>
                  <span className="!text-xs !text-muted whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center !text-muted py-8">{t('no_recent_activity') || 'Aucune activité récente'}</p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold !text-primary mb-4">{t('quick_actions') || 'Actions rapides'}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('view_all_users') || 'Voir tous les utilisateurs', href: '/admin/users', icon: IconUsers },
              { label: t('manage_subscriptions') || 'Gérer les abonnements', href: '/admin/subscriptions', icon: IconCreditCard },
              { label: t('system_logs') || 'Logs système', href: '/admin/logs', icon: IconHistory },
              { label: t('configuration') || 'Configuration', href: '/admin/settings', icon: IconSettings },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/5 border border-muted hover:border-accent-light hover:bg-accent-light transition-all group"
                >
                  <Icon className="w-5 h-5 !text-muted group-hover:!text-accent transition-colors" />
                  <span className="text-sm font-medium !text-primary group-hover:!text-accent transition-colors">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
