/**
 * Configuration des modèles OpenAI pour l'analyse de rentabilité
 * 
 * Principes :
 * - gpt-4.1-mini : modèle par défaut (rapide, économique)
 * - gpt-4.1 : analyses approfondies (projets critiques/premium)
 * - Jamais de nano pour les bilans de rentabilité
 */

export type AIModelType = 'fast' | 'deep';

export interface AIModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  temperature: number;
}

export const AI_MODELS: Record<AIModelType, AIModelConfig> = {
  fast: {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    maxTokens: 1024,
    temperature: 0.3, // Plus déterministe pour les analyses financières
  },
  deep: {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    maxTokens: 2048,
    temperature: 0.4,
  },
};

export const DEFAULT_MODEL: AIModelType = 'fast';

