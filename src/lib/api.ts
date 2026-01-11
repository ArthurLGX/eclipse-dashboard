/**
 * @file api.ts
 * @description API centralisée pour les requêtes Strapi
 */

import type { 
  Client, 
  Facture, 
  CreateFactureData,
  ServerCredentialMetadata,
  CreateServerCredentialData,
  MonitoringLog,
  CreateMonitoringLogData,
  MonitoredSite,
  CreateMonitoredSiteData,
  UpdateMonitoredSiteData,
  TimeEntry,
  CreateTimeEntryData,
  UpdateTimeEntryData,
  CalendarEvent,
  CreateCalendarEventData,
  UpdateCalendarEventData,
  MeetingNote,
  CreateMeetingNoteData,
  UpdateMeetingNoteData,
} from '@/types';

// ============================================================================
// CONFIGURATION & HELPERS
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

/** Récupère le token d'authentification */
export const getToken = (): string | null => {
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
  // Utiliser pagination[pageSize]=1 pour éviter de charger tous les éléments
  // et récupérer le total depuis meta.pagination.total
  const res = await get<ApiResponse<unknown[]> & { meta?: { pagination?: { total?: number } } }>(
    `${entity}?pagination[pageSize]=1&filters[${filterField}][$eq]=${userId}`
  );
  // Strapi v4/v5 retourne le total dans meta.pagination.total
  return res.meta?.pagination?.total ?? res.data?.length ?? 0;
}

/** Récupère une liste d'entités pour un utilisateur (avec pagination automatique pour récupérer TOUS les éléments) */
export async function fetchUserEntities<T>(
  entity: string,
  userId: number,
  filterField: string = 'users',
  additionalFilters: string = '',
  pageSize: number = 100 // Strapi limite par défaut à 100 max
): Promise<ApiResponse<T[]>> {
  const allData: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await get<ApiResponse<T[]> & { meta?: { pagination?: { pageCount?: number; page?: number } } }>(
      `${entity}?populate=*&pagination[pageSize]=${pageSize}&pagination[page]=${page}&filters[${filterField}][$eq]=${userId}${additionalFilters}`
    );

    if (response.data && response.data.length > 0) {
      allData.push(...response.data);
    }

    // Vérifier s'il y a plus de pages
    const pagination = response.meta?.pagination;
    if (pagination && pagination.page && pagination.pageCount) {
      hasMore = pagination.page < pagination.pageCount;
    } else {
      hasMore = response.data && response.data.length === pageSize;
    }
    
    page++;
  }

  return { data: allData };
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

export type DuplicateCheckMode = 'email_only' | 'name_only' | 'name_and_email' | 'name_or_email';

