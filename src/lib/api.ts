/**
 * @file api.ts
 * @description API centralisée pour les requêtes Strapi
 */

import type { Client } from '@/types';

// ============================================================================
// CONFIGURATION & HELPERS
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

/** Récupère le token d'authentification */
const getToken = (): string | null => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
};

/** Headers par défaut avec authentification */
const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
};

/** Wrapper générique pour les requêtes fetch */
async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_URL}/api/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers as HeadersInit),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const errorMessage = errorData?.error?.message || `Erreur ${res.status}: ${res.statusText}`;
    throw new Error(errorMessage);
  }

  // Gérer les réponses vides (204 No Content) typiques des suppressions
  const contentType = res.headers.get('content-type');
  if (res.status === 204 || !contentType?.includes('application/json')) {
    return null as T;
  }

  // Vérifier si le body est vide avant de parser
  const text = await res.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text);
}

/** GET request */
const get = <T = unknown>(endpoint: string): Promise<T> => 
  apiRequest<T>(endpoint);

/** POST request */
const post = <T = unknown>(endpoint: string, data: unknown): Promise<T> =>
  apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });

/** PUT request */
const put = <T = unknown>(endpoint: string, data: unknown): Promise<T> =>
  apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });

/** DELETE request */
const del = <T = unknown>(endpoint: string): Promise<T> =>
  apiRequest<T>(endpoint, { method: 'DELETE' });

// ============================================================================
// TYPES COMMUNS
// ============================================================================

interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// ============================================================================
// FONCTIONS UTILITAIRES FACTORISÉES
// ============================================================================

/** Récupère le nombre d'éléments pour une entité donnée */
export async function fetchCount(
  entity: 'clients' | 'projects' | 'prospects' | 'mentors' | 'newsletters' | 'factures',
  userId: number,
  filterField: string = 'users'
): Promise<number> {
  const res = await get<ApiResponse<unknown[]>>(
    `${entity}?filters[${filterField}][$eq]=${userId}`
  );
  return res.data?.length || 0;
}

/** Récupère une liste d'entités pour un utilisateur */
export async function fetchUserEntities<T>(
  entity: string,
  userId: number,
  filterField: string = 'users',
  additionalFilters: string = ''
): Promise<ApiResponse<T[]>> {
  return get<ApiResponse<T[]>>(
    `${entity}?populate=*&filters[${filterField}][$eq]=${userId}${additionalFilters}`
  );
}

/** Récupère une entité par ID */
export async function fetchEntityById<T>(
  entity: string,
  id: number | string,
  useDocumentId: boolean = false
): Promise<ApiResponse<T[]>> {
  const filterKey = useDocumentId ? 'documentId' : 'id';
  return get<ApiResponse<T[]>>(`${entity}?populate=*&filters[${filterKey}][$eq]=${id}`);
}

// ============================================================================
// CLIENTS
// ============================================================================

export async function checkClientDuplicate(
  userId: number,
  name: string,
  email: string
): Promise<{ isDuplicate: boolean; duplicateField: 'name' | 'email' | null }> {
  // Vérifier le nom
  const nameCheck = await get<ApiResponse<unknown[]>>(
    `clients?filters[users][$eq]=${userId}&filters[name][$eqi]=${encodeURIComponent(name)}`
  );
  if (nameCheck.data?.length > 0) {
    return { isDuplicate: true, duplicateField: 'name' };
  }

  // Vérifier l'email
  const emailCheck = await get<ApiResponse<unknown[]>>(
    `clients?filters[users][$eq]=${userId}&filters[email][$eqi]=${encodeURIComponent(email)}`
  );
  if (emailCheck.data?.length > 0) {
    return { isDuplicate: true, duplicateField: 'email' };
  }

  return { isDuplicate: false, duplicateField: null };
}

export async function addClientUser(
  userId: number,
  data: {
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    website: string;
    processStatus: string;
    isActive?: boolean;
  },
  skipDuplicateCheck = false
) {
  if (!skipDuplicateCheck) {
    const duplicateCheck = await checkClientDuplicate(userId, data.name, data.email);
    if (duplicateCheck.isDuplicate) {
      const field = duplicateCheck.duplicateField === 'name' ? 'nom' : 'email';
      throw new Error(`Un client avec ce ${field} existe déjà`);
    }
  }

  return post('clients', { ...data, users: userId });
}

