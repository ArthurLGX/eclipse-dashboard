import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { parseWalegoLeadStatus, formatWalegoLeadStatusForAnalysis } from '@/utils/walego-lead-status';
import { SMART_FOLLOW_UP_MAIL_SCANNER_PROMPT } from '@/lib/ai/smart-follow-up-mail-scanner-prompt';

export const maxDuration = 30;

/** Extrait la ligne ACTION du format Mail Scanner pour la suggestion */
function extractActionFromMailScannerOutput(fullOutput: string): string {
  const actionMatch = fullOutput.match(/✅\s*ACTION\s*(?:IMMÉDIATE\s*)?:?\s*([^\n]+)/);
  if (actionMatch) return actionMatch[1].trim();
  if (fullOutput.includes('Aucun signal détecté')) return 'Aucune action requise';
  return fullOutput.split('\n').filter(Boolean).pop() ?? fullOutput;
}

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
    const { task, ai_instruction, email_body, hot_lead_keywords } = await req.json();

    if (!task) {
      return NextResponse.json({ error: 'Task data is required' }, { status: 400 });
    }

    const context = task.context || {};
    const aiAnalysis = task.ai_analysis || {};
    const subject = (context.original_subject || task.received_email?.subject || '').toLowerCase();

    // Emails Walego : extraire directement le Lead Status (suggestions IA Walego) si dispo
    if (subject.includes('walego') && email_body) {
      const parsed = parseWalegoLeadStatus(email_body);
      if (parsed && (parsed.reasoning || parsed.tips)) {
        const formatted = formatWalegoLeadStatusForAnalysis(parsed);
        return NextResponse.json(formatted);
      }
    }

    const instructionBlock = ai_instruction?.trim()
      ? `\n\n---\nINSTRUCTION PERSONNALISÉE (à respecter en priorité) :\n${ai_instruction}\n`
      : '';

    const hotKeywordsBlock =
      hot_lead_keywords && Array.isArray(hot_lead_keywords) && hot_lead_keywords.length > 0
        ? `\n\n---\nMOTS-CLÉS LEAD CHAUD (configurés par l'utilisateur) : ${hot_lead_keywords.join(', ')}\nSi l'un de ces mots apparaît dans le sujet ou le corps → traiter comme LEAD CHAUD (🔴).\n`
        : '';

    const systemPrompt = SMART_FOLLOW_UP_MAIL_SCANNER_PROMPT + hotKeywordsBlock + instructionBlock;

    const userMessage = `Analyse ce mail entrant et applique le process adapté (Walego / RDV confirmé / Lead entrant).

CONTEXTE :
- Contact : ${context.from_name || task.contact?.name || 'Inconnu'}
- Email : ${context.from_email || task.contact?.email || 'N/A'}
- Sujet : ${context.original_subject || task.received_email?.subject || 'N/A'}
- Reçu le : ${context.received_at || 'N/A'}
- Type de tâche : ${taskTypeLabels[task.task_type] || task.task_type}
${(context.extracted_entities || aiAnalysis.entities || []).length > 0 ? `- Entités : ${(context.extracted_entities || aiAnalysis.entities || []).join(', ')}` : ''}

Analyse IA préalable : ${aiAnalysis.intent || 'N/A'} | Urgence : ${aiAnalysis.urgency || 'N/A'} | Sentiment : ${aiAnalysis.sentiment || 'N/A'}

---
CORPS DU MAIL :
${(email_body || task.context?.email_body || '').slice(0, 6000)}`;

    const modelOptions = { temperature: 0.4, maxRetries: 0 };

    try {
      const { text } = await generateText({
        ...modelOptions,
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: userMessage,
      });

      const reasoning = text.trim();
      const suggestion = extractActionFromMailScannerOutput(reasoning);
      return NextResponse.json({ reasoning, suggestion });
    } catch (openaiError) {
      if (isQuotaExceeded(openaiError) && process.env.ANTHROPIC_API_KEY) {
        const { text } = await generateText({
          ...modelOptions,
          model: anthropic('claude-sonnet-4-20250514') as unknown as Parameters<typeof generateText>[0]['model'],
          system: systemPrompt,
          prompt: userMessage,
        });
        const reasoning = text.trim();
        const suggestion = extractActionFromMailScannerOutput(reasoning);
        return NextResponse.json({ reasoning, suggestion });
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
