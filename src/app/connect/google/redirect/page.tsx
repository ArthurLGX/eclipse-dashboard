'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { IconBrandGoogle, IconAlertCircle } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

export default function GoogleRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  useEffect(() => {
    const handleCallback = async () => {
      // Récupérer les tokens depuis l'URL
      const accessToken = searchParams.get('access_token'); // Token Google OAuth
      const idToken = searchParams.get('id_token'); // ID Token Google
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (!accessToken) {
        setError(t('no_token_received_from_google'));
        return;
      }

      try {
        // Appeler le callback Strapi pour échanger le token Google contre un JWT Strapi
        const callbackResponse = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/google/callback?access_token=${accessToken}${idToken ? `&id_token=${idToken}` : ''}`,
          {
            credentials: 'include', // Important pour les cookies
          }
        );

        if (!callbackResponse.ok) {
          const errorData = await callbackResponse.json();
          throw new Error(errorData.error?.message || t('authentication_error'));
        }

        const authData = await callbackResponse.json();
        
        // Strapi renvoie { jwt, user }
        if (!authData.jwt) {
          throw new Error('Aucun JWT reçu de Strapi');
        }

        // Stocker le token JWT Strapi
        localStorage.setItem('token', authData.jwt);
        localStorage.setItem('user', JSON.stringify(authData.user));

        // Rediriger vers le dashboard
        router.push('/dashboard');
      } catch (err) {
        console.error('Erreur lors de la connexion Google:', err);
        setError(err instanceof Error ? err.message : 'Erreur de connexion');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 rounded-xl bg-card border-default max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <IconAlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-center text-primary mb-2">
            {t('error_connecting')}
          </h1>
            <p className="text-center text-primary mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          > 
            {t('back_to_login')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-[var(--border-color)] border-t-[var(--accent-primary)]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <IconBrandGoogle className="w-8 h-8 text-[var(--text-primary)]" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Connexion en cours...
        </h1>
        <p className="text-[var(--text-secondary)]">
          Veuillez patienter pendant que nous vous connectons
        </p>
      </motion.div>
    </div>
  );
}

