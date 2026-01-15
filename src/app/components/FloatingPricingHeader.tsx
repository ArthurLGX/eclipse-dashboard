'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';

interface Plan {
  id: number;
  name: string;
  price_monthly: number;
  price_yearly: number;
}

interface FloatingPricingHeaderProps {
  plans: Plan[];
  togglePlan: boolean;
  highlightedPlan: string | null;
  language: string;
}

export default function FloatingPricingHeader({
  plans,
  togglePlan,
  highlightedPlan,
  language,
}: FloatingPricingHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { t } = useLanguage();
  const isClosedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const pricingTable = document.getElementById('pricing-table');
      if (pricingTable) {
        const rect = pricingTable.getBoundingClientRect();
        const tableTop = rect.top;
        const tableHeight = rect.height;

        // Afficher la navbar quand on dépasse le haut du tableau
        setIsVisible(
          tableTop < 0 && tableTop + tableHeight > 0 && !isClosedRef.current
        );
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            translateY: isMinimized ? 'calc(100% - 50px)' : '0%',
            opacity: 1,
          }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-default shadow-2xl py-4"
        >
          <button
            onClick={handleToggleMinimize}
            className="cursor-pointer text-muted hover:text-primary transition-colors absolute top-2 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover"
            title={isMinimized ? 'Agrandir' : 'Réduire'}
          >
            {isMinimized ? (
              <IconChevronUp className="w-5 h-5" />
            ) : (
              <IconChevronDown className="w-5 h-5" />
            )}
          </button>

          <div className="w-full max-w-6xl px-4 mx-auto py-2">
            <div className="overflow-x-auto">
              {isMinimized ? (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between">
                  <p className="text-primary font-semibold">
                    {t('plans_associated')}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-default">
                      <th className="p-4 text-left text-muted font-medium capitalize w-1/3">
                        {t('features')}
                      </th>
                      {plans.map(plan => (
                        <th
                          key={plan.id}
                          className={`p-4 text-center text-primary font-semibold transition-all duration-500 w-1/6 ${
                            highlightedPlan === plan.name
                              ? 'bg-accent-light'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span
                              className={`capitalize transition-all duration-500 ${
                                highlightedPlan === plan.name
                                  ? 'text-accent font-extrabold'
                                  : 'font-normal'
                              }`}
                            >
                              {plan.name}
                            </span>
                            <span className="text-sm !text-accent font-bold">
                              {language === 'en' ? '€' : ''}
                              {togglePlan
                                ? plan.price_yearly
                                : plan.price_monthly}
                              {language === 'fr' ? '€' : ''}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
