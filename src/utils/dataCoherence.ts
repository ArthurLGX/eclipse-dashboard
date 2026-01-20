/**
 * ============================================================================
 * RÈGLES DE COHÉRENCE DES DONNÉES (ISOPÉRIMÉTRIE)
 * ============================================================================
 * 
 * Principe fondamental: À tout instant, le statut d'un objet "parent" doit être
 * strictement cohérent avec l'état réel de ses objets "enfants" et des éléments liés.
 * 
 * Ces règles sont centralisées ici pour éviter la duplication et garantir
 * que tous les composants appliquent les mêmes invariants.
 */

import type { TaskStatus } from '@/types';

// ============================================================================
// RÈGLES TÂCHES ↔ SOUS-TÂCHES
// ============================================================================

export interface TaskCoherenceState {
  status: TaskStatus;
  progress: number;
}

export interface SubtaskState {
  task_status: TaskStatus;
  progress?: number;
}

/**
 * Calcule le statut et la progression d'une tâche parente
 * basé sur l'état de ses sous-tâches.
 * 
 * Règles:
 * - Toutes sous-tâches 'completed' → parent 'completed', progress 100%
 * - Au moins une 'in_progress' → parent 'in_progress'
 * - Toutes 'todo' → parent 'todo', progress 0%
 * - Mix → parent 'in_progress', progress calculé
 */
export function calculateParentTaskState(subtasks: SubtaskState[]): TaskCoherenceState {
  if (!subtasks || subtasks.length === 0) {
    return { status: 'todo', progress: 0 };
  }
  
  const completedCount = subtasks.filter(st => st.task_status === 'completed').length;
  const cancelledCount = subtasks.filter(st => st.task_status === 'cancelled').length;
  const inProgressCount = subtasks.filter(st => st.task_status === 'in_progress').length;
  const totalActive = subtasks.length - cancelledCount;
  
  // Toutes terminées (ou annulées)
  if (completedCount === totalActive && totalActive > 0) {
    return { status: 'completed', progress: 100 };
  }
  
  // Toutes à faire (aucune en cours ou terminée)
  if (completedCount === 0 && inProgressCount === 0) {
    return { status: 'todo', progress: 0 };
  }
  
  // Sinon, en cours avec progression calculée
  const progress = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;
  return { status: 'in_progress', progress };
}

/**
 * Vérifie si une tâche parente est cohérente avec ses sous-tâches
 */
export function isParentTaskCoherent(
  parentStatus: TaskStatus,
  parentProgress: number,
  subtasks: SubtaskState[]
): boolean {
  const expected = calculateParentTaskState(subtasks);
  return parentStatus === expected.status && parentProgress === expected.progress;
}

// ============================================================================
// RÈGLES PROJET ↔ TÂCHES
// ============================================================================

export type ProjectStatus = 'todo' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export interface ProjectCoherenceState {
  status: ProjectStatus;
  progress: number;
  isCoherent: boolean;
  reason?: string;
}

/**
 * Calcule le statut et la progression d'un projet
 * basé sur l'état de ses tâches.
 * 
 * Règles:
 * - Toutes tâches 'todo' → projet 'todo'
 * - Au moins 1 tâche 'in_progress' → projet 'in_progress'
 * - Toutes tâches 'blocked' → projet 'blocked'
 * - Toutes tâches 'completed' ou 'cancelled' → projet 'completed'
 */
export function calculateProjectState(tasks: SubtaskState[]): ProjectCoherenceState {
  if (!tasks || tasks.length === 0) {
    return { 
      status: 'todo', 
      progress: 0, 
      isCoherent: true,
      reason: 'Aucune tâche dans le projet'
    };
  }
  
  const completedCount = tasks.filter(t => t.task_status === 'completed').length;
  const cancelledCount = tasks.filter(t => t.task_status === 'cancelled').length;
  const blockedCount = tasks.filter(t => t.task_status === 'archived').length; // 'archived' peut représenter 'blocked'
  const todoCount = tasks.filter(t => t.task_status === 'todo').length;
  const totalActive = tasks.length - cancelledCount;
  
  // Toutes terminées
  if (completedCount + cancelledCount === tasks.length && completedCount > 0) {
    return { 
      status: 'completed', 
      progress: 100, 
      isCoherent: true 
    };
  }
  
  // Toutes bloquées
  if (blockedCount === totalActive && totalActive > 0) {
    return { 
      status: 'blocked', 
      progress: Math.round((completedCount / totalActive) * 100), 
      isCoherent: true 
    };
  }
  
  // Toutes à faire
  if (todoCount === totalActive && totalActive > 0) {
    return { 
      status: 'todo', 
      progress: 0, 
      isCoherent: true 
    };
  }
  
  // Au moins une en cours ou progression
  const progress = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;
  return { 
    status: 'in_progress', 
    progress, 
    isCoherent: true 
  };
}

/**
 * Vérifie si le statut d'un projet est cohérent avec ses tâches
 */
