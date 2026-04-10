/**
 * Types TypeScript pour Smart Follow-Up Engine
 */

import type { LeadSource } from '@/types/lead-source';

export interface AutomationSettings {
  id: number;
  documentId: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
  enabled: boolean;
  auto_approve: boolean;
  /** Seuil 0–1 pour l’auto-approbation (ex. 0.92). Défaut côté Strapi : 0.92 */
  auto_approve_threshold?: number;
  /** Domaines supplémentaires autorisés pour l’ingestion IMAP (hors contacts et domaines des sources) */
  inbox_allowed_domains?: string[];
  notification_preferences: {
    email: boolean;
    dashboard: boolean;
    frequency: string;
    /** Canal de notification : email, whatsapp, ou les deux */
    channel?: 'both' | 'email' | 'whatsapp';
  };
  /** Filtre source des leads affichés */
  source_filter?: 'both' | 'email' | 'whatsapp';
  /** Sources de prospection (détection ICP, WhatsApp, etc.) */
  lead_sources?: LeadSource[] | null;
  /** Instruction personnalisée pour l'IA (ex: contexte Walego, priorités) */
  ai_instruction?: string | null;
  /** Historique des instructions précédentes (réutilisables) */
  ai_instruction_history?: string[] | null;
  /** Instructions par source : default, walego, folk, direct, inbound */
  ai_instructions_by_source?: {
    default?: string;
    walego?: string;
    folk?: string;
    direct?: string;
    inbound?: string;
  } | null;
  /** Instruction saisonnière avec plage de dates */
  seasonal_instruction?: {
    enabled: boolean;
    content: string;
    active_from?: string;
    active_until?: string;
  } | null;
  /** Profil onboarding (rôle, objectifs, identité) */
  user_profile?: {
    role?: string;
    goals?: string[];
    name?: string;
    email?: string;
  } | null;
  /** Gmail OAuth connecté (inbox) */
  gmail_configured?: boolean;
  /** Tokens Gmail OAuth (Smart Follow-Up) — ne jamais exposer au client hors API serveur */
  gmail_config?: {
    connected?: boolean;
    email?: string;
    access_token?: string;
    refresh_token?: string | null;
    token_expiry?: number;
    connected_at?: string;
  } | null;
  /** IMAP configuré et vérifié */
  imap_configured?: boolean;
  /** Onboarding pleine page terminé */
  onboarding_completed?: boolean;
  /** Configuration WhatsApp multiprovider (Twilio | Meta) */
  whatsapp_config?: {
    enabled: boolean;
    provider?: 'twilio' | 'meta';
    twilio?: {
      account_sid: string;
      auth_token: string;
      from_number: string;
      to_number: string;
    };
    meta?: {
      phone_number_id: string;
      access_token: string;
      recipient_number: string;
    };
    /** @deprecated Rétrocompatibilité — utiliser meta */
    phone_number_id?: string;
    access_token?: string;
    recipient_number?: string;
    notification_template?: string;
    /** Meta : true = smart_follow_up_notification, false = hello_world */
    use_smart_follow_up_template?: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskContext {
  original_subject?: string;
  from_email?: string;
  from_name?: string;
  client_name?: string;
  client_enterprise?: string;
  received_at?: string;
  amount?: string;
  deadline?: string;
  extracted_entities?: string[];
  /** Corps de l'email reçu (pour extraction Lead Status Walego) */
  email_body?: string;
  /** Preview (60 chars) de la réponse du lead — pour affichage tableau */
  lead_response_preview?: string;
  /** Source de qualification : 'contact' = contact connu (bypass ICP), etc. */
  source?: string;
  /** Id source configurée (lead_sources) détectée à l’ingestion */
  lead_source?: string;
}

export interface TaskAIAnalysis {
  intent?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  entities?: string[];
  language?: string;
  confidence?: number;
  /** Raisonnement de l'IA sur ce lead/tâche */
  reasoning?: string;
  /** Suggestion d'action de l'IA */
  suggestion?: string;
}

export interface FollowUpTask {
  id: number;
  documentId: string;
  user: {
    id: number;
    username: string;
  };
  contact: {
    id: number;
    documentId: string;
    name: string;
    enterprise?: string;
    email: string;
  } | null;
  received_email: {
    id: number;
    from_email: string;
    from_name?: string;
    snippet?: string;
    subject: string;
    content_text?: string;
    content_html?: string;
    received_at?: string;
  } | null;
  task_type: 'payment_reminder' | 'proposal_follow_up' | 'meeting_follow_up' | 'thank_you' | 'check_in' | 'custom';
  scheduled_for: string;
  status_follow_up: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context?: TaskContext;
  ai_analysis?: TaskAIAnalysis;
  completed_at: string | null;
  failure_reason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationAction {
  id: number;
  documentId: string;
  user: {
    id: number;
    username: string;
  };
  client: {
    id: number;
    documentId: string;
    name: string;
    email: string;
    website?: string | null;
    image?: { url?: string } | null;
  } | null;
  /** Photo de profil extraite du mail Walego (chemin local /leads/avatars/...) */
  avatar_path?: string | null;
  /** Titre/poste extrait du mail Walego */
  lead_title?: string | null;
  /** Lien LinkedIn extrait du mail Walego */
  linkedin_url?: string | null;
  follow_up_task: {
    id: number;
    documentId: string;
    task_type: string;
    context?: TaskContext;
    ai_analysis?: TaskAIAnalysis;
    received_email?: {
      id: number;
      subject?: string;
      from_email?: string;
      from_name?: string;
      snippet?: string;
      content_text?: string;
      content_html?: string;
      received_at?: string;
    } | null;
  } | null;
  approved_by: {
    id: number;
    username: string;
  } | null;
  action_type: 'send_email' | 'schedule_meeting' | 'create_task' | 'update_client' | 'send_sms';
  proposed_content: {
    subject: string;
    body: string;
    to: string[];
    cc: string[];
    attachments: unknown[];
    scheduled_time?: string;
    /** Nom affiché extrait du mail (Walego texte/HTML) si pas de fiche client */
    lead_display_name?: string;
  };
  status_automation_action: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'snoozed';
  edited_content: unknown | null;
  execution_result: unknown | null;
  approved_at: string | null;
  executed_at: string | null;
  rejection_reason: string | null;
  confidence_score: number;
  requires_approval: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Lead unifié (Strapi `api::lead.lead`) — tableau Smart Follow-Up */
export interface SfuLead {
  id: number;
  documentId: string;
  name?: string | null;
  title?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  source?: string | null;
  score?: 'hot' | 'warm' | 'neutral' | 'cold';
  confidence?: number | null;
  signal?: string | null;
  fog_risk?: boolean;
  fog_reason?: string | null;
  draft?: string | null;
  proposed_content?: AutomationAction['proposed_content'] | Record<string, unknown> | null;
  ai_analysis?: TaskAIAnalysis | Record<string, unknown> | null;
  task_type?: string | null;
  scheduled_for?: string | null;
  requires_approval?: boolean;
  status: 'new' | 'seen' | 'replied' | 'snoozed' | 'archived';
  snoozed_until?: string | null;
  received_email?: FollowUpTask['received_email'] | null;
  user?: { id: number; username?: string };
  client?: AutomationAction['client'];
  replied_at?: string | null;
  archived_at?: string | null;
  seen_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutomationLog {
  id: number;
  documentId: string;
  user: {
    id: number;
    username: string;
  };
  client: {
    id: number;
    name: string;
  } | null;
  received_email: {
    id: number;
    subject: string;
  } | null;
  event_type: 'email_received' | 'analyzed' | 'task_created' | 'action_proposed' | 'action_approved' | 'action_rejected' | 'follow_up_sent' | 'error';
  event_data: unknown;
  status_automation: 'success' | 'failure' | 'pending';
  error_message: string | null;
  metadata: unknown | null;
  createdAt: string;
}

export interface SmartFollowUpStats {
  activeActions: number;
  dueToday: number;
  sentThisWeek: number;
  recoveredOpportunities: number;
  totalTasks: number;
  completedTasks: number;
  successRate: number;
}

/** Item du digest quotidien (Home View) */
export interface DailyDigestItem {
  id: string;
  name: string;
  signal: string;
  score: 'hot' | 'warm' | 'neutral' | 'cold';
  scheduledAt: string | null;
  taskType?: string;
  daysOld: number;
}

/** Digest quotidien matinal (généré à 7h, WhatsApp + dashboard) */
export interface DailyDigest {
  userId: string;
  date: string;
  generatedAt: string;
  hotLeads: DailyDigestItem[];
  stalledLeads: DailyDigestItem[];
  todayRdvs: DailyDigestItem[];
  totalActionable: number;
}
