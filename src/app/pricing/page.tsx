'use client';
import { useLanguage } from '@/app/context/LanguageContext';
import useLenis from '@/utils/useLenis';
import { useState, useEffect } from 'react';
import { createSubscription, fetchPlans } from '@/lib/api';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { usePopup } from '../context/PopupContext';
import PaymentModal from '@/app/components/PaymentModal';

interface Plan {
  id: number;
  documentId: string;
  name: string;
  id_terminalPrice: number | null;
  billing_type: string;
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
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  useLenis();
  const [plans, setPlans] = useState<Plan[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const { showGlobalPopup } = usePopup();

  const handleChoosePlan = async (plan: Plan) => {
    if (user) {
      // Ouvrir le modal de paiement au lieu de créer directement la subscription
      setSelectedPlan(plan);
      setShowPaymentModal(true);
    } else {
      router.push('/login');
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlan || !user) return;

    try {
      const billingType = togglePlan ? 'yearly' : 'monthly';
      const price = togglePlan
        ? selectedPlan.price_yearly
        : selectedPlan.price_monthly;

      const response = await createSubscription(user.id, {
        plan: selectedPlan.id,
        billing_type: billingType,
        price: price,
        trial: false, // Plus en trial après paiement
        plan_name: selectedPlan.name,
        plan_description: selectedPlan.description,
        plan_features: selectedPlan.features,
      });

      if (response.data) {
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
        console.log('Plans data', response.data);
        setPlans(response.data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlansData();
  }, []);
  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full !mt-30 gap-4 ">
      <h1 className="!text-4xl font-bold !text-center lg:max-w-2xl clip-text bg-gradient-to-b from-zinc-400 via-zinc-300 to-zinc-400 bg-clip-text !text-transparent mb-10">
        {t('pricing_page_title')}
      </h1>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full lg:max-w-6xl max-w-full lg:!px-6 !px-2">
        {loading ? (
          // Skeleton Loader
          <>
            {[1, 2, 3].map(index => (
              <div
                key={index}
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
              </div>
            ))}
          </>
        ) : plans.length > 0 ? (
          plans.map((plan, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15 * index,
                ease: 'easeInOut',
              }}
              key={plan.id}
              className={`
                flex relative flex-col items-center justify-between
                ${
                  plan.name === 'starter'
                    ? 'bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                    : plan.name === 'pro'
                      ? 'bg-emerald-300/10 backdrop-blur-sm border border-emerald-400 rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                      : 'bg-zinc-900/70 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-emerald-400/50 transition-all duration-300 hover:transform cursor-pointer'
                }`}
            >
              {plan.name === 'pro' && (
                <div className="absolute top-4 right-1/2 translate-x-1/2 flex !mb-4 !mx-auto md:!w-fit !w-11/12 text-center justify-center items-center">
                  <span className="!text-xs font-medium !text-emerald-400 bg-emerald-500/20 rounded-full px-2 py-1 md:!w-fit !w-full  ">
                    {t('most_popular')}
                  </span>
                </div>
              )}
              <div className="!text-center my-8">
                <h2 className="!text-2xl font-bold !text-zinc-200 mb-2 capitalize">
                  {plan.name}
                </h2>
                <p className="!text-zinc-400 !text-sm">{plan.description}</p>
              </div>

              <div className="!text-center mb-8">
                <div>
                  <span className="!text-4xl font-bold !text-emerald-400">
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

              <div className="space-y-4 mb-8">
                {plan.features && plan.features !== '' ? (
                  <div className="!text-sm !text-zinc-300">
                    <p>{plan.features}</p>
                  </div>
                ) : (
                  <div className="!text-sm !text-zinc-500 italic">
                    {t('no_features_specified')}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  handleChoosePlan(plan);
                }}
                className={`w-full cursor-pointer ${plan.name === 'pro' ? 'bg-emerald-300 hover:bg-emerald-300/10 !text-black border border-emerald-300 hover:!text-emerald-300' : 'bg-zinc-200 hover:bg-zinc-700 !text-black hover:bg-zinc-950 border border-zinc-200 hover:!text-zinc-200'} font-semibold py-3 px-6 rounded-lg transition-colors duration-200`}
              >
                {t('choose_plan')}
              </button>
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
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={selectedPlan}
          billingType={togglePlan ? 'yearly' : 'monthly'}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
