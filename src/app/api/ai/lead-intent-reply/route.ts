import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

/** Limite d’entrée pour limiter les tokens (uniquement appelé côté lead, pas sur tout le flux mail). */
const MAX_LEAD_MESSAGE_CHARS = 4500;

export interface LeadIntentReplyRequest {
  leadMessage: string;
  subject?: string;
  fromName?: string;
  contactName?: string;
  companyName?: string;
  channel?: 'email' | 'linkedin' | 'whatsapp';
  /** Signal / analyse déjà calculée (optionnel, améliore le contexte sans 2e appel) */
  signalHint?: string;
}

export interface LeadIntentPayload {
  summary: string;
  tone_tu: boolean;
  elements: string[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LeadIntentReplyRequest;
    const leadMessage = String(body.leadMessage || '').trim();
    if (leadMessage.length < 12) {
      return NextResponse.json(
        { error: 'leadMessage requis (au moins quelques mots du message du lead).' },
        { status: 400 }
      );
    }

    const truncated = leadMessage.slice(0, MAX_LEAD_MESSAGE_CHARS);
    const subject = body.subject ? String(body.subject) : '';
    const fromName = body.fromName ? String(body.fromName) : '';
    const contactName = body.contactName ? String(body.contactName) : '';
    const companyName = body.companyName ? String(body.companyName) : '';
    const channel = body.channel || 'email';
    const signalHint = body.signalHint ? String(body.signalHint).slice(0, 800) : '';

    const system = `Tu es un assistant pour un freelance / petite agence qui répond à des mails de prospects.
Tâche: (1) comprendre les intentions réelles du message (ce qu’il demande, ce qu’il a fait, le ton).
(2) rédiger UNE réponse courte en français pour le canal indiqué.

Réponds UNIQUEMENT avec un JSON valide (sans markdown) de la forme:
{"intent":{"summary":"une phrase","tone_tu":true ou false,"elements":["point concret 1","point 2"]},"draft_reply":"..."}

Règles pour intent:
- tone_tu: true si le message te tutoie clairement (tu, ton, te), sinon false (vouvoiement).
- elements: faits concrets (ex: "t'a ajouté en admin Wix", "demande un retour sur le scénario", "veut rester simple comme projet flo").

Règles pour draft_reply:
- Même registre de tutoiement/vouvoiement que le lead (si tone_tu true → tutoie).
- Répondre au fond: accès donnés, retour demandé, décision, prochaine étape — PAS une relance générique "nouvelles" ou "échéance mars" si le message parle d’autre chose.
- Courriel professionnel, chaleureux, concis (souvent 5–12 phrases max).
- Pas de guillemets englobant tout le message. Pas de "Objet:".`;

    const user = `Canal de la réponse: ${channel}
Expéditeur du mail: ${fromName || '—'}
Nom affiché contact: ${contactName || '—'}
Entreprise: ${companyName || '—'}
Objet: ${subject || '—'}
${signalHint ? `Indicateur signal (si utile): ${signalHint}
` : ''}
--- Message du lead (texte à analyser et auquel répondre) ---
${truncated}`;

    const modelOptions = { temperature: 0.35, maxOutputTokens: 900 } as const;

    const run = async () => {
      try {
        return await generateText({
          ...modelOptions,
          model: openai('gpt-4o-mini'),
          system,
          prompt: user,
        });
      } catch (openaiError) {
        const err = openaiError as { statusCode?: number; message?: string };
        if (
          (err?.statusCode === 429 || err?.message?.toLowerCase().includes('quota')) &&
          process.env.ANTHROPIC_API_KEY
        ) {
          return await generateText({
            ...modelOptions,
            model: anthropic('claude-sonnet-4-20250514') as unknown as Parameters<
              typeof generateText
            >[0]['model'],
            system,
            prompt: user,
          });
        }
        throw openaiError;
      }
    };

    const { text } = await run();
    let parsed: { intent?: LeadIntentPayload; draft_reply?: string };
    try {
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '');
      parsed = JSON.parse(cleaned) as { intent?: LeadIntentPayload; draft_reply?: string };
    } catch {
      return NextResponse.json({ error: 'Réponse IA illisible (JSON)' }, { status: 502 });
    }

    const draft = typeof parsed.draft_reply === 'string' ? parsed.draft_reply.trim() : '';
    if (!draft) {
      return NextResponse.json({ error: 'Brouillon vide' }, { status: 502 });
    }

    return NextResponse.json({
      intent: parsed.intent ?? null,
      draft_reply: draft,
    });
  } catch (error) {
    console.error('lead-intent-reply:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 });
  }
}
