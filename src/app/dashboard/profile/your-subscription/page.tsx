'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { fetchUserById, fetchSubscriptionsUser, fetchPlans } from '@/lib/api';
import useLenis from '@/utils/useLenis';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import SupportDropdown from '@/app/components/SupportDropdown';
import UpgradeDropdown from '@/app/components/UpgradeDropdown';
import PaymentModal from '@/app/components/PaymentModal';
import FreePlanModal from '@/app/components/FreePlanModal';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  profile_picture: {
    id: number;
    url: string;
    formats?: {
      thumbnail: { url: string };
      small: { url: string };
      medium: { url: string };
      large: { url: string };
    };
  } | null;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  id: number;
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
  useLenis();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [supportDropdownOpen, setSupportDropdownOpen] = useState(false);
  const [upgradeDropdownOpen, setUpgradeDropdownOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFreePlanModal, setShowFreePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [togglePlan, setTogglePlan] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    profile_picture: {
      url: '',
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const data = await fetchUserById(user.id);
        setProfile(data);
        console.log('Réponse :', data);
        setFormData({
          username: data.username,
          email: data.email,
          profile_picture: {
            url: data.profile_picture?.url || '',
          },
        });
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
        const response = await fetchSubscriptionsUser(user.id);
        console.log('Subscriptions response:', response);
        setSubscriptions(response.data || []);
        setEditing(false);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        showGlobalPopup('Erreur lors du chargement des abonnements', 'error');
      } finally {
        setLoading(false);
        setEditing(false);
      }
    };

    const fetchAvailablePlans = async () => {
      try {
        const response = await fetchPlans();
        setAvailablePlans(response.data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchProfile();
    fetchSubscriptions();
    fetchAvailablePlans();
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
      // Ici vous pouvez ajouter la logique pour créer la nouvelle subscription
      console.log('Plan sélectionné:', selectedPlan);
      showGlobalPopup(
        'Paiement réussi ! Votre abonnement a été mis à niveau.',
        'success'
      );
      setShowPaymentModal(false);
      setSelectedPlan(null);

      // Recharger les subscriptions
      const response = await fetchSubscriptionsUser(user.id);
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      showGlobalPopup(
        "Erreur lors de la mise à niveau de l'abonnement",
        'error'
      );
    }
  };

  const handleSave = async () => {
    try {
      // Si une nouvelle image a été sélectionnée, l'uploader d'abord
      // Mettre à jour les autres données du profil
      const updateFormData = new FormData();
      updateFormData.append('username', formData.username);
      updateFormData.append('email', formData.email);

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${user?.id || 0}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: updateFormData,
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de l'utilisateur");
      }

      const updatedData = await response.json();
      setEditing(false);
      showGlobalPopup('Profil mis à jour avec succès', 'success');
      //on affiche dynamiquement le nouveau profil
      setProfile(updatedData);
    } catch (error) {
      console.error('Error updating profile:', error);
      showGlobalPopup('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: profile?.username || '',
      email: profile?.email || '',
      profile_picture: {
        url: profile?.profile_picture?.url || '',
      },
    });
    setEditing(false);
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
          <div className="flex lg:flex-row flex-col gap-4   items-center justify-between">
            <div className="h-8 bg-zinc-800 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-zinc-800 rounded w-24 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 bg-zinc-800 rounded-full animate-pulse"></div>
                  <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse"></div>
                    <div className="h-10 bg-zinc-800 rounded animate-pulse"></div>
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
        <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-zinc-200">
          {t('your_subscription')}
        </h1>
        {editing ? (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full  gap-4">
            <button
              onClick={handleCancel}
              className="bg-orange-500/20 lg:w-fit w-full !text-orange-500 border border-orange-500/20 px-4 py-2 hover:bg-orange-500/10 hover:!text-white rounded-lg cursor-pointer transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="bg-emerald-500 !text-black px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors"
            >
              {t('save')}
            </button>
          </div>
        ) : subscriptions.length > 0 && subscriptions[0].trial ? (
          <button
            onClick={() => setEditing(true)}
            className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:!text-white    transition-colors"
          >
            {t('edit_subscription')}
          </button>
        ) : subscriptions.length > 0 ? (
          <p className="!text-zinc-400">{t('active_subscription')}</p>
        ) : (
          <p className="!text-zinc-400">{t('no_subscription')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Informations de l'abonnement */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 lg:!p-6 !p-4 rounded-lg border border-zinc-800 space-y-6">
            <h2 className="!text-xl font-semibold !text-zinc-200 mb-4">
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
                    className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700"
                  >
                    {/* En-tête de l'abonnement */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${subscription.trial ? 'bg-orange-500' : 'bg-emerald-500'}`}
                        ></div>
                        <h3 className="!text-lg font-semibold !text-zinc-200 capitalize">
                          {subscription.plan?.name || 'Plan'}
                        </h3>
                        {subscription.trial && (
                          <span className="bg-orange-500/20 !text-orange-400 !text-xs px-2 py-1 rounded-full">
                            {t('trial')}
                          </span>
                        )}
                      </div>
                      <div className="!text-right">
                        <div className="!text-2xl font-bold !text-emerald-400">
                          €{subscription.plan?.price_monthly || 0}
                        </div>
                        <div className="!text-sm !text-zinc-400">
                          {t('per_month')}
                        </div>
                      </div>
                    </div>

                    {/* Détails de l'abonnement */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="!text-zinc-400 !text-sm font-light">
                          {t('billing_type')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
                          <span className="!text-zinc-200 font-medium capitalize">
                            {subscription.billing_type}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="!text-zinc-400 !text-sm font-light">
                          {t('status')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
                          <div
                            className={`w-2 h-2 rounded-full ${subscription.trial ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          ></div>
                          <span className="!text-zinc-200">
                            {subscription.trial ? t('trial') : t('active')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="!text-zinc-400 !text-sm font-light">
                          {t('created_at')}
                        </label>
                        <p className="!text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                          {subscription.createdAt
                            ? new Date(
                                subscription.createdAt
                              ).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="!text-zinc-400 !text-sm font-light">
                          {t('last_updated')}
                        </label>
                        <p className="!text-zinc-200 p-3 bg-zinc-800 rounded-lg">
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
                        <label className="!text-zinc-400 !text-sm font-light">
                          {t('description')}
                        </label>
                        <p className="!text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                          {subscription.plan?.description ||
                            t('no_description')}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="!text-zinc-400 !text-sm font-light">
                          {t('features')}
                        </label>
                        <div className="p-3 bg-zinc-800 rounded-lg">
                          {subscription.plan?.features ? (
                            <div className="!text-zinc-200 space-y-2">
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
                                            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
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
                                            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
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
                            <p className="!text-zinc-500 italic">
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
                <div className="!text-zinc-400 !text-lg mb-4">
                  {t('no_subscription_found')}
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  className="bg-emerald-500 !text-black px-6 py-3 rounded-lg hover:bg-emerald-400 transition-colors font-semibold"
                >
                  {t('choose_plan')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Actions rapides */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-6">
            <h2 className="!text-xl font-semibold !text-zinc-200 mb-4">
              {t('quick_actions')}
            </h2>

            <div className="space-y-4">
              {subscriptions && subscriptions.length > 0 && (
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
              )}

              <button
                onClick={() => router.push('/pricing')}
                className="cursor-pointer w-full bg-zinc-200 !text-zinc-900 px-4 py-3 rounded-lg  transition-colors font-semibold border border-zinc-700 hover:!text-zinc-200 hover:border-zinc-200 hover:bg-zinc-200/20"
              >
                {t('view_all_plans')}
              </button>

              <button
                onClick={() =>
                  router.push('/dashboard/profile/personal-information')
                }
                className="cursor-pointer w-full bg-zinc-800 !text-zinc-200 px-4 py-3 rounded-lg hover:bg-zinc-900 transition-colors font-semibold border border-zinc-700 hover:border-zinc-200"
              >
                {t('back_to_profile')}
              </button>
            </div>

            {/* Informations supplémentaires */}
            <div className="pt-6 border-t border-zinc-800">
              <h3 className="!text-sm font-semibold !text-zinc-300 mb-3">
                {t('need_help')}
              </h3>
              <p className="!text-sm !text-zinc-400 mb-4">
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
