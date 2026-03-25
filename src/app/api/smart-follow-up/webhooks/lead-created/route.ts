/**
 * Webhook appelé par Strapi après création d’un lead (voir `eclipsestudiodev-backend` :
 * `src/api/lead/content-types/lead/lifecycles.ts`). Sécurisé par secret partagé + STRAPI_API_TOKEN côté Next.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runDispatchLeadWhatsApp } from '@/lib/dispatch-lead-whatsapp-core';

function parseUserId(body: Record<string, unknown>): number | null {
  const raw = body.userId ?? body.user_id ?? (body.user as { id?: number } | undefined)?.id;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.SFU_LEAD_WEBHOOK_SECRET;
    if (!expected?.trim()) {
      return NextResponse.json(
        { error: 'SFU_LEAD_WEBHOOK_SECRET non défini sur le serveur Next' },
        { status: 503 }
      );
    }

    const auth = request.headers.get('authorization');
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
    const headerSecret = request.headers.get('x-sfu-webhook-secret')?.trim();
    if (bearer !== expected && headerSecret !== expected) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const strapiToken = process.env.STRAPI_API_TOKEN;
    if (!strapiToken?.trim()) {
      return NextResponse.json(
        { error: 'STRAPI_API_TOKEN requis pour le webhook (lecture Strapi côté serveur)' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const leadRaw = body.leadDocumentId ?? body.lead_document_id ?? body.documentId;
    const leadDocumentId = typeof leadRaw === 'string' ? leadRaw.trim() : '';
    const userId = parseUserId(body);

    if (!leadDocumentId) {
      return NextResponse.json({ error: 'leadDocumentId requis' }, { status: 400 });
    }
    if (userId == null) {
      return NextResponse.json({ error: 'userId requis (propriétaire du lead)' }, { status: 400 });
    }

    const result = await runDispatchLeadWhatsApp({
      leadDocumentId,
      userId,
      strapiAuthHeader: `Bearer ${strapiToken}`,
    });

    if (!result.ok) {
      console.warn('[webhooks/lead-created]', result.error, result.status);
      return NextResponse.json(
        { ok: false, error: result.error, ...(result.detail !== undefined ? { detail: result.detail } : {}) },
        { status: result.status }
      );
    }

    const { ok: _o, ...rest } = result;
    return NextResponse.json({ ok: true, ...rest });
  } catch (error) {
    console.error('[webhooks/lead-created]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
