'use client';

import React, { useEffect, useState } from 'react';
import useLenis from '@/utils/useLenis';
import { fetchProjectsUser } from '@/lib/api';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import { FilterOption } from '@/app/components/TableFilters';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import {
  IconBuilding,
  IconCheck,
  IconProgressCheck,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  const columns = [
    {
      key: 'title',
      label: 'Projet',
      render: (value: unknown, row: Project) => (
        <div>
          <h4 className="!text-zinc-200 font-medium">{value as string}</h4>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon
              type={row.type}
              className="w-4 h-4 !text-zinc-500"
            />
            <p className="!text-zinc-500 !text-sm">{row.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (value: unknown) => (
        <p className="!text-zinc-300">
          {(value as { name: string })?.name || 'N/A'}
        </p>
      ),
    },
    {
      key: 'mentor',
      label: 'Mentor',
      render: (value: unknown) => (
        <p className="!text-zinc-300">
          {(value as { name: string })?.name || 'N/A'}
        </p>
      ),
    },
    {
      key: 'project_status',
      label: 'Statut',
      render: (value: unknown) => {
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
      key: 'start_date',
      label: 'Début',
      render: (value: unknown) => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'end_date',
      label: 'Fin',
      render: (value: unknown) => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, row: Project) => (
        <TableActions
          onEdit={() => console.log('Edit project:', row.id)}
          onDelete={() => console.log('Delete project:', row.id)}
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
      <DashboardPageTemplate<Project>
        title={t('projects')}
        onRowClick={row => router.push(`/dashboard/projects/${row.id}`)}
        actionButtonLabel={t('new_project')}
        onActionButtonClick={() => {}}
        stats={[
          {
            label: t('total_projects'),
            value: projects.length,
            colorClass: '!text-green-400',
            icon: <IconBuilding className="w-6 h-6 !text-green-400" />,
          },
          {
            label: t('completed_projects'),
            value: projects.filter(p => p.project_status === 'completed')
              .length,
            colorClass: '!text-blue-400',
            icon: <IconCheck className="w-6 h-6 !text-blue-400" />,
          },
          {
            label: t('in_progress_projects'),
            value: projects.filter(p => p.project_status === 'in_progress')
              .length,
            colorClass: '!text-yellow-400',
            icon: <IconProgressCheck className="w-6 h-6 !text-yellow-400" />,
          },
        ]}
        loading={loading}
        filterOptions={statusOptions}
        searchPlaceholder={t('search_project_placeholder')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        columns={columns as unknown as Column<Project>[]}
        data={filteredProjects}
        emptyMessage={t('no_project_found')}
      />
    </ProtectedRoute>
  );
}
