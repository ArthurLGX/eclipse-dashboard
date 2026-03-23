/**
 * Webhook Meta WhatsApp — Validation (GET) et réception des messages (POST)
 *
 * URL à configurer dans Meta for Developers:
 * https://<votre-domaine>/api/webhooks/whatsapp
 *
 * Variables .env requises:
 * - WHATSAPP_WEBHOOK_VERIFY_TOKEN: token secret pour la validation Meta
 *
 * Routage:
 * - Message 1/2/3 depuis le numéro configuré (recipient) → commande bidirectionnelle (process-reply)
 * - Autres messages → prospect entrant → incoming-prospect (création lead)
 */
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

const WHATSAPP_RECIPIENT_NUMBER = process.env.WHATSAPP_RECIPIENT_NUMBER;

/** Récupère le numéro recipient (user) pour détecter les commandes 1/2/3 */
async function getRecipientNumber(): Promise<string | null> {
  if (WHATSAPP_RECIPIENT_NUMBER) {
    return WHATSAPP_RECIPIENT_NUMBER.replace(/\D/g, '');
  }
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/automation-settings?populate=whatsapp_config&filters[whatsapp_config][enabled][$eq]=true`,
      { next: { revalidate: 0 } }
    );
    const data = await res.json();
    const settings = Array.isArray(data?.data) ? data.data[0] : data?.data;
    const recipient = settings?.whatsapp_config?.meta?.recipient_number || settings?.whatsapp_config?.recipient_number;
    if (recipient) return recipient.replace(/\D/g, '');
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    const contacts = value?.contacts;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'ok' });
    }

    const message = messages[0];
    const fromNumber = message.from;
    const messageText = (message.text?.body ?? '').trim();
    // Pour images/vocaux/etc. : créer le lead avec [Media reçu]
    const displayText = messageText || '[Media reçu]';
    const profileName = contacts?.[0]?.profile?.name ?? null;

    // ── ROUTAGE : commande 1/2/3 vs prospect entrant ──
    const myNumber = await getRecipientNumber();
    const isCommand =
      ['1', '2', '3'].includes(messageText) &&
      myNumber &&
      fromNumber === myNumber;

    if (isCommand) {
      // → Commande dashboard (bidirectionnel existant)
      try {
        const res = await fetch(`${STRAPI_URL}/api/whatsapp/process-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromNumber, reply: messageText }),
        });
        if (!res.ok) {
          console.error('[WhatsApp Webhook] process-reply error:', res.status, await res.text());
        }
      } catch (err) {
        console.error('[WhatsApp Webhook] Strapi unavailable:', err);
      }
    } else {
      // → Message prospect entrant → créer un lead
      try {
        const res = await fetch(`${STRAPI_URL}/api/whatsapp/incoming-prospect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromNumber,
            messageText: displayText,
            profileName,
            rawMessage: {
              id: message.id,
              type: message.type || 'text',
              timestamp: message.timestamp,
            },
          }),
        });
        if (!res.ok) {
          console.error('[WhatsApp Webhook] incoming-prospect error:', res.status, await res.text());
        }
      } catch (err) {
        console.error('[WhatsApp Webhook] incoming-prospect Strapi unavailable:', err);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Erreur:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
