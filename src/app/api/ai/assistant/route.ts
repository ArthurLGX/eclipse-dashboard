import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

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
  email?: string;
  status: string;
  pipelineStatus: string;
  lastContact?: string;
  totalRevenue: number;
  pendingInvoices: number;
  isCollaborative?: boolean;
  collaborativeProject?: string;
}

interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  clientId?: string;
  clientName: string;
  status: string;
  progress: number;
  deadline?: string;
  blockedTasks: number;
  pendingTasks: number;
  isCollaborative?: boolean;
  permission?: string;
}

interface InvoiceSummary {
  id: string;
  type: 'quote' | 'invoice';
  clientId?: string;
  clientName: string;
  amount: number;
  status: string;
  dueDate?: string;
  daysSinceSent?: number;
}

interface TaskSummary {
  id: string;
  title: string;
  projectId?: string;
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

    // Fetch owned clients (entity is 'clients' in Strapi)
    const clientsRes = await fetch(
      `${apiUrl}/api/clients?filters[users][id][$in]=${user.id}&populate=*&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const clientsData = await clientsRes.json();
    
    
    // Fetch owned projects
    const projectsRes = await fetch(
      `${apiUrl}/api/projects?filters[user][id][$eq]=${user.id}&populate[tasks]=*&populate[client]=*&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const projectsData = await projectsRes.json();

    // Fetch collaborative projects (where user is collaborator, not owner)
    const collabProjectsRes = await fetch(
      `${apiUrl}/api/project-collaborators?populate[project][populate][client]=*&populate[project][populate][tasks]=*&filters[user][id][$eq]=${user.id}&filters[is_owner][$eq]=false&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const collabProjectsData = await collabProjectsRes.json();

    // Fetch invoices/quotes
    const invoicesRes = await fetch(
      `${apiUrl}/api/factures?filters[user][id][$eq]=${user.id}&populate[client_id]=*&pagination[limit]=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const invoicesData = await invoicesRes.json();


    // Transform owned clients
    const ownedClients: ClientSummary[] = (clientsData.data || []).map((c: Record<string, unknown>) => ({
      id: c.documentId as string,
      name: c.name as string || c.enterprise as string || 'Client sans nom',
      company: c.enterprise as string,
      email: c.email as string,
      status: c.processStatus as string || 'prospect',
      pipelineStatus: c.pipeline_status as string || 'new',
      lastContact: c.contacted_date as string,
      totalRevenue: 0,
      pendingInvoices: 0,
      isCollaborative: false,
    }));

    // Extract collaborative clients from collaborative projects
    const ownedClientIds = new Set(ownedClients.map(c => c.id));
    const collaborativeClientsMap = new Map<string, ClientSummary>();
    
    const collabProjects = (collabProjectsData.data || []);
    for (const collab of collabProjects) {
      const project = collab.project as Record<string, unknown>;
      const client = project?.client as Record<string, unknown>;
      if (client?.documentId && !ownedClientIds.has(client.documentId as string)) {
        const clientId = client.documentId as string;
        if (!collaborativeClientsMap.has(clientId)) {
          collaborativeClientsMap.set(clientId, {
            id: clientId,
            name: client.name as string || client.enterprise as string || 'N/A',
            company: client.enterprise as string,
            email: client.email as string,
            status: client.processStatus as string || 'prospect',
            pipelineStatus: client.pipeline_status as string || 'new',
            lastContact: client.contacted_date as string,
            totalRevenue: 0,
            pendingInvoices: 0,
            isCollaborative: true,
            collaborativeProject: project.title as string,
          });
        }
      }
    }

    // Merge all clients
    const clients: ClientSummary[] = [...ownedClients, ...Array.from(collaborativeClientsMap.values())];

    // Transform owned projects
    const ownedProjects: ProjectSummary[] = (projectsData.data || []).map((p: Record<string, unknown>) => {
      const tasks = (p.tasks as Record<string, unknown>[]) || [];
      const blockedTasks = tasks.filter((t: Record<string, unknown>) => t.task_status === 'blocked').length;
      const pendingTasks = tasks.filter((t: Record<string, unknown>) => t.task_status === 'todo' || t.task_status === 'in_progress').length;
      const client = p.client as Record<string, unknown>;
      
      return {
        id: p.documentId as string,
        slug: p.slug as string,
        title: p.title as string,
        clientId: client?.documentId as string,
        clientName: client ? (client.name as string || client.enterprise as string || 'N/A') : 'N/A',
        status: p.project_status as string,
        progress: typeof p.progress === 'number' ? p.progress : 0,
        deadline: p.end_date as string,
        blockedTasks,
        pendingTasks,
        isCollaborative: false,
      };
    });

    // Transform collaborative projects
    const ownedProjectIds = new Set(ownedProjects.map(p => p.id));
    const collaborativeProjects: ProjectSummary[] = collabProjects
      .filter((collab: Record<string, unknown>) => {
        const project = collab.project as Record<string, unknown>;
        return project?.documentId && !ownedProjectIds.has(project.documentId as string);
      })
      .map((collab: Record<string, unknown>) => {
        const p = collab.project as Record<string, unknown>;
        const tasks = (p.tasks as Record<string, unknown>[]) || [];
        const blockedTasks = tasks.filter((t: Record<string, unknown>) => t.task_status === 'blocked').length;
        const pendingTasks = tasks.filter((t: Record<string, unknown>) => t.task_status === 'todo' || t.task_status === 'in_progress').length;
        const client = p.client as Record<string, unknown>;
        
        return {
          id: p.documentId as string,
          slug: p.slug as string,
          title: p.title as string,
          clientId: client?.documentId as string,
          clientName: client ? (client.name as string || client.enterprise as string || 'N/A') : 'N/A',
          status: p.project_status as string,
          progress: typeof p.progress === 'number' ? p.progress : 0,
          deadline: p.end_date as string,
          blockedTasks,
          pendingTasks,
          isCollaborative: true,
          permission: collab.permission as string,
        };
      });

    // Merge all projects
    const projects: ProjectSummary[] = [...ownedProjects, ...collaborativeProjects];

    const now = new Date();
    const invoices: InvoiceSummary[] = (invoicesData.data || []).map((f: Record<string, unknown>) => {
      const client = f.client_id as Record<string, unknown>;
      const sentDate = f.sent_date as string;
      const daysSinceSent = sentDate ? Math.floor((now.getTime() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24)) : undefined;
      
      return {
        id: f.documentId as string,
        type: f.document_type as 'quote' | 'invoice',
        clientId: client?.documentId as string,
        clientName: client ? (client.name as string || client.enterprise as string || 'N/A') : 'N/A',
        amount: (f.total_ttc as number) || 0,
        status: (f.document_type === 'quote' ? f.quote_status : f.facture_status) as string,
        dueDate: f.due_date as string,
        daysSinceSent,
      };
    });

    // Extract tasks from projects (already fetched with populate[tasks])
    const allTasks: TaskSummary[] = [];
    const rawOwnedProjects = projectsData.data || [];
    
    // Tasks from owned projects
    for (const p of rawOwnedProjects) {
      const projectTasks = (p.tasks as Record<string, unknown>[]) || [];
      for (const t of projectTasks) {
        const dueDate = t.due_date as string;
        const isOverdue = dueDate ? new Date(dueDate) < now && t.task_status !== 'completed' : false;
        
        allTasks.push({
          id: t.documentId as string,
          title: t.title as string,
          projectId: p.documentId as string,
          projectName: p.title as string || 'N/A',
          status: t.task_status as string,
          priority: t.priority as string || 'medium',
          dueDate,
          isOverdue,
        });
      }
    }
    
    // Tasks from collaborative projects
    for (const collab of collabProjects) {
      const project = collab.project as Record<string, unknown>;
      if (project) {
        const projectTasks = (project.tasks as Record<string, unknown>[]) || [];
        for (const t of projectTasks) {
          const dueDate = t.due_date as string;
          const isOverdue = dueDate ? new Date(dueDate) < now && t.task_status !== 'completed' : false;
          
          allTasks.push({
            id: t.documentId as string,
            title: t.title as string,
            projectId: project.documentId as string,
            projectName: project.title as string || 'N/A',
            status: t.task_status as string,
            priority: t.priority as string || 'medium',
            dueDate,
            isOverdue,
          });
        }
      }
    }
    
    const tasks: TaskSummary[] = allTasks;

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
4. Si pertinent, propose d'utiliser un outil (email, tâche, devis...)

## Outils disponibles
- generateRelanceEmail: Génère un email de relance personnalisé
- createTask: Crée une tâche dans un projet (CRUD réel)
- createQuote: Prépare un devis pré-rempli pour un client
- suggestNextSteps: Suggère les prochaines étapes prioritaires
- updateTask, deleteTask: Modifier ou supprimer une tâche
- updateClient, createClient: Modifier ou créer un client
- updateProject: Modifier un projet

## Règles IMPORTANTES - SÉCURITÉ
- Ne jamais inventer de données - utilise UNIQUEMENT les IDs du contexte fourni
- Pour createTask, updateTask, deleteTask, updateClient, createQuote, updateProject : utilise UNIQUEMENT les IDs (projectId, clientId, taskId) qui figurent dans le contexte. Jamais d'ID inventé ou fourni par l'utilisateur sans vérification.
- Si l'utilisateur donne un ID, vérifie qu'il est bien dans le contexte avant de l'utiliser
- Propose toujours une prochaine étape actionnable
- Quand tu utilises un tool CRUD, explique brièvement l'action`;

  if (!context) {
    return basePrompt + '\n\n⚠️ Contexte utilisateur non disponible. Demande à l\'utilisateur les informations nécessaires.';
  }

  // Build context summary with more details
  const clientsSummary = context.clients.length > 0
    ? context.clients.slice(0, 15).map(c => {
        const collabTag = c.isCollaborative ? ` [COLLAB via: ${c.collaborativeProject}]` : '';
        return `- ${c.name}${c.company ? ` (${c.company})` : ''} [ID: ${c.id}]: ${c.pipelineStatus}${c.email ? ` - ${c.email}` : ''}${collabTag}`;
      }).join('\n')
    : 'Aucun client';

  const projectsSummary = context.projects.length > 0
    ? context.projects.slice(0, 10).map(p => {
        const collabTag = p.isCollaborative ? ` [COLLAB - ${p.permission}]` : '';
        const issues = [];
        if (p.blockedTasks > 0) issues.push(`${p.blockedTasks} bloquées`);
        if (p.pendingTasks > 0) issues.push(`${p.pendingTasks} en attente`);
        return `- ${p.title} [ID: ${p.id}] (Client: ${p.clientName}): ${p.status}, ${p.progress}%${issues.length ? ` [${issues.join(', ')}]` : ''}${collabTag}`;
      }).join('\n')
    : 'Aucun projet';

  const pendingQuotes = context.invoices.filter(i => i.type === 'quote' && i.status === 'sent');
  const overdueInvoices = context.invoices.filter(i => i.type === 'invoice' && i.status === 'overdue');
  const quotesToRelance = pendingQuotes.filter(q => q.daysSinceSent && q.daysSinceSent > 7);
  const draftQuotes = context.invoices.filter(i => i.type === 'quote' && i.status === 'draft');

  const invoicesSummary = `
- Devis en attente de réponse: ${pendingQuotes.length}${quotesToRelance.length > 0 ? ` (⚠️ ${quotesToRelance.length} à relancer - >7 jours)` : ''}
- Devis en brouillon: ${draftQuotes.length}
- Factures en retard: ${overdueInvoices.length}`;

  // List quotes to relance with details
  const quotesToRelanceDetails = quotesToRelance.length > 0
    ? '\n\n### Devis à relancer (>7 jours)\n' + quotesToRelance.map(q => 
        `- ${q.clientName}: ${q.amount.toLocaleString('fr-FR')}€ (envoyé il y a ${q.daysSinceSent} jours) [ID: ${q.id}]`
      ).join('\n')
    : '';

  const overdueTasks = context.tasks.filter(t => t.isOverdue);
  const highPriorityTasks = context.tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
  
  const tasksSummary = `
- Tâches en retard: ${overdueTasks.length}
- Tâches haute priorité: ${highPriorityTasks.length}`;

  // List overdue tasks
  const overdueTasksDetails = overdueTasks.length > 0
    ? '\n\n### Tâches en retard\n' + overdueTasks.slice(0, 5).map(t => 
        `- "${t.title}" (${t.projectName}) - échéance: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : 'N/A'}`
      ).join('\n')
    : '';

  return `${basePrompt}

## Contexte actuel de ${context.username}

### Clients (${context.clients.length} total)
${clientsSummary}

### Projets (${context.projects.length} total)
${projectsSummary}

### Facturation
${invoicesSummary}${quotesToRelanceDetails}

### Tâches
${tasksSummary}${overdueTasksDetails}

${quotesToRelance.length > 0 ? `\n⚠️ ALERTE: ${quotesToRelance.length} devis attendent une réponse depuis plus de 7 jours !` : ''}
${overdueInvoices.length > 0 ? `\n⚠️ ALERTE: ${overdueInvoices.length} factures sont en retard de paiement !` : ''}
${overdueTasks.length > 0 ? `\n⚠️ ALERTE: ${overdueTasks.length} tâches sont en retard !` : ''}`;
}

// ============================================================================
// SÉCURITÉ : Validation anti-usurpation
// Tous les IDs doivent provenir du contexte utilisateur (fetchUserContext).
// Jamais faire confiance à un ID fourni par le modèle sans vérification.
// ============================================================================

function isProjectInContext(ctx: UserContext | null, projectId: string): boolean {
  return !!ctx?.projects?.some((p) => p.id === projectId);
}
function isClientInContext(ctx: UserContext | null, clientId: string): boolean {
  return !!ctx?.clients?.some((c) => c.id === clientId);
}
function isTaskInContext(ctx: UserContext | null, taskId: string): boolean {
  return !!ctx?.tasks?.some((t) => t.id === taskId);
}
function isInvoiceInContext(ctx: UserContext | null, invoiceId: string): boolean {
  return !!ctx?.invoices?.some((i) => i.id === invoiceId);
}

async function strapiFetch(
  endpoint: string,
  token: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}/api/${endpoint}`;
  try {
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    if (options.body !== undefined) {
      fetchOptions.body = JSON.stringify({ data: options.body });
    }
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = data?.error?.message || `Erreur ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau' };
  }
}

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

