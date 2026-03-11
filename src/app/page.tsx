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
      if (hasHydrated && user) {
        router.push('/dashboard');
      }
      setIsChecking(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [user, hasHydrated, router]);

  if (isChecking || (hasHydrated && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="!text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  return <LandingPage />;
}
