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
  path: string;
}

interface MobileBottomNavProps {
  onNavigate: (path: string) => void;
  onMoreClick: () => void;
}

// Items fixes de la bottom nav (les plus utilisés)
const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: 'home', label: 'Accueil', path: '/dashboard' },
  { id: 'contacts', label: 'Contacts', path: '/dashboard/clients' },
  { id: 'projects', label: 'Projets', path: '/dashboard/projects' },
  { id: 'factures', label: 'Factures', path: '/dashboard/factures' },
];

// Map des icônes
const ICONS: Record<string, { normal: React.ReactNode; active: React.ReactNode }> = {
  home: {
    normal: <IconHome size={22} stroke={1} />,
    active: <IconHome size={22} stroke={1.5} />,
  },
  contacts: {
    normal: <IconUsers size={22} stroke={1} />,
    active: <IconUsers size={22} stroke={1.5} />,
  },
  projects: {
      normal: <IconBuilding size={22} stroke={1} />,
    active: <IconBuilding size={22} stroke={1.5} />,
  },
  factures: {
    normal: <IconFileInvoice size={22} stroke={1} />,
    active: <IconFileInvoice size={22} stroke={1.5} />,
  },
};

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
      {/* Container avec effet bombé violet (dark) ou glass (light) */}
      <nav className="mobile-bottom-nav flex items-center justify-around rounded-2xl px-2 py-1.5">
        {BOTTOM_NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const icons = ICONS[item.id];
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path)}
              className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] rounded-xl transition-all active:scale-95"
            >
              {/* Background indicator pour item actif */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 mobile-nav-indicator rounded-xl"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              
              {/* Icon - couleurs gérées via CSS */}
              <span className={`mobile-nav-icon relative z-10 transition-all ${active ? 'active' : ''}`}>
                {active ? icons.active : icons.normal}
              </span>
              
              {/* Label - couleurs gérées via CSS */}
              <span className={`mobile-nav-label relative z-10 text-[10px] mt-1 font-medium transition-all ${active ? 'active' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Bouton "Plus" pour ouvrir le drawer */}
        <button
          onClick={onMoreClick}
          className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] rounded-xl transition-all active:scale-95"
        >
          <span className="mobile-nav-icon">
            <IconLayoutGrid size={22} stroke={1.5} />
          </span>
          <span className="mobile-nav-label text-[10px] mt-1 font-medium">
            Plus
          </span>
        </button>
      </nav>
      
      {/* Safe area pour les iPhones avec encoche */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
