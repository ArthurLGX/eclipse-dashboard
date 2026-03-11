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
  // "Prise de nouvelles - New Lead with Walego: Gaëtan Balawe from" → "Gaëtan Balawe"
  const match = subject.match(/(?:New Lead with )?Walego\s*:\s*([^\n]+?)\s+from/i);
  if (match) return match[1].trim();
  return null;
}

export interface WalegoLeadStatus {
  status?: string;
  reasoning?: string;
  tips?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
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
