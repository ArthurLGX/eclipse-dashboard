'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LoginBtn } from '@/app/components/buttons/loginBtn';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { IconLayout, IconLogout, IconUser } from '@tabler/icons-react';
import LanguageToggle from './LanguageToggle';
import { useRouter } from 'next/navigation';
import { fetchUserById } from '@/lib/api';
import { RegisterBtn } from '@/app/components/buttons/registerBtn';
import { useLanguage } from '@/app/context/LanguageContext';

export const Header = () => {
  const { t } = useLanguage();
  const links = [
    {
      name: t('dashboard'),
      path: '/dashboard',
      icon: <IconLayout size={16} stroke={1} />,
    },
    {
      name: t('about'),
      path: '/about',
      icon: <IconLayout size={16} stroke={1} />,
    },
    {
      name: t('pricing'),
      path: '/pricing',
      icon: <IconLayout size={16} stroke={1} />,
    },
  ];
  const [profilePictureUrl, setProfilePictureUrl] = React.useState<
    string | null
  >(null);

  const router = useRouter();
  const { authenticated } = useAuth();
  const { logout } = useAuth();
  const { user } = useAuth();

  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout();
    router.push('/login'); // redirige vers la page login
  };

  useEffect(() => {
    if (!user) return; // ou redirection, ou erreur gérée
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

    /* }
     */
  }, [profilePictureUrl, user]);

  return (
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
          <Link href="/" className="flex flex-row w-full gap-1 items-center">
            <Image
              src="/images/logo/eclipse-logo.png"
              alt="Logo"
              width={40}
              height={40}
            />
            <span className="text-xs text-zinc-400 w-fullfont-bold">
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
                    ? 'text-green-200  items-center justify-center gap-2  !px-2 border border-green-200'
                    : 'text-zinc-200'
                } hover:text-green-200 capitalize !text-sm`}
                key={link.name}
              >
                <Link href={link.path}>{link.name}</Link>
              </motion.li>
            ))}
          </ul>
          {!authenticated ? (
            <div
              className={
                'flex flex-row gap-2 items-center justify-center w-full h-fit'
              }
            >
              <LanguageToggle />
              <RegisterBtn />
              <LoginBtn />
            </div>
          ) : (
            <div
              className={
                'flex flex-row items-center justify-center w-fit gap-4'
              }
            >
              <LanguageToggle />
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
      </header>
    </motion.div>
  );
};
