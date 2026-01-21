'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { IconCheck, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import Link from 'next/link';

function EmailConfirmationContent() {
  const searchParams = useSearchParams();
  const confirmation = searchParams.get('confirmation');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useLanguage();
  useEffect(() => {
    // Strapi gère automatiquement la confirmation via l'URL
    // Cette page est appelée après que Strapi a traité le token
    // Le paramètre 'confirmation' indique si la confirmation a réussi
    
    const verifyConfirmation = async () => {
      // Petit délai pour l'UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (confirmation === 'success' || confirmation) {
        setStatus('success');
      } else {
        // Vérifier si on a un token de confirmation dans l'URL (ancien format)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('confirmation')) {
          // Strapi a probablement déjà traité la confirmation
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage('Le lien de confirmation est invalide ou a expiré.');
        }
      }
    };

    verifyConfirmation();
  }, [confirmation]);

  return (
    <div className="flex flex-col h-fit w-fit !my-32 border border-default bg-muted rounded-xl">
      <div className="flex-1 flex items-center justify-center p-4 md:p-16 bg-secondary min-h-[400px]">
        <div className="md:max-w-md max-w-full w-full">
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="!text-center"
            >
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <IconLoader2 size={40} className="text-primary-foreground animate-spin" />
              </div>
              <h2 className="!text-2xl font-bold text-foreground mb-4">
                {t('email_confirmation_loading')}
              </h2>
              <p className="text-muted-foreground">
                {t('email_confirmation_loading_description')}
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="!text-center"
            >
              <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-6">
                <IconCheck size={40} className="text-success" />
              </div>
              <h2 className="!text-2xl font-bold text-foreground mb-4">
                {t('email_confirmation_success')}
              </h2>
              <p className="text-muted-foreground mb-8">
                {t('email_confirmation_success_description')}
              </p>
              <Link
                href="/login"
                className="inline-block bg-primary hover:bg-primary-light text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {t('email_confirmation_login')}
              </Link>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="!text-center"
            >
              <div className="w-20 h-20 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-6">
                <IconAlertTriangle size={40} className="text-danger" />
              </div>
              <h2 className="!text-2xl font-bold text-foreground mb-4">
                {t('email_confirmation_error')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || t('email_confirmation_error_description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="inline-block btn-primary font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('email_confirmation_login')}
                </Link>
                <Link
                  href="/login?type=register"
                  className="inline-block btn-secondary font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('email_confirmation_register')}
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailConfirmationLoading() {
  return (
    <div className="flex h-fit w-fit !my-32 border border-default bg-muted rounded-xl">
      <div className="flex-1 flex items-center justify-center p-16 min-h-[400px]">
        <div className="w-full max-w-md !text-center">
          <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-6 animate-pulse"></div>
          <div className="h-8 bg-primary rounded w-48 mx-auto mb-4 animate-pulse"></div>
          <div className="h-4 bg-primary rounded w-64 mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default function EmailConfirmation() {
  return (
    <Suspense fallback={<EmailConfirmationLoading />}>
      <EmailConfirmationContent />
    </Suspense>
  );
}

