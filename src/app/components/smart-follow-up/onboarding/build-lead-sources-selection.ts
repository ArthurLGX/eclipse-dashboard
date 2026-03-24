import { KNOWN_SOURCES } from '@/data/known-sources';
import { mergeLeadSourcesWithDefaults } from '@/data/lead-sources-default';
import type { LeadSource } from '@/types/lead-source';

function knownToLeadSource(k: (typeof KNOWN_SOURCES)[number]): LeadSource {
  return {
    id: k.id,
    name: k.name,
    domain: k.domain,
    favicon_url: `https://icons.duckduckgo.com/ip3/${k.domain}.ico`,
    enabled: true,
    detection: k.detection,
    bypass_icp: true,
    base_confidence: 0.7,
    whatsapp_notify: true,
    hide_email_proposal: false,
    added_at: new Date().toISOString(),
  };
}

/** Sources SFU avec `enabled` selon la sélection onboarding */
export function buildLeadSourcesForOnboarding(selectedIds: string[]): LeadSource[] {
  const merged = mergeLeadSourcesWithDefaults(null);
  const byId = new Map<string, LeadSource>(merged.map((s) => [s.id, s]));
  for (const k of KNOWN_SOURCES) {
    if (!byId.has(k.id)) {
      byId.set(k.id, knownToLeadSource(k));
    }
  }
  return [...byId.values()].map((s) => ({
    ...s,
    enabled: selectedIds.includes(s.id),
  }));
}
