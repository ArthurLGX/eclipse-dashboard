/**
 * Prépare le texte du message lead pour l’affichage dans la modale :
 * URLs raccourcies, en-têtes de réexpédition lisibles, longueur bornée.
 */

const DEFAULT_MAX_CHARS = 14_000;

/** Réduit les URL longues (tracking, newsletters) pour éviter les lignes interminables. */
export function shortenUrlsForDisplay(text: string, maxUrlLen = 72): string {
  return text.replace(/https?:\/\/[^\s\])"'<>]+/gi, (url) => {
    if (url.length <= maxUrlLen) return url;
    const head = 36;
    const tail = 28;
    return `${url.slice(0, head)}…${url.slice(-tail)}`;
  });
}

/**
 * Insère des retours à la ligne sur les en-têtes typiques des mails réexpédiés (FR / EN).
 */
export function breakForwardHeaders(text: string): string {
  let s = text.replace(/\r\n/g, '\n');
  if (!/début du message réexpédié|begin forwarded message/i.test(s)) {
    return s;
  }
  s = s.replace(/^\s*Début du message réexpédié\s*:\s*/i, '── Message réexpédié ──\n');
  s = s.replace(/^\s*Begin forwarded message\s*:\s*/i, '── Forwarded message ──\n');
  s = s.replace(/\s+De:\s+/gi, '\nDe: ');
  s = s.replace(/\s+From:\s+/gi, '\nFrom: ');
  s = s.replace(/\s+Objet:\s+/gi, '\nObjet: ');
  s = s.replace(/\s+Subject:\s+/gi, '\nSubject: ');
  s = s.replace(/\s+Date:\s+/gi, '\nDate: ');
  s = s.replace(/\s+À:\s+/gi, '\nÀ: ');
  s = s.replace(/\s+To:\s+/gi, '\nTo: ');
  s = s.replace(/\s+Répondre à:\s+/gi, '\nRépondre à: ');
  s = s.replace(/\s+Reply-To:\s+/gi, '\nReply-To: ');
  return s.trimStart();
}

/** Supprime les schémas inutiles type x-msg:// qui cassent l’affichage. */
export function stripBrokenSchemes(text: string): string {
  return text.replace(/x-msg:\/\/[^\s>]+/gi, '[message interne]');
}

/**
 * Texte prêt pour la zone « Message du lead » (lisible, scrollable côté CSS).
 */
export function formatLeadMessageForDisplay(
  raw: string,
  options?: { maxChars?: number }
): string {
  if (!raw?.trim()) return '';
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  let s = raw.replace(/\r\n/g, '\n').trim();
  s = stripBrokenSchemes(s);
  s = breakForwardHeaders(s);
  s = shortenUrlsForDisplay(s);
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{5,}/g, '\n\n\n\n');

  if (s.length > maxChars) {
    s = `${s.slice(0, maxChars).trim()}\n\n[… message tronqué pour l’affichage (${raw.length.toLocaleString('fr-FR')} caractères au total)]`;
  }
  return s;
}
