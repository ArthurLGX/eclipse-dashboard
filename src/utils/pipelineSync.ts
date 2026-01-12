/**
 * Utilitaires pour la synchronisation automatique du pipeline
 * 
 * Ce module permet de calculer automatiquement le statut pipeline d'un client
 * basé sur ses devis, projets, factures et emails.
 */

import type { Client, Facture, Project, PipelineStatus } from '@/types';

/**
 * Priorité des statuts pipeline (du plus prioritaire au moins prioritaire)
 * Un statut plus avancé dans le cycle de vente a la priorité
 */
const PIPELINE_STATUS_PRIORITY: PipelineStatus[] = [
  'won',
  'maintenance',
  'delivered',
  'in_progress',
  'quote_accepted',
  'negotiation',
  'quote_sent',
  'qualified',
  'form_sent',
  'contacted',
  'new',
  'lost',
];

/**
 * Calcule le statut pipeline automatique d'un client basé sur ses données
 */
export function calculateClientPipelineStatus(
  client: Client,
  quotes: Facture[],
  projects: Project[],
  hasEmailsSent: boolean = false
): PipelineStatus {
  // Filtrer les devis pour ce client
  const clientQuotes = quotes.filter(q => {
    const clientId = q.client_id && typeof q.client_id === 'object' 
      ? (q.client_id as Client).documentId 
      : q.client_id;
    const clientAlt = q.client && typeof q.client === 'object'
      ? (q.client as Client).documentId
      : undefined;
    return clientId === client.documentId || clientAlt === client.documentId;
  });

  // Filtrer les projets pour ce client
  const clientProjects = projects.filter(p => {
    const projectClientId = p.client && typeof p.client === 'object'
      ? (p.client as Client).documentId
      : undefined;
    return projectClientId === client.documentId;
  });

  // Vérifier les différents cas par ordre de priorité
  // Note: Cast en string pour supporter les statuts étendus qui peuvent exister en base

  // 1. Projet terminé et livré -> won ou delivered
  const deliveredProjects = clientProjects.filter(p => {
    const status = p.project_status as string;
    return status === 'completed' || status === 'archived';
  });
  if (deliveredProjects.length > 0) {
    // Si tous les projets sont terminés -> won
    const allCompleted = clientProjects.every(p => {
      const status = p.project_status as string;
      return status === 'completed' || status === 'archived';
    });
    if (allCompleted && clientProjects.length > 0) {
      return 'won';
    }
    return 'delivered';
  }

  // 2. Projet en cours -> in_progress
  const inProgressProjects = clientProjects.filter(p => {
    const status = p.project_status as string;
    return status === 'in_progress' || status === 'development';
  });
  if (inProgressProjects.length > 0) {
    return 'in_progress';
  }

  // 3. Devis accepté -> quote_accepted
  const acceptedQuotes = clientQuotes.filter(q => q.quote_status === 'accepted');
  if (acceptedQuotes.length > 0) {
    return 'quote_accepted';
  }

  // 4. En négociation -> negotiation (statut étendu)
  const negotiationQuotes = clientQuotes.filter(q => (q.quote_status as string) === 'negotiation');
  if (negotiationQuotes.length > 0) {
    return 'negotiation';
  }

  // 5. Devis envoyé -> quote_sent
  const sentQuotes = clientQuotes.filter(q => q.quote_status === 'sent');
  if (sentQuotes.length > 0) {
    return 'quote_sent';
  }

  // 6. Devis en brouillon -> qualified (client qualifié car on prépare un devis)
  const draftQuotes = clientQuotes.filter(q => q.quote_status === 'draft');
  if (draftQuotes.length > 0) {
    return 'qualified';
  }

  // 7. Email envoyé sans devis -> contacted
  if (hasEmailsSent) {
    return 'contacted';
  }

  // 8. Par défaut -> new
  return 'new';
}

/**
 * Compare deux statuts et retourne le plus prioritaire
 */
export function getMostPrioritaryStatus(
  currentStatus: PipelineStatus | null | undefined,
  newStatus: PipelineStatus
): PipelineStatus {
  if (!currentStatus) return newStatus;
  
  const currentPriority = PIPELINE_STATUS_PRIORITY.indexOf(currentStatus);
  const newPriority = PIPELINE_STATUS_PRIORITY.indexOf(newStatus);
  
  // Plus l'index est petit, plus le statut est prioritaire
  return currentPriority <= newPriority ? currentStatus : newStatus;
}

/**
 * Détermine si un statut doit être mis à jour automatiquement
 * Certains statuts comme 'lost' ou 'maintenance' sont manuels
 */
export function shouldAutoUpdateStatus(currentStatus: PipelineStatus | null | undefined): boolean {
  // Ne pas écraser les statuts manuels
  const manualStatuses: PipelineStatus[] = ['lost', 'maintenance'];
  if (currentStatus && manualStatuses.includes(currentStatus)) {
    return false;
  }
  return true;
}

/**
 * Calcule le statut pipeline suggéré basé sur une action spécifique
 */
export function getStatusFromAction(action: 'quote_sent' | 'quote_accepted' | 'quote_rejected' | 'project_started' | 'project_completed' | 'email_sent'): PipelineStatus {
  switch (action) {
    case 'quote_sent':
      return 'quote_sent';
    case 'quote_accepted':
      return 'quote_accepted';
    case 'quote_rejected':
      return 'lost';
    case 'project_started':
      return 'in_progress';
    case 'project_completed':
      return 'delivered';
    case 'email_sent':
      return 'contacted';
    default:
      return 'new';
  }
}

