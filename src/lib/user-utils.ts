/**
 * Utilitaires pour l'affichage des utilisateurs.
 * Gère le fallback username || email pour les comptes créés par email (sans username).
 */

export type UserLike = {
  username?: string | null;
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  profile_picture?: { url?: string } | null;
};

/** Nom d'affichage : username ou prénom/nom ou email */
export function getUserDisplayName(user: UserLike | null | undefined): string {
  if (!user) return '—';
  const un = user.username?.trim();
  if (un) return un;
  const fn = user.firstname?.trim();
  const ln = user.lastname?.trim();
  if (fn || ln) return `${fn || ''} ${ln || ''}`.trim();
  return user.email?.trim() || '—';
}

/** Initiales pour l'avatar : prénom+nom, ou 2 premières lettres de username/email */
export function getUserInitials(user: UserLike | null | undefined): string {
  if (!user) return '?';
  const fn = user.firstname?.trim();
  const ln = user.lastname?.trim();
  if (fn && ln) return (fn[0]! + ln[0]!).toUpperCase();
  if (fn && fn.length >= 2) return fn.slice(0, 2).toUpperCase();
  if (fn) return fn[0]!.toUpperCase();
  const src = user.username?.trim() || user.email?.trim() || '';
  if (src.length >= 2) return src.slice(0, 2).toUpperCase();
  if (src.length === 1) return src.toUpperCase();
  return '?';
}

/** URL de la photo de profil (avec base Strapi si nécessaire) */
export function getProfilePictureUrl(user: UserLike | null | undefined): string | null {
  if (!user?.profile_picture?.url) return null;
  const url = user.profile_picture.url;
  if (url.startsWith('http')) return url;
  const base = process.env.NEXT_PUBLIC_STRAPI_URL || '';
  return base + url;
}
