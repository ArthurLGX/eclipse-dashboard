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
        className="btn-primary group flex flex-row items-center justify-center gap-2 capitalize rounded-full !px-4 !py-2 lg:w-fit w-full"
      >
        <span className="flex flex-row !text-xs lg:w-full w-fit items-center justify-center gap-2">
          {t('login')}
          <IconArrowRight
            size={16}
            className="group-hover:-rotate-45 transition-all ease-in-out duration-300"
          />
        </span>
      </Link>
    </motion.div>
  );
};