export const fetchClientsUser = (userId: number) =>
  fetchUserEntities('clients', userId);

export const fetchNumberOfClientsUser = (userId: number) =>
  fetchCount('clients', userId);

export const fetchClientById = (id: number) =>
  fetchEntityById('clients', id);

export const fetchClientByDocumentId = (documentId: string) =>
  fetchEntityById('clients', documentId, true);

/** Recherche un client par son nom (slug) */
export const fetchClientBySlug = async (slug: string): Promise<ApiResponse<Client[]>> => {
  // Convertit le slug en pattern de recherche (remplace les tirets par des espaces pour la recherche)
  // On fait une recherche insensible à la casse
  const searchTerm = slug.replace(/-/g, ' ');
  return get<ApiResponse<Client[]>>(`clients?populate=*&filters[name][$containsi]=${encodeURIComponent(searchTerm)}`);
};

export async function updateClientById(
  clientId: string,
  data: {
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    website: string;
    processStatus: string;
  }
) {
  return put(`clients/${clientId}`, data);
}

/** Supprime un client par son documentId */
export const deleteClient = (documentId: string) =>
  del(`clients/${documentId}`);

// ============================================================================
// PROJECTS
// ============================================================================

export const fetchProjectsUser = (userId: number) =>
  fetchUserEntities('projects', userId, 'user');

/** Récupère tous les projets de l'utilisateur (propriétaire + collaborateur) */
export async function fetchAllUserProjects(userId: number) {
  // 1. Récupérer les projets où l'utilisateur est propriétaire
  const ownedProjects = await fetchUserEntities('projects', userId, 'user');
  
  // 2. Récupérer les collaborations de l'utilisateur
  try {
    const collaborationsResponse = await get<ApiResponse<{
      project: {
        id: number;
        documentId: string;
        title: string;
        description: string;
        project_status: string;
        deadline: string;
        createdAt: string;
        updatedAt: string;
      };
      permission: string;
      is_owner: boolean;
    }[]>>(`project-collaborators?populate=project&filters[user][id][$eq]=${userId}`);
    
    const collaborations = collaborationsResponse.data || [];
    
    // Extraire les projets des collaborations
    const collaboratedProjects = collaborations
      .filter(c => c.project && !c.is_owner) // Exclure les projets dont l'utilisateur est propriétaire
      .map(c => ({
        ...c.project,
        _isCollaborator: true,
        _permission: c.permission,
      }));
    
    // Combiner les projets (propriétaire + collaborateur)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownedProjectsData = (ownedProjects as any).data || [];
    const ownedProjectIds = new Set(ownedProjectsData.map((p: { documentId: string }) => p.documentId));
    
    // Filtrer les projets collaborés pour éviter les doublons
    const uniqueCollaboratedProjects = collaboratedProjects.filter(
      p => !ownedProjectIds.has(p.documentId)
    );
    
    return {
      data: [...ownedProjectsData, ...uniqueCollaboratedProjects],
      meta: {},
    };
  } catch {
    // Si project-collaborators n'existe pas encore, retourner juste les projets possédés
    return ownedProjects;
  }
}

export const fetchProjectById = (id: number) =>
  fetchEntityById('projects', id);

export const fetchProjectByDocumentId = (documentId: string) =>
  fetchEntityById('projects', documentId, true);

export const fetchNumberOfProjectsUser = (userId: number) =>
  fetchCount('projects', userId, 'user');

export const fetchUnassignedProjects = (userId: number) =>
  get(`projects?populate=*&filters[user][$eq]=${userId}&filters[client][$null]=true`);

export async function updateProject(
  projectDocumentId: string,
  data: {
    title?: string;
    description?: string;
    notes?: string;
    project_status?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
    client?: string | null;
  }
) {
  return put(`projects/${projectDocumentId}`, data);
}

export async function checkProjectDuplicateForClient(
  clientId: number,
  title: string
): Promise<{ isDuplicate: boolean; existingProject: { id: number; title: string } | null }> {
  const check = await get<ApiResponse<{ id: number; title: string }[]>>(
    `projects?filters[client][$eq]=${clientId}&filters[title][$eqi]=${encodeURIComponent(title)}`
  );
  if (check.data?.length > 0) {
    return {
      isDuplicate: true,
      existingProject: { id: check.data[0].id, title: check.data[0].title },
    };
  }
  return { isDuplicate: false, existingProject: null };
}

