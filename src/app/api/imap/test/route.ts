import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imap_host, imap_port, imap_user, imap_password, imap_secure } = body;

    if (!imap_host || !imap_port || !imap_user || !imap_password) {
      return NextResponse.json(
        { success: false, message: 'Configuration IMAP incomplète' },
        { status: 400 }
      );
    }

    // Test IMAP connection
    const result = await testImapConnection({
      host: imap_host,
      port: imap_port,
      user: imap_user,
      password: imap_password,
      tls: imap_secure !== false,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Connexion IMAP réussie ! La détection des réponses est configurée.',
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('IMAP test error:', error);
    
    let message = 'Erreur de connexion IMAP';
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        message = 'Connexion refusée. Vérifiez l\'hôte et le port IMAP.';
      } else if (error.message.includes('ENOTFOUND')) {
        message = 'Serveur IMAP introuvable. Vérifiez l\'adresse.';
      } else if (error.message.includes('auth') || error.message.includes('AUTH') || error.message.includes('Invalid credentials')) {
        message = 'Échec d\'authentification. Vérifiez l\'email et le mot de passe.';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        message = 'Délai d\'attente dépassé. Le serveur ne répond pas.';
      } else if (error.message.includes('self signed') || error.message.includes('certificate')) {
        message = 'Problème de certificat SSL. Essayez de modifier les paramètres de sécurité.';
      } else {
        message = error.message;
      }
    }

    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

function testImapConnection(config: ImapConfig): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    });

    const timeout = setTimeout(() => {
      imap.destroy();
      resolve({ success: false, message: 'Timeout de connexion IMAP' });
    }, 15000);

    imap.once('ready', () => {
      clearTimeout(timeout);
      // Try to open INBOX to verify full access
      imap.openBox('INBOX', true, (err) => {
        imap.end();
        if (err) {
          resolve({ success: false, message: `Impossible d'accéder à la boîte de réception: ${err.message}` });
        } else {
          resolve({ success: true, message: 'Connexion IMAP réussie' });
        }
      });
    });

    imap.once('error', (err: Error) => {
      clearTimeout(timeout);
      resolve({ success: false, message: `Erreur IMAP: ${err.message}` });
    });

    imap.connect();
  });
}

