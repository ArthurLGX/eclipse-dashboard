'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  IconTrendingUp, 
  IconClock, 
  IconCheck, 
  IconX,
  IconAlertTriangle,
  IconActivity,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface MonitoringLog {
  id: number;
  status: 'up' | 'down' | 'slow';
  response_time: number | null;
  status_code: number | null;
  checked_at: string;
  error_message?: string;
}

interface MonitoringChartsProps {
  logs: MonitoringLog[];
}

// Couleurs pour les graphiques
const COLORS = {
  up: '#22c55e',
  down: '#ef4444',
  slow: '#f59e0b',
  primary: '#a855f7',
  secondary: '#6366f1',
  muted: '#64748b',
};

export default function MonitoringCharts({ logs }: MonitoringChartsProps) {
  const { t } = useLanguage();

  // Données pour le graphique de temps de réponse
  const responseTimeData = useMemo(() => {
    return logs
      .filter(log => log.response_time !== null)
      .slice(-100) // Derniers 100 points
      .map(log => ({
        time: new Date(log.checked_at).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        fullTime: new Date(log.checked_at).toLocaleString('fr-FR'),
        responseTime: log.response_time,
        status: log.status,
      }));
  }, [logs]);

  // Données pour le graphique de statut dans le temps (24h par défaut)
  const statusTimelineData = useMemo(() => {
    const last24h = logs.filter(log => {
      const logTime = new Date(log.checked_at).getTime();
      const now = Date.now();
      return now - logTime <= 24 * 60 * 60 * 1000;
    });

    // Grouper par heure
    const hourlyData: Record<string, { up: number; down: number; slow: number; total: number }> = {};
    
    last24h.forEach(log => {
      const hour = new Date(log.checked_at).toLocaleTimeString('fr-FR', { 
        hour: '2-digit',
        minute: '2-digit'
      });
      if (!hourlyData[hour]) {
        hourlyData[hour] = { up: 0, down: 0, slow: 0, total: 0 };
      }
      hourlyData[hour][log.status]++;
      hourlyData[hour].total++;
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour,
      uptime: Math.round((data.up / data.total) * 100),
      up: data.up,
      down: data.down,
      slow: data.slow,
    }));
  }, [logs]);

  // Statistiques générales
  const stats = useMemo(() => {
    if (logs.length === 0) {
      return {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        uptime24h: 100,
        uptime7d: 100,
        uptime30d: 100,
        totalChecks: 0,
        incidents24h: 0,
        currentStreak: 0,
      };
    }

    const now = Date.now();
    const last24h = logs.filter(l => now - new Date(l.checked_at).getTime() <= 24 * 60 * 60 * 1000);
    const last7d = logs.filter(l => now - new Date(l.checked_at).getTime() <= 7 * 24 * 60 * 60 * 1000);
    const last30d = logs.filter(l => now - new Date(l.checked_at).getTime() <= 30 * 24 * 60 * 60 * 1000);

    const responseTimes = logs.filter(l => l.response_time !== null).map(l => l.response_time!);
    
    // Calculer la série actuelle (streak) de statut "up"
    let currentStreak = 0;
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
    );
    for (const log of sortedLogs) {
      if (log.status === 'up') {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      avgResponseTime: responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      uptime24h: last24h.length > 0 
        ? Math.round((last24h.filter(l => l.status === 'up').length / last24h.length) * 100 * 100) / 100
        : 100,
      uptime7d: last7d.length > 0 
        ? Math.round((last7d.filter(l => l.status === 'up').length / last7d.length) * 100 * 100) / 100
        : 100,
      uptime30d: last30d.length > 0 
        ? Math.round((last30d.filter(l => l.status === 'up').length / last30d.length) * 100 * 100) / 100
        : 100,
      totalChecks: logs.length,
      incidents24h: last24h.filter(l => l.status === 'down').length,
      currentStreak,
    };
  }, [logs]);

  // Données pour le pie chart de distribution des statuts
  const statusDistribution = useMemo(() => {
    const counts = { up: 0, down: 0, slow: 0 };
    logs.forEach(log => counts[log.status]++);
    return [
      { name: 'En ligne', value: counts.up, color: COLORS.up },
      { name: 'Hors ligne', value: counts.down, color: COLORS.down },
      { name: 'Lent', value: counts.slow, color: COLORS.slow },
    ].filter(item => item.value > 0);
  }, [logs]);

  // Distribution des temps de réponse
  const responseDistribution = useMemo(() => {
    const buckets = [
      { range: '0-100ms', min: 0, max: 100, count: 0 },
      { range: '100-300ms', min: 100, max: 300, count: 0 },
      { range: '300-500ms', min: 300, max: 500, count: 0 },
      { range: '500-1s', min: 500, max: 1000, count: 0 },
      { range: '1-2s', min: 1000, max: 2000, count: 0 },
      { range: '>2s', min: 2000, max: Infinity, count: 0 },
    ];

    logs.forEach(log => {
      if (log.response_time !== null) {
        const bucket = buckets.find(b => log.response_time! >= b.min && log.response_time! < b.max);
        if (bucket) bucket.count++;
      }
    });

    return buckets;
  }, [logs]);

  // Incidents récents
  const recentIncidents = useMemo(() => {
    return logs
      .filter(log => log.status === 'down')
      .slice(0, 5)
      .map(log => ({
        time: new Date(log.checked_at).toLocaleString('fr-FR'),
        message: log.error_message || 'Site inaccessible',
        statusCode: log.status_code,
      }));
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <IconActivity className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('no_monitoring_data') || 'Aucune donnée de monitoring disponible'}</p>
        <p className="text-sm mt-2">{t('monitoring_data_hint') || 'Les données apparaîtront après les premières vérifications'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('uptime_24h') || 'Uptime 24h'}
          value={`${stats.uptime24h}%`}
          icon={<IconCheck className="w-5 h-5" />}
          color={stats.uptime24h >= 99 ? 'success' : stats.uptime24h >= 95 ? 'warning' : 'error'}
        />
        <StatCard
          title={t('avg_response_time') || 'Temps moyen'}
          value={`${stats.avgResponseTime}ms`}
          icon={<IconClock className="w-5 h-5" />}
          color={stats.avgResponseTime <= 500 ? 'success' : stats.avgResponseTime <= 1000 ? 'warning' : 'error'}
          subtitle={`Min: ${stats.minResponseTime}ms / Max: ${stats.maxResponseTime}ms`}
        />
        <StatCard
          title={t('incidents_24h') || 'Incidents 24h'}
          value={stats.incidents24h.toString()}
          icon={stats.incidents24h > 0 ? <IconAlertTriangle className="w-5 h-5" /> : <IconCheck className="w-5 h-5" />}
          color={stats.incidents24h === 0 ? 'success' : 'error'}
        />
        <StatCard
          title={t('current_streak') || 'Série en cours'}
          value={stats.currentStreak.toString()}
          icon={<IconTrendingUp className="w-5 h-5" />}
          color="primary"
          subtitle={t('consecutive_checks') || 'vérifications consécutives'}
        />
      </div>

      {/* Uptime Cards */}
      <div className="grid grid-cols-3 gap-4">
        <UptimeCard period="24h" value={stats.uptime24h} />
        <UptimeCard period="7j" value={stats.uptime7d} />
        <UptimeCard period="30j" value={stats.uptime30d} />
      </div>

      {/* Response Time Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <IconActivity className="w-5 h-5 text-accent" />
          {t('response_time_chart') || 'Temps de réponse'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={responseTimeData}>
              <defs>
                <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: number) => [`${value}ms`, 'Temps de réponse']}
              />
              <Area
                type="monotone"
                dataKey="responseTime"
                stroke={COLORS.primary}
                strokeWidth={2}
                fill="url(#responseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Timeline & Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Uptime Timeline */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconTrendingUp className="w-5 h-5 text-success" />
            {t('uptime_timeline') || 'Uptime (24h)'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statusTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9ca3af" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Uptime']}
                />
                <Line
                  type="monotone"
                  dataKey="uptime"
                  stroke={COLORS.up}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconActivity className="w-5 h-5 text-accent" />
            {t('status_distribution') || 'Distribution des statuts'}
          </h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 ml-4">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-secondary">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Response Time Distribution */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <IconClock className="w-5 h-5 text-warning" />
          {t('response_distribution') || 'Distribution des temps de réponse'}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={responseDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="range" 
                stroke="#9ca3af" 
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value, 'Vérifications']}
              />
              <Bar 
                dataKey="count" 
                fill={COLORS.secondary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Incidents */}
      {recentIncidents.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconX className="w-5 h-5 text-error" />
            {t('recent_incidents') || 'Incidents récents'}
          </h3>
          <div className="space-y-3">
            {recentIncidents.map((incident, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-error/10 border border-error/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <IconAlertTriangle className="w-5 h-5 text-error" />
                  <div>
                    <p className="text-sm text-primary">{incident.message}</p>
                    <p className="text-xs text-muted">{incident.time}</p>
                  </div>
                </div>
                {incident.statusCode && (
                  <span className="px-2 py-1 bg-error/20 text-error text-xs font-mono rounded">
                    HTTP {incident.statusCode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Composant StatCard
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'success' | 'warning' | 'error' | 'primary';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    error: 'bg-error-light text-error',
    primary: 'bg-accent-light text-accent',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted uppercase">{title}</p>
          <p className="text-xl font-bold text-primary">{value}</p>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// Composant UptimeCard
interface UptimeCardProps {
  period: string;
  value: number;
}

function UptimeCard({ period, value }: UptimeCardProps) {
  const getColor = (val: number) => {
    if (val >= 99.9) return 'text-success';
    if (val >= 99) return 'text-success';
    if (val >= 95) return 'text-warning';
    return 'text-error';
  };

  const getBarColor = (val: number) => {
    if (val >= 99.9) return 'bg-success';
    if (val >= 99) return 'bg-success';
    if (val >= 95) return 'bg-warning';
    return 'bg-error';
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted">Uptime {period}</span>
        <span className={`text-lg font-bold ${getColor(value)}`}>{value}%</span>
      </div>
      <div className="h-2 bg-elevated rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(value)} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

