import { NextRequest, NextResponse } from 'next/server';
import { verifyStrapiUser } from '@/lib/strapi-verify-user';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function getGmailRedirectUri(request: NextRequest): string {
  return (
    process.env.GMAIL_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/api/auth/gmail/callback`
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Initie OAuth Gmail : nécessite Authorization Bearer (JWT Strapi).
 * Retourne { authUrl } pour redirection côté client (comme /api/calendar/google/auth).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const token = auth.slice('Bearer '.length).trim();
  const user = await verifyStrapiUser(token);
  if (!user?.id) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)' },
      { status: 500 }
    );
  }

  const redirectUri = getGmailRedirectUri(request);
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', String(user.id));

  return NextResponse.json({ authUrl: authUrl.toString() });
}
