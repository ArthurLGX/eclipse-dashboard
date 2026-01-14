import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AI_MODELS } from '@/lib/ai';

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

interface DateValidationRequest {
  contractContent: string;
  contractType: string;
  today: string;
  signatureDate: string;
  language: 'fr' | 'en';
}

export async function POST(req: Request) {
  try {
    const { 
      contractContent, 
      contractType, 
      today, 
      signatureDate,
      language = 'fr' 
    }: DateValidationRequest = await req.json();

    if (!contractContent) {
      return NextResponse.json({ warnings: [] });
    }

    const openai = getOpenAIClient();

    const systemPrompt = language === 'fr' 
      ? `Tu es un expert juridique spécialisé dans la vérification des contrats.

Analyse le contenu du contrat ci-dessous et vérifie la cohérence des dates mentionnées.

Date du jour: ${today}
Date de signature du contrat: ${signatureDate}
Type de contrat: ${contractType}

Vérifie les points suivants:
1. Les dates de début de mission ne sont-elles pas déjà passées par rapport à la date du jour ?
2. Les dates de fin de mission ne sont-elles pas déjà passées ?
3. Le délai entre le début et la fin est-il réaliste pour ce type de mission ?
4. La date de signature est-elle cohérente avec les dates de mission ?
5. Y a-t-il des incohérences entre les différentes dates mentionnées ?

Réponds UNIQUEMENT en JSON avec ce format:
{
  "warnings": [
    "Description claire du problème de date 1",
    "Description claire du problème de date 2"
  ],
  "isValid": true/false
}

Si tout est correct, retourne un tableau warnings vide.
Les avertissements doivent être clairs, concis et actionables en français.`
      : `You are a legal expert specialized in contract verification.

Analyze the contract content below and check the consistency of the mentioned dates.

Today's date: ${today}
Contract signature date: ${signatureDate}
Contract type: ${contractType}

Check the following points:
1. Are the mission start dates not already in the past compared to today?
2. Are the mission end dates not already in the past?
3. Is the deadline between start and end realistic for this type of mission?
4. Is the signature date consistent with the mission dates?
5. Are there any inconsistencies between the different dates mentioned?

Respond ONLY in JSON with this format:
{
  "warnings": [
    "Clear description of date issue 1",
    "Clear description of date issue 2"
  ],
  "isValid": true/false
}

If everything is correct, return an empty warnings array.
Warnings should be clear, concise and actionable in English.`;

    const userPrompt = `Contenu du contrat à vérifier:

${contractContent}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODELS.fast.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      return NextResponse.json({ warnings: [] });
    }

    const result = JSON.parse(responseContent);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error validating contract dates:', error);
    return NextResponse.json({ warnings: [], error: 'Validation failed' });
  }
}

