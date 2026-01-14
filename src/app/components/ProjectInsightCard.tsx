'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { Project, ProjectTask, TimeEntry, Facture } from '@/types';

interface ProjectInsightCardProps {
  project: Project;
  tasks: ProjectTask[];
  timeEntries?: TimeEntry[];
  invoices?: Facture[];
}

interface InsightData {
  status: 'success' | 'warning' | 'danger';
  summary: string;
  actionable_tip: string;
  key_metric?: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
  };
}

export default function ProjectInsightCard({
  project,
  tasks,
  timeEntries = [],
  invoices = [],
}: ProjectInsightCardProps) {
  const { t } = useLanguage();
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Calculer les données du projet
  const calculateProjectData = useCallback(() => {
    // Heures estimées (somme des estimated_hours des tâches)
    const estimatedHours = tasks.reduce((sum, task) => {
      const taskHours = task.estimated_hours || 0;
      const subtaskHours = task.subtasks?.reduce((s, st) => s + (st.estimated_hours || 0), 0) || 0;
      return sum + taskHours + subtaskHours;
    }, 0);

    // Heures réelles (depuis time entries ou actual_time des tâches)
    const actualHours = timeEntries.length > 0
      ? timeEntries.reduce((sum, entry) => {
          const duration = entry.duration || 0;
          return sum + (duration / 3600); // Convertir secondes en heures
        }, 0)
      : tasks.reduce((sum, task) => sum + (task.actual_time || 0), 0);

    // Montant facturé
    const invoicedAmount = invoices
      .filter(inv => inv.type === 'invoice' && inv.invoice_status !== 'cancelled')
      .reduce((sum, inv) => sum + (inv.total_ht || 0), 0);

    // Progression globale
    const completedTasks = tasks.filter(t => t.task_status === 'completed').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Formater les tâches pour l'IA
    const formattedTasks = tasks.map(task => ({
      name: task.title,
      status: task.task_status,
      estimated_hours: task.estimated_hours,
      actual_hours: task.actual_time,
    }));

    return {
      project: {
        title: project.title,
        description: project.description,
        billing_type: project.billing_type,
        budget: project.budget,
        hourly_rate: project.hourly_rate,
        start_date: project.start_date,
        end_date: project.end_date,
      },
      estimated_hours: estimatedHours,
      actual_hours: actualHours,
      invoiced_amount: invoicedAmount,
      progress,
      tasks: formattedTasks,
    };
  }, [project, tasks, timeEntries, invoices]);

  // Charger l'insight automatiquement
  const fetchInsight = useCallback(async () => {
    // Ne pas charger si pas assez de données
    if (tasks.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = calculateProjectData();
      
      const response = await fetch('/api/ai/project-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insight');
      }

      const result: InsightData = await response.json();
      setInsight(result);
      setHasLoaded(true);
    } catch (err) {
      console.error('Insight fetch error:', err);
      setError('Impossible de charger l\'analyse');
    } finally {
      setLoading(false);
    }
  }, [tasks, calculateProjectData]);

  // Charger automatiquement au montage (une seule fois)
  useEffect(() => {
    if (!hasLoaded && tasks.length > 0) {
      // Délai pour éviter les appels trop fréquents
      const timer = setTimeout(fetchInsight, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasLoaded, tasks.length, fetchInsight]);

  // Styles selon le status
  const getStatusStyles = (status: InsightData['status']) => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-success-light',
          border: 'border-success',
          icon: <IconCheck className="w-5 h-5 text-success" />,
          iconBg: 'bg-success-light',
        };
      case 'warning':
        return {
          bg: 'bg-warning-light',
          border: 'border-warning',
          icon: <IconAlertTriangle className="w-5 h-5 text-warning" />,
          iconBg: 'bg-warning-light',
        };
      case 'danger':
        return {
          bg: 'bg-danger-light',
          border: 'border-danger',
          icon: <IconAlertTriangle className="w-5 h-5 text-danger" />,
          iconBg: 'bg-danger-light',
        };
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <IconTrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <IconTrendingDown className="w-4 h-4 text-danger" />;
      case 'stable':
        return <IconMinus className="w-4 h-4 text-muted" />;
    }
  };

  // Ne pas afficher si pas de tâches
  if (tasks.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-default rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-default bg-hover">
        <div className="flex items-center gap-2">
          <Image 
            src="/images/logo/eclipse-logo.png" 
            alt="Eclipse Assistant" 
            width={18} 
            height={18}
            className="w-4.5 h-4.5"
          />
          <span className="text-sm font-medium text-primary">
            Eclipse Insight
          </span>
        </div>
        <button
          onClick={fetchInsight}
          disabled={loading}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          title={t('refresh') || 'Actualiser'}
        >
          <IconRefresh className={`w-4 h-4 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && !insight && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Analyse en cours...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <IconInfoCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {insight && (
          <div className="space-y-3">
            {/* Status + Summary */}
            <div className={`flex items-start gap-3 p-3 rounded-lg ${getStatusStyles(insight.status).bg}`}>
              <div className={`p-1.5 rounded-lg ${getStatusStyles(insight.status).iconBg}`}>
                {getStatusStyles(insight.status).icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary leading-tight">
                  {insight.summary}
                </p>
              </div>
            </div>

            {/* Key Metric */}
            {insight.key_metric && (
              <div className="flex items-center justify-between p-3 bg-hover rounded-lg">
                <span className="text-xs text-muted">{insight.key_metric.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {insight.key_metric.value}
                  </span>
                  {getTrendIcon(insight.key_metric.trend)}
                </div>
              </div>
            )}

            {/* Actionable Tip */}
            <div className="pt-2 border-t border-default">
              <p className="text-xs text-secondary leading-relaxed">
                💡 {insight.actionable_tip}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !insight && (
          <div className="text-sm text-muted text-center py-2">
            Aucune analyse disponible
          </div>
        )}
      </div>
    </motion.div>
  );
}