const relanceEmailSchema = z.object({
  clientName: z.string().describe('Nom du client'),
  clientEmail: z.string().optional().describe('Email du client si disponible'),
  context: z.enum(['quote', 'invoice', 'project', 'general']).describe('Type de relance'),
  tone: z.enum(['friendly', 'professional', 'urgent']).describe('Ton de l\'email'),
  additionalContext: z.string().optional().describe('Contexte supplémentaire'),
  daysSinceLastContact: z.number().optional().describe('Nombre de jours depuis le dernier contact'),
});

const createTaskSchema = z.object({
  title: z.string().describe('Titre de la tâche'),
  projectId: z.string().optional().describe('ID du projet (documentId)'),
  projectName: z.string().optional().describe('Nom du projet pour référence'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().optional().describe('Date d\'échéance au format YYYY-MM-DD'),
  description: z.string().optional().describe('Description de la tâche'),
});

const createQuoteSchema = z.object({
  clientId: z.string().describe('ID du client (documentId)'),
  clientName: z.string().describe('Nom du client'),
  projectId: z.string().optional().describe('ID du projet associé'),
  projectName: z.string().optional().describe('Nom du projet pour référence'),
  estimatedAmount: z.number().optional().describe('Montant estimé du devis en euros'),
  description: z.string().optional().describe('Description ou contexte du devis'),
});

const suggestNextStepsSchema = z.object({
  focus: z.enum(['project', 'client', 'revenue', 'general']).describe('Domaine de focus'),
  projectId: z.string().optional().describe('ID du projet spécifique'),
  clientId: z.string().optional().describe('ID du client spécifique'),
});

const createContractSchema = z.object({
  clientId: z.string().describe('ID du client (documentId)'),
  clientName: z.string().describe('Nom du client'),
  projectId: z.string().optional().describe('ID du projet associé'),
  projectName: z.string().optional().describe('Nom du projet pour référence'),
  contractType: z.enum(['freelance', 'service', 'maintenance', 'confidentiality', 'other']).default('service').describe('Type de contrat'),
  title: z.string().optional().describe('Titre du contrat (sera généré automatiquement si non fourni)'),
});

const updateTaskSchema = z.object({
  taskId: z.string().describe('ID de la tâche (documentId)'),
  title: z.string().optional().describe('Nouveau titre'),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled', 'archived']).optional().describe('Nouveau statut'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Nouvelle priorité'),
  dueDate: z.string().optional().describe('Nouvelle date d\'échéance YYYY-MM-DD'),
  description: z.string().optional().describe('Nouvelle description'),
});

