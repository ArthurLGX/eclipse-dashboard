/**
 * Configuration des modules par métier
 * Définit les modules par défaut et disponibles pour chaque type de business
 */

export type BusinessType = 
  | 'web_developer' 
  | 'agency' 
  | 'designer' 
  | 'consultant' 
  | 'photographer' 
  | 'coach'
  | 'artisan'
  | 'other';

export interface BusinessConfig {
  label: string;
  labelEn: string;
  icon: string;
  description: string;
  descriptionEn: string;
  defaultModules: string[];
  availableModules: string[];
  terminology: {
    project?: string;
    projectEn?: string;
    client?: string;
    clientEn?: string;
    invoice?: string;
    invoiceEn?: string;
  };
}

export interface ModuleConfig {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  path: string;
  core: boolean; // Module toujours disponible
  description: string;
  descriptionEn: string;
}

// Status des modules (beta, new, etc.)
export type ModuleStatus = 'beta' | 'new' | null;

export interface ModuleStatusConfig {
  moduleId: string;
  status: ModuleStatus;
  expiresAt?: string; // Date d'expiration optionnelle (ex: pour "new")
}

// Configuration des statuts des modules - peut être overridée par l'admin
// Cette config est la config par défaut, les admins peuvent la modifier via l'API
export const DEFAULT_MODULE_STATUSES: ModuleStatusConfig[] = [
  { moduleId: 'growth_audit', status: 'beta' },
  // Ajouter d'autres modules ici si nécessaire
  // { moduleId: 'calendar', status: 'new', expiresAt: '2026-03-01' },
];

// Helper function to get module status
export function getModuleStatus(moduleId: string, customStatuses?: ModuleStatusConfig[]): ModuleStatus {
  const statuses = customStatuses || DEFAULT_MODULE_STATUSES;
  const config = statuses.find(s => s.moduleId === moduleId);
  
  if (!config) return null;
  
  // Check if status has expired
  if (config.expiresAt && new Date(config.expiresAt) < new Date()) {
    return null;
  }
  
  return config.status;
}

// Configuration des métiers
// SIMPLIFICATION: Modules avancés OFF par défaut (newsletters, monitoring, audits, calendar)
// Time tracking simple ON par défaut pour tous
export const BUSINESS_CONFIGS: Record<BusinessType, BusinessConfig> = {
  web_developer: {
    label: 'Développeur Web',
    labelEn: 'Web Developer',
    icon: 'IconCode',
    description: 'Freelance ou indépendant dans le développement web',
    descriptionEn: 'Freelance or independent web developer',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['newsletters', 'monitoring', 'calendar', 'growth_audit', 'instagram_planner'],
    terminology: {
      project: 'Projet',
      projectEn: 'Project',
      client: 'Client',
      clientEn: 'Client',
    }
  },
  agency: {
    label: 'Agence',
    labelEn: 'Agency',
    icon: 'IconBuilding',
    description: 'Agence web, communication ou marketing',
    descriptionEn: 'Web, communication or marketing agency',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'team', 'contracts'],
    availableModules: ['newsletters', 'monitoring', 'calendar', 'planning', 'growth_audit', 'instagram_planner'],
    terminology: {
      project: 'Projet',
      projectEn: 'Project',
      client: 'Client',
      clientEn: 'Client',
    }
  },
  designer: {
    label: 'Designer / Graphiste',
    labelEn: 'Designer / Graphic Artist',
    icon: 'IconPalette',
    description: 'Designer UI/UX, graphiste ou directeur artistique',
    descriptionEn: 'UI/UX designer, graphic artist or art director',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['portfolio', 'galleries', 'calendar', 'instagram_planner'],
    terminology: {
      project: 'Projet créatif',
      projectEn: 'Creative Project',
      client: 'Client',
      clientEn: 'Client',
    }
  },
  consultant: {
    label: 'Consultant',
    labelEn: 'Consultant',
    icon: 'IconBriefcase',
    description: 'Consultant indépendant, coach business',
    descriptionEn: 'Independent consultant, business coach',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['calendar', 'meeting_notes', 'growth_audit'],
    terminology: {
      project: 'Mission',
      projectEn: 'Mission',
      client: 'Client',
      clientEn: 'Client',
    }
  },
  photographer: {
    label: 'Photographe',
    labelEn: 'Photographer',
    icon: 'IconCamera',
    description: 'Photographe professionnel, vidéaste',
    descriptionEn: 'Professional photographer, videographer',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['galleries', 'calendar', 'delivery', 'booking', 'instagram_planner'],
    terminology: {
      project: 'Shooting',
      projectEn: 'Shooting',
      client: 'Client',
      clientEn: 'Client',
    }
  },
  coach: {
    label: 'Coach / Formateur',
    labelEn: 'Coach / Trainer',
    icon: 'IconSchool',
    description: 'Coach personnel, formateur, professeur',
    descriptionEn: 'Personal coach, trainer, teacher',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['calendar', 'sessions', 'courses', 'certificates', 'subscriptions_management'],
    terminology: {
      project: 'Programme',
      projectEn: 'Program',
      client: 'Coaché',
      clientEn: 'Coachee',
    }
  },
  artisan: {
    label: 'Artisan',
    labelEn: 'Craftsman',
    icon: 'IconHammer',
    description: 'Artisan, entrepreneur du bâtiment',
    descriptionEn: 'Craftsman, construction contractor',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['calendar', 'inventory', 'materials', 'instagram_planner'],
    terminology: {
      project: 'Chantier',
      projectEn: 'Site',
      client: 'Client',
      clientEn: 'Client',
    }
  },
  other: {
    label: 'Autre',
    labelEn: 'Other',
    icon: 'IconDots',
    description: 'Autre type d\'activité',
    descriptionEn: 'Other type of activity',
    defaultModules: ['clients', 'prospects', 'projects', 'invoices', 'emails','inbox', 'smart_follow_up', 'time_tracking', 'quotes', 'contracts'],
    availableModules: ['newsletters', 'monitoring', 'calendar', 'growth_audit'],
    terminology: {
      project: 'Projet',
      projectEn: 'Project',
      client: 'Client',
      clientEn: 'Client',
    }
  }
};

