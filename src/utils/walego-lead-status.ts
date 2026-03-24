/**
 * Parser pour extraire la zone "Lead Status" des emails Walego.
 * Structure typique : Status, Reasoning, Tips (suggestions de l'IA Walego).
 */

/**
 * Extrait le nom du lead depuis le sujet d'un email Walego.
 * Ex: "Prise de nouvelles - New Lead with Walego: Gaëtan Balawe from" → "Gaëtan Balawe"
 */
export function extractWalegoLeadName(subject: string): string | null {
  if (!subject?.trim()) return null;
  // "WhatsApp · Jean Dupont" → "Jean Dupont"
  const whatsappMatch = subject.match(/^WhatsApp\s*[·•]\s*(.+)$/);
  if (whatsappMatch) return whatsappMatch[1].trim();
  // "Prise de nouvelles - New Lead with Walego: Gaëtan Balawe from" → "Gaëtan Balawe"
  const match = subject.match(/(?:New Lead with )?Walego\s*:\s*([^\n]+?)\s+from/i);
  if (match) return match[1].trim();
  return null;
}

/**
 * Extrait le nom du lead depuis le corps HTML "New Lead Identified!".
 * Cherche le h2 après l'avatar : <h2 ...>Rosa BELLEI</h2>
 */
export function extractWalegoLeadNameFromBody(html: string): string | null {
  if (!html?.trim()) return null;
  const match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extrait le titre/poste du lead depuis le corps HTML.
 * Le titre est typiquement dans le premier <p> après le <h2> du nom.
 */
export function extractWalegoLeadTitleFromBody(html: string): string | null {
  if (!html?.trim()) return null;
  const match =
    html.match(/<h2[^>]*>[^<]+<\/h2>\s*<p[^>]*>([^<]+)<\/p>/i) ||
    html.match(/<p[^>]*(?:color:\s*#7f8c8d|color:\s*#666)[^>]*>([^<]+)<\/p>/i);
  const raw = match ? match[1].trim() : null;
  return raw ? raw.replace(/&amp;/g, '&').replace(/&#39;/g, "'") : null;
}

/**
 * Extrait l'URL de l'avatar/photo du lead depuis le corps HTML.
 * Première image 80x80 ou 80px (avatar principal du lead).
 */
export function extractWalegoAvatarFromBody(html: string): string | null {
  if (!html?.trim()) return null;
  const match =
    html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:width|height):\s*80(?:px)?/i) ||
    html.match(/(?:width|height):\s*80(?:px)?[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1].trim();
  const imgs = html.match(/<img[^>]+src=["']([^"']+)["']/g);
  return imgs && imgs.length > 0 ? (imgs[0].match(/src=["']([^"']+)["']/)?.[1] ?? null) : null;
}

/**
 * Extrait l'URL LinkedIn du lead depuis le corps HTML.
 */
export function extractWalegoLinkedInFromBody(html: string): string | null {
  if (!html?.trim()) return null;
  const match = html.match(/LinkedIn\s+Profile[\s\S]*?<a[^>]+href=["']([^"']+)["']/i)
    || html.match(/href=["']([^"']+)["'][^>]*>[\s\S]*?LinkedIn\s+Profile/i);
  return match ? match[1].trim() : null;
}

/** Mail Walego dont le HTML a été aplani : liens sous forme [https://…] */
export function isWalegoPlainTextContent(text: string): boolean {
  if (!text?.trim()) return false;
  return /NEW\s+LEAD\s+IDENTIFIED|Profile\s+Picture|Lead\s+Status/i.test(text);
}

/**
 * Photo de profil : après « Profile Picture », préférer l’URL image (/im/, .jpg…) — pas le lien tracking tr/op.
 */
export function extractWalegoProfilePicFromPlainText(text: string): string | null {
  if (!text?.trim()) return null;
  const normalized = text.replace(/\r\n/g, '\n');
  const ppIdx = normalized.search(/Profile\s+Picture/i);
  const haystack = ppIdx >= 0 ? normalized.slice(ppIdx) : normalized;

  for (const m of haystack.matchAll(/\[((https?:\/\/[^\]\s]+))\]/g)) {
    const u = m[1];
    const looksLikeImage =
      (/\/im\//i.test(u) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) && !/\/tr\/op\//i.test(u);
    if (looksLikeImage) return u.trim();
  }
  for (const m of normalized.matchAll(/\[((https?:\/\/[^\]\s]+))\]/g)) {
    const u = m[1];
    if (/\/im\//i.test(u) && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) return u.trim();
  }
  return null;
}

/** Lien LinkedIn : « LinkedIn Profile » puis [https://…] */
export function extractWalegoLinkedInFromPlainText(text: string): string | null {
  if (!text?.trim()) return null;
  const labeled = text.match(/LinkedIn\s+Profile\s*\r?\n\s*\[(https?:\/\/[^\]\s]+)\]/i);
  if (labeled?.[1]) return labeled[1].trim();
  const bracket = text.match(/\[(https?:\/\/[^\]]*linkedin\.com[^\]]*)\]/i);
  return bracket?.[1]?.trim() ?? null;
}

