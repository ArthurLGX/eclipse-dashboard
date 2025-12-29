/**
 * @file useApi.ts
 * @description Hooks personnalisés pour les requêtes API avec cache et gestion d'état
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchClientsUser,
  fetchProjectsUser,
  fetchAllUserProjects,
  fetchProspectsUser,
  fetchFacturesUser,
  fetchMentorUsers,
  fetchNewslettersUser,
  fetchClientById,
  fetchProjectById,
  fetchProjectByDocumentId,
  fetchUnassignedProjects,
  fetchCompanyUser,
  fetchSubscriptionsUser,
  fetchPlans,
} from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  setData: (data: T | null) => void;
}

// ============================================================================
// CACHE SIMPLE EN MÉMOIRE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_DURATION = 30 * 1000; // 30 secondes

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(keyPattern?: string): void {
  if (keyPattern) {
    for (const key of cache.keys()) {
      if (key.includes(keyPattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// ============================================================================
// HOOK GÉNÉRIQUE
// ============================================================================

function useApiQuery<T>(
  cacheKey: string,
  fetchFn: () => Promise<{ data: T }>,
  dependencies: unknown[] = [],
  options: { enabled?: boolean; useCache?: boolean } = {}
): UseApiReturn<T> {
  const { enabled = true, useCache = true } = options;
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const isMounted = useRef(true);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    // Vérifier le cache
    if (useCache && !skipCache) {
      const cachedData = getCachedData<T>(cacheKey);
      if (cachedData !== null) {
        setState({ data: cachedData, loading: false, error: null });
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetchFn();
      const data = response.data;
      
      if (isMounted.current) {
        if (useCache) {
          setCachedData(cacheKey, data);
        }
        setState({ data, loading: false, error: null });
      }
    } catch (error) {
      if (isMounted.current) {
        // En cas d'erreur, conserver les données existantes si disponibles
        setState(prev => ({ 
          data: prev.data, // Garder les anciennes données
          loading: false, 
          error: error as Error 
        }));
      }
    }
  }, [cacheKey, fetchFn, enabled, useCache]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
    if (data !== null && useCache) {
      setCachedData(cacheKey, data);
    }
  }, [cacheKey, useCache]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies]);

  return { ...state, refetch, setData };
}

// ============================================================================
// HOOKS SPÉCIFIQUES
// ============================================================================

// Clients
export function useClients(userId: number | undefined) {
  return useApiQuery(
    `clients-${userId}`,
    () => fetchClientsUser(userId!),
    [userId],
    { enabled: !!userId }
  );
}

export function useClient(clientId: number | undefined) {
  return useApiQuery(
    `client-${clientId}`,
    async () => {
      const response = await fetchClientById(clientId!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: (response as any).data?.[0] || null };
    },
    [clientId],
    { enabled: !!clientId }
  );
}

export function useClientByDocumentId(documentId: string | undefined) {
  return useApiQuery(
    `client-doc-${documentId}`,
    async () => {
      const { fetchClientByDocumentId } = await import('@/lib/api');
      const response = await fetchClientByDocumentId(documentId!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: (response as any).data?.[0] || null };
    },
    [documentId],
    { enabled: !!documentId }
  );
}

export function useClientBySlug(slug: string | undefined) {
  return useApiQuery(
    `client-slug-${slug}`,
    async () => {
      const { fetchClientBySlug } = await import('@/lib/api');
      const response = await fetchClientBySlug(slug!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: (response as any).data?.[0] || null };
    },
    [slug],
    { enabled: !!slug }
  );
}

// Projects
export function useProjects(userId: number | undefined) {
  return useApiQuery(
    `projects-${userId}`,
    () => fetchAllUserProjects(userId!),
    [userId],
    { enabled: !!userId }
  );
}

/** Hook pour récupérer uniquement les projets dont l'utilisateur est propriétaire */
export function useOwnedProjects(userId: number | undefined) {
  return useApiQuery(
    `owned-projects-${userId}`,
    () => fetchProjectsUser(userId!),
    [userId],
    { enabled: !!userId }
  );
}

export function useProject(projectId: number | undefined) {
  return useApiQuery(
    `project-${projectId}`,
    async () => {
      const response = await fetchProjectById(projectId!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: (response as any).data?.[0] || null };
    },
    [projectId],
    { enabled: !!projectId }
  );
}

