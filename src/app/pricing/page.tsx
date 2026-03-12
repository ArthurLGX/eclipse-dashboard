'use client';

import React from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import useLenis from '@/utils/useLenis';
import { useState, useEffect } from 'react';
import {
  createSubscription,
  fetchPlans,
  fetchSubscriptionsUser,
} from '@/lib/api';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { usePopup } from '../context/PopupContext';
import PaymentModal from '@/app/components/PaymentModal';
import FreePlanModal from '@/app/components/FreePlanModal';
import FloatingPricingHeader from '@/app/components/FloatingPricingHeader';
import { IconCheck, IconX } from '@tabler/icons-react';
import { formatFeatureDisplay, formatFeatureValue } from '@/utils/formatFeatureDisplay';

interface Plan {
  rank: number;
  id: number;
  documentId: string;
  name: string;
  id_terminalPrice: number | null;
  billing_type: string;
  start_date: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
  features: string;
  subscriptions: unknown[];
}

export default function Plans() {
  const { t, language } = useLanguage();

  const [togglePlan, setTogglePlan] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFreePlanModal, setShowFreePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);
  useLenis();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null);
  const { user, triggerSubscriptionUpdate } = useAuth();
  const router = useRouter();
  const { showGlobalPopup } = usePopup();

  const handleChoosePlan = async (plan: Plan) => {
    if (user) {
      setSelectedPlan(plan);

      if (plan.name === 'free') {
        setShowFreePlanModal(true);
      } else {
        setShowPaymentModal(true);
      }
    } else {
      router.push('/login');
    }
  };

  const handlePlanClick = (planName: string) => {
    setHighlightedPlan(planName);

    const tableElement = document.getElementById('pricing-table');
    if (tableElement) {
      tableElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    setTimeout(() => {
      setHighlightedPlan(null);
    }, 3000);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlan || !user) return;

    try {
      const billingType = togglePlan ? 'yearly' : 'monthly';
      const price = togglePlan
        ? selectedPlan.price_yearly
        : selectedPlan.price_monthly;

      const response = await createSubscription(user.id, {
        plan: selectedPlan.documentId,
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
        setSelectedPlan(null);
        router.push('/dashboard/profile/your-subscription');

        triggerSubscriptionUpdate();
      }
    } catch (error) {
      console.error('Error creating subscription after payment:', error);
      showGlobalPopup("Erreur lors de la création de l'abonnement", 'error');
    }
  };

  useEffect(() => {
    const fetchPlansData = async () => {
      try {
        setLoading(true);
        const response = await fetchPlans() as { data?: Plan[] };
        const sortedPlans = (response?.data || []).sort(
          (a: Plan, b: Plan) => a.rank - b.rank
        );
        setPlans(sortedPlans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCurrentUserPlan = async () => {
      if (!user?.id) return;

      try {
        const subscription = await fetchSubscriptionsUser(user.id) as { data?: Array<{ subscription_status: string; plan: { name: string } }> };
        if (
          subscription?.data &&
          subscription.data.length > 0 &&
          subscription.data[0].subscription_status === 'active'
        ) {
          const planName = subscription.data[0].plan.name;
          setCurrentUserPlan(planName);
        }
      } catch (error) {
        console.error('Error fetching current user plan:', error);
      }
    };

    fetchPlansData();
    fetchCurrentUserPlan();
  }, [user?.id]);

  // Sections prédéfinies (ordre d'affichage)
  const predefinedSections: Record<string, string[]> = {
    Limites: ['max_active_projects', 'max_active_clients', 'max_prospects_active', 'max_handle_mentors'],
    Stockage: ['storage'],
    Newsletters: ['based_newsletters', 'advanced_newsletters', 'personalized_newsletters', 'max_newsletters'],
    Support: ['priority_support', 'all_time_support', 'phone_support', 'email_support'],
    Fonctionnalités: ['personalized_integrations', 'anticipated_features', 'data_export', 'advanced_reports', 'auto_save', 'smart_automation'],
  };
  const sectionLabelKeys: Record<string, string> = {
    Limites: 'landing_section_limits',
    Stockage: 'landing_section_storage',
    Newsletters: 'landing_section_newsletters',
    Support: 'landing_section_support',
    Fonctionnalités: 'landing_section_functionality',
    Autres: 'landing_section_other',
  };
  const allPredefinedKeys = new Set(Object.values(predefinedSections).flat());

  // Détecter tous les champs présents dans les features Strapi
  const keysFromPlans = new Set<string>();
  plans.forEach((plan) => {
    if (!plan.features) return;
    try {
      const f = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
      if (f && typeof f === 'object') Object.keys(f).forEach((k) => keysFromPlans.add(k));
    } catch { /* ignore */ }
  });

  // Nouveaux champs non définis → section "Autres"
  const newKeys = [...keysFromPlans].filter((k) => !allPredefinedKeys.has(k)).sort();

  const sections: Record<string, string[]> = { ...predefinedSections };
  if (newKeys.length > 0) sections.Autres = newKeys;

  return (
    <div className="landing-page min-h-screen w-full pt-20">
      <section className="landing-section" id="pricing-plans">
        <div className="text-center flex flex-col items-center">
          <motion.div className="landing-section-label justify-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}><span>●</span> {t('landing_pricing_label')}</motion.div>
          <motion.h1 className="landing-section-title max-w-full text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>{t('pricing_page_title')}</motion.h1>
          <motion.p className="landing-section-sub text-center max-w-md mx-auto mb-0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>{t('landing_pricing_sub')}</motion.p>
        </div>

        {/* Toggle Mensuel / Annuel */}
        <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 mt-10">
          <span className={`text-sm font-medium transition-colors duration-200 ${!togglePlan ? 'text-accent' : 'opacity-60'}`} style={{ color: !togglePlan ? 'var(--landing-accent)' : undefined }}>
            {t('monthly')}
          </span>
          <button
            type="button"
            onClick={() => setTogglePlan(!togglePlan)}
            className="relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ background: togglePlan ? 'var(--landing-accent)' : 'var(--landing-border)' }}
          >
            <span
              className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300"
              style={{ transform: togglePlan ? 'translateX(36px)' : 'translateX(4px)' }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors duration-200 ${togglePlan ? 'text-accent' : 'opacity-60'}`} style={{ color: togglePlan ? 'var(--landing-accent)' : undefined }}>
            {t('yearly')}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: togglePlan ? 'color-mix(in srgb, var(--landing-accent) 15%, transparent)' : 'var(--landing-border)', color: togglePlan ? 'var(--landing-accent)' : 'var(--landing-text-sm)' }}
          >
            {t('save_20_percent')}
          </span>
        </div>

        {/* Grille des plans */}
        <motion.div
          initial={false}
          className={`landing-pricing-grid ${!loading && plans.length >= 4 ? 'cols-4' : ''} mt-14`}
        >
          {loading ? (
            [1, 2, 3, 4].slice(0, 4).map((idx) => (
              <div key={idx} className="landing-pricing-card animate-pulse">
                <div className="h-4 w-20 rounded mb-4" style={{ background: 'var(--landing-border)' }} />
                <div className="h-10 w-16 rounded mb-4" style={{ background: 'var(--landing-border)' }} />
                <div className="h-3 w-28 rounded mb-6" style={{ background: 'var(--landing-border)' }} />
                <div className="landing-pricing-divider" />
                <div className="space-y-3 mt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 rounded" style={{ background: 'var(--landing-border)' }} />
                  ))}
                </div>
                <div className="h-12 rounded-lg mt-6" style={{ background: 'var(--landing-border)' }} />
              </div>
            ))
          ) : plans.length > 0 ? (
            plans.map((plan: Plan) => {
              const featured = plan.name === 'pro';
              const price = togglePlan ? plan.price_yearly : plan.price_monthly;
              let features: string[] = [];
              try {
                const f = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
                if (f && typeof f === 'object') {
                  features = Object.entries(f)
                    .filter(([, v]) => v !== false && v !== null && v !== undefined)
                    .slice(0, 8)
                    .map(([k, v]) => formatFeatureDisplay(k, v as boolean | number | string, t))
                    .filter(Boolean);
                }
              } catch { /* ignore */ }
              const fallbackFeatures: Record<string, string[]> = {
                free: [t('projects_active_format', { count: '5' }), t('clients_active_format', { count: '50' }), '3 factures / mois', 'Pipeline de base', t('email_support')],
                starter: [t('projects_active_format', { count: '5' }), t('clients_active_format', { count: '50' }), '3 factures / mois', 'Pipeline de base', t('email_support')],
                pro: [t('projects_active_format', { count: '50' }), t('clients_active_format', { count: '1000' }), 'Factures illimitées', 'Pipeline complet', 'Smart Follow-Up IA', 'Newsletters (100/mois)'],
                studio: [t('projects_active_format', { count: '∞' }), t('clients_active_format', { count: '∞' }), 'Multi-utilisateurs', 'API & intégrations', 'IA prioritaire', 'Support dédié'],
                expert: [t('projects_active_format', { count: '∞' }), t('clients_active_format', { count: '∞' }), 'Multi-utilisateurs', 'API & intégrations', 'IA prioritaire', 'Support dédié'],
              };
              const displayFeatures = features.length > 0 ? features : (fallbackFeatures[plan.name] ?? fallbackFeatures.pro);
              const displayName = plan.name.charAt(0).toUpperCase() + plan.name.slice(1);

              return (
                <div key={plan.name}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    onClick={() => handlePlanClick(plan.name)}
                    className={`landing-pricing-card ${featured ? 'featured' : ''}`}
                    whileHover={featured ? { y: -8, scale: 1.02, transition: { duration: 0.2 } } : { y: -6, transition: { duration: 0.2 } }}
                  >
                    {featured && <div className="landing-pricing-badge">⚡ {t('most_popular')}</div>}
                    <div className="landing-pricing-name">{displayName}</div>
                    <p className="landing-pricing-desc mb-4" style={{ color: 'var(--landing-text-md)', fontSize: 13 }}>{plan.description}</p>
                    <div className="landing-pricing-price">{price} <span className="text-lg font-medium">€</span></div>
                    <div className="landing-pricing-period">{t('per_month')}</div>
                    {togglePlan && price > 0 && (
                      <p className="text-sm mb-4" style={{ color: 'var(--landing-text-sm)' }}>
                        {t('billed_yearly')} {(plan.price_yearly * 0.8 * 12).toFixed(2)}€ · {t('save_20_percent')}
                      </p>
                    )}
                    <div className="landing-pricing-divider" />
                    {displayFeatures.map((f, idx) => (
                      <div key={`${plan.name}-${idx}`} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleChoosePlan(plan); }}
                      className={featured ? 'landing-btn-pricing-dark' : 'landing-btn-pricing-outline'}
                    >
                      {t('choose_plan')}
                    </button>
                  </motion.div>
                  {currentUserPlan === plan.name && (
                    <div className="flex my-4 mx-auto justify-center items-center">
                      <span className="text-xs font-medium rounded-full px-3 py-1 border" style={{ color: 'var(--landing-text-sm)', background: 'var(--landing-border)', borderColor: 'var(--landing-border2)' }}>
                        {t('your_current_plan')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12" style={{ color: 'var(--landing-text-sm)' }}>
              {t('landing_no_plans')}
            </div>
          )}
        </motion.div>
      </section>

      {/* Tableau comparatif */}
      {!loading && plans.length > 0 && (
        <>
          <FloatingPricingHeader
            plans={plans}
            togglePlan={togglePlan}
            highlightedPlan={highlightedPlan}
            language={language}
          />
          <motion.section
            className="landing-section pt-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="landing-section-title max-w-full !text-center mb-8">{t('compare_plans')}</h2>
            <div
              id="pricing-table"
              className="rounded-2xl overflow-hidden border"
              style={{ background: 'var(--landing-surface)', borderColor: 'var(--landing-border2)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--landing-border)' }}>
                      <th className="p-4 text-left font-medium w-1/3" style={{ color: 'var(--landing-text-sm)' }}>
                        {t('features')}
                      </th>
                      {plans.map(plan => (
                        <th
                          key={plan.id}
                          className={`p-4 text-center font-semibold transition-all duration-500 w-1/6 ${highlightedPlan === plan.name ? '' : ''}`}
                          style={{
                            background: highlightedPlan === plan.name ? 'color-mix(in srgb, var(--landing-accent) 12%, transparent)' : undefined,
                            color: 'var(--landing-text)',
                          }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className={`capitalize transition-all duration-500 ${highlightedPlan === plan.name ? 'font-extrabold' : 'font-normal'}`} style={{ color: highlightedPlan === plan.name ? 'var(--landing-accent)' : undefined }}>
                              {plan.name}
                            </span>
                            <span className="text-sm font-bold" style={{ color: 'var(--landing-accent)' }}>
                              {language === 'en' ? '€' : ''}{togglePlan ? plan.price_yearly : plan.price_monthly}{language === 'fr' ? '€' : ''}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sections).map(([sectionName, sectionFeatures]) => (
                      <React.Fragment key={sectionName}>
                        <tr style={{ background: 'var(--landing-border)' }}>
                          <td colSpan={plans.length + 1} className="p-3 font-semibold text-center" style={{ color: 'var(--landing-text)' }}>
                            {t(sectionLabelKeys[sectionName] || sectionName)}
                          </td>
                        </tr>

                        {sectionFeatures.map(featureKey => {
                          const translated = t(featureKey);
                          const label = translated === featureKey
                            ? featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            : translated;

                          return (
                            <tr
                              key={featureKey}
                              className="hover:bg-opacity-50 transition-colors"
                              style={{ borderBottom: '1px solid var(--landing-border)' }}
                            >
                              <td className="p-4 font-medium" style={{ color: 'var(--landing-text-md)' }}>
                                {label}
                              </td>
                              {plans.map(plan => {
                                if (!plan.features) {
                                  return <td key={plan.id} className="p-4 text-center" style={{ color: 'var(--landing-text-sm)' }}>-</td>;
                                }
                                try {
                                  const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
                                  const value = features[featureKey];
                                  const formatted = formatFeatureValue(featureKey, value);
                                  const cellBg = highlightedPlan === plan.name ? 'color-mix(in srgb, var(--landing-accent) 8%, transparent)' : undefined;

                                  if (formatted.type === 'check') {
                                    return (
                                      <td key={plan.id} className="p-4 text-center" style={{ background: cellBg }}>
                                        {formatted.value ? <IconCheck className="w-5 h-5 mx-auto" style={{ color: 'var(--landing-green)' }} /> : <IconX className="w-5 h-5 mx-auto" style={{ color: 'var(--landing-text-sm)' }} />}
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={plan.id} className="p-4 text-center font-medium text-sm" style={{ color: 'var(--landing-text)', background: cellBg }}>
                                      {formatted.value || '-'}
                                    </td>
                                  );
                                } catch {
                                  return <td key={plan.id} className="p-4 text-center" style={{ color: 'var(--landing-text-sm)' }}>-</td>;
                                }
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>
        </>
      )}

      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={selectedPlan}
          billingType={togglePlan ? 'yearly' : 'monthly'}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showFreePlanModal && selectedPlan && (
        <FreePlanModal
          isOpen={showFreePlanModal}
          onClose={() => setShowFreePlanModal(false)}
          plan={selectedPlan}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
