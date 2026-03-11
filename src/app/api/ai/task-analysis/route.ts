import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

const schema = z.object({
  reasoning: z.string().describe("Raisonnement de l'IA sur ce lead"),
  suggestion: z.string().describe("Suggestion d'action concrète"),
});

const taskTypeLabels: Record<string, string> = {
  payment_reminder: 'rappel de paiement',
  proposal_follow_up: 'suivi de devis',
  meeting_follow_up: 'suivi de réunion',
  thank_you: 'remerciement',
  check_in: 'prise de contact',
  custom: 'action personnalisée',
};

function isQuotaExceeded(error: unknown): boolean {
  const err = error as {
    statusCode?: number;
    lastError?: { statusCode?: number; data?: { error?: { code?: string; type?: string } }; message?: string };
    message?: string;
    data?: { error?: { code?: string; type?: string } };
  };
  const last = err?.lastError;
  const msg = `${err?.message || ''} ${last?.message || ''}`.toLowerCase();
  return (
    err?.statusCode === 429 ||
    last?.statusCode === 429 ||
    err?.data?.error?.code === 'insufficient_quota' ||
    err?.data?.error?.type === 'insufficient_quota' ||
    last?.data?.error?.code === 'insufficient_quota' ||
    last?.data?.error?.type === 'insufficient_quota' ||
    msg.includes('quota') ||
    msg.includes('exceeded')
  );
}

export async function POST(req: Request) {
  try {
    const { task } = await req.json();

    if (!task) {
      return NextResponse.json({ error: 'Task data is required' }, { status: 400 });
    }

    const context = task.context || {};
    const aiAnalysis = task.ai_analysis || {};

    const prompt = `Tu es un assistant IA expert en analyse de leads et suivi commercial.

CONTEXTE DU LEAD/TÂCHE :
- Contact : ${context.from_name || task.contact?.name || 'Inconnu'}
- Email : ${context.from_email || task.contact?.email || 'N/A'}
- Sujet : ${context.original_subject || task.received_email?.subject || 'N/A'}
- Reçu le : ${context.received_at || 'N/A'}
- Type de tâche : ${taskTypeLabels[task.task_type] || task.task_type}
- Entités extraites : ${(context.extracted_entities || aiAnalysis.entities || []).join(', ') || 'Aucune'}

ANALYSE IA EXISTANTE :
- Intention détectée : ${aiAnalysis.intent || 'N/A'}
- Urgence : ${aiAnalysis.urgency || 'N/A'}
- Sentiment : ${aiAnalysis.sentiment || 'N/A'}
- Langue : ${aiAnalysis.language || 'N/A'}
- Confiance : ${aiAnalysis.confidence != null ? `${(aiAnalysis.confidence * 100).toFixed(0)}%` : 'N/A'}

DOMAINE PRIORITAIRE : Si l'email provient d'un domaine que le client a indiqué comme prioritaire (ex: walego.co, walego.com), considère ce lead comme prioritaire et recommande une action rapide.

Produis une analyse structurée en français avec :
1. RAISONNEMENT : Explique en 2-4 phrases ton analyse du lead - qui est ce contact, quel est le contexte commercial, pourquoi cette tâche a été créée, et ce que l'IA a détecté comme intention/urgence.
2. SUGGESTION : Recommande une action concrète (ex: "Relancer rapidement - lead Walego prioritaire", "Envoyer un devis personnalisé pour app/développement", "Planifier un appel de découverte"). Sois spécifique et actionnable.`;

    const options = { schema, prompt, temperature: 0.5 };

    try {
      const { object } = await generateObject({
        ...options,
        model: openai('gpt-4o'),
        maxRetries: 0,
      });
      return NextResponse.json(object);
    } catch (openaiError) {
      if (isQuotaExceeded(openaiError) && process.env.ANTHROPIC_API_KEY) {
        const { object } = await generateObject({
          ...options,
          model: anthropic('claude-sonnet-4-6') as unknown as Parameters<typeof generateObject>[0]['model'],
        });
        return NextResponse.json(object);
      }
      throw openaiError;
    }
  } catch (error) {
    console.error('Error generating task analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate task analysis' },
      { status: 500 }
    );
  }
}
