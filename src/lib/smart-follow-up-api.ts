/**
 * API Client pour Smart Follow-Up Engine
 */

import { getToken } from './api';
import type {
  AutomationSettings,
  FollowUpTask,
  AutomationAction,
  AutomationLog,
  SmartFollowUpStats,
  DailyDigest,
} from '@/types/smart-follow-up';

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

/** Headers par défaut avec authentification */
const getHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/** Wrapper générique pour les requêtes */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}/api/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const errorMessage = errorData?.error?.message || `Erreur ${res.status}: ${res.statusText}`;
    throw new Error(errorMessage);
  }

  return res.json();
}

// ============================================================================
// Automation Settings
// ============================================================================

export async function fetchAutomationSettings(): Promise<AutomationSettings | null> {
  const response = await apiRequest<{ data: AutomationSettings[] }>('automation-settings?populate=user');
  return response.data[0] || null;
}

export async function updateAutomationSettings(id: string, data: Partial<AutomationSettings>): Promise<AutomationSettings> {
  const response = await apiRequest<{ data: AutomationSettings }>(`automation-settings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
  return response.data;
}

export async function createAutomationSettings(data: Partial<AutomationSettings>): Promise<AutomationSettings> {
  const response = await apiRequest<{ data: AutomationSettings }>('automation-settings', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
  return response.data;
}

/** Tester la connexion WhatsApp (Twilio | Meta) */
export async function testWhatsAppConnection(config: {
  provider: 'twilio' | 'meta';
  account_sid?: string;
  auth_token?: string;
  from_number?: string;
  to_number?: string;
  phone_number_id?: string;
  access_token?: string;
  recipient_number?: string;
  notification_template?: string;
  use_smart_follow_up_template?: boolean;
}): Promise<{ success: boolean; error?: string; preview?: string }> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const res = await fetch('/api/settings/whatsapp-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });
  return res.json();
}

// ============================================================================
// Follow-up Tasks
// ============================================================================

export async function fetchFollowUpTasks(filters?: Record<string, unknown>): Promise<FollowUpTask[]> {
  const params = new URLSearchParams({
    'populate[user][fields][0]': 'username',
    'populate[contact][fields][0]': 'name',
    'populate[contact][fields][1]': 'enterprise',
    'populate[contact][fields][2]': 'email',
    'populate[contact][fields][3]': 'documentId',
    'populate[received_email][fields][0]': 'id',
    'populate[received_email][fields][1]': 'subject',
    'populate[received_email][fields][2]': 'from_email',
    'sort[0]': 'scheduled_for:asc',
  });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, String(value));
    });
  }

  const response = await apiRequest<{ data: FollowUpTask[] }>(`follow-up-tasks?${params}`);
  return response.data;
}

export async function updateFollowUpTask(id: string, data: Partial<FollowUpTask>): Promise<FollowUpTask> {
  const response = await apiRequest<{ data: FollowUpTask }>(`follow-up-tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
  return response.data;
}

export async function deleteFollowUpTask(id: string): Promise<void> {
  await apiRequest(`follow-up-tasks/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Automation Actions
// ============================================================================

export async function fetchAutomationActions(status?: string | string[]): Promise<AutomationAction[]> {
  const params = new URLSearchParams({
    'populate[user][fields][0]': 'username',
    'populate[client][fields][0]': 'name',
    'populate[client][fields][1]': 'email',
    'populate[client][fields][2]': 'documentId',
    'populate[follow_up_task][fields][0]': 'task_type',
    'populate[follow_up_task][fields][1]': 'documentId',
    'populate[follow_up_task][fields][2]': 'context',
    'populate[follow_up_task][populate][received_email][fields][0]': 'from_email',
    'populate[follow_up_task][populate][received_email][fields][1]': 'subject',
    'populate[follow_up_task][populate][received_email][fields][2]': 'content_text',
    'populate[follow_up_task][populate][received_email][fields][3]': 'content_html',
    'populate[approved_by][fields][0]': 'username',
    'sort[0]': 'createdAt:desc',
    'pagination[pageSize]': '200',
  });

  if (status) {
    if (Array.isArray(status)) {
      status.forEach((s) => params.append('filters[status_automation_action][$in]', s));
    } else {
      params.append('filters[status_automation_action][$eq]', status);
    }
  }

  const response = await apiRequest<{ data: AutomationAction[] }>(`automation-actions?${params}`);
  return response.data;
}

export async function fetchAutomationActionDetail(id: string): Promise<AutomationAction | null> {
  const params = new URLSearchParams({
    'populate[user][fields][0]': 'username',
    'populate[client][fields][0]': 'name',
    'populate[client][fields][1]': 'email',
    'populate[client][fields][2]': 'documentId',
    'populate[follow_up_task][populate][received_email][fields][0]': 'subject',
    'populate[follow_up_task][populate][received_email][fields][1]': 'from_email',
    'populate[follow_up_task][populate][received_email][fields][2]': 'content_text',
    'populate[follow_up_task][populate][received_email][fields][3]': 'content_html',
    'populate[follow_up_task][populate][received_email][fields][4]': 'received_at',
    'populate[follow_up_task][fields][0]': 'context',
    'populate[follow_up_task][fields][1]': 'ai_analysis',
    'populate[follow_up_task][fields][2]': 'task_type',
    'populate[follow_up_task][fields][3]': 'documentId',
    'populate[approved_by][fields][0]': 'username',
  });

  try {
    const response = await apiRequest<{ data: AutomationAction | null }>(`automation-actions/${id}?${params}`);
    return response.data;
  } catch {
    return null;
  }
}

export async function updateAutomationAction(id: string, data: Partial<AutomationAction>): Promise<AutomationAction> {
  const response = await apiRequest<{ data: AutomationAction }>(`automation-actions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
  return response.data;
}

export async function approveAutomationAction(id: string): Promise<AutomationAction> {
  return updateAutomationAction(id, {
    status_automation_action: 'approved',
    approved_at: new Date().toISOString(),
  } as Partial<AutomationAction>);
}

export async function rejectAutomationAction(id: string, reason?: string): Promise<AutomationAction> {
  return updateAutomationAction(id, {
    status_automation_action: 'rejected',
    rejection_reason: reason,
  } as Partial<AutomationAction>);
}

/** Envoie une notification WhatsApp pour le lead (action) affiché */
export async function sendWhatsAppNotification(actionId: string): Promise<{ ok?: boolean; error?: string }> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const res = await fetch('/api/smart-follow-up/send-whatsapp-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ actionId }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Erreur envoi' };
  return data;
}

/** Reporte la tâche de suivi à J+2 (9h) */
export async function snoozeFollowUpTaskToJ2(taskDocumentId: string): Promise<FollowUpTask> {
  const inTwoDays = new Date();
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  inTwoDays.setHours(9, 0, 0, 0);
  return updateFollowUpTask(taskDocumentId, { scheduled_for: inTwoDays.toISOString() } as Partial<FollowUpTask>);
}

export async function deleteAutomationAction(id: string): Promise<void> {
  await apiRequest(`automation-actions/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Automation Logs
// ============================================================================

export async function fetchAutomationLogs(limit = 50): Promise<AutomationLog[]> {
  const params = new URLSearchParams({
    'populate[user][fields][0]': 'username',
    'populate[client][fields][0]': 'name',
    'populate[received_email][fields][0]': 'subject',
    'sort[0]': 'createdAt:desc',
    'pagination[limit]': limit.toString(),
  });

  const response = await apiRequest<{ data: AutomationLog[] }>(`automation-logs?${params}`);
  return response.data;
}

// ============================================================================
// Received Emails (test IA)
// ============================================================================

export interface ReceivedEmailToday {
  id: number;
  documentId?: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  received_at?: string;
  content_text?: string;
  content_html?: string;
}

export async function fetchReceivedEmailsToday(): Promise<ReceivedEmailToday[]> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const start = startOfDay.toISOString();
  const end = now.toISOString();

  const params = new URLSearchParams({
    'filters[received_at][$gte]': start,
    'filters[received_at][$lte]': end,
    'sort[0]': 'received_at:desc',
    'pagination[limit]': '50',
  });

  try {
    const response = await apiRequest<{ data: ReceivedEmailToday[] }>(`received-emails?${params}`);
    return response.data || [];
  } catch {
    return [];
  }
}

// ============================================================================
// Stats (agrégation côté client)
// ============================================================================

export async function fetchSmartFollowUpStats(): Promise<SmartFollowUpStats> {
  const [actions, tasks] = await Promise.all([
    fetchAutomationActions(),
    fetchFollowUpTasks(),
  ]);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    activeActions: actions.filter((a) =>
      a.status_automation_action === 'pending' || a.status_automation_action === 'approved'
    ).length,
    dueToday: tasks.filter(t => t.scheduled_for.split('T')[0] === today && t.status_follow_up === 'pending').length,
    sentThisWeek: actions.filter(a => a.status_automation_action === 'executed' && a.executed_at && a.executed_at >= weekAgo).length,
    recoveredOpportunities: 0, // À calculer selon votre logique
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status_follow_up === 'completed').length,
    successRate: tasks.length > 0 ? (tasks.filter(t => t.status_follow_up === 'completed').length / tasks.length) * 100 : 0,
  };
}

// ============================================================================
// Daily Digest (Home View quotidienne)
// ============================================================================

export async function fetchDailyDigest(date?: string): Promise<DailyDigest | null> {
  const token = getToken();
  if (!token) return null;

  const dateStr = date || new Date().toISOString().split('T')[0];
  const url = `/api/smart-follow-up/daily-digest?date=${dateStr}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
