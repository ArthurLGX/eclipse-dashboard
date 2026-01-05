'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePopup } from '@/app/context/PopupContext';

interface DraftData {
  [key: string]: unknown;
}

interface UseDraftSaveOptions {
  /** Clé unique pour identifier le brouillon dans localStorage */
  draftKey: string;
  /** Données du brouillon à sauvegarder */
  data: DraftData;
  /** Fonction pour restaurer les données du brouillon */
  onRestore?: (data: DraftData) => void;
  /** Délai avant la sauvegarde automatique (ms) */
  autoSaveDelay?: number;
  /** Désactiver la sauvegarde */
  disabled?: boolean;
}

export function useDraftSave({
  draftKey,
  data,
  onRestore,
  autoSaveDelay = 5000,
  disabled = false,
}: UseDraftSaveOptions) {
  const { showGlobalPopup } = usePopup();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const hasUnsavedChanges = useRef(false);
  const lastSavedData = useRef<string>('');

  // Vérifier s'il y a des changements non sauvegardés
  const checkForChanges = useCallback(() => {
    const currentData = JSON.stringify(data);
    const hasContent = Object.values(data).some(value => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return false;
    });
    
    hasUnsavedChanges.current = hasContent && currentData !== lastSavedData.current;
    return hasUnsavedChanges.current;
  }, [data]);

  // Sauvegarder le brouillon
  const saveDraft = useCallback(() => {
    if (disabled) return false;
    
    const hasContent = Object.values(data).some(value => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return false;
    });

    if (!hasContent) return false;

    try {
      const draftToSave = {
        ...data,
        savedAt: new Date().toISOString(),
        pathname,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftToSave));
      lastSavedData.current = JSON.stringify(data);
      hasUnsavedChanges.current = false;
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      return false;
    }
  }, [data, draftKey, pathname, disabled]);

  // Charger le brouillon existant
  const loadDraft = useCallback((): DraftData | null => {
    if (disabled) return null;
    
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
    return null;
  }, [draftKey, disabled]);

  // Supprimer le brouillon
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      lastSavedData.current = '';
      hasUnsavedChanges.current = false;
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [draftKey]);

  // Restaurer le brouillon au chargement
  useEffect(() => {
    if (disabled || !onRestore) return;

    const savedDraft = loadDraft();
    if (savedDraft) {
      // Demander à l'utilisateur s'il veut restaurer
      const savedAt = savedDraft.savedAt ? new Date(savedDraft.savedAt as string) : null;
      const timeAgo = savedAt ? getTimeAgo(savedAt) : '';
      
      if (confirm(`Un brouillon a été trouvé${timeAgo ? ` (sauvegardé ${timeAgo})` : ''}. Voulez-vous le restaurer ?`)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { savedAt: _, pathname: __, ...draftData } = savedDraft;
        onRestore(draftData);
        showGlobalPopup('Brouillon restauré', 'success');
      } else {
        clearDraft();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save périodique
  useEffect(() => {
    if (disabled || autoSaveDelay <= 0) return;

    const interval = setInterval(() => {
      if (checkForChanges()) {
        saveDraft();
      }
    }, autoSaveDelay);

    return () => clearInterval(interval);
  }, [autoSaveDelay, checkForChanges, saveDraft, disabled]);

  // Sauvegarder avant de quitter la page (beforeunload)
  useEffect(() => {
    if (disabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (checkForChanges()) {
        saveDraft();
        showGlobalPopup('Brouillon sauvegardé automatiquement', 'info');
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [checkForChanges, saveDraft, showGlobalPopup, disabled]);

  // Détecter le changement de route et sauvegarder
  useEffect(() => {
    if (disabled) return;

    if (previousPathname.current !== pathname) {
      // On a changé de page
      if (checkForChanges()) {
        saveDraft();
        showGlobalPopup('Brouillon sauvegardé automatiquement', 'info');
      }
      previousPathname.current = pathname;
    }
  }, [pathname, checkForChanges, saveDraft, showGlobalPopup, disabled]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasUnsavedChanges: () => checkForChanges(),
  };
}

// Helper pour afficher le temps écoulé
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
}

export default useDraftSave;

