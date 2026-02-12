import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action data is required' },
        { status: 400 }
      );
    }

    const taskTypeLabels: Record<string, string> = {
      'payment_reminder': 'rappel de paiement',
      'proposal_follow_up': 'suivi de devis',
      'meeting_follow_up': 'suivi de réunion',
      'thank_you': 'remerciement',
      'check_in': 'prise de contact',
      'custom': 'action personnalisée',
    };

    const prompt = `Tu es un assistant IA qui analyse des actions automatisées de suivi client.

Contexte de l'action :
- Contact : ${action.client}
- Type : ${taskTypeLabels[action.taskType] || action.taskType}
- Score de confiance : ${(action.confidence * 100).toFixed(0)}%
- Date de création : ${new Date(action.createdAt).toLocaleDateString('fr-FR')}

Sujet de l'email proposé :
${action.subject}

Corps de l'email proposé :
${action.body.substring(0, 1000)}

Génère un résumé concis en 3-4 phrases qui explique :
1. Le contexte et l'objectif de cette action
2. Les points clés du message
3. Une recommandation (approuver tel quel, modifier certains points, ou rejeter)

Sois direct, professionnel et utile. Réponds en français.`;

    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      temperature: 0.7,
    });

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
