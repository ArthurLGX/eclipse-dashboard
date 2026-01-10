'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import Lenis from 'lenis';

interface LenisContextType {
  lenis: Lenis | null;
  stop: () => void;
  start: () => void;
  isStopped: boolean;
}

const LenisContext = createContext<LenisContextType | null>(null);

export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [isStopped, setIsStopped] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialiser Lenis
    const lenis = new Lenis({
      duration: 1,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Démarrer l'animation
    function raf(time: number) {
      lenis.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    }

    rafIdRef.current = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      lenis.destroy();
    };
  }, []);

  const stop = () => {
    if (lenisRef.current) {
      lenisRef.current.stop();
      setIsStopped(true);
    }
  };

  const start = () => {
    if (lenisRef.current) {
      lenisRef.current.start();
      setIsStopped(false);
    }
  };

  return (
    <LenisContext.Provider value={{ lenis: lenisRef.current, stop, start, isStopped }}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenisContext() {
  const context = useContext(LenisContext);
  return context;
}

// Hook utilitaire pour les modales - arrête Lenis quand isOpen est true
export function useModalLenis(isOpen: boolean) {
  const lenisContext = useLenisContext();

  useEffect(() => {
    if (!lenisContext) return;

    if (isOpen) {
      lenisContext.stop();
    } else {
      lenisContext.start();
    }

    return () => {
      // S'assurer de redémarrer Lenis quand le composant est démonté
      if (isOpen && lenisContext) {
        lenisContext.start();
      }
    };
  }, [isOpen, lenisContext]);
}

