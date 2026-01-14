import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AI_MODELS } from '@/lib/ai';

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

interface TaskData {
  name: string;
  estimated_hours?: number;
  actual_hours?: number;
  status: string;
}

interface ProjectInsightPayload {
  project: {
    title: string;
    description?: string;
    billing_type?: string;
    budget?: number;
    hourly_rate?: number;
    start_date?: string;
    end_date?: string;
  };
  estimated_hours: number;
  actual_hours: number;
  invoiced_amount: number;
  tasks: TaskData[];
  progress: number;
}

export async function POST(req: Request) {
  try {
    const payload: ProjectInsightPayload = await req.json();

    if (!payload.project || !payload.tasks) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    // Construire le contexte pour l'IA
    const tasksSummary = payload.tasks.map(t => ({
      name: t.name,
      status: t.status,
      estimated: t.estimated_hours || 0,
      actual: t.actual_hours || 0,
      drift: t.estimated_hours && t.actual_hours 
        ? Math.round(((t.actual_hours - t.estimated_hours) / t.estimated_hours) * 100) 
        : null,
    }));

    const prompt = `Tu es un assistant de gestion de projet pour freelances et agences. 
Analyse les données du projet suivant et donne un insight court et actionnable.

Projet: ${payload.project.title}
${payload.project.description ? `Description: ${payload.project.description}` : ''}
Type de facturation: ${payload.project.billing_type || 'non défini'}
${payload.project.budget ? `Budget: ${payload.project.budget}€` : ''}
${payload.project.hourly_rate ? `TJM: ${payload.project.hourly_rate}€/h` : ''}

Données:
- Heures estimées totales: ${payload.estimated_hours}h
- Heures réelles passées: ${payload.actual_hours}h
- Montant facturé: ${payload.invoiced_amount}€
- Progression globale: ${payload.progress}%
- Nombre de tâches: ${payload.tasks.length}

Tâches avec dérive:
${tasksSummary.filter(t => t.drift !== null && Math.abs(t.drift!) > 20).map(t => 
  `- ${t.name}: ${t.drift! > 0 ? '+' : ''}${t.drift}% (estimé: ${t.estimated}h, réel: ${t.actual}h)`
).join('\n') || 'Aucune dérive significative détectée'}

Réponds en JSON avec ce format exact:
{
  "status": "success" | "warning" | "danger",
  "summary": "Une phrase courte résumant la situation du projet (max 100 caractères)",
  "actionable_tip": "Un conseil actionnable pour améliorer la rentabilité future (max 150 caractères)",
  "key_metric": {
    "label": "Nom de la métrique clé",
    "value": "Valeur formatée",
    "trend": "up" | "down" | "stable"
  }
}

Règles:
- status "success" si le projet est rentable ou dans les temps
- status "warning" si dépassement < 30% ou problème mineur
- status "danger" si dépassement > 30% ou problème majeur
- Le summary doit être factuel, pas émotionnel
- L'actionable_tip doit être applicable au prochain projet similaire
- Réponds UNIQUEMENT en français`;

    const completion = await openai.chat.completions.create({
      model: AI_MODELS.fast.id,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('AI did not return content');
    }

    const insight = JSON.parse(responseContent);
    return NextResponse.json(insight);

  } catch (error) {
    console.error('Error in project-insight API:', error);
    return NextResponse.json(
      { error: 'Failed to generate insight', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}

