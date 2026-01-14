'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { cancelSubscription } from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';
import { useRouter } from 'next/navigation';

interface Plan {
  id: number;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string;
}

interface UpgradeDropdownProps {
  currentPlan: string;
  availablePlans: Plan[];
  isOpen: boolean;
  onToggleAction: () => void;
  onCloseAction: () => void;
  onPlanSelectAction: (plan: Plan) => void;
  togglePlan: boolean;
  onTogglePlanAction: () => void;
  language: string;
}

export default function UpgradeDropdown({
  currentPlan,
  availablePlans,
  isOpen,
  onToggleAction,
  onCloseAction,
  onPlanSelectAction,
  togglePlan,
  onTogglePlanAction,
  language,
}: UpgradeDropdownProps) {
  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>(
    'bottom'
  );
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onCloseAction();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCloseAction]);

  // Calculer la position du dropdown pour éviter qu'il soit coupé
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 400; // Estimation de la hauteur du dropdown

      // Si il n'y a pas assez d'espace en bas, afficher en haut
      if (rect.bottom + dropdownHeight > viewportHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // Filtrer les plans disponibles (exclure le plan actuel)
  const upgradePlans = availablePlans.filter(plan => plan.name !== currentPlan);

  const handleCancelSubscription = async (userId: number) => {
    try {
      const response = await cancelSubscription(userId) as { data?: unknown };
      if (response?.data) {
        showGlobalPopup(t('subscription_cancelled'), 'success');
        router.push('/pricing');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggleAction}
        className="w-full cursor-pointer bg-accent-light text-accent px-4 py-3 rounded-lg border border-accent-light hover:bg-[var(--color-accent)] hover:text-white transition-colors hover:border-accent font-semibold flex items-center justify-between"
      >
        <span>{t('upgrade_plan')}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="!text-xs"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: dropdownPosition === 'bottom' ? -10 : 10,
              scale: 0.95,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: dropdownPosition === 'bottom' ? -10 : 10,
              scale: 0.95,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute ${
              dropdownPosition === 'bottom'
                ? 'top-full mt-2'
                : 'bottom-full mb-2'
            } left-0 right-0 bg-card border border-default rounded-lg shadow-lg z-[9999] overflow-hidden`}
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            <div className="p-4 space-y-3">
              <div className="!text-center pb-2 border-b border-default">
                <h3 className="text-primary font-semibold !text-sm">
                  {t('choose_upgrade_plan')}
                </h3>
                <p className="text-secondary !text-xs mt-1">
                  {t('current_plan')}: {currentPlan}
                </p>
              </div>

              {/* Toggle Billing Type */}
              <div className="flex flex-col lg:flex-row items-center justify-center gap-4 py-2">
                <span
                  className={`!text-sm font-medium transition-colors duration-200 ${
                    !togglePlan ? 'text-accent' : 'text-secondary'
                  }`}
                >
                  {t('monthly')}
                </span>

                <button
                  onClick={onTogglePlanAction}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card ${
                    togglePlan ? 'bg-accent' : 'bg-hover'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                      togglePlan ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>

                <span
                  className={`!text-sm font-medium transition-colors duration-200 ${
                    togglePlan ? 'text-accent' : 'text-secondary'
                  }`}
                >
                  {t('yearly')}
                </span>

                <span
                  className={`px-2 py-1 ${
                    togglePlan
                      ? 'bg-accent-light text-accent'
                      : 'bg-page text-muted'
                  } !text-xs font-medium rounded-full`}
                >
                  {t('save_20_percent')}
                </span>
              </div>

              {upgradePlans.map((plan, index) => (
                <motion.button
                  key={plan.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => onPlanSelectAction(plan)}
                  className="w-full p-4 rounded-lg border border-default hover:border-accent/50 hover:bg-hover transition-all duration-200 !text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-primary font-semibold capitalize group-hover:text-accent transition-colors">
                      {plan.name}
                    </h4>
                    <div className="!text-right">
                      <div className="text-accent font-bold">
                        {language === 'en' ? '€' : ''}
                        {togglePlan
                          ? plan.price_yearly.toFixed(2)
                          : plan.price_monthly.toFixed(2)}
                        {language === 'fr' ? '€' : ''}
                      </div>
                      <div className="text-secondary !text-xs">
                        {t('per_month')}
                      </div>
                    </div>
                  </div>
                  {togglePlan && (
                    <div className="text-secondary !text-xs">
                      {language === 'en' ? '€' : ''}
                      {(plan.price_yearly * 12).toFixed(2)}
                      {language === 'fr' ? '€ ' : ' '}
                      {t('billed_yearly')}
                    </div>
                  )}

                  <p className="text-secondary !text-sm mb-3">
                    {plan.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-accent !text-xs font-medium">
                        {t('upgrade_to')}
                      </span>
                      <span className="text-accent font-semibold capitalize">
                        {plan.name}
                      </span>
                    </div>
                    <div className="text-accent !text-xs">→</div>
                  </div>
                </motion.button>
              ))}
              <div
                onClick={() => {
                  handleCancelSubscription(user?.id || 0);
                }}
                className="flex items-center justify-center w-full"
              >
                <p className="text-danger cursor-pointer bg-danger-light px-4 py-2 text-center rounded-lg !text-sm w-full hover:bg-danger-light transition-colors border border-danger hover:border-danger">
                  {t('cancel_subscription')}
                </p>
              </div>

              {upgradePlans.length === 0 && (
                <div className="!text-center py-4">
                  <p className="text-secondary !text-sm">
                    {t('no_upgrade_available')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