const deleteTaskSchema = z.object({
  taskId: z.string().describe('ID de la tâche à supprimer (documentId)'),
});

const updateClientSchema = z.object({
  clientId: z.string().describe('ID du client (documentId)'),
  name: z.string().optional().describe('Nouveau nom'),
  email: z.string().optional().describe('Nouvel email'),
  pipelineStatus: z.string().optional().describe('Nouveau statut pipeline'),
});

const createClientSchema = z.object({
  name: z.string().describe('Nom du client'),
  email: z.string().describe('Email du client (requis)'),
  company: z.string().optional().describe('Entreprise ou nom de société'),
});

const updateProjectSchema = z.object({
  projectId: z.string().describe('ID du projet (documentId)'),
  title: z.string().optional().describe('Nouveau titre'),
  status: z.enum(['planning', 'in_progress', 'development', 'review', 'completed', 'on_hold', 'archived']).optional().describe('Nouveau statut'),
});

// ============================================================================
// TOOL EXECUTE FUNCTIONS
// ============================================================================

async function executeGenerateRelanceEmail(
  params: z.infer<typeof relanceEmailSchema>,
  _context: UserContext | null,
  _token: string | null
) {
  const { clientName, context, tone, additionalContext, daysSinceLastContact } = params;
  
  const toneStyles = {
    friendly: {
      greeting: 'Bonjour',
      closing: 'À très bientôt',
      style: 'décontracté et chaleureux',
    },
    professional: {
      greeting: 'Bonjour',
      closing: 'Bien cordialement',
      style: 'professionnel et courtois',
    },
    urgent: {
      greeting: 'Bonjour',
      closing: 'Dans l\'attente de votre retour',
      style: 'professionnel avec une note d\'urgence',
    },
  };

  const toneStyle = toneStyles[tone];
  const urgencyNote = daysSinceLastContact && daysSinceLastContact > 14 
    ? '\n\nJe me permets d\'insister car cela fait maintenant plus de deux semaines que nous attendons votre retour.'
    : '';

  const emailTemplates: Record<string, { subject: string; body: string }> = {
    quote: {
      subject: `Suivi de notre proposition - ${clientName}`,
      body: `${toneStyle.greeting},

Je me permets de revenir vers vous concernant le devis que je vous ai transmis.

Avez-vous eu l'occasion de le consulter ? Je reste entièrement disponible pour en discuter et répondre à toutes vos questions.${additionalContext ? `\n\n${additionalContext}` : ''}${urgencyNote}

${toneStyle.closing}`,
    },
    invoice: {
      subject: `Rappel - Facture en attente de règlement`,
      body: `${toneStyle.greeting},

Je me permets de vous relancer concernant la facture en attente de règlement.

Pourriez-vous me confirmer le traitement de celle-ci ? Si vous rencontrez des difficultés, n'hésitez pas à m'en faire part.${additionalContext ? `\n\n${additionalContext}` : ''}

${toneStyle.closing}`,
    },
    project: {
      subject: `Point d'avancement - ${clientName}`,
      body: `${toneStyle.greeting},

Je souhaitais faire un point sur l'avancement de notre projet.

Êtes-vous disponible pour un rapide échange cette semaine ? Cela nous permettrait de valider les prochaines étapes ensemble.${additionalContext ? `\n\n${additionalContext}` : ''}

${toneStyle.closing}`,
    },
    general: {
      subject: `Prenons des nouvelles - ${clientName}`,
      body: `${toneStyle.greeting},

J'espère que vous allez bien. Je souhaitais prendre de vos nouvelles et voir si je peux vous accompagner sur de nouveaux projets.

N'hésitez pas à me contacter si vous avez des besoins ou si vous souhaitez discuter de nouvelles opportunités.${additionalContext ? `\n\n${additionalContext}` : ''}

${toneStyle.closing}`,
    },
  };

  return {
    success: true,
    email: emailTemplates[context],
    metadata: {
      clientName,
      context,
      tone: toneStyle.style,
    },
  };
}

