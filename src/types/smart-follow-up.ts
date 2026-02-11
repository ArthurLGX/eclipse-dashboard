/**
 * Types TypeScript pour Smart Follow-Up Engine
 */

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
  priority_keywords: string[];
  delay_settings: {
    payment_reminder: number;
    proposal_follow_up: number;
    meeting_follow_up: number;
    thank_you: number;
    check_in: number;
  };
  work_hours: {
    start: string;
    end: string;
    timezone: string;
    days: string[];
  };
  excluded_domains: string[];
  notification_preferences: {
    email: boolean;
    dashboard: boolean;
    frequency: string;
  };
  createdAt: string;
  updatedAt: string;
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
    subject: string;
  } | null;
  task_type: 'payment_reminder' | 'proposal_follow_up' | 'meeting_follow_up' | 'thank_you' | 'check_in' | 'custom';
  scheduled_for: string;
  status_follow_up: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: unknown;
  ai_analysis: unknown;
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
  } | null;
  follow_up_task: {
    id: number;
    documentId: string;
    task_type: string;
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
  };
  status_automation_action: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
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
