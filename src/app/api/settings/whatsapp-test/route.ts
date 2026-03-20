import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { phone_number_id, access_token, recipient_number, notification_template } = body;

    if (!phone_number_id || !access_token || !recipient_number) {
      return NextResponse.json(
        { success: false, error: 'Champs manquants : phone_number_id, access_token, recipient_number' },
        { status: 400 }
      );
    }

    const res = await fetch(`${STRAPI_URL}/api/whatsapp-meta/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ phone_number_id, access_token, recipient_number, notification_template }),
    });

    const result = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Erreur serveur' },
        { status: res.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[WhatsApp Test] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du test de connexion' },
      { status: 500 }
    );
  }
}