async function executeCreateTask(
  params: z.infer<typeof createTaskSchema>,
  context: UserContext | null,
  token: string | null
) {
  const { title, projectId, projectName, priority, dueDate, description } = params;
  if (!context || !token) return { success: false, error: 'Authentification requise' };
  if (!projectId) return { success: false, error: 'Un projet doit être choisi pour créer une tâche.' };
  if (!isProjectInContext(context, projectId))
    return { success: false, error: 'Ce projet n\'appartient pas à ton espace. Utilise uniquement les IDs du contexte.' };
  const res = await strapiFetch('project-tasks', token, {
    method: 'POST',
    body: {
      project: { connect: [{ documentId: projectId }] },
      title,
      description: description || '',
      task_status: 'todo',
      priority: priority || 'medium',
      progress: 0,
      start_date: null,
      due_date: dueDate || null,
      completed_date: null,
      estimated_hours: null,
      actual_hours: null,
      order: 0,
      created_user: { connect: [{ id: context.userId }] },
      tags: [],
      parent_task: null,
      color: '#8B5CF6',
    },
  });
  if (!res.ok) return { success: false, error: res.error || 'Erreur création tâche' };
  return { success: true, task: { title, projectId, projectName, created: true }, message: `Tâche "${title}" créée.` };
}

