/**
 * API Route pour récupérer les produits depuis Google Sheets
 * 
 * GET /api/sheets/products
 * 
 * Retourne la liste des produits depuis l'onglet "Produits" du Google Sheet configuré
 */

import { NextResponse } from 'next/server';
import { getSheetData, getSheetTabs } from '@/lib/googleSheet';
import { mapSheetDataWithTransform } from '@/lib/mapSheet';

// ============================================
// Interface TypeScript pour les produits
// ============================================
// Correspond à un Google Sheet avec les colonnes :
// | name | price | category |
// ============================================

export interface Product {
  name: string;
  price: number;
  category: string;
}

// Interface des données brutes du sheet
interface ProductRaw {
  name: string;
  price: string;
  category: string;
}

/**
 * GET /api/sheets/products
 * 
 * Query params optionnels :
 * - sheet: Nom de l'onglet (défaut: "Produits")
 */
export async function GET(request: Request) {
  try {
    // Récupérer le nom de l'onglet depuis les query params
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet') || 'Produits';

    // Vérifier que l'onglet existe
    const tabs = await getSheetTabs();
    const tabExists = tabs.some((tab) => tab.title === sheetName);

    if (!tabExists) {
      return NextResponse.json(
        {
          success: false,
          error: `Sheet "${sheetName}" not found`,
          availableSheets: tabs.map((t) => t.title),
        },
        { status: 404 }
      );
    }

    // Récupérer les données du sheet
    const rawData = await getSheetData(sheetName);

    // Vérifier si le sheet est vide
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Sheet is empty',
        meta: {
          sheetName,
          rowCount: 0,
        },
      });
    }

    // Vérifier si le sheet ne contient que des headers
    if (rawData.length === 1) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Sheet contains only headers, no data rows',
        meta: {
          sheetName,
          headers: rawData[0],
          rowCount: 0,
        },
      });
    }

    // Mapper les données avec transformation des types
    const products = mapSheetDataWithTransform<Product, ProductRaw>(
      rawData,
      (raw) => ({
        name: raw.name?.trim() || '',
        price: parseFloat(raw.price) || 0,
        category: raw.category?.trim() || '',
      }),
      {
        camelCaseHeaders: true,
        skipEmptyRows: true,
      }
    );

    // Filtrer les produits sans nom
    const validProducts = products.filter((p) => p.name.length > 0);

    return NextResponse.json({
      success: true,
      data: validProducts,
      meta: {
        sheetName,
        totalRows: rawData.length - 1, // -1 pour le header
        validProducts: validProducts.length,
        headers: rawData[0],
      },
    });
  } catch (error) {
    console.error('Error fetching products from Google Sheets:', error);

    // Gérer les erreurs spécifiques
    if (error instanceof Error) {
      // Erreur de configuration
      if (error.message.includes('is not defined')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google Sheets configuration error',
            details: error.message,
          },
          { status: 500 }
        );
      }

      // Erreur d'authentification
      if (error.message.includes('invalid_grant') || error.message.includes('Invalid JWT')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google authentication failed. Check your service account credentials.',
          },
          { status: 401 }
        );
      }

      // Sheet non trouvé ou non partagé
      if (error.message.includes('not found') || error.message.includes('403')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Sheet not accessible. Make sure it is shared with the service account email.',
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data from Google Sheets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


