'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, usePathname } from 'next/navigation';
import useLenis from '@/utils/useLenis';
import {
  IconLayoutDashboard,
  IconUsers,
  IconCreditCard,
  IconServer,
  IconHistory,
  IconSettings,
  IconLogout,
  IconPin,
  IconPinFilled,
  IconSun,
  IconMoon,
  IconChevronLeft,
  IconShield,
} from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import LanguageToggle from '@/app/components/LanguageToggle';
import { useLanguage } from '@/app/context/LanguageContext';
import { BreadCrumb } from '@/app/components/BreadCrumb';
import { useTheme } from '@/app/context/ThemeContext';
import SidebarLogo from '@/app/components/SidebarLogo';

interface SidebarItem {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ReactNode;
  path?: string;
  onClick?: () => void;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();

  // Détecter si on est sur desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Activer Lenis pour le smooth scroll
  useLenis();

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const adminEmails = ['admin@eclipsestudio.dev', 'arthur@eclipsestudio.dev'];
      let userRole = '';
      if (user.role) {
        if (typeof user.role === 'string') {
          userRole = user.role;
        } else if (typeof user.role === 'object') {
          const roleObj = user.role as unknown as { type?: string; name?: string };
          userRole = roleObj.type || roleObj.name || '';
        }
      }
      const isUserAdmin = adminEmails.includes(user.email) || userRole.toLowerCase() === 'admin';

      if (!isUserAdmin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [user, router]);

  // Items de navigation admin
  const sidebarItems: SidebarItem[] = useMemo(() => [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      labelEn: 'Overview',
      icon: <IconLayoutDashboard size={20} stroke={1} />,
      path: '/admin',
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      labelEn: 'Users',
      icon: <IconUsers size={20} stroke={1} />,
      path: '/admin/users',
    },
    {
      id: 'subscriptions',
      label: 'Abonnements',
      labelEn: 'Subscriptions',
      icon: <IconCreditCard size={20} stroke={1} />,
      path: '/admin/subscriptions',
    },
    {
      id: 'server',
      label: 'Serveur',
      labelEn: 'Server',
      icon: <IconServer size={20} stroke={1} />,
      path: '/admin/server',
    },
    {
      id: 'logs',
      label: 'Logs & Audit',
      labelEn: 'Logs & Audit',
      icon: <IconHistory size={20} stroke={1} />,
      path: '/admin/logs',
    },
    {
      id: 'settings',
      label: 'Configuration',
      labelEn: 'Settings',
      icon: <IconSettings size={20} stroke={1} />,
      path: '/admin/settings',
    },
    {
      id: 'back',
      label: 'Retour au dashboard',
      labelEn: 'Back to dashboard',
      icon: <IconChevronLeft size={20} stroke={1} />,
      path: '/dashboard',
    },
    {
      id: 'logout',
      label: 'Déconnexion',
      labelEn: 'Logout',
      icon: <IconLogout size={20} stroke={1} />,
      onClick: logout,
      path: '/login',
    },
  ], [logout]);

  const activeItem = useMemo(() => {
    const item = sidebarItems.find(item => item.path === pathname);
    return item?.id || 'overview';
  }, [sidebarItems, pathname]);

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    }
    if (item.path) {
      router.push(item.path);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 p-8 bg-card rounded-2xl border border-default shadow-xl"
        >
          <div className="relative">
            <div className="w-12 h-12 border-4 border-accent/20 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-medium text-primary">Vérification des accès</p>
            <p className="text-sm text-muted">Veuillez patienter...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="dashboard-wrapper flex min-h-screen w-full">
        {/* Sidebar Desktop - Fixed */}
        <motion.div
          className="sidebar hidden lg:flex fixed left-0 top-0 backdrop-blur-sm flex-col items-start justify-start gap-8 h-screen z-[1000] overflow-hidden transition-colors duration-300"
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
              onClick={() => router.push('/admin')}
              className="text-primary cursor-pointer font-semibold !text-lg flex items-center gap-2"
            >
              {isExpanded || isPinned ? (
                <div className="flex items-center gap-3">
                  <SidebarLogo />
                  <span className="text-xs font-medium text-white bg-accent px-2 py-1 rounded-full">
                    Admin
                  </span>
                </div>
              ) : (
                <IconShield size={28} className="text-accent" />
              )}
            </div>

            {(isExpanded || isPinned) && (
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
                    className="btn-ghost p-1.5"
                    title={resolvedTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                  >
                    {resolvedTheme === 'dark' ? (
                      <IconSun size={16} className="text-warning" />
                    ) : (
                      <IconMoon size={16} className="text-accent" />
                    )}
                  </button>
                  {/* Pin Button */}
                  <button
                    onClick={togglePin}
                    className="btn-ghost p-1.5"
                  >
                    {isPinned ? (
                      <IconPinFilled size={16} className="text-accent" />
                    ) : (
                      <IconPin size={16} className="text-secondary" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Navigation items */}
          <nav className="p-2 flex flex-col gap-0.5 flex-1">
            {sidebarItems.slice(0, -2).map(item => (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`nav-item group w-full mb-0.5 ${activeItem === item.id ? 'active' : ''}`}
              >
                <div className="flex-shrink-0 transition-colors">{item.icon}</div>

                <AnimatePresence mode="sync">
                  {(isExpanded || isPinned) && (
                    <motion.span
                      key={`menu-content-${item.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="!text-sm font-medium whitespace-nowrap"
                    >
                      {language === 'fr' ? item.label : item.labelEn}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="p-2 w-full border-t border-default">
            {sidebarItems.slice(-2).map(item => (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`nav-item group w-full mb-0.5 ${
                  item.id === 'logout' ? 'hover:!text-danger' : ''
                } ${activeItem === item.id ? 'active' : ''}`}
              >
                <div className={`flex-shrink-0 transition-colors ${
                  item.id === 'logout' ? 'group-hover:text-danger' : ''
                }`}>
                  {item.icon}
                </div>

                <AnimatePresence mode="sync">
                  {(isExpanded || isPinned) && (
                    <motion.span
                      key={`menu-content-${item.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`!text-sm font-medium whitespace-nowrap ${
                        item.id === 'logout' ? 'group-hover:text-danger' : ''
                      }`}
                    >
                      {language === 'fr' ? item.label : item.labelEn}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-card border-t border-default backdrop-blur-sm transition-colors duration-300">
          <nav className="flex items-center justify-around p-2">
            {sidebarItems.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`nav-item flex-col min-w-0 ${activeItem === item.id ? 'active' : ''}`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu principal */}
        <motion.main
          className="min-h-screen w-full"
          animate={{
            marginLeft: isDesktop ? (isExpanded || isPinned ? 300 : 64) : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <div className="w-full lg:p-6 p-4 pb-20 lg:pb-6">
            <BreadCrumb />
            {children}
          </div>
        </motion.main>
      </div>
    </ProtectedRoute>
  );
}