// Configuration de tous les modules disponibles
export const ALL_MODULES: Record<string, ModuleConfig> = {
  // === MODULES CORE (toujours disponibles) ===
  clients: {
    id: 'clients',
    label: 'Clients',
    labelEn: 'Clients',
    icon: 'IconUsers',
    path: '/dashboard/clients',
    core: true,
    description: 'Gestion de vos clients',
    descriptionEn: 'Manage your clients',
  },
  prospects: {
    id: 'prospects',
    label: 'Prospects',
    labelEn: 'Prospects',
    icon: 'IconUserSearch',
    path: '/dashboard/prospects',
    core: true,
    description: 'Pipeline de prospection',
    descriptionEn: 'Prospection pipeline',
  },
  projects: {
    id: 'projects',
    label: 'Projets',
    labelEn: 'Projects',
    icon: 'IconBriefcase',
    path: '/dashboard/projects',
    core: true,
    description: 'Gestion de projets avec tâches',
    descriptionEn: 'Project management with tasks',
  },
  invoices: {
    id: 'invoices',
    label: 'Facturation',
    labelEn: 'Invoicing',
    icon: 'IconFileInvoice',
    path: '/dashboard/factures',
    core: true,
    description: 'Création et suivi des factures',
    descriptionEn: 'Create and track invoices',
  },
  emails: {
    id: 'emails',
    label: 'Emails',
    labelEn: 'Emails',
    icon: 'IconMail',
    path: '/dashboard/emails',
    core: true,
    description: 'Envoi d\'emails professionnels',
    descriptionEn: 'Send professional emails',
  },
  inbox: {
    id: 'inbox',
    label: 'Boîte de réception',
    labelEn: 'Inbox',
    icon: 'IconInbox',
    path: '/dashboard/emails/inbox',
    core: true,
    description: 'Gestion de votre boîte de réception',
    descriptionEn: 'Manage your inbox',
  },
  smart_follow_up: {
    id: 'smart_follow_up',
    label: 'Smart Follow-Up',
    labelEn: 'Smart Follow-Up',
    icon: 'IconTargetArrow',
    path: '/dashboard/smart-follow-up',
    core: true,
    description: 'Automatisation intelligente des relances clients',
    descriptionEn: 'Intelligent customer follow-up automation',
  },
  // === MODULES OPTIONNELS ===
  newsletters: {
    id: 'newsletters',
    label: 'Newsletters',
    labelEn: 'Newsletters',
    icon: 'IconNews',
    path: '/dashboard/newsletters',
    core: false,
    description: 'Création et envoi de newsletters',
    descriptionEn: 'Create and send newsletters',
  },
  monitoring: {
    id: 'monitoring',
    label: 'Monitoring',
    labelEn: 'Monitoring',
    icon: 'IconServer',
    path: '/dashboard/monitoring',
    core: false,
    description: 'Surveillance de vos sites web',
    descriptionEn: 'Monitor your websites',
  },
  time_tracking: {
    id: 'time_tracking',
    label: 'Suivi du temps',
    labelEn: 'Time Tracking',
    icon: 'IconClock',
    path: '/dashboard/time-tracking',
    core: false,
    description: 'Chronométrage par projet/tâche',
    descriptionEn: 'Track time per project/task',
  },
  quotes: {
    id: 'quotes',
    label: 'Devis',
    labelEn: 'Quotes',
    icon: 'IconFileDescription',
    path: '/dashboard/devis',
    core: false,
    description: 'Création de devis convertibles en factures',
    descriptionEn: 'Create quotes convertible to invoices',
  },
  contracts: {
    id: 'contracts',
    label: 'Contrats',
    labelEn: 'Contracts',
    icon: 'IconFileText',
    path: '/dashboard/contracts',
    core: true, // Toujours visible car essentiel pour les freelances
    description: 'Gestion des contrats et CGV',
    descriptionEn: 'Manage contracts and terms',
  },
  calendar: {
    id: 'calendar',
    label: 'Calendrier',
    labelEn: 'Calendar',
    icon: 'IconCalendar',
    path: '/dashboard/calendar',
    core: false,
    description: 'Planning et rendez-vous',
    descriptionEn: 'Planning and appointments',
  },
  team: {
    id: 'team',
    label: 'Équipe',
    labelEn: 'Team',
    icon: 'IconUsersGroup',
    path: '/dashboard/team',
    core: false,
    description: 'Gestion d\'équipe et collaborateurs',
    descriptionEn: 'Team and collaborators management',
  },
  galleries: {
    id: 'galleries',
    label: 'Galeries',
    labelEn: 'Galleries',
    icon: 'IconPhoto',
    path: '/dashboard/galleries',
    core: false,
    description: 'Galeries photos pour clients',
    descriptionEn: 'Photo galleries for clients',
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio',
    labelEn: 'Portfolio',
    icon: 'IconPalette',
    path: '/dashboard/portfolio',
    core: false,
    description: 'Showcase de vos réalisations',
    descriptionEn: 'Showcase your work',
  },
  mentors: {
    id: 'mentors',
    label: 'Mentors',
    labelEn: 'Mentors',
    icon: 'IconSchool',
    path: '/dashboard/mentors',
    core: false,
    description: 'Gestion des mentors',
    descriptionEn: 'Manage mentors',
  },
  growth_audit: {
    id: 'growth_audit',
    label: 'Growth Audit',
    labelEn: 'Growth Audit',
    icon: 'IconTargetArrow',
    path: '/dashboard/growth-audit',
    core: false,
    description: 'Audit SEO et structure de pages',
    descriptionEn: 'SEO and page structure audit',
  },
  instagram_planner: {
    id: 'instagram_planner',
    label: 'Instagram Planner',
    labelEn: 'Instagram Planner',
    icon: 'IconBrandInstagram',
    path: '/dashboard/instagram',
    core: false,
    description: 'Planification et prévisualisation de posts Instagram',
    descriptionEn: 'Plan and preview Instagram posts',
  },
};

