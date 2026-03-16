'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import {
  fetchSubscriptionsUser,
  fetchPlans,
  fetchNumberOfProjectsUser,
  fetchNumberOfClientsUser,
  fetchNumberOfProspectsUser,
  fetchNumberOfMentorsUser,
  fetchNumberOfNewslettersUser,
  createSubscription,
  cancelSubscription,
} from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import PaymentModal from '@/app/components/PaymentModal';
import FreePlanModal from '@/app/components/FreePlanModal';
import { useRouter } from 'next/navigation';
import {
  IconMail,
  IconBook2,
  IconPhone,
  IconX,
} from '@tabler/icons-react';

interface Plan {
  id: number;
  documentId?: string;
  name: string;
  description: string;
  features: string;
  price_monthly: number;
  price_yearly: number;
  rank?: number;
}

interface Subscription {
  id: number;
  documentId?: string;
  plan: Plan;
  billing_type: string;
  trial: boolean;
  start_date?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsageData {
  projects: { current: number; limit: number };
  clients: { current: number; limit: number };
  prospects: { current: number; limit: number };
  mentors: { current: number; limit: number };
  newsletters: { current: number; limit: number };
  storage?: { current: number; limit: number };
}

const FEATURE_LABELS: Record<string, string> = {
  storage: 'Stockage',
  max_active_projects: 'Projets actifs',
  max_active_clients: 'Clients actifs',
  max_prospects_active: 'Smart Follow-Up',
  max_handle_mentors: 'Mentors',
  max_newsletters: 'Newsletters',
  based_newsletters: 'Newsletters basiques',
  advanced_newsletters: 'Newsletters avancées',
  personalized_newsletters: 'Newsletters perso.',
};

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateNumeric(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function YourSubscriptionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, triggerSubscriptionUpdate } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFreePlanModal, setShowFreePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [togglePlan] = useState(false);
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  const currentSubscription = subscriptions?.[0];
  const currentPlanName = currentSubscription?.plan?.name || 'free';

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
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
        setAvailablePlans((response?.data || []).sort((a, b) => (a.rank || 0) - (b.rank || 0)));
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchSubscriptions();
    fetchAvailablePlans();
  }, [user?.id, showGlobalPopup]);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!user?.id || !currentSubscription) return;
      try {
        const features = typeof currentSubscription.plan?.features === 'string'
          ? JSON.parse(currentSubscription.plan.features)
          : currentSubscription.plan?.features || {};
        const limits = {
          projects: features.max_active_projects ?? 1,
          clients: features.max_active_clients ?? 5,
          prospects: features.max_prospects_active ?? 10,
          mentors: features.max_handle_mentors ?? 0,
          newsletters: features.max_newsletters ?? 0,
          storage: features.storage ?? 0,
        };
        const [projectsCount, clientsCount, prospectsCount, mentorsCount, newslettersCount] = await Promise.all([
          fetchNumberOfProjectsUser(user.id),
          fetchNumberOfClientsUser(user.id),
          fetchNumberOfProspectsUser(user.id),
          fetchNumberOfMentorsUser(user.id),
          fetchNumberOfNewslettersUser(user.id),
        ]);
        setUsageData({
          projects: { current: projectsCount, limit: limits.projects },
          clients: { current: clientsCount, limit: limits.clients },
          prospects: { current: prospectsCount, limit: limits.prospects },
          mentors: { current: mentorsCount, limit: limits.mentors },
          newsletters: { current: newslettersCount, limit: limits.newsletters },
          storage: limits.storage ? { current: 0, limit: limits.storage } : undefined,
        });
      } catch (error) {
        console.error('Error fetching usage:', error);
      }
    };
    fetchUsage();
  }, [user?.id, currentSubscription]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
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
      const price = togglePlan ? selectedPlan.price_yearly : selectedPlan.price_monthly;
      const response = await createSubscription(user.id, {
        plan: selectedPlan.documentId || selectedPlan.id.toString(),
        billing_type: billingType,
        price,
        trial: selectedPlan.name === 'free',
        plan_name: selectedPlan.name,
        plan_description: selectedPlan.description,
        plan_features: selectedPlan.features,
        start_date: new Date().toISOString(),
      }) as { data?: unknown };
      if (response?.data) {
        showGlobalPopup('Paiement réussi ! Votre abonnement a été mis à niveau.', 'success');
        setShowPaymentModal(false);
        setShowFreePlanModal(false);
        setSelectedPlan(null);
        const updated = await fetchSubscriptionsUser(user.id) as { data?: Subscription[] };
        setSubscriptions(updated?.data || []);
        triggerSubscriptionUpdate();
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      showGlobalPopup("Erreur lors de la mise à niveau de l'abonnement", 'error');
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id || !confirm(t('cancel_subscription') + ' ?')) return;
    try {
      const response = await cancelSubscription(user.id) as { data?: unknown };
      if (response?.data) {
        showGlobalPopup(t('subscription_cancelled'), 'success');
        router.push('/pricing');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      showGlobalPopup("Erreur lors de l'annulation", 'error');
    }
  };

  const featuresList = useMemo(() => {
    if (!currentSubscription?.plan?.features) return [];
    const features = typeof currentSubscription.plan.features === 'string'
      ? JSON.parse(currentSubscription.plan.features)
      : currentSubscription.plan.features;
    const items: { key: string; label: string; value: string | number }[] = [];
    Object.entries(features).forEach(([key, value]) => {
      if (value === false) return;
      const label = FEATURE_LABELS[key] || key.replace(/_/g, ' ');
      const displayValue = typeof value === 'number'
        ? (value === 0 ? '∞' : value)
        : (value === true ? '' : String(value));
      if (typeof value === 'boolean' && !value) return;
      items.push({ key, label, value: displayValue });
    });
    return items;
  }, [currentSubscription]);

  const getUsageWidth = (current: number, limit: number) => {
    if (limit === 0) return 100;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (current: number, limit: number) => {
    if (limit === 0) return 'ok';
    const pct = (current / limit) * 100;
    return pct >= 90 ? 'warn' : pct >= 75 ? 'warn' : '';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6 space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="subscription-grid">
            <div className="space-y-4">
              <div className="h-48 bg-muted rounded-2xl animate-pulse" />
              <div className="h-64 bg-muted rounded-2xl animate-pulse" />
            </div>
            <div className="h-96 bg-muted rounded-2xl animate-pulse" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 lg:p-8"
      >
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Tableau de bord</Link>
            <span>›</span>
            <Link href="/dashboard/profile/personal-information" className="hover:text-primary transition-colors">Profil</Link>
            <span>›</span>
            <span className="text-primary font-medium">{t('your_subscription')}</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight">{t('your_subscription')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre plan et vos préférences de facturation
          </p>
        </div>

        {currentSubscription ? (
          <div className="subscription-grid">
            {/* Colonne gauche */}
            <div>
              {/* Plan Hero */}
              <div className={`subscription-plan-hero subscription-anim-hero ${currentPlanName === 'expert' ? 'subscription-plan-hero-expert' : ''}`}>
                <div className="relative z-10 flex items-start justify-between gap-6 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="subscription-plan-badge">
                        <span className="subscription-plan-badge-dot" />
                        {currentSubscription.trial ? t('trial') : t('active')}
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight capitalize">
                      Plan {currentSubscription.plan?.name}
                    </h2>
                    <p className="text-sm opacity-60 mt-1">
                      Facturation {currentSubscription.billing_type === 'yearly' ? 'annuelle' : 'mensuelle'}
                      · renouvelé le {formatDateShort(currentSubscription.start_date || currentSubscription.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-4xl font-bold tracking-tight">
                      <sup className="text-xl font-medium">€</sup>
                      {currentSubscription.plan?.price_monthly || 0}
                    </div>
                    <p className="text-sm opacity-50 mt-1">{t('per_month')}</p>
                  </div>
                </div>
                <div className="subscription-meta-grid relative z-10">
                  <div className="subscription-meta-item">
                    <div className="subscription-meta-label">{t('billing_type')}</div>
                    <div className="subscription-meta-value capitalize">
                      {currentSubscription.billing_type === 'yearly' ? 'Annuel' : 'Mensuel'}
                    </div>
                  </div>
                  <div className="subscription-meta-item">
                    <div className="subscription-meta-label">{t('status')}</div>
                    <div className="subscription-meta-value flex items-center gap-1.5">
                      <span className="subscription-meta-dot" />
                      {currentSubscription.trial ? t('trial') : t('active')}
                    </div>
                  </div>
                  <div className="subscription-meta-item">
                    <div className="subscription-meta-label">{t('created_at')}</div>
                    <div className="subscription-meta-value font-mono text-sm">
                      {formatDateNumeric(currentSubscription.createdAt)}
                    </div>
                  </div>
                  <div className="subscription-meta-item">
                    <div className="subscription-meta-label">{t('last_updated')}</div>
                    <div className="subscription-meta-value font-mono text-sm">
                      {formatDateNumeric(currentSubscription.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Utilisation */}
              {usageData && (
                <div className="subscription-section-card subscription-anim-card">
                  <div className="subscription-card-header">
                    <span className="subscription-card-title">Utilisation ce mois-ci</span>
                    <span className="text-xs text-muted-foreground">Cycle actuel</span>
                  </div>
                  <div className="subscription-card-body">
                    <div className="subscription-usage-list">
                      {usageData.storage && (
                        <div>
                          <div className="subscription-usage-row">
                            <span className="subscription-usage-label">Stockage</span>
                            <span className="subscription-usage-val">
                              — <span className="font-normal text-muted-foreground">/ {usageData.storage.limit} GB</span>
                            </span>
                          </div>
                          <div className="subscription-usage-track">
                            <div className="subscription-usage-fill" style={{ width: '0%' }} />
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="subscription-usage-row">
                          <span className="subscription-usage-label">Newsletters envoyées</span>
                          <span className="subscription-usage-val">
                            {usageData.newsletters.current}{' '}
                            <span className="font-normal text-muted-foreground">
                              / {usageData.newsletters.limit === 0 ? '∞' : usageData.newsletters.limit}
                            </span>
                          </span>
                        </div>
                        <div className="subscription-usage-track">
                          <div
                            className={`subscription-usage-fill ${getUsageColor(usageData.newsletters.current, usageData.newsletters.limit)}`}
                            style={{ width: `${getUsageWidth(usageData.newsletters.current, usageData.newsletters.limit)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="subscription-usage-row">
                          <span className="subscription-usage-label">Clients actifs</span>
                          <span className="subscription-usage-val">
                            {usageData.clients.limit === 0 ? '∞' : usageData.clients.current}{' '}
                            <span className="font-normal text-muted-foreground">
                              {usageData.clients.limit === 0 ? 'illimité' : `/ ${usageData.clients.limit}`}
                            </span>
                          </span>
                        </div>
                        <div className="subscription-usage-track">
                          <div className="subscription-usage-fill ok" style={{ width: usageData.clients.limit === 0 ? '100%' : `${getUsageWidth(usageData.clients.current, usageData.clients.limit)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="subscription-usage-row">
                          <span className="subscription-usage-label">Smart Follow-Up (leads)</span>
                          <span className="subscription-usage-val">
                            {usageData.prospects.limit === 0 ? '∞' : usageData.prospects.current}{' '}
                            <span className="font-normal text-muted-foreground">
                              {usageData.prospects.limit === 0 ? 'illimité' : `/ ${usageData.prospects.limit}`}
                            </span>
                          </span>
                        </div>
                        <div className="subscription-usage-track">
                          <div
                            className={`subscription-usage-fill ${getUsageColor(usageData.prospects.current, usageData.prospects.limit)}`}
                            style={{ width: `${getUsageWidth(usageData.prospects.current, usageData.prospects.limit)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fonctionnalités */}
              <div className="subscription-section-card subscription-anim-card">
                <div className="subscription-card-header">
                  <span className="subscription-card-title">Fonctionnalités incluses</span>
                  <span className="subscription-status-badge">
                    <span className="subscription-status-dot" />
                    {currentPlanName.charAt(0).toUpperCase() + currentPlanName.slice(1)}
                  </span>
                </div>
                <div className="subscription-card-body">
                  <div className="subscription-features-grid">
                    {featuresList.map(({ key, label, value }) => (
                      <div key={key} className="subscription-feature-item">
                        <div className="subscription-feature-check">
                          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 5l2 2 4-4" />
                          </svg>
                        </div>
                        {label}
                        {value !== '' && <span className="subscription-feature-value">{value}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="subscription-anim-side space-y-4">
              {/* Changer de plan */}
              <div className="subscription-side-card">
                <div className="subscription-side-card-title">Changer de plan</div>
                <div className="subscription-plans-grid">
                  {availablePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`subscription-plan-row ${plan.name === currentPlanName ? 'current' : ''} ${plan.name === currentPlanName && plan.name === 'expert' ? 'subscription-plan-row-expert' : ''} ${plan.name === currentPlanName ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={() => plan.name !== currentPlanName && handlePlanSelect(plan)}
                      onKeyDown={(e) => plan.name !== currentPlanName && (e.key === 'Enter' || e.key === ' ') && handlePlanSelect(plan)}
                      role="button"
                      tabIndex={plan.name === currentPlanName ? -1 : 0}
                    >
                      <span className="font-medium capitalize">{plan.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">
                          {plan.price_monthly} € / mois
                        </span>
                        {plan.name === currentPlanName && (
                          <span className="subscription-tag-current">Actuel</span>
                        )}
                        {plan.name !== currentPlanName && availablePlans.findIndex(p => p.name === currentPlanName) < availablePlans.findIndex(p => p.name === plan.name) && (
                          <span className="subscription-tag-upgrade">↑</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="subscription-btn-block primary"
                  onClick={() => router.push('/pricing')}
                >
                  Voir tous les plans
                  <span className="opacity-60">›</span>
                </button>
              </div>

              {/* Facturation */}
              <div className="subscription-side-card">
                <div className="subscription-side-card-title">Facturation</div>
                <div className="subscription-billing-block">
                  <div className="subscription-billing-row">
                    <span className="subscription-billing-label">Prochain paiement</span>
                    <span className="subscription-billing-value">
                      {formatDateShort(currentSubscription.start_date || currentSubscription.createdAt)}
                    </span>
                  </div>
                  <div className="subscription-billing-divider" />
                  <div className="subscription-billing-row">
                    <span className="subscription-billing-label">Montant</span>
                    <span className="subscription-billing-value">
                      {currentSubscription.plan?.price_monthly?.toFixed(2) || '0,00'} €
                    </span>
                  </div>
                  <div className="subscription-billing-divider" />
                  <div className="subscription-billing-row">
                    <span className="subscription-billing-label">Moyen de paiement</span>
                    <span className="subscription-billing-value">•••• 4242</span>
                  </div>
                </div>
                <div className="subscription-billing-next">
                  Renouvellement automatique · <span className="font-medium text-muted-foreground">Gérer le moyen de paiement</span>
                </div>
                <button
                  type="button"
                  className="subscription-btn-block ghost"
                  onClick={() => router.push('/dashboard/factures')}
                >
                  Historique des factures
                  <span className="text-muted-foreground">›</span>
                </button>
              </div>

              {/* Support */}
              <div className="subscription-side-card">
                <div className="subscription-side-card-title">{t('need_help')}</div>
                <div className="subscription-support-body">
                  <p className="subscription-support-text">{t('contact_support_message')}</p>
                  <div className="subscription-support-links space-y-2">
                    <a
                      href="mailto:support@eclipsestudiodev.fr"
                      className="subscription-support-link flex items-center gap-3"
                    >
                      <div className="subscription-support-link-icon">
                        <IconMail size={14} stroke={1.6} />
                      </div>
                      Contacter par email
                    </a>
                    <a
                      href="https://docs.eclipsestudiodev.fr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="subscription-support-link flex items-center gap-3"
                    >
                      <div className="subscription-support-link-icon">
                        <IconBook2 size={14} stroke={1.6} />
                      </div>
                      Documentation
                    </a>
                    <a
                      href="tel:+33684446324"
                      className="subscription-support-link flex items-center gap-3"
                    >
                      <div className="subscription-support-link-icon">
                        <IconPhone size={14} stroke={1.6} />
                      </div>
                      Support téléphonique
                    </a>
                  </div>
                </div>
              </div>

              {/* Annuler */}
              <div className="subscription-side-card">
                <div className="subscription-side-card-title text-muted-foreground">Zone critique</div>
                <div className="subscription-danger-body">
                  <p className="subscription-danger-text">
                    L&apos;annulation prend effet à la fin de la période en cours. Vos données seront conservées 30 jours.
                  </p>
                  <button
                    type="button"
                    className="subscription-btn-cancel"
                    onClick={handleCancelSubscription}
                  >
                    <IconX size={14} stroke={2.5} />
                    {t('cancel_subscription')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground mb-6">{t('no_subscription_found')}</p>
            <button
              type="button"
              onClick={() => router.push('/pricing')}
              className="px-6 py-3 bg-accent text-accent-text font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              {t('choose_plan')}
            </button>
          </div>
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
            plan={{ ...selectedPlan, documentId: selectedPlan.documentId || selectedPlan.id.toString() }}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </motion.div>
    </ProtectedRoute>
  );
}
