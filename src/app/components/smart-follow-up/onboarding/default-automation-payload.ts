import { mergeLeadSourcesWithDefaults } from '@/data/lead-sources-default';
import type { AutomationSettings } from '@/types/smart-follow-up';

/** Payload minimal pour `createAutomationSettings` (première création). */
export function getDefaultAutomationCreatePayload(): Partial<AutomationSettings> {
  return {
    enabled: true,
    auto_approve: false,
    priority_keywords: [],
    excluded_domains: [],
    delay_settings: {
      payment_reminder: 7,
      proposal_follow_up: 3,
      meeting_follow_up: 1,
      thank_you: 3,
      check_in: 30,
    },
    work_hours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Europe/Paris',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    notification_preferences: {
      email: true,
      dashboard: true,
      frequency: 'immediate',
    },
    custom_rules: [],
    icp_settings: {
      enabled: true,
      min_score_threshold: 8,
      types_enabled: { freelance: true, agence: true, b2b: true, b2c: false },
      keywords: {
        freelance: ['freelance', 'indépendant'],
        agence: ['agence', 'agency'],
        b2b: ['entreprise', 'business'],
        b2c: ['client'],
        professional: ['projet', 'devis'],
      },
      require_response_thread: false,
      boost_responses: true,
    },
    lead_sources: mergeLeadSourcesWithDefaults(null),
  };
}