export async function checkClientDuplicate(
  userId: number,
  name: string,
  email: string,
  mode: DuplicateCheckMode = 'email_only'
): Promise<{ isDuplicate: boolean; duplicateField: 'name' | 'email' | 'both' | null }> {
  
  // Vérifier l'email (pagination pour éviter la limite de 25 par défaut)
  const emailCheck = await get<ApiResponse<unknown[]>>(
    `clients?pagination[pageSize]=1&filters[users][id][$eq]=${userId}&filters[email][$eqi]=${encodeURIComponent(email)}`
  );
  const emailExists = (emailCheck.data?.length ?? 0) > 0;

  // Vérifier le nom
  const nameCheck = await get<ApiResponse<unknown[]>>(
    `clients?pagination[pageSize]=1&filters[users][id][$eq]=${userId}&filters[name][$eqi]=${encodeURIComponent(name)}`
  );
  const nameExists = (nameCheck.data?.length ?? 0) > 0;

  switch (mode) {
    case 'email_only':
      // Recommandé : l'email est unique par nature
      if (emailExists) {
        return { isDuplicate: true, duplicateField: 'email' };
      }
      break;
    
    case 'name_only':
      if (nameExists) {
        return { isDuplicate: true, duplicateField: 'name' };
      }
      break;
    
    case 'name_and_email':
      // Très permissif : bloque seulement si les deux existent
      if (nameExists && emailExists) {
        return { isDuplicate: true, duplicateField: 'both' };
      }
      break;
    
    case 'name_or_email':
      // Ancien comportement, très restrictif
      if (nameExists) {
        return { isDuplicate: true, duplicateField: 'name' };
      }
      if (emailExists) {
        return { isDuplicate: true, duplicateField: 'email' };
      }
      break;
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
    image?: number; // ID du fichier uploadé sur Strapi
  },
  options: { 
    skipDuplicateCheck?: boolean; 
    duplicateCheckMode?: DuplicateCheckMode 
  } = {}
) {
  const { skipDuplicateCheck = false, duplicateCheckMode = 'email_only' } = options;
  
  if (!skipDuplicateCheck) {
    const duplicateCheck = await checkClientDuplicate(userId, data.name, data.email, duplicateCheckMode);
    if (duplicateCheck.isDuplicate) {
      const fieldMap = {
        name: 'nom',
        email: 'email',
        both: 'nom et email'
      };
      const field = duplicateCheck.duplicateField ? fieldMap[duplicateCheck.duplicateField] : 'champ';
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

/** Met à jour le statut d'un client */
export async function updateClientStatus(clientDocumentId: string, processStatus: string) {
  return put(`clients/${clientDocumentId}`, { processStatus });
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
    // Utiliser populate[project][populate]=* pour avoir tous les champs du projet
    const collaborationsResponse = await get<ApiResponse<{
      project: {
        id: number;
        documentId: string;
        title: string;
        description: string;
        project_status: string;
        type: string;
        deadline: string;
        start_date: string;
        end_date: string;
        createdAt: string;
        updatedAt: string;
        client?: { id: number; documentId: string; name: string };
      };
      permission: string;
      is_owner: boolean;
    }[]>>(`project-collaborators?populate[project][populate]=*&filters[user][id][$eq]=${userId}&filters[is_owner][$eq]=false`);
    
    const collaborations = collaborationsResponse.data || [];
    
    // Extraire les projets des collaborations
    const collaboratedProjects = collaborations
      .filter(c => c.project) // S'assurer que le projet existe
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
  get(`projects?populate=*&filters[user][id][$eq]=${userId}&filters[client][$null]=true`);

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

/** Crée un nouveau prospect */
export const createProspect = async (data: {
  title: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  notes?: string;
  prospect_status?: string;
  source?: string;
  priority?: string;
  estimated_value?: number;
  budget?: number;
  next_action?: string;
  next_action_date?: string;
  users?: number[];
}) => {
  const response = await post('prospects', { data });
  return response;
};

/** Supprime un prospect par son documentId */
export const deleteProspect = (documentId: string) =>
  del(`prospects/${documentId}`);

/** Met à jour un prospect par son documentId */
export const updateProspect = (documentId: string, data: Partial<{ 
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  notes: string;
  prospect_status: string;
  source: string;
  priority: string;
  estimated_value: number;
  budget: number;
  next_action: string;
  next_action_date: string;
  lost_reason: string;
  isActive: boolean;
  [key: string]: unknown;
}>) =>
  put(`prospects/${documentId}`, data);

// ============================================================================
// FACTURES
// ============================================================================

export const fetchFacturesUser = (userId: number) =>
  fetchUserEntities('factures', userId, 'user');

export const fetchFacturesByClient = (userId: number, clientId: number) =>
  get(`factures?populate=*&filters[user][id][$eq]=${userId}&filters[client][id][$eq]=${clientId}`);

export const fetchFacturesByProject = (userId: number, projectId: number) =>
  get(`factures?populate=*&filters[user][id][$eq]=${userId}&filters[project][id][$eq]=${projectId}`);

export const fetchFacturesUserById = (userId: number, factureId: string) =>
  get(`factures?populate=*&filters[user][id][$eq]=${userId}&filters[documentId][$eq]=${factureId}`);

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
  document_type?: 'invoice' | 'quote'; // Type de document
  invoice_lines: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    document_type: data.document_type || 'invoice',
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
  data: Partial<{
    reference: string;
    number: number;
    date: string;
    due_date: string;
    facture_status: string;
    quote_status: string;
    currency: string;
    description: string;
    notes: string;
    pdf: string;
    client_id: string;
    project: string;
    user: number;
    tva_applicable: boolean;
    invoice_lines: {
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[];
  }>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    // Ne pas inclure reference - c'est un UID unique qui ne doit pas être renvoyé lors de l'update
    number: data.number,
    date: data.date,
    due_date: data.due_date,
    facture_status: data.facture_status,
    quote_status: data.quote_status, // Ajout du statut de devis
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

 
  
  const result = await put(`factures/${factureId}`, payload);
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

export async function fetchNewsletterById(documentId: string) {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  // Dans Strapi v5, on utilise le documentId pour récupérer une entité
  // Format populate pour Strapi v5
  const response = await fetch(
    `${API_URL}/api/newsletters/${documentId}?populate=*`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Newsletter non trouvée');
  }

  return response.json();
}

export interface GradientStop {
  id: string;
  color: string;
  position: number; // 0-100%
  opacity: number;  // 0-100%
}

export interface NewsletterCustomColors {
  gradientStops: GradientStop[];
  buttonColor: string;
  textColor: string;
  gradientAngle: number;
}

export interface CreateNewsletterData {
  title: string;
  subject: string;
  content: string;
  template: 'standard' | 'promotional' | 'announcement' | 'custom';
  n_status: 'draft' | 'sent' | 'scheduled' | 'failed';
  send_at?: string; // ISO datetime string
  author: number;
  subscribers?: number[]; // IDs des subscribers
  // Nouveaux champs pour le contenu enrichi
  custom_colors?: NewsletterCustomColors; // Couleurs personnalisées (JSON)
  header_background_url?: string; // URL de l'image de fond du header
  banner_url?: string; // URL de la bannière
  cta_text?: string; // Texte du bouton CTA
  cta_url?: string; // URL du bouton CTA
  media_ids?: number[]; // IDs des médias utilisés (images/vidéos)
  html_content?: string; // Contenu HTML complet pour l'envoi différé
}

// Trouver ou créer un subscriber par email
export async function findOrCreateSubscriber(data: {
  email: string;
  first_name: string;
  last_name: string;
  userId: number;
}): Promise<number> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  // Chercher si le subscriber existe déjà
  const searchResponse = await fetch(
    `${API_URL}/api/subscribers?filters[email][$eq]=${encodeURIComponent(data.email)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.data && searchResult.data.length > 0) {
      return searchResult.data[0].id;
    }
  }

  // Créer le subscriber s'il n'existe pas
  const createResponse = await fetch(`${API_URL}/api/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      data: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        user: data.userId,
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.error?.message || 'Erreur lors de la création du subscriber');
  }

  const createResult = await createResponse.json();
  return createResult.data.id;
}

export async function createNewsletter(data: CreateNewsletterData) {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  // Préparer les données pour Strapi (convertir custom_colors en JSON string si nécessaire)
  const strapiData = {
    ...data,
    custom_colors: data.custom_colors ? JSON.stringify(data.custom_colors) : undefined,
  };

  const response = await fetch(`${API_URL}/api/newsletters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data: strapiData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de la création de la newsletter');
  }

  return response.json();
}

// ============================================================================
// NEWSLETTER MEDIA LIBRARY
// ============================================================================

export interface MediaFile {
  id: number;
  documentId: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
  // ID du user-media pour la suppression (bibliothèque privée)
  userMediaDocumentId?: string;
}

// Interface pour user-media
interface UserMedia {
  id: number;
  documentId: string;
  name: string;
  type: 'image' | 'video' | 'document';
  folder: string;
  file: MediaFile;
  createdAt: string;
  updatedAt: string;
}

// Récupérer tous les fichiers uploadés par l'utilisateur (via user-media - privé)
export async function fetchUserMedia(): Promise<MediaFile[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(
    `${API_URL}/api/user-medias?sort=createdAt:desc&populate=file`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur API user-medias:', response.status, errorData);
    throw new Error(errorData?.error?.message || 'Erreur lors de la récupération des médias');
  }

  const result = await response.json();
  const userMedias = result.data || [];
  
  // Transformer en MediaFile avec URLs absolues
  return userMedias.map((um: UserMedia) => {
    const file = um.file;
    if (!file) return null;
    return {
      ...file,
      // Utiliser le documentId de user-media pour la suppression
      userMediaDocumentId: um.documentId,
      url: file.url?.startsWith('http') ? file.url : `${API_URL}${file.url}`,
    };
  }).filter(Boolean) as MediaFile[];
}

// Créer un enregistrement user-media après upload
export async function createUserMedia(
  fileId: number, 
  name: string, 
  type: 'image' | 'video' | 'document' = 'image',
  folder: string = 'general'
): Promise<UserMedia> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(
    `${API_URL}/api/user-medias`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        data: {
          name,
          type,
          folder,
          file: fileId,
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || 'Erreur lors de la création du média');
  }

  const result = await response.json();
  return result.data;
}

// Supprimer un fichier média (via user-media)
export async function deleteMedia(documentId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(
    `${API_URL}/api/user-medias/${documentId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Erreur lors de la suppression du média');
  }
}

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

/** Demande de réinitialisation de mot de passe (envoie un email) */
export async function forgotPassword(email: string) {
  const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    console.error('Forgot password error:', data);
    
    // Erreur 500 = probablement email provider non configuré
    if (res.status === 500) {
      throw new Error('Le service d\'envoi d\'emails n\'est pas configuré. Contactez l\'administrateur.');
    }
    
    throw new Error(data?.error?.message || 'Erreur lors de l\'envoi de l\'email');
  }

  return res.json();
}

/** Réinitialisation du mot de passe avec le token reçu par email */
export async function resetPassword(code: string, password: string, passwordConfirmation: string) {
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, password, passwordConfirmation }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || 'Erreur lors de la réinitialisation du mot de passe');
  }

  return res.json();
}

