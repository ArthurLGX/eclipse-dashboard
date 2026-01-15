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
  IconChartLine,
  IconChartBar,
  IconChartPie,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTheme } from '@/app/context/ThemeContext';

interface MonitoringLog {
  id: number;
  status: 'up' | 'down' | 'slow';
  response_time: number | null;
  status_code: number | null;
  checked_at: string;
  error_message?: string | null;
}

interface MonitoringChartsProps {
  logs: MonitoringLog[];
}

// Couleurs par thème
const THEME_COLORS = {
  dark: {
    textPrimary: '#E8E4F0',
    textSecondary: '#A89EC8',
    textMuted: '#7B6F9E',
    accent: '#7C3AED',
    success: '#34D399',
    info: '#60A5FA',
    warning: '#FBBF24',
    danger: '#F87171',
    bgCard: '#1A1428',
    borderDefault: '#2E2648',
  },
  light: {
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    accent: '#7C3AED',
    success: '#34dba6',
    info: '#3B82F6',
    warning: '#F59E0B',
    danger: '#EF4444',
    bgCard: '#FFFFFF',
    borderDefault: '#E5E7EB',
  },
  brutalistDark: {
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textMuted: '#707070',
    accent: '#FFFFFF',
    success: '#B0B0B0',
    info: '#909090',
    warning: '#808080',
    danger: '#FFFFFF',
    bgCard: '#141414',
    borderDefault: '#444444',
  },
  brutalistLight: {
    textPrimary: '#000000',
    textSecondary: '#333333',
    textMuted: '#666666',
    accent: '#000000',
    success: '#404040',
    info: '#505050',
    warning: '#606060',
    danger: '#000000',
    bgCard: '#FAFAFA',
    borderDefault: '#000000',
  },
};

// Hook pour récupérer les couleurs du thème
function useThemeColors() {
  const { resolvedMode, themeStyle } = useTheme();
  
  // Retourne directement les couleurs basées sur le thème résolu
  const colors = useMemo(() => {
    if (themeStyle === 'brutalist') {
      return resolvedMode === 'light' ? THEME_COLORS.brutalistLight : THEME_COLORS.brutalistDark;
    }
    return resolvedMode === 'light' ? THEME_COLORS.light : THEME_COLORS.dark;
  }, [resolvedMode, themeStyle]);

  return colors;
}

