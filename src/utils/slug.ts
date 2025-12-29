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
 * Génère un slug à partir d'un titre et d'un ID (numérique)
 * Format: titre-slugifie-id
 * Exemple: "Mon Super Projet" avec id 2 → "mon-super-projet-2"
 */
export function generateSlug(title: string, id: number | string): string {
  const slugifiedTitle = slugifyText(title);
  return `${slugifiedTitle}-${id}`;
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
 * Extrait l'ID numérique d'un slug
 * Exemple: "mon-super-projet-2" → "2"
 */
export function extractIdFromSlug(slug: string): string | null {
  const match = slug.match(/-(\d+)$/);
  return match ? match[1] : null;
}

