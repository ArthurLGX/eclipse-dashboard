/**
 * Nom et avatar affichés pour une automation-action (client Strapi ou contenu mail Walego/Brevo).
 */

import type { Client } from '@/types';
import type { AutomationAction } from '@/types/smart-follow-up';
import { FAVICON_SERVICES, getFaviconDomain } from '@/lib/favicon';
import { extractLeadProfileUnified } from '@/utils/extract-lead-profile';
import {
  extractWalegoAvatarFromBody,
  extractWalegoLeadName,
  extractWalegoLeadNameFromBody,
  extractWalegoLeadProfileFromPlainText,
  extractWalegoProfilePicFromPlainText,
  isWalegoPlainTextContent,
} from '@/utils/walego-lead-status';

/** Email pour affichage / réponse (client CRM, sinon expéditeur du mail reçu, sinon brouillon). */
export function resolveLeadRecipientEmail(action: AutomationAction): string {
  return (
    action.client?.email?.trim() ||
    action.follow_up_task?.received_email?.from_email?.trim() ||
    action.proposed_content?.to?.[0]?.trim() ||
    ''
  );
}

export function resolveLeadDisplayName(action: AutomationAction): string {
  const clientName = action.client?.name?.trim();
  if (clientName) return clientName;

  const fromReceived = action.follow_up_task?.received_email?.from_name?.trim();
  if (fromReceived) return fromReceived;

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

const STRAPI_PUBLIC = process.env.NEXT_PUBLIC_STRAPI_URL || '';

/** Même logique que la page contacts : URL absolue pour `image.url`. */
export function getContactImageUrlFromClient(
  client: { image?: { url?: string } | null } | null | undefined
): string | null {
  const url = client?.image?.url;
  if (!url) return null;
  if (url.startsWith('/') || url.startsWith('http')) return url;
  return `${STRAPI_PUBLIC}${url}`;
}

function normalizeContactLookupKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type ContactAvatarLookup = {
  imageByEmail: Map<string, string>;
  imageByName: Map<string, string>;
};

/** Index email + nom normalisé → URL image (contacts chargés côté client). */
export function buildContactAvatarLookup(contacts: Client[]): ContactAvatarLookup {
  const imageByEmail = new Map<string, string>();
  const imageByName = new Map<string, string>();
  for (const c of contacts) {
    const img = getContactImageUrlFromClient(c);
    if (!img) continue;
    const email = c.email?.trim().toLowerCase();
    if (email) imageByEmail.set(email, img);
    const nk = normalizeContactLookupKey(c.name || '');
    if (nk && !imageByName.has(nk)) imageByName.set(nk, img);
  }
  return { imageByEmail, imageByName };
}

function duckduckgoFaviconForLead(action: AutomationAction): string | null {
  const email = resolveLeadRecipientEmail(action);
  const domain = getFaviconDomain(action.client?.website ?? null, email || null);
  if (!domain) return null;
  return FAVICON_SERVICES.duckduckgo(domain);
}

/**
 * Avatar tableau SFU : Walego/cache, image fiche client Strapi, contact CRM (email/nom), favicon domaine (DuckDuckGo), sinon null (Jazz dans l’UI).
 */
export function resolveLeadTableAvatarUrl(
  action: AutomationAction,
  lookup: ContactAvatarLookup | null | undefined
): { src: string | null; hasLeadPhoto: boolean } {
  const primary = resolveLeadAvatarSrc(action);
  if (primary) return { src: primary, hasLeadPhoto: true };

  const clientImg = getContactImageUrlFromClient(action.client);
  if (clientImg) return { src: clientImg, hasLeadPhoto: true };

  const email = resolveLeadRecipientEmail(action).trim().toLowerCase();
  const displayName = resolveLeadDisplayName(action);
  const nameKey = normalizeContactLookupKey(displayName);
  const nameOk = Boolean(nameKey && nameKey !== 'contact inconnu');

  if (lookup) {
    if (email && lookup.imageByEmail.has(email)) {
      return { src: lookup.imageByEmail.get(email)!, hasLeadPhoto: true };
    }
    if (nameOk && lookup.imageByName.has(nameKey)) {
      return { src: lookup.imageByName.get(nameKey)!, hasLeadPhoto: true };
    }
  }

  const fav = duckduckgoFaviconForLead(action);
  if (fav) return { src: fav, hasLeadPhoto: true };

  return { src: null, hasLeadPhoto: false };
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
