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
  language?: 'fr' | 'en';
}

// Prompts multilingues
const getPromptTexts = (lang: 'fr' | 'en') => ({
  fr: {
    role: 'Tu es un assistant de gestion de projet pour freelances et agences.',
    instruction: 'Analyse les données du projet suivant et donne un insight court et actionnable.',
    billingType: 'Type de facturation',
    budget: 'Budget',
    hourlyRate: 'TJM',
    estimatedHours: 'Heures estimées totales',
    actualHours: 'Heures réelles passées',
    invoicedAmount: 'Montant facturé',
    progress: 'Progression globale',
    taskCount: 'Nombre de tâches',
    tasksWithDrift: 'Tâches avec dérive',
    noDrift: 'Aucune dérive significative détectée',
    estimated: 'estimé',
    actual: 'réel',
    summaryDesc: 'Une phrase courte résumant la situation du projet (max 100 caractères)',
    tipDesc: 'Un conseil actionnable pour améliorer la rentabilité future (max 150 caractères)',
    metricLabel: 'Nom de la métrique clé',
    metricValue: 'Valeur formatée',
    rules: `Règles:
- status "success" si le projet est rentable ou dans les temps
- status "warning" si dépassement < 30% ou problème mineur
- status "danger" si dépassement > 30% ou problème majeur
- Le summary doit être factuel, pas émotionnel
- L'actionable_tip doit être applicable au prochain projet similaire
- Réponds UNIQUEMENT en français`,
  },
  en: {
    role: 'You are a project management assistant for freelancers and agencies.',
    instruction: 'Analyze the following project data and provide a short, actionable insight.',
    billingType: 'Billing type',
    budget: 'Budget',
    hourlyRate: 'Hourly rate',
    estimatedHours: 'Total estimated hours',
    actualHours: 'Actual hours spent',
    invoicedAmount: 'Invoiced amount',
    progress: 'Overall progress',
    taskCount: 'Number of tasks',
    tasksWithDrift: 'Tasks with drift',
    noDrift: 'No significant drift detected',
    estimated: 'estimated',
    actual: 'actual',
    summaryDesc: 'A short sentence summarizing the project status (max 100 characters)',
    tipDesc: 'An actionable tip to improve future profitability (max 150 characters)',
    metricLabel: 'Key metric name',
    metricValue: 'Formatted value',
    rules: `Rules:
- status "success" if project is profitable or on track
- status "warning" if overrun < 30% or minor issue
- status "danger" if overrun > 30% or major issue
- Summary must be factual, not emotional
- actionable_tip must be applicable to similar future projects
- Respond ONLY in English`,
  },
})[lang];

export async function POST(req: Request) {
  try {
    const payload: ProjectInsightPayload = await req.json();

    if (!payload.project || !payload.tasks) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const openai = getOpenAIClient();
    const lang = payload.language || 'fr';
    const texts = getPromptTexts(lang);

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

    const prompt = `${texts.role}
${texts.instruction}

Project: ${payload.project.title}
${payload.project.description ? `Description: ${payload.project.description}` : ''}
${texts.billingType}: ${payload.project.billing_type || 'N/A'}
${payload.project.budget ? `${texts.budget}: ${payload.project.budget}€` : ''}
${payload.project.hourly_rate ? `${texts.hourlyRate}: ${payload.project.hourly_rate}€/h` : ''}

Data:
- ${texts.estimatedHours}: ${payload.estimated_hours}h
- ${texts.actualHours}: ${payload.actual_hours}h
- ${texts.invoicedAmount}: ${payload.invoiced_amount}€
- ${texts.progress}: ${payload.progress}%
- ${texts.taskCount}: ${payload.tasks.length}

${texts.tasksWithDrift}:
${tasksSummary.filter(t => t.drift !== null && Math.abs(t.drift!) > 20).map(t => 
  `- ${t.name}: ${t.drift! > 0 ? '+' : ''}${t.drift}% (${texts.estimated}: ${t.estimated}h, ${texts.actual}: ${t.actual}h)`
).join('\n') || texts.noDrift}

Respond in JSON with this exact format:
{
  "status": "success" | "warning" | "danger",
  "summary": "${texts.summaryDesc}",
  "actionable_tip": "${texts.tipDesc}",
  "key_metric": {
    "label": "${texts.metricLabel}",
    "value": "${texts.metricValue}",
    "trend": "up" | "down" | "stable"
  }
}

${texts.rules}`;

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

