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
  SfuLead,
  TaskAIAnalysis,
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

/**
 * Test d’envoi WhatsApp avec la config **déjà enregistrée** sur Strapi
 * (pas le brouillon du formulaire — utile pour valider la prod).
 */
export async function testWhatsAppNotificationFromSavedSettings(): Promise<{
  success: boolean;
  error?: string;
  preview?: string;
}> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const res = await fetch('/api/smart-follow-up/test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
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
    'populate[received_email][fields][3]': 'from_name',
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
    'populate[follow_up_task][populate][received_email][fields][1]': 'from_name',
    'populate[follow_up_task][populate][received_email][fields][2]': 'snippet',
    'populate[follow_up_task][populate][received_email][fields][3]': 'subject',
    'populate[follow_up_task][populate][received_email][fields][4]': 'content_text',
    'populate[follow_up_task][populate][received_email][fields][5]': 'content_html',
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
    'populate[follow_up_task][populate][received_email][fields][2]': 'from_name',
    'populate[follow_up_task][populate][received_email][fields][3]': 'snippet',
    'populate[follow_up_task][populate][received_email][fields][4]': 'content_text',
    'populate[follow_up_task][populate][received_email][fields][5]': 'content_html',
    'populate[follow_up_task][populate][received_email][fields][6]': 'received_at',
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
// Leads (table unifiée SFU)
// ============================================================================

/** Convertit un lead Strapi en forme compatible avec l’UI historique (AutomationAction). */
export function sfuLeadToAutomationAction(lead: SfuLead): AutomationAction {
  const pc = (lead.proposed_content || {}) as AutomationAction['proposed_content'];
  const body = (pc?.body as string) || lead.draft || '';
  const replyEmail =
    lead.client?.email?.trim() ||
    lead.received_email?.from_email?.trim() ||
    lead.email?.trim() ||
    '';
  const pcTo0 =
    Array.isArray(pc?.to) && pc.to.length ? String(pc.to[0]).trim() : '';
  const to =
    replyEmail
      ? [replyEmail]
      : pcTo0
        ? [pcTo0]
        : [];
  const statusMap: Record<string, AutomationAction['status_automation_action']> = {
    new: 'approved',
    seen: 'approved',
    replied: 'executed',
    archived: 'rejected',
    snoozed: 'snoozed',
  };
  return {
    id: lead.id,
    documentId: lead.documentId,
    user: lead.user as AutomationAction['user'],
    client: lead.client ?? null,
    avatar_path: lead.avatar_url ?? undefined,
    lead_title: lead.title ?? undefined,
    linkedin_url: lead.linkedin_url ?? undefined,
    follow_up_task: {
      id: 0,
      documentId: '',
      task_type: lead.task_type || 'custom',
      context: {
        lead_source: lead.source || undefined,
        source: lead.source || undefined,
        from_email: replyEmail || lead.email || undefined,
        from_name: lead.received_email?.from_name || undefined,
      },
      ai_analysis: lead.ai_analysis as TaskAIAnalysis | undefined,
      received_email: lead.received_email ?? undefined,
    },
    approved_by: null,
    action_type: 'send_email',
    proposed_content: {
      subject: (pc?.subject as string) || '',
      body,
      to,
      cc: (pc?.cc as string[]) || [],
      attachments: (pc?.attachments as unknown[]) || [],
      scheduled_time: lead.scheduled_for ?? undefined,
      lead_display_name: (pc as { lead_display_name?: string })?.lead_display_name,
    },
    status_automation_action: statusMap[lead.status] || 'pending',
    edited_content: null,
    execution_result: null,
    approved_at: null,
    executed_at: lead.replied_at || null,
    rejection_reason: null,
    confidence_score: Number(lead.confidence) || 0,
    requires_approval: lead.requires_approval !== false,
    createdAt: lead.createdAt || '',
    updatedAt: lead.updatedAt || '',
  };
}

export async function fetchSfuLeads(statusIn: string[]): Promise<SfuLead[]> {
  const params = new URLSearchParams({
    'populate[received_email][fields][0]': 'id',
    'populate[received_email][fields][1]': 'subject',
    'populate[received_email][fields][2]': 'from_email',
    'populate[received_email][fields][3]': 'from_name',
    'populate[received_email][fields][4]': 'snippet',
    'populate[received_email][fields][5]': 'content_text',
    'populate[received_email][fields][6]': 'content_html',
    'populate[received_email][fields][7]': 'received_at',
    'populate[client][fields][0]': 'name',
    'populate[client][fields][1]': 'email',
    'populate[client][fields][2]': 'documentId',
    'populate[client][fields][3]': 'website',
    'populate[client][populate][image][fields][0]': 'url',
    'populate[user][fields][0]': 'username',
    'sort[0]': 'createdAt:desc',
    'pagination[pageSize]': '200',
  });
  statusIn.forEach((s, i) => params.append(`filters[status][$in][${i}]`, s));
  const response = await apiRequest<{ data: SfuLead[] }>(`leads?${params}`);
  return response.data || [];
}

export async function fetchSfuLeadDetail(documentId: string): Promise<SfuLead | null> {
  const params = new URLSearchParams({
    'populate[received_email][fields][0]': 'id',
    'populate[received_email][fields][1]': 'subject',
    'populate[received_email][fields][2]': 'from_email',
    'populate[received_email][fields][3]': 'from_name',
    'populate[received_email][fields][4]': 'snippet',
    'populate[received_email][fields][5]': 'content_text',
    'populate[received_email][fields][6]': 'content_html',
    'populate[received_email][fields][7]': 'received_at',
    'populate[client][fields][0]': 'name',
    'populate[client][fields][1]': 'email',
    'populate[client][fields][2]': 'documentId',
    'populate[client][fields][3]': 'website',
    'populate[client][populate][image][fields][0]': 'url',
    'populate[user][fields][0]': 'username',
  });
  try {
    const response = await apiRequest<{ data: SfuLead }>(`leads/${documentId}?${params}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function archiveSfuLead(leadDocumentId: string): Promise<void> {
  await apiRequest(`leads/${leadDocumentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        status: 'archived',
        archived_at: new Date().toISOString(),
      },
    }),
  });
}

function snoozedUntilTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export async function snoozeSfuLeadTomorrow(leadDocumentId: string): Promise<void> {
  await apiRequest(`leads/${leadDocumentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        status: 'snoozed',
        snoozed_until: snoozedUntilTomorrow(),
      },
    }),
  });
}

export async function updateSfuLead(
  documentId: string,
  data: Partial<Pick<SfuLead, 'status' | 'seen_at'>>
): Promise<void> {
  await apiRequest(`leads/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

/**
 * Persiste le brouillon IA dans Strapi (`proposed_content.body` + champ `draft` si présent au schéma).
 */
export async function patchSfuLeadDraftBody(
  documentId: string,
  draftBody: string,
  currentProposed: AutomationAction['proposed_content'] | undefined
): Promise<void> {
  const proposed_content: AutomationAction['proposed_content'] = {
    subject: currentProposed?.subject ?? '',
    body: draftBody,
    to: currentProposed?.to ?? [],
    cc: currentProposed?.cc ?? [],
    attachments: currentProposed?.attachments ?? [],
    ...(currentProposed?.scheduled_time != null
      ? { scheduled_time: currentProposed.scheduled_time }
      : {}),
    ...(currentProposed?.lead_display_name
      ? { lead_display_name: currentProposed.lead_display_name }
      : {}),
  };

  await apiRequest(`leads/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        proposed_content,
        draft: draftBody,
      },
    }),
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
  const [tasks] = await Promise.all([fetchFollowUpTasks()]);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [inboxLeads, sentLeads] = await Promise.all([
      fetchSfuLeads(['new', 'seen', 'snoozed']),
      fetchSfuLeads(['replied']),
    ]);
    return {
      activeActions: inboxLeads.length,
      dueToday: tasks.filter(t => t.scheduled_for.split('T')[0] === today && t.status_follow_up === 'pending').length,
      sentThisWeek: sentLeads.filter(
        (l) => l.replied_at && new Date(l.replied_at).toISOString() >= weekAgo
      ).length,
      recoveredOpportunities: 0,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status_follow_up === 'completed').length,
      successRate: tasks.length > 0 ? (tasks.filter(t => t.status_follow_up === 'completed').length / tasks.length) * 100 : 0,
    };
  } catch {
    const actions = await fetchAutomationActions();
    return {
      activeActions: actions.filter((a) =>
        a.status_automation_action === 'pending' || a.status_automation_action === 'approved'
      ).length,
      dueToday: tasks.filter(t => t.scheduled_for.split('T')[0] === today && t.status_follow_up === 'pending').length,
      sentThisWeek: actions.filter(a => a.status_automation_action === 'executed' && a.executed_at && a.executed_at >= weekAgo).length,
      recoveredOpportunities: 0,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status_follow_up === 'completed').length,
      successRate: tasks.length > 0 ? (tasks.filter(t => t.status_follow_up === 'completed').length / tasks.length) * 100 : 0,
    };
  }
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
