'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconTrendingUp,
  IconTrendingDown,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { ProjectTask } from '@/types';

interface ProjectProfitabilityCardProps {
  tasks: ProjectTask[];
  hourlyRate?: number; // Taux horaire optionnel pour calculer la valeur
}

export default function ProjectProfitabilityCard({ 
  tasks, 
  hourlyRate 
}: ProjectProfitabilityCardProps) {
  const { t } = useLanguage();

  // Calculs de rentabilité
  const profitabilityData = useMemo(() => {
    const activeTasks = tasks.filter(t => t.task_status !== 'cancelled');
    
    // Temps estimé total (en heures)
    const estimatedHours = activeTasks.reduce(
      (sum, task) => sum + (task.estimated_hours || 0), 
      0
    );
    
    // Temps passé total (en heures)
    const actualHours = activeTasks.reduce(
      (sum, task) => sum + (task.actual_hours || 0), 
      0
    );
    
    // Différence et pourcentage
    const difference = actualHours - estimatedHours;
    const consumptionPercent = estimatedHours > 0 
      ? Math.round((actualHours / estimatedHours) * 100) 
      : 0;
    
    // Statut de rentabilité
    let status: 'on_track' | 'warning' | 'danger' | 'completed' = 'on_track';
    
    const completedTasks = activeTasks.filter(t => t.task_status === 'completed').length;
    const isProjectComplete = completedTasks === activeTasks.length && activeTasks.length > 0;
    
    if (isProjectComplete) {
      status = 'completed';
    } else if (consumptionPercent >= 100) {
      status = 'danger';
    } else if (consumptionPercent >= 80) {
      status = 'warning';
    }
    
    // Valeur estimée et réelle si taux horaire fourni
    const estimatedValue = hourlyRate ? estimatedHours * hourlyRate : null;
    const actualCost = hourlyRate ? actualHours * hourlyRate : null;
    
    return {
      estimatedHours,
      actualHours,
      difference,
      consumptionPercent,
      status,
      estimatedValue,
      actualCost,
      isProjectComplete,
      hasEstimates: estimatedHours > 0,
    };
  }, [tasks, hourlyRate]);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getStatusConfig = () => {
    switch (profitabilityData.status) {
      case 'completed':
        return {
          icon: IconCheck,
          color: 'text-success',
          bgColor: 'bg-success-light',
          borderColor: 'border-success',
          label: t('project_on_budget') || 'Budget respecté',
        };
      case 'danger':
        return {
          icon: IconAlertTriangle,
          color: 'text-danger',
          bgColor: 'bg-danger-light',
          borderColor: 'border-danger',
          label: t('budget_exceeded') || 'Budget dépassé',
        };
      case 'warning':
        return {
          icon: IconTrendingUp,
          color: 'text-warning',
          bgColor: 'bg-warning-light',
          borderColor: 'border-warning',
          label: t('approaching_limit') || 'Proche de la limite',
        };
      default:
        return {
          icon: IconTrendingDown,
          color: '!text-success',
          bgColor: 'bg-success-light',
          borderColor: 'border-success',
          label: t('on_track') || 'En bonne voie',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Si pas d'estimations, afficher un message d'aide
  if (!profitabilityData.hasEstimates) {
    return (
      <div className="card p-5">
        <h3 className="!text-xs font-semibold !text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <IconClock className="w-4 h-4" />
          {t('profitability') || 'Rentabilité'}
        </h3>
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <IconClock className="w-6 h-6 !text-muted" />
          </div>
          <p className="text-sm !text-muted mb-2">
            {t('no_time_estimates') || 'Aucune estimation de temps'}
          </p>
          <p className="!text-xs !text-muted">
            {t('add_estimates_to_tasks') || 'Ajoutez des estimations aux tâches pour suivre la rentabilité'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="!text-xs font-semibold !text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
        <IconClock className="w-4 h-4" />
        {t('profitability') || 'Rentabilité'}
      </h3>

      {/* Status Alert - compact inline */}
      <div className={`flex items-center gap-2 p-2.5 rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor} mb-4`}>
        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />
        <span className={`text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Time Progress Bar - more compact */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="!text-xs !text-muted whitespace-nowrap">{t('time_consumption') || 'Consommation temps'}</span>
          <span className={`text-sm font-bold whitespace-nowrap ${
            profitabilityData.consumptionPercent > 100 ? 'text-danger' :
            profitabilityData.consumptionPercent > 80 ? 'text-warning' : 'text-primary'
          }`}>
            {profitabilityData.consumptionPercent}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(profitabilityData.consumptionPercent, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              profitabilityData.consumptionPercent > 100 ? 'bg-danger' :
              profitabilityData.consumptionPercent > 80 ? 'bg-warning' : 'bg-success'
            }`}
          />
        </div>
      </div>

      {/* Time Stats - inline rows */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="!text-xs !text-muted whitespace-nowrap">{t('estimated_time') || 'Temps estimé'}</span>
          <span className="text-sm font-semibold !text-primary whitespace-nowrap">
            {formatHours(profitabilityData.estimatedHours)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="!text-xs !text-muted whitespace-nowrap">{t('actual_time') || 'Temps réel'}</span>
          <span className={`text-sm font-semibold whitespace-nowrap ${
            profitabilityData.difference > 0 ? '!text-danger' : '!text-success'
          }`}>
            {formatHours(profitabilityData.actualHours)}
          </span>
        </div>
        
        {profitabilityData.difference !== 0 && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-default">
            <span className="!text-xs !text-muted whitespace-nowrap">
              {profitabilityData.difference > 0 
                ? (t('overtime') || 'Dépassement') 
                : (t('time_saved') || 'Économie')}
            </span>
            <span className={`text-sm font-bold whitespace-nowrap ${
              profitabilityData.difference > 0 ? '!text-danger' : '!text-success'
            }`}>
              {profitabilityData.difference > 0 ? '+' : '-'}
              {formatHours(Math.abs(profitabilityData.difference))}
            </span>
          </div>
        )}

        {/* Value if hourly rate provided */}
        {profitabilityData.estimatedValue !== null && (
          <>
            <div className="h-px bg-default my-1" />
            <div className="flex items-center justify-between gap-2">
              <span className="!text-xs !text-muted whitespace-nowrap">{t('estimated_value') || 'Valeur estimée'}</span>
              <span className="text-sm font-semibold !text-primary whitespace-nowrap">
                {profitabilityData.estimatedValue.toLocaleString('fr-FR')} €
              </span>
            </div>
            {profitabilityData.actualCost !== null && profitabilityData.actualCost > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="!text-xs !text-muted whitespace-nowrap">{t('actual_cost') || 'Coût réel'}</span>
                <span className={`text-sm font-semibold whitespace-nowrap ${
                  profitabilityData.actualCost > profitabilityData.estimatedValue 
                    ? 'text-danger' 
                    : 'text-success'
                }`}>
                  {profitabilityData.actualCost.toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

