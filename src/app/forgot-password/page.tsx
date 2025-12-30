'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePopup } from '@/app/context/PopupContext';
import { forgotPassword } from '@/lib/api';
import { BackBtn } from '@/app/components/buttons/backBtn';
import { IconMail, IconCheck } from '@tabler/icons-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showGlobalPopup } = usePopup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setIsSuccess(true);
      showGlobalPopup('Email de réinitialisation envoyé !', 'success');
    } catch (error) {
      console.error('Error:', error);
      showGlobalPopup(
        error instanceof Error ? error.message : 'Une erreur est survenue',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-900 to-black rounded-xl">
      <div className="bg-zinc-950 z-100 w-full">
        <BackBtn />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 md:p-16 bg-gradient-to-b from-zinc-950 to-black">
        <div className="md:max-w-md max-w-full w-full">
          {!isSuccess ? (
            <>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="!text-center mb-8"
              >
                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconMail size={32} className="text-violet-400" />
                </div>
                <h1 className="!text-4xl font-bold text-zinc-200 mb-2">
                  Mot de passe oublié
                </h1>
                <p className="text-zinc-400">
                  Entrez votre email pour recevoir un lien de réinitialisation
                </p>
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeInOut' }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Votre adresse email"
                    value={email}
                    required
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </motion.button>
              </motion.form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="!text-center mt-6"
              >
                <p className="text-zinc-400">
                  Vous vous souvenez de votre mot de passe ?{' '}
                  <Link
                    href="/login"
                    className="!text-violet-400 hover:!text-violet-300 transition-colors duration-200"
                  >
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            </>
          ) : (
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
                Email envoyé !
              </h2>
              <p className="text-zinc-400 mb-6">
                Si un compte existe avec l&apos;adresse <strong className="text-zinc-200">{email}</strong>,
                vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
              </p>
              <p className="text-zinc-500 text-sm mb-8">
                N&apos;oubliez pas de vérifier votre dossier spam.
              </p>
              <Link
                href="/login"
                className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Retour à la connexion
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

