import { randomUUID } from 'crypto';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { getApiKeysForRequest } from '@/lib/ai/get-api-keys-for-request';

export const maxDuration = 30;

const LOG_PREFIX = '[lead-intent-reply]';

function logInfo(requestId: string, message: string, meta?: Record<string, unknown>) {
  console.info(LOG_PREFIX, requestId, message, meta ?? '');
}

function logError(requestId: string, message: string, err: unknown, meta?: Record<string, unknown>) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(LOG_PREFIX, requestId, message, {
    ...meta,
    name: e.name,
    message: e.message,
    stack: e.stack?.split('\n').slice(0, 6).join(' | '),
    cause: e.cause instanceof Error ? e.cause.message : e.cause,
  });
}

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
  const requestId = randomUUID();
  try {
    const body = (await req.json()) as LeadIntentReplyRequest;
    const leadMessage = String(body.leadMessage || '').trim();
    if (leadMessage.length < 12) {
      logInfo(requestId, 'validation_failed', { reason: 'leadMessage_too_short', len: leadMessage.length });
      return NextResponse.json(
        { error: 'leadMessage requis (au moins quelques mots du message du lead).', requestId },
        { status: 400 }
      );
    }

    logInfo(requestId, 'request', {
      leadLen: Math.min(leadMessage.length, MAX_LEAD_MESSAGE_CHARS),
      channel: body.channel || 'email',
      hasAuthHeader: Boolean(req.headers.get('authorization')?.trim()),
    });

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

    const keysResult = await getApiKeysForRequest(req.headers.get('authorization'));
    if ('error' in keysResult) {
      logInfo(requestId, 'getApiKeysForRequest', { ok: false, keysError: keysResult.error });
    }
    const envOpenai = process.env.OPENAI_API_KEY || null;
    const envAnthropic = process.env.ANTHROPIC_API_KEY || null;

    let openaiKey = envOpenai;
    let anthropicKey = envAnthropic;
    if (!('error' in keysResult)) {
      if (keysResult.keys.openaiKey) openaiKey = keysResult.keys.openaiKey;
      if (keysResult.keys.anthropicKey) anthropicKey = keysResult.keys.anthropicKey;
    }

    logInfo(requestId, 'providers', {
      hasOpenAI: Boolean(openaiKey),
      hasAnthropic: Boolean(anthropicKey),
      userKeysResolved: !('error' in keysResult),
    });

    if (!openaiKey && !anthropicKey) {
      logError(requestId, 'no_api_keys', new Error('no_openai_no_anthropic'), {});
      return NextResponse.json(
        {
          error:
            'Aucune clé IA disponible. Définissez OPENAI_API_KEY (ou clés OpenAI dans le profil utilisateur).',
          requestId,
        },
        { status: 503 }
      );
    }

    const openaiProvider = openaiKey ? createOpenAI({ apiKey: openaiKey }) : null;
    const anthropicProvider = anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;

    const modelOptions = { temperature: 0.35, maxRetries: 0 } as const;

    const run = async () => {
      if (openaiProvider) {
        try {
          return await generateText({
            ...modelOptions,
            model: openaiProvider('gpt-4o-mini'),
            system,
            prompt: user,
          });
        } catch (openaiError) {
          const err = openaiError as { statusCode?: number; message?: string };
          const quota =
            err?.statusCode === 429 || err?.message?.toLowerCase().includes('quota');
          if (quota && anthropicProvider) {
            logInfo(requestId, 'openai_quota_fallback_anthropic', {});
            return await generateText({
              ...modelOptions,
              model: anthropicProvider('claude-sonnet-4-20250514'),
              system,
              prompt: user,
            });
          }
          logError(requestId, 'openai_generate_failed', openaiError, { quotaFallback: false });
          throw openaiError;
        }
      }
      if (anthropicProvider) {
        return await generateText({
          ...modelOptions,
          model: anthropicProvider('claude-sonnet-4-20250514'),
          system,
          prompt: user,
        });
      }
      throw new Error('Aucun provider IA');
    };

    logInfo(requestId, 'generateText_start', {});
    const { text } = await run();
    logInfo(requestId, 'generateText_ok', { responseChars: text?.length ?? 0 });

    let parsed: { intent?: LeadIntentPayload; draft_reply?: string };
    try {
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '');
      parsed = JSON.parse(cleaned) as { intent?: LeadIntentPayload; draft_reply?: string };
    } catch (parseErr) {
      logError(requestId, 'json_parse_failed', parseErr, {
        preview: text?.slice(0, 200),
      });
      return NextResponse.json(
        { error: 'Réponse IA illisible (JSON)', requestId },
        { status: 502 }
      );
    }

    const draft = typeof parsed.draft_reply === 'string' ? parsed.draft_reply.trim() : '';
    if (!draft) {
      logInfo(requestId, 'empty_draft', { hasIntent: Boolean(parsed.intent) });
      return NextResponse.json({ error: 'Brouillon vide', requestId }, { status: 502 });
    }

    logInfo(requestId, 'success', { draftChars: draft.length });
    return NextResponse.json({
      intent: parsed.intent ?? null,
      draft_reply: draft,
      requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(requestId, 'unhandled', error, {});
    const exposeDetail =
      process.env.NODE_ENV === 'development' || process.env.AI_ROUTE_ERROR_DETAIL === '1';
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération',
        requestId,
        ...(exposeDetail ? { detail: message } : {}),
      },
      { status: 500 }
    );
  }
}
