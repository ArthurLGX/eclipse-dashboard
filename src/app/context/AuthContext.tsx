'use client';
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSubscriptionsUser } from '@/lib/api';
import {
  sanitizeUserForStorage,
  persistUserToLocalStorage,
  type AuthStoredUser,
} from '@/lib/auth-user-storage';

interface SubscriptionData {
  plan: { name: string };
  trial: boolean;
  start_date: string;
}

/** Données réduites en localStorage (pas de populate=* — sinon QuotaExceededError). */
export type User = AuthStoredUser;

type AuthContextType = {
  user: User | null;
  token: string | null;
  authenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hasHydrated: boolean;
  showTrialExpiredModal: boolean;
  setShowTrialExpiredModal: (show: boolean) => void;
  subscriptionUpdated: boolean;
  triggerSubscriptionUpdate: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);
  const [subscriptionUpdated, setSubscriptionUpdated] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        const raw = JSON.parse(storedUser) as unknown;
        const parsedUser = sanitizeUserForStorage(raw);
        const rawLen = JSON.stringify(raw).length;
        const compactLen = JSON.stringify(parsedUser).length;
        if (rawLen > compactLen + 50) {
          persistUserToLocalStorage(parsedUser);
        }
        setUser(parsedUser);
        setToken(storedToken);
        setAuthenticated(true);
      } catch (e) {
        console.error('[auth] Invalid stored user', e);
        localStorage.removeItem('user');
      }
    }
    setHasHydrated(true); // ✅ quand les données sont lues
  }, []);

  const login = async (user: User, token: string) => {
    localStorage.setItem('token', token);
    setToken(token);

    try {
      /** Pas de populate=* : évite un JSON énorme (QuotaExceededError sur localStorage). */
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${user.id}?populate=profile_picture`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch user details');
      }

      const fullUser = await res.json();
      const compact = sanitizeUserForStorage(fullUser);
      persistUserToLocalStorage(compact);
      setUser(compact);
      setAuthenticated(true);

      // Vérifier si l'utilisateur a un trial expiré
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

            if (now > trialEndDate) {
              setShowTrialExpiredModal(true);
              // Ne pas rediriger ici, laisser TrialExpiredGuard s'en charger
            }
          }
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }
    } catch (err) {
      console.error('Failed to fetch full user details:', err);
      const compact = sanitizeUserForStorage(user);
      persistUserToLocalStorage(compact);
      setUser(compact);
      setAuthenticated(true);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    setAuthenticated(false);
    router.push('/');
  };

  const triggerSubscriptionUpdate = () => {
    setSubscriptionUpdated(prev => !prev);
  };

  const value: AuthContextType = {
    user,
    token,
    authenticated,
    login,
    logout,
    hasHydrated,
    showTrialExpiredModal,
    setShowTrialExpiredModal,
    subscriptionUpdated,
    triggerSubscriptionUpdate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
