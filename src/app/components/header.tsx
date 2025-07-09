'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LoginBtn } from '@/app/components/buttons/loginBtn';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import {
  IconLogout,
  IconUser,
  IconMenu2,
  IconX,
  IconLayoutGrid,
  IconInfoSquareRounded,
  IconReceipt2,
} from '@tabler/icons-react';
import LanguageToggle from './LanguageToggle';
import { useRouter } from 'next/navigation';
import { fetchUserById } from '@/lib/api';
import { RegisterBtn } from '@/app/components/buttons/registerBtn';
import { useLanguage } from '@/app/context/LanguageContext';

export const Header = () => {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = React.useState<
    string | null
  >(null);

  const links = [
    {
      name: t('dashboard'),
      path: '/dashboard',
      icon: <IconLayoutGrid size={16} stroke={1} />,
    },
    {
      name: t('about'),
      path: '/about',
      icon: <IconInfoSquareRounded size={16} stroke={1} />,
    },
    {
      name: t('pricing'),
      path: '/pricing',
      icon: <IconReceipt2 size={16} stroke={1} />,
    },
  ];

  const router = useRouter();
  const { authenticated } = useAuth();
  const { logout } = useAuth();
  const { user } = useAuth();

  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!user) return;
    if (user) {
      fetchUserById(user.id)
        .then(data => {
          setProfilePictureUrl(
            process.env.NEXT_PUBLIC_STRAPI_URL + data.profile_picture.url
          );
        })
        .catch(error => {
          console.error('Failed to fetch user by ID:', error);
        });
    }
  }, [profilePictureUrl, user]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className={`  z-[199] fixed top-8 left-1/2 -translate-x-1/2 flex-col w-full h-fit items-center justify-center ${
          pathname.startsWith('/dashboard') ? 'hidden' : 'flex'
        }`}
      >
        <header className="z-[199] flex bg-zinc-900/50 border border-zinc-800 h-fit flex-row w-11/12 backdrop-blur-xl !p-4 rounded-full gap-16 items-center justify-between text-white">
          <div className="flex items-center gap-4 w-full justify-center">
            <Link href="/" className="flex flex-row w-full gap-2 items-center">
              <Image
                src="/images/logo/eclipse-logo.png"
                alt="Logo"
                width={40}
                height={40}
              />
              <span className="sm:flex hidden text-xs text-zinc-400 w-full !font-normal">
                Eclipse Studio Dashboard
              </span>
            </Link>
          </div>
          <nav
            className={
              'lg:flex flex-row gap-8 hidden w-full h-fit items-center justify-center'
            }
          >
            <ul className="flex w-fit flex-row w-full items-center justify-end gap-8">
              {links.map((link, index) => (
                <motion.li
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.15 * index,
                    ease: 'easeInOut',
                  }}
                  className={`!flex !flex-row gap-1 items-center justify-center ${
                    isActive(link.path)
                      ? 'text-green-200  items-center justify-center gap-2  !px-2 border bg-green-300/20 border-green-200 rounded-full'
                      : 'text-zinc-200'
                  } hover:text-green-200 capitalize !text-sm`}
                  key={link.name}
                  onClick={() => {
                    setIsMenuOpen(false);
                  }}
                >
                  <Link href={link.path}>{link.name}</Link>
                </motion.li>
              ))}
              <LanguageToggle />
            </ul>
            {!authenticated ? (
              <div
                className={
                  'flex flex-row gap-2 items-center justify-center w-full h-fit !ml-4'
                }
              >
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
                      className={
                        'flex w-10 h-10 cursor-pointer hover:scale-[1.05] hover:border-green-200 transition-all ease-in-out duration-300 border-orange-300 border-2 rounded-full relative overflow-hidden'
                      }
                    >
                      <Image
                        alt={'user profile picture'}
                        src={`${profilePictureUrl}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <IconUser
                      stroke={1}
                      className={
                        'flex w-8 h-8 cursor-pointer hover:scale-[1.05] hover:border-zinc-200 transition-all ease-in-out duration-300 border-emerald-300 border-2 rounded-full relative overflow-hidden'
                      }
                      size={40}
                    />
                  )}
                </div>
                <IconLogout
                  onClick={handleLogout}
                  className={
                    'group-hover:!text-green-200 cursor-pointer hover:scale-[1.1] !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'
                  }
                  size={24}
                />
              </div>
            )}
          </nav>

          {/* Burger Menu Button - Visible on mobile */}
          <div className="lg:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 text-zinc-200 hover:text-green-200 transition-colors"
            >
              {isMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </header>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-[200] lg:hidden"
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
              className="fixed bottom-0 left-0 right-0 bg-zinc-900/50 backdrop-blur-xl border-t border-zinc-800 z-[201] lg:hidden"
            >
              <div className="p-6 space-y-6">
                {/* Close button */}
                <div className="flex justify-end">
                  <button
                    onClick={closeMenu}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <IconX size={24} />
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-4">
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
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive(link.path)
                            ? 'bg-green-200/10 text-green-200 border border-green-200/20'
                            : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-green-200'
                        }`}
                      >
                        {link.icon}
                        <span className="text-lg capitalize">{link.name}</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Language Toggle */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="flex justify-center"
                >
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
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {profilePictureUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-300">
                          <Image
                            alt="user profile picture"
                            src={profilePictureUrl}
                            width={48}
                            height={48}
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <IconUser
                          size={48}
                          className="text-zinc-400 border-2 border-emerald-300 rounded-full p-2"
                        />
                      )}
                      <span className="text-zinc-200 text-lg">
                        {user?.username || 'User'}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 p-3 text-zinc-200 hover:text-red-400 transition-colors"
                    >
                      <IconLogout size={20} />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
