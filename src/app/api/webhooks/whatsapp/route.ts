/**
 * Webhook Meta WhatsApp — Validation (GET) et réception des messages (POST)
 *
 * URL à configurer dans Meta for Developers:
 * https://<votre-domaine>/api/webhooks/whatsapp
 *
 * Variables .env requises:
 * - WHATSAPP_WEBHOOK_VERIFY_TOKEN: token secret pour la validation Meta
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'ok' });
    }

    const message = messages[0];
    const fromNumber = message.from;
    const messageText = message.text?.body?.trim();

    if (!messageText) {
      return NextResponse.json({ status: 'ok' });
    }

    // Proxy vers Strapi pour traiter la réponse (1/2/3)
    try {
      const res = await fetch(`${STRAPI_URL}/api/whatsapp/process-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromNumber, reply: messageText }),
      });

      if (!res.ok) {
        console.error('[WhatsApp Webhook] Strapi process-reply error:', res.status, await res.text());
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Strapi unavailable:', err);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Erreur:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
