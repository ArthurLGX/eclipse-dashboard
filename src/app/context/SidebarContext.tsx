'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Définition des IDs de liens de la sidebar (excluant home, profile, et logout qui sont toujours visibles)
export type SidebarLinkId = 
  | 'revenue'
  | 'clients'
  | 'prospects'
  | 'projects'
  | 'mentors'
  | 'newsletters';

// Tous les liens configurables
export const CONFIGURABLE_LINKS: SidebarLinkId[] = [
  'revenue',
  'clients',
  'prospects',
  'projects',
  'mentors',
  'newsletters',
];

// Configuration par défaut (tous visibles)
const DEFAULT_VISIBLE_LINKS: SidebarLinkId[] = [...CONFIGURABLE_LINKS];

interface SidebarContextType {
  visibleLinks: SidebarLinkId[];
  isLinkVisible: (linkId: string) => boolean;
  toggleLink: (linkId: SidebarLinkId) => void;
  setVisibleLinks: (links: SidebarLinkId[]) => void;
  resetToDefault: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'sidebar-visible-links';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [visibleLinks, setVisibleLinksState] = useState<SidebarLinkId[]>(DEFAULT_VISIBLE_LINKS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger les préférences depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SidebarLinkId[];
        // Valider que les liens sont valides
        const validLinks = parsed.filter(link => CONFIGURABLE_LINKS.includes(link));
        setVisibleLinksState(validLinks);
      }
    } catch (error) {
      console.error('Error loading sidebar preferences:', error);
    }
    setIsInitialized(true);
  }, []);

  // Sauvegarder les préférences dans localStorage
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleLinks));
      } catch (error) {
        console.error('Error saving sidebar preferences:', error);
      }
    }
  }, [visibleLinks, isInitialized]);

  const isLinkVisible = (linkId: string): boolean => {
    // Les liens toujours visibles
    if (['home', 'profile', 'logout'].includes(linkId)) {
      return true;
    }
    return visibleLinks.includes(linkId as SidebarLinkId);
  };

  const toggleLink = (linkId: SidebarLinkId) => {
    setVisibleLinksState(prev => {
      if (prev.includes(linkId)) {
        return prev.filter(id => id !== linkId);
      } else {
        return [...prev, linkId];
      }
    });
  };

  const setVisibleLinks = (links: SidebarLinkId[]) => {
    setVisibleLinksState(links);
  };

  const resetToDefault = () => {
    setVisibleLinksState(DEFAULT_VISIBLE_LINKS);
  };

  return (
    <SidebarContext.Provider
      value={{
        visibleLinks,
        isLinkVisible,
        toggleLink,
        setVisibleLinks,
        resetToDefault,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

