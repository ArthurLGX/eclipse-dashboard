'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AIFeaturesConfig {
  daily_suggestions: boolean;
  project_profitability: boolean;
  project_insights: boolean;
  task_generation: boolean;
  contract_generation: boolean;
  quote_generation: boolean;
  invoice_generation: boolean;
  price_estimation: boolean;
  email_suggestions: boolean;
  mockup_generation: boolean;
  smart_follow_up: boolean;
  ai_assistant: boolean;
}

interface AIFeaturesContextType {
  features: AIFeaturesConfig;
  isFeatureEnabled: (feature: keyof AIFeaturesConfig) => boolean;
  toggleFeature: (feature: keyof AIFeaturesConfig, enabled: boolean) => void;
  updateFeatures: (newFeatures: Partial<AIFeaturesConfig>) => void;
  loading: boolean;
}

const defaultFeatures: AIFeaturesConfig = {
  daily_suggestions: false,
  project_profitability: false,
  project_insights: false,
  task_generation: false,
  contract_generation: true,
  quote_generation: true,
  invoice_generation: true,
  price_estimation: false,
  email_suggestions: false,
  mockup_generation: false,
  smart_follow_up: true,
  ai_assistant: false,
};

const AIFeaturesContext = createContext<AIFeaturesContextType | undefined>(undefined);

export function AIFeaturesProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<AIFeaturesConfig>(defaultFeatures);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ai_features_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setFeatures({ ...defaultFeatures, ...parsed });
      }
    } catch (error) {
      console.error('Error loading AI features config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage when features change
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('ai_features_config', JSON.stringify(features));
      } catch (error) {
        console.error('Error saving AI features config:', error);
      }
    }
  }, [features, loading]);

  const isFeatureEnabled = (feature: keyof AIFeaturesConfig): boolean => {
    return features[feature] ?? false;
  };

  const toggleFeature = (feature: keyof AIFeaturesConfig, enabled: boolean) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: enabled,
    }));
  };

  const updateFeatures = (newFeatures: Partial<AIFeaturesConfig>) => {
    setFeatures(prev => ({
      ...prev,
      ...newFeatures,
    }));
  };

  return (
    <AIFeaturesContext.Provider value={{
      features,
      isFeatureEnabled,
      toggleFeature,
      updateFeatures,
      loading,
    }}>
      {children}
    </AIFeaturesContext.Provider>
  );
}

export function useAIFeatures() {
  const context = useContext(AIFeaturesContext);
  if (!context) {
    throw new Error('useAIFeatures must be used within an AIFeaturesProvider');
  }
  return context;
}
