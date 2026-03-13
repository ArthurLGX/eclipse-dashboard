'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconCreditCard,
  IconBuildings,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useSidebar } from '@/app/context/SidebarContext';
import { useUserPreferencesOptional } from '@/app/context/UserPreferencesContext';

interface ProfileDropdownProps {
  profilePictureUrl: string | null;
  onLogout: () => void;
}

const ACCOUNT_ITEMS: Array<{
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }> | null;
  path: string;
  useProfileIcon?: boolean;
  moduleId?: string;
  labelFallback?: string;
}> = [
  { id: 'profile', labelKey: 'profile', icon: null, path: '/dashboard/profile/personal-information', useProfileIcon: true },
  { id: 'your_subscription', labelKey: 'your_subscription', icon: IconCreditCard, path: '/dashboard/profile/your-subscription', moduleId: 'profile' },
  { id: 'your_enterprise', labelKey: 'your_enterprise', icon: IconBuildings, path: '/dashboard/profile/your-company' },
  { id: 'settings', labelKey: 'settings', icon: IconSettings, path: '/dashboard/settings', labelFallback: 'Paramètres' },
];

export default function ProfileDropdown({
  profilePictureUrl,
  onLogout,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const { isLinkVisible } = useSidebar();
  const userPreferences = useUserPreferencesOptional();
  const isModuleEnabled = userPreferences?.isModuleEnabled ?? (() => true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleItems = ACCOUNT_ITEMS.filter(item => {
    if (!isLinkVisible(item.id)) return false;
    if (item.moduleId && !isModuleEnabled(item.moduleId)) return false;
    return true;
  });

  const handleItemClick = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-card backdrop-blur-sm border border-default hover:bg-hover !text-muted hover:!text-primary transition-all shadow-theme-lg rounded-full overflow-hidden"
        title={t('profile') || 'Mon compte'}
      >
        <div className="w-10 h-10 rounded-full border-2 border-warning overflow-hidden relative">
          <Image
            alt="Profile"
            src={profilePictureUrl || '/images/logo/eclipse-logo.png'}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-card border border-default shadow-2xl overflow-hidden rounded-lg z-[1003]"
          >
            <div className="py-2">
              {visibleItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors !text-left"
                >
                  {item.useProfileIcon ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-default">
                      <Image
                        alt=""
                        src={profilePictureUrl || '/images/logo/eclipse-logo.png'}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    item.icon && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 !text-primary" />
                      </div>
                    )
                  )}
                  <span className="!text-sm font-medium !text-primary">
                    {t(item.labelKey) || item.labelFallback || item.labelKey}
                  </span>
                </button>
              ))}
              <div className="border-t border-default my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors !text-left !text-danger"
              >
                <div className="w-8 h-8 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
                  <IconLogout className="w-4 h-4 !text-danger" />
                </div>
                <span className="!text-sm font-medium">{t('logout') || 'Déconnexion'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