/** Renvoi de l'email de confirmation */
export async function sendEmailConfirmation(email: string) {
  const res = await fetch(`${API_URL}/api/auth/send-email-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || 'Erreur lors de l\'envoi de l\'email de confirmation');
  }

  return res.json();
}

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

/** Change le mot de passe d'un utilisateur (avec vérification de l'ancien) */
export async function changePassword(currentPassword: string, newPassword: string, passwordConfirmation: string) {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ 
      currentPassword, 
      password: newPassword, 
      passwordConfirmation 
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (data?.error?.message?.includes('password is invalid')) {
      throw new Error('Mot de passe actuel incorrect');
    }
    throw new Error(data?.error?.message || 'Erreur lors du changement de mot de passe');
  }

  return res.json();
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

/** Upload une image vers Strapi (sans tracker dans la bibliothèque) */
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

/** Upload une image vers Strapi ET l'ajouter à la bibliothèque privée de l'utilisateur */
export async function uploadImageToLibrary(
  file: File, 
  folder: string = 'general'
): Promise<{ id: number; url: string; userMediaDocumentId: string }> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');
  
  const formData = new FormData();
  formData.append('files', file);

  // 1. Upload le fichier
  const res = await fetch(`${API_URL_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Erreur lors de l\'upload de l\'image');
  }

  const data = await res.json();
  const uploadedFile = data[0];
  
  // 2. Déterminer le type de fichier
  const mimeType = file.type;
  let mediaType: 'image' | 'video' | 'document' = 'document';
  if (mimeType.startsWith('image/')) mediaType = 'image';
  else if (mimeType.startsWith('video/')) mediaType = 'video';
  
  // 3. Créer l'enregistrement user-media pour tracker ce fichier
  const userMedia = await createUserMedia(uploadedFile.id, file.name, mediaType, folder);
  
  return { 
    id: uploadedFile.id, 
    url: uploadedFile.url.startsWith('http') ? uploadedFile.url : `${API_URL_BASE}${uploadedFile.url}`,
    userMediaDocumentId: userMedia.documentId,
  };
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
  
  if (companyData.data?.length === 0 || !companyId) {
    // Création d'une nouvelle entreprise liée à l'utilisateur
    return post('companies', { ...data, user: userId });
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
    // Relations Strapi v5 avec connect et documentId
    project: { connect: [{ documentId: data.project }] },
    sender: { connect: [{ id: data.sender }] },
    // Pour les liens publics, on utilise une chaîne vide car Strapi exige un string
    recipient_email: data.isPublicLink ? '' : (data.recipient_email || ''),
    invitation_code: invitationCode,
    invitation_status: 'pending',
    permission: data.permission || 'edit',
    expires_at: expiresAt,
    is_public_link: data.isPublicLink || false,
    ...(recipient ? { recipient: { connect: [{ id: recipient.id }] } } : {}),
  };

  const invitation = await post('project-invitations', payload);

  // Si le destinataire existe, créer une notification
  if (recipient) {
    try {
      // Récupérer les infos du sender (avec profile_picture) et du projet pour la notification
      const senderData = await get<{ username: string; profile_picture?: { url: string } }>(`users/${data.sender}?populate=profile_picture`);
      const projectData = await get<ApiResponse<{ title: string }[]>>(
        `projects?filters[documentId][$eq]=${data.project}`
      );
      const projectTitle = projectData.data?.[0]?.title || 'un projet';
      
      // Construire l'URL complète de la photo de profil
      const senderProfilePicture = senderData.profile_picture?.url 
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${senderData.profile_picture.url}`
        : undefined;

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
          sender_profile_picture: senderProfilePicture,
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
  get(`project-collaborators?populate=*&filters[user][id][$eq]=${userId}&filters[is_owner][$eq]=false`);

/** Supprime un collaborateur d'un projet */
export const removeProjectCollaborator = (collaboratorDocumentId: string) =>
  del(`project-collaborators/${collaboratorDocumentId}`);

/** Vérifie si l'utilisateur peut supprimer un projet (propriétaire uniquement) */
export async function canDeleteProject(projectDocumentId: string, userId: number): Promise<boolean> {
  const collaborator = await get<ApiResponse<{ is_owner: boolean }[]>>(
    `project-collaborators?filters[project][documentId][$eq]=${projectDocumentId}&filters[user][id][$eq]=${userId}`
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
// COLLABORATION REQUESTS
// ============================================================================

/** Crée une demande de collaboration sur un projet */
export async function createCollaborationRequest(data: {
  project: string; // documentId du projet
  requester: number; // id de l'utilisateur qui demande
  message?: string;
}) {
  return post('collaboration-requests', {
    project: data.project,
    requester: data.requester,
    message: data.message || '',
    status: 'pending',
  });
}

/** Récupère les demandes de collaboration pour un projet */
export const fetchProjectCollaborationRequests = (projectDocumentId: string) =>
  get(`collaboration-requests?populate=*&filters[project][documentId][$eq]=${projectDocumentId}&filters[status][$eq]=pending&sort=createdAt:desc`);

/** Récupère une demande de collaboration existante pour un utilisateur et un projet */
export async function fetchUserCollaborationRequest(projectDocumentId: string, userId: number) {
  return get(`collaboration-requests?populate=*&filters[project][documentId][$eq]=${projectDocumentId}&filters[requester][id][$eq]=${userId}&sort=createdAt:desc`);
}

/** Approuve une demande de collaboration */
export async function approveCollaborationRequest(
  requestDocumentId: string,
  respondedByUserId: number,
  permission: 'view' | 'edit' = 'view'
) {
  // Récupérer les détails de la demande
  const request = await get<ApiResponse<{
    project?: { documentId: string };
    requester?: { id: number };
  }[]>>(`collaboration-requests?populate=*&filters[documentId][$eq]=${requestDocumentId}`);
  
  if (!request.data?.[0]?.project?.documentId || !request.data?.[0]?.requester?.id) {
    throw new Error('Demande de collaboration invalide');
  }
  
  // Ajouter l'utilisateur comme collaborateur
  await addProjectCollaborator(
    request.data[0].project.documentId,
    request.data[0].requester.id,
    permission
  );
  
  // Mettre à jour le statut de la demande
  return put(`collaboration-requests/${requestDocumentId}`, {
    status: 'approved',
    responded_by: respondedByUserId,
    responded_at: new Date().toISOString(),
  });
}

/** Rejette une demande de collaboration */
export async function rejectCollaborationRequest(
  requestDocumentId: string,
  respondedByUserId: number
) {
  return put(`collaboration-requests/${requestDocumentId}`, {
    status: 'rejected',
    responded_by: respondedByUserId,
    responded_at: new Date().toISOString(),
  });
}

/** Vérifie si l'utilisateur est collaborateur d'un projet */
export async function isUserProjectCollaborator(projectDocumentId: string, userId: number): Promise<boolean> {
  const collaborator = await get<ApiResponse<{ id: number }[]>>(
    `project-collaborators?filters[project][documentId][$eq]=${projectDocumentId}&filters[user][id][$eq]=${userId}`
  );
  return (collaborator.data?.length ?? 0) > 0;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/** Crée une notification */
export async function createNotification(data: {
  user: number;
  type: 'project_invitation' | 'project_update' | 'collaboration_request' | 'system';
  title: string;
  message: string;
  data?: {
    invitation_id?: string;
    project_id?: string;
    sender_name?: string;
    sender_profile_picture?: string;
    project_title?: string;
    collaboration_request_id?: string;
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

/** Récupère les tâches d'un projet (avec pagination pour récupérer toutes les tâches) */
export async function fetchProjectTasks(projectDocumentId: string): Promise<ApiResponse<ProjectTask[]>> {
  const allTasks: ProjectTask[] = [];
  let page = 1;
  const pageSize = 100; // Maximum autorisé par Strapi
  let hasMore = true;

  while (hasMore) {
    const response = await get<ApiResponse<ProjectTask[]>>(
      `project-tasks?populate[0]=assigned_to&populate[1]=subtasks&populate[2]=subtasks.assigned_to&populate[3]=parent_task&filters[project][documentId][$eq]=${projectDocumentId}&sort=order:asc,createdAt:desc&pagination[pageSize]=${pageSize}&pagination[page]=${page}`
    );

    if (response.data && response.data.length > 0) {
      allTasks.push(...response.data);
    }

    // Vérifier s'il y a plus de pages
    const totalPages = response.meta?.pagination?.pageCount ?? 1;
    hasMore = page < totalPages;
    page++;
  }

  return { 
    data: allTasks, 
    meta: { 
      pagination: { 
        page: 1, 
        pageSize: allTasks.length, 
        pageCount: 1, 
        total: allTasks.length 
      } 
    } 
  };
}

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
  actual_hours?: number | null;
  assigned_to?: number; // user id
  created_user: number; // user id
  order?: number;
  tags?: string[];
  parent_task?: string; // documentId de la tâche parente (pour sous-tâches)
  color?: string; // couleur du groupe de tâches
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
    actual_hours: data.actual_hours || null,
    order: data.order || 0,
    assigned_to: data.assigned_to || null,
    created_user: data.created_user,
    tags: data.tags || [],
    parent_task: data.parent_task || null,
    color: data.color || '#8B5CF6',
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
    actual_hours: number | null;
    assigned_to: number | null;
    order: number;
    tags: string[];
    color: string;
  }>
) {
  // Si la tâche est marquée comme complétée, ajouter la date de complétion
  const payload = { ...data };
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

// ============================================================================
// SMTP CONFIGURATION
// ============================================================================

import type { SmtpConfig, CreateSmtpConfigData } from '@/types';

/** Récupère la configuration SMTP de l'utilisateur */
export const fetchSmtpConfig = async (userId: number): Promise<SmtpConfig | null> => {
  const response = await get<ApiResponse<SmtpConfig[]>>(
    `smtp-configs?filters[users][id][$eq]=${userId}&populate=*`
  );
  return response.data?.[0] || null;
};

/** Crée ou met à jour la configuration SMTP */
export const saveSmtpConfig = async (
  userId: number,
  data: CreateSmtpConfigData,
  isVerified: boolean = false
): Promise<SmtpConfig> => {
  // Vérifier si une config existe déjà
  const existing = await fetchSmtpConfig(userId);
  
  if (existing) {
    // Mise à jour - inclure is_verified
    const response = await put<ApiResponse<SmtpConfig>>(
      `smtp-configs/${existing.documentId}`,
      { ...data, is_verified: isVerified }
    );
    return response.data;
  } else {
    // Création - utiliser connect pour la relation Strapi v5
    const response = await post<ApiResponse<SmtpConfig>>(
      'smtp-configs',
      { ...data, is_verified: isVerified, users: { connect: [{ id: userId }] } }
    );
    return response.data;
  }
};

/** Supprime la configuration SMTP */
export const deleteSmtpConfig = async (documentId: string): Promise<void> => {
  await del(`smtp-configs/${documentId}`);
};

/** Teste la connexion SMTP */
export const testSmtpConnection = async (
  config: CreateSmtpConfigData
): Promise<{ success: boolean; message: string }> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`/api/smtp/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });

  return response.json();
};

