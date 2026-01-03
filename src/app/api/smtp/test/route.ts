import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
    const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure } = body;

    if (!smtp_host || !smtp_port || !smtp_user || !smtp_password) {
      return NextResponse.json(
        { success: false, message: 'Configuration incomplète' },
        { status: 400 }
      );
    }

    // Créer le transporteur avec la configuration fournie
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_secure, // true pour 465, false pour autres ports
      auth: {
        user: smtp_user,
        pass: smtp_password,
      },
      // Timeout de 10 secondes
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Vérifier la connexion
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: 'Connexion SMTP réussie ! Votre configuration est valide.',
    });

  } catch (error) {
    console.error('SMTP test error:', error);
    
    let message = 'Erreur de connexion SMTP';
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        message = 'Connexion refusée. Vérifiez l\'hôte et le port.';
      } else if (error.message.includes('ENOTFOUND')) {
        message = 'Serveur SMTP introuvable. Vérifiez l\'adresse.';
      } else if (error.message.includes('auth') || error.message.includes('AUTH')) {
        message = 'Échec d\'authentification. Vérifiez l\'email et le mot de passe.';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        message = 'Délai d\'attente dépassé. Le serveur ne répond pas.';
      } else if (error.message.includes('self signed') || error.message.includes('certificate')) {
        message = 'Problème de certificat SSL. Essayez de désactiver la sécurité.';
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