export function isProjectCoherent(
  projectStatus: ProjectStatus,
  tasks: SubtaskState[]
): { isCoherent: boolean; expectedStatus: ProjectStatus; reason?: string } {
  const expected = calculateProjectState(tasks);
  
  // Cas spécial: projet "terminé" mais tâches non terminées
  if (projectStatus === 'completed') {
    const hasActiveTasks = tasks.some(t => 
      t.task_status === 'todo' || t.task_status === 'in_progress'
    );
    if (hasActiveTasks) {
      return {
        isCoherent: false,
        expectedStatus: expected.status,
        reason: 'Le projet est marqué "terminé" mais des tâches sont encore actives'
      };
    }
  }
  
  return {
    isCoherent: projectStatus === expected.status,
    expectedStatus: expected.status,
    reason: projectStatus !== expected.status 
      ? `Le projet devrait être "${expected.status}" (actuellement: "${projectStatus}")`
      : undefined
  };
}

// ============================================================================
// RÈGLES CONTACT/CLIENT ↔ PIPELINE
// ============================================================================

export type PipelineStatus = 
  | 'new' 
  | 'contacted' 
  | 'form_sent'
  | 'qualified' 
  | 'quote_sent' 
  | 'quote_accepted'
  | 'negotiation' 
  | 'in_progress' 
  | 'delivered' 
  | 'won' 
  | 'maintenance'
  | 'lost';

export interface ContactCoherenceCheck {
  isCoherent: boolean;
  issues: string[];
}

/**
 * Vérifie la cohérence d'un contact/client dans le pipeline
 * 
 * Règles:
 * - 'won' requiert un devis accepté
 * - 'quote_accepted' requiert un devis envoyé au préalable
 * - 'in_progress' requiert un projet actif
 * - 'delivered' requiert toutes les tâches terminées
 */
export function checkContactCoherence(
  pipelineStatus: PipelineStatus,
  hasAcceptedQuote: boolean,
  hasSentQuote: boolean,
  hasActiveProject: boolean,
  allTasksCompleted: boolean
): ContactCoherenceCheck {
  const issues: string[] = [];
  
  // Vérifications
  if ((pipelineStatus === 'won' || pipelineStatus === 'quote_accepted') && !hasAcceptedQuote) {
    issues.push('Contact "Gagné" ou "Devis accepté" sans devis signé');
  }
  
  if (pipelineStatus === 'quote_sent' && !hasSentQuote) {
    issues.push('Contact "Devis envoyé" sans devis créé');
  }
  
  if (pipelineStatus === 'in_progress' && !hasActiveProject) {
    issues.push('Contact "En cours" sans projet actif');
  }
  
  if (pipelineStatus === 'delivered' && !allTasksCompleted) {
    issues.push('Contact "Livré" mais des tâches sont encore actives');
  }
  
  return {
    isCoherent: issues.length === 0,
    issues
  };
}

// ============================================================================
// RÈGLES DEVIS ↔ FACTURE ↔ CONTRAT
// ============================================================================

export interface DocumentCoherenceCheck {
  isCoherent: boolean;
  issues: string[];
}

/**
 * Vérifie la cohérence entre devis, factures et contrats
 * 
 * Règles:
 * - Facture "payée" requiert facture "envoyée"
 * - Facture liée à un projet requiert devis accepté (si devis requis)
 * - Contrat "signé" requiert lien avec projet ou devis
 */
export function checkDocumentCoherence(
  factureStatus: 'draft' | 'sent' | 'paid' | 'cancelled',
  factureSent: boolean,
  hasLinkedQuote: boolean,
  quoteAccepted: boolean,
  requiresQuote: boolean,
  contratSigned: boolean,
  contratHasProject: boolean
): DocumentCoherenceCheck {
  const issues: string[] = [];
  
  // Facture payée sans être envoyée
  if (factureStatus === 'paid' && !factureSent) {
    issues.push('Facture "payée" sans avoir été envoyée');
  }
  
  // Facture sans devis accepté (si devis requis)
  if (requiresQuote && hasLinkedQuote && !quoteAccepted) {
    issues.push('Facture créée mais le devis associé n\'est pas accepté');
  }
  
  // Contrat signé sans projet
  if (contratSigned && !contratHasProject) {
    issues.push('Contrat signé sans lien avec un projet');
  }
  
  return {
    isCoherent: issues.length === 0,
    issues
  };
}

// ============================================================================
// UTILITAIRES D'ALERTE
// ============================================================================

export interface CoherenceAlert {
  type: 'warning' | 'error';
  entity: string;
  entityId: string;
  message: string;
}

/**
 * Génère des alertes de cohérence pour affichage à l'utilisateur
 */
export function generateCoherenceAlerts(
  checks: Array<{ entity: string; entityId: string; check: { isCoherent: boolean; issues?: string[]; reason?: string } }>
): CoherenceAlert[] {
  const alerts: CoherenceAlert[] = [];
  
  for (const { entity, entityId, check } of checks) {
    if (!check.isCoherent) {
      const messages = check.issues || (check.reason ? [check.reason] : ['Incohérence détectée']);
      for (const message of messages) {
        alerts.push({
          type: 'warning',
          entity,
          entityId,
          message
        });
      }
    }
  }
  
  return alerts;
}

