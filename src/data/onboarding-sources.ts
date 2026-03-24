import { KNOWN_SOURCES } from '@/data/known-sources';
import { DEFAULT_LEAD_SOURCES } from '@/data/lead-sources-default';

/** Liste d’affichage onboarding (étape 3) — id, nom, domaine */
export interface OnboardingSourceItem {
  id: string;
  name: string;
  domain: string;
}

const seen = new Set<string>();
const list: OnboardingSourceItem[] = [];

for (const s of DEFAULT_LEAD_SOURCES) {
  if (!seen.has(s.id)) {
    seen.add(s.id);
    list.push({ id: s.id, name: s.name, domain: s.domain });
  }
}
for (const k of KNOWN_SOURCES) {
  if (!seen.has(k.id)) {
    seen.add(k.id);
    list.push({ id: k.id, name: k.name, domain: k.domain });
  }
}

export const ONBOARDING_SOURCE_ITEMS: OnboardingSourceItem[] = list;
