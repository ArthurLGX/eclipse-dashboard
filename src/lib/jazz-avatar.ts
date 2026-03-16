/**
 * Default avatar for Smart Follow-Up contacts without a profile picture.
 * Uses picsum.photos with deterministic, jazz-themed seeds.
 * No external API, no attribution required — safe for commercial use.
 */

const JAZZ_PREFIXES = ['jazz-singer', 'jazz-sax', 'jazz-pianist', 'jazz-trumpet'];
const AVATAR_SIZE = 300;

/**
 * Simple deterministic hash from string to number.
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

/**
 * Returns a deterministic jazz-themed portrait URL for a contact without profile picture.
 * Uses picsum.photos — no API calls, instant, commercial-use safe.
 *
 * @param contactId - Contact ID (string or number) for deterministic selection
 * @returns Object with avatarUrl
 *
 * @example
 * const { avatarUrl } = getDefaultContactAvatar(contact.id);
 */
export function getDefaultContactAvatar(contactId: string | number): { avatarUrl: string } {
  const id = String(contactId);
  const prefixIndex = hash(id) % JAZZ_PREFIXES.length;
  const prefix = JAZZ_PREFIXES[prefixIndex];
  const seed = `${prefix}-${id}`;
  const avatarUrl = `https://picsum.photos/seed/${seed}/${AVATAR_SIZE}/${AVATAR_SIZE}`;
  return { avatarUrl };
}
