/**
 * Helpers d'authentification partagés
 * Factorise la logique de vérification d'abonnement et redirection post-login
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { fetchSubscriptionsUser } from '@/lib/api';

interface SubscriptionData {
  subscription_status: string;
}

/**
 * Vérifie si l'utilisateur a un abonnement actif ou en essai
 * Utilise le token déjà stocké dans localStorage (doit être défini avant l'appel)
 */
export async function checkSubscription(userId: number): Promise<boolean> {
  try {
    const subscription = (await fetchSubscriptionsUser(userId)) as {
      data?: SubscriptionData[];
    };
    if (!subscription?.data?.length) return false;
    const status = subscription.data[0].subscription_status;
    return status === 'active' || status === 'trial';
  } catch {
    return false;
  }
}

/**
 * Redirige l'utilisateur après login selon son abonnement
 * À appeler après login() (token doit être en localStorage)
 */
export async function redirectAfterLogin(
  userId: number,
  router: AppRouterInstance
): Promise<void> {
  const hasSubscription = await checkSubscription(userId);
  router.push(hasSubscription ? '/dashboard' : '/pricing');
}
