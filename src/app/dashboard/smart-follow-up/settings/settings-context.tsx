'use client';

import { createContext, useContext } from 'react';

export type NavSection = 'activation' | 'domaines' | 'icp' | 'mots-cles' | 'delais' | 'heures' | 'regles' | 'notifications';

interface SettingsLayoutContextValue {
  activeSection: NavSection;
  setActiveSection: (s: NavSection) => void;
}

export const SettingsLayoutContext = createContext<SettingsLayoutContextValue | null>(null);

export function useSettingsLayout() {
  const ctx = useContext(SettingsLayoutContext);
  if (!ctx) throw new Error('useSettingsLayout must be used within SettingsLayout');
  return ctx;
}
