/**
 * Évite QuotaExceededError sur localStorage : ne garde que les champs utiles à l’UI,
 * pas les relations Strapi (populate=* peut dépasser plusieurs Mo).
 */

export interface AuthStoredUser {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  role?: string;
  profile_picture?: { url: string };
  confirmed?: boolean;
  blocked?: boolean;
}

function extractProfilePictureUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.url === 'string') return r.url;
  const data = r.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.url === 'string') return d.url;
    const attrs = d.attributes as Record<string, unknown> | undefined;
    if (attrs && typeof attrs.url === 'string') return attrs.url;
  }
  return undefined;
}

/** Réduit la réponse Strapi / users/me au strict nécessaire pour le client. */
export function sanitizeUserForStorage(raw: unknown): AuthStoredUser {
  if (!raw || typeof raw !== 'object') {
    return { id: 0, username: '', email: '' };
  }
  const r = raw as Record<string, unknown>;
  const picUrl = extractProfilePictureUrl(r.profile_picture);
  const out: AuthStoredUser = {
    id: Number(r.id) || 0,
    username: String(r.username ?? ''),
    email: String(r.email ?? ''),
  };
  if (r.firstname != null) out.firstname = String(r.firstname);
  if (r.lastname != null) out.lastname = String(r.lastname);
  if (r.role != null) {
    if (typeof r.role === 'string') out.role = r.role;
    else if (typeof r.role === 'object' && r.role !== null && 'name' in r.role) {
      const n = (r.role as { name?: string }).name;
      if (n) out.role = String(n);
    }
  }
  if (typeof r.confirmed === 'boolean') out.confirmed = r.confirmed;
  if (typeof r.blocked === 'boolean') out.blocked = r.blocked;
  if (picUrl) out.profile_picture = { url: picUrl };
  return out;
}

export function persistUserToLocalStorage(user: AuthStoredUser): void {
  const json = JSON.stringify(user);
  try {
    localStorage.setItem('user', json);
    return;
  } catch (e) {
    console.warn('[auth] localStorage quota (user), fallback minimal', e);
  }
  const minimal: AuthStoredUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    role: user.role,
    confirmed: user.confirmed,
    blocked: user.blocked,
  };
  try {
    localStorage.setItem('user', JSON.stringify(minimal));
  } catch (e2) {
    console.error('[auth] Cannot persist user even without avatar', e2);
  }
}
