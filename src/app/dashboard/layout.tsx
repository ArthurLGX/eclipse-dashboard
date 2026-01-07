'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, usePathname } from 'next/navigation';
import { OnboardingProvider } from '@/app/context/OnboardingContext';
import { UserPreferencesProvider, useUserPreferencesOptional } from '@/app/context/UserPreferencesContext';
import OnboardingWizard from '@/app/components/OnboardingWizard';
import BusinessSetupModal from '@/app/components/BusinessSetupModal';
import useLenis from '@/utils/useLenis';
import {
  IconHome,
  IconUsers,
  IconBuilding,
  IconMagnet,
  IconBrain,
  IconMail,
  IconSend,
  IconPin,
  IconPinFilled,
  IconLogout,
  IconCreditCard,
  IconBuildings,
  IconFileInvoice,
  IconChevronDown,
  IconSettings,
  IconSun,
  IconMoon,
  IconChartLine,
  IconPhoto,
  IconFolder,
  IconActivity,
  IconUsersGroup,
  IconBriefcase,
  IconUserCog,
  IconShield,
  IconServer,
  IconClock,
  IconFileDescription,
  IconCalendar,
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
import TimerIndicator from '@/app/components/TimerIndicator';
import { useTheme } from '@/app/context/ThemeContext';
import { useSidebar } from '@/app/context/SidebarContext';
import SidebarLogo from '@/app/components/SidebarLogo';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  onClick?: () => void;
  menuItems?: SidebarItem[];
  isCategory?: boolean; // Pour les catégories avec sous-menus
  moduleId?: string; // ID du module pour le filtrage dynamique
}

// Wrapper component that provides the context
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <TrialExpiredGuard>
        <UserPreferencesProvider>
          <OnboardingProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
          </OnboardingProvider>
        </UserPreferencesProvider>
      </TrialExpiredGuard>
    </ProtectedRoute>
  );
}

