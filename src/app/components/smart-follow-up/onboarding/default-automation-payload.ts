import { mergeLeadSourcesWithDefaults } from '@/data/lead-sources-default';
import type { AutomationSettings } from '@/types/smart-follow-up';

/** Payload minimal pour `createAutomationSettings` (première création). */
export function getDefaultAutomationCreatePayload(): Partial<AutomationSettings> {
  return {
    enabled: true,
    auto_approve: false,
    auto_approve_threshold: 0.92,
    inbox_allowed_domains: [],
    notification_preferences: {
      email: true,
      dashboard: true,
      frequency: 'immediate',
    },
    lead_sources: mergeLeadSourcesWithDefaults(null),
  };
}
