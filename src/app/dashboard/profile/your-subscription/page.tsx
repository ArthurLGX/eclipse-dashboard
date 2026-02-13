'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import {
  fetchUserById,
  fetchSubscriptionsUser,
  fetchPlans,
  createSubscription,
} from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import SupportDropdown from '@/app/components/SupportDropdown';
import UpgradeDropdown from '@/app/components/UpgradeDropdown';
import PaymentModal from '@/app/components/PaymentModal';
import FreePlanModal from '@/app/components/FreePlanModal';
import { useRouter } from 'next/navigation';

interface Plan {
  id: number;
  documentId?: string;
  name: string;
  description: string;
  features: string;
  price_monthly: number;
  price_yearly: number;
}

interface Subscription {
  id: number;
  plan: Plan;
  billing_type: string;
  trial: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function YourSubscriptionPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { user, triggerSubscriptionUpdate } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportDropdownOpen, setSupportDropdownOpen] = useState(false);
  const [upgradeDropdownOpen, setUpgradeDropdownOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFreePlanModal, setShowFreePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [togglePlan, setTogglePlan] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        await fetchUserById(user.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
        showGlobalPopup('Erreur lors du chargement du profil', 'error');
      } finally {
        setLoading(false);
      }
    };
    const fetchSubscriptions = async () => {
      try {
        if (!user?.id) return;
        const response = await fetchSubscriptionsUser(user.id) as { data?: Subscription[] };
        setSubscriptions(response?.data || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        showGlobalPopup('Erreur lors du chargement des abonnements', 'error');
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailablePlans = async () => {
      try {
        const response = await fetchPlans() as { data?: Plan[] };
        setAvailablePlans(response?.data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchProfile();
    fetchSubscriptions();
    fetchAvailablePlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setUpgradeDropdownOpen(false);

    // Si c'est le plan gratuit, afficher la modale du plan gratuit
    if (plan.name === 'free') {
      setShowFreePlanModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlan || !user) return;

    try {
      const billingType = togglePlan ? 'yearly' : 'monthly';
      const price = togglePlan
        ? selectedPlan.price_yearly
        : selectedPlan.price_monthly;

      // Appeler createSubscription pour mettre à jour la subscription
      const response = await createSubscription(user.id, {
        plan: selectedPlan.documentId || selectedPlan.id.toString(), // Utiliser documentId s'il existe, sinon l'ID
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
          'Paiement réussi ! Votre abonnement a été mis à niveau.',
          'success'
        );
        setShowPaymentModal(false);
        setShowFreePlanModal(false);
        setSelectedPlan(null);

        // Recharger les subscriptions pour afficher les nouvelles données
        const updatedSubscriptions = await fetchSubscriptionsUser(user.id) as { data?: Subscription[] };
        setSubscriptions(updatedSubscriptions?.data || []);

        // Déclencher la mise à jour de l'UsageProgressBar
        triggerSubscriptionUpdate();
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      showGlobalPopup(
        "Erreur lors de la mise à niveau de l'abonnement",
        'error'
      );
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
            <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-24 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="card p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 bg-muted rounded-full animate-pulse"></div>
                  <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="card p-6 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </ProtectedRoute>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-primary">
          {t('your_subscription')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Informations de l'abonnement */}
        <div className="lg:col-span-2">
          <div className="card lg:!p-6 !p-4 space-y-6">
            <h2 className="!text-xl font-semibold !text-primary mb-4">
              {t('subscription_details')}
            </h2>

            {subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-6">
                {subscriptions.map((subscription, index) => (
                  <motion.div
                    key={subscription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-hover p-6  border border-default"
                  >
                    {/* En-tête de l'abonnement */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${subscription.trial ? 'bg-warning' : 'bg-success'}`}
                        ></div>
                        <h3 className="!text-lg font-semibold !text-primary capitalize">
                          {subscription.plan?.name || 'Plan'}
                        </h3>
                        {subscription.trial && (
                          <span className="bg-warning-light !text-warning-text !text-xs px-2 py-1 rounded-full">
                            {t('trial')}
                          </span>
                        )}
                      </div>
                      <div className="!text-right">
                        <div className="!text-2xl font-bold !text-success-text">
                          €{subscription.plan?.price_monthly || 0}
                        </div>
                        <div className="!text-sm !text-secondary">
                          {t('per_month')}
                        </div>
                      </div>
                    </div>

                    {/* Détails de l'abonnement */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-secondary !text-sm font-light">
                          {t('billing_type')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-muted ">
                          <span className="text-primary font-medium capitalize">
                            {subscription.billing_type}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-secondary !text-sm font-light">
                          {t('status')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-muted ">
                          <div
                            className={`w-2 h-2 rounded-full ${subscription.trial ? 'bg-warning' : 'bg-success'}`}
                          ></div>
                          <span className="text-primary">
                            {subscription.trial ? t('trial') : t('active')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-secondary !text-sm font-light">
                          {t('created_at')}
                        </label>
                        <p className="text-primary p-3 bg-muted ">
                          {subscription.createdAt
                            ? new Date(
                                subscription.createdAt
                              ).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-secondary !text-sm font-light">
                          {t('last_updated')}
                        </label>
                        <p className="text-primary p-3 bg-muted ">
                          {subscription.updatedAt
                            ? new Date(
                                subscription.updatedAt
                              ).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Description et fonctionnalités */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-secondary !text-sm font-light">
                          {t('description')}
                        </label>
                        <p className="text-primary p-3 bg-muted ">
                          {subscription.plan?.description ||
                            t('no_description')}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-secondary !text-sm font-light">
                          {t('features')}
                        </label>
                        <div className="p-3 bg-muted ">
                          {subscription.plan?.features ? (
                            <div className="text-primary space-y-2">
                              {(() => {
                                try {
                                  const features =
                                    typeof subscription.plan.features ===
                                    'string'
                                      ? JSON.parse(subscription.plan.features)
                                      : subscription.plan.features;

                                  return Object.entries(features).map(
                                    ([key, value]) => {
                                      if (typeof value === 'boolean') {
                                        return value ? (
                                          <div
                                            key={key}
                                            className="flex items-center gap-2"
                                          >
                                            <span className="w-2 h-2 bg-success rounded-full"></span>
                                            <span>
                                              {key
                                                .replace(/_/g, ' ')
                                                .replace(/\b\w/g, l =>
                                                  l.toUpperCase()
                                                )}
                                            </span>
                                          </div>
                                        ) : null;
                                      } else if (typeof value === 'number') {
                                        return (
                                          <div
                                            key={key}
                                            className="flex items-center gap-2"
                                          >
                                            <span className="w-2 h-2 bg-success rounded-full"></span>
                                            <span>
                                              {key
                                                .replace(/_/g, ' ')
                                                .replace(/\b\w/g, l =>
                                                  l.toUpperCase()
                                                )}
                                              : {value === 0 ? '∞' : value}
                                            </span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }
                                  );
                                } catch {
                                  return <p>{subscription.plan.features}</p>;
                                }
                              })()}
                            </div>
                          ) : (
                            <p className="text-muted italic">
                              {t('no_features_specified')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="!text-center py-12">
                <div className="text-secondary !text-lg mb-4">
                  {t('no_subscription_found')}
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  className="btn-primary px-6 py-3 font-semibold"
                >
                  {t('choose_plan')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Actions rapides */}
        <div className="lg:col-span-1">
          <div className="card p-6 space-y-6 relative overflow-visible">
            <h2 className="!text-xl font-semibold !text-primary mb-4">
              {t('quick_actions')}
            </h2>

            <div className="space-y-4 relative overflow-visible">
              {subscriptions && subscriptions.length > 0 && (
                <div className="relative overflow-visible">
                  <UpgradeDropdown
                    currentPlan={subscriptions[0]?.plan?.name || 'free'}
                    availablePlans={availablePlans}
                    isOpen={upgradeDropdownOpen}
                    onToggleAction={() =>
                      setUpgradeDropdownOpen(!upgradeDropdownOpen)
                    }
                    onCloseAction={() => setUpgradeDropdownOpen(false)}
                    onPlanSelectAction={handlePlanSelect}
                    togglePlan={togglePlan}
                    onTogglePlanAction={() => setTogglePlan(!togglePlan)}
                    language={language}
                  />
                </div>
              )}

              <button
                onClick={() => router.push('/pricing')}
                className="btn-secondary w-full px-4 py-3 font-semibold"
              >
                {t('view_all_plans')}
              </button>

              <button
                onClick={() =>
                  router.push('/dashboard/profile/personal-information')
                }
                className="btn-ghost w-full px-4 py-3 font-semibold"
              >
                {t('back_to_profile')}
              </button>
            </div>

            {/* Informations supplémentaires */}
            <div className="pt-6 border-t border-default">
              <h3 className="!text-sm font-semibold !text-primary mb-3">
                {t('need_help')}
              </h3>
              <p className="!text-sm !text-secondary mb-4">
                {t('contact_support_message')}
              </p>
              <SupportDropdown
                userPlan={subscriptions[0]?.plan?.name || 'free'}
                isOpen={supportDropdownOpen}
                onToggle={() => setSupportDropdownOpen(!supportDropdownOpen)}
                onClose={() => setSupportDropdownOpen(false)}
              />
            </div>
          </div>
        </div>
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

      {showFreePlanModal && selectedPlan && (
        <FreePlanModal
          isOpen={showFreePlanModal}
          onClose={() => setShowFreePlanModal(false)}
          plan={{
            ...selectedPlan,
            documentId: selectedPlan.id.toString(),
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </motion.div>
  );
}
