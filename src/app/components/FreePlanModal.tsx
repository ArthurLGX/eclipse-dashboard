'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSubscription } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useRouter } from 'next/navigation';

interface Plan {
  id: number;
  documentId: string;
  name: string;
  description: string;
  features: string;
  price_monthly: number;
  price_yearly: number;
}

interface FreePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onSuccess: () => void;
}

export default function FreePlanModal({
  isOpen,
  onClose,
  plan,
  onSuccess,
}: FreePlanModalProps) {
  const { t } = useLanguage();
  const { user, triggerSubscriptionUpdate } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trialProgress, setTrialProgress] = useState(0);

  // Simuler la progression du trial (30 jours)
  useEffect(() => {
    if (isOpen) {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours
      const now = new Date();

      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const progress = Math.min((elapsed / totalDuration) * 100, 100);

      setTrialProgress(progress);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await createSubscription(user.id, {
        plan: plan.documentId,
        billing_type: 'monthly',
        price: 0,
        trial: true,
        plan_name: plan.name,
        plan_description: plan.description,
        plan_features: plan.features,
      }) as { data?: unknown };

      if (response?.data) {
        showGlobalPopup(
          "Plan gratuit activé ! Vous avez 30 jours d'essai.",
          'success'
        );
        onSuccess();
        onClose();
        router.push('/dashboard/profile/your-subscription');

        // Déclencher la mise à jour de l'UsageProgressBar
        triggerSubscriptionUpdate();
      }
    } catch (error) {
      console.error('Error creating free subscription:', error);
      showGlobalPopup("Erreur lors de l'activation du plan gratuit", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="!text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="!text-2xl">🎉</span>
              </div>
              <h2 className="!text-xl font-bold !text-zinc-200 mb-2">
                {t('activate_free_plan')}
              </h2>
              <p className="!text-zinc-400 !text-sm">
                {t('free_plan_confirmation_message')}
              </p>
            </div>

            {/* Détails du plan */}
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="!text-zinc-300 font-medium capitalize">
                  {plan.name}
                </span>
                <span className="!text-emerald-400 font-bold">Gratuit</span>
              </div>
              <p className="!text-zinc-400 !text-sm">{plan.description}</p>
            </div>

            {/* Barre de progression du trial */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="!text-sm !text-zinc-400">
                  {t('trial_period')}
                </span>
                <span className="!text-sm !text-emerald-400 font-medium">
                  30 jours
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${trialProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                />
              </div>
              <p className="!text-xs !text-zinc-500 mt-1">
                {t('trial_progress_description')}
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-zinc-800 !text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-emerald-500 !text-black px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 font-semibold"
              >
                {loading ? t('activating') : t('activate_plan')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
