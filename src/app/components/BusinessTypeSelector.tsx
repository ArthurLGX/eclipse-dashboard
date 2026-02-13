'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  IconCode,
  IconBuilding,
  IconPalette,
  IconBriefcase,
  IconCamera,
  IconSchool,
  IconHammer,
  IconDots,
  IconCheck,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { BusinessType, BUSINESS_CONFIGS, ALL_MODULES, getDefaultModules } from '@/config/business-modules';

interface BusinessTypeSelectorProps {
  selectedType: BusinessType | null;
  onSelect: (type: BusinessType) => void;
}

const BUSINESS_ICONS: Record<BusinessType, React.ReactNode> = {
  web_developer: <IconCode className="w-8 h-8" />,
  agency: <IconBuilding className="w-8 h-8" />,
  designer: <IconPalette className="w-8 h-8" />,
  consultant: <IconBriefcase className="w-8 h-8" />,
  photographer: <IconCamera className="w-8 h-8" />,
  coach: <IconSchool className="w-8 h-8" />,
  artisan: <IconHammer className="w-8 h-8" />,
  other: <IconDots className="w-8 h-8" />,
};

export function BusinessTypeSelector({ selectedType, onSelect }: BusinessTypeSelectorProps) {
  const { language } = useLanguage();

  const businessTypes = Object.entries(BUSINESS_CONFIGS) as [BusinessType, typeof BUSINESS_CONFIGS[BusinessType]][];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {businessTypes.map(([type, config], index) => {
        const isSelected = selectedType === type;
        const label = language === 'en' ? config.labelEn : config.label;
        
        return (
          <motion.button
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(type)}
            className={`
              relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all cursor-pointer
              ${isSelected 
                ? 'border-accent bg-accent-light shadow-lg shadow-accent-light' 
                : 'border-default bg-card hover:border-accent-light hover:bg-accent-light'
              }
            `}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
              >
                <IconCheck className="w-4 h-4 !text-white" />
              </motion.div>
            )}
            
            <div className={`
              p-3 rounded-xl transition-colors
              ${isSelected ? 'bg-accent !text-white' : 'bg-muted !text-muted'}
            `}>
              {BUSINESS_ICONS[type]}
            </div>
            
            <span className={`
              font-medium !text-center !text-sm
              ${isSelected ? '!text-accent' : '!text-primary'}
            `}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface ModuleSelectorProps {
  businessType: BusinessType;
  selectedModules: string[];
  onToggle: (moduleId: string) => void;
}

export function ModuleSelector({ businessType, selectedModules, onToggle }: ModuleSelectorProps) {
  const { language, t } = useLanguage();
  
  const defaultModules = getDefaultModules(businessType);

  return (
    <div className="space-y-6">
      {/* Modules recommandés */}
      <div>
        <h4 className="text-sm font-medium !text-muted mb-3">
          {t('recommended_modules') || 'Modules recommandés'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {defaultModules.map((moduleId) => {
            const moduleConfig = ALL_MODULES[moduleId];
            if (!moduleConfig) return null;
            
            const isSelected = selectedModules.includes(moduleId);
            const label = language === 'en' ? moduleConfig.labelEn : moduleConfig.label;
            
            return (
              <ModuleCard
                key={moduleId}
                moduleId={moduleId}
                label={label}
                isSelected={isSelected}
                isCore={moduleConfig.core}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      </div>

      {/* Modules optionnels */}
      {BUSINESS_CONFIGS[businessType].availableModules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium !text-muted mb-3">
            {t('optional_modules') || 'Modules optionnels'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BUSINESS_CONFIGS[businessType].availableModules.map((moduleId) => {
              const moduleConfig = ALL_MODULES[moduleId];
              if (!moduleConfig) return null;
              
              const isSelected = selectedModules.includes(moduleId);
              const label = language === 'en' ? moduleConfig.labelEn : moduleConfig.label;
              
              return (
                <ModuleCard
                  key={moduleId}
                  moduleId={moduleId}
                  label={label}
                  isSelected={isSelected}
                  isCore={false}
                  onToggle={onToggle}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  moduleId: string;
  label: string;
  isSelected: boolean;
  isCore: boolean;
  onToggle: (moduleId: string) => void;
}

function ModuleCard({ moduleId, label, isSelected, isCore, onToggle }: ModuleCardProps) {
  const { t } = useLanguage();
  
  return (
    <button
      onClick={() => !isCore && onToggle(moduleId)}
      disabled={isCore}
      className={`
        relative flex items-center gap-3 p-4 rounded-xl border transition-all
        ${isCore 
            ? 'border-success bg-success-light cursor-not-allowed' 
          : isSelected 
            ? 'border-accent bg-accent-light cursor-pointer' 
            : 'border-default bg-card hover:border-accent-light cursor-pointer'
        }
      `}
    >
      <div className={`
        w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
        ${isCore || isSelected 
          ? 'border-accent bg-accent' 
          : 'border-muted'
        }
      `}>
        {(isCore || isSelected) && (
          <IconCheck className="w-3 h-3 !text-white" />
        )}
      </div>
      
      <div className="flex-1 !text-left">
        <span className={`
          font-medium !text-sm
          ${isCore || isSelected ? 'text-primary' : 'text-muted'}
        `}>
          {label}
        </span>
        {isCore && (
          <span className="ml-2 !text-xs !text-success-text -text">
            ({t('included') || 'inclus'})
          </span>
        )}
      </div>
    </button>
  );
}

interface BusinessSetupWizardProps {
  onComplete: (businessType: BusinessType, modules: string[]) => void;
  onSkip?: () => void;
}

export function BusinessSetupWizard({ onComplete, onSkip }: BusinessSetupWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<'business' | 'modules'>('business');
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const handleSelectType = (type: BusinessType) => {
    setSelectedType(type);
    // Pré-sélectionner les modules par défaut
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
    } else if (step === 'modules' && selectedType) {
      onComplete(selectedType, selectedModules);
    }
  };

  const handleBack = () => {
    if (step === 'modules') {
      setStep('business');
    }
  };

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full !text-sm font-medium
          ${step === 'business' ? 'bg-accent !text-white' : 'bg-success !text-white'}
        `}>
          {step === 'modules' ? <IconCheck className="w-4 h-4" /> : '1'}
          <span>{t('your_business') || 'Votre métier'}</span>
        </div>
        <div className="w-8 h-0.5 bg-muted" />
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full !text-sm font-medium
          ${step === 'modules' ? 'bg-accent !text-white' : 'bg-muted !text-muted'}
        `}>
          <span>2</span>
          <span>{t('your_tools') || 'Vos outils'}</span>
        </div>
      </div>

      {/* Content */}
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
              {t('modules_desc') || 'Vous pourrez les modifier plus tard dans les paramètres'}
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-default">
        <div>
          {step === 'modules' ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 !text-muted hover:!text-primary transition-colors"
            >
              {t('back') || 'Retour'}
            </button>
          ) : onSkip ? (
            <button
              onClick={onSkip}
              className="px-4 py-2 !text-muted hover:!text-primary transition-colors underline"
            >
              {t('skip') || 'Passer'}
            </button>
          ) : null}
        </div>
        
        <button
          onClick={handleNext}
          disabled={!selectedType}
          className={`
            px-6 py-2.5 rounded-xl font-medium transition-all
            ${selectedType
              ? 'bg-accent !text-white hover:bg-accent-light'
              : 'bg-muted !text-muted cursor-not-allowed'
            }
          `}
        >
          {step === 'modules' 
            ? (t('finish') || 'Terminer')
            : (t('continue') || 'Continuer')
          }
        </button>
      </div>
    </div>
  );
}

