/**
 * API pour gérer les clés API IA de l'utilisateur
 * Les clés sont stockées dans un JSON chiffré (extensible : openai, anthropic, future providers)
 *
 * Schéma Strapi - Collection "user-ai-keys" :
 * - user (relation, User, many-to-one, required)
 * - api_keys_encrypted (JSON) : { "openai": "iv:tag:encrypted", "anthropic": "...", ... }
 */
import { NextRequest, NextResponse } from 'next/server';
import { encryptData } from '@/lib/encryption';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

async function getUserIdFromToken(token: string): Promise<number | null> {
  const res = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user.id;
}

/**
 * GET /api/ai-keys - Vérifie si l'utilisateur a des clés configurées (jamais retourner les clés)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const res = await fetch(
      `${STRAPI_URL}/api/user-ai-keys?filters[user][id][$eq]=${userId}`,
      { headers: { Authorization: authHeader } }
    );

    if (!res.ok) {
      return NextResponse.json({ hasOpenAI: false, hasAnthropic: false });
    }

    const data = await res.json();
    const record = data.data?.[0];
    const keysMap = record?.api_keys_encrypted as Record<string, string> | undefined;

    return NextResponse.json({
      hasOpenAI: !!keysMap?.openai,
      hasAnthropic: !!keysMap?.anthropic,
    });
  } catch (error) {
    console.error('Error fetching AI keys status:', error);
    return NextResponse.json({ hasOpenAI: false, hasAnthropic: false });
  }
}

/**
 * POST /api/ai-keys - Enregistre ou met à jour les clés API (chiffrées)
 * Body: { openaiApiKey?: string, anthropicApiKey?: string, [provider: string]: string }
 * Extensible : ajoutez d'autres clés (ex: googleApiKey, mistralApiKey)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();

    // Récupérer l'existant pour merge
    const existingRes = await fetch(
      `${STRAPI_URL}/api/user-ai-keys?filters[user][id][$eq]=${userId}`,
      { headers: { Authorization: authHeader } }
    );
    const existingData = await existingRes.json();
    const existing = existingData.data?.[0];
    const existingKeys = (existing?.api_keys_encrypted as Record<string, string>) || {};

    // Mapping des noms de clés body -> clé JSON
    const keyMapping: Record<string, string> = {
      openaiApiKey: 'openai',
      anthropicApiKey: 'anthropic',
    };

    const newKeysMap = { ...existingKeys };

    for (const [bodyKey, jsonKey] of Object.entries(keyMapping)) {
      if (bodyKey in body) {
        const val = body[bodyKey];
        if (typeof val === 'string' && val.trim()) {
          newKeysMap[jsonKey] = encryptData(val.trim());
        } else {
          delete newKeysMap[jsonKey];
        }
      }
    }

    // Support clés custom (ex: body.googleApiKey -> json "google")
    for (const [bodyKey, val] of Object.entries(body)) {
      if (bodyKey.endsWith('ApiKey') && typeof val === 'string' && val.trim() && !keyMapping[bodyKey]) {
        const jsonKey = bodyKey.replace(/ApiKey$/, '').toLowerCase();
        newKeysMap[jsonKey] = encryptData(val.trim());
      }
    }

    const encryptedData: Record<string, unknown> = {
      user: { connect: [{ id: userId }] },
      api_keys_encrypted: newKeysMap,
    };

    let response: Response;
    if (existing) {
      response = await fetch(`${STRAPI_URL}/api/user-ai-keys/${existing.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ data: encryptedData }),
      });
    } else {
      response = await fetch(`${STRAPI_URL}/api/user-ai-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ data: encryptedData }),
      });
    }

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error?.message || 'Erreur lors de la sauvegarde' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      hasOpenAI: !!newKeysMap.openai,
      hasAnthropic: !!newKeysMap.anthropic,
    });
  } catch (error) {
    console.error('Error saving AI keys:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
