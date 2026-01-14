import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AI_MODELS } from '@/lib/ai';

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

interface DailySuggestionsPayload {
  userId: number;
  language: 'fr' | 'en';
}

interface StrapiTask {
  due_date?: string;
  task_status: string;
  title?: string;
  project?: { title?: string };
}

interface StrapiFacture {
  type?: string;
  invoice_status?: string;
  quote_status?: string;
  total_ttc?: number;
  due_date?: string;
  createdAt?: string;
  invoice_number?: string;
  client?: { name?: string };
}

interface StrapiProject {
  project_status?: string;
  has_contract?: boolean;
  end_date?: string;
  title?: string;
  client?: { name?: string };
}

interface StrapiTimeEntry {
  duration?: number;
}

// Fetch user data from Strapi
async function fetchUserData(userId: number) {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api';
  const token = process.env.STRAPI_API_TOKEN;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Fetch multiple data sources in parallel
    const [projectsRes, tasksRes, facturesRes, timeEntriesRes] = await Promise.all([
      fetch(`${strapiUrl}/projects?filters[user][id][$eq]=${userId}&populate=client,project_tasks&pagination[limit]=50`, { headers }),
      fetch(`${strapiUrl}/project-tasks?filters[project][user][id][$eq]=${userId}&filters[task_status][$ne]=completed&filters[task_status][$ne]=archived&populate=project&pagination[limit]=100`, { headers }),
      fetch(`${strapiUrl}/factures?filters[user][id][$eq]=${userId}&populate=client,project&pagination[limit]=50`, { headers }),
      fetch(`${strapiUrl}/time-entries?filters[user][id][$eq]=${userId}&filters[is_invoiced][$eq]=false&populate=project,client&pagination[limit]=100`, { headers }),
    ]);

    const [projects, tasks, factures, timeEntries] = await Promise.all([
      projectsRes.ok ? projectsRes.json() : { data: [] },
      tasksRes.ok ? tasksRes.json() : { data: [] },
      facturesRes.ok ? facturesRes.json() : { data: [] },
      timeEntriesRes.ok ? timeEntriesRes.json() : { data: [] },
    ]);

    return {
      projects: projects.data || [],
      tasks: tasks.data || [],
      factures: factures.data || [],
      timeEntries: timeEntries.data || [],
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      projects: [],
      tasks: [],
      factures: [],
      timeEntries: [],
    };
  }
}

// Analyze data and create context for AI
function analyzeData(data: Awaited<ReturnType<typeof fetchUserData>>) {
  const today = new Date();
  const analysis = {
    // Urgent tasks (due today or overdue)
    urgentTasks: data.tasks.filter((t: StrapiTask) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate <= today && t.task_status !== 'completed';
    }),
    
    // Tasks due this week
    weekTasks: data.tasks.filter((t: StrapiTask) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate > today && dueDate <= weekFromNow && t.task_status !== 'completed';
    }),
    
    // Pending quotes (devis)
    pendingQuotes: data.factures.filter((f: StrapiFacture) => 
      f.type === 'devis' && f.invoice_status === 'pending'
    ),
    
    // Unpaid invoices
    unpaidInvoices: data.factures.filter((f: StrapiFacture) => 
      f.type === 'facture' && (f.invoice_status === 'pending' || f.invoice_status === 'sent')
    ),
    
    // Overdue invoices
    overdueInvoices: data.factures.filter((f: StrapiFacture) => {
      if (f.type !== 'facture' || f.invoice_status === 'paid') return false;
      if (!f.due_date) return false;
      return new Date(f.due_date) < today;
    }),
    
    // Projects without contract (active projects)
    projectsWithoutContract: data.projects.filter((p: StrapiProject) => 
      p.project_status === 'in_progress' && !p.has_contract
    ),
    
    // Uninvoiced time entries
    uninvoicedTime: data.timeEntries.reduce((total: number, entry: StrapiTimeEntry) => {
      return total + (entry.duration || 0);
    }, 0),
    
    // Projects near deadline (within 7 days)
    projectsNearDeadline: data.projects.filter((p: StrapiProject) => {
      if (!p.end_date || p.project_status === 'completed') return false;
      const endDate = new Date(p.end_date);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return endDate <= weekFromNow && endDate >= today;
    }),
    
    // In-progress tasks count
    inProgressTasks: data.tasks.filter((t: StrapiTask) => t.task_status === 'in_progress'),
    
    // Total uninvoiced amount estimate
    uninvoicedTimeEntries: data.timeEntries,
  };

  return analysis;
}

