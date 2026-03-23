'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTheme } from '@/app/context/ThemeContext';

interface LegalPageLayoutProps {
  title: string;
  titleEn?: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, titleEn, children }: LegalPageLayoutProps) {
  const { language, setLanguage } = useLanguage();
  const { setThemeMode, resolvedMode } = useTheme();
  const isFr = language === 'fr';

  return (
    <div className="min-h-screen" style={{ background: 'var(--landing-bg)', color: 'var(--landing-text)' }}>
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-surface)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/images/logo/eclipse-logo.png" alt="Eclipse" width={28} height={28} />
            <span className="font-semibold text-sm">Eclipse Studio Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded border text-sm"
              style={{ borderColor: 'var(--landing-border)', color: 'var(--landing-text-muted)' }}
            >
              {resolvedMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(isFr ? 'en' : 'fr')}
              className="px-2.5 py-1.5 rounded border text-xs font-medium"
              style={{ borderColor: 'var(--landing-border)', color: 'var(--landing-text-muted)' }}
            >
              {isFr ? 'EN' : 'FR'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-8">{isFr ? title : (titleEn ?? title)}</h1>
        <article
          className="[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_p]:mb-3 [&_p]:text-[15px] [&_p]:leading-relaxed [&_a]:text-[var(--landing-accent)] [&_code]:font-mono [&_code]:text-xs"
          style={{ color: 'var(--landing-text-md)' }}
        >
          {children}
        </article>
        <nav className="mt-12 pt-8 border-t flex flex-wrap gap-4" style={{ borderColor: 'var(--landing-border)' }}>
          <Link href="/privacy" className="text-sm hover:underline" style={{ color: 'var(--landing-accent)' }}>
            {isFr ? 'Politique de confidentialité' : 'Privacy Policy'}
          </Link>
          <Link href="/terms" className="text-sm hover:underline" style={{ color: 'var(--landing-accent)' }}>
            {isFr ? 'Conditions de service' : 'Terms of Service'}
          </Link>
          <Link href="/cookies" className="text-sm hover:underline" style={{ color: 'var(--landing-accent)' }}>
            {isFr ? 'Cookies & Données' : 'Cookies & Data'}
          </Link>
          <Link href="/delete-account" className="text-sm hover:underline" style={{ color: 'var(--landing-accent)' }}>
            {isFr ? 'Supprimer mon compte' : 'Delete my account'}
          </Link>
          <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--landing-accent)' }}>
            {isFr ? '← Retour' : '← Back'}
          </Link>
        </nav>
      </main>
    </div>
  );
}
