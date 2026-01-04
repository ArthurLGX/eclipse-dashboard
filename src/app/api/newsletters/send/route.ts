import { NextRequest, NextResponse } from 'next/server';

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

    // 4. Appeler l'API Strapi pour envoyer la newsletter
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    const response = await fetch(`${strapiUrl}/api/smtp-configs/send-newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipients,
        subject,
        htmlContent,
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

    // 5. Retourner le résultat
    return NextResponse.json({
      success: data.success,
      sent: data.sent,
      failed: data.failed,
      errors: data.errors,
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
