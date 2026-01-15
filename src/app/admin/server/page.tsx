'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  IconServer,
  IconDatabase,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconActivity,
  IconDeviceSdCard,
  IconWorld,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import ToggleButton from '@/app/components/ToggleButton';

interface HealthStatus {
  status: 'ok' | 'error' | 'loading';
  timestamp: string;
  database: string;
  version: string;
  responseTime: number;
}

interface HealthHistory {
  timestamp: string;
  status: 'ok' | 'error';
  responseTime: number;
}

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function AdminServerPage() {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'loading',
    timestamp: '',
    database: '',
    version: '',
    responseTime: 0,
  });
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const { t } = useLanguage();

  const checkHealth = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const newHealth: HealthStatus = {
          ...data,
          responseTime,
        };
        setHealth(newHealth);

        setHealthHistory(prev => [
          { timestamp: data.timestamp, status: 'ok', responseTime },
          ...prev.slice(0, 59),
        ]);
      } else {
        setHealth({
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'unknown',
          version: 'unknown',
          responseTime,
        });
        setHealthHistory(prev => [
          { timestamp: new Date().toISOString(), status: 'error', responseTime },
          ...prev.slice(0, 59),
        ]);
      }
    } catch {
      const responseTime = Date.now() - startTime;
      setHealth({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        version: 'unknown',
        responseTime,
      });
      setHealthHistory(prev => [
        { timestamp: new Date().toISOString(), status: 'error', responseTime },
        ...prev.slice(0, 59),
      ]);
    }
  };

  useEffect(() => {
    checkHealth();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(checkHealth, refreshInterval * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-success';
      case 'error': return 'text-danger';
      default: return 'text-warning';
    }
  };

  const   getStatusBgColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-page border-muted';
      case 'error': return 'bg-danger-light border-danger';
      default: return 'bg-warning-light border-warning';
    }
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-success';
    if (ms < 300) return 'text-info';
    if (ms < 500) return 'text-warning';
    return 'text-danger';
  };

  const uptime = healthHistory.filter(h => h.status === 'ok').length / Math.max(healthHistory.length, 1) * 100;
  const avgResponseTime = healthHistory.length > 0
    ? Math.round(healthHistory.reduce((sum, h) => sum + h.responseTime, 0) / healthHistory.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <IconServer className="w-7 h-7 !text-accent" />
            {t('server_monitoring') || 'Monitoring Serveur'}
          </h1>
          <p className="text-sm text-muted">{t('realtime_monitoring') || 'Surveillance en temps réel de votre infrastructure'}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-refresh toggle */}
          <ToggleButton
            checked={autoRefresh}
            onChange={setAutoRefresh}
            label={t('auto_refresh') || 'Auto-refresh'}
            labelPosition="left"
            variant="success"
          />

          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="input w-24 text-sm"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          )}

          <button
            onClick={checkHealth}
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-hover ease-in-out duration-300"
          >
            <IconRefresh className="w-4 h-4" />
            {t('check') || 'Vérifier'}
          </button>
        </div>
      </div>

      {/* Main Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl p-8 border-2 ${getStatusBgColor(health.status)}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-full ${
              health.status === 'ok' ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {health.status === 'ok' ? (
                <IconCheck className="w-12 h-12 text-success" />
              ) : health.status === 'error' ? (
                <IconX className="w-12 h-12 text-danger" />
              ) : (
                <IconAlertTriangle className="w-12 h-12 text-warning animate-pulse" />
              )}
            </div>
            <div>
              <h2 className={`text-3xl font-bold ${getStatusColor(health.status)}`}>
                {health.status === 'ok' ? t('operational') || 'Opérationnel' :
                 health.status === 'error' ? t('issue_detected') || 'Problème détecté' :
                 t('checking') || 'Vérification...'}
              </h2>
              <p className="text-muted">
                {t('last_check') || 'Dernière vérification'} : {health.timestamp
                  ? new Date(health.timestamp).toLocaleString('fr-FR')
                  : t('in_progress') || 'En cours...'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-card rounded-lg border border-muted">
              <p className="text-xs text-muted mb-1">{t('uptime') || 'Uptime'}</p>
              <p className={`text-2xl font-bold ${uptime >= 99 ? 'text-success' : uptime >= 95 ? 'text-warning' : 'text-danger'}`}>
                {uptime.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-muted">
              <p className="text-xs text-muted mb-1">{t('avg_response') || 'Réponse moy.'}</p>
              <p className={`text-2xl font-bold ${getResponseTimeColor(avgResponseTime)}`}>
                {avgResponseTime}ms
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-muted">
              <p className="text-xs text-muted mb-1">{t('checks') || 'Checks'}</p>
              <p className="text-2xl font-bold text-primary">{healthHistory.length}</p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-muted">
              <p className="text-xs text-muted mb-1">{t('errors') || 'Erreurs'}</p>
              <p className={`text-2xl font-bold ${
                healthHistory.filter(h => h.status === 'error').length > 0 ? 'text-danger' : 'text-success'
              }`}>
                {healthHistory.filter(h => h.status === 'error').length}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            name: 'API Strapi',
            status: health.status,
            detail: health.version || 'N/A',
            icon: IconServer,
            metric: `${health.responseTime}ms`,
          },
          {
            name: t('database') || 'Base de données',
            status: health.database === 'connected' ? 'ok' : 'error',
            detail: health.database === 'connected' ? 'MySQL connectée' : t('disconnected') || 'Déconnectée',
            icon: IconDatabase,
            metric: health.database === 'connected' ? 'OK' : t('error') || 'Erreur',
          },
          {
            name: 'API Frontend',
            status: 'ok',
            detail: 'Next.js 15',
            icon: IconWorld,
            metric: t('active') || 'Actif',
          },
          {
            name: t('storage') || 'Stockage',
            status: 'ok',
            detail: t('local_uploads') || 'Uploads locaux',
            icon: IconDeviceSdCard,
            metric: 'OK',
          },
        ].map((service, index) => {
          const Icon = service.icon;
          return (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="card p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  service.status === 'ok' ? 'bg-success-light' : 'bg-danger-light'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    service.status === 'ok' ? 'text-success' : 'text-danger'
                  }`} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  service.status === 'ok' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                }`}>
                  {service.status === 'ok' ? (
                    <><IconCheck className="w-3 h-3" /> OK</>
                  ) : (
                    <><IconX className="w-3 h-3" /> {t('error') || 'Erreur'}</>
                  )}
                </span>
              </div>
              <h3 className="font-semibold text-primary mb-1">{service.name}</h3>
              <p className="text-sm text-muted mb-2">{service.detail}</p>
              <p className={`text-lg font-bold ${getResponseTimeColor(
                service.metric.includes('ms') ? parseInt(service.metric) : 0
              )}`}>
                {service.metric}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Response Time Graph (Simple) */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            <IconActivity className="w-5 h-5 !text-accent" />
            {t('response_time') || 'Temps de réponse'}
          </h2>
          <span className="text-sm text-muted">
            {healthHistory.length} {t('last_checks') || 'dernières vérifications'}
          </span>
        </div>

        {healthHistory.length > 0 ? (
          <div className="h-32 flex items-end gap-1">
            {healthHistory.slice(0, 30).reverse().map((h, i) => {
              const maxHeight = Math.max(...healthHistory.map(x => x.responseTime), 100);
              const height = (h.responseTime / maxHeight) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      h.status === 'ok'
                        ? h.responseTime < 200 ? 'bg-success' : h.responseTime < 500 ? 'bg-warning' : 'bg-danger'
                        : 'bg-danger'
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block">
                    <div className="bg-card border border-muted rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                      <p className="font-medium">{h.responseTime}ms</p>
                      <p className="text-muted">
                        {new Date(h.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted">
            {t('no_data_available') || 'Aucune donnée disponible'}
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" /> &lt;200ms
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" /> 200-500ms
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-danger" /> &gt;500ms
          </span>
        </div>
      </div>

      {/* Recent History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">{t('recent_history') || 'Historique récent'}</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {healthHistory.slice(0, 10).map((h, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg ${
                h.status === 'ok' ? 'bg-success-light' : 'bg-danger-light'
              }`}
            >
              <div className="flex items-center gap-3">
                {h.status === 'ok' ? (
                  <IconCheck className="w-4 h-4 text-success" />
                ) : (
                  <IconX className="w-4 h-4 text-danger" />
                )}
                <span className="text-sm text-primary">
                  {h.status === 'ok' ? t('server_operational') || 'Serveur opérationnel' : t('error_detected') || 'Erreur détectée'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${getResponseTimeColor(h.responseTime)}`}>
                  {h.responseTime}ms
                </span>
                <span className="text-xs text-muted">
                  {new Date(h.timestamp).toLocaleTimeString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoint */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">{t('health_endpoint') || 'Endpoint de santé'}</h2>
        <div className="flex items-center gap-4 p-4 bg-muted/5 rounded-lg border border-muted">
          <code className="flex-1 text-sm !text-accent font-mono">
            GET {API_URL}/api/health
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${API_URL}/api/health`)}
            className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-[var(--color-accent)]"
          >
            {t('copy') || 'Copier'}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          {t('use_endpoint_for_monitoring') || 'Utilisez cet endpoint pour configurer votre monitoring externe (UptimeRobot, Pingdom, etc.)'}
        </p>
      </div>
    </motion.div>
  );
}
