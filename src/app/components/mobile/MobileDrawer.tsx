'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconX, IconChevronRight } from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import SidebarLogo from '../SidebarLogo';

export interface MobileDrawerItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  onClick?: () => void;
  isCategory?: boolean;
  menuItems?: MobileDrawerItem[];
  status?: 'beta' | 'new';
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MobileDrawerItem[];
  activeItem: string;
  activeCategory: string | null;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  items,
  activeItem,
  activeCategory,
}: MobileDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Une seule catégorie ouverte à la fois (null = toutes fermées)
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  // Quand le drawer s'ouvre, ouvrir uniquement la catégorie de la page courante
  React.useEffect(() => {
    if (isOpen) {
      setExpandedCategory(activeCategory);
    }
  }, [isOpen, activeCategory]);

  // Accordéon exclusif : ouvrir une catégorie ferme les autres
  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(prev => 
      prev === categoryId ? null : categoryId
    );
  };

  const handleItemClick = (item: MobileDrawerItem) => {
    if (item.onClick) {
      item.onClick();
      onClose();
    } else if (item.path) {
      router.push(item.path);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[320px] z-[1101] overflow-hidden"
          >
            {/* Glass container */}
            <div className="mobile-drawer-glass h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-default">
                <SidebarLogo />
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted hover:bg-muted transition-colors active:scale-95"
                >
                  <IconX size={15} className="text-primary" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1 mobile-drawer-scroll">
                {items.map(item => (
                  <div key={item.id}>
                    {item.isCategory ? (
                      <>
                        {/* Category header */}
                        <button
                          onClick={() => toggleCategory(item.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            activeCategory === item.id
                              ? 'bg-accent-muted !text-accent'
                              : 'text-secondary hover:bg-hover'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-current">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <IconChevronRight
                            size={18}
                            className={`transition-transform duration-200 ${
                              expandedCategory === item.id ? 'rotate-90' : ''
                            }`}
                          />
                        </button>

                        {/* Category items */}
                        <AnimatePresence>
                          {expandedCategory === item.id && item.menuItems && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-default !pl-3">
                                {item.menuItems.map(subItem => (
                                  <button
                                    key={subItem.id}
                                    onClick={() => handleItemClick(subItem)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all active:scale-98 ${
                                      activeItem === subItem.id || pathname === subItem.path
                                        ? 'bg-accent-muted !text-accent font-medium'
                                        : 'text-secondary hover:bg-hover hover:text-primary'
                                    }`}
                                  >
                                    <span className="text-current opacity-80">{subItem.icon}</span>
                                    <span className="text-sm">{subItem.label}</span>
                                    {subItem.status && (
                                      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        subItem.status === 'beta'
                                          ? 'bg-warning-light text-warning-text border border-warning'
                                          : 'bg-success-light !text-success-text -text border border-success'
                                      }`}>
                                        {subItem.status === 'beta' ? 'Beta' : 'New'}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      /* Regular item (logout, admin, etc.) */
                      <button
                        onClick={() => handleItemClick(item)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-98 ${
                          activeItem === item.id
                            ? 'bg-accent-muted !text-accent font-medium'
                            : 'text-secondary hover:bg-hover hover:text-primary'
                        }`}
                      >
                        <span className="text-current">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    )}
                  </div>
                ))}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-default">
                <p className="!text-xs text-muted text-center">
                  Eclipse Dashboard © 2026
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
