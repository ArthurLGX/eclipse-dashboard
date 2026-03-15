'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import UsageProgressBar from '@/app/components/UsageProgressBar';
import ActiveIdeSessionWidget from '@/app/components/ActiveIdeSessionWidget';
import DailySuggestionsModal from '@/app/components/DailySuggestionsModal';
import { useClients, useProjects, useProspects, useFactures } from '@/hooks/useApi';
import type { Client, Project, Prospect, Facture } from '@/types';
import {
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
  const { data: factures, loading: loadingFactures } = useFactures(user?.id);

  const loading = loadingClients || loadingProjects || loadingProspects || loadingFactures;

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

  return (
    <ProtectedRoute>
      {/* Daily AI Suggestions Modal */}
      <DailySuggestionsModal />
      
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {/* Header épuré */}
        <div className="border-b border-default">
          <div className="max-w-7xl mx-auto px-8 py-5">
            <div className="mb-1">
              <span className="!text-xs !text-muted">{t('dashboard') || 'Tableau De Bord'}</span>
            </div>
            <h1 className="!text-[22px] font-bold tracking-tight !text-primary mb-0.5">
              {user ? `Bonjour, ${user.username || user.email.split('@')[0]} 👋` : t('dashboard')}
            </h1>
            <p className="!text-sm !text-secondary">{t('dashboard_overview') || 'Voici un aperçu de votre activité'}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-6 space-y-5">
          <UsageProgressBar />

          {/* KPIs compacts avec dot coloré */}
          <div className="flex gap-3 flex-wrap">
            {/* CA ce mois */}
            <div 
              className="bg-card flex-1 min-w-[180px] cursor-pointer p-4 hover:shadow-md transition-shadow"
              onClick={() => router.push('/dashboard/revenue')}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mb-2.5" />
              <div className="!text-[22px] font-bold tracking-tight !text-primary mb-0.5">
                {loading ? '...' : stats.caThisMonth.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </div>
              <div className="!text-sm font-medium !text-secondary mb-0.5">{t('revenue_this_month') || 'CA ce mois'}</div>
              <div className="!text-xs !text-muted">
                {loading ? '...' : `${stats.totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € ${t('paid') || 'payé'}`}
              </div>
            </div>

            {/* Clients */}
            <div 
              className="bg-card flex-1 min-w-[180px] cursor-pointer p-4 hover:shadow-md transition-shadow"
              onClick={() => router.push('/dashboard/clients')}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mb-2.5" />
              <div className="!text-[22px] font-bold tracking-tight !text-primary mb-0.5">
                {loading ? '...' : stats.clientsCount}
              </div>
              <div className="!text-sm font-medium !text-secondary mb-0.5">{t('clients')}</div>
              <div className="!text-xs !text-muted">
                +{stats.newClientsThisMonth.length} {t('this_month') || 'ce mois'}
              </div>
            </div>

            {/* Projets actifs */}
            <div 
              className="bg-card flex-1 min-w-[180px] cursor-pointer p-4 hover:shadow-md transition-shadow"
              onClick={() => router.push('/dashboard/projects')}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mb-2.5" />
              <div className="!text-[22px] font-bold tracking-tight !text-primary mb-0.5">
                {loading ? '...' : stats.projectsCount}
              </div>
              <div className="!text-sm font-medium !text-secondary mb-0.5">{t('projects') || 'Projets actifs'}</div>
              <div className="!text-xs !text-muted">
                {stats.inProgressProjects.length} {t('in_progress') || 'en cours'}
              </div>
            </div>

            {/* Prospects */}
            <div 
              className="bg-card flex-1 min-w-[180px] cursor-pointer p-4 hover:shadow-md transition-shadow"
              onClick={() => router.push('/dashboard/prospects')}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-2.5" />
              <div className="!text-[22px] font-bold tracking-tight !text-primary mb-0.5">
                {loading ? '...' : stats.prospectsCount}
              </div>
              <div className="!text-sm font-medium !text-secondary mb-0.5">{t('prospects')}</div>
              <div className="!text-xs !text-muted">
                {stats.conversionRate}% {t('conversion') || 'conversion'}
              </div>
            </div>

            {/* Factures en retard */}
            <div 
              className="bg-card flex-1 min-w-[180px] cursor-pointer p-4 hover:shadow-md transition-shadow"
              onClick={() => router.push('/dashboard/factures')}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mb-2.5" />
              <div className={`!text-[22px] font-bold tracking-tight ${stats.unpaidInvoices.length > 0 ? '!text-danger' : '!text-primary'} mb-0.5`}>
                {loading ? '...' : stats.unpaidInvoices.length}
              </div>
              <div className="!text-sm font-medium !text-secondary mb-0.5">{t('overdue_invoices') || 'Factures en retard'}</div>
              <div className="!text-xs !text-muted">
                {t('to_remind') || 'À relancer'}
              </div>
            </div>
          </div>

          {/* Graphique CA + Limites du plan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Graphique CA simplifié */}
            <div className="bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="!text-sm font-semibold !text-primary">{t('revenue_evolution') || 'Évolution du CA'}</div>
                  <div className="!text-xs !text-muted mt-0.5">{t('last_6_months') || '6 derniers mois'}</div>
                </div>
                <div className="!text-xl font-bold text-emerald-500">
                  {loading ? '...' : stats.totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                </div>
              </div>
              {loading ? (
                <div className="h-20 bg-muted rounded animate-pulse" />
              ) : (
                <div className="flex items-end gap-2 h-[70px]">
                  {stats.revenueByMonth.map((month, i) => {
                    const maxValue = Math.max(...stats.revenueByMonth.map(m => m.value), 1);
                    const heightPercent = (month.value / maxValue) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className={`w-full rounded-t transition-all bg-primary`}
                          style={{ height: `${Math.max(heightPercent * 0.7, month.value > 0 ? 4 : 2)}px` }}
                        />
                        <span className="!text-[10px] !text-muted">{month.month}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Limites du plan */}
            <div className="bg-card p-5">
              <div className="!text-sm font-semibold !text-primary mb-4">{t('plan_limits') || 'Limites du plan'}</div>
              <div className="flex flex-col gap-3.5">
                {[
                  { label: t('active_projects') || 'Projets actifs', used: stats.projectsCount, max: 50 },
                  { label: t('active_clients') || 'Clients actifs', used: stats.clientsCount, max: 1000 },
                  { label: t('newsletters') || 'Newsletters', used: 9, max: 100 },
                ].map(limit => (
                  <div key={limit.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="!text-sm !text-secondary">{limit.label}</span>
                      <span className="!text-xs !text-muted font-mono">
                        {loading ? '...' : limit.used} / {limit.max === Infinity ? '∞' : limit.max}
                      </span>
                    </div>
                    <div className="bg-muted rounded-full h-1">
                      <div 
                        className={`h-full rounded-full ${limit.used / limit.max > 0.8 ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min((limit.used / limit.max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activité récente + Session IDE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Activité récente */}
            <div className="bg-card">
              <div className="p-4 border-b border-default">
                <div className="!text-sm font-semibold !text-primary">{t('recent_activity') || 'Activité récente'}</div>
              </div>
              {loading ? (
                <div className="space-y-0">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2.5 p-3 border-b border-default last:border-b-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1">
                        <div className="h-3.5 bg-muted rounded w-3/4 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="p-10 text-center !text-muted">
                  <IconCalendarEvent className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="!text-sm">{t('no_recent_activity')}</p>
                </div>
              ) : (
                <div>
                  {recentActivities.map((activity, index) => {
                    const activityColor = 
                      activity.color === 'emerald' || activity.color === 'green' ? 'bg-emerald-500' :
                      activity.color === 'blue' ? 'bg-blue-500' :
                      'bg-amber-500';
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-2.5 p-3 border-b border-default last:border-b-0 hover:bg-hover transition-colors cursor-pointer"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activityColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="!text-sm !text-secondary truncate">{activity.message}</div>
                        </div>
                        <div className="!text-xs !text-muted whitespace-nowrap">{activity.time}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Session IDE */}
            <ActiveIdeSessionWidget />
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
