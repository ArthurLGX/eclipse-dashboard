'use client';

import React from 'react';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';

export const TryBtn = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: '5%' }}
      animate={{ opacity: 1, y: 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
      className="flex md:w-fit w-full flex-row items-center justify-center gap-4"
    >
      <Link
        id="tryBtn"
        href="/login?type=register"
        className={`group flex flex-row md:w-fit w-full items-center  justify-center border border-zinc-200 gap-4 hover:gap-2 text-zinc-900 !text-xs capitalize border border-zinc-700 rounded-full bg-zinc-200 hover:bg-emerald-300/20 hover:text-zinc-900 hover:border-emerald-300 !pl-2 pr-4 !py-2  transition-all ease-in-out duration-300 `}
      >
        <span>
          <IconArrowRight
            size={30}
            stroke={1}
            className={
              'bg-zinc-950 rounded-full w-full h-full p-1 text-zinc-200 group-hover:!text-emerald-300 group-hover:-rotate-45 group-hover:bg-emerald-200/20 transition-all ease-in-out duration-300'
            }
          />
        </span>
        <span className={'group-hover:!text-emerald-200 !font-light'}>
          {t('try_for_free')}
        </span>
      </Link>
    </motion.div>
  );
};
