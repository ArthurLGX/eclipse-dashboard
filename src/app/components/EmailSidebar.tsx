'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconInbox,
  IconStar,
  IconClock,
  IconSend,
  IconFile,
  IconShoppingCart,
  IconBrandInstagram,
  IconBell,
  IconMessage,
  IconTag,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconPencil,
  IconAlertCircle,
  IconFileDescription,
  IconFileInvoice,
  IconMail,
} from '@tabler/icons-react';

export type EmailView = 
  | 'inbox' 
  | 'starred' 
  | 'waiting' 
  | 'important' 
  | 'sent' 
  | 'drafts'
  | 'purchases'
  | 'social'
  | 'notifications'
  | 'forums'
  | 'promotions';

interface EmailSidebarProps {
  activeView: EmailView;
  onViewChange: (view: EmailView) => void;
  onNewMessage: () => void;
  onNewQuote: () => void;
  onNewInvoice: () => void;
  onNewNewsletter?: () => void;
  unreadCounts?: Partial<Record<EmailView, number>>;
  labels?: { id: string; name: string; color: string }[];
  onLabelClick?: (labelId: string) => void;
}

export default function EmailSidebar({
  activeView,
  onViewChange,
  onNewMessage,
  onNewQuote,
  onNewInvoice,
  onNewNewsletter,
  unreadCounts = {},
  labels = [],
}: EmailSidebarProps) {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  const mainMenuItems = [
    { id: 'inbox' as EmailView, label: 'Boîte de réception', icon: IconInbox, count: unreadCounts.inbox },
    { id: 'starred' as EmailView, label: 'Messages suivis', icon: IconStar },
    { id: 'waiting' as EmailView, label: 'En attente', icon: IconClock },
    { id: 'important' as EmailView, label: 'Important', icon: IconAlertCircle },
    { id: 'sent' as EmailView, label: 'Messages envoyés', icon: IconSend },
    { id: 'drafts' as EmailView, label: 'Brouillons', icon: IconFile, count: unreadCounts.drafts },
  ];

  const moreItems = [
    { id: 'purchases' as EmailView, label: 'Achats', icon: IconShoppingCart, count: unreadCounts.purchases },
    { id: 'social' as EmailView, label: 'Réseaux sociaux', icon: IconBrandInstagram, count: unreadCounts.social },
    { id: 'notifications' as EmailView, label: 'Notifications', icon: IconBell, count: unreadCounts.notifications },
    { id: 'forums' as EmailView, label: 'Forums', icon: IconMessage, count: unreadCounts.forums },
    { id: 'promotions' as EmailView, label: 'Promotions', icon: IconTag, count: unreadCounts.promotions },
  ];

  return (
    <div className="w-64 bg-page border-r border-default flex flex-col h-full">
      {/* Nouveau message button avec dropdown */}
      <div className="p-4">
        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-accent hover:opacity-90 text-white rounded-2xl transition-all shadow-lg group"
          >
            <IconPencil className="w-5 h-5" />
            <span className="font-medium">Nouveau message</span>
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {showNewMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNewMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-full bg-card border border-default rounded-xl shadow-xl overflow-hidden z-20"
                >
                  <button
                    onClick={() => {
                      onNewMessage();
                      setShowNewMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors text-left"
                  >
                    <IconMail className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-primary">Email classique</span>
                  </button>
                  <button
                    onClick={() => {
                      onNewQuote();
                      setShowNewMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors text-left"
                  >
                    <IconFileDescription className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-primary">Devis</span>
                  </button>
                  <button
                    onClick={() => {
                      onNewInvoice();
                      setShowNewMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors text-left"
                  >
                    <IconFileInvoice className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-primary">Facture</span>
                  </button>
                  {onNewNewsletter && (
                    <button
                      onClick={() => {
                        onNewNewsletter();
                        setShowNewMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors text-left"
                    >
                      <IconTag className="w-5 h-5 text-purple-500" />
                      <span className="text-sm text-primary">Newsletter</span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 overflow-y-auto px-2">
        {mainMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full transition-colors text-left mb-1 ${
                isActive
                  ? 'bg-accent-light text-accent font-medium'
                  : 'hover:bg-hover text-primary'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-muted'}`} />
              <span className="flex-1 text-sm">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-accent text-white' : 'bg-muted text-primary'
                }`}>
                  {item.count > 999 ? '999+' : item.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Section "Plus" */}
        <div className="mt-2">
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-hover rounded-r-full transition-colors text-left text-primary"
          >
            {showMore ? (
              <IconChevronDown className="w-5 h-5 text-muted" />
            ) : (
              <IconChevronRight className="w-5 h-5 text-muted" />
            )}
            <span className="text-sm">Plus</span>
          </button>

          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 pl-11 rounded-r-full transition-colors text-left mb-1 ${
                        isActive
                          ? 'bg-accent-light text-accent font-medium'
                          : 'hover:bg-hover text-primary'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted'}`} />
                      <span className="flex-1 text-sm">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-accent text-white' : 'bg-muted text-primary'
                        }`}>
                          {item.count > 999 ? '999+' : item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section Libellés */}
        {labels.length > 0 && (
          <div className="mt-4 border-t border-default pt-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-hover rounded-r-full transition-colors text-left text-primary"
            >
              {showLabels ? (
                <IconChevronDown className="w-5 h-5 text-muted" />
              ) : (
                <IconChevronRight className="w-5 h-5 text-muted" />
              )}
              <span className="text-sm font-medium">Libellés</span>
            </button>

            <AnimatePresence>
              {showLabels && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      className="w-full flex items-center gap-3 px-4 py-2 pl-11 hover:bg-hover rounded-r-full transition-colors text-left mb-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-sm text-primary">{label.name}</span>
                    </button>
                  ))}
                  <button className="w-full flex items-center gap-3 px-4 py-2 pl-11 hover:bg-hover rounded-r-full transition-colors text-left text-muted">
                    <IconPlus className="w-4 h-4" />
                    <span className="text-sm">Créer un libellé</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* Footer avec quota de stockage (optionnel) */}
      <div className="p-4 border-t border-default">
        <div className="text-xs text-muted">
          <div className="flex items-center justify-between mb-1">
            <span>Stockage</span>
            <span>15 GB utilisés</span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: '23%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
