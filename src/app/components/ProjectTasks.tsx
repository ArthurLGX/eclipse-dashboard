'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlus,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconTrash,
  IconEdit,
  IconCalendar,
  IconFlag,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconProgress,
  IconLayoutCards,
  IconTable,
  IconTimeline,
  IconFileTypePdf,
} from '@tabler/icons-react';
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
}

type ViewMode = 'cards' | 'table' | 'gantt';

// Types pour les options
type TaskStatusOption = { value: TaskStatus; label: string; color: string; icon: React.ReactNode };
type TaskPriorityOption = { value: TaskPriority; label: string; color: string };

export default function ProjectTasks({ 
  projectDocumentId, 
  userId, 
  canEdit, 
  collaborators = [],
  ownerInfo,
  onTaskAssigned,
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
        username: ownerInfo.username || 'Propriétaire',
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
    { value: 'table', label: t('table') || 'Tableau', icon: <IconTable className="w-4 h-4" /> },
    { value: 'gantt', label: t('gantt') || 'Gantt', icon: <IconTimeline className="w-4 h-4" /> },
  ];

  const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; icon: React.ReactNode }[] = [
    { value: 'todo', label: t('todo') || 'À faire', color: 'zinc', icon: <IconClock className="w-4 h-4" /> },
    { value: 'in_progress', label: t('in_progress') || 'En cours', color: 'blue', icon: <IconProgress className="w-4 h-4" /> },
    { value: 'completed', label: t('completed') || 'Terminé', color: 'emerald', icon: <IconCheck className="w-4 h-4" /> },
    { value: 'cancelled', label: t('cancelled') || 'Annulé', color: 'red', icon: <IconX className="w-4 h-4" /> },
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
  });

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDocumentId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetchProjectTasks(projectDocumentId);
      setTasks(response.data || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

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
      });

      // Si une personne est assignée, notifier
      if (newTask.assigned_to && onTaskAssigned) {
        const assignedMember = allMembers.find(m => m.documentId === newTask.assigned_to);
        if (assignedMember && assignedMember.email) {
          onTaskAssigned(newTask.title, { email: assignedMember.email, username: assignedMember.username });
        }
      }

      showGlobalPopup(t('task_created') || 'Tâche créée avec succès', 'success');
      setNewTask({ title: '', description: '', task_status: 'todo', priority: 'medium', start_date: '', due_date: '', estimated_hours: '', assigned_to: '' });
      setShowNewTaskForm(false);
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleUpdateTask = async (taskDocumentId: string, updates: Partial<ProjectTask>) => {
    try {
      await updateProjectTask(taskDocumentId, updates as Parameters<typeof updateProjectTask>[1]);
      showGlobalPopup(t('task_updated') || 'Tâche mise à jour', 'success');
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleDeleteTask = async (taskDocumentId: string) => {
    if (!confirm(t('confirm_delete_task') || 'Supprimer cette tâche ?')) return;

    try {
      await deleteProjectTask(taskDocumentId);
      showGlobalPopup(t('task_deleted') || 'Tâche supprimée', 'success');
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleStatusChange = async (taskDocumentId: string, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskDocumentId, status);
      loadTasks();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Debounce ref pour éviter les appels multiples
  const progressTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});

  const handleProgressChange = useCallback((taskDocumentId: string, progress: number) => {
    // Mise à jour locale immédiate pour l'UI
    setLocalProgress(prev => ({ ...prev, [taskDocumentId]: progress }));
    
    // Annuler le timeout précédent
    if (progressTimeoutRef.current[taskDocumentId]) {
      clearTimeout(progressTimeoutRef.current[taskDocumentId]);
    }
    
    // Debounce l'appel API (500ms après la fin du glissement)
    progressTimeoutRef.current[taskDocumentId] = setTimeout(async () => {
      try {
        await updateTaskProgress(taskDocumentId, progress);
        // Ne pas recharger toute la liste - juste mettre à jour localement
        setTasks(prev => prev.map(t => 
          t.documentId === taskDocumentId ? { ...t, progress } : t
        ));
        setLocalProgress(prev => {
          const next = { ...prev };
          delete next[taskDocumentId];
          return next;
        });
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }, 500);
  }, []);

  // Cleanup des timeouts
  useEffect(() => {
    return () => {
      Object.values(progressTimeoutRef.current).forEach(clearTimeout);
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
    const option = TASK_STATUS_OPTIONS.find(o => o.value === status);
    const colorMap: Record<string, string> = {
      zinc: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colorMap[option?.color || 'zinc'];
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

  const filteredTasks = tasks.filter(task => 
    filter === 'all' || task.task_status === filter
  );

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.task_status === 'todo').length,
    in_progress: tasks.filter(t => t.task_status === 'in_progress').length,
    completed: tasks.filter(t => t.task_status === 'completed').length,
  };

  const overallProgress = tasks.length > 0
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <IconProgress className="w-5 h-5 text-accent" />
            {t('project_tasks')}
          </h3>
          <p className="text-sm text-muted mt-1">
            {taskStats.completed}/{taskStats.total} {t('tasks_completed')} • {overallProgress}% {t('progress')}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            <IconPlus className="w-4 h-4" />
            {t('add_task') || 'Nouvelle tâche'}
          </button>
        )}
      </div>

      {/* Barre de progression globale */}
      {tasks.length > 0 && (
        <div className="bg-muted rounded-lg p-4 border border-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">{t('overall_progress') || 'Progression globale'}</span>
            <span className="text-sm font-medium text-accent">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-hover rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full"
            />
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
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-muted text-secondary hover:bg-hover'
              }`}
            >
              Toutes ({taskStats.total})
            </button>
            {TASK_STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  filter === option.value
                    ? getStatusStyle(option.value)
                    : 'bg-muted text-secondary hover:bg-hover'
                }`}
              >
                {option.icon}
                {option.label} ({tasks.filter(t => t.task_status === option.value).length})
              </button>
            ))}
          </div>

          {/* Sélecteur de vue */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-default">
            {VIEW_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === option.value
                    ? 'bg-accent text-white'
                    : 'text-secondary hover:text-primary'
                }`}
                title={option.label}
              >
                {option.icon}
                <span className="hidden md:inline">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire nouvelle tâche */}
      <AnimatePresence>
        {showNewTaskForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateTask}
            className="bg-card border border-default rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-primary">{t('new_task') || 'Nouvelle tâche'}</h4>
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="p-1 text-secondary hover:text-primary"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <input
                type="text"
                placeholder={t('task_title') || 'Titre de la tâche *'}
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="input w-full"
                required
              />

              <div>
                <label className="block text-sm text-secondary mb-1">{t('description') || 'Description'}</label>
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
                  <label className="block text-sm text-secondary mb-1">{t('status') || 'Statut'}</label>
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
                  <label className="block text-sm text-secondary mb-1">{t('priority') || 'Priorité'}</label>
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
                  <label className="block text-sm text-secondary mb-1">{t('assigned_to') || 'Assigner à'}</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">{t('not_assigned') || 'Non assigné'}</option>
                    {allMembers.map(member => (
                      <option key={member.documentId} value={member.documentId}>
                        {member.username} {member.isOwner ? '(Propriétaire)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">{t('start_date') || 'Date de début'}</label>
                  <input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-secondary mb-1">{t('due_date') || 'Échéance'}</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-secondary mb-1">{t('estimated_hours') || 'Heures estimées'}</label>
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
                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={!newTask.title.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {t('create') || 'Créer'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Liste des tâches selon la vue */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-xl border border-default">
          <IconProgress className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">
            {filter === 'all' 
              ? (t('no_tasks') || 'Aucune tâche pour ce projet')
              : (t('no_tasks_filter') || 'Aucune tâche avec ce statut')}
          </p>
          {canEdit && filter === 'all' && (
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="mt-4 px-4 py-2 bg-card hover:bg-hover text-secondary rounded-lg transition-colors inline-flex items-center gap-2 border border-default"
            >
              <IconPlus className="w-4 h-4" />
              {t('add_first_task') || 'Ajouter une tâche'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vue Cartes */}
          {viewMode === 'cards' && (
            <div className="space-y-2">
              {filteredTasks.map((task, index) => (
                <TaskCard
                  key={`${task.documentId}-${index}`}
                  task={task}
                  canEdit={canEdit}
                  isExpanded={expandedTasks.has(task.documentId)}
                  onToggleExpand={() => toggleExpanded(task.documentId)}
                  onStatusChange={(status) => handleStatusChange(task.documentId, status)}
                  onProgressChange={(progress) => handleProgressChange(task.documentId, progress)}
                  onEdit={() => setEditingTask(task)}
                  onDelete={() => handleDeleteTask(task.documentId)}
                  getStatusStyle={getStatusStyle}
                  getPriorityStyle={getPriorityStyle}
                  taskStatusOptions={TASK_STATUS_OPTIONS}
                  localProgress={localProgress[task.documentId]}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Vue Tableau */}
          {viewMode === 'table' && (
            <TaskTableView
              tasks={filteredTasks}
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
              getStatusStyle={getStatusStyle}
              getPriorityStyle={getPriorityStyle}
              taskStatusOptions={TASK_STATUS_OPTIONS}
              t={t}
            />
          )}
        </>
      )}

      {/* Modal d'édition */}
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={(updates) => handleUpdateTask(editingTask.documentId, updates)}
            taskStatusOptions={TASK_STATUS_OPTIONS}
            priorityOptions={PRIORITY_OPTIONS}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant carte de tâche
interface TaskCardProps {
  task: ProjectTask;
  canEdit: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onProgressChange: (progress: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  getStatusStyle: (status: TaskStatus) => string;
  getPriorityStyle: (priority: TaskPriority) => string;
  taskStatusOptions: TaskStatusOption[];
  localProgress?: number;
  t: (key: string) => string;
}

function TaskCard({
  task,
  canEdit,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onProgressChange,
  onEdit,
  onDelete,
  getStatusStyle,
  getPriorityStyle,
  taskStatusOptions,
  localProgress,
  t: _t,
}: TaskCardProps) {
  void _t; // Utilisé pour éviter l'erreur de lint
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed';
  const displayProgress = localProgress !== undefined ? localProgress : task.progress;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border rounded-xl overflow-hidden transition-colors ${
        isOverdue ? 'border-red-500/50' : 'border-default'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox statut */}
          <button
            onClick={() => onStatusChange(task.task_status === 'completed' ? 'todo' : 'completed')}
            disabled={!canEdit}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              task.task_status === 'completed'
                ? 'bg-accent border-accent text-white'
                : 'border-default hover:border-accent'
            } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {task.task_status === 'completed' && <IconCheck className="w-4 h-4" />}
          </button>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium ${
                task.task_status === 'completed' ? 'text-muted line-through' : 'text-primary'
              }`}>
                {task.title}
              </h4>
              
              {/* Badge priorité */}
              <IconFlag className={`w-4 h-4 ${getPriorityStyle(task.priority)}`} />
              
              {/* Badge statut */}
              <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusStyle(task.task_status)}`}>
                {taskStatusOptions.find(o => o.value === task.task_status)?.label}
              </span>

              {/* Indicateur retard */}
              {isOverdue && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <IconAlertCircle className="w-3.5 h-3.5" />
                  En retard
                </span>
              )}
            </div>

            {/* Barre de progression */}
            {task.task_status !== 'cancelled' && (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${
                      displayProgress >= 100 ? 'bg-accent' : 'bg-blue-500'
                    }`}
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
                <span className="text-xs text-muted w-10">{displayProgress}%</span>
              </div>
            )}

            {/* Dates */}
            {(task.due_date || task.estimated_hours) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                {task.due_date && (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                    <IconCalendar className="w-3.5 h-3.5" />
                    {new Date(task.due_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {task.estimated_hours && (
                  <span className="flex items-center gap-1">
                    <IconClock className="w-3.5 h-3.5" />
                    {task.estimated_hours}h estimées
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {task.description && (
              <button
                onClick={onToggleExpand}
                className="p-1.5 text-muted hover:text-primary transition-colors"
              >
                {isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  className="p-1.5 text-muted hover:text-blue-400 transition-colors"
                >
                  <IconEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 text-muted hover:text-red-400 transition-colors"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description expandue */}
        <AnimatePresence>
          {isExpanded && task.description && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-default"
            >
              <div 
                className="text-sm text-secondary prose prose-sm max-w-none dark:prose-invert
                  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2
                  [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2
                  [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                  [&_a]:text-accent [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: task.description || '' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slider progression (si éditable) */}
      {canEdit && task.task_status !== 'completed' && task.task_status !== 'cancelled' && (
        <div className="px-4 pb-3">
          <input
            type="range"
            min="0"
            max="100"
            value={displayProgress}
            onChange={(e) => onProgressChange(parseInt(e.target.value))}
            className="w-full h-1 bg-hover rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
      )}
    </motion.div>
  );
}

// Modal d'édition de tâche
interface TaskEditModalProps {
  task: ProjectTask;
  onClose: () => void;
  onSave: (updates: Partial<ProjectTask>) => void;
  taskStatusOptions: TaskStatusOption[];
  priorityOptions: TaskPriorityOption[];
  t: (key: string) => string;
}

function TaskEditModal({ task, onClose, onSave, taskStatusOptions, priorityOptions, t }: TaskEditModalProps) {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title,
      description: formData.description,
      task_status: formData.task_status,
      priority: formData.priority,
      progress: formData.progress,
      due_date: formData.due_date || null,
      start_date: formData.start_date || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : null,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-default rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-default">
            <h2 className="text-xl font-semibold text-primary">
              {t('edit_task') || 'Modifier la tâche'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
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
              <label className="block text-sm font-medium text-secondary mb-1">
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
                <label className="block text-sm font-medium text-secondary mb-1">
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
                <label className="block text-sm font-medium text-secondary mb-1">
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
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('progress') || 'Progression'}: {formData.progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
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
                <label className="block text-sm font-medium text-secondary mb-1">
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
                <label className="block text-sm font-medium text-secondary mb-1">
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
                <label className="block text-sm font-medium text-secondary mb-1">
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
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-secondary hover:text-primary transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
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
    <div className="overflow-x-auto bg-card rounded-xl border border-default">
      <table className="w-full">
        <thead>
          <tr className="border-b border-default">
            <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Tâche</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Statut</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Priorité</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Progression</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Échéance</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Heures</th>
            {canEdit && <th className="text-right py-3 px-4 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>}
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
                  <p className="text-primary font-medium">{task.title}</p>
                  {task.description && (
                    <div 
                      className="text-xs text-muted mt-0.5 line-clamp-1 [&_*]:inline"
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
                  <div className="w-16 h-1.5 bg-hover rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-secondary">{task.progress || 0}%</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`text-sm ${
                  task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed'
                    ? 'text-red-400'
                    : 'text-secondary'
                }`}>
                  {formatDate(task.due_date)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-secondary">
                  {task.actual_hours || 0}/{task.estimated_hours || 0}h
                </span>
              </td>
              {canEdit && (
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(task)}
                      className="p-1.5 text-secondary hover:text-primary hover:bg-hover rounded transition-colors"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(task.documentId)}
                      className="p-1.5 text-secondary hover:text-red-400 hover:bg-hover rounded transition-colors"
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
  getStatusStyle: (status: TaskStatus) => string;
  getPriorityStyle: (priority: TaskPriority) => string;
  taskStatusOptions: TaskStatusOption[];
  projectName?: string;
  t: (key: string) => string;
}

function TaskGanttView({
  tasks,
  onEdit,
  getStatusStyle,
  taskStatusOptions,
  projectName,
  t,
}: TaskGanttViewProps) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'light' | 'dark'>('light');
  const [exportFileName, setExportFileName] = useState(`gantt-${projectName || 'project'}-${new Date().toISOString().split('T')[0]}`);

  // Fonction utilitaire pour normaliser une date à minuit (début de journée)
  const normalizeDate = useCallback((date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);

  // Fonction pour calculer le numéro de semaine ISO
  const getISOWeekNumber = useCallback((date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  // Calculer la plage de dates - normaliser aujourd'hui à minuit
  const today = useMemo(() => normalizeDate(new Date()), [normalizeDate]);
  const tasksWithDates = useMemo(() => tasks.filter(task => task.start_date || task.due_date), [tasks]);

  // Calculer toutes les données du Gantt avec useMemo
  const ganttData = useMemo(() => {
    if (tasksWithDates.length === 0) {
      return null;
    }

    // Trouver les dates min et max - normaliser toutes les dates
    const allDates = tasksWithDates.flatMap(task => [
      task.start_date ? normalizeDate(new Date(task.start_date)) : null,
      task.due_date ? normalizeDate(new Date(task.due_date)) : null,
    ]).filter((d): d is Date => d !== null);

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

    // Trouver l'index du jour d'aujourd'hui dans dayHeaders
    const todayIndex = dayHeaders.findIndex(d => d.getTime() === today.getTime());

    return { minDate, maxDate, totalDays, dayHeaders, weeks, todayIndex };
  }, [tasksWithDates, today, normalizeDate]);

  // Calculer la position d'une tâche (en nombre de jours depuis minDate)
  const getTaskPosition = useCallback((task: ProjectTask) => {
    if (!ganttData) return { startOffset: 0, duration: 1 };
    const { minDate } = ganttData;
    const start = normalizeDate(task.start_date ? new Date(task.start_date) : new Date(task.due_date || today));
    const end = normalizeDate(task.due_date ? new Date(task.due_date) : start);
    
    const startOffset = Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return { startOffset: Math.max(0, startOffset), duration };
  }, [ganttData, normalizeDate, today]);

  const isToday = useCallback((date: Date) => {
    return date.getTime() === today.getTime();
  }, [today]);

  const getStatusColor = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'bg-accent';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500/50';
      default: return 'bg-secondary';
    }
  }, []);

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
      const start = normalizeDate(task.start_date ? new Date(task.start_date) : new Date(task.due_date || today));
      const end = normalizeDate(task.due_date ? new Date(task.due_date) : start);
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
                <span style="display: table-cell; vertical-align: middle; text-align: center; color: #ffffff; font-size: 11px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3); white-space: nowrap; padding: 0 4px;">${task.progress || 0}%</span>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    let datesHTML = '';
    dayHeaders.forEach((day) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isTodayDate = day.getTime() === today.getTime();
      const bgColor = isTodayDate ? colors.accentLight : isWeekend ? colors.bgTertiary : colors.headerBg;
      const textColor = isTodayDate ? colors.accent : colors.headerText;
      datesHTML += `<th style="padding: 4px 2px; text-align: center; font-size: 11px; font-weight: ${isTodayDate ? '700' : '500'}; background: ${bgColor}; color: ${textColor}; min-width: 28px; border-left: 1px solid ${colors.border};">${day.getDate()}</th>`;
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
              <tr style="background: ${colors.headerBg};">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: ${colors.headerText}; text-transform: uppercase; width: 200px; border-bottom: 2px solid ${colors.border}; background: ${colors.headerBg};">
                  ${t('task') || 'Tâche'}
                </th>
                <th style="padding: 0; border-bottom: 2px solid ${colors.border}; background: ${colors.headerBg};">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>${datesHTML}</tr>
                  </table>
                </th>
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
      <div className="text-center py-12 bg-muted rounded-xl border border-default">
        <IconTimeline className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-muted">{t('no_tasks_with_dates_for_gantt') || 'Aucune tâche avec des dates pour afficher le Gantt'}</p>
        <p className="text-xs text-muted mt-1">{t('add_dates_to_tasks') || 'Ajoutez des dates de début et d&apos;échéance à vos tâches'}</p>
      </div>
    );
  }

  const { dayHeaders, weeks, todayIndex, totalDays } = ganttData;

  return (
    <div className="space-y-2">
      {/* Modal de sélection du mode d'export avec aperçu */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-default rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">
                {t('export_pdf') || 'Export PDF'}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 text-secondary hover:text-primary transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Options panel */}
              <div className="w-72 flex-shrink-0 p-4 border-r border-default space-y-4 overflow-y-auto">
                {/* Nom du fichier */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('file_name') || 'Nom du fichier'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={exportFileName}
                      onChange={(e) => setExportFileName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-muted border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-secondary text-sm">.pdf</span>
                  </div>
                </div>

                {/* Thème */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('choose_export_theme') || 'Thème'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportMode('light')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                        exportMode === 'light' 
                          ? 'border-accent bg-accent/10' 
                          : 'border-default bg-muted/50 hover:border-accent/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-800 rounded"></div>
                        </div>
                        <span className="text-xs font-medium text-primary">{t('light') || 'Clair'}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setExportMode('dark')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                        exportMode === 'dark' 
                          ? 'border-accent bg-accent/10' 
                          : 'border-default bg-muted/50 hover:border-accent/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded bg-gray-800 border border-gray-600 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-100 rounded"></div>
                        </div>
                        <span className="text-xs font-medium text-primary">{t('dark') || 'Sombre'}</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleExportPDF(exportMode)}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <IconFileTypePdf className="w-4 h-4" />
                    {isExporting ? (t('exporting') || 'Export...') : (t('export') || 'Exporter')}
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full py-2 px-4 text-sm border border-default rounded-lg text-secondary hover:bg-hover transition-colors"
                  >
                    {t('cancel') || 'Annuler'}
                  </button>
                </div>
              </div>

              {/* Aperçu */}
              <div className="flex-1 p-4 overflow-auto bg-muted/30">
                <p className="text-xs text-muted mb-2 uppercase tracking-wider">{t('preview') || 'Aperçu'}</p>
                <div 
                  className="border !border-default rounded-lg shadow-lg overflow-auto"
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

      {/* Bouton d'export */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowExportModal(true)}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card border border-default rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors disabled:opacity-50"
        >
          <IconFileTypePdf className="w-4 h-4" />
          {isExporting ? (t('exporting') || 'Export...') : (t('export_pdf') || 'Export PDF')}
        </button>
      </div>

      <div className="overflow-x-auto bg-card rounded-xl border border-default" ref={ganttRef}>
        <div className="min-w-[800px]">
          {/* En-tête avec les dates */}
          <div className="flex border-b border-default bg-card">
            <div className="w-48 flex-shrink-0 py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">
              {t('task') || 'Tâche'}
            </div>
          <div className="flex-1 flex">
            {weeks.map((week, i) => (
              <div key={i} style={{ flex: week.days.length }} className="min-w-0">
                <div className="text-xs text-muted text-center py-1 border-b border-default">
                  {t('week_short') || 'Sem.'} {getISOWeekNumber(week.days[0])}
                </div>
                <div className="flex">
                  {week.days.map((day, j) => (
                    <div 
                      key={j}
                      className={`flex-1 text-center py-1 text-xs ${
                        isToday(day) 
                          ? 'bg-accent/20 text-accent font-medium' 
                          : day.getDay() === 0 || day.getDay() === 6
                            ? 'text-muted'
                            : 'text-secondary'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone des tâches avec marqueur aujourd'hui */}
        <div className="relative">
          {/* Ligne de marqueur aujourd'hui */}
          {todayIndex >= 0 && (
            <div 
              className="absolute w-0.5 bg-accent z-20 pointer-events-none"
              style={{
                left: `calc(192px + ((100% - 192px) * ${todayIndex} / ${dayHeaders.length}) + ((100% - 192px) / ${dayHeaders.length} / 2))`,
                top: 0,
                bottom: 0,
              }}
            />
          )}

          {/* Lignes des tâches */}
          {tasks.map((task, index) => {
            const { startOffset, duration } = getTaskPosition(task);
            const widthPercent = (duration / totalDays) * 100;
            const leftPercent = (startOffset / totalDays) * 100;

            return (
              <div 
                key={`${task.documentId}-${index}`}
                className="flex border-b border-muted hover:bg-hover group"
              >
                {/* Nom de la tâche */}
                <div 
                  className="w-48 flex-shrink-0 py-3 px-3 cursor-pointer"
                  onClick={() => onEdit(task)}
                >
                  <p className="text-sm text-primary truncate group-hover:text-accent transition-colors">
                    {task.title}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusStyle(task.task_status)}`}>
                    {taskStatusOptions.find(o => o.value === task.task_status)?.label}
                  </span>
                </div>

                {/* Barre de Gantt */}
                <div className="flex-1 relative py-2">
                  {/* Grille des jours */}
                  <div className="absolute inset-0 flex">
                    {dayHeaders.map((day, i) => (
                      <div 
                        key={i}
                        className={`flex-1 border-l border-muted ${
                          isToday(day) ? 'bg-accent/10' : ''
                        } ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/50' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Barre de la tâche */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer transition-all hover:h-7"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      minWidth: '20px',
                    }}
                    onClick={() => onEdit(task)}
                  >
                    <div className={`w-full h-full ${getStatusColor(task.task_status)} rounded relative overflow-hidden`}>
                      {/* Progression */}
                      <div 
                        className="absolute inset-y-0 left-0 bg-white/20"
                        style={{ width: `${task.progress || 0}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium px-2 truncate">
                        {task.progress || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

