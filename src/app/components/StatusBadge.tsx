'use client';

import React from 'react';
import { IconBolt, IconClock, IconEdit, IconBlendMode, IconChartLine, IconAlertTriangle, IconTrendingUp } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

// Types de badges disponibles
export type TimeSourceType = 'auto' | 'ide' | 'manual' | 'mixed';
export type TrackingStateType = 'active';
export type ProfitabilityType = 'on_track' | 'warning' | 'exceeded';

interface BadgeConfig {
  label: string;
  tooltip: string;
  icon?: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

// Composant Badge de base
interface StatusBadgeProps {
  label: string;
  tooltip: string;
  icon?: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

function BaseBadge({ label, tooltip, icon, bgColor, textColor, borderColor }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full !text-xs font-medium border select-none ${bgColor} ${textColor} ${borderColor}`}
      style={{ height: '22px' }}
      title={tooltip}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
}

// Badge Source du temps
interface TimeSourceBadgeProps {
  source: TimeSourceType;
}

export function TimeSourceBadge({ source }: TimeSourceBadgeProps) {
  const { t } = useLanguage();

  const configs: Record<TimeSourceType, BadgeConfig> = {
    auto: {
      label: t('time_source_auto') || 'Auto',
      tooltip: t('time_source_auto_tooltip') || 'Temps collecté automatiquement',
      icon: <IconBolt size={12} />,
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      textColor: 'text-violet-700 dark:!text-violet-300',
      borderColor: 'border-violet-200 dark:border-violet-700',
    },
    ide: {
      label: 'IDE',
      tooltip: t('time_source_ide_tooltip') || 'Temps collecté automatiquement depuis l\'IDE',
      icon: <IconBolt size={12} />,
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      textColor: 'text-violet-700 dark:!text-violet-300',
      borderColor: 'border-violet-200 dark:border-violet-700',
    },
    manual: {
      label: t('time_source_manual') || 'Manuel',
      tooltip: t('time_source_manual_tooltip') || 'Temps saisi manuellement',
      icon: <IconEdit size={12} />,
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-600 dark:!text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-700',
    },
    mixed: {
      label: t('time_source_mixed') || 'Mixte',
      tooltip: t('time_source_mixed_tooltip') || 'Combinaison de temps automatique et manuel',
      icon: <IconBlendMode size={12} />,
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      textColor: 'text-slate-600 dark:!text-slate-400',
      borderColor: 'border-slate-200 dark:border-slate-700',
    },
  };

  const config = configs[source];
  return <BaseBadge {...config} />;
}

// Badge État du tracking
interface TrackingStateBadgeProps {
  state: TrackingStateType;
}

export function TrackingStateBadge({ state }: TrackingStateBadgeProps) {
  const { t } = useLanguage();

  const configs: Record<TrackingStateType, BadgeConfig> = {
    active: {
      label: t('tracking_active') || 'Tracking actif',
      tooltip: t('tracking_active_tooltip') || 'Le temps est actuellement suivi sur ce projet',
      icon: <IconClock size={12} className="animate-pulse" />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:!text-green-300',
      borderColor: 'border-green-200 dark:border-green-700',
    },
  };

  const config = configs[state];
  return <BaseBadge {...config} />;
}

// Badge Rentabilité
interface ProfitabilityBadgeProps {
  status: ProfitabilityType;
}

export function ProfitabilityBadge({ status }: ProfitabilityBadgeProps) {
  const { t } = useLanguage();

  const configs: Record<ProfitabilityType, BadgeConfig> = {
    on_track: {
      label: t('profitability_on_track') || 'On track',
      tooltip: t('profitability_on_track_tooltip') || 'Le projet respecte les estimations',
      icon: <IconTrendingUp size={12} />,
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-700 dark:!text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-700',
    },
    warning: {
      label: t('profitability_warning') || 'À surveiller',
      tooltip: t('profitability_warning_tooltip') || 'Le temps consommé approche des estimations',
      icon: <IconAlertTriangle size={12} />,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-700 dark:!text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-700',
    },
    exceeded: {
      label: t('profitability_exceeded') || 'Dépassement',
      tooltip: t('profitability_exceeded_tooltip') || 'Le temps consommé dépasse les estimations',
      icon: <IconChartLine size={12} />,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:!text-red-300',
      borderColor: 'border-red-200 dark:border-red-700',
    },
  };

  const config = configs[status];
  return <BaseBadge {...config} />;
}

// Helper pour déterminer le statut de rentabilité
export function getProfitabilityStatus(
  timeSpent: number,
  estimatedTime: number
): ProfitabilityType {
  if (estimatedTime <= 0) return 'on_track';
  
  const ratio = timeSpent / estimatedTime;
  
  if (ratio <= 0.8) return 'on_track';
  if (ratio <= 1.0) return 'warning';
  return 'exceeded';
}

// Helper pour déterminer la source du temps d'un projet
export function getProjectTimeSource(
  autoTimeEntries: number,
  manualTimeEntries: number
): TimeSourceType {
  if (autoTimeEntries > 0 && manualTimeEntries === 0) return 'auto';
  if (autoTimeEntries === 0 && manualTimeEntries > 0) return 'manual';
  if (autoTimeEntries > 0 && manualTimeEntries > 0) return 'mixed';
  return 'manual'; // Default
}

