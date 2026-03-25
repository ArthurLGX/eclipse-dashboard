/**
 * Parse le corps texte / HTML des mails Walego pour la fiche lead (modale).
 */

import type { TaskAIAnalysis } from '@/types/smart-follow-up';
import { extractLatestReplyPlainText } from '@/utils/extract-email-reply';
import { extractWalegoLead, type WalegoExtractedLead } from '@/utils/extract-walego-lead';
import { extractWalegoProfilePicFromPlainText, isWalegoPlainTextContent } from '@/utils/walego-lead-status';

export interface ExtractedLeadProfile {
  name: string;
  avatar_url: string | null;
  title: string;
  company: string | null;
  linkedin_url: string | null;
  persona: string;
  persona_reasoning: string;
  campaign: string;
  lead_response: string;
  lead_status: string;
  lead_reasoning: string;
  lead_tips: string;
  email: string | null;
}

/** Champs optionnels que le worker peut ajouter sur ai_analysis (JSON flexible). */
export type ExtendedTaskAIAnalysis = TaskAIAnalysis & {
  lead_name?: string;
  lead_title?: string;
  lead_avatar?: string;
  lead_linkedin?: string;
  signal?: string;
  fog_risk?: boolean;
  draft_message?: string;
};

function extractBlockAfterLabel(text: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `(?:^|\\n)\\s*${escaped}\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:[A-Za-zÀ-ÿ][^:]{0,40}:\\s)|$)`,
    'i'
  );
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function emptyProfile(): ExtractedLeadProfile {
  return {
    name: 'Contact',
    avatar_url: null,
    title: '',
    company: null,
    linkedin_url: null,
    persona: '',
    persona_reasoning: '',
    campaign: '',
    lead_response: '',
    lead_status: '',
    lead_reasoning: '',
    lead_tips: '',
    email: null,
  };
}

function walegoExtractedToProfile(w: WalegoExtractedLead): ExtractedLeadProfile {
  const emailRaw = w.email?.trim();
  const email =
    emailRaw && !/^no email available$/i.test(emailRaw) ? emailRaw : null;
  return {
    name: w.name?.trim() || 'Contact',
    avatar_url: w.avatarUrl?.trim() || null,
    title: w.title?.trim() || '',
    company: w.company?.trim() || null,
    linkedin_url: w.linkedinUrl?.trim() || null,
    persona: w.persona?.trim() || '',
    persona_reasoning: w.personaReasoning?.trim() || '',
    campaign: w.campaign?.trim() || '',
    lead_response: w.leadResponse?.trim() || '',
    lead_status: w.leadStatus?.trim() || '',
    lead_reasoning: w.leadReasoning?.trim() || '',
    lead_tips: w.leadTips?.trim() || '',
    email,
  };
}

/**
 * Extrait l’URL de l’avatar depuis le HTML (sans cheerio côté bundle client léger).
 */
