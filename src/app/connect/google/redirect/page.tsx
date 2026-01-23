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
      // Strapi envoie directement le JWT dans l'URL après authentification
      const jwtToken = searchParams.get('access_token');
      const errorParam = searchParams.get('error');
      
      // Debug: afficher toute l'URL
      console.log('[Google Redirect] Full URL:', window.location.href);
      console.log('[Google Redirect] All params:', Array.from(searchParams.entries()));

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (!jwtToken) {
        setError(t('no_token_received_from_google'));
        return;
      }

      console.log('[Google Redirect] JWT Token received (first 50 chars):', jwtToken.substring(0, 50) + '...');
      console.log('[Google Redirect] JWT Token length:', jwtToken.length);

      try {
        // Vérifier que le token est valide en récupérant les infos utilisateur
        const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        });

        console.log('[Google Redirect] Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Google Redirect] Error response:', errorData);
          throw new Error(errorData.error?.message || t('authentication_error'));
        }

        const user = await response.json();
        
        // Stocker le token JWT Strapi et les infos utilisateur
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user', JSON.stringify(user));

        // Rediriger vers le dashboard
        router.push('/dashboard');
      } catch (err) {
        console.error('Erreur lors de la connexion Google:', err);
        setError(err instanceof Error ? err.message : t('authentication_error'));
      }
    };

    handleCallback();
  }, [searchParams, router, t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 rounded-xl bg-card border-default min-w-md"
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
    <div className="min-h-screen flex items-center justify-center bg-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-default border-t-accent"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <IconBrandGoogle className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-primary mb-2">
          {t('connecting')}...
        </h1>
        <p className="text-primary">
          {t('please_wait_while_we_connect_you')}
        </p>
      </motion.div>
    </div>
  );
}

