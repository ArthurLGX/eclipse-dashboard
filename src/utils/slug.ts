/**
 * Slugifie un texte
 */
export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, '') // Supprime les tirets en début et fin
    .substring(0, 50); // Limite la longueur
}

/**
 * Génère un slug à partir d'un titre et d'un documentId (stable)
 * Format: titre-slugifie--documentId
 * Exemple: "Mon Super Projet" avec documentId "abc123" → "mon-super-projet--abc123"
 * Note: Double tiret pour séparer le titre du documentId
 */
export function generateSlug(title: string, documentId: string): string {
  const slugifiedTitle = slugifyText(title);
  return `${slugifiedTitle}--${documentId}`;
}

/**
 * Génère un slug à partir d'un nom et d'un documentId (stable)
 * Format: nom-slugifie--documentId
 * Exemple: "John Doe" avec documentId "abc123" → "john-doe--abc123"
 * Si pas de documentId, retourne juste le nom slugifié (rétrocompatibilité)
 */
export function generateClientSlug(name: string, documentId?: string): string {
  const slugifiedName = slugifyText(name);
  return documentId ? `${slugifiedName}--${documentId}` : slugifiedName;
}

/**
 * Extrait le documentId d'un slug
 * Exemple: "mon-super-projet--abc123" → "abc123"
 */
export function extractIdFromSlug(slug: string): string | null {
  const parts = slug.split('--');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

