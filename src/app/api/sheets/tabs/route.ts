/**
 * API Route pour récupérer la liste des onglets d'un Google Sheet
 * 
 * GET /api/sheets/tabs
 * 
 * Retourne la liste de tous les onglets avec leurs métadonnées
 */

import { NextResponse } from 'next/server';
import { getSheetTabs } from '@/lib/googleSheet';

export async function GET() {
  try {
    const tabs = await getSheetTabs();

    return NextResponse.json({
      success: true,
      data: tabs,
      meta: {
        totalTabs: tabs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching sheet tabs:', error);

    if (error instanceof Error) {
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
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sheet tabs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

