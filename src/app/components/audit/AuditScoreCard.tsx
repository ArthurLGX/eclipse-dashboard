'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';

interface AuditScoreCardProps {
  label: string;
  score: number;
  icon?: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-success-light';
  if (score >= 60) return 'bg-warning-light';
  if (score >= 40) return 'bg-warning-light';
  return 'bg-danger-light';
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-[var(--color-success)]';
  if (score >= 60) return 'stroke-[var(--color-warning)]';
  if (score >= 40) return 'stroke-[var(--color-warning)]';
  return 'stroke-[var(--color-danger)]';
}

export default function AuditScoreCard({
  label,
  score,
  icon,
  description,
  trend,
  size = 'md',
}: AuditScoreCardProps) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const circleSizes = {
    sm: { size: 60, strokeWidth: 4, fontSize: 'text-lg' },
    md: { size: 80, strokeWidth: 5, fontSize: 'text-2xl' },
    lg: { size: 100, strokeWidth: 6, fontSize: 'text-3xl' },
  };

  const circleConfig = circleSizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card ${sizeClasses[size]} flex flex-col items-center gap-3`}
    >
      {/* Circular Progress */}
      <div className="relative" style={{ width: circleConfig.size, height: circleConfig.size }}>
        <svg
          className="transform -rotate-90"
          width={circleConfig.size}
          height={circleConfig.size}
        >
          {/* Background circle */}
          <circle
            cx={circleConfig.size / 2}
            cy={circleConfig.size / 2}
            r={40 * (circleConfig.size / 100)}
            fill="none"
            stroke="currentColor"
            strokeWidth={circleConfig.strokeWidth}
            className="text-hover"
          />
          {/* Progress circle */}
          <motion.circle
            cx={circleConfig.size / 2}
            cy={circleConfig.size / 2}
            r={40 * (circleConfig.size / 100)}
            fill="none"
            strokeWidth={circleConfig.strokeWidth}
            strokeLinecap="round"
            className={getScoreRingColor(score)}
            initial={{ strokeDashoffset: circumference * (circleConfig.size / 100) }}
            animate={{ strokeDashoffset: strokeDashoffset * (circleConfig.size / 100) }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference * (circleConfig.size / 100),
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${circleConfig.fontSize} ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>

      {/* Label and icon */}
      <div className="flex items-center gap-2">
        {icon && (
          <span className={`${getScoreBgColor(score)} p-1.5 rounded-lg`}>
            {icon}
          </span>
        )}
        <span className="text-sm font-medium !text-primary">{label}</span>
        {trend && (
          <span className={`${
            trend === 'up' ? 'text-success' :
            trend === 'down' ? 'text-danger' :
            'text-muted'
          }`}>
            {trend === 'up' && <IconTrendingUp size={16} />}
            {trend === 'down' && <IconTrendingDown size={16} />}
            {trend === 'neutral' && <IconMinus size={16} />}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="!text-xs !text-muted !text-center">{description}</p>
      )}
    </motion.div>
  );
}

