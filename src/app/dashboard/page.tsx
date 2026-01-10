'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import UsageProgressBar from '@/app/components/UsageProgressBar';
import PendingQuotesWidget from '@/app/components/PendingQuotesWidget';
import { useClients, useProjects, useProspects, useFactures, clearCache } from '@/hooks/useApi';
import type { Client, Project, Prospect, Facture } from '@/types';

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

  // Calculs mémoïsés
  const stats = useMemo(() => {
    const clientsList = (clients as Client[]) || [];
    const projectsList = (projects as Project[]) || [];
    const prospectsList = (prospects as Prospect[]) || [];
    const facturesList = (factures as Facture[]) || [];

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Chiffre d'affaires
    const totalCA = facturesList
      .filter(f => f.facture_status === 'paid')
      .reduce((acc, f) => acc + (Number(f.number) || 0), 0);

    // Nouveaux clients ce mois
    const newClientsThisMonth = clientsList.filter(client => {
      const clientDate = new Date(client.createdAt);
      return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear;
    });

    // Projets terminés
    const completedProjects = projectsList.filter(
      p => p.project_status === 'completed'
    );

    // Projets en cours
    const inProgressProjects = projectsList.filter(
      p => p.project_status === 'in_progress'
    );

    // Nouveaux prospects ce mois
    const newProspectsThisMonth = prospectsList.filter(prospect => {
      const prospectDate = new Date(prospect.createdAt);
      return prospectDate.getMonth() === currentMonth && prospectDate.getFullYear() === currentYear;
    });

    // Clients actifs
    const activeClients = clientsList.filter(c => c.processStatus === 'client');

    // Taux de conversion
    const totalProspects = clientsList.length + prospectsList.length;
    const conversionRate = totalProspects > 0
      ? Math.round((activeClients.length / totalProspects) * 100)
      : 0;

    return {
      clientsCount: clientsList.length,
      projectsCount: projectsList.length,
      prospectsCount: prospectsList.length,
      totalCA,
      newClientsThisMonth,
      completedProjects,
      inProgressProjects,
      newProspectsThisMonth,
      activeClients,
      conversionRate,
    };
  }, [clients, projects, prospects, factures]);

  // Activités récentes
  const recentActivities = useMemo(() => {
    const activities = [];

    if (stats.newClientsThisMonth.length > 0) {
      activities.push({
        type: 'client',
        message: `${t('new_clients_this_month')}: ${stats.newClientsThisMonth.length}`,
        color: 'emerald',
      });
    }

    if (stats.completedProjects.length > 0) {
      activities.push({
        type: 'project',
        message: `${stats.completedProjects.length} ${t('completed_projects')}`,
        color: 'blue',
      });
    }

    if (stats.newProspectsThisMonth.length > 0) {
      activities.push({
        type: 'prospect',
        message: `${t('new_prospects_this_month')}: ${stats.newProspectsThisMonth.length}`,
        color: 'purple',
      });
    }

    return activities;
  }, [stats, t]);

  return (
    <ProtectedRoute>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            onClick={() => router.push('/dashboard/clients')}
            className="card cursor-pointer p-6"
          >
            <h3 className="!text-lg font-semibold text-primary mb-2">
              {t('clients')}
            </h3>
            <p className="!text-3xl font-bold text-success">
              {loading ? '...' : stats.clientsCount}
            </p>
          </div>

          <div
            onClick={() => router.push('/dashboard/prospects')}
            className="card cursor-pointer p-6"
          >
            <h3 className="!text-lg font-semibold text-primary mb-2">
              {t('prospects')}
            </h3>
            <p className="!text-3xl font-bold text-info">
              {loading ? '...' : stats.prospectsCount}
            </p>
          </div>

          <div
            onClick={() => router.push('/dashboard/projects')}
            className="card cursor-pointer p-6"
          >
            <h3 className="!text-lg font-semibold text-primary mb-2">
              {t('projects')}
            </h3>
            <p className="!text-3xl font-bold text-color-primary">
              {loading ? '...' : stats.projectsCount}
            </p>
          </div>

          <div
            className="card p-6 flex flex-col justify-between cursor-pointer"
            onClick={() => router.push('/dashboard/revenue')}
          >
            <h3 className="!text-lg font-semibold text-primary mb-2">
              {t('revenue')}
            </h3>
            {loading ? (
              <p className="!text-3xl font-bold text-muted">...</p>
            ) : (
              <p className="!text-3xl font-bold text-success">
                {stats.totalCA.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Widget Devis en attente */}
        {!loading && (
          <PendingQuotesWidget 
            quotes={(factures as Facture[]) || []} 
            onQuoteUpdated={handleQuoteUpdated}
          />
        )}

        {/* Recent Activity & Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="!text-lg font-semibold text-primary mb-4">
              {t('recent_activity')}
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                    <div className="h-4 bg-hover rounded w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <p className="text-muted">{t('no_recent_activity')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 3).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${activity.color === 'emerald' ? 'bg-success' : activity.color === 'blue' ? 'bg-info' : 'bg-accent'}`}></div>
                    <p className="text-secondary">{activity.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="!text-lg font-semibold text-primary mb-4">
              {t('statistics')}
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-hover rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-hover rounded w-12 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <p className="text-muted">{t('conversion_rate')}</p>
                  <p className="text-success font-semibold">{stats.conversionRate}%</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-muted">{t('active_clients')}</p>
                  <p className="text-info font-semibold">{stats.activeClients.length}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-muted">{t('projects_in_progress')}</p>
                  <p className="text-color-primary font-semibold">{stats.inProgressProjects.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
