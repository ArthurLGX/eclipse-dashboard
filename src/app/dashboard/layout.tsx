'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import {
  IconHome,
  IconUsers,
  IconBuilding,
  IconMagnet,
  IconBrain,
  IconMail,
  IconPin,
  IconPinFilled,
  IconLogout,
  IconUser,
  IconCreditCard,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { fetchUserById } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useLenis from '@/utils/useLenis';
import LanguageToggle from '@/app/components/LanguageToggle';
import { useLanguage } from '@/app/context/LanguageContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  onClick?: () => void;
  menuItems?: SidebarItem[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { logout } = useAuth();
  const { t } = useLanguage();
  useLenis();

  // Définir les items de la sidebar avec l'image de profil dynamique
  const sidebarItems: SidebarItem[] = [
    {
      id: 'home',
      label: t('dashboard'),
      icon: <IconHome size={20} />,
      path: '/dashboard',
    },
    {
      id: 'clients',
      label: t('clients'),
      icon: <IconUsers size={20} />,
      path: '/dashboard/clients',
    },
    {
      id: 'prospects',
      label: t('prospects'),
      icon: <IconMagnet size={20} />,
      path: '/dashboard/prospects',
    },
    {
      id: 'projects',
      label: t('projects'),
      icon: <IconBuilding size={20} />,
      path: '/dashboard/projects',
    },
    {
      id: 'mentors',
      label: t('mentors'),
      icon: <IconBrain size={20} />,
      path: '/dashboard/mentors',
    },
    {
      id: 'newsletters',
      label: t('newsletters'),
      icon: <IconMail size={20} />,
      path: '/dashboard/newsletters',
    },
    {
      id: 'profile',
      label: t('profile'),
      icon: (
        <div
          className={
            'flex w-5 h-5 cursor-pointer  hover:border-green-200 transition-all ease-in-out duration-300 border-orange-300 border-2 rounded-full relative overflow-hidden'
          }
        >
          <Image
            alt={'user profile picture'}
            src={profilePictureUrl || '/images/logo/eclipse-logo.png'}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      ),
      menuItems: [
        {
          id: 'personal_information',
          label: t('personal_information'),
          icon: <IconUser size={20} />,
          path: '/dashboard/profile/personal-information',
        },
        {
          id: 'your_subscription',
          label: t('your_subscription'),
          icon: <IconCreditCard size={20} />,
          path: '/dashboard/profile/your-subscription',
        },
      ],
    },
    {
      id: 'logout',
      label: t('logout'),
      icon: <IconLogout size={20} />,
      onClick: logout,
      path: '/login?type=login',
    },
  ];

  // Déterminer l'item actif basé sur l'URL
  const activeItem = (() => {
    // D'abord, chercher si on est sur un sous-menu
    for (const item of sidebarItems) {
      if (item.menuItems) {
        const isOnMenuItem = item.menuItems.some(
          menuItem => menuItem.path === pathname
        );
        if (isOnMenuItem) {
          return item.id;
        }
      }
    }

    // Sinon, chercher un item principal
    const mainItem = sidebarItems.find(item => item.path === pathname);
    return mainItem?.id || 'home';
  })();

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else {
      if (item.menuItems) {
        // Si on est déjà sur une page du menu, naviguer vers la page principale
        const isOnMenuItem = item.menuItems.some(
          menuItem => menuItem.path === pathname
        );
        if (isOnMenuItem) {
          router.push(item.path || '');
        } else {
          // Sinon, naviguer vers le premier item du menu
          router.push(item.menuItems[0].path || '');
        }
      } else {
        router.push(item.path || '');
      }
    }
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

  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsExpanded(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-zinc-950 justify-start w-full relative ">
        {/* Sidebar Desktop */}
        <motion.div
          className="hidden md:flex sticky top-10 rounded-lg bg-zinc-900/50 border border-zinc-800 flex-col items-start justify-start gap-8 h-screen z-[1000]"
          animate={{
            width: isExpanded || isPinned ? 300 : 64,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header de la sidebar */}
          <div className="flex flex-col items-center w-full justify-between gap-4 p-4">
            <div
              onClick={() => router.push('/')}
              className="text-zinc-200 cursor-pointer font-semibold text-lg"
            >
              <Image
                src="/images/logo/eclipse-logo.png"
                alt="Eclipse Studio"
                width={32}
                height={32}
              />
            </div>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, delay: 0.1, ease: 'easeInOut' }}
                className="flex flex-row justify-between items-center gap-2 w-full"
              >
                <LanguageToggle />
                <button
                  onClick={togglePin}
                  className="p-1 rounded hover:bg-zinc-800 transition-colors"
                >
                  {isPinned ? (
                    <IconPinFilled size={16} className="text-green-400" />
                  ) : (
                    <IconPin size={16} className="text-zinc-400" />
                  )}
                </button>
              </motion.div>
            )}
          </div>

          {/* Navigation items */}
          <nav className="p-2 flex flex-col gap-1">
            {sidebarItems.map(item => (
              <div key={item.id}>
                <motion.button
                  onClick={() => handleItemClick(item)}
                  className={`group w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 mb-1 ${
                    activeItem === item.id
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>

                  <AnimatePresence mode="wait">
                    {(isExpanded || isPinned) && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="!text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Sous-menus */}
                {item.menuItems && (isExpanded || isPinned) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="ml-6 space-y-1"
                  >
                    {item.menuItems.map(menuItem => (
                      <motion.button
                        key={menuItem.id}
                        onClick={() => handleItemClick(menuItem)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 !text-xs ${
                          pathname === menuItem.path
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        <div className="flex-shrink-0">{menuItem.icon}</div>
                        <span className="!text-sm font-medium whitespace-nowrap">
                          {menuItem.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </nav>
        </motion.div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-sm">
          <nav className="flex items-center justify-around p-2">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 ${
                  activeItem === item.id
                    ? 'text-green-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 overflow-auto w-full h-full md:pl-0 pl-0 pb-20 md:pb-0 md:pt-0 pt-25">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="h-full p-6 w-full"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
