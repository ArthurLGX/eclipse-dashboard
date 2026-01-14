/**
 * API Route : Détection d'alertes de dérive
 * POST /api/ai/project-alerts
 * 
 * Appelé périodiquement ou à chaque mise à jour du time tracking
 * pour détecter les risques de dépassement
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectProjectAlerts, prepareProjectData } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { project, tasks } = body;

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
      0 // Pas besoin du montant facturé pour les alertes
    );

    // Détecter les alertes
    const result = await detectProjectAlerts(analysisInput);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in project-alerts API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to detect alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

