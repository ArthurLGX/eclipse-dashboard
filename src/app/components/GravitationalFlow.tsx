'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * GravitationalFlow - Animation premium de process flow CRM
 * 
 * Inspiré des standards de motion design de Google Material Motion et Microsoft Fluent Motion
 * 
 * Principes appliqués:
 * 1. Apparition progressive (opacity + scale + blur)
 * 2. Easing sophistiqués (Google Material: [0.25, 0.1, 0.25, 1.0], MS Fluent: [0.16, 1, 0.3, 1])
 * 3. Attraction gravitationnelle logique
 * 4. États fantômes pour éléments inexistants
 * 5. Spatialité et continuité (layout/layoutId)
 * 6. Animation lente mais vivante (30s orbit rotation)
 * 7. Spring damped (stiffness: 80, damping: 20)
 * 
 * @param showLabels - Afficher les labels des éléments (défaut: true)
 * @param autoRestart - Redémarrer automatiquement l'animation (défaut: true)
 * @param onComplete - Callback appelé à la fin de l'animation
 */

interface GravitationalFlowProps {
  showLabels?: boolean;
  autoRestart?: boolean;
  onComplete?: () => void;
}

const GravitationalFlow: React.FC<GravitationalFlowProps> = ({ 
  showLabels = true, 
  autoRestart = true,
  onComplete 
}) => {
  const [phase, setPhase] = useState(0);
  const [activeElements, setActiveElements] = useState<string[]>([]);

  // Configuration des éléments orbitaux
  const orbitalElements = [
    { id: 'contact', label: 'Contact', angle: 0 },
    { id: 'devis', label: 'Devis', angle: 60 },
    { id: 'contrat', label: 'Contrat', angle: 120 },
    { id: 'projet', label: 'Projet', angle: 180 },
    { id: 'facture', label: 'Facture', angle: 240 },
    { id: 'paiement', label: 'Paiement', angle: 300 },
  ];

  // Séquence d'animation sophistiquée
  useEffect(() => {
    const sequence = [
      { delay: 0, action: () => setPhase(1) }, // Grid apparaît
      { delay: 1500, action: () => setPhase(2) }, // Client apparaît
      { delay: 2500, action: () => setPhase(3) }, // Orbite de référence
      { delay: 3200, action: () => setActiveElements(['contact']) },
      { delay: 4000, action: () => setActiveElements(['contact', 'devis']) },
      { delay: 4800, action: () => setActiveElements(['contact', 'devis', 'contrat']) },
      { delay: 5600, action: () => setActiveElements(['contact', 'devis', 'contrat', 'projet']) },
      { delay: 6400, action: () => setActiveElements(['contact', 'devis', 'contrat', 'projet', 'facture']) },
      { delay: 7200, action: () => setActiveElements(['contact', 'devis', 'contrat', 'projet', 'facture', 'paiement']) },
      { delay: 8500, action: () => setPhase(4) }, // Orbital rotation
      { delay: 12000, action: () => setPhase(5) }, // Zoom out + logo
      { delay: 15000, action: () => {
        onComplete?.();
        if (autoRestart) {
          setPhase(0);
          setActiveElements([]);
        }
      }},
    ];

    const timers = sequence.map(({ delay, action }) =>
      setTimeout(action, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [phase === 0, autoRestart, onComplete]);

  const radius = 160;

  // Easing curves - Standards Google/Microsoft
  const materialEasing = [0.25, 0.1, 0.25, 1.0] as const; // Google Material Motion
  const fluentEasing = [0.16, 1, 0.3, 1] as const; // Microsoft Fluent Motion

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Grid fine quasi-invisible avec apparition douce */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.12 : 0 }}
        transition={{ 
          duration: 2.5,
          ease: materialEasing
        }}
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border-muted) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border-muted) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 0%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 0%, transparent 85%)',
        }}
      />

      {/* Orbite de référence - Apparition fluide */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            layoutId="orbit-ring"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: phase === 5 ? 0 : 0.15,
              scale: phase === 5 ? 0.5 : 1,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              duration: 1.8,
              ease: fluentEasing
            }}
            className="absolute w-80 h-80 border border-default rounded-full"
            style={{ 
              boxShadow: '0 0 40px rgba(0,0,0,0.1)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Cercle central - Client/Projet avec breathing effect */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            layoutId="central-node"
            initial={{ 
              opacity: 0, 
              scale: 0,
              filter: 'blur(10px)'
            }}
            animate={{ 
              opacity: phase === 5 ? 0.6 : 1,
              scale: phase === 5 ? 0.4 : 1,
              filter: phase === 5 ? 'blur(2px)' : 'blur(0px)',
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.5,
              filter: 'blur(8px)'
            }}
            transition={{
              duration: 1.5,
              ease: fluentEasing,
            }}
            className="absolute z-20"
          >
            <div className="relative">
              {/* Glow background */}
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
              
              {/* Main circle */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.02, 1],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative w-24 h-24 rounded-full backdrop-blur-xl border border-default flex items-center justify-center"
                style={{
                  background: 'transparent',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
              >
                {showLabels && (
                  <span className="!text-xs font-semibold text-primary uppercase tracking-wider">
                    Client
                  </span>
                )}
              </motion.div>

              {/* Subtle pulse ring */}
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                className="absolute inset-0 rounded-full border-2 border-default"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Éléments orbitaux - Attraction gravitationnelle */}
      {orbitalElements.map((element, index) => {
        const isActive = activeElements.includes(element.id);
        const isGhost = phase >= 3 && !isActive;
        const angle = element.angle * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <React.Fragment key={element.id}>
            {/* Ligne de connexion - Apparition retardée après l'élément */}
            <AnimatePresence>
              {isActive && phase < 5 && (
                <motion.svg
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.25 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 1.2,
                    delay: 0.4, // Retard volontaire après l'élément
                    ease: materialEasing
                  }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                >
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ 
                      duration: 1.5,
                      delay: 0.4,
                      ease: fluentEasing
                    }}
                    x1="50%"
                    y1="50%"
                    x2={`calc(50% + ${x}px)`}
                    y2={`calc(50% + ${y}px)`}
                    stroke="var(--border-muted)"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                    strokeDasharray="4 4"
                  />
                </motion.svg>
              )}
            </AnimatePresence>

            {/* État fantôme - Éléments inexistants */}
            {isGhost && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute z-10"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <div 
                  className="w-14 h-14 rounded-full border border-muted"
                  style={{
                    background: 'transparent',
                  }}
                />
              </motion.div>
            )}

            {/* Élément actif - Attraction gravitationnelle */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId={`orbital-${element.id}`}
                  initial={{ 
                    opacity: 0, 
                    scale: 0.3,
                    x: 0,
                    y: -200,
                    filter: 'blur(8px)',
                  }}
                  animate={{ 
                    opacity: phase === 5 ? 0.5 : 1,
                    scale: phase === 5 ? 0.35 : 1,
                    x: phase === 5 ? x * 0.4 : x,
                    y: phase === 5 ? y * 0.4 : y,
                    filter: phase === 5 ? 'blur(2px)' : 'blur(0px)',
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.5,
                    filter: 'blur(6px)',
                  }}
                  transition={{
                    opacity: { duration: 1.2, ease: materialEasing },
                    scale: { 
                      type: "spring",
                      stiffness: 80,
                      damping: 20,
                      mass: 1.2,
                    },
                    x: { 
                      duration: 1.8,
                      ease: fluentEasing,
                    },
                    y: { 
                      duration: 1.8,
                      ease: fluentEasing,
                    },
                    filter: { duration: 0.8 },
                  }}
                  className="absolute z-15"
                  style={{
                    left: '50%',
                    top: '50%',
                    marginLeft: '-28px',
                    marginTop: '-28px',
                  }}
                >
                  {/* Glow pour chaque élément */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.3,
                    }}
                    className="absolute inset-0 rounded-full blur-lg"
                    style={{ 
                      background: 'radial-gradient(circle, var(--color-accent), transparent)',
                    }}
                  />

                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative w-14 h-14 rounded-full backdrop-blur-xl border border-default flex items-center justify-center cursor-pointer"
                    style={{
                      background: 'transparent',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    }}
                  >
                    {showLabels && (
                      <span className="text-[10px] font-medium text-secondary text-center px-1">
                        {element.label}
                      </span>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </React.Fragment>
        );
      })}

      {/* Rotation orbitale lente */}
      <AnimatePresence>
        {phase === 4 && (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Texte final avec apparition sophistiquée */}
      <AnimatePresence>
        {phase === 5 && (
          <motion.div
            initial={{ 
              opacity: 0, 
              y: 30,
              filter: 'blur(4px)',
            }}
            animate={{ 
              opacity: 1, 
              y: 0,
              filter: 'blur(0px)',
            }}
            exit={{ 
              opacity: 0,
              y: -20,
              filter: 'blur(4px)',
            }}
            transition={{ 
              duration: 1.5,
              delay: 0.8,
              ease: fluentEasing
            }}
            className="absolute bottom-12 text-center space-y-2"
          >
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="text-primary font-medium text-lg tracking-wide"
            >
              Tout votre business.
            </motion.p>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="text-accent text-sm font-light tracking-wider"
            >
              Un seul flux.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GravitationalFlow;
