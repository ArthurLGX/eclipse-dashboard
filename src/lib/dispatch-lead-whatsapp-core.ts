/**
 * Logique partagée : envoi WhatsApp pour un lead (Meta Graph ou proxy Twilio Strapi).
 * Utilisable avec JWT utilisateur ou token API Strapi (webhook serveur).
 */

import type { LeadSource } from '@/types/lead-source';
import { resolveSourceDisplayName, resolveSourceIconEmoji } from '@/lib/source-notification-icon';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

export type DispatchLeadWhatsAppSuccess = {
  ok: true;
  messaging_product?: string;
  graph?: unknown;
  [key: string]: unknown;
};

export type DispatchLeadWhatsAppFailure = {
  ok: false;
  error: string;
  status: number;
  detail?: unknown;
};

export type DispatchLeadWhatsAppResult = DispatchLeadWhatsAppSuccess | DispatchLeadWhatsAppFailure;

type WcMeta = {
  phone_number_id?: string;
  access_token?: string;
  recipient_number?: string;
};
type WcTwilio = {
  account_sid?: string;
  auth_token?: string;
  from_number?: string;
  to_number?: string;
};

async function strapiJson<T>(path: string, authHeader: string): Promise<{ ok: boolean; data?: T; status: number; err?: string }> {
  const res = await fetch(`${STRAPI_URL}/api/${path}`, {
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message || res.statusText;
    return { ok: false, status: res.status, err: msg };
  }
  return { ok: true, data, status: res.status };
}

function normalizeWaTo(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Message Meta + indication si le jeton est expiré / invalide (erreur fréquente en prod). */
function metaGraphUserFacingMessage(graphError: { message?: string } | undefined, httpStatus: number): string {
  const base =
    graphError?.message ||
    `Meta API ${httpStatus} — vérifiez le nom du template et le nombre de variables dans Meta Business.`;
  const lower = base.toLowerCase();
  if (
    lower.includes('session has expired') ||
    lower.includes('error validating access token') ||
    (lower.includes('expired') && lower.includes('session'))
  ) {
    return `${base} — Renouvelez le jeton Meta (access_token) dans Paramètres → Smart Follow‑up → WhatsApp, ou générez un jeton longue durée dans Meta for Developers.`;
  }
  return base;
}

function leadDisplayName(lead: Record<string, unknown>): string {
  const pc = lead.proposed_content as { subject?: string; lead_display_name?: string } | undefined;
  if (pc?.lead_display_name && typeof pc.lead_display_name === 'string' && pc.lead_display_name.trim()) {
    return pc.lead_display_name.trim();
  }
  const n = lead.name;
  if (typeof n === 'string' && n.trim()) return n.trim();
  if (pc?.subject && typeof pc.subject === 'string') {
    const subj = pc.subject.trim();
    if (!/^Walego Lead Notification/i.test(subj)) return subj.slice(0, 120);
  }
  const re = lead.received_email as { from_name?: string } | undefined;
  if (re?.from_name) return String(re.from_name);
  return 'Nouveau lead';
}

function leadSignal(lead: Record<string, unknown>): string {
  const s = lead.signal;
  if (typeof s === 'string' && s.trim()) return s.trim().slice(0, 500);
  const re = lead.received_email as { snippet?: string; subject?: string } | undefined;
  if (re?.snippet) return String(re.snippet).slice(0, 500);
  if (re?.subject) return String(re.subject).slice(0, 200);
  const pc = lead.proposed_content as { subject?: string } | undefined;
  if (pc?.subject) return String(pc.subject).slice(0, 200);
  return '—';
}

function leadTitle(lead: Record<string, unknown>): string {
  const t = lead.title;
  if (typeof t === 'string' && t.trim()) return t.trim().slice(0, 300);
  return '—';
}

/** Aligné sur Strapi `whatsapp-meta.service` → `buildTemplateVars` + `sendViaMeta` (5 variables body). */
function buildTemplateVarsForMeta(
  lead: Record<string, unknown>,
  leadSources: LeadSource[] | null | undefined
): {
  line1: string;
  name: string;
  title: string;
  signal: string;
  actionUrl: string;
} {
  const sourceId = typeof lead.source === 'string' ? lead.source : 'direct';
  const rawSource = sourceId.toLowerCase();
  const iconEmoji = resolveSourceIconEmoji(sourceId, leadSources);
  const sourceLabel = resolveSourceDisplayName(sourceId, leadSources);

  const linkedinUrl = typeof lead.linkedin_url === 'string' ? lead.linkedin_url.trim() : '';
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://dashboard.eclipsestudiodev.fr';
  const appUrl = `${String(appBase).replace(/\/$/, '')}/dashboard/smart-follow-up`;
  const actionUrl =
    rawSource === 'walego' || rawSource === 'folk' ? linkedinUrl || appUrl : appUrl;

  return {
    line1: `${iconEmoji} ${sourceLabel}`,
    name: leadDisplayName(lead),
    title: leadTitle(lead),
    signal: leadSignal(lead),
    actionUrl: actionUrl.slice(0, 512),
  };
}

/**
 * @param strapiAuthHeader - `Bearer <JWT utilisateur>` ou `Bearer <STRAPI_API_TOKEN>`
 * @param userId - id numérique Strapi du propriétaire du lead (users-permissions)
 */
export async function runDispatchLeadWhatsApp(params: {
  leadDocumentId: string;
  userId: number;
  strapiAuthHeader: string;
}): Promise<DispatchLeadWhatsAppResult> {
  const { leadDocumentId, userId, strapiAuthHeader: authHeader } = params;

  const settingsRes = await strapiJson<{
    data?: Array<{
      whatsapp_config?: Record<string, unknown>;
      documentId?: string;
      lead_sources?: LeadSource[] | null;
    }>;
  }>(`automation-settings?filters[user][id][$eq]=${userId}`, authHeader);
  if (!settingsRes.ok || !settingsRes.data?.data?.[0]) {
    return { ok: false, error: settingsRes.err || 'Paramètres automation introuvables', status: 400 };
  }

  const settingsRow = settingsRes.data.data[0];
  const leadSources = settingsRow.lead_sources;
  const wc = settingsRow.whatsapp_config as
    | {
        enabled?: boolean;
        provider?: string;
        meta?: WcMeta;
        twilio?: WcTwilio;
        phone_number_id?: string;
        access_token?: string;
        recipient_number?: string;
        use_smart_follow_up_template?: boolean;
      }
    | undefined;

  if (!wc?.enabled) {
    return { ok: false, error: 'Notifications WhatsApp désactivées dans les paramètres', status: 400 };
  }

  const channel = (settingsRow as { notification_preferences?: { channel?: string } }).notification_preferences?.channel ?? 'both';
  if (channel === 'email') {
    return { ok: false, error: 'Canal notifications limité à l’email', status: 400 };
  }

  const leadRes = await strapiJson<{ data?: Record<string, unknown>[] }>(
    `leads?filters[documentId][$eq]=${encodeURIComponent(leadDocumentId)}&populate[received_email][fields][0]=subject&populate[received_email][fields][1]=snippet&populate[received_email][fields][2]=from_name`,
    authHeader
  );
  if (!leadRes.ok) {
    return { ok: false, error: leadRes.err || 'Lead introuvable', status: leadRes.status };
  }
  const lead = leadRes.data?.data?.[0];
  if (!lead) {
    return { ok: false, error: 'Aucun lead pour ce documentId', status: 404 };
  }

  const provider = wc.provider === 'twilio' ? 'twilio' : 'meta';

  if (provider === 'twilio') {
    const res = await fetch(`${STRAPI_URL}/api/smart-follow-up/send-whatsapp-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        actionId: leadDocumentId,
        leadDocumentId,
        source: 'lead',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: (data as { error?: { message?: string } })?.error?.message || 'Erreur envoi Twilio (Strapi)',
        status: res.status,
        detail: data,
      };
    }
    return { ok: true, ...data };
  }

  const phoneNumberId = wc.meta?.phone_number_id ?? wc.phone_number_id;
  const accessToken = wc.meta?.access_token ?? wc.access_token;
  const recipient = wc.meta?.recipient_number ?? wc.recipient_number;
  if (!phoneNumberId || !accessToken || !recipient) {
    return {
      ok: false,
      error: 'Configuration Meta incomplète (phone_number_id, access_token, numéro destinataire)',
      status: 400,
    };
  }

  const to = normalizeWaTo(recipient);
  if (to.length < 8) {
    return { ok: false, error: 'Numéro destinataire WhatsApp invalide', status: 400 };
  }

  const useSfuTpl = wc.use_smart_follow_up_template === true;
  const tplVars = buildTemplateVarsForMeta(lead, leadSources);

  const paramCount = Math.min(
    6,
    Math.max(1, parseInt(process.env.WHATSAPP_META_SFU_BODY_PARAM_COUNT || '5', 10) || 5)
  );

  let templatePayload: Record<string, unknown>;

  if (!useSfuTpl) {
    templatePayload = {
      name: 'hello_world',
      language: { code: process.env.WHATSAPP_HELLO_WORLD_LANG || 'en_US' },
    };
  } else {
    const templateName = process.env.WHATSAPP_META_SFU_TEMPLATE_NAME || 'smart_follow_up_notification';
    const lang = process.env.WHATSAPP_META_SFU_TEMPLATE_LANG || 'en';

    const params: { type: string; text: string }[] =
      paramCount === 1
        ? [
            {
              type: 'text',
              text: `${tplVars.line1} · ${tplVars.name}\n${tplVars.title}\n${tplVars.signal}\n→ ${tplVars.actionUrl}`.slice(
                0,
                1024
              ),
            },
          ]
        : paramCount === 2
          ? [
              { type: 'text', text: `${tplVars.line1} · ${tplVars.name}`.slice(0, 500) },
              { type: 'text', text: `${tplVars.title} — ${tplVars.signal}`.slice(0, 500) },
            ]
          : paramCount === 3
            ? [
                { type: 'text', text: tplVars.name.slice(0, 400) },
                { type: 'text', text: tplVars.title.slice(0, 400) },
                { type: 'text', text: tplVars.signal.slice(0, 500) },
              ]
            : [
                { type: 'text', text: tplVars.line1.slice(0, 80) },
                { type: 'text', text: tplVars.name.slice(0, 400) },
                { type: 'text', text: tplVars.title === '—' ? 'N/A' : tplVars.title.slice(0, 400) },
                { type: 'text', text: tplVars.signal.slice(0, 500) },
                { type: 'text', text: tplVars.actionUrl.slice(0, 512) },
              ];

    templatePayload = {
      name: templateName,
      language: { code: lang },
      components: [
        {
          type: 'body',
          parameters: params,
        },
      ],
    };
  }

  const graphUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const graphRes = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: templatePayload,
    }),
  });

  const graphData = await graphRes.json().catch(() => ({}));
  if (!graphRes.ok) {
    console.error('[dispatch-lead-whatsapp-core] Meta Graph error', graphRes.status, graphData);
    const graphErr = (graphData as { error?: { message?: string } })?.error;
    return {
      ok: false,
      error: metaGraphUserFacingMessage(graphErr, graphRes.status),
      status: 502,
      detail: graphData,
    };
  }

  return { ok: true, messaging_product: 'whatsapp', graph: graphData };
}
