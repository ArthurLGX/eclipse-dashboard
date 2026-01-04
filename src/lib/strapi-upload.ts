/**
 * @file strapi-upload.ts
 * @description Utilitaire pour uploader des fichiers vers Strapi
 */

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

export interface StrapiUploadResult {
  id: number;
  documentId: string;
  name: string;
  url: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: Record<string, unknown> | null;
  size: number;
  mime: string;
}

/**
 * Upload un fichier vers Strapi
 * @param file - Le fichier à uploader
 * @param token - Token d'authentification
 * @returns Les informations du fichier uploadé
 */
export async function uploadToStrapi(
  file: File,
  token: string
): Promise<StrapiUploadResult> {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error?.message || `Erreur ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const result = await response.json();
  
  // Strapi retourne un tableau, on prend le premier élément
  const uploadedFile = Array.isArray(result) ? result[0] : result;
  
  // S'assurer que l'URL est complète
  if (uploadedFile.url && !uploadedFile.url.startsWith('http')) {
    uploadedFile.url = `${API_URL}${uploadedFile.url}`;
  }
  
  return uploadedFile;
}

/**
 * Upload plusieurs fichiers vers Strapi
 * @param files - Les fichiers à uploader
 * @param token - Token d'authentification
 * @returns Les informations des fichiers uploadés
 */
export async function uploadMultipleToStrapi(
  files: File[],
  token: string
): Promise<StrapiUploadResult[]> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error?.message || `Erreur ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const result = await response.json();
  
  // S'assurer que les URLs sont complètes
  const uploadedFiles = Array.isArray(result) ? result : [result];
  return uploadedFiles.map((file: StrapiUploadResult) => {
    if (file.url && !file.url.startsWith('http')) {
      file.url = `${API_URL}${file.url}`;
    }
    return file;
  });
}

