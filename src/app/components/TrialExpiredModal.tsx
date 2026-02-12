'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalFocus } from '@/hooks/useModalFocus';
import { useRouter } from 'next/navigation';
import { fetchPlans, createSubscription } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import PaymentModal from './PaymentModal';
import FreePlanModal from './FreePlanModal';

interface Plan {
  id: number;
  documentId?: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string;
}

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrialExpiredModal({
  isOpen,
  onClose,
}: TrialExpiredModalProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { user, triggerSubscriptionUpdate } = useAuth();
  const { showGlobalPopup } = usePopup();
  const modalRef = useModalFocus(isOpen);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFreePlanModal, setShowFreePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingType] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (isOpen) {
      fetchPlans().then(response => {
        const res = response as { data?: Plan[] };
        setPlans(res?.data || []);
      });
    }
  }, [isOpen]);

  const handleChoosePlan = (plan: Plan) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setSelectedPlan(plan);

    // Si c'est le plan gratuit, ouvrir la modale de confirmation
    if (plan.name === 'free') {
      setShowFreePlanModal(true);
    } else {
      // Sinon, ouvrir le modal de paiement
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlan || !user) return;

    try {
      const price =
        billingType === 'yearly'
          ? selectedPlan.price_yearly
          : selectedPlan.price_monthly;

      const response = await createSubscription(user.id, {
        plan: selectedPlan.documentId || selectedPlan.id.toString(),
        billing_type: billingType,
        price: price,
        trial: selectedPlan.name === 'free' ? true : false,
        plan_name: selectedPlan.name,
        plan_description: selectedPlan.description,
        plan_features: selectedPlan.features,
        start_date: new Date().toISOString(),
      }) as { data?: unknown };

      if (response?.data) {
        showGlobalPopup(
          'Paiement réussi ! Votre abonnement est maintenant actif.',
          'success'
        );
        setShowPaymentModal(false);
        setShowFreePlanModal(false);
        setSelectedPlan(null);
        onClose();
        router.push('/dashboard/profile/your-subscription');

        // Déclencher la mise à jour de l'UsageProgressBar
        triggerSubscriptionUpdate();
      }
    } catch (error) {
      console.error('Error creating subscription after payment:', error);
      showGlobalPopup("Erreur lors de la création de l'abonnement", 'error');
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-card border border-default rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto outline-none"
            onClick={e => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">
                {t('trial_expired_title')}
              </h2>
              <p className="text-secondary text-sm leading-relaxed">
                {t('trial_expired_message')}
              </p>
            </div>

            {/* Plans disponibles */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-primary text-center">
                {t('choose_plan_to_continue')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans
                  .filter(plan => plan.name !== 'free')
                  .map((plan, index) => (
                    <motion.button
                      key={plan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      onClick={() => handleChoosePlan(plan)}
                      className="bg-hover border border-default rounded-lg p-4 hover:border-accent hover:bg-hover transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-primary font-semibold capitalize group-hover:text-accent transition-colors">
                          {plan.name}
                        </h4>
                        <div className="text-right">
                          <div className="text-accent font-bold">
                            {language === 'en' ? '€' : ''}
                            {plan.price_monthly.toFixed(2)}
                            {language === 'fr' ? '€' : ''}
                          </div>
                          <div className="text-secondary !text-xs">
                            {t('per_month')}
                          </div>
                        </div>
                      </div>

                      <p className="text-secondary text-sm mb-3 line-clamp-2">
                        {plan.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-accent !text-xs font-medium">
                          {t('select_plan')}
                        </span>
                        <div className="text-accent !text-xs">→</div>
                      </div>
                    </motion.button>
                  ))}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-muted text-secondary px-4 py-3 rounded-lg hover:bg-card transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => router.push('/pricing')}
                className="flex-1 bg-accent text-white px-4 py-3 rounded-lg hover:bg-[var(--color-accent)] transition-colors font-semibold"
              >
                {t('view_all_plans')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modales de paiement */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={{
            id: selectedPlan.id,
            name: selectedPlan.name,
            price_monthly: selectedPlan.price_monthly,
            price_yearly: selectedPlan.price_yearly,
            description: selectedPlan.description,
          }}
          billingType={billingType}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showFreePlanModal && selectedPlan && (
        <FreePlanModal
          isOpen={showFreePlanModal}
          onClose={() => setShowFreePlanModal(false)}
          plan={{
            id: selectedPlan.id,
            documentId: selectedPlan.documentId || selectedPlan.id.toString(),
            name: selectedPlan.name,
            description: selectedPlan.description,
            features: selectedPlan.features,
            price_monthly: selectedPlan.price_monthly,
            price_yearly: selectedPlan.price_yearly,
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </AnimatePresence>
  );
}