/** Teste la connexion IMAP */
export const testImapConnection = async (
  config: { imap_host: string; imap_port: number; imap_user: string; imap_password: string; imap_secure: boolean }
): Promise<{ success: boolean; message: string }> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`/api/imap/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });

  return response.json();
};

// ============================================================================
// CUSTOM TEMPLATES (Thèmes personnalisés)
// ============================================================================

import type { CustomTemplate, CreateCustomTemplateData, UpdateCustomTemplateData } from '@/types';

/** Récupère tous les templates personnalisés d'un utilisateur */
export const fetchUserCustomTemplates = async (userId: number): Promise<CustomTemplate[]> => {
  const response = await get<ApiResponse<CustomTemplate[]>>(
    `custom-templates?filters[users][id][$eq]=${userId}&sort=createdAt:desc&populate=*`
  );
  return response.data || [];
};

/** Récupère un template personnalisé par son ID */
export const fetchCustomTemplate = async (documentId: string): Promise<CustomTemplate | null> => {
  try {
    const response = await get<ApiResponse<CustomTemplate>>(`custom-templates/${documentId}`);
    return response.data || null;
  } catch {
    return null;
  }
};

/** Crée un nouveau template personnalisé */
export const createCustomTemplate = async (
  userId: number,
  data: CreateCustomTemplateData
): Promise<CustomTemplate> => {
  // Si is_default est true, désactiver les autres templates par défaut
  if (data.is_default) {
    const existingTemplates = await fetchUserCustomTemplates(userId);
    for (const template of existingTemplates) {
      if (template.is_default) {
        await updateCustomTemplate(template.documentId, { is_default: false });
      }
    }
  }
  
  const response = await post<ApiResponse<CustomTemplate>>(
    'custom-templates',
    { ...data, users: { connect: [{ id: userId }] } }
  );
  return response.data;
};

/** Met à jour un template personnalisé */
export const updateCustomTemplate = async (
  documentId: string,
  data: UpdateCustomTemplateData
): Promise<CustomTemplate> => {
  const response = await put<ApiResponse<CustomTemplate>>(
    `custom-templates/${documentId}`,
    data
  );
  return response.data;
};

/** Supprime un template personnalisé */
export const deleteCustomTemplate = async (documentId: string): Promise<void> => {
  await del(`custom-templates/${documentId}`);
};

/** Définit un template comme template par défaut */
export const setDefaultCustomTemplate = async (
  userId: number,
  documentId: string
): Promise<void> => {
  // Désactiver tous les autres templates par défaut
  const templates = await fetchUserCustomTemplates(userId);
  for (const template of templates) {
    if (template.is_default && template.documentId !== documentId) {
      await updateCustomTemplate(template.documentId, { is_default: false });
    }
  }
  
  // Activer le nouveau template par défaut
  await updateCustomTemplate(documentId, { is_default: true });
};

// ============================================================================
// EMAIL SIGNATURE
// ============================================================================

import type { EmailSignature, CreateEmailSignatureData, UpdateEmailSignatureData, SentEmail, CreateSentEmailData, EmailCategory } from '@/types';
export type { EmailCategory };

/** Récupère la signature email d'un utilisateur */
export const fetchEmailSignature = async (userId: number): Promise<EmailSignature | null> => {
  const response = await get<ApiResponse<EmailSignature[]>>(
    `email-signatures?filters[user][id][$eq]=${userId}&populate=*`
  );
  return response.data?.[0] || null;
};

/** Crée ou met à jour la signature email */
export const saveEmailSignature = async (
  userId: number,
  data: CreateEmailSignatureData
): Promise<EmailSignature> => {
  const existing = await fetchEmailSignature(userId);
  
  if (existing) {
    const response = await put<ApiResponse<EmailSignature>>(
      `email-signatures/${existing.documentId}`,
      data
    );
    return response.data;
  } else {
    const response = await post<ApiResponse<EmailSignature>>(
      'email-signatures',
      { ...data, user: { connect: [{ id: userId }] } }
    );
    return response.data;
  }
};

/** Met à jour partiellement la signature email */
export const updateEmailSignature = async (
  documentId: string,
  data: UpdateEmailSignatureData
): Promise<EmailSignature> => {
  const response = await put<ApiResponse<EmailSignature>>(
    `email-signatures/${documentId}`,
    data
  );
  return response.data;
};

// ============================================================================
// SENT EMAILS (Historique)
// ============================================================================

/** Récupère l'historique des emails envoyés */
export const fetchSentEmails = async (
  userId: number,
  category?: EmailCategory,
  limit: number = 50
): Promise<SentEmail[]> => {
  let url = `sent-emails?filters[users][id][$eq]=${userId}&sort=sent_at:desc&pagination[pageSize]=${limit}`;
  
  if (category) {
    url += `&filters[category][$eq]=${category}`;
  }
  
  const response = await get<ApiResponse<SentEmail[]>>(url);
  return response.data || [];
};

/** Récupère un email envoyé par son ID */
export const fetchSentEmail = async (documentId: string): Promise<SentEmail | null> => {
  try {
    const response = await get<ApiResponse<SentEmail>>(`sent-emails/${documentId}`);
    return response.data || null;
  } catch {
    return null;
  }
};

/** Enregistre un email envoyé dans l'historique */
export const createSentEmail = async (
  userId: number,
  data: CreateSentEmailData
): Promise<SentEmail> => {
 
  // Strapi v5: pour relation manyToOne, utiliser directement l'id ou set
  const response = await post<ApiResponse<SentEmail>>(
    'sent-emails',
    { ...data, users: { set: [userId] } }
  );
  return response.data;
};

/** Met à jour le statut d'un email envoyé */
export const updateSentEmailStatus = async (
  documentId: string,
  status: 'sent' | 'failed' | 'pending' | 'scheduled'
): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');
  
  const response = await fetch(`${API_URL}/api/sent-emails/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      data: {
        status_mail: status,
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de la mise à jour');
  }
};

