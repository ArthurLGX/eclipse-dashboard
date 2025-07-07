'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fetchNumberOfClients,
  fetchNumberOfProjects,
  fetchNumberOfProspects,
  fetchClients,
  fetchProjects,
  fetchProspects,
} from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          clientsCount,
          projectsCount,
          prospectsCount,
          clientsData,
          projectsData,
          prospectsData,
        ] = await Promise.all([
          fetchNumberOfClients(),
          fetchNumberOfProjects(),
          fetchNumberOfProspects(),
          fetchClients(),
          fetchProjects(),
          fetchProspects(),
        ]);
        setNumberOfClients(clientsCount);
        setNumberOfProjects(projectsCount);
        setNumberOfProspects(prospectsCount);
        setClients(clientsData.data || []);
        setProjects(projectsData.data || []);
        setProspects(prospectsData.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 !my-16"
    >
      <h1 className="!text-3xl font-bold !text-zinc-200">{t('dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => router.push('/dashboard/clients')}
          className="bg-zinc-900 cursor-pointer transition-all duration-300 hover:bg-zinc-800 p-6 rounded-lg border border-zinc-800"
        >
          <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
            {t('clients')}
          </h3>
          <p className="!text-3xl font-bold !text-green-400">
            {numberOfClients || 0}
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
            {numberOfProspects || 0}
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
            {numberOfProjects || 0}
          </p>
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
                const newClientsThisMonth = clients.filter(client => {
                  const clientDate = new Date(
                    client.createdAt || client.dateCreated || Date.now()
                  );
                  return (
                    clientDate.getMonth() === currentMonth &&
                    clientDate.getFullYear() === currentYear
                  );
                });

                if (newClientsThisMonth.length > 0) {
                  recentActivities.push({
                    type: 'client',
                    message: `${newClientsThisMonth.length} nouveau${newClientsThisMonth.length > 1 ? 'x' : ''} client${newClientsThisMonth.length > 1 ? 's' : ''} ce mois`,
                    color: 'green',
                  });
                }

                // Projets terminés
                const completedProjects = projects.filter(
                  project =>
                    project.status === 'completed' ||
                    project.status === 'terminé'
                );
                if (completedProjects.length > 0) {
                  recentActivities.push({
                    type: 'project',
                    message: `${completedProjects.length} projet${completedProjects.length > 1 ? 's' : ''} terminé${completedProjects.length > 1 ? 's' : ''}`,
                    color: 'blue',
                  });
                }

                // Nouveaux prospects
                const newProspectsThisMonth = prospects.filter(prospect => {
                  const prospectDate = new Date(
                    prospect.createdAt || prospect.dateCreated || Date.now()
                  );
                  return (
                    prospectDate.getMonth() === currentMonth &&
                    prospectDate.getFullYear() === currentYear
                  );
                });

                if (newProspectsThisMonth.length > 0) {
                  recentActivities.push({
                    type: 'prospect',
                    message: `${newProspectsThisMonth.length} nouveau${newProspectsThisMonth.length > 1 ? 'x' : ''} prospect${newProspectsThisMonth.length > 1 ? 's' : ''} ce mois`,
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
                    const totalProspects = clients.length + prospects.length;
                    const convertedClients = clients.filter(
                      client => client.processStatus === 'client'
                    ).length;
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
                  {
                    clients.filter(client => client.processStatus === 'client')
                      .length
                  }
                </p>
              </div>
              <div className="flex justify-between">
                <p className="!text-zinc-400">{t('projects_in_progress')}</p>
                <p className="!text-purple-400 font-semibold">
                  {
                    projects.filter(
                      project =>
                        project.status === 'in_progress' ||
                        project.status === 'en_cours' ||
                        project.status === 'active'
                    ).length
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
