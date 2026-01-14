/**
 * Logique métier pour l'analyse de rentabilité des projets
 * 
 * Principe : L'IA analyse des données JSON structurées déjà existantes
 * et retourne des insights actionnables.
 */

import { selectModel, AIUseCase } from './router';
import { AIModelConfig } from './models';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface TaskAnalysis {
  name: string;
  estimated_hours: number;
  actual_hours: number;
}

export interface ProjectAnalysisInput {
  project_id: string;
  project_name: string;
  estimated_hours: number;
  actual_hours: number;
  hourly_rate: number;
  estimated_budget: number;
  invoiced_amount: number;
  billing_type: 'fixed' | 'hourly' | 'mixed';
  tasks: TaskAnalysis[];
  is_completed?: boolean;
}

export interface ProfitabilityResult {
  profitability: 'positive' | 'neutral' | 'negative';
  profit_or_loss: number; // Positif = profit, négatif = perte
  effective_hourly_rate: number;
  main_causes: string[];
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high';
  summary: string;
}

export interface AlertResult {
  risk: 'low' | 'medium' | 'high';
  reason: string;
  recommendation: string;
  tasks_at_risk: string[];
  estimated_loss?: number;
}

// ════════════════════════════════════════════════════════════════
// PROMPTS
// ════════════════════════════════════════════════════════════════

const PROFITABILITY_SYSTEM_PROMPT = `Tu es un assistant expert en gestion de projet et rentabilité pour freelances développeurs.
Ton rôle est d'analyser les données d'un projet et de fournir un bilan de rentabilité clair et actionnable.

RÈGLES :
- Réponds UNIQUEMENT en JSON valide
- Sois direct et pragmatique
- Les recommandations doivent être concrètes et applicables
- Utilise le français
- Ne mentionne jamais que tu es une IA

FORMAT DE RÉPONSE (JSON strict) :
{
  "profitability": "positive" | "neutral" | "negative",
  "profit_or_loss": number,
  "effective_hourly_rate": number,
  "main_causes": ["cause 1", "cause 2"],
  "recommendations": ["reco 1", "reco 2"],
  "risk_level": "low" | "medium" | "high",
  "summary": "Résumé en une phrase"
}`;

const ALERT_SYSTEM_PROMPT = `Tu es un assistant expert en gestion de projet pour freelances.
Ton rôle est de détecter les dérives de budget/temps et d'alerter de manière préventive.

RÈGLES :
- Réponds UNIQUEMENT en JSON valide
- Sois concis et direct
- Utilise le français

FORMAT DE RÉPONSE (JSON strict) :
{
  "risk": "low" | "medium" | "high",
  "reason": "Explication courte",
  "recommendation": "Action concrète à prendre",
  "tasks_at_risk": ["tâche 1", "tâche 2"],
  "estimated_loss": number | null
}`;

// ════════════════════════════════════════════════════════════════
// FONCTIONS D'ANALYSE
// ════════════════════════════════════════════════════════════════

/**
 * Analyse la rentabilité d'un projet (appelé à la fin du projet)
 */
export async function analyzeProjectProfitability(
  input: ProjectAnalysisInput,
  options?: { isPremium?: boolean; isCritical?: boolean }
): Promise<ProfitabilityResult> {
  const model = selectModel('project-summary', {
    ...options,
    projectBudget: input.estimated_budget,
  });

  const userPrompt = `Analyse la rentabilité de ce projet freelance :

DONNÉES DU PROJET :
- Nom : ${input.project_name}
- Type de facturation : ${input.billing_type === 'fixed' ? 'Forfait' : input.billing_type === 'hourly' ? 'Régie' : 'Mixte'}
- Taux horaire prévu : ${input.hourly_rate}€/h
- Budget estimé : ${input.estimated_budget}€
- Montant facturé : ${input.invoiced_amount}€

TEMPS :
- Heures estimées : ${input.estimated_hours}h
- Heures réelles : ${input.actual_hours}h
- Écart : ${input.actual_hours - input.estimated_hours}h (${Math.round((input.actual_hours / input.estimated_hours - 1) * 100)}%)

DÉTAIL PAR TÂCHE :
${input.tasks.map(t => `- ${t.name}: estimé ${t.estimated_hours}h, réel ${t.actual_hours}h (écart: ${t.actual_hours - t.estimated_hours}h)`).join('\n')}

Calcule le taux horaire effectif et détermine si le projet est rentable.`;

  const response = await callOpenAI(model, PROFITABILITY_SYSTEM_PROMPT, userPrompt);
  
  try {
    return JSON.parse(response) as ProfitabilityResult;
  } catch {
    // Fallback si l'IA ne retourne pas du JSON valide
    return calculateFallbackProfitability(input);
  }
}

/**
 * Détecte les alertes de dérive en cours de projet
 */
export async function detectProjectAlerts(
  input: ProjectAnalysisInput
): Promise<AlertResult> {
  const model = selectModel('project-alerts');

  // Calcul du pourcentage de consommation
  const consumptionPercent = Math.round((input.actual_hours / input.estimated_hours) * 100);
  
  const userPrompt = `Analyse l'état d'avancement de ce projet :

PROJET : ${input.project_name}

BUDGET TEMPS :
- Estimé : ${input.estimated_hours}h
- Consommé : ${input.actual_hours}h
- Progression : ${consumptionPercent}%

TÂCHES :
${input.tasks.map(t => {
  const taskPercent = t.estimated_hours > 0 ? Math.round((t.actual_hours / t.estimated_hours) * 100) : 0;
  return `- ${t.name}: ${t.actual_hours}h / ${t.estimated_hours}h (${taskPercent}%)`;
}).join('\n')}

Détecte s'il y a un risque de dépassement et donne une recommandation.`;

  const response = await callOpenAI(model, ALERT_SYSTEM_PROMPT, userPrompt);
  
  try {
    return JSON.parse(response) as AlertResult;
  } catch {
    // Fallback si l'IA ne retourne pas du JSON valide
    return calculateFallbackAlert(input);
  }
}

