'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  IconArrowLeft,
  IconRefresh,
  IconExternalLink,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconServer,
  IconWorld,
  IconDeviceDesktop,
  IconApi,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import useSWR from 'swr';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import MonitoringCharts from '@/app/components/MonitoringCharts';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { fetchMonitoredSiteById, fetchMonitoringLogs, deleteMonitoredSite } from '@/lib/api';
import { getFaviconUrl } from '@/lib/favicon';
import type { MonitoredSite, SiteStatus } from '@/types';

const STATUS_CONFIG: Record<SiteStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  up: { bg: 'bg-success-light', text: 'text-success', label: 'En ligne', icon: <IconCheck className="w-5 h-5" /> },
  down: { bg: 'bg-error-light', text: 'text-error', label: 'Hors ligne', icon: <IconX className="w-5 h-5" /> },
  slow: { bg: 'bg-warning-light', text: 'text-warning', label: 'Lent', icon: <IconClock className="w-5 h-5" /> },
  unknown: { bg: 'bg-muted-light', text: 'text-muted', label: 'Inconnu', icon: <IconAlertTriangle className="w-5 h-5" /> },
};

const SITE_TYPE_CONFIG = {
  frontend: { icon: <IconDeviceDesktop className="w-5 h-5" />, label: 'Frontend', color: 'text-info' },
  backend: { icon: <IconServer className="w-5 h-5" />, label: 'Backend', color: 'text-accent' },
  api: { icon: <IconApi className="w-5 h-5" />, label: 'API', color: 'text-warning' },
  other: { icon: <IconWorld className="w-5 h-5" />, label: 'Autre', color: 'text-muted' },
};

export default function MonitoringDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const siteId = params.id as string;
  
  const [deleteModal, setDeleteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Fetch site details
  const { data: site, error: siteError, mutate: mutateSite } = useSWR<MonitoredSite>(
    user?.id && siteId ? ['monitored-site', siteId] : null,
    () => fetchMonitoredSiteById(siteId)
  );

  // Fetch monitoring logs
  const { data: logs, error: logsError, mutate: mutateLogs } = useSWR(
    user?.id && siteId ? ['monitoring-logs', siteId, timeRange] : null,
    () => fetchMonitoringLogs(siteId, timeRange)
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger a check via API
      const response = await fetch(`/api/monitoring/check?site_id=${siteId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await mutateSite();
        await mutateLogs();
        showGlobalPopup(t('site_checked') || 'Site vérifié', 'success');
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!site) return;
    
    try {
      await deleteMonitoredSite(site.documentId);
      showGlobalPopup(t('site_deleted') || 'Site supprimé', 'success');
      router.push('/dashboard/monitoring');
    } catch (error) {
      console.error('Error deleting site:', error);
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    }
  };

  if (siteError) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <IconAlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-primary">{t('site_not_found') || 'Site non trouvé'}</p>
            <button 
              onClick={() => router.push('/dashboard/monitoring')}
              className="btn-secondary mt-4"
            >
              {t('back_to_monitoring') || 'Retour au monitoring'}
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!site) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      </ProtectedRoute>
    );
  }

  const statusConfig = STATUS_CONFIG[site.site_status];
  const siteTypeConfig = SITE_TYPE_CONFIG[site.site_type || 'frontend'];

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/monitoring')}
              className="p-2 hover:bg-hover rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5 text-muted" />
            </button>
            
            <img 
              src={getFaviconUrl(site.url)} 
              alt={`${site.name} favicon`}
              className="w-12 h-12 rounded-xl bg-elevated p-2 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                {site.name}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </h1>
              <a 
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline flex items-center gap-1 text-sm"
              >
                {site.url}
                <IconExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-2"
            >
              <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Actualiser'}
            </button>
            <button
              onClick={() => router.push(`/dashboard/monitoring?edit=${site.documentId}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <IconSettings className="w-4 h-4" />
              {t('settings') || 'Paramètres'}
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="btn-secondary text-error hover:bg-error/10 flex items-center gap-2"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Site Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs text-muted uppercase mb-1">{t('site_type') || 'Type'}</p>
            <div className={`flex items-center gap-2 ${siteTypeConfig.color}`}>
              {siteTypeConfig.icon}
              <span className="font-medium">{siteTypeConfig.label}</span>
            </div>
          </div>
          
          <div className="card p-4">
            <p className="text-xs text-muted uppercase mb-1">{t('check_interval') || 'Intervalle'}</p>
            <p className="text-lg font-bold text-primary">{site.check_interval} min</p>
          </div>
          
          <div className="card p-4">
            <p className="text-xs text-muted uppercase mb-1">{t('last_response_time') || 'Dernier temps'}</p>
            <p className="text-lg font-bold text-primary">
              {site.last_response_time ? `${site.last_response_time}ms` : '-'}
            </p>
          </div>
          
          <div className="card p-4">
            <p className="text-xs text-muted uppercase mb-1">{t('last_check') || 'Dernière vérif.'}</p>
            <p className="text-sm text-primary">
              {site.last_check 
                ? new Date(site.last_check).toLocaleString('fr-FR')
                : '-'
              }
            </p>
          </div>
        </div>

        {/* Hosting Info */}
        {(site.hosting_provider || site.server_ip) && (
          <div className="card p-4">
            <h3 className="text-sm font-medium text-muted uppercase mb-3">
              {t('hosting_info') || 'Informations hébergement'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {site.hosting_provider && (
                <div>
                  <p className="text-xs text-muted">{t('hosting_provider') || 'Hébergeur'}</p>
                  <p className="text-primary font-medium capitalize">{site.hosting_provider}</p>
                </div>
              )}
              {site.server_ip && (
                <div>
                  <p className="text-xs text-muted">{t('server_ip') || 'IP Serveur'}</p>
                  <p className="text-primary font-mono">{site.server_ip}</p>
                </div>
              )}
            </div>
            {site.server_notes && (
              <div className="mt-3 pt-3 border-t border-default">
                <p className="text-xs text-muted mb-1">{t('notes') || 'Notes'}</p>
                <p className="text-sm text-secondary whitespace-pre-wrap">{site.server_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t('period') || 'Période'}:</span>
          <div className="flex bg-elevated rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        {logsError ? (
          <div className="card p-6 text-center">
            <IconAlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-muted">{t('error_loading_logs') || 'Erreur lors du chargement des logs'}</p>
          </div>
        ) : !logs ? (
          <div className="card p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : (
          <MonitoringCharts logs={logs} />
        )}

        {/* Delete Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          itemName={site.name}
          itemType={t('monitored_site') || 'site surveillé'}
        />
      </div>
    </ProtectedRoute>
  );
}

