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
      {/* Glass container */}
      <div className="flex items-center justify-between bg-card/80 backdrop-blur-xl border border-default/50 rounded-2xl px-4 py-2.5 shadow-lg">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 rounded-xl hover:bg-hover transition-colors active:scale-95"
            aria-label="Ouvrir le menu"
          >
            <IconMenu2 size={22} className="text-primary" />
          </button>
          <div className="h-6 w-px bg-default/50" />
          <SidebarLogo />
        </div>

        {/* Right: Actions (notifications, etc.) */}
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}