// ════════════════════════════════════════════════════════════════
// APPEL OPENAI
// ════════════════════════════════════════════════════════════════

async function callOpenAI(
  model: AIModelConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: model.maxTokens,
      temperature: model.temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '{}';
}

// ════════════════════════════════════════════════════════════════
// FALLBACKS (calculs locaux si l'IA échoue)
// ════════════════════════════════════════════════════════════════

function calculateFallbackProfitability(input: ProjectAnalysisInput): ProfitabilityResult {
  const effectiveHourlyRate = input.actual_hours > 0 
    ? input.invoiced_amount / input.actual_hours 
    : input.hourly_rate;
  
  const expectedRevenue = input.actual_hours * input.hourly_rate;
  const profitOrLoss = input.invoiced_amount - expectedRevenue;
  
  let profitability: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (profitOrLoss > 0) profitability = 'positive';
  if (profitOrLoss < -100) profitability = 'negative';

  const overrunPercent = ((input.actual_hours - input.estimated_hours) / input.estimated_hours) * 100;
  
  const main_causes: string[] = [];
  const recommendations: string[] = [];
  
  // Identifier les tâches qui ont dépassé
  const overrunTasks = input.tasks.filter(t => t.actual_hours > t.estimated_hours * 1.2);
  if (overrunTasks.length > 0) {
    main_causes.push(`Dépassement sur : ${overrunTasks.map(t => t.name).join(', ')}`);
    recommendations.push('Revoir les estimations pour ces types de tâches');
  }
  
  if (overrunPercent > 20) {
    main_causes.push('Sous-estimation globale du projet');
    recommendations.push('Ajouter une marge de sécurité de 20% sur les prochains devis');
  }

  return {
    profitability,
    profit_or_loss: Math.round(profitOrLoss),
    effective_hourly_rate: Math.round(effectiveHourlyRate * 100) / 100,
    main_causes: main_causes.length > 0 ? main_causes : ['Données insuffisantes'],
    recommendations: recommendations.length > 0 ? recommendations : ['Continuer le suivi du temps'],
    risk_level: profitability === 'negative' ? 'high' : profitability === 'neutral' ? 'medium' : 'low',
    summary: profitability === 'positive' 
      ? `Projet rentable (+${Math.abs(profitOrLoss)}€)`
      : profitability === 'negative'
        ? `Perte de ${Math.abs(profitOrLoss)}€ sur ce projet`
        : 'Rentabilité neutre',
  };
}

function calculateFallbackAlert(input: ProjectAnalysisInput): AlertResult {
  const consumptionPercent = (input.actual_hours / input.estimated_hours) * 100;
  
  // Identifier les tâches à risque
  const tasksAtRisk = input.tasks
    .filter(t => t.estimated_hours > 0 && (t.actual_hours / t.estimated_hours) > 0.8)
    .map(t => t.name);

  let risk: 'low' | 'medium' | 'high' = 'low';
  let reason = 'Le projet avance normalement';
  let recommendation = 'Continuer le suivi régulier';

  if (consumptionPercent >= 100) {
    risk = 'high';
    reason = `Budget temps dépassé (${Math.round(consumptionPercent)}% consommé)`;
    recommendation = 'Alerter le client et renégocier le scope ou le budget';
  } else if (consumptionPercent >= 80) {
    risk = 'medium';
    reason = `${Math.round(consumptionPercent)}% du budget temps consommé`;
    recommendation = 'Prioriser les tâches restantes et anticiper un possible dépassement';
  }

  const estimatedLoss = consumptionPercent > 100
    ? Math.round((input.actual_hours - input.estimated_hours) * input.hourly_rate)
    : undefined;

  return {
    risk,
    reason,
    recommendation,
    tasks_at_risk: tasksAtRisk,
    estimated_loss: estimatedLoss,
  };
}

// ════════════════════════════════════════════════════════════════
// UTILITAIRES
// ════════════════════════════════════════════════════════════════

/**
 * Prépare les données d'un projet pour l'analyse
 * (à appeler depuis les API routes)
 */
export function prepareProjectData(
  project: {
    documentId: string;
    title: string;
    hourly_rate?: number;
    estimated_budget?: number;
    project_status?: string;
  },
  tasks: Array<{
    title: string;
    estimated_hours?: number;
    actual_hours?: number;
  }>,
  invoicedAmount: number
): ProjectAnalysisInput {
  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const actualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
  const hourlyRate = project.hourly_rate || 50; // Taux par défaut

  return {
    project_id: project.documentId,
    project_name: project.title,
    estimated_hours: estimatedHours,
    actual_hours: actualHours,
    hourly_rate: hourlyRate,
    estimated_budget: project.estimated_budget || estimatedHours * hourlyRate,
    invoiced_amount: invoicedAmount,
    billing_type: 'fixed', // TODO: récupérer depuis le projet
    tasks: tasks.map(t => ({
      name: t.title,
      estimated_hours: t.estimated_hours || 0,
      actual_hours: t.actual_hours || 0,
    })),
    is_completed: project.project_status === 'completed',
  };
}

