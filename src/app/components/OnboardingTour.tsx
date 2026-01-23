'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconChevronRight, IconCheck, IconPlayerPlay, IconSparkles } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingStep {
  id: string;
  // Target element selector (CSS selector) - if null, shows centered overlay
  target?: string;
  // Position of tooltip relative to target
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  // Content
  title: string;
  description: string;
  // Optional micro-copy (smaller text below description)
  microCopy?: string;
  // CTA button text
  ctaText?: string;
  // Skip button text (if different from default)
  skipText?: string;
  // Action to perform when step is reached
  onEnter?: () => void;
  // Action to perform when leaving step
  onExit?: () => void;
  // Custom action on CTA click (if not just "next")
  onAction?: () => void;
  // Highlight style
  highlightStyle?: 'default' | 'pulse' | 'glow';
  // Delay before showing this step (ms)
  delay?: number;
  // Auto-advance after delay (ms)
  autoAdvance?: number;
}

interface OnboardingTourProps {
  tourId: string; // Unique ID for localStorage persistence
  steps: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  // Force show even if already completed
  forceShow?: boolean;
  // Start from specific step
  startStep?: number;
  // Custom class for the overlay
  overlayClass?: string;
}

// ============================================================================
// HOOK - Check if tour was completed
// ============================================================================

export function useOnboardingStatus(tourId: string) {
  const [isCompleted, setIsCompleted] = useState(true); // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(`onboarding_${tourId}_completed`) === 'true';
    setIsCompleted(completed);
    setIsLoading(false);
  }, [tourId]);

  const markCompleted = useCallback(() => {
    localStorage.setItem(`onboarding_${tourId}_completed`, 'true');
    setIsCompleted(true);
  }, [tourId]);

  const reset = useCallback(() => {
    localStorage.removeItem(`onboarding_${tourId}_completed`);
    setIsCompleted(false);
  }, [tourId]);

  return { isCompleted, isLoading, markCompleted, reset };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function OnboardingTour({
  tourId,
  steps,
  onComplete,
  onSkip,
  forceShow = false,
  startStep = 0,
  overlayClass = '',
}: OnboardingTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(startStep);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isCompleted, markCompleted } = useOnboardingStatus(tourId);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Initialize visibility
  useEffect(() => {
    if (forceShow || !isCompleted) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow, isCompleted]);

  // Update target position
  useEffect(() => {
    if (!step?.target || !isVisible) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    // Initial position
    const timer = setTimeout(updatePosition, step.delay || 100);

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [step, isVisible]);

  // Call onEnter when step changes
  useEffect(() => {
    if (isVisible && step?.onEnter) {
      step.onEnter();
    }
  }, [currentStep, isVisible, step]);

  // Auto-advance
  useEffect(() => {
    if (!isVisible || !step?.autoAdvance) return;

    const timer = setTimeout(() => {
      handleNext();
    }, step.autoAdvance);

    return () => clearTimeout(timer);
  }, [currentStep, isVisible, step]);

  const handleNext = useCallback(() => {
    if (step?.onExit) {
      step.onExit();
    }

    if (step?.onAction) {
      step.onAction();
    }

    if (isLastStep) {
      markCompleted();
      setIsVisible(false);
      onComplete?.();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [step, isLastStep, markCompleted, onComplete]);

  const handleSkip = useCallback(() => {
    markCompleted();
    setIsVisible(false);
    onSkip?.();
  }, [markCompleted, onSkip]);

  // Calculate tooltip position
  const getTooltipStyle = useCallback((): React.CSSProperties => {
    if (!targetRect || step?.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 24;
    const tooltipWidth = 420;
    const tooltipHeight = 280;

    let top = 0;
    let left = 0;

    switch (step?.position || 'bottom') {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding;
        break;
    }

    // Clamp to viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    return {
      position: 'fixed',
      top,
      left,
    };
  }, [targetRect, step]);

  if (!isVisible || !step) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay with larger spotlight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[9998] ${overlayClass}`}
            style={{
              background: targetRect
                ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 80}px, rgba(0,0,0,0.9) ${Math.max(targetRect.width, targetRect.height) / 2 + 200}px)`
                : 'rgba(0,0,0,0.9)',
            }}
            onClick={handleSkip}
          />

          {/* Highlight ring around target - larger padding */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: step.highlightStyle === 'pulse' 
                  ? ['0 0 0 0 rgba(139, 92, 246, 0.5)', '0 0 0 30px rgba(139, 92, 246, 0)', '0 0 0 0 rgba(139, 92, 246, 0.5)']
                  : step.highlightStyle === 'glow'
                    ? '0 0 60px rgba(139, 92, 246, 0.8), 0 0 100px rgba(139, 92, 246, 0.4)'
                    : '0 0 0 8px rgba(139, 92, 246, 0.3)',
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                boxShadow: step.highlightStyle === 'pulse' ? { duration: 1.5, repeat: Infinity } : undefined 
              }}
              className="fixed z-[9999] rounded-2xl pointer-events-none border-2 border-accent"
              style={{
                top: targetRect.top - 20,
                left: targetRect.left - 20,
                width: targetRect.width + 40,
                height: targetRect.height + 40,
              }}
            />
          )}

          {/* Tooltip - larger size */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed z-[10000] w-[420px] bg-card border-2 border-accent rounded-2xl shadow-2xl overflow-hidden"
            style={getTooltipStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="h-1.5 bg-muted">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
                  <IconSparkles size={20} className="!text-accent" />
                </div>
                <span className="text-sm text-secondary font-medium">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="p-2 rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors"
                title={t('skip') || 'Passer'}
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-5">
              <h3 className="text-xl font-bold text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-base text-secondary leading-relaxed">
                {step.description}
              </p>
              {step.microCopy && (
                <p className="text-sm text-muted mt-3 italic">
                  {step.microCopy}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm text-muted hover:text-primary transition-colors"
              >
                {step.skipText || t('skip_tutorial') || 'Passer le tutoriel'}
              </button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent text-white rounded-xl font-semibold text-sm transition-colors shadow-lg"
              >
                {isLastStep ? (
                  <>
                    <IconCheck size={18} />
                    {step.ctaText || t('understood') || 'Compris'}
                  </>
                ) : (
                  <>
                    {step.ctaText || t('next') || 'Suivant'}
                    <IconChevronRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// REPLAY BUTTON COMPONENT
// ============================================================================

export function OnboardingReplayButton({
  tourId,
  onReplay,
  label,
}: {
  tourId: string;
  onReplay: () => void;
  label?: string;
}) {
  const { t } = useLanguage();
  const { isCompleted } = useOnboardingStatus(tourId);

  if (!isCompleted) return null;

  return (
    <button
      onClick={onReplay}
      className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-accent bg-muted hover:bg-accent-light rounded-lg transition-all"
      title={label || t('replay_tutorial') || 'Revoir le tutoriel'}
    >
      <IconPlayerPlay size={14} className="!text-accent" />
      {label || t('tutorial') || 'Tutoriel'}
    </button>
  );
}

