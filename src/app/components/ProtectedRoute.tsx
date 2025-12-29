'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import PageSkeleton from './PageSkeleton';
import { fetchSubscriptionsUser } from '@/lib/api';
import FreePlanModal from './FreePlanModal';

interface Subscription {
  id: number;
  documentId: string;
  subscription_status: string;
  plan: {
    id: string;
    documentId: string;
    name: string;
    description: string;
    features: string;
  };
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, hasHydrated, user } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [showFreePlanModal, setShowFreePlanModal] = useState(false);

  useEffect(() => {
    if (hasHydrated && !authenticated) {
      router.push('/login?type=login');
    }
  }, [authenticated, hasHydrated, router]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!authenticated || !user?.id) return;

      try {
        setIsCheckingSubscription(true);
        const response = await fetchSubscriptionsUser(user.id) as { data?: Subscription[] };

        if (
          response?.data &&
          response.data.length > 0 &&
          response.data[0].subscription_status === 'active'
        ) {
          const userSubscription = response.data[0];
          setSubscription(userSubscription);

          // Vérifier si l'abonnement est actif ou en trial
          if (
            userSubscription.subscription_status === 'active' ||
            userSubscription.subscription_status === 'trial'
          ) {
            // Abonnement valide, continuer
          } else {
            // Abonnement invalide, afficher la modale
            router.push('/pricing');
          }
        } else {
          // Pas d'abonnement, afficher la modale
          router.push('/pricing');
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        // En cas d'erreur, afficher la modale par sécurité
        router.push('/pricing');
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, [authenticated, user?.id]);

  if (!hasHydrated || isCheckingSubscription) {
    return <PageSkeleton />;
  }

  if (!authenticated) {
    return null;
  }

  if (showFreePlanModal && subscription) {
    return (
      <FreePlanModal
        isOpen={true}
        onClose={() => {
          setShowFreePlanModal(false);
          router.push('/pricing');
        }}
        plan={{
          id: subscription.id,
          documentId: subscription.plan.documentId,
          name: subscription.plan.name,
          description: subscription.plan.description,
          features: subscription.plan.features,
          price_monthly: 0,
          price_yearly: 0,
        }}
        onSuccess={() => {
          setShowFreePlanModal(false);
          window.location.reload(); // Recharger pour mettre à jour le statut
        }}
      />
    );
  }

  return <>{children}</>;
}
