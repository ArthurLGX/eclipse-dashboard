/**
 * Endpoint daily digest — récupère le digest du jour depuis Strapi
 * Si non généré (avant 7h), Strapi peut le générer à la demande
 */
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Récupérer l'utilisateur connecté via Strapi /users/me
    const meRes = await fetch(`${STRAPI_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const user = await meRes.json();

    // Chercher le digest en base (collection daily-digest)
    const digestRes = await fetch(
      `${STRAPI_URL}/api/daily-digests?filters[date][$eq]=${date}&filters[user][id][$eq]=${user.id}&populate=*`,
      { headers: { Authorization: authHeader } }
    );

    if (digestRes.ok) {
      const data = await digestRes.json();
      const digest = data.data?.[0] || data.data;
      if (digest) {
        return NextResponse.json(normalizeDigest(digest));
      }
    }

    // Si pas encore généré, appeler l'endpoint de génération Strapi (si disponible)
    try {
      const genRes = await fetch(`${STRAPI_URL}/api/smart-follow-up/generate-daily-digest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ date }),
      });
      if (genRes.ok) {
        const genData = await genRes.json();
        return NextResponse.json(normalizeDigest(genData.data || genData));
      }
    } catch {
      // Endpoint non implémenté côté Strapi — fallback silencieux
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error('[Daily Digest] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function normalizeDigest(raw: Record<string, unknown>): Record<string, unknown> {
  const user = raw.user as { id?: number } | undefined;
  return {
    userId: user?.id ?? raw.user_id,
    date: raw.date,
    generatedAt: raw.generatedAt ?? raw.generated_at ?? raw.createdAt,
    hotLeads: raw.hotLeads ?? raw.hot_leads ?? [],
    stalledLeads: raw.stalledLeads ?? raw.stalled_leads ?? [],
    todayRdvs: raw.todayRdvs ?? raw.today_rdvs ?? [],
    totalActionable:
      typeof raw.totalActionable === 'number'
        ? raw.totalActionable
        : (raw.hotLeads ?? raw.hot_leads ?? []).length +
          (raw.todayRdvs ?? raw.today_rdvs ?? []).length,
  };
}
