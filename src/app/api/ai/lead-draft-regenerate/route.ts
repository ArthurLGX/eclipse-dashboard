import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

interface RequestBody {
  leadName: string;
  leadTitle?: string;
  leadResponse: string;
  channel: 'linkedin' | 'email' | 'whatsapp';
  analysis?: {
    signal?: string;
    action?: string;
    fogRisk?: boolean;
  };
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { leadName, leadTitle, leadResponse, channel, analysis } = body;

    if (!leadName || !leadResponse) {
      return NextResponse.json(
        { error: 'leadName et leadResponse requis' },
        { status: 400 }
      );
    }

    const channelLabel =
      channel === 'linkedin'
        ? 'LinkedIn'
        : channel === 'email'
          ? 'Email'
          : 'WhatsApp';

    const systemPrompt = `Tu es un assistant commercial expert. Tu génères des messages courts et personnalisés pour répondre à un lead.
RÈGLES STRICTES:
- Le message est TOUJOURS adressé au lead (${leadName}), jamais à Walego ni à un système.
- Ton direct, professionnel, chaleureux.
- Max 2-3 phrases pour LinkedIn/WhatsApp, un peu plus pour Email si pertinent.
- Utilise le prénom du lead.
- Pas de guillemets autour du message.
- Réponds UNIQUEMENT avec le texte du message, sans introduction ni métadonnées.`;

    const userPrompt = `Génère un message ${channelLabel} pour ${leadName}${leadTitle ? ` (${leadTitle})` : ''}.

Réponse du lead: "${leadResponse}"
${analysis?.signal ? `\nSignal détecté: ${analysis.signal}` : ''}
${analysis?.action ? `\nAction recommandée: ${analysis.action}` : ''}
${analysis?.fogRisk ? '\nRisque fog élevé — propose des créneaux précis si pertinent.' : ''}

Message à envoyer (texte brut uniquement):`;

    const modelOptions = { temperature: 0.6, maxRetries: 0 };

    try {
      const { text } = await generateText({
        ...modelOptions,
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: userPrompt,
      });

      const draft = text.trim().replace(/^["']|["']$/g, '');
      return NextResponse.json({ draft });
    } catch (openaiError) {
      const err = openaiError as { statusCode?: number; message?: string };
      if (
        (err?.statusCode === 429 || err?.message?.toLowerCase().includes('quota')) &&
        process.env.ANTHROPIC_API_KEY
      ) {
        const { text } = await generateText({
          ...modelOptions,
          model: anthropic('claude-sonnet-4-20250514') as unknown as Parameters<typeof generateText>[0]['model'],
          system: systemPrompt,
          prompt: userPrompt,
        });
        const draft = text.trim().replace(/^["']|["']$/g, '');
        return NextResponse.json({ draft });
      }
      throw openaiError;
    }
  } catch (error) {
    console.error('Error in lead-draft-regenerate:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la régénération du draft' },
      { status: 500 }
    );
  }
}
