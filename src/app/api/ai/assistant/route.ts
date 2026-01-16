import { streamText, tool, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { cookies } from 'next/headers';

// ============================================================================
// TYPES
// ============================================================================

interface UserContext {
  userId: number;
  username: string;
  clients: ClientSummary[];
  projects: ProjectSummary[];
  invoices: InvoiceSummary[];
  tasks: TaskSummary[];
}

interface ClientSummary {
  id: string;
  name: string;
  company?: string;
  status: string;
  pipelineStatus: string;
  lastContact?: string;
  totalRevenue: number;
  pendingInvoices: number;
}

interface ProjectSummary {
  id: string;
  title: string;
  clientName: string;
  status: string;
  progress: number;
  deadline?: string;
  blockedTasks: number;
  pendingTasks: number;
}

interface InvoiceSummary {
  id: string;
  type: 'quote' | 'invoice';
  clientName: string;
  amount: number;
  status: string;
  dueDate?: string;
  daysSinceSent?: number;
}

interface TaskSummary {
  id: string;
  title: string;
  projectName: string;
  status: string;
  priority: string;
  dueDate?: string;
  isOverdue: boolean;
}

// ============================================================================
// CONTEXT FETCHING
// ============================================================================

async function fetchUserContext(token: string): Promise<UserContext | null> {
  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  
  try {
    // Fetch user info
    const userRes = await fetch(`${apiUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();

    // Fetch clients
    const clientsRes = await fetch(
      `${apiUrl}/api/contacts?filters[users][id][$in]=${user.id}&populate=*&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const clientsData = await clientsRes.json();
    
    // Fetch projects
    const projectsRes = await fetch(
      `${apiUrl}/api/projects?filters[user][id][$eq]=${user.id}&populate[tasks]=*&populate[client]=*&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const projectsData = await projectsRes.json();

    // Fetch invoices/quotes
    const invoicesRes = await fetch(
      `${apiUrl}/api/factures?filters[user][id][$eq]=${user.id}&populate[client_id]=*&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const invoicesData = await invoicesRes.json();

    // Fetch tasks
    const tasksRes = await fetch(
      `${apiUrl}/api/project-tasks?filters[project][user][id][$eq]=${user.id}&populate[project]=*&pagination[limit]=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tasksData = await tasksRes.json();

    // Transform data into summaries
    const clients: ClientSummary[] = (clientsData.data || []).map((c: Record<string, unknown>) => ({
      id: c.documentId as string,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name as string,
      company: c.company_name as string,
      status: c.contact_status as string || 'prospect',
      pipelineStatus: c.pipeline_status as string || 'new',
      lastContact: c.last_contact_date as string,
      totalRevenue: 0, // Would need aggregation
      pendingInvoices: 0,
    }));

    const projects: ProjectSummary[] = (projectsData.data || []).map((p: Record<string, unknown>) => {
      const tasks = (p.tasks as Record<string, unknown>[]) || [];
      const blockedTasks = tasks.filter((t: Record<string, unknown>) => t.task_status === 'blocked').length;
      const pendingTasks = tasks.filter((t: Record<string, unknown>) => t.task_status === 'todo' || t.task_status === 'in_progress').length;
      const client = p.client as Record<string, unknown>;
      
      return {
        id: p.documentId as string,
        title: p.title as string,
        clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'N/A',
        status: p.project_status as string,
        progress: typeof p.progress === 'number' ? p.progress : 0,
        deadline: p.end_date as string,
        blockedTasks,
        pendingTasks,
      };
    });

    const now = new Date();
    const invoices: InvoiceSummary[] = (invoicesData.data || []).map((f: Record<string, unknown>) => {
      const client = f.client_id as Record<string, unknown>;
      const sentDate = f.sent_date as string;
      const daysSinceSent = sentDate ? Math.floor((now.getTime() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24)) : undefined;
      
      return {
        id: f.documentId as string,
        type: f.document_type as 'quote' | 'invoice',
        clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'N/A',
        amount: (f.total_ttc as number) || 0,
        status: (f.document_type === 'quote' ? f.quote_status : f.facture_status) as string,
        dueDate: f.due_date as string,
        daysSinceSent,
      };
    });

    const tasks: TaskSummary[] = (tasksData.data || []).map((t: Record<string, unknown>) => {
      const project = t.project as Record<string, unknown>;
      const dueDate = t.due_date as string;
      const isOverdue = dueDate ? new Date(dueDate) < now && t.task_status !== 'completed' : false;
      
      return {
        id: t.documentId as string,
        title: t.title as string,
        projectName: project?.title as string || 'N/A',
        status: t.task_status as string,
        priority: t.priority as string || 'medium',
        dueDate,
        isOverdue,
      };
    });

    return {
      userId: user.id,
      username: user.username,
      clients,
      projects,
      invoices,
      tasks,
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(context: UserContext | null): string {
  const basePrompt = `Tu es Eclipse Copilot, l'assistant IA intégré au CRM Eclipse Dashboard. Tu aides les freelances et entrepreneurs à gérer leurs projets et clients.

## Ton rôle
- Tu es un COPILOTE business, pas un simple chatbot
- Tu analyses les situations et proposes des actions concrètes
- Tu es proactif mais JAMAIS décisionnaire seul
- Toute action doit être validée par l'utilisateur

## Ton style
- Direct et pragmatique, pas de blabla
- Toujours orienté action : "Voici ce que tu peux faire"
- Utilise le tutoiement
- Sois concis mais complet

## Format de réponse
1. **Analyse** : Ce que tu observes dans les données
2. **Diagnostic** : Le problème ou l'opportunité identifiée
3. **Actions** : 2-3 suggestions concrètes avec priorité
4. Si pertinent, propose d'utiliser un outil (email, tâche...)

## Règles
- Ne jamais inventer de données
- Si tu n'as pas l'info, dis-le clairement
- Propose toujours une prochaine étape actionnable`;

  if (!context) {
    return basePrompt + '\n\n⚠️ Contexte utilisateur non disponible. Demande à l\'utilisateur les informations nécessaires.';
  }

  // Build context summary
  const clientsSummary = context.clients.length > 0
    ? context.clients.slice(0, 10).map(c => 
        `- ${c.name}${c.company ? ` (${c.company})` : ''}: ${c.pipelineStatus}`
      ).join('\n')
    : 'Aucun client';

  const projectsSummary = context.projects.length > 0
    ? context.projects.slice(0, 10).map(p => {
        const issues = [];
        if (p.blockedTasks > 0) issues.push(`${p.blockedTasks} bloquées`);
        if (p.pendingTasks > 0) issues.push(`${p.pendingTasks} en attente`);
        return `- ${p.title} (${p.clientName}): ${p.status}, ${p.progress}%${issues.length ? ` [${issues.join(', ')}]` : ''}`;
      }).join('\n')
    : 'Aucun projet';

  const pendingQuotes = context.invoices.filter(i => i.type === 'quote' && i.status === 'sent');
  const overdueInvoices = context.invoices.filter(i => i.type === 'invoice' && i.status === 'overdue');
  const quotesToRelance = pendingQuotes.filter(q => q.daysSinceSent && q.daysSinceSent > 7);

  const invoicesSummary = `
- Devis en attente: ${pendingQuotes.length}${quotesToRelance.length > 0 ? ` (${quotesToRelance.length} à relancer - >7 jours)` : ''}
- Factures en retard: ${overdueInvoices.length}`;

  const overdueTasks = context.tasks.filter(t => t.isOverdue);
  const highPriorityTasks = context.tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
  
  const tasksSummary = `
- Tâches en retard: ${overdueTasks.length}
- Tâches haute priorité: ${highPriorityTasks.length}`;

  return `${basePrompt}

## Contexte actuel de ${context.username}

### Clients (${context.clients.length} total)
${clientsSummary}

### Projets (${context.projects.length} total)
${projectsSummary}

### Facturation
${invoicesSummary}

### Tâches
${tasksSummary}

${quotesToRelance.length > 0 ? `\n⚠️ ALERTE: ${quotesToRelance.length} devis attendent une réponse depuis plus de 7 jours !` : ''}
${overdueInvoices.length > 0 ? `\n⚠️ ALERTE: ${overdueInvoices.length} factures sont en retard de paiement !` : ''}
${overdueTasks.length > 0 ? `\n⚠️ ALERTE: ${overdueTasks.length} tâches sont en retard !` : ''}`;
}

// ============================================================================
// TOOLS
// ============================================================================

const generateRelanceEmail = tool({
  description: 'Génère un email de relance personnalisé pour un client ou un devis en attente',
  parameters: z.object({
    clientName: z.string().describe('Nom du client'),
    context: z.enum(['quote', 'invoice', 'project', 'general']).describe('Type de relance'),
    tone: z.enum(['friendly', 'professional', 'urgent']).describe('Ton de l\'email'),
    additionalContext: z.string().optional().describe('Contexte supplémentaire pour personnaliser'),
  }),
  execute: async ({ clientName, context, tone, additionalContext }) => {
    const toneMap = {
      friendly: 'amical et décontracté',
      professional: 'professionnel et courtois',
      urgent: 'professionnel mais avec une note d\'urgence',
    };

    const contextMap = {
      quote: `relance pour un devis envoyé`,
      invoice: `rappel de paiement d'une facture`,
      project: `point sur l'avancement du projet`,
      general: `reprise de contact`,
    };

    // In a real implementation, this would call GPT to generate the email
    const emailTemplates: Record<string, { subject: string; body: string }> = {
      quote: {
        subject: `Suivi de notre proposition - ${clientName}`,
        body: `Bonjour,

Je me permets de revenir vers vous concernant le devis que je vous ai envoyé récemment.

Avez-vous eu l'occasion de le consulter ? Je reste disponible pour en discuter et répondre à vos questions.

${additionalContext ? `\nNote: ${additionalContext}\n` : ''}
Bien cordialement`,
      },
      invoice: {
        subject: `Rappel - Facture en attente`,
        body: `Bonjour,

Je me permets de vous relancer concernant la facture en attente de règlement.

Pourriez-vous me confirmer le traitement de celle-ci ?

Bien cordialement`,
      },
      project: {
        subject: `Point projet - ${clientName}`,
        body: `Bonjour,

Je souhaitais faire un point sur l'avancement de notre projet.

Êtes-vous disponible pour un rapide échange cette semaine ?

Bien cordialement`,
      },
      general: {
        subject: `Des nouvelles - ${clientName}`,
        body: `Bonjour,

J'espère que vous allez bien. Je souhaitais prendre de vos nouvelles et voir si je peux vous accompagner sur de nouveaux projets.

N'hésitez pas à me contacter si vous avez des besoins.

Bien cordialement`,
      },
    };

    return {
      success: true,
      email: emailTemplates[context],
      metadata: {
        clientName,
        context: contextMap[context],
        tone: toneMap[tone],
      },
    };
  },
});

const createTask = tool({
  description: 'Crée une nouvelle tâche dans un projet',
  parameters: z.object({
    title: z.string().describe('Titre de la tâche'),
    projectId: z.string().optional().describe('ID du projet'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    dueDate: z.string().optional().describe('Date d\'échéance (format YYYY-MM-DD)'),
    description: z.string().optional(),
  }),
  execute: async ({ title, priority, dueDate, description }) => {
    // In a real implementation, this would create the task via API
    return {
      success: true,
      task: {
        title,
        priority,
        dueDate,
        description,
        status: 'todo',
      },
      message: `Tâche "${title}" créée avec succès`,
    };
  },
});

const suggestNextSteps = tool({
  description: 'Suggère les prochaines étapes prioritaires basées sur le contexte',
  parameters: z.object({
    focus: z.enum(['project', 'client', 'revenue', 'general']).describe('Domaine de focus'),
    projectId: z.string().optional(),
    clientId: z.string().optional(),
  }),
  execute: async ({ focus }) => {
    // In a real implementation, this would analyze context and suggest steps
    const suggestions: Record<string, string[]> = {
      project: [
        'Terminer les tâches bloquantes en priorité',
        'Envoyer un point d\'avancement au client',
        'Planifier la prochaine livraison',
      ],
      client: [
        'Relancer les devis en attente depuis plus de 7 jours',
        'Programmer des points réguliers avec les clients actifs',
        'Qualifier les nouveaux prospects',
      ],
      revenue: [
        'Relancer les factures impayées',
        'Convertir les devis en attente',
        'Identifier les opportunités d\'upsell',
      ],
      general: [
        'Traiter les tâches en retard',
        'Relancer les clients silencieux',
        'Mettre à jour le pipeline commercial',
      ],
    };

    return {
      success: true,
      focus,
      steps: suggestions[focus],
    };
  },
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('strapi_jwt')?.value;
    
    // Fetch user context
    const context = token ? await fetchUserContext(token) : null;
    
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        generateRelanceEmail,
        createTask,
        suggestNextSteps,
      },
      maxSteps: 5,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

