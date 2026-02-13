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

const STATUS_CONFIG: Record<SiteStatus, { bg: string; text: string; labelKey: string; icon: React.ReactNode }> = {
  up: { bg: 'bg-success-light', text: 'text-success', labelKey: 'online', icon: <IconCheck className="w-4 h-4" /> },
  down: { bg: 'bg-error-light', text: 'text-error', labelKey: 'offline', icon: <IconX className="w-4 h-4" /> },
  slow: { bg: 'bg-warning-light', text: 'text-warning', labelKey: 'slow', icon: <IconClock className="w-4 h-4" /> },
  unknown: { bg: 'bg-muted-light', text: 'text-muted', labelKey: 'unknown', icon: <IconAlertTriangle className="w-4 h-4" /> },
};

const SITE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; labelKey: string; color: string }> = {
  frontend: { icon: <IconDeviceDesktop className="w-4 h-4" />, labelKey: 'frontend', color: 'text-info' },
  backend: { icon: <IconServer className="w-4 h-4" />, labelKey: 'backend', color: 'text-accent' },
  api: { icon: <IconApi className="w-4 h-4" />, labelKey: 'api', color: 'text-warning' },
  other: { icon: <IconWorld className="w-4 h-4" />, labelKey: 'other', color: 'text-muted' },
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
            <IconAlertTriangle className="w-12 h-12 !text-error mx-auto mb-4" />
            <p className="text-primary">{t('site_not_found') || 'Site non trouvé'}</p>
            <button 
              onClick={() => router.push('/dashboard/monitoring')}
              className="btn-primary mt-4 "
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
      <div className="w-full mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/monitoring')}
              className="p-2 hover:bg-hover  transition-colors"
            >
              <IconArrowLeft className="w-5 h-5 !text-muted" />
            </button>
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={getFaviconUrl(site.url)} 
              alt={`${site.name} favicon`}
              className="w-10 h-10  bg-elevated p-1.5 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            
            <div>
              <h1 className="text-xl font-bold !text-primary flex items-center gap-2">
                {site.name}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full !text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.icon}
                  {t(statusConfig.labelKey) || statusConfig.labelKey}
                </span>
              </h1>
              <a 
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline flex items-center gap-1 !text-sm"
              >
                {site.url}
                <IconExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-primary px-3 py-1.5 !text-sm  flex items-center gap-1.5"
            >
              <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Actualiser'}
            </button>
            <button
              onClick={() => router.push(`/dashboard/monitoring?edit=${site.documentId}`)}
              className="btn-tertiary px-3 py-1.5 !text-sm  flex items-center gap-1.5"
            >
              <IconSettings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="btn-tertiary px-3 py-1.5 !text-sm  !text-error hover:bg-error-light flex items-center gap-1.5"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Infos site - Grille compacte */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('site_type') || 'Type', value: t(siteTypeConfig.labelKey) || siteTypeConfig.labelKey, icon: siteTypeConfig.icon, color: siteTypeConfig.color },
            { label: t('check_interval') || 'Intervalle', value: `${site.check_interval} min`, icon: <IconClock className="w-4 h-4" />, color: 'text-info' },
            { label: t('last_response_time') || 'Dernier temps', value: site.last_response_time ? `${site.last_response_time}ms` : '-', icon: <IconRefresh className="w-4 h-4" />, color: 'text-accent' },
            { label: t('last_check') || 'Dernière vérif.', value: site.last_check ? new Date(site.last_check).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-', icon: <IconCheck className="w-4 h-4" />, color: 'text-success' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={item.color}>{item.icon}</span>
                <span className="!text-xs !text-muted">{item.label}</span>
              </div>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Hosting Info */}
        {(site.hosting_provider || site.server_ip) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <IconServer className="w-4 h-4 !text-accent" />
              <span className="text-sm font-medium !text-primary">{t('hosting_info') || 'Hébergement'}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {site.hosting_provider && (
                <div>
                  <p className="!text-xs !text-muted">{t('hosting_provider') || 'Hébergeur'}</p>
                  <p className="text-sm !text-primary font-medium capitalize">{site.hosting_provider}</p>
                </div>
              )}
              {site.server_ip && (
                <div>
                  <p className="!text-xs !text-muted">{t('server_ip') || 'IP Serveur'}</p>
                  <p className="text-sm !text-primary font-mono">{site.server_ip}</p>
                </div>
              )}
            </div>
            {site.server_notes && (
              <div className="mt-3 pt-3 border-t border-default">
                <p className="!text-xs !text-muted mb-1">{t('notes') || 'Notes'}</p>
                <p className="text-sm !text-secondary whitespace-pre-wrap">{site.server_notes}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm !text-muted">{t('period') || 'Période'}:</span>
          <div className="flex bg-elevated  p-0.5">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 !text-xs  transition-colors ${
                  timeRange === range
                    ? 'bg-accent !text-white'
                    : 'text-muted hover:!text-primary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        {logsError ? (
          <div className="card p-6 !text-center">
            <IconAlertTriangle className="w-8 h-8 !text-warning-text mx-auto mb-2" />
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
          title={t('delete_site') || 'Supprimer le site'}
          itemName={site.name}
          itemType="site"
        />
      </div>
    </ProtectedRoute>
  );
}
