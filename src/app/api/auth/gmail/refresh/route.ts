import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Rafraîchit l'access_token Gmail. Peut être protégé par GMAIL_REFRESH_SECRET (header x-gmail-refresh-secret).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.GMAIL_REFRESH_SECRET;
  if (secret) {
    const h = request.headers.get('x-gmail-refresh-secret');
    if (h !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: { refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const refreshToken = body.refreshToken;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 400 });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();

  if (!data.access_token) {
    return NextResponse.json({ error: 'Refresh failed', details: data }, { status: 401 });
  }

  const expiresIn = data.expires_in ?? 3600;
  return NextResponse.json({
    access_token: data.access_token,
    expires_in: expiresIn,
    expiry: Date.now() + expiresIn * 1000,
  });
}
