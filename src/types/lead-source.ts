export interface LeadSourceDetection {
  from_email_contains?: string[];
  subject_contains?: string[];
  from_email_ends_with?: string[];
  source_field?: string;
}

export interface LeadSource {
  id: string;
  name: string;
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
