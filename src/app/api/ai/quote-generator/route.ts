import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { selectModel } from '@/lib/ai/router';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

interface ClientInfo {
  id: number;
  documentId: string;
  name: string;
  enterprise?: string;
  email?: string;
}

interface RequestBody {
  prompt: string;
  documentType: 'invoice' | 'quote';
  existingClient?: {
    name: string;
    enterprise?: string;
    email?: string;
  };
  existingProjectTitle?: string;
  clients: ClientInfo[];
  userContext: {
    defaultTvaRate: number;
    defaultCurrency: string;
    defaultPaymentDays: number;
  };
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { prompt, documentType, existingClient, existingProjectTitle, clients, userContext } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le prompt est requis' },
        { status: 400 }
      );
    }

    const model = selectModel('quote-generator');

    const systemPrompt = `Tu es un expert en facturation et devis pour freelances développeurs web.
Tu dois analyser la description d'un projet et proposer une structure de ${documentType === 'quote' ? 'devis' : 'facture'} détaillée.

RÈGLES IMPORTANTES:
- Décompose le projet en lignes de facturation claires et professionnelles
- Estime des prix réalistes basés sur le marché français du développement web
- Utilise des unités appropriées (heure, jour, forfait, unité)
- Les prix sont en HT (hors taxes)
- Sois précis et détaillé dans les descriptions
- Si un client est mentionné ou fourni, identifie-le
- Si un projet est mentionné, propose un titre approprié

CONTEXTE UTILISATEUR:
- Taux TVA par défaut: ${userContext.defaultTvaRate}%
- Devise: ${userContext.defaultCurrency}
- Délai de paiement: ${userContext.defaultPaymentDays} jours

${existingClient ? `CLIENT EXISTANT: ${existingClient.name}${existingClient.enterprise ? ` (${existingClient.enterprise})` : ''}` : ''}
${existingProjectTitle ? `PROJET EXISTANT: ${existingProjectTitle}` : ''}
${clients.length > 0 ? `CLIENTS CONNUS: ${clients.map(c => c.name).join(', ')}` : ''}

Tu dois retourner un JSON valide avec cette structure exacte:
{
  "client": {
    "name": "Nom du client si détecté",
    "enterprise": "Entreprise si détectée",
    "email": "Email si détecté"
  },
  "project": {
    "title": "Titre du projet",
    "description": "Description courte du projet"
  },
  "lines": [
    {
      "description": "Description détaillée de la prestation",
      "quantity": 1,
      "unit_price": 500,
      "unit": "forfait"
    }
  ],
  "notes": "Notes ou conditions particulières",
  "tva_applicable": true,
  "tva_rate": 20,
  "currency": "EUR",
  "due_days": 30,
  "confidence": 0.85,
  "reasoning": "Explication courte de la logique de tarification"
}`;

    const completion = await openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('L\'IA n\'a pas retourné de contenu');
    }

    const result = JSON.parse(responseContent);

    // Validate the response structure
    if (!result.lines || !Array.isArray(result.lines) || result.lines.length === 0) {
      throw new Error('Structure de réponse invalide: lignes manquantes');
    }

    // Ensure all lines have required fields
    result.lines = result.lines.map((line: { description?: string; quantity?: number; unit_price?: number; unit?: string }) => ({
      description: line.description || 'Prestation',
      quantity: line.quantity || 1,
      unit_price: line.unit_price || 0,
      unit: line.unit || 'unité',
    }));

    // Ensure confidence is a valid number
    result.confidence = Math.min(1, Math.max(0, result.confidence || 0.7));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in quote-generator API:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du devis',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

