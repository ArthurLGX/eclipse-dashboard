'use client';
import useLenis from '@/utils/useLenis';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';

import Image from 'next/image';
import { TryBtn } from './components/buttons/tryBtn';
import { useLanguage } from './context/LanguageContext';
import { PricingBtn } from './components/buttons/pricingBtn';
import { useTheme } from './context/ThemeContext';
import DataTable, { Column } from './components/DataTable';
import {
  IconHome,
  IconUsers,
  IconBuilding,
  IconMagnet,
  IconBrain,
  IconMail,
} from '@tabler/icons-react';

// Données fictives pour la démonstration
const fakeClients = [
  {
    id: 1,
    name: 'Marie Dubois',
    email: 'marie.dubois@techcorp.fr',
    enterprise: 'TechCorp Solutions',
    website: 'www.techcorp.fr',
    processStatus: 'client',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    name: 'Pierre Martin',
    email: 'p.martin@innovate.com',
    enterprise: 'Innovate Digital',
    website: 'www.innovate.com',
    processStatus: 'client',
    createdAt: '2024-01-20',
  },
  {
    id: 3,
    name: 'Sophie Bernard',
    email: 's.bernard@startup.io',
    enterprise: 'Startup.io',
    website: 'www.startup.io',
    processStatus: 'prospect',
    createdAt: '2024-02-01',
  },
];

const fakeProjects = [
  {
    id: 1,
    name: 'Refonte Site E-commerce',
    status: 'en_cours',
    client: 'TechCorp Solutions',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    name: 'Application Mobile',
    status: 'terminé',
    client: 'Innovate Digital',
    createdAt: '2024-01-10',
  },
  {
    id: 3,
    name: 'Dashboard Analytics',
    status: 'en_cours',
    client: 'Startup.io',
    createdAt: '2024-02-01',
  },
];

const fakeProspects = [
  {
    id: 1,
    name: 'Alexandre Moreau',
    email: 'a.moreau@futuretech.fr',
    enterprise: 'FutureTech',
    website: 'www.futuretech.fr',
    processStatus: 'prospect',
    createdAt: '2024-02-05',
  },
  {
    id: 2,
    name: 'Julie Leroy',
    email: 'j.leroy@digitalagency.com',
    enterprise: 'Digital Agency Pro',
    website: 'www.digitalagency.com',
    processStatus: 'prospect',
    createdAt: '2024-02-10',
  },
];

