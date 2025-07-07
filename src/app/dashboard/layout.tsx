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
} from '@tabler/icons-react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { fetchUserById } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useLenis from '@/utils/useLenis';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  onClick?: () => void;
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
  useLenis();

  // Définir les items de la sidebar avec l'image de profil dynamique
  const sidebarItems: SidebarItem[] = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: <IconHome size={20} />,
      path: '/dashboard',
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: <IconUsers size={20} />,
      path: '/dashboard/clients',
    },
    {
      id: 'prospects',
      label: 'Prospects',
      icon: <IconMagnet size={20} />,
      path: '/dashboard/prospects',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <IconBuilding size={20} />,
      path: '/dashboard/projects',
    },
    {
      id: 'mentors',
      label: 'Mentors',
      icon: <IconBrain size={20} />,
      path: '/dashboard/mentors',
    },
    {
      id: 'newsletters',
      label: 'Newsletters',
      icon: <IconMail size={20} />,
      path: '/dashboard/newsletters',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <Image
          src={profilePictureUrl || '/images/logo/eclipse-logo.png'}
          alt="Profile Picture"
          width={20}
          height={20}
          className="rounded-full"
        />
      ),
      path: '/dashboard/profile',
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: <IconLogout size={20} />,
      onClick: logout,
      path: '/login?type=login',
    },
  ];

  // Déterminer l'item actif basé sur l'URL
  const activeItem =
    sidebarItems.find(item => item.path === pathname)?.id || 'home';

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else {
      router.push(item.path);
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
      <div className="flex min-h-screen bg-zinc-950 justify-start w-full ">
        {/* Sidebar */}
        <motion.div
          className="sticky top-10 bg-zinc-900/50 border border-zinc-900 flex flex-col items-start justify-start gap-8 h-full"
          animate={{
            width: isExpanded || isPinned ? 240 : 64,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header de la sidebar */}
          <div className="flex items-center w-full justify-between p-4">
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
                className="flex items-center gap-2"
              >
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
          <nav className="p-2">
            {sidebarItems.map(item => (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 mb-1 ${
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
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </nav>
        </motion.div>

        {/* Contenu principal */}
        <div className="flex-1 overflow-auto w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full p-6 w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ProtectedRoute>
  );
}
