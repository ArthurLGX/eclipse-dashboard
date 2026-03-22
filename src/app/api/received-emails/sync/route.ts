/**
 * Proxy pour received-emails/sync - évite les erreurs CORS en production
 * Le front appelle cette route (same-origin), qui forward vers Strapi
 */

import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true' || url.searchParams.get('detailed') === '1';
    const syncUrl = `${STRAPI_URL}/api/received-emails/sync${detailed ? '?detailed=true' : ''}`;
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ data: {} }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        data?.error || { message: `Strapi error ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[received-emails/sync] Proxy error:', error);
    return NextResponse.json(
      { error: { message: 'Sync failed' } },
      { status: 500 }
    );
  }
}
