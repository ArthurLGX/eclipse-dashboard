'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useModalFocus } from '@/hooks/useModalFocus';
import {
  IconPlus,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconTrash,
  IconEdit,
  IconCalendar,
  IconCalendarEvent,
  IconFlag,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconProgress,
  IconLayoutCards,
  IconTable,
  IconTimeline,
  IconColumns,
  IconFileTypePdf,
  IconSubtask,
  IconUser,
  IconPalette,
  IconCopy,
  IconArchive,
  IconArchiveOff,
  IconSquare,
  IconSquareCheck,
  IconSelectAll,
  IconGripVertical,
  IconDots,
  IconSearch,
  IconArrowsSort,
} from '@tabler/icons-react';
import ExcelImportModal, { type ImportedTask, type ImportProgressCallback } from './ExcelImportModal';
import AITaskGenerator, { type GeneratedTask } from './AITaskGenerator';
import { TaskListRedesignView } from './TaskSectionRedesign';
import DraggableGanttBar from './DraggableGanttBar';
import type { User } from '@/types';
import { UserAvatar, getUserDisplayName } from '@/app/components/UserDisplay';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import RichTextEditor from './RichTextEditor';
import {
  fetchProjectTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  updateTaskStatus,
  updateTaskProgress,
} from '@/lib/api';
import type { ProjectTask, TaskStatus, TaskPriority } from '@/types';
import {
  calculateParentTaskState,
  getEffectiveTaskProgress,
  wouldProgressLinkCreateCycle,
} from '@/utils/dataCoherence';

interface Collaborator {
  documentId: string;
  user?: {
    id: number;
    documentId: string;
    username?: string;
    email?: string;
  };
  is_owner?: boolean;
  permission?: string;
}

interface ProjectTasksProps {
  projectDocumentId: string;
  projectName?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  userId: number;
  canEdit: boolean;
  collaborators?: Collaborator[];
  ownerInfo?: {
    id: number;
    documentId: string;
    username?: string;
    email?: string;
  };
  onTaskAssigned?: (taskTitle: string, assignedTo: { email: string; username: string }) => void;
  onAllTasksCompleted?: () => void;
  /** Utilise le design redesign (cartes + progression) pour la vue Liste */
  useListRedesign?: boolean;
}

type ProjectTaskApiUpdate = NonNullable<Parameters<typeof updateProjectTask>[1]>;

type ViewMode = 'cards' | 'kanban' | 'table' | 'gantt';

// Types pour les options
type TaskStatusOption = { value: TaskStatus; label: string; color: string; icon: React.ReactNode };
type TaskPriorityOption = { value: TaskPriority; label: string; color: string };