async function executeCreateQuote(
  params: z.infer<typeof createQuoteSchema>,
  context: UserContext | null,
  _token: string | null
) {
  const { clientId, clientName, projectId, projectName, estimatedAmount, description } = params;
  if (!context) return { success: false, error: 'Contexte non disponible' };
  if (!isClientInContext(context, clientId))
    return { success: false, error: 'Ce client n\'appartient pas à ton espace. Utilise uniquement les IDs du contexte.' };
  if (projectId && !isProjectInContext(context, projectId))
    return { success: false, error: 'Ce projet n\'appartient pas à ton espace.' };
  return {
    success: true,
    quote: { clientId, clientName, projectId, projectName, amount: estimatedAmount, description, created: false },
    actionUrl: `/dashboard/factures/new?type=quote&client=${clientId}${projectId ? `&project=${projectId}` : ''}`,
    message: `Devis prêt pour ${clientName}${estimatedAmount ? ` (~${estimatedAmount.toLocaleString('fr-FR')}€)` : ''}. Clique pour ouvrir l'éditeur.`,
  };
}

async function executeSuggestNextSteps(
  params: z.infer<typeof suggestNextStepsSchema>,
  _context: UserContext | null,
  _token: string | null
) {
  const { focus } = params;
  
  const suggestions: Record<string, string[]> = {
    project: [
      'Traiter les tâches bloquantes en priorité - elles retardent tout le reste',
      'Envoyer un point d\'avancement au client pour maintenir la relation',
      'Planifier la prochaine livraison et définir les milestones',
      'Vérifier si des ressources manquent pour avancer',
    ],
    client: [
      'Relancer les devis en attente depuis plus de 7 jours',
      'Programmer des points réguliers avec les clients actifs',
      'Qualifier les nouveaux prospects dans le pipeline',
      'Mettre à jour les statuts clients dans le CRM',
    ],
    revenue: [
      'Relancer les factures impayées en priorité',
      'Convertir les devis en attente - chaque jour compte',
      'Identifier les opportunités d\'upsell sur les clients existants',
      'Préparer les factures pour les projets terminés',
    ],
    general: [
      'Traiter les tâches en retard pour éviter l\'accumulation',
      'Relancer les clients silencieux depuis plus de 2 semaines',
      'Mettre à jour le pipeline commercial',
      'Bloquer du temps pour le travail de fond',
    ],
  };

  return {
    success: true,
    focus,
    steps: suggestions[focus],
  };
}

