/**
 * Extraction complète d'un lead depuis le corps HTML d'un mail Walego.
 * Parse uniquement — n'appelle aucune IA, ne génère rien.
 * Tous les champs texte sont extraits mot pour mot, sans résumé ni paraphrase.
 */

import { load } from 'cheerio';

export interface WalegoExtractedLead {
  name: string;
  title: string;
  company: string;
  email: string;
  linkedinUrl: string;
  avatarUrl: string;
  campaign: string;
  persona: string;
  description: string;
  personaReasoning: string;
  messageArthur: string;
  leadResponse: string;
  leadStatus: string;
  leadReasoning: string;
  leadTips: string;
  source: 'walego';
  receivedAt: string;
  rawEmailSubject: string;
}

function getText($: ReturnType<typeof load>, el: ReturnType<typeof $>): string {
  return el.text().replace(/\s+/g, ' ').trim();
}

function getFieldFromTable($: ReturnType<typeof load>, label: string): string {
  const rows = $('table tr');
  for (let i = 0; i < rows.length; i++) {
    const cells = $(rows[i]).find('td');
    if (cells.length >= 2) {
      const firstText = getText($, $(cells[0]));
      if (firstText.toLowerCase().replace(/\s+/g, ' ').startsWith(label.toLowerCase())) {
        return getText($, $(cells[1])) || '';
      }
    }
  }
  return '';
}

function extractBlockAfterLabel(text: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:\\w+\\s*:)|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<img[^>]+data-emoji=["']([^"']+)["'][^>]*>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Extrait le lead complet depuis le corps HTML d'un mail Walego.
 */
export function extractWalegoLead(
  mailBody: string,
  options?: { receivedAt?: string; rawEmailSubject?: string }
): WalegoExtractedLead {
  const result: WalegoExtractedLead = {
    name: '',
    title: '',
    company: '',
    email: '',
    linkedinUrl: '',
    avatarUrl: '',
    campaign: '',
    persona: '',
    description: '',
    personaReasoning: '',
    messageArthur: '',
    leadResponse: '',
    leadStatus: '',
    leadReasoning: '',
    leadTips: '',
    source: 'walego',
    receivedAt: options?.receivedAt ?? '',
    rawEmailSubject: options?.rawEmailSubject ?? '',
  };

  if (!mailBody?.trim()) return result;

  try {
    const $ = load(mailBody);

    // Bloc 1 — Identité
    const h2 = $('h2').first();
    result.name = getText($, h2) || '';
    const parentDiv = h2.parent();
    const paragraphs = parentDiv.find('p');
    const titleP = paragraphs.filter((_, el) => {
      const t = $(el).text().trim();
      return t && !t.toLowerCase().includes('linkedin');
    }).first();
    result.title = getText($, titleP) || '';

    const profileImg = $('img[alt="Profile Picture"]').first();
    const src = profileImg.attr('src');
    if (src?.trim()) result.avatarUrl = src.trim();

    const linkedinLink = $('a').filter(function () {
      return $(this).text().trim().toLowerCase().includes('linkedin');
    }).first();
    const href = linkedinLink.attr('href');
    if (href?.trim()) result.linkedinUrl = href.trim();

    // Bloc 2 — Champs structurés (tableau)
    result.email = getFieldFromTable($, 'Email') || '';
    result.company = getFieldFromTable($, 'Company') || '';
    result.description = getFieldFromTable($, 'Description') || '';
    result.campaign = getFieldFromTable($, 'Campaign') || '';
    result.persona = getFieldFromTable($, 'Persona') || '';

    const plainText = stripHtmlToText(mailBody);
    result.personaReasoning = extractBlockAfterLabel(plainText, 'Persona Reasoning') || '';

    // Bloc 3 — Conversation History (bleu = Arthur, rose = lead)
    const convSection = mailBody.match(/Conversation\s+History[\s\S]*?(?=Lead\s+Status|$)/i);
    const convHtml = convSection ? convSection[0] : mailBody;
    const $conv = load(convHtml);

    const arthurBlocks: string[] = [];
    const leadBlocks: string[] = [];

    $conv('[style*="background"]').each(function () {
      const el = $conv(this);
      const style = (el.attr('style') || '').toLowerCase();
      const text = getText($conv, el);
      if (!text || text.length < 2) return;
      if (style.includes('#e8f4fc') || style.includes('e8f4fc')) {
        arthurBlocks.push(text);
      } else if (style.includes('#f0f4f8') || style.includes('f0f4f8')) {
        leadBlocks.push(text);
      }
    });

    result.messageArthur = arthurBlocks.join('\n\n') || '';
    result.leadResponse = leadBlocks.join('\n\n') || '';

    // Fallback extractWalegoLeadResponse logic si leadResponse vide
    if (!result.leadResponse) {
      const leadStatusIdx = plainText.toLowerCase().search(/\b(lead\s+status|status\s*:\s*lead|reasoning\s*:)/i);
      const contentBefore = leadStatusIdx >= 0 ? plainText.slice(0, leadStatusIdx) : plainText;
      const parts = contentBefore.split(/\n{2,}/).map(p => p.trim().replace(/\s+/g, ' ')).filter(p => p.length > 0);
      for (let i = parts.length - 1; i >= 0; i--) {
        const block = parts[i];
        if (block.length >= 1 && block.length <= 1000) {
          if (/^(bonjour|hello|hi)\s+/i.test(block) && block.length > 150) continue;
          if (/^(from:|to:|subject:)/im.test(block)) continue;
          if (/^<[a-z]|{\s*"/i.test(block)) continue;
          result.leadResponse = block;
          break;
        }
      }
      if (!result.leadResponse && contentBefore.trim().length <= 500) {
        result.leadResponse = contentBefore.trim().replace(/\s+/g, ' ') || '';
      }
    }

    // Bloc 4 — Lead Status (dans la zone après "Lead Status")
    const leadStatusZone = plainText.match(/Lead\s+Status[\s\S]*/i)?.[0] || plainText;
    result.leadStatus = (extractBlockAfterLabel(leadStatusZone, 'Status') || '').split(/\n/)[0]?.trim() || '';
    result.leadReasoning = extractBlockAfterLabel(leadStatusZone, 'Reasoning') || '';
    result.leadTips = extractBlockAfterLabel(leadStatusZone, 'Tips') || extractBlockAfterLabel(leadStatusZone, 'Tip') || '';
  } catch (err) {
    console.error('[extractWalegoLead] Error:', err);
  }

  return result;
}
