/**
 * Utilitaire pour mapper les données d'un Google Sheet vers des objets TypeScript typés
 */

/**
 * Options de mapping
 */
export interface MapSheetOptions {
  /** Si true, convertit les headers en camelCase (ex: "Product Name" -> "productName") */
  camelCaseHeaders?: boolean;
  /** Si true, supprime les lignes où toutes les valeurs sont vides */
  skipEmptyRows?: boolean;
  /** Mapping personnalisé des headers (ex: { "Nom du produit": "name" }) */
  headerMapping?: Record<string, string>;
}

/**
 * Convertit une string en camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Normalise un header pour en faire une clé d'objet valide
 */
function normalizeHeader(header: string, options: MapSheetOptions): string {
  // Appliquer le mapping personnalisé si défini
  if (options.headerMapping && options.headerMapping[header]) {
    return options.headerMapping[header];
  }

  // Convertir en camelCase si demandé
  if (options.camelCaseHeaders) {
    return toCamelCase(header);
  }

  // Sinon, juste nettoyer les caractères spéciaux
  return header.trim().replace(/\s+/g, '_').toLowerCase();
}

/**
 * Mappe les données d'un sheet vers un tableau d'objets typés
 * La première ligne est utilisée comme headers
 * 
 * @param rows - Les données brutes du sheet (string[][])
 * @param options - Options de mapping
 * @returns Un tableau d'objets typés
 * 
 * @example
 * ```typescript
 * interface Product {
 *   name: string;
 *   price: string;
 *   category: string;
 * }
 * 
 * const data = await getSheetData("Produits");
 * const products = mapSheetData<Product>(data, {
 *   camelCaseHeaders: true,
 *   skipEmptyRows: true,
 * });
 * ```
 */
export function mapSheetData<T extends Record<string, string>>(
  rows: string[][],
  options: MapSheetOptions = {}
): T[] {
  const defaultOptions: MapSheetOptions = {
    camelCaseHeaders: false,
    skipEmptyRows: true,
    headerMapping: {},
    ...options,
  };

  if (!rows || rows.length === 0) {
    return [];
  }

  // La première ligne contient les headers
  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  if (headerRow.length === 0) {
    return [];
  }

  // Normaliser les headers
  const headers = headerRow.map((h) => normalizeHeader(h, defaultOptions));

  // Mapper chaque ligne de données
  const mappedData: T[] = [];

  for (const row of dataRows) {
    // Skip les lignes vides si demandé
    if (defaultOptions.skipEmptyRows) {
      const isEmptyRow = row.every((cell) => !cell || cell.trim() === '');
      if (isEmptyRow) {
        continue;
      }
    }

    // Créer l'objet pour cette ligne
    const obj: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] ?? '';
      }
    });

    mappedData.push(obj as T);
  }

  return mappedData;
}

/**
 * Mappe les données avec transformation des types
 * Permet de convertir certaines colonnes en nombres, dates, etc.
 * 
 * @param rows - Les données brutes du sheet
 * @param transformer - Fonction de transformation appliquée à chaque objet
 * @param options - Options de mapping
 * 
 * @example
 * ```typescript
 * interface Product {
 *   name: string;
 *   price: number;
 *   inStock: boolean;
 * }
 * 
 * const products = mapSheetDataWithTransform<Product>(
 *   data,
 *   (raw) => ({
 *     name: raw.name,
 *     price: parseFloat(raw.price) || 0,
 *     inStock: raw.in_stock?.toLowerCase() === 'true',
 *   }),
 *   { camelCaseHeaders: true }
 * );
 * ```
 */
export function mapSheetDataWithTransform<T, R = Record<string, string>>(
  rows: string[][],
  transformer: (raw: R) => T,
  options: MapSheetOptions = {}
): T[] {
  const rawData = mapSheetData<R & Record<string, string>>(rows, options);
  return rawData.map(transformer);
}

/**
 * Extrait uniquement certaines colonnes du sheet
 * 
 * @param rows - Les données brutes du sheet
 * @param columns - Les noms des colonnes à extraire
 * @param options - Options de mapping
 */
export function extractColumns(
  rows: string[][],
  columns: string[],
  options: MapSheetOptions = {}
): Record<string, string>[] {
  const allData = mapSheetData<Record<string, string>>(rows, options);
  
  return allData.map((row) => {
    const extracted: Record<string, string> = {};
    for (const col of columns) {
      if (col in row) {
        extracted[col] = row[col];
      }
    }
    return extracted;
  });
}