/** Supprime un email (annule un email planifié) */
export const deleteSentEmail = async (documentId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');
  
  const response = await fetch(`${API_URL}/api/sent-emails/${documentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de la suppression');
  }
};

/** Compte les emails par catégorie */
export const countSentEmailsByCategory = async (
  userId: number
): Promise<Record<EmailCategory, number>> => {
  const categories: EmailCategory[] = ['newsletter', 'invoice', 'quote', 'classic'];
  const counts: Record<EmailCategory, number> = {
    newsletter: 0,
    invoice: 0,
    quote: 0,
    classic: 0,
  };
  
  for (const category of categories) {
    const response = await get<ApiResponse<SentEmail[]>>(
      `sent-emails?filters[users][id][$eq]=${userId}&filters[category][$eq]=${category}&pagination[pageSize]=1`
    );
    counts[category] = response.meta?.pagination?.total || 0;
  }
  
  return counts;
};

// ============================================================================
// EMAIL DRAFTS
// ============================================================================

export interface EmailDraft {
  id: number;
  documentId: string;
  name?: string;
  subject?: string;
  recipients?: Array<{ id: string; email: string; name?: string }>;
  content?: string;
  category: 'newsletter' | 'invoice' | 'quote' | 'classic';
  attachments?: Array<{ name: string; url: string }>;
  related_document_id?: string;
  related_document_type?: 'invoice' | 'quote' | 'newsletter' | 'none';
  include_signature?: boolean;
  footer_language?: 'fr' | 'en';
  last_modified?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailDraftData {
  name?: string;
  subject?: string;
  recipients?: Array<{ id: string; email: string; name?: string }>;
  content?: string;
  category: 'newsletter' | 'invoice' | 'quote' | 'classic';
  attachments?: Array<{ name: string; url: string }>;
  related_document_id?: string;
  related_document_type?: 'invoice' | 'quote' | 'newsletter' | 'none';
  include_signature?: boolean;
  footer_language?: 'fr' | 'en';
}

/** Récupère les brouillons d'emails d'un utilisateur */
export const fetchEmailDrafts = async (
  userId: number,
  category?: EmailCategory
): Promise<EmailDraft[]> => {
  let url = `email-drafts?filters[user][id][$eq]=${userId}&sort=updatedAt:desc`;
  
  if (category) {
    url += `&filters[category][$eq]=${category}`;
  }
  
  const response = await get<ApiResponse<EmailDraft[]>>(url);
  return response.data || [];
};

/** Récupère un brouillon par son ID */
export const fetchEmailDraft = async (documentId: string): Promise<EmailDraft | null> => {
  try {
    const response = await get<ApiResponse<EmailDraft>>(`email-drafts/${documentId}`);
    return response.data || null;
  } catch {
    return null;
  }
};

/** Crée un brouillon d'email */
export const createEmailDraft = async (
  userId: number,
  data: CreateEmailDraftData
): Promise<EmailDraft> => {
  const response = await post<ApiResponse<EmailDraft>>(
    'email-drafts',
    { 
      ...data, 
      user: userId,
      last_modified: new Date().toISOString()
    }
  );
  return response.data;
};

/** Met à jour un brouillon d'email */
export const updateEmailDraft = async (
  documentId: string,
  data: Partial<CreateEmailDraftData>
): Promise<EmailDraft> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');
  
  const response = await fetch(`${API_URL}/api/email-drafts/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      data: {
        ...data,
        last_modified: new Date().toISOString()
      }
    }),
  });
  
  if (!response.ok) throw new Error('Erreur lors de la mise à jour du brouillon');
  
  const result = await response.json();
  return result.data;
};

