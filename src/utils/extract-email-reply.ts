/**
 * Extrait le dernier message « non cité » d’un fil email (Gmail, Outlook, etc.),
 * avant les citations « Le … a écrit », lignes >, etc.
 */

const QUOTE_START_PATTERNS: RegExp[] = [
  /\n-{3,}\s*Original Message\b/i,
  /\n-{3,}\s*Message d'origine\b/i,
  /\n-{5,}\s*Forwarded message\b/i,
  /\nOn\s.+wrote:\s*\n/i,
  /\nDe\s*:\s*.+\nEnvoyé\s*:/i,
  /\nLe\s+(?:lun|mar|mer|jeu|ven|sam|dim)\.\s+\d{1,2}\s+/i,
  /\nLe\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d{1,2}\s+/i,
  /\nEl\s+(?:lun|mar|mer|jeu|ven|sam|dim)\.\s+\d{1,2}\s+/i,
];

function firstQuotedBlockIndex(text: string): number {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^>\s?/.test(lines[i])) {
      let pos = 0;
      for (let j = 0; j < i; j++) {
        pos += lines[j].length + 1;
      }
      return pos;
    }
  }
  return -1;
}

/**
 * Retourne le texte du dernier message envoyé par l’interlocuteur (hors fil cité).
 */
export function extractLatestReplyPlainText(raw: string): string {
  if (!raw?.trim()) return '';
  const normalized = raw.replace(/\r\n/g, '\n').trim();

  let cut = normalized.length;
  for (const re of QUOTE_START_PATTERNS) {
    const m = normalized.match(re);
    if (m && m.index != null && m.index < cut) {
      cut = m.index;
    }
  }

  const qIdx = firstQuotedBlockIndex(normalized);
  if (qIdx >= 0 && qIdx < cut) cut = qIdx;

  let slice = normalized.slice(0, cut).trim();

  slice = slice.replace(/\n\[image:[^\]]+\]\s*/gi, '\n').trim();

  slice = slice.replace(/\n--\s*\n[\s\S]*$/m, '').trim();

  if (slice.length < 20 && normalized.length > slice.length) {
    slice = normalized.slice(0, Math.min(2000, cut)).trim();
  }

  return slice || normalized.slice(0, 1200).trim();
}