export async function checkProjectAlreadyAssigned(
  projectId: number,
  clientId: number
): Promise<boolean> {
  try {
    const project = await get<{ data: { client?: { id: number } } }>(
      `projects/${projectId}?populate=client`
    );
    return project.data?.client?.id === clientId;
  } catch {
    return false;
  }
}

export async function createProject(
  data: {
    title: string;
    description: string;
    project_status: string;
    start_date: string;
    end_date: string;
    notes?: string;
    type: string;
    technologies?: string[];
    client?: number;
    user?: number;
  },
  skipDuplicateCheck = false
) {
  if (!skipDuplicateCheck && data.client) {
    const duplicateCheck = await checkProjectDuplicateForClient(data.client, data.title);
    if (duplicateCheck.isDuplicate) {
      throw new Error(`Un projet "${duplicateCheck.existingProject?.title}" existe déjà pour ce client`);
    }
  }

  const { technologies, ...projectData } = data;
  const payload = {
    ...projectData,
    notes: technologies?.length
      ? `${projectData.notes || ''}\n\nTechnologies: ${technologies.join(', ')}`.trim()
      : projectData.notes,
  };

  return post('projects', payload);
}

export async function assignProjectToClient(
  projectId: number,
  clientId: number
): Promise<{ success: boolean; message: string }> {
  const isAlreadyAssigned = await checkProjectAlreadyAssigned(projectId, clientId);
  if (isAlreadyAssigned) {
    throw new Error('Ce projet est déjà assigné à ce client');
  }

  await put(`projects/${projectId}`, { client: clientId });
  return { success: true, message: 'Projet assigné avec succès' };
}

/** Supprime un projet par son documentId */
export const deleteProject = (documentId: string) =>
  del(`projects/${documentId}`);

// ============================================================================
// PROSPECTS
// ============================================================================

export const fetchProspectsUser = (userId: number) =>
  fetchUserEntities('prospects', userId);

export const fetchProspectById = (id: string) =>
  get(`prospects/${parseInt(id, 10)}?populate=*`);

export const fetchNumberOfProspectsUser = (userId: number) =>
  fetchCount('prospects', userId);

/** Supprime un prospect par son documentId */
export const deleteProspect = (documentId: string) =>
  del(`prospects/${documentId}`);

// ============================================================================
// FACTURES
// ============================================================================

export const fetchFacturesUser = (userId: number) =>
  fetchUserEntities('factures', userId, 'user');

export const fetchFacturesByClient = (userId: number, clientId: number) =>
  get(`factures?populate=*&filters[user][$eq]=${userId}&filters[client][id][$eq]=${clientId}`);

export const fetchFacturesByProject = (userId: number, projectId: number) =>
  get(`factures?populate=*&filters[user][$eq]=${userId}&filters[project][id][$eq]=${projectId}`);

export const fetchFacturesUserById = (userId: number, factureId: string) =>
  get(`factures?populate=*&filters[user][$eq]=${userId}&filters[documentId][$eq]=${factureId}`);

export const fetchFactureFromId = (id: string) =>
  fetchEntityById('factures', id);

export const fetchFactureFromDocumentId = (documentId: string) =>
  fetchEntityById('factures', documentId, true);

export async function createFacture(data: {
  reference: string;
  number: number;
  date: string;
  due_date: string;
  facture_status: string;
  currency: string;
  description: string;
  notes: string;
  pdf: string;
  client_id: string; // documentId du client
  project?: string; // documentId du projet
  user: number;
  tva_applicable: boolean;
  invoice_lines: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    reference: data.reference,
    number: data.number,
    date: data.date,
    due_date: data.due_date,
    facture_status: data.facture_status,
    currency: data.currency,
    description: data.description,
    notes: data.notes,
    tva_applicable: data.tva_applicable,
    invoice_lines: data.invoice_lines,
  };

  // Relations Strapi v5 - utiliser documentId
  if (data.client_id) {
    payload.client_id = data.client_id;
  }
  if (data.project) {
    payload.project = data.project;
  }
  if (data.user) {
    payload.user = data.user;
  }
  if (data.pdf) {
    payload.pdf = data.pdf;
  }

  return post('factures', payload);
}

