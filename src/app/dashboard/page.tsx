'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  fetchNumberOfClientsUser,
  fetchNumberOfProjectsUser,
  fetchNumberOfProspectsUser,
  fetchClientsUser,
  fetchProjectsUser,
  fetchProspectsUser,
  fetchFacturesUser,
} from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import UsageProgressBar from '@/app/components/UsageProgressBar';

interface Client {
  id: string;
  name: string;
  processStatus: string;
  createdAt?: string;
  dateCreated?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
  dateCreated?: string;
}

interface Prospect {
  id: string;
  name: string;
  processStatus: string;
  createdAt?: string;
  dateCreated?: string;
}

interface Facture {
  id: string;
  number: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [numberOfClients, setNumberOfClients] = useState(0);
  const [numberOfProjects, setNumberOfProjects] = useState(0);
  const [numberOfProspects, setNumberOfProspects] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [totalCA, setTotalCA] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const [
          clientsCount,
          projectsCount,
          prospectsCount,
          clientsData,
          projectsData,
          prospectsData,
          facturesData,
        ] = await Promise.all([
          fetchNumberOfClientsUser(user.id),
          fetchNumberOfProjectsUser(user.id),
          fetchNumberOfProspectsUser(user.id),
          fetchClientsUser(user.id),
          fetchProjectsUser(user.id),
          fetchProspectsUser(user.id),
          fetchFacturesUser(user.id),
        ]);
        setNumberOfClients(typeof clientsCount === 'number' ? clientsCount : 0);
        setNumberOfProjects(
          typeof projectsCount === 'number' ? projectsCount : 0
        );
        setNumberOfProspects(
          typeof prospectsCount === 'number' ? prospectsCount : 0
        );
        setClients(Array.isArray(clientsData.data) ? clientsData.data : []);
        setProjects(Array.isArray(projectsData.data) ? projectsData.data : []);
        setProspects(
          Array.isArray(prospectsData.data) ? prospectsData.data : []
        );
        setFactures(Array.isArray(facturesData.data) ? facturesData.data : []);
        // Calcul du chiffre d'affaires
        const ca = (Array.isArray(facturesData.data) ? facturesData.data : [])
          .map((f: Facture) => Number(f.number) || 0)
          .reduce((acc: number, v: number) => acc + v, 0);
        setTotalCA(ca);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);
  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 "
      >
        <div className="flex items-center justify-between">
          <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-zinc-200">
            {t('dashboard')}
          </h1>
        </div>
        <UsageProgressBar />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            onClick={() => router.push('/dashboard/clients')}
            className="bg-zinc-900 cursor-pointer transition-all duration-300 hover:bg-zinc-800 p-6 rounded-lg border border-zinc-800"
          >
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              {t('clients')}
            </h3>
            <p className="!text-3xl font-bold !text-green-400">
              {typeof numberOfClients === 'number' ? numberOfClients : 0}
            </p>
          </div>
          <div
            onClick={() => router.push('/dashboard/prospects')}
            className="bg-zinc-900 cursor-pointer transition-all duration-300 hover:bg-zinc-800 p-6 rounded-lg border border-zinc-800"
          >
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              {t('prospects')}
            </h3>
            <p className="!text-3xl font-bold !text-blue-400">
              {typeof numberOfProspects === 'number' ? numberOfProspects : 0}
            </p>
          </div>
          <div
            onClick={() => router.push('/dashboard/projects')}
            className="bg-zinc-900 cursor-pointer transition-all duration-300 hover:bg-zinc-800 p-6 rounded-lg border border-zinc-800"
          >
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              {t('projects')}
            </h3>
            <p className="!text-3xl font-bold !text-purple-400">
              {typeof numberOfProjects === 'number' ? numberOfProjects : 0}
            </p>
          </div>

          <div
            className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between cursor-pointer hover:bg-zinc-800 transition-all duration-300"
            onClick={() => router.push('/dashboard/revenue')}
          >
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              {t('revenue')}
            </h3>
            {factures.length > 0 ? (
              <p className="!text-3xl font-bold !text-emerald-400">
                {totalCA.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            ) : (
              <p className="!text-3xl font-bold !text-zinc-400">0</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-4">
              {t('recent_activity')}
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const recentActivities = [];

                  // Nouveaux clients ce mois
                  const currentMonth = new Date().getMonth();
                  const currentYear = new Date().getFullYear();
                  const newClientsThisMonth = Array.isArray(clients)
                    ? clients.filter(client => {
                        const clientDate = new Date(
                          client.createdAt || client.dateCreated || Date.now()
                        );
                        return (
                          clientDate.getMonth() === currentMonth &&
                          clientDate.getFullYear() === currentYear
                        );
                      })
                    : [];

                  if (newClientsThisMonth.length > 0) {
                    recentActivities.push({
                      type: 'client',
                      message: `${newClientsThisMonth.length} ${t('new_clients_this_month')}${newClientsThisMonth.length > 1 ? 'x' : ''} client${newClientsThisMonth.length > 1 ? 's' : ''} ce mois`,
                      color: 'green',
                    });
                  }

                  // Projets terminés
                  const completedProjects = Array.isArray(projects)
                    ? projects.filter(
                        project =>
                          project.status === 'completed' ||
                          project.status === 'terminé'
                      )
                    : [];
                  if (completedProjects.length > 0) {
                    recentActivities.push({
                      type: 'project',
                      message: `${completedProjects.length} ${t('completed_projects')}${completedProjects.length > 1 ? 's' : ''} terminé${completedProjects.length > 1 ? 's' : ''}`,
                      color: 'blue',
                    });
                  }

                  // Nouveaux prospects
                  const newProspectsThisMonth = Array.isArray(prospects)
                    ? prospects.filter(prospect => {
                        const prospectDate = new Date(
                          prospect.createdAt ||
                            prospect.dateCreated ||
                            Date.now()
                        );
                        return (
                          prospectDate.getMonth() === currentMonth &&
                          prospectDate.getFullYear() === currentYear
                        );
                      })
                    : [];

                  if (newProspectsThisMonth.length > 0) {
                    recentActivities.push({
                      type: 'prospect',
                      message: `${t('new_prospects_this_month')}: ${newProspectsThisMonth.length}`,
                      color: 'purple',
                    });
                  }

                  // Si aucune activité récente, afficher un message
                  if (recentActivities.length === 0) {
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-zinc-600 rounded-full"></div>
                        <p className="!text-zinc-400">
                          {t('no_recent_activity')}
                        </p>
                      </div>
                    );
                  }

                  return recentActivities.slice(0, 3).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 bg-${activity.color}-400 rounded-full`}
                      ></div>
                      <p className="!text-zinc-300">{activity.message}</p>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-4">
              {t('statistics')}
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-zinc-800 rounded w-12 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <p className="!text-zinc-400">{t('conversion_rate')}</p>
                  <p className="!text-green-400 font-semibold">
                    {(() => {
                      const totalProspects =
                        (Array.isArray(clients) ? clients.length : 0) +
                        (Array.isArray(prospects) ? prospects.length : 0);
                      const convertedClients = Array.isArray(clients)
                        ? clients.filter(
                            client => client.processStatus === 'client'
                          ).length
                        : 0;
                      return totalProspects > 0
                        ? Math.round((convertedClients / totalProspects) * 100)
                        : 0;
                    })()}
                    %
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="!text-zinc-400">{t('active_clients')}</p>
                  <p className="!text-blue-400 font-semibold">
                    {Array.isArray(clients)
                      ? clients.filter(
                          client => client.processStatus === 'client'
                        ).length
                      : 0}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="!text-zinc-400">{t('projects_in_progress')}</p>
                  <p className="!text-purple-400 font-semibold">
                    {Array.isArray(projects)
                      ? projects.filter(
                          project =>
                            project.status === 'in_progress' ||
                            project.status === 'en_cours' ||
                            project.status === 'active'
                        ).length
                      : 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
