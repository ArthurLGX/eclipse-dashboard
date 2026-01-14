import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { selectModel } from '@/lib/ai/router';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

interface QuoteInfo {
  reference: string;
  total: number;
  lines: { description: string; quantity: number; unit_price: number }[];
  valid_until?: string;
}

interface ClientInfo {
  name: string;
  enterprise?: string;
  email?: string;
}

interface ProjectInfo {
  title: string;
  description?: string;
  status?: string;
}

interface RequestBody {
  emailType: 'quote_send' | 'invoice_send' | 'follow_up' | 'project_update' | 'custom';
  quote?: QuoteInfo;
  client?: ClientInfo;
  project?: ProjectInfo;
  customContext?: string;
  tone?: 'formal' | 'friendly' | 'casual';
  language?: 'fr' | 'en';
  senderName?: string;
  senderCompany?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { 
      emailType, 
      quote, 
      client, 
      project, 
      customContext, 
      tone = 'friendly',
      language = 'fr',
      senderName,
      senderCompany,
    } = body;

    const model = selectModel('email-suggestion');

    const getEmailTypeInstruction = () => {
      switch (emailType) {
        case 'quote_send':
          return `Rédige un email professionnel pour ENVOYER UN DEVIS.
Objectif: présenter le devis de manière convaincante, mettre en avant la valeur.
Inclure: objet accrocheur, présentation du devis, points clés, call-to-action clair.
${quote ? `Montant du devis: ${quote.total}€ - Validité: ${quote.valid_until || '30 jours'}` : ''}`;
        
        case 'invoice_send':
          return `Rédige un email professionnel pour ENVOYER UNE FACTURE.
Objectif: rappeler les prestations réalisées, faciliter le paiement.
Inclure: objet clair, récapitulatif, modalités de paiement, remerciements.`;
        
        case 'follow_up':
          return `Rédige un email de RELANCE/SUIVI professionnel.
Objectif: reprendre contact sans être insistant, maintenir la relation.
Inclure: rappel du contexte, proposition de valeur, ouverture au dialogue.`;
        
        case 'project_update':
          return `Rédige un email de MISE À JOUR PROJET pour le client.
Objectif: tenir le client informé de l'avancement, maintenir la confiance.
Inclure: points réalisés, prochaines étapes, points d'attention éventuels.
${project ? `Projet: ${project.title} - Statut: ${project.status || 'en cours'}` : ''}`;
        
        default:
          return `Rédige un email professionnel selon le contexte fourni.
${customContext || 'Contexte non spécifié'}`;
      }
    };

    const getToneInstruction = () => {
      switch (tone) {
        case 'formal':
          return 'Ton: Formel et professionnel. Vouvoiement. Structure classique.';
        case 'casual':
          return 'Ton: Décontracté mais professionnel. Tutoiement possible. Langage simple.';
        default:
          return 'Ton: Amical et professionnel. Vouvoiement. Chaleureux mais structuré.';
      }
    };

    const systemPrompt = `Tu es un expert en communication professionnelle pour freelances.
${language === 'fr' ? 'Rédige en FRANÇAIS.' : 'Write in ENGLISH.'}

${getEmailTypeInstruction()}

${getToneInstruction()}

CONTEXTE:
${client ? `Client: ${client.name}${client.enterprise ? ` (${client.enterprise})` : ''}` : 'Client non spécifié'}
${project ? `Projet: ${project.title}` : ''}
${senderName ? `Expéditeur: ${senderName}${senderCompany ? ` - ${senderCompany}` : ''}` : ''}

${quote ? `
DÉTAIL DU DEVIS:
- Référence: ${quote.reference}
- Montant: ${quote.total}€ HT
- Prestations: ${quote.lines.map(l => l.description).join(', ')}
` : ''}

RETOURNE UN JSON VALIDE avec cette structure:
{
  "subject": "Objet de l'email accrocheur",
  "greeting": "Formule d'accroche personnalisée",
  "body": "Corps de l'email (peut contenir des sauts de ligne avec \\n)",
  "closing": "Formule de politesse",
  "cta": "Call-to-action optionnel (ex: 'Répondre pour valider')",
  "tips": ["Conseil 1 pour améliorer l'email", "Conseil 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: customContext || `Génère un email de type: ${emailType}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1500,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('L\'IA n\'a pas retourné de contenu');
    }

    const result = JSON.parse(responseContent);

    // Validate the response structure
    if (!result.subject || !result.body) {
      throw new Error('Structure de réponse invalide');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in email-suggestion API:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de l\'email',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

