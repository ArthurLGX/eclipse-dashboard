'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {useLanguage} from '@/app/context/LanguageContext';

/**
 * ProgressiveTimeline - Animation premium de process flow linéaire
 * 
 * Représente le flux CRM comme une timeline horizontale progressive
 * avec branches d'automatisation
 * 
 * Principes appliqués:
 * 1. Progression de droite vers gauche
 * 2. Cartes qui entrent et sortent fluidement
 * 3. Branches d'automatisation
 * 4. Accélération progressive
 * 5. Dézoom final
 * 
 * Inspiré de Google Material Motion et Microsoft Fluent Motion
 */

interface TimelineStep {
  id: string;
  label: string;
  icon?: string;
  hasAutomation?: boolean;
  automationLabel?: string;
}

interface ProgressiveTimelineProps {
  showLabels?: boolean;
  autoRestart?: boolean;
  onComplete?: () => void;
}

const ProgressiveTimeline: React.FC<ProgressiveTimelineProps> = ({
  showLabels = true,
  autoRestart = true,
  onComplete
}) => {
  const { t } = useLanguage();
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [phase, setPhase] = useState(0); // 0: grid, 1: steps, 2: acceleration, 3: zoom out
  const [showBranches, setShowBranches] = useState<string[]>([]);
  const [animationKey, setAnimationKey] = useState(0);

  // Configuration des étapes du processus CRM (useMemo pour éviter les re-créations)
  const steps: TimelineStep[] = React.useMemo(() => [
    { 
      id: 'contact', 
      label: t('contact') || 'Contact', 
      icon: '👤',
      hasAutomation: false 
    },
    { 
      id: 'devis', 
      label: t('devis') || 'Devis', 
      icon: '📄',
      hasAutomation: true,
      automationLabel: t('generation_auto') || 'Génération auto'
    },
    { 
      id: 'relance', 
      label: t('relance') || 'Relance', 
      icon: '📧',
      hasAutomation: true,
      automationLabel: 'Relance auto'
    },
    { 
      id: 'contrat', 
      label: t('contrat') || 'Contrat', 
      icon: '✍️',
      hasAutomation: true,
      automationLabel: t('signature_electronique') || 'Signature électronique'
    },
    { 
      id: 'projet', 
      label: t('projet') || 'Projet', 
      icon: '🚀',
      hasAutomation: true,
      automationLabel: t('suivi_temps_reel') || 'Suivi temps réel'
    },
    { 
      id: 'facture', 
      label: t('facture') || 'Facture', 
      icon: '💰',
      hasAutomation: true,
      automationLabel: t('facturation_auto') || 'Facturation auto'
    },
    { 
      id: 'paiement', 
      label: t('paiement') || 'Paiement', 
      icon: '✅',
      hasAutomation: true,
      automationLabel: t('rappel_auto') || 'Rappel auto'
    },
  ], []);

  // Easing curves premium
  const materialEasing = [0.25, 0.1, 0.25, 1.0] as const;
  const fluentEasing = [0.16, 1, 0.3, 1] as const;

  // Séquence d'animation
  useEffect(() => {
    // Réinitialiser l'état
    setPhase(0);
    setActiveSteps([]);
    setShowBranches([]);

    const sequence = [
      // Phase 1: Grid apparaît
      { delay: 0, action: () => setPhase(1) },
      
      // Phase 2: Steps progressifs
      { delay: 800, action: () => setActiveSteps(['contact']) },
      { delay: 1600, action: () => setActiveSteps(['contact', 'devis']) },
      { delay: 1800, action: () => setShowBranches(['devis']) },
      { delay: 2600, action: () => setActiveSteps(['contact', 'devis', 'relance']) },
      { delay: 2800, action: () => setShowBranches(['devis', 'relance']) },
      { delay: 3600, action: () => setActiveSteps(['contact', 'devis', 'relance', 'contrat']) },
      { delay: 3800, action: () => setShowBranches(['devis', 'relance', 'contrat']) },
      
      // Phase 3: Accélération
      { delay: 4400, action: () => setPhase(2) },
      { delay: 4600, action: () => setActiveSteps(['devis', 'relance', 'contrat', 'projet']) },
      { delay: 4800, action: () => setShowBranches(['relance', 'contrat', 'projet']) },
      { delay: 5200, action: () => setActiveSteps(['relance', 'contrat', 'projet', 'facture']) },
      { delay: 5400, action: () => setShowBranches(['contrat', 'projet', 'facture']) },
      { delay: 5800, action: () => setActiveSteps(['contrat', 'projet', 'facture', 'paiement']) },
      { delay: 6000, action: () => setShowBranches(['projet', 'facture', 'paiement']) },
      
      // Phase 4: Zoom out
      { delay: 7500, action: () => setPhase(3) },
      { delay: 7700, action: () => setActiveSteps(steps.map(s => s.id)) },
      { delay: 7900, action: () => setShowBranches(steps.filter(s => s.hasAutomation).map(s => s.id)) },
      
      // Restart
      { delay: 11000, action: () => {
        if (onComplete) onComplete();
        if (autoRestart) {
          setAnimationKey(prev => prev + 1);
        }
      }},
    ];

    const timers = sequence.map(({ delay, action }) =>
      setTimeout(action, delay)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Grid fine */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.08 : 0 }}
        transition={{ duration: 2, ease: materialEasing }}
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border-muted) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border-muted) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Timeline container */}
      <motion.div
        animate={{
          scale: phase === 3 ? 0.85 : 1,
          y: phase === 3 ? -20 : 0,
        }}
        transition={{ duration: 1.5, ease: fluentEasing }}
        className="relative w-full max-w-5xl h-[500px] flex items-center justify-center"
      >
        {/* Ligne centrale de la timeline - masquée en phase 3 */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ 
            scaleX: phase >= 1 && phase < 3 ? 1 : 0,
            opacity: phase < 3 ? 1 : 0,
          }}
          transition={{ duration: phase === 3 ? 0.8 : 1.5, ease: fluentEasing }}
          className="absolute top-1/2 left-0 right-0 h-px bg-muted"
          style={{ transformOrigin: 'left' }}
        />

        {/* Container des steps avec défilement */}
        <div className="relative w-full h-full flex items-center overflow-hidden">
          {/* Cercle d'orbite pour phase 3 */}
          <AnimatePresence>
            {phase === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 0.15, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 1.2, ease: fluentEasing }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-accent rounded-full"
              />
            )}
          </AnimatePresence>

          {/* Élément central pour phase 3 */}
          <AnimatePresence>
            {phase === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 1, ease: fluentEasing, delay: 0.3 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.15, 1],
                      opacity: [0.2, 0.35, 0.2],
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{ 
                      background: 'radial-gradient(circle, var(--color-accent), transparent)',
                    }}
                  />
                  <div className="relative w-20 h-20 rounded-full backdrop-blur-xl border-2 border-accent bg-card flex items-center justify-center shadow-lg">
                    <span className="!text-xs font-bold text-primary uppercase tracking-wider">
                      Client
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="sync">
            {steps.map((step, index) => {
              const stepIndex = activeSteps.indexOf(step.id);
              const isVisible = stepIndex >= 0;
              
              // Position radiale pour phase 3
              const radius = 160;
              const angle = (index * 360 / steps.length) * (Math.PI / 180);
              const radialX = Math.cos(angle) * radius;
              const radialY = Math.sin(angle) * radius;
              
              // Position: glissement vers la gauche en phase 1-2, radial en phase 3
              const spacing = 150;
              const totalWidth = (activeSteps.length - 1) * spacing;
              const position = phase === 3 
                ? 0 // Centre pour position radiale
                : stepIndex * spacing - totalWidth; // Centré autour de l'axe

              const shouldShowBranch = showBranches.includes(step.id) && step.hasAutomation && phase < 3;

              return (
                <React.Fragment key={step.id}>
                  {/* Step principal */}
                  {isVisible && (
                    <motion.div
                      layoutId={`step-${step.id}`}
                      initial={{ 
                        opacity: 0,
                        x: 200,
                        scale: 0.8,
                        filter: 'blur(8px)',
                      }}
                      animate={{ 
                        opacity: 1,
                        x: phase === 3 ? radialX : position,
                        y: phase === 3 ? radialY : 0,
                        scale: phase === 3 ? 0.8 : 1,
                        filter: 'blur(0px)',
                      }}
                      exit={{ 
                        opacity: 0,
                        x: -100,
                        filter: 'blur(6px)',
                      }}
                      transition={{
                        duration: phase === 2 ? 0.6 : (phase === 3 ? 1.5 : 1.2),
                        ease: fluentEasing,
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      {/* Carte du step */}
                      <motion.div
                        whileHover={phase < 3 ? { scale: 1.05, y: -5 } : {}}
                        initial={false}
                        animate={phase === 3 ? {
                          borderRadius: ["1rem", "1rem", "50%", "50%"],
                          width: ["140px", "80px", "80px", "80px"],
                          height: ["auto", "80px", "80px", "80px"],
                          padding: ["1rem", "0", "0", "0"],
                        } : {
                          borderRadius: "1rem",
                          width: "140px",
                          height: "auto",
                          padding: "1rem",
                        }}
                        transition={phase === 3 ? { 
                          duration: 1.8,
                          ease: "easeInOut",
                          times: [0, 0.3, 0.7, 1],
                        } : {
                          duration: 0.6,
                          ease: fluentEasing,
                        }}
                        className="relative flex flex-col items-center justify-center backdrop-blur-xl border border-default cursor-pointer"
                        style={{
                          background: 'transparent',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          minWidth: phase === 3 ? '80px' : '140px',
                          gap: phase === 3 ? '0' : '0.75rem',
                        }}
                      >
                        {/* Icon */}
                        <motion.div
                          animate={{ 
                            scale: phase === 3 ? 1 : [1, 1.1, 1],
                          }}
                          transition={{ 
                            scale: {
                              duration: 2,
                              repeat: phase === 3 ? 0 : Infinity,
                              ease: "easeInOut",
                              delay: index * 0.2,
                            },
                          }}
                          className="text-2xl"
                        >
                          {step.icon}
                        </motion.div>

                        {/* Label - masqué en phase 3 */}
                        <AnimatePresence>
                          {showLabels && phase < 3 && (
                            <motion.span
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.6 }}
                              className="text-sm font-medium text-primary text-center"
                            >
                              {step.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Point de connexion timeline - masqué en phase 3 */}
                        {phase < 3 && (
                          <motion.div
                            className="absolute top-1/2 -left-2 w-4 h-4 rounded-full border-2 border-accent bg-page"
                            animate={{
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: index * 0.2,
                            }}
                          />
                        )}
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Ligne de connexion radiale pour phase 3 */}
                  {isVisible && phase === 3 && (
                    <motion.svg
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <motion.line
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 0.8, ease: fluentEasing }}
                        x1="50%"
                        y1="50%"
                        x2={`calc(50% + ${radialX}px)`}
                        y2={`calc(50% + ${radialY}px)`}
                        stroke="var(--color-accent)"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        strokeDasharray="4 4"
                      />
                    </motion.svg>
                  )}

                  {/* Branche d'automatisation */}
                  <AnimatePresence>
                    {shouldShowBranch && (
                      <motion.div
                        layoutId={`branch-${step.id}`}
                        initial={{ 
                          opacity: 0,
                          scale: 0.8,
                          y: -5,
                        }}
                        animate={{ 
                          opacity: 0.8,
                          scale: 1,
                          y: 0,
                          x: position,
                        }}
                        exit={{ 
                          opacity: 0,
                        }}
                        transition={{
                          y: {
                            duration: 0.1,
                            ease: fluentEasing,
                            delay: 0,
                          },
                          x: {
                            duration: phase === 2 ? 0.1 : 1.2,
                            ease: fluentEasing,
                          },
                          opacity: {
                            duration: 0.4,
                          },
                          scale: {
                            duration: 0.6,
                            ease: fluentEasing,
                          },
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[140px]"
                      >
                        {/* Ligne de connexion */}
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 40, opacity: 1 }}
                          transition={{ 
                            height: { duration: 0.1, ease: fluentEasing, delay: 0.1 },
                            opacity: { duration: 0.1, delay: 0.1}
                          }}
                          className="absolute top-full left-1/2 -translate-x-1/2 w-px mt-2"
                          style={{
                            background: 'linear-gradient(to bottom, var(--color-accent), transparent)',
                          }}
                        />

                        {/* Badge automatisation */}
                        <motion.div
                          animate={{
                            boxShadow: [
                              '0 0 0 0 rgba(255, 56, 11, 0)',
                              '0 0 20px 4px rgba(255, 56, 11, 0.3)',
                              '0 0 0 0 rgba(255, 56, 11, 0)',
                            ],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="px-3 py-1.5 rounded-full backdrop-blur-xl border border-accent bg-accent-light"
                        >
                          <span className="text-[10px] font-medium text-primary whitespace-nowrap">
                            ⚡ {step.automationLabel}
                          </span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Texte final */}
      <AnimatePresence>
        {phase === 3 && (
          <motion.div
            initial={{ 
              opacity: 0,
              y: 100,
              filter: 'blur(4px)',
            }}
            animate={{ 
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5,
              delay: 1,
              ease: fluentEasing
            }}
            className="absolute bottom-12 text-center space-y-2"
          >
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 1 }}
              className=" font-extralight text-lg tracking-wide"
            >
              Tout votre business <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.1, duration: 1 }}
                className="!text-accent-text font-bold">dans un seul flux</motion.span>
            </motion.p>
        
           
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicateur de progression */}
      <AnimatePresence>
        {phase >= 1 && phase < 3 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border border-default bg-card/">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full"
              />
              <span className="!text-xs text-secondary">{t('flux_in_progress') || 'Flux en cours...'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgressiveTimeline;
