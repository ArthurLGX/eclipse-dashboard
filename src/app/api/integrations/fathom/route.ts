import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

interface FathomConfig {
  webhook_secret: string;
  api_key: string;
  auto_join: boolean;
  include_transcript: boolean;
  include_summary: boolean;
  include_action_items: boolean;
}

/**
 * GET /api/integrations/fathom?userId=xxx
 * Récupère la configuration Fathom d'un utilisateur
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Headers avec authentification Strapi
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
    };

    // Chercher la config dans Strapi
    const response = await fetch(
      `${STRAPI_URL}/api/integration-configs?filters[user][id][$eq]=${userId}&filters[provider][$eq]=fathom`,
      { headers }
    );

    if (!response.ok) {
      // Si le content-type n'existe pas encore, retourner une config vide
      return NextResponse.json({
        config: null,
        connected: false,
      });
    }

    const data = await response.json();
    
    const rawEntry = data.data?.[0];

    if (!rawEntry) {
      // Retourner la réponse brute pour debug
      return NextResponse.json({
        config: null,
        connected: false,
        debug: { strapiResponse: data },
      });
    }


    // Gérer les deux structures Strapi (v4 avec attributes wrapper, v5 sans)
    const configEntry = rawEntry.attributes || rawEntry;

    // Extraire les valeurs de la config
    const config: FathomConfig = {
      webhook_secret: configEntry.webhook_secret || '',
      api_key: configEntry.api_key || '',
      auto_join: configEntry.auto_join ?? true,
      include_transcript: configEntry.include_transcript ?? true,
      include_summary: configEntry.include_summary ?? true,
      include_action_items: configEntry.include_action_items ?? true,
    };

    const connected = !!(config.webhook_secret && config.api_key);

    return NextResponse.json({
      config,
      connected,
      debug: { rawEntry, configEntry },
    });
  } catch (error) {
    console.error('Error fetching Fathom config:', error);
    // En cas d'erreur (content-type n'existe pas, etc.), retourner config vide
    return NextResponse.json({
      config: null,
      connected: false,
    });
  }
}

/**
 * POST /api/integrations/fathom
 * Sauvegarde la configuration Fathom d'un utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId, config } = body || {};

    if (!userId) {
      console.error('POST /api/integrations/fathom - userId missing. Body received:', body);
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Headers avec authentification Strapi
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
    };

    // Chercher si une config existe déjà
    const checkResponse = await fetch(
      `${STRAPI_URL}/api/integration-configs?filters[user][id][$eq]=${userId}&filters[provider][$eq]=fathom`,
      { headers }
    );

    let existingId = null;
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      existingId = checkData.data?.[0]?.documentId;
    } else {
      const checkError = await checkResponse.text();
      console.error('Check config failed:', checkResponse.status, checkError);
    }

    const configData = {
      data: {
        provider: 'fathom',
        user: userId,
        webhook_secret: config.webhook_secret,
        api_key: config.api_key,
        auto_join: config.auto_join,
        include_transcript: config.include_transcript,
        include_summary: config.include_summary,
        include_action_items: config.include_action_items,
      },
    };

    let response;
    if (existingId) {
      // Mettre à jour
      response = await fetch(`${STRAPI_URL}/api/integration-configs/${existingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(configData),
      });
    } else {
      // Créer
      response = await fetch(`${STRAPI_URL}/api/integration-configs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(configData),
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Strapi save error:', response.status, errorText);
      return NextResponse.json(
        { error: `Strapi error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Fathom config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

