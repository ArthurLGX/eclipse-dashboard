import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateInvoiceRequest {
  text: string;
  documentType: 'invoice' | 'quote';
  userSettings: {
    hourlyRate?: number;
    dailyRate?: number;
    defaultBillingType?: 'hour' | 'day' | 'fixed' | 'unit';
    tvaApplicable?: boolean;
    tvaRate?: number;
    currency?: string;
    companyName?: string;
    defaultPaymentDays?: number;
  };
  existingClients?: Array<{ id: number; documentId: string; name: string; enterprise?: string }>;
}

interface GeneratedInvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  unit: 'hour' | 'day' | 'fixed' | 'unit';
}

interface GeneratedInvoiceData {
  clientName?: string;
  clientEnterprise?: string;
  clientEmail?: string;
  matchedClientId?: number;
  matchedClientDocumentId?: string;
  projectTitle?: string;
  projectDescription?: string;
  lines: GeneratedInvoiceLine[];
  notes?: string;
  totalEstimate?: number;
  suggestedDueDate?: string;
  confidence: number;
  reasoning?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateInvoiceRequest = await request.json();
    const { text, documentType, userSettings, existingClients } = body;

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Le texte fourni est trop court pour être analysé' },
        { status: 400 }
      );
    }

    // Build context for the AI
    const settingsContext = buildSettingsContext(userSettings);
    const clientsContext = existingClients && existingClients.length > 0
      ? `\n\nClients existants du freelance:\n${existingClients.map(c => `- ID: ${c.id}, DocumentID: ${c.documentId}, Nom: ${c.name}${c.enterprise ? `, Entreprise: ${c.enterprise}` : ''}`).join('\n')}`
      : '';

    const documentTypeFr = documentType === 'quote' ? 'devis' : 'facture';

    const systemPrompt = `Tu es un assistant expert en facturation freelance. Tu dois analyser un texte (email, message, brief) et en extraire les informations pour créer un ${documentTypeFr}.

${settingsContext}
${clientsContext}

RÈGLES IMPORTANTES:
1. Extrais le nom du client, son entreprise si mentionnée, et son email si présent
2. Si un client existant correspond (même nom ou entreprise similaire), retourne son ID
3. Décompose le travail demandé en lignes de facturation détaillées
4. Estime les quantités (heures, jours, ou unités) de manière réaliste pour un freelance
5. Utilise les tarifs fournis dans les settings ou estime un tarif raisonnable
6. Si le type de facturation n'est pas clair, privilégie le forfait ('fixed') pour les projets complets
7. Ajoute des notes pertinentes si nécessaire (conditions, délais mentionnés, etc.)
8. Donne un score de confiance (0-100) sur l'exactitude de ton analyse

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication.`;

    const userPrompt = `Analyse ce texte et génère les données pour un ${documentTypeFr}:

"""
${text}
"""

Retourne un JSON avec cette structure exacte:
{
  "clientName": "string ou null",
  "clientEnterprise": "string ou null", 
  "clientEmail": "string ou null",
  "matchedClientId": "number ou null (si correspond à un client existant)",
  "matchedClientDocumentId": "string ou null",
  "projectTitle": "string - titre court du projet",
  "projectDescription": "string - description du projet",
  "lines": [
    {
      "description": "string - description de la prestation",
      "quantity": number,
      "unit_price": number,
      "unit": "hour" | "day" | "fixed" | "unit"
    }
  ],
  "notes": "string ou null - notes/conditions particulières extraites",
  "totalEstimate": number,
  "suggestedDueDate": "YYYY-MM-DD ou null",
  "confidence": number (0-100),
  "reasoning": "string - explication courte de ton analyse"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(
        { error: 'Aucune réponse générée par l\'IA' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let generatedData: GeneratedInvoiceData;
    try {
      // Clean the response (remove markdown code blocks if present)
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      generatedData = JSON.parse(cleanedResponse);
    } catch (_parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Erreur lors de l\'analyse de la réponse IA', raw: responseText },
        { status: 500 }
      );
    }

    // Validate and enhance the data
    const enhancedData = enhanceGeneratedData(generatedData, userSettings, documentType);

    return NextResponse.json({
      success: true,
      data: enhancedData,
      documentType,
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `Erreur OpenAI: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la génération' },
      { status: 500 }
    );
  }
}

function buildSettingsContext(settings: GenerateInvoiceRequest['userSettings']): string {
  const parts: string[] = ['Paramètres de facturation du freelance:'];

  if (settings.hourlyRate) {
    parts.push(`- Taux horaire: ${settings.hourlyRate}€/h`);
  }
  if (settings.dailyRate) {
    parts.push(`- Taux journalier: ${settings.dailyRate}€/jour`);
  }
  if (settings.defaultBillingType) {
    const typeLabels = {
      hour: 'à l\'heure',
      day: 'à la journée',
      fixed: 'au forfait',
      unit: 'à l\'unité',
    };
    parts.push(`- Mode de facturation préféré: ${typeLabels[settings.defaultBillingType]}`);
  }
  if (settings.tvaApplicable !== undefined) {
    parts.push(`- TVA applicable: ${settings.tvaApplicable ? 'Oui' : 'Non (franchise en base)'}`);
    if (settings.tvaApplicable && settings.tvaRate) {
      parts.push(`- Taux de TVA: ${settings.tvaRate}%`);
    }
  }
  if (settings.currency) {
    parts.push(`- Devise: ${settings.currency}`);
  }
  if (settings.defaultPaymentDays) {
    parts.push(`- Délai de paiement par défaut: ${settings.defaultPaymentDays} jours`);
  }

  return parts.length > 1 ? parts.join('\n') : 'Aucun paramètre de facturation défini. Estime les tarifs de manière raisonnable pour un freelance.';
}

function enhanceGeneratedData(
  data: GeneratedInvoiceData,
  settings: GenerateInvoiceRequest['userSettings'],
  _documentType: 'invoice' | 'quote'
): GeneratedInvoiceData & { 
  tvaApplicable: boolean; 
  tvaRate: number;
  currency: string;
  paymentDays: number;
} {
  // Calculate total from lines if not provided
  const calculatedTotal = data.lines.reduce(
    (sum, line) => sum + (line.quantity * line.unit_price),
    0
  );

  // Set default due date if not provided
  const paymentDays = settings.defaultPaymentDays || 30;
  const dueDate = data.suggestedDueDate || calculateDueDate(paymentDays);

  return {
    ...data,
    totalEstimate: data.totalEstimate || calculatedTotal,
    suggestedDueDate: dueDate,
    tvaApplicable: settings.tvaApplicable ?? true,
    tvaRate: settings.tvaRate ?? 20,
    currency: settings.currency || 'EUR',
    paymentDays,
  };
}

function calculateDueDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