async function executeCreateContract(
  params: z.infer<typeof createContractSchema>,
  context: UserContext | null,
  _token: string | null
) {
  const { clientId, clientName, projectId, projectName, contractType, title } = params;
  if (!context) return { success: false, error: 'Contexte non disponible' };
  if (!isClientInContext(context, clientId))
    return { success: false, error: 'Ce client n\'appartient pas à ton espace.' };
  if (projectId && !isProjectInContext(context, projectId))
    return { success: false, error: 'Ce projet n\'appartient pas à ton espace.' };
  const contractTypeLabels: Record<string, string> = {
    freelance: 'Contrat freelance',
    service: 'Contrat de prestation de services',
    maintenance: 'Contrat de maintenance',
    confidentiality: 'Accord de confidentialité (NDA)',
    other: 'Contrat',
  };
  const generatedTitle = title || `${contractTypeLabels[contractType]} - ${clientName}${projectName ? ` - ${projectName}` : ''}`;
  return {
    success: true,
    contract: { clientId, clientName, projectId, projectName, contractType, title: generatedTitle },
    message: `Contrat "${generatedTitle}" prêt à être créé pour ${clientName}.`,
    actionUrl: `/dashboard/contracts/new?client=${clientId}${projectId ? `&project=${projectId}` : ''}&type=${contractType}&title=${encodeURIComponent(generatedTitle)}`,
  };
}

