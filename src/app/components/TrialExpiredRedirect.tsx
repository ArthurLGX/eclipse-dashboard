'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSubscriptionsUser } from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';

interface SubscriptionData {
  plan: { name: string };
  trial: boolean;
  start_date: string;
}

interface TrialExpiredRedirectProps {
  children: React.ReactNode;
}

export default function TrialExpiredRedirect({
  children,
}: TrialExpiredRedirectProps) {
  const { user, authenticated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { showGlobalPopup } = usePopup();

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!authenticated || !user?.id) {
        return;
      }

      // Vérifier seulement sur les pages du dashboard, pas sur pricing
      if (!pathname.startsWith('/dashboard') || pathname === '/pricing') {
        return;
      }

      setIsChecking(true);

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
              showGlobalPopup(t('trial_expired_message'), 'error');
              // Rediriger immédiatement
              router.replace('/pricing');
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Délai très court pour éviter le flash
    const timer = setTimeout(checkTrialStatus, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authenticated, pathname]);

  // Si on vérifie et qu'on est sur dashboard, ne rien afficher
  if (isChecking && pathname.startsWith('/dashboard')) {
    return null;
  }

  return <>{children}</>;
}
