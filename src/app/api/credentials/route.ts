import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Chiffre les données sensibles côté serveur
 */
function encryptData(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'eclipse-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Déchiffre les données sensibles côté serveur
 * @note Cette fonction est préparée pour une utilisation future (ex: tester connexion SSH)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function decryptData(ciphertext: string): string {
  const [ivBase64, authTagBase64, encrypted] = ciphertext.split(':');
  
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'eclipse-salt', 32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * POST /api/credentials - Créer ou mettre à jour des credentials
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { monitored_site_id, ssh_user, ssh_password, ssh_private_key, ssh_port, auth_method } = body;

    if (!monitored_site_id || !ssh_user || !auth_method) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Chiffrer les données sensibles
    const encryptedData: Record<string, unknown> = {
      ssh_user,
      ssh_port: ssh_port || 22,
      auth_method,
      monitored_site: monitored_site_id,
    };

    if (auth_method === 'password' && ssh_password) {
      encryptedData.ssh_password_encrypted = encryptData(ssh_password);
    }

    if (auth_method === 'key' && ssh_private_key) {
      encryptedData.ssh_private_key_encrypted = encryptData(ssh_private_key);
    }

    // Vérifier si des credentials existent déjà pour ce site
    const existingResponse = await fetch(
      `${STRAPI_URL}/api/server-credentials?filters[monitored_site][documentId][$eq]=${monitored_site_id}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    const existingData = await existingResponse.json();
    
    let response;
    if (existingData.data && existingData.data.length > 0) {
      // Mettre à jour
      const credentialId = existingData.data[0].documentId;
      response = await fetch(`${STRAPI_URL}/api/server-credentials/${credentialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ data: encryptedData }),
      });
    } else {
      // Créer
      response = await fetch(`${STRAPI_URL}/api/server-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ data: encryptedData }),
      });
    }

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.error?.message || 'Erreur Strapi' }, { status: response.status });
    }

    // Mettre à jour has_credentials sur le monitored_site
    await fetch(`${STRAPI_URL}/api/monitored-sites/${monitored_site_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ data: { has_credentials: true } }),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Credentials sauvegardés',
      // Ne jamais retourner les données chiffrées !
      data: {
        ssh_user,
        ssh_port: ssh_port || 22,
        auth_method,
        has_password: !!ssh_password,
        has_key: !!ssh_private_key,
      }
    });

  } catch (error) {
    console.error('Erreur credentials:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * GET /api/credentials?site_id=xxx - Récupérer les credentials (métadonnées uniquement)
 * Les mots de passe et clés ne sont JAMAIS retournés
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');

    if (!siteId) {
      return NextResponse.json({ error: 'site_id requis' }, { status: 400 });
    }

    const response = await fetch(
      `${STRAPI_URL}/api/server-credentials?filters[monitored_site][documentId][$eq]=${siteId}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const credential = data.data[0];

    // Retourner uniquement les métadonnées, JAMAIS les secrets
    return NextResponse.json({
      exists: true,
      data: {
        ssh_user: credential.ssh_user,
        ssh_port: credential.ssh_port,
        auth_method: credential.auth_method,
        has_password: !!credential.ssh_password_encrypted,
        has_key: !!credential.ssh_private_key_encrypted,
      }
    });

  } catch (error) {
    console.error('Erreur récupération credentials:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/credentials?site_id=xxx - Supprimer les credentials
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');

    if (!siteId) {
      return NextResponse.json({ error: 'site_id requis' }, { status: 400 });
    }

    // Trouver les credentials
    const findResponse = await fetch(
      `${STRAPI_URL}/api/server-credentials?filters[monitored_site][documentId][$eq]=${siteId}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    const findData = await findResponse.json();

    if (!findData.data || findData.data.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun credential à supprimer' });
    }

    const credentialId = findData.data[0].documentId;

    // Supprimer
    await fetch(`${STRAPI_URL}/api/server-credentials/${credentialId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    });

    // Mettre à jour has_credentials sur le monitored_site
    await fetch(`${STRAPI_URL}/api/monitored-sites/${siteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ data: { has_credentials: false } }),
    });

    return NextResponse.json({ success: true, message: 'Credentials supprimés' });

  } catch (error) {
    console.error('Erreur suppression credentials:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

