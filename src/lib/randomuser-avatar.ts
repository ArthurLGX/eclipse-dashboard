/**
 * Génère une URL de photo de profil depuis l'API randomuser.me.
 * Remplace ui-avatars.com par des photos réelles.
 */

const RANDOMUSER_API = 'https://randomuser.me/api/';

/** Fallback lorsque l'API échoue - portrait lego */
export const FALLBACK_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

export type UserGender = 'male' | 'female' | null;

/**
 * Récupère une URL de photo de profil depuis randomuser.me.
 * @param gender - 'male' | 'female' | null → null = aléatoire
 * @returns URL de l'image (picture.large) ou fallback lego en cas d'erreur
 */
export async function fetchRandomUserAvatarUrl(gender: UserGender = null): Promise<string> {
  const url =
    gender === 'male'
      ? `${RANDOMUSER_API}?gender=male`
      : gender === 'female'
        ? `${RANDOMUSER_API}?gender=female`
        : RANDOMUSER_API;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`randomuser ${res.status}`);
    const data = (await res.json()) as {
      results?: Array<{ picture?: { large?: string } }>;
    };
    const pic = data?.results?.[0]?.picture?.large;
    return pic || FALLBACK_AVATAR;
  } catch {
    return FALLBACK_AVATAR;
  }
}

/**
 * Mappe user.gender vers le paramètre API.
 * Strapi/JSON peut utiliser 'male'|'female'|'other'|null.
 */
export function mapGenderToParam(gender: string | null | undefined): UserGender {
  if (!gender) return null;
  const g = String(gender).toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return null;
}