async function executeUpdateTask(
  params: z.infer<typeof updateTaskSchema>,
  context: UserContext | null,
  token: string | null
) {
  if (!context || !token) return { success: false, error: 'Authentification requise' };
  if (!isTaskInContext(context, params.taskId))
    return { success: false, error: 'Cette tâche n\'appartient pas à ton espace. Utilise uniquement les IDs du contexte.' };
  const payload: Record<string, unknown> = {};
  if (params.title) payload.title = params.title;
  if (params.status) {
    payload.task_status = params.status;
    if (params.status === 'completed') payload.completed_date = new Date().toISOString();
  }
  if (params.priority) payload.priority = params.priority;
  if (params.dueDate) payload.due_date = params.dueDate;
  if (params.description) payload.description = params.description;
  if (Object.keys(payload).length === 0) return { success: false, error: 'Aucune modification fournie.' };
  const res = await strapiFetch(`project-tasks/${params.taskId}`, token, { method: 'PUT', body: payload });
  if (!res.ok) return { success: false, error: res.error || 'Erreur mise à jour' };
  return { success: true, message: 'Tâche mise à jour.' };
}

async function executeDeleteTask(
  params: z.infer<typeof deleteTaskSchema>,
  context: UserContext | null,
  token: string | null
) {
  if (!context || !token) return { success: false, error: 'Authentification requise' };
  if (!isTaskInContext(context, params.taskId))
    return { success: false, error: 'Cette tâche n\'appartient pas à ton espace.' };
  const res = await strapiFetch(`project-tasks/${params.taskId}`, token, { method: 'DELETE' });
  if (!res.ok) return { success: false, error: res.error || 'Erreur suppression' };
  return { success: true, message: 'Tâche supprimée.' };
}

async function executeUpdateClient(
  params: z.infer<typeof updateClientSchema>,
  context: UserContext | null,
  token: string | null
) {
  if (!context || !token) return { success: false, error: 'Authentification requise' };
  if (!isClientInContext(context, params.clientId))
    return { success: false, error: 'Ce client n\'appartient pas à ton espace.' };
  const payload: Record<string, unknown> = {};
  if (params.name) payload.name = params.name;
  if (params.email) payload.email = params.email;
  if (params.pipelineStatus) payload.pipeline_status = params.pipelineStatus;
  if (Object.keys(payload).length === 0) return { success: false, error: 'Aucune modification fournie.' };
  const res = await strapiFetch(`clients/${params.clientId}`, token, { method: 'PUT', body: payload });
  if (!res.ok) return { success: false, error: res.error || 'Erreur mise à jour' };
  return { success: true, message: 'Client mis à jour.' };
}

