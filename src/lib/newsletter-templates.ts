/**
 * @file newsletter-templates.ts
 * @description Templates prédéfinis pour les newsletters
 */

import type { CreateCustomTemplateData, GradientStop } from '@/types';

export interface NewsletterTemplate extends CreateCustomTemplateData {
  id: string;
  category: 'business' | 'creative' | 'minimal' | 'seasonal';
  preview_image?: string;
}

// ============================================================================
// TEMPLATES BUSINESS
// ============================================================================

const businessClassic: NewsletterTemplate = {
  id: 'business-classic',
  name: 'Business Classic',
  description: 'Un design professionnel et épuré pour les communications d\'entreprise',
  category: 'business',
  gradient_stops: [
    { id: '1', color: '#1e3a5f', position: 0, opacity: 1 },
    { id: '2', color: '#2d5a87', position: 100, opacity: 1 },
  ],
  gradient_angle: 135,
  button_color: '#0ea5e9',
  button_text_color: '#ffffff',
  text_color: '#374151',
  header_title_color: '#ffffff',
  font_family: 'Inter, sans-serif',
};

const businessModern: NewsletterTemplate = {
  id: 'business-modern',
  name: 'Business Modern',
  description: 'Un style moderne avec des accents dynamiques',
  category: 'business',
  gradient_stops: [
    { id: '1', color: '#0f172a', position: 0, opacity: 1 },
    { id: '2', color: '#1e293b', position: 50, opacity: 1 },
    { id: '3', color: '#334155', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#6366f1',
  button_text_color: '#ffffff',
  text_color: '#1f2937',
  header_title_color: '#ffffff',
  font_family: 'Plus Jakarta Sans, sans-serif',
};

const businessGreen: NewsletterTemplate = {
  id: 'business-green',
  name: 'Eco Business',
  description: 'Parfait pour les entreprises éco-responsables',
  category: 'business',
  gradient_stops: [
    { id: '1', color: '#064e3b', position: 0, opacity: 1 },
    { id: '2', color: '#047857', position: 100, opacity: 1 },
  ],
  gradient_angle: 135,
  button_color: '#10b981',
  button_text_color: '#ffffff',
  text_color: '#1f2937',
  header_title_color: '#ffffff',
  font_family: 'DM Sans, sans-serif',
};

// ============================================================================
// TEMPLATES CRÉATIFS
// ============================================================================

const creativeGradient: NewsletterTemplate = {
  id: 'creative-gradient',
  name: 'Gradient Créatif',
  description: 'Un dégradé vibrant pour capter l\'attention',
  category: 'creative',
  gradient_stops: [
    { id: '1', color: '#7c3aed', position: 0, opacity: 1 },
    { id: '2', color: '#db2777', position: 50, opacity: 1 },
    { id: '3', color: '#f97316', position: 100, opacity: 1 },
  ],
  gradient_angle: 135,
  button_color: '#ec4899',
  button_text_color: '#ffffff',
  text_color: '#1f2937',
  header_title_color: '#ffffff',
  font_family: 'Poppins, sans-serif',
};

const creativeSunset: NewsletterTemplate = {
  id: 'creative-sunset',
  name: 'Sunset Vibes',
  description: 'Des couleurs chaudes inspirées du coucher de soleil',
  category: 'creative',
  gradient_stops: [
    { id: '1', color: '#f59e0b', position: 0, opacity: 1 },
    { id: '2', color: '#ef4444', position: 50, opacity: 1 },
    { id: '3', color: '#be185d', position: 100, opacity: 1 },
  ],
  gradient_angle: 45,
  button_color: '#f59e0b',
  button_text_color: '#000000',
  text_color: '#1f2937',
  header_title_color: '#ffffff',
  font_family: 'Montserrat, sans-serif',
};

const creativeOcean: NewsletterTemplate = {
  id: 'creative-ocean',
  name: 'Ocean Dream',
  description: 'Des teintes océaniques apaisantes',
  category: 'creative',
  gradient_stops: [
    { id: '1', color: '#0891b2', position: 0, opacity: 1 },
    { id: '2', color: '#0ea5e9', position: 50, opacity: 1 },
    { id: '3', color: '#38bdf8', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#06b6d4',
  button_text_color: '#ffffff',
  text_color: '#0f172a',
  header_title_color: '#ffffff',
  font_family: 'Nunito, sans-serif',
};

// ============================================================================
// TEMPLATES MINIMALISTES
// ============================================================================

const minimalLight: NewsletterTemplate = {
  id: 'minimal-light',
  name: 'Minimal Light',
  description: 'Un design épuré sur fond clair',
  category: 'minimal',
  gradient_stops: [
    { id: '1', color: '#f8fafc', position: 0, opacity: 1 },
    { id: '2', color: '#f1f5f9', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#0f172a',
  button_text_color: '#ffffff',
  text_color: '#1e293b',
  header_title_color: '#0f172a',
  font_family: 'Inter, sans-serif',
};

const minimalDark: NewsletterTemplate = {
  id: 'minimal-dark',
  name: 'Minimal Dark',
  description: 'Élégance sombre pour un impact maximal',
  category: 'minimal',
  gradient_stops: [
    { id: '1', color: '#18181b', position: 0, opacity: 1 },
    { id: '2', color: '#27272a', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#fafafa',
  button_text_color: '#18181b',
  text_color: '#e4e4e7',
  header_title_color: '#fafafa',
  font_family: 'Space Grotesk, sans-serif',
};

const minimalMono: NewsletterTemplate = {
  id: 'minimal-mono',
  name: 'Monochrome',
  description: 'Simplicité en noir et blanc',
  category: 'minimal',
  gradient_stops: [
    { id: '1', color: '#ffffff', position: 0, opacity: 1 },
    { id: '2', color: '#fafafa', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#171717',
  button_text_color: '#ffffff',
  text_color: '#262626',
  header_title_color: '#171717',
  font_family: 'IBM Plex Sans, sans-serif',
};

// ============================================================================
// TEMPLATES SAISONNIERS
// ============================================================================

const seasonalSpring: NewsletterTemplate = {
  id: 'seasonal-spring',
  name: 'Printemps',
  description: 'Couleurs fraîches et florales du printemps',
  category: 'seasonal',
  gradient_stops: [
    { id: '1', color: '#fce7f3', position: 0, opacity: 1 },
    { id: '2', color: '#fbcfe8', position: 50, opacity: 1 },
    { id: '3', color: '#f9a8d4', position: 100, opacity: 1 },
  ],
  gradient_angle: 135,
  button_color: '#ec4899',
  button_text_color: '#ffffff',
  text_color: '#831843',
  header_title_color: '#be185d',
  font_family: 'Quicksand, sans-serif',
};

const seasonalSummer: NewsletterTemplate = {
  id: 'seasonal-summer',
  name: 'Été',
  description: 'L\'énergie ensoleillée de l\'été',
  category: 'seasonal',
  gradient_stops: [
    { id: '1', color: '#fef3c7', position: 0, opacity: 1 },
    { id: '2', color: '#fde68a', position: 50, opacity: 1 },
    { id: '3', color: '#fcd34d', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#f59e0b',
  button_text_color: '#000000',
  text_color: '#78350f',
  header_title_color: '#92400e',
  font_family: 'Lato, sans-serif',
};

const seasonalAutumn: NewsletterTemplate = {
  id: 'seasonal-autumn',
  name: 'Automne',
  description: 'Les teintes chaleureuses de l\'automne',
  category: 'seasonal',
  gradient_stops: [
    { id: '1', color: '#7c2d12', position: 0, opacity: 1 },
    { id: '2', color: '#9a3412', position: 50, opacity: 1 },
    { id: '3', color: '#c2410c', position: 100, opacity: 1 },
  ],
  gradient_angle: 135,
  button_color: '#ea580c',
  button_text_color: '#ffffff',
  text_color: '#1c1917',
  header_title_color: '#ffffff',
  font_family: 'Merriweather, serif',
};

const seasonalWinter: NewsletterTemplate = {
  id: 'seasonal-winter',
  name: 'Hiver',
  description: 'L\'élégance givrée de l\'hiver',
  category: 'seasonal',
  gradient_stops: [
    { id: '1', color: '#1e3a5f', position: 0, opacity: 1 },
    { id: '2', color: '#1e40af', position: 50, opacity: 1 },
    { id: '3', color: '#3b82f6', position: 100, opacity: 1 },
  ],
  gradient_angle: 180,
  button_color: '#60a5fa',
  button_text_color: '#1e3a8a',
  text_color: '#1e3a8a',
  header_title_color: '#ffffff',
  font_family: 'Playfair Display, serif',
};

// ============================================================================
// EXPORTS
// ============================================================================

export const newsletterTemplates: NewsletterTemplate[] = [
  // Business
  businessClassic,
  businessModern,
  businessGreen,
  // Créatifs
  creativeGradient,
  creativeSunset,
  creativeOcean,
  // Minimalistes
  minimalLight,
  minimalDark,
  minimalMono,
  // Saisonniers
  seasonalSpring,
  seasonalSummer,
  seasonalAutumn,
  seasonalWinter,
];

export const templateCategories = [
  { id: 'all', label: 'Tous', labelEn: 'All' },
  { id: 'business', label: 'Business', labelEn: 'Business' },
  { id: 'creative', label: 'Créatif', labelEn: 'Creative' },
  { id: 'minimal', label: 'Minimaliste', labelEn: 'Minimal' },
  { id: 'seasonal', label: 'Saisonnier', labelEn: 'Seasonal' },
];

export function getTemplatesByCategory(category: string): NewsletterTemplate[] {
  if (category === 'all') return newsletterTemplates;
  return newsletterTemplates.filter(t => t.category === category);
}

export function getTemplateById(id: string): NewsletterTemplate | undefined {
  return newsletterTemplates.find(t => t.id === id);
}

/**
 * Convertit un template prédéfini en données pour créer un CustomTemplate
 */
export function templateToCustomTemplateData(template: NewsletterTemplate): CreateCustomTemplateData {
  return {
    name: template.name,
    description: template.description,
    gradient_stops: template.gradient_stops,
    gradient_angle: template.gradient_angle,
    button_color: template.button_color,
    button_text_color: template.button_text_color,
    text_color: template.text_color,
    header_title_color: template.header_title_color,
    font_family: template.font_family,
    header_background_url: template.header_background_url,
    banner_url: template.banner_url,
    is_default: false,
  };
}

