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

export const fetchProjectById = (id: number) =>
  fetchEntityById('projects', id);

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