export async function updateFactureById(
  factureId: string,
  data: {
    reference: string;
    number: number;
    date: string;
    due_date: string;
    facture_status: string;
    currency: string;
    description: string;
    notes: string;
    pdf?: string;
    client_id: string; // documentId du client
    project?: string; // documentId du projet
    user: number;
    tva_applicable: boolean;
    invoice_lines: {
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[];
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    reference: data.reference,
    number: data.number,
    date: data.date,
    due_date: data.due_date,
    facture_status: data.facture_status,
    currency: data.currency,
    description: data.description,
    notes: data.notes,
    tva_applicable: data.tva_applicable,
    invoice_lines: data.invoice_lines,
  };

  // Relations Strapi - le champ s'appelle client_id dans votre schéma
  if (data.client_id) {
    payload.client_id = data.client_id;
  }
  if (data.project) {
    payload.project = data.project;
  }
  if (data.user) {
    payload.user = data.user;
  }
  if (data.pdf) {
    payload.pdf = data.pdf;
  }

  console.log('=== UPDATE FACTURE ===');
  console.log('URL:', `factures/${factureId}`);
  console.log('Payload envoyé:', JSON.stringify(payload, null, 2));
  
  const result = await put(`factures/${factureId}`, payload);
  console.log('Réponse Strapi:', result);
  return result;
}

/** Supprime une facture par son documentId */
export const deleteFacture = (documentId: string) =>
  del(`factures/${documentId}`);

// ============================================================================
// MENTORS
// ============================================================================

export const fetchMentorUsers = (userId: number) =>
  fetchUserEntities('mentors', userId);

export const fetchNumberOfMentorsUser = (userId: number) =>
  fetchCount('mentors', userId);

/** Supprime un mentor par son documentId */
export const deleteMentor = (documentId: string) =>
  del(`mentors/${documentId}`);

// ============================================================================
// NEWSLETTERS
// ============================================================================

export const fetchNewslettersUser = (userId: number) =>
  fetchUserEntities('newsletters', userId, 'author');

export const fetchNumberOfNewslettersUser = (userId: number) =>
  fetchCount('newsletters', userId, 'author');

// ============================================================================
// AUTH & USER
// ============================================================================

export async function fetchLogin(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (data?.error?.message === 'Invalid identifier or password') {
      throw new Error('Identifiants invalides');
    }
    throw new Error('Erreur lors de la connexion');
  }

  return res.json();
}

export const fetchLogout = () => get('auth/logout');

export const fetchUserById = (userId: number) =>
  get(`users/${userId}?populate=*`);

export async function updateUser(
  userId: number,
  data: {
    username?: string;
    email?: string;
    profile_picture?: { url: string };
    plan?: number;
    billing_type?: string;
  }
) {
  return apiRequest(`users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchCreateAccount(
  username: string,
  email: string,
  password: string
) {
  const res = await fetch(`${API_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (data?.error?.message === 'Email or Username are already taken') {
      throw new Error('Username or Email already exists');
    }
    throw new Error('An error occurred during authentication');
  }

  return res.json();
}

// ============================================================================
// PLANS & SUBSCRIPTIONS
// ============================================================================

export const fetchPlans = () => get('plans?populate=*');

export const fetchSubscriptionsUser = (userId: number) =>
  fetchUserEntities('subscriptions', userId);

export async function cancelSubscription(userId: number) {
  const existingSubscriptions = await fetchSubscriptionsUser(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptions = existingSubscriptions as any;
  
  if (subscriptions.data?.length > 0) {
    const existingSubscription = subscriptions.data[0];
    return put(`subscriptions/${existingSubscription.documentId}`, {
      subscription_status: 'canceled',
    });
  }
  throw new Error('Aucun abonnement trouvé');
}

export async function createSubscription(
  userId: number,
  data: {
    plan: string;
    billing_type: string;
    price?: number;
    trial?: boolean;
    plan_name?: string;
    plan_description?: string;
    plan_features?: string;
    start_date?: string;
  }
) {
  const existingSubscriptions = await fetchSubscriptionsUser(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptions = existingSubscriptions as any;

  const subscriptionData = {
    plan: data.plan,
    subscription_status: 'active',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    billing_type: data.billing_type,
    auto_renew: true,
    trial: data.trial || false,
  };

  if (subscriptions.data?.length > 0) {
    const existingSubscription = subscriptions.data[0];
    return put(`subscriptions/${existingSubscription.documentId}`, subscriptionData);
  }
  
  return post('subscriptions', { ...subscriptionData, users: userId });
}

// ============================================================================
// UPLOAD D'IMAGES
// ============================================================================

const API_URL_BASE = process.env.NEXT_PUBLIC_STRAPI_URL;

/** Upload une image vers Strapi */
export async function uploadImage(file: File): Promise<{ id: number; url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('files', file);

  const res = await fetch(`${API_URL_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Erreur lors de l\'upload de l\'image');
  }

  const data = await res.json();
  return { id: data[0].id, url: data[0].url };
}

/** Met à jour la profile picture d'un utilisateur */
export async function updateUserProfilePicture(userId: number, imageId: number) {
  return apiRequest(`users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ profile_picture: imageId }),
  });
}

