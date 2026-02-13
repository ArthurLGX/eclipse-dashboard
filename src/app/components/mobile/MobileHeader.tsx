'use client';

import React from 'react';
import { IconMenu2 } from '@tabler/icons-react';
import SidebarLogo from '../SidebarLogo';

interface MobileHeaderProps {
  onMenuClick: () => void;
  rightContent?: React.ReactNode;
}

export default function MobileHeader({
  onMenuClick,
  rightContent,
}: MobileHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-[1000] px-4 py-3">
      {/* Glass container - 3 colonnes égales */}
      <div className="mobile-header-glass grid grid-cols-3 items-center  px-3 py-2.5">
        {/* Left: Hamburger */}
        <div className="flex items-center justify-start">
          <button
            onClick={onMenuClick}
            className="w-10 h-10 flex items-center justify-center  hover:bg-hover transition-colors active:scale-95"
            aria-label="Ouvrir le menu"
          >
            <IconMenu2 size={22} className="text-primary" />
          </button>
        </div>

        {/* Center: Logo */}
        <div className="flex items-center justify-center">
          <SidebarLogo />
        </div>

        {/* Right: Actions (notifications, etc.) */}
        <div className="flex items-center justify-end">
          {rightContent}
        </div>
      </div>
    </header>
  );
}
