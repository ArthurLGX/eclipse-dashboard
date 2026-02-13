'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconCalendar,
  IconBrandGoogle,
  IconBrandWindows,
  IconLink,
  IconUnlink,
  IconCheck,
  IconAlertCircle,
  IconExternalLink,
  IconRefresh,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface CalendarProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
  email?: string;
  lastSync?: string;
  setupUrl: string;
  description: string;
}

export default function CalendarIntegrationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [loading, setLoading] = useState<string | null>(null);
  const [providers, setProviders] = useState<CalendarProvider[]>([
    {
      id: 'google',
      name: 'Google Calendar',
      icon: <IconBrandGoogle className="w-6 h-6" />,
      color: '#4285F4',
      connected: false,
      setupUrl: 'https://console.cloud.google.com/apis/credentials',
      description: 'Synchronisez vos événements Google Calendar',
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      icon: <IconBrandWindows className="w-6 h-6" />,
      color: '#0078D4',
      connected: false,
      setupUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
      description: 'Connectez votre calendrier Outlook/Office 365',
    },
    {
      id: 'caldav',
      name: 'CalDAV (iCloud, Fastmail...)',
      icon: <IconCalendar className="w-6 h-6" />,
      color: '#8B5CF6',
      connected: false,
      setupUrl: '',
      description: 'Protocole standard pour calendriers (iCloud, Fastmail, Nextcloud...)',
    },
  ]);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [user?.id]);

  const checkConnectionStatus = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/calendar/status?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setProviders(prev => prev.map(provider => ({
          ...provider,
          connected: data[provider.id]?.connected || false,
          email: data[provider.id]?.email,
          lastSync: data[provider.id]?.lastSync,
        })));
      }
    } catch (error) {
      console.error('Failed to check calendar status:', error);
    }
  };

  const handleConnect = async (providerId: string) => {
    setLoading(providerId);
    
    try {
      // Redirect to OAuth flow
      const response = await fetch(`/api/calendar/${providerId}/auth?userId=${user?.id}`);
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      showGlobalPopup(t('connection_error') || 'Erreur de connexion', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    setLoading(providerId);
    
    try {
      const response = await fetch(`/api/calendar/${providerId}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      if (response.ok) {
        setProviders(prev => prev.map(provider => 
          provider.id === providerId 
            ? { ...provider, connected: false, email: undefined, lastSync: undefined }
            : provider
        ));
        showGlobalPopup(t('disconnected') || 'Déconnecté', 'success');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      showGlobalPopup(t('error') || 'Erreur', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleSync = async (providerId: string) => {
    setLoading(providerId);
    
    try {
      const response = await fetch(`/api/calendar/${providerId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        showGlobalPopup(
          `${data.imported || 0} événements synchronisés`,
          'success'
        );
        checkConnectionStatus();
      }
    } catch (error) {
      console.error('Sync error:', error);
      showGlobalPopup(t('sync_error') || 'Erreur de synchronisation', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="pb-4">
          <h1 className="text-2xl font-bold !text-primary flex items-center gap-2">
            <IconCalendar className="w-7 h-7 !text-accent" />
            {t('calendar_integrations') || 'Intégrations calendrier'}
          </h1>
          <p className="text-muted !text-sm mt-1">
            {t('calendar_integrations_desc') || 'Connectez vos calendriers externes pour synchroniser vos événements'}
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="card p-4 bg-info-light border-info">
          <div className="flex items-start gap-3">
            <IconAlertCircle className="w-5 h-5 !text-info flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium !text-info mb-2">
                {t('setup_required') || 'Configuration requise'}
              </p>
              <p className="text-secondary mb-3">
                {t('oauth_setup_info') || 'Pour connecter vos calendriers, vous devez configurer les identifiants OAuth dans votre fichier .env.local:'}
              </p>
              <div className="bg-card p-3  font-mono !text-xs space-y-1 overflow-x-auto">
                <p className="text-muted"># Google Calendar</p>
                <p>GOOGLE_CLIENT_ID=votre_client_id</p>
                <p>GOOGLE_CLIENT_SECRET=votre_client_secret</p>
                <p className="text-muted mt-2"># Microsoft/Outlook</p>
                <p>MICROSOFT_CLIENT_ID=votre_client_id</p>
                <p>MICROSOFT_CLIENT_SECRET=votre_client_secret</p>
              </div>
            </div>
          </div>
        </div>

        {/* Providers List */}
        <div className="space-y-4">
          {providers.map((provider) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3 "
                    style={{ backgroundColor: `${provider.color}20` }}
                  >
                    <div style={{ color: provider.color }}>
                      {provider.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold !text-primary flex items-center gap-2">
                      {provider.name}
                      {provider.connected && (
                        <span className="flex items-center gap-1 !text-xs !text-success-text -text bg-success-light px-2 py-0.5 rounded-full">
                          <IconCheck className="w-3 h-3" />
                          {t('connected') || 'Connecté'}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm !text-muted mt-0.5">
                      {provider.description}
                    </p>
                    {provider.connected && provider.email && (
                      <p className="!text-xs !text-secondary mt-2">
                        {provider.email}
                        {provider.lastSync && (
                          <span className="text-muted ml-2">
                            • {t('last_sync') || 'Dernière sync'}: {new Date(provider.lastSync).toLocaleString('fr-FR')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {provider.setupUrl && !provider.connected && (
                    <a
                      href={provider.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost px-3 py-2 !text-sm flex items-center gap-1"
                    >
                      <IconExternalLink className="w-4 h-4" />
                      {t('setup') || 'Config'}
                    </a>
                  )}
                  
                  {provider.connected ? (
                    <>
                      <button
                        onClick={() => handleSync(provider.id)}
                        disabled={loading === provider.id}
                        className="btn-ghost px-3 py-2 !text-sm flex items-center gap-1"
                      >
                        <IconRefresh className={`w-4 h-4 ${loading === provider.id ? 'animate-spin' : ''}`} />
                        {t('sync') || 'Sync'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        disabled={loading === provider.id}
                        className="btn-ghost px-3 py-2 !text-sm flex items-center gap-1 !text-error hover:bg-error/10"
                      >
                        <IconUnlink className="w-4 h-4" />
                        {t('disconnect') || 'Déconnecter'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={loading === provider.id}
                      className="btn-primary px-4 py-2 !text-sm flex items-center gap-2 "
                    >
                      {loading === provider.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconLink className="w-4 h-4" />
                      )}
                      {t('connect') || 'Connecter'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Documentation Links */}
        <div className="card p-5">
          <h3 className="font-semibold !text-primary mb-4">
            {t('setup_guides') || 'Guides de configuration'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted  hover:bg-muted transition-colors"
            >
              <IconBrandGoogle className="w-5 h-5 !text-[#4285F4]" />
              <div>
                <p className="font-medium !text-primary !text-sm">Google Cloud Console</p>
                <p className="!text-xs !text-muted">Créer les identifiants OAuth</p>
              </div>
              <IconExternalLink className="w-4 h-4 !text-muted ml-auto" />
            </a>
            <a
              href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted  hover:bg-muted transition-colors"
            >
              <IconBrandWindows className="w-5 h-5 !text-[#0078D4]" />
              <div>
                <p className="font-medium !text-primary !text-sm">Azure Portal</p>
                <p className="!text-xs !text-muted">Enregistrer une application</p>
              </div>
              <IconExternalLink className="w-4 h-4 !text-muted ml-auto" />
            </a>
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}

