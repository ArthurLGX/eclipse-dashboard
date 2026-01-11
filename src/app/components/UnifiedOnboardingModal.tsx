'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSparkles,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconRocket,
  IconCode,
  IconBuilding,
  IconPalette,
  IconBriefcase,
  IconCamera,
  IconSchool,
  IconHammer,
  IconDots,
  IconTargetArrow,
  IconRefresh,
  IconShoppingCart,
  IconTool,
  IconChartBar,
  IconClock,
  IconCurrencyEuro,
  IconUser,
  IconTemplate,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalFocus } from '@/hooks/useModalFocus';
import { useUserPreferences } from '@/app/context/UserPreferencesContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { BusinessType, getDefaultModules, BUSINESS_CONFIGS } from '@/config/business-modules';
import { initializeUserPreferences, addClientUser, createProject, createProjectTask } from '@/lib/api';
import { useRouter } from 'next/navigation';

// Types
type OnboardingStep = 'business' | 'objective' | 'project' | 'success';

interface BusinessObjective {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  templateId: string;
}

interface TemplateTask {
  title: string;
  description?: string;
  estimated_hours?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phase: string;
  order: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  estimated_duration_days: number;
  tasks: TemplateTask[];
}

// Business type icons
const BUSINESS_ICONS: Record<BusinessType, React.ReactNode> = {
  web_developer: <IconCode className="w-7 h-7" />,
  agency: <IconBuilding className="w-7 h-7" />,
  designer: <IconPalette className="w-7 h-7" />,
  consultant: <IconBriefcase className="w-7 h-7" />,
  photographer: <IconCamera className="w-7 h-7" />,
  coach: <IconSchool className="w-7 h-7" />,
  artisan: <IconHammer className="w-7 h-7" />,
  other: <IconDots className="w-7 h-7" />,
};

// Business objectives by type
const BUSINESS_OBJECTIVES: Record<BusinessType, BusinessObjective[]> = {
  web_developer: [
    {
      id: 'redesign',
      icon: <IconRefresh className="w-6 h-6" />,
      label: 'Refonte de site',
      labelEn: 'Website Redesign',
      description: 'Moderniser un site existant',
      descriptionEn: 'Modernize an existing site',
      templateId: 'redesign',
    },
    {
      id: 'vitrine',
      icon: <IconTargetArrow className="w-6 h-6" />,
      label: 'Site vitrine',
      labelEn: 'Showcase Website',
      description: 'Créer un site professionnel',
      descriptionEn: 'Create a professional website',
      templateId: 'vitrine',
    },
    {
      id: 'ecommerce',
      icon: <IconShoppingCart className="w-6 h-6" />,
      label: 'E-commerce',
      labelEn: 'E-commerce',
      description: 'Boutique en ligne complète',
      descriptionEn: 'Complete online store',
      templateId: 'ecommerce',
    },
    {
      id: 'maintenance',
      icon: <IconTool className="w-6 h-6" />,
      label: 'Maintenance',
      labelEn: 'Maintenance',
      description: 'Suivi technique récurrent',
      descriptionEn: 'Recurring technical support',
      templateId: 'maintenance',
    },
    {
      id: 'seo_audit',
      icon: <IconChartBar className="w-6 h-6" />,
      label: 'Audit SEO',
      labelEn: 'SEO Audit',
      description: 'Analyse et optimisation',
      descriptionEn: 'Analysis and optimization',
      templateId: 'seo_audit',
    },
  ],
  agency: [
    {
      id: 'redesign',
      icon: <IconRefresh className="w-6 h-6" />,
      label: 'Refonte de site',
      labelEn: 'Website Redesign',
      description: 'Moderniser un site client',
      descriptionEn: 'Modernize a client site',
      templateId: 'redesign',
    },
    {
      id: 'vitrine',
      icon: <IconTargetArrow className="w-6 h-6" />,
      label: 'Site vitrine',
      labelEn: 'Showcase Website',
      description: 'Nouveau site professionnel',
      descriptionEn: 'New professional website',
      templateId: 'vitrine',
    },
    {
      id: 'ecommerce',
      icon: <IconShoppingCart className="w-6 h-6" />,
      label: 'E-commerce',
      labelEn: 'E-commerce',
      description: 'Boutique en ligne',
      descriptionEn: 'Online store',
      templateId: 'ecommerce',
    },
  ],
  designer: [
    {
      id: 'branding',
      icon: <IconPalette className="w-6 h-6" />,
      label: 'Identité visuelle',
      labelEn: 'Visual Identity',
      description: 'Logo et charte graphique',
      descriptionEn: 'Logo and brand guidelines',
      templateId: 'branding',
    },
    {
      id: 'ui_design',
      icon: <IconTargetArrow className="w-6 h-6" />,
      label: 'UI/UX Design',
      labelEn: 'UI/UX Design',
      description: 'Interface utilisateur',
      descriptionEn: 'User interface',
      templateId: 'ui_design',
    },
  ],
  consultant: [
    {
      id: 'audit',
      icon: <IconChartBar className="w-6 h-6" />,
      label: 'Mission d\'audit',
      labelEn: 'Audit Mission',
      description: 'Analyse et recommandations',
      descriptionEn: 'Analysis and recommendations',
      templateId: 'audit',
    },
    {
      id: 'accompagnement',
      icon: <IconBriefcase className="w-6 h-6" />,
      label: 'Accompagnement',
      labelEn: 'Coaching',
      description: 'Mission de conseil',
      descriptionEn: 'Consulting mission',
      templateId: 'accompagnement',
    },
  ],
  photographer: [
    {
      id: 'shooting',
      icon: <IconCamera className="w-6 h-6" />,
      label: 'Shooting photo',
      labelEn: 'Photo Shoot',
      description: 'Session photo complète',
      descriptionEn: 'Complete photo session',
      templateId: 'shooting',
    },
  ],
  coach: [
    {
      id: 'programme',
      icon: <IconSchool className="w-6 h-6" />,
      label: 'Programme coaching',
      labelEn: 'Coaching Program',
      description: 'Accompagnement personnalisé',
      descriptionEn: 'Personalized support',
      templateId: 'programme',
    },
  ],
  artisan: [
    {
      id: 'chantier',
      icon: <IconHammer className="w-6 h-6" />,
      label: 'Nouveau chantier',
      labelEn: 'New Project',
      description: 'Travaux complets',
      descriptionEn: 'Complete work',
      templateId: 'chantier',
    },
  ],
  other: [
    {
      id: 'projet',
      icon: <IconBriefcase className="w-6 h-6" />,
      label: 'Nouveau projet',
      labelEn: 'New Project',
      description: 'Projet personnalisé',
      descriptionEn: 'Custom project',
      templateId: 'projet',
    },
  ],
};