// Couleurs prédéfinies pour les groupes de tâches
const TASK_COLORS = [
  '#8B5CF6', // Violet (défaut)
  '#3B82F6', // Bleu
  '#10B981', // Vert
  '#F59E0B', // Orange
  '#EF4444', // Rouge
  '#EC4899', // Rose
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// Composant pour afficher plusieurs avatars empilés
function AvatarStack({ 
  users, 
  max = 3,
  size = 'sm' 
}: { 
  users: (User | undefined)[]; 
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const validUsers = users.filter((u): u is User => !!u);
  const displayed = validUsers.slice(0, max);
  const remaining = validUsers.length - max;
  
  if (displayed.length === 0) return null;
  
  const sizeClasses = {
    xs: 'w-4 h-4 !text-[8px]',
    sm: 'w-5 h-5 !text-[10px]',
    md: 'w-7 h-7 !text-xs',
  };
  
  return (
    <div className="flex items-center -space-x-1.5">
      {displayed.map((user, i) => (
        <UserAvatar 
          key={user.id || i} 
          user={user} 
          size={size === 'xs' ? 'sm' : size}
          className={`ring-1 ring-card ${size === 'xs' ? '!w-4 !h-4 !text-[8px]' : ''}`}
        />
      ))}
      {remaining > 0 && (
        <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center ring-1 ring-card !text-muted font-medium`}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default function ProjectTasks({
  projectDocumentId,
  projectName = 'Projet',
  projectStartDate,
  projectEndDate,
  userId,
  canEdit,
  collaborators = [],
  ownerInfo,
  onTaskAssigned,
  onAllTasksCompleted,
  useListRedesign = false,
}: ProjectTasksProps) {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  
  // Créer une liste complète des membres (owner + collaborateurs)
  const allMembers = useMemo(() => {
    const members: { id: number; documentId: string; username: string; email: string; isOwner: boolean }[] = [];
    
    // Ajouter le propriétaire
    if (ownerInfo) {
      members.push({
        id: ownerInfo.id,
        documentId: ownerInfo.documentId,
        username: getUserDisplayName(ownerInfo) || 'Propriétaire',
        email: ownerInfo.email || '',
        isOwner: true,
      });
    }
    
    // Ajouter les collaborateurs
    collaborators.forEach(collab => {
      if (collab.user && !collab.is_owner) {
        members.push({
          id: collab.user.id,
          documentId: collab.user.documentId,
          username: collab.user.username || 'Collaborateur',
          email: collab.user.email || '',
          isOwner: false,
        });
      }
    });
    
    return members;
  }, [ownerInfo, collaborators]);

  // Options définies à l'intérieur du composant pour accéder à t()
  const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'cards', label: t('cards') || 'Cartes', icon: <IconLayoutCards className="w-4 h-4" /> },
    { value: 'kanban', label: 'Kanban', icon: <IconColumns className="w-4 h-4" /> },
    { value: 'table', label: t('table') || 'Tableau', icon: <IconTable className="w-4 h-4" /> },
    { value: 'gantt', label: t('gantt') || 'Gantt', icon: <IconTimeline className="w-4 h-4" /> },
  ];

  const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; icon: React.ReactNode }[] = [
    { value: 'todo', label: t('todo') || 'À faire', color: 'blue', icon: <IconClock className="w-4 h-4" /> },
    { value: 'in_progress', label: t('in_progress') || 'En cours', color: 'amber', icon: <IconProgress className="w-4 h-4" /> },
    { value: 'completed', label: t('completed') || 'Terminé', color: 'emerald', icon: <IconCheck className="w-4 h-4" /> },
    { value: 'cancelled', label: t('cancelled') || 'Annulé', color: 'red', icon: <IconX className="w-4 h-4" /> },
    { value: 'archived', label: t('task_archived') || 'Archivée', color: 'zinc', icon: <IconArchive className="w-4 h-4" /> },
  ];

  const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: t('low') || 'Basse', color: 'zinc' },
    { value: 'medium', label: t('medium') || 'Moyenne', color: 'blue' },
    { value: 'high', label: t('high') || 'Haute', color: 'amber' },
    { value: 'urgent', label: t('urgent') || 'Urgente', color: 'red' },
  ];

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<ProjectTask | null>(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  // Sélection multiple
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<
    | 'title_asc'
    | 'title_desc'
    | 'start_date_asc'
    | 'start_date_desc'
    | 'due_date_asc'
    | 'due_date_desc'
    | 'priority_asc'
    | 'priority_desc'
    | 'status'
    | 'progress'
  >('title_asc');

  const flatTasksForLinks = useMemo(() => {
    const out: ProjectTask[] = [];
    for (const t of tasks) {
      out.push(t);
      t.subtasks?.forEach((st) => out.push(st));
    }
    return out;
  }, [tasks]);

  // Formulaire nouvelle tâche
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    start_date: '',
    due_date: '',
    estimated_hours: '',
    assigned_to: '',
    color: TASK_COLORS[0],
  });

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDocumentId]);

  // Héritage des données de la tâche parente pour les sous-tâches
  useEffect(() => {
    if (parentTaskForSubtask) {
      setNewTask({
        title: '',
        description: '',
        task_status: parentTaskForSubtask.task_status || 'todo',
        priority: parentTaskForSubtask.priority || 'medium',
        start_date: parentTaskForSubtask.start_date || '',
        due_date: parentTaskForSubtask.due_date || '',
        estimated_hours: '', // On ne copie pas les heures estimées
        assigned_to: parentTaskForSubtask.assigned_to?.documentId || '',
        color: parentTaskForSubtask.color || TASK_COLORS[0],
      });
    }
  }, [parentTaskForSubtask]);

  const loadTasks = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetchProjectTasks(projectDocumentId);
      setTasks(response.data || []);
    } catch {
      setTasks([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const parentDocId = parentTaskForSubtask?.documentId;

    try {
      await createProjectTask({
        project: projectDocumentId,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        task_status: newTask.task_status,
        priority: newTask.priority,
        start_date: newTask.start_date || null,
        due_date: newTask.due_date || null,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        created_user: userId,
        assigned_to: newTask.assigned_to ? allMembers.find(m => m.documentId === newTask.assigned_to)?.id : undefined,
        order: tasks.length,
        parent_task: parentDocId || undefined,
        color: parentTaskForSubtask ? parentTaskForSubtask.color : newTask.color,
      });

      // Si une personne est assignée, notifier
      if (newTask.assigned_to && onTaskAssigned) {
        const assignedMember = allMembers.find(m => m.documentId === newTask.assigned_to);
        if (assignedMember && assignedMember.email) {
          onTaskAssigned(newTask.title, { email: assignedMember.email, username: getUserDisplayName(assignedMember) });
        }
      }

      const successMessage = parentTaskForSubtask 
        ? (t('subtask_created') || 'Sous-tâche créée avec succès')
        : (t('task_created') || 'Tâche créée avec succès');
      showGlobalPopup(successMessage, 'success');
      setNewTask({ title: '', description: '', task_status: 'todo', priority: 'medium', start_date: '', due_date: '', estimated_hours: '', assigned_to: '', color: TASK_COLORS[0] });
      setShowNewTaskForm(false);
      setParentTaskForSubtask(null);
      
      // Recharger les tâches (silencieux = pas de spinner)
      await loadTasks(true);

      // Si c'était une sous-tâche, synchroniser la tâche parente
      if (parentDocId) {
        setTimeout(async () => {
          await syncParentTaskFromSubtasks(parentDocId);
          loadTasks(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  // Synchroniser les valeurs agrégées de la tâche parente depuis ses sous-tâches
  const syncParentTaskFromSubtasks = async (parentTaskDocId: string) => {
    try {
      // Récupérer les données fraîches depuis l'API
      const response = await fetchProjectTasks(projectDocumentId);
      const freshTasks = response.data || [];
      
      // Trouver la tâche parente
      const parentTask = freshTasks.find(t => t.documentId === parentTaskDocId);
      if (!parentTask) return;

      // Récupérer toutes les sous-tâches de cette tâche parente
      const subtasks = freshTasks.filter(t => t.parent_task?.documentId === parentTaskDocId);
      if (subtasks.length === 0) return;

      // Utiliser calculateParentTaskState pour obtenir le statut et la progression cohérents
      const { status: calculatedStatus, progress: calculatedProgress } = calculateParentTaskState(subtasks);

      // Calculer la somme des heures estimées
      const totalEstimatedHours = subtasks.reduce((sum, st) => {
        return sum + (st.estimated_hours || 0);
      }, 0);

      // Trouver les dates min/max
      const startDates = subtasks
        .map(st => st.start_date)
        .filter((d): d is string => !!d)
        .map(d => new Date(d));
      
      const endDates = subtasks
        .map(st => st.due_date)
        .filter((d): d is string => !!d)
        .map(d => new Date(d));

      const updates: Parameters<typeof updateProjectTask>[1] = {
        task_status: calculatedStatus,
        progress: calculatedProgress,
      };
      
      // Mettre à jour les heures estimées (somme des sous-tâches)
      if (totalEstimatedHours > 0) {
        updates.estimated_hours = totalEstimatedHours;
      }

      // Mettre à jour la date de début (min des sous-tâches)
      if (startDates.length > 0) {
        const minStartDate = new Date(Math.min(...startDates.map(d => d.getTime())));
        const minStartDateStr = minStartDate.toISOString().split('T')[0];
        // Toujours prendre la date min des sous-tâches pour englober
        if (!parentTask.start_date || new Date(parentTask.start_date) > minStartDate) {
          updates.start_date = minStartDateStr;
        }
      }

      // Mettre à jour la date de fin (max des sous-tâches)
      if (endDates.length > 0) {
        const maxEndDate = new Date(Math.max(...endDates.map(d => d.getTime())));
        const maxEndDateStr = maxEndDate.toISOString().split('T')[0];
        // Toujours prendre la date max des sous-tâches pour englober
        if (!parentTask.due_date || new Date(parentTask.due_date) < maxEndDate) {
          updates.due_date = maxEndDateStr;
        }
      }

      // Appliquer les mises à jour si nécessaire
      if (Object.keys(updates).length > 0) {
        await updateProjectTask(parentTaskDocId, updates);
      }
    } catch (error) {
      console.error('Error syncing parent task:', error);
    }
  };

  const handleUpdateTask = async (taskDocumentId: string, updates: ProjectTaskApiUpdate) => {
    try {
      // Trouver la tâche pour savoir si c'est une sous-tâche
      const task = tasks.find(t => t.documentId === taskDocumentId);
      const isSubtask = !!task?.parent_task;
      const parentTaskDocId = task?.parent_task?.documentId;

      await updateProjectTask(taskDocumentId, updates);
      showGlobalPopup(t('task_updated') || 'Tâche mise à jour', 'success');
      setEditingTask(null);
      
      // Recharger les tâches (silencieux = pas de spinner)
      await loadTasks(true);
      
      // Si c'est une sous-tâche, synchroniser la tâche parente
      if (isSubtask && parentTaskDocId) {
        setTimeout(async () => {
          await syncParentTaskFromSubtasks(parentTaskDocId);
          loadTasks(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleDeleteTask = async (taskDocumentId: string) => {
    if (!confirm(t('confirm_delete_task') || 'Supprimer cette tâche ?')) return;

    // Trouver la tâche pour savoir si c'est une sous-tâche
    const task = tasks.find(t => t.documentId === taskDocumentId);
    const parentTaskDocId = task?.parent_task?.documentId;

    try {
      await deleteProjectTask(taskDocumentId);
      showGlobalPopup(t('task_deleted') || 'Tâche supprimée', 'success');
      
      // Recharger les tâches (silencieux = pas de spinner)
      await loadTasks(true);
      
      // Si c'était une sous-tâche, synchroniser la tâche parente
      if (parentTaskDocId) {
        setTimeout(async () => {
          await syncParentTaskFromSubtasks(parentTaskDocId);
          loadTasks(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  // Dupliquer une tâche (avec option de copier les sous-tâches)
  const handleDuplicateTask = async (task: ProjectTask, includeSubtasks: boolean = true) => {
    try {
      // Créer la tâche principale dupliquée
      const newTaskData = {
        title: `${task.title} (copie)`,
        description: task.description || '',
        task_status: task.task_status,
        priority: task.priority,
        start_date: task.start_date || undefined,
        due_date: task.due_date || undefined,
        estimated_hours: task.estimated_hours || undefined,
        color: task.color || TASK_COLORS[0],
        project: projectDocumentId,
        created_user: userId,
        assigned_to: task.assigned_to?.id || undefined,
        order: tasks.length,
        parent_task: task.parent_task?.documentId || undefined, // Pour dupliquer une sous-tâche
      };

      const createdTask = await createProjectTask(newTaskData) as { data?: { documentId?: string } };
      const newTaskDocId = createdTask?.data?.documentId;

      // Si la tâche a des sous-tâches et qu'on veut les copier
      if (includeSubtasks && task.subtasks && task.subtasks.length > 0 && newTaskDocId) {
        for (const subtask of task.subtasks) {
          await createProjectTask({
            title: subtask.title,
            description: subtask.description || '',
            task_status: subtask.task_status,
            priority: subtask.priority,
            start_date: subtask.start_date || undefined,
            due_date: subtask.due_date || undefined,
            estimated_hours: subtask.estimated_hours || undefined,
            color: task.color || TASK_COLORS[0], // Hérite de la couleur parente
            project: projectDocumentId,
            created_user: userId,
            assigned_to: subtask.assigned_to?.id || undefined,
            parent_task: newTaskDocId,
          });
        }
      }

      const subtasksCount = task.subtasks?.length || 0;
      const message = includeSubtasks && subtasksCount > 0
        ? `${t('task_duplicated') || 'Tâche dupliquée'} (${subtasksCount} ${t('subtasks') || 'sous-tâches'})`
        : (t('task_duplicated') || 'Tâche dupliquée avec succès');
      showGlobalPopup(message, 'success');
      loadTasks(true);
    } catch (error) {
      console.error('Error duplicating task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur lors de la duplication', 'error');
    }
  };

  // Convertir une tâche en sous-tâche d'une autre tâche (drag & drop)
  // Version optimiste : mise à jour immédiate du state, API en background
  const handleConvertToSubtask = (taskDocumentId: string, parentTaskDocumentId: string) => {
    // Trouver la tâche et la tâche parente
    const task = tasks.find(t => t.documentId === taskDocumentId);
    const parentTask = tasks.find(t => t.documentId === parentTaskDocumentId);
    
    // Validations silencieuses
    if (!task || !parentTask) return;
    if (task.subtasks && task.subtasks.length > 0) return;
    if (task.parent_task) return;
    if (parentTask.parent_task?.documentId === taskDocumentId) return;

    // Sauvegarder l'état précédent pour rollback si erreur
    const previousTasks = [...tasks];

    // Créer la tâche modifiée (devient sous-tâche)
    const updatedTask: ProjectTask = {
      ...task,
      parent_task: { ...parentTask, subtasks: undefined }, // Éviter la référence circulaire
      color: parentTask.color || TASK_COLORS[0],
    };

    // Calculer les nouvelles dates pour la tâche parente
    const existingSubtasks = parentTask.subtasks || [];
    const allSubtasks = [...existingSubtasks, updatedTask];
    
    // Calculer les dates min/max
    const allStartDates = allSubtasks
      .map(st => st.start_date)
      .filter((d): d is string => !!d)
      .map(d => new Date(d));
    
    const allEndDates = allSubtasks
      .map(st => st.due_date)
      .filter((d): d is string => !!d)
      .map(d => new Date(d));

    // Calculer la somme des heures estimées
    const totalEstimatedHours = allSubtasks.reduce((sum, st) => sum + (st.estimated_hours || 0), 0);

    // Déterminer les nouvelles dates du parent
    let newStartDate = parentTask.start_date;
    let newDueDate = parentTask.due_date;
    
    if (allStartDates.length > 0) {
      const minStartDate = new Date(Math.min(...allStartDates.map(d => d.getTime())));
      if (!parentTask.start_date || new Date(parentTask.start_date) > minStartDate) {
        newStartDate = minStartDate.toISOString().split('T')[0];
      }
    }
    
    if (allEndDates.length > 0) {
      const maxEndDate = new Date(Math.max(...allEndDates.map(d => d.getTime())));
      if (!parentTask.due_date || new Date(parentTask.due_date) < maxEndDate) {
        newDueDate = maxEndDate.toISOString().split('T')[0];
      }
    }

    // Créer la tâche parente mise à jour
    const updatedParentTask: ProjectTask = {
      ...parentTask,
      subtasks: allSubtasks,
      start_date: newStartDate,
      due_date: newDueDate,
      estimated_hours: totalEstimatedHours > 0 ? totalEstimatedHours : parentTask.estimated_hours,
    };

    // Mise à jour optimiste du state (immédiate, pas de refresh)
    setTasks(prevTasks => {
      return prevTasks
        // Retirer la tâche qui devient sous-tâche
        .filter(t => t.documentId !== taskDocumentId)
        // Mettre à jour la tâche parente
        .map(t => t.documentId === parentTaskDocumentId ? updatedParentTask : t);
    });

    // API calls en background (non-bloquant)
    const syncToApi = async () => {
      try {
        // 1. Mettre à jour la tâche pour définir son parent
        await updateProjectTask(taskDocumentId, {
          parent_task: parentTaskDocumentId,
          color: parentTask.color || TASK_COLORS[0],
        });

        // 2. Mettre à jour les dates/heures de la tâche parente si nécessaire
        const parentUpdates: Parameters<typeof updateProjectTask>[1] = {};
        if (newStartDate !== parentTask.start_date) {
          parentUpdates.start_date = newStartDate;
        }
        if (newDueDate !== parentTask.due_date) {
          parentUpdates.due_date = newDueDate;
        }
        if (totalEstimatedHours > 0 && totalEstimatedHours !== parentTask.estimated_hours) {
          parentUpdates.estimated_hours = totalEstimatedHours;
        }
        
        if (Object.keys(parentUpdates).length > 0) {
          await updateProjectTask(parentTaskDocumentId, parentUpdates);
        }
      } catch (error) {
        console.error('Error syncing task to subtask:', error);
        // Rollback silencieux en cas d'erreur
        setTasks(previousTasks);
      }
    };

    // Lancer la sync API sans bloquer
    syncToApi();
  };

  // État pour le drag & drop des tâches
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState<string | null>(null);

  // Fonctions de sélection multiple
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllVisibleTasks = () => {
    const allTaskIds = filteredTasks.map(t => t.documentId);
    setSelectedTasks(new Set(allTaskIds));
  };

  const deselectAllTasks = () => {
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  // Actions de masse
  const handleBulkArchive = async () => {
    if (selectedTasks.size === 0) return;
    
    const taskIds = Array.from(selectedTasks);
    const previousTasks = [...tasks];
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      taskIds.includes(t.documentId) 
        ? { ...t, task_status: 'archived' as TaskStatus } 
        : t
    ));
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
    
    // API calls en background
    try {
      await Promise.all(taskIds.map(id => 
        updateProjectTask(id, { task_status: 'archived' })
      ));
      showGlobalPopup(t('tasks_archived') || 'Tâches archivées', 'success');
    } catch (error) {
      console.error('Error archiving tasks:', error);
      setTasks(previousTasks);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedTasks.size === 0) return;
    
    const taskIds = Array.from(selectedTasks);
    const previousTasks = [...tasks];
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      taskIds.includes(t.documentId) 
        ? { ...t, task_status: 'todo' as TaskStatus } 
        : t
    ));
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
    
    // API calls en background
    try {
      await Promise.all(taskIds.map(id => 
        updateProjectTask(id, { task_status: 'todo' })
      ));
      showGlobalPopup(t('tasks_unarchived') || 'Tâches restaurées', 'success');
    } catch (error) {
      console.error('Error unarchiving tasks:', error);
      setTasks(previousTasks);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    if (!confirm(t('confirm_delete_tasks') || 'Supprimer les tâches sélectionnées ?')) return;

    const taskIds = Array.from(selectedTasks);
    const previousTasks = [...tasks];

    // Optimistic update
    setTasks(prev => prev.filter(t => !taskIds.includes(t.documentId)));
    setSelectedTasks(new Set());
    setIsSelectionMode(false);

    // API calls en background
    try {
      await Promise.all(taskIds.map(id => deleteProjectTask(id)));
      showGlobalPopup(t('tasks_deleted') || 'Tâches supprimées', 'success');
    } catch (error) {
      console.error('Error deleting tasks:', error);
      setTasks(previousTasks);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const [showBulkDatesModal, setShowBulkDatesModal] = useState(false);
  const [bulkDatesForm, setBulkDatesForm] = useState({ start_date: '', due_date: '' });
  const handleBulkUpdateDates = async () => {
    if (selectedTasks.size === 0) return;
    const start = bulkDatesForm.start_date || null;
    const due = bulkDatesForm.due_date || null;
    if (!start && !due) {
      showGlobalPopup(t('bulk_dates_required') || 'Indiquez au moins une date (début ou fin)', 'info');
      return;
    }
    const taskIds = Array.from(selectedTasks);
    try {
      await Promise.all(taskIds.map(id => updateProjectTask(id, { start_date: start || undefined, due_date: due || undefined })));
      showGlobalPopup(t('bulk_dates_updated') || `${taskIds.length} tâche(s) mise(s) à jour`, 'success');
      setShowBulkDatesModal(false);
      setBulkDatesForm({ start_date: '', due_date: '' });
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
      await loadTasks(true);
    } catch (error) {
      console.error('Error updating bulk dates:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  // Import de tâches depuis Excel
  const handleExcelImport = async (
    importedTasks: ImportedTask[], 
    options: { 
      sendNotificationEmails: boolean;
      emailSubject?: string;
      emailMessage?: string;
    },
    onProgress?: ImportProgressCallback
  ) => {
    try {
      // Collecter les tâches assignées pour les notifications
      const tasksToNotify: { 
        title: string; 
        description: string;
        priority: string;
        due_date: string | null;
        email: string; 
        username: string;
      }[] = [];

      // Récupérer les titres des tâches existantes pour détecter les doublons
      const existingTitles = new Set(
        tasks.map(t => t.title.toLowerCase().trim())
      );
      
      // Filtrer les tâches à importer (exclure les doublons)
      const tasksToImport: ImportedTask[] = [];
      const duplicateTasks: string[] = [];
      
      for (const task of importedTasks) {
        const normalizedTitle = task.title.toLowerCase().trim();
        if (existingTitles.has(normalizedTitle)) {
          duplicateTasks.push(task.title);
        } else {
          tasksToImport.push(task);
          // Ajouter au set pour éviter les doublons internes au fichier importé
          existingTitles.add(normalizedTitle);
        }
      }

      // Créer les tâches une par une (seulement les non-doublons)
      let createdCount = 0;
      const totalToImport = tasksToImport.length;
      for (let i = 0; i < tasksToImport.length; i++) {
        const task = tasksToImport[i];
        const assignedMember = task.assigned_to 
          ? allMembers.find(m => m.documentId === task.assigned_to) 
          : undefined;

        await createProjectTask({
          project: projectDocumentId,
          title: task.title,
          description: task.description,
          task_status: task.task_status,
          priority: task.priority,
          progress: task.progress || 0,
          start_date: task.start_date,
          due_date: task.due_date,
          estimated_hours: task.estimated_hours,
          actual_hours: task.actual_hours,
          created_user: userId,
          assigned_to: assignedMember?.id,
          order: tasks.length + i,
          color: task.color || TASK_COLORS[i % TASK_COLORS.length],
          tags: task.tags && task.tags.length > 0 ? task.tags : undefined,
        });
        createdCount++;
        
        // Notifier la progression
        if (onProgress) {
          onProgress(createdCount, totalToImport, task.title);
        }

        // Collecter pour notification si assigné et emails activés
        // Exclure les tâches terminées ou annulées
        const excludedStatuses: TaskStatus[] = ['completed', 'cancelled'];
        if (options.sendNotificationEmails && assignedMember && task.assigned_to_email && !excludedStatuses.includes(task.task_status)) {
          tasksToNotify.push({
            title: task.title,
            description: task.description,
            priority: task.priority,
            due_date: task.due_date,
            email: assignedMember.email,
            username: getUserDisplayName(assignedMember),
          });
        }
      }

      // Envoyer UN SEUL email consolidé par collaborateur
      if (options.sendNotificationEmails && tasksToNotify.length > 0) {
        const projectUrl = typeof window !== 'undefined' 
          ? `${window.location.origin}/dashboard/projects/${projectDocumentId}` 
          : '';
        
        // Grouper par email
        const uniqueEmails = [...new Set(tasksToNotify.map(t => t.email))];
        
        for (const email of uniqueEmails) {
          const userTasks = tasksToNotify.filter(t => t.email === email);
          const username = userTasks[0].username;
          
          // Générer le HTML de l'email avec toutes les tâches de l'utilisateur
          const emailHtml = generateTaskNotificationEmail({
            username,
            tasks: userTasks,
            projectName,
            projectUrl,
            message: options.emailMessage || `Vous avez de nouvelles tâches assignées sur le projet "${projectName}".`,
          });
          
          // Envoyer l'email via l'API
          try {
            await fetch('/api/emails/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
              },
              body: JSON.stringify({
                to: [email],
                subject: options.emailSubject || `Nouvelles tâches assignées - ${projectName}`,
                html: emailHtml,
              }),
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${email}:`, emailError);
          }
        }
        
        const duplicateInfo = duplicateTasks.length > 0 
          ? ` • ${duplicateTasks.length} ${t('duplicates_ignored') || 'doublon(s) ignoré(s)'}`
          : '';
        showGlobalPopup(
          `${createdCount} ${t('tasks_imported') || 'tâches importées'} • ${uniqueEmails.length} ${t('emails_sent') || 'email(s) envoyé(s)'}${duplicateInfo}`,
          'success'
        );
      } else {
        const duplicateInfo = duplicateTasks.length > 0 
          ? ` • ${duplicateTasks.length} ${t('duplicates_ignored') || 'doublon(s) ignoré(s)'}`
          : '';
        showGlobalPopup(
          `${createdCount} ${t('tasks_imported') || 'tâches importées avec succès'}${duplicateInfo}`,
          'success'
        );
      }

      loadTasks(true);
    } catch (error) {
      console.error('Error importing tasks:', error);
      throw error; // Propager l'erreur pour que le modal la gère
    }
  };

  // Handler pour les tâches générées par l'IA
  const handleAITasksGenerated = async (generatedTasks: GeneratedTask[]) => {
    try {
      let createdCount = 0;
      
      for (const task of generatedTasks) {
        // Créer la tâche principale
        const createdTask = await createProjectTask({
          title: task.title,
          description: task.description || '',
          task_status: 'todo',
          priority: task.priority,
          start_date: task.start_date || null,
          due_date: task.due_date || null,
          estimated_hours: task.estimated_hours || null,
          project: projectDocumentId,
          created_user: userId,
          color: TASK_COLORS[createdCount % TASK_COLORS.length],
        }) as { data?: { documentId?: string } };
        createdCount++;
        
        const newTaskDocId = createdTask?.data?.documentId;
        
        // Créer les sous-tâches si présentes
        if (task.subtasks && task.subtasks.length > 0 && newTaskDocId) {
          for (const subtask of task.subtasks) {
            await createProjectTask({
              title: subtask.title,
              description: subtask.description || '',
              task_status: 'todo',
              priority: subtask.priority,
              start_date: subtask.start_date || task.start_date || null,
              due_date: subtask.due_date || task.due_date || null,
              estimated_hours: subtask.estimated_hours || null,
              project: projectDocumentId,
              created_user: userId,
              parent_task: newTaskDocId,
            });
            createdCount++;
          }
        }
      }
      
      showGlobalPopup(
        `${createdCount} ${t('tasks_created') || 'tâches créées avec succès'}`,
        'success'
      );

      loadTasks(true);
    } catch (error) {
      console.error('Error creating AI-generated tasks:', error);
      showGlobalPopup(
        t('error_creating_tasks') || 'Erreur lors de la création des tâches',
        'error'
      );
    }
  };
  
  // Générer le HTML de l'email de notification de tâches
  const generateTaskNotificationEmail = ({
    username,
    tasks,
    projectName: pName,
    projectUrl,
    message,
  }: {
    username: string;
    tasks: { title: string; description: string; priority: string; due_date: string | null }[];
    projectName: string;
    projectUrl: string;
    message: string;
  }): string => {
    const taskListHtml = tasks.map(task => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
          <div style="font-weight: 600; color: #1F2937; margin-bottom: 4px;">${task.title}</div>
          ${task.description ? `<div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
          <div style="font-size: 12px; color: #9CA3AF;">
            ${task.priority ? `Priorité: ${task.priority} • ` : ''}
            ${task.due_date ? `Échéance: ${new Date(task.due_date).toLocaleDateString('fr-FR')}` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); border-radius: 16px 16px 0 0; padding: 32px; !text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">📋 Nouvelles tâches assignées</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Projet: ${pName}</p>
    </div>
    <div style="background-color: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <p style="color: #1F2937; font-size: 16px; margin: 0 0 16px;">Bonjour <strong>${username}</strong>,</p>
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${message.replace(/\n/g, '<br>')}</p>
      <div style="background-color: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: inline-block;">
        <span style="color: #7C3AED; font-weight: 600; font-size: 14px;">${tasks.length} tâche${tasks.length > 1 ? 's' : ''} ${tasks.length > 1 ? 'vous ont été assignées' : 'vous a été assignée'}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <thead>
          <tr><th style="padding: 12px 16px; !text-align: left; background-color: #F3F4F6; color: #6B7280; font-size: 12px; font-weight: 600; !text-transform: uppercase;">Vos tâches</th></tr>
        </thead>
        <tbody>${taskListHtml}</tbody>
      </table>
      <div style="!text-align: center; margin: 32px 0;">
        <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: white; !text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">Voir mes tâches →</a>
      </div>
      <p style="color: #9CA3AF; font-size: 13px; !text-align: center; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #E5E7EB;">Cet email a été envoyé automatiquement depuis Eclipse Dashboard.</p>
    </div>
  </div>
</body>
</html>`;
  };

  // ============================================================================
  // RÈGLES DE COHÉRENCE PARENT/ENFANTS (ISOPÉRIMÉTRIE)
  // Utilise les fonctions centralisées de @/utils/dataCoherence
  // ============================================================================

  /**
   * Met à jour le parent d'une sous-tâche après modification
   * Utilise calculateParentTaskState de @/utils/dataCoherence
   */
  const syncParentTaskState = async (parentTaskDocId: string, allTasks: ProjectTask[]) => {
    const parentTask = allTasks.find(t => t.documentId === parentTaskDocId);
    if (!parentTask) return;
    
    // Récupérer toutes les sous-tâches de ce parent
    const subtasks = allTasks.filter(t => t.parent_task?.documentId === parentTaskDocId);
    if (subtasks.length === 0) return;
    
    // Utiliser la fonction centralisée pour calculer l'état cohérent
    const { status: calculatedStatus, progress: calculatedProgress } = calculateParentTaskState(subtasks);
    
    // Vérifier si le parent a besoin d'être mis à jour
    const needsUpdate = parentTask.task_status !== calculatedStatus || parentTask.progress !== calculatedProgress;
    
    if (needsUpdate) {
      // Mise à jour du parent
      await updateTaskStatus(parentTaskDocId, calculatedStatus);
      if (calculatedProgress !== parentTask.progress) {
        await updateTaskProgress(parentTaskDocId, calculatedProgress);
      }
    }
  };

  const handleStatusChange = async (taskDocumentId: string, status: TaskStatus, alsoUpdateSubtasks = false) => {
    try {
      // Trouver la tâche pour savoir si c'est une sous-tâche
      const task = tasks.find(t => t.documentId === taskDocumentId);
      const isSubtask = !!task?.parent_task;
      const parentTaskDocId = task?.parent_task?.documentId;
      
      // 1. Mettre à jour le statut de la tâche elle-même
      await updateTaskStatus(taskDocumentId, status);
      
      // 2. Si c'est une tâche PARENTE et qu'on la complète, propager aux sous-tâches
      if (alsoUpdateSubtasks && status === 'completed' && task?.subtasks && task.subtasks.length > 0) {
        await Promise.all(
          task.subtasks
            .filter(st => st.task_status !== 'completed' || st.progress < 100)
            .map(async (st) => {
              // Mettre le statut à "completed"
              await updateTaskStatus(st.documentId, 'completed');
              // Mettre la progression à 100%
              if (st.progress < 100) {
                await updateTaskProgress(st.documentId, 100);
              }
            })
        );
      }
      
      // 3. Recharger les tâches pour avoir l'état à jour
      const response = await fetchProjectTasks(projectDocumentId);
      const updatedTasks = response.data || [];
      
      // 4. Si c'est une SOUS-TÂCHE, synchroniser l'état du parent
      if (isSubtask && parentTaskDocId) {
        await syncParentTaskState(parentTaskDocId, updatedTasks);
        // Recharger une dernière fois pour avoir l'état final
        const finalResponse = await fetchProjectTasks(projectDocumentId);
        setTasks(finalResponse.data || []);
      } else {
        setTasks(updatedTasks);
      }
      
      // 5. Vérifier si toutes les tâches principales sont terminées
      const finalTasks = tasks;
      const parentTasks = finalTasks.filter(t => !t.parent_task);
      if (parentTasks.length > 0 && onAllTasksCompleted) {
        const allCompleted = parentTasks.every(
          t => t.task_status === 'completed' || t.task_status === 'cancelled'
        );
        if (allCompleted) {
          onAllTasksCompleted();
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Debounce ref pour éviter les appels multiples
  const progressTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});

  const handleProgressChange = useCallback((taskDocumentId: string, progress: number) => {
    const root = tasks.find((t) => t.documentId === taskDocumentId);
    const sub = tasks.flatMap((t) => t.subtasks || []).find((s) => s.documentId === taskDocumentId);
    const task = root ?? sub;
    if (
      task?.progress_sync_mode === 'average_of_linked' &&
      (task.progress_driver_tasks?.length ?? 0) > 0
    ) {
      return;
    }
    // Mise à jour locale immédiate pour l'UI
    setLocalProgress(prev => ({ ...prev, [taskDocumentId]: progress }));
    
    // Annuler le timeout précédent
    if (progressTimeoutRef.current[taskDocumentId]) {
      clearTimeout(progressTimeoutRef.current[taskDocumentId]);
    }
    
    // Debounce l'appel API (500ms après la fin du glissement)
    progressTimeoutRef.current[taskDocumentId] = setTimeout(async () => {
      try {
        // Trouver la tâche pour vérifier si c'est une sous-tâche
        const task = tasks.find(t => t.documentId === taskDocumentId);
        const isSubtask = !!task?.parent_task;
        const parentTaskDocId = task?.parent_task?.documentId;
        
        // Mettre à jour la progression
        await updateTaskProgress(taskDocumentId, progress);
        
        // Si la progression atteint 100%, passer le statut à "completed"
        if (progress === 100 && task?.task_status !== 'completed') {
          await updateTaskStatus(taskDocumentId, 'completed');
        }
        
        // Si la progression descend en dessous de 100% et que le statut est "completed", le changer
        if (progress < 100 && task?.task_status === 'completed') {
          await updateTaskStatus(taskDocumentId, 'in_progress');
        }
        
        // Recharger les tâches pour avoir l'état à jour
        const response = await fetchProjectTasks(projectDocumentId);
        const updatedTasks = response.data || [];
        
        // Si c'est une sous-tâche, synchroniser le parent
        if (isSubtask && parentTaskDocId) {
          await syncParentTaskState(parentTaskDocId, updatedTasks);
          // Recharger une dernière fois pour avoir l'état final
          const finalResponse = await fetchProjectTasks(projectDocumentId);
          setTasks(finalResponse.data || []);
        } else {
          setTasks(updatedTasks);
        }
        
        // Nettoyer la progression locale
        setLocalProgress(prev => {
          const next = { ...prev };
          delete next[taskDocumentId];
          return next;
        });
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }, 500);
  }, [tasks, projectDocumentId]);

  // Cleanup des timeouts
  useEffect(() => {
    const timeouts = progressTimeoutRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const toggleExpanded = (taskDocumentId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskDocumentId)) {
        next.delete(taskDocumentId);
      } else {
        next.add(taskDocumentId);
      }
      return next;
    });
  };

  const getStatusStyle = (status: TaskStatus) => {
    const knownStatuses: TaskStatus[] = ['todo', 'in_progress', 'completed', 'cancelled', 'archived'];
    return knownStatuses.includes(status) ? `badge-task-${status}` : 'badge-task-todo';
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    const colorMap: Record<TaskPriority, string> = {
      low: 'text-zinc-400',
      medium: 'text-blue-400',
      high: 'text-amber-400',
      urgent: 'text-red-400',
    };
    return colorMap[priority];
  };

  // Filtrer les tâches : exclure les sous-tâches (elles sont affichées dans leurs parents)
  // Et filtrer les archivées selon le toggle
  const parentTasks = tasks.filter(task => !task.parent_task);

  // Recherche : titre, description, ou titre d'une sous-tâche
  const taskMatchesSearch = useCallback((task: ProjectTask, term: string): boolean => {
    if (!term.trim()) return true;
    const q = term.trim().toLowerCase();
    const match = (s: string) => s && s.toLowerCase().includes(q);
    if (match(task.title) || match(task.description || '')) return true;
    if (task.subtasks?.some(st => match(st.title) || match(st.description || ''))) return true;
    return false;
  }, []);

  // Ordre des priorités : urgent > high > medium > low
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  // Ordre des statuts : todo → in_progress → completed → cancelled → archived
  const statusOrder: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 1,
    completed: 2,
    cancelled: 3,
    archived: 4,
  };

  type SortKey = typeof sortBy;
  const sortTasksFn = useCallback((a: ProjectTask, b: ProjectTask, sort: SortKey): number => {
    switch (sort) {
      case 'title_asc':
        return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
      case 'title_desc':
        return (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' });
      case 'start_date_asc': {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return da - db;
      }
      case 'start_date_desc': {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      }
      case 'due_date_asc': {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return da - db;
      }
      case 'due_date_desc': {
        const da = a.due_date ? new Date(a.due_date).getTime() : 0;
        const db = b.due_date ? new Date(b.due_date).getTime() : 0;
        return db - da;
      }
      case 'priority_asc':
        return (priorityOrder[a.priority || 'medium'] ?? 0) - (priorityOrder[b.priority || 'medium'] ?? 0);
      case 'priority_desc':
        return (priorityOrder[b.priority || 'medium'] ?? 0) - (priorityOrder[a.priority || 'medium'] ?? 0);
      case 'status':
        return (statusOrder[a.task_status || 'todo'] ?? 0) - (statusOrder[b.task_status || 'todo'] ?? 0);
      case 'progress':
        return (a.progress ?? 0) - (b.progress ?? 0);
      default:
        return 0;
    }
  }, []);

  const filteredTasks = useMemo(() => {
    let list = parentTasks.filter(task => {
      const matchesStatus = filter === 'all' || task.task_status === filter;
      const matchesArchived = showArchived || filter === 'archived' || task.task_status !== 'archived';
      const matchesSearch = taskMatchesSearch(task, searchTerm);
      return matchesStatus && matchesArchived && matchesSearch;
    });
    return [...list].sort((a, b) => sortTasksFn(a, b, sortBy));
  }, [parentTasks, filter, showArchived, searchTerm, sortBy, taskMatchesSearch, sortTasksFn]);

  // Compter les tâches archivées (pour le badge)
  const archivedCount = parentTasks.filter(t => t.task_status === 'archived').length;

  // Stats basées sur les tâches "atomiques" (tâches sans sous-tâches + toutes les sous-tâches)
  // Règle: Si une tâche parente a des sous-tâches, on ne compte que ses sous-tâches
  //        Si une tâche parente n'a pas de sous-tâches, on la compte
  const atomicTasks = useMemo(() => tasks.filter(task => {
    if (task.parent_task) return true;
    if (!task.subtasks || task.subtasks.length === 0) return true;
    return false;
  }), [tasks]);

  // Filtrer les tâches atomiques par statut, archivées et recherche (pour Kanban et Tableau)
  const filteredAtomicTasks = useMemo(() => {
    let list = atomicTasks.filter(task => {
      const matchesStatus = filter === 'all' || task.task_status === filter;
      const matchesArchived = showArchived || filter === 'archived' || task.task_status !== 'archived';
      const matchesSearch = taskMatchesSearch(task, searchTerm);
      return matchesStatus && matchesArchived && matchesSearch;
    });
    return [...list].sort((a, b) => sortTasksFn(a, b, sortBy));
  }, [atomicTasks, filter, showArchived, searchTerm, sortBy, taskMatchesSearch, sortTasksFn]);

  const taskStats = {
    total: atomicTasks.length,
    todo: atomicTasks.filter(t => t.task_status === 'todo').length,
    in_progress: atomicTasks.filter(t => t.task_status === 'in_progress').length,
    completed: atomicTasks.filter(t => t.task_status === 'completed').length,
  };

  const overallProgress = atomicTasks.length > 0
    ? Math.round(atomicTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / atomicTasks.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="!text-lg font-semibold !text-primary flex items-center gap-2">
            <IconProgress className="w-5 h-5 !text-primary" />
            {t('project_tasks')}
          </h3>
          <p className="!text-sm !text-muted mt-1">
            {taskStats.completed}/{taskStats.total} {t('tasks_completed')} • {overallProgress}% {t('progress')}
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {/* Bouton Import Excel / Google Sheets */}
            <button
              onClick={() => setShowExcelImport(true)}
              className="flex items-center gap-2 px-3 py-2 !bg-muted hover:!bg-accent-light !text-primary border border-default  transition-colors"
              title={t('import_spreadsheet') || 'Importer depuis Excel ou Google Sheets'}
            >
              <div className="flex items-center -space-x-1">
                <Image
                  src="/images/excel-icon.png"
                  alt="Excel"
                  width={18}
                  height={18}
                  className="object-contain"
                />
                <Image
                  src="/images/google-sheets-icon.png"
                  alt="Google Sheets"
                  width={18}
                  height={18}
                  className="object-contain"
                />
              </div>
              <span className="hidden sm:inline !text-primary !text-sm">{t('import') || 'Importer'}</span>
            </button>
            
            {/* Bouton IA */}
            <button
              onClick={() => setShowAIGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent hover:!text-white !text-accent-text  transition-colors"
              title={t('ai_assistant') || 'Assistant IA Eclipse'}
            >
              <Image 
                src="/images/logo/eclipse-logo.png" 
                alt="Eclipse Assistant" 
                width={16} 
                height={16}
                className="w-4 h-4"
              />
              <span className="hidden sm:inline">{t('ai_assistant') || 'Assistant IA Eclipse'}</span>
            </button>
            
            {/* Bouton Nouvelle tâche */}
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-hover !text-primary  transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              {t('add_task') || 'Nouvelle tâche'}
            </button>
          </div>
        )}
      </div>

      {/* Barre de progression globale */}
      {tasks.length > 0 && (
        <div className="bg-muted  p-4 border border-default">
          <div className="flex items-center justify-between mb-2">
            <span className="!text-sm !text-primary">{t('overall_progress') || 'Progression globale'}</span>
            <span className="!text-sm font-medium !text-muted">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-page rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
              className="h-2 bg-accent rounded-full"
            />
          </div>
        </div>
      )}

      {/* Recherche et tri */}
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 !text-muted pointer-events-none z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('search_tasks') || 'Rechercher une tâche...'}
              className="w-full !pl-9 !pr-3 py-2 !text-sm !text-primary bg-card border border-default focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <IconArrowsSort className="w-4 h-4 !text-muted shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="!text-sm !text-primary bg-card border border-default px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="title_asc">{t('sort_by_name')} ↑</option>
              <option value="title_desc">{t('sort_by_name')} ↓</option>
              <option value="start_date_asc">{t('sort_by_start_date') || 'Date début'} ↑</option>
              <option value="start_date_desc">{t('sort_by_start_date') || 'Date début'} ↓</option>
              <option value="due_date_asc">{t('sort_by_due_date') || 'Date fin'} ↑</option>
              <option value="due_date_desc">{t('sort_by_due_date') || 'Date fin'} ↓</option>
              <option value="priority_desc">{t('sort_by_priority')} ↓</option>
              <option value="priority_asc">{t('sort_by_priority')} ↑</option>
              <option value="status">{t('sort_by_status')}</option>
              <option value="progress">{t('sort_by_progress')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Filtres et sélecteur de vue */}
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filtres par statut */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5  !text-sm transition-colors ${
                filter === 'all'
                  ? 'bg-accent !text-white'
                  : 'bg-muted !text-primary hover:bg-hover'
              }`}
            >
              Toutes ({taskStats.total})
            </button>
            {TASK_STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1.5  !text-sm transition-colors flex items-center gap-1.5 ${
                  filter === option.value
                    ? getStatusStyle(option.value)
                    : 'bg-card !text-primary hover:bg-hover'
                }`}
              >
                {option.icon}
                {option.label} ({atomicTasks.filter(t => t.task_status === option.value).length})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle archivées */}
            {archivedCount > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-1.5 px-3 py-1.5  !text-sm transition-colors ${
                  showArchived
                    ? 'bg-warning-light !text-warning'
                    : 'bg-muted !text-primary hover:bg-hover'
                }`}
                title={showArchived 
                  ? (t('hide_archived_tasks') || 'Masquer les archivées') 
                  : (t('show_archived_tasks') || 'Voir les archivées')}
              >
                <IconArchive className="w-4 h-4" />
                <span className="hidden sm:inline">{archivedCount}</span>
              </button>
            )}

            {/* Mode sélection */}
            {canEdit && (
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) deselectAllTasks();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5  !text-sm transition-colors ${
                  isSelectionMode
                    ? 'bg-accent !text-white'
                    : 'bg-muted !text-primary hover:bg-hover'
                }`}
                title={isSelectionMode 
                  ? (t('deselect_all') || 'Désélectionner') 
                  : (t('select_all') || 'Sélectionner')}
              >
                {isSelectionMode ? <IconSquareCheck className="w-4 h-4" /> : <IconSquare className="w-4 h-4" />}
              </button>
            )}

            {/* Sélecteur de vue */}
            <div className="flex items-center gap-1 bg-muted p-1  border border-default">
              {VIEW_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setViewMode(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5  !text-sm transition-colors ${
                    viewMode === option.value
                      ? 'bg-accent !text-white'
                      : 'text-primary hover:!text-primary'
                  }`}
                  title={option.label}
                >
                  {option.icon}
                  <span className="hidden md:inline">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barre d'actions en mode sélection */}
      <AnimatePresence>
        {isSelectionMode && selectedTasks.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between gap-3 p-3 bg-accent-light border border-accent "
          >
            <div className="flex items-center gap-3">
              <span className="!text-sm font-medium !text-accent-text">
                {selectedTasks.size} {t('selected_tasks') || 'tâche(s) sélectionnée(s)'}
              </span>
              <button
                onClick={selectAllVisibleTasks}
                className="!text-sm !text-accent-text hover:underline flex items-center gap-1"
              >
                <IconSelectAll className="w-4 h-4" />
                {t('select_all') || 'Tout sélectionner'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Archiver / Restaurer */}
              {showArchived || filter === 'archived' ? (
                <button
                  onClick={handleBulkUnarchive}
                  className="flex items-center gap-1.5 px-3 py-1.5  !text-sm bg-success !text-white hover:bg-[var(--color-success)] transition-colors"
                >
                  <IconArchiveOff className="w-4 h-4" />
                  {t('unarchive_tasks') || 'Restaurer'}
                </button>
              ) : (
                <button
                  onClick={handleBulkArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5  !text-sm bg-warning !text-white hover:bg-[var(--color-warning)] transition-colors"
                >
                  <IconArchive className="w-4 h-4" />
                  {t('archive_tasks') || 'Archiver'}
                </button>
              )}
              {/* Dates communes */}
              <button
                onClick={() => setShowBulkDatesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5  !text-sm bg-accent !text-white hover:bg-[var(--color-accent)] transition-colors"
              >
                <IconCalendar className="w-4 h-4" />
                {t('common_dates') || 'Dates communes'}
              </button>
              {/* Supprimer */}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5  !text-sm bg-danger !text-white hover:bg-[var(--color-danger)] transition-colors"
              >
                <IconTrash className="w-4 h-4" />
                {t('delete_tasks') || 'Supprimer'}
              </button>
              {/* Annuler */}
              <button
                onClick={deselectAllTasks}
                className="flex items-center gap-1.5 px-3 py-1.5  !text-sm bg-muted !text-primary hover:bg-hover transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire nouvelle tâche / sous-tâche */}
      <AnimatePresence>
        {showNewTaskForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateTask}
            className={`bg-card border border-default  p-4 !space-y-4 ${parentTaskForSubtask ? 'ml-8' : ''}`}
            style={parentTaskForSubtask ? { 
              borderLeftWidth: '4px', 
              borderLeftColor: parentTaskForSubtask.color || TASK_COLORS[0],
              background: `linear-gradient(90deg, ${(parentTaskForSubtask.color || TASK_COLORS[0])}08 0%, transparent 100%)`
            } : undefined}
          >
            {/* Header avec info tâche parente pour les sous-tâches */}
            {parentTaskForSubtask && (
              <div 
                className="flex items-center gap-3 p-3  mb-2"
                style={{ backgroundColor: (parentTaskForSubtask.color || TASK_COLORS[0]) + '15' }}
              >
                <div 
                  className="w-8 h-8  flex items-center justify-center"
                  style={{ backgroundColor: parentTaskForSubtask.color || TASK_COLORS[0] }}
                >
                  <IconSubtask className="w-4 h-4 !text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="!text-xs !text-muted">{t('subtask_of') || 'Sous-tâche de'}</p>
                  <p className="!text-sm font-medium !text-primary truncate">{parentTaskForSubtask.title}</p>
                </div>
                <div className="flex items-center gap-2 !text-xs !text-muted">
                  {parentTaskForSubtask.assigned_to && (
                    <span className="flex items-center gap-1">
                      <UserAvatar user={parentTaskForSubtask.assigned_to} size="sm" />
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full border ${getStatusStyle(parentTaskForSubtask.task_status)}`}>
                    {TASK_STATUS_OPTIONS.find(s => s.value === parentTaskForSubtask.task_status)?.label || parentTaskForSubtask.task_status}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="!text-sm !text-primary font-medium flex items-center gap-2">
                  {parentTaskForSubtask && <IconSubtask className="w-4 h-4 !text-accent-text" />}
                  {parentTaskForSubtask 
                    ? `${t('new_subtask') || 'Nouvelle sous-tâche'}`
                    : (t('new_task') || 'Nouvelle tâche')
                  }
                </h4>
                {parentTaskForSubtask && (
                  <p className="!text-xs !text-muted mt-1">
                    {t('subtask_inherits_parent') || 'Hérite des paramètres de la tâche parente'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewTaskForm(false);
                  setParentTaskForSubtask(null);
                }}
                className="p-1 !text-primary hover:!text-primary"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <input
                type="text"
                placeholder={parentTaskForSubtask ? (t('subtask_title') || 'Titre de la sous-tâche *') : (t('task_title') || 'Titre de la tâche *')}
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="input w-full"
                required
              />

              <div>
                <label className="block !text-sm !text-primary mb-1">{t('description') || 'Description'}</label>
                <RichTextEditor
                  value={newTask.description}
                  onChange={(val) => setNewTask({ ...newTask, description: val })}
                  placeholder={t('task_description') || 'Description (optionnel)'}
                  minHeight="100px"
                  maxHeight="200px"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block !text-sm !text-primary mb-1">{t('status') || 'Statut'}</label>
                  <select
                    value={newTask.task_status}
                    onChange={(e) => setNewTask({ ...newTask, task_status: e.target.value as TaskStatus })}
                    className="input w-full"
                  >
                    {TASK_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block !text-sm !text-primary mb-1">{t('priority') || 'Priorité'}</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="input w-full"
                  >
                    {PRIORITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block !text-sm !text-primary mb-1">{t('assigned_to') || 'Assigner à'}</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">{t('not_assigned') || 'Non assigné'}</option>
                    {allMembers.map(member => (
                      <option key={member.documentId} value={member.documentId}>
                        {getUserDisplayName(member)} {member.isOwner ? '(Propriétaire)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sélecteur de couleur (uniquement pour les tâches principales) */}
              {!parentTaskForSubtask && (
                <div>
                  <label className="block !text-sm !text-primary mb-2 flex items-center gap-1">
                    <IconPalette className="w-4 h-4" />
                    {t('task_color') || 'Couleur du groupe'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TASK_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTask({ ...newTask, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          newTask.color === color ? 'ring-1 ring-offset-2 ring-offset-card scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color, ['--tw-ring-color' as string]: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block !text-sm !text-primary mb-1">{t('start_date') || 'Date de début'}</label>
                  <input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block !text-sm !text-primary mb-1">{t('due_date') || 'Échéance'}</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block !text-sm !text-primary mb-1">{t('estimated_hours') || 'Heures estimées'}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    placeholder="0"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="px-4 py-2 !text-primary hover:!text-primary transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={!newTask.title.trim()}
                className="px-4 py-2 bg-accent hover:bg-[var(--color-accent)] disabled:opacity-50 !text-white  transition-colors"
              >
                {t('create') || 'Créer'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Liste des tâches selon la vue */}
      {viewMode === 'cards' && useListRedesign ? (
        <TaskListRedesignView
          tasks={tasks}
          filteredTasks={filteredTasks}
          canEdit={canEdit}
          projectDocumentId={projectDocumentId}
          userId={userId}
          allMembers={allMembers}
          loadTasks={() => loadTasks(true)}
          onAllTasksCompleted={onAllTasksCompleted}
          t={t}
          isSelectionMode={isSelectionMode}
          selectedTasks={selectedTasks}
          onToggleSelection={toggleTaskSelection}
          onEditSubtask={setEditingTask}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="!text-center py-12 bg-muted  border border-default">
          <IconProgress className="w-12 h-12 !text-muted mx-auto mb-3" />
          <p className="!text-muted">
            {filter === 'all' 
              ? (t('no_tasks') || 'Aucune tâche pour ce projet')
              : (t('no_tasks_filter') || 'Aucune tâche avec ce statut')}
          </p>
          {canEdit && filter === 'all' && (
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="mt-4 px-4 py-2 bg-card hover:bg-hover !text-primary  transition-colors inline-flex items-center gap-2 border border-default"
            >
              <IconPlus className="w-4 h-4" />
              {t('add_first_task') || 'Ajouter une tâche'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vue Cartes (design classique) */}
          {viewMode === 'cards' && (
            <div className="space-y-2">
              {filteredTasks.map((task, index) => (
                <TaskCard
                  key={`${task.documentId}-${index}`}
                  task={task}
                  canEdit={canEdit}
                  isExpanded={expandedTasks.has(task.documentId)}
                  onToggleExpand={() => toggleExpanded(task.documentId)}
                  onStatusChange={(status, alsoUpdateSubtasks) => handleStatusChange(task.documentId, status, alsoUpdateSubtasks)}
                  onProgressChange={(progress) => handleProgressChange(task.documentId, progress)}
                  onClick={() => setEditingTask(task)}
                  onDelete={() => handleDeleteTask(task.documentId)}
                  onAddSubtask={() => {
                    setParentTaskForSubtask(task);
                    setShowNewTaskForm(true);
                  }}
                  onDuplicate={(includeSubtasks) => handleDuplicateTask(task, includeSubtasks)}
                  onEditSubtask={(subtask) => setEditingTask(subtask)}
                  onDuplicateSubtask={(subtask) => handleDuplicateTask(subtask, false)}
                  onDeleteSubtask={(subtask) => handleDeleteTask(subtask.documentId)}
                  onSubtaskStatusChange={(subtaskDocumentId, status) => handleStatusChange(subtaskDocumentId, status)}
                  getStatusStyle={getStatusStyle}
                  getPriorityStyle={getPriorityStyle}
                  taskStatusOptions={TASK_STATUS_OPTIONS}
                  localProgress={localProgress[task.documentId]}
                  t={t}
                  // Drag & drop pour convertir en sous-tâche
                  isDraggedOver={dropTargetTaskId === task.documentId}
                  onDragStart={() => setDraggedTaskId(task.documentId)}
                  onDragEnd={() => {
                    setDraggedTaskId(null);
                    setDropTargetTaskId(null);
                  }}
                  onDragOver={() => {
                    if (draggedTaskId && draggedTaskId !== task.documentId && !task.parent_task) {
                      setDropTargetTaskId(task.documentId);
                    }
                  }}
                  onDragLeave={() => setDropTargetTaskId(null)}
                  onDrop={() => {
                    if (draggedTaskId && draggedTaskId !== task.documentId && !task.parent_task) {
                      handleConvertToSubtask(draggedTaskId, task.documentId);
                    }
                    setDraggedTaskId(null);
                    setDropTargetTaskId(null);
                  }}
                  isDragging={draggedTaskId === task.documentId}
                  canBeDropTarget={!!draggedTaskId && draggedTaskId !== task.documentId && !task.parent_task}
                  // Sélection
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedTasks.has(task.documentId)}
                  onToggleSelection={() => toggleTaskSelection(task.documentId)}
                />
              ))}
            </div>
          )}

          {/* Vue Kanban */}
          {viewMode === 'kanban' && (
            <TaskKanbanView
              tasks={filteredTasks}
              canEdit={canEdit}
              onStatusChange={handleStatusChange}
              onEdit={setEditingTask}
              onDelete={handleDeleteTask}
              onAddTask={(status) => {
                setNewTask(prev => ({ ...prev, status }));
                setShowNewTaskForm(true);
              }}
              getStatusStyle={getStatusStyle}
              getPriorityStyle={getPriorityStyle}
              taskStatusOptions={TASK_STATUS_OPTIONS}
              t={t}
            />
          )}

          {/* Vue Tableau */}
          {viewMode === 'table' && (
            <TaskTableView
              tasks={filteredAtomicTasks}
              canEdit={canEdit}
              onStatusChange={handleStatusChange}
              onEdit={setEditingTask}
              onDelete={handleDeleteTask}
              getStatusStyle={getStatusStyle}
              getPriorityStyle={getPriorityStyle}
              taskStatusOptions={TASK_STATUS_OPTIONS}
              priorityOptions={PRIORITY_OPTIONS}
              t={t}
            />
          )}

          {/* Vue Gantt */}
          {viewMode === 'gantt' && (
            <TaskGanttView
              tasks={filteredTasks}
              onEdit={setEditingTask}
              onAddSubtask={(parentTask) => {
                setParentTaskForSubtask(parentTask);
                setShowNewTaskForm(true);
              }}
              onAddTask={() => {
                setParentTaskForSubtask(null);
                setShowNewTaskForm(true);
              }}
              taskStatusOptions={TASK_STATUS_OPTIONS}
              projectName={projectName}
              canEdit={canEdit}
              t={t}
              onTasksChange={() => loadTasks(true)}
              isSelectionMode={isSelectionMode}
              selectedTasks={selectedTasks}
              onToggleSelection={toggleTaskSelection}
            />
          )}
        </>
      )}

      {/* Modal dates communes (sélection multiple) */}
      <AnimatePresence>
        {showBulkDatesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowBulkDatesModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-default w-full max-w-md p-6 shadow-2xl"
            >
              <h3 className="!text-lg font-semibold !text-primary mb-4 flex items-center gap-2">
                <IconCalendar className="w-5 h-5" />
                {t('common_dates') || 'Dates communes'}
              </h3>
              <p className="!text-sm !text-muted mb-4">
                {selectedTasks.size} {t('selected_tasks') || 'tâche(s) sélectionnée(s)'} — {t('bulk_dates_desc') || 'Définir les mêmes dates pour toutes'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block !text-xs font-medium !text-muted mb-1">{t('start_date') || 'Date de début'}</label>
                  <input
                    type="date"
                    value={bulkDatesForm.start_date}
                    onChange={(e) => setBulkDatesForm(f => ({ ...f, start_date: e.target.value }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block !text-xs font-medium !text-muted mb-1">{t('due_date') || 'Date de fin'}</label>
                  <input
                    type="date"
                    value={bulkDatesForm.due_date}
                    onChange={(e) => setBulkDatesForm(f => ({ ...f, due_date: e.target.value }))}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6 justify-end">
                <button type="button" onClick={() => setShowBulkDatesModal(false)} className="px-4 py-2 !text-sm border border-default !text-primary hover:bg-muted transition-colors">
                  {t('cancel') || 'Annuler'}
                </button>
                <button type="button" onClick={handleBulkUpdateDates} className="px-4 py-2 !text-sm bg-accent !text-white hover:bg-[var(--color-accent)] transition-colors">
                  {t('apply') || 'Appliquer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal d'édition */}
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            flatTasksForLinks={flatTasksForLinks}
            onClose={() => setEditingTask(null)}
            onSave={(updates) => handleUpdateTask(editingTask.documentId, updates)}
            taskStatusOptions={TASK_STATUS_OPTIONS}
            priorityOptions={PRIORITY_OPTIONS}
            allMembers={allMembers}
            onAddSubtask={() => {
              setParentTaskForSubtask(editingTask);
              setEditingTask(null);
              setShowNewTaskForm(true);
            }}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Modal d'import Excel */}
      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImport={handleExcelImport}
        projectDocumentId={projectDocumentId}
        projectName={projectName}
        projectUrl={typeof window !== 'undefined' ? `${window.location.origin}/dashboard/projects/${projectDocumentId}` : ''}
        collaborators={allMembers}
      />

      {/* Modal IA de génération de tâches */}
      <AITaskGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        projectTitle={projectName}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        existingTasks={tasks}
        onTasksGenerated={handleAITasksGenerated}
      />
    </div>
  );
}

// Composant carte de tâche
interface TaskCardProps {
  task: ProjectTask;
  canEdit: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: TaskStatus, alsoUpdateSubtasks?: boolean) => void;
  onProgressChange: (progress: number) => void;
  onClick: () => void;
  onDelete: () => void;
  onAddSubtask: () => void;
  onDuplicate: (includeSubtasks?: boolean) => void;
  onEditSubtask: (subtask: ProjectTask) => void;
  onDuplicateSubtask: (subtask: ProjectTask) => void;
  onDeleteSubtask: (subtask: ProjectTask) => void;
  onSubtaskStatusChange: (subtaskDocumentId: string, status: TaskStatus) => void;
  getStatusStyle: (status: TaskStatus) => string;
  getPriorityStyle: (priority: TaskPriority) => string;
  taskStatusOptions: TaskStatusOption[];
  localProgress?: number;
  isSubtask?: boolean;
  parentColor?: string;
  t: (key: string) => string;
  // Drag & drop props
  isDraggedOver?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  isDragging?: boolean;
  canBeDropTarget?: boolean;
  // Sélection props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function TaskCard({
  task,
  canEdit,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onProgressChange,
  onClick,
  onDelete,
  onAddSubtask,
  onDuplicate,
  onEditSubtask,
  onDuplicateSubtask,
  onDeleteSubtask,
  onSubtaskStatusChange,
  getStatusStyle,
  getPriorityStyle,
  taskStatusOptions,
  localProgress,
  isSubtask = false,
  parentColor,
  t,
  // Drag & drop props
  isDraggedOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging = false,
  canBeDropTarget = false,
  // Sélection props
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed';
  const progressFromLinkedDrivers =
    task.progress_sync_mode === 'average_of_linked' && (task.progress_driver_tasks?.length ?? 0) > 0;
  const effectiveBase = getEffectiveTaskProgress(task);
  const displayProgress = localProgress !== undefined ? localProgress : effectiveBase;
  const taskColor = task.color || parentColor || TASK_COLORS[0];
  
  // Collecter tous les utilisateurs assignés (tâche + sous-tâches)
  const allAssignedUsers = useMemo(() => {
    const users: User[] = [];
    if (task.assigned_to) users.push(task.assigned_to);
    if (task.subtasks) {
      task.subtasks.forEach(sub => {
        if (sub.assigned_to && !users.find(u => u.id === sub.assigned_to?.id)) {
          users.push(sub.assigned_to);
        }
      });
    }
    return users;
  }, [task.assigned_to, task.subtasks]);
  
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(s => s.task_status === 'completed').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (isSubtask) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task.documentId);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeave?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.();
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        draggable={!isSubtask && canEdit}
        onDragStart={handleDragStart}
        onDragOver={canBeDropTarget ? handleDragOver : undefined}
        onDragLeave={canBeDropTarget ? handleDragLeave : undefined}
        onDrop={canBeDropTarget ? handleDrop : undefined}
        onDragEnd={handleDragEnd}
        className={`border  overflow-hidden transition-all cursor-pointer hover:border-accent ${
          isOverdue ? 'border-danger !bg-danger' : 'border-default bg-card'
        } ${isSubtask ? 'ml-8' : ''} ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${
          isDraggedOver ? 'ring-1 ring-accent ring-offset-2 ring-offset-card border-accent scale-[1.02]' : ''
        } ${
          canBeDropTarget && !isDraggedOver ? 'border-dashed border-accent' : ''
        }`}
        style={!isSubtask ? { borderLeftWidth: '4px', borderLeftColor: taskColor } : undefined}
        onClick={(e) => {
          // Ne pas ouvrir si on clique sur un bouton ou si on drag
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
          if (isDragging) return;
          onClick();
        }}
      >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox de sélection (en mode sélection) */}
          {isSelectionMode && !isSubtask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection?.();
              }}
              className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-accent border-accent !text-white'
                  : 'border-default hover:border-accent bg-card'
              }`}
            >
              {isSelected && <IconCheck className="w-4 h-4" />}
            </button>
          )}

          {/* Indicateur sous-tâche */}
          {isSubtask && (
            <div 
              className="w-1 h-full rounded-full flex-shrink-0"
              style={{ backgroundColor: parentColor || taskColor }}
            />
          )}
          
          {/* Checkbox statut */}
          {!isSelectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newStatus = task.task_status === 'completed' ? 'todo' : 'completed';
                // Si on complète une tâche parente avec des sous-tâches, les compléter aussi
                const shouldUpdateSubtasks = newStatus === 'completed' && hasSubtasks;
                onStatusChange(newStatus, shouldUpdateSubtasks);
              }}
              disabled={!canEdit}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.task_status === 'completed'
                  ? 'bg-accent border-accent !text-white'
                  : 'border-default hover:border-accent'
              } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {task.task_status === 'completed' && <IconCheck className="w-4 h-4" />}
            </button>
          )}

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`!text-sm font-medium ${
                task.task_status === 'completed' ? 'text-muted line-through' : 'text-primary'
              }`}>
                {task.title}
              </h4>
              
              {/* Badge priorité */}
              <IconFlag className={`w-4 h-4 ${getPriorityStyle(task.priority)}`} />
              
              {/* Badge statut */}
              <span className={`px-2 py-0.5 !text-xs rounded-full border ${getStatusStyle(task.task_status)}`}>
                {taskStatusOptions.find(o => o.value === task.task_status)?.label}
              </span>
              
              {/* Compteur sous-tâches */}
              {hasSubtasks && (
                <span className="flex items-center gap-1 !text-xs !text-muted bg-muted px-2 py-0.5 rounded-full">
                  <IconSubtask className="w-3.5 h-3.5" />
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}

              {/* Indicateur retard */}
              {isOverdue && (
                <span className="flex items-center gap-1 !text-xs !text-red-400">
                  <IconAlertCircle className="w-3.5 h-3.5" />
                  {t('overdue') || 'En retard'}
                </span>
              )}
            </div>

            {/* Barre de progression */}
            {task.task_status !== 'cancelled' && (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{ 
                      width: `${displayProgress}%`,
                      backgroundColor: displayProgress >= 100 ? taskColor : taskColor + '80'
                    }}
                  />
                </div>
                <span className="!text-xs !text-muted w-10">{displayProgress}%</span>
              </div>
            )}

            {/* Dates et infos */}
            <div className="mt-2 flex flex-wrap items-center gap-3 !text-xs !text-muted">
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                  <IconCalendar className="w-3.5 h-3.5" />
                  {new Date(task.due_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {task.estimated_hours && (
                <span className="flex items-center gap-1">
                  <IconClock className="w-3.5 h-3.5" />
                  {task.estimated_hours}h
                </span>
              )}
              
              {/* Avatars assignés */}
              {allAssignedUsers.length > 0 && (
                <AvatarStack users={allAssignedUsers} max={3} size="sm" />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {(task.description || hasSubtasks) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="p-1.5 !text-muted hover:!text-primary transition-colors"
              >
                {isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
              </button>
            )}
            {canEdit && !isSubtask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubtask();
                }}
                className="p-1.5 !text-muted hover:!text-accent-text transition-colors"
                title={t('add_subtask') || 'Ajouter une sous-tâche'}
              >
                <IconSubtask className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(!isSubtask && hasSubtasks);
                }}
                className="p-1.5 !text-muted hover:!text-accent-text transition-colors"
                title={hasSubtasks ? (t('duplicate_with_subtasks') || 'Dupliquer avec sous-tâches') : (t('duplicate') || 'Dupliquer')}
              >
                <IconCopy className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 !text-muted hover:!text-red-400 transition-colors"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Description et sous-tâches expandues */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              {task.description && (
                <div 
                  className="!text-primary leading-relaxed prose prose-sm max-w-none dark:prose-invert px-1 mb-3
                    [&_h1]:!text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:!text-primary
                    [&_h2]:!text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:!text-primary
                    [&_p]:mb-2 [&_p]:!text-primary
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
                    [&_li]:mb-1 [&_li]:!text-primary
                    [&_a]:!text-accent-text [&_a]:underline
                    [&_strong]:font-semibold [&_strong]:!text-primary
                    [&_em]:italic
                    [&_img]: [&_img]:max-w-full [&_img]:my-2"
                  dangerouslySetInnerHTML={{ __html: task.description || '' }}
                />
              )}
              
              {/* Liste des sous-tâches */}
              {hasSubtasks && (
                <div className="space-y-2 !pl-4 border-l-2" style={{ borderColor: taskColor + '40' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="!text-xs font-medium !text-muted">{t('subtasks') || 'Sous-tâches'} ({task.subtasks?.length})</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                      }}
                      className="!text-xs !text-muted hover:!text-primary transition-colors"
                    >
                      {t('collapse') || 'Réduire'}
                    </button>
                  </div>
                  {task.subtasks?.map(subtask => (
                    <div 
                      key={subtask.documentId}
                      className="group flex items-center gap-2 p-2  bg-muted hover:bg-hover transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSubtask(subtask); // Ouvre l'édition de la sous-tâche
                      }}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle le statut de la sous-tâche
                          const newStatus = subtask.task_status === 'completed' ? 'todo' : 'completed';
                          onSubtaskStatusChange(subtask.documentId, newStatus);
                        }}
                        disabled={!canEdit}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          subtask.task_status === 'completed'
                            ? 'bg-accent border-accent'
                            : 'border-default hover:border-accent'
                        } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                        style={subtask.task_status !== 'completed' ? { borderColor: taskColor } : undefined}
                      >
                        {subtask.task_status === 'completed' && (
                          <IconCheck className="w-3 h-3 !text-white" />
                        )}
                      </button>
                      <span className={`flex-1 !text-sm ${subtask.task_status === 'completed' ? 'line-through !text-muted' : 'text-primary'}`}>
                        {subtask.title}
                      </span>
                      <div className="flex items-center gap-1">
                        {subtask.priority === 'high' && (
                          <span className="!text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 !text-red-600 dark:!text-red-400">
                            {t('high') || 'Haute'}
                          </span>
                        )}
                        {subtask.assigned_to && (
                          <UserAvatar user={subtask.assigned_to} size="sm" />
                        )}
                        {/* Actions sur les sous-tâches */}
                        {canEdit && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateSubtask(subtask);
                              }}
                              className="p-1 !text-muted hover:!text-accent-text transition-colors"
                              title={t('duplicate') || 'Dupliquer'}
                            >
                              <IconCopy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSubtask(subtask);
                              }}
                              className="p-1 !text-muted hover:!text-accent-text transition-colors"
                              title={t('edit') || 'Modifier'}
                            >
                              <IconEdit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSubtask(subtask);
                              }}
                              className="p-1 !text-muted hover:!text-red-400 transition-colors"
                              title={t('delete') || 'Supprimer'}
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slider progression (si éditable) */}
      {canEdit &&
        task.task_status !== 'completed' &&
        task.task_status !== 'cancelled' &&
        !progressFromLinkedDrivers && (
        <div className="px-4 pb-3">
          <input
            type="range"
            min="0"
            max="100"
            value={displayProgress}
            onChange={(e) => onProgressChange(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-muted  appearance-none cursor-pointer slider-thumb"
          />
        </div>
      )}
      </div>
    </motion.div>
  );
}

// Modal d'édition de tâche
interface TaskEditModalProps {
  task: ProjectTask;
  flatTasksForLinks: ProjectTask[];
  onClose: () => void;
  onSave: (updates: ProjectTaskApiUpdate) => void;
  taskStatusOptions: TaskStatusOption[];
  priorityOptions: TaskPriorityOption[];
  allMembers: { id: number; documentId: string; username: string; email: string; isOwner: boolean }[];
  onAddSubtask: () => void;
  t: (key: string) => string;
}

function TaskEditModal({
  task,
  flatTasksForLinks,
  onClose,
  onSave,
  taskStatusOptions,
  priorityOptions,
  allMembers,
  onAddSubtask,
  t,
}: TaskEditModalProps) {
  const isSubtask = !!task.parent_task;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const modalRef = useModalFocus(true);

  const [progressSyncMode, setProgressSyncMode] = useState<'manual' | 'average_of_linked'>(
    task.progress_sync_mode ?? 'manual'
  );
  const [linkedDriverIds, setLinkedDriverIds] = useState<string[]>(() =>
    (task.progress_driver_tasks || []).map((d) => d.documentId).filter(Boolean) as string[]
  );

  useEffect(() => {
    setProgressSyncMode(task.progress_sync_mode ?? 'manual');
    setLinkedDriverIds((task.progress_driver_tasks || []).map((d) => d.documentId).filter(Boolean) as string[]);
  }, [task.documentId, task.progress_sync_mode, task.progress_driver_tasks]);

  const previewLinkedProgress = useMemo(() => {
    if (progressSyncMode !== 'average_of_linked' || linkedDriverIds.length === 0) return null;
    const sum = linkedDriverIds.reduce((s, id) => {
      const x = flatTasksForLinks.find((u) => u.documentId === id);
      return s + (x?.progress ?? 0);
    }, 0);
    return Math.round(sum / linkedDriverIds.length);
  }, [progressSyncMode, linkedDriverIds, flatTasksForLinks]);

  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    task_status: task.task_status,
    priority: task.priority,
    progress: task.progress,
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    start_date: task.start_date ? task.start_date.split('T')[0] : '',
    estimated_hours: task.estimated_hours?.toString() || '',
    actual_hours: task.actual_hours?.toString() || '',
    color: task.color || TASK_COLORS[0],
    assigned_to: task.assigned_to?.id?.toString() || '',
  });

  // Synchroniser automatiquement le statut et la progression
  useEffect(() => {
    // Si le statut passe à "completed", mettre la progression à 100%
    if (formData.task_status === 'completed' && formData.progress < 100) {
      setFormData(prev => ({ ...prev, progress: 100 }));
    }
    // Si la progression atteint 100%, passer le statut à "completed"
    else if (formData.progress === 100 && formData.task_status !== 'completed' && formData.task_status !== 'cancelled') {
      setFormData(prev => ({ ...prev, task_status: 'completed' }));
    }
    // Si le statut passe de "completed" à autre chose, et que la progression est à 100%, la réduire à 90%
    else if (formData.task_status !== 'completed' && formData.task_status !== 'cancelled' && formData.progress === 100) {
      setFormData(prev => ({ ...prev, progress: 90 }));
    }
    // Si la progression descend en dessous de 100% et que le statut est "completed", changer en "in_progress"
    else if (formData.progress < 100 && formData.task_status === 'completed') {
      setFormData(prev => ({ ...prev, task_status: 'in_progress' }));
    }
  }, [formData.task_status, formData.progress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mode: 'manual' | 'average_of_linked' = hasSubtasks ? 'manual' : progressSyncMode;
    const drivers = !hasSubtasks && mode === 'average_of_linked' ? linkedDriverIds : [];
    const progressValue =
      !hasSubtasks && mode === 'average_of_linked' && drivers.length > 0 && previewLinkedProgress != null
        ? previewLinkedProgress
        : formData.progress;
    onSave({
      title: formData.title,
      description: formData.description,
      task_status: formData.task_status,
      priority: formData.priority,
      progress: progressValue,
      due_date: formData.due_date || null,
      start_date: formData.start_date || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : null,
      color: formData.color,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null,
      progress_sync_mode: mode,
      progress_driver_tasks: mode === 'average_of_linked' ? drivers : [],
    } as ProjectTaskApiUpdate);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden overscroll-contain"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-default  w-full max-w-5xl shadow-2xl overflow-hidden outline-none overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div 
            className="flex items-center justify-between p-6 border-b border-default"
            style={!isSubtask ? { borderLeftWidth: '4px', borderLeftColor: formData.color } : undefined}
          >
            <div>
              <h2 className="!text-xl font-semibold !text-primary">
                {isSubtask ? (t('edit_subtask') || 'Modifier la sous-tâche') : (t('edit_task') || 'Modifier la tâche')}
              </h2>
              {isSubtask && task.parent_task && (
                <p className="!text-sm !text-muted flex items-center gap-1 mt-1">
                  <IconSubtask className="w-4 h-4" />
                  {t('subtask_of') || 'Sous-tâche de'} <strong>{task.parent_task.title}</strong>
                </p>
              )}
              {task.assigned_to && (
                <div className="flex items-center gap-2 mt-2">
                  <UserAvatar user={task.assigned_to} size="sm" />
                  <span className="!text-sm !text-primary">
                    {t('assigned_to') || 'Assigné à'}: {getUserDisplayName(task.assigned_to)}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2  hover:bg-hover !text-primary hover:!text-primary transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 !space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block !text-sm font-medium !text-primary mb-1">
                {t('title') || 'Titre'} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block !text-sm font-medium !text-primary mb-1">
                {t('description') || 'Description'}
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(val) => setFormData({ ...formData, description: val })}
                placeholder={t('task_description') || 'Description (optionnel)'}
                minHeight="100px"
                maxHeight="200px"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block !text-sm font-medium !text-primary mb-1">
                  {t('status') || 'Statut'}
                </label>
                <select
                  value={formData.task_status}
                  onChange={(e) => setFormData({ ...formData, task_status: e.target.value as TaskStatus })}
                  className="input w-full"
                >
                  {taskStatusOptions.map(option => (    
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block !text-sm font-medium !text-primary mb-1">
                  {t('priority') || 'Priorité'}
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="input w-full"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block !text-sm font-medium !text-primary mb-1">
                {progressSyncMode === 'average_of_linked' && linkedDriverIds.length > 0
                  ? `${t('progress') || 'Progression'} (${t('task_progress_computed') || 'calculée'}): ${previewLinkedProgress ?? formData.progress}%`
                  : `${t('progress') || 'Progression'}: ${formData.progress}%`}
              </label>
              {!(progressSyncMode === 'average_of_linked' && linkedDriverIds.length > 0) ? (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              ) : (
                <p className="!text-sm !text-muted py-1">
                  {t('task_progress_link_preview') || 'Moyenne des tâches liées'} : {previewLinkedProgress}%
                </p>
              )}
            </div>

            {!isSubtask && !hasSubtasks && (
              <div className="space-y-2 p-3 bg-muted rounded border border-default">
                <label className="block !text-sm font-medium !text-primary">
                  {t('task_progress_link_mode') || 'Progression liée à d’autres tâches'}
                </label>
                <p className="!text-xs !text-muted">{t('task_progress_link_mode_hint') || ''}</p>
                <select
                  value={progressSyncMode}
                  onChange={(e) => setProgressSyncMode(e.target.value as 'manual' | 'average_of_linked')}
                  className="input w-full"
                >
                  <option value="manual">{t('task_progress_manual') || 'Manuelle'}</option>
                  <option value="average_of_linked">{t('task_progress_average_of_linked') || 'Moyenne des tâches liées'}</option>
                </select>
                {progressSyncMode === 'average_of_linked' && (
                  <div className="space-y-2 max-h-44 overflow-y-auto border border-default rounded p-2 bg-card">
                    <span className="!text-xs font-medium !text-muted block">
                      {t('task_progress_linked_tasks') || 'Tâches sources'}
                    </span>
                    {flatTasksForLinks
                      .filter((c) => c.documentId !== task.documentId)
                      .map((c) => {
                        const cycle = wouldProgressLinkCreateCycle(task, c, flatTasksForLinks);
                        const checked = linkedDriverIds.includes(c.documentId);
                        return (
                          <label
                            key={c.documentId}
                            className={`flex items-center gap-2 !text-sm ${cycle ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={cycle}
                              onChange={() => {
                                if (cycle) return;
                                setLinkedDriverIds((prev) =>
                                  checked ? prev.filter((id) => id !== c.documentId) : [...prev, c.documentId]
                                );
                              }}
                            />
                            <span className="truncate flex-1">{c.title}</span>
                            <span className="!text-muted shrink-0">{c.progress ?? 0}%</span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block !text-sm font-medium !text-primary mb-1">
                  {t('start_date') || 'Date de début'}
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block !text-sm font-medium !text-primary mb-1">
                  {t('due_date') || 'Échéance'}
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block !text-sm font-medium !text-primary mb-1">
                  {t('estimated_hours') || 'Heures estimées'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block !text-sm font-medium !text-primary mb-1">
                  {t('actual_hours') || 'Heures réelles'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Assignation */}
            <div>
              <label className="block !text-sm font-medium !text-primary mb-1">
                {t('assigned_to') || 'Assigner à'}
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input w-full"
              >
                <option value="">{t('not_assigned') || 'Non assigné'}</option>
                {allMembers.map(member => (
                  <option key={member.documentId} value={member.id}>
                    {getUserDisplayName(member)} {member.isOwner ? `(${t('owner') || 'Propriétaire'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélecteur de couleur (uniquement pour les tâches principales) */}
            {!isSubtask && (
              <div>
                <label className="block !text-sm font-medium !text-primary mb-2 flex items-center gap-1">
                  <IconPalette className="w-4 h-4" />
                  {t('task_color') || 'Couleur du groupe'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {TASK_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color ? 'ring-1 ring-offset-2 ring-offset-card scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color, ['--tw-ring-color' as string]: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sous-tâches */}
            {!isSubtask && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="!text-sm font-medium !text-primary flex items-center gap-1">
                    <IconSubtask className="w-4 h-4" />
                    {t('subtasks') || 'Sous-tâches'}
                    {hasSubtasks && <span className="!text-muted">({task.subtasks?.length})</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddSubtask();
                    }}
                    className="!text-xs px-2 py-1  border-accent-light !text-accent-text hover:bg-accent-light hover:border-accent transition-colors flex items-center gap-1"
                  >
                    <IconPlus className="w-3 h-3" />
                    {t('add_subtask') || 'Ajouter'}
                  </button>
                </div>
                
                {hasSubtasks ? (
                  <div className="space-y-2 p-3  bg-muted border border-default">
                    {task.subtasks?.map(subtask => (
                      <div 
                        key={subtask.documentId}
                        className="flex items-center gap-2 p-2  bg-card"
                      >
                        <div 
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            subtask.task_status === 'completed' ? 'bg-accent border-accent' : 'border-muted'
                          }`}
                        >
                          {subtask.task_status === 'completed' && (
                            <IconCheck className="w-3 h-3 !text-white" />
                          )}
                        </div>
                        <span className={`flex-1 !text-sm ${subtask.task_status === 'completed' ? 'line-through !text-muted' : 'text-primary'}`}>
                          {subtask.title}
                        </span>
                        {subtask.assigned_to && (
                          <UserAvatar user={subtask.assigned_to} size="sm" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          subtask.task_status === 'completed' ? 'bg-green-500/20 !text-green-400' :
                          subtask.task_status === 'in_progress' ? 'bg-blue-500/20 !text-blue-400' :
                          'bg-zinc-500/20 !text-zinc-400'
                        }`}>
                          {subtask.progress}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="!text-center py-4 !text-muted !text-sm  bg-muted border border-default">
                    {t('no_subtasks') || 'Aucune sous-tâche'}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 !text-primary hover:!text-primary transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:bg-[var(--color-accent)] !text-white  transition-colors"
            >
              {t('save') || 'Enregistrer'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// VUE KANBAN
// ============================================================================

interface TaskKanbanViewProps {
  tasks: ProjectTask[];
  canEdit: boolean;
  onStatusChange: (documentId: string, status: TaskStatus, alsoUpdateSubtasks?: boolean) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (documentId: string) => void;
  onAddTask: (status: TaskStatus) => void;
  getStatusStyle: (status: TaskStatus) => string;
  getPriorityStyle: (priority: TaskPriority) => string;
  taskStatusOptions: TaskStatusOption[];
  t: (key: string) => string;
}

// Configuration des colonnes Kanban pour les tâches
/* Colonnes Kanban - couleurs alignées avec badge-task-* */
const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }[] = [
  { id: 'todo', title: 'todo', color: '!text-blue-600 dark:!text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', borderColor: 'border-blue-500', icon: <IconClock className="w-4 h-4" /> },
  { id: 'in_progress', title: 'in_progress', color: '!text-amber-700 dark:!text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', borderColor: 'border-amber-500', icon: <IconProgress className="w-4 h-4" /> },
  { id: 'completed', title: 'completed', color: '!text-emerald-700 dark:!text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', borderColor: 'border-emerald-500', icon: <IconCheck className="w-4 h-4" /> },
  { id: 'cancelled', title: 'cancelled', color: '!text-red-600 dark:!text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', borderColor: 'border-red-500', icon: <IconX className="w-4 h-4" /> },
  { id: 'archived', title: 'archived', color: '!text-slate-600 dark:!text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-900/30', borderColor: 'border-slate-500', icon: <IconArchive className="w-4 h-4" /> },
];

// Carte de tâche pour le Kanban
function KanbanTaskCard({
  task,
  onClick,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
  getPriorityStyle,
  t,
}: {
  task: ProjectTask;
  onClick: () => void;
  onDelete?: () => void;
  isDragging: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  getPriorityStyle: (priority: TaskPriority) => string;
  t: (key: string) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const priorityLabels: Record<TaskPriority, string> = {
    low: t('low') || 'Basse',
    medium: t('medium') || 'Moyenne',
    high: t('high') || 'Haute',
    urgent: t('urgent') || 'Urgente',
  };

  // Calculer la progression des sous-tâches
  const subtasksProgress = task.subtasks && task.subtasks.length > 0
    ? {
        total: task.subtasks.length,
        completed: task.subtasks.filter(st => st.task_status === 'completed').length,
      }
    : null;

  return (
    <div
      className={`
        group relative bg-card border border-muted  p-3 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-accent
        ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-xl' : ''}
      `}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.documentId);
        e.dataTransfer.setData('currentStatus', task.task_status);
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
    >
      {/* Header avec titre et menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconGripVertical size={14} className="!text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <h4 className="font-medium !text-sm !text-foreground line-clamp-2">{task.title}</h4>
        </div>
        
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <IconDots size={14} className="!text-muted-foreground" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-muted  shadow-xl py-1 min-w-[140px]">
                <button
                  onClick={(e) => { e.stopPropagation(); onClick(); setShowMenu(false); }}
                  className="w-full px-3 py-2 !text-left !text-sm hover:bg-hover flex items-center gap-2"
                >
                  <IconEdit size={14} /> {t('edit') || 'Modifier'}
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                    className="w-full px-3 py-2 !text-left !text-sm hover:bg-hover !text-red-500 flex items-center gap-2"
                  >
                    <IconTrash size={14} /> {t('delete') || 'Supprimer'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description (truncated) */}
      {task.description && (
        <div 
          className="!text-xs !text-muted-foreground mb-2 line-clamp-2 [&_*]:inline"
          dangerouslySetInnerHTML={{ __html: task.description }}
        />
      )}

      {/* Progression bar */}
      {(task.progress !== undefined && task.progress > 0) && (
        <div className="mb-2">
          <div className="flex items-center justify-between !text-xs !text-muted-foreground mb-1">
            <span>{t('progress') || 'Progression'}</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Sous-tâches */}
      {subtasksProgress && (
        <div className="flex items-center gap-2 mb-2 !text-xs">
          <IconSubtask size={12} className="!text-muted-foreground" />
          <span className={subtasksProgress.completed === subtasksProgress.total ? 'text-emerald-400' : 'text-muted-foreground'}>
            {subtasksProgress.completed}/{subtasksProgress.total}
          </span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(subtasksProgress.completed / subtasksProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer avec date, heures, priorité */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-muted">
        <div className="flex items-center gap-2 !text-xs !text-muted-foreground">
          {task.due_date && (
            <span className={`flex items-center gap-0.5 ${new Date(task.due_date) < new Date() && task.task_status !== 'completed' ? 'text-red-400' : ''}`}>
              <IconCalendar size={12} />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.estimated_hours && (
            <span className="flex items-center gap-0.5">
              <IconClock size={12} />
              {task.estimated_hours}h
            </span>
          )}
        </div>
        
        <span className={`px-1.5 py-0.5 rounded !text-[10px] font-medium ${getPriorityStyle(task.priority)}`}>
          {priorityLabels[task.priority]}
        </span>
      </div>
    </div>
  );
}

// Colonne Kanban
function KanbanColumn({
  column,
  tasks,
  onStatusChange,
  onTaskClick,
  onDeleteTask,
  onAddTask,
  getPriorityStyle,
  draggingTaskId,
  onCardDragStart,
  onCardDragEnd,
  t,
}: {
  column: typeof KANBAN_COLUMNS[0];
  tasks: ProjectTask[];
  onStatusChange: (documentId: string, status: TaskStatus, alsoUpdateSubtasks?: boolean) => void;
  onTaskClick: (task: ProjectTask) => void;
  onDeleteTask?: (documentId: string) => void;
  onAddTask?: () => void;
  getPriorityStyle: (priority: TaskPriority) => string;
  draggingTaskId?: string | null;
  onCardDragStart?: (taskId: string) => void;
  onCardDragEnd?: () => void;
  t: (key: string) => string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    
    if (taskId && currentStatus !== column.id) {
      // Si on marque comme "completed", proposer de valider les sous-tâches
      const shouldUpdateSubtasks = column.id === 'completed';
      onStatusChange(taskId, column.id, shouldUpdateSubtasks);
    }
    
    onCardDragEnd?.();
  }, [column.id, onStatusChange, onCardDragEnd]);

  return (
    <div 
      className={`
        flex flex-col min-w-[280px] max-w-[320px]  border-2 transition-all duration-200
        ${isDragOver ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-transparent'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={`kanban-header p-3 rounded-t-lg ${column.bgColor} border-b ${column.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={column.color}>{column.icon}</span>
            <h3 className={`font-semibold !text-sm ${column.color}`}>
              {t(column.title) || column.title}
            </h3>
            <span className={`px-2 py-0.5 rounded-full !text-xs font-medium ${column.bgColor} ${column.color} border ${column.borderColor}`}>
              {tasks.length}
            </span>
          </div>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className={`p-1 rounded hover:bg-white/10 transition-colors ${column.color}`}
              title={t('add_task') || 'Ajouter une tâche'}
            >
              <IconPlus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 !space-y-2 overflow-y-auto min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div
              key={task.documentId}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <KanbanTaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                onDelete={onDeleteTask ? () => onDeleteTask(task.documentId) : undefined}
                isDragging={draggingTaskId === task.documentId}
                onDragStart={() => onCardDragStart?.(task.documentId)}
                onDragEnd={onCardDragEnd}
                getPriorityStyle={getPriorityStyle}
                t={t}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tasks.length === 0 && (
          <div className="h-full min-h-[100px] flex items-center justify-center">
            <p className="!text-xs !text-muted-foreground !text-center">
              {t('kanban_empty_column') || 'Glissez une tâche ici'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant TaskKanbanView principal
function TaskKanbanView({
  tasks,
  canEdit,
  onStatusChange,
  onEdit,
  onDelete,
  onAddTask,
  getStatusStyle: _getStatusStyle,
  getPriorityStyle,
  taskStatusOptions: _taskStatusOptions,
  t,
}: TaskKanbanViewProps) {
  void _getStatusStyle; // Utilisé pour éviter l'erreur de lint
  void _taskStatusOptions;
  
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);

  // Grouper les tâches par statut (seulement les tâches parentes, pas les sous-tâches)
  const parentTasks = tasks.filter(t => !t.parent_task);
  
  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = parentTasks.filter(task => task.task_status === column.id);
    return acc;
  }, {} as Record<TaskStatus, ProjectTask[]>);

  // Stats
  const totalTasks = parentTasks.length;
  const completedTasks = tasksByStatus['completed']?.length || 0;
  const inProgressTasks = tasksByStatus['in_progress']?.length || 0;

  // Handlers pour le drag global
  const handleCardDragStart = useCallback((taskId: string) => {
    setDraggingTaskId(taskId);
    setIsDragging(true);
  }, []);

  const handleCardDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setIsDragging(false);
    setIsOverDeleteZone(false);
  }, []);

  // Delete zone handlers
  const handleDeleteZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOverDeleteZone(true);
  }, []);

  const handleDeleteZoneDragLeave = useCallback(() => {
    setIsOverDeleteZone(false);
  }, []);

  const handleDeleteZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOverDeleteZone(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDelete) {
      onDelete(taskId);
    }
    handleCardDragEnd();
  }, [onDelete, handleCardDragEnd]);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 p-4 bg-card  border border-muted">
        <div className="flex items-center gap-2">
          <span className="!text-sm !text-muted-foreground">{t('total_tasks') || 'Total tâches'}:</span>
          <span className="font-semibold !text-foreground">{totalTasks}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="!text-sm !text-muted-foreground">{t('in_progress') || 'En cours'}:</span>
          <span className="font-semibold !text-blue-400">{inProgressTasks}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="!text-sm !text-muted-foreground">{t('completed') || 'Terminées'}:</span>
          <span className="font-semibold !text-emerald-400">{completedTasks}</span>
        </div>
        {totalTasks > 0 && (
          <div className="flex items-center gap-2">
            <span className="!text-sm !text-muted-foreground">{t('completion') || 'Complétion'}:</span>
            <span className="font-semibold !text-accent-text">{Math.round((completedTasks / totalTasks) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            onStatusChange={onStatusChange}
            onTaskClick={onEdit}
            onDeleteTask={canEdit ? onDelete : undefined}
            onAddTask={canEdit ? () => onAddTask(column.id) : undefined}
            getPriorityStyle={getPriorityStyle}
            draggingTaskId={draggingTaskId}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            t={t}
          />
        ))}
      </div>

      {/* Delete zone at bottom - appears when dragging */}
      <AnimatePresence>
        {isDragging && canEdit && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center"
          >
            <motion.div
              onDragOver={handleDeleteZoneDragOver}
              onDragLeave={handleDeleteZoneDragLeave}
              onDrop={handleDeleteZoneDrop}
              className={`
                flex items-center gap-3 px-6 py-4  border-2 border-dashed transition-all duration-200
                ${isOverDeleteZone 
                  ? 'bg-red-500/20 border-red-500 scale-105 shadow-lg' 
                  : 'bg-card border-red-500/50 backdrop-blur-sm shadow-md'
                }
              `}
            >
              <IconTrash 
                size={24} 
                className={`transition-colors ${isOverDeleteZone ? 'text-red-500' : 'text-red-400'}`} 
              />
              <span className={`font-medium ${isOverDeleteZone ? 'text-red-500' : 'text-red-400'}`}>
                {t('delete') || 'Supprimer'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// VUE TABLEAU
// ============================================================================

interface TaskTableViewProps {
  tasks: ProjectTask[];
  canEdit: boolean;
  onStatusChange: (documentId: string, status: TaskStatus) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (documentId: string) => void;
  getStatusStyle: (status: TaskStatus) => string;
  getPriorityStyle: (priority: TaskPriority) => string;
  taskStatusOptions: TaskStatusOption[];
  priorityOptions: TaskPriorityOption[];
  t: (key: string) => string;
}

function TaskTableView({
  tasks,
  canEdit,
  onStatusChange,
  onEdit,
  onDelete,
  getStatusStyle,
  getPriorityStyle,
  taskStatusOptions,
  priorityOptions,
  t: _t,
}: TaskTableViewProps) {
  void _t; // Utilisé pour éviter l'erreur de lint
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="overflow-x-auto bg-card  border border-default">
      <table className="w-full">
        <thead>
          <tr className="border-b border-default">
            <th className="!text-left py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Tâche</th>
            <th className="!text-left py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Statut</th>
            <th className="!text-left py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Priorité</th>
            <th className="!text-left py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Progression</th>
            <th className="!text-left py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Échéance</th>
            <th className="!text-left py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Heures</th>
            {canEdit && <th className="!text-right py-3 px-4 !text-xs font-medium !text-muted uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr 
              key={`${task.documentId}-${index}`}
              className="hover:bg-hover transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="!text-primary font-medium">{task.title}</p>
                  {task.description && (
                    <div 
                      className="!text-xs !text-muted mt-0.5 line-clamp-1 [&_*]:inline"
                      dangerouslySetInnerHTML={{ __html: task.description }}
                    />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                {canEdit ? (
                  <select
                    value={task.task_status}
                    onChange={(e) => onStatusChange(task.documentId, e.target.value as TaskStatus)}
                    className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${getStatusStyle(task.task_status)}`}
                  >
                    {taskStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(task.task_status)}`}>
                    {taskStatusOptions.find(o => o.value === task.task_status)?.label}
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityStyle(task.priority)}`}>
                  {priorityOptions.find(o => o.value === task.priority)?.label}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                  <span className="!text-xs !text-primary">{task.progress || 0}%</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`text-sm ${
                  task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed'
                    ? 'text-red-400'
                    : 'text-primary'
                }`}>
                  {formatDate(task.due_date)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="!text-sm !text-primary">
                  {task.actual_hours || 0}/{task.estimated_hours || 0}h
                </span>
              </td>
              {canEdit && (
                <td className="py-3 px-4 !text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(task)}
                      className="p-1.5 !text-primary hover:!text-primary hover:bg-hover rounded transition-colors"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(task.documentId)}
                      className="p-1.5 !text-primary hover:!text-red-400 hover:bg-hover rounded transition-colors"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// VUE GANTT
// ============================================================================

interface TaskGanttViewProps {
  tasks: ProjectTask[];
  onEdit: (task: ProjectTask) => void;
  onAddSubtask: (parentTask: ProjectTask) => void;
  onAddTask?: () => void; // Nouvelle tâche (niveau racine)
  taskStatusOptions: TaskStatusOption[];
  projectName?: string;
  canEdit?: boolean;
  t: (key: string) => string;
  onTasksChange?: () => void; // Callback pour recharger les tâches après modification
  isSelectionMode?: boolean;
  selectedTasks?: Set<string>;
  onToggleSelection?: (taskId: string) => void;
}

// ROW_H = 40 (réservé pour layout)
const LEFT_W = 280;
const COL_W_MIN = 16;
const COL_W_MAX = 64;
const COL_W_DEFAULT = 32;

function TaskGanttView({
  tasks,
  onEdit,
  onAddSubtask,
  onAddTask,
  taskStatusOptions,
  projectName,
  canEdit = true,
  t,
  onTasksChange,
  isSelectionMode = false,
  selectedTasks = new Set(),
  onToggleSelection,
}: TaskGanttViewProps) {
  const { showGlobalPopup } = usePopup();
  const timelineRef = useRef<HTMLDivElement>(null);
  const lastDraggedTaskIdRef = useRef<string | null>(null);
  const [colWidth, setColWidth] = useState(COL_W_DEFAULT);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; task: ProjectTask; color: string; effectiveProgress: number; startDate: string; endDate: string; dur: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'light' | 'dark'>('light');
  const [exportFileName, setExportFileName] = useState(`gantt-${projectName || 'project'}-${new Date().toISOString().split('T')[0]}`);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Gérer le scroll lock pour la modale d'export
  useEffect(() => {
    if (showExportModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showExportModal]);

  // Fonction utilitaire pour normaliser une date à minuit (début de journée)
  const normalizeDate = useCallback((date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);

  // Parser une chaîne YYYY-MM-DD en date locale (évite décalage timezone avec new Date(str))
  const parseLocalDate = useCallback((dateStr: string | null | undefined): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }, []);

  // Toggle groupe pliable
  const toggleGroup = useCallback((groupColor: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupColor)) {
        next.delete(groupColor);
      } else {
        next.add(groupColor);
      }
      return next;
    });
  }, []);

  // Calculer la plage de dates - normaliser aujourd'hui à minuit
  const today = useMemo(() => normalizeDate(new Date()), [normalizeDate]);

  const zoom = useCallback((delta: number) => {
    setColWidth((w) => Math.max(COL_W_MIN, Math.min(COL_W_MAX, w + delta)));
  }, []);

  const tasksWithDates = useMemo(() => tasks.filter(task =>
    task.start_date || task.due_date || task.subtasks?.some(s => s.start_date || s.due_date)
  ), [tasks]);

  // Calculer toutes les données du Gantt avec useMemo
  const ganttData = useMemo(() => {
    if (tasksWithDates.length === 0) {
      return null;
    }

    // Trouver les dates min et max - inclure tâches parentes et sous-tâches, parser en local
    const allDates = tasksWithDates.flatMap(task => {
      const parentDates = [
        parseLocalDate(task.start_date),
        parseLocalDate(task.due_date),
      ].filter((d): d is Date => d !== null);
      const subtaskDates = (task.subtasks || []).flatMap(s => [
        parseLocalDate(s.start_date),
        parseLocalDate(s.due_date),
      ]).filter((d): d is Date => d !== null);
      return [...parentDates, ...subtaskDates].map(d => normalizeDate(d));
    }).filter((d): d is Date => d !== null);

    const minDateRaw = new Date(Math.min(...allDates.map(d => d.getTime()), today.getTime()));
    const maxDateRaw = new Date(Math.max(...allDates.map(d => d.getTime()), today.getTime()));
    
    // Ajouter quelques jours de marge et normaliser
    const minDate = normalizeDate(new Date(minDateRaw));
    minDate.setDate(minDate.getDate() - 3);
    const maxDate = normalizeDate(new Date(maxDateRaw));
    maxDate.setDate(maxDate.getDate() + 14);

    // Calculer le nombre total de jours (utiliser des jours entiers)
    const totalDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Générer les en-têtes de colonnes (jours) - chaque jour normalisé
    const dayHeaders: Date[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      dayHeaders.push(normalizeDate(date));
    }

    // Grouper par semaines pour l'affichage
    const weeks: { start: Date; days: Date[] }[] = [];
    let currentWeek: Date[] = [];
    let weekStart = dayHeaders[0];

    dayHeaders.forEach((date, i) => {
      if (date.getDay() === 1 && currentWeek.length > 0) {
        weeks.push({ start: weekStart, days: currentWeek });
        currentWeek = [];
        weekStart = date;
      }
      currentWeek.push(date);
      if (i === dayHeaders.length - 1) {
        weeks.push({ start: weekStart, days: currentWeek });
      }
    });

    // Grouper par mois pour l'affichage
    const months: { month: number; year: number; label: string; days: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    dayHeaders.forEach((date) => {
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        months.push({
          month,
          year,
          label: `${monthNames[month]} ${year}`,
          days: 1,
        });
        currentMonth = month;
        currentYear = year;
      } else {
        months[months.length - 1].days++;
      }
    });

    // Trouver l'index du jour d'aujourd'hui dans dayHeaders
    const todayIndex = dayHeaders.findIndex(d => d.getTime() === today.getTime());

    return { minDate, maxDate, totalDays, dayHeaders, weeks, months, todayIndex };
  }, [tasksWithDates, today, normalizeDate, parseLocalDate]);

  // Calculer la position d'une tâche (en nombre de jours depuis minDate)
  // Pour les tâches parentes : priorité aux dates propres (start_date, due_date) si définies, sinon enveloppe des sous-tâches
  const getTaskPosition = useCallback((task: ProjectTask, useSubtasksDates: boolean = true) => {
    if (!ganttData) return { startOffset: 0, duration: 1 };
    const { minDate } = ganttData;
    
    let effectiveStartDate = task.start_date;
    let effectiveEndDate = task.due_date;
    
    if (useSubtasksDates && task.subtasks && task.subtasks.length > 0) {
      const allStartDates = [task.start_date, ...task.subtasks.map(s => s.start_date)]
        .filter((d): d is string => !!d)
        .map(d => parseLocalDate(d))
        .filter((d): d is Date => d !== null);
      const allEndDates = [task.due_date, ...task.subtasks.map(s => s.due_date)]
        .filter((d): d is string => !!d)
        .map(d => parseLocalDate(d))
        .filter((d): d is Date => d !== null);
      // Priorité aux dates propres de la tâche parente si définies, sinon enveloppe min/max
      if (allStartDates.length > 0) {
        effectiveStartDate = task.start_date
          ? task.start_date
          : (() => {
              const minD = new Date(Math.min(...allStartDates.map(d => d.getTime())));
              return `${minD.getFullYear()}-${String(minD.getMonth() + 1).padStart(2, '0')}-${String(minD.getDate()).padStart(2, '0')}`;
            })();
      }
      if (allEndDates.length > 0) {
        effectiveEndDate = task.due_date
          ? task.due_date
          : (() => {
              const maxD = new Date(Math.max(...allEndDates.map(d => d.getTime())));
              return `${maxD.getFullYear()}-${String(maxD.getMonth() + 1).padStart(2, '0')}-${String(maxD.getDate()).padStart(2, '0')}`;
            })();
      }
    }
    
    const startDate = parseLocalDate(effectiveStartDate) ?? parseLocalDate(effectiveEndDate) ?? today;
    const endDate = parseLocalDate(effectiveEndDate) ?? startDate;
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    
    const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return { startOffset: Math.max(0, startOffset), duration, effectiveStartDate: effectiveStartDate || null, effectiveEndDate: effectiveEndDate || null };
  }, [ganttData, normalizeDate, today, parseLocalDate]);

  const getEffectiveProgress = useCallback((task: ProjectTask): number => getEffectiveTaskProgress(task), []);

  const isToday = useCallback((date: Date) => {
    return date.getTime() === today.getTime();
  }, [today]);

  // Formater la plage de dates (ex: "Jan 5 - 12")
  const formatDateRange = useCallback((startDate: string | null, endDate: string | null) => {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    if (!startDate && !endDate) return '—';
    
    const start = startDate ? parseLocalDate(startDate) : null;
    const end = endDate ? parseLocalDate(endDate) : null;
    
    if (start && end) {
      if (start.getMonth() === end.getMonth()) {
        return `${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
      }
      return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
    }
    if (start) return `${monthNames[start.getMonth()]} ${start.getDate()}`;
    if (end) return `${monthNames[end.getMonth()]} ${end.getDate()}`;
    return '—';
  }, [parseLocalDate]);

  // Calculer la durée en jours (incluant début et fin ; min 1 jour)
  const getDurationDays = useCallback((startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return null;
    const startParsed = startDate ? parseLocalDate(startDate) : null;
    const endParsed = endDate ? parseLocalDate(endDate) : null;
    const start = startParsed ? normalizeDate(startParsed) : null;
    const end = endParsed ? normalizeDate(endParsed) : null;
    
    if (start && end) {
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, days);
    }
    return 1;
  }, [normalizeDate, parseLocalDate]);

  // Grouper les tâches par couleur
  const taskGroups = useMemo(() => {
    const groups: Map<string, { color: string; tasks: ProjectTask[]; expanded: boolean }> = new Map();
    
    tasks.forEach(task => {
      const color = task.color || TASK_COLORS[0];
      if (!groups.has(color)) {
        groups.set(color, { color, tasks: [], expanded: !collapsedGroups.has(color) });
      }
      groups.get(color)!.tasks.push(task);
    });
    
    return Array.from(groups.values());
  }, [tasks, collapsedGroups]);

  // Noms de couleur pour les groupes
  const getColorName = useCallback((color: string) => {
    const colorNames: Record<string, string> = {
      '#8B5CF6': t('group_violet') || 'Violet',
      '#3B82F6': t('group_blue') || 'Bleu',
      '#10B981': t('group_green') || 'Vert',
      '#F59E0B': t('group_orange') || 'Orange',
      '#EF4444': t('group_red') || 'Rouge',
      '#EC4899': t('group_pink') || 'Rose',
      '#06B6D4': t('group_cyan') || 'Cyan',
      '#84CC16': t('group_lime') || 'Lime',
    };
    return colorNames[color] || t('group') || 'Groupe';
  }, [t]);

  // Ajouter N jours à une date ISO (YYYY-MM-DD) - format local pour éviter décalage timezone
  const addDaysToDate = useCallback((dateStr: string, days: number): string => {
    const parsed = parseLocalDate(dateStr);
    if (!parsed) return dateStr;
    parsed.setDate(parsed.getDate() + days);
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }, [parseLocalDate]);

  // Gestion du changement de dates via drag-and-drop
  const handleTaskDateChange = useCallback(async (taskId: string, newStartDate: string, newDueDate: string) => {
    // Trouver la tâche (parent ou sous-tâche)
    const taskToUpdate = tasks.find(t => t.documentId === taskId)
      ?? tasks.flatMap(t => t.subtasks || []).find(s => s.documentId === taskId);
    if (!taskToUpdate) {
      console.error('Task not found:', taskId);
      return;
    }

    const hasSubtasks = taskToUpdate.subtasks && taskToUpdate.subtasks.length > 0;

    try {
      // Mettre à jour la tâche principale
      await updateProjectTask(taskToUpdate.documentId, {
        start_date: newStartDate,
        due_date: newDueDate,
      });

      // Si tâche parente avec sous-tâches : décaler les sous-tâches du même nombre de jours que la tâche principale
      if (hasSubtasks && taskToUpdate.subtasks) {
        // Référence = dates de la tâche parente si définies, sinon enveloppe des sous-tâches
        const allStarts = [taskToUpdate.start_date, ...taskToUpdate.subtasks.map(s => s.start_date)]
          .filter((d): d is string => !!d);
        const oldRefStart = taskToUpdate.start_date ?? (allStarts.length > 0 ? allStarts.reduce((min, d) => (d < min ? d : min), allStarts[0]) : newStartDate);
        const oldStartDate = parseLocalDate(oldRefStart);
        const newStartDateParsed = parseLocalDate(newStartDate);
        if (oldStartDate && newStartDateParsed) {
          const offsetDays = Math.round(
            (newStartDateParsed.getTime() - oldStartDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          for (const subtask of taskToUpdate.subtasks) {
            const subStart = subtask.start_date;
            const subDue = subtask.due_date;
            if (subStart || subDue) {
              await updateProjectTask(subtask.documentId, {
                start_date: subStart ? addDaysToDate(subStart, offsetDays) : undefined,
                due_date: subDue ? addDaysToDate(subDue, offsetDays) : undefined,
              });
            }
          }
        }
      }

      // Recharger les tâches pour refléter les changements
      if (onTasksChange) {
        onTasksChange();
      }
    } catch (error) {
      console.error('Error updating task dates:', error);
      throw error; // Propager l'erreur pour que DraggableGanttBar puisse gérer l'échec
    }
  }, [tasks, onTasksChange, addDaysToDate, parseLocalDate]);

  const scrollToToday = useCallback(() => {
    if (!timelineRef.current || !ganttData) return;
    const todayX = ganttData.todayIndex >= 0 ? ganttData.todayIndex * colWidth : 0;
    timelineRef.current.scrollLeft = Math.max(0, todayX - timelineRef.current.clientWidth / 2);
  }, [ganttData, colWidth]);

  const handleGanttBarDragEnd = useCallback((taskId: string) => {
    lastDraggedTaskIdRef.current = taskId;
    setTimeout(() => { lastDraggedTaskIdRef.current = null; }, 500);
  }, []);

  // Réaligner les dates : pour chaque tâche parente avec sous-tâches, aligner la tâche mère sur l'enveloppe (min/max) des sous-tâches
  const [isReorging, setIsReorging] = useState(false);
  const handleReorgDates = useCallback(async () => {
    const parentsWithSubtasks = tasks.filter(t => t.subtasks && t.subtasks.length > 0);
    if (parentsWithSubtasks.length === 0) {
      showGlobalPopup(t('no_parent_with_subtasks') || 'Aucune tâche avec sous-tâches.', 'info');
      return;
    }
    setIsReorging(true);
    try {
      let updated = 0;
      for (const parent of parentsWithSubtasks) {
        const allStarts = [parent.start_date, ...(parent.subtasks || []).map(s => s.start_date)].filter((d): d is string => !!d);
        const allEnds = [parent.due_date, ...(parent.subtasks || []).map(s => s.due_date)].filter((d): d is string => !!d);
        if (allStarts.length === 0 && allEnds.length === 0) continue;
        const newStart = allStarts.length > 0 ? allStarts.reduce((min, d) => (d < min ? d : min), allStarts[0]) : parent.start_date;
        const newEnd = allEnds.length > 0 ? allEnds.reduce((max, d) => (d > max ? d : max), allEnds[0]) : parent.due_date;
        if (!newStart && !newEnd) continue;
        const needsUpdate = (parent.start_date !== newStart || parent.due_date !== newEnd);
        if (needsUpdate) {
          await updateProjectTask(parent.documentId, {
            start_date: newStart || undefined,
            due_date: newEnd || undefined,
          });
          updated++;
        }
      }
      if (onTasksChange) onTasksChange();
      showGlobalPopup(updated > 0 ? (t('reorg_dates_success') || `${updated} tâche(s) mise(s) à jour.`) : (t('reorg_dates_already_synced') || 'Dates déjà alignées.'), 'success');
    } catch (error) {
      console.error('Reorg dates error:', error);
      showGlobalPopup(t('error') || 'Erreur lors de la réorganisation.', 'error');
    } finally {
      setIsReorging(false);
    }
  }, [tasks, onTasksChange, showGlobalPopup, t]);

  // Fonction pour générer le HTML d'export (réutilisable pour aperçu et export)
  const generateExportHTML = useCallback((mode: 'light' | 'dark') => {
    if (!ganttData) {
      return { html: '', colors: { bg: '#ffffff' } };
    }

    const { minDate, totalDays, dayHeaders } = ganttData;

    const lightColors = {
      bg: '#ffffff',
      bgSecondary: '#f9fafb',
      bgTertiary: '#f3f4f6',
      border: '#e5e7eb',
      textPrimary: '#111827',
      textSecondary: '#374151',
      textMuted: '#6b7280',
      blue: '#3b82f6',
      green: '#22c55e',
      red: '#ef4444',
      gray: '#9ca3af',
      accent: '#7c3aed',
      accentLight: '#ede9fe',
      headerBg: '#f3f4f6',
      headerText: '#374151',
    };
    
    const darkColors = {
      bg: '#111827',
      bgSecondary: '#1f2937',
      bgTertiary: '#374151',
      border: '#374151',
      textPrimary: '#f9fafb',
      textSecondary: '#e5e7eb',
      textMuted: '#9ca3af',
      blue: '#60a5fa',
      green: '#4ade80',
      red: '#f87171',
      gray: '#6b7280',
      accent: '#a78bfa',
      accentLight: '#4c1d95',
      headerBg: '#1f2937',
      headerText: '#e5e7eb',
    };
    
    const colors = mode === 'dark' ? darkColors : lightColors;

    let tasksHTML = '';
    tasks.forEach((task) => {
      // Pour les tâches avec sous-tâches, calculer les dates effectives
      let effectiveStartDate = task.start_date;
      let effectiveEndDate = task.due_date;
      let effectiveProgress = task.progress || 0;
      
      if (task.subtasks && task.subtasks.length > 0) {
        // Dates englobantes
        const allStartDates = [task.start_date, ...task.subtasks.map(s => s.start_date)]
          .filter((d): d is string => !!d).map(d => new Date(d));
        const allEndDates = [task.due_date, ...task.subtasks.map(s => s.due_date)]
          .filter((d): d is string => !!d).map(d => new Date(d));
        if (allStartDates.length > 0) {
          effectiveStartDate = new Date(Math.min(...allStartDates.map(d => d.getTime()))).toISOString().split('T')[0];
        }
        if (allEndDates.length > 0) {
          effectiveEndDate = new Date(Math.max(...allEndDates.map(d => d.getTime()))).toISOString().split('T')[0];
        }
        // Moyenne des progrès des sous-tâches
        const totalProgress = task.subtasks.reduce((sum, s) => sum + (s.progress || 0), 0);
        effectiveProgress = Math.round(totalProgress / task.subtasks.length);
      }
      
      const start = normalizeDate(effectiveStartDate ? new Date(effectiveStartDate) : new Date(effectiveEndDate || today));
      const end = normalizeDate(effectiveEndDate ? new Date(effectiveEndDate) : start);
      const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
      const widthPercent = (duration / totalDays) * 100;
      
      const statusColor = task.task_status === 'completed' ? colors.green 
        : task.task_status === 'in_progress' ? colors.blue 
        : task.task_status === 'cancelled' ? colors.red 
        : colors.gray;
      
      const statusLabel = taskStatusOptions.find(o => o.value === task.task_status)?.label || task.task_status;
      
      tasksHTML += `
        <tr style="border-bottom: 1px solid ${colors.border};">
          <td style="padding: 12px; width: 200px; font-size: 13px; background: ${colors.bg};">
            <div style="font-weight: 600; color: ${colors.textPrimary};">${task.title}</div>
            <div style="font-size: 11px; color: ${colors.textMuted}; margin-top: 2px;">${statusLabel}</div>
          </td>
          <td style="padding: 8px 0; position: relative; background: ${colors.bg};">
            <div style="position: relative; height: 24px;">
              <div style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%; min-width: 40px; height: 24px; background: ${statusColor}; border-radius: 4px; display: table; table-layout: fixed;">
                <span style="display: table-cell; vertical-align: middle; !text-align: center; color: #ffffff; font-size: 11px; font-weight: 600; !text-shadow: 0 1px 2px rgba(0,0,0,0.3); white-space: nowrap; padding: 0 4px;">${effectiveProgress}%</span>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    // Générer les en-têtes de mois
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthsForExport: { label: string; days: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;
    dayHeaders.forEach((date) => {
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        monthsForExport.push({ label: `${monthNames[month]} ${year}`, days: 1 });
        currentMonth = month;
        currentYear = year;
      } else {
        monthsForExport[monthsForExport.length - 1].days++;
      }
    });

    let monthsHTML = '';
    monthsForExport.forEach((month) => {
      monthsHTML += `<th colspan="${month.days}" style="padding: 6px 4px; !text-align: center; font-size: 12px; font-weight: 700; background: ${colors.bgTertiary}; color: ${colors.textPrimary}; border-left: 1px solid ${colors.border}; border-bottom: 1px solid ${colors.border};">${month.label}</th>`;
    });

    let datesHTML = '';
    dayHeaders.forEach((day) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isTodayDate = day.getTime() === today.getTime();
      const bgColor = isTodayDate ? colors.accentLight : isWeekend ? colors.bgTertiary : colors.headerBg;
      const textColor = isTodayDate ? colors.accent : colors.headerText;
      datesHTML += `<th style="padding: 4px 2px; !text-align: center; font-size: 11px; font-weight: ${isTodayDate ? '700' : '500'}; background: ${bgColor}; color: ${textColor}; min-width: 20px; border-left: 1px solid ${colors.border};">${day.getDate()}</th>`;
    });

    return {
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background: ${colors.bg}; padding: 20px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: ${colors.textPrimary};">
            ${projectName || t('project_tasks') || 'Projet'} - Gantt
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 12px; color: ${colors.textMuted};">
            ${t('exported_on') || 'Exporté le'} ${new Date().toLocaleDateString()}
          </p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid ${colors.border};">
            <thead>
              <tr style="background: ${colors.bgTertiary};">
                <th rowspan="2" style="padding: 10px 12px; !text-align: left; font-size: 12px; font-weight: 700; color: ${colors.headerText}; !text-transform: uppercase; width: 180px; border-bottom: 2px solid ${colors.border}; background: ${colors.headerBg}; vertical-align: bottom;">
                  ${t('task') || 'Tâche'}
                </th>
                ${monthsHTML}
              </tr>
              <tr style="background: ${colors.headerBg};">
                ${datesHTML}
              </tr>
            </thead>
            <tbody>${tasksHTML}</tbody>
          </table>
          <div style="margin-top: 16px; display: flex; gap: 20px; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 14px; height: 14px; background: ${colors.blue}; border-radius: 3px;"></div>
              <span style="color: ${colors.textSecondary}; font-weight: 500;">${t('in_progress') || 'En cours'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 14px; height: 14px; background: ${colors.green}; border-radius: 3px;"></div>
              <span style="color: ${colors.textSecondary}; font-weight: 500;">${t('completed') || 'Terminé'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 14px; height: 14px; background: ${colors.gray}; border-radius: 3px;"></div>
              <span style="color: ${colors.textSecondary}; font-weight: 500;">${t('todo') || 'À faire'}</span>
            </div>
          </div>
        </div>
      `,
      colors
    };
  }, [ganttData, tasks, taskStatusOptions, today, projectName, t, normalizeDate]);

  // Fonction d'export PDF - utilise generateExportHTML
  const handleExportPDF = useCallback(async (mode: 'light' | 'dark') => {
    setIsExporting(true);
    setShowExportModal(false);
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const { html, colors } = generateExportHTML(mode);
      
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = html;
      tempContainer.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 1100px;';
      document.body.appendChild(tempContainer);
      
      const exportElement = tempContainer.querySelector('div');
      if (!exportElement) {
        throw new Error('Export element not found');
      }
      
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${exportFileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: colors.bg },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
      }).from(exportElement).save();
      
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [generateExportHTML, exportFileName]);

  // Générer l'aperçu HTML en temps réel
  const previewHTML = useMemo(() => {
    return generateExportHTML(exportMode).html;
  }, [generateExportHTML, exportMode]);

  // Early return si pas de données Gantt (après tous les hooks)
  if (!ganttData) {
    return (
      <div className="!text-center py-12 bg-muted  border border-default">
        <IconTimeline className="w-12 h-12 !text-muted mx-auto mb-3" />
        <p className="!text-muted">{t('no_tasks_with_dates_for_gantt') || 'Aucune tâche avec des dates pour afficher le Gantt'}</p>
        <p className="!text-xs !text-muted mt-1">{t('add_dates_to_tasks') || 'Ajoutez des dates de début et d&apos;échéance à vos tâches'}</p>
      </div>
    );
  }

  const { dayHeaders, months, todayIndex } = ganttData;
  const fmtDateShort = (s: string | null) => {
    if (!s) return '—';
    const d = new Date(s);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const doneCount = tasks.filter((ta) => ta.task_status === 'completed').length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col  border border-default overflow-hidden bg-card">
      {/* Modal de sélection du mode d'export avec aperçu */}
      {showExportModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-hidden overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-card border border-default  shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="!text-lg font-semibold !text-primary">
                {t('export_pdf') || 'Export PDF'}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 !text-primary hover:!text-primary transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Options panel */}
              <div className="w-72 flex-shrink-0 p-4 border-r border-default !space-y-4 overflow-y-auto">
                {/* Nom du fichier */}
                <div>
                  <label className="block !text-sm font-medium !text-primary mb-2">
                    {t('file_name') || 'Nom du fichier'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={exportFileName}
                      onChange={(e) => setExportFileName(e.target.value)}
                      className="flex-1 px-3 py-2 !text-sm bg-muted border border-default  !text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <span className="!text-primary !text-sm">.pdf</span>
                  </div>
                </div>

                {/* Thème */}
                <div>
                  <label className="block !text-sm font-medium !text-primary mb-2">
                    {t('choose_export_theme') || 'Thème'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportMode('light')}
                      className={`flex-1 py-2 px-3  border-2 transition-all ${
                        exportMode === 'light' 
                          ? 'border-accent bg-accent-light' 
                          : 'border-default bg-muted hover:border-accent'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-800 rounded"></div>
                        </div>
                        <span className="!text-xs font-medium !text-primary">{t('light') || 'Clair'}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setExportMode('dark')}
                      className={`flex-1 py-2 px-3  border-2 transition-all ${
                        exportMode === 'dark' 
                          ? 'border-accent bg-accent-light' 
                          : 'border-default bg-muted hover:border-accent'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded bg-gray-800 border border-gray-600 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-100 rounded"></div>
                        </div>
                        <span className="!text-xs font-medium !text-primary">{t('dark') || 'Sombre'}</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 !space-y-2">
                  <button
                    onClick={() => handleExportPDF(exportMode)}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 !text-sm bg-accent !text-white  hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <IconFileTypePdf className="w-4 h-4" />
                    {isExporting ? (t('exporting') || 'Export...') : (t('export') || 'Exporter')}
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full py-2 px-4 !text-sm border border-default  !text-primary hover:bg-hover transition-colors"
                  >
                    {t('cancel') || 'Annuler'}
                  </button>
                </div>
              </div>

              {/* Aperçu */}
              <div className="flex-1 p-4 overflow-auto bg-muted-light">
                <p className="!text-xs !text-muted mb-2 uppercase tracking-wider">{t('preview') || 'Aperçu'}</p>
                <div 
                  className="border !border-default  shadow-lg overflow-auto"
                  style={{ 
                    maxHeight: 'calc(90vh - 180px)',
                    transform: 'scale(0.7)',
                    transformOrigin: 'top left',
                    width: '142%'
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar Gantt redesign */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-default bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <IconTimeline className="w-4 h-4 !text-accent" />
            <span className="font-semibold !text-sm !text-primary">{projectName || t('project_tasks') || 'Projet'}</span>
          </div>
          <span className="font-mono !text-[10px] px-2 py-0.5 rounded border border-default !text-muted bg-muted">{t('gantt') || 'Gantt'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-default  overflow-hidden">
            <button type="button" onClick={() => zoom(-4)} className="w-8 h-8 flex items-center justify-center !text-muted hover:bg-muted" title={t('zoom_out') || 'Zoom arrière'}>−</button>
            <div className="w-px bg-default" />
            <button type="button" onClick={() => zoom(4)} className="w-8 h-8 flex items-center justify-center !text-muted hover:bg-muted" title={t('zoom_in') || 'Zoom avant'}>+</button>
          </div>
          <button type="button" onClick={scrollToToday} className="flex items-center gap-1.5 px-3 py-1.5 !text-sm border border-warning/40 !text-warning hover:bg-warning  transition-colors">
            <IconCalendarEvent className="w-4 h-4" />
            {t('today') || "Aujourd'hui"}
          </button>
          {canEdit && onAddTask && (
            <button type="button" onClick={onAddTask} className="flex items-center gap-1.5 px-3 py-1.5 !text-sm border border-default !text-muted hover:!text-primary hover:bg-muted  transition-colors">
              <IconPlus className="w-4 h-4" />
              {t('new_task') || 'Nouvelle tâche'}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={handleReorgDates} disabled={isReorging} className="flex items-center gap-1.5 px-3 py-1.5 !text-sm border border-default !text-muted hover:!text-primary hover:bg-muted transition-colors disabled:opacity-50" title={t('reorg_dates_tooltip') || 'Réaligner les tâches mères sur l\'enveloppe de leurs sous-tâches'}>
              <IconArrowsSort className="w-4 h-4" />
              {isReorging ? (t('reorging') || 'Reorg...') : (t('reorg_dates') || 'Reorg dates')}
            </button>
          )}
          <button type="button" onClick={() => setShowExportModal(true)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 !text-sm border border-default !text-muted hover:!text-primary hover:bg-muted  transition-colors disabled:opacity-50">
            <IconFileTypePdf className="w-4 h-4" />
            {isExporting ? (t('exporting') || 'Export...') : (t('export_pdf') || 'Export PDF')}
          </button>
        </div>
      </div>

      {/* Gantt - design redesign (table avec sticky cols) */}
      <div className="overflow-x-auto overflow-y-auto" ref={timelineRef} style={{ maxHeight: 'min(600px, 70vh)' }}>
        <table className="w-full border-collapse table-fixed" style={{ minWidth: `${LEFT_W + 90 + 60 + dayHeaders.length * colWidth}px` }}>
          <thead className="sticky top-0 z-20 bg-card">
            <tr>
              <th className="!text-left py-3 px-4 !text-[10px] font-mono !text-muted uppercase tracking-wider sticky left-0 z-40 bg-card-solid border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ width: LEFT_W, minWidth: LEFT_W }}>
                {t('task_name') || 'Nom de la tâche'}
              </th>
              <th className="!text-center py-3 px-2 !text-[10px] font-mono !text-muted uppercase tracking-wider sticky z-40 bg-card-solid border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W, width: 90, minWidth: 90 }}>
                {t('due_range') || 'Période'}
              </th>
              <th className="!text-center py-3 px-2 !text-[10px] font-mono !text-muted uppercase tracking-wider sticky z-40 !bg-card-solid border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W + 90, width: 60, minWidth: 60 }}>
                {t('duration') || 'Durée'}
              </th>
              {months.map((month, i) => (
                <th key={i} colSpan={month.days} className="!text-center py-2 !text-xs font-semibold !text-primary bg-muted border-b border-default">
                  {month.label}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-40 bg-card-solid h-8 border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ width: LEFT_W }} />
              <th className="sticky z-40 bg-card-solid h-8 border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W, width: 90 }} />
              <th className="sticky z-40 bg-card-solid h-8 border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W + 90, width: 60 }} />
              {dayHeaders.map((day, j) => (
                <th
                  key={j}
                  data-day-index={j}
                  data-is-today={isToday(day) ? 'true' : 'false'}
                  className={`!text-center py-1.5 font-mono !text-[10px] border-b border-default flex-shrink-0 ${
                    isToday(day) ? '!text-warning font-semibold bg-warning' : day.getDay() === 0 || day.getDay() === 6 ? '!text-muted/60 bg-muted' : '!text-muted'
                  }`}
                  style={{ width: colWidth, minWidth: colWidth }}
                >
                  {day.getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {taskGroups.map((group) => {
                const isExpanded = !collapsedGroups.has(group.color);
                const groupName = getColorName(group.color);

                return (
                  <React.Fragment key={group.color}>
                    {/* En-tête du groupe */}
                    <tr className="cursor-pointer hover:bg-muted transition-colors bg-muted" onClick={() => toggleGroup(group.color)}>
                      <td className="py-2.5 px-4 sticky left-0 z-40 bg-muted border-b border-default shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ width: LEFT_W }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                          <span className="font-semibold !text-primary !text-sm">{groupName}</span>
                          <span className="font-mono !text-[10px] !text-muted">({group.tasks.length})</span>
                          <IconChevronDown className={`w-4 h-4 !text-muted ml-auto transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </div>
                      </td>
                      <td className="py-2.5 px-2 border-b border-default bg-muted sticky z-40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W, width: 90 }} />
                      <td className="py-2.5 px-2 border-b border-default bg-muted sticky z-40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W + 90, width: 60 }} />
                      <td colSpan={dayHeaders.length} className="h-9 p-0 overflow-hidden border-b border-default bg-muted">
                        <div className="relative w-full h-full">
                          {todayIndex >= 0 && (
                            <div className="absolute top-0 bottom-0 w-[1.5px] bg-warning z-[4] pointer-events-none" style={{ left: `${todayIndex * colWidth + colWidth / 2}px` }}>
                              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-warning" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && group.tasks.map((task) => {
                      const pos = getTaskPosition(task, true);
                      const { startOffset, duration, effectiveStartDate: posStart, effectiveEndDate: posEnd } = pos;
                      const effectiveStartDate = posStart ?? task.start_date ?? null;
                      const effectiveEndDate = posEnd ?? task.due_date ?? null;
                      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                      const subtaskCount = task.subtasks?.length || 0;
                      const completedSubtasks = task.subtasks?.filter(s => s.task_status === 'completed').length || 0;
                      const allAssignedUsers = [task.assigned_to, ...(task.subtasks?.map(s => s.assigned_to) || [])].filter((u): u is NonNullable<typeof u> => !!u);
                      const uniqueUsers = allAssignedUsers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
                      const effectiveProgress = getEffectiveProgress(task);

                      return (
                        <React.Fragment key={task.documentId}>
                          {/* Ligne de tâche principale */}
                          <tr 
                            className="hover:bg-muted cursor-pointer group h-[44px]"
                            onClick={() => {
                              if (lastDraggedTaskIdRef.current === task.documentId) return;
                              onEdit(task);
                            }}
                          >
                            {/* Task Name */}
                            <td className="py-2 px-4 sticky left-0 z-40 bg-card-solid group-hover:bg-muted border-b border-default/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ width: LEFT_W }}>
                              <div className="flex items-center gap-2">
                                {isSelectionMode && canEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleSelection?.(task.documentId); }}
                                    className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 hover:bg-muted transition-colors"
                                    style={{ borderColor: selectedTasks.has(task.documentId) ? 'var(--color-accent)' : undefined, backgroundColor: selectedTasks.has(task.documentId) ? 'var(--color-accent)' : undefined }}
                                  >
                                    {selectedTasks.has(task.documentId) && <IconCheck className="w-2.5 h-2.5 !text-white" />}
                                  </button>
                                )}
                                {(!isSelectionMode || !canEdit) && (
                                <div 
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    task.task_status === 'completed' ? 'border-transparent' : ''
                                  }`}
                                  style={{ 
                                    backgroundColor: task.task_status === 'completed' ? group.color : 'transparent',
                                    borderColor: task.task_status !== 'completed' ? group.color + '50' : undefined
                                  }}
                                >
                                  {task.task_status === 'completed' && <IconCheck className="w-2.5 h-2.5 !text-white" />}
                                </div>
                                )}
                                <span className={`text-sm truncate max-w-[140px] ${task.task_status === 'completed' ? 'text-muted line-through' : 'text-primary'}`}>
                                  {task.title}
                                </span>
                                {hasSubtasks && (
                                  <span className="flex items-center gap-0.5 !text-[10px] !text-muted bg-muted px-1 py-0.5 rounded">
                                    <IconSubtask className="w-3 h-3" />
                                    {completedSubtasks}/{subtaskCount}
                                  </span>
                                )}
                                {uniqueUsers.length > 0 && <AvatarStack users={uniqueUsers} max={2} size="sm" />}
                              </div>
                            </td>
                            {/* Due Range */}
                            <td className="py-2 px-1 !text-center sticky z-40 bg-card-solid group-hover:bg-muted border-b border-default/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W, width: 90 }}>
                              <span 
                                className="!text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
                                style={{ backgroundColor: group.color + '20', color: group.color }}
                              >
                                {formatDateRange(effectiveStartDate, effectiveEndDate)}
                              </span>
                            </td>
                            {/* Duration */}
                            <td className="py-2 px-1 !text-center sticky z-40 bg-card-solid group-hover:bg-muted border-b border-default/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W + 90, width: 60 }}>
                              <span className="!text-xs !text-muted whitespace-nowrap">
                                {getDurationDays(effectiveStartDate, effectiveEndDate) != null ? `${getDurationDays(effectiveStartDate, effectiveEndDate)} ${t('days_short') || 'd'}` : '—'}
                              </span>
                            </td>
                            {/* Timeline - Barre de Gantt redesign */}
                            <td colSpan={dayHeaders.length} className="h-11 p-0 overflow-hidden border-b border-default/60">
                              <div className="relative w-full h-full">
                                <div className="absolute inset-0 flex">
                                  {dayHeaders.map((day, i) => (
                                    <div key={i} className={`flex-shrink-0 ${isToday(day) ? 'bg-warning' : ''} ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted' : ''}`} style={{ width: colWidth }} />
                                  ))}
                                </div>
                                {todayIndex >= 0 && (
                                  <div className="absolute top-0 bottom-0 w-[1.5px] bg-warning z-[4] pointer-events-none" style={{ left: `${todayIndex * colWidth + colWidth / 2}px` }}>
                                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-warning" />
                                  </div>
                                )}
                                {ganttData && (
                                  <DraggableGanttBar
                                    taskId={task.documentId}
                                    startOffset={startOffset}
                                    duration={duration}
                                    dayWidth={colWidth}
                                    minDate={ganttData.minDate}
                                    color={group.color}
                                    taskStatus={task.task_status}
                                    progress={effectiveProgress}
                                    onDateChange={handleTaskDateChange}
                                    onDragEnd={handleGanttBarDragEnd}
                                    className="rounded-lg"
                                  >
                                    <div
                                      className="flex items-center justify-between px-2.5 overflow-hidden h-full"
                                      onMouseEnter={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, task, color: group.color, effectiveProgress, startDate: effectiveStartDate || '', endDate: effectiveEndDate || '', dur: getDurationDays(effectiveStartDate, effectiveEndDate) != null ? `${getDurationDays(effectiveStartDate, effectiveEndDate)}j` : '—' })}
                                      onMouseMove={(e) => setTooltip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                                      onMouseLeave={() => setTooltip(null)}
                                    >
                                      <span className="!text-[11px] font-semibold !text-white truncate">{duration > 3 ? task.title : ''}</span>
                                      {duration > 2 && <span className="font-mono !text-[10px] !text-white/90 ml-2 flex-shrink-0">{effectiveProgress}%</span>}
                                    </div>
                                  </DraggableGanttBar>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Sous-tâches */}
                          {hasSubtasks && task.subtasks?.map(subtask => {
                            const subPos = getTaskPosition(subtask, false); // false = pas de sous-sous-tâches
                            return (
                              <tr 
                                key={subtask.documentId}
                                className="hover:bg-muted cursor-pointer h-[34px]"
                                onClick={() => {
                                  if (lastDraggedTaskIdRef.current === subtask.documentId) return;
                                  onEdit(subtask);
                                }}
                              >
                                <td className="py-1 !pl-11 !pr-4 sticky left-0 z-40 bg-card-solid border-b border-default/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ width: LEFT_W }}>
                                  <div className="flex items-center gap-2">
                                    {isSelectionMode && canEdit ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleSelection?.(subtask.documentId); }}
                                        className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 hover:bg-muted transition-colors"
                                        style={{ borderColor: selectedTasks.has(subtask.documentId) ? 'var(--color-accent)' : undefined, backgroundColor: selectedTasks.has(subtask.documentId) ? 'var(--color-accent)' : undefined }}
                                      >
                                        {selectedTasks.has(subtask.documentId) && <IconCheck className="w-2 h-2 !text-white" />}
                                      </button>
                                    ) : (
                                    <div 
                                      className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                      style={{ 
                                        backgroundColor: subtask.task_status === 'completed' ? group.color : 'transparent',
                                        borderColor: subtask.task_status !== 'completed' ? group.color + '40' : 'transparent'
                                      }}
                                    >
                                      {subtask.task_status === 'completed' && <IconCheck className="w-2 h-2 !text-white" />}
                                    </div>
                                    )}
                                    <span className={`text-xs truncate max-w-[130px] ${subtask.task_status === 'completed' ? 'text-muted line-through' : 'text-primary'}`}>
                                      {subtask.title}
                                    </span>
                                    {subtask.assigned_to && <UserAvatar user={subtask.assigned_to} size="sm" className="ml-auto" />}
                                  </div>
                                </td>
                                <td className="py-1 px-1 !text-center sticky z-40 bg-card-solid border-b border-default/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W, width: 90 }}>
                                  <span className="!text-[9px] !text-muted whitespace-nowrap">{formatDateRange(subtask.start_date, subtask.due_date)}</span>
                                </td>
                                <td className="py-1 px-1 !text-center sticky z-40 bg-card-solid border-b border-default/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_W + 90, width: 60 }}>
                                  <span className="!text-[9px] !text-muted whitespace-nowrap">{getDurationDays(subtask.start_date, subtask.due_date) != null ? `${getDurationDays(subtask.start_date, subtask.due_date)} ${t('days_short') || 'd'}` : '—'}</span>
                                </td>
                                <td colSpan={dayHeaders.length} className="h-10 p-0 overflow-hidden border-b border-default/60">
                                  <div className="relative w-full h-full">
                                    <div className="absolute inset-0 flex">
                                      {dayHeaders.map((day, i) => (
                                        <div key={i} className={`flex-shrink-0 ${isToday(day) ? 'bg-warning/5' : ''}`} style={{ width: colWidth }} />
                                      ))}
                                    </div>
                                    {todayIndex >= 0 && (
                                      <div className="absolute top-0 bottom-0 w-[1.5px] bg-warning z-[4]" style={{ left: `${todayIndex * colWidth + colWidth / 2}px` }} />
                                    )}
                                    {ganttData && (
                                      <DraggableGanttBar
                                        taskId={subtask.documentId}
                                        startOffset={subPos.startOffset}
                                        duration={subPos.duration}
                                        dayWidth={colWidth}
                                        minDate={ganttData.minDate}
                                        color={group.color}
                                        taskStatus={subtask.task_status}
                                        progress={subtask.progress || 0}
                                        onDateChange={handleTaskDateChange}
                                        onDragEnd={handleGanttBarDragEnd}
                                        className="h-4 rounded opacity-85 hover:opacity-100"
                                      >
                                        <div />
                                      </DraggableGanttBar>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Nouvelle sous-tâche */}
                          <tr className="h-10">
                            <td
                              className="py-1 px-4 sticky left-0 z-40 bg-card-solid hover:bg-muted cursor-pointer border-b border-default/60 transition-colors shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                              onClick={(e) => { e.stopPropagation(); onAddSubtask(task); }}
                              style={{ width: LEFT_W }}
                            >
                              <div className="flex items-center gap-2 !text-muted hover:!text-accent">
                                <IconPlus className="w-3 h-3" />
                                <span className="!text-xs">{t('add_subtask') || 'Nouvelle sous-tâche'}</span>
                              </div>
                            </td>
                            <td className="py-1 border-b border-default/60 sticky z-40 bg-card-solid" style={{ left: LEFT_W, width: 90 }} />
                            <td className="py-1 border-b border-default/60 sticky z-40 bg-card-solid" style={{ left: LEFT_W + 90, width: 60 }} />
                            <td colSpan={dayHeaders.length} className="h-10 p-0 border-b border-default/60" />
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    {/* Nouvelle tâche (fin de groupe) */}
                    {canEdit && onAddTask && (
                      <tr className="h-10">
                        <td className="py-1 px-4 sticky left-0 z-40 bg-card-solid hover:bg-muted cursor-pointer border-b border-default/60 transition-colors shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" onClick={onAddTask} style={{ width: LEFT_W }}>
                          <div className="flex items-center gap-2 !text-muted hover:!text-accent">
                            <IconPlus className="w-3 h-3" />
                            <span className="!text-xs">{t('new_task') || 'Nouvelle tâche'}</span>
                          </div>
                        </td>
                        <td className="py-1 border-b border-default/60 sticky z-40 bg-card-solid" style={{ left: LEFT_W, width: 90 }} />
                        <td className="py-1 border-b border-default/60 sticky z-40 bg-card-solid" style={{ left: LEFT_W + 90, width: 60 }} />
                        <td colSpan={dayHeaders.length} className="h-10 p-0 border-b border-default/60" />
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

      {/* Tooltip Gantt */}
      {tooltip && (
        <div
          className="fixed z-[100] pointer-events-none bg-card border border-default  p-3 shadow-xl min-w-[200px]"
          style={{ left: Math.min(tooltip.x + 16, typeof window !== 'undefined' ? window.innerWidth - 220 : tooltip.x + 16), top: tooltip.y - 10 }}
        >
          <div className="font-semibold !text-sm !text-primary mb-2">{tooltip.task.title}</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono !text-[10px] !text-muted w-14">Début</span>
            <span className="font-mono !text-[11px] !text-primary">{fmtDateShort(tooltip.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono !text-[10px] !text-muted w-14">Fin</span>
            <span className="font-mono !text-[11px] !text-primary">{fmtDateShort(tooltip.endDate)}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono !text-[10px] !text-muted w-14">Durée</span>
            <span className="font-mono !text-[11px] !text-primary">{tooltip.dur}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono !text-[10px] !text-muted w-14">Avance</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${tooltip.effectiveProgress}%`, backgroundColor: tooltip.color }} />
            </div>
            <span className="font-mono !text-[11px] !text-primary">{tooltip.effectiveProgress}%</span>
          </div>
        </div>
      )}

      {/* Légende redesign */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-default bg-card">
        {taskGroups.map((g) => (
          <div key={g.color} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
            <span className="font-mono !text-[11px] !text-muted">{getColorName(g.color)}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded bg-warning" />
          <span className="font-mono !text-[11px] !text-muted">{t('today') || "Aujourd'hui"}</span>
        </div>
        <span className="font-mono !text-[11px] !text-muted ml-auto">
          {doneCount}/{tasks.length} terminées · {progressPct}% progression
        </span>
      </div>
    </div>
  );
}

