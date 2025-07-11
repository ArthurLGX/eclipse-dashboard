'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface LoginBtnProps {
  onClick?: () => void;
}

export const LoginBtn = ({ onClick }: LoginBtnProps) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: '30%' }}
      animate={{ opacity: 1, y: 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
      className="flex lg:w-fit w-full flex-row items-center gap-4"
    >
      <Link
        id="loginBtn"
        href="/login?type=login"
        onClick={onClick}
        className={`group flex flex-row items-center justify-center gap-2 !text-zinc-900 capitalize border border-zinc-700 rounded-full bg-zinc-200 hover:bg-zinc-950 hover:!text-zinc-200 !px-4 !py-2  transition-all ease-in-out duration-300 lg:w-fit w-full  `}
      >
        <span
          className={
            'group-hover:!text-green-200 flex flex-row !text-xs lg:w-full w-fit items-center justify-center gap-2'
          }
        >
          {t('login')}
          <IconArrowRight
            size={16}
            className="group-hover:!text-green-200 group-hover:-rotate-45 transition-all ease-in-out duration-300"
          />
        </span>
      </Link>
    </motion.div>
  );
};