export default function MonitoringCharts({ logs }: MonitoringChartsProps) {
  const { t } = useLanguage();
  const themeColors = useThemeColors();

  // Données pour le graphique de temps de réponse
  const responseTimeData = useMemo(() => {
    return logs
      .filter(log => log.response_time !== null)
      .slice(-50) // Derniers 50 points pour plus de lisibilité
      .map(log => ({
        time: new Date(log.checked_at).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
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
      });
      if (!hourlyData[hour]) {
        hourlyData[hour] = { up: 0, down: 0, slow: 0, total: 0 };
      }
      hourlyData[hour][log.status]++;
      hourlyData[hour].total++;
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour,
      uptime: data.total > 0 ? Math.round((data.up / data.total) * 100) : 100,
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
      { name: t('online') || 'En ligne', value: counts.up, color: themeColors.success },
      { name: t('offline') || 'Hors ligne', value: counts.down, color: themeColors.danger },
      { name: t('slow') || 'Lent', value: counts.slow, color: themeColors.warning },
    ].filter(item => item.value > 0);
  }, [logs, themeColors, t]);

  // Distribution des temps de réponse
  const responseDistribution = useMemo(() => {
    const buckets = [
      { range: '0-100', min: 0, max: 100, count: 0 },
      { range: '100-300', min: 100, max: 300, count: 0 },
      { range: '300-500', min: 300, max: 500, count: 0 },
      { range: '500-1k', min: 500, max: 1000, count: 0 },
      { range: '1k-2k', min: 1000, max: 2000, count: 0 },
      { range: '>2k', min: 2000, max: Infinity, count: 0 },
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
        message: log.error_message || t('site_unavailable') || 'Site inaccessible',
        statusCode: log.status_code,
      }));
  }, [logs, t]);

  const lightGridColor = `${themeColors.borderDefault}33`;
  const tickColor = themeColors.textMuted;

  if (logs.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-8 text-center"
      >
        <IconActivity className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
        <p className="text-muted">{t('no_monitoring_data') || 'Aucune donnée de monitoring disponible'}</p>
        <p className="text-sm text-muted mt-2">{t('monitoring_data_hint') || 'Les données apparaîtront après les premières vérifications'}</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs - Grille compacte */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: IconCheck, label: t('uptime_24h') || 'Uptime 24h', value: `${stats.uptime24h}%`, color: stats.uptime24h >= 99 ? 'text-success' : stats.uptime24h >= 95 ? 'text-warning' : 'text-danger' },
          { icon: IconClock, label: t('avg_response_time') || 'Temps moyen', value: `${stats.avgResponseTime}ms`, subvalue: `Min: ${stats.minResponseTime}ms / Max: ${stats.maxResponseTime}ms`, color: stats.avgResponseTime <= 500 ? 'text-success' : stats.avgResponseTime <= 1000 ? 'text-warning' : 'text-danger' },
          { icon: IconAlertTriangle, label: t('incidents_24h') || 'Incidents 24h', value: stats.incidents24h.toString(), color: stats.incidents24h === 0 ? 'text-success' : 'text-danger' },
          { icon: IconTrendingUp, label: t('current_streak') || 'Série en cours', value: stats.currentStreak.toString(), subvalue: t('consecutive_checks') || 'vérif. consécutives', color: 'text-accent' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-muted">{kpi.label}</span>
            </div>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            {kpi.subvalue && <p className="text-xs text-muted">{kpi.subvalue}</p>}
          </motion.div>
        ))}
      </div>

      {/* Barres d'uptime */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { period: '24h', value: stats.uptime24h },
          { period: '7j', value: stats.uptime7d },
          { period: '30j', value: stats.uptime30d },
        ].map((item, i) => (
          <motion.div
            key={item.period}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">Uptime {item.period}</span>
              <span className={`text-sm font-bold ${
                item.value >= 99.9 ? 'text-success' : item.value >= 95 ? 'text-warning' : 'text-danger'
              }`}>{item.value}%</span>
            </div>
            <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  item.value >= 99.9 ? 'bg-success' : item.value >= 95 ? 'bg-warning' : 'bg-danger'
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Graphiques - Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Courbe temps de réponse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconChartLine className="w-4 h-4 !text-accent" />
            <span className="text-sm font-medium text-primary">{t('response_time_chart') || 'Temps de réponse'}</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseTimeData}>
                <defs>
                  <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColors.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={themeColors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={lightGridColor} />
                <XAxis 
                  dataKey="time" 
                  stroke={tickColor} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke={tickColor} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: `${themeColors.bgCard}F2`,
                    border: `1px solid ${themeColors.borderDefault}`,
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: themeColors.textPrimary }}
                  itemStyle={{ color: themeColors.textPrimary }}
                  formatter={(value) => [`${value}ms`, t('time_label') || 'Temps']}
                />
                <Area
                  type="monotone"
                  dataKey="responseTime"
                  stroke={themeColors.accent}
                  strokeWidth={2}
                  fill="url(#responseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Barres uptime par heure */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconChartBar className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-primary">{t('uptime_timeline') || 'Uptime par heure'}</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statusTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke={lightGridColor} />
                <XAxis 
                  dataKey="hour" 
                  stroke={tickColor} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke={tickColor} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: `${themeColors.bgCard}F2`,
                    border: `1px solid ${themeColors.borderDefault}`,
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: themeColors.textPrimary }}
                  itemStyle={{ color: themeColors.textPrimary }}
                  formatter={(value) => [`${value}%`, 'Uptime']}
                />
                <Line
                  type="monotone"
                  dataKey="uptime"
                  stroke={themeColors.success}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Camembert statuts */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="card p-4 md:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconChartPie className="w-4 h-4 text-info" />
            <span className="text-sm font-medium text-primary">{t('status_distribution') || 'Statuts'}</span>
          </div>
          <div className="h-40 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: `${themeColors.bgCard}F2`,
                    border: `1px solid ${themeColors.borderDefault}`,
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: themeColors.textPrimary }}
                  itemStyle={{ color: themeColors.textPrimary }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Distribution temps de réponse */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <IconClock className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium text-primary">{t('response_distribution') || 'Distribution temps de réponse (ms)'}</span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={responseDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={lightGridColor} />
              <XAxis 
                dataKey="range" 
                stroke={tickColor} 
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={tickColor} 
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: `${themeColors.bgCard}F2`,
                  border: `1px solid ${themeColors.borderDefault}`,
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                labelStyle={{ color: themeColors.textPrimary }}
                itemStyle={{ color: themeColors.textPrimary }}
                formatter={(value) => [value, t('checks') || 'Vérifications']}
              />
              <Bar 
                dataKey="count" 
                fill={`${themeColors.info}99`}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Incidents récents */}
      {recentIncidents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconX className="w-4 h-4 text-danger" />
            <span className="text-sm font-medium text-primary">{t('recent_incidents') || 'Incidents récents'}</span>
            <span className="text-xs text-muted">({recentIncidents.length})</span>
          </div>
          <div className="space-y-2">
            {recentIncidents.map((incident, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-danger-light border border-danger rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 text-danger" />
                  <div>
                    <p className="text-xs text-primary">{incident.message}</p>
                    <p className="text-xs text-muted">{incident.time}</p>
                  </div>
                </div>
                {incident.statusCode && (
                  <span className="px-1.5 py-0.5 bg-danger-light text-danger text-xs font-mono rounded">
                    HTTP {incident.statusCode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
