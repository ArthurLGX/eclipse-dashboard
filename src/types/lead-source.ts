/** AND = expéditeur et sujet doivent matcher (notifications de lead). OR = défaut, une des conditions suffit. */
export type LeadSourceMatchMode = 'AND' | 'OR';

export interface LeadSourceDetection {
  from_email_contains?: string[];
  subject_contains?: string[];
  from_email_ends_with?: string[];
  source_field?: string;
  match_mode?: LeadSourceMatchMode;
}

export interface LeadSource {
  id: string;
  name: string;
  /** Icône texte pour WhatsApp (Meta ne permet pas les images dans le template) — équivalent au favicon */
  icon_emoji?: string;
  favicon_url: string;
  domain: string;
  enabled: boolean;
  detection: LeadSourceDetection;
  bypass_icp: boolean;
  base_confidence: number;
  whatsapp_notify: boolean;
  hide_email_proposal: boolean;
  added_at: string;
}
