import DOMPurify, { Config } from 'dompurify';

/**
 * Configuration par défaut pour la sanitization du HTML des newsletters
 * Permet les balises de contenu typiques tout en bloquant les scripts malveillants
 */
const NEWSLETTER_CONFIG: Config = {
  ALLOWED_TAGS: [
    // Structure
    'div', 'span', 'p', 'br', 'hr',
    // Titres
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Formatage texte
    'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
    // Listes
    'ul', 'ol', 'li',
    // Liens et médias
    'a', 'img', 'video', 'source',
    // Tableaux
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Citations
    'blockquote', 'q', 'cite',
    // Code
    'pre', 'code',
  ],
  ALLOWED_ATTR: [
    // Liens
    'href', 'target', 'rel',
    // Images et vidéos
    'src', 'alt', 'title', 'width', 'height', 'controls', 'poster', 'autoplay', 'muted', 'loop',
    // Style
    'style', 'class', 'id',
    // Tableaux
    'colspan', 'rowspan', 'scope',
    // Accessibilité
    'aria-label', 'aria-hidden', 'role',
  ],
  ALLOW_DATA_ATTR: false,
  // Forcer les liens à s'ouvrir dans un nouvel onglet de façon sécurisée
  ADD_ATTR: ['target'],
  // Supprimer les attributs JavaScript
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Sanitize le contenu HTML d'une newsletter
 * Bloque les attaques XSS tout en préservant le formatage
 */
export function sanitizeNewsletterContent(html: string): string {
  if (typeof window === 'undefined') {
    // Côté serveur, retourner le HTML tel quel (DOMPurify nécessite le DOM)
    // La sanitization sera faite côté client
    return html;
  }
  
  return DOMPurify.sanitize(html, NEWSLETTER_CONFIG);
}

/**
 * Sanitize un texte simple (supprime toutes les balises HTML)
 */
export function sanitizeText(text: string): string {
  if (typeof window === 'undefined') {
    return text.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Vérifie si un contenu HTML contient des éléments potentiellement dangereux
 */
export function hasUnsafeContent(html: string): boolean {
  const dangerousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<form\b/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(html));
}

