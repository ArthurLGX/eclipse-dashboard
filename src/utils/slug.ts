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
 * Génère un slug à partir d'un nom (sans ID)
 * Format: nom-slugifie
 * Exemple: "John Doe" → "john-doe"
 */
export function generateClientSlug(name: string): string {
  return slugifyText(name);
}

/**
 * Extrait le documentId d'un slug
 * Exemple: "mon-super-projet--abc123" → "abc123"
 */
export function extractIdFromSlug(slug: string): string | null {
  const parts = slug.split('--');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

