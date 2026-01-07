/**
 * Utilitaires de chiffrement pour les données sensibles
 * Utilise l'API Web Crypto pour chiffrer/déchiffrer les credentials
 */

// Clé dérivée du secret (stockée côté serveur)
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Dérive une clé de chiffrement à partir d'un secret
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('eclipse-dashboard-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre une chaîne de caractères
 * @param plaintext Le texte à chiffrer
 * @param secret La clé secrète (provient du serveur)
 * @returns Le texte chiffré en base64 (IV + ciphertext)
 */
export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV de 12 bytes pour AES-GCM

  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combiner IV + ciphertext et encoder en base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Déchiffre une chaîne de caractères
 * @param ciphertext Le texte chiffré en base64
 * @param secret La clé secrète
 * @returns Le texte déchiffré
 */
export async function decrypt(ciphertext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  
  // Décoder le base64
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  
  // Extraire IV et ciphertext
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Vérifie si une chaîne est chiffrée (format base64 valide)
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  try {
    atob(text);
    return text.length > 20; // Un texte chiffré fait au moins 12 bytes (IV) + données
  } catch {
    return false;
  }
}

