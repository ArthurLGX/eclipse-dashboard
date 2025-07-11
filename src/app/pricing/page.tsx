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
  const { user } = useAuth();
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
      });

      if (response.data) {
        console.log('Plan choisi : ', selectedPlan);
        showGlobalPopup(
          'Paiement réussi ! Votre abonnement est maintenant actif.',
          'success'
        );
        setShowPaymentModal(false);
        setSelectedPlan(null);
        router.push('/dashboard/profile/your-subscription');
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
        const response = await fetchPlans();
        // Trier les plans selon leur rank
        const sortedPlans = response.data.sort(
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
        const subscription = await fetchSubscriptionsUser(user.id);
        if (subscription.data && subscription.data.length > 0) {
          const planName = subscription.data[0].plan.name;
          console.log('Plan name : ', planName);
          setCurrentUserPlan(planName);
        }
      } catch (error) {
        console.error('Error fetching current user plan:', error);
      }
    };

    fetchPlansData();
    fetchCurrentUserPlan();
  }, [user?.id]);
  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full !mt-30 gap-4 ">
      <h1 className="!text-4xl font-bold !text-center lg:max-w-2xl clip-text bg-gradient-to-b from-zinc-400 via-zinc-300 to-zinc-400 bg-clip-text !text-transparent mb-10">
        {t('pricing_page_title')}
      </h1>

      {/* Affichage des limites du plan gratuit si l'utilisateur est connecté */}
      <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-4 mb-8">
        <span
          className={`!text-sm font-medium transition-colors duration-200 ${!togglePlan ? '!text-emerald-400' : '!text-zinc-400'}`}
        >
          {t('monthly')}
        </span>

        <button
          onClick={() => setTogglePlan(!togglePlan)}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
            togglePlan ? 'bg-emerald-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
              togglePlan ? 'translate-x-9' : 'translate-x-1'
            }`}
          />
        </button>

        <span
          className={`!text-sm font-medium transition-colors duration-200 ${togglePlan ? '!text-emerald-400' : '!text-zinc-400'}`}
        >
          {t('yearly')}
        </span>

        <span
          className={`ml-2 px-2 py-1 ${
            togglePlan
              ? 'bg-emerald-500/20 !text-emerald-300'
              : 'bg-zinc-900 !text-zinc-500'
          }  !text-xs font-medium rounded-full`}
        >
          {t('save_20_percent')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full lg:max-w-7xl max-w-full lg:!px-6 !px-2">
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
                className="flex relative flex-col items-center justify-between bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 animate-pulse"
              >
                {/* Badge skeleton */}
                <div className="absolute top-4 right-1/2 translate-x-1/2">
                  <div className="h-6 w-24 bg-zinc-800 rounded-full"></div>
                </div>

                {/* Title and description skeleton */}
                <div className="!text-center my-8 w-full">
                  <div className="h-8 w-32 bg-zinc-800 rounded mb-4 mx-auto"></div>
                  <div className="h-4 w-48 bg-zinc-800 rounded mx-auto"></div>
                </div>

                {/* Price skeleton */}
                <div className="!text-center mb-8 w-full">
                  <div className="h-12 w-24 bg-zinc-800 rounded mb-4 mx-auto"></div>
                  <div className="h-4 w-32 bg-zinc-800 rounded mx-auto"></div>
                </div>

                {/* Features skeleton */}
                <div className="space-y-4 mb-8 w-full">
                  <div className="h-4 w-full bg-zinc-800 rounded"></div>
                  <div className="h-4 w-3/4 bg-zinc-800 rounded"></div>
                  <div className="h-4 w-1/2 bg-zinc-800 rounded"></div>
                </div>

                {/* Button skeleton */}
                <div className="w-full h-12 bg-zinc-800 rounded-lg"></div>
              </motion.div>
            ))}
          </>
        ) : plans.length > 0 ? (
          plans.map((plan: Plan, index: number) => (
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 * index,
                  ease: 'easeInOut',
                }}
                key={plan.id}
                onClick={() => handlePlanClick(plan.name)}
                className={`
                flex relative flex-col items-center justify-between
                ${
                  plan.name === 'starter'
                    ? 'bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                    : plan.name === 'pro'
                      ? 'bg-emerald-300/10 backdrop-blur-sm border border-emerald-400 rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                      : plan.name === 'expert'
                        ? 'bg-zinc-900/70 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                        : 'bg-zinc-200 backdrop-blur-sm border border-zinc-800   rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                }`}
              >
                {plan.name === 'pro' && (
                  <div className="absolute top-4 right-1/2 translate-x-1/2 flex !mb-4 !mx-auto md:!w-fit !w-11/12 !text-center justify-center items-center">
                    <span className="!text-xs font-medium !text-emerald-400 bg-emerald-500/20 rounded-full px-2 py-1 md:!w-fit !w-full  ">
                      {t('most_popular')}
                    </span>
                  </div>
                )}

                <div className="!text-center my-8">
                  <h2
                    className={`!text-2xl font-bold ${
                      plan.name === 'free' ? '!text-zinc-900' : '!text-zinc-200'
                    } mb-2 capitalize`}
                  >
                    {plan.name}
                  </h2>
                  <p
                    className={`!text-zinc-400 !text-sm ${
                      plan.name === 'free' ? '!text-zinc-900' : '!text-zinc-400'
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="!text-center mb-8">
                  <div>
                    <span
                      className={`!text-4xl font-bold ${
                        plan.name === 'free'
                          ? '!text-zinc-900'
                          : '!text-emerald-300'
                      }`}
                    >
                      {language === 'en' ? '€' : ''}
                      {togglePlan ? plan.price_yearly : plan.price_monthly}
                      {language === 'fr' ? '€' : ''}
                    </span>
                    <span className="!text-zinc-400 !text-sm ml-2">
                      {t('per_month')}
                    </span>
                  </div>
                  {togglePlan && (
                    <div className="!text-sm flex flex-col items-center justify-center gap-2 !text-zinc-500">
                      <span className="!text-zinc-400 font-semibold">
                        {togglePlan
                          ? t('billed_yearly') +
                            ' ' +
                            (language === 'en' ? '€' : '') +
                            (plan.price_yearly * 0.8 * 12).toFixed(2) +
                            (language === 'fr' ? '€' : '')
                          : ''}
                      </span>
                      <span className="!text-zinc-400 !text-sm font-semibold">
                        {togglePlan ? t('save_20_percent') : ''}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleChoosePlan(plan);
                  }}
                  className={`w-full cursor-pointer ${plan.name === 'pro' ? 'bg-emerald-300 hover:bg-emerald-300/10 !text-black border border-emerald-300 hover:!text-emerald-300' : plan.name === 'free' ? 'bg-zinc-900 hover:bg-zinc-200 !text-zinc-200 border border-zinc-200 border-zinc-200 hover:border-zinc-900 hover:!text-zinc-900' : 'bg-zinc-200 hover:bg-zinc-700 !text-black hover:bg-zinc-950 border border-zinc-200 hover:!text-zinc-200'} font-semibold py-3 px-6 rounded-lg transition-colors duration-200`}
                >
                  {t('choose_plan')}
                </button>
              </motion.div>
              {currentUserPlan === plan.name && (
                <div className="flex !my-4 !mx-auto md:!w-fit !w-11/12 !text-center justify-center items-center">
                  <span className="!text-xs font-medium !text-zinc-200/50 bg-zinc-200/10 rounded-full px-2 py-1 md:!w-fit !w-full border border-zinc-200/20  ">
                    {t('your_current_plan')}
                  </span>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-full !text-center py-12">
            <div className="!text-zinc-400 !text-lg">
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
          <div className="w-full lg:max-w-6xl lg:!px-6 !px-2 mt-12">
            <h2 className="!text-2xl font-bold !text-center !text-zinc-200 mb-8">
              {t('compare_plans')}
            </h2>
            <div
              id="pricing-table"
              className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="p-4 !text-left !text-zinc-400 font-medium capitalize w-1/3">
                        {t('features')}
                      </th>
                      {plans.map(plan => (
                        <th
                          key={plan.id}
                          className={`p-4 !text-center !text-zinc-200 font-semibold transition-all duration-500 w-1/6 ${
                            highlightedPlan === plan.name
                              ? 'bg-emerald-300/20'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span
                              className={`capitalize transition-all duration-500 ${
                                highlightedPlan === plan.name
                                  ? '!text-emerald-300 !font-extrabold'
                                  : '!font-normal'
                              }`}
                            >
                              {plan.name}
                            </span>
                            <span className="!text-sm !text-emerald-400 font-bold">
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
                            <tr className="bg-zinc-800/30">
                              <td
                                colSpan={plans.length + 1}
                                className="p-3 !text-zinc-200 font-semibold !text-center"
                              >
                                {sectionName}
                              </td>
                            </tr>

                            {/* Features de la section */}
                            {sectionFeatures.map(featureKey => (
                              <tr
                                key={featureKey}
                                className="border-b border-zinc-800/50"
                              >
                                <td className="p-4 !text-zinc-300 font-medium">
                                  {(() => {
                                    const labels = {
                                      max_active_projects: 'Projets actifs',
                                      max_active_clients: 'Clients actifs',
                                      max_prospects_active: 'Prospects actifs',
                                      max_handle_mentors: 'Mentors gérés',
                                      storage: 'Stockage',
                                      based_newsletters: 'Newsletters de base',
                                      advanced_newsletters:
                                        'Newsletters avancées',
                                      personalized_newsletters:
                                        'Newsletters personnalisées',
                                      priority_support: 'Support prioritaire',
                                      all_time_support: 'Support 24/7',
                                      phone_support: 'Support téléphonique',
                                      email_support: 'Support email',
                                      personalized_integrations:
                                        'Intégrations personnalisées',
                                      anticipated_features:
                                        'Accès anticipé aux nouvelles fonctionnalités',
                                      data_export: 'Export des données',
                                      advanced_reports: 'Rapports avancés',
                                      auto_save: 'Sauvegarde automatique',
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
                                    className={`p-4 !text-center transition-all duration-500 ${
                                      highlightedPlan === plan.name
                                        ? 'bg-emerald-300/20 '
                                        : ''
                                    }`}
                                  >
                                    {(() => {
                                      if (!plan.features)
                                        return (
                                          <span className="!text-zinc-600">
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
                                            <span className="!text-emerald-400">
                                              ✓
                                            </span>
                                          ) : (
                                            <span className="!text-zinc-600">
                                              ✗
                                            </span>
                                          );
                                        } else if (typeof value === 'number') {
                                          if (featureKey === 'storage') {
                                            return (
                                              <span className="!text-zinc-200 font-medium">
                                                {value === 0
                                                  ? '∞'
                                                  : value === 100
                                                    ? '100 MB'
                                                    : `${value} GB`}
                                              </span>
                                            );
                                          }
                                          return (
                                            <span className="!text-zinc-200 font-medium">
                                              {value === 0 ? '∞' : value}
                                            </span>
                                          );
                                        } else if (typeof value === 'string') {
                                          return (
                                            <span className="!text-zinc-200 !text-sm">
                                              {value}
                                            </span>
                                          );
                                        }

                                        return (
                                          <span className="!text-zinc-600">
                                            -
                                          </span>
                                        );
                                      } catch {
                                        return (
                                          <span className="!text-zinc-600">
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
          </div>
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
