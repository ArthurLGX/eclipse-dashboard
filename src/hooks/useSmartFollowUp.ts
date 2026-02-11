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
} from '@/lib/smart-follow-up-api';

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

export function useAutomationActions(status?: string) {
  return useSWR(['automation-actions', status], () => fetchAutomationActions(status), {
    refreshInterval: 60000,
  });
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
