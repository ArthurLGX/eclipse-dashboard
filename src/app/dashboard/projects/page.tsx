'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useLenis from '@/utils/useLenis';
import { fetchProjects } from '@/lib/api';
import DataTable, { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import TableFilters, { FilterOption } from '@/app/components/TableFilters';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      try {
        setLoading(true);
        const response = await fetchProjects();
        setProjects(response.data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
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
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="!text-3xl font-bold !text-zinc-200">Projects</h1>
        <button className="bg-green-500 !text-black px-4 py-2 rounded-lg hover:bg-green-400 transition-colors">
          Nouveau projet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
            Total Projects
          </h3>
          <p className="!text-3xl font-bold !text-purple-400">
            {projects.length}
          </p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
            En cours
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
            Terminés
          </h3>
          <p className="!text-3xl font-bold !text-green-400">
            {
              projects.filter(project => project.project_status === 'completed')
                .length
            }
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="!text-xl font-semibold !text-zinc-200">
            Liste des projets
          </h2>
        </div>
        <div className="p-6">
          <TableFilters
            searchPlaceholder="Rechercher par nom, client ou mentor..."
            statusOptions={statusOptions}
            onSearchChange={setSearchTerm}
            onStatusChange={setStatusFilter}
            searchValue={searchTerm}
            statusValue={statusFilter}
          />
          <DataTable<Project>
            columns={columns}
            data={filteredProjects}
            loading={loading}
            emptyMessage="Aucun projet trouvé"
          />
        </div>
      </div>
    </motion.div>
  );
}
