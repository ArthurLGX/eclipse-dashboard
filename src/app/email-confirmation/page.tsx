'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { IconCheck, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import Link from 'next/link';

function EmailConfirmationContent() {
  const searchParams = useSearchParams();
  const confirmation = searchParams.get('confirmation');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

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
    <div className="flex flex-col h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-900 to-black rounded-xl">
      <div className="flex-1 flex items-center justify-center p-4 md:p-16 bg-gradient-to-b from-zinc-950 to-black min-h-[400px]">
        <div className="md:max-w-md max-w-full w-full">
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="!text-center"
            >
              <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconLoader2 size={40} className="text-violet-400 animate-spin" />
              </div>
              <h2 className="!text-2xl font-bold text-zinc-200 mb-4">
                Vérification en cours...
              </h2>
              <p className="text-zinc-400">
                Nous vérifions votre email, veuillez patienter.
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
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconCheck size={40} className="text-green-400" />
              </div>
              <h2 className="!text-2xl font-bold text-zinc-200 mb-4">
                Email confirmé !
              </h2>
              <p className="text-zinc-400 mb-8">
                Votre adresse email a été vérifiée avec succès.
                Vous pouvez maintenant vous connecter à votre compte.
              </p>
              <Link
                href="/login"
                className="inline-block bg-violet-500 hover:bg-violet-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Se connecter
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
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconAlertTriangle size={40} className="text-red-400" />
              </div>
              <h2 className="!text-2xl font-bold text-zinc-200 mb-4">
                Échec de la confirmation
              </h2>
              <p className="text-zinc-400 mb-6">
                {errorMessage || 'Une erreur est survenue lors de la confirmation de votre email.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Se connecter
                </Link>
                <Link
                  href="/login?type=register"
                  className="inline-block bg-violet-500 hover:bg-violet-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Créer un compte
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
    <div className="flex h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-950 to-black rounded-xl">
      <div className="flex-1 flex items-center justify-center p-16 min-h-[400px]">
        <div className="w-full max-w-md !text-center">
          <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto mb-6 animate-pulse"></div>
          <div className="h-8 bg-zinc-800 rounded w-48 mx-auto mb-4 animate-pulse"></div>
          <div className="h-4 bg-zinc-800 rounded w-64 mx-auto animate-pulse"></div>
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

