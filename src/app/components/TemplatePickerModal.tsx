'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconCheck,
  IconPalette,
  IconBriefcase,
  IconSparkles,
  IconSnowflake,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import {
  templateCategories,
  getTemplatesByCategory,
  type NewsletterTemplate,
} from '@/lib/newsletter-templates';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: NewsletterTemplate) => void;
  currentTemplateId?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  all: <IconPalette className="w-4 h-4" />,
  business: <IconBriefcase className="w-4 h-4" />,
  creative: <IconSparkles className="w-4 h-4" />,
  minimal: <IconPalette className="w-4 h-4" />,
  seasonal: <IconSnowflake className="w-4 h-4" />,
};

export default function TemplatePickerModal({
  isOpen,
  onClose,
  onSelect,
  currentTemplateId,
}: TemplatePickerModalProps) {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return getTemplatesByCategory(selectedCategory);
  }, [selectedCategory]);

  const handleSelect = (template: NewsletterTemplate) => {
    onSelect(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-card border border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-default shrink-0">
            <div>
              <h2 className="text-xl font-bold text-primary">
                {t('choose_template') || 'Choisir un template'}
              </h2>
              <p className="text-sm text-muted">
                {t('template_picker_desc') || 'Sélectionnez un design pour votre newsletter'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-primary rounded-lg hover:bg-secondary/10 transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-6 py-3 border-b border-default overflow-x-auto shrink-0">
            {templateCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${selectedCategory === category.id
                    ? 'bg-accent text-white'
                    : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                  }
                `}
              >
                {categoryIcons[category.id]}
                {language === 'en' ? category.labelEn : category.label}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredTemplates.map(template => {
                const isSelected = currentTemplateId === template.id;
                const isHovered = hoveredTemplate === template.id;
                
                // Générer le dégradé CSS
                const gradientStops = template.gradient_stops
                  .map(stop => `${stop.color} ${stop.position}%`)
                  .join(', ');
                const gradient = `linear-gradient(${template.gradient_angle}deg, ${gradientStops})`;

                return (
                  <motion.div
                    key={template.id}
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                    onClick={() => handleSelect(template)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all
                      ${isSelected
                        ? 'border-accent shadow-lg shadow-accent/20'
                        : 'border-transparent hover:border-accent/50'
                      }
                    `}
                  >
                    {/* Preview */}
                    <div
                      className="aspect-[4/3] p-4 flex flex-col"
                      style={{ background: gradient }}
                    >
                      {/* Fake header */}
                      <div className="mb-3">
                        <div
                          className="h-4 w-24 rounded mb-1"
                          style={{ backgroundColor: template.header_title_color, opacity: 0.9 }}
                        />
                        <div
                          className="h-2 w-16 rounded"
                          style={{ backgroundColor: template.header_title_color, opacity: 0.5 }}
                        />
                      </div>

                      {/* Fake content */}
                      <div className="flex-1 bg-white/90 rounded-lg p-3 space-y-2">
                        <div
                          className="h-2 w-full rounded"
                          style={{ backgroundColor: template.text_color, opacity: 0.3 }}
                        />
                        <div
                          className="h-2 w-3/4 rounded"
                          style={{ backgroundColor: template.text_color, opacity: 0.3 }}
                        />
                        <div
                          className="h-2 w-5/6 rounded"
                          style={{ backgroundColor: template.text_color, opacity: 0.3 }}
                        />
                        
                        {/* Fake button */}
                        <div
                          className="h-6 w-20 rounded mt-3"
                          style={{ backgroundColor: template.button_color }}
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-card">
                      <h3 className="font-medium text-primary text-sm">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted line-clamp-1">
                        {template.description}
                      </p>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1.5 bg-accent rounded-full">
                        <IconCheck className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <AnimatePresence>
                      {isHovered && !isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-accent-light flex items-center justify-center"
                        >
                          <span className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium">
                            {t('select') || 'Sélectionner'}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-default bg-secondary/5 shrink-0">
            <p className="text-xs text-muted text-center">
              {t('template_customizable') || 'Tous les templates sont personnalisables après sélection'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

