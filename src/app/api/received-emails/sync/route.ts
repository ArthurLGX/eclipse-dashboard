/**
 * Proxy pour received-emails/sync - évite les erreurs CORS en production
 * Le front appelle cette route (same-origin), qui forward vers Strapi
 */

import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${STRAPI_URL}/api/received-emails/sync`, {
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
