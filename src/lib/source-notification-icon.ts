/**
 * Icône affichable dans les notifs WhatsApp (Meta = texte uniquement, pas d’image).
 * Utilise `lead_sources[].icon_emoji` si défini, sinon repli par id de source (Walego, Folk, Lemlist, etc.).
 */
import { mergeLeadSourcesWithDefaults } from '@/data/lead-sources-default';
import type { LeadSource } from '@/types/lead-source';

/** Repli quand aucune config utilisateur — proche de l’identité « favicon » du domaine / outil */
const FALLBACK_ICON: Record<string, string> = {
  walego: '🟣',
  folk: '👥',
  whatsapp: '💬',
  lemlist: '📣',
  instantly: '⚡',
  apollo: '🌙',
  hunter: '🎯',
  salesloft: '🔶',
  outreach: '📡',
  woodpecker: '🪵',
  mailshake: '📧',
  reply: '↩️',
  klenty: '🔷',
  email: '✉️',
  direct: '📧',
  inbound: '📥',
  mail: '✉️',
};

const FALLBACK_LABEL: Record<string, string> = {
  walego: 'Walego',
  folk: 'Folk',
  direct: 'Email direct',
  inbound: 'Inbound',
  whatsapp: 'WhatsApp',
};

function normalizeSourceId(sourceId: string | undefined | null): string {
  return typeof sourceId === 'string' ? sourceId.trim().toLowerCase() : '';
}

export function resolveSourceIconEmoji(
  sourceId: string | undefined | null,
  leadSourcesFromApi: LeadSource[] | null | undefined
): string {
  const id = normalizeSourceId(sourceId);
  if (!id) return '📩';
  const merged = mergeLeadSourcesWithDefaults(leadSourcesFromApi ?? null);
  const exact = merged.find((s) => s.id === sourceId) ?? merged.find((s) => s.id.toLowerCase() === id);
  if (exact?.icon_emoji && String(exact.icon_emoji).trim()) {
    return String(exact.icon_emoji).trim();
  }
  return FALLBACK_ICON[id] ?? '📩';
}

export function resolveSourceDisplayName(
  sourceId: string | undefined | null,
  leadSourcesFromApi: LeadSource[] | null | undefined
): string {
  const id = normalizeSourceId(sourceId);
  if (!id) return 'Lead';
  const merged = mergeLeadSourcesWithDefaults(leadSourcesFromApi ?? null);
  const exact = merged.find((s) => s.id === sourceId) ?? merged.find((s) => s.id.toLowerCase() === id);
  if (exact?.name?.trim()) return exact.name.trim();
  return FALLBACK_LABEL[id] ?? (typeof sourceId === 'string' ? sourceId : 'Lead');
}
