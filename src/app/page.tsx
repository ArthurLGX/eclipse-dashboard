'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';

export default function Home() {
  const router = useRouter();
  const { user, hasHydrated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasHydrated) return;
      if (user) {
        router.push('/dashboard');
      } else {
        // Non connecté : afficher la landing (pas de redirection vers /login)
        setIsChecking(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [user, hasHydrated, router]);

  if (!hasHydrated || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full" style={{ background: 'var(--landing-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--landing-text-md)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (user) return null;
  return <LandingPage />;
}
