/**
 * Google Sheets API Integration avec Service Account
 * 
 * ============================================
 * CONFIGURATION REQUISE
 * ============================================
 * 
 * 1. Créer un Service Account :
 *    - Aller sur https://console.cloud.google.com/
 *    - Créer un projet ou en sélectionner un existant
 *    - Aller dans "APIs & Services" > "Credentials"
 *    - Cliquer "Create Credentials" > "Service Account"
 *    - Donner un nom au service account et créer
 *    - Cliquer sur le service account créé
 *    - Onglet "Keys" > "Add Key" > "Create new key" > JSON
 *    - Télécharger le fichier JSON
 * 
 * 2. Activer l'API Google Sheets :
 *    - Aller dans "APIs & Services" > "Library"
 *    - Chercher "Google Sheets API"
 *    - Cliquer "Enable"
 * 
 * 3. Partager le Google Sheet :
 *    - Ouvrir votre Google Sheet
 *    - Cliquer "Partager"
 *    - Ajouter l'email du service account (format: xxx@project-id.iam.gserviceaccount.com)
 *    - Donner le rôle "Lecteur" (ou "Éditeur" si besoin d'écriture)
 * 
 * 4. Variables d'environnement (.env.local) :
 *    ```
 *    GOOGLE_CLIENT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
 *    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *    GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 *    ```
 *    Note: Le GOOGLE_SHEET_ID se trouve dans l'URL du sheet :
 *    https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
 * 
 * ============================================
 */

import { google, sheets_v4 } from 'googleapis';

// Types
export interface SheetInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
}

export interface GoogleSheetConfig {
  clientEmail: string;
  privateKey: string;
  sheetId: string;
}

// Singleton pour l'instance de l'API Sheets
let sheetsInstance: sheets_v4.Sheets | null = null;

/**
 * Récupère la configuration depuis les variables d'environnement
 */
function getConfig(): GoogleSheetConfig {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail) {
    throw new Error('GOOGLE_CLIENT_EMAIL is not defined in environment variables');
  }
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY is not defined in environment variables');
  }
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID is not defined in environment variables');
  }

  // Remplacer les \n échappés par de vrais retours à la ligne
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  return {
    clientEmail,
    privateKey: formattedPrivateKey,
    sheetId,
  };
}

/**
 * Initialise et retourne l'instance de l'API Google Sheets
 */
async function getSheetsInstance(): Promise<sheets_v4.Sheets> {
  if (sheetsInstance) {
    return sheetsInstance;
  }

  const config = getConfig();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  
  sheetsInstance = google.sheets({ 
    version: 'v4', 
    auth: authClient as Parameters<typeof google.sheets>[0]['auth'],
  });

  return sheetsInstance;
}

/**
 * Récupère la liste de tous les onglets du Google Sheet
 */
export async function getSheetTabs(): Promise<SheetInfo[]> {
  const config = getConfig();
  const sheets = await getSheetsInstance();

  const response = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
    fields: 'sheets.properties',
  });

  const sheetProperties = response.data.sheets || [];

  return sheetProperties.map((sheet: { properties?: { sheetId?: number; title?: string; index?: number; gridProperties?: { rowCount?: number; columnCount?: number } } }) => ({
    sheetId: sheet.properties?.sheetId ?? 0,
    title: sheet.properties?.title ?? '',
    index: sheet.properties?.index ?? 0,
    rowCount: sheet.properties?.gridProperties?.rowCount ?? 0,
    columnCount: sheet.properties?.gridProperties?.columnCount ?? 0,
  }));
}

/**
 * Récupère les données d'un onglet spécifique
 * @param sheetName - Le nom de l'onglet (ex: "Produits", "Sheet1")
 * @param range - Le range optionnel (défaut: "A1:Z1000")
 * @returns Les données sous forme de tableau 2D de strings
 */
export async function getSheetData(
  sheetName: string,
  range: string = 'A1:Z1000'
): Promise<string[][]> {
  const config = getConfig();
  const sheets = await getSheetsInstance();

  const fullRange = `${sheetName}!${range}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: fullRange,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const values = response.data.values;

  if (!values || values.length === 0) {
    return [];
  }

  // Convertir toutes les valeurs en strings
  return values.map((row: unknown[]) =>
    row.map((cell: unknown) => (cell !== null && cell !== undefined ? String(cell) : ''))
  );
}

/**
 * Récupère les données d'un onglet par son index (0-based)
 * @param sheetIndex - L'index de l'onglet (0 = premier onglet)
 * @param range - Le range optionnel (défaut: "A1:Z1000")
 */
export async function getSheetDataByIndex(
  sheetIndex: number,
  range: string = 'A1:Z1000'
): Promise<{ sheetName: string; data: string[][] }> {
  const tabs = await getSheetTabs();
  
  if (sheetIndex < 0 || sheetIndex >= tabs.length) {
    throw new Error(`Sheet index ${sheetIndex} is out of range. Available sheets: 0-${tabs.length - 1}`);
  }

  const sheetName = tabs[sheetIndex].title;
  const data = await getSheetData(sheetName, range);

  return { sheetName, data };
}

