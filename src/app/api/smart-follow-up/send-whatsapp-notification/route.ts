/**
 * Envoie une notification WhatsApp pour un lead spécifique (depuis LeadDetailModal)
 */
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const actionId =
      body.actionId ||
      body.action_id ||
      body.leadDocumentId ||
      body.lead_document_id;
    if (!actionId) {
      return NextResponse.json({ error: 'actionId ou leadDocumentId requis' }, { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/smart-follow-up/send-whatsapp-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        actionId,
        leadDocumentId: actionId,
        source: 'lead',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Erreur envoi notification' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[send-whatsapp-notification]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
