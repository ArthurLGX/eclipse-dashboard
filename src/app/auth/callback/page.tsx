'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { motion } from 'framer-motion';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showGlobalPopup } = usePopup();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      processedRef.current = true;
      showGlobalPopup(`Erreur d'authentification: ${error}`, 'error');
      router.replace('/login');
      return;
    }

    if (!token || !userParam) {
      processedRef.current = true;
      showGlobalPopup('Données d\'authentification manquantes', 'error');
      router.replace('/login');
      return;
    }

    processedRef.current = true;

    const processAuth = async () => {
      try {
        const user = JSON.parse(userParam);
        await login(user, token);
        showGlobalPopup('Connexion Google réussie !', 'success');
        router.replace('/');
      } catch (err) {
        console.error('Error processing auth callback:', err);
        showGlobalPopup('Erreur lors de la connexion', 'error');
        router.replace('/login');
      }
    };

    processAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécution unique au montage
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="!text-center"
      >
        <div className="w-16 h-16 mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full border-4 border-accent border-t-transparent rounded-full"
          />
        </div>
        <h2 className="!text-xl font-semibold mb-2">Connexion en cours...</h2>
        <p className="!text-primary">Veuillez patienter</p>
      </motion.div>
    </div>
  );
}

function CallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="!text-center">
        <div className="w-16 h-16 mx-auto mb-6">
          <div className="w-full h-full border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="!text-xl font-semibold mb-2">Chargement...</h2>
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

