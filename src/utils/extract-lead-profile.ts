/**
 * Extraction profil lead : HTML type Walego/Folk puis fallback texte (Lemlist, Apollo, etc.)
 */

import { extractLeadProfile as tryExtractWalegoFormat } from '@/utils/walego-profile-extractor';

export interface LeadProfileResult {
  profilePicUrl: string | null;
  name: string | null;
  title: string | null;
  linkedinUrl: string | null;
}

function extractFromTextGeneric(text: string): Partial<LeadProfileResult> {
  const namePatterns = [
    /Contact:\s*(.+)/i,
    /Name:\s*(.+)/i,
    /From:\s*(.+?)(?:\s+[<]|\s*$)/i,
    /replied:\s*(.+)/i,
  ];
  let name: string | null = null;
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      name = match[1].trim().split('\n')[0];
      break;
    }
  }
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9\-]+)/i);
  const linkedinUrl = linkedinMatch
    ? `https://linkedin.com/in/${linkedinMatch[1]}`
    : null;
  return { name, linkedinUrl };
}

export function extractLeadProfileUnified(
  contentHtml: string | null | undefined,
  contentText: string | null | undefined,
  _sourceId?: string
): LeadProfileResult {
  if (contentHtml?.trim()) {
    const w = tryExtractWalegoFormat(contentHtml);
    if (w.name || w.profilePicUrl || w.linkedinUrl) {
      return {
        profilePicUrl: w.profilePicUrl,
        name: w.name,
        title: w.title,
        linkedinUrl: w.linkedinUrl,
      };
    }
  }
  if (contentText?.trim()) {
    const t = extractFromTextGeneric(contentText);
    return {
      profilePicUrl: null,
      name: t.name ?? null,
      title: null,
      linkedinUrl: t.linkedinUrl ?? null,
    };
  }
  return { profilePicUrl: null, name: null, title: null, linkedinUrl: null };
}
