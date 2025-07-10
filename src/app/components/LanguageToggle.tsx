'use client';

import React from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { IconLanguage } from '@tabler/icons-react';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'fr' | 'en');
  };

  return (
    <div className="flex flex-row lg:items-center items-start gap-2">
      <IconLanguage size={16} className="text-zinc-400" />
      <select
        value={language}
        onChange={handleLanguageChange}
        className="px-2 py-1 cursor-pointer lg:w-fit w-full bg-zinc-800/20 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-zinc-700/50 transition-colors"
      >
        <option className="!bg-zinc-900" value="fr">
          FR
        </option>
        <option className="!bg-zinc-900" value="en">
          EN
        </option>
      </select>
    </div>
  );
}