/** Met à jour l'image d'un client */
export async function updateClientImage(clientDocumentId: string, imageId: number) {
  return put(`clients/${clientDocumentId}`, { image: imageId });
}

// ============================================================================
// COMPANY
// ============================================================================

export const fetchCompanyUser = (userId: number) =>
  fetchUserEntities('companies', userId, 'user');

export async function updateCompanyUser(
  userId: number,
  companyId: string,
  data: {
    name: string;
    email: string;
    description: string;
    siret: string;
    siren: string;
    vat: string;
    phoneNumber: string;
    logo?: string;
    location: string;
    domaine: string;
    website: string;
  }
) {
  const company = await fetchCompanyUser(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyData = company as any;
  
  if (companyData.data?.length === 0) {
    return post('companies', data);
  }
  return put(`companies/${companyId}`, data);
}

// ============================================================================
// INVITATIONS DE PROJET (COLLABORATION)
// ============================================================================

/** Génère un code d'invitation unique */
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Crée une invitation pour un projet */
export async function createProjectInvitation(data: {
  project: string; // documentId du projet
  sender: number; // id de l'utilisateur qui invite
  recipient_email: string;
  permission?: 'view' | 'edit';
  isPublicLink?: boolean; // true si c'est un lien public partageable
}) {
  const invitationCode = generateInvitationCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 jours

  let recipient: { id: number; documentId: string } | undefined;

  // Si c'est un lien public, pas de recherche de destinataire
  // Si un email est fourni, vérifier si le destinataire existe
  if (!data.isPublicLink && data.recipient_email) {
    try {
      // L'API users-permissions retourne un tableau directement, pas { data: [...] }
      const recipientCheck = await get<{ id: number; documentId: string; email: string }[]>(
        `users?filters[email][$eq]=${encodeURIComponent(data.recipient_email)}`
      );
      
      // recipientCheck est directement un tableau
      if (Array.isArray(recipientCheck) && recipientCheck.length > 0) {
        recipient = recipientCheck[0];
      }
    } catch {
      // Utilisateur non trouvé
    }
  }

  const payload = {
    project: data.project,
    sender: data.sender,
    recipient_email: data.recipient_email || null,
    invitation_code: invitationCode,
    invitation_status: 'pending',
    permission: data.permission || 'edit',
    expires_at: expiresAt,
    ...(recipient ? { recipient: recipient.id } : {}),
  };

  const invitation = await post('project-invitations', payload);

  // Si le destinataire existe, créer une notification
  if (recipient) {
    try {
      // Récupérer les infos du sender et du projet pour la notification
      const senderData = await get<{ username: string }>(`users/${data.sender}`);
      const projectData = await get<ApiResponse<{ title: string }[]>>(
        `projects?filters[documentId][$eq]=${data.project}`
      );
      const projectTitle = projectData.data?.[0]?.title || 'un projet';

      await createNotification({
        user: recipient.id,
        type: 'project_invitation',
        title: 'Invitation à collaborer',
        message: `${senderData.username || 'Un utilisateur'} vous invite à collaborer sur le projet "${projectTitle}"`,
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invitation_id: (invitation as any).data?.documentId,
          project_id: data.project,
          sender_name: senderData.username,
          project_title: projectTitle,
        },
        action_url: `/dashboard/projects/invitation/${invitationCode}`,
      });
    } catch {
      // Erreur création notification - silencieuse
    }
  }

  return { ...(invitation as object), invitation_code: invitationCode };
}

/** Récupère les invitations envoyées par un utilisateur */
export const fetchSentInvitations = (userId: number) =>
  get(`project-invitations?populate=*&filters[sender][$eq]=${userId}`);