// Project templates with tasks
const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  redesign: {
    id: 'redesign',
    name: 'Refonte de site',
    nameEn: 'Website Redesign',
    description: 'Template complet pour la refonte d\'un site existant',
    descriptionEn: 'Complete template for redesigning an existing website',
    estimated_duration_days: 28,
    tasks: [
      { title: 'Audit site existant', description: 'Analyse UX, technique, SEO du site actuel', estimated_hours: 4, priority: 'high', phase: 'Audit', order: 1 },
      { title: 'Analyse trafic et comportement', description: 'Étude Analytics, heatmaps, user flow', estimated_hours: 3, priority: 'high', phase: 'Audit', order: 2 },
      { title: 'Recommandations et plan d\'action', description: 'Document de préconisations', estimated_hours: 4, priority: 'high', phase: 'Audit', order: 3 },
      { title: 'Maquette page d\'accueil', description: 'Design Figma de la homepage', estimated_hours: 8, priority: 'high', phase: 'Design', order: 4 },
      { title: 'Maquettes pages secondaires', description: 'Design des autres pages', estimated_hours: 6, priority: 'medium', phase: 'Design', order: 5 },
      { title: 'Validation maquettes', description: 'Revue client et ajustements', estimated_hours: 2, priority: 'high', phase: 'Design', order: 6 },
      { title: 'Migration contenu', description: 'Export/import du contenu existant', estimated_hours: 6, priority: 'medium', phase: 'Développement', order: 7 },
      { title: 'Développement nouveau site', description: 'Intégration complète', estimated_hours: 24, priority: 'high', phase: 'Développement', order: 8 },
      { title: 'Redirections 301', description: 'Mapping anciennes vers nouvelles URLs', estimated_hours: 3, priority: 'high', phase: 'SEO', order: 9 },
      { title: 'Tests de non-régression', description: 'Vérification fonctionnelle', estimated_hours: 4, priority: 'high', phase: 'Tests', order: 10 },
      { title: 'Bascule production', description: 'Mise en ligne du nouveau site', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 11 },
    ],
  },
  vitrine: {
    id: 'vitrine',
    name: 'Site Vitrine',
    nameEn: 'Showcase Website',
    description: 'Template pour un site vitrine professionnel',
    descriptionEn: 'Template for a professional showcase website',
    estimated_duration_days: 21,
    tasks: [
      { title: 'Brief créatif', description: 'Analyse des besoins et direction artistique', estimated_hours: 4, priority: 'high', phase: 'Maquettage', order: 1 },
      { title: 'Maquette page d\'accueil', description: 'Design Figma de la homepage', estimated_hours: 8, priority: 'high', phase: 'Maquettage', order: 2 },
      { title: 'Maquettes pages secondaires', description: 'À propos, Services, Contact', estimated_hours: 6, priority: 'medium', phase: 'Maquettage', order: 3 },
      { title: 'Design responsive', description: 'Adaptation mobile/tablet', estimated_hours: 4, priority: 'medium', phase: 'Maquettage', order: 4 },
      { title: 'Setup projet', description: 'Installation et configuration', estimated_hours: 2, priority: 'high', phase: 'Développement', order: 5 },
      { title: 'Intégration header/footer', description: 'Navigation globale', estimated_hours: 3, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Intégration pages', description: 'Développement complet', estimated_hours: 14, priority: 'high', phase: 'Développement', order: 7 },
      { title: 'Formulaire de contact', description: 'Avec validation et envoi email', estimated_hours: 3, priority: 'medium', phase: 'Développement', order: 8 },
      { title: 'Optimisation SEO', description: 'Meta tags, sitemap, structured data', estimated_hours: 3, priority: 'high', phase: 'SEO', order: 9 },
      { title: 'Tests et recette', description: 'Cross-browser et responsive', estimated_hours: 4, priority: 'high', phase: 'Livraison', order: 10 },
      { title: 'Mise en production', description: 'Déploiement et configuration DNS', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 11 },
    ],
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce',
    nameEn: 'E-commerce',
    description: 'Template pour une boutique en ligne',
    descriptionEn: 'Template for an online store',
    estimated_duration_days: 45,
    tasks: [
      { title: 'Analyse catalogue produits', description: 'Structure catégories et attributs', estimated_hours: 4, priority: 'high', phase: 'Stratégie', order: 1 },
      { title: 'Choix CMS e-commerce', description: 'Setup Shopify/WooCommerce/Medusa', estimated_hours: 4, priority: 'high', phase: 'Stratégie', order: 2 },
      { title: 'Maquette homepage', estimated_hours: 8, priority: 'high', phase: 'Design', order: 3 },
      { title: 'Maquette fiche produit', estimated_hours: 6, priority: 'high', phase: 'Design', order: 4 },
      { title: 'Maquette panier/checkout', estimated_hours: 6, priority: 'high', phase: 'Design', order: 5 },
      { title: 'Intégration catalogue', estimated_hours: 12, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Système de panier', estimated_hours: 8, priority: 'high', phase: 'Développement', order: 7 },
      { title: 'Intégration paiement', description: 'Stripe/PayPal', estimated_hours: 6, priority: 'high', phase: 'Développement', order: 8 },
      { title: 'Import produits', estimated_hours: 4, priority: 'high', phase: 'Livraison', order: 9 },
      { title: 'Tests de paiement', estimated_hours: 3, priority: 'high', phase: 'Livraison', order: 10 },
      { title: 'Formation back-office', estimated_hours: 4, priority: 'high', phase: 'Livraison', order: 11 },
    ],
  },
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance mensuelle',
    nameEn: 'Monthly Maintenance',
    description: 'Template pour suivi maintenance récurrent',
    descriptionEn: 'Template for recurring maintenance',
    estimated_duration_days: 30,
    tasks: [
      { title: 'Mises à jour sécurité', description: 'CMS, plugins, dépendances', estimated_hours: 2, priority: 'high', phase: 'Maintenance', order: 1 },
      { title: 'Sauvegarde complète', description: 'Base de données et fichiers', estimated_hours: 1, priority: 'high', phase: 'Maintenance', order: 2 },
      { title: 'Monitoring performance', description: 'Analyse Core Web Vitals', estimated_hours: 1, priority: 'medium', phase: 'Monitoring', order: 3 },
      { title: 'Rapport mensuel', description: 'Synthèse des actions et stats', estimated_hours: 1, priority: 'medium', phase: 'Reporting', order: 4 },
    ],
  },
  seo_audit: {
    id: 'seo_audit',
    name: 'Audit SEO',
    nameEn: 'SEO Audit',
    description: 'Template pour audit technique complet',
    descriptionEn: 'Template for complete technical audit',
    estimated_duration_days: 7,
    tasks: [
      { title: 'Crawl technique', description: 'Screaming Frog, analyse structure', estimated_hours: 2, priority: 'high', phase: 'Audit', order: 1 },
      { title: 'Audit Core Web Vitals', description: 'LCP, FID, CLS', estimated_hours: 2, priority: 'high', phase: 'Audit', order: 2 },
      { title: 'Analyse SEO on-page', description: 'Titles, metas, H1, contenu', estimated_hours: 3, priority: 'high', phase: 'Audit', order: 3 },
      { title: 'Analyse backlinks', description: 'Qualité des liens', estimated_hours: 2, priority: 'medium', phase: 'Audit', order: 4 },
      { title: 'Rapport d\'audit', description: 'Document avec recommandations', estimated_hours: 4, priority: 'high', phase: 'Livrable', order: 5 },
      { title: 'Plan d\'action', description: 'Roadmap d\'optimisations', estimated_hours: 2, priority: 'high', phase: 'Livrable', order: 6 },
    ],
  },
  // Generic templates for other business types
  branding: {
    id: 'branding',
    name: 'Identité visuelle',
    nameEn: 'Visual Identity',
    description: 'Template pour création d\'identité',
    descriptionEn: 'Template for identity creation',
    estimated_duration_days: 14,
    tasks: [
      { title: 'Brief créatif', estimated_hours: 3, priority: 'high', phase: 'Découverte', order: 1 },
      { title: 'Recherche et moodboard', estimated_hours: 4, priority: 'high', phase: 'Découverte', order: 2 },
      { title: 'Propositions logo', estimated_hours: 8, priority: 'high', phase: 'Création', order: 3 },
      { title: 'Déclinaisons', estimated_hours: 4, priority: 'medium', phase: 'Création', order: 4 },
      { title: 'Charte graphique', estimated_hours: 6, priority: 'high', phase: 'Livrable', order: 5 },
    ],
  },
  ui_design: {
    id: 'ui_design',
    name: 'UI/UX Design',
    nameEn: 'UI/UX Design',
    description: 'Template pour design d\'interface',
    descriptionEn: 'Template for interface design',
    estimated_duration_days: 21,
    tasks: [
      { title: 'Analyse UX', estimated_hours: 4, priority: 'high', phase: 'Research', order: 1 },
      { title: 'Wireframes', estimated_hours: 6, priority: 'high', phase: 'UX', order: 2 },
      { title: 'Design UI', estimated_hours: 12, priority: 'high', phase: 'UI', order: 3 },
      { title: 'Prototype interactif', estimated_hours: 4, priority: 'medium', phase: 'Prototype', order: 4 },
      { title: 'Handoff développement', estimated_hours: 3, priority: 'high', phase: 'Livrable', order: 5 },
    ],
  },
  audit: {
    id: 'audit',
    name: 'Mission d\'audit',
    nameEn: 'Audit Mission',
    description: 'Template pour mission de conseil',
    descriptionEn: 'Template for consulting mission',
    estimated_duration_days: 14,
    tasks: [
      { title: 'Cadrage mission', estimated_hours: 2, priority: 'high', phase: 'Cadrage', order: 1 },
      { title: 'Collecte d\'informations', estimated_hours: 4, priority: 'high', phase: 'Analyse', order: 2 },
      { title: 'Analyse et diagnostic', estimated_hours: 8, priority: 'high', phase: 'Analyse', order: 3 },
      { title: 'Rapport de recommandations', estimated_hours: 6, priority: 'high', phase: 'Livrable', order: 4 },
      { title: 'Présentation client', estimated_hours: 2, priority: 'high', phase: 'Livrable', order: 5 },
    ],
  },
  accompagnement: {
    id: 'accompagnement',
    name: 'Accompagnement',
    nameEn: 'Coaching',
    description: 'Template pour mission de conseil',
    descriptionEn: 'Template for coaching mission',
    estimated_duration_days: 90,
    tasks: [
      { title: 'Diagnostic initial', estimated_hours: 4, priority: 'high', phase: 'Cadrage', order: 1 },
      { title: 'Définition des objectifs', estimated_hours: 2, priority: 'high', phase: 'Cadrage', order: 2 },
      { title: 'Sessions de travail (x4)', estimated_hours: 8, priority: 'high', phase: 'Accompagnement', order: 3 },
      { title: 'Suivi et ajustements', estimated_hours: 4, priority: 'medium', phase: 'Accompagnement', order: 4 },
      { title: 'Bilan et recommandations', estimated_hours: 2, priority: 'high', phase: 'Clôture', order: 5 },
    ],
  },
  shooting: {
    id: 'shooting',
    name: 'Shooting photo',
    nameEn: 'Photo Shoot',
    description: 'Template pour session photo',
    descriptionEn: 'Template for photo session',
    estimated_duration_days: 7,
    tasks: [
      { title: 'Brief et préparation', estimated_hours: 2, priority: 'high', phase: 'Préparation', order: 1 },
      { title: 'Shooting', estimated_hours: 4, priority: 'high', phase: 'Production', order: 2 },
      { title: 'Sélection photos', estimated_hours: 2, priority: 'high', phase: 'Post-production', order: 3 },
      { title: 'Retouches', estimated_hours: 6, priority: 'high', phase: 'Post-production', order: 4 },
      { title: 'Livraison', estimated_hours: 1, priority: 'high', phase: 'Livraison', order: 5 },
    ],
  },
  programme: {
    id: 'programme',
    name: 'Programme coaching',
    nameEn: 'Coaching Program',
    description: 'Template pour programme de coaching',
    descriptionEn: 'Template for coaching program',
    estimated_duration_days: 90,
    tasks: [
      { title: 'Évaluation initiale', estimated_hours: 2, priority: 'high', phase: 'Démarrage', order: 1 },
      { title: 'Définition des objectifs', estimated_hours: 1, priority: 'high', phase: 'Démarrage', order: 2 },
      { title: 'Sessions de coaching (x8)', estimated_hours: 16, priority: 'high', phase: 'Programme', order: 3 },
      { title: 'Suivi inter-sessions', estimated_hours: 4, priority: 'medium', phase: 'Programme', order: 4 },
      { title: 'Bilan final', estimated_hours: 2, priority: 'high', phase: 'Clôture', order: 5 },
    ],
  },
  chantier: {
    id: 'chantier',
    name: 'Chantier',
    nameEn: 'Project',
    description: 'Template pour travaux',
    descriptionEn: 'Template for construction work',
    estimated_duration_days: 30,
    tasks: [
      { title: 'Visite technique', estimated_hours: 2, priority: 'high', phase: 'Préparation', order: 1 },
      { title: 'Devis détaillé', estimated_hours: 3, priority: 'high', phase: 'Préparation', order: 2 },
      { title: 'Commande matériaux', estimated_hours: 2, priority: 'high', phase: 'Préparation', order: 3 },
      { title: 'Travaux', estimated_hours: 40, priority: 'high', phase: 'Réalisation', order: 4 },
      { title: 'Finitions', estimated_hours: 8, priority: 'high', phase: 'Réalisation', order: 5 },
      { title: 'Réception chantier', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 6 },
    ],
  },
  projet: {
    id: 'projet',
    name: 'Projet personnalisé',
    nameEn: 'Custom Project',
    description: 'Template générique',
    descriptionEn: 'Generic template',
    estimated_duration_days: 21,
    tasks: [
      { title: 'Cadrage du projet', estimated_hours: 2, priority: 'high', phase: 'Démarrage', order: 1 },
      { title: 'Planification', estimated_hours: 2, priority: 'high', phase: 'Démarrage', order: 2 },
      { title: 'Réalisation', estimated_hours: 20, priority: 'high', phase: 'Production', order: 3 },
      { title: 'Tests et validation', estimated_hours: 4, priority: 'high', phase: 'Validation', order: 4 },
      { title: 'Livraison', estimated_hours: 2, priority: 'high', phase: 'Clôture', order: 5 },
    ],
  },
};

