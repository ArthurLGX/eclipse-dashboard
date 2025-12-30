'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createProject, deleteProject, fetchProjectTasks } from '@/lib/api';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
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
import { useRouter, useSearchParams } from 'next/navigation';
import NewProjectModal, { CreateProjectData } from './NewProjectModal';
import { usePopup } from '@/app/context/PopupContext';
import { generateSlug } from '@/utils/slug';
import { useProjects, useClients, clearCache } from '@/hooks/useApi';
import type { Project, Client } from '@/types';

export default function ProjectsPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
  });
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  // Hooks avec cache
  const { data: projectsData, loading: loadingProjects, refetch: refetchProjects } = useProjects(user?.id);
  const { data: clientsData } = useClients(user?.id);

  const projects = (projectsData as Project[]) || [];
  const clients = useMemo(() => 
    ((clientsData as Client[]) || []).map(c => ({ id: c.id, name: c.name })),
    [clientsData]
  );

  // Ouvrir le modal si ?new=1 dans l'URL
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowNewProjectModal(true);
      router.replace('/dashboard/projects', { scroll: false });
    }
  }, [searchParams, router]);

  // Charger le nombre de tâches non terminées pour chaque projet
  useEffect(() => {
    const loadTaskCounts = async () => {
      if (!projects.length) return;
      
      const counts: Record<string, number> = {};
      await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await fetchProjectTasks(project.documentId);
            const tasks = response.data || [];
            // Compter les tâches non terminées (todo, in_progress)
            const pendingTasks = tasks.filter(
              (t: { task_status: string }) => t.task_status !== 'completed' && t.task_status !== 'cancelled'
            ).length;
            counts[project.documentId] = pendingTasks;
          } catch {
            counts[project.documentId] = 0;
          }
        })
      );
      setTaskCounts(counts);
    };
    loadTaskCounts();
  }, [projects]);

  // Options de filtres par statut
  const statusOptions: FilterOption[] = useMemo(() => [
    {
      value: 'completed',
      label: t('completed') || 'Terminé',
      count: projects.filter(p => p.project_status === 'completed').length,
    },
    {
      value: 'in_progress',
      label: t('in_progress') || 'En cours',
      count: projects.filter(p => p.project_status === 'in_progress').length,
    },
    {
      value: 'planning',
      label: t('planning') || 'Planification',
      count: projects.filter(p => p.project_status === 'planning').length,
    },
  ], [projects, t]);

  // Filtrage des données
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        searchTerm === '' ||
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === '' || project.project_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    completed: projects.filter(p => p.project_status === 'completed').length,
    inProgress: projects.filter(p => p.project_status === 'in_progress').length,
  }), [projects]);

  // Colonnes du tableau
  const columns: Column<Project>[] = [
    {
      key: 'title',
      label: 'Projet',
      render: (value, row) => (
        <div className="relative">
          <div className="flex items-start gap-2">
            <h4 className="text-zinc-200 font-medium">{value as string}</h4>
            {taskCounts[row.documentId] > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-amber-500 rounded-full">
                {taskCounts[row.documentId]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon type={row.type} className="w-4 h-4 text-zinc-500" />
            <p className="text-zinc-500 !text-sm">{row.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (value) => (
        <p className="text-zinc-300">
          {(value as { name?: string })?.name || 'N/A'}
        </p>
      ),
    },
    {
      key: 'project_status',
      label: 'Statut',
      render: (value) => {
        const status = value as string;
        const config = 
          status === 'completed' ? { label: t('completed') || 'Terminé', className: 'bg-emerald-100 !text-emerald-800' } :
          status === 'in_progress' ? { label: t('in_progress') || 'En cours', className: 'bg-yellow-100 !text-yellow-800' } :
          status === 'planning' ? { label: t('planning') || 'Planification', className: 'bg-blue-100 !text-blue-800' } :
          { label: status, className: 'bg-gray-100 !text-gray-800' };

        return (
          <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}>
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Début',
      render: (value) => (
        <p className="text-zinc-300">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'end_date',
      label: 'Fin',
      render: (value) => (
        <p className="text-zinc-300">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <TableActions
          onEdit={() => router.push(`/dashboard/projects/${generateSlug(row.title, row.documentId)}?edit=1`)}
          onDelete={() => setDeleteModal({ isOpen: true, project: row })}
        />
      ),
    },
  ];

  // Fonction pour créer un nouveau projet
  const handleCreateProject = async (projectData: CreateProjectData) => {
    if (!user?.id) {
      showGlobalPopup('Vous devez être connecté', 'error');
      throw new Error('Not authenticated');
    }

    try {
      await createProject({
        title: projectData.title,
        description: projectData.description,
        project_status: projectData.project_status,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        notes: projectData.notes,
        type: projectData.type,
        technologies: projectData.technologies,
        client: projectData.client as number,
        user: user.id,
      });

      showGlobalPopup(t('project_created_success') || 'Projet créé avec succès', 'success');

      // Invalider le cache et recharger
      clearCache('projects');
      await refetchProjects();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showGlobalPopup(errorMessage, 'error');
      throw error;
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteModal.project?.documentId) return;
    
    await deleteProject(deleteModal.project.documentId);
    showGlobalPopup(t('project_deleted_success') || 'Projet supprimé avec succès', 'success');
    clearCache('projects');
    await refetchProjects();
  };

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Project>
        title={t('projects')}
        onRowClick={row => router.push(`/dashboard/projects/${generateSlug(row.title, row.documentId)}`)}
        actionButtonLabel={t('new_project')}
        onActionButtonClick={() => setShowNewProjectModal(true)}
        stats={[
          {
            label: t('total_projects'),
            value: stats.total,
            colorClass: '!text-emerald-400',
            icon: <IconBuilding className="w-6 h-6 !text-emerald-400" />,
          },
          {
            label: t('completed_projects'),
            value: stats.completed,
            colorClass: '!text-blue-400',
            icon: <IconCheck className="w-6 h-6 !text-blue-400" />,
          },
          {
            label: t('in_progress_projects'),
            value: stats.inProgress,
            colorClass: '!text-yellow-400',
            icon: <IconProgressCheck className="w-6 h-6 !text-yellow-400" />,
          },
        ]}
        loading={loadingProjects}
        filterOptions={statusOptions}
        searchPlaceholder={t('search_project_placeholder')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        columns={columns}
        data={filteredProjects}
        emptyMessage={t('no_project_found')}
      />

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onAdd={handleCreateProject}
        clients={clients}
        t={t}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, project: null })}
        onConfirm={handleDeleteProject}
        title={t('delete_project') || 'Supprimer le projet'}
        itemName={deleteModal.project?.title || ''}
        itemType="project"
      />
    </ProtectedRoute>
  );
}
