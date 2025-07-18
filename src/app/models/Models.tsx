// Types pour les fichiers PDF
interface PdfFile {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: string | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  provider_metadata: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Types pour les prospects
interface Prospect {
  id: number;
  documentId: string;
  title: string;
  description: string;
  prospect_status: string;
  contacted_date: string;
  notes: string;
  email: string;
  website: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  image: string;
}

// Types pour les clients
interface Client {
  id: number;
  documentId: string;
  name: string;
  email: string;
  number: string;
  enterprise: string;
  adress: string | null;
  website: string | null;
  processStatus: string;
  client_id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  isActive: boolean;
  projects: Project[];
  factures: Facture[];
}

// Types pour les projets
type ProjectStatus = 'completed' | 'in_progress' | 'draft';
type ProjectType = 'design' | 'development';

interface Project {
  id: number;
  documentId: string;
  title: string;
  description: string;
  project_status: ProjectStatus;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Types pour les utilisateurs
interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  max_ca: number;
  profile_picture: {
    url: string;
  };
  role: Role;
  projects: Project[];
  factures: Facture[];
  technologies: Technology[];
}

// Types pour les statuts de facture
type FactureStatus = 'paid' | 'draft' | 'pending' | 'overdue';
type Currency = 'EUR' | 'USD' | 'GBP';

// Interface principale pour les factures
interface Facture {
  id: number;
  documentId: string;
  reference: string;
  date: string;
  due_date: string;
  facture_status: FactureStatus;
  number: number;
  currency: Currency;
  description: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  client_id: Client;
  project: Project;
  pdf: PdfFile[];
  user: User;
  invoice_lines: InvoiceLine[];
  tva_applicable: boolean;
}

// Interface pour la pagination
interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

// Interface pour la réponse API complète
interface FacturesResponse {
  data: Facture[];
  meta: {
    pagination: PaginationMeta;
  };
}

// Types utilitaires pour les formulaires ou créations
interface CreateFactureData {
  reference: string;
  date: string;
  due_date: string;
  facture_status: FactureStatus;
  number: number;
  currency: Currency;
  description?: string;
  notes?: string;
  client_id: number;
  project_id: number;
}

interface UpdateFactureData extends Partial<CreateFactureData> {
  id: number;
}

interface Role {
  id: number;
  documentId: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

interface Technology {
  id: number;
  documentId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  projects: Project[];
  users: User[];
}

// Types pour l'entreprise
interface Company {
  id: number;
  documentId: string;
  name: string;
  email: string;
  description: string;
  siret: string;
  siren: string;
  vat: string;
  logo: string; // URL ou chemin du logo
  phoneNumber: string;
  location: string;
  domaine: string;
  website: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Export des types principaux
export type {
  Facture,
  Client,
  Prospect,
  Project,
  User,
  PdfFile,
  Company,
  InvoiceLine,
  FacturesResponse,
  CreateFactureData,
  UpdateFactureData,
  FactureStatus,
  ProjectStatus,
  ProjectType,
  Currency,
  PaginationMeta,
};
