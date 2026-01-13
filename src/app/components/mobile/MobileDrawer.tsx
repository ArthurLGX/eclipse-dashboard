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
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);

  // Ouvrir automatiquement la catégorie active
  React.useEffect(() => {
    if (activeCategory && !expandedCategories.includes(activeCategory)) {
      setExpandedCategories(prev => [...prev, activeCategory]);
    }
  }, [activeCategory, expandedCategories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
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
            <div className="h-full bg-card/95 backdrop-blur-xl border-r border-default/50 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-default/50">
                <SidebarLogo />
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-hover hover:bg-muted transition-colors"
                >
                  <IconX size={20} className="text-secondary" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {items.map(item => (
                  <div key={item.id}>
                    {item.isCategory ? (
                      <>
                        {/* Category header */}
                        <button
                          onClick={() => toggleCategory(item.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            activeCategory === item.id
                              ? 'bg-accent/10 text-accent'
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
                              expandedCategories.includes(item.id) ? 'rotate-90' : ''
                            }`}
                          />
                        </button>

                        {/* Category items */}
                        <AnimatePresence>
                          {expandedCategories.includes(item.id) && item.menuItems && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-default/30 pl-3">
                                {item.menuItems.map(subItem => (
                                  <button
                                    key={subItem.id}
                                    onClick={() => handleItemClick(subItem)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                                      activeItem === subItem.id || pathname === subItem.path
                                        ? 'bg-accent/15 text-accent font-medium'
                                        : 'text-secondary hover:bg-hover hover:text-primary'
                                    }`}
                                  >
                                    <span className="text-current opacity-80">{subItem.icon}</span>
                                    <span className="text-sm">{subItem.label}</span>
                                    {subItem.status && (
                                      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        subItem.status === 'beta'
                                          ? 'bg-warning/20 text-warning border border-warning/30'
                                          : 'bg-success/20 text-success border border-success/30'
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
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          activeItem === item.id
                            ? 'bg-accent/10 text-accent font-medium'
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
              <div className="p-4 border-t border-default/50">
                <p className="text-xs text-muted text-center">
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

