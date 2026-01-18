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
    
    // Debug: log response
    if (!clientsData.data) {
      console.log('[AI Assistant] Clients API response:', JSON.stringify(clientsData).slice(0, 500));
    }
    
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

    // Debug: log projects/invoices response if empty
    if (!projectsData.data || projectsData.data.length === 0) {
      console.log('[AI Assistant] Projects API response:', JSON.stringify(projectsData).slice(0, 500));
    }
    if (!invoicesData.data || invoicesData.data.length === 0) {
      console.log('[AI Assistant] Invoices API response:', JSON.stringify(invoicesData).slice(0, 500));
    }

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
- createTask: Crée une tâche dans un projet (IMPORTANT: l'utilisateur devra confirmer)
- createQuote: Prépare un devis pré-rempli pour un client (IMPORTANT: l'utilisateur devra confirmer)
- suggestNextSteps: Suggère les prochaines étapes prioritaires

## Règles IMPORTANTES
- Ne jamais inventer de données - utilise UNIQUEMENT les données du contexte
- Si tu n'as pas l'info, dis-le clairement
- Propose toujours une prochaine étape actionnable
- Pour les actions (créer tâche, devis...), demande TOUJOURS confirmation
- Quand tu utilises un tool, explique pourquoi`;

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

// ============================================================================
// TOOL EXECUTE FUNCTIONS
// ============================================================================

async function executeGenerateRelanceEmail(params: z.infer<typeof relanceEmailSchema>) {
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

async function executeCreateTask(params: z.infer<typeof createTaskSchema>) {
  const { title, projectId, projectName, priority, dueDate, description } = params;
  
  return {
    success: true,
    task: {
      title,
      projectId,
      projectName,
      priority,
      dueDate,
      description,
      created: false,
    },
    message: `Tâche "${title}" prête à être créée${projectName ? ` dans le projet "${projectName}"` : ''}. Confirme pour la créer.`,
  };
}

async function executeCreateQuote(params: z.infer<typeof createQuoteSchema>) {
  const { clientId, clientName, projectId, projectName, estimatedAmount, description } = params;
  
  return {
    success: true,
    quote: {
      clientId,
      clientName,
      projectId,
      projectName,
      amount: estimatedAmount,
      description,
      created: false,
    },
    actionUrl: `/dashboard/factures/new?type=quote&client=${clientId}${projectId ? `&project=${projectId}` : ''}`,
    message: `Devis prêt pour ${clientName}${estimatedAmount ? ` (~${estimatedAmount.toLocaleString('fr-FR')}€)` : ''}. Clique pour ouvrir l'éditeur de devis.`,
  };
}

async function executeSuggestNextSteps(params: z.infer<typeof suggestNextStepsSchema>) {
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

async function executeCreateContract(params: z.infer<typeof createContractSchema>) {
  const { clientId, clientName, projectId, projectName, contractType, title } = params;
  
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
    contract: {
      clientId,
      clientName,
      projectId,
      projectName,
      contractType,
      title: generatedTitle,
    },
    message: `Contrat "${generatedTitle}" prêt à être créé pour ${clientName}.`,
    actionUrl: `/dashboard/contracts/new?client=${clientId}${projectId ? `&project=${projectId}` : ''}&type=${contractType}&title=${encodeURIComponent(generatedTitle)}`,
  };
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
    
    // Log context status for debugging
    if (!token) {
      console.log('[AI Assistant] No auth token provided');
    } else if (!context) {
      console.log('[AI Assistant] Failed to fetch user context');
    } else {
      console.log(`[AI Assistant] Context loaded: ${context.clients.length} clients, ${context.projects.length} projects, ${context.invoices.length} invoices`);
    }
    
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
          execute: executeGenerateRelanceEmail,
        },
        createTask: {
          description: 'Prépare une nouvelle tâche à créer dans un projet. L\'utilisateur devra confirmer.',
          inputSchema: createTaskSchema,
          execute: executeCreateTask,
        },
        createQuote: {
          description: 'Prépare un devis pré-rempli pour un client. L\'utilisateur sera redirigé vers l\'éditeur.',
          inputSchema: createQuoteSchema,
          execute: executeCreateQuote,
        },
        suggestNextSteps: {
          description: 'Suggère les prochaines étapes prioritaires basées sur le contexte actuel.',
          inputSchema: suggestNextStepsSchema,
          execute: executeSuggestNextSteps,
        },
        createContract: {
          description: 'Prépare un contrat pour un client. Utilise ce tool quand un devis est accepté ou quand le client demande un contrat.',
          inputSchema: createContractSchema,
          execute: executeCreateContract,
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
