/**
 * Prénom ou forme courte pour salutation (évite « Bonjour La » sur noms d’entreprise).
 */
export function greetingFirstName(
  fromName: string | null | undefined,
  displayName: string | null | undefined
): string {
  const article = /^(La|Le|Les|L'|The)$/i;
  const tryFirst = (s: string) => {
    const parts = s.trim().split(/\s+/).filter(Boolean);
    for (const p of parts) {
      if (!article.test(p)) return p;
    }
    return parts[0] || '';
  };

  if (fromName?.trim()) {
    const f = tryFirst(fromName);
    if (f) return f;
  }
  if (displayName?.trim()) {
    const f = tryFirst(displayName);
    if (f) return f;
  }
  return 'Contact';
}
