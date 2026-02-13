'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconSparkles, IconX } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalFocus } from '@/hooks/useModalFocus';
import { useUserPreferences } from '@/app/context/UserPreferencesContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { BusinessTypeSelector, ModuleSelector } from './BusinessTypeSelector';
import { BusinessType, getDefaultModules, BUSINESS_CONFIGS } from '@/config/business-modules';
import { initializeUserPreferences } from '@/lib/api';

type SetupStep = 'business' | 'modules';

export default function BusinessSetupModal() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { preferences, loading, refreshPreferences } = useUserPreferences();
  const { showGlobalPopup } = usePopup();
  
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useModalFocus(isOpen);
  const [step, setStep] = useState<SetupStep>('business');
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Afficher la modale si les préférences n'existent pas ou si l'onboarding n'est pas complété
  useEffect(() => {
    if (!loading && user?.id) {
      // Pas de préférences OU onboarding non complété
      if (!preferences || !preferences.onboarding_completed) {
        setIsOpen(true);
      }
    }
  }, [loading, preferences, user?.id]);

  const handleSelectType = (type: BusinessType) => {
    setSelectedType(type);
    setSelectedModules(getDefaultModules(type));
  };

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleNext = () => {
    if (step === 'business' && selectedType) {
      setStep('modules');
    }
  };

  const handleBack = () => {
    if (step === 'modules') {
      setStep('business');
    }
  };

  const handleComplete = async () => {
    if (!selectedType || !user?.id) return;

    setIsSaving(true);
    try {
      await initializeUserPreferences(user.id, selectedType, selectedModules);
      await refreshPreferences();
      showGlobalPopup(t('setup_complete') || 'Configuration terminée !', 'success');
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      showGlobalPopup(t('setup_error') || 'Erreur lors de la configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Créer des préférences par défaut
      await initializeUserPreferences(user.id, 'other', getDefaultModules('other'));
      await refreshPreferences();
      setIsOpen(false);
    } catch (error) {
      console.error('Error skipping setup:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const businessLabel = selectedType
    ? (language === 'en' ? BUSINESS_CONFIGS[selectedType].labelEn : BUSINESS_CONFIGS[selectedType].label)
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl bg-card border border-default rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto outline-none"
        >
          {/* Header */}
            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-accent-light via-accent-light to-muted">
            <button
              onClick={handleSkip}
              disabled={isSaving}
              className="absolute top-4 right-4 p-2 !text-muted hover:!text-primary rounded-lg hover:bg-muted transition-colors"
              title={t('skip') || 'Passer'}
            >
              <IconX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-accent-light rounded-xl">
                <IconSparkles className="w-8 h-8 !text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold !text-primary">
                  {t('setup_welcome') || 'Configurez votre espace'}
                </h2>
                <p className="text-muted">
                  {t('setup_subtitle') || 'Personnalisez Eclipse selon votre activité'}
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-4 mt-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full !text-sm font-medium transition-all ${
                step === 'business' ? 'bg-accent !text-white' : 'bg-success !text-white'
              }`}>
                {step === 'modules' ? '✓' : '1'}
                <span>{t('your_business') || 'Votre métier'}</span>
              </div>
              <div className="w-8 h-0.5 bg-muted" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full !text-sm font-medium transition-all ${
                step === 'modules' ? 'bg-accent !text-white' : 'bg-hover !text-muted'
              }`}>
                <span>2</span>
                <span>{t('your_tools') || 'Vos outils'}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {step === 'business' ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold !text-primary">
                    {t('what_is_your_business') || 'Quel est votre métier ?'}
                  </h3>
                  <p className="text-muted mt-2">
                    {t('business_type_desc') || 'Nous adapterons votre interface en conséquence'}
                  </p>
                </div>
                <BusinessTypeSelector
                  selectedType={selectedType}
                  onSelect={handleSelectType}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold !text-primary">
                    {t('select_your_modules') || 'Sélectionnez vos modules'}
                  </h3>
                  <p className="text-muted mt-2">
                    {t('modules_for') || 'Modules recommandés pour'} <span className="text-accent font-medium">{businessLabel}</span>
                  </p>
                </div>
                {selectedType && (
                  <ModuleSelector
                    businessType={selectedType}
                    selectedModules={selectedModules}
                    onToggle={handleToggleModule}
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 flex items-center justify-between border-t border-default pt-6">
            <div>
              {step === 'modules' ? (
                <button
                  onClick={handleBack}
                  disabled={isSaving}
                  className="px-4 py-2 !text-muted hover:!text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="px-4 py-2 !text-muted hover:!text-primary transition-colors underline"
                >
                  {t('skip_setup') || 'Configurer plus tard'}
                </button>
              )}
            </div>

            {step === 'business' ? (
              <button
                onClick={handleNext}
                disabled={!selectedType}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                  selectedType
                    ? 'bg-accent !text-white hover:bg-[var(--color-accent)]'
                    : 'bg-muted !text-muted cursor-not-allowed'
                }`}
              >
                {t('continue') || 'Continuer'}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSaving || !selectedType}
                className="px-6 py-2.5 rounded-xl font-medium bg-accent !text-white hover:bg-[var(--color-accent)] transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <IconSparkles className="w-4 h-4" />
                )}
                {t('start_eclipse') || 'Commencer'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