/** Nom et titre : après « Profile Picture » + 1ère image [url], puis lignes nom / titre (texte Brevo aplati). */
export function extractWalegoNameAndTitleFromPlainText(text: string): {
  name: string | null;
  title: string | null;
} {
  if (!text?.trim()) return { name: null, title: null };
  const normalized = text.replace(/\r\n/g, '\n');

  const legacy = normalized.match(
    /Profile\s+Picture\s*\n\s*\[[^\]]+\]\s*\n+\s*([^\n]+)\s*\n+\s*([^\n]+)/i
  );
  if (legacy?.[1]) {
    const name = legacy[1].trim();
    const title = (legacy[2] ?? '').trim();
    if (name.length >= 2 && name.length < 120) {
      const titleOut =
        title && !/^linkedin\s+profile$/i.test(title) && !/^email\s*:/i.test(title) ? title : null;
      return { name, title: titleOut || null };
    }
  }

  const ppIdx = normalized.search(/Profile\s+Picture/i);
  if (ppIdx < 0) return { name: null, title: null };
  const fromPP = normalized.slice(ppIdx);

  let imgEnd = -1;
  for (const m of fromPP.matchAll(/\[((https?:\/\/[^\]\s]+))\]/g)) {
    const u = m[1];
    const looksLikeImage =
      (/\/im\//i.test(u) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) && !/\/tr\/op\//i.test(u);
    if (looksLikeImage) {
      imgEnd = (m.index ?? 0) + m[0].length;
      break;
    }
  }

  if (imgEnd < 0) return { name: null, title: null };

  const afterImg = fromPP.slice(imgEnd);
  const lines = afterImg
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let i = 0;
  while (i < lines.length && lines[i].trimStart().startsWith('[http')) i++;

  if (i >= lines.length) return { name: null, title: null };

  let name = lines[i];
  if (/^linkedin\s+profile$/i.test(name)) {
    i++;
    if (i >= lines.length) return { name: null, title: null };
    name = lines[i];
  }

  if (name.length < 2 || name.length >= 120) return { name: null, title: null };
  if (/^email\s*:/i.test(name)) return { name: null, title: null };

  const next = lines[i + 1];
  const title =
    next && !/^linkedin\s+profile$/i.test(next) && !/^email\s*:/i.test(next) && !next.trimStart().startsWith('[http')
      ? next
      : null;

  return { name, title: title || null };
}

export interface WalegoPlainTextProfile {
  profilePicUrl: string | null;
  name: string | null;
  title: string | null;
  linkedinUrl: string | null;
}

export function extractWalegoLeadProfileFromPlainText(text: string): WalegoPlainTextProfile {
  const nt = extractWalegoNameAndTitleFromPlainText(text);
  return {
    profilePicUrl: extractWalegoProfilePicFromPlainText(text),
    name: nt.name,
    title: nt.title,
    linkedinUrl: extractWalegoLinkedInFromPlainText(text),
  };
}

export interface WalegoLeadStatus {
  status?: string;
  reasoning?: string;
  tips?: string;
}

