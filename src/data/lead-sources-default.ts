import type { LeadSource } from '@/types/lead-source';

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
    },
    bypass_icp: true,
    base_confidence: 0.7,
    whatsapp_notify: true,
    hide_email_proposal: true,
    added_at: '2026-01-01T00:00:00.000Z',
  },
];
