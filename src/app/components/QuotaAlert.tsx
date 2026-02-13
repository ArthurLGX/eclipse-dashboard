'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconAlertTriangle, IconClock, IconX, IconArrowRight } from '@tabler/icons-react';
import { useQuota } from '@/app/context/QuotaContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';

export default function QuotaAlert() {
  const { notifications } = useQuota();
  const router = useRouter();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = React.useState<string[]>([]);

  const visibleNotifications = notifications.filter(n => !dismissed.includes(n.id));

  if (visibleNotifications.length === 0) return null;

  const handleUpgrade = () => {
    router.push('/dashboard/profile/your-subscription');
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  return (
    <div className="space-y-3 mb-6">
      <AnimatePresence>
        {visibleNotifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`card p-4 flex items-center justify-between gap-4 ${
              notification.type === 'quota_exceeded' 
                ? 'border-danger bg-danger-light' 
                : notification.type === 'trial_expired'
                ? 'border-danger bg-danger-light'
                : 'border-warning bg-warning-light'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'quota_exceeded' || notification.type === 'trial_expired' ? (
                <IconAlertTriangle className="text-danger flex-shrink-0" size={24} />
              ) : (
                <IconClock className="text-warning-text flex-shrink-0" size={24} />
              )}
              <div>
                <p className={`font-medium ${
                  notification.type === 'quota_exceeded' || notification.type === 'trial_expired'
                    ? 'text-danger' 
                    : 'text-warning'
                }`}>
                  {notification.message}
                </p>
                {notification.type !== 'trial_ending' && (
                  <p className="text-secondary !text-sm mt-1">
                    {t('upgrade_to_unlock') || 'Passez à un plan supérieur pour débloquer.'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleUpgrade}
                className="btn-primary px-4 py-2 flex items-center gap-2 !text-sm"
              >
                {t('upgrade') || 'Mettre à niveau'}
                <IconArrowRight size={16} />
              </button>
              <button
                onClick={() => handleDismiss(notification.id)}
                className="btn-ghost p-2"
                title={t('dismiss') || 'Fermer'}
              >
                <IconX size={18} className="text-muted" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
