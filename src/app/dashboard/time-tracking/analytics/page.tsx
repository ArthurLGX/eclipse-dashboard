'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconClock,
  IconTrendingUp,
  IconTrendingDown,
  IconTarget,
  IconChartBar,
  IconArrowLeft,
  IconCalendar,
  IconBriefcase,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { fetchTimeEntries } from '@/lib/api';
import type { TimeEntry } from '@/types';
import useSWR from 'swr';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Configuration globale des fonts Chart.js
ChartJS.defaults.font.family = "'Manrope', sans-serif";

// Hook pour récupérer les couleurs du thème CSS
function useThemeColors() {
  const { resolvedMode } = useTheme();
  const [colors, setColors] = useState({
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
  });

  const updateColors = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    
    setColors({
      textPrimary: styles.getPropertyValue('--text-primary').trim() || '#E8E4F0',
      textSecondary: styles.getPropertyValue('--text-secondary').trim() || '#A89EC8',
      textMuted: styles.getPropertyValue('--text-muted').trim() || '#7B6F9E',
      accent: styles.getPropertyValue('--color-accent').trim() || '#7C3AED',
      success: styles.getPropertyValue('--color-success').trim() || '#34D399',
      info: styles.getPropertyValue('--color-info').trim() || '#60A5FA',
      warning: styles.getPropertyValue('--color-warning').trim() || '#FBBF24',
      danger: styles.getPropertyValue('--color-danger').trim() || '#F87171',
      bgCard: styles.getPropertyValue('--bg-card').trim() || '#1A1428',
      borderDefault: styles.getPropertyValue('--border-default').trim() || '#2E2648',
    });
  }, []);

  useEffect(() => {
    updateColors();
  }, [resolvedMode, updateColors]);

  return colors;
}

export default function TimeTrackingAnalyticsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const themeColors = useThemeColors();
  const [dateRange, setDateRange] = useState<'week' | 'month' | '3months' | 'year'>('month');

  // Calculate date range
  const dateFilter = useMemo(() => {
    const now = new Date();
    const from = new Date();
    
    switch (dateRange) {
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        from.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { from: from.toISOString(), to: now.toISOString() };
  }, [dateRange]);

  // Fetch time entries
  const { data: entries, isLoading } = useSWR(
    user?.id ? ['time-entries-analytics', user.id, dateRange] : null,
    () => fetchTimeEntries(user!.id, dateFilter),
    { refreshInterval: 60000 }
  );

  // Format duration
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }, []);

  // Analyse des données
  const analytics = useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        totalTime: 0,
        totalEstimated: 0,
        avgAccuracy: 0,
        overestimatedCount: 0,
        underestimatedCount: 0,
        accurateCount: 0,
        completedTasks: 0,
        exceededTasks: 0,
        dailyData: [],
        projectData: [],
        accuracyData: [],
        groupedDeviations: [],
        statusDistribution: { completed: 0, exceeded: 0, active: 0 },
      };
    }

    let totalTime = 0;
    let totalEstimated = 0;
    let overestimatedCount = 0;
    let underestimatedCount = 0;
    let accurateCount = 0;
    let completedTasks = 0;
    let exceededTasks = 0;

    const entriesWithEstimate = entries.filter(e => e.estimated_duration && e.duration);
    const accuracyByEntry: { entry: TimeEntry; accuracy: number; diff: number }[] = [];

    // Regrouper les entrées par projet pour éviter les doublons
    const projectDeviations = new Map<string, { 
      projectId: string;
      projectName: string;
      taskName: string;
      totalActual: number;
      totalEstimated: number;
      entries: TimeEntry[];
    }>();

    entriesWithEstimate.forEach(entry => {
      const actual = entry.duration || 0;
      const estimated = entry.estimated_duration || 0;
      const diff = actual - estimated;
      const accuracy = estimated > 0 ? (actual / estimated) * 100 : 100;
      
      totalTime += actual;
      totalEstimated += estimated;
      
      // Regrouper par projet si un projet est associé
      const projectKey = entry.project?.documentId || `task-${entry.documentId}`;
      const existing = projectDeviations.get(projectKey);
      
      if (existing) {
        existing.totalActual += actual;
        existing.totalEstimated += estimated;
        existing.entries.push(entry);
        // Garder la description de la tâche la plus récente
        if (!existing.taskName && entry.description) {
          existing.taskName = entry.description;
        }
      } else {
        projectDeviations.set(projectKey, {
          projectId: projectKey,
          projectName: entry.project?.title || '',
          taskName: entry.description || '',
          totalActual: actual,
          totalEstimated: estimated,
          entries: [entry],
        });
      }

      // Pour les stats individuelles (inchangé)
      accuracyByEntry.push({ entry, accuracy, diff });

      // Tolérance de 10%
      if (accuracy > 110) {
        underestimatedCount++; // Tâche a pris plus de temps que prévu
      } else if (accuracy < 90) {
        overestimatedCount++; // Tâche a pris moins de temps que prévu
      } else {
        accurateCount++;
      }
    });

    // Calculer les écarts par projet/tâche regroupé
    const groupedDeviations = Array.from(projectDeviations.values()).map(group => {
      const diff = group.totalActual - group.totalEstimated;
      const accuracy = group.totalEstimated > 0 ? (group.totalActual / group.totalEstimated) * 100 : 100;
      return {
        projectId: group.projectId,
        projectName: group.projectName,
        taskName: group.taskName,
        diff,
        accuracy,
        totalActual: group.totalActual,
        totalEstimated: group.totalEstimated,
        entryCount: group.entries.length,
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10);

    // Status distribution
    entries.forEach(entry => {
      if (entry.timer_status === 'completed') completedTasks++;
      else if (entry.timer_status === 'exceeded') exceededTasks++;
    });

    // Group by day for chart
    const dailyMap = new Map<string, { actual: number; estimated: number }>();
    entries.forEach(entry => {
      const date = new Date(entry.start_time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const current = dailyMap.get(date) || { actual: 0, estimated: 0 };
      dailyMap.set(date, {
        actual: current.actual + (entry.duration || 0),
        estimated: current.estimated + (entry.estimated_duration || 0),
      });
    });
    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      });

    // Group by project
    const projectMap = new Map<string, { name: string; actual: number; estimated: number }>();
    entries.forEach(entry => {
      const projectName = entry.project?.title || t('no_project') || 'Sans projet';
      const key = entry.project?.documentId || 'no-project';
      const current = projectMap.get(key) || { name: projectName, actual: 0, estimated: 0 };
      projectMap.set(key, {
        name: projectName,
        actual: current.actual + (entry.duration || 0),
        estimated: current.estimated + (entry.estimated_duration || 0),
      });
    });
    const projectData = Array.from(projectMap.values())
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 6);

    // Average accuracy
    const avgAccuracy = entriesWithEstimate.length > 0
      ? accuracyByEntry.reduce((sum, { accuracy }) => sum + accuracy, 0) / entriesWithEstimate.length
      : 100;

    return {
      totalTime,
      totalEstimated,
      avgAccuracy,
      overestimatedCount,
      underestimatedCount,
      accurateCount,
      completedTasks,
      exceededTasks,
      dailyData,
      projectData,
      accuracyData: accuracyByEntry.sort((a, b) => b.diff - a.diff).slice(0, 10),
      groupedDeviations,
      statusDistribution: { 
        completed: completedTasks, 
        exceeded: exceededTasks, 
        active: entries.length - completedTasks - exceededTasks 
      },
    };
  }, [entries, t]);

  // Chart configurations
  const dailyChartData = useMemo(() => ({
    labels: analytics.dailyData.map(d => d.date),
    datasets: [
      {
        label: t('actual_time') || 'Temps réel',
        data: analytics.dailyData.map(d => Math.round(d.actual / 60 * 10) / 10),
        backgroundColor: themeColors.accent,
        borderColor: themeColors.accent,
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: t('estimated_time') || 'Temps estimé',
        data: analytics.dailyData.map(d => Math.round(d.estimated / 60 * 10) / 10),
        backgroundColor: themeColors.warning + '60',
        borderColor: themeColors.warning,
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  }), [analytics.dailyData, themeColors, t]);

  const projectChartData = useMemo(() => ({
    labels: analytics.projectData.map(p => p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name),
    datasets: [
      {
        label: t('actual_time') || 'Temps réel (h)',
        data: analytics.projectData.map(p => Math.round(p.actual / 60 * 10) / 10),
        backgroundColor: themeColors.accent,
        borderRadius: 6,
      },
      {
        label: t('estimated_time') || 'Temps estimé (h)',
        data: analytics.projectData.map(p => Math.round(p.estimated / 60 * 10) / 10),
        backgroundColor: themeColors.info + '60',
        borderRadius: 6,
      },
    ],
  }), [analytics.projectData, themeColors, t]);

  const statusChartData = useMemo(() => ({
    labels: [
      t('completed') || 'Terminées',
      t('exceeded') || 'Dépassées', 
      t('in_progress') || 'En cours',
    ],
    datasets: [{
      data: [
        analytics.statusDistribution.completed,
        analytics.statusDistribution.exceeded,
        analytics.statusDistribution.active,
      ],
      backgroundColor: [
        themeColors.success,
        themeColors.danger,
        themeColors.warning,
      ],
      borderWidth: 0,
    }],
  }), [analytics.statusDistribution, themeColors, t]);

  const accuracyChartData = useMemo(() => ({
    labels: [
      t('underestimated') || 'Sous-estimées',
      t('accurate') || 'Précises',
      t('overestimated') || 'Sur-estimées',
    ],
    datasets: [{
      data: [
        analytics.underestimatedCount,
        analytics.accurateCount,
        analytics.overestimatedCount,
      ],
      backgroundColor: [
        themeColors.danger,
        themeColors.success,
        themeColors.info,
      ],
      borderWidth: 0,
    }],
  }), [analytics, themeColors, t]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: themeColors.textSecondary,
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: themeColors.bgCard,
        titleColor: themeColors.textPrimary,
        bodyColor: themeColors.textSecondary,
        borderColor: themeColors.borderDefault,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: themeColors.textMuted },
        grid: { color: themeColors.borderDefault + '30' },
      },
      y: {
        ticks: { color: themeColors.textMuted },
        grid: { color: themeColors.borderDefault + '30' },
      },
    },
  }), [themeColors]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: themeColors.textSecondary,
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: themeColors.bgCard,
        titleColor: themeColors.textPrimary,
        bodyColor: themeColors.textSecondary,
        borderColor: themeColors.borderDefault,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    cutout: '60%',
  }), [themeColors]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy > 110) return 'text-danger';
    if (accuracy < 90) return 'text-info';
    return 'text-success';
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy > 110) return <IconTrendingUp className="w-4 h-4 text-danger" />;
    if (accuracy < 90) return <IconTrendingDown className="w-4 h-4 text-info" />;
    return <IconTarget className="w-4 h-4 !text-success-text -text" />;
  };

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/time-tracking"
              className="p-2 rounded-lg border border-default text-muted hover:text-primary hover:bg-hover transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <IconChartBar className="w-7 h-7 !text-accent" />
                {t('time_analytics') || 'Analyse du temps'}
              </h1>
              <p className="text-muted text-sm mt-1">
                {t('time_analytics_desc') || 'Évaluez la précision de vos estimations'}
              </p>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['week', 'month', '3months', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {range === 'week' ? (t('week') || '7 jours') :
                 range === 'month' ? (t('month') || '30 jours') :
                 range === '3months' ? (t('three_months') || '3 mois') :
                 (t('year') || 'Année')}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="animate-spin w-10 h-10 border-3 border-accent border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent-light rounded-xl">
                    <IconClock className="w-6 h-6 !text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{formatDuration(analytics.totalTime)}</p>
                    <p className="!text-xs text-muted">{t('total_tracked') || 'Temps total suivi'}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-warning-light rounded-xl">
                    <IconCalendar className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">{formatDuration(analytics.totalEstimated)}</p>
                    <p className="!text-xs text-muted">{t('total_estimated') || 'Temps estimé total'}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    analytics.avgAccuracy > 110 ? 'bg-danger-light' :
                    analytics.avgAccuracy < 90 ? 'bg-info-light' : 'bg-success-light'
                  }`}>
                    <IconTarget className={`w-6 h-6 ${
                      analytics.avgAccuracy > 110 ? 'text-danger' :
                      analytics.avgAccuracy < 90 ? 'text-info' : 'text-success'
                    }`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      analytics.avgAccuracy > 110 ? 'text-danger' :
                      analytics.avgAccuracy < 90 ? 'text-info' : 'text-success'
                    }`}>
                      {Math.round(analytics.avgAccuracy)}%
                    </p>
                    <p className="!text-xs text-muted">{t('avg_accuracy') || 'Précision moyenne'}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-success-light rounded-xl">
                    <IconTrendingUp className="w-6 h-6 !text-success-text -text" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold !text-success-text -text">{analytics.completedTasks}</p>
                    <p className="!text-xs text-muted">{t('tasks_completed') || 'Tâches terminées'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Time Chart */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {t('daily_comparison') || 'Comparaison journalière'}
                </h3>
                <div className="h-64">
                  <Bar data={dailyChartData} options={chartOptions} />
                </div>
              </div>

              {/* Project Time Chart */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {t('time_by_project') || 'Temps par projet'}
                </h3>
                <div className="h-64">
                  <Bar 
                    data={projectChartData} 
                    options={{
                      ...chartOptions,
                      indexAxis: 'y' as const,
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Accuracy Distribution */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {t('estimation_accuracy') || 'Précision des estimations'}
                </h3>
                <div className="h-56">
                  <Doughnut data={accuracyChartData} options={doughnutOptions} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-danger">{analytics.underestimatedCount}</p>
                    <p className="!text-xs text-muted">{t('underestimated') || 'Sous-estimées'}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold !text-success-text -text">{analytics.accurateCount}</p>
                    <p className="!text-xs text-muted">{t('accurate') || 'Précises'}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-info">{analytics.overestimatedCount}</p>
                    <p className="!text-xs text-muted">{t('overestimated') || 'Sur-estimées'}</p>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {t('task_status') || 'Statut des tâches'}
                </h3>
                <div className="h-56">
                  <Doughnut data={statusChartData} options={doughnutOptions} />
                </div>
              </div>

              {/* Top Deviated Tasks - Regroupées par projet */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {t('biggest_deviations') || 'Plus grands écarts'}
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {analytics.groupedDeviations.length === 0 ? (
                    <p className="text-muted text-sm text-center py-8">
                      {t('no_data') || 'Aucune donnée'}
                    </p>
                  ) : (
                    analytics.groupedDeviations.map((item) => (
                      <div key={item.projectId} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getAccuracyIcon(item.accuracy)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-primary truncate font-medium">
                              {item.taskName || item.projectName || t('no_description')}
                            </p>
                            {item.projectName && item.taskName && (
                              <p className="!text-xs text-muted flex items-center gap-1 truncate">
                                <IconBriefcase className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{item.projectName}</span>
                                {item.entryCount > 1 && (
                                  <span className="text-muted/60">({item.entryCount} entrées)</span>
                                )}
                              </p>
                            )}
                            {!item.projectName && item.entryCount > 1 && (
                              <p className="!text-xs text-muted">({item.entryCount} entrées)</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-sm font-mono ${getAccuracyColor(item.accuracy)}`}>
                            {item.diff > 0 ? '+' : ''}{item.diff}min
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="card p-6 bg-gradient-to-r from-accent/5 to-transparent border-accent-light">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <IconTarget className="w-5 h-5 !text-accent" />
                {t('insights') || 'Conseils'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.avgAccuracy > 120 && (
                  <div className="flex items-start gap-3 p-3 bg-danger-light rounded-lg">
                    <IconTrendingUp className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {t('underestimating_time') || 'Vous sous-estimez vos tâches'}
                      </p>
                      <p className="!text-xs text-muted mt-1">
                        {t('underestimating_advice') || 'Essayez d\'augmenter vos estimations de 20-30%'}
                      </p>
                    </div>
                  </div>
                )}
                {analytics.avgAccuracy < 80 && (
                  <div className="flex items-start gap-3 p-3 bg-info-light rounded-lg">
                    <IconTrendingDown className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {t('overestimating_time') || 'Vous surestimez vos tâches'}
                      </p>
                      <p className="!text-xs text-muted mt-1">
                        {t('overestimating_advice') || 'Vous pouvez réduire vos estimations de 15-20%'}
                      </p>
                    </div>
                  </div>
                )}
                {analytics.avgAccuracy >= 80 && analytics.avgAccuracy <= 120 && (
                  <div className="flex items-start gap-3 p-3 bg-success-light rounded-lg">
                    <IconTarget className="w-5 h-5 !text-success-text -text flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {t('good_estimation') || 'Excellente précision !'}
                      </p>
                      <p className="!text-xs text-muted mt-1">
                        {t('good_estimation_advice') || 'Vos estimations sont fiables, continuez ainsi'}
                      </p>
                    </div>
                  </div>
                )}
                {analytics.exceededTasks > analytics.completedTasks && (
                  <div className="flex items-start gap-3 p-3 bg-warning-light rounded-lg">
                    <IconClock className="w-5 h-5 text-warning-text flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {t('many_exceeded') || 'Beaucoup de dépassements'}
                      </p>
                      <p className="!text-xs text-muted mt-1">
                        {t('many_exceeded_advice') || 'Prévoyez plus de marge dans vos planifications'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </ProtectedRoute>
  );
}

