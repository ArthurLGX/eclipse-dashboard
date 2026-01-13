'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { deleteProject, fetchProjectTasks, toggleProjectFavorite, updateProjectsOrder } from '@/lib/api';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { FilterOption, AdvancedFilter, DateRangeFilter } from '@/app/components/TableFilters';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import {
  IconBuilding,
  IconCheck,
  IconProgressCheck,
  IconCalendarEvent,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuickProjectModal from '@/app/components/QuickProjectModal';
import { usePopup } from '@/app/context/PopupContext';
import { generateSlug } from '@/utils/slug';
import { useProjects, useClients, clearCache } from '@/hooks/useApi';
import type { Project, Client } from '@/types';
import { useQuota } from '@/app/context/QuotaContext';
import QuotaExceededModal from '@/app/components/QuotaExceededModal';
import { useQuotaExceeded } from '@/hooks/useQuotaExceeded';
import { updateProjectStatusWithSync } from '@/lib/api';

export default function ProjectsPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAdd, getVisibleCount, limits } = useQuota();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
  });
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  // Advanced filters state
  const [typeFilter, setTypeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ from: '', to: '' });
  const [hasPendingTasksFilter, setHasPendingTasksFilter] = useState<boolean | undefined>(undefined);

  // Hooks avec cache
  const { data: projectsData, loading: loadingProjects, refetch: refetchProjects } = useProjects(user?.id);
  const { data: clientsData } = useClients(user?.id);

  const allProjects = useMemo(() => (projectsData as Project[]) || [], [projectsData]);
  
  // Séparer les projets possédés et les projets collaborés
  // Les projets collaborés ne comptent PAS dans le quota
  const projects = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownedProjects = allProjects.filter((p: any) => !p._isCollaborator);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collaboratedProjects = allProjects.filter((p: any) => p._isCollaborator);
    
    // Appliquer le quota uniquement aux projets possédés
    const visibleCount = getVisibleCount('projects');
    const visibleOwnedProjects = ownedProjects.slice(0, visibleCount);
    
    // Toujours afficher tous les projets collaborés (pas de quota pour eux)
    return [...visibleOwnedProjects, ...collaboratedProjects];
  }, [allProjects, getVisibleCount]);

  // Liste des clients pour le modal de création de projet
  const _clients = useMemo(() => 
    ((clientsData as Client[]) || []).map(c => ({ id: c.id, name: c.name })),
    [clientsData]
  );
  void _clients; // Utilisé par QuickProjectModal via useClients

  // Quota exceeded detection (only for owned projects)
  const ownedProjects = useMemo(() => 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allProjects.filter((p: any) => !p._isCollaborator),
    [allProjects]
  );
  
  const { 
    showModal: showQuotaModal, 
    setShowModal: setShowQuotaModal, 
    quota: projectsQuota,
    markAsHandled: markQuotaHandled 
  } = useQuotaExceeded('projects', ownedProjects, !loadingProjects && ownedProjects.length > 0);

  // Handle quota exceeded selection
  const handleQuotaSelection = async (itemsToKeep: Project[], itemsToRemove: Project[]) => {
    // Archive les projets non sélectionnés et synchronise le pipeline des clients
    let archivedCount = 0;
    for (const project of itemsToRemove) {
      if (!project.documentId) continue;
      try {
        await updateProjectStatusWithSync(
          project.documentId,
          'archived',
          project.client?.documentId
        );
        archivedCount++;
      } catch (error) {
        console.error(`Error archiving project ${project.title}:`, error);
      }
    }
    
    if (archivedCount > 0) {
      showGlobalPopup(
        `${archivedCount} ${t('items_deactivated') || 'projets archivés'}`,
        'success'
      );
    }
    
    markQuotaHandled();
    clearCache('projects');
    await refetchProjects();
  };

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

  // Get unique project types
  const typeOptions: FilterOption[] = useMemo(() => {
    const types = [...new Set(projects.map(p => p.type).filter(Boolean))] as string[];
    return types.map(type => ({
      value: type,
      label: type,
      count: projects.filter(p => p.type === type).length,
    }));
  }, [projects]);

  // Get unique clients with projects
  const clientOptions: FilterOption[] = useMemo(() => {
    const clientMap = new Map<number, { name: string; count: number }>();
    projects.forEach(p => {
      if (p.client?.id && p.client?.name) {
        const existing = clientMap.get(p.client.id);
        if (existing) {
          existing.count++;
        } else {
          clientMap.set(p.client.id, { name: p.client.name, count: 1 });
        }
      }
    });
    return Array.from(clientMap.entries()).map(([id, { name, count }]) => ({
      value: id.toString(),
      label: name,
      count,
    }));
  }, [projects]);

  // Advanced filters configuration
  const advancedFilters: AdvancedFilter[] = useMemo(() => [
    {
      id: 'type',
      type: 'select',
      label: t('project_type') || 'Type de projet',
      options: typeOptions,
      value: typeFilter,
      placeholder: t('all_types') || 'Tous les types',
    },
    {
      id: 'client',
      type: 'select',
      label: t('client'),
      options: clientOptions,
      value: clientFilter,
      placeholder: t('all_clients') || 'Tous les clients',
    },
    {
      id: 'hasPendingTasks',
      type: 'toggle',
      label: t('with_pending_tasks') || 'Avec tâches en cours',
      value: hasPendingTasksFilter,
    },
    {
      id: 'dateRange',
      type: 'date-range',
      label: t('start_date') || 'Date de début',
      value: dateRangeFilter,
    },
  ], [t, typeOptions, clientOptions, typeFilter, clientFilter, hasPendingTasksFilter, dateRangeFilter]);

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (filterId: string, value: string | string[] | boolean | DateRangeFilter) => {
    switch (filterId) {
      case 'type':
        setTypeFilter(value as string);
        break;
      case 'client':
        setClientFilter(value as string);
        break;
      case 'hasPendingTasks':
        setHasPendingTasksFilter(value as boolean ? true : undefined);
        break;
      case 'dateRange':
        setDateRangeFilter(value as DateRangeFilter);
        break;
    }
  };

  // Filtrage des données
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        searchTerm === '' ||
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === '' || project.project_status === statusFilter;

      // Type filter
      const matchesType =
        typeFilter === '' || project.type === typeFilter;

      // Client filter
      const matchesClient =
        clientFilter === '' || project.client?.id?.toString() === clientFilter;

      // Pending tasks filter
      const matchesPendingTasks =
        hasPendingTasksFilter === undefined || 
        (hasPendingTasksFilter && (taskCounts[project.documentId] || 0) > 0);

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter.from || dateRangeFilter.to) {
        const projectDate = project.start_date ? new Date(project.start_date) : null;
        if (projectDate) {
          if (dateRangeFilter.from) {
            matchesDateRange = matchesDateRange && projectDate >= new Date(dateRangeFilter.from);
          }
          if (dateRangeFilter.to) {
            matchesDateRange = matchesDateRange && projectDate <= new Date(dateRangeFilter.to);
          }
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesClient && matchesPendingTasks && matchesDateRange;
    });
  }, [projects, searchTerm, statusFilter, typeFilter, clientFilter, hasPendingTasksFilter, taskCounts, dateRangeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    limit: limits.projects,
    completed: projects.filter(p => p.project_status === 'completed').length,
    inProgress: projects.filter(p => p.project_status === 'in_progress').length,
  }), [projects, limits]);

  // Colonnes du tableau
  const columns: Column<Project>[] = [
    {
      key: 'title',
      label: t('project') || 'Projet',
      render: (value, row) => (
        <div className="relative">
          <div className="flex items-start gap-2">
            <h4 className="text-primary font-medium">{value as string}</h4>
            {taskCounts[row.documentId] > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-amber-500 rounded-full">
                {taskCounts[row.documentId]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon type={row.type} className="w-4 h-4 text-zinc-500" />
            <p className="text-muted !text-sm">{row.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: t('client'),
      render: (value) => (
        <p className="text-secondary">
          {(value as { name?: string })?.name || 'N/A'}
        </p>
      ),
    },
    {
      key: 'project_status',
      label: t('status'),
      render: (value) => {
        const status = value as string;
        const config = 
          status === 'completed' ? { label: t('completed') || 'Terminé', className: 'badge-success' } :
          status === 'in_progress' ? { label: t('in_progress') || 'En cours', className: 'badge-warning' } :
          status === 'planning' ? { label: t('planning') || 'Planification', className: 'badge-info' } :
          { label: status, className: 'badge-primary' };

        return (
          <span className={`badge ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'start_date',
      label: t('start_date'),
      render: (value) => (
        <p className="text-secondary">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'end_date',
      label: t('end_date'),
      render: (value) => (
        <p className="text-secondary">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleScheduleMeeting(row);
            }}
            title={t('schedule_meeting') || 'Planifier une réunion'}
            className="p-1.5 rounded-lg cursor-pointer hover:bg-accent-light text-muted hover:text-accent transition-colors"
          >
            <IconCalendarEvent className="w-4 h-4" />
          </button>
          <TableActions
            onEdit={() => router.push(`/dashboard/projects/${generateSlug(row.title, row.documentId)}?edit=1`)}
            onDelete={() => setDeleteModal({ isOpen: true, project: row })}
          />
        </div>
      ),
    },
  ];

  const handleDeleteProject = async () => {
    if (!deleteModal.project?.documentId) return;
    
    await deleteProject(deleteModal.project.documentId);
    showGlobalPopup(t('project_deleted_success') || 'Projet supprimé avec succès', 'success');
    clearCache('projects');
    await refetchProjects();
  };

  // Planifier une réunion pour un projet
  const handleScheduleMeeting = (project?: Project) => {
    const params = new URLSearchParams();
    params.set('action', 'new');
    if (project) {
      params.set('projectId', project.documentId);
      if (project.client?.documentId) {
        params.set('clientId', project.client.documentId);
      }
    }
    router.push(`/dashboard/calendar?${params.toString()}`);
  };

  // Handle multiple deletion
  const handleDeleteMultipleProjects = async (projectsToDelete: Project[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const project of projectsToDelete) {
      if (!project.documentId) continue;
      try {
        await deleteProject(project.documentId);
        successCount++;
      } catch (error) {
        console.error(`Error deleting project ${project.title}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showGlobalPopup(`${successCount} projet(s) supprimé(s) avec succès`, 'success');
      clearCache('projects');
      await refetchProjects();
    }
    if (errorCount > 0) {
      showGlobalPopup(`${errorCount} erreur(s) lors de la suppression`, 'error');
    }
  };

  // Local state for optimistic favorite updates
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});
  
  // Handle toggle favorite (optimistic update)
  const handleToggleFavorite = async (project: Project) => {
    const currentState = localFavorites[project.documentId] ?? project.is_favorite ?? false;
    const newFavoriteState = !currentState;
    
    // Optimistic update
    setLocalFavorites(prev => ({ ...prev, [project.documentId]: newFavoriteState }));
    
    try {
      await toggleProjectFavorite(project.documentId, newFavoriteState);
      clearCache('projects');
    } catch (error) {
      // Revert on error
      setLocalFavorites(prev => ({ ...prev, [project.documentId]: currentState }));
      console.error('Error toggling favorite:', error);
      showGlobalPopup(t('error') || 'Erreur', 'error');
    }
  };
  
  // Function to check if project is favorite (with optimistic state)
  const isProjectFavorite = (project: Project) => 
    localFavorites[project.documentId] ?? project.is_favorite ?? false;

  // Handle reorder
  // Debounce pour éviter les appels multiples lors du drag & drop
  const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReorderingRef = useRef(false);
  
  const handleReorder = useCallback(async (reorderedProjects: Project[]) => {
    // Si déjà en cours, annuler le timeout précédent
    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }
    
    // Debounce de 500ms pour attendre la fin du drag
    reorderTimeoutRef.current = setTimeout(async () => {
      if (isReorderingRef.current) return;
      isReorderingRef.current = true;
      
      try {
        const updates = reorderedProjects.map((p, index) => ({
          documentId: p.documentId,
          sort_order: index,
        }));
        await updateProjectsOrder(updates);
        clearCache('projects');
      } catch (error) {
        console.error('Error reordering projects:', error);
        showGlobalPopup(t('error') || 'Erreur', 'error');
      } finally {
        isReorderingRef.current = false;
      }
    }, 500);
  }, [showGlobalPopup, t]);

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Project>
        title={t('projects')}
        onRowClick={row => router.push(`/dashboard/projects/${generateSlug(row.title, row.documentId)}`)}
        actionButtonLabel={canAdd('projects') ? t('new_project') : `${t('new_project')} (${t('quota_reached') || 'Quota atteint'})`}
        onActionButtonClick={canAdd('projects') ? () => setShowNewProjectModal(true) : () => showGlobalPopup(t('quota_reached_message') || 'Quota atteint. Passez à un plan supérieur.', 'warning')}
        additionalActions={[
          {
            label: t('schedule_meeting') || 'Planifier une réunion',
            onClick: () => handleScheduleMeeting(),
            icon: <IconCalendarEvent className="w-4 h-4" />,
            variant: 'outline',
          },
        ]}
        stats={[
          {
            label: t('total_projects'),
            value: stats.limit > 0 ? `${stats.total}/${stats.limit}` : stats.total,
            colorClass: 'text-success',
            icon: <IconBuilding className="w-6 h-6 text-success" />,
          },
          {
            label: t('completed_projects'),
            value: stats.completed,
            colorClass: 'text-info',
            icon: <IconCheck className="w-6 h-6 text-info" />,
          },
          {
            label: t('in_progress_projects'),
            value: stats.inProgress,
            colorClass: 'text-warning',
            icon: <IconProgressCheck className="w-6 h-6 text-warning" />,
          },
        ]}
        loading={loadingProjects}
        filterOptions={statusOptions}
        searchPlaceholder={t('search_project_placeholder')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        advancedFilters={advancedFilters}
        onAdvancedFilterChange={handleAdvancedFilterChange}
        columns={columns}
        data={filteredProjects}
        emptyMessage={t('no_project_found')}
        selectable={true}
        onDeleteSelected={handleDeleteMultipleProjects}
        getItemId={(project) => project.documentId || ''}
        getItemName={(project) => project.title}
        sortable={true}
        showFavorites={true}
        isFavorite={isProjectFavorite}
        onToggleFavorite={handleToggleFavorite}
        draggable={true}
        onReorder={handleReorder}
      />

      <QuickProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={async () => {
          await refetchProjects();
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, project: null })}
        onConfirm={handleDeleteProject}
        title={t('delete_project') || 'Supprimer le projet'}
        itemName={deleteModal.project?.title || ''}
        itemType="project"
      />

      {/* Quota Exceeded Modal */}
      <QuotaExceededModal<Project>
        isOpen={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        items={ownedProjects}
        quota={projectsQuota}
        entityName={t('projects') || 'projets'}
        getItemId={(project) => project.documentId || ''}
        getItemName={(project) => project.title}
        getItemSubtitle={(project) => project.client?.name || ''}
        onConfirmSelection={handleQuotaSelection}
        renderItemIcon={(project) => (
          <ProjectTypeIcon type={project.type} className="w-6 h-6" />
        )}
      />
    </ProtectedRoute>
  );
}
