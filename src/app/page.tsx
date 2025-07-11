'use client';
import useLenis from '@/utils/useLenis';
import { motion } from 'framer-motion';
import React from 'react';

import Image from 'next/image';
import { TryBtn } from './components/buttons/tryBtn';
import { useLanguage } from './context/LanguageContext';
import { PricingBtn } from './components/buttons/pricingBtn';
export default function Home() {
  useLenis();
  const { t } = useLanguage();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <Image
        src="/images/background.jpg"
        alt="background"
        width={1000}
        height={1000}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-20"
      />
      <div
        className={
          '!text-zinc-200 z-10 flex flex-col gap-16 items-center justify-center w-full p-4  h-full '
        }
      >
        <div
          className={
            'flex flex-col gap-8 items-center justify-center md:w-1/2 w-full font-bold h-fit tracking-tighter gap-4'
          }
        >
          <motion.h1
            initial={{ opacity: 0, y: '20%' }}
            animate={{ opacity: 1, y: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.1 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <motion.span
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.2 }}
              className="!text-xl !text-zinc-200 font-light"
            >
              {t('hero_subtitle_top')}
            </motion.span>
            {t('hero_title_main')}
            <motion.span
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
              className="bg-emerald-300/20 backdrop-blur-xs py-2 px-4 rounded-full !text-green-200 font-extrabold shadow-md shadow-emerald-300/20"
            >
              {t('hero_subtitle_bottom')}
            </motion.span>
          </motion.h1>
          <div
            className={
              'flex md:flex-row flex-col items-center justify-center gap-4 w-full !my-8'
            }
          >
            <TryBtn />
            <PricingBtn />
          </div>
        </div>
      </div>
    </main>
  );
}
