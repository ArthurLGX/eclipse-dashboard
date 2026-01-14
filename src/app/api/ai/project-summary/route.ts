/**
 * API Route : Bilan de rentabilité d'un projet
 * POST /api/ai/project-summary
 * 
 * Appelé quand un projet est marqué comme "terminé"
 * ou manuellement depuis la page projet
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeProjectProfitability, prepareProjectData } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { project, tasks, invoicedAmount, options } = body;

    if (!project || !tasks) {
      return NextResponse.json(
        { error: 'Missing required fields: project, tasks' },
        { status: 400 }
      );
    }

    // Préparer les données pour l'analyse
    const analysisInput = prepareProjectData(
      project,
      tasks,
      invoicedAmount || 0
    );

    // Analyser la rentabilité
    const result = await analyzeProjectProfitability(analysisInput, options);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in project-summary API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

