'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconUsers,
  IconFileInvoice,
  IconBuilding,
  IconLayoutGrid,
} from '@tabler/icons-react';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  path: string;
}

interface MobileBottomNavProps {
  onNavigate: (path: string) => void;
  onMoreClick: () => void;
}

// Items fixes de la bottom nav (les plus utilisés)
const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    id: 'home',
    label: 'Accueil',
    icon: <IconHome size={22} stroke={1.5} />,
    activeIcon: <IconHome size={22} stroke={2} />,
    path: '/dashboard',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: <IconUsers size={22} stroke={1.5} />,
    activeIcon: <IconUsers size={22} stroke={2} />,
    path: '/dashboard/clients',
  },
  {
    id: 'projects',
    label: 'Projets',
    icon: <IconBuilding size={22} stroke={1.5} />,
    activeIcon: <IconBuilding size={22} stroke={2} />,
    path: '/dashboard/projects',
  },
  {
    id: 'factures',
    label: 'Factures',
    icon: <IconFileInvoice size={22} stroke={1.5} />,
    activeIcon: <IconFileInvoice size={22} stroke={2} />,
    path: '/dashboard/factures',
  },
];

export default function MobileBottomNav({
  onNavigate,
  onMoreClick,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] px-4 pb-4 pt-2">
      {/* Glass container avec coins arrondis */}
      <nav className="flex items-center justify-around bg-card/80 backdrop-blur-xl border border-default/50 rounded-2xl px-2 py-1.5 shadow-lg shadow-black/20">
        {BOTTOM_NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path)}
              className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] rounded-xl transition-colors"
            >
              {/* Background indicator */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-accent/15 rounded-xl"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              
              {/* Icon */}
              <span className={`relative z-10 transition-colors ${
                active ? 'text-accent' : 'text-secondary'
              }`}>
                {active ? (item.activeIcon || item.icon) : item.icon}
              </span>
              
              {/* Label */}
              <span className={`relative z-10 text-[10px] mt-1 font-medium transition-colors ${
                active ? 'text-accent' : 'text-muted'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Bouton "Plus" pour ouvrir le drawer */}
        <button
          onClick={onMoreClick}
          className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] rounded-xl transition-colors"
        >
          <span className="text-secondary">
            <IconLayoutGrid size={22} stroke={1.5} />
          </span>
          <span className="text-[10px] mt-1 font-medium text-muted">
            Plus
          </span>
        </button>
      </nav>
      
      {/* Safe area pour les iPhones avec encoche */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}

