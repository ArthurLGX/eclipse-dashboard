'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSubscriptionsUser } from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';

export function useTrialRedirect() {
  const { user, authenticated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { showGlobalPopup } = usePopup();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkTrialStatus = async () => {
      // Éviter les vérifications multiples
      if (hasRedirected || isChecking) {
        return;
      }

      if (!authenticated || !user?.id) {
        return;
      }

      // Vérifier seulement sur les pages du dashboard
      if (!pathname.startsWith('/dashboard')) {
        return;
      }

      setIsChecking(true);

      try {
        const subscriptionResponse = await fetchSubscriptionsUser(user.id);
        if (subscriptionResponse.data && subscriptionResponse.data.length > 0) {
          const subscription = subscriptionResponse.data[0];
          const planName = subscription.plan.name;
          const isTrial = subscription.trial;
          const startDate = subscription.start_date;

          if (planName === 'free' && isTrial && startDate) {
            const trialEndDate = new Date(startDate);
            trialEndDate.setDate(trialEndDate.getDate() + 30);
            const now = new Date();

            if (now > trialEndDate && !hasRedirected) {
              setHasRedirected(true);
              showGlobalPopup(t('trial_expired_message'), 'error');
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

    // Délai pour éviter les boucles
    const timer = setTimeout(checkTrialStatus, 200);
    return () => clearTimeout(timer);
  }, [
    user?.id,
    authenticated,
    pathname,
    hasRedirected,
    isChecking,
    router,
    showGlobalPopup,
    t,
  ]);

  return { isChecking, hasRedirected };
}
