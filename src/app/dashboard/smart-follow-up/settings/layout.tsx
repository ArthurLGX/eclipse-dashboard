'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSettings,
  IconBell,
  IconClock,
  IconShieldCheck,
  IconUsers,
  IconCircleDot,
  IconBan,
  IconBolt,
  IconCalendar,
  IconBrandWhatsapp,
  IconSparkles,
  IconPlug,
  IconMail,
} from '@tabler/icons-react';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import { SettingsLayoutContext } from './settings-context';
import type { NavSection } from './settings-context';

const NAV_GROUPS: { label: string; items: { id: NavSection; label: string; icon: React.ReactNode; badge?: string; badgeWarn?: boolean }[] }[] = [
  {
    label: 'Général',
    items: [
      { id: 'activation', label: 'Activation', icon: <IconCircleDot className="w-3.5 h-3.5" />, badge: 'ON' },
      { id: 'icp', label: 'Mon client idéal', icon: <IconUsers className="w-3.5 h-3.5" />, badge: 'Actif' },
      { id: 'domaines', label: 'Emails à ignorer', icon: <IconBan className="w-3.5 h-3.5" /> },
      { id: 'sources', label: 'Sources de leads', icon: <IconPlug className="w-3.5 h-3.5" /> },
      { id: 'gmail', label: 'Boîte Gmail', icon: <IconMail className="w-3.5 h-3.5" /> },
    ],
  },
  { label: 'Automatisation', items: [{ id: 'mots-cles', label: 'Mots-clés importants', icon: <IconBolt className="w-3.5 h-3.5" /> }, { id: 'instruction', label: 'Instruction IA', icon: <IconSparkles className="w-3.5 h-3.5" /> }, { id: 'delais', label: 'Délais de relance', icon: <IconClock className="w-3.5 h-3.5" />, badgeWarn: true }, { id: 'regles', label: 'Règles avancées', icon: <IconShieldCheck className="w-3.5 h-3.5" /> }] },
  { label: 'Préférences', items: [{ id: 'notifications', label: 'Notifications', icon: <IconBell className="w-3.5 h-3.5" /> }, { id: 'heures', label: 'Heures de travail', icon: <IconCalendar className="w-3.5 h-3.5" /> }, { id: 'whatsapp', label: 'WhatsApp', icon: <IconBrandWhatsapp className="w-3.5 h-3.5" /> }] },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: settings } = useAutomationSettings();
  const [activeSection, setActiveSection] = useState<NavSection>('activation');
  const rulesCount = settings?.custom_rules?.filter((r) => r.enabled).length ?? 0;

  return (
    <SettingsLayoutContext.Provider value={{ activeSection, setActiveSection }}>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* SIDEBAR - Fixed comme la sidebar principale du dashboard */}
        <aside
          className="hidden lg:flex fixed top-0 z-[999] w-[240px] h-screen bg-card border-r border-default p-6 flex-col overflow-y-auto"
          style={{ left: 'var(--dashboard-sidebar-width, 64px)' }}
        >
          <div className="pb-5 border-b border-default mb-2">
            <button
              onClick={() => router.push('/dashboard/smart-follow-up')}
              className="flex items-center gap-1.5 font-mono !text-[11px] !text-muted hover:!text-primary transition-colors bg-none border-none cursor-pointer mb-4"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Tableau de bord
            </button>
            <div className="flex items-center gap-2 !text-sm font-bold !text-primary">
              <IconSettings className="w-4 h-4 !text-success" />
              Smart Follow-Up
            </div>
            <div className="font-mono !text-[10px] !text-muted mt-0.5">Paramètres du système</div>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="py-1 mb-1">
              <div className="font-mono !text-[9px] !text-muted uppercase tracking-wider px-2 py-2">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2  transition-all !text-[11px] font-medium ${
                    activeSection === item.id ? 'bg-muted !text-primary border border-default rounded-lg' : '!text-muted hover:bg-muted/50 border border-transparent rounded-lg'
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && <span className="ml-auto font-mono !text-[9px] px-1.5 py-0.5 rounded bg-success !text-success border border-success/20">{item.badge}</span>}
                  {item.badgeWarn && <span className="ml-auto font-mono !text-[9px] px-1.5 py-0.5 rounded bg-warning !text-warning border border-warning/20">5</span>}
                </button>
              ))}
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-default">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-success border border-success rounded-lg !text-success !text[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Système actif · {rulesCount} règles
            </div>
          </div>
        </aside>

        {/* Mobile - barre de sections */}
        <div className="lg:hidden flex gap-1 p-4 overflow-x-auto bg-card border-b border-default">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5  whitespace-nowrap !text-xs font-medium transition-all ${
                activeSection === item.id ? 'bg-muted !text-primary border border-default rounded-lg' : '!text-muted hover:bg-muted/50 rounded-lg'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* MAIN - contenu des paramètres, marge pour la sidebar fixe */}
        <div className="lg:ml-[240px] min-h-[calc(100vh-8rem)]">{children}</div>
      </div>
    </SettingsLayoutContext.Provider>
  );
}