function stripHtml(html: string): string {
  const text = html
    .replace(/<img[^>]+data-emoji=["']([^"']+)["'][^>]*>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return text;
}

/**
 * Extrait Status, Reasoning et Tips de la zone Lead Status dans un email.
 * Gère le HTML et le texte brut. Les labels peuvent être en anglais (Status, Reasoning, Tips).
 */
export function parseWalegoLeadStatus(htmlOrText: string): WalegoLeadStatus | null {
  if (!htmlOrText?.trim()) return null;

  const text = htmlOrText.includes('<') ? stripHtml(htmlOrText) : htmlOrText;
  const lower = text.toLowerCase();

  // Vérifier que c'est bien une zone Lead Status (présence de "lead status" ou "reasoning" + "tips")
  const hasLeadStatus =
    lower.includes('lead status') ||
    (lower.includes('reasoning') && (lower.includes('tips') || lower.includes('tip:')));

  if (!hasLeadStatus) return null;

  const result: WalegoLeadStatus = {};

  // Status: "Status:" suivi du statut (ex: lead, qualified, etc.)
  const statusMatch = text.match(/\bStatus\s*:\s*([\s\S]+?)(?=\n|Reasoning|Tips|$)/i);
  if (statusMatch) {
    result.status = statusMatch[1].trim();
  }

  // Reasoning: "Reasoning:" suivi du texte jusqu'à Tips ou fin
  const reasoningMatch = text.match(/\bReasoning\s*:\s*([\s\S]+?)(?=\n\s*(?:Tips?|Status)\s*:|$)/i);
  if (reasoningMatch) {
    result.reasoning = reasoningMatch[1].trim();
  }

  // Tips: "Tips:" ou "Tip:" suivi du texte
  const tipsMatch = text.match(/\bTips?\s*:\s*([\s\S]+)$/i);
  if (tipsMatch) {
    result.tips = tipsMatch[1].trim();
  }

  if (result.reasoning || result.tips || result.status) {
    return result;
  }

  return null;
}

/**
 * Extrait la réponse EXACTE du lead depuis un email Walego.
 * Ne retourne que le message du lead, pas les messages sortants ni le Lead Status.
 * Retourne null si aucune réponse identifiable.
 */
export function extractWalegoLeadResponse(htmlOrText: string): string | null {
  if (!htmlOrText?.trim()) return null;

  const text = htmlOrText.includes('<') ? stripHtml(htmlOrText) : htmlOrText;
  const lower = text.toLowerCase();

  // Exclure la zone Lead Status (tout ce qui suit)
  const leadStatusIdx = lower.search(/\b(lead\s+status|status\s*:\s*lead|reasoning\s*:)/i);
  const contentBeforeLeadStatus = leadStatusIdx >= 0 ? text.slice(0, leadStatusIdx) : text;

  // Séparer par doubles sauts de ligne ou par lignes longues (blocs de citation)
  const parts = contentBeforeLeadStatus
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter((p) => p.length > 0);

  // Prendre le dernier bloc substantiel (1-1000 chars) qui ressemble à une réponse humaine
  // Min 1 pour accepter "👍", "Ok", etc.
  for (let i = parts.length - 1; i >= 0; i--) {
    const block = parts[i];
    if (block.length < 1 || block.length > 1000) continue;
    // Exclure les blocs qui sont clairement des messages sortants (notre message)
    if (/^(bonjour|hello|hi)\s+/i.test(block) && block.length > 150) continue;
    if (/^(je\s+vous\s+contacte|i\'m\s+reaching\s+out)/i.test(block)) continue;
    // Exclure les en-têtes techniques
    if (/^(from:|to:|subject:|date:)/im.test(block)) continue;
    // Exclure les blocs HTML/code restants
    if (/^<[a-z]|{\s*"/i.test(block)) continue;
    // Exclure les labels seuls (Arthur, Rosa) — le message suit
    if (block.length < 20 && /^(Arthur|Rosa|Bonjour|Hello)\s*$/i.test(block.trim())) continue;
    return block;
  }

  // Fallback : si le contenu est court et semble être une réponse directe (ex: emoji 👍)
  const singleBlock = contentBeforeLeadStatus.trim().replace(/\s+/g, ' ');
  if (singleBlock.length >= 1 && singleBlock.length <= 500 && !/^(from:|to:|subject:)/im.test(singleBlock)) {
    return singleBlock;
  }

  return null;
}

/**
 * Formate le Lead Status Walego en reasoning + suggestion pour TaskAIAnalysis.
 */
export function formatWalegoLeadStatusForAnalysis(parsed: WalegoLeadStatus): {
  reasoning: string;
  suggestion: string;
} {
  const parts: string[] = [];
  if (parsed.status) parts.push(`Status : ${parsed.status}`);
  if (parsed.reasoning) parts.push(parsed.reasoning);

  return {
    reasoning: parts.join('\n\n'),
    suggestion: parsed.tips || parsed.reasoning || '',
  };
}
