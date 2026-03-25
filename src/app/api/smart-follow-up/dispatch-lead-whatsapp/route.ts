/**
 * Envoie une notification WhatsApp pour un lead (documentId) avec les **vraies données** du lead,
 * en lisant le lead + automation-settings sur Strapi puis en appelant Meta Graph (ou proxy Twilio Strapi).
 */
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

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

function leadDisplayName(lead: Record<string, unknown>): string {
  const n = lead.name;
  if (typeof n === 'string' && n.trim()) return n.trim();
  const pc = lead.proposed_content as { subject?: string } | undefined;
  if (pc?.subject && typeof pc.subject === 'string') return pc.subject.slice(0, 80);
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as { leadDocumentId?: string };
    const leadDocumentId = body.leadDocumentId?.trim();
    if (!leadDocumentId) {
      return NextResponse.json({ error: 'leadDocumentId requis' }, { status: 400 });
    }

    const me = await strapiJson<{ id?: number }>('users/me', authHeader);
    if (!me.ok || !me.data?.id) {
      return NextResponse.json({ error: me.err || 'Session invalide' }, { status: 401 });
    }
    const userId = me.data.id;

    const settingsRes = await strapiJson<{ data?: Array<{ whatsapp_config?: Record<string, unknown>; documentId?: string }> }>(
      `automation-settings?filters[user][id][$eq]=${userId}`,
      authHeader
    );
    if (!settingsRes.ok || !settingsRes.data?.data?.[0]) {
      return NextResponse.json({ error: 'Paramètres automation introuvables' }, { status: 400 });
    }

    const settingsRow = settingsRes.data.data[0];
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
      return NextResponse.json({ error: 'Notifications WhatsApp désactivées dans les paramètres' }, { status: 400 });
    }

    const leadRes = await strapiJson<{ data?: Record<string, unknown>[] }>(
      `leads?filters[documentId][$eq]=${encodeURIComponent(leadDocumentId)}&populate[received_email][fields][0]=subject&populate[received_email][fields][1]=snippet&populate[received_email][fields][2]=from_name`,
      authHeader
    );
    if (!leadRes.ok) {
      return NextResponse.json({ error: leadRes.err || 'Lead introuvable' }, { status: leadRes.status });
    }
    const lead = leadRes.data?.data?.[0];
    if (!lead) {
      return NextResponse.json({ error: 'Aucun lead pour ce documentId' }, { status: 404 });
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
        return NextResponse.json(
          { error: (data as { error?: { message?: string } })?.error?.message || 'Erreur envoi Twilio (Strapi)' },
          { status: res.status }
        );
      }
      return NextResponse.json({ ok: true, ...data });
    }

    const phoneNumberId = wc.meta?.phone_number_id ?? wc.phone_number_id;
    const accessToken = wc.meta?.access_token ?? wc.access_token;
    const recipient = wc.meta?.recipient_number ?? wc.recipient_number;
    if (!phoneNumberId || !accessToken || !recipient) {
      return NextResponse.json(
        { error: 'Configuration Meta incomplète (phone_number_id, access_token, numéro destinataire)' },
        { status: 400 }
      );
    }

    const to = normalizeWaTo(recipient);
    if (to.length < 8) {
      return NextResponse.json({ error: 'Numéro destinataire WhatsApp invalide' }, { status: 400 });
    }

    const useSfuTpl = wc.use_smart_follow_up_template === true;
    const name = leadDisplayName(lead);
    const title = leadTitle(lead);
    const signal = leadSignal(lead);

    const paramCount = Math.min(
      6,
      Math.max(1, parseInt(process.env.WHATSAPP_META_SFU_BODY_PARAM_COUNT || '3', 10) || 3)
    );

    let templatePayload: Record<string, unknown>;

    if (!useSfuTpl) {
      templatePayload = {
        name: 'hello_world',
        language: { code: process.env.WHATSAPP_HELLO_WORLD_LANG || 'en_US' },
      };
    } else {
      const templateName = process.env.WHATSAPP_META_SFU_TEMPLATE_NAME || 'smart_follow_up_notification';
      const lang = process.env.WHATSAPP_META_SFU_TEMPLATE_LANG || 'fr';

      const params: { type: string; text: string }[] =
        paramCount === 1
          ? [{ type: 'text', text: `🔔 ${name}\n${title}\n${signal}`.slice(0, 1024) }]
          : paramCount === 2
            ? [
                { type: 'text', text: name.slice(0, 500) },
                { type: 'text', text: `${title} — ${signal}`.slice(0, 500) },
              ]
            : [
                { type: 'text', text: name.slice(0, 400) },
                { type: 'text', text: title.slice(0, 400) },
                { type: 'text', text: signal.slice(0, 500) },
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
      console.error('[dispatch-lead-whatsapp] Meta Graph error', graphRes.status, graphData);
      return NextResponse.json(
        {
          error:
            (graphData as { error?: { message?: string } })?.error?.message ||
            `Meta API ${graphRes.status} — vérifiez le nom du template et le nombre de variables dans Meta Business.`,
          detail: graphData,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, messaging_product: 'whatsapp', graph: graphData });
  } catch (error) {
    console.error('[dispatch-lead-whatsapp]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
