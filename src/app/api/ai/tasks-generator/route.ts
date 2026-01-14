import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { selectModel } from '@/lib/ai/router';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

interface ExistingTask {
  title: string;
  task_status: string;
  priority: string;
}

interface RequestBody {
  inputMode: 'prompt' | 'meeting' | 'fathom';
  content: string;
  projectTitle: string;
  projectDescription?: string;
  existingTasks?: ExistingTask[];
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { inputMode, content, projectTitle, projectDescription, existingTasks } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le contenu est requis' },
        { status: 400 }
      );
    }

    const model = selectModel('tasks-generator');

    const getInputTypeInstruction = () => {
      switch (inputMode) {
        case 'meeting':
          return `L'utilisateur fournit des NOTES DE RÉUNION. Extrais les tâches et actions items mentionnés.
Identifie les décisions prises, les demandes du client, et les prochaines étapes.
Structure les tâches de manière logique et professionnelle.`;
        case 'fathom':
          return `L'utilisateur fournit un EXPORT FATHOM AI (résumé de réunion, action items, ou transcript).
Analyse le contenu pour extraire toutes les tâches, actions items et décisions.
Priorise les éléments explicitement mentionnés comme urgents ou importants.
Organise les tâches par phase ou thématique si pertinent.`;
        default:
          return `L'utilisateur décrit des OBJECTIFS ou FONCTIONNALITÉS à développer.
Décompose en tâches de développement claires et actionnables.
Estime le temps de développement de manière réaliste.`;
      }
    };

    const systemPrompt = `Tu es un expert en gestion de projet technique pour développeurs freelances.
Tu dois analyser le contenu fourni et générer une liste de tâches structurée.

${getInputTypeInstruction()}

PROJET: ${projectTitle}
${projectDescription ? `DESCRIPTION: ${projectDescription}` : ''}
${existingTasks && existingTasks.length > 0 ? `TÂCHES EXISTANTES: ${existingTasks.map(t => t.title).join(', ')}` : ''}

RÈGLES IMPORTANTES:
- Génère des tâches claires, spécifiques et actionnables
- Utilise des verbes d'action (Développer, Implémenter, Créer, Configurer, Tester...)
- Estime le temps en heures (réaliste pour un développeur senior)
- Organise par phases si pertinent (Design, Développement, Tests, Déploiement...)
- Ajoute des sous-tâches pour les tâches complexes
- Les priorités sont: low, medium, high, urgent
- Évite les doublons avec les tâches existantes

RETOURNE UN JSON VALIDE avec cette structure:
{
  "tasks": [
    {
      "title": "Titre de la tâche",
      "description": "Description optionnelle détaillée",
      "estimated_hours": 4,
      "priority": "high",
      "phase": "Développement",
      "subtasks": [
        {
          "title": "Sous-tâche",
          "description": "Description",
          "estimated_hours": 1,
          "priority": "medium"
        }
      ]
    }
  ],
  "total_estimated_hours": 20,
  "phases": ["Phase 1", "Phase 2"],
  "reasoning": "Explication de la décomposition",
  "confidence": 0.85
}`;

    const completion = await openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('L\'IA n\'a pas retourné de contenu');
    }

    const result = JSON.parse(responseContent);

    // Validate the response structure
    if (!result.tasks || !Array.isArray(result.tasks)) {
      throw new Error('Structure de réponse invalide: tâches manquantes');
    }

    // Ensure all tasks have required fields
    result.tasks = result.tasks.map((task: {
      title?: string;
      description?: string;
      estimated_hours?: number;
      priority?: string;
      phase?: string;
      subtasks?: Array<{
        title?: string;
        description?: string;
        estimated_hours?: number;
        priority?: string;
      }>;
    }) => ({
      title: task.title || 'Nouvelle tâche',
      description: task.description,
      estimated_hours: task.estimated_hours || null,
      priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority || '') 
        ? task.priority 
        : 'medium',
      phase: task.phase,
      subtasks: task.subtasks?.map(sub => ({
        title: sub.title || 'Sous-tâche',
        description: sub.description,
        estimated_hours: sub.estimated_hours || null,
        priority: ['low', 'medium', 'high', 'urgent'].includes(sub.priority || '') 
          ? sub.priority 
          : 'medium',
      })),
    }));

    // Calculate total estimated hours if not provided
    if (!result.total_estimated_hours) {
      result.total_estimated_hours = result.tasks.reduce((sum: number, task: { estimated_hours?: number; subtasks?: Array<{ estimated_hours?: number }> }) => {
        const taskHours = task.estimated_hours || 0;
        const subtaskHours = task.subtasks?.reduce((s: number, sub: { estimated_hours?: number }) => s + (sub.estimated_hours || 0), 0) || 0;
        return sum + taskHours + subtaskHours;
      }, 0);
    }

    // Ensure confidence is a valid number
    result.confidence = Math.min(1, Math.max(0, result.confidence || 0.7));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in tasks-generator API:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération des tâches',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