const fakeMentors = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    enterprise: 'Example Inc',
    website: 'www.example.com',
    processStatus: 'mentor',
    createdAt: '2024-01-01',
  },
];

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export default function Home() {
  useLenis();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isVisible, setIsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const element = document.getElementById('dashboard-demo');
      if (element) {
        const rect = element.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight * 0.8;
        setIsVisible(isInView);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <IconHome size={16} />,
      active: activeSection === 'dashboard',
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: <IconUsers size={16} />,
      active: activeSection === 'clients',
    },
    {
      id: 'prospects',
      label: 'Prospects',
      icon: <IconMagnet size={16} />,
      active: activeSection === 'prospects',
    },
    {
      id: 'projects',
      label: 'Projets',
      icon: <IconBuilding size={16} />,
      active: activeSection === 'projects',
    },
    {
      id: 'mentors',
      label: 'Mentors',
      icon: <IconBrain size={16} />,
      active: activeSection === 'mentors',
    },
    {
      id: 'newsletters',
      label: 'Newsletters',
      icon: <IconMail size={16} />,
      active: activeSection === 'newsletters',
    },
  ];

  const clientColumns: Column<(typeof fakeClients)[0]>[] = [
    {
      key: 'name',
      label: 'Nom',
      render: value => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
            <span className="text-zinc-300 font-medium !text-sm">
              {(value as string).charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-zinc-200 font-medium">{value as string}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'enterprise',
      label: 'Entreprise',
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'processStatus',
      label: 'Statut',
      render: value => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'client':
              return {
                label: 'Client',
                className: 'bg-emerald-100 !text-emerald-800',
              };
            case 'prospect':
              return {
                label: 'Prospect',
                className: 'bg-blue-100 !text-blue-800',
              };
            default:
              return {
                label: status,
                className: 'bg-gray-100 !text-gray-800',
              };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: value => (
        <p className="text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
  ];

  const projectColumns: Column<(typeof fakeProjects)[0]>[] = [
    {
      key: 'name',
      label: t('project_name'),
      render: value => (
        <p className="text-zinc-200 font-medium">{value as string}</p>
      ),
    },
    {
      key: 'client',
      label: t('client'),
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'status',
      label: t('status'),
      render: value => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'en_cours':
              return {
                label: t('in_progress'),
                className: 'bg-blue-100 !text-blue-800',
              };
            case 'terminé':
              return {
                label: t('completed'),
                className: 'bg-emerald-100 !text-emerald-800',
              };
            default:
              return {
                label: status,
                className: 'bg-gray-100 !text-gray-800',
              };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: value => (
        <p className="text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
  ];

  const renderDashboardContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="demo-title !text-3xl !uppercase font-extrabold !text-left">
          {t('dashboard')}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="demo-card cursor-pointer p-6 rounded-lg">
          <h3 className="demo-title !text-lg font-semibold mb-2">{t('clients')}</h3>
          <p className="demo-stat-primary !text-3xl font-bold">24</p>
        </div>
        <div className="demo-card cursor-pointer p-6 rounded-lg">
          <h3 className="demo-title !text-lg font-semibold mb-2">{t('prospects')}</h3>
          <p className="demo-stat-secondary !text-3xl font-bold">12</p>
        </div>
        <div className="demo-card cursor-pointer p-6 rounded-lg">
          <h3 className="demo-title !text-lg font-semibold mb-2">{t('projects')}</h3>
          <p className="demo-stat-tertiary !text-3xl font-bold">8</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="demo-card p-6 rounded-lg">
          <h3 className="demo-title !text-lg font-semibold mb-4">{t('recent_activity')}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--demo-stat-primary)' }}></div>
              <p className="demo-subtitle">{t('new_clients_this_month')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--demo-stat-secondary)' }}></div>
              <p className="demo-subtitle">{t('completed_projects')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--demo-stat-tertiary)' }}></div>
              <p className="demo-subtitle">{t('new_prospects')}</p>
            </div>
          </div>
        </div>

        <div className="demo-card p-6 rounded-lg">
          <h3 className="demo-title !text-lg font-semibold mb-4">{t('statistics')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="demo-muted">{t('conversion_rate')}</p>
              <p className="demo-stat-primary font-semibold">67%</p>
            </div>
            <div className="flex justify-between">
              <p className="demo-muted">{t('active_clients')}</p>
              <p className="demo-stat-secondary font-semibold">18</p>
            </div>
            <div className="flex justify-between">
              <p className="demo-muted">{t('projects_in_progress')}</p>
              <p className="demo-stat-tertiary font-semibold">5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientsContent = () => (
    <div className="space-y-6">
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="demo-title !text-3xl !uppercase font-extrabold !text-left">{t('clients')}</h1>
        <button className="demo-button lg:w-fit w-full px-4 py-2 rounded-lg cursor-pointer">
          {t('add_client')}
        </button>
      </div>
      <DataTable columns={clientColumns} data={fakeClients} />
    </div>
  );

  const renderProjectsContent = () => (
    <div className="space-y-6">
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="demo-title !text-3xl !uppercase font-extrabold !text-left">{t('projects')}</h1>
        <button className="demo-button lg:w-fit w-full px-4 py-2 rounded-lg cursor-pointer">
          {t('add_project')}
        </button>
      </div>
      <DataTable columns={projectColumns} data={fakeProjects} />
    </div>
  );

  const renderProspectsContent = () => (
    <div className="space-y-6">
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="demo-title !text-3xl !uppercase font-extrabold !text-left">{t('prospects')}</h1>
        <button className="demo-button lg:w-fit w-full px-4 py-2 rounded-lg cursor-pointer">
          {t('add_prospect')}
        </button>
      </div>
      <DataTable columns={clientColumns} data={fakeProspects} />
    </div>
  );

  const renderMentorsContent = () => (
    <div className="space-y-6">
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="demo-title !text-3xl !uppercase font-extrabold !text-left">{t('mentors')}</h1>
        <button className="demo-button lg:w-fit w-full px-4 py-2 rounded-lg cursor-pointer">
          {t('add_mentor')}
        </button>
      </div>
      <DataTable columns={mentorColumns} data={fakeMentors} />
    </div>
  );

  const renderNewslettersContent = () => (
    <div className="space-y-6">
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="demo-title !text-3xl !uppercase font-extrabold !text-left">{t('newsletters')}</h1>
        <button className="demo-button lg:w-fit w-full px-4 py-2 rounded-lg cursor-pointer">
          {t('add_newsletter')}
        </button>
      </div>
    </div>
  );

  const mentorColumns: Column<(typeof fakeMentors)[0]>[] = [
    {
      key: 'first_name',
      label: t('first_name'),
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'last_name',
      label: t('last_name'),
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'email',
      label: t('email'),
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'actions',
      label: t('actions'),
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: value => <p className="text-zinc-300">{value as string}</p>,
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardContent();
      case 'clients':
        return renderClientsContent();
      case 'projects':
        return renderProjectsContent();
      case 'prospects':
        return renderProspectsContent();
      case 'mentors':
        return renderMentorsContent();
      case 'newsletters':
        return renderNewslettersContent();
      default:
        return renderDashboardContent();
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center !pt-[200px]">
      {/* Background - Image en mode dark, Pattern en mode light */}
      {isDark ? ( 
        <>  {/* Dark background */}
        <div className="absolute top-0  left-0 w-full h-full"></div>
        <Image
          src="/images/background.jpg"
          alt="background"
          width={1000}
          height={1000}
          className="absolute top-0 left-0 w-full h-full object-cover opacity-20"
        />
        </>
      ) : (
        <div 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: `
              linear-gradient(135deg, rgba(124, 58, 237, 0.03) 0%, transparent 50%),
              linear-gradient(225deg, rgba(124, 58, 237, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 80% 20%, rgba(167, 139, 250, 0.06) 0%, transparent 40%),
              linear-gradient(180deg, #fafafa 0%, #f5f3ff 50%, #fafafa 100%)
            `,
            backgroundSize: '100% 100%',
          }}
        >
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(124, 58, 237, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(124, 58, 237, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Floating gradient orbs */}
          <div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)' }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, transparent 70%)' }}
          />
        </div>
      )}
      <div
        className={
          'text-zinc-800 dark:text-zinc-200 z-10 flex flex-col gap-16 items-center justify-center w-full p-4 h-full'
        }
      >
        <div
          className={
            'flex flex-col gap-8 items-center justify-center md:w-1/2 w-full font-bold h-fit tracking-tighter gap-4'
          }
        >
          <motion.h1
            initial={{ opacity: 0, y: '5%' }}
            animate={{ opacity: 1, y: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.1 }}
            className="flex flex-col items-center justify-center gap-2 text-zinc-800 dark:text-zinc-200"
          >
            <motion.span
              initial={{ opacity: 0, y: '5%' }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.2 }}
              className="!text-xl text-zinc-600 dark:text-zinc-200 font-light"
            >
              {t('hero_subtitle_top')}
            </motion.span>
            {t('hero_title_main')}
            <motion.span
              initial={{ opacity: 0, y: '5%' }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
              className="bg-violet-100 dark:bg-emerald-300/20 backdrop-blur-xs py-2 px-4 rounded-full !text-violet-700 dark:!text-emerald-200 font-extrabold shadow-md shadow-violet-200/50 dark:shadow-emerald-300/20"
            >
              {t('hero_subtitle_bottom')}
            </motion.span>
          </motion.h1>
          <div
            className={
              'flex md:flex-row flex-col items-center justify-center gap-4 w-full !my-8'
            }
          >
            <TryBtn />
            <PricingBtn />
          </div>
        </div>
      </div>

      {/* Section de démonstration du Dashboard */}
      <div id="dashboard-demo" className="w-full  py-20 px-4 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: '5%' }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: '5%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-7xl mx-auto"
        >
          {/* Titre de la section */}
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: '5%' }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: '5%' }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold text-zinc-800 dark:text-zinc-200 mb-4"
            >
              {t('dashboard')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: '5%' }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: '5%' }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto"
            >
              {t('dashboard_description')}
            </motion.p>
          </div>

          {/* Dashboard Demo avec Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: '5%' }}
            animate={
              isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: '5%' }
            }
            transition={{ duration: 0.8, delay: 0.6 }}
            className="demo-container backdrop-blur-xl rounded-2xl overflow-hidden"
          >
            <div className="flex min-h-[600px]">
              {/* Sidebar */}
              <motion.div
                className="demo-sidebar hidden lg:flex flex-col items-start justify-start gap-8 p-4"
                animate={{
                  width: isSidebarExpanded ? 300 : 64,
                }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                onMouseEnter={() => setIsSidebarExpanded(true)}
                onMouseLeave={() => setIsSidebarExpanded(false)}
              >
                {/* Header de la sidebar */}
                <div className="flex flex-col items-center w-full justify-between gap-4">
                  <div className="demo-title cursor-pointer font-semibold !text-lg">
                    <Image
                      src="/images/logo/eclipse-logo.png"
                      alt="Eclipse Studio"
                      width={32}
                      height={32}
                    />
                  </div>
                </div>

                {/* Navigation items */}
                <nav className="flex flex-col gap-1 w-full">
                  {sidebarItems.map(item => (
                    <motion.button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`demo-nav-item group w-full flex items-center gap-3 p-2 rounded-lg mb-1 ${item.active ? 'active' : ''}`}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                      <AnimatePresence mode="wait">
                        {isSidebarExpanded && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="!text-sm font-medium whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </nav>
              </motion.div>

              {/* Mobile Navigation */}
              <div className="demo-sidebar lg:hidden p-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                <nav className="flex flex-col items-center justify-around">
                  {sidebarItems.slice(0, 4).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`demo-nav-item flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 ${item.active ? 'active' : ''}`}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Contenu principal */}
              <div className="flex-1 overflow-auto w-full h-full">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="h-full lg:!p-6 !p-4 w-full"
                >
                  {renderContent()}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Call-to-action */}
          <motion.div
              initial={{ opacity: 0, y: '5%' }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: '5%' }}
            transition={{ duration: 0.6, delay: 2.4 }}
            className="text-center mt-12"
          >
            <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-6">
              {t('ready_to_transform')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <TryBtn />
              <PricingBtn />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
