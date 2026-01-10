import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

// Helper to convert camelCase to snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

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
 * GET - Charger les settings et projets du portfolio de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/portfolio-settings/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Strapi error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: response.status });
    }

    const data = await response.json();
    
    // Convert snake_case to camelCase for frontend
    const settings = data.settings ? toCamelCase(data.settings) : null;
    const projects = data.projects?.map((p: Record<string, unknown>) => ({
      ...toCamelCase(p),
      media: p.gallery ? (p.gallery as Array<{ url: string }>).map((img, idx) => ({
        id: `media-${idx}`,
        type: 'image',
        url: (img.url as string).startsWith('http') ? img.url : `${API_URL}${img.url}`,
      })) : [],
      coverIndex: 0,
    })) || [];

    return NextResponse.json({ settings, projects });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT - Sauvegarder les settings et projets du portfolio
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    
    // Convert camelCase to snake_case for Strapi
    const settings = body.settings ? toSnakeCase(body.settings) : null;
    const projects = body.projects?.map((p: Record<string, unknown>) => toSnakeCase(p)) || [];

    const response = await fetch(`${API_URL}/api/portfolio-settings/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ settings, projects }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Strapi error:', error);
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: response.status });
    }

    const data = await response.json();
    
    // Convert back to camelCase
    const updatedSettings = data.settings ? toCamelCase(data.settings) : null;
    const updatedProjects = data.projects?.map((p: Record<string, unknown>) => toCamelCase(p)) || [];

    return NextResponse.json({ settings: updatedSettings, projects: updatedProjects });
  } catch (error) {
    console.error('Portfolio PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

