import { useState, useEffect, useCallback, useRef } from 'react';
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
  const { limits, loading: quotaLoading } = useQuota();
  const [showModal, setShowModal] = useState(false);
  const hasCheckedRef = useRef(false);
  const previousQuotaRef = useRef<number | null>(null);

  const quota = limits[entityType] || 0;
  const currentCount = items.length;
  // quota = 0 means unlimited, so never exceeded
  const isExceeded = quota > 0 && currentCount > quota;
  const exceededCount = isExceeded ? currentCount - quota : 0;

  // Generate a unique key for this quota level
  const getHandledKey = useCallback(() => {
    return `${QUOTA_HANDLED_KEY_PREFIX}${entityType}_${quota}`;
  }, [entityType, quota]);

  // Check if user has already handled this specific quota situation
  const wasAlreadyHandled = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const handledFlag = localStorage.getItem(getHandledKey());
    return handledFlag === 'handled';
  }, [getHandledKey]);

  // Mark as handled - stores a simple flag
  const markAsHandled = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getHandledKey(), 'handled');
    }
    setShowModal(false);
    hasCheckedRef.current = true;
  }, [getHandledKey]);

  // Check if quota is exceeded and show modal if needed
  const checkQuota = useCallback(() => {
    // Don't check if disabled, quota is unlimited (0), or still loading
    if (!enabled || quota === 0 || quotaLoading) return;
    
    // Don't check if no items or quota not exceeded
    if (currentCount <= quota) {
      setShowModal(false);
      return;
    }
    
    // Only show modal if not already handled and not already checked this session
    if (!wasAlreadyHandled() && !hasCheckedRef.current) {
      setShowModal(true);
      hasCheckedRef.current = true;
    }
  }, [enabled, quota, quotaLoading, currentCount, wasAlreadyHandled]);

  // Reset when quota changes significantly
  useEffect(() => {
    if (previousQuotaRef.current !== null && previousQuotaRef.current !== quota) {
      hasCheckedRef.current = false;
      
      // Clear old handled flags for this entity type
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(k => 
          k.startsWith(QUOTA_HANDLED_KEY_PREFIX + entityType) && k !== getHandledKey()
        );
        keys.forEach(k => localStorage.removeItem(k));
      }
    }
    previousQuotaRef.current = quota;
  }, [quota, entityType, getHandledKey]);

  // Auto-check when conditions are met
  useEffect(() => {
    if (enabled && !quotaLoading && items.length > 0) {
      checkQuota();
    }
  }, [enabled, quotaLoading, items.length, checkQuota]);

  // Close modal if quota becomes sufficient (e.g., after refresh)
  useEffect(() => {
    if (!isExceeded && showModal) {
      setShowModal(false);
    }
  }, [isExceeded, showModal]);

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

