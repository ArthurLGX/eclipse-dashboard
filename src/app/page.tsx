'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  
  // Redirection automatique selon l'état de connexion
  useEffect(() => {
    // Petit délai pour permettre au contexte de s'initialiser
    const timer = setTimeout(() => {
      if (user) {
        // Si connecté, rediriger vers le dashboard
        router.push('/dashboard');
      } else {
        // Si non connecté, rediriger vers login
        router.push('/login');
      }
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, router]);

  // Afficher un loader pendant la vérification
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  // Ne rien afficher pendant la redirection
  return null;
}