// Helper to calculate totals
function calculateTemplateTotals(template: ProjectTemplate) {
  const totalHours = template.tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const phases = [...new Set(template.tasks.map(t => t.phase))];
  return { totalHours, phases, taskCount: template.tasks.length };
}

export default function UnifiedOnboardingModal() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { preferences, loading, refreshPreferences } = useUserPreferences();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useModalFocus(isOpen);
  const [step, setStep] = useState<OnboardingStep>('business');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<BusinessObjective | null>(null);
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [hourlyRate, setHourlyRate] = useState(50);

  // Created entities for success screen
  const [createdClient, setCreatedClient] = useState<{ id: number; documentId: string; name: string } | null>(null);
  const [createdProject, setCreatedProject] = useState<{ id: number; documentId: string; title: string } | null>(null);
  const [createdTasksCount, setCreatedTasksCount] = useState(0);

  // Show modal if preferences don't exist or onboarding not completed
  useEffect(() => {
    if (!loading && user?.id) {
      if (!preferences || !preferences.onboarding_completed) {
        setIsOpen(true);
      }
    }
  }, [loading, preferences, user?.id]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Get objectives for selected business type
  const objectives = useMemo(() => {
    if (!selectedBusinessType) return [];
    return BUSINESS_OBJECTIVES[selectedBusinessType] || BUSINESS_OBJECTIVES.other;
  }, [selectedBusinessType]);

  // Get template for selected objective
  const selectedTemplate = useMemo(() => {
    if (!selectedObjective) return null;
    return PROJECT_TEMPLATES[selectedObjective.templateId] || PROJECT_TEMPLATES.projet;
  }, [selectedObjective]);

  // Calculate template stats
  const templateStats = useMemo(() => {
    if (!selectedTemplate) return null;
    return calculateTemplateTotals(selectedTemplate);
  }, [selectedTemplate]);

  // Estimated value
  const estimatedValue = useMemo(() => {
    if (!templateStats) return 0;
    return templateStats.totalHours * hourlyRate;
  }, [templateStats, hourlyRate]);

  // Business type label
  const getBusinessLabel = (type: BusinessType) => {
    return language === 'en' 
      ? BUSINESS_CONFIGS[type].labelEn 
      : BUSINESS_CONFIGS[type].label;
  };

  // Handle business type selection
  const handleSelectBusinessType = (type: BusinessType) => {
    setSelectedBusinessType(type);
    setSelectedObjective(null); // Reset objective when changing type
  };

  // Navigation
  const handleNext = () => {
    if (step === 'business' && selectedBusinessType) {
      setStep('objective');
    } else if (step === 'objective' && selectedObjective) {
      // Pre-fill project name based on objective
      const objLabel = language === 'en' ? selectedObjective.labelEn : selectedObjective.label;
      setProjectName(`${objLabel} - ${clientName || 'Nouveau client'}`);
      setStep('project');
    } else if (step === 'project') {
      handleCreateProject();
    }
  };

  const handleBack = () => {
    if (step === 'objective') setStep('business');
    else if (step === 'project') setStep('objective');
  };

  // Create client, project, and tasks
  const handleCreateProject = async () => {
    if (!user?.id || !selectedBusinessType || !selectedObjective || !selectedTemplate) return;

    setIsSaving(true);
    try {
      // 1. Save user preferences
      await initializeUserPreferences(user.id, selectedBusinessType, getDefaultModules(selectedBusinessType));

      // 2. Create client
      const clientData = {
        name: clientName || 'Mon premier client',
        email: '',
        number: '',
        enterprise: '',
        adress: '',
        website: '',
        processStatus: 'en_cours',
        isActive: true,
      };
      const clientResponse = await addClientUser(user.id, clientData, { skipDuplicateCheck: true }) as { data: { id: number; documentId: string; name: string } };
      const client = clientResponse.data;
      setCreatedClient({ id: client.id, documentId: client.documentId, name: client.name });

      // 3. Create project
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + selectedTemplate.estimated_duration_days);

      const projectData = {
        title: projectName || `${language === 'en' ? selectedObjective.labelEn : selectedObjective.label} - ${clientName || 'Client'}`,
        description: language === 'en' ? selectedTemplate.descriptionEn : selectedTemplate.description,
        project_status: 'planning',
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        type: selectedObjective.templateId,
        client: client.id,
        user: user.id,
      };
      const projectResponse = await createProject(projectData, true) as { data: { id: number; documentId: string; title: string } };
      const project = projectResponse.data;
      setCreatedProject({ id: project.id, documentId: project.documentId, title: project.title });

      // 4. Create tasks from template
      const taskPromises = selectedTemplate.tasks.map((task, index) =>
        createProjectTask({
          project: project.documentId,
          title: task.title,
          description: task.description || '',
          task_status: 'todo',
          priority: task.priority,
          estimated_hours: task.estimated_hours || null,
          order: task.order || index,
          created_user: user.id,
          tags: [task.phase],
        })
      );
      await Promise.all(taskPromises);
      setCreatedTasksCount(selectedTemplate.tasks.length);

      // 5. Refresh preferences
      await refreshPreferences();

      // 6. Go to success step
      setStep('success');
    } catch (error) {
      console.error('Error during onboarding:', error);
      showGlobalPopup(t('onboarding_error') || 'Erreur lors de la configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Skip onboarding
  const handleSkip = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await initializeUserPreferences(user.id, 'other', getDefaultModules('other'));
      await refreshPreferences();
      setIsOpen(false);
    } catch (error) {
      console.error('Error skipping setup:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Go to project
  const handleGoToProject = () => {
    setIsOpen(false);
    if (createdProject) {
      router.push(`/dashboard/projects/${createdProject.documentId}`);
    } else {
      router.push('/dashboard/projects');
    }
  };

  // Explore dashboard
  const handleExploreDashboard = () => {
    setIsOpen(false);
    router.push('/dashboard');
  };

  if (!isOpen) return null;

  // Progress calculation
  const stepIndex = ['business', 'objective', 'project', 'success'].indexOf(step);
  const progress = ((stepIndex + 1) / 4) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-card border border-default rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto outline-none"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-accent via-accent-lightto-transparent">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-accent rounded-xl">
                <IconSparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary">
                  {step === 'success' 
                    ? (t('onboarding_success_title') || '🎉 Votre espace est prêt !')
                    : (t('unified_onboarding_title') || 'Bienvenue sur Eclipse !')
                  }
                </h2>
                <p className="text-muted">
                  {step === 'success'
                    ? (t('onboarding_success_subtitle') || 'Votre premier projet est configuré')
                    : (t('unified_onboarding_subtitle') || 'Créons votre premier projet ensemble')
                  }
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {step !== 'success' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {['business', 'objective', 'project'].map((s, i) => (
                      <div 
                        key={s}
                        className={`flex items-center gap-2 ${
                          stepIndex > i ? 'text-success' : 
                          stepIndex === i ? 'text-accent' : 'text-muted'
                        }`}
                      >
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                          ${stepIndex > i ? 'bg-success text-white' : 
                            stepIndex === i ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}
                        `}>
                          {stepIndex > i ? <IconCheck className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className="hidden sm:inline">
                          {i === 0 ? (t('step_business') || 'Métier') :
                           i === 1 ? (t('step_objective') || 'Objectif') :
                           (t('step_project') || 'Projet')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-muted">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Business Type */}
              {step === 'business' && (
                <motion.div
                  key="business"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-primary">
                      {t('what_is_your_business') || 'Quel est votre métier ?'}
                    </h3>
                    <p className="text-muted mt-2">
                      {t('business_type_desc') || 'Nous adapterons votre expérience en conséquence'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Object.keys(BUSINESS_CONFIGS) as BusinessType[]).map((type, index) => {
                      const isSelected = selectedBusinessType === type;
                      return (
                        <motion.button
                          key={type}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSelectBusinessType(type)}
                          className={`
                            relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer
                            ${isSelected 
                              ? 'border-accent bg-accent-light text-accent shadow-lg' 
                              : 'border-default bg-card hover:border-accent hover:bg-accent-light'
                            }
                          `}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                            >
                              <IconCheck className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                          <div className={`
                            p-3 rounded-xl transition-colors
                            ${isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}
                          `}>
                            {BUSINESS_ICONS[type]}
                          </div>
                          <span className={`font-medium text-center text-sm ${isSelected ? 'text-accent' : 'text-primary'}`}>
                            {getBusinessLabel(type)}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Objective */}
              {step === 'objective' && (
                <motion.div
                  key="objective"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-primary">
                      {t('what_is_your_objective') || 'Quel est votre objectif ?'}
                    </h3>
                    <p className="text-muted mt-2">
                      {t('objective_desc') || 'Nous créerons un projet adapté avec des tâches pré-définies'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {objectives.map((objective, index) => {
                      const isSelected = selectedObjective?.id === objective.id;
                      const template = PROJECT_TEMPLATES[objective.templateId];
                      const stats = template ? calculateTemplateTotals(template) : null;

                      return (
                        <motion.button
                          key={objective.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => setSelectedObjective(objective)}
                          className={`
                            relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer text-left
                            ${isSelected 
                              ? 'border-accent bg-accent-light text-accent shadow-lg' 
                              : 'border-default bg-card hover:border-accent hover:bg-accent-light'
                            }
                          `}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 right-3 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                            >
                              <IconCheck className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                          <div className={`
                            p-3 rounded-xl transition-colors
                            ${isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}
                          `}>
                            {objective.icon}
                          </div>
                          <div>
                            <h4 className={`font-semibold ${isSelected ? 'text-accent' : 'text-primary'}`}>
                              {language === 'en' ? objective.labelEn : objective.label}
                            </h4>
                            <p className="text-sm text-muted mt-1">
                              {language === 'en' ? objective.descriptionEn : objective.description}
                            </p>
                          </div>
                          {stats && (
                            <div className="flex items-center gap-3 text-xs text-muted mt-2">
                              <span className="flex items-center gap-1">
                                <IconTemplate className="w-3 h-3" />
                                {stats.taskCount} {t('onboarding_tasks') || 'tâches'}
                              </span>
                              <span className="flex items-center gap-1">
                                <IconClock className="w-3 h-3" />
                                {stats.totalHours}h
                              </span>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Project Details */}
              {step === 'project' && selectedTemplate && templateStats && (
                <motion.div
                  key="project"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-primary">
                      {t('create_first_project') || 'Créez votre premier projet'}
                    </h3>
                    <p className="text-muted mt-2">
                      {t('project_details_desc') || 'Quelques informations pour commencer'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Form */}
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          <IconUser className="w-4 h-4 inline mr-2" />
                          {t('client_name') || 'Nom du client'}
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder={t('client_name_placeholder') || 'Ex: Entreprise ABC'}
                          className="w-full px-4 py-3 bg-background border border-default rounded-xl focus:border-accent focus:ring-2 focus:ring-accent-light transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          <IconBriefcase className="w-4 h-4 inline mr-2" />
                          {t('onboarding_project_name') || 'Nom du projet'}
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder={language === 'en' ? selectedTemplate.nameEn : selectedTemplate.name}
                          className="w-full px-4 py-3 bg-background border border-default rounded-xl focus:border-accent focus:ring-2 focus:ring-accent-light transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          <IconCurrencyEuro className="w-4 h-4 inline mr-2" />
                          {t('onboarding_hourly_rate') || 'Taux horaire (€/h)'}
                        </label>
                        <input
                          type="number"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(Number(e.target.value))}
                          min={0}
                          className="w-full px-4 py-3 bg-background border border-default rounded-xl focus:border-accent focus:ring-2 focus:ring-accent-light transition-all"
                        />
                      </div>
                    </div>

                    {/* Right: Template Preview */}
                    <div className="bg-muted-light rounded-xl p-6 space-y-4">
                      <h4 className="font-semibold text-primary flex items-center gap-2">
                        <IconTemplate className="w-5 h-5 text-accent" />
                        {t('onboarding_template_preview') || 'Aperçu du template'}
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-default">
                          <span className="text-muted">{t('onboarding_tasks') || 'Tâches'}</span>
                          <span className="font-medium text-primary">{templateStats.taskCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-default">
                          <span className="text-muted">{t('onboarding_estimated_time') || 'Temps estimé'}</span>
                          <span className="font-medium text-primary">{templateStats.totalHours}h</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-default">
                          <span className="text-muted">{t('onboarding_duration') || 'Durée'}</span>
                          <span className="font-medium text-primary">{selectedTemplate.estimated_duration_days} {t('onboarding_days') || 'jours'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-default">
                          <span className="text-muted">{t('onboarding_phases') || 'Phases'}</span>
                          <span className="font-medium text-primary">{templateStats.phases.length}</span>
                        </div>
                      </div>

                      {/* Estimated Value */}
                        <div className="mt-4 p-4 bg-accent-light border border-accent rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-accent font-medium">
                            {t('onboarding_estimated_value') || 'Valeur estimée'}
                          </span>
                          <span className="text-2xl font-bold text-accent">
                            {estimatedValue.toLocaleString('fr-FR')} €
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          {templateStats.totalHours}h × {hourlyRate}€/h
                        </p>
                      </div>

                      {/* Phases */}
                      <div className="mt-4">
                        <p className="text-sm text-muted mb-2">{t('onboarding_phases') || 'Phases'} :</p>
                        <div className="flex flex-wrap gap-2">
                          {templateStats.phases.map((phase) => (
                            <span 
                              key={phase}
                              className="px-3 py-1 bg-accent-light border border-accent text-accent text-xs rounded-full"
                            >
                              {phase}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-8 py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-24 h-24 mx-auto bg-success rounded-full flex items-center justify-center"
                  >
                    <IconCheck className="w-12 h-12 text-white" />
                  </motion.div>

                  <div>
                    <h3 className="text-2xl font-bold text-primary mb-2">
                      {t('onboarding_complete') || 'Configuration terminée !'}
                    </h3>
                    <p className="text-muted">
                      {t('onboarding_complete_desc') || 'Voici ce que nous avons créé pour vous :'}
                    </p>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-5 bg-success-light text-success border border-success rounded-xl">
                      <IconUser className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="font-semibold text-primary">{createdClient?.name || 'Client'}</p>
                      <p className="text-sm text-muted">{t('client_created') || 'Client créé'}</p>
                    </div>
                    <div className="p-5 bg-accent-light border border-accent rounded-xl">
                      <IconBriefcase className="w-8 h-8 text-accent mx-auto mb-2" />
                      <p className="font-semibold text-primary truncate">{createdProject?.title || 'Projet'}</p>
                      <p className="text-sm text-muted">{t('project_created') || 'Projet créé'}</p>
                    </div>
                    <div className="p-5 bg-info-light border border-info rounded-xl">
                      <IconTemplate className="w-8 h-8 text-info mx-auto mb-2" />
                      <p className="font-semibold text-primary">{createdTasksCount} {t('onboarding_tasks') || 'tâches'}</p>
                      <p className="text-sm text-muted">{t('tasks_created') || 'Tâches créées'}</p>
                    </div>
                  </div>

                  {/* Estimated value highlight */}
                  {templateStats && (
                    <div className="max-w-md mx-auto p-6 bg-accent-light border border-accent rounded-2xl">
                      <p className="text-sm text-accent mb-1">{t('potential_revenue') || 'Chiffre d\'affaires potentiel'}</p>
                      <p className="text-4xl font-bold text-accent">
                        {estimatedValue.toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-sm text-muted mt-2">
                        {templateStats.totalHours}h estimées × {hourlyRate}€/h
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button
                      onClick={handleGoToProject}
                      className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
                    >
                      <IconRocket className="w-5 h-5" />
                      {t('go_to_project') || 'Voir mon projet'}
                    </button>
                    <button
                      onClick={handleExploreDashboard}
                      className="flex items-center gap-2 px-6 py-3 bg-muted text-primary rounded-xl font-medium hover:bg-hover transition-colors"
                    >
                      {t('explore_dashboard') || 'Explorer le dashboard'}
                      <IconArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Navigation buttons */}
          {step !== 'success' && (
            <div className="px-8 pb-8 flex items-center justify-between border-t border-default pt-6">
              <div>
                {step === 'business' ? (
                  <button
                    onClick={handleSkip}
                    disabled={isSaving}
                    className="px-4 py-2 text-muted hover:text-primary transition-colors underline"
                  >
                    {t('skip_onboarding') || 'Configurer plus tard'}
                  </button>
                ) : (
                  <button
                    onClick={handleBack}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-muted hover:text-primary transition-colors"
                  >
                    <IconArrowLeft className="w-4 h-4" />
                    {t('back') || 'Retour'}
                  </button>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={
                  isSaving ||
                  (step === 'business' && !selectedBusinessType) ||
                  (step === 'objective' && !selectedObjective)
                }
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
                  ${(step === 'business' && selectedBusinessType) ||
                    (step === 'objective' && selectedObjective) ||
                    step === 'project'
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('creating') || 'Création...'}
                  </>
                ) : step === 'project' ? (
                  <>
                    <IconRocket className="w-5 h-5" />
                    {t('create_project') || 'Créer mon projet'}
                  </>
                ) : (
                  <>
                    {t('continue') || 'Continuer'}
                    <IconArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

