import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface Recipient {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface SendNewsletterRequest {
  recipients: Recipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  trackingId?: string;
}

interface StrapiUser {
  id: number;
  email: string;
  username?: string;
}

/**
 * Vérifie le token JWT en appelant Strapi
 */
async function verifyToken(token: string): Promise<StrapiUser | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

// Injecte le pixel de tracking dans le HTML de l'email
function injectTrackingPixel(html: string, trackingId: string, strapiUrl: string): string {
  // Pixel transparent 1x1 avec styles multiples pour assurer l'invisibilité dans tous les clients email
  const trackingPixel = `<img src="${strapiUrl}/api/track/open/${trackingId}" width="1" height="1" border="0" style="height:1px!important;width:1px!important;border-width:0!important;margin:0!important;padding:0!important;opacity:0;visibility:hidden;position:absolute;left:-9999px;" alt="" />`;
  
  // Injecter avant </body> si présent, sinon à la fin
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`);
  }
  return html + trackingPixel;
}

// Enveloppe les liens pour le tracking des clics
function wrapLinksForTracking(html: string, trackingId: string, strapiUrl: string): string {
  // Regex pour trouver les liens href="..." en évitant les liens de tracking et unsubscribe
  const linkRegex = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;
  
  return html.replace(linkRegex, (match, prefix, url, suffix) => {
    // Ne pas wrapper les liens de tracking, mailto, tel, ou # (ancres)
    if (
      url.startsWith('#') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.includes('/track/') ||
      url.includes('unsubscribe')
    ) {
      return match;
    }
    
    const encodedUrl = encodeURIComponent(url);
    const trackingUrl = `${strapiUrl}/api/track/click/${trackingId}?url=${encodedUrl}`;
    return `<a ${prefix}${trackingUrl}${suffix}>`;
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification via le token JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // 2. Parser le body de la requête
    const body: SendNewsletterRequest = await request.json();
    const { recipients, subject, htmlContent, textContent } = body;

    // 3. Valider les données
    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!subject || subject.trim() === '') {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!htmlContent || htmlContent.trim() === '') {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    // 4. Générer le tracking ID et injecter le pixel
    const trackingId = body.trackingId || randomUUID();
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    
    // Injecter le pixel de tracking et wrapper les liens
    let trackedHtmlContent = injectTrackingPixel(htmlContent, trackingId, strapiUrl);
    trackedHtmlContent = wrapLinksForTracking(trackedHtmlContent, trackingId, strapiUrl);
    
    // 5. Appeler l'API Strapi pour envoyer la newsletter
    const response = await fetch(`${strapiUrl}/api/smtp-configs/send-newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipients,
        subject,
        htmlContent: trackedHtmlContent,
        textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || data.message || 'Failed to send newsletter';
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // 6. Retourner le résultat avec le tracking ID
    return NextResponse.json({
      success: data.success,
      sent: data.sent,
      failed: data.failed,
      errors: data.errors,
      trackingId,
    });

  } catch (error) {
    console.error('Newsletter send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to send newsletter: ${errorMessage}` },
      { status: 500 }
    );
  }
}
