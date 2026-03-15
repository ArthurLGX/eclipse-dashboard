'use client';
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedMode = 'dark' | 'light';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedMode: ResolvedMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'eclipse-theme-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [resolvedMode, setResolvedMode] = useState<ResolvedMode>('dark');
  const [mounted, setMounted] = useState(false);

  // Déterminer le mode résolu basé sur les préférences système
  const getResolvedMode = useCallback((mode: ThemeMode): ResolvedMode => {
    if (mode === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return mode;
  }, []);

  // Appliquer le thème au document (mode clair/sombre uniquement)
  const applyTheme = useCallback((resolved: ResolvedMode) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'brutalist', 'brutalist-light', 'brutalist-dark');
    root.classList.add(resolved);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'light' ? '#ffffff' : '#000000');
    }
  }, []);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeModeState(newMode);
    localStorage.setItem(STORAGE_KEY_MODE, newMode);
    const resolved = getResolvedMode(newMode);
    setResolvedMode(resolved);
    applyTheme(resolved);
  }, [getResolvedMode, applyTheme]);

  // Initialisation
  useEffect(() => {
    const storedMode = localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode | null;
    const initialMode = storedMode || 'dark';

    setThemeModeState(initialMode);
    const resolved = getResolvedMode(initialMode);
    setResolvedMode(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, [getResolvedMode, applyTheme]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved: ResolvedMode = e.matches ? 'dark' : 'light';
      setResolvedMode(resolved);
      applyTheme(resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, applyTheme]);

  // Éviter le flash de contenu non stylisé
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

