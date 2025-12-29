import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route pour récupérer le favicon d'un site web (proxy pour éviter CORS)
 * Usage: GET /api/favicon?domain=example.com&size=128
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const domain = searchParams.get('domain');
  const size = searchParams.get('size') || '128';

  if (!domain) {
    return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
  }

  try {
    // Récupérer le favicon depuis Google
    const faviconUrl = `https://www.google.com/s2/favicons?sz=${size}&domain_url=${domain}`;
    
    const response = await fetch(faviconUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch favicon: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache 24h
      },
    });
  } catch (error) {
    console.error('Favicon proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch favicon' }, { status: 500 });
  }
}