/** Récupère les invitations reçues par un utilisateur (via email) */
export const fetchReceivedInvitations = (email: string) =>
  get(`project-invitations?populate=*&filters[recipient_email][$eq]=${encodeURIComponent(email)}&filters[invitation_status][$eq]=pending`);

/** Récupère une invitation par son code */
export const fetchInvitationByCode = (code: string) =>
  get(`project-invitations?populate=*&filters[invitation_code][$eq]=${code}`);

/** Récupère les invitations d'un projet */
export const fetchProjectInvitations = (projectDocumentId: string) =>
  get(`project-invitations?populate=*&filters[project][documentId][$eq]=${projectDocumentId}`);

/** Accepte une invitation */
export async function acceptInvitation(invitationDocumentId: string, userId: number) {
  // Mettre à jour le statut de l'invitation
  const result = await put(`project-invitations/${invitationDocumentId}`, {
    invitation_status: 'accepted',
    recipient: userId,
  });

  // Récupérer l'invitation pour obtenir le projet
  const invitationData = await get<ApiResponse<{ project: { documentId: string }; permission: string }[]>>(
    `project-invitations?filters[documentId][$eq]=${invitationDocumentId}&populate=project`
  );
  const invitation = invitationData.data?.[0];

  if (invitation?.project?.documentId) {
    // Ajouter l'utilisateur comme collaborateur du projet
    await addProjectCollaborator(invitation.project.documentId, userId, invitation.permission as 'view' | 'edit');
  }

  return result;
}

/** Refuse une invitation */
export const rejectInvitation = (invitationDocumentId: string) =>
  put(`project-invitations/${invitationDocumentId}`, { invitation_status: 'rejected' });

/** Annule une invitation (par l'expéditeur) */
export const cancelInvitation = (invitationDocumentId: string) =>
  del(`project-invitations/${invitationDocumentId}`);

// ============================================================================
// COLLABORATEURS DE PROJET
// ============================================================================

/** Ajoute un collaborateur à un projet */
export async function addProjectCollaborator(
  projectDocumentId: string,
  userId: number,
  permission: 'view' | 'edit' = 'edit'
) {
  return post('project-collaborators', {
    project: projectDocumentId,
    user: userId,
    permission,
    joined_at: new Date().toISOString(),
    is_owner: false,
  });
}

/** Récupère les collaborateurs d'un projet */
export const fetchProjectCollaborators = (projectDocumentId: string) =>
  get(`project-collaborators?populate=*&filters[project][documentId][$eq]=${projectDocumentId}`);

/** Récupère les projets partagés avec un utilisateur */
export const fetchSharedProjects = (userId: number) =>
  get(`project-collaborators?populate=*&filters[user][$eq]=${userId}&filters[is_owner][$eq]=false`);

/** Supprime un collaborateur d'un projet */
export const removeProjectCollaborator = (collaboratorDocumentId: string) =>
  del(`project-collaborators/${collaboratorDocumentId}`);

