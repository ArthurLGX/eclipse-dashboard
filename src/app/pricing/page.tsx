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
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { usePopup } from '../context/PopupContext';
import PaymentModal from '@/app/components/PaymentModal';
import FreePlanModal from '@/app/components/FreePlanModal';
import FloatingPricingHeader from '@/app/components/FloatingPricingHeader';
import { IconCheck, IconX } from '@tabler/icons-react';

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

      // Si c'est le plan gratuit, ouvrir la modale de confirmation
      if (plan.name === 'free') {
        setShowFreePlanModal(true);
      } else {
        // Sinon, ouvrir le modal de paiement
        setShowPaymentModal(true);
      }
    } else {
      router.push('/login');
    }
  };

  const handlePlanClick = (planName: string) => {
    setHighlightedPlan(planName);

    // Scroll vers le tableau
    const tableElement = document.getElementById('pricing-table');
    if (tableElement) {
      tableElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    // Retirer le highlight après 3 secondes
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
        trial: selectedPlan.name === 'free' ? true : false, // Plus en trial après paiement
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

        // Déclencher la mise à jour de l'UsageProgressBar
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
        // Trier les plans selon leur rank
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

  // Fonction pour obtenir les styles d'un plan
  const getPlanStyles = (planName: string) => {
    if (planName === 'pro') {
      return {
        card: 'bg-accent-light border-accent',
        title: 'text-primary',
        description: 'text-secondary',
        price: 'text-accent',
        button: 'bg-accent hover:bg-accent/80 text-white border-accent',
      };
    }
    if (planName === 'free') {
      return {
        card: 'bg-muted border-default',
        title: 'text-primary',
        description: 'text-secondary',
        price: 'text-accent',
        button: 'bg-card hover:bg-hover text-primary border-default',
      };
    }
    return {
      card: 'bg-card border-default hover:border-accent/50',
      title: 'text-primary',
      description: 'text-secondary',
      price: 'text-accent',
      button: 'bg-primary hover:bg-primary/80 text-white border-transparent',
    };
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full pt-32 pb-16 px-4 bg-page">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-center lg:max-w-2xl text-primary mb-10"
      >
        {t('pricing_page_title')}
      </motion.h1>

      {/* Toggle Mensuel/Annuel */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row items-center justify-center w-full gap-4 mb-8"
      >
        <span
          className={`text-sm font-medium transition-colors duration-200 ${
            !togglePlan ? 'text-accent' : 'text-muted'
          }`}
        >
          {t('monthly')}
        </span>

        <button
          onClick={() => setTogglePlan(!togglePlan)}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-page ${
            togglePlan ? 'bg-accent' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
              togglePlan ? 'translate-x-9' : 'translate-x-1'
            }`}
          />
        </button>

        <span
          className={`text-sm font-medium transition-colors duration-200 ${
            togglePlan ? 'text-accent' : 'text-muted'
          }`}
        >
          {t('yearly')}
        </span>

        <span
          className={`ml-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            togglePlan
              ? 'bg-accent-light text-accent'
              : 'bg-muted text-secondary'
          }`}
        >
          {t('save_20_percent')}
        </span>
      </motion.div>

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
        {loading ? (
          // Skeleton Loader
          <>
            {[1, 2, 3, 4].map(index => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 * index,
                  ease: 'easeInOut',
                }}
                className="flex relative flex-col items-center justify-between bg-card backdrop-blur-sm border border-default rounded-xl p-8 animate-pulse"
              >
                {/* Badge skeleton */}
                <div className="absolute top-4 right-1/2 translate-x-1/2">
                  <div className="h-6 w-24 bg-hover rounded-full"></div>
                </div>

                {/* Title and description skeleton */}
                <div className="text-center my-8 w-full">
                  <div className="h-8 w-32 bg-hover rounded mb-4 mx-auto"></div>
                  <div className="h-4 w-48 bg-hover rounded mx-auto"></div>
                </div>

                {/* Price skeleton */}
                <div className="text-center mb-8 w-full">
                  <div className="h-12 w-24 bg-hover rounded mb-4 mx-auto"></div>
                  <div className="h-4 w-32 bg-hover rounded mx-auto"></div>
                </div>

                {/* Features skeleton */}
                <div className="space-y-4 mb-8 w-full">
                  <div className="h-4 w-full bg-hover rounded"></div>
                  <div className="h-4 w-3/4 bg-hover rounded"></div>
                  <div className="h-4 w-1/2 bg-hover rounded"></div>
                </div>

                {/* Button skeleton */}
                <div className="w-full h-12 bg-hover rounded-lg"></div>
              </motion.div>
            ))}
          </>
        ) : plans.length > 0 ? (
          plans.map((plan: Plan, index: number) => {
            const styles = getPlanStyles(plan.name);
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 * index,
                  ease: 'easeInOut',
                }}
                key={plan.id}
              >
                <motion.div
                  onClick={() => handlePlanClick(plan.name)}
                  className={`flex relative flex-col items-center justify-between backdrop-blur-sm border rounded-xl p-8 transition-all duration-300 cursor-pointer ${styles.card}`}
                  whileHover={{ scale: 1.02 }}
                >
                  {plan.name === 'pro' && (
                    <div className="absolute top-4 right-1/2 translate-x-1/2 flex mb-4 mx-auto">
                      <span className="text-xs font-medium text-accent bg-accent/20 rounded-full px-3 py-1">
                        {t('most_popular')}
                      </span>
                    </div>
                  )}

                  <div className="text-center my-8">
                    <h2 className={`text-2xl font-bold ${styles.title} mb-2 capitalize`}>
                      {plan.name}
                    </h2>
                    <p className={`text-sm ${styles.description}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="text-center mb-8">
                    <div>
                      <span className={`text-4xl font-bold ${styles.price}`}>
                        {language === 'en' ? '€' : ''}
                        {togglePlan ? plan.price_yearly : plan.price_monthly}
                        {language === 'fr' ? '€' : ''}
                      </span>
                      <span className="text-muted text-sm ml-2">
                        {t('per_month')}
                      </span>
                    </div>
                    {togglePlan && (
                      <div className="text-sm flex flex-col items-center justify-center gap-2 mt-2">
                        <span className="text-secondary font-medium">
                          {t('billed_yearly')} {language === 'en' ? '€' : ''}
                          {(plan.price_yearly * 0.8 * 12).toFixed(2)}
                          {language === 'fr' ? '€' : ''}
                        </span>
                        <span className="text-accent text-xs font-medium">
                          {t('save_20_percent')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChoosePlan(plan);
                    }}
                    className={`w-full cursor-pointer font-semibold py-3 px-6 rounded-lg border transition-all duration-200 ${styles.button}`}
                  >
                    {t('choose_plan')}
                  </button>
                </motion.div>
                
                {currentUserPlan === plan.name && (
                  <div className="flex my-4 mx-auto justify-center items-center">
                    <span className="text-xs font-medium text-muted bg-muted/20 rounded-full px-3 py-1 border border-default">
                      {t('your_current_plan')}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-secondary text-lg">
              {plans.length === 0
                ? t('no_plans_available')
                : t('loading_plans')}
            </div>
          </div>
        )}
      </div>

      {/* Tableau comparatif */}
      {!loading && plans.length > 0 && (
        <>
          <FloatingPricingHeader
            plans={plans}
            togglePlan={togglePlan}
            highlightedPlan={highlightedPlan}
            language={language}
          />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-6xl px-4 mt-16"
          >
            <h2 className="text-2xl font-bold text-center text-primary mb-8">
              {t('compare_plans')}
            </h2>
            <div
              id="pricing-table"
              className="bg-card backdrop-blur-sm border border-default rounded-xl overflow-hidden"
            >
              <div className="overflow-x-auto">
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
                              ? 'bg-accent/20'
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
                            <span className="text-sm text-accent font-bold">
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
                  <tbody>
                    {(() => {
                      // Définir les sections et leurs features
                      const sections = {
                        Limites: [
                          'max_active_projects',
                          'max_active_clients',
                          'max_prospects_active',
                          'max_handle_mentors',
                        ],
                        Stockage: ['storage'],
                        Newsletters: [
                          'based_newsletters',
                          'advanced_newsletters',
                          'personalized_newsletters',
                          'max_newsletters',
                        ],
                        Support: [
                          'priority_support',
                          'all_time_support',
                          'phone_support',
                          'email_support',
                        ],
                        Fonctionnalités: [
                          'personalized_integrations',
                          'anticipated_features',
                          'data_export',
                          'advanced_reports',
                          'auto_save',
                        ],
                      };

                      return Object.entries(sections).map(
                        ([sectionName, sectionFeatures]) => (
                          <React.Fragment key={sectionName}>
                            {/* En-tête de section */}
                            <tr className="bg-hover">
                              <td
                                colSpan={plans.length + 1}
                                className="p-3 text-primary font-semibold text-center"
                              >
                                {sectionName}
                              </td>
                            </tr>

                            {/* Features de la section */}
                            {sectionFeatures.map(featureKey => (
                              <tr
                                key={featureKey}
                                className="border-b border-default/50 hover:bg-hover/50 transition-colors"
                              >
                                <td className="p-4 text-secondary font-medium">
                                  {(() => {
                                    const labels = {
                                      max_active_projects: t(
                                        'max_active_projects'
                                      ),
                                      max_active_clients:
                                        t('max_active_clients'),
                                      max_prospects_active: t(
                                        'max_prospects_active'
                                      ),
                                      max_handle_mentors:
                                        t('max_handle_mentors'),
                                      storage: t('storage'),
                                      based_newsletters: t('based_newsletters'),
                                      advanced_newsletters: t(
                                        'advanced_newsletters'
                                      ),
                                      personalized_newsletters: t(
                                        'personalized_newsletters'
                                      ),
                                      priority_support: t('priority_support'),
                                      all_time_support: t('all_time_support'),
                                      phone_support: t('phone_support'),
                                      email_support: t('email_support'),
                                      personalized_integrations: t(
                                        'personalized_integrations'
                                      ),
                                      anticipated_features: t(
                                        'anticipated_features'
                                      ),
                                      data_export: t('data_export'),
                                      advanced_reports: t('advanced_reports'),
                                      auto_save: t('auto_save'),
                                      max_newsletters: t('max_newsletters'),
                                    };
                                    return (
                                      labels[
                                        featureKey as keyof typeof labels
                                      ] ||
                                      featureKey
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, l => l.toUpperCase())
                                    );
                                  })()}
                                </td>
                                {plans.map(plan => (
                                  <td
                                    key={plan.id}
                                    className={`p-4 text-center transition-all duration-500 ${
                                      highlightedPlan === plan.name
                                        ? 'bg-accent/20'
                                        : ''
                                    }`}
                                  >
                                    {(() => {
                                      if (!plan.features)
                                        return (
                                          <span className="text-muted">
                                            -
                                          </span>
                                        );

                                      try {
                                        const features =
                                          typeof plan.features === 'string'
                                            ? JSON.parse(plan.features)
                                            : plan.features;

                                        const value = features[featureKey];

                                        if (typeof value === 'boolean') {
                                          return value ? (
                                            <IconCheck className="w-5 h-5 text-success mx-auto" />
                                          ) : (
                                            <IconX className="w-5 h-5 text-muted mx-auto" />
                                          );
                                        } else if (typeof value === 'number') {
                                          if (featureKey === 'storage') {
                                            return (
                                              <span className="text-primary font-medium">
                                                {value === 0
                                                  ? '∞'
                                                  : value === 100
                                                    ? '100 MB'
                                                    : `${value} GB`}
                                              </span>
                                            );
                                          }
                                          return (
                                            <span className="text-primary font-medium">
                                              {value === 0 ? '∞' : value}
                                            </span>
                                          );
                                        } else if (typeof value === 'string') {
                                          return (
                                            <span className="text-primary text-sm">
                                              {value}
                                            </span>
                                          );
                                        }

                                        return (
                                          <span className="text-muted">
                                            -
                                          </span>
                                        );
                                      } catch {
                                        return (
                                          <span className="text-muted">
                                            -
                                          </span>
                                        );
                                      }
                                    })()}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
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
