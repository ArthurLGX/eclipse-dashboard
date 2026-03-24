/**
 * Vérifie un JWT Strapi via /api/users/me (réutilisable par les routes API Next).
 */
export async function verifyStrapiUser(token: string): Promise<{ id: number; email?: string } | null> {
  try {
    const base = process.env.NEXT_PUBLIC_STRAPI_URL;
    if (!base) return null;
    const response = await fetch(`${base}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
