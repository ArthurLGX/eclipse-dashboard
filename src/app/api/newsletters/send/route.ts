import { NextRequest, NextResponse } from 'next/server';
import { sendNewsletter, isUserAdmin, checkSmtpConfig, SmtpConfigOptions } from '@/lib/email';

interface SendNewsletterRequest {
  recipients: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
  }>;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface StrapiUser {
  id: number;
  email: string;
  username?: string;
  role?: {
    name: string;
    type: string;
  };
}

interface StrapiSmtpConfig {
  id: number;
  documentId: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  smtp_from_name?: string;
  is_verified: boolean;
}

/**
 * Vérifie le token JWT en appelant Strapi
 * Retourne les informations de l'utilisateur si valide
 */
async function verifyToken(token: string): Promise<StrapiUser | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
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

/**
 * Récupère la configuration SMTP personnalisée de l'utilisateur
 */
async function getUserSmtpConfig(userId: number, token: string): Promise<StrapiSmtpConfig | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/smtp-configs?filters[user][$eq]=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data?.[0] || null;
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

    // 2. Récupérer la configuration SMTP personnalisée de l'utilisateur
    const userSmtpConfig = await getUserSmtpConfig(user.id, token);
    
    // Si pas de config personnalisée, vérifier la config par défaut
    if (!userSmtpConfig) {
      const smtpCheck = checkSmtpConfig();
      if (!smtpCheck.configured) {
        return NextResponse.json(
          { 
            error: 'Aucune configuration SMTP. Configurez votre SMTP dans les paramètres.',
            missing: smtpCheck.missing,
          },
          { status: 500 }
        );
      }
    }

    const body: SendNewsletterRequest = await request.json();
    const { recipients, subject, htmlContent, textContent } = body;

    // 3. Vérifier les autorisations (admin requis)
    // L'email est maintenant obtenu du token, pas du body (sécurisé)
    const adminEmail = process.env.ADMIN_EMAIL;
    const userRole = user.role?.type || user.role?.name || '';
    
    if (adminEmail && !isUserAdmin(user.email)) {
      // Si pas admin par email, vérifier le rôle
      if (userRole.toLowerCase() !== 'admin' && userRole.toLowerCase() !== 'authenticated') {
        return NextResponse.json(
          { error: 'Unauthorized: Admin access required' },
          { status: 403 }
        );
      }
    }

    // Valider les données
    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Subject and HTML content are required' },
        { status: 400 }
      );
    }

    // Extraire les emails des destinataires
    const emails = recipients
      .map(r => r.email)
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses provided' },
        { status: 400 }
      );
    }

    // Préparer la configuration SMTP (personnalisée ou par défaut)
    let smtpConfig: SmtpConfigOptions | undefined;
    if (userSmtpConfig) {
      smtpConfig = {
        smtp_host: userSmtpConfig.smtp_host,
        smtp_port: userSmtpConfig.smtp_port,
        smtp_user: userSmtpConfig.smtp_user,
        smtp_password: userSmtpConfig.smtp_password,
        smtp_secure: userSmtpConfig.smtp_secure,
        smtp_from_name: userSmtpConfig.smtp_from_name,
      };
    }

    // Envoyer la newsletter
    const result = await sendNewsletter({
      recipients: emails,
      subject,
      htmlContent,
      textContent,
      smtpConfig, // Passer la config personnalisée si disponible
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Newsletter sent successfully to ${result.sent} recipients`,
        sent: result.sent,
        failed: result.failed,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Newsletter partially sent: ${result.sent} succeeded, ${result.failed} failed`,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      }, { status: result.sent > 0 ? 207 : 500 }); // 207 Multi-Status si partiellement réussi
    }
  } catch (error) {
    console.error('Error in newsletter send API:', error);
    return NextResponse.json(
      { error: 'Internal server error while sending newsletter' },
      { status: 500 }
    );
  }
}

// Endpoint pour vérifier la configuration (protégé, admin uniquement)
export async function GET(request: NextRequest) {
  // Vérifier l'authentification
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Vérifier si admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const smtpCheck = checkSmtpConfig();
  
  return NextResponse.json({
    configured: smtpCheck.configured,
    // Ne pas exposer les détails des champs manquants en production
    missing: process.env.NODE_ENV === 'development' ? smtpCheck.missing : undefined,
    adminEmailConfigured: !!process.env.ADMIN_EMAIL,
  });
}

