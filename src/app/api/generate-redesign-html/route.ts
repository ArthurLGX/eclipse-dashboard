/**
 * @file route.ts
 * @description API route for generating HTML redesign from screenshot + prompt using Claude Vision
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const DEFAULT_PROMPT = `Tu es un expert en design web et développement front-end. Tu reçois une capture d'écran d'une page web (landing, homepage ou page produit).

Ta mission : générer un fichier HTML complet et autonome (inline CSS, pas de dépendances externes) qui correspond à une REFONTE de la page capturée, en tenant compte des instructions fournies par l'utilisateur.

Règles importantes :
1. Retourne UNIQUEMENT le code HTML, sans balises markdown (\`\`\`html ou \`\`\`).
2. Le HTML doit être valide, moderne (HTML5), responsive et esthétique.
3. Inclus tout le CSS dans une balise <style> dans le <head>.
4. Reprends la structure générale et le contenu visible sur la capture, mais applique les modifications demandées.
5. Utilise des polices web-safe ou Google Fonts (lien CDN).
6. Le design doit être professionnel et prêt à l'emploi.`;

export async function POST(request: NextRequest) {
  try {
    const { screenshot, prompt: userPrompt } = await request.json();

    if (!screenshot || typeof screenshot !== 'string') {
      return NextResponse.json(
        { error: 'screenshot_required' },
        { status: 400 }
      );
    }

    // Limite 1 Mo (base64 ~1.4M chars)
    const base64Length = screenshot.includes('base64,')
      ? screenshot.split('base64,')[1]?.length ?? 0
      : screenshot.length;
    if (base64Length > 1_400_000) {
      return NextResponse.json(
        {
          error: 'image_too_large',
          details: 'L\'image est trop volumineuse. Utilisez une capture de 1 Mo maximum.',
        },
        { status: 400 }
      );
    }

    // Extraire le base64 brut (le SDK télécharge les data URLs, il faut Buffer ou base64)
    const base64Raw = screenshot.includes('base64,')
      ? screenshot.split('base64,')[1]
      : screenshot;
    const imageBuffer = Buffer.from(base64Raw, 'base64');

    const fullPrompt = userPrompt?.trim()
      ? `${DEFAULT_PROMPT}\n\nINSTRUCTIONS DE L'UTILISATEUR :\n${userPrompt}\n\nGénère maintenant le fichier HTML complet.`
      : `${DEFAULT_PROMPT}\n\nL'utilisateur n'a pas fourni d'instructions spécifiques. Améliore l'esthétique et la structure tout en gardant le contenu. Génère le fichier HTML complet.`;

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: fullPrompt,
            },
            {
              type: 'image',
              image: imageBuffer,
            },
          ],
        },
      ],
    });

    // Extract HTML from response (remove potential markdown wrappers)
    let html = text.trim();
    const htmlMatch = html.match(/```html?([\s\S]*?)```/i);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    }
    // Ensure we have valid HTML
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      html = `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body>\n${html}\n</body>\n</html>`;
    }

    return NextResponse.json({ html });
  } catch (error) {
    console.error('[generate-redesign-html] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'generation_failed', details: message },
      { status: 500 }
    );
  }
}
