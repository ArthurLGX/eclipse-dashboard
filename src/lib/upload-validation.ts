/**
 * Utilitaires de validation pour les uploads de fichiers
 * Protection contre les fichiers malveillants
 */

// Types MIME autorisés pour les images
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Types MIME autorisés pour les vidéos
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

// Extensions autorisées
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

// Limites de taille (en bytes)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valide un fichier image
 */
export function validateImageFile(file: File): ValidationResult {
  // Vérifier le type MIME
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${file.type}. Types autorisés: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Vérifier l'extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Extension non autorisée: ${extension}. Extensions autorisées: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    };
  }

  // Vérifier la taille
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: ${MAX_IMAGE_SIZE / 1024 / 1024} MB`,
    };
  }

  // Vérifier que le nom ne contient pas de caractères dangereux
  if (hasUnsafeFilename(file.name)) {
    return {
      valid: false,
      error: 'Nom de fichier non valide',
    };
  }

  return { valid: true };
}

/**
 * Valide un fichier vidéo
 */
export function validateVideoFile(file: File): ValidationResult {
  // Vérifier le type MIME
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${file.type}. Types autorisés: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
    };
  }

  // Vérifier l'extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Extension non autorisée: ${extension}. Extensions autorisées: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`,
    };
  }

  // Vérifier la taille
  if (file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: ${MAX_VIDEO_SIZE / 1024 / 1024} MB`,
    };
  }

  // Vérifier que le nom ne contient pas de caractères dangereux
  if (hasUnsafeFilename(file.name)) {
    return {
      valid: false,
      error: 'Nom de fichier non valide',
    };
  }

  return { valid: true };
}

/**
 * Vérifie si un nom de fichier contient des caractères dangereux
 */
function hasUnsafeFilename(filename: string): boolean {
  // Patterns dangereux dans les noms de fichiers
  const unsafePatterns = [
    /\.\./,           // Path traversal
    /[<>:"|?*]/,      // Caractères Windows interdits
    /^\.htaccess$/i,  // Fichiers serveur
    /^\.env/i,        // Fichiers de config
    /\.php$/i,        // Scripts PHP
    /\.exe$/i,        // Exécutables
    /\.sh$/i,         // Scripts shell
    /\.bat$/i,        // Scripts batch
    /\.cmd$/i,        // Scripts Windows
    /\.ps1$/i,        // PowerShell
    /\.js$/i,         // JavaScript (sauf si autorisé)
  ];

  return unsafePatterns.some(pattern => pattern.test(filename));
}

/**
 * Génère un nom de fichier sécurisé
 */
export function sanitizeFilename(filename: string): string {
  // Extraire l'extension
  const parts = filename.split('.');
  const extension = parts.pop()?.toLowerCase() || '';
  const name = parts.join('.');

  // Nettoyer le nom
  const cleanName = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // Remplacer les caractères spéciaux
    .replace(/_+/g, '_')              // Éviter les underscores multiples
    .substring(0, 100);               // Limiter la longueur

  // Ajouter un timestamp pour l'unicité
  const timestamp = Date.now();

  return `${cleanName}_${timestamp}.${extension}`;
}

