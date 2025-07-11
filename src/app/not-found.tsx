'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from './context/LanguageContext';
import useLenis from '@/utils/useLenis';
// import Image from 'next/image';

export default function NotFound() {
  const router = useRouter();
  const { t } = useLanguage();
  useLenis();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden !mt-20 lg:!mt-0">
      {/* Contenu principal */}
      <div className="relative z-10 !text-center px-6 max-w-2xl mx-auto">
        {/* Numéro 404 animé */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="!text-9xl md:!text-[12rem] font-black clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-300 bg-clip-text !text-transparent">
            404
          </h1>
        </motion.div>

        {/* Message d'erreur */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="!text-3xl md:!text-4xl font-bold !text-zinc-200 mb-4">
            {t('page_not_found')}
          </h2>
          <p className="!text-lg !text-zinc-400 leading-relaxed">
            {t('page_not_found_description')}
          </p>
        </motion.div>

        {/* Boutons d'action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={handleGoHome}
            className="group relative px-4 py-2 bg-emerald-300 cursor-pointer hover:bg-emerald-300/20 hover:!text-emerald-300 border border-emerald-300 font-semibold rounded-lg transition-all duration-300 transform "
          >
            <span className="relative z-10">{t('go_home')}</span>
          </button>

          <button
            onClick={handleGoBack}
            className="group relative px-4 py-2 border-1 border-zinc-700 cursor-pointer hover:border-emerald-300 !text-zinc-300 hover:!text-emerald-400 font-semibold rounded-lg transition-all duration-300 transform  hover:shadow-lg hover:shadow-emerald-500/25   "
          >
            <span className="relative z-10">{t('go_back')}</span>
          </button>
        </motion.div>

        {/* Informations supplémentaires */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12 !text-center"
        >
          <p className="!text-sm !text-zinc-500 mb-2">{t('error_code')}: 404</p>
          <p className="!text-xs !text-zinc-600">
            {t('contact_support_if_problem_persists')}
          </p>
        </motion.div>
      </div>

      {/* Effet de bordure animée */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200/50 to-transparent"></div>
      </div>
    </main>
  );
}
