'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconBuilding,
  IconMail,
  IconSignature,
  IconSend,
  IconCheck,
  IconChevronRight,
  IconX,
  IconSparkles,
  IconRocket,
  IconArrowRight,
} from '@tabler/icons-react';
import { useOnboarding, OnboardingStep } from '@/app/context/OnboardingContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';

interface StepConfig {
  id: OnboardingStep;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  route: string;
}

export default function OnboardingWizard() {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    currentStep,
    completedSteps,
    isOnboardingComplete,
    showOnboarding,
    closeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  const [isClosing, setIsClosing] = useState(false);

  const steps: StepConfig[] = [
    {
      id: 'company',
      icon: <IconBuilding className="w-6 h-6" />,
      title: t('onboarding_company_title') || 'Votre entreprise',
      description: t('onboarding_company_desc') || 'Configurez les informations de votre entreprise pour personnaliser vos documents.',
      action: t('onboarding_company_action') || 'Configurer',
      route: '/dashboard/profile/your-company',
    },
    {
      id: 'smtp',
      icon: <IconMail className="w-6 h-6" />,
      title: t('onboarding_smtp_title') || 'Configuration email',
      description: t('onboarding_smtp_desc') || 'Connectez votre compte email (Gmail, Outlook...) pour envoyer des emails.',
      action: t('onboarding_smtp_action') || 'Connecter',
      route: '/dashboard/settings?tab=email',
    },
    {
      id: 'signature',
      icon: <IconSignature className="w-6 h-6" />,
      title: t('onboarding_signature_title') || 'Signature email',
      description: t('onboarding_signature_desc') || 'Créez une signature professionnelle pour vos emails et newsletters.',
      action: t('onboarding_signature_action') || 'Créer',
      route: '/dashboard/settings?tab=email',
    },
    {
      id: 'first-email',
      icon: <IconSend className="w-6 h-6" />,
      title: t('onboarding_email_title') || 'Premier envoi',
      description: t('onboarding_email_desc') || 'Envoyez votre première newsletter ou email à vos contacts.',
      action: t('onboarding_email_action') || 'Envoyer',
      route: '/dashboard/newsletters/compose',
    },
  ];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeOnboarding();
      setIsClosing(false);
    }, 300);
  };

  const handleSkip = () => {
    skipOnboarding();
  };

  const handleStepClick = (step: StepConfig) => {
    closeOnboarding();
    router.push(step.route);
  };

  const getStepStatus = (stepId: OnboardingStep): 'completed' | 'current' | 'pending' => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (currentStep === stepId) return 'current';
    return 'pending';
  };

  const completedCount = completedSteps.filter(s => s !== 'completed').length;
  const totalSteps = steps.length;
  const progressPercent = (completedCount / totalSteps) * 100;

  if (!showOnboarding || isOnboardingComplete) return null;

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-card border border-default  shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-accent/20 via-accent-light to-transparent">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 !text-muted hover:!text-primary  hover:bg-white/10 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-accent-light ">
                  <IconSparkles className="w-8 h-8 !text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold !text-primary">
                    {t('onboarding_welcome') || 'Bienvenue sur Eclipse !'}
                  </h2>
                  <p className="text-muted">
                    {t('onboarding_subtitle') || 'Configurons votre espace en quelques étapes'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between !text-sm !text-muted mb-2">
                  <span>{completedCount}/{totalSteps} {t('steps_completed') || 'étapes complétées'}</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="p-8 space-y-4">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      relative flex items-center gap-4 p-4  border transition-all cursor-pointer
                      ${status === 'completed' 
                        ? 'bg-success-light border-success' 
                        : status === 'current'
                          ? 'bg-accent-light border-accent shadow-lg shadow-accent/20'
                          : 'bg-card border-default hover:border-accent-light'
                      }
                    `}
                    onClick={() => handleStepClick(step)}
                  >
                    {/* Step number/icon */}
                    <div className={`
                      flex items-center justify-center w-12 h-12  shrink-0
                      ${status === 'completed'
                        ? 'bg-success !text-white'
                        : status === 'current'
                          ? 'bg-accent !text-white'
                          : 'bg-muted !text-muted'
                      }
                    `}>
                      {status === 'completed' ? (
                        <IconCheck className="w-6 h-6" />
                      ) : (
                        step.icon
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${
                        status === 'completed' ? 'text-primary' 
                        : status === 'current' ? 'text-accent' 
                        : 'text-muted'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-sm line-clamp-1 ${
                        status === 'completed' ? 'text-secondary' 
                        : status === 'current' ? 'text-secondary' 
                        : 'text-muted'
                      }`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {status === 'completed' ? (
                        <span className="text-sm !text-success-text -text font-medium">
                          {t('completed') || 'Terminé'}
                        </span>
                      ) : (
                        <span className={`
                          flex items-center gap-1 !text-sm font-medium
                          ${status === 'current' ? 'text-accent' : 'text-muted'}
                        `}>
                          {step.action}
                          <IconChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="group !text-sm flex items-center gap-1 !text-muted hover:!text-primary transition-all ease-in-out duration-300 cursor-pointer underline hover:no-underline"
              >
                {t('skip_for_now') || 'Passer pour le moment'}
                <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {completedCount >= 3 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleClose}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent !text-white  font-medium hover:bg-[var(--color-accent)] transition-colors"
                >
                  <IconRocket className="w-5 h-5" />
                  {t('start_using') || 'Commencer à utiliser Eclipse'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

