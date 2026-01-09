'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface Issue {
  text: string;
  priority: 'high' | 'medium' | 'low';
}

interface IssueListProps {
  issues: Issue[];
  title?: string;
  emptyMessage?: string;
}

const priorityConfig = {
  high: {
    icon: IconAlertTriangle,
    bgColor: 'bg-danger-light',
    textColor: 'text-danger',
    borderColor: 'border-danger',
    label: 'priority_high',
  },
  medium: {
    icon: IconAlertCircle,
    bgColor: 'bg-warning-light',
    textColor: 'text-warning',
    borderColor: 'border-warning',
    label: 'priority_medium',
  },
  low: {
    icon: IconInfoCircle,
    bgColor: 'bg-info-light',
    textColor: 'text-info',
    borderColor: 'border-info',
    label: 'priority_low',
  },
};

export default function IssueList({ issues, title, emptyMessage }: IssueListProps) {
  const { t } = useLanguage();

  // Sort by priority
  const sortedIssues = [...issues].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  if (issues.length === 0) {
    return (
      <div className="text-center py-6 text-muted">
        <IconInfoCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage || t('no_issues')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="text-sm font-medium text-primary mb-3">{title}</h4>
      )}
      {sortedIssues.map((issue, index) => {
        const config = priorityConfig[issue.priority];
        const Icon = config.icon;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary">{t(issue.text) || issue.text}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
              {t(config.label)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

