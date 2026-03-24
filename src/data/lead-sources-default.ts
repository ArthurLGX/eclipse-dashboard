import type { LeadSource } from '@/types/lead-source';

/** Ordre d’affichage des sources natives — toujours fusionnées avec les données API */
export const NATIVE_SOURCE_IDS = ['walego', 'folk', 'whatsapp'] as const;

/**
 * Garantit Walego, Folk et WhatsApp même si une sauvegarde partielle les a omis.
 * Fusionne les champs utilisateur (enabled, detection) par-dessus les défauts.
 */
export function mergeLeadSourcesWithDefaults(fromApi: LeadSource[] | null | undefined): LeadSource[] {
  const merged = new Map<string, LeadSource>();

  for (const d of DEFAULT_LEAD_SOURCES) {
    merged.set(d.id, { ...d });
  }

  for (const s of fromApi ?? []) {
    const base = DEFAULT_LEAD_SOURCES.find((d) => d.id === s.id);
    if (base) {
      merged.set(s.id, {
        ...base,
        ...s,
        detection: { ...base.detection, ...s.detection },
      });
    } else {
      merged.set(s.id, { ...s });
    }
  }

  const natives = NATIVE_SOURCE_IDS.map((id) => merged.get(id)).filter((s): s is LeadSource => Boolean(s));
  const customIds = [...merged.keys()].filter(
    (id) => !NATIVE_SOURCE_IDS.includes(id as (typeof NATIVE_SOURCE_IDS)[number])
  );
  const customs = customIds
    .map((id) => merged.get(id)!)
    .sort((a, b) => a.added_at.localeCompare(b.added_at));
  return [...natives, ...customs];
}

export const DEFAULT_LEAD_SOURCES: LeadSource[] = [
  {
    id: 'walego',
    name: 'Walego',
    favicon_url: 'https://icons.duckduckgo.com/ip3/walego.co.ico',
    domain: 'walego.co',
    enabled: true,
    detection: {
      from_email_contains: ['walego.co', 'walego.com'],
      subject_contains: ['new lead with walego', 'new lead identified'],
      match_mode: 'OR',
    },
    bypass_icp: true,
    base_confidence: 0.7,
    whatsapp_notify: true,
    hide_email_proposal: true,
    added_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'folk',
    name: 'Folk',
    favicon_url: 'https://icons.duckduckgo.com/ip3/folk.app.ico',
    domain: 'folk.app',
    enabled: true,
    detection: {
      from_email_contains: ['folk.app', 'folk.com'],
      subject_contains: [
        'new message',
        'new reply',
        'replied to your',
        'has replied',
        'someone replied',
      ],
      match_mode: 'AND',
    },
    bypass_icp: true,
    base_confidence: 0.7,
    whatsapp_notify: true,
    hide_email_proposal: true,
    added_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    favicon_url: 'https://icons.duckduckgo.com/ip3/whatsapp.com.ico',
    domain: 'whatsapp.com',
    enabled: true,
    detection: {
      from_email_ends_with: ['@whatsapp'],
      source_field: 'whatsapp',
      match_mode: 'OR',
    },
    bypass_icp: true,
    base_confidence: 0.7,
    whatsapp_notify: true,
    hide_email_proposal: true,
    added_at: '2026-01-01T00:00:00.000Z',
  },
];
