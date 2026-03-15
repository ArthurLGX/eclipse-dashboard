'use client';

import React from 'react';
import { motion } from 'motion/react';
import { IconSearch } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { RedesignWithClaude } from '@/app/components/audit';

export default function GrowthAuditPage() {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-5 items-center justify-center"
    >
      {/* Page Header */}
      <div className="mb-6 w-full flex flex-col items-start justify-center">
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-4 h-px bg-accent" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-accent-text font-mono">
            {t('growth_audit_tool_tag')}
          </span>
        </div>
        <h1 className="text-2xl md:text-[28px] font-extrabold text-primary tracking-tight flex items-center gap-3">
          <div className="w-9 h-9 bg-accent border border-accent flex items-center justify-center">
            <IconSearch className="w-[18px] h-[18px] !text-white" />
          </div>
          {t('growth_audit')}
        </h1>
        <p className="text-sm text-muted mt-1.5 ml-12">
          {t('growth_audit_desc')}
        </p>
      </div>

      {/* Refonte avec CLAUDE */}
      <div className="w-full">
        <RedesignWithClaude />
      </div>
    </motion.div>
  );
}
