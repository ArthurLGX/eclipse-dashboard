/**
 * Nom et avatar affichés pour une automation-action (client Strapi ou contenu mail Walego/Brevo).
 */

import type { AutomationAction } from '@/types/smart-follow-up';
import { extractLeadProfileUnified } from '@/utils/extract-lead-profile';
import {
  extractWalegoAvatarFromBody,
  extractWalegoLeadName,
  extractWalegoLeadNameFromBody,
  extractWalegoLeadProfileFromPlainText,
  extractWalegoProfilePicFromPlainText,
  isWalegoPlainTextContent,
} from '@/utils/walego-lead-status';

export function resolveLeadDisplayName(action: AutomationAction): string {
  const clientName = action.client?.name?.trim();
  if (clientName) return clientName;

  const stored = (action.proposed_content as { lead_display_name?: string } | undefined)?.lead_display_name?.trim();
  if (stored) return stored;

  const subject = action.proposed_content?.subject ?? '';
  const fromSubject = extractWalegoLeadName(subject);
  if (fromSubject) return fromSubject;

  const html = action.follow_up_task?.received_email?.content_html ?? '';
  const text = action.follow_up_task?.received_email?.content_text ?? '';

  if (html) {
    const fromHtml = extractWalegoLeadNameFromBody(html);
    if (fromHtml) return fromHtml;
  }
  if (text && isWalegoPlainTextContent(text)) {
    const p = extractWalegoLeadProfileFromPlainText(text);
    if (p.name) return p.name;
  }
  if (text?.trim()) {
    const u = extractLeadProfileUnified(html || null, text, undefined);
    if (u.name) return u.name;
  }

  return 'Contact inconnu';
}

/** URL publique pour l’avatar : cache local /leads/avatars/… ou URL extraite du mail si pas encore en cache */
export function resolveLeadAvatarSrc(action: AutomationAction): string | null {
  const ap = action.avatar_path?.trim();
  if (ap) {
    if (ap.startsWith('/') || ap.startsWith('http')) return ap;
    return ap;
  }

  const html = action.follow_up_task?.received_email?.content_html ?? '';
  const text = action.follow_up_task?.received_email?.content_text ?? '';

  if (html) {
    const u = extractWalegoAvatarFromBody(html);
    if (u) return u;
  }
  if (text && isWalegoPlainTextContent(text)) {
    return extractWalegoProfilePicFromPlainText(text);
  }
  return null;
}
