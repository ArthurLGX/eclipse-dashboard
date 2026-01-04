'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchCompanyUser, fetchSmtpConfig, fetchEmailSignature } from '@/lib/api';

export type OnboardingStep = 'company' | 'smtp' | 'signature' | 'first-email' | 'completed';

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isOnboardingComplete: boolean;
  isLoading: boolean;
  showOnboarding: boolean;
}

interface OnboardingContextType extends OnboardingState {
  checkOnboardingStatus: () => Promise<void>;
  completeStep: (step: OnboardingStep) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  goToStep: (step: OnboardingStep) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = 'eclipse_onboarding';

const STEPS_ORDER: OnboardingStep[] = ['company', 'smtp', 'signature', 'first-email', 'completed'];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'company',
    completedSteps: [],
    isOnboardingComplete: false,
    isLoading: true,
    showOnboarding: false,
  });

  // Charger l'état depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState(prev => ({
            ...prev,
            completedSteps: parsed.completedSteps || [],
            isOnboardingComplete: parsed.isOnboardingComplete || false,
          }));
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }, []);

  // Sauvegarder l'état dans localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && !state.isLoading) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        completedSteps: state.completedSteps,
        isOnboardingComplete: state.isOnboardingComplete,
      }));
    }
  }, [state.completedSteps, state.isOnboardingComplete, state.isLoading]);

  // Vérifier le statut d'onboarding basé sur les données réelles
  const checkOnboardingStatus = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const completedSteps: OnboardingStep[] = [];

      // Vérifier si l'entreprise est configurée
      const companyResponse = await fetchCompanyUser(user.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const company = (companyResponse as any)?.data?.[0];
      if (company?.name) {
        completedSteps.push('company');
      }

      // Vérifier si SMTP est configuré
      const smtpConfig = await fetchSmtpConfig(user.id);
      if (smtpConfig?.smtp_host && smtpConfig?.smtp_user) {
        completedSteps.push('smtp');
      }

      // Vérifier si la signature est configurée
      const signature = await fetchEmailSignature(user.id);
      if (signature?.sender_name || signature?.company_name) {
        completedSteps.push('signature');
      }

      // Déterminer l'étape courante
      let currentStep: OnboardingStep = 'company';
      for (const step of STEPS_ORDER) {
        if (!completedSteps.includes(step) && step !== 'completed') {
          currentStep = step;
          break;
        }
      }

      // Vérifier si tout est complété
      const requiredSteps: OnboardingStep[] = ['company', 'smtp', 'signature'];
      const allRequiredCompleted = requiredSteps.every(s => completedSteps.includes(s));
      
      if (allRequiredCompleted) {
        completedSteps.push('completed');
      }

      const isOnboardingComplete = completedSteps.includes('completed');

      // Afficher l'onboarding si pas encore complété
      const shouldShowOnboarding = !isOnboardingComplete && completedSteps.length < 3;

      setState({
        currentStep,
        completedSteps,
        isOnboardingComplete,
        isLoading: false,
        showOnboarding: shouldShowOnboarding,
      });

    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);

  // Vérifier au chargement
  useEffect(() => {
    if (user?.id) {
      checkOnboardingStatus();
    }
  }, [user?.id, checkOnboardingStatus]);

  const completeStep = useCallback((step: OnboardingStep) => {
    setState(prev => {
      const newCompletedSteps = prev.completedSteps.includes(step) 
        ? prev.completedSteps 
        : [...prev.completedSteps, step];
      
      // Trouver la prochaine étape
      let nextStep: OnboardingStep = 'completed';
      for (const s of STEPS_ORDER) {
        if (!newCompletedSteps.includes(s) && s !== 'completed') {
          nextStep = s;
          break;
        }
      }

      const requiredSteps: OnboardingStep[] = ['company', 'smtp', 'signature'];
      const allRequiredCompleted = requiredSteps.every(s => newCompletedSteps.includes(s));

      return {
        ...prev,
        completedSteps: newCompletedSteps,
        currentStep: nextStep,
        isOnboardingComplete: allRequiredCompleted,
        showOnboarding: !allRequiredCompleted,
      };
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnboardingComplete: true,
      showOnboarding: false,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setState({
      currentStep: 'company',
      completedSteps: [],
      isOnboardingComplete: false,
      isLoading: false,
      showOnboarding: true,
    });
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const openOnboarding = useCallback(() => {
    setState(prev => ({ ...prev, showOnboarding: true }));
  }, []);

  const closeOnboarding = useCallback(() => {
    setState(prev => ({ ...prev, showOnboarding: false }));
  }, []);

  return (
    <OnboardingContext.Provider value={{
      ...state,
      checkOnboardingStatus,
      completeStep,
      skipOnboarding,
      resetOnboarding,
      goToStep,
      openOnboarding,
      closeOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

