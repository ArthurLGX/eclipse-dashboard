'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export const Footer = () => {
  const year = new Date().getFullYear();
  const links = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'pricing', path: '/pricing' },
    { name: 'contact', path: '/contact' },
    { name: 'terms', path: '/terms' },
    { name: 'privacy', path: '/privacy' },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      exit={{ opacity: 0, y: 50 }}
      className=" flex items-center h-[200px] w-full justify-center p-4 !my-16  text-white"
    >
      <div
        className={
          'flex md:flex-row flex-col-reverse gap-4 w-11/12 items-center justify-between'
        }
      >
        <div className="flex md:flex-row flex-col items-center justify-center gap-2 items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo/eclipse-logo.png"
              alt="Logo"
              width={40}
              height={40}
            />
          </Link>
          <p className="text-zinc-400 text-center md:text-left">
            Eclipse Development Dashboard &#8482; {year}{' '}
          </p>
        </div>
        <div className="flex md:flex-row flex-col items-center justify-center gap-4">
          {links.map((link, index) => (
            <motion.a
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: 'easeInOut',
              }}
              key={link.name}
              href={link.path}
              className={`text-zinc-200 hover:text-green-200 transition-all ease-in-out duration-300`}
            >
              {link.name}
            </motion.a>
          ))}
        </div>
      </div>
    </motion.footer>
  );
};
