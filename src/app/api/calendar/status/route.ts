import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    // Fetch calendar connections from Strapi
    const response = await fetch(
      `${STRAPI_URL}/api/calendar-connections?filters[user_id][$eq]=${userId}`,
      {
        headers: {
          ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
        },
      }
    );

    if (!response.ok) {
      // If the endpoint doesn't exist yet, return empty status
      return NextResponse.json({
        google: { connected: false },
        outlook: { connected: false },
        caldav: { connected: false },
      });
    }

    const data = await response.json();
    const connections = data.data || [];

    // Build status object
    const status: Record<string, { connected: boolean; email?: string; lastSync?: string }> = {
      google: { connected: false },
      outlook: { connected: false },
      caldav: { connected: false },
    };

    for (const conn of connections) {
      const provider = conn.provider || conn.attributes?.provider;
      if (provider && status[provider]) {
        status[provider] = {
          connected: true,
          email: conn.email || conn.attributes?.email,
          lastSync: conn.last_sync || conn.attributes?.last_sync,
        };
      }
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Calendar status error:', error);
    return NextResponse.json({
      google: { connected: false },
      outlook: { connected: false },
      caldav: { connected: false },
    });
  }
}

