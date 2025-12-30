'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  IconTrendingUp,
  IconBuildings,
  IconFileInvoice,
  IconChevronDown,
  IconSettings,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import TrialExpiredGuard from '@/app/components/TrialExpiredGuard';
import LanguageToggle from '@/app/components/LanguageToggle';
import { useLanguage } from '@/app/context/LanguageContext';
import { BreadCrumb } from '@/app/components/BreadCrumb';
import { useCurrentUser } from '@/hooks/useApi';
import NotificationBell from '@/app/components/NotificationBell';
import { useTheme } from '@/app/context/ThemeContext';
import { useSidebar } from '@/app/context/SidebarContext';

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
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();

  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const { isLinkVisible } = useSidebar();
  const [menuItemHovered, setMenuItemHovered] = useState<string | null>(null);

  // Hook pour l'utilisateur avec profile_picture
  const { data: currentUserData } = useCurrentUser(user?.id);
  
  // URL de la photo de profil
  const profilePictureUrl = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData = currentUserData as any;
    if (userData?.profile_picture?.url) {
      return process.env.NEXT_PUBLIC_STRAPI_URL + userData.profile_picture.url;
    }
    return null;
  }, [currentUserData]);

  // Détecter si on est sur desktop (lg breakpoint = 1024px)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Désactiver le scroll du body sur le dashboard pour éviter le double scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  // Définir les items de la sidebar avec l'image de profil dynamique
  const sidebarItems: SidebarItem[] = useMemo(() => [
    {
      id: 'home',
      label: t('dashboard'),
      icon: <IconHome size={20} stroke={1} />,
      path: '/dashboard',
    },
    {
      id: 'revenue',
      label: t('revenue'),
      icon: <IconTrendingUp size={20} stroke={1} />,
      path: '/dashboard/revenue',
      menuItems: [
        {
          id: 'factures',
          label: t('invoices'),
          icon: <IconFileInvoice size={20} stroke={1} />,
          path: '/dashboard/factures',
        },
      ],
    },
    {
      id: 'clients',
      label: t('clients'),
      icon: <IconUsers size={20} stroke={1} />,
      path: '/dashboard/clients',
    },
    {
      id: 'prospects',
      label: t('prospects'),
      icon: <IconMagnet size={20} stroke={1} />,
      path: '/dashboard/prospects',
    },
    {
      id: 'projects',
      label: t('projects'),
      icon: <IconBuilding size={20} stroke={1} />,
      path: '/dashboard/projects',
    },
    {
      id: 'mentors',
      label: t('mentors'),
      icon: <IconBrain size={20} stroke={1} />,
      path: '/dashboard/mentors',
    },
    {
      id: 'newsletters',
      label: t('newsletters'),
      icon: <IconMail size={20} stroke={1} />,
      path: '/dashboard/newsletters',
    },
    {
      id: 'profile',
      label: t('profile'),
      icon: (
        <div className="flex w-5 h-5 cursor-pointer hover:border-violet-300 transition-all ease-in-out duration-300 border-orange-300 border-2 rounded-full relative overflow-hidden">
          <Image
            alt="user profile picture"
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
          icon: <IconUser size={20} stroke={1} />,
          path: '/dashboard/profile/personal-information',
        },
        {
          id: 'your_subscription',
          label: t('your_subscription'),
          icon: <IconCreditCard size={20} stroke={1} />,
          path: '/dashboard/profile/your-subscription',
        },
        {
          id: 'your_enterprise',
          label: t('your_enterprise'),
          icon: <IconBuildings size={20} stroke={1} />,
          path: '/dashboard/profile/your-company',
        },
        {
          id: 'settings',
          label: t('settings') || 'Paramètres',
          icon: <IconSettings size={20} stroke={1} />,
          path: '/dashboard/settings',
        },
      ],
    },
    {
      id: 'logout',
      label: t('logout'),
      icon: <IconLogout size={20} stroke={1} />,
      onClick: logout,
      path: '/login?type=login',
    },
  ], [t, profilePictureUrl, logout]);

  // Filtrer les items selon les préférences de visibilité
  const visibleSidebarItems = useMemo(() => {
    return sidebarItems.filter(item => isLinkVisible(item.id));
  }, [sidebarItems, isLinkVisible]);

  // Déterminer l'item actif basé sur l'URL
  const activeItem = useMemo(() => {
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
  }, [sidebarItems, pathname]);

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
      <TrialExpiredGuard>
        {/* Notification Bell - Fixed en haut à droite */}
        <NotificationBell />
        
        <div className="flex h-screen w-full">
          {/* Sidebar Desktop - Fixed height */}
          <motion.div
            className="hidden lg:flex fixed left-0 top-0 bg-zinc-900/95 backdrop-blur-sm border-r border-zinc-800 flex-col items-start justify-start gap-8 h-screen z-[1000] overflow-hidden transition-colors duration-300"
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
                className="text-zinc-200 cursor-pointer font-semibold !text-lg"
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
                  <div className="flex items-center gap-1">
                    {/* Theme Switch */}
                    <button
                      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors group"
                      title={resolvedTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    >
                      {resolvedTheme === 'dark' ? (
                        <IconSun size={16} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                      ) : (
                        <IconMoon size={16} className="text-violet-400 group-hover:text-violet-300 transition-colors" />
                      )}
                    </button>
                    {/* Pin Button */}
                    <button
                      onClick={togglePin}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      {isPinned ? (
                        <IconPinFilled size={16} className="text-violet-400" />
                      ) : (
                        <IconPin size={16} className="text-zinc-200" />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Navigation items */}
            <nav className="p-2 flex flex-col gap-1">
              {visibleSidebarItems.map(item => (
                <div
                  key={item.id}
                  onMouseEnter={() => setMenuItemHovered(item.id)}
                  onMouseLeave={() => setMenuItemHovered(null)}
                >
                  <motion.button
                    onClick={() => handleItemClick(item)}
                    className={`group w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 mb-1 ${
                      activeItem === item.id
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100'
                    }`}
                  >
                    <div className={`flex-shrink-0 transition-colors ${
                      activeItem === item.id ? 'text-violet-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}>{item.icon}</div>

                    <AnimatePresence mode="sync">
                      {(isExpanded || isPinned) && (
                        <motion.div
                          key={`menu-content-${item.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <span className="!text-sm font-medium whitespace-nowrap">
                            {item.label}
                          </span>
                          {item.menuItems && (
                            <IconChevronDown
                              size={16}
                              className={`group-hover:rotate-180 transition-all duration-200 ${
                                pathname === item.path
                                  ? 'rotate-180 text-violet-400'
                                  : 'text-zinc-400'
                              }`}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Sous-menus */}
                  {item.menuItems &&
                    (isExpanded || isPinned) &&
                    (menuItemHovered === item.id || pathname === item.path) && (
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
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 text-xs ${
                              pathname === menuItem.path
                                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                : 'text-zinc-200 hover:bg-zinc-800 hover:text-violet-400'
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
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-sm transition-colors duration-300">
            <nav className="flex items-center justify-around p-2">
              {visibleSidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 ${
                    activeItem === item.id
                      ? 'text-violet-400'
                      : 'text-zinc-400 hover:text-violet-400'
                  }`}
                >
                  <div className={`flex-shrink-0 ${activeItem === item.id ? 'text-violet-400' : ''}`}>{item.icon}</div>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu principal - seul élément scrollable */}
          <motion.main
            className="h-screen overflow-y-scroll overflow-x-hidden w-full"
            animate={{
              marginLeft: isDesktop ? (isExpanded || isPinned ? 300 : 64) : 0,
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="w-full lg:p-6 p-4 pb-32 lg:my-24 min-h-full">
              <BreadCrumb />
              {children}
            </div>
          </motion.main>
        </div>
      </TrialExpiredGuard>
    </ProtectedRoute>
  );
}
