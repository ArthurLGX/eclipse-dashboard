'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  IconServer,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
  IconExternalLink,
  IconTrash,
  IconEdit,
  IconAlertTriangle,
  IconLock,
  IconWorld,
  IconDeviceDesktop,
  IconApi,
  IconKey,
  IconChartBar,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { 
  fetchMonitoredSites, 
  createMonitoredSite, 
  deleteMonitoredSite,
  updateMonitoredSite 
} from '@/lib/api';
import { getFaviconUrl } from '@/lib/favicon';
import type { MonitoredSite, SiteStatus, SiteType, HostingProvider } from '@/types';
import useSWR from 'swr';

const STATUS_COLORS: Record<SiteStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  up: { bg: 'bg-success-light', text: 'text-success', icon: <IconCheck className="w-4 h-4" /> },
  down: { bg: 'bg-error-light', text: 'text-error', icon: <IconX className="w-4 h-4" /> },
  slow: { bg: 'bg-warning-light', text: 'text-warning', icon: <IconClock className="w-4 h-4" /> },
  unknown: { bg: 'bg-muted-light', text: 'text-muted', icon: <IconAlertTriangle className="w-4 h-4" /> },
};

export default function MonitoringPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<MonitoredSite | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; site: MonitoredSite | null }>({
    isOpen: false,
    site: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SiteType | 'all'>('all');

  // Fetch sites
  const { data: sites, mutate, isLoading } = useSWR(
    user?.id ? ['monitored-sites', user.id] : null,
    () => fetchMonitoredSites(user!.id),
    { refreshInterval: 60000 } // Refresh every minute
  );

  // Filtrer les sites (sites sans site_type sont considérés comme "frontend" par défaut)
  const filteredSites = useMemo(() => {
    if (!sites) return [];
    if (typeFilter === 'all') return sites;
    return sites.filter(s => {
      const siteType = s.site_type || 'frontend'; // Défaut: frontend
      return siteType === typeFilter;
    });
  }, [sites, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!sites) return { total: 0, up: 0, down: 0, slow: 0 };
    return {
      total: sites.length,
      up: sites.filter(s => s.site_status === 'up').length,
      down: sites.filter(s => s.site_status === 'down').length,
      slow: sites.filter(s => s.site_status === 'slow').length,
    };
  }, [sites]);

  // Refresh all sites - trigger monitoring check
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      // Appeler l'API de vérification des sites
      const response = await fetch('/api/monitoring/check', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh sites');
      }
      
      // Attendre un peu puis rafraîchir les données
      await new Promise(resolve => setTimeout(resolve, 2000));
      await mutate();
      showGlobalPopup(t('sites_refreshed') || 'Sites actualisés', 'success');
    } catch {
      showGlobalPopup(t('refresh_error') || 'Erreur lors de l\'actualisation', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Delete site
  const handleDelete = async () => {
    if (!deleteModal.site) return;
    try {
      await deleteMonitoredSite(deleteModal.site.documentId);
      await mutate();
      showGlobalPopup(t('site_deleted') || 'Site supprimé', 'success');
      setDeleteModal({ isOpen: false, site: null });
    } catch {
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    }
  };

  // Format response time
  const formatResponseTime = (ms: number | null) => {
    if (ms === null) return '---';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format uptime
  const formatUptime = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  // Check SSL days remaining
  const getSslDaysRemaining = (expiry: string | null) => {
    if (!expiry) return null;
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconServer className="w-7 h-7 !text-accent" />
              {t('monitoring') || 'Monitoring'}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('monitoring_desc') || 'Surveillez la disponibilité de vos sites web'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="btn-ghost px-4 py-2 flex items-center gap-2"
            >
              <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Actualiser'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-4 py-2 flex items-center gap-2 rounded-lg"
            >
              <IconPlus className="w-4 h-4" color="white" />
              {t('add_site') || 'Ajouter un site'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-light rounded-lg">
                <IconWorld className="w-5 h-5 !text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted">{t('total_sites') || 'Sites surveillés'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-light rounded-lg">
                <IconCheck className="w-5 h-5 !text-success-text -text" />
              </div>
              <div>
                <p className="text-2xl font-bold !text-success-text -text">{stats.up}</p>
                <p className="text-xs text-muted">{t('sites_up') || 'En ligne'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-error-light rounded-lg">
                <IconX className="w-5 h-5 text-error" />
              </div>
              <div>
                <p className="text-2xl font-bold text-error">{stats.down}</p>
                <p className="text-xs text-muted">{t('sites_down') || 'Hors ligne'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-light rounded-lg">
                <IconClock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{stats.slow}</p>
                <p className="text-xs text-muted">{t('sites_slow') || 'Lent'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['all', 'frontend', 'backend', 'api', 'other'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  typeFilter === type
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {type === 'all' && <IconWorld className={`w-4 h-4 ${typeFilter === type ? '!text-white' : 'text-muted'}`} />}
                {type === 'frontend' && <IconDeviceDesktop className={`w-4 h-4 ${typeFilter === type ? '!text-white' : 'text-muted'}`} />}
                {type === 'backend' && <IconServer className={`w-4 h-4 ${typeFilter === type ? '!text-white' : 'text-muted'}`} />}
                {type === 'api' && <IconApi className={`w-4 h-4 ${typeFilter === type ? '!text-white' : 'text-muted'}`} />}
                {type === 'all' ? (t('all') || 'Tous') :
                 type === 'frontend' ? 'Frontend' :
                 type === 'backend' ? 'Backend' :
                 type === 'api' ? 'API' :
                 (t('other') || 'Autre')}
              </button>
            ))}
          </div>
        </div>

        {/* Sites Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : !filteredSites?.length ? (
            <div className="p-8 text-center">
              <IconServer className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">{t('no_sites') || 'Aucun site surveillé'}</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 btn-primary px-4 py-2 rounded-lg"
              >
                {t('add_first_site') || 'Ajouter votre premier site'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-hover">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      {t('site') || 'Site'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      {t('type') || 'Type'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      {t('status') || 'Statut'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      {t('uptime') || 'Uptime'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      {t('response_time') || 'Réponse'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      SSL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                      {t('last_check') || 'Dernière vérif.'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">
                      {t('actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site, index) => {
                    const statusConfig = STATUS_COLORS[site.site_status];
                    const sslDays = getSslDaysRemaining(site.ssl_expiry);
                    
                    return (
                      <tr key={site.documentId} className={`hover:bg-hover transition-colors ${index > 0 ? 'border-t border-default' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Favicon */}
                            <img 
                              src={getFaviconUrl(site.url)} 
                              alt={`${site.name} favicon`}
                              className="w-8 h-8 rounded-lg bg-elevated p-1 object-contain"
                              onError={(e) => {
                                const img = e.currentTarget;
                                img.style.display = 'none';
                              }}
                            />
                            <div>
                              <p className="font-medium text-primary">{site.name}</p>
                              <a 
                                href={site.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs !text-accent hover:underline flex items-center gap-1"
                              >
                                {site.url}
                                <IconExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const type = site.site_type || 'frontend';
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                type === 'frontend' ? 'bg-info-light text-info' :
                                type === 'backend' ? 'bg-accent-light !text-accent' :
                                type === 'api' ? 'bg-warning-light text-warning' :
                                'bg-muted-light text-muted'
                              }`}>
                                {type === 'frontend' && <IconDeviceDesktop className="w-3 h-3" />}
                                {type === 'backend' && <IconServer className="w-3 h-3" />}
                                {type === 'api' && <IconApi className="w-3 h-3" />}
                                {type === 'other' && <IconWorld className="w-3 h-3" />}
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium badge border ${statusConfig.bg} ${statusConfig.text}-text border-${statusConfig.bg}`}>
                            {statusConfig.icon}
                            {site.site_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${site.uptime_percentage >= 99 ? 'text-success-text' : site.uptime_percentage >= 95 ? 'text-warning-text' : 'text-error-text'}`}>
                            {formatUptime(site.uptime_percentage)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${
                            site.last_response_time && site.last_response_time < 500 ? 'text-success-text' :
                            site.last_response_time && site.last_response_time < 2000 ? 'text-warning-text' : 'text-error-text'
                          }`}>
                            {formatResponseTime(site.last_response_time)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {sslDays !== null ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              sslDays > 30 ? 'text-success-text' : sslDays > 7 ? 'text-warning-text' : 'text-error-text'
                            }`}>
                              <IconLock className="w-3 h-3" />
                              {sslDays}j
                            </span>
                          ) : (
                            <span className="text-muted text-xs">---</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted">
                            {site.last_check 
                              ? new Date(site.last_check).toLocaleString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: 'short'
                                })
                              : '---'
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/monitoring/${site.documentId}`)}
                              className="p-1.5 text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors"
                              title={t('view_stats') || 'Voir les statistiques'}
                            >
                              <IconChartBar className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingSite(site)}
                              className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, site })}
                              className="p-1.5 text-muted hover:text-error hover:bg-error-light rounded-lg transition-colors"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <AddSiteModal
          isOpen={showAddModal || !!editingSite}
          onClose={() => {
            setShowAddModal(false);
            setEditingSite(null);
          }}
          site={editingSite}
          onSave={async (data) => {
            try {
              if (editingSite) {
                await updateMonitoredSite(editingSite.documentId, data);
                showGlobalPopup(t('site_updated') || 'Site mis à jour', 'success');
              } else {
                await createMonitoredSite(user!.id, data);
                showGlobalPopup(t('site_added') || 'Site ajouté', 'success');
              }
              await mutate();
              setShowAddModal(false);
              setEditingSite(null);
            } catch {
              showGlobalPopup(t('save_error') || 'Erreur lors de la sauvegarde', 'error');
            }
          }}
        />

        {/* Delete Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, site: null })}
          onConfirm={handleDelete}
          title={t('delete_site') || 'Supprimer le site'}
          itemName={deleteModal.site?.name || ''}
          itemType="site"
        />
      </motion.div>
    </ProtectedRoute>
  );
}

// Hosting providers list
const HOSTING_PROVIDERS: { value: HostingProvider; label: string }[] = [
  { value: 'ovh', label: 'OVH' },
  { value: 'hostinger', label: 'Hostinger' },
  { value: 'o2switch', label: 'o2switch' },
  { value: 'aws', label: 'AWS' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'netlify', label: 'Netlify' },
  { value: 'digitalocean', label: 'DigitalOcean' },
  { value: 'scaleway', label: 'Scaleway' },
  { value: 'other', label: 'Autre' },
];

// Add/Edit Site Modal Component
interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: MonitoredSite | null;
  onSave: (data: { 
    name: string; 
    url: string; 
    check_interval: number; 
    alert_email: boolean; 
    alert_threshold: number;
    site_type: SiteType;
    hosting_provider: HostingProvider | null;
    server_ip: string | null;
    server_notes: string | null;
  }) => Promise<void>;
}

function AddSiteModal({ isOpen, onClose, site, onSave }: AddSiteModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [checkInterval, setCheckInterval] = useState(5);
  const [alertEmail, setAlertEmail] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(2000);
  const [siteType, setSiteType] = useState<SiteType>('frontend');
  const [hostingProvider, setHostingProvider] = useState<HostingProvider | null>(null);
  const [serverIp, setServerIp] = useState('');
  const [serverNotes, setServerNotes] = useState('');
  const [showServerInfo, setShowServerInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when site changes
  React.useEffect(() => {
    if (site) {
      setName(site.name);
      setUrl(site.url);
      setCheckInterval(site.check_interval);
      setAlertEmail(site.alert_email);
      setAlertThreshold(site.alert_threshold);
      setSiteType(site.site_type || 'frontend');
      setHostingProvider(site.hosting_provider);
      setServerIp(site.server_ip || '');
      setServerNotes(site.server_notes || '');
      setShowServerInfo(!!(site.hosting_provider || site.server_ip));
    } else {
      setName('');
      setUrl('');
      setCheckInterval(5);
      setAlertEmail(true);
      setAlertThreshold(2000);
      setSiteType('frontend');
      setHostingProvider(null);
      setServerIp('');
      setServerNotes('');
      setShowServerInfo(false);
    }
  }, [site]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name,
        url: url.startsWith('http') ? url : `https://${url}`,
        check_interval: checkInterval,
        alert_email: alertEmail,
        alert_threshold: alertThreshold,
        site_type: siteType,
        hosting_provider: showServerInfo ? hostingProvider : null,
        server_ip: showServerInfo && serverIp ? serverIp : null,
        server_notes: showServerInfo && serverNotes ? serverNotes : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-default rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-default sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold text-primary">
            {site ? (t('edit_site') || 'Modifier le site') : (t('add_site') || 'Ajouter un site')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('site_name') || 'Nom du site'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon site client"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemple.com"
              className="input w-full"
              required
            />
          </div>

          {/* Site Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('site_type') || 'Type de site'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['frontend', 'backend', 'api', 'other'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSiteType(type)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-colors flex flex-col items-center gap-1 ${
                    siteType === type
                      ? 'border-accent bg-accent-light !text-accent'
                      : 'border-default bg-muted text-muted hover:text-primary'
                  }`}
                >
                  {type === 'frontend' && <IconDeviceDesktop className={`w-5 h-5 ${siteType === type ? 'text-accent' : 'text-muted'}`} />}
                  {type === 'backend' && <IconServer className={`w-5 h-5 ${siteType === type ? 'text-accent' : 'text-muted'}`} />}
                  {type === 'api' && <IconApi className={`w-5 h-5 ${siteType === type ? 'text-accent' : 'text-muted'}`} />}
                  {type === 'other' && <IconWorld className={`w-5 h-5 ${siteType === type ? '!text-white' : 'text-muted'}`} />}
                </button>
              ))}
            </div>
          </div>

          {/* Monitoring Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('check_interval') || 'Intervalle'} (min)
              </label>
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(Number(e.target.value))}
                className="input w-full"
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 heure</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('slow_threshold') || 'Seuil lenteur'} (ms)
              </label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="input w-full"
                min={100}
                max={10000}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alertEmail"
              checked={alertEmail}
              onChange={(e) => setAlertEmail(e.target.checked)}
              className="w-4 h-4 rounded border-default accent-accent"
            />
            <label htmlFor="alertEmail" className="text-sm text-secondary">
              {t('alert_by_email') || 'M\'alerter par email si le site est down'}
            </label>
          </div>

          {/* Server Info Toggle */}
          <div className="pt-2 border-t border-default">
            <button
              type="button"
              onClick={() => setShowServerInfo(!showServerInfo)}
              className="w-full flex items-center justify-between p-3 bg-muted rounded-lg text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                <IconServer className="w-4 h-4" />
                {t('server_info') || 'Informations serveur'} ({t('optional') || 'optionnel'})
              </span>
              <span className={`transform transition-transform ${showServerInfo ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>

          {/* Server Info Fields */}
          {showServerInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 p-4 bg-muted rounded-lg"
            >
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('hosting_provider') || 'Hébergeur'}
                </label>
                <select
                  value={hostingProvider || ''}
                  onChange={(e) => setHostingProvider(e.target.value as HostingProvider || null)}
                  className="input w-full"
                >
                  <option value="">{t('select') || 'Sélectionner'}</option>
                  {HOSTING_PROVIDERS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('server_ip') || 'Adresse IP du serveur'}
                </label>
                <input
                  type="text"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  placeholder="192.168.1.1"
                  className="input w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('server_notes') || 'Notes sur le serveur'}
                </label>
                <textarea
                  value={serverNotes}
                  onChange={(e) => setServerNotes(e.target.value)}
                  placeholder={t('server_notes_placeholder') || 'Informations de configuration, accès...'}
                  className="input w-full h-20 resize-none"
                />
              </div>

              <div className="p-3 bg-warning-light border border-warning rounded-lg">
                <p className="text-xs text-warning-text flex items-center gap-2">
                  <IconKey className="w-4 h-4" />
                  {t('credentials_info') || 'Les identifiants de connexion seront gérés dans une section sécurisée séparée.'}
                </p>
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost px-4 py-2"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSaving || !name || !url}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {isSaving && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              {site ? (t('save') || 'Sauvegarder') : (t('add') || 'Ajouter')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

