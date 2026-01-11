'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconListCheck,
  IconClock,
  IconFileInvoice,
  IconChartBar,
  IconUsers,
  IconRocket,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface TourStep {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: React.ReactNode;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
}

interface ProjectGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  projectTitle?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '🎉 Votre projet est prêt !',
    titleEn: '🎉 Your project is ready!',
    description: 'Bienvenue dans votre espace projet. Suivez ce guide pour découvrir les fonctionnalités clés et mener à bien votre mission.',
    descriptionEn: 'Welcome to your project space. Follow this guide to discover key features and successfully complete your mission.',
    icon: <IconRocket className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'tasks',
    title: '📋 Gérez vos tâches',
    titleEn: '📋 Manage your tasks',
    description: 'Vos tâches sont créées automatiquement. Cochez-les au fur et à mesure, ajoutez des dates de début/fin pour voir votre Gantt.',
    descriptionEn: 'Your tasks are created automatically. Check them off as you go, add start/end dates to see your Gantt chart.',
    icon: <IconListCheck className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'time_tracking',
    title: '⏱️ Suivez votre temps',
    titleEn: '⏱️ Track your time',
    description: 'Lancez le timer sur vos tâches pour mesurer votre temps réel vs estimé. C\'est la clé de votre rentabilité !',
    descriptionEn: 'Start the timer on your tasks to measure actual vs estimated time. This is the key to your profitability!',
    icon: <IconClock className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'quote',
    title: '📄 Créez un devis',
    titleEn: '📄 Create a quote',
    description: 'Une fois vos tâches définies, créez un devis basé sur vos estimations. Envoyez-le directement à votre client.',
    descriptionEn: 'Once your tasks are defined, create a quote based on your estimates. Send it directly to your client.',
    icon: <IconFileInvoice className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'profitability',
    title: '📊 Surveillez la rentabilité',
    titleEn: '📊 Monitor profitability',
    description: 'Le bloc "Rentabilité" vous montre en temps réel si vous êtes dans les clous ou si vous dépassez vos estimations.',
    descriptionEn: 'The "Profitability" block shows you in real-time if you\'re on track or exceeding your estimates.',
    icon: <IconChartBar className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'collaboration',
    title: '👥 Invitez votre client',
    titleEn: '👥 Invite your client',
    description: 'Partagez un lien public pour que votre client suive l\'avancement. Transparence et confiance garanties !',
    descriptionEn: 'Share a public link so your client can track progress. Transparency and trust guaranteed!',
    icon: <IconUsers className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'complete',
    title: '🚀 Prêt à démarrer !',
    titleEn: '🚀 Ready to start!',
    description: 'Vous avez toutes les clés en main. Commencez par cocher votre première tâche et lancez le timer. Bonne mission !',
    descriptionEn: 'You have all the keys in hand. Start by checking your first task and launch the timer. Good mission!',
    icon: <IconRocket className="w-8 h-8" />,
    position: 'center',
  },
];

const STORAGE_KEY = 'eclipse_project_tour_completed';

export default function ProjectGuidedTour({
  isOpen,
  onClose,
  onComplete,
  projectTitle,
}: ProjectGuidedTourProps) {
  const { language, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if tour was already completed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed === 'true' && isOpen) {
        onComplete();
      }
    }
  }, [isOpen, onComplete]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
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

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete tour
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      onComplete();
    }
    
    setTimeout(() => setIsAnimating(false), 300);
  }, [currentStep, isAnimating, onComplete]);

  const handlePrev = useCallback(() => {
    if (isAnimating || currentStep === 0) return;
    setIsAnimating(true);
    setCurrentStep(prev => prev - 1);
    setTimeout(() => setIsAnimating(false), 300);
  }, [currentStep, isAnimating]);

  const handleSkip = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handleSkip();
    if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
  }, [handleSkip, handleNext, handlePrev]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const title = language === 'en' ? step.titleEn : step.title;
  const description = language === 'en' ? step.descriptionEn : step.description;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop with blur */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleSkip}
        />

        {/* Tour Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="bg-card rounded-2xl shadow-2xl border border-default overflow-hidden">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-default bg-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentStep 
                          ? 'bg-accent w-6' 
                          : idx < currentStep 
                            ? 'bg-success' 
                            : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="p-1 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors"
                aria-label="Fermer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-success"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Icon with animated background */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="relative"
                    >
                      {/* Animated rings */}
                      <motion.div
                        className="absolute inset-0 rounded-full bg-accent/20"
                        animate={{
                          scale: [1, 1.5, 1.5],
                          opacity: [0.5, 0, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                        style={{ width: 80, height: 80, margin: -12 }}
                      />
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent">
                        {step.icon}
                      </div>
                    </motion.div>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-primary text-center">
                    {title}
                  </h2>

                  {/* Project title badge (first step only) */}
                  {currentStep === 0 && projectTitle && (
                    <div className="flex justify-center">
                      <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                        {projectTitle}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-secondary text-center leading-relaxed">
                    {description}
                  </p>

                  {/* Animated arrow indicator */}
                  <div className="flex justify-center pt-2">
                    <motion.div
                      animate={{
                        x: [0, 10, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-accent"
                    >
                      <IconArrowRight className="w-6 h-6" />
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer with navigation */}
            <div className="flex items-center justify-between p-4 border-t border-default bg-muted">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentStep === 0
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-secondary hover:text-primary hover:bg-hover'
                }`}
              >
                <IconArrowLeft className="w-4 h-4" />
                {t('previous') || 'Précédent'}
              </button>

              <span className="text-sm text-secondary">
                {currentStep + 1} / {TOUR_STEPS.length}
              </span>

              <button
                onClick={handleNext}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isLastStep
                    ? 'bg-success text-white hover:bg-success/90'
                    : 'bg-accent text-white hover:bg-accent/90'
                }`}
              >
                {isLastStep ? (
                  <>
                    <IconCheck className="w-4 h-4" />
                    {t('start') || 'Commencer'}
                  </>
                ) : (
                  <>
                    {t('next') || 'Suivant'}
                    <IconArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Skip link */}
            <div className="px-4 pb-4 text-center">
              <button
                onClick={handleSkip}
                className="text-sm text-secondary hover:text-primary transition-colors underline"
              >
                {t('skip_tour') || 'Ne plus afficher ce guide'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage tour state
export function useProjectGuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string | undefined>();

  const openTour = useCallback((title?: string) => {
    // Check if tour was already completed
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed !== 'true') {
        setProjectTitle(title);
        setIsOpen(true);
      }
    }
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    isOpen,
    projectTitle,
    openTour,
    closeTour,
    resetTour,
  };
}

