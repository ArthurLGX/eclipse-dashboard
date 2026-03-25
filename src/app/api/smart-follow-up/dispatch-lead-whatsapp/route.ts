/**
 * Envoie une notification WhatsApp pour un lead (documentId) avec les **vraies données** du lead,
 * en lisant le lead + automation-settings sur Strapi puis en appelant Meta Graph (ou proxy Twilio Strapi).
 */
import { NextRequest, NextResponse } from 'next/server';
import { runDispatchLeadWhatsApp } from '@/lib/dispatch-lead-whatsapp-core';

async function strapiJson<T>(path: string, authHeader: string): Promise<{ ok: boolean; data?: T; status: number; err?: string }> {
  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
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

    const result = await runDispatchLeadWhatsApp({
      leadDocumentId,
      userId,
      strapiAuthHeader: authHeader,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.detail !== undefined ? { detail: result.detail } : {}) },
        { status: result.status }
      );
    }

    const { ok: _o, ...rest } = result;
    return NextResponse.json(rest);
  } catch (error) {
    console.error('[dispatch-lead-whatsapp]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
