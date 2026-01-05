import { useState, useEffect, useCallback } from 'react';
import { useQuota } from '@/app/context/QuotaContext';

type EntityType = 'clients' | 'projects' | 'prospects' | 'mentors' | 'newsletters';

interface UseQuotaExceededReturn<T> {
  isExceeded: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  quota: number;
  currentCount: number;
  exceededCount: number;
  checkQuota: (items: T[]) => void;
  markAsHandled: () => void;
}

const QUOTA_HANDLED_KEY_PREFIX = 'quota_handled_';

export function useQuotaExceeded<T>(
  entityType: EntityType,
  items: T[],
  enabled: boolean = true
): UseQuotaExceededReturn<T> {
  const { limits } = useQuota();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const quota = limits[entityType] || 0;
  const currentCount = items.length;
  const isExceeded = quota > 0 && currentCount > quota; // quota = 0 means unlimited
  const exceededCount = isExceeded ? currentCount - quota : 0;

  // Check if user has already handled this quota change (stored in localStorage)
  const getHandledKey = useCallback(() => {
    return `${QUOTA_HANDLED_KEY_PREFIX}${entityType}_${quota}`;
  }, [entityType, quota]);

  const wasAlreadyHandled = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const handledCount = localStorage.getItem(getHandledKey());
    // If the stored count matches current count and quota, it was handled
    return handledCount === `${currentCount}`;
  }, [getHandledKey, currentCount]);

  const markAsHandled = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getHandledKey(), `${quota}`);
    }
    setShowModal(false);
  }, [getHandledKey, quota]);

  const checkQuota = useCallback((itemsToCheck: T[]) => {
    if (!enabled || !quota || quota === 0) return;
    
    const count = itemsToCheck.length;
    if (count > quota && !wasAlreadyHandled() && !hasChecked) {
      setShowModal(true);
      setHasChecked(true);
    }
  }, [enabled, quota, wasAlreadyHandled, hasChecked]);

  // Auto-check on mount when items are loaded
  useEffect(() => {
    if (enabled && items.length > 0 && !hasChecked) {
      checkQuota(items);
    }
  }, [enabled, items, checkQuota, hasChecked]);

  // Reset hasChecked when quota changes
  useEffect(() => {
    setHasChecked(false);
    // Clear old handled flags when quota changes
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(QUOTA_HANDLED_KEY_PREFIX + entityType) && k !== getHandledKey()
      );
      keys.forEach(k => localStorage.removeItem(k));
    }
  }, [quota, entityType, getHandledKey]);

  return {
    isExceeded,
    showModal,
    setShowModal,
    quota,
    currentCount,
    exceededCount,
    checkQuota,
    markAsHandled,
  };
}