export async function POST(req: Request) {
  try {
    const payload: DailySuggestionsPayload = await req.json();
    const { userId, language = 'fr' } = payload;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch user data
    const userData = await fetchUserData(userId);
    const analysis = analyzeData(userData);

    // Build context for AI
    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';

    const context = {
      timeOfDay,
      urgentTasksCount: analysis.urgentTasks.length,
      weekTasksCount: analysis.weekTasks.length,
      pendingQuotesCount: analysis.pendingQuotes.length,
      unpaidInvoicesCount: analysis.unpaidInvoices.length,
      overdueInvoicesCount: analysis.overdueInvoices.length,
      projectsWithoutContractCount: analysis.projectsWithoutContract.length,
      uninvoicedHours: Math.round(analysis.uninvoicedTime / 60),
      projectsNearDeadlineCount: analysis.projectsNearDeadline.length,
      inProgressTasksCount: analysis.inProgressTasks.length,
      
      // Sample data for AI context
      urgentTasks: analysis.urgentTasks.slice(0, 3).map((t: StrapiTask) => ({
        title: t.title,
        project: t.project?.title,
        dueDate: t.due_date,
      })),
      pendingQuotes: analysis.pendingQuotes.slice(0, 3).map((q: StrapiFacture) => ({
        number: q.invoice_number,
        client: q.client?.name,
        amount: q.total_ttc,
        createdAt: q.createdAt,
      })),
      unpaidInvoices: analysis.unpaidInvoices.slice(0, 3).map((i: StrapiFacture) => ({
        number: i.invoice_number,
        client: i.client?.name,
        amount: i.total_ttc,
        dueDate: i.due_date,
      })),
      projectsNearDeadline: analysis.projectsNearDeadline.slice(0, 3).map((p: StrapiProject) => ({
        title: p.title,
        client: p.client?.name,
        endDate: p.end_date,
      })),
    };

    const openai = getOpenAIClient();

    const systemPrompt = language === 'fr' ? `Tu es Eclipse Assistant, un assistant IA pour freelances et agences.
Tu dois générer des suggestions d'actions quotidiennes basées sur les données de l'utilisateur.

RÈGLES:
- Génère maximum 5 suggestions, triées par priorité (high > medium > low)
- Sois concis et actionnable
- Le greeting doit être adapté au moment de la journée (${timeOfDay === 'morning' ? 'matin' : timeOfDay === 'afternoon' ? 'après-midi' : 'soir'})
- Le summary doit faire max 2 phrases résumant la journée
- Les suggestions doivent avoir des actions concrètes avec des liens valides
- Le motivational_tip doit être un conseil business pertinent

Types de suggestions disponibles:
- task: pour les tâches à faire
- quote: pour les devis à créer/relancer
- invoice: pour les factures à envoyer/relancer
- contract: pour créer des contrats
- timesheet: pour facturer du temps passé
- alert: pour les alertes urgentes
- follow_up: pour les relances

Liens disponibles:
- /dashboard/projects/[slug]: page projet
- /dashboard/factures: liste factures/devis
- /dashboard/factures/new?type=devis: nouveau devis
- /dashboard/factures/new?type=facture: nouvelle facture
- /dashboard/contracts: contrats
- /dashboard/time-tracking: time tracking

Réponds en JSON avec ce format exact:
{
  "greeting": "string",
  "summary": "string",
  "suggestions": [
    {
      "id": "string",
      "type": "task|quote|invoice|contract|timesheet|alert|follow_up",
      "priority": "high|medium|low",
      "title": "string",
      "description": "string",
      "action": {
        "label": "string",
        "href": "string"
      },
      "metadata": {
        "count": number|null,
        "amount": number|null,
        "projectTitle": "string|null",
        "clientName": "string|null",
        "dueDate": "string|null"
      }
    }
  ],
  "motivational_tip": "string"
}` : `You are Eclipse Assistant, an AI assistant for freelancers and agencies.
You must generate daily action suggestions based on user data.

RULES:
- Generate maximum 5 suggestions, sorted by priority (high > medium > low)
- Be concise and actionable
- The greeting should be adapted to the time of day (${timeOfDay})
- The summary should be max 2 sentences summarizing the day
- Suggestions must have concrete actions with valid links
- The motivational_tip should be a relevant business tip

Available suggestion types:
- task: for tasks to do
- quote: for quotes to create/follow up
- invoice: for invoices to send/follow up
- contract: for creating contracts
- timesheet: for billing tracked time
- alert: for urgent alerts
- follow_up: for follow-ups

Available links:
- /dashboard/projects/[slug]: project page
- /dashboard/factures: invoices/quotes list
- /dashboard/factures/new?type=devis: new quote
- /dashboard/factures/new?type=facture: new invoice
- /dashboard/contracts: contracts
- /dashboard/time-tracking: time tracking

Respond in JSON with this exact format:
{
  "greeting": "string",
  "summary": "string",
  "suggestions": [...],
  "motivational_tip": "string"
}`;

    const userPrompt = `Données utilisateur:
${JSON.stringify(context, null, 2)}

Génère les suggestions quotidiennes basées sur ces données.`;

    const completion = await openai.chat.completions.create({
      model: AI_MODELS.fast.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('AI did not return content');
    }

    const suggestions = JSON.parse(responseContent);
    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('Error in daily-suggestions API:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: (error as Error).message },
      { status: 500 }
    );
  }
}

