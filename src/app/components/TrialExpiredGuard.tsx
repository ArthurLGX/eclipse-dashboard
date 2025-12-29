'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSubscriptionsUser } from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import PageSkeleton from './PageSkeleton';

interface SubscriptionData {
  plan: { name: string };
  trial: boolean;
  start_date: string;
}

interface TrialExpiredGuardProps {
  children: React.ReactNode;
}

export default function TrialExpiredGuard({
  children,
}: TrialExpiredGuardProps) {
  const { user, authenticated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { showGlobalPopup } = usePopup();
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!authenticated || !user?.id) {
        setIsChecking(false);
        return;
      }

      // Vérifier seulement sur les pages du dashboard
      if (!pathname.startsWith('/dashboard')) {
        setIsChecking(false);
        return;
      }

      try {
        const subscriptionResponse = await fetchSubscriptionsUser(user.id) as { data?: SubscriptionData[] };
        if (subscriptionResponse?.data && subscriptionResponse.data.length > 0) {
          const subscription = subscriptionResponse.data[0];
          const planName = subscription.plan.name;
          const isTrial = subscription.trial;
          const startDate = subscription.start_date;

          if (planName === 'free' && isTrial && startDate) {
            const trialEndDate = new Date(startDate);
            trialEndDate.setDate(trialEndDate.getDate() + 30); // +30 jours
            const now = new Date();

            if (now > trialEndDate && !hasRedirected) {
              setHasRedirected(true);
              setTrialExpired(true);
              showGlobalPopup(t('trial_expired_message'), 'error');
              // Rediriger immédiatement vers la page de pricing
              router.replace('/pricing');
              return; // Arrêter ici pour éviter le setIsChecking(false)
            }
          }
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }

      setIsChecking(false);
    };

    // Délai court pour éviter les boucles
    const timer = setTimeout(checkTrialStatus, 100);
    return () => clearTimeout(timer);
  }, [user?.id, authenticated, pathname]); // Supprimé router, showGlobalPopup, t

  // Afficher un skeleton sur le contenu pendant la vérification
  if (isChecking) {
    return <PageSkeleton />;
  }

  // Si le trial a expiré, ne pas afficher le contenu
  if (trialExpired) {
    return null;
  }

  return <>{children}</>;
}
