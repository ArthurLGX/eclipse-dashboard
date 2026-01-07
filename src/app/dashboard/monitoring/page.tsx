'use client';

import React, { useState, useMemo } from 'react';
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
import type { MonitoredSite, SiteStatus } from '@/types';
import useSWR from 'swr';

const STATUS_COLORS: Record<SiteStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  up: { bg: 'bg-success/20', text: 'text-success', icon: <IconCheck className="w-4 h-4" /> },
  down: { bg: 'bg-error/20', text: 'text-error', icon: <IconX className="w-4 h-4" /> },
  slow: { bg: 'bg-warning/20', text: 'text-warning', icon: <IconClock className="w-4 h-4" /> },
  unknown: { bg: 'bg-muted/20', text: 'text-muted', icon: <IconAlertTriangle className="w-4 h-4" /> },
};

export default function MonitoringPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<MonitoredSite | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; site: MonitoredSite | null }>({
    isOpen: false,
    site: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch sites
  const { data: sites, mutate, isLoading } = useSWR(
    user?.id ? ['monitored-sites', user.id] : null,
    () => fetchMonitoredSites(user!.id),
    { refreshInterval: 60000 } // Refresh every minute
  );

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

  // Refresh all sites
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      // TODO: Appeler l'API de vérification des sites
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconServer className="w-7 h-7 text-accent" />
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
              <IconPlus className="w-4 h-4" />
              {t('add_site') || 'Ajouter un site'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <IconWorld className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted">{t('total_sites') || 'Sites surveillés'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <IconCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.up}</p>
                <p className="text-xs text-muted">{t('sites_up') || 'En ligne'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-error/20 rounded-lg">
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
              <div className="p-2 bg-warning/20 rounded-lg">
                <IconClock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{stats.slow}</p>
                <p className="text-xs text-muted">{t('sites_slow') || 'Lent'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sites Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : !sites?.length ? (
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
                <tbody className="divide-y divide-default">
                  {sites.map((site) => {
                    const statusConfig = STATUS_COLORS[site.site_status];
                    const sslDays = getSslDaysRemaining(site.ssl_expiry);
                    
                    return (
                      <tr key={site.documentId} className="hover:bg-hover transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-primary">{site.name}</p>
                            <a 
                              href={site.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline flex items-center gap-1"
                            >
                              {site.url}
                              <IconExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon}
                            {site.site_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${site.uptime_percentage >= 99 ? 'text-success' : site.uptime_percentage >= 95 ? 'text-warning' : 'text-error'}`}>
                            {formatUptime(site.uptime_percentage)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${
                            site.last_response_time && site.last_response_time < 500 ? 'text-success' :
                            site.last_response_time && site.last_response_time < 2000 ? 'text-warning' : 'text-error'
                          }`}>
                            {formatResponseTime(site.last_response_time)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {sslDays !== null ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              sslDays > 30 ? 'text-success' : sslDays > 7 ? 'text-warning' : 'text-error'
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
                              onClick={() => setEditingSite(site)}
                              className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, site })}
                              className="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
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

// Add/Edit Site Modal Component
interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: MonitoredSite | null;
  onSave: (data: { name: string; url: string; check_interval: number; alert_email: boolean; alert_threshold: number }) => Promise<void>;
}

function AddSiteModal({ isOpen, onClose, site, onSave }: AddSiteModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [checkInterval, setCheckInterval] = useState(5);
  const [alertEmail, setAlertEmail] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(2000);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when site changes
  React.useEffect(() => {
    if (site) {
      setName(site.name);
      setUrl(site.url);
      setCheckInterval(site.check_interval);
      setAlertEmail(site.alert_email);
      setAlertThreshold(site.alert_threshold);
    } else {
      setName('');
      setUrl('');
      setCheckInterval(5);
      setAlertEmail(true);
      setAlertThreshold(2000);
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
        className="w-full max-w-md bg-card border border-default rounded-xl shadow-xl"
      >
        <div className="p-6 border-b border-default">
          <h2 className="text-lg font-semibold text-primary">
            {site ? (t('edit_site') || 'Modifier le site') : (t('add_site') || 'Ajouter un site')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('check_interval') || 'Intervalle de vérification'} (minutes)
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
              {t('slow_threshold') || 'Seuil de lenteur'} (ms)
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alertEmail"
              checked={alertEmail}
              onChange={(e) => setAlertEmail(e.target.checked)}
              className="w-4 h-4 rounded border-default"
            />
            <label htmlFor="alertEmail" className="text-sm text-secondary">
              {t('alert_by_email') || 'M\'alerter par email si le site est down'}
            </label>
          </div>

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

