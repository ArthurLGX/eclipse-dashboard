'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconDeviceFloppy,
  IconLoader2,
  IconStar,
  IconStarFilled,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalScroll } from '@/hooks/useModalFocus';

interface GradientStop {
  id: string;
  color: string;
  position: number;
  opacity: number;
}

interface TemplateData {
  gradientStops: GradientStop[];
  gradientAngle: number;
  buttonColor: string;
  buttonTextColor: string;
  textColor: string;
  headerTitleColor: string;
  fontFamily: string;
  headerBackgroundUrl?: string;
  bannerUrl?: string;
}

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, isDefault: boolean) => Promise<void>;
  templateData: TemplateData;
}

export default function SaveTemplateModal({
  isOpen,
  onClose,
  onSave,
  templateData,
}: SaveTemplateModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Bloquer le scroll du body quand la modale est ouverte
  useModalScroll(isOpen);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('template_name_required') || 'Le nom du template est requis');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      await onSave(name.trim(), description.trim(), isDefault);
      // Reset form
      setName('');
      setDescription('');
      setIsDefault(false);
      onClose();
    } catch (err) {
      console.error('Error saving template:', err);
      setError(t('template_save_error') || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setName('');
      setDescription('');
      setIsDefault(false);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-default rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-default">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <IconDeviceFloppy className="w-5 h-5 !text-accent" />
              {t('save_template') || 'Sauvegarder le thème'}
            </h3>
            <button
              onClick={handleClose}
              disabled={saving}
              className="p-2 rounded-lg hover:bg-hover transition-colors disabled:opacity-50"
            >
              <IconX className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Aperçu du template */}
            <div className="p-4 rounded-xl border border-default bg-hover/30">
              <p className="text-xs text-muted mb-3 uppercase tracking-wide">
                {t('template_preview') || 'Aperçu du thème'}
              </p>
              <div className="flex items-center gap-4">
                {/* Gradient preview */}
                <div 
                  className="w-20 h-12 rounded-lg border border-default"
                  style={{
                    background: templateData.gradientStops.length > 0
                      ? `linear-gradient(${templateData.gradientAngle}deg, ${
                          templateData.gradientStops
                            .sort((a, b) => a.position - b.position)
                            .map(s => `${s.color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')} ${s.position}%`)
                            .join(', ')
                        })`
                      : '#333'
                  }}
                />
                {/* Colors preview */}
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: templateData.buttonColor }}
                    title={t('button_color') || 'Couleur bouton'}
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: templateData.headerTitleColor }}
                    title={t('title_color') || 'Couleur titre'}
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: templateData.textColor }}
                    title={t('text_color') || 'Couleur texte'}
                  />
                </div>
                {/* Font */}
                <div className="text-sm text-secondary">
                  <span style={{ fontFamily: templateData.fontFamily }}>
                    {templateData.fontFamily.split(',')[0]}
                  </span>
                </div>
              </div>
              {/* Images indicators */}
              {(templateData.headerBackgroundUrl || templateData.bannerUrl) && (
                <div className="flex gap-2 mt-3 text-xs text-muted">
                  {templateData.headerBackgroundUrl && (
                    <span className="px-2 py-1 bg-accent-light !text-accent rounded">
                      {t('header_image_included') || '+ Image en-tête'}
                    </span>
                  )}
                  {templateData.bannerUrl && (
                    <span className="px-2 py-1 bg-accent-light !text-accent rounded">
                      {t('banner_included') || '+ Bannière'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Nom du template */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('template_name') || 'Nom du thème'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder={t('template_name_placeholder') || 'Ex: Mon thème corporate'}
                className="w-full px-4 py-3 bg-input border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent"
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('template_description') || 'Description'} ({t('optional') || 'optionnel'})
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('template_description_placeholder') || 'Décrivez l\'utilisation de ce thème...'}
                rows={2}
                className="w-full px-4 py-3 bg-input border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent resize-none"
                disabled={saving}
              />
            </div>

            {/* Définir comme défaut */}
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              disabled={saving}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isDefault
                  ? 'border-yellow-500/50 bg-yellow-500/10'
                  : 'border-default hover:border-accent-light hover:bg-hover'
              }`}
            >
              {isDefault ? (
                <IconStarFilled className="w-5 h-5 text-yellow-500" />
              ) : (
                <IconStar className="w-5 h-5 text-secondary" />
              )}
              <div className="text-left">
                <p className={`font-medium ${isDefault ? 'text-yellow-500' : 'text-primary'}`}>
                  {t('set_as_default') || 'Définir comme thème par défaut'}
                </p>
                <p className="text-xs text-muted">
                  {t('default_template_hint') || 'Ce thème sera pré-sélectionné pour vos nouvelles newsletters'}
                </p>
              </div>
            </button>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-default">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-secondary hover:text-primary transition-colors disabled:opacity-50"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                  {t('saving') || 'Sauvegarde...'}
                </>
              ) : (
                <>
                  <IconDeviceFloppy className="w-4 h-4" />
                  {t('save') || 'Sauvegarder'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

