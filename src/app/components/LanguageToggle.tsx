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
      <IconLanguage size={16} className="text-secondary" />
      <select
        value={language}
        onChange={handleLanguageChange}
        className="px-2 py-1 cursor-pointer lg:w-fit w-full bg-card border border-default rounded-lg text-primary !text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent hover:bg-hover transition-colors"
      >
        <option className="bg-card text-primary" value="fr">
          FR
        </option>
        <option className="bg-card text-primary" value="en">
          EN
        </option>
      </select>
    </div>
  );
}
