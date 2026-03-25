'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';

/**
 * Footer marketing (landing) — utilisé sur la home et dans le layout des pages publiques.
 */
export function Footer() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const hideOnAppShell =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/portfolio/') ||
    pathname?.startsWith('/share/project');

  if (hideOnAppShell) return null;

  return (
    <>
      <footer className="landing-footer">
        <div>
          <div className="landing-footer-logo">
            <Image
              src="/images/logo/eclipse-logo.png"
              alt="Eclipse Studio"
              width={26}
              height={26}
              className="landing-footer-logo-mark object-contain"
            />
            <span className="font-bold text-[11px] tracking-tight" style={{ color: 'var(--landing-text)' }}>
              Eclipse Studio Dashboard
            </span>
          </div>
          <div className="landing-footer-tagline">{t('landing_footer_tagline')}</div>
        </div>
        <div>
          <div className="landing-footer-col-title">{t('landing_footer_product')}</div>
          <ul className="landing-footer-links">
            <li>
              <a href="/#features">{t('landing_nav_features')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_pipeline')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_smart_followup')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_invoices')}</a>
            </li>
            <li>
              <a href="/#pricing">{t('landing_nav_pricing')}</a>
            </li>
          </ul>
        </div>
        <div>
          <div className="landing-footer-col-title">{t('landing_footer_resources')}</div>
          <ul className="landing-footer-links">
            <li>
              <a href="/#">{t('landing_footer_docs')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_blog')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_changelog')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_status')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_api')}</a>
            </li>
          </ul>
        </div>
        <div>
          <div className="landing-footer-col-title">{t('landing_footer_company')}</div>
          <ul className="landing-footer-links">
            <li>
              <a href="/#">{t('landing_footer_about')}</a>
            </li>
            <li>
              <a href="/#">{t('landing_footer_contact')}</a>
            </li>
            <li>
              <Link href="/privacy">{t('landing_footer_privacy')}</Link>
            </li>
            <li>
              <Link href="/terms">{t('landing_footer_terms')}</Link>
            </li>
            <li>
              <Link href="/cookies">{t('landing_footer_cookies')}</Link>
            </li>
            <li>
              <Link href="/delete-account">{t('landing_footer_delete_account')}</Link>
            </li>
          </ul>
        </div>
      </footer>
      <div className="landing-footer-bottom">
        <span>{t('landing_footer_copyright')}</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--landing-text-sm)' }}>
          {t('landing_footer_made_in')}
        </span>
      </div>
    </>
  );
}
