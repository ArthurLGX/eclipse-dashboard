/**
 * Hooks React pour Smart Follow-Up Engine
 */

import useSWR from 'swr';
import {
  fetchAutomationSettings,
  fetchFollowUpTasks,
  fetchAutomationActions,
  fetchAutomationLogs,
  fetchSmartFollowUpStats,
  fetchDailyDigest,
  fetchSfuLeads,
  sfuLeadToAutomationAction,
} from '@/lib/smart-follow-up-api';
import { useMemo, useCallback } from 'react';
import type { AutomationAction } from '@/types/smart-follow-up';

export function useAutomationSettings() {
  return useSWR('automation-settings', fetchAutomationSettings, {
    revalidateOnFocus: false,
  });
}

export function useFollowUpTasks(filters?: Record<string, unknown>) {
  return useSWR(['follow-up-tasks', filters], () => fetchFollowUpTasks(filters), {
    refreshInterval: 60000, // Refresh every minute
  });
}

export function useAutomationActions(status?: string | string[]) {
  return useSWR(['automation-actions', status], () => fetchAutomationActions(status), {
    refreshInterval: 60000,
  });
}

/** Tableau principal SFU : leads unifiés (Strapi `leads`) mappés en forme AutomationAction pour l’UI. */
export function useSfuLeadsMapped() {
  const { data: inboxRaw, mutate: mutateInbox, isLoading: loadingInbox } = useSWR(
    ['sfu-leads-inbox'],
    () => fetchSfuLeads(['new', 'seen', 'snoozed']),
    { refreshInterval: 60000 }
  );
  const { data: sentRaw, mutate: mutateSent, isLoading: loadingSent } = useSWR(
    ['sfu-leads-sent'],
    () => fetchSfuLeads(['replied']),
    { refreshInterval: 60000 }
  );

  const allActions = useMemo(
    () => (inboxRaw ?? []).map(sfuLeadToAutomationAction) as AutomationAction[],
    [inboxRaw]
  );
  const sentActions = useMemo(
    () => (sentRaw ?? []).map(sfuLeadToAutomationAction) as AutomationAction[],
    [sentRaw]
  );

  const mutateActions = useCallback(async () => {
    await mutateInbox();
    await mutateSent();
  }, [mutateInbox, mutateSent]);

  const mutateSentActions = useCallback(async () => {
    await mutateSent();
  }, [mutateSent]);

  return {
    allActions,
    sentActions,
    mutateActions,
    mutateSentActions,
    isLoading: loadingInbox || loadingSent,
  };
}

export function useAutomationLogs(limit = 50) {
  return useSWR(['automation-logs', limit], () => fetchAutomationLogs(limit), {
    revalidateOnFocus: false,
  });
}

export function useSmartFollowUpStats() {
  return useSWR('smart-follow-up-stats', fetchSmartFollowUpStats, {
    refreshInterval: 60000,
  });
}

export function useDailyDigest(date?: string) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  return useSWR(
    ['daily-digest', dateStr],
    () => fetchDailyDigest(dateStr),
    { revalidateOnFocus: false }
  );
}
