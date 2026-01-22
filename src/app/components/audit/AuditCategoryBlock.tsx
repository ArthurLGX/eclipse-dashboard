'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IconChevronDown } from '@tabler/icons-react';

interface AuditCategoryBlockProps {
  title: string;
  icon?: React.ReactNode;
  score?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-success-light !text-success-text ';
  if (score >= 60) return 'bg-warning-light text-warning';
  if (score >= 40) return 'bg-warning-light text-warning';
  return 'bg-danger-light text-danger';
}

export default function AuditCategoryBlock({
  title,
  icon,
  score,
  children,
  defaultOpen = true,
}: AuditCategoryBlockProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-hover hover:bg-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="p-1.5 bg-accent-light rounded-lg !text-accent">
              {icon}
            </span>
          )}
          <span className="font-semibold text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {score !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${getScoreBadgeColor(score)}`}>
              {score}/100
            </span>
          )}
          <IconChevronDown
            size={18}
            className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="p-4">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

