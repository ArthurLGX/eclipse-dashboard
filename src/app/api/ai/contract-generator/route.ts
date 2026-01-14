import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { selectModel } from '@/lib/ai/router';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

interface UserProfile {
  name: string;
  company?: string;
  siret?: string;
  address?: string;
  email?: string;
  phone?: string;
  activity?: string; // Ex: "Développeur web freelance"
}

interface ClientInfo {
  name: string;
  enterprise?: string;
  siret?: string;
  address?: string;
  email?: string;
}

interface ProjectInfo {
  title: string;
  description?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  deliverables?: string[];
}

interface RequestBody {
  contractType: 'service' | 'nda' | 'maintenance' | 'cgv' | 'custom';
  userProfile: UserProfile;
  client?: ClientInfo;
  project?: ProjectInfo;
  customClauses?: string[];
  language?: 'fr' | 'en';
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { 
      contractType, 
      userProfile, 
      client, 
      project, 
      customClauses,
      language = 'fr',
    } = body;

    if (!userProfile || !userProfile.name) {
      return NextResponse.json(
        { error: 'Le profil utilisateur est requis' },
        { status: 400 }
      );
    }

    // Utiliser le modèle deep pour les contrats (documents importants)
    const model = selectModel('contract-generator', { isCritical: true });

    const getContractTypeInstruction = () => {
      switch (contractType) {
        case 'service':
          return `Génère un CONTRAT DE PRESTATION DE SERVICES pour développeur web freelance.
Inclure: objet de la mission, livrables, délais, tarification, conditions de paiement, propriété intellectuelle, confidentialité, résiliation, responsabilité.`;
        
        case 'nda':
          return `Génère un ACCORD DE CONFIDENTIALITÉ (NDA) bilatéral.
Inclure: définition des informations confidentielles, obligations des parties, durée, exceptions, conséquences en cas de violation.`;
        
        case 'maintenance':
          return `Génère un CONTRAT DE MAINTENANCE pour site/application web.
Inclure: périmètre de la maintenance, SLA, temps de réponse, exclusions, tarification (forfait/temps passé), durée, renouvellement.`;
        
        case 'cgv':
          return `Génère des CONDITIONS GÉNÉRALES DE VENTE pour prestations de développement web.
Inclure: champ d'application, commandes, tarifs, paiement, livraison, propriété intellectuelle, responsabilité, RGPD, litiges.`;
        
        default:
          return `Génère un contrat personnalisé selon le contexte fourni.`;
      }
    };

    const systemPrompt = `Tu es un expert en rédaction de contrats commerciaux pour freelances en France.
${language === 'fr' ? 'Rédige en FRANÇAIS avec la terminologie juridique française appropriée.' : 'Write in ENGLISH with appropriate legal terminology.'}

${getContractTypeInstruction()}

PRESTATAIRE:
- Nom: ${userProfile.name}
${userProfile.company ? `- Société: ${userProfile.company}` : '- Statut: Auto-entrepreneur / Freelance'}
${userProfile.siret ? `- SIRET: ${userProfile.siret}` : ''}
${userProfile.address ? `- Adresse: ${userProfile.address}` : ''}
${userProfile.activity ? `- Activité: ${userProfile.activity}` : '- Activité: Développement web'}

${client ? `
CLIENT:
- Nom: ${client.name}
${client.enterprise ? `- Entreprise: ${client.enterprise}` : ''}
${client.siret ? `- SIRET: ${client.siret}` : ''}
${client.address ? `- Adresse: ${client.address}` : ''}
` : ''}

${project ? `
PROJET:
- Titre: ${project.title}
${project.description ? `- Description: ${project.description}` : ''}
${project.budget ? `- Budget: ${project.budget}€ HT` : ''}
${project.start_date ? `- Date de début: ${project.start_date}` : ''}
${project.end_date ? `- Date de fin: ${project.end_date}` : ''}
${project.deliverables ? `- Livrables: ${project.deliverables.join(', ')}` : ''}
` : ''}

${customClauses && customClauses.length > 0 ? `
CLAUSES PERSONNALISÉES À INCLURE:
${customClauses.map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''}

IMPORTANT:
- Le contrat doit être juridiquement solide mais compréhensible
- Utilise des formulations standards du droit français
- Protège les intérêts des deux parties de manière équilibrée
- Inclus des clauses de protection pour le freelance (paiement, PI, responsabilité limitée)
- Mentionne le RGPD si pertinent

RETOURNE UN JSON VALIDE avec cette structure:
{
  "title": "Titre du contrat",
  "parties": {
    "provider": { "name": "...", "details": "..." },
    "client": { "name": "...", "details": "..." }
  },
  "preamble": "Préambule/contexte du contrat",
  "articles": [
    {
      "number": 1,
      "title": "Titre de l'article",
      "content": "Contenu de l'article avec sous-sections si nécessaire"
    }
  ],
  "signatures": {
    "date": "Date de signature (placeholder)",
    "location": "Lieu de signature"
  },
  "tips": ["Conseil 1 pour utiliser ce contrat", "Conseil 2"],
  "warnings": ["Point d'attention 1", "Point d'attention 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Génère un contrat de type: ${contractType}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5, // Plus conservateur pour les contrats
      max_tokens: 4000,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('L\'IA n\'a pas retourné de contenu');
    }

    const result = JSON.parse(responseContent);

    // Validate the response structure
    if (!result.title || !result.articles || !Array.isArray(result.articles)) {
      throw new Error('Structure de réponse invalide');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in contract-generator API:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du contrat',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