/** Supprime un brouillon d'email */
export const deleteEmailDraft = async (documentId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');
  
  const response = await fetch(`${API_URL}/api/email-drafts/${documentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) throw new Error('Erreur lors de la suppression du brouillon');
};

/** Compte les brouillons par catégorie */
export const countEmailDraftsByCategory = async (
  userId: number
): Promise<Record<EmailCategory, number>> => {
  const categories: EmailCategory[] = ['newsletter', 'invoice', 'quote', 'classic'];
  const counts: Record<EmailCategory, number> = {
    newsletter: 0,
    invoice: 0,
    quote: 0,
    classic: 0,
  };
  
  for (const category of categories) {
    const response = await get<ApiResponse<EmailDraft[]>>(
      `email-drafts?filters[user][id][$eq]=${userId}&filters[category][$eq]=${category}&pagination[pageSize]=1`
    );
    counts[category] = response.meta?.pagination?.total || 0;
  }
  
  return counts;
};

// ============================================================================
// AUDIT LOGS (Admin)
// ============================================================================

export interface AuditLog {
  id: number;
  documentId: string;
  type: 'login' | 'logout' | 'register' | 'update' | 'delete' | 'email' | 'error' | 'system';
  action: string;
  status: 'success' | 'error' | 'warning';
  user?: {
    id: number;
    username: string;
    email: string;
  };
  details?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

interface FetchAuditLogsParams {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

/** Récupère les logs d'audit (admin uniquement) */
export const fetchAuditLogs = async (
  params: FetchAuditLogsParams = {}
): Promise<AuditLogsResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params.type && params.type !== 'all') queryParams.append('type', params.type);
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  
  const queryString = queryParams.toString();
  const endpoint = `audit-logs${queryString ? `?${queryString}` : ''}`;
  
  return get<AuditLogsResponse>(endpoint);
};

/** Crée un log d'audit */
export const createAuditLog = async (data: {
  type: AuditLog['type'];
  action: string;
  status?: AuditLog['status'];
  details?: string;
  metadata?: Record<string, unknown>;
}): Promise<AuditLog> => {
  const response = await post<ApiResponse<AuditLog>>('audit-logs', data);
  return response.data;
};

// ============================================================================
// PROJECT SHARE LINKS (Public Sharing)
// ============================================================================

export interface ProjectShareLink {
  id: number;
  documentId: string;
  share_token: string;
  is_active: boolean;
  show_gantt: boolean;
  show_progress: boolean;
  show_tasks: boolean;
  expires_at: string | null;
  views_count: number;
  project?: {
    id: number;
    documentId: string;
    title: string;
  };
  created_by?: {
    id: number;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectShareLinkData {
  project: string; // documentId
  show_gantt?: boolean;
  show_progress?: boolean;
  show_tasks?: boolean;
  expires_in_days?: number | null; // null = no expiration
}

/** Génère un token unique pour le partage */
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** Crée un lien de partage public pour un projet */
export const createProjectShareLink = async (
  userId: number,
  data: CreateProjectShareLinkData
): Promise<ProjectShareLink> => {
  const shareToken = generateShareToken();
  const expiresAt = data.expires_in_days 
    ? new Date(Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const response = await post<ApiResponse<ProjectShareLink>>(
    'project-share-links',
    {
      share_token: shareToken,
      is_active: true,
      show_gantt: data.show_gantt ?? true,
      show_progress: data.show_progress ?? true,
      show_tasks: data.show_tasks ?? true,
      expires_at: expiresAt,
      views_count: 0,
      project: { connect: [{ documentId: data.project }] },
      created_by_user: { connect: [{ id: userId }] },
    }
  );
  
  return response.data;
};

/** Récupère les liens de partage d'un projet */
export const fetchProjectShareLinks = async (
  projectDocumentId: string
): Promise<{ data: ProjectShareLink[] }> => {
  return get<{ data: ProjectShareLink[] }>(
    `project-share-links?filters[project][documentId][$eq]=${projectDocumentId}&filters[is_active][$eq]=true&sort=createdAt:desc`
  );
};

/** Désactive un lien de partage */
export const deactivateShareLink = async (
  shareLinkDocumentId: string
): Promise<void> => {
  await put(`project-share-links/${shareLinkDocumentId}`, {
    is_active: false,
  });
};

/** Met à jour un lien de partage */
export const updateShareLink = async (
  shareLinkDocumentId: string,
  data: Partial<{
    show_gantt: boolean;
    show_progress: boolean;
    show_tasks: boolean;
    is_active: boolean;
  }>
): Promise<ProjectShareLink> => {
  const response = await put<ApiResponse<ProjectShareLink>>(
    `project-share-links/${shareLinkDocumentId}`,
    data
  );
  return response.data;
};

// ============================================================================
// USER PREFERENCES (Préférences métier et modules)
// ============================================================================

export interface UserPreference {
  id: number;
  documentId: string;
  business_type: string;
  enabled_modules: string[];
  terminology: Record<string, string> | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  dashboard_layout: Record<string, unknown> | null;
  users?: { id: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPreferenceData {
  business_type: string;
  enabled_modules: string[];
  terminology?: Record<string, string>;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  dashboard_layout?: Record<string, unknown>;
}

export type UpdateUserPreferenceData = Partial<CreateUserPreferenceData>;

/** Récupère les préférences d'un utilisateur */
export const fetchUserPreferences = async (
  userId: number
): Promise<UserPreference | null> => {
  try {
    const response = await get<ApiResponse<UserPreference[]>>(
      `user-preferences?filters[users][id][$eq]=${userId}&populate=*`
    );
    return response.data?.[0] || null;
  } catch {
    return null;
  }
};

/** Crée les préférences pour un utilisateur */
export const createUserPreferences = async (
  userId: number,
  data: CreateUserPreferenceData
): Promise<UserPreference> => {
  const response = await post<ApiResponse<UserPreference>>(
    'user-preferences',
    {
      ...data,
      users: { connect: [{ id: userId }] },
    }
  );
  return response.data;
};

/** Met à jour les préférences d'un utilisateur */
export const updateUserPreferences = async (
  documentId: string,
  data: UpdateUserPreferenceData
): Promise<UserPreference> => {
  const response = await put<ApiResponse<UserPreference>>(
    `user-preferences/${documentId}`,
    data
  );
  return response.data;
};

/** Initialise les préférences avec les valeurs par défaut pour un business type */
export const initializeUserPreferences = async (
  userId: number,
  businessType: string,
  enabledModules: string[]
): Promise<UserPreference> => {
  // Vérifier si des préférences existent déjà
  const existing = await fetchUserPreferences(userId);
  
  if (existing) {
    // Mettre à jour les préférences existantes
    return updateUserPreferences(existing.documentId, {
      business_type: businessType,
      enabled_modules: enabledModules,
      onboarding_completed: true,
    });
  }
  
  // Créer de nouvelles préférences
  return createUserPreferences(userId, {
    business_type: businessType,
    enabled_modules: enabledModules,
    onboarding_completed: true,
    onboarding_step: 0,
  });
};

/** Active ou désactive un module */
export const toggleModule = async (
  documentId: string,
  currentModules: string[],
  moduleId: string,
  enabled: boolean
): Promise<UserPreference> => {
  const newModules = enabled
    ? [...new Set([...currentModules, moduleId])]
    : currentModules.filter(m => m !== moduleId);
  
  return updateUserPreferences(documentId, {
    enabled_modules: newModules,
  });
};

// ============================================================================
// MONITORING (Sites surveillés)
// ============================================================================

/** Récupère tous les sites surveillés d'un utilisateur */
export const fetchMonitoredSites = async (userId: number): Promise<MonitoredSite[]> => {
  const response = await get<ApiResponse<MonitoredSite[]>>(
    `monitored-sites?filters[users][id][$eq]=${userId}&populate=client&sort=createdAt:desc`
  );
  return response.data || [];
};

/** Récupère un site surveillé par documentId */
export const fetchMonitoredSite = async (documentId: string): Promise<MonitoredSite | null> => {
  const response = await get<ApiResponse<MonitoredSite>>(
    `monitored-sites/${documentId}?populate=client`
  );
  return response.data || null;
};

/** Crée un nouveau site à surveiller */
export const createMonitoredSite = async (
  userId: number,
  data: CreateMonitoredSiteData
): Promise<MonitoredSite> => {
  const response = await post<ApiResponse<MonitoredSite>>(
    'monitored-sites',
    {
      ...data,
      site_status: 'unknown',
      users: { connect: [{ id: userId }] },
      ...(data.client && { client: { connect: [{ id: data.client }] } }),
    }
  );
  return response.data;
};

/** Met à jour un site surveillé */
export const updateMonitoredSite = async (
  documentId: string,
  data: UpdateMonitoredSiteData
): Promise<MonitoredSite> => {
  const response = await put<ApiResponse<MonitoredSite>>(
    `monitored-sites/${documentId}`,
    data
  );
  return response.data;
};

/** Supprime un site surveillé */
export const deleteMonitoredSite = async (documentId: string): Promise<void> => {
  await del(`monitored-sites/${documentId}`);
};

// ============================================================================
// SERVER CREDENTIALS (Accès serveurs)
// ============================================================================

/** Récupère les métadonnées des credentials d'un site (sans les secrets) */
export const fetchServerCredentials = async (siteDocumentId: string): Promise<ServerCredentialMetadata> => {
  const jwt = getToken();
  const response = await fetch(`/api/credentials?site_id=${siteDocumentId}`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
  return response.json();
};

/** Sauvegarde les credentials d'un site (chiffrés côté serveur) */
export const saveServerCredentials = async (data: CreateServerCredentialData): Promise<{ success: boolean; message: string }> => {
  const jwt = getToken();
  const response = await fetch('/api/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

/** Supprime les credentials d'un site */
export const deleteServerCredentials = async (siteDocumentId: string): Promise<{ success: boolean; message: string }> => {
  const jwt = getToken();
  const response = await fetch(`/api/credentials?site_id=${siteDocumentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
  return response.json();
};

/** Récupère un site surveillé par son documentId */
export const fetchMonitoredSiteById = async (documentId: string): Promise<MonitoredSite> => {
  const response = await get<ApiResponse<MonitoredSite>>(
    `monitored-sites/${documentId}?populate=client`
  );
  return response.data;
};

/** Récupère les logs de monitoring d'un site */
export const fetchMonitoringLogs = async (
  siteDocumentId: string,
  timeRange: '24h' | '7d' | '30d' = '24h'
): Promise<MonitoringLog[]> => {
  const now = new Date();
  let startDate: Date;
  
  switch (timeRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  const response = await get<ApiResponse<MonitoringLog[]>>(
    `monitoring-logs?filters[monitored_site][documentId][$eq]=${siteDocumentId}&filters[checked_at][$gte]=${startDate.toISOString()}&sort=checked_at:asc&pagination[limit]=1000`
  );
  return response.data || [];
};

/** Crée un log de monitoring */
export const createMonitoringLog = async (data: CreateMonitoringLogData): Promise<MonitoringLog> => {
  const response = await post<ApiResponse<MonitoringLog>>('monitoring-logs', data);
  return response.data;
};

// ============================================================================
// TIME TRACKING (Suivi du temps)
// ============================================================================

/** Récupère toutes les entrées de temps d'un utilisateur */
export const fetchTimeEntries = async (
  userId: number,
  filters?: {
    projectId?: string;
    clientId?: string;
    from?: string;
    to?: string;
    billable?: boolean;
  }
): Promise<TimeEntry[]> => {
  let query = `time-entries?filters[users][id][$eq]=${userId}&populate[0]=project&populate[1]=task&populate[2]=client&sort=start_time:desc`;
  
  if (filters?.projectId) {
    query += `&filters[project][documentId][$eq]=${filters.projectId}`;
  }
  if (filters?.clientId) {
    query += `&filters[client][documentId][$eq]=${filters.clientId}`;
  }
  if (filters?.from) {
    query += `&filters[start_time][$gte]=${filters.from}`;
  }
  if (filters?.to) {
    query += `&filters[start_time][$lte]=${filters.to}`;
  }
  if (filters?.billable !== undefined) {
    query += `&filters[billable][$eq]=${filters.billable}`;
  }
  
  const response = await get<ApiResponse<TimeEntry[]>>(query);
  return response.data || [];
};

/** Récupère l'entrée de temps en cours (timer actif) */
export const fetchRunningTimeEntry = async (userId: number): Promise<TimeEntry | null> => {
  const response = await get<ApiResponse<TimeEntry[]>>(
    `time-entries?filters[users][id][$eq]=${userId}&filters[is_running][$eq]=true&populate[0]=project&populate[1]=task&populate[2]=client`
  );
  return response.data?.[0] || null;
};

/** Crée une nouvelle entrée de temps */
export const createTimeEntry = async (
  userId: number,
  data: CreateTimeEntryData
): Promise<TimeEntry> => {
  const response = await post<ApiResponse<TimeEntry>>(
    'time-entries',
    {
      ...data,
      users: { connect: [{ id: userId }] },
      ...(data.project && { project: { connect: [{ id: data.project }] } }),
      ...(data.task && { task: { connect: [{ id: data.task }] } }),
      ...(data.client && { client: { connect: [{ id: data.client }] } }),
    }
  );
  return response.data;
};

/** Met à jour une entrée de temps */
export const updateTimeEntry = async (
  documentId: string,
  data: UpdateTimeEntryData
): Promise<TimeEntry> => {
  const response = await put<ApiResponse<TimeEntry>>(
    `time-entries/${documentId}`,
    data
  );
  return response.data;
};

/** Arrête le timer en cours */
export const stopTimeEntry = async (documentId: string): Promise<TimeEntry> => {
  const now = new Date().toISOString();
  const entry = await fetchTimeEntryByDocumentId(documentId);
  
  if (!entry) throw new Error('Time entry not found');
  
  const startTime = new Date(entry.start_time);
  const endTime = new Date(now);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // en minutes
  
  return updateTimeEntry(documentId, {
    end_time: now,
    duration,
    is_running: false,
  });
};

/** Récupère une entrée de temps par documentId */
const fetchTimeEntryByDocumentId = async (documentId: string): Promise<TimeEntry | null> => {
  const response = await get<ApiResponse<TimeEntry>>(
    `time-entries/${documentId}?populate[0]=project&populate[1]=task&populate[2]=client`
  );
  return response.data || null;
};

/** Supprime une entrée de temps */
export const deleteTimeEntry = async (documentId: string): Promise<void> => {
  await del(`time-entries/${documentId}`);
};

// ============================================================================
// CALENDAR (Événements)
// ============================================================================

/** Récupère tous les événements d'un utilisateur */
export const fetchCalendarEvents = async (
  userId: number,
  filters?: {
    from?: string;
    to?: string;
    eventType?: string;
    projectId?: string;
    clientId?: string;
  }
): Promise<CalendarEvent[]> => {
  let query = `calendar-events?filters[users][id][$eq]=${userId}&populate[0]=project&populate[1]=client&sort=start_date:asc`;
  
  if (filters?.from) {
    query += `&filters[start_date][$gte]=${filters.from}`;
  }
  if (filters?.to) {
    query += `&filters[start_date][$lte]=${filters.to}`;
  }
  if (filters?.eventType) {
    query += `&filters[event_type][$eq]=${filters.eventType}`;
  }
  if (filters?.projectId) {
    query += `&filters[project][documentId][$eq]=${filters.projectId}`;
  }
  if (filters?.clientId) {
    query += `&filters[client][documentId][$eq]=${filters.clientId}`;
  }
  
  const response = await get<ApiResponse<CalendarEvent[]>>(query);
  return response.data || [];
};

/** Crée un nouvel événement */
export const createCalendarEvent = async (
  userId: number,
  data: CreateCalendarEventData
): Promise<CalendarEvent> => {
  const response = await post<ApiResponse<CalendarEvent>>(
    'calendar-events',
    {
      ...data,
      users: { connect: [{ id: userId }] },
      ...(data.project && { project: { connect: [{ id: data.project }] } }),
      ...(data.client && { client: { connect: [{ id: data.client }] } }),
    }
  );
  return response.data;
};

/** Met à jour un événement */
export const updateCalendarEvent = async (
  documentId: string,
  data: UpdateCalendarEventData
): Promise<CalendarEvent> => {
  const response = await put<ApiResponse<CalendarEvent>>(
    `calendar-events/${documentId}`,
    data
  );
  return response.data;
};

/** Supprime un événement */
export const deleteCalendarEvent = async (documentId: string): Promise<void> => {
  await del(`calendar-events/${documentId}`);
};

/** Marque un événement comme complété */
export const completeCalendarEvent = async (documentId: string): Promise<CalendarEvent> => {
  return updateCalendarEvent(documentId, { is_completed: true } as UpdateCalendarEventData);
};

// ============================================================================
// MEETING NOTES (Notes de réunion)
// ============================================================================

/** Récupère toutes les notes de réunion d'un utilisateur */
export const fetchMeetingNotes = async (
  userId: number,
  filters?: {
    calendarEventId?: string;
    projectId?: string;
    clientId?: string;
    status?: string;
  }
): Promise<MeetingNote[]> => {
  let query = `meeting-notes?filters[users][id][$eq]=${userId}&populate[0]=calendar_event&populate[1]=project&populate[2]=client&sort=meeting_date:desc`;
  
  if (filters?.calendarEventId) {
    query += `&filters[calendar_event][documentId][$eq]=${filters.calendarEventId}`;
  }
  if (filters?.projectId) {
    query += `&filters[project][documentId][$eq]=${filters.projectId}`;
  }
  if (filters?.clientId) {
    query += `&filters[client][documentId][$eq]=${filters.clientId}`;
  }
  if (filters?.status) {
    query += `&filters[status][$eq]=${filters.status}`;
  }
  
  const response = await get<ApiResponse<MeetingNote[]>>(query);
  return response.data || [];
};

/** Récupère une note de réunion par son documentId */
export const fetchMeetingNoteById = async (documentId: string): Promise<MeetingNote | null> => {
  const response = await get<ApiResponse<MeetingNote>>(
    `meeting-notes/${documentId}?populate[0]=calendar_event&populate[1]=project&populate[2]=client`
  );
  return response.data || null;
};

/** Récupère la note de réunion liée à un événement calendrier */
export const fetchMeetingNoteByCalendarEvent = async (calendarEventId: string): Promise<MeetingNote | null> => {
  const response = await get<ApiResponse<MeetingNote[]>>(
    `meeting-notes?filters[calendar_event][documentId][$eq]=${calendarEventId}&populate[0]=calendar_event&populate[1]=project&populate[2]=client`
  );
  return response.data?.[0] || null;
};

/** Crée une nouvelle note de réunion */
export const createMeetingNote = async (
  userId: number,
  data: CreateMeetingNoteData
): Promise<MeetingNote> => {
  const response = await post<ApiResponse<MeetingNote>>('meeting-notes', {
    ...data,
    users: userId,
  });
  
  if (!response.data) {
    throw new Error('Failed to create meeting note');
  }
  
  return response.data;
};

/** Met à jour une note de réunion */
export const updateMeetingNote = async (
  documentId: string,
  data: UpdateMeetingNoteData
): Promise<MeetingNote> => {
  const response = await put<ApiResponse<MeetingNote>>(`meeting-notes/${documentId}`, data);
  
  if (!response.data) {
    throw new Error('Failed to update meeting note');
  }
  
  return response.data;
};

/** Supprime une note de réunion */
export const deleteMeetingNote = async (documentId: string): Promise<void> => {
  await del(`meeting-notes/${documentId}`);
};

// ============================================================================
// QUOTES (Devis - utilise la table factures)
// ============================================================================

/** Récupère tous les devis d'un utilisateur */
export const fetchQuotes = async (userId: number): Promise<Facture[]> => {
  const response = await get<ApiResponse<Facture[]>>(
    `factures?filters[user][id][$eq]=${userId}&filters[document_type][$eq]=quote&populate[0]=client_id&populate[1]=project&populate[2]=invoice_lines&sort=createdAt:desc`
  );
  return response.data || [];
};

/** Crée un nouveau devis */
export const createQuote = async (
  data: CreateFactureData & { valid_until?: string; terms?: string }
): Promise<Facture> => {
  const response = await post<ApiResponse<Facture>>(
    'factures',
    {
      ...data,
      document_type: 'quote',
      quote_status: 'draft',
      client_id: data.client_id ? { connect: [{ id: data.client_id }] } : undefined,
      project: data.project ? { connect: [{ id: data.project }] } : undefined,
      user: { connect: [{ id: data.user }] },
    }
  );
  return response.data;
};

/** Convertit un devis en facture */
export const convertQuoteToInvoice = async (
  quoteDocumentId: string,
  userId: number
): Promise<Facture> => {
  // Récupérer le devis
  const quoteResponse = await get<ApiResponse<Facture>>(
    `factures/${quoteDocumentId}?populate[0]=client_id&populate[1]=project&populate[2]=invoice_lines`
  );
  const quote = quoteResponse.data;
  
  if (!quote) throw new Error('Quote not found');
  
  // Créer la facture à partir du devis
  const clientId = quote.client_id?.id || quote.client?.id;
  const projectId = quote.project?.id;
  
  const invoiceData = {
    document_type: 'invoice',
    reference: quote.reference.replace('DEV', 'FAC'),
    date: new Date().toISOString().split('T')[0],
    due_date: quote.due_date,
    facture_status: 'draft',
    number: quote.number,
    currency: quote.currency,
    description: quote.description,
    notes: quote.notes,
    tva_applicable: quote.tva_applicable,
    invoice_lines: quote.invoice_lines,
    converted_from_quote: { connect: [{ documentId: quoteDocumentId }] },
    ...(clientId && { client_id: { connect: [{ id: clientId }] } }),
    ...(projectId && { project: { connect: [{ id: projectId }] } }),
    user: { connect: [{ id: userId }] },
  };
  
  const response = await post<ApiResponse<Facture>>('factures', invoiceData);
  
  // Marquer le devis comme accepté
  await put(`factures/${quoteDocumentId}`, { quote_status: 'accepted' });
  
  return response.data;
};
