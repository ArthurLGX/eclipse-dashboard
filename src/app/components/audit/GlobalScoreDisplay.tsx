'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IconTrophy, IconCheck, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface GlobalScoreDisplayProps {
  score: number;
  url: string;
  pageType: string;
  analyzedAt: string;
  fromCache?: boolean;
  cachedUntil?: string;
}

function getScoreLevel(score: number): {
  label: string;
  icon: React.ReactNode;
  color: string;
  strokeColor: string;
  bgColor: string;
  message: string;
} {
  if (score >= 80) {
    return {
      label: 'score_excellent',
      icon: <IconTrophy className="w-6 h-6" />,
      color: 'text-success',
      strokeColor: 'var(--color-success)',
      bgColor: 'bg-success-light',
      message: 'page_well_optimized',
    };
  }
  if (score >= 60) {
    return {
      label: 'score_good',
      icon: <IconCheck className="w-6 h-6" />,
      color: 'text-warning',
      strokeColor: 'var(--color-warning)',
      bgColor: 'bg-warning-light',
      message: 'page_needs_improvements',
    };
  }
  if (score >= 40) {
    return {
      label: 'score_average',
      icon: <IconAlertTriangle className="w-6 h-6" />,
      color: 'text-warning',
      strokeColor: 'var(--color-warning)',
      bgColor: 'bg-warning-light',
      message: 'page_needs_work',
    };
  }
  return {
    label: 'score_poor',
    icon: <IconX className="w-6 h-6" />,
    color: 'text-danger',
    strokeColor: 'var(--color-danger)',
    bgColor: 'bg-danger-light',
    message: 'page_needs_major_improvements',
  };
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-[var(--color-success)] to-emerald-400';
  if (score >= 60) return 'from-[var(--color-warning)] to-amber-400';
  if (score >= 40) return 'from-[var(--color-warning)] to-amber-300';
  return 'from-[var(--color-danger)] to-red-400';
}

// Messages de synthèse
const summaryMessages: Record<string, { fr: string; en: string }> = {
  page_well_optimized: {
    fr: 'Cette page est bien optimisée ! Quelques ajustements mineurs pourraient la perfectionner.',
    en: 'This page is well optimized! A few minor tweaks could make it perfect.',
  },
  page_needs_improvements: {
    fr: 'Cette page a de bonnes bases mais plusieurs améliorations sont recommandées.',
    en: 'This page has good foundations but several improvements are recommended.',
  },
  page_needs_work: {
    fr: 'Cette page nécessite un travail significatif pour atteindre son potentiel.',
    en: 'This page needs significant work to reach its potential.',
  },
  page_needs_major_improvements: {
    fr: 'Cette page nécessite des améliorations majeures sur plusieurs aspects.',
    en: 'This page needs major improvements on multiple aspects.',
  },
};

export default function GlobalScoreDisplay({
  score,
  url,
  pageType,
  analyzedAt,
  fromCache,
  cachedUntil,
}: GlobalScoreDisplayProps) {
  const { t, language } = useLanguage();
  const scoreLevel = getScoreLevel(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-6 relative overflow-hidden"
    >
      {/* Background gradient decoration */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-br ${getScoreGradient(score)} opacity-5 blur-3xl -translate-y-1/2 translate-x-1/2`} />

      <div className="relative flex flex-col md:flex-row items-center gap-6">
        {/* Circular Score */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <svg className="transform -rotate-90 w-40 h-40">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-hover"
            />
            {/* Progress circle */}
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ strokeDasharray: circumference, stroke: scoreLevel.strokeColor }}
            />
          </svg>
          {/* Score value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`text-4xl font-bold ${scoreLevel.color}`}
            >
              {score}
            </motion.span>
            <span className="text-xs text-muted">/100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          {/* Score level badge */}
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <span className={`p-2 rounded-lg ${scoreLevel.bgColor} ${scoreLevel.color}`}>
              {scoreLevel.icon}
            </span>
            <span className={`text-xl font-bold ${scoreLevel.color}`}>
              {t(scoreLevel.label)}
            </span>
          </div>

          {/* Summary message */}
          <p className="text-secondary mb-4">
            {summaryMessages[scoreLevel.message]?.[language] || t(scoreLevel.message)}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-muted">
            <span className="px-2 py-1 bg-hover rounded-full">
              {t(pageType === 'landing' ? 'landing_page' : pageType === 'homepage' ? 'homepage' : 'product_page')}
            </span>
            <span className="truncate max-w-[200px]" title={url}>
              {new URL(url).hostname}
            </span>
            <span>
              {new Date(analyzedAt).toLocaleString()}
            </span>
            {fromCache && (
              <span className="px-2 py-1 bg-accent-light text-accent rounded-full">
                {t('cached_result')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

