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
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  existingTasks?: ExistingTask[];
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { inputMode, content, projectTitle, projectDescription, projectStartDate, projectEndDate, existingTasks } = body;

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
${projectStartDate ? `DATE DE DÉBUT PROJET: ${projectStartDate}` : ''}
${projectEndDate ? `DATE DE FIN PROJET: ${projectEndDate}` : ''}
${existingTasks && existingTasks.length > 0 ? `TÂCHES EXISTANTES: ${existingTasks.map(t => t.title).join(', ')}` : ''}

RÈGLES IMPORTANTES:
- Génère des tâches claires, spécifiques et actionnables
- Utilise des verbes d'action (Développer, Implémenter, Créer, Configurer, Tester...)
- Estime le temps en heures (réaliste pour un développeur senior)
- Organise par phases si pertinent (Design, Développement, Tests, Déploiement...)
- Ajoute des sous-tâches pour les tâches complexes
- Les priorités sont: low, medium, high, urgent
- Évite les doublons avec les tâches existantes
- Estime des dates pour CHAQUE tâche et sous-tâche: start_date et due_date (format YYYY-MM-DD)
- Si les dates de projet sont fournies, répartis les tâches dans cette plage
- Les sous-tâches doivent être comprises entre les dates de la tâche parente

RETOURNE UN JSON VALIDE avec cette structure:
{
  "tasks": [
    {
      "title": "Titre de la tâche",
      "description": "Description optionnelle détaillée",
      "estimated_hours": 4,
      "priority": "high",
      "phase": "Développement",
      "start_date": "2026-01-20",
      "due_date": "2026-01-25",
      "subtasks": [
        {
          "title": "Sous-tâche",
          "description": "Description",
          "estimated_hours": 1,
          "priority": "medium",
          "start_date": "2026-01-20",
          "due_date": "2026-01-21"
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
      start_date?: string | null;
      due_date?: string | null;
      subtasks?: Array<{
        title?: string;
        description?: string;
        estimated_hours?: number;
        priority?: string;
        start_date?: string | null;
        due_date?: string | null;
      }>;
    }) => ({
      title: task.title || 'Nouvelle tâche',
      description: task.description,
      estimated_hours: task.estimated_hours || null,
      priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority || '') 
        ? task.priority 
        : 'medium',
      phase: task.phase,
      start_date: task.start_date || null,
      due_date: task.due_date || null,
      subtasks: task.subtasks?.map(sub => ({
        title: sub.title || 'Sous-tâche',
        description: sub.description,
        estimated_hours: sub.estimated_hours || null,
        priority: ['low', 'medium', 'high', 'urgent'].includes(sub.priority || '') 
          ? sub.priority 
          : 'medium',
        start_date: sub.start_date || null,
        due_date: sub.due_date || null,
      })),
    }));

    // Normalize dates if missing or invalid
    const parseDate = (value?: string | null) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const normalizeRange = (item: { start_date?: string | null; due_date?: string | null }) => {
      const start = parseDate(item.start_date);
      const end = parseDate(item.due_date);
      if (start && end && end < start) {
        item.start_date = formatDate(end);
        item.due_date = formatDate(start);
      }
    };

    const projectStart = parseDate(projectStartDate || undefined) || new Date();
    const projectEnd = parseDate(projectEndDate || undefined);

    const distributeRange = (
      items: Array<{ estimated_hours?: number | null; start_date?: string | null; due_date?: string | null }>,
      rangeStart: Date,
      rangeEnd: Date
    ) => {
      const days = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
      const weights = items.map(item => Math.max(1, Math.round(item.estimated_hours || 4)));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0) || items.length;
      let cursor = new Date(rangeStart);

      items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        const sliceDays = isLast ? days - Math.ceil((cursor.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) : Math.max(1, Math.round(days * (weights[idx] / totalWeight)));
        const start = item.start_date ? parseDate(item.start_date) : cursor;
        const end = item.due_date ? parseDate(item.due_date) : new Date((start || cursor).getTime());

        if (!item.start_date) {
          item.start_date = formatDate(start || cursor);
        }
        if (!item.due_date) {
          end.setDate((start || cursor).getDate() + Math.max(1, sliceDays));
          item.due_date = formatDate(end);
        }
        cursor = new Date(end.getTime());
      });
    };

    const fallbackEnd = projectEnd || new Date(projectStart.getTime() + (result.tasks.length || 1) * 3 * 24 * 60 * 60 * 1000);

    if (result.tasks.length > 0) {
      result.tasks.forEach(task => {
        normalizeRange(task);
        task.subtasks?.forEach(sub => normalizeRange(sub));
      });
      distributeRange(result.tasks, projectStart, fallbackEnd);
      result.tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          const taskStart = parseDate(task.start_date || undefined) || projectStart;
          const taskEnd = parseDate(task.due_date || undefined) || new Date(taskStart.getTime() + 2 * 24 * 60 * 60 * 1000);
          distributeRange(task.subtasks, taskStart, taskEnd);
        }
      });
    }

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

