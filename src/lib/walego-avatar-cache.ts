/**
 * Télécharge et met en cache les photos de profil LinkedIn extraites des mails Walego.
 * Les URLs passent par un proxy et expirent rapidement - on les stocke localement.
 */

import fs from 'node:fs';
import path from 'node:path';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'leads', 'avatars');

/**
 * Télécharge l'image depuis l'URL et la stocke dans public/leads/avatars/{leadId}.{ext}
 * @param url - URL de l'image (peut expirer)
 * @param leadId - ID du lead pour nommer le fichier (documentId ou id)
 * @returns Le chemin public /leads/avatars/{leadId}.jpg ou null en cas d'erreur
 */
export async function downloadAndCacheProfilePic(
  url: string,
  leadId: string
): Promise<string | null> {
  if (!url?.trim() || !leadId?.trim()) return null;

  const sanitizedLeadId = leadId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!sanitizedLeadId) return null;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EclipseDashboard/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[walego-avatar] Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const isPng = contentType.includes('image/png');
    const ext = isPng ? 'png' : 'jpg';
    const filename = `${sanitizedLeadId}.${ext}`;
    const dirPath = AVATARS_DIR;
    const filePath = path.join(dirPath, filename);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return `/leads/avatars/${filename}`;
  } catch (error) {
    console.error('[walego-avatar] Error downloading profile pic:', error);
    return null;
  }
}
