'use client';

import React from 'react';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';

export const PricingBtn = () => {
  const { t } = useLanguage();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: '5%' }}
      animate={{ opacity: 1, y: 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
      className="flex md:w-fit w-full flex-row items-center justify-center gap-4"
    >
      <Link
        id="pricingBtn"
        href="/pricing"
        className="btn-secondary group flex flex-row md:w-fit w-full items-center justify-center gap-4 hover:gap-2 !text-xs capitalize rounded-full !pl-2 pr-4 !py-2"
      >
        <span>
          <IconArrowRight
            size={30}
            stroke={1}
            className="rounded-full w-full h-full p-1 transition-all ease-in-out duration-300 group-hover:-rotate-45 bg-accent-light"
          />
        </span>
        <span className="!font-light">
          {t('go_to_offers')}
        </span>
      </Link>
    </motion.div>
  );
};
