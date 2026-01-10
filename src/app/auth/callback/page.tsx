'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { motion } from 'framer-motion';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showGlobalPopup } = usePopup();

  useEffect(() => {
    const processAuth = async () => {
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        showGlobalPopup(`Erreur d'authentification: ${error}`, 'error');
        router.push('/login');
        return;
      }

      if (!token || !userParam) {
        showGlobalPopup('Données d\'authentification manquantes', 'error');
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userParam);
        
        // Use the login function from AuthContext
        await login(user, token);
        
        showGlobalPopup('Connexion Google réussie !', 'success');
        
        // AuthContext will handle the redirect based on subscription status
      } catch (error) {
        console.error('Error processing auth callback:', error);
        showGlobalPopup('Erreur lors de la connexion', 'error');
        router.push('/login');
      }
    };

    processAuth();
  }, [searchParams, login, router, showGlobalPopup]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full border-4 border-accent border-t-transparent rounded-full"
          />
        </div>
        <h2 className="text-xl font-semibold mb-2">Connexion en cours...</h2>
        <p className="text-secondary">Veuillez patienter</p>
      </motion.div>
    </div>
  );
}

function CallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6">
          <div className="w-full h-full border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Chargement...</h2>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackContent />
    </Suspense>
  );
}

