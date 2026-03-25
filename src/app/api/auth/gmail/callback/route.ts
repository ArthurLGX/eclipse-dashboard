import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function getAppBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function getGmailRedirectUri(request: NextRequest): string {
  return (
    process.env.GMAIL_REDIRECT_URI ||
    `${getAppBaseUrl(request)}/api/auth/gmail/callback`
  );
}

function redirectWithGmail(
  request: NextRequest,
  status: 'connected' | 'error',
  email?: string,
  returnToSettings?: boolean,
  errorCode?: string | null
): NextResponse {
  const base = getAppBaseUrl(request);
  const path = returnToSettings
    ? '/dashboard/smart-follow-up/settings'
    : '/dashboard/smart-follow-up';
  const u = new URL(`${base}${path}`);
  if (!returnToSettings) {
    u.searchParams.set('step', '4');
  }
  u.searchParams.set('gmail', status);
  if (status === 'connected' && email) {
    u.searchParams.set('email', email);
  }
  if (status === 'error' && errorCode) {
    u.searchParams.set('gmail_err', errorCode);
  }
  return NextResponse.redirect(u);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const stateParts = state?.split(':') ?? [];
  const userIdFromState = parseInt(stateParts[0] ?? '', 10);
  const returnToSettings = stateParts[1] === 'settings';

  if (error || !code) {
    console.error('[Gmail OAuth] Erreur ou refus:', error);
    return redirectWithGmail(request, 'error', undefined, returnToSettings);
  }

  if (
    !state ||
    !Number.isFinite(userIdFromState) ||
    userIdFromState < 1
  ) {
    console.error('[Gmail OAuth] state invalide');
    return redirectWithGmail(request, 'error', undefined, returnToSettings);
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[Gmail OAuth] credentials manquants');
    return redirectWithGmail(request, 'error', undefined, returnToSettings);
  }

  const userId = userIdFromState;
  const redirectUri = getGmailRedirectUri(request);

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('[Gmail OAuth] Pas d\'access_token');
      return redirectWithGmail(request, 'error', undefined, returnToSettings, 'token_exchange_failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};
    const profileEmail = typeof profile.email === 'string' ? profile.email : '';

    const listUrl = `${STRAPI_URL}/api/automation-settings?filters[user][id][$eq]=${userId}`;
    const listHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
    };

    const settingsRes = await fetch(listUrl, { headers: listHeaders });
    if (!settingsRes.ok) {
      console.error('[Gmail OAuth] lecture automation-settings:', await settingsRes.text());
      return redirectWithGmail(request, 'error', undefined, returnToSettings);
    }

    const settingsData = await settingsRes.json();
    const row = settingsData.data?.[0];
    if (!row) {
      console.error('[Gmail OAuth] aucun automation-setting pour user', userId);
      return redirectWithGmail(request, 'error', undefined, returnToSettings);
    }

    const documentId = row.documentId ?? row.id;
    const existingGmail = row.gmail_config;
    const mergedRefresh =
      tokens.refresh_token ?? existingGmail?.refresh_token ?? null;

    const gmail_config = {
      connected: true,
      email: profileEmail,
      access_token: tokens.access_token,
      refresh_token: mergedRefresh,
      token_expiry: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      connected_at: new Date().toISOString(),
    };

    const putUrl = `${STRAPI_URL}/api/automation-settings/${documentId}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: listHeaders,
      body: JSON.stringify({
        data: {
          gmail_config,
          gmail_configured: true,
        },
      }),
    });

    if (!putRes.ok) {
      console.error('[Gmail OAuth] PUT automation-settings:', await putRes.text());
      return redirectWithGmail(request, 'error', undefined, returnToSettings, 'strapi_save_failed');
    }

    return redirectWithGmail(
      request,
      'connected',
      profileEmail,
      returnToSettings
    );
  } catch (err) {
    console.error('[Gmail OAuth] callback:', err);
    return redirectWithGmail(request, 'error', undefined, returnToSettings, 'server_error');
  }
}
