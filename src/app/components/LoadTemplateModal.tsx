'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconPalette,
  IconLoader2,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalScroll } from '@/hooks/useModalFocus';
import type { CustomTemplate } from '@/types';

interface LoadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (template: CustomTemplate) => void;
  onDelete: (documentId: string) => Promise<void>;
  onSetDefault: (documentId: string) => Promise<void>;
  templates: CustomTemplate[];
  loading: boolean;
}

export default function LoadTemplateModal({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  onSetDefault,
  templates,
  loading,
}: LoadTemplateModalProps) {
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  // Bloquer le scroll du body quand la modale est ouverte
  useModalScroll(isOpen);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null);
      setConfirmDelete(null);
    }
  }, [isOpen]);

  const handleLoad = () => {
    if (selectedTemplate) {
      onLoad(selectedTemplate);
      onClose();
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeleting(true);
    try {
      await onDelete(documentId);
      setConfirmDelete(null);
      if (selectedTemplate?.documentId === documentId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (documentId: string) => {
    setSettingDefault(documentId);
    try {
      await onSetDefault(documentId);
    } catch (error) {
      console.error('Error setting default:', error);
    } finally {
      setSettingDefault(null);
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
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-default rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-default">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <IconPalette className="w-5 h-5 text-accent" />
              {t('load_template') || 'Charger un thème'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-hover transition-colors"
            >
              <IconX className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-secondary">
                <IconPalette className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {t('no_saved_templates') || 'Aucun thème sauvegardé'}
                </p>
                <p className="text-sm text-muted text-center">
                  {t('no_saved_templates_hint') || 'Personnalisez votre thème et sauvegardez-le pour le réutiliser'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.documentId}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedTemplate?.documentId === template.documentId
                        ? 'border-accent bg-accent/5'
                        : 'border-default hover:border-accent/50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {/* Default badge */}
                    {template.is_default && (
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <IconStarFilled className="w-3 h-3" />
                        {t('default') || 'Défaut'}
                      </div>
                    )}

                    {/* Selection indicator */}
                    {selectedTemplate?.documentId === template.documentId && (
                      <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                        <IconCheck className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Template preview */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Gradient preview */}
                      <div 
                        className="w-16 h-10 rounded-lg border border-default flex-shrink-0"
                        style={{
                          background: template.gradient_stops?.length > 0
                            ? `linear-gradient(${template.gradient_angle}deg, ${
                                [...template.gradient_stops]
                                  .sort((a, b) => a.position - b.position)
                                  .map(s => `${s.color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')} ${s.position}%`)
                                  .join(', ')
                              })`
                            : '#333'
                        }}
                      />
                      {/* Colors */}
                      <div className="flex gap-1.5">
                        <div 
                          className="w-6 h-6 rounded-full border border-white/20"
                          style={{ backgroundColor: template.button_color }}
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-white/20"
                          style={{ backgroundColor: template.header_title_color }}
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-white/20"
                          style={{ backgroundColor: template.text_color }}
                        />
                      </div>
                    </div>

                    {/* Template info */}
                    <h4 className="font-semibold text-primary truncate">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-muted mt-1 line-clamp-2">{template.description}</p>
                    )}
                    
                    {/* Font */}
                    <p className="text-xs text-secondary mt-2">
                      <span style={{ fontFamily: template.font_family }}>
                        {template.font_family.split(',')[0]}
                      </span>
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-default">
                      {/* Set as default */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(template.documentId);
                        }}
                        disabled={template.is_default || settingDefault === template.documentId}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          template.is_default
                            ? 'text-yellow-500 cursor-default'
                            : 'text-secondary hover:text-yellow-500 hover:bg-yellow-500/10'
                        }`}
                      >
                        {settingDefault === template.documentId ? (
                          <IconLoader2 className="w-3 h-3 animate-spin" />
                        ) : template.is_default ? (
                          <IconStarFilled className="w-3 h-3" />
                        ) : (
                          <IconStar className="w-3 h-3" />
                        )}
                        {template.is_default 
                          ? (t('is_default') || 'Par défaut')
                          : (t('set_default') || 'Définir défaut')
                        }
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(template.documentId);
                        }}
                        className="p-1.5 text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Confirm delete overlay */}
                    {confirmDelete === template.documentId && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-card/95 rounded-xl flex flex-col items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconAlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                        <p className="text-sm text-primary text-center mb-3">
                          {t('confirm_delete_template') || 'Supprimer ce thème ?'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(null)}
                            disabled={deleting}
                            className="px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
                          >
                            {t('cancel') || 'Annuler'}
                          </button>
                          <button
                            onClick={() => handleDelete(template.documentId)}
                            disabled={deleting}
                            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                          >
                            {deleting ? (
                              <IconLoader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <IconTrash className="w-3 h-3" />
                            )}
                            {t('delete') || 'Supprimer'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {templates.length > 0 && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-default">
              <button
                onClick={onClose}
                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                onClick={handleLoad}
                disabled={!selectedTemplate}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <IconCheck className="w-4 h-4" />
                {t('load_selected') || 'Charger le thème'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

