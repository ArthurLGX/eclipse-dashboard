import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

// Helper to convert snake_case to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

/**
 * GET - Charger un portfolio public par son slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const response = await fetch(`${API_URL}/api/portfolio-settings/public/${slug}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Portfolio non trouvé' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: response.status });
    }

    const data = await response.json();
    
    // Convert snake_case to camelCase for frontend
    const settings = data.settings ? toCamelCase(data.settings) : null;
    const projects = data.projects?.map((p: Record<string, unknown>) => {
      const converted = toCamelCase(p);
      
      // Build media array from media_urls (JSON field) or gallery
      const mediaUrls = p.media_urls as string[] | null;
      const gallery = p.gallery as Array<{ url: string }> | null;
      const image = p.image as { url: string } | null;
      
      const media: Array<{ id: string; type: string; url: string }> = [];
      
      // Priority: media_urls > gallery > image
      if (mediaUrls && mediaUrls.length > 0) {
        mediaUrls.forEach((url, idx) => {
          media.push({
            id: `media-${idx}`,
            type: 'image',
            url: url.startsWith('http') ? url : `${API_URL}${url}`,
          });
        });
      } else {
        if (image?.url) {
          media.push({
            id: 'cover',
            type: 'image',
            url: image.url.startsWith('http') ? image.url : `${API_URL}${image.url}`,
          });
        }
        if (gallery) {
          gallery.forEach((img, idx) => {
            if (img.url && !media.some(m => m.url.includes(img.url))) {
              media.push({
                id: `gallery-${idx}`,
                type: 'image',
                url: img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`,
              });
            }
          });
        }
      }
      
      return {
        ...converted,
        media,
        coverIndex: p.cover_index || 0,
      };
    }) || [];

    return NextResponse.json({ settings, projects });
  } catch (error) {
    console.error('Public portfolio GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

