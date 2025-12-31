'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from '@/app/context/ThemeContext';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={toggleTheme}
      className="btn-ghost relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      <motion.div
        key={resolvedTheme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {resolvedTheme === 'dark' ? (
          <IconSun
            size={18}
            className="text-warning group-hover:opacity-80 transition-colors"
          />
        ) : (
          <IconMoon
            size={18}
            className="text-accent group-hover:opacity-80 transition-colors"
          />
        )}
      </motion.div>
    </motion.button>
  );
}

