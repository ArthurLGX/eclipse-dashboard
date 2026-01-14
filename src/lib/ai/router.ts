/**
 * Router IA - Sélectionne le modèle approprié selon le use-case
 * 
 * Use-cases :
 * - project-alerts : détection de dérive (fast)
 * - project-summary : bilan de rentabilité (fast, deep si premium)
 * - project-estimation : suggestion d'estimation (fast)
 * - quote-generator : génération de devis/factures (fast)
 * - tasks-generator : génération de tâches depuis prompt/réunion (fast)
 * - contract-generator : génération de contrats (deep)
 * - email-suggestion : proposition de contenu email (fast)
 */

import { AI_MODELS, AIModelConfig, DEFAULT_MODEL } from './models';

export type AIUseCase = 
  | 'project-alerts'      // Détection de dérive en cours
  | 'project-summary'     // Bilan de rentabilité final
  | 'project-estimation'  // Suggestion d'estimation
  | 'quote-generator'     // Génération de devis/factures
  | 'tasks-generator'     // Génération de tâches
  | 'contract-generator'  // Génération de contrats
  | 'email-suggestion';   // Proposition de contenu email

interface RouterOptions {
  isPremium?: boolean;      // Utilisateur premium → modèle deep
  isCritical?: boolean;     // Projet critique → modèle deep
  projectBudget?: number;   // Budget > seuil → modèle deep
}

const CRITICAL_BUDGET_THRESHOLD = 10000; // € - au-dessus = projet critique

/**
 * Détermine le modèle IA à utiliser selon le contexte
 */
export function selectModel(
  useCase: AIUseCase,
  options: RouterOptions = {}
): AIModelConfig {
  const { isPremium, isCritical, projectBudget } = options;

  // Conditions pour utiliser le modèle deep (gpt-4.1)
  const shouldUseDeep = 
    isPremium || 
    isCritical || 
    (projectBudget && projectBudget >= CRITICAL_BUDGET_THRESHOLD);

  // Pour les bilans finaux de projets importants, utiliser le modèle deep
  if (useCase === 'project-summary' && shouldUseDeep) {
    return AI_MODELS.deep;
  }

  // Par défaut, utiliser le modèle fast (gpt-4.1-mini)
  return AI_MODELS[DEFAULT_MODEL];
}

/**
 * Retourne le modèle par défaut
 */
export function getDefaultModel(): AIModelConfig {
  return AI_MODELS[DEFAULT_MODEL];
}

