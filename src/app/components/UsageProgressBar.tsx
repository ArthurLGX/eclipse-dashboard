'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import {
  fetchNumberOfProjectsUser,
  fetchNumberOfClientsUser,
  fetchNumberOfProspectsUser,
  fetchNumberOfMentorsUser,
  fetchSubscriptionsUser,
  fetchNumberOfNewslettersUser,
} from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';

interface UsageData {
  projects: { current: number; limit: number; label: string };
  clients: { current: number; limit: number; label: string };
  prospects: { current: number; limit: number; label: string };
  mentors: { current: number; limit: number; label: string };
  newsletters: { current: number; limit: number; label: string };
}

interface TrialData {
  daysRemaining: number;
  totalDays: number;
  progress: number;
  isExpired: boolean;
  startedDate: string;
}

interface SubscriptionPlan {
  name: string;
  features: string | Record<string, number>;
}

interface SubscriptionData {
  plan: SubscriptionPlan;
  trial: boolean;
  start_date: string;
}

export default function UsageProgressBar() {
  const { user, subscriptionUpdated } = useAuth();
  const { t, language } = useLanguage();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsageData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Récupérer les limites du plan actuel depuis la subscription du user
        let currentPlanLimits = {
          max_active_projects: 1,
          max_active_clients: 5,
          max_prospects_active: 10,
          max_handle_mentors: 0,
          max_newsletters: 0,
        };

        try {
          const subscription = await fetchSubscriptionsUser(user.id) as { data?: SubscriptionData[] };
          if (subscription?.data && subscription.data.length > 0) {
            const features = subscription.data[0].plan.features;
            const planName = subscription.data[0].plan.name;
            const startedDate = subscription.data[0].start_date;
            const isTrial = subscription.data[0].trial;

          

            // Calculer les données du trial si c'est un plan gratuit en trial
            if (planName === 'free' && isTrial) {
              const startDate = new Date(startedDate);
              const endDate = new Date(
                startDate.getTime() + 30 * 24 * 60 * 60 * 1000
              ); // +30 jours
              const now = new Date();

              const totalDuration = 30; // 30 jours
              const elapsed = Math.floor(
                (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              const daysRemaining = Math.max(0, totalDuration - elapsed);
              const progress = Math.min((elapsed / totalDuration) * 100, 100);
              const isExpired = now.getTime() > endDate.getTime();

             

              setTrialData({
                daysRemaining,
                totalDays: totalDuration,
                progress,
                isExpired,
                startedDate: startedDate,
              });
            } else {
              // Réinitialiser les données de trial si ce n'est plus un plan gratuit
              setTrialData(null);
            }

            // Parser les features si c'est une string
            const parsedFeatures =
              typeof features === 'string' ? JSON.parse(features) : features;

            currentPlanLimits = {
              max_active_projects: parsedFeatures.max_active_projects ?? 1,
              max_active_clients: parsedFeatures.max_active_clients ?? 5,
              max_prospects_active: parsedFeatures.max_prospects_active ?? 10,
              max_handle_mentors: parsedFeatures.max_handle_mentors ?? 0,
              max_newsletters: parsedFeatures.max_newsletters ?? 0,
            };

          } else {
            // Pas de subscription, utiliser les limites par défaut
            setTrialData(null);
          }
        } catch (error) {
          console.error('Error parsing plan features:', error);
          setTrialData(null);
        }

        // Récupérer les données réelles d'utilisation depuis l'API
        const [
          projectsCount,
          clientsCount,
          prospectsCount,
          mentorsCount,
          newslettersCount,
        ] = await Promise.all([
          fetchNumberOfProjectsUser(user.id),
          fetchNumberOfClientsUser(user.id),
          fetchNumberOfProspectsUser(user.id),
          fetchNumberOfMentorsUser(user.id),
          fetchNumberOfNewslettersUser(user.id),
        ]);

        const currentUsage = {
          projects: projectsCount,
          clients: clientsCount,
          prospects: prospectsCount,
          mentors: mentorsCount,
          newsletters: newslettersCount,
        };

        setUsageData({
          projects: {
            current: currentUsage.projects,
            limit: currentPlanLimits.max_active_projects,
            label: t('active_projects'),
          },
          clients: {
            current: currentUsage.clients,
            limit: currentPlanLimits.max_active_clients,
            label: t('active_clients'),
          },
          prospects: {
            current: currentUsage.prospects,
            limit: currentPlanLimits.max_prospects_active,
            label: t('active_prospects'),
          },
          mentors: {
            current: currentUsage.mentors,
            limit: currentPlanLimits.max_handle_mentors,
            label: t('managed_mentors'),
          },
          newsletters: {
            current: currentUsage.newsletters,
            limit: currentPlanLimits.max_newsletters,
            label: t('newsletters'),
          },
        });
      } catch (error) {
        console.error('Error fetching usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();

    // Ajouter un intervalle pour rafraîchir les données toutes les 30 secondes
    const interval = setInterval(fetchUsageData, 30000);

    return () => clearInterval(interval);
  }, [user?.id, t, subscriptionUpdated]);

  if (loading || !usageData) {
    return (
      <div className="card backdrop-blur-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 min-w-48">
              <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-2 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getProgressColor = (current: number, limit: number) => {
    const percentage = limit === 0 ? 0 : (current / limit) * 100;
    if (percentage >= 90) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    return 'bg-info';
  };

  const getProgressWidth = (current: number, limit: number) => {
    if (limit === 0) return 0; // Illimité
    return Math.min((current / limit) * 100, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4 w-full card backdrop-blur-sm p-4 lg:!mt-8 !mt-32 !mb-16"
    >
      {/* Barre de progression du trial pour le plan gratuit */}
      {trialData && (
        <div className="border-b border-default pb-4 mb-4 w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="!text-sm text-primary font-medium">
              {trialData.isExpired ? t('trial_expired') : t('trial_period')}
            </span>
            <span
              className={`!text-sm font-semibold ${
                trialData.isExpired ? 'text-danger' : 'text-success'
              }`}
            >
              {trialData.isExpired
                ? t('trial_expired')
                : `${trialData.daysRemaining} ${t('days')} ${t('remaining')}`}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${trialData.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-2 rounded-full ${
                trialData.isExpired
                  ? 'bg-danger'
                  : trialData.progress >= 80
                    ? 'bg-warning'
                    : 'bg-success'
              }`}
            />
          </div>
          <p className="!text-xs text-muted mt-1">
            {trialData &&
              t('started_at') +
                ' : ' +
                new Date(trialData.startedDate).toLocaleDateString(language, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
          </p>
          <p className="!text-xs text-muted mt-1">
            {trialData.isExpired
              ? t('trial_expired_description')
              : t('trial_progress_description')}
          </p>
        </div>
      )}

      <div className="flex lg:flex-row flex-col gap-12 items-center">
        {Object.entries(usageData).map(([key, data]) => (
          <div key={key} className="flex-1 min-w-48 w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="!text-sm text-secondary font-medium">
                {data.label}
              </span>
              <span className="!text-sm text-primary font-semibold">
                {data.current} / {data.limit === 0 ? '∞' : data.limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${getProgressWidth(data.current, data.limit)}%`,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-2 rounded-full ${getProgressColor(data.current, data.limit)}`}
              />
            </div>
          </div>
        ))}
      </div>
      {usageData.projects.current >= usageData.projects.limit ||
        usageData.clients.current >= usageData.clients.limit ||
        usageData.prospects.current >= usageData.prospects.limit ||
        usageData.mentors.current >= usageData.mentors.limit ||
        (usageData.newsletters.current >= usageData.newsletters.limit && (
          <div className="flex lg:flex-row flex-col gap-2">
            <p className="!text-sm text-secondary font-medium">
              {t('usage_progress_bar_description')}
            </p>
            <Link
              href="/pricing"
              className="!text-sm text-secondary font-medium underline hover:text-primary transition-colors"
            >
              {t('upgrade_now')}
            </Link>
          </div>
        ))}
    </motion.div>
  );
}
