'use client';

/**
 * Card de rentabilité IA pour les projets
 * 
 * Affiche :
 * - Bilan de rentabilité (quand projet terminé)
 * - Alertes de dérive (en cours de projet)
 * 
 * L'IA est invisible - l'utilisateur voit juste des insights utiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconBulb,
  IconClock,
  IconCurrencyEuro,
  IconChartLine,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { Project, ProjectTask } from '@/types';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface ProfitabilityResult {
  profitability: 'positive' | 'neutral' | 'negative';
  profit_or_loss: number;
  effective_hourly_rate: number;
  main_causes: string[];
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high';
  summary: string;
}

interface AlertResult {
  risk: 'low' | 'medium' | 'high';
  reason: string;
  recommendation: string;
  tasks_at_risk: string[];
  estimated_loss?: number;
}

interface ProjectProfitabilityAIProps {
  project: Project;
  tasks: ProjectTask[];
  invoicedAmount?: number;
  className?: string;
}

// ════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════

export default function ProjectProfitabilityAI({
  project,
  tasks,
  invoicedAmount = 0,
  className = '',
}: ProjectProfitabilityAIProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profitability, setProfitability] = useState<ProfitabilityResult | null>(null);
  const [alert, setAlert] = useState<AlertResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = project.project_status === 'completed';
  const hasData = tasks.some(t => (t.estimated_hours || 0) > 0 || (t.actual_hours || 0) > 0);

  // Calculer les stats de base (sans IA)
  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const actualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
  const hourlyRate = project.hourly_rate || 50;
  const consumptionPercent = estimatedHours > 0 ? Math.round((actualHours / estimatedHours) * 100) : 0;

  // ════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ════════════════════════════════════════════════════════════════

  const fetchProfitability = useCallback(async () => {
    if (!hasData) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/project-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            documentId: project.documentId,
            title: project.title,
            hourly_rate: hourlyRate,
            estimated_budget: project.budget,
            project_status: project.project_status,
          },
          tasks: tasks.map(t => ({
            title: t.title,
            estimated_hours: t.estimated_hours,
            actual_hours: t.actual_hours,
          })),
          invoicedAmount,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProfitability(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error fetching profitability:', err);
      setError('Analyse temporairement indisponible');
      // Utiliser le calcul local comme fallback
      setProfitability(calculateLocalProfitability());
    } finally {
      setIsLoading(false);
    }
  }, [project, tasks, invoicedAmount, hasData, hourlyRate]);

  const fetchAlerts = useCallback(async () => {
    if (!hasData || isCompleted) return;
    
    try {
      const response = await fetch('/api/ai/project-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            documentId: project.documentId,
            title: project.title,
            hourly_rate: hourlyRate,
          },
          tasks: tasks.map(t => ({
            title: t.title,
            estimated_hours: t.estimated_hours,
            actual_hours: t.actual_hours,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAlert(data.data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      // Utiliser le calcul local comme fallback
      setAlert(calculateLocalAlert());
    }
  }, [project, tasks, hasData, isCompleted, hourlyRate]);

  // ════════════════════════════════════════════════════════════════
  // CALCULS LOCAUX (FALLBACK)
  // ════════════════════════════════════════════════════════════════

  const calculateLocalProfitability = useCallback((): ProfitabilityResult => {
    const effectiveHourlyRate = actualHours > 0 ? invoicedAmount / actualHours : hourlyRate;
    const expectedRevenue = actualHours * hourlyRate;
    const profitOrLoss = invoicedAmount - expectedRevenue;
    
    let profitabilityStatus: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (profitOrLoss > 0) profitabilityStatus = 'positive';
    if (profitOrLoss < -100) profitabilityStatus = 'negative';

    const overrunTasks = tasks.filter(t => 
      (t.estimated_hours || 0) > 0 && 
      (t.actual_hours || 0) > (t.estimated_hours || 0) * 1.2
    );

    return {
      profitability: profitabilityStatus,
      profit_or_loss: Math.round(profitOrLoss),
      effective_hourly_rate: Math.round(effectiveHourlyRate * 100) / 100,
      main_causes: overrunTasks.length > 0 
        ? [`Dépassement sur : ${overrunTasks.map(t => t.title).join(', ')}`]
        : ['Données insuffisantes pour une analyse détaillée'],
      recommendations: ['Continuer le suivi du temps pour des analyses plus précises'],
      risk_level: profitabilityStatus === 'negative' ? 'high' : profitabilityStatus === 'neutral' ? 'medium' : 'low',
      summary: profitabilityStatus === 'positive' 
        ? `Projet rentable`
        : profitabilityStatus === 'negative'
          ? `Perte estimée sur ce projet`
          : 'Rentabilité neutre',
    };
  }, [tasks, actualHours, invoicedAmount, hourlyRate]);

  const calculateLocalAlert = useCallback((): AlertResult => {
    const tasksAtRisk = tasks
      .filter(t => (t.estimated_hours || 0) > 0 && ((t.actual_hours || 0) / (t.estimated_hours || 1)) > 0.8)
      .map(t => t.title);

    let risk: 'low' | 'medium' | 'high' = 'low';
    let reason = 'Le projet avance normalement';
    let recommendation = 'Continuer le suivi régulier';

    if (consumptionPercent >= 100) {
      risk = 'high';
      reason = `Budget temps dépassé (${consumptionPercent}%)`;
      recommendation = 'Alerter le client et renégocier';
    } else if (consumptionPercent >= 80) {
      risk = 'medium';
      reason = `${consumptionPercent}% du budget consommé`;
      recommendation = 'Prioriser les tâches restantes';
    }

    return {
      risk,
      reason,
      recommendation,
      tasks_at_risk: tasksAtRisk,
      estimated_loss: consumptionPercent > 100 
        ? Math.round((actualHours - estimatedHours) * hourlyRate)
        : undefined,
    };
  }, [tasks, consumptionPercent, actualHours, estimatedHours, hourlyRate]);

  // ════════════════════════════════════════════════════════════════
  // EFFECTS
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (hasData) {
      if (isCompleted) {
        fetchProfitability();
      } else {
        fetchAlerts();
        // Calcul local initial pour la rentabilité
        setProfitability(calculateLocalProfitability());
      }
    }
  }, [hasData, isCompleted, fetchProfitability, fetchAlerts, calculateLocalProfitability]);

  // ════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════════════════════

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-success';
      case 'medium': return 'text-warning';
      case 'high': return 'text-danger';
    }
  };

  const getRiskBgColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'bg-success-light';
      case 'medium': return 'bg-warning-light';
      case 'high': return 'bg-danger-light';
    }
  };

  const getProfitabilityIcon = () => {
    if (!profitability) return <IconChartLine className="w-5 h-5" />;
    switch (profitability.profitability) {
      case 'positive': return <IconTrendingUp className="w-5 h-5 !text-success-text -text" />;
      case 'negative': return <IconTrendingDown className="w-5 h-5 text-danger" />;
      default: return <IconChartLine className="w-5 h-5 text-warning" />;
    }
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  if (!hasData) {
    return null; // Pas de données = pas d'affichage
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden ${className}`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-hover transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            profitability?.profitability === 'positive' ? 'bg-success-light' :
            profitability?.profitability === 'negative' ? 'bg-danger-light' :
            'bg-warning-light'
          }`}>
            {getProfitabilityIcon()}
          </div>
          
          {/* Title & Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <h3 className="font-semibold text-primary whitespace-nowrap">
                {t('profitability_analysis') || 'Analyse de rentabilité'}
              </h3>
              
              {/* Badge de risque inline */}
              {!isCompleted && alert && alert.risk !== 'low' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getRiskBgColor(alert.risk)} ${getRiskColor(alert.risk)}`}>
                  {alert.risk === 'high' ? '⚠️ Attention' : '⏳ Vigilance'}
                </span>
              )}
              
              {/* Montant inline */}
              {profitability && (
                <span className={`font-bold whitespace-nowrap ${
                  profitability.profit_or_loss >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {profitability.profit_or_loss >= 0 ? '+' : ''}{profitability.profit_or_loss}€
                </span>
              )}
            </div>
            
            {profitability && (
              <p className={`text-sm mt-0.5 ${getRiskColor(profitability.risk_level)}`}>
                {profitability.summary}
              </p>
            )}
          </div>
          
          {/* Chevron */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <IconChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <IconChevronDown className="w-5 h-5 text-muted" />
            )}
          </div>
        </div>
      </div>

      {/* Contenu détaillé */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-default overflow-hidden">
              {/* Stats rapides - centré vertical pour éviter débordement */}
              <div className="grid grid-cols-2 gap-2 pt-4">
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-muted min-w-0">
                  <div className="flex items-center gap-1.5 text-muted">
                    <IconClock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">{t('estimated') || 'Estimé'}</span>
                  </div>
                  <span className="font-bold text-primary text-lg">{estimatedHours}h</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-muted min-w-0">
                  <div className="flex items-center gap-1.5 text-muted">
                    <IconClock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">{t('actual') || 'Réel'}</span>
                  </div>
                  <span className={`font-bold text-lg ${actualHours > estimatedHours ? 'text-danger' : 'text-success'}`}>
                    {actualHours}h
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-muted min-w-0">
                  <div className="flex items-center gap-1.5 text-muted">
                    <IconCurrencyEuro className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs truncate">{t('planned_rate') || 'Taux prévu'}</span>
                  </div>
                  <span className="font-bold text-primary text-lg">{hourlyRate}€</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-muted min-w-0">
                  <div className="flex items-center gap-1.5 text-muted">
                    <IconCurrencyEuro className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs truncate">{t('effective_rate') || 'Taux effectif'}</span>
                  </div>
                  <span className={`font-bold text-lg ${
                    (profitability?.effective_hourly_rate || 0) >= hourlyRate ? 'text-success' : 'text-danger'
                  }`}>
                    {profitability?.effective_hourly_rate || '--'}€
                  </span>
                </div>
              </div>

              {/* Alerte en cours */}
              {!isCompleted && alert && alert.risk !== 'low' && (
                <div className={`p-3 rounded-lg ${getRiskBgColor(alert.risk)} border ${
                  alert.risk === 'high' ? 'border-danger' : 'border-warning'
                }`}>
                  <div className="flex items-start gap-2">
                    <IconAlertTriangle className={`w-5 h-5 ${getRiskColor(alert.risk)} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className={`font-medium ${getRiskColor(alert.risk)}`}>{alert.reason}</p>
                      <p className="text-sm text-secondary mt-1">{alert.recommendation}</p>
                      {alert.tasks_at_risk.length > 0 && (
                        <p className="text-xs text-muted mt-2">
                          Tâches concernées : {alert.tasks_at_risk.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Causes principales (projet terminé) */}
              {isCompleted && profitability && profitability.main_causes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-primary mb-2">
                    {t('main_causes') || 'Causes principales'}
                  </p>
                  <ul className="space-y-1">
                    {profitability.main_causes.map((cause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                        <span className="text-danger">•</span>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommandations */}
              {profitability && profitability.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-primary mb-2 flex items-center gap-1">
                    <IconBulb className="w-4 h-4 text-warning" />
                    {t('recommendations') || 'Recommandations'}
                  </p>
                  <ul className="space-y-1">
                    {profitability.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                        <IconCheck className="w-4 h-4 !text-success-text -text flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bouton refresh */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCompleted) {
                      fetchProfitability();
                    } else {
                      fetchAlerts();
                    }
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors disabled:opacity-50"
                >
                  <IconRefresh className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  {t('refresh_analysis') || 'Actualiser'}
                </button>
              </div>

              {/* Message d'erreur discret */}
              {error && (
                <p className="text-xs text-muted text-center">{error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