async function executeCreateClient(
  params: z.infer<typeof createClientSchema>,
  context: UserContext | null,
  token: string | null
) {
  if (!context || !token) return { success: false, error: 'Authentification requise' };
  const res = await strapiFetch('clients', token, {
    method: 'POST',
    body: {
      name: params.name,
      email: params.email,
      enterprise: params.company || 'Non spécifié',
      processStatus: 'prospect',
      users: { connect: [{ id: context.userId }] },
    },
  });
  if (!res.ok) return { success: false, error: res.error || 'Erreur création client' };
  return { success: true, message: `Client "${params.name}" créé.` };
}

async function executeUpdateProject(
  params: z.infer<typeof updateProjectSchema>,
  context: UserContext | null,
  token: string | null
) {
  if (!context || !token) return { success: false, error: 'Authentification requise' };
  if (!isProjectInContext(context, params.projectId))
    return { success: false, error: 'Ce projet n\'appartient pas à ton espace.' };
  const payload: Record<string, unknown> = {};
  if (params.title) payload.title = params.title;
  if (params.status) payload.project_status = params.status;
  if (Object.keys(payload).length === 0) return { success: false, error: 'Aucune modification fournie.' };
  const res = await strapiFetch(`projects/${params.projectId}`, token, { method: 'PUT', body: payload });
  if (!res.ok) return { success: false, error: res.error || 'Erreur mise à jour' };
  return { success: true, message: 'Projet mis à jour.' };
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    
    // Get auth token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    // Fetch user context
    const context = token ? await fetchUserContext(token) : null;
 
    
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        generateRelanceEmail: {
          description: 'Génère un email de relance personnalisé pour un client ou un devis en attente.',
          inputSchema: relanceEmailSchema,
          execute: (p) => executeGenerateRelanceEmail(p, context, token),
        },
        createTask: {
          description: 'Crée une tâche dans un projet. Le projet doit appartenir à l\'utilisateur.',
          inputSchema: createTaskSchema,
          execute: (p) => executeCreateTask(p, context, token),
        },
        createQuote: {
          description: 'Prépare un devis pour un client. Le client doit appartenir à l\'utilisateur.',
          inputSchema: createQuoteSchema,
          execute: (p) => executeCreateQuote(p, context, token),
        },
        suggestNextSteps: {
          description: 'Suggère les prochaines étapes prioritaires basées sur le contexte actuel.',
          inputSchema: suggestNextStepsSchema,
          execute: (p) => executeSuggestNextSteps(p, context, token),
        },
        createContract: {
          description: 'Prépare un contrat pour un client. Le client doit appartenir à l\'utilisateur.',
          inputSchema: createContractSchema,
          execute: (p) => executeCreateContract(p, context, token),
        },
        updateTask: {
          description: 'Met à jour une tâche existante (titre, statut, priorité, date).',
          inputSchema: updateTaskSchema,
          execute: (p) => executeUpdateTask(p, context, token),
        },
        deleteTask: {
          description: 'Supprime une tâche.',
          inputSchema: deleteTaskSchema,
          execute: (p) => executeDeleteTask(p, context, token),
        },
        updateClient: {
          description: 'Met à jour un client (nom, email, statut pipeline).',
          inputSchema: updateClientSchema,
          execute: (p) => executeUpdateClient(p, context, token),
        },
        createClient: {
          description: 'Crée un nouveau client.',
          inputSchema: createClientSchema,
          execute: (p) => executeCreateClient(p, context, token),
        },
        updateProject: {
          description: 'Met à jour un projet (titre, statut).',
          inputSchema: updateProjectSchema,
          execute: (p) => executeUpdateProject(p, context, token),
        },
      },
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
