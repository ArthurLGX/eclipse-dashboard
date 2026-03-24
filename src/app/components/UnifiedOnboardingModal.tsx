'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
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
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalFocus } from '@/hooks/useModalFocus';
import { useUserPreferences } from '@/app/context/UserPreferencesContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { BusinessType, getDefaultModules, BUSINESS_CONFIGS } from '@/config/business-modules';
import { initializeUserPreferences, addClientUser, createProject, createProjectTask, fetchContacts } from '@/lib/api';
import { Client } from '@/types';
import { useRouter } from 'next/navigation';
import { clearCache } from '@/hooks/useApi';

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

  // LocalStorage key for onboarding completion
  const ONBOARDING_COMPLETED_KEY = 'eclipse_unified_onboarding_completed';

  // Check if onboarding was completed (from localStorage or preferences)
  const isOnboardingCompleted = (): boolean => {
    // Check localStorage first (faster, survives refresh during onboarding)
    if (typeof window !== 'undefined') {
      const localCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
      if (localCompleted === 'true') {
        return true;
      }
    }
    // Then check preferences from API
    return preferences?.onboarding_completed === true;
  };

  // Mark onboarding as completed in localStorage
  const markOnboardingCompleted = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    }
  };

  // Show modal if preferences don't exist or onboarding not completed
  useEffect(() => {
    if (!loading && user?.id) {
      if (!isOnboardingCompleted()) {
        setIsOpen(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Pre-fill project name based on objective (format: "Objectif 2026")
      if (!projectName.trim()) {
        const objLabel = language === 'en' ? selectedObjective.labelEn : selectedObjective.label;
        setProjectName(`${objLabel} ${new Date().getFullYear()}`);
      }
      setStep('project');
    } else if (step === 'project') {
      handleCreateProject();
    }
  };

  const handleBack = () => {
    if (step === 'objective') setStep('business');
    else if (step === 'project') setStep('objective');
  };

  const goToStep = (targetIndex: number) => {
    if (targetIndex >= stepIndex) return;
    const steps: OnboardingStep[] = ['business', 'objective', 'project', 'success'];
    setStep(steps[targetIndex]);
  };

  // Create client, project, and tasks
  const handleCreateProject = async () => {
    if (!user?.id || !selectedBusinessType || !selectedObjective || !selectedTemplate) return;

    setIsSaving(true);
    try {
      // 1. Save user preferences
      await initializeUserPreferences(user.id, selectedBusinessType, getDefaultModules(selectedBusinessType));

      // 2. Create or find existing client
      const clientNameToUse = clientName || 'Mon premier client';
      
      // Check if client already exists
      let client: { id: number; documentId: string; name: string } | null = null;
      try {
        const existingContacts = await fetchContacts(user.id) as { data: Client[] };
        const existingClient = existingContacts.data?.find(
          (c: Client) => c.name?.toLowerCase() === clientNameToUse.toLowerCase()
        );
        if (existingClient) {
          client = { id: existingClient.id, documentId: existingClient.documentId, name: existingClient.name };
         }
      } catch {
       }
      
      // Create client if not found
      if (!client) {
        const sanitizedClientName = clientNameToUse.toLowerCase().replace(/[^a-z0-9]/g, '');
        const placeholderEmail = `${sanitizedClientName}@example.com`;
        
        const clientData = {
          name: clientNameToUse,
          email: placeholderEmail,
          number: '',
          enterprise: '',
          adress: '',
          website: '',
          processStatus: 'client',
          pipeline_status: 'qualified', // Client créé via onboarding = qualifié
          isActive: true,
        };
        const clientResponse = await addClientUser(user.id, clientData, { skipDuplicateCheck: true }) as { data: { id: number; documentId: string; name: string } };
        client = clientResponse.data;
       }
      setCreatedClient({ id: client.id, documentId: client.documentId, name: client.name });

      // 3. Create project
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + selectedTemplate.estimated_duration_days);

      // Map template IDs to valid project types
      const templateToProjectType: Record<string, string> = {
        redesign: 'development',
        vitrine: 'development',
        ecommerce: 'development',
        maintenance: 'maintenance',
        branding: 'design',
        ui_ux: 'design',
        strategy: 'development',
        coaching: 'development',
        shooting: 'design',
        video: 'design',
        custom_order: 'development',
      };
      const projectType = templateToProjectType[selectedObjective.templateId] || 'development';

      const projectData = {
        title: projectName || `${language === 'en' ? selectedObjective.labelEn : selectedObjective.label} - ${clientName || 'Client'}`,
        description: language === 'en' ? selectedTemplate.descriptionEn : selectedTemplate.description,
        project_status: 'planning',
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        type: projectType,
        client: client.id,
        user: user.id,
      };
       const projectResponse = await createProject(projectData, true);
       
      // Handle different response formats
      const project = (projectResponse as { data?: { id: number; documentId: string; title: string } }).data 
        ?? (projectResponse as unknown as { id: number; documentId: string; title: string });
      
      if (!project?.documentId) {
        console.error('[Onboarding] Invalid project response - no documentId:', projectResponse);
        throw new Error('Invalid project response');
      }
      
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

      // 6. Mark onboarding as completed in localStorage
      markOnboardingCompleted();

      // 7. Go to success step
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
      markOnboardingCompleted();
      setIsOpen(false);
    } catch (error) {
      console.error('Error skipping setup:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Go to project
  const handleGoToProject = async () => {
    if (createdProject) {
      // Clear cache to ensure the newly created project is fetched
      clearCache('project');
      clearCache('projects');
      // Set flag to trigger guided tour on project page
      localStorage.setItem('eclipse_show_project_tour', 'true');
      // Small delay to ensure cache is cleared
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsOpen(false);
      router.push(`/dashboard/projects/${createdProject.documentId}`);
      // Force refresh to bypass any stale cache
      router.refresh();
    } else {
      setIsOpen(false);
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

  const stepLabels = [
    t('step_business') || 'Métier',
    t('step_objective') || 'Objectif',
    t('step_project') || 'Projet',
    t('onboarding_complete') || 'Terminé',
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-5 overflow-hidden bg-black/55 backdrop-blur-sm"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col outline-none overflow-hidden rounded-[20px] bg-card border border-default shadow-2xl"
        >
          {/* Header — Logo + Skip */}
          <div className="flex items-center justify-between px-5 pt-[18px] shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-lg flex items-center justify-center overflow-hidden bg-[var(--color-primary)] dark:!bg-[var(--bg-input)]"
              >
                <Image src="/images/logo/eclipse-logo.png" alt="" width={18} height={18} className="object-contain invert dark:invert" />
              </div>
              <span className="font-bold text-[14px] tracking-tight !text-primary">
                Eclipse Studio
              </span>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSaving}
              className="font-mono text-[11px] py-1 px-2 rounded-md transition-colors disabled:opacity-50 !text-muted hover:bg-muted"
            >
              {t('skip_onboarding') || 'Configurer plus tard'} →
            </button>
          </div>

          {/* Progress bar — thin */}
          {step !== 'success' && (
            <div className="flex items-center gap-2.5 px-5 pt-4 shrink-0">
              <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="font-mono text-[10px] whitespace-nowrap !text-muted">
                {stepIndex + 1} / 4
              </span>
            </div>
          )}

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4" style={{ overscrollBehavior: 'contain' }}>
          <div className="pb-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Business Type */}
              {step === 'business' && (
                <motion.div
                  key="business"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider mb-2 !text-muted">
                    Étape 1 — {stepLabels[0]}
                  </p>
                  <h2 className="text-[22px] font-bold tracking-tight leading-tight mb-1.5 !text-primary">
                    {t('what_is_your_business') || 'Quel est votre métier ?'}
                  </h2>
                  <p className="text-[11px] leading-relaxed mb-6 !text-muted">
                    {t('business_type_desc') || 'Nous adapterons votre expérience en conséquence'}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(BUSINESS_CONFIGS) as BusinessType[]).map((type, index) => {
                      const isSelected = selectedBusinessType === type;
                      return (
                        <motion.button
                          key={type}
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleSelectBusinessType(type)}
                          className={`
                            flex items-center gap-2.5 p-3.5 rounded-lg border transition-all cursor-pointer text-left
                            ${isSelected 
                              ? 'border-primary shadow-[0_0_0_3px_var(--color-primary-border)]' 
                              : 'border-default hover:border-primary/50'
                            }
                          `}
                          style={{ background: isSelected ? 'var(--bg-muted)' : 'var(--bg-card)' }}
                        >
                          <div
                            className={`w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary !text-primary-text' : 'bg-muted !text-muted'}`}
                          >
                            {BUSINESS_ICONS[type]}
                          </div>
                          <span className="font-medium text-[11px] !text-primary">
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
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider mb-2 !text-muted">
                    Étape 2 — {stepLabels[1]}
                  </p>
                  <h2 className="text-[22px] font-bold tracking-tight leading-tight mb-1.5 !text-primary">
                    {t('what_is_your_objective') || 'Votre premier projet sera…'}
                  </h2>
                  <p className="text-[11px] leading-relaxed mb-6 !text-muted">
                    {t('objective_desc') || 'On prépare le bon template avec les tâches adaptées à votre activité.'}
                  </p>

                  <div className="flex flex-col gap-1.5">
                    {objectives.map((objective, index) => {
                      const isSelected = selectedObjective?.id === objective.id;
                      const template = PROJECT_TEMPLATES[objective.templateId];
                      const stats = template ? calculateTemplateTotals(template) : null;
                      const subText = stats
                        ? `${stats.taskCount} tâches · ~${stats.totalHours}h`
                        : (language === 'en' ? objective.descriptionEn : objective.description);

                      return (
                        <motion.button
                          key={objective.id}
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedObjective(objective)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer text-left
                            ${isSelected ? 'border-primary bg-muted' : 'border-default hover:border-primary/50 bg-card'}
                          `}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-default'}`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full !bg-[var(--color-primary-text)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[11px] !text-primary">
                              {language === 'en' ? objective.labelEn : objective.label}
                            </div>
                            <div className="font-mono text-[10px] mt-0.5 truncate !text-muted">
                              {subText}
                            </div>
                          </div>
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
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider mb-2 !text-muted">
                    Étape 3 — {stepLabels[2]}
                  </p>
                  <h2 className="text-[22px] font-bold tracking-tight leading-tight mb-1.5 !text-primary">
                    {t('create_first_project') || 'Nommez votre projet'}
                  </h2>
                  <p className="text-[11px] leading-relaxed mb-6 !text-muted">
                    {t('project_details_desc') || 'Ces infos servent à créer votre client et votre projet. Vous pouvez tout modifier après.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1.5 !text-primary">
                        {t('client_name') || 'Nom du client'}
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="ex: Mairie de Lyon"
                        className="w-full px-3 py-2.5 rounded-lg border text-[11px] outline-none transition-colors placeholder:!text-placeholder focus:border-primary bg-input !text-primary border-default"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold mb-1.5 !text-primary">
                        {t('onboarding_hourly_rate') || 'Taux horaire'}
                      </label>
                      <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        min={0}
                        placeholder="ex: 75"
                        className="w-full px-3 py-2.5 rounded-lg border text-[11px] outline-none transition-colors placeholder:!text-placeholder focus:border-primary bg-input !text-primary border-default"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-[12px] font-semibold mb-1 !text-primary">
                      {t('onboarding_project_name') || 'Nom du projet'}
                    </label>
                    <p className="font-mono text-[10px] mb-1.5 !text-muted">
                      Pré-rempli selon votre choix précédent
                    </p>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="ex: Site vitrine 2026"
                      className="w-full px-3 py-2.5 rounded-lg border text-[11px] outline-none transition-colors placeholder:!text-placeholder focus:border-primary bg-input !text-primary border-default"
                    />
                  </div>

                  {/* Preview card — compact */}
                  <div className="rounded-lg border p-4 bg-muted border-default">
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-2.5 !text-muted">
                      {t('onboarding_template_preview') || 'Aperçu de ce qui sera créé'}
                    </p>
                    <div className="flex items-center justify-between text-[12px] py-1 !text-muted">
                      <span>Client</span>
                      <span className="font-semibold font-mono text-[11px] !text-primary">
                        {clientName || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] py-1 !text-muted">
                      <span>Projet</span>
                      <span className="font-semibold font-mono text-[11px] truncate max-w-[180px] !text-primary">
                        {projectName || '—'}
                      </span>
                    </div>
                    <div className="h-px my-2 bg-[var(--border-default)]" />
                    <div className="flex items-center justify-between text-[12px] py-1 !text-muted">
                      <span>{t('onboarding_tasks') || 'Tâches créées'}</span>
                      <span className="font-semibold font-mono text-[11px] !text-primary">
                        {templateStats.taskCount} tâches
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] py-1 !text-muted">
                      <span>{t('onboarding_estimated_value') || 'Valeur estimée'}</span>
                      <span className="font-semibold font-mono text-[11px] !text-primary">
                        ~{estimatedValue.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                    className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center bg-success/10 border border-success/30"
                  >
                    <IconCheck className="w-6 h-6 text-success" strokeWidth={2.5} />
                  </motion.div>

                  <h2 className="text-[22px] font-bold tracking-tight mb-1.5 !text-primary">
                    {t('onboarding_success_title') || 'Votre espace est prêt !'}
                  </h2>
                  <p className="text-[11px] mb-6 !text-muted">
                    {t('onboarding_complete_desc') || 'Tout a été créé. Vous pouvez commencer à travailler.'}
                  </p>

                  {/* Success items — list with checks */}
                  <div className="flex flex-col gap-2 mb-6 text-left">
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted border border-default">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10 border border-success/30">
                        <IconCheck className="w-2.5 h-2.5 text-success" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="font-medium text-[11px] !text-primary">
                          {createdClient?.name || 'Client'} — {t('client_created') || 'Client créé'}
                        </div>
                        <div className="font-mono text-[10px] !text-muted">
                          Fiche client disponible dans Pipeline
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted border border-default">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10 border border-success/30">
                        <IconCheck className="w-2.5 h-2.5 text-success" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[11px] truncate !text-primary">
                          {createdProject?.title || 'Projet'} — {t('project_created') || 'Projet créé'}
                        </div>
                        <div className="font-mono text-[10px] !text-muted">
                          {createdTasksCount} {t('onboarding_tasks') || 'tâches'} générées automatiquement
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted border border-default">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10 border border-success/30">
                        <IconCheck className="w-2.5 h-2.5 text-success" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="font-medium text-[11px] !text-primary">
                          Préférences enregistrées
                        </div>
                        <div className="font-mono text-[10px] !text-muted">
                          Dashboard personnalisé selon votre profil
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExploreDashboard}
                      className="flex-1 py-3 px-5 rounded-lg border font-semibold text-[11px] transition-all border-default !text-muted hover:border-primary/50"
                    >
                      {t('explore_dashboard') || 'Explorer le dashboard'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGoToProject}
                      className="flex-1 py-3 px-5 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all hover:shadow-lg hover:-translate-y-px bg-primary !text-primary-text"
                    >
                      {t('go_to_project') || 'Voir mon projet'}
                      <IconArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>

          {/* Dots navigation */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-1.5 pb-4 shrink-0">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(i)}
                  disabled={i >= stepIndex}
                  className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-[var(--border-default)]'} ${i < stepIndex ? 'cursor-pointer hover:bg-muted' : 'cursor-default'}`}
                  aria-label={`Étape ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Footer - Navigation buttons */}
          {step !== 'success' && (
            <div className="px-5 pb-5 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving || step === 'business'}
                className="py-3 px-4 rounded-lg border font-medium text-[11px] transition-all disabled:opacity-30 disabled:cursor-not-allowed border-default !text-muted hover:border-primary/50"
              >
                <IconArrowLeft className="w-3.5 h-3.5 inline mr-1 -ml-0.5" strokeWidth={2} />
                {t('back') || 'Retour'}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  isSaving ||
                  (step === 'business' && !selectedBusinessType) ||
                  (step === 'objective' && !selectedObjective)
                }
                className={`
                  flex-1 py-3 px-5 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none
                  ${(step === 'business' && selectedBusinessType) ||
                    (step === 'objective' && selectedObjective) ||
                    step === 'project'
                    ? 'bg-primary !text-primary-text hover:shadow-lg hover:-translate-y-px'
                    : 'bg-muted !text-muted cursor-not-allowed'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {t('creating') || 'Création en cours…'}
                  </>
                ) : step === 'project' ? (
                  <>
                    <IconRocket className="w-3.5 h-3.5" strokeWidth={2} />
                    {t('create_project') || 'Créer mon projet'}
                  </>
                ) : (
                  <>
                    {t('continue') || 'Continuer'}
                    <IconArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
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

