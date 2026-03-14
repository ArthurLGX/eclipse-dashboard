'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LoginBtn } from '@/app/components/buttons/loginBtn';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import {
  IconLogout,
  IconUser,
  IconMenu2,
  IconX,
  IconLayoutGrid,
  IconReceipt2,
} from '@tabler/icons-react';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/app/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { RegisterBtn } from '@/app/components/buttons/registerBtn';
import { useLanguage } from '@/app/context/LanguageContext';
import { useCurrentUser } from '@/hooks/useApi';
import { FALLBACK_AVATAR } from '@/lib/randomuser-avatar';

export const Header = () => {
  const { t } = useLanguage();
  const { setThemeMode, resolvedMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const router = useRouter();
  const { authenticated, logout, user } = useAuth();
  const pathname = usePathname();

  const isLandingStyle = pathname === '/pricing';

  const { data: currentUserData } = useCurrentUser(user?.id);

  const profilePictureUrl = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData = currentUserData as any;
    if (userData?.profile_picture?.url) {
      return process.env.NEXT_PUBLIC_STRAPI_URL + userData.profile_picture.url;
    }
    if (userData?.avatar) {
      return userData.avatar;
    }
    return FALLBACK_AVATAR;
  }, [currentUserData]);

  useEffect(() => {
    if (!isLandingStyle) return;
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLandingStyle]);

  const landingLinks = [
    { name: t('landing_nav_features'), path: '/#features' },
    { name: t('landing_nav_pricing'), path: '/pricing' },
    { name: t('landing_nav_testimonials'), path: '/#testimonials' },
    { name: t('landing_nav_faq'), path: '/#faq' },
  ];

  const links = [
    { name: t('dashboard'), path: '/dashboard', icon: <IconLayoutGrid size={16} stroke={1} /> },
    { name: t('pricing'), path: '/pricing', icon: <IconReceipt2 size={16} stroke={1} /> },
  ];

  const isActive = (path: string) => pathname === path || (path === '/pricing' && pathname === '/pricing');

  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname?.startsWith('/portfolio/');
  if (isDashboard) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  if (isLandingStyle) {
    return (
      <>
        <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`} id="landing-nav">
          <Link href="/" className="landing-nav-logo">
            <div className="landing-nav-logo-mark">ES</div>
            <span>Eclipse Studio Dashboard</span>
          </Link>
          <ul className="landing-nav-links">
            {landingLinks.map((link) => (
              <li key={link.path}>
                <a href={link.path}>{link.name}</a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 max-lg:hidden">
            <button
              type="button"
              onClick={() => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')}
              className="landing-btn-ghost"
              title={resolvedMode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {resolvedMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <LanguageToggle />
            {!authenticated ? (
              <>
                <Link href="/login" className="landing-btn-ghost">{t('landing_nav_login')}</Link>
                <Link href="/pricing" className="landing-btn-primary">{t('landing_nav_free_trial')}</Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/profile/personal-information')}
                  className="flex w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-accent transition-all"
                >
                  <Image alt="Profile" src={profilePictureUrl} width={36} height={36} style={{ objectFit: 'cover' }} />
                </button>
                <button type="button" onClick={handleLogout} className="landing-btn-ghost p-2">
                  <IconLogout size={18} />
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2">
          <button type="button" onClick={toggleMenu} className="landing-btn-ghost p-2">
            {isMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>

        <AnimatePresence mode="sync">
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] lg:hidden"
            >
              <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute bottom-0 left-0 right-0 p-8 rounded-t-2xl z-[1]"
                style={{ background: 'var(--landing-surface)', borderTop: '1px solid var(--landing-border)' }}
              >
                <div className="flex flex-col gap-4">
                  {landingLinks.map((link) => (
                    <a key={link.path} href={link.path} onClick={closeMenu} className="text-lg" style={{ color: 'var(--landing-text)' }}>
                      {link.name}
                    </a>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')} className="landing-btn-ghost">
                      {resolvedMode === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <LanguageToggle />
                  </div>
                  {!authenticated ? (
                    <div className="flex gap-2 mt-4">
                      <Link href="/login" onClick={closeMenu} className="landing-btn-ghost flex-1 text-center">{t('landing_nav_login')}</Link>
                      <Link href="/pricing" onClick={closeMenu} className="landing-btn-primary flex-1 text-center">{t('landing_nav_free_trial')}</Link>
                    </div>
                  ) : (
                    <button type="button" onClick={handleLogout} className="landing-btn-ghost mt-4">{t('logout')}</button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="z-[199] fixed flex items-center top-8 left-1/2 -translate-x-1/2 flex-col w-full h-fit items-center justify-center"
      >
        <header
          className="z-[199] flex h-fit flex-row w-11/12 backdrop-blur-xl !p-4 rounded-full gap-16 items-center justify-between bg-card border border-default"
        >
          <div className="flex items-center gap-4 w-fit justify-center">
            <Link href="/" className="flex flex-row w-full gap-2 items-center">
              <Image
                src="/images/logo/eclipse-logo.png"
                alt="Logo"
                width={40}
                height={40}
              />
              <span className="sm:flex hidden !text-xs !text-muted w-full !font-normal">
                Eclipse Studio Dashboard
              </span>
            </Link>
          </div>
          <nav className="lg:flex flex-row gap-8 hidden w-full h-fit items-center justify-center">
            <ul className="flex flex-row w-full items-center justify-end gap-8">
              {links.map((link, index) => (
                <motion.li
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 * index, ease: 'easeInOut' }}
                  className={`nav-item !flex !flex-row gap-1 items-center justify-center capitalize !text-sm ${isActive(link.path) ? 'active' : ''}`}
                  key={link.name}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Link className={`${isActive(link.path) ? 'text-secondary' : 'text-primary'}`} href={link.path}>{link.name}</Link>
                </motion.li>
              ))}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </ul>
            {!authenticated ? (
              <div className="flex flex-row gap-2 items-center justify-center lg:w-fit w-full h-fit !ml-4">
                <RegisterBtn />
                <LoginBtn />
              </div>
            ) : (
              <div
                className={
                  'flex flex-row items-center justify-center w-fit gap-4'
                }
              >
                <div
                  className={
                    'flex flex-row items-center justify-center w-fit gap-4'
                  }
                >
                  {profilePictureUrl ? (
                    <div
                      onClick={() => {
                        router.push('/dashboard/profile/personal-information');
                      }}
                      className="flex w-10 h-10 cursor-pointer hover:scale-[1.05] hover:border-accent transition-all ease-in-out duration-300 border-warning border-2 rounded-full relative overflow-hidden"
                    >
                      <Image
                        alt={'user profile picture'}
                        src={profilePictureUrl}
                        fill
                        sizes="40px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <IconUser
                      onClick={() => {
                        router.push('/dashboard/profile/personal-information');
                      }}
                      stroke={1}
                      className="flex w-8 h-8 cursor-pointer hover:scale-[1.05] hover:border-primary transition-all ease-in-out duration-300 border-success border-2 rounded-full relative overflow-hidden"
                      size={40}
                    />
                  )}
                </div>
                <IconLogout
                  onClick={handleLogout}
                  className="cursor-pointer hover:scale-[1.1] !text-primary hover:!text-secondary transition-all ease-in-out duration-300"
                  size={24}
                />
              </div>
            )}
          </nav>

          {/* Burger Menu Button - Visible on mobile */}
          <div className="lg:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 !text-primary hover:!text-secondary transition-colors"
            >
              {isMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </header>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence mode="sync">
        {isMenuOpen && (
          <motion.div
            key="mobile-menu-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] lg:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeMenu}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.5,
              }}
              className="absolute flex flex-col justify-center items-center bottom-0 left-0 right-0 bg-card backdrop-blur-xl border-t border-default h-3/4 z-[1]"
            >
              <div className="flex flex-col h-full w-11/12 justify-center gap-8">
                {/* Close button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={closeMenu}
                    className="p-2 !text-muted hover:!text-primary transition-colors"
                  >
                    <IconX size={24} />
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-4 h-fit">
                  {links.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.1 * index,
                      }}
                    >
                      <Link
                        href={link.path}
                        onClick={closeMenu}
                        className={`nav-item flex items-center gap-3 p-3 ${isActive(link.path) ? 'active' : ''}`}
                      >
                        {link.icon}
                        <span className="!text-lg capitalize">{link.name}</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Theme & Language Toggle */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="flex justify-center gap-3"
                >
                  <ThemeToggle />
                  <LanguageToggle />
                </motion.div>

                {/* Auth Buttons */}
                {!authenticated ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className="flex flex-col gap-3"
                  >
                    <RegisterBtn onClick={closeMenu} />
                    <LoginBtn onClick={closeMenu} />
                  </motion.div>
                ) : (
                  <></>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