/** Vérifie si l'utilisateur peut supprimer un projet (propriétaire uniquement) */
export async function canDeleteProject(projectDocumentId: string, userId: number): Promise<boolean> {
  const collaborator = await get<ApiResponse<{ is_owner: boolean }[]>>(
    `project-collaborators?filters[project][documentId][$eq]=${projectDocumentId}&filters[user][$eq]=${userId}`
  );
  // Si pas de collaborateur trouvé, vérifier si c'est le créateur original
  if (!collaborator.data?.length) {
    const project = await get<ApiResponse<{ user?: { id: number } }[]>>(
      `projects?filters[documentId][$eq]=${projectDocumentId}&populate=user`
    );
    return project.data?.[0]?.user?.id === userId;
  }
  return collaborator.data[0].is_owner;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/** Crée une notification */
export async function createNotification(data: {
  user: number;
  type: 'project_invitation' | 'project_update' | 'system';
  title: string;
  message: string;
  data?: {
    invitation_id?: string;
    project_id?: string;
    sender_name?: string;
    project_title?: string;
  };
  action_url?: string;
}) {
  return post('notifications', {
    ...data,
    read: false,
  });
}

/** Récupère les notifications d'un utilisateur */
export const fetchNotifications = (userId: number) =>
  get(`notifications?populate=*&filters[user][id][$eq]=${userId}&sort=createdAt:desc`);

/** Récupère le nombre de notifications non lues */
export async function fetchUnreadNotificationCount(userId: number): Promise<number> {
  const res = await get<ApiResponse<unknown[]>>(
    `notifications?filters[user][id][$eq]=${userId}&filters[read][$eq]=false`
  );
  return res.data?.length || 0;
}

/** Marque une notification comme lue */
export const markNotificationAsRead = (notificationDocumentId: string) =>
  put(`notifications/${notificationDocumentId}`, { read: true });

/** Marque toutes les notifications comme lues */
export async function markAllNotificationsAsRead(userId: number) {
  const notifications = await get<ApiResponse<{ documentId: string }[]>>(
    `notifications?filters[user][id][$eq]=${userId}&filters[read][$eq]=false`
  );
  
  const updatePromises = (notifications.data || []).map(n =>
    put(`notifications/${n.documentId}`, { read: true })
  );
  
  return Promise.all(updatePromises);
}

/** Supprime une notification */
export const deleteNotification = (notificationDocumentId: string) =>
  del(`notifications/${notificationDocumentId}`);

// ============================================================================
// PROJECT TASKS (TÂCHES DE PROJET)
// ============================================================================

import type { ProjectTask, TaskStatus, TaskPriority } from '@/types';

/** Récupère les tâches d'un projet */
export const fetchProjectTasks = (projectDocumentId: string) =>
  get<ApiResponse<ProjectTask[]>>(
    `project-tasks?populate=*&filters[project][documentId][$eq]=${projectDocumentId}&sort=order:asc,createdAt:desc`
  );

/** Crée une nouvelle tâche */
export async function createProjectTask(data: {
  project: string; // documentId du projet
  title: string;
  description?: string;
  task_status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  assigned_to?: number; // user id
  created_user: number; // user id
  order?: number;
  tags?: string[];
}) {
  return post('project-tasks', {
    project: data.project,
    title: data.title,
    description: data.description || '',
    task_status: data.task_status || 'todo',
    priority: data.priority || 'medium',
    progress: data.progress || 0,
    start_date: data.start_date || null,
    due_date: data.due_date || null,
    completed_date: null,
    estimated_hours: data.estimated_hours || null,
    order: data.order || 0,
    assigned_to: data.assigned_to || null,
    created_user: data.created_user,
    tags: data.tags || [],
  });
}

/** Met à jour une tâche */
export async function updateProjectTask(
  taskDocumentId: string,
  data: Partial<{
    title: string;
    description: string;
    task_status: TaskStatus;
    priority: TaskPriority;
    progress: number;
    start_date: string | null;
    due_date: string | null;
    completed_date: string | null;
    estimated_hours: number | null;
    assigned_to: number | null;
    order: number;
    tags: string[];
  }>
) {
  // Si la tâche est marquée comme complétée, ajouter la date de complétion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actual_hours: _removed, ...cleanData } = data as Record<string, unknown>;
  const payload = { ...cleanData };
  if (data.task_status === 'completed' && !data.completed_date) {
    payload.completed_date = new Date().toISOString();
    payload.progress = 100;
  }
  
  return put(`project-tasks/${taskDocumentId}`, payload);
}

/** Supprime une tâche */
export const deleteProjectTask = (taskDocumentId: string) =>
  del(`project-tasks/${taskDocumentId}`);

/** Réordonne les tâches */
export async function reorderProjectTasks(tasks: { documentId: string; order: number }[]) {
  const updatePromises = tasks.map(task =>
    put(`project-tasks/${task.documentId}`, { order: task.order })
  );
  return Promise.all(updatePromises);
}

/** Met à jour le statut d'une tâche */
export async function updateTaskStatus(taskDocumentId: string, status: TaskStatus) {
  const payload: { task_status: TaskStatus; completed_date?: string; progress?: number } = {
    task_status: status,
  };
  
  if (status === 'completed') {
    payload.completed_date = new Date().toISOString();
    payload.progress = 100;
  } else if (status === 'todo') {
    payload.completed_date = undefined;
    payload.progress = 0;
  }
  
  return put(`project-tasks/${taskDocumentId}`, payload);
}

/** Met à jour la progression d'une tâche */
export const updateTaskProgress = (taskDocumentId: string, progress: number) =>
  put(`project-tasks/${taskDocumentId}`, { 
    progress: Math.max(0, Math.min(100, progress)),
    task_status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'todo',
    ...(progress >= 100 ? { completed_date: new Date().toISOString() } : {}),
  });
