/**
 * Récupère les clés API IA pour une requête : clés utilisateur ou .env pour admin
 */
import { isUserAdmin } from '@/lib/email';
import { decryptData } from '@/lib/encryption';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export interface ApiKeys {
  openaiKey: string | null;
  anthropicKey: string | null;
}

export interface ApiKeysResult {
  keys: ApiKeys;
  userId: number;
  isAdmin: boolean;
  hasAnyKey: boolean;
}

/**
 * Récupère l'utilisateur depuis le token JWT Strapi
 */
async function getUserFromToken(token: string): Promise<{ id: number; email: string } | null> {
  const res = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return { id: user.id, email: user.email };
}

/** Structure JSON : { openai: "encrypted", anthropic: "encrypted", ... } - extensible */
export type EncryptedKeysMap = Record<string, string>;

/**
 * Récupère les clés API chiffrées de l'utilisateur depuis Strapi
 * Champ api_keys_encrypted (JSON) : { "openai": "iv:tag:encrypted", "anthropic": "...", ... }
 */
async function fetchUserEncryptedKeys(
  userId: number,
  token: string
): Promise<EncryptedKeysMap | null> {
  const res = await fetch(
    `${STRAPI_URL}/api/user-ai-keys?filters[user][id][$eq]=${userId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const record = data.data?.[0];
  const json = record?.api_keys_encrypted;
  if (!json || typeof json !== 'object') return null;
  return json as EncryptedKeysMap;
}

/**
 * Récupère les clés API pour une requête.
 * - Admin (ADMIN_EMAIL) : utilise OPENAI_API_KEY et ANTHROPIC_API_KEY du .env
 * - Autres : utilise les clés stockées dans le profil utilisateur (déchiffrées)
 * - Retourne hasAnyKey: false si aucune clé disponible (pour afficher la modale)
 */
export async function getApiKeysForRequest(
  authHeader: string | null
): Promise<ApiKeysResult | { keys: ApiKeys; userId: null; isAdmin: false; hasAnyKey: false; error: 'NO_AUTH' }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      keys: { openaiKey: null, anthropicKey: null },
      userId: null,
      isAdmin: false,
      hasAnyKey: false,
      error: 'NO_AUTH',
    };
  }

  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return {
      keys: { openaiKey: null, anthropicKey: null },
      userId: null,
      isAdmin: false,
      hasAnyKey: false,
      error: 'NO_AUTH',
    };
  }

  const isAdmin = isUserAdmin(user.email);

  if (isAdmin) {
    return {
      keys: {
        openaiKey: process.env.OPENAI_API_KEY || null,
        anthropicKey: process.env.ANTHROPIC_API_KEY || null,
      },
      userId: user.id,
      isAdmin: true,
      hasAnyKey: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
    };
  }

  const encryptedMap = await fetchUserEncryptedKeys(user.id, token);
  if (!encryptedMap || Object.keys(encryptedMap).length === 0) {
    return {
      keys: { openaiKey: null, anthropicKey: null },
      userId: user.id,
      isAdmin: false,
      hasAnyKey: false,
    };
  }

  const keys: ApiKeys = { openaiKey: null, anthropicKey: null };

  for (const [provider, encrypted] of Object.entries(encryptedMap)) {
    if (!encrypted || typeof encrypted !== 'string') continue;
    try {
      const decrypted = decryptData(encrypted);
      if (provider === 'openai') keys.openaiKey = decrypted;
      else if (provider === 'anthropic') keys.anthropicKey = decrypted;
    } catch {
      // Invalid encrypted data for this provider, skip
    }
  }

  return {
    keys,
    userId: user.id,
    isAdmin: false,
    hasAnyKey: !!(keys.openaiKey || keys.anthropicKey),
  };
}
