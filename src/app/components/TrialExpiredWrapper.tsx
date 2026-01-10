'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { usePathname } from 'next/navigation';
import TrialExpiredModal from './TrialExpiredModal';
import PageSkeleton from './PageSkeleton';

interface TrialExpiredWrapperProps {
  children: React.ReactNode;
}

export default function TrialExpiredWrapper({
  children,
}: TrialExpiredWrapperProps) {
  const { showTrialExpiredModal, setShowTrialExpiredModal, hasHydrated } =
    useAuth();
  const pathname = usePathname();
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // Réduire le délai de chargement pour les transitions de page
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 150); // 150ms de délai (réduit de 300ms à 150ms)

    return () => clearTimeout(timer);
  }, [pathname]);

  // Afficher le skeleton pendant le chargement de la page
  // Ne pas afficher le skeleton sur la page pricing et les pages portfolio publiques
  const isPublicPage = pathname === '/pricing' || pathname?.startsWith('/portfolio/');
  if ((!hasHydrated || isPageLoading) && !isPublicPage) {
    return <PageSkeleton />;
  }

  return (
    <>
      {children}
      <TrialExpiredModal
        isOpen={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
      />
    </>
  );
}
