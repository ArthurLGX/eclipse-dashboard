'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconX, IconCheck, IconX as IconReject } from '@tabler/icons-react';

export interface ProcessedEmail {
  name: string;
  email: string;
  snippet: string;
  confidence: number;
  status: 'lead' | 'rejected';
  reason: string;
}

interface SyncInboxToastProps {
  isOpen: boolean;
  loading?: boolean;
  processedEmails?: ProcessedEmail[];
  onClose: () => void;
}

function EmailCard({
  email,
  index,
  initialDelay,
}: {
  email: ProcessedEmail;
  index: number;
  initialDelay: number;
}) {
  const [phase, setPhase] = useState<'analyzing' | 'done'>('analyzing');
  const isLead = email.status === 'lead';
  const confidencePercent = Math.round(email.confidence * 100);

  useEffect(() => {
    const delayMs = initialDelay + index * 120 + 400;
    const t = setTimeout(() => setPhase('done'), delayMs);
    return () => clearTimeout(t);
  }, [index, initialDelay]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: initialDelay + index * 0.08, duration: 0.3 }}
      className="rounded-lg border overflow-hidden"
    >
      <div
        className={`border p-3 space-y-1.5 transition-colors duration-500 ${
          phase === 'analyzing'
            ? 'bg-info/15 border-info/40'
            : isLead
              ? 'bg-success/15 border-success/40'
              : 'bg-danger/15 border-danger/40'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium !text-primary truncate">{email.name}</div>
            <div className="!text-xs !text-muted truncate">{email.email}</div>
          </div>
          <div className="flex-shrink-0">
            {phase === 'analyzing' ? (
              <div className="w-6 h-6 rounded-full border-2 border-info/50 border-t-info animate-spin" />
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isLead ? 'bg-success/30 !text-success-text' : 'bg-danger/30 !text-danger-text'
                }`}
              >
                {isLead ? (
                  <IconCheck className="w-3.5 h-3.5" stroke={2.5} />
                ) : (
                  <IconReject className="w-3.5 h-3.5" stroke={2.5} />
                )}
              </motion.div>
            )}
          </div>
        </div>
        {email.snippet && (
          <p className="!text-[11px] !text-muted line-clamp-2 leading-tight">
            {email.snippet}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-mono !text-[10px] px-1.5 py-0.5 rounded transition-colors duration-300 ${
              phase === 'analyzing'
                ? 'bg-info/25 !text-info'
                : isLead
                  ? 'bg-success/25 !text-success-text'
                  : 'bg-danger/25 !text-danger-text'
            }`}
          >
            {phase === 'analyzing' ? '...' : `${confidencePercent}%`}
          </span>
          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.span
                key="reason"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="!text-[10px] !text-muted truncate max-w-[180px]"
              >
                {email.reason}
              </motion.span>
            ) : (
              <motion.span
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="!text-[10px] !text-info"
              >
                Analyse en cours...
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function SyncInboxToast({
  isOpen,
  loading,
  processedEmails = [],
  onClose,
}: SyncInboxToastProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-4 left-4 z-[9999] w-[380px] max-h-[70vh] overflow-hidden flex flex-col shadow-xl border border-default rounded-xl bg-card"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-default">
          <h3 className="!text-sm font-semibold !text-primary">
            {loading
              ? 'Analyse en cours...'
              : `Sync terminé · ${processedEmails.length} email(s)`}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-hover transition-colors !text-muted hover:!text-primary"
            aria-label="Fermer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-3 space-y-2 max-h-[55vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-8 h-8 border-2 border-info/50 border-t-info rounded-full animate-spin" />
              <p className="!text-sm !text-muted">Récupération et analyse des emails...</p>
            </div>
          ) : processedEmails.length === 0 ? (
            <p className="!text-sm !text-muted py-6 text-center">
              Aucun email à afficher
            </p>
          ) : (
            processedEmails.map((email, index) => (
              <EmailCard
                key={`${email.email}-${index}`}
                email={email}
                index={index}
                initialDelay={200}
              />
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