export function useProjectByDocumentId(documentId: string | undefined) {
  return useApiQuery(
    `project-doc-${documentId}`,
    async () => {
      const response = await fetchProjectByDocumentId(documentId!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: (response as any).data?.[0] || null };
    },
    [documentId],
    { enabled: !!documentId }
  );
}

export function useUnassignedProjects(userId: number | undefined) {
  return useApiQuery(
    `unassigned-projects-${userId}`,
    () => fetchUnassignedProjects(userId!) as Promise<{ data: unknown }>,
    [userId],
    { enabled: !!userId }
  );
}

// Prospects
export function useProspects(userId: number | undefined) {
  return useApiQuery(
    `prospects-${userId}`,
    () => fetchProspectsUser(userId!),
    [userId],
    { enabled: !!userId }
  );
}

// Factures
export function useFactures(userId: number | undefined) {
  return useApiQuery(
    `factures-${userId}`,
    () => fetchFacturesUser(userId!),
    [userId],
    { enabled: !!userId }
  );
}

// Mentors
export function useMentors(userId: number | undefined) {
  return useApiQuery(
    `mentors-${userId}`,
    () => fetchMentorUsers(userId!),
    [userId],
    { enabled: !!userId }
  );
}

// Newsletters
export function useNewsletters(userId: number | undefined) {
  return useApiQuery(
    `newsletters-${userId}`,
    () => fetchNewslettersUser(userId!),
    [userId],
    { enabled: !!userId }
  );
}

// Company
export function useCompany(userId: number | undefined) {
  return useApiQuery(
    `company-${userId}`,
    async () => {
      const response = await fetchCompanyUser(userId!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: (response as any).data?.[0] || null };
    },
    [userId],
    { enabled: !!userId }
  );
}

// Subscriptions
export function useSubscriptions(userId: number | undefined) {
  return useApiQuery(
    `subscriptions-${userId}`,
    () => fetchSubscriptionsUser(userId!),
    [userId],
    { enabled: !!userId }
  );
}

// Plans
export function usePlans() {
  return useApiQuery(
    'plans',
    () => fetchPlans() as Promise<{ data: unknown }>,
    [],
    { useCache: true }
  );
}

// Current User (avec profile_picture)
export function useCurrentUser(userId: number | undefined) {
  return useApiQuery(
    `current-user-${userId}`,
    async () => {
      const { fetchUserById } = await import('@/lib/api');
      const userData = await fetchUserById(userId!);
      return { data: userData };
    },
    [userId],
    { enabled: !!userId }
  );
}

// ============================================================================
// HOOK POUR LES STATISTIQUES (DASHBOARD)
// ============================================================================

interface DashboardStats {
  clients: number;
  projects: number;
  prospects: number;
  factures: number;
  mentors: number;
  newsletters: number;
}

export function useDashboardStats(userId: number | undefined): UseApiReturn<DashboardStats> {
  const clients = useClients(userId);
  const projects = useProjects(userId);
  const prospects = useProspects(userId);
  const factures = useFactures(userId);
  const mentors = useMentors(userId);
  const newsletters = useNewsletters(userId);

  const loading = clients.loading || projects.loading || prospects.loading || 
                  factures.loading || mentors.loading || newsletters.loading;
  
  const error = clients.error || projects.error || prospects.error || 
                factures.error || mentors.error || newsletters.error;

  const data: DashboardStats | null = !loading && !error ? {
    clients: (clients.data as unknown[])?.length || 0,
    projects: (projects.data as unknown[])?.length || 0,
    prospects: (prospects.data as unknown[])?.length || 0,
    factures: (factures.data as unknown[])?.length || 0,
    mentors: (mentors.data as unknown[])?.length || 0,
    newsletters: (newsletters.data as unknown[])?.length || 0,
  } : null;

  const refetch = async () => {
    await Promise.all([
      clients.refetch(),
      projects.refetch(),
      prospects.refetch(),
      factures.refetch(),
      mentors.refetch(),
      newsletters.refetch(),
    ]);
  };

  const setData = () => {
    // Non implémenté pour les stats
  };

  return { data, loading, error, refetch, setData };
}

