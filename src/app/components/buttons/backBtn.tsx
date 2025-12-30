'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowLeft } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';
export const BackBtn = () => {
  const { t } = useLanguage();
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
      className="flex md:w-fit w-full flex-row items-center gap-4"
    >
      <Link
        id="backBtn"
        onClick={() => router.back()}
        href="/"
        className={`group flex flex-row items-center justify-center gap-2 text-zinc-900 !text-xs capitalize border border-zinc-700 rounded-full bg-zinc-200 hover:bg-zinc-950 hover:text-zinc-200 !pl-2 !pr-4 !py-2  transition-all ease-in-out duration-300 w-full !m-4  `}
      >
        <span
          className={
            'group-hover:!text-emerald-200 flex flex-row items-center gap-2'
          }
        >
          {' '}
          <IconArrowLeft
            size={16}
            stroke={1}
            className={
              'bg-zinc-950 rounded-full w-full h-full p-1 text-zinc-200 group-hover:!text-emerald-300 group-hover:-translate-x-1 group-hover:bg-emerald-200/20 transition-all ease-in-out duration-300'
            }
          />
          {t('back')}
        </span>
      </Link>
    </motion.div>
  );
};