// Obtenir les modules par défaut pour un type de business
export function getDefaultModules(businessType: BusinessType): string[] {
  return BUSINESS_CONFIGS[businessType]?.defaultModules || BUSINESS_CONFIGS.other.defaultModules;
}

// Obtenir tous les modules disponibles pour un type de business
export function getAvailableModules(businessType: BusinessType): string[] {
  const config = BUSINESS_CONFIGS[businessType] || BUSINESS_CONFIGS.other;
  return [...config.defaultModules, ...config.availableModules];
}

// Vérifier si un module est core
export function isCoreModule(moduleId: string): boolean {
  return ALL_MODULES[moduleId]?.core ?? false;
}

// Obtenir la configuration d'un module
export function getModuleConfig(moduleId: string): ModuleConfig | undefined {
  return ALL_MODULES[moduleId];
}

// Obtenir la terminologie pour un business type
export function getTerminology(businessType: BusinessType, lang: 'fr' | 'en' = 'fr') {
  const config = BUSINESS_CONFIGS[businessType] || BUSINESS_CONFIGS.other;
  if (lang === 'en') {
    return {
      project: config.terminology.projectEn || 'Project',
      client: config.terminology.clientEn || 'Client',
      invoice: config.terminology.invoiceEn || 'Invoice',
    };
  }
  return {
    project: config.terminology.project || 'Projet',
    client: config.terminology.client || 'Client',
    invoice: config.terminology.invoice || 'Facture',
  };
}

