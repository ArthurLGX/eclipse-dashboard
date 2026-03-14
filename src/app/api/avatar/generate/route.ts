import { NextRequest, NextResponse } from 'next/server';
import { fetchRandomUserAvatarUrl, mapGenderToParam } from '@/lib/randomuser-avatar';

/**
 * GET /api/avatar/generate?gender=male|female
 * Génère une URL de photo de profil depuis randomuser.me.
 * À appeler lors de la création d'un utilisateur pour stocker l'URL en base.
 * Évite les appels API répétés au render.
 */
export async function GET(request: NextRequest) {
  const gender = request.nextUrl.searchParams.get('gender');
  const param = mapGenderToParam(gender ?? undefined);
  const url = await fetchRandomUserAvatarUrl(param);
  return NextResponse.json({ avatar: url });
}