export function extractAvatarFromHtml(html: string): string | null {
  if (!html?.trim()) return null;
  const m1 = html.match(/<img[^>]+alt=["']Profile Picture["'][^>]*src=["']([^"']+)["']/i);
  if (m1?.[1]) return m1[1].trim();
  const m2 = html.match(/src=["']([^"']+)["'][^>]*alt=["']Profile Picture["']/i);
  if (m2?.[1]) return m2[1].trim();
  const m3 = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']Profile Picture["']/i);
  return m3?.[1]?.trim() ?? null;
}

/**
 * Parse le corps texte aplani d’un mail Walego (patterns type « NEW LEAD IDENTIFIED! »).
 */
export function parseWalegoContentText(text: string): ExtractedLeadProfile {
  const base = emptyProfile();
  if (!text?.trim()) return base;

  const lines = text.split(/\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const upperBlock = (s: string) => s === s.toUpperCase() && s.length > 3;
  const nameIdx = nonEmpty.findIndex((l) => /NEW\s+LEAD\s+IDENTIFIED/i.test(l));
  let name: string | null = null;
  if (nameIdx >= 0) {
    const after = nonEmpty.slice(nameIdx + 1);
    name =
      after.find(
        (l) =>
          upperBlock(l) &&
          !l.startsWith('http') &&
          !l.startsWith('[') &&
          !/^VIEW\s+/i.test(l)
      ) ?? null;
  }

  const nameLineIndex = name ? nonEmpty.indexOf(name) : -1;
  let title =
    nameLineIndex >= 0 && nonEmpty[nameLineIndex + 1] && !/^http/i.test(nonEmpty[nameLineIndex + 1])
      ? nonEmpty[nameLineIndex + 1]
      : '';
  if (title && upperBlock(title) && nameLineIndex + 2 < nonEmpty.length) {
    title = nonEmpty[nameLineIndex + 2];
  }

  const linkedinLine = nonEmpty.find((l) => l.includes('linkedin.com/in/'));
  const linkedinUrl =
    linkedinLine?.match(/https?:\/\/[^\s\]]+linkedin\.com\/in\/[^\s\]]+/)?.[0]?.replace(/[\],]+$/, '') ||
    null;

  const convIdx = nonEmpty.findIndex((l) => /^CONVERSATION\s+HISTORY$/i.test(l));
  const leadStatusIdx = nonEmpty.findIndex((l) => /^LEAD\s+STATUS$/i.test(l));
  let leadResponse = '';
  if (convIdx >= 0 && leadStatusIdx >= 0 && leadStatusIdx > convIdx) {
    const convLines = nonEmpty.slice(convIdx + 1, leadStatusIdx);
    const candidates = convLines.filter(
      (l) =>
        !l.startsWith('[') &&
        !/^https?:/i.test(l) &&
        l.length > 10 &&
        !upperBlock(l)
    );
    leadResponse = candidates.join('\n\n').trim() || '';
    if (!leadResponse) {
      const one = convLines.find((l) => l.length > 15 && !/^http/i.test(l));
      leadResponse = one?.trim() || '';
    }
  }

  const plainForBlocks = text;
  const personaLine = nonEmpty.find((l) => /^Persona:\s*/i.test(l));
  const persona = personaLine?.replace(/^Persona:\s*/i, '').trim() || '';
  let persona_reasoning = extractBlockAfterLabel(plainForBlocks, 'Persona Reasoning');
  if (!persona_reasoning) {
    const prLine = nonEmpty.find((l) => /^Persona Reasoning:\s*/i.test(l));
    persona_reasoning = prLine?.replace(/^Persona Reasoning:\s*/i, '').trim() || '';
  }

  const campaignLine = nonEmpty.find((l) => /^Campaign:\s*/i.test(l));
  const campaign = campaignLine?.replace(/^Campaign:\s*/i, '').trim() || '';

  const emailLine = nonEmpty.find((l) => /^Email:\s*/i.test(l));
  const emailRaw = emailLine?.replace(/^Email:\s*/i, '').trim() || '';
  const email =
    emailRaw && !/^no email available$/i.test(emailRaw) ? emailRaw : null;

  const leadStatusZone = plainForBlocks.match(/Lead\s+Status[\s\S]*/i)?.[0] || plainForBlocks;
  let lead_status =
    extractBlockAfterLabel(leadStatusZone, 'Status').split(/\n/)[0]?.trim() || '';
  if (!lead_status) {
    const st = nonEmpty.find((l) => /^Status:\s*/i.test(l) && /lead|qualified|unqualified/i.test(l));
    lead_status = st?.replace(/^Status:\s*/i, '').trim() || '';
  }

  let lead_reasoning = extractBlockAfterLabel(leadStatusZone, 'Reasoning');
  if (!lead_reasoning) {
    const rIdx = nonEmpty.findIndex((l) => /^Reasoning:\s*/i.test(l));
    if (rIdx >= 0) lead_reasoning = nonEmpty[rIdx].replace(/^Reasoning:\s*/i, '').trim();
  }

  let lead_tips = extractBlockAfterLabel(leadStatusZone, 'Tips');
  if (!lead_tips) lead_tips = extractBlockAfterLabel(leadStatusZone, 'Tip');

  let company: string | null = null;
  if (title) {
    const sep = title.split(/◉|·| — | – /);
    if (sep.length > 1) company = sep[sep.length - 1]?.trim() || null;
    const at = title.match(/\s+at\s+(.+)/i);
    if (at) company = at[1].trim();
  }

  const picFromText = extractWalegoProfilePicFromPlainText(text);

  return {
    name: name?.trim() || 'Contact',
    avatar_url: picFromText,
    title: title || '',
    company,
    linkedin_url: linkedinUrl,
    persona,
    persona_reasoning,
    campaign,
    lead_response: leadResponse,
    lead_status: lead_status || 'lead',
    lead_reasoning,
    lead_tips,
    email,
  };
}

function pick<T extends string | null | undefined>(...vals: (T | undefined)[]): string | null {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/**
 * Fusionne texte, HTML, champs action et analyse IA selon la priorité métier.
 */
function looksLikeWalegoHtml(html: string): boolean {
  if (!html?.trim()) return false;
  return /NEW\s+LEAD\s+IDENTIFIED|Profile\s+Picture|Lead\s+Status|walego/i.test(html);
}

export function mergeLeadProfileForModal(args: {
  contentText?: string | null;
  contentHtml?: string | null;
  clientName?: string | null;
  leadTitle?: string | null;
  linkedinUrl?: string | null;
  avatarPath?: string | null;
  aiAnalysis?: ExtendedTaskAIAnalysis | null;
  receivedAt?: string;
  rawEmailSubject?: string;
  /** Expéditeur du mail reçu (identité réelle du lead) */
  fromEmail?: string | null;
  fromName?: string | null;
  snippet?: string | null;
}): ExtractedLeadProfile {
  const text = args.contentText?.trim() || '';
  const html = args.contentHtml?.trim() || '';
  const fromText = parseWalegoContentText(text);
  const isWalegoMail =
    isWalegoPlainTextContent(text) || (html && /<[a-z][\s\S]*>/i.test(html) && looksLikeWalegoHtml(html));

  let fromHtml: ExtractedLeadProfile | null = null;
  if (html && /<[a-z][\s\S]*>/i.test(html) && looksLikeWalegoHtml(html)) {
    try {
      const w = extractWalegoLead(html, {
        receivedAt: args.receivedAt,
        rawEmailSubject: args.rawEmailSubject,
      });
      if (w.name || w.leadResponse || w.persona) {
        fromHtml = walegoExtractedToProfile(w);
      }
    } catch {
      /* ignore */
    }
  }

  const mergeField = (
    a: string,
    b: string,
    prefer: 'a' | 'b' = 'b'
  ): string => {
    const ea = a?.trim();
    const eb = b?.trim();
    if (prefer === 'b') {
      if (eb) return eb;
      return ea || '';
    }
    if (ea) return ea;
    return eb || '';
  };

  let p: ExtractedLeadProfile = {
    ...fromText,
    name: mergeField(fromText.name, fromHtml?.name ?? '', 'b') || fromText.name,
    title: mergeField(fromText.title, fromHtml?.title ?? ''),
    company: pick(fromHtml?.company, fromText.company),
    linkedin_url: pick(fromHtml?.linkedin_url, fromText.linkedin_url),
    persona: mergeField(fromText.persona, fromHtml?.persona ?? ''),
    persona_reasoning: mergeField(fromText.persona_reasoning, fromHtml?.persona_reasoning ?? ''),
    campaign: mergeField(fromText.campaign, fromHtml?.campaign ?? ''),
    lead_response: mergeField(fromText.lead_response, fromHtml?.lead_response ?? ''),
    lead_status: mergeField(fromText.lead_status, fromHtml?.lead_status ?? ''),
    lead_reasoning: mergeField(fromText.lead_reasoning, fromHtml?.lead_reasoning ?? ''),
    lead_tips: mergeField(fromText.lead_tips, fromHtml?.lead_tips ?? ''),
    email: pick(fromHtml?.email, fromText.email),
    avatar_url: pick(
      fromHtml?.avatar_url,
      extractAvatarFromHtml(html),
      fromText.avatar_url
    ),
  };

  if (args.leadTitle?.trim()) p.title = args.leadTitle.trim();
  if (args.linkedinUrl?.trim()) p.linkedin_url = args.linkedinUrl.trim();
  if (args.avatarPath?.trim()) p.avatar_url = args.avatarPath.trim();

  if (!isWalegoMail) {
    const fromEmail = args.fromEmail?.trim();
    if (fromEmail) {
      p.email = pick(fromEmail, p.email);
    }
    const fromName = args.fromName?.trim();
    if (fromName && (!p.name || p.name === 'Contact')) {
      p.name = fromName;
    }
    const directReply =
      extractLatestReplyPlainText(text) || args.snippet?.trim() || '';
    if (directReply.length > 15) {
      p.lead_response = directReply;
    }
  }

  const ai = args.aiAnalysis;
  if (ai) {
    if ((ai as ExtendedTaskAIAnalysis).lead_name?.trim()) {
      p.name = (ai as ExtendedTaskAIAnalysis).lead_name!.trim();
    }
    if ((ai as ExtendedTaskAIAnalysis).lead_title?.trim()) {
      p.title = (ai as ExtendedTaskAIAnalysis).lead_title!.trim();
    }
    if ((ai as ExtendedTaskAIAnalysis).lead_avatar?.trim()) {
      p.avatar_url = (ai as ExtendedTaskAIAnalysis).lead_avatar!.trim();
    }
    if ((ai as ExtendedTaskAIAnalysis).lead_linkedin?.trim()) {
      p.linkedin_url = (ai as ExtendedTaskAIAnalysis).lead_linkedin!.trim();
    }
  }

  if (args.clientName?.trim()) {
    p.name = args.clientName.trim();
  }

  return p;
}
