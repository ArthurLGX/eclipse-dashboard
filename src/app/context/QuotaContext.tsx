'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchNumberOfProjectsUser,
  fetchNumberOfClientsUser,
  fetchNumberOfProspectsUser,
  fetchNumberOfMentorsUser,
  fetchNumberOfNewslettersUser,
  fetchSubscriptionsUser,
} from '@/lib/api';

interface QuotaLimits {
  projects: number;
  clients: number;
  prospects: number;
  mentors: number;
  newsletters: number;
}

interface QuotaUsage {
  projects: number;
  clients: number;
  prospects: number;
  mentors: number;
  newsletters: number;
}

interface TrialInfo {
  isTrial: boolean;
  daysRemaining: number;
  isExpired: boolean;
}

export interface QuotaNotification {
  id: string;
  type: 'quota_exceeded' | 'quota_warning' | 'trial_ending' | 'trial_expired';
  message: string;
  resources: string[];
}

interface QuotaContextType {
  limits: QuotaLimits;
  usage: QuotaUsage;
  trial: TrialInfo;
  loading: boolean;
  notifications: QuotaNotification[];
  isOverQuota: (resource: keyof QuotaLimits) => boolean;
  getVisibleCount: (resource: keyof QuotaLimits) => number;
  canAdd: (resource: keyof QuotaLimits) => boolean;
  refreshQuotas: () => Promise<void>;
}

const defaultLimits: QuotaLimits = {
  projects: 1,
  clients: 5,
  prospects: 10,
  mentors: 0,
  newsletters: 0,
};

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

export function QuotaProvider({ children }: { children: React.ReactNode }) {
  const { user, subscriptionUpdated } = useAuth();
  const [limits, setLimits] = useState<QuotaLimits>(defaultLimits);
  const [usage, setUsage] = useState<QuotaUsage>({ projects: 0, clients: 0, prospects: 0, mentors: 0, newsletters: 0 });
  const [trial, setTrial] = useState<TrialInfo>({ isTrial: false, daysRemaining: 0, isExpired: false });
  const [loading, setLoading] = useState(true);

  const fetchQuotas = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      let planLimits = { ...defaultLimits };
      let trialInfo: TrialInfo = { isTrial: false, daysRemaining: 0, isExpired: false };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await fetchSubscriptionsUser(user.id) as { data?: any[] };

        if (subscription?.data && subscription.data.length > 0) {
          const sub = subscription.data[0];
          const features = typeof sub.plan.features === 'string' 
            ? JSON.parse(sub.plan.features) 
            : sub.plan.features;

          planLimits = {
            projects: features.max_active_projects ?? 1,
            clients: features.max_active_clients ?? 5,
            prospects: features.max_prospects_active ?? 10,
            mentors: features.max_handle_mentors ?? 0,
            newsletters: features.max_newsletters ?? 0,
          };

          if (sub.plan.name === 'free' && sub.trial) {
            const startDate = new Date(sub.start_date);
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.max(0, 30 - elapsed);

            trialInfo = {
              isTrial: true,
              daysRemaining,
              isExpired: elapsed >= 30,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }

      setLimits(planLimits);
      setTrial(trialInfo);

      const [projects, clients, prospects, mentors, newsletters] = await Promise.all([
        fetchNumberOfProjectsUser(user.id),
        fetchNumberOfClientsUser(user.id),
        fetchNumberOfProspectsUser(user.id),
        fetchNumberOfMentorsUser(user.id),
        fetchNumberOfNewslettersUser(user.id),
      ]);

      setUsage({ projects, clients, prospects, mentors, newsletters });
    } catch (error) {
      console.error('Error fetching quotas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas, subscriptionUpdated]);

  const isOverQuota = useCallback((resource: keyof QuotaLimits): boolean => {
    if (limits[resource] === 0) return false;
    return usage[resource] > limits[resource];
  }, [limits, usage]);

  const getVisibleCount = useCallback((resource: keyof QuotaLimits): number => {
    if (limits[resource] === 0) return usage[resource];
    return Math.min(usage[resource], limits[resource]);
  }, [limits, usage]);

  const canAdd = useCallback((resource: keyof QuotaLimits): boolean => {
    if (limits[resource] === 0) return true;
    return usage[resource] < limits[resource];
  }, [limits, usage]);

  const notifications = useMemo((): QuotaNotification[] => {
    const notifs: QuotaNotification[] = [];
    const exceededResources: string[] = [];
    const labels: Record<keyof QuotaLimits, string> = {
      projects: 'projets',
      clients: 'clients',
      prospects: 'prospects',
      mentors: 'mentors',
      newsletters: 'newsletters',
    };

    (Object.keys(limits) as Array<keyof QuotaLimits>).forEach(resource => {
      if (limits[resource] === 0) return;
      if (usage[resource] > limits[resource]) {
        exceededResources.push(labels[resource]);
      }
    });

    if (exceededResources.length > 0) {
      notifs.push({
        id: 'quota_exceeded',
        type: 'quota_exceeded',
        message: `Quota dépassé pour : ${exceededResources.join(', ')}. Certains éléments sont masqués.`,
        resources: exceededResources,
      });
    }

    if (trial.isTrial) {
      if (trial.isExpired) {
        notifs.push({
          id: 'trial_expired',
          type: 'trial_expired',
          message: 'Votre période d\'essai est terminée.',
          resources: [],
        });
      } else if (trial.daysRemaining <= 2) {
        notifs.push({
          id: 'trial_ending',
          type: 'trial_ending',
          message: `Il reste ${trial.daysRemaining} jour${trial.daysRemaining > 1 ? 's' : ''} d'essai.`,
          resources: [],
        });
      }
    }

    return notifs;
  }, [limits, usage, trial]);

  return (
    <QuotaContext.Provider value={{
      limits,
      usage,
      trial,
      loading,
      notifications,
      isOverQuota,
      getVisibleCount,
      canAdd,
      refreshQuotas: fetchQuotas,
    }}>
      {children}
    </QuotaContext.Provider>
  );
}

export function useQuota() {
  const context = useContext(QuotaContext);
  if (!context) {
    throw new Error('useQuota must be used within a QuotaProvider');
  }
  return context;
}