/**
 * Interface pour les KPIs du pipeline
 */
export interface PipelineKPIs {
  // Valeurs monétaires
  potentialValue: number;      // Somme des devis envoyés
  wonValue: number;            // Somme des devis acceptés/validés
  lostValue: number;           // Somme des devis refusés
  inNegotiationValue: number;  // Somme des devis en négociation
  
  // Compteurs
  totalContacts: number;
  newContacts: number;
  contactedCount: number;
  quotesSentCount: number;
  quotesAcceptedCount: number;
  inProgressCount: number;
  deliveredCount: number;
  wonCount: number;
  lostCount: number;
  
  // Taux
  conversionRate: number;      // % de devis acceptés / devis envoyés
  winRate: number;             // % de contacts gagnés / total contacts
  
  // Évolution (pour le graphique)
  monthlyPotential: { month: string; potential: number; won: number }[];
}

/**
 * Calcule les KPIs du pipeline
 */
export function calculatePipelineKPIs(
  contacts: Client[],
  quotes: Facture[],
  projects: Project[]
): PipelineKPIs {
  // Filtrer uniquement les devis (pas les factures)
  const onlyQuotes = quotes.filter(q => q.document_type === 'quote');
  
  // Calcul des valeurs monétaires
  const sentQuotes = onlyQuotes.filter(q => q.quote_status === 'sent');
  const acceptedQuotes = onlyQuotes.filter(q => q.quote_status === 'accepted');
  const rejectedQuotes = onlyQuotes.filter(q => q.quote_status === 'rejected');
  const negotiationQuotes = onlyQuotes.filter(q => (q.quote_status as string) === 'negotiation');
  
  const potentialValue = sentQuotes.reduce((sum, q) => sum + (q.number || 0), 0);
  const wonValue = acceptedQuotes.reduce((sum, q) => sum + (q.number || 0), 0);
  const lostValue = rejectedQuotes.reduce((sum, q) => sum + (q.number || 0), 0);
  const inNegotiationValue = negotiationQuotes.reduce((sum, q) => sum + (q.number || 0), 0);
  
  // Compteurs par statut
  const statusCounts = contacts.reduce((acc, c) => {
    const status = c.pipeline_status || 'new';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Taux de conversion
  const totalQuotesSent = sentQuotes.length + acceptedQuotes.length + rejectedQuotes.length;
  const conversionRate = totalQuotesSent > 0 
    ? (acceptedQuotes.length / totalQuotesSent) * 100 
    : 0;
  
  const winRate = contacts.length > 0
    ? ((statusCounts['won'] || 0) / contacts.length) * 100
    : 0;
  
  // Évolution mensuelle (6 derniers mois)
  const monthlyPotential = calculateMonthlyEvolution(onlyQuotes);
  
  return {
    potentialValue,
    wonValue,
    lostValue,
    inNegotiationValue,
    totalContacts: contacts.length,
    newContacts: statusCounts['new'] || 0,
    contactedCount: statusCounts['contacted'] || 0,
    quotesSentCount: statusCounts['quote_sent'] || 0,
    quotesAcceptedCount: statusCounts['quote_accepted'] || 0,
    inProgressCount: statusCounts['in_progress'] || 0,
    deliveredCount: statusCounts['delivered'] || 0,
    wonCount: statusCounts['won'] || 0,
    lostCount: statusCounts['lost'] || 0,
    conversionRate,
    winRate,
    monthlyPotential,
  };
}

/**
 * Calcule l'évolution mensuelle des valeurs de devis
 */
function calculateMonthlyEvolution(quotes: Facture[]): { month: string; potential: number; won: number }[] {
  const monthsData: Map<string, { potential: number; won: number }> = new Map();
  
  // Initialiser les 12 derniers mois
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthsData.set(key, { potential: 0, won: 0 });
  }
  
  // Remplir avec les données des devis
  quotes.forEach(quote => {
    if (!quote.date) return;
    const date = new Date(quote.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthsData.has(key)) {
      const current = monthsData.get(key)!;
      const status = quote.quote_status as string;
      if (status === 'sent' || status === 'negotiation') {
        current.potential += quote.number || 0;
      }
      if (status === 'accepted') {
        current.won += quote.number || 0;
      }
    }
  });
  
  // Convertir en tableau
  return Array.from(monthsData.entries()).map(([month, data]) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
    // Ajouter l'année seulement pour janvier ou le dernier mois
    const isJanuary = parseInt(monthNum) === 1;
    const isLast = month === Array.from(monthsData.keys()).pop();
    const label = isJanuary || isLast 
      ? `${monthName} ${year}` 
      : monthName;
    
    return {
      month: label,
      potential: data.potential,
      won: data.won,
    };
  });
}

/**
 * Obtient le libellé français d'un statut pipeline
 */
export function getPipelineStatusLabel(status: PipelineStatus): string {
  const labels: Record<PipelineStatus, string> = {
    new: 'Nouveau',
    contacted: 'Contacté',
    form_sent: 'Formulaire envoyé',
    qualified: 'Qualifié',
    quote_sent: 'Devis envoyé',
    quote_accepted: 'Devis accepté',
    negotiation: 'Négociation',
    in_progress: 'En cours',
    delivered: 'Livré',
    maintenance: 'Maintenance',
    won: 'Gagné',
    lost: 'Perdu',
  };
  return labels[status] || status;
}
