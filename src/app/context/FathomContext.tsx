'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface FathomConfig {
  webhook_secret: string;
  api_key: string;
  auto_join: boolean;
  include_transcript: boolean;
  include_summary: boolean;
  include_action_items: boolean;
}

interface FathomContextType {
  config: FathomConfig | null;
  isConnected: boolean;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
  setConfigured: () => void;
}

const FathomContext = createContext<FathomContextType | undefined>(undefined);

export function FathomProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<FathomConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refreshConfig = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/integrations/fathom?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setIsConnected(data.connected);
      } else {
        setConfig(null);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error fetching Fathom config:', error);
      setConfig(null);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user?.id]);

  // Charger la config au montage si l'utilisateur est connecté
  useEffect(() => {
    if (user?.id && !hasLoaded) {
      refreshConfig();
    }
  }, [user?.id, hasLoaded, refreshConfig]);

  // Réinitialiser quand l'utilisateur change
  useEffect(() => {
    if (!user?.id) {
      setConfig(null);
      setIsConnected(false);
      setHasLoaded(false);
    }
  }, [user?.id]);

  // Fonction pour marquer comme configuré après sauvegarde
  const setConfigured = useCallback(() => {
    setIsConnected(true);
  }, []);

  return (
    <FathomContext.Provider value={{ config, isConnected, isLoading, refreshConfig, setConfigured }}>
      {children}
    </FathomContext.Provider>
  );
}

export function useFathom() {
  const context = useContext(FathomContext);
  if (!context) {
    throw new Error('useFathom must be used within a FathomProvider');
  }
  return context;
}

