import type { LeadSource, LeadSourceDetection } from '@/types/lead-source';

/** Champs minimaux pour appliquer les règles lead_sources.detection */
export interface EmailLikeForLeadSource {
  from_email?: string;
  subject?: string;
  /** ex. context.source côté tâche (WhatsApp) */
  source?: string;
}

function matchesDetection(email: EmailLikeForLeadSource, d: LeadSourceDetection): boolean {
  const fromEmail = (email.from_email ?? '').toLowerCase();
  const subject = (email.subject ?? '').toLowerCase();

  const fromMatchContains =
    d.from_email_contains?.some((s) => fromEmail.includes(s.toLowerCase())) ?? false;
  const fromMatchEnds =
    d.from_email_ends_with?.some((s) => fromEmail.endsWith(s.toLowerCase())) ?? false;
  const fromMatch = fromMatchContains || fromMatchEnds;

  const subjectMatch =
    d.subject_contains?.some((s) => subject.includes(s.toLowerCase())) ?? false;

  const fieldMatch = d.source_field ? email.source === d.source_field : false;

  const mode = d.match_mode ?? 'OR';

  if (mode === 'AND') {
    return fromMatch && subjectMatch;
  }

  return fromMatch || subjectMatch || fieldMatch;
}

/**
 * Première source activée dont la détection matche (ordre du tableau).
 * Utilisé pour savoir si un mail est une « notification de lead » (bypass ICP, etc.).
 */
export function detectLeadSource(
  email: EmailLikeForLeadSource,
  leadSources: LeadSource[]
): LeadSource | null {
  for (const source of leadSources) {
    if (!source.enabled) continue;
    if (matchesDetection(email, source.detection)) {
      return source;
    }
  }
  return null;
}
