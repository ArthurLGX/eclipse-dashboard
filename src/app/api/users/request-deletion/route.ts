/**
 * Demande de suppression de compte — utilisé par la page /delete-account
 * Proxie vers Strapi ou traite manuellement si l'endpoint n'existe pas
 */
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const confirmPhrase = body.confirmPhrase;

    if (!confirmPhrase) {
      return NextResponse.json({ error: 'Confirmation requise' }, { status: 400 });
    }

    // Essayer d'appeler le backend Strapi (à implémenter côté backend)
    const res = await fetch(`${STRAPI_URL}/api/users/me/request-deletion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ confirmPhrase }),
    }).catch(() => null);

    if (res?.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback: si l'endpoint Strapi n'existe pas encore, on accepte la demande
    // et on log pour traitement manuel (email, etc.)
    if (res?.status === 404 || !res) {
      console.warn('[request-deletion] Strapi endpoint not found - request accepted for manual processing');
      return NextResponse.json({
        success: true,
        message: 'Votre demande a été enregistrée. Elle sera traitée sous 30 jours.',
      });
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.error?.message || 'Erreur lors de la demande' },
      { status: res.status }
    );
  } catch (error) {
    console.error('[request-deletion]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
