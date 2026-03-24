/**
 * Extraction profil lead : HTML type Walego/Folk puis fallback texte (Lemlist, Apollo, etc.)
 */

import { extractLeadProfile as tryExtractWalegoFormat } from '@/utils/walego-profile-extractor';
import {
  extractWalegoLeadProfileFromPlainText,
  isWalegoPlainTextContent,
} from '@/utils/walego-lead-status';

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

function mergeLeadProfile(
  a: LeadProfileResult,
  b: Partial<LeadProfileResult>
): LeadProfileResult {
  return {
    profilePicUrl: a.profilePicUrl ?? b.profilePicUrl ?? null,
    name: a.name ?? b.name ?? null,
    title: a.title ?? b.title ?? null,
    linkedinUrl: a.linkedinUrl ?? b.linkedinUrl ?? null,
  };
}

export function extractLeadProfileUnified(
  contentHtml: string | null | undefined,
  contentText: string | null | undefined,
  _sourceId?: string
): LeadProfileResult {
  let result: LeadProfileResult = {
    profilePicUrl: null,
    name: null,
    title: null,
    linkedinUrl: null,
  };

  if (contentHtml?.trim()) {
    const w = tryExtractWalegoFormat(contentHtml);
    if (w.name || w.profilePicUrl || w.linkedinUrl) {
      result = {
        profilePicUrl: w.profilePicUrl,
        name: w.name,
        title: w.title,
        linkedinUrl: w.linkedinUrl,
      };
    }
  }

  // Walego en texte brut (HTML vide ou dégradé : liens [https://…] sous « Profile Picture »)
  if (contentText?.trim() && isWalegoPlainTextContent(contentText)) {
    const plain = extractWalegoLeadProfileFromPlainText(contentText);
    result = mergeLeadProfile(result, plain);
  }

  if (contentText?.trim() && !result.name && !result.profilePicUrl) {
    const t = extractFromTextGeneric(contentText);
    result = mergeLeadProfile(result, {
      name: t.name ?? null,
      linkedinUrl: t.linkedinUrl ?? null,
    });
  }

  return result;
}
