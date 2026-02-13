'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  IconHistory,
  IconSearch,
  IconRefresh,
  IconUserPlus,
  IconLogin,
  IconLogout,
  IconEdit,
  IconTrash,
  IconMail,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconDownload,
  IconCalendar,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { fetchAuditLogs, type AuditLog } from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';

interface DisplayLog {
  id: string;
  type: AuditLog['type'];
  action: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  details?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
  status: AuditLog['status'];
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<DisplayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    pageCount: 0,
  });
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchAuditLogs({
        page: pagination.page,
        pageSize: pagination.pageSize,
        type: filterType,
        status: filterStatus,
        search: searchTerm,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      // Transformer les données de l'API
      const formattedLogs: DisplayLog[] = response.data.map(log => ({
        id: log.documentId || log.id.toString(),
        type: log.type,
        action: log.action,
        user: log.user,
        details: log.details,
        ip: log.ip,
        userAgent: log.userAgent,
        timestamp: log.createdAt,
        status: log.status,
      }));

      setLogs(formattedLogs);
      setPagination(prev => ({
        ...prev,
        total: response.meta?.pagination?.total || 0,
        pageCount: response.meta?.pagination?.pageCount || 0,
      }));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      showGlobalPopup(t('error_loading_logs') || 'Erreur lors du chargement des logs', 'error');
      // Fallback to empty logs if API fails
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filterType, filterStatus, searchTerm, dateRange, showGlobalPopup, t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Les logs sont déjà filtrés côté serveur
  const filteredLogs = logs;

  const getTypeIcon = (type: DisplayLog['type']) => {
    const icons: Record<DisplayLog['type'], React.ReactNode> = {
      login: <IconLogin className="w-4 h-4" />,
      logout: <IconLogout className="w-4 h-4" />,
      register: <IconUserPlus className="w-4 h-4" />,
      update: <IconEdit className="w-4 h-4" />,
      delete: <IconTrash className="w-4 h-4" />,
      email: <IconMail className="w-4 h-4" />,
      error: <IconAlertTriangle className="w-4 h-4" />,
      system: <IconHistory className="w-4 h-4" />,
    };
    return icons[type];
  };

  const getTypeColor = (type: DisplayLog['type']) => {
    const colors: Record<DisplayLog['type'], string> = {
      login: 'bg-success-light !text-success-text',
      logout: 'bg-info-light !text-info',
      register: 'bg-accent-light !text-accent',
      update: 'bg-warning-light !text-warning',
      delete: 'bg-danger-light !text-danger',
      email: 'bg-info-light !text-info',
      error: 'bg-danger-light !text-danger',
      system: 'bg-muted/20 !text-muted',
    };
    return colors[type];
  };

  const getStatusIcon = (status: DisplayLog['status']) => {
    switch (status) {
      case 'success':
        return <IconCheck className="w-4 h-4 !text-success-text -text" />;
      case 'error':
        return <IconX className="w-4 h-4 !text-danger" />;
      case 'warning':
        return <IconAlertTriangle className="w-4 h-4 !text-warning" />;
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Action', 'User', 'Email', 'IP', 'Status'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.type,
        log.action,
        log.user?.username || 'System',
        log.user?.email || '-',
        log.ip || '-',
        log.status,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const logStats = useMemo(() => ({
    total: pagination.total || filteredLogs.length,
    success: filteredLogs.filter(l => l.status === 'success').length,
    errors: filteredLogs.filter(l => l.status === 'error').length,
    warnings: filteredLogs.filter(l => l.status === 'warning').length,
  }), [filteredLogs, pagination.total]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold !text-primary flex items-center gap-2">
            <IconHistory className="w-7 h-7 !text-accent" />
            {t('logs_audit') || 'Logs & Audit'}
          </h1>
          <p className="text-sm !text-muted">{t('platform_actions_history') || 'Historique des actions sur la plateforme'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="btn-secondary flex items-center gap-2 px-4 py-2  transition-colors hover:bg-hover ease-in-out duration-300"
          >
            <IconDownload className="w-4 h-4" />
            {t('export') || 'Exporter'}
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 px-4 py-2  transition-colors hover:bg-hover ease-in-out duration-300 disabled:opacity-50"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh') || 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('total') || 'Total', value: logStats.total, color: 'text-primary' },
          { label: t('success') || 'Succès', value: logStats.success, color: 'text-success' },
          { label: t('errors') || 'Erreurs', value: logStats.errors, color: 'text-danger' },
          { label: t('warnings') || 'Avertissements', value: logStats.warnings, color: 'text-warning' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-sm !text-muted">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 !text-muted" />
            <input
              type="text"
              placeholder={t('search') || 'Rechercher...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full !pl-10"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input"
          >
            <option value="all">{t('all_types') || 'Tous les types'}</option>
            <option value="login">{t('logins') || 'Connexions'}</option>
            <option value="logout">{t('logouts') || 'Déconnexions'}</option>
            <option value="register">{t('registrations') || 'Inscriptions'}</option>
            <option value="update">{t('modifications') || 'Modifications'}</option>
            <option value="delete">{t('deletions') || 'Suppressions'}</option>
            <option value="email">{t('emails') || 'Emails'}</option>
            <option value="error">{t('errors') || 'Erreurs'}</option>
            <option value="system">{t('system') || 'Système'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">{t('all_status') || 'Tous les statuts'}</option>
            <option value="success">{t('success') || 'Succès'}</option>
            <option value="error">{t('error') || 'Erreur'}</option>
            <option value="warning">{t('warning') || 'Avertissement'}</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="input flex-1"
            />
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="card overflow-hidden">
        <div >
          {filteredLogs.length > 0 ? (
            filteredLogs.slice(0, 50).map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-card transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className={`p-2  ${getTypeColor(log.type)}`}>
                    {getTypeIcon(log.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium !text-primary">{log.action}</span>
                      {getStatusIcon(log.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 !text-sm !text-muted">
                      {log.user && (
                        <span className="flex items-center gap-1">
                          <IconUserPlus className="w-3 h-3" />
                          {log.user.username}
                        </span>
                      )}
                      {log.ip && (
                        <span>IP: {log.ip}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <IconCalendar className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {log.details && (
                      <p className="!text-xs !text-muted mt-2 truncate">{log.details}</p>
                    )}
                  </div>

                  {/* Type Badge */}
                  <span className={`px-2 py-1 rounded !text-xs font-medium ${getTypeColor(log.type)}`}>
                    {log.type}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <IconHistory className="w-12 h-12 !text-muted mx-auto mb-4" />
              <p className="text-muted">{t('no_logs_found') || 'Aucun log trouvé'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm !text-muted">
            {t('showing_results') || 'Affichage'} {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('of') || 'sur'} {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1}
              className="btn-secondary px-3 py-1.5  disabled:opacity-50"
            >
              {t('previous') || 'Précédent'}
            </button>
            <span className="text-sm !text-muted">
              {pagination.page} / {pagination.pageCount}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pageCount, prev.page + 1) }))}
              disabled={pagination.page >= pagination.pageCount}
              className="btn-secondary px-3 py-1.5  disabled:opacity-50"
            >
              {t('next') || 'Suivant'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
