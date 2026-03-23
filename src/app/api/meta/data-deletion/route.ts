/**
 * Meta Data Deletion Callback — requis pour les apps Meta (Facebook Login, etc.)
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Meta envoie un POST avec signed_request lorsque un utilisateur demande la suppression
 * de ses données depuis Paramètres Facebook → Applications et sites web.
 *
 * À configurer dans Meta for Developers → Paramètres de l'app → Data Deletion Request URL
 * URL: https://dashboard.eclipsestudiodev.fr/api/meta/data-deletion
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.eclipsestudiodev.fr';
const META_APP_SECRET = process.env.META_APP_SECRET;

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function parseSignedRequest(signedRequest: string): { user_id?: string } | null {
  if (!META_APP_SECRET) {
    console.warn('[meta-data-deletion] META_APP_SECRET not configured');
    return null;
  }

  try {
    const [encodedSig, payload] = signedRequest.split('.', 2);
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(base64UrlDecode(encodedSig), 'binary');
    const data = JSON.parse(base64UrlDecode(payload));
    const expectedSig = crypto
      .createHmac('sha256', META_APP_SECRET)
      .update(payload)
      .digest();

    if (!sig.equals(Buffer.from(expectedSig))) {
      console.warn('[meta-data-deletion] Invalid signature');
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string | null;

    if (!signedRequest) {
      return NextResponse.json(
        { error: 'signed_request manquant' },
        { status: 400 }
      );
    }

    const data = parseSignedRequest(signedRequest);
    const userId = data?.user_id;

    if (userId) {
      // TODO: Implémenter la suppression côté backend
      // - Trouver l'utilisateur Strapi lié à ce Facebook user_id (provider_metadata)
      // - Créer une demande de suppression ou supprimer directement
      console.info('[meta-data-deletion] User deletion requested for Facebook user_id:', userId);
    }

    // Réponse requise par Meta : url + confirmation_code
    const confirmationCode = `ECL-${Date.now().toString(36).toUpperCase()}`;
    const statusUrl = `${APP_URL}/delete-account?meta_deletion=1&code=${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('[meta-data-deletion]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