// Inner component that can use the UserPreferences context
function DashboardLayoutContent({
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
  
  // Hook pour les préférences utilisateur (modules activés) - NOW INSIDE THE PROVIDER
  const userPreferences = useUserPreferencesOptional();

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

  // Vérifier si l'utilisateur est admin
  const isAdmin = useMemo(() => {
    const adminEmails = ['admin@eclipsestudio.dev', 'arthur@eclipsestudio.dev', 'arthur.legoux@gmail.com'];
    if (!user) return false;
    
    // Vérifier par email
    if (adminEmails.includes(user.email)) return true;
    
    // Vérifier par rôle - supporter différentes structures
    const userRole = user.role;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUserRole = (currentUserData as any)?.role;
    
    // Vérifier le rôle depuis currentUserData (plus complet)
    if (currentUserRole) {
      if (typeof currentUserRole === 'string' && currentUserRole.toLowerCase() === 'admin') return true;
      if (typeof currentUserRole === 'object') {
        const roleName = currentUserRole.name?.toLowerCase() || currentUserRole.type?.toLowerCase();
        if (roleName === 'admin') return true;
      }
    }
    
    // Vérifier le rôle depuis user
    if (typeof userRole === 'string' && userRole.toLowerCase() === 'admin') return true;
    if (typeof userRole === 'object' && userRole) {
      const roleName = (userRole as { name?: string; type?: string }).name?.toLowerCase() || 
                       (userRole as { name?: string; type?: string }).type?.toLowerCase();
      if (roleName === 'admin') return true;
    }
    
    return false;
  }, [user, currentUserData]);

  // Détecter si on est sur desktop (lg breakpoint = 1024px)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Activer Lenis pour le smooth scroll
  useLenis();

  // Définir les items de la sidebar avec catégories en menus déroulants
  const sidebarItems: SidebarItem[] = useMemo(() => [
    // ═══════════════════════════════════════
    // ACTIVITÉ (Menu déroulant)
    // ═══════════════════════════════════════
    {
      id: 'category_activity',
      label: t('category_activity') || 'Activité',
      icon: <IconActivity size={20} stroke={1} />,
      isCategory: true,
      menuItems: [
        {
          id: 'home',
          label: t('dashboard'),
          icon: <IconHome size={20} stroke={1} />,
          path: '/dashboard',
        },
        {
          id: 'global_revenue_stats',
          label: t('global_revenue_stats'),
          icon: <IconChartLine size={20} stroke={1} />,
          path: '/dashboard/revenue',
        },
        {
          id: 'factures',
          label: t('factures'),
          icon: <IconFileInvoice size={20} stroke={1} />,
          path: '/dashboard/factures',
        },
      ],
    },

    // ═══════════════════════════════════════
    // RELATIONS (Menu déroulant)
    // ═══════════════════════════════════════
    {
      id: 'category_relations',
      label: t('category_relations') || 'Relations',
      icon: <IconUsersGroup size={20} stroke={1} />,
      isCategory: true,
      menuItems: [
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
          id: 'mentors',
          label: t('mentors'),
          icon: <IconBrain size={20} stroke={1} />,
          path: '/dashboard/mentors',
        },
      ],
    },

    // ═══════════════════════════════════════
    // GESTION (Menu déroulant)
    // ═══════════════════════════════════════
    {
      id: 'category_management',
      label: t('category_management') || 'Gestion',
      icon: <IconBriefcase size={20} stroke={1} />,
      isCategory: true,
      menuItems: [
        {
          id: 'projects',
          label: t('projects'),
          icon: <IconBuilding size={20} stroke={1} />,
          path: '/dashboard/projects',
          moduleId: 'projects',
        },
        {
          id: 'newsletters',
          label: t('newsletters'),
          icon: <IconMail size={20} stroke={1} />,
          path: '/dashboard/newsletters',
          moduleId: 'newsletters',
        },
        {
          id: 'emails',
          label: t('emails') || 'Emails',
          icon: <IconSend size={20} stroke={1} />,
          path: '/dashboard/emails',
          moduleId: 'emails',
        },
        // Modules optionnels (visibles selon les préférences)
        {
          id: 'monitoring',
          label: t('monitoring') || 'Monitoring',
          icon: <IconServer size={20} stroke={1} />,
          path: '/dashboard/monitoring',
          moduleId: 'monitoring',
        },
        {
          id: 'time_tracking',
          label: t('time_tracking') || 'Suivi du temps',
          icon: <IconClock size={20} stroke={1} />,
          path: '/dashboard/time-tracking',
          moduleId: 'time_tracking',
        },
        {
          id: 'quotes',
          label: t('quotes') || 'Devis',
          icon: <IconFileDescription size={20} stroke={1} />,
          path: '/dashboard/devis',
          moduleId: 'quotes',
        },
        {
          id: 'calendar',
          label: t('calendar') || 'Calendrier',
          icon: <IconCalendar size={20} stroke={1} />,
          path: '/dashboard/calendar',
          moduleId: 'calendar',
        },
      ],
    },

    // ═══════════════════════════════════════
    // RESSOURCES (Menu déroulant)
    // ═══════════════════════════════════════
    {
      id: 'category_resources',
      label: t('category_resources') || 'Ressources',
      icon: <IconFolder size={20} stroke={1} />,
      isCategory: true,
      menuItems: [
        {
          id: 'media_library',
          label: t('media_library') || 'Bibliothèque',
          icon: <IconPhoto size={20} stroke={1} />,
          path: '/dashboard/newsletters/library',
        },
      ],
    },

    // ═══════════════════════════════════════
    // COMPTE (Menu déroulant)
    // ═══════════════════════════════════════
    {
      id: 'category_account',
      label: t('category_account') || 'Compte',
      icon: <IconUserCog size={20} stroke={1} />,
      isCategory: true,
      menuItems: [
        {
          id: 'profile',
          label: t('profile'),
          icon: (
            <div className="flex w-5 h-5 cursor-pointer hover:border-accent transition-all ease-in-out duration-300 border-warning border-2 rounded-full relative overflow-hidden">
              <Image
                alt="user profile picture"
                src={profilePictureUrl || '/images/logo/eclipse-logo.png'}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          ),
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

    // ═══════════════════════════════════════
    // ADMINISTRATION (Visible uniquement pour les admins)
    // ═══════════════════════════════════════
    ...(isAdmin ? [{
      id: 'admin',
      label: t('admin_dashboard') || 'Administration',
      icon: <IconShield size={20} stroke={1} />,
      path: '/admin',
    }] : []),

    // ═══════════════════════════════════════
    // DÉCONNEXION (Toujours visible)
    // ═══════════════════════════════════════
    {
      id: 'logout',
      label: t('logout'),
      icon: <IconLogout size={20} stroke={1} />,
      onClick: logout,
      path: '/login?type=login',
    },
  ], [t, profilePictureUrl, logout, isAdmin]);

  // Filtrer les items selon les préférences de visibilité ET les modules activés
  const visibleSidebarItems = useMemo(() => {
    const isModuleEnabled = userPreferences?.isModuleEnabled ?? (() => true);
    
    // DEBUG: Log pour vérifier les modules activés
    console.log('🔧 UserPreferences Debug:', {
      hasContext: !!userPreferences,
      enabledModules: userPreferences?.enabledModules,
      loading: userPreferences?.loading,
      testTimeTracking: isModuleEnabled('time_tracking'),
      testCalendar: isModuleEnabled('calendar'),
    });
    
    return sidebarItems
      .filter(item => isLinkVisible(item.id))
      .map(item => {
        // Si c'est une catégorie, filtrer aussi ses enfants
        if (item.isCategory && item.menuItems) {
          return {
            ...item,
            menuItems: item.menuItems.filter(child => {
              // Vérifier la visibilité de base
              if (!isLinkVisible(child.id)) return false;
              // Vérifier si le module est activé (si moduleId est défini)
              if (child.moduleId && !isModuleEnabled(child.moduleId)) return false;
              return true;
            }),
          };
        }
        return item;
      })
      // Retirer les catégories vides (sans enfants visibles)
      .filter(item => !item.isCategory || (item.menuItems && item.menuItems.length > 0));
  }, [sidebarItems, isLinkVisible, userPreferences]);

  // Déterminer l'item actif et la catégorie active basés sur l'URL
  const { activeItem, activeCategory } = useMemo(() => {
    // Chercher dans les catégories
    for (const item of sidebarItems) {
      if (item.isCategory && item.menuItems) {
        const activeChild = item.menuItems.find(
          menuItem => menuItem.path === pathname
        );
        if (activeChild) {
          return { activeItem: activeChild.id, activeCategory: item.id };
        }
      }
      // Item normal avec sous-menus (comme profile)
      if (item.menuItems && !item.isCategory) {
        const isOnMenuItem = item.menuItems.some(
          menuItem => menuItem.path === pathname
        );
        if (isOnMenuItem) {
          return { activeItem: item.id, activeCategory: null };
        }
      }
    }

    // Sinon, chercher un item principal direct
    const mainItem = sidebarItems.find(item => item.path === pathname);
    return { activeItem: mainItem?.id || 'home', activeCategory: null };
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
    <>
      {/* Business Setup Modal - S'affiche si les préférences ne sont pas configurées */}
      <BusinessSetupModal />
      
      {/* Onboarding Wizard Modal */}
      <OnboardingWizard />
      
      {/* Timer Indicator - Fixed en haut à droite (à côté des notifications) */}
      <TimerIndicator />
      
      {/* Notification Bell - Fixed en haut à droite */}
      <NotificationBell />
    
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
                onClick={() => router.push('/')}
                className="text-primary cursor-pointer font-semibold !text-lg"
              >
                <SidebarLogo />
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
            <nav className="p-2 flex flex-col gap-0.5">
              {visibleSidebarItems.map(item => (
                <div
                  key={item.id}
                  onMouseEnter={() => setMenuItemHovered(item.id)}
                  onMouseLeave={() => setMenuItemHovered(null)}
                >
                  {/* Affichage des catégories (menus déroulants) */}
                  {item.isCategory ? (
                    <>
                      <motion.button
                        className={`nav-item group w-full mb-0.5 ${activeCategory === item.id ? 'active' : ''}`}
                      >
                        <div className="flex-shrink-0 transition-colors">{item.icon}</div>

                        <AnimatePresence mode="sync">
                          {(isExpanded || isPinned) && (
                            <motion.div
                              key={`category-content-${item.id}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <span className="!text-sm font-medium whitespace-nowrap">
                                {item.label}
                              </span>
                              <IconChevronDown
                                size={16}
                                className={`transition-all duration-200 ${
                                  menuItemHovered === item.id || activeCategory === item.id ? 'rotate-180' : ''
                                }`}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>

                      {/* Sous-menus de catégorie */}
                      <AnimatePresence>
                        {item.menuItems &&
                          (isExpanded || isPinned) &&
                          (menuItemHovered === item.id || activeCategory === item.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-6 space-y-0.5 overflow-hidden"
                            >
                              {item.menuItems.map(menuItem => (
                                <motion.button
                                  key={menuItem.id}
                                  onClick={() => handleItemClick(menuItem)}
                                  className={`nav-item w-full text-xs ${activeItem === menuItem.id ? 'active' : ''}`}
                                >
                                  <div className="flex-shrink-0">{menuItem.icon}</div>
                                  <span className="!text-sm font-medium whitespace-nowrap">
                                    {menuItem.label}
                                  </span>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </>
                  ) : (
                    /* Affichage des items normaux (logout) */
                    <motion.button
                      onClick={() => handleItemClick(item)}
                      className={`nav-item group w-full mb-0.5 ${activeItem === item.id ? 'active' : ''}`}
                    >
                      <div className="flex-shrink-0 transition-colors">{item.icon}</div>

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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )}
                </div>
              ))}
            </nav>
          </motion.div>

          {/* Mobile Bottom Navigation - Ne pas afficher les catégories */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-card border-t border-default backdrop-blur-sm transition-colors duration-300">
            <nav className="flex items-center justify-around p-2">
              {visibleSidebarItems
                .filter(item => !item.isCategory)
                .slice(0, 5) // Limiter à 5 items pour mobile
                .map(item => (
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

          {/* Contenu principal - scroll géré par Lenis sur le body */}
          <motion.main
            className="min-h-screen w-full "
            animate={{
              marginLeft: isDesktop ? (isExpanded || isPinned ? 300 : 64) : 0,
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="w-full lg:p-6 p-4">
              <BreadCrumb />
              {children}
            </div>
          </motion.main>
      </div>
    </>
  );
}
