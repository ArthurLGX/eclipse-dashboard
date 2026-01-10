'use client';
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

export type ThemeStyle = 'default' | 'brutalist';
export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedMode = 'dark' | 'light';

interface ThemeContextType {
  themeStyle: ThemeStyle;
  themeMode: ThemeMode;
  resolvedMode: ResolvedMode;
  setThemeStyle: (style: ThemeStyle) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_STYLE = 'eclipse-theme-style';
const STORAGE_KEY_MODE = 'eclipse-theme-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>('default');
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

  // Appliquer le thème au document
  const applyTheme = useCallback((style: ThemeStyle, resolved: ResolvedMode) => {
    const root = document.documentElement;
    // Retirer toutes les classes de thème
    root.classList.remove('light', 'dark', 'brutalist', 'brutalist-light', 'brutalist-dark', 'default-light', 'default-dark');
    
    // Appliquer les nouvelles classes
    if (style === 'brutalist') {
      root.classList.add('brutalist');
      root.classList.add(resolved === 'light' ? 'brutalist-light' : 'brutalist-dark');
    } else {
      root.classList.add(resolved);
    }
    
    // Mettre à jour les meta tags pour mobile
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'light' ? '#ffffff' : '#000000');
    }
  }, []);

  // Changer le style de thème
  const setThemeStyle = useCallback((newStyle: ThemeStyle) => {
    setThemeStyleState(newStyle);
    localStorage.setItem(STORAGE_KEY_STYLE, newStyle);
    applyTheme(newStyle, resolvedMode);
  }, [resolvedMode, applyTheme]);

  // Changer le mode (clair/sombre)
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeModeState(newMode);
    localStorage.setItem(STORAGE_KEY_MODE, newMode);
    const resolved = getResolvedMode(newMode);
    setResolvedMode(resolved);
    applyTheme(themeStyle, resolved);
  }, [themeStyle, getResolvedMode, applyTheme]);

  // Initialisation
  useEffect(() => {
    const storedStyle = localStorage.getItem(STORAGE_KEY_STYLE) as ThemeStyle | null;
    const storedMode = localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode | null;
    
    const initialStyle = storedStyle || 'default';
    const initialMode = storedMode || 'dark';
    
    setThemeStyleState(initialStyle);
    setThemeModeState(initialMode);
    
    const resolved = getResolvedMode(initialMode);
    setResolvedMode(resolved);
    applyTheme(initialStyle, resolved);
    setMounted(true);
  }, [getResolvedMode, applyTheme]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved: ResolvedMode = e.matches ? 'dark' : 'light';
      setResolvedMode(resolved);
      applyTheme(themeStyle, resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, themeStyle, applyTheme]);

  // Éviter le flash de contenu non stylisé
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeStyle, themeMode, resolvedMode, setThemeStyle, setThemeMode }}>
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

