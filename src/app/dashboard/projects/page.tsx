'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useLenis from '@/utils/useLenis';
import { fetchProjectsUser } from '@/lib/api';
import DataTable, { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import TableFilters, { FilterOption } from '@/app/components/TableFilters';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface Project {
  id: string;
  title: string;
  description: string;
  project_status: string;
  client: {
    id: string;
    name: string;
  };
  mentor: {
    id: string;
    name: string;
  };
  type: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  useLenis();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  // Options de filtres par statut
  const statusOptions: FilterOption[] = [
    {
      value: 'completed',
      label: 'Terminé',
      count: projects.filter(p => p.project_status === 'completed').length,
    },
    {
      value: 'in_progress',
      label: 'En cours',
      count: projects.filter(p => p.project_status === 'in_progress').length,
    },
    {
      value: 'pending',
      label: 'En attente',
      count: projects.filter(p => p.project_status === 'pending').length,
    },
  ];

  // Filtrage des données
  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      searchTerm === '' ||
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.mentor?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === '' || project.project_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: Column<Project>[] = [
    {
      key: 'title',
      label: 'Projet',
      render: (value, row) => (
        <div>
          <h4 className="!text-zinc-200 font-medium">{value as string}</h4>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon
              type={(row as Project).type}
              className="w-4 h-4 !text-zinc-500"
            />
            <p className="!text-zinc-500 !text-sm">{(row as Project).type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: value => (
        <p className="!text-zinc-300">
          {(value as { name: string })?.name || 'N/A'}
        </p>
      ),
    },
    {
      key: 'mentor',
      label: 'Mentor',
      render: value => (
        <p className="!text-zinc-300">
          {(value as { name: string })?.name || 'N/A'}
        </p>
      ),
    },
    {
      key: 'project_status',
      label: 'Statut',
      render: value => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'completed':
              return {
                label: 'Terminé',
                className: 'bg-green-100 !text-green-800',
              };
            case 'in_progress':
              return {
                label: 'En cours',
                className: 'bg-yellow-100 !text-yellow-800',
              };
            case 'pending':
              return {
                label: 'En attente',
                className: 'bg-blue-100 !text-blue-800',
              };
            default:
              return { label: status, className: 'bg-gray-100 !text-gray-800' };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Début',
      render: value => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'end_date',
      label: 'Fin',
      render: value => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <TableActions
          onEdit={() => console.log('Edit project:', (row as Project).id)}
          onDelete={() => console.log('Delete project:', (row as Project).id)}
        />
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetchProjectsUser(user.id);
        setProjects(response.data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
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
        className="space-y-6"
      >
        <div className="flex lg:flex-row flex-col gap-4   items-center justify-between">
          <h1 className="!text-3xl !uppercase font-extrabold text-left !text-zinc-200">
            {t('projects')}
          </h1>
          <button className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:text-white    transition-colors">
            {t('new_project')}
          </button>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800"
                    >
                      <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 bg-zinc-800 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('total_projects')}
                </h3>
                <p className="!text-3xl font-bold !text-purple-400">
                  {projects.length}
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('in_progress')}
                </h3>
                <p className="!text-3xl font-bold !text-yellow-400">
                  {
                    projects.filter(
                      project => project.project_status === 'in_progress'
                    ).length
                  }
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('completed')}
                </h3>
                <p className="!text-3xl font-bold !text-green-400">
                  {
                    projects.filter(
                      project => project.project_status === 'completed'
                    ).length
                  }
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="!text-xl font-semibold !text-zinc-200">
                  {t('projects_list')}
                </h2>
              </div>
              <div className="p-6">
                <TableFilters
                  searchPlaceholder={t('search_project_placeholder')}
                  statusOptions={statusOptions}
                  onSearchChangeAction={setSearchTerm}
                  onStatusChangeAction={setStatusFilter}
                  searchValue={searchTerm}
                  statusValue={statusFilter}
                />
                <DataTable<Project>
                  columns={columns}
                  data={filteredProjects}
                  loading={loading}
                  emptyMessage={t('no_project_found')}
                />
              </div>
            </div>
          </>
        )}
      </motion.div>
    </ProtectedRoute>
  );
}
