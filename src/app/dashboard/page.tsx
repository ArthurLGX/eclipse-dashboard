'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import UsageProgressBar from '@/app/components/UsageProgressBar';
import PendingQuotesWidget from '@/app/components/PendingQuotesWidget';
import ActiveIdeSessionWidget from '@/app/components/ActiveIdeSessionWidget';
import DailySuggestionsModal from '@/app/components/DailySuggestionsModal';
import { useClients, useProjects, useProspects, useFactures, clearCache } from '@/hooks/useApi';
import type { Client, Project, Prospect, Facture } from '@/types';
import {
  IconUsers,
  IconBriefcase,
  IconUserSearch,
  IconCurrencyEuro,
  IconTrendingUp,
  IconTrendingDown,
  IconFileInvoice,
  IconAlertTriangle,
  IconArrowUpRight,
  IconCalendarEvent,
  IconUserPlus,
  IconFolderPlus,
  IconCheck,
} from '@tabler/icons-react';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Utilisation des hooks avec cache
  const { data: clients, loading: loadingClients } = useClients(user?.id);
  const { data: projects, loading: loadingProjects } = useProjects(user?.id);
  const { data: prospects, loading: loadingProspects } = useProspects(user?.id);
  const { data: factures, loading: loadingFactures, refetch: refetchFactures } = useFactures(user?.id);

  const loading = loadingClients || loadingProjects || loadingProspects || loadingFactures;

  // Callback pour rafraîchir les devis après mise à jour
  const handleQuoteUpdated = () => {
    clearCache('factures');
    refetchFactures();
  };

  // Calculs mémoïsés enrichis
  const stats = useMemo(() => {
    const clientsList = (clients as Client[]) || [];
    const projectsList = (projects as Project[]) || [];
    const prospectsList = (prospects as Prospect[]) || [];
    const facturesList = (factures as Facture[]) || [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Fonction helper pour filtrer par mois
    const isInMonth = (dateStr: string, month: number, year: number) => {
      const date = new Date(dateStr);
      return date.getMonth() === month && date.getFullYear() === year;
    };

    // Revenus
    const paidInvoices = facturesList.filter(f => f.facture_status === 'paid');
    const totalCA = paidInvoices.reduce((acc, f) => acc + (Number(f.number) || 0), 0);
    
    const caThisMonth = paidInvoices
      .filter(f => isInMonth(f.date, currentMonth, currentYear))
      .reduce((acc, f) => acc + (Number(f.number) || 0), 0);
    
    const caLastMonth = paidInvoices
      .filter(f => isInMonth(f.date, lastMonth, lastMonthYear))
      .reduce((acc, f) => acc + (Number(f.number) || 0), 0);

    const caTrend = caLastMonth > 0 
      ? Math.round(((caThisMonth - caLastMonth) / caLastMonth) * 100) 
      : caThisMonth > 0 ? 100 : 0;

    // Clients
    const newClientsThisMonth = clientsList.filter(c => isInMonth(c.createdAt, currentMonth, currentYear));
    const newClientsLastMonth = clientsList.filter(c => isInMonth(c.createdAt, lastMonth, lastMonthYear));
    const clientsTrend = newClientsLastMonth.length > 0 
      ? Math.round(((newClientsThisMonth.length - newClientsLastMonth.length) / newClientsLastMonth.length) * 100)
      : newClientsThisMonth.length > 0 ? 100 : 0;

    // Projets
    const completedProjects = projectsList.filter(p => p.project_status === 'completed');
    const inProgressProjects = projectsList.filter(p => p.project_status === 'in_progress');
    const plannedProjects = projectsList.filter(p => p.project_status === 'planning');

    // Prospects
    const newProspectsThisMonth = prospectsList.filter(p => isInMonth(p.createdAt, currentMonth, currentYear));
    const activeClients = clientsList.filter(c => c.processStatus === 'client');

    // Taux de conversion
    const totalProspects = clientsList.length + prospectsList.length;
    const conversionRate = totalProspects > 0
      ? Math.round((activeClients.length / totalProspects) * 100)
      : 0;

    // Factures impayées
    const unpaidInvoices = facturesList.filter(f => 
      f.facture_status === 'sent' && 
      f.document_type !== 'quote' &&
      new Date(f.due_date) < now
    );
    const unpaidTotal = unpaidInvoices.reduce((acc, f) => acc + (Number(f.number) || 0), 0);

    // Revenus par mois (6 derniers mois) pour le mini-graphique
    const revenueByMonth: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(currentYear, currentMonth - i, 1);
      const monthInvoices = paidInvoices.filter(f => isInMonth(f.date, m.getMonth(), m.getFullYear()));
      revenueByMonth.push({
        month: m.toLocaleDateString('fr-FR', { month: 'short' }),
        value: monthInvoices.reduce((acc, f) => acc + (Number(f.number) || 0), 0),
      });
    }

    return {
      // Compteurs
      clientsCount: clientsList.length,
      projectsCount: projectsList.length,
      prospectsCount: prospectsList.length,
      totalCA,
      caThisMonth,
      caTrend,
      
      // Clients
      newClientsThisMonth,
      clientsTrend,
      activeClients,
      
      // Projets
      completedProjects,
      inProgressProjects,
      plannedProjects,
      
      // Prospects
      newProspectsThisMonth,
      conversionRate,
      
      // Factures
      unpaidInvoices,
      unpaidTotal,
      
      // Graphiques
      revenueByMonth,
    };
  }, [clients, projects, prospects, factures]);

  // Activités récentes enrichies
  const recentActivities = useMemo(() => {
    const activities: { icon: React.ElementType; message: string; color: string; time?: string }[] = [];
    const clientsList = (clients as Client[]) || [];
    const projectsList = (projects as Project[]) || [];
    const facturesList = (factures as Facture[]) || [];

    // Derniers clients (3)
    clientsList
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .forEach(c => {
        activities.push({
          icon: IconUserPlus,
          message: `${t('new_client')}: ${c.name}`,
          color: 'emerald',
          time: new Date(c.createdAt).toLocaleDateString('fr-FR'),
        });
      });

    // Derniers projets (2)
    projectsList
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .forEach(p => {
        activities.push({
          icon: IconFolderPlus,
          message: `${t('new_project')}: ${p.title}`,
          color: 'blue',
          time: new Date(p.createdAt).toLocaleDateString('fr-FR'),
        });
      });

    // Dernières factures payées (2)
    facturesList
      .filter(f => f.facture_status === 'paid')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 2)
      .forEach(f => {
        activities.push({
          icon: IconCheck,
          message: `${t('invoice_paid')}: ${f.reference}`,
          color: 'green',
          time: new Date(f.updatedAt).toLocaleDateString('fr-FR'),
        });
      });

    // Trier par date
    return activities.slice(0, 6);
  }, [clients, projects, factures, t]);

  // Render du mini-graphique revenus
  const renderMiniChart = () => {
    const maxValue = Math.max(...stats.revenueByMonth.map(m => m.value), 1);
    return (
      <div className="flex items-end gap-1 h-12">
        {stats.revenueByMonth.map((month, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-warning rounded-t transition-all hover:bg-violet-500"
              style={{ height: `${(month.value / maxValue) * 100}%`, minHeight: month.value > 0 ? '4px' : '2px' }}
            />
            <span className="text-[10px] text-muted">{month.month}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      {/* Daily AI Suggestions Modal */}
      <DailySuggestionsModal />
      
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 bg-page"
      >
        <div className="flex items-center justify-between">
          <h1 className="!text-3xl !uppercase font-extrabold !text-left text-primary">
            {t('dashboard')}
          </h1>
        </div>
        <UsageProgressBar />

        {/* KPIs principaux avec tendances */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 kpi-grid">
          {/* Revenus */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/dashboard/revenue')}
            className="card cursor-pointer p-4 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-warning-light rounded-lg flex items-center justify-center">
                <IconCurrencyEuro className="w-5 h-5 text-warning-text" />
              </div>
              {stats.caTrend !== 0 && (
                <div className={`flex items-center gap-0.5 !text-xs font-medium ${stats.caTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.caTrend > 0 ? <IconTrendingUp className="w-3 h-3" /> : <IconTrendingDown className="w-3 h-3" />}
                  {Math.abs(stats.caTrend)}%
                </div>
              )}
            </div>
            <p className="!text-xs text-muted mb-1">{t('revenue_this_month')}</p>
            <p className="text-xl font-bold text-primary">
              {loading ? '...' : stats.caThisMonth.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </p>
          </motion.div>

          {/* Clients */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/dashboard/clients')}
            className="card cursor-pointer p-4 bg-gradient-to-br from-success to-transparent border-success"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                <IconUsers className="w-5 h-5 !text-success-text" />
              </div>
              {stats.newClientsThisMonth.length > 0 && (
                <div className="flex items-center gap-0.5 !text-xs font-medium !text-success-text">
                  +{stats.newClientsThisMonth.length}
                </div>
              )}
            </div>
            <p className="!text-xs text-muted mb-1">{t('clients')}</p>
            <p className="text-xl font-bold text-primary">
              {loading ? '...' : stats.clientsCount}
            </p>
          </motion.div>

          {/* Projets */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/dashboard/projects')}
            className="card cursor-pointer p-4 bg-gradient-to-br from-info to-transparent border-info"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-info rounded-lg flex items-center justify-center">
                <IconBriefcase className="w-5 h-5 text-info" />
              </div>
              <div className="!text-xs text-muted">
                {stats.inProgressProjects.length} {t('in_progress_short')}
              </div>
            </div>
            <p className="!text-xs text-muted mb-1">{t('projects')}</p>
            <p className="text-xl font-bold text-primary">
              {loading ? '...' : stats.projectsCount}
            </p>
          </motion.div>

          {/* Prospects */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/dashboard/prospects')}
            className="card cursor-pointer p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-info rounded-lg flex items-center justify-center">
                <IconUserSearch className="w-5 h-5 text-info" />
              </div>
              <div className="!text-xs font-medium text-info">
                {stats.conversionRate}% conv.
              </div>
            </div>
            <p className="!text-xs text-muted mb-1">{t('prospects')}</p>
            <p className="text-xl font-bold text-primary">
              {loading ? '...' : stats.prospectsCount}
            </p>
          </motion.div>

          {/* Factures impayées */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/dashboard/factures')}
            className={`card cursor-pointer p-4 ${stats.unpaidInvoices.length > 0 ? 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20' : 'bg-gradient-to-br from-gray-500/10 to-transparent'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.unpaidInvoices.length > 0 ? 'bg-danger' : 'bg-info'}`}>
                <IconFileInvoice className={`w-5 h-5 ${stats.unpaidInvoices.length > 0 ? 'text-red-500' : 'text-info'}`} />
              </div>
              {stats.unpaidInvoices.length > 0 && (
                <IconAlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="!text-xs text-muted mb-1">{t('overdue_invoices')}</p>
            <p className={`text-xl font-bold ${stats.unpaidInvoices.length > 0 ? 'text-red-500' : 'text-primary'}`}>
              {loading ? '...' : stats.unpaidInvoices.length}
            </p>
          </motion.div>
        </div>

        {/* Ligne 2 : Mini-graphique + Devis en attente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mini-graphique revenus */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary">{t('revenue_evolution')}</h3>
              <button 
                onClick={() => router.push('/dashboard/revenue')}
                className="!text-xs text-secondary hover:text-primary flex items-center gap-1 !shadow-none"
              >
                {t('view_details')}
                <IconArrowUpRight className="w-3 h-3 !text-secondary" style={{ color: 'var(--color-secondary)' }} />
              </button>
            </div>
            {loading ? (
              <div className="h-16 bg-muted rounded animate-pulse" />
            ) : (
              renderMiniChart()
            )}
            <div className="mt-3 pt-3 border-t border-default flex justify-between text-sm">
              <span className="text-muted">{t('total_revenue')}</span>
              <span className="font-semibold !text-secondary">
                {stats.totalCA.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Widget Devis en attente - occupe 2 colonnes */}
          <div className="lg:col-span-2">
            {!loading && (
              <PendingQuotesWidget 
                quotes={(factures as Facture[]) || []} 
                onQuoteUpdated={handleQuoteUpdated}
              />
            )}
          </div>
        </div>

        {/* Ligne 3 : Stats détaillées + Activité récente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          

          {/* Activité récente enrichie */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">{t('recent_activity')}</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-40 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <IconCalendarEvent className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>{t('no_recent_activity')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-hover transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.color === 'emerald' ? 'bg-success !text-success-text ' :
                        activity.color === 'blue' ? 'bg-info text-info' :
                        activity.color === 'green' ? 'bg-success !text-success-text ' :
                        'bg-muted text-muted'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary truncate">{activity.message}</p>
                        {activity.time && (
                          <p className="!text-xs text-muted">{activity.time}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Widget IDE Tracker */}
          <ActiveIdeSessionWidget />
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
