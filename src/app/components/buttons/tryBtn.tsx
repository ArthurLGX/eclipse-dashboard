'use client';

import React from 'react';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';

export const TryBtn = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
      className="flex w-fit flex-row items-center gap-4"
    >
      <Link
        id="tryBtn"
        href="/login?type=register"
        className={`group flex flex-row items-center justify-center gap-2 text-zinc-900 !text-xs capitalize border border-zinc-700 rounded-full bg-zinc-200 hover:bg-zinc-950 hover:!text-zinc-200 !px-4 !py-2  transition-all ease-in-out duration-300 `}
      >
        <span>
          <IconArrowRight
            size={30}
            stroke={1}
            className={
              'bg-zinc-950 rounded-full p-1 text-zinc-200 group-hover:text-green-200 group-hover:-rotate-45 group-hover:bg-green-200/20 transition-all ease-in-out duration-300'
            }
          />
        </span>
        <span className={'group-hover:!text-green-200'}>Try for free</span>
      </Link>
    </motion.div>
  );
};
