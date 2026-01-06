'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { 
  fetchUserPreferences, 
  updateUserPreferences,
  createUserPreferences,
  toggleModule as apiToggleModule,
  type UserPreference 
} from '@/lib/api';
import { 
  BusinessType, 
  BUSINESS_CONFIGS, 
  ALL_MODULES, 
  getDefaultModules,
  getTerminology,
  type ModuleConfig 
} from '@/config/business-modules';

interface UserPreferencesContextType {
  // État
  preferences: UserPreference | null;
  loading: boolean;
  error: string | null;
  
  // Business type
  businessType: BusinessType;
  businessConfig: typeof BUSINESS_CONFIGS[BusinessType];
  
  // Modules
  enabledModules: string[];
  isModuleEnabled: (moduleId: string) => boolean;
  getEnabledModuleConfigs: () => ModuleConfig[];
  toggleModule: (moduleId: string, enabled: boolean) => Promise<void>;
  
  // Terminologie adaptée
  terminology: {
    project: string;
    client: string;
    invoice: string;
  };
  
  // Onboarding
  isOnboardingCompleted: boolean;
  
  // Actions
  updateBusinessType: (type: BusinessType) => Promise<void>;
  updateEnabledModules: (modules: string[]) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les préférences au montage
  const loadPreferences = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const prefs = await fetchUserPreferences(user.id);
      setPreferences(prefs);
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError('Erreur lors du chargement des préférences');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Déterminer le business type
  const businessType: BusinessType = (preferences?.business_type as BusinessType) || 'other';
  const businessConfig = BUSINESS_CONFIGS[businessType] || BUSINESS_CONFIGS.other;
  
  // Modules activés (fallback vers les modules par défaut)
  const enabledModules = preferences?.enabled_modules || getDefaultModules(businessType);

  // Vérifier si un module est activé
  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    // Les modules core sont toujours activés
    if (ALL_MODULES[moduleId]?.core) return true;
    return enabledModules.includes(moduleId);
  }, [enabledModules]);

  // Obtenir les configs des modules activés
  const getEnabledModuleConfigs = useCallback((): ModuleConfig[] => {
    return enabledModules
      .map(id => ALL_MODULES[id])
      .filter(Boolean) as ModuleConfig[];
  }, [enabledModules]);

  // Toggle un module
  const toggleModule = useCallback(async (moduleId: string, enabled: boolean) => {
    if (!preferences?.documentId) return;
    
    try {
      const updated = await apiToggleModule(
        preferences.documentId,
        enabledModules,
        moduleId,
        enabled
      );
      setPreferences(updated);
    } catch (err) {
      console.error('Error toggling module:', err);
      throw err;
    }
  }, [preferences?.documentId, enabledModules]);

  // Obtenir la terminologie
  const terminology = getTerminology(businessType, language === 'en' ? 'en' : 'fr');

  // Mettre à jour le business type (crée les préférences si elles n'existent pas)
  const updateBusinessType = useCallback(async (type: BusinessType) => {
    if (!user?.id) return;
    
    try {
      if (preferences?.documentId) {
        // Mettre à jour les préférences existantes
        const updated = await updateUserPreferences(preferences.documentId, {
          business_type: type,
          enabled_modules: getDefaultModules(type),
        });
        setPreferences(updated);
      } else {
        // Créer de nouvelles préférences
        const created = await createUserPreferences(user.id, {
          business_type: type,
          enabled_modules: getDefaultModules(type),
          onboarding_completed: true,
          onboarding_step: 0,
        });
        setPreferences(created);
      }
    } catch (err) {
      console.error('Error updating business type:', err);
      throw err;
    }
  }, [preferences?.documentId, user?.id]);

  // Mettre à jour les modules activés (crée les préférences si elles n'existent pas)
  const updateEnabledModules = useCallback(async (modules: string[]) => {
    if (!user?.id) return;
    
    try {
      if (preferences?.documentId) {
        // Mettre à jour les préférences existantes
        const updated = await updateUserPreferences(preferences.documentId, {
          enabled_modules: modules,
        });
        setPreferences(updated);
      } else {
        // Créer de nouvelles préférences avec les modules
        const created = await createUserPreferences(user.id, {
          business_type: 'other',
          enabled_modules: modules,
          onboarding_completed: true,
          onboarding_step: 0,
        });
        setPreferences(created);
      }
    } catch (err) {
      console.error('Error updating enabled modules:', err);
      throw err;
    }
  }, [preferences?.documentId, user?.id]);

  // Rafraîchir les préférences
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  const value: UserPreferencesContextType = {
    preferences,
    loading,
    error,
    businessType,
    businessConfig,
    enabledModules,
    isModuleEnabled,
    getEnabledModuleConfigs,
    toggleModule,
    terminology,
    isOnboardingCompleted: preferences?.onboarding_completed ?? false,
    updateBusinessType,
    updateEnabledModules,
    refreshPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}

// Hook optionnel qui ne throw pas si le context n'existe pas
export function useUserPreferencesOptional() {
  return useContext(UserPreferencesContext);
}

