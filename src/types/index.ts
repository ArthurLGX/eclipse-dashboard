/**
 * @file types/index.ts
 * @description Types centralisés pour toute l'application
 */

// ============================================================================
// TYPES DE BASE (FICHIERS / MÉDIAS)
// ============================================================================

export interface PdfFile {
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

export interface ImageFile {
  id: number;
  url: string;
  alternativeText?: string;
  width?: number;
  height?: number;
}

// ============================================================================
// ENUMS / TYPES LITTÉRAUX
// ============================================================================

export type ProjectStatus = 'planning' | 'in_progress' | 'completed';
export type ProjectType = 'development' | 'design' | 'maintenance';
export type FactureStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type DocumentType = 'invoice' | 'quote';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';
export type ProcessStatus = 'client' | 'prospect';
export type ProspectStatus = 'prospect' | 'answer' | 'to_be_contacted' | 'contacted';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial';
export type BillingType = 'monthly' | 'yearly';

// Types pour les tâches de projet
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// ============================================================================
// ENTITÉS PRINCIPALES
// ============================================================================

export interface Role {
  id: number;
  documentId: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Technology {
  id: number;
  documentId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface User {
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
  profile_picture?: ImageFile;
  role?: Role;
}

export interface Client {
  id: number;
  documentId: string;
  name: string;
  email: string;
  number: string;
  enterprise: string;
  adress: string | null;
  website: string | null;
  processStatus: string;
  client_id?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  isActive: boolean;
  image?: ImageFile;
  projects?: Project[];
  factures?: Facture[];
}

export interface Project {
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
  publishedAt?: string;
  client?: Client | null;
  user?: User;
  technologies?: Technology[];
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: number;
  documentId: string;
  title: string;
  description: string;
  task_status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  order: number;
  color?: string; // Couleur pour le groupe de tâches
  project?: Project;
  assigned_to?: User;
  created_user?: User;
  parent_task?: ProjectTask; // Tâche parente (si sous-tâche)
  subtasks?: ProjectTask[]; // Sous-tâches
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Prospect {
  id: number;
  documentId: string;
  title: string;
  description: string;
  prospect_status: ProspectStatus;
  contacted_date: string;
  notes: string;
  email: string;
  website: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  image?: string;
}

export type BillingUnit = 'hour' | 'day' | 'fixed' | 'unit' | 'project';

export interface InvoiceLine {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  unit?: BillingUnit; // 'hour' = à l'heure, 'day' = à la journée, 'fixed' = forfait, 'unit' = unité
}

export interface Facture {
  id: number;
  documentId: string;
  document_type: DocumentType;
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
  publishedAt?: string;
  // Le client peut être retourné sous "client" ou "client_id" selon la config Strapi
  client?: Client;
  client_id?: Client;
  project?: Project;
  pdf?: PdfFile[];
  user?: User;
  invoice_lines?: InvoiceLine[];
  tva_applicable: boolean;
  total_ht?: number;
  total_ttc?: number;
  // Champs spécifiques aux devis
  valid_until?: string;
  quote_status?: QuoteStatus;
  signed_at?: string;
  signature_token?: string;
  converted_from_quote?: Facture;
  terms?: string;
}

export interface Company {
  id: number;
  documentId: string;
  name: string;
  email: string;
  description: string;
  siret: string;
  siren: string;
  vat: string;
  logo?: string;
  phoneNumber: string;
  location: string;
  domaine: string;
  website: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mentor {
  id: number;
  documentId: string;
  firstName: string;
  lastName: string;
  email: string;
  projects?: Project[];
  users?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Newsletter {
  id: number;
  documentId: string;
  title: string;
  content: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Plan {
  id: number;
  documentId: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_clients: number;
  max_projects: number;
  max_prospects: number;
  max_mentors: number;
  max_newsletters: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  documentId: string;
  subscription_status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  billing_type: BillingType;
  auto_renew: boolean;
  trial: boolean;
  plan?: Plan;
  users?: User;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TYPES POUR LES RÉPONSES API
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface FacturesResponse {
  data: Facture[];
  meta: {
    pagination: PaginationMeta;
  };
}

// ============================================================================
// TYPES POUR LES FORMULAIRES (CRÉATION / MISE À JOUR)
// ============================================================================

export interface CreateClientData {
  name: string;
  email: string;
  number?: string;
  enterprise?: string;
  adress?: string;
  website?: string;
  processStatus: ProcessStatus;
  isActive?: boolean;
  image?: number; // ID du fichier uploadé sur Strapi
}

export interface UpdateClientData extends Partial<CreateClientData> {
  id?: number;
}

export interface CreateProjectData {
  title: string;
  description: string;
  project_status: ProjectStatus;
  start_date: string;
  end_date: string;
  notes?: string;
  type: ProjectType;
  technologies?: string[];
  client?: number;
  user?: number;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id?: number;
}

export interface CreateProspectData {
  title: string;
  email: string;
  phone?: string;
  description?: string;
  prospect_status: ProspectStatus;
  website?: string;
  notes?: string;
}

export interface CreateFactureData {
  reference: string;
  date: string;
  due_date: string;
  facture_status: FactureStatus;
  number: number;
  currency: Currency;
  description?: string;
  notes?: string;
  client_id: number;
  project?: number;
  user: number;
  tva_applicable: boolean;
  invoice_lines: InvoiceLine[];
}

export interface UpdateFactureData extends Partial<CreateFactureData> {
  id?: number;
}

// ============================================================================
// TYPES POUR LE DASHBOARD
// ============================================================================

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  totalProspects: number;
  totalFactures: number;
  totalRevenue: number;
  pendingRevenue: number;
}

// ============================================================================
// TYPES POUR LES LISTES SIMPLIFIÉES
// ============================================================================

export interface ClientListItem {
  id: number;
  documentId: string;
  name: string;
  email: string;
  enterprise: string;
  processStatus: ProcessStatus;
  isActive: boolean;
  createdAt: string;
  projectsCount?: number;
  facturesCount?: number;
}

export interface ProjectListItem {
  id: number;
  documentId: string;
  title: string;
  project_status: ProjectStatus;
  type: ProjectType;
  client?: { id: number; name: string };
  start_date: string;
  end_date: string | null;
}

export interface FactureListItem {
  id: number;
  documentId: string;
  reference: string;
  facture_status: FactureStatus;
  number: number;
  date: string;
  due_date: string;
  client?: { id: number; name: string };
}

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

/** Rend certaines propriétés optionnelles */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Rend certaines propriétés requises */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Extrait les clés d'un objet qui ont une valeur de type V */
export type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

// ============================================================================
// COLLABORATION & PARTAGE DE PROJETS
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type InvitationPermission = 'view' | 'edit';
export type NotificationType = 'project_invitation' | 'project_update' | 'system' | 'collaboration_request';

export interface ProjectInvitation {
  id: number;
  documentId: string;
  project: Project;
  sender: User;
  recipient_email: string;
  recipient?: User;
  invitation_code: string;
  invitation_status: InvitationStatus;
  permission: InvitationPermission;
  expires_at: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  documentId: string;
  user: User;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: {
    invitation_id?: string;
    project_id?: string;
    sender_name?: string;
    sender_profile_picture?: string;
    project_title?: string;
    collaboration_request_id?: string;
  };
  action_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInvitationData {
  project: string; // documentId
  sender: number; // user id
  recipient_email: string;
  permission: InvitationPermission;
}

export interface ProjectCollaborator {
  id: number;
  documentId: string;
  user: User;
  project: Project;
  permission: InvitationPermission;
  joined_at: string;
  is_owner: boolean;
}

// SMTP Configuration
export interface SmtpConfig {
  id: number;
  documentId: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string; // Ne pas exposer en lecture
  smtp_secure: boolean;
  smtp_from_name?: string;
  is_verified: boolean;
  // IMAP fields for reply tracking
  imap_enabled?: boolean;
  imap_host?: string;
  imap_port?: number;
  imap_user?: string;
  imap_password?: string;
  imap_secure?: boolean;
  imap_verified?: boolean;
  imap_last_sync?: string;
  users?: number | { id: number }; // Relation avec User
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmtpConfigData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  smtp_from_name?: string;
  // IMAP fields
  imap_enabled?: boolean;
  imap_host?: string;
  imap_port?: number;
  imap_user?: string;
  imap_password?: string;
  imap_secure?: boolean;
}

export type UpdateSmtpConfigData = Partial<CreateSmtpConfigData>;

// ============================================================================
// CUSTOM TEMPLATES (Thèmes personnalisés pour newsletters)
// ============================================================================

export interface GradientStop {
  id: string;
  color: string;
  position: number;
  opacity: number;
}

export interface CustomTemplate {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  gradient_stops: GradientStop[];
  gradient_angle: number;
  button_color: string;
  button_text_color: string;
  text_color: string;
  header_title_color: string;
  font_family: string;
  header_background_url?: string;
  banner_url?: string;
  is_default: boolean;
  users?: number | { id: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomTemplateData {
  name: string;
  description?: string;
  gradient_stops: GradientStop[];
  gradient_angle: number;
  button_color: string;
  button_text_color: string;
  text_color: string;
  header_title_color: string;
  font_family: string;
  header_background_url?: string;
  banner_url?: string;
  is_default?: boolean;
}

export type UpdateCustomTemplateData = Partial<CreateCustomTemplateData>;

// ============================================================================
// EMAIL SIGNATURE (Signature email personnalisée)
// ============================================================================

// Interface pour les liens sociaux personnalisés
export interface SocialLink {
  id: string;
  platform: string; // 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'github' | 'custom'
  url: string;
  label?: string; // Label personnalisé pour 'custom'
  color?: string; // Couleur personnalisée
}

export interface EmailSignature {
  id: number;
  documentId: string;
  company_name?: string;
  sender_name?: string;
  sender_title?: string;
  phone?: string;
  website?: string;
  address?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  logo_url?: string;
  banner_url?: string;
  banner_link?: string;
  banner_alt?: string;
  // Nouveaux champs de personnalisation
  logo_size?: number;
  primary_color?: string;
  text_color?: string;
  secondary_color?: string;
  font_family?: string;
  social_links?: SocialLink[];
  users?: number | { id: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailSignatureData {
  company_name?: string;
  sender_name?: string;
  sender_title?: string;
  phone?: string;
  website?: string;
  address?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  logo_url?: string;
  banner_url?: string;
  banner_link?: string;
  banner_alt?: string;
  // Nouveaux champs de personnalisation
  logo_size?: number;
  primary_color?: string;
  text_color?: string;
  secondary_color?: string;
  font_family?: string;
  social_links?: SocialLink[];
}

export type UpdateEmailSignatureData = Partial<CreateEmailSignatureData>;

// ============================================================================
// SENT EMAILS (Historique des emails envoyés)
// ============================================================================

export type EmailCategory = 'newsletter' | 'invoice' | 'quote' | 'classic';
export type EmailStatus = 'sent' | 'failed' | 'pending' | 'scheduled' | 'cancelled';

export interface ClickDetail {
  url: string;
  count: number;
  first_clicked_at: string;
  last_clicked_at: string;
}

// Tracking détaillé par destinataire
export interface RecipientTracking {
  email: string;
  status: 'delivered' | 'bounced' | 'pending';
  delivered_at?: string;
  opened: boolean;
  opened_at?: string;
  open_count?: number;
  clicked: boolean;
  clicked_at?: string;
  click_count?: number;
  clicks?: { url: string; clicked_at: string }[];
}

// Réponse à un email
export interface EmailReply {
  from: string;
  subject: string;
  content: string;
  received_at: string;
  snippet?: string; // Aperçu du contenu
}

export interface SentEmail {
  id: number;
  documentId: string;
  subject: string;
  recipients: string[]; // Liste des emails destinataires
  content: string;
  category: EmailCategory;
  attachments?: { name: string; url: string }[];
  sent_at: string;
  status_mail: EmailStatus;
  error_message?: string;
  // Tracking fields
  tracking_id?: string;
  opens_count?: number;
  clicks_count?: number;
  opened_at?: string;
  clicks?: ClickDetail[]; // Strapi field name
  click_details?: ClickDetail[]; // Alias for compatibility
  // Tracking détaillé par destinataire
  recipient_tracking?: RecipientTracking[];
  // Réponses reçues
  replies?: EmailReply[];
  // Scheduling fields
  scheduled_at?: string;
  // Relations
  users?: number | { id: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSentEmailData {
  subject: string;
  recipients: string[];
  content: string;
  category: EmailCategory;
  attachments?: { name: string; url: string }[];
  sent_at: string;
  status_mail: EmailStatus;
  error_message?: string;
  scheduled_at?: string;
  tracking_id?: string;
}

// ============================================================================
// MONITORING (Sites surveillés)
// ============================================================================

export type SiteStatus = 'up' | 'down' | 'slow' | 'unknown';

export type SiteType = 'frontend' | 'backend' | 'api' | 'other';
export type HostingProvider = 'ovh' | 'hostinger' | 'o2switch' | 'aws' | 'vercel' | 'netlify' | 'digitalocean' | 'scaleway' | 'other';

export interface MonitoredSite {
  id: number;
  documentId: string;
  name: string;
  url: string;
  check_interval: number;
  site_status: SiteStatus;
  last_check: string | null;
  last_response_time: number | null;
  uptime_percentage: number;
  ssl_expiry: string | null;
  ssl_valid: boolean;
  alert_email: boolean;
  alert_threshold: number;
  total_checks: number;
  successful_checks: number;
  last_down_at: string | null;
  // Nouveau: Type de site
  site_type: SiteType;
  // Nouveau: Infos serveur (optionnelles et chiffrées)
  hosting_provider: HostingProvider | null;
  server_ip: string | null;
  server_notes: string | null;
  // Credentials chiffrés (stockés de manière sécurisée)
  has_credentials: boolean;
  client?: Client;
  users?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitoredSiteData {
  name: string;
  url: string;
  check_interval?: number;
  alert_email?: boolean;
  alert_threshold?: number;
  site_type?: SiteType;
  hosting_provider?: HostingProvider | null;
  server_ip?: string | null;
  server_notes?: string | null;
  client?: number;
}

export type AuthMethod = 'password' | 'key';

export interface ServerCredential {
  id: number;
  documentId: string;
  ssh_user: string;
  ssh_port: number;
  auth_method: AuthMethod;
  // Ces champs ne sont JAMAIS retournés par l'API pour des raisons de sécurité
  // ssh_password_encrypted?: string;
  // ssh_private_key_encrypted?: string;
  monitored_site?: MonitoredSite;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServerCredentialData {
  monitored_site_id: string;
  ssh_user: string;
  ssh_password?: string;
  ssh_private_key?: string;
  ssh_port?: number;
  auth_method: AuthMethod;
}

export interface ServerCredentialMetadata {
  exists: boolean;
  data?: {
    ssh_user: string;
    ssh_port: number;
    auth_method: AuthMethod;
    has_password: boolean;
    has_key: boolean;
  };
}

export type UpdateMonitoredSiteData = Partial<CreateMonitoredSiteData>;

// ============================================================================
// MONITORING LOGS (Historique des vérifications)
// ============================================================================

export interface MonitoringLog {
  id: number;
  documentId: string;
  status: 'up' | 'down' | 'slow';
  response_time: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
  monitored_site?: MonitoredSite;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitoringLogData {
  monitored_site: string; // documentId
  status: 'up' | 'down' | 'slow';
  response_time?: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
}

// ============================================================================
// TIME TRACKING (Suivi du temps)
// ============================================================================

export interface TimeEntry {
  id: number;
  documentId: string;
  start_time: string;
  end_time: string | null;
  duration: number; // minutes
  estimated_duration: number | null; // minutes - temps imparti
  description: string | null;
  billable: boolean;
  billed: boolean;
  hourly_rate: number | null;
  is_running: boolean;
  timer_status: 'active' | 'completed' | 'exceeded' | null; // statut du timer
  project?: Project;
  task?: ProjectTask;
  client?: Client;
  users?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryData {
  start_time: string;
  end_time?: string;
  duration?: number;
  estimated_duration?: number; // temps imparti en minutes
  timer_status?: 'active' | 'completed' | 'exceeded' | 'failed';
  description?: string;
  billable?: boolean;
  hourly_rate?: number;
  is_running?: boolean;
  project?: number;
  task?: number;
  client?: number;
}

export type UpdateTimeEntryData = Partial<CreateTimeEntryData>;

// ============================================================================
// CALENDAR (Événements)
// ============================================================================

export type EventType = 'meeting' | 'deadline' | 'reminder' | 'delivery' | 'call' | 'personal';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  event_type: EventType;
  color: string;
  location: string | null;
  reminder_minutes: number;
  is_completed: boolean;
  recurrence: RecurrenceType;
  use_fathom?: boolean; // Si l'événement utilise Fathom AI pour les notes
  project?: Project;
  client?: Client;
  users?: User;
  meeting_note?: MeetingNote;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  event_type?: EventType;
  color?: string;
  location?: string;
  reminder_minutes?: number;
  recurrence?: RecurrenceType;
  project?: number;
  client?: number;
}

export type UpdateCalendarEventData = Partial<CreateCalendarEventData>;

// ============================================================================
// MEETING NOTES (Notes de réunion)
// ============================================================================

export type MeetingNoteSource = 'manual' | 'phantom_ai' | 'otter_ai' | 'fireflies' | 'other';
export type MeetingNoteStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  due_date?: string;
  completed: boolean;
}

export interface MeetingAttendee {
  name: string;
  email?: string;
  role?: string;
}

export interface MeetingNote {
  id: number;
  documentId: string;
  title: string;
  transcription: string | null;
  summary: string | null;
  action_items: ActionItem[] | null;
  attendees: MeetingAttendee[] | null;
  duration_minutes: number | null;
  recording_url: string | null;
  source: MeetingNoteSource;
  status: MeetingNoteStatus;
  meeting_date: string;
  calendar_event?: CalendarEvent;
  project?: Project;
  client?: Client;
  users?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingNoteData {
  title: string;
  transcription?: string;
  summary?: string;
  action_items?: ActionItem[];
  attendees?: MeetingAttendee[];
  duration_minutes?: number;
  recording_url?: string;
  source?: MeetingNoteSource;
  status?: MeetingNoteStatus;
  meeting_date: string;
  calendar_event?: number;
  project?: number;
  client?: number;
}

export type UpdateMeetingNoteData = Partial<CreateMeetingNoteData>;

