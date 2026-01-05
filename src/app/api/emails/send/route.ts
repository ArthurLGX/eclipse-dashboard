import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface AttachmentData {
  filename: string;
  path: string;
}

interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  attachments?: AttachmentData[];
  trackingId?: string; // Optional: if not provided, will be generated
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
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userToken = authHeader.substring(7);

    // Get request body
    const body: EmailRequest = await request.json();
    const { to, subject, html, attachments, trackingId: providedTrackingId } = body;

    // Validate required fields
    if (!to || to.length === 0) {
      return NextResponse.json(
        { error: 'Recipients are required' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!html) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      );
    }

    // Générer ou utiliser le tracking ID fourni
    const trackingId = providedTrackingId || randomUUID();
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    
    // Injecter le pixel de tracking et wrapper les liens
    let trackedHtml = injectTrackingPixel(html, trackingId, strapiUrl);
    trackedHtml = wrapLinksForTracking(trackedHtml, trackingId, strapiUrl);

    // Appeler l'API Strapi pour envoyer l'email
    const response = await fetch(`${strapiUrl}/api/smtp-configs/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        to,
        subject,
        html: trackedHtml,
        attachments,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || data.message || 'Failed to send email' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data.messageId,
      trackingId, // Retourner le tracking ID pour l'enregistrement
    });

  } catch (error) {
    console.error('Error sending email:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Failed to send email: ${errorMessage}` },
      { status: 500 }
    );
  }
}
