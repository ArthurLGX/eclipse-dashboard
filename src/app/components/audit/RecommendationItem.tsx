'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IconBulb, IconArrowRight } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface RecommendationItemProps {
  text: string;
  priority: 'high' | 'medium' | 'low';
  index?: number;
}

const priorityStyles = {
  high: {
    badge: 'bg-danger-light text-danger',
    border: 'border-l-[var(--color-danger)]',
    icon: 'text-danger',
  },
  medium: {
    badge: 'bg-warning-light text-warning',
    border: 'border-l-[var(--color-warning)]',
    icon: 'text-warning',
  },
  low: {
    badge: 'bg-info-light text-info',
    border: 'border-l-[var(--color-info)]',
    icon: 'text-info',
  },
};

// Recommendation text mappings
const recommendationTexts: Record<string, { fr: string; en: string }> = {
  add_page_title: {
    fr: 'Ajouter un titre de page (balise <title>)',
    en: 'Add a page title (<title> tag)',
  },
  add_meta_description: {
    fr: 'Ajouter une meta description',
    en: 'Add a meta description',
  },
  add_canonical_url: {
    fr: 'Ajouter une URL canonique',
    en: 'Add a canonical URL',
  },
  add_open_graph_tags: {
    fr: 'Ajouter les balises Open Graph pour le partage social',
    en: 'Add Open Graph tags for social sharing',
  },
  add_h1_heading: {
    fr: 'Ajouter un titre H1 unique et descriptif',
    en: 'Add a unique and descriptive H1 heading',
  },
  use_single_h1: {
    fr: 'Utiliser un seul H1 par page',
    en: 'Use only one H1 per page',
  },
  add_social_proof_section: {
    fr: 'Ajouter une section de preuve sociale (témoignages, logos clients)',
    en: 'Add a social proof section (testimonials, client logos)',
  },
  add_clear_cta: {
    fr: 'Ajouter un appel à l\'action clair et visible',
    en: 'Add a clear and visible call-to-action',
  },
  add_problem_statement: {
    fr: 'Ajouter une section décrivant le problème que vous résolvez',
    en: 'Add a section describing the problem you solve',
  },
  focus_on_benefits_not_features: {
    fr: 'Mettre l\'accent sur les bénéfices plutôt que les fonctionnalités',
    en: 'Focus on benefits rather than features',
  },
  shorten_sentences: {
    fr: 'Raccourcir les phrases pour améliorer la lisibilité',
    en: 'Shorten sentences to improve readability',
  },
  reduce_technical_jargon: {
    fr: 'Réduire le jargon technique pour toucher un public plus large',
    en: 'Reduce technical jargon to reach a wider audience',
  },
};

export default function RecommendationItem({ text, priority, index = 0 }: RecommendationItemProps) {
  const { t, language } = useLanguage();
  const styles = priorityStyles[priority];

  // Get localized recommendation text
  const displayText = recommendationTexts[text]?.[language] || t(text) || text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-start gap-3 p-4 bg-card rounded-lg border-l-4 ${styles.border} hover:bg-hover transition-colors`}
    >
      <div className={`p-1.5`}>
        <IconBulb className={`w-4 h-4 ${styles.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary">{displayText}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
          {t(`priority_${priority}`)}
        </span>
        <IconArrowRight className="w-4 h-4 text-muted" />
      </div>
    </motion.div>
  );
}

