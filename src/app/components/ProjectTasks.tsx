'use client';

import React, { useState, useEffect } from 'react';
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
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchProjectTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  updateTaskStatus,
  updateTaskProgress,
} from '@/lib/api';
import type { ProjectTask, TaskStatus, TaskPriority } from '@/types';

interface ProjectTasksProps {
  projectDocumentId: string;
  userId: number;
  canEdit: boolean;
}

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'todo', label: 'À faire', color: 'zinc', icon: <IconClock className="w-4 h-4" /> },
  { value: 'in_progress', label: 'En cours', color: 'blue', icon: <IconProgress className="w-4 h-4" /> },
  { value: 'completed', label: 'Terminé', color: 'emerald', icon: <IconCheck className="w-4 h-4" /> },
  { value: 'cancelled', label: 'Annulé', color: 'red', icon: <IconX className="w-4 h-4" /> },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Basse', color: 'zinc' },
  { value: 'medium', label: 'Moyenne', color: 'blue' },
  { value: 'high', label: 'Haute', color: 'amber' },
  { value: 'urgent', label: 'Urgente', color: 'red' },
];

type ViewMode = 'cards' | 'table' | 'gantt';

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: 'cards', label: 'Cartes', icon: <IconLayoutCards className="w-4 h-4" /> },
  { value: 'table', label: 'Tableau', icon: <IconTable className="w-4 h-4" /> },
  { value: 'gantt', label: 'Gantt', icon: <IconTimeline className="w-4 h-4" /> },
];

export default function ProjectTasks({ projectDocumentId, userId, canEdit }: ProjectTasksProps) {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

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
    priority: 'medium' as TaskPriority,
    due_date: '',
    estimated_hours: '',
  });

  useEffect(() => {
    loadTasks();
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
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        created_user: userId,
        order: tasks.length,
      });

      showGlobalPopup(t('task_created') || 'Tâche créée avec succès', 'success');
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', estimated_hours: '' });
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

  const handleProgressChange = async (taskDocumentId: string, progress: number) => {
    try {
      await updateTaskProgress(taskDocumentId, progress);
      loadTasks();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

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
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <IconProgress className="w-5 h-5 text-emerald-400" />
            {t('project_tasks') || 'Tâches du projet'}
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {taskStats.completed}/{taskStats.total} {t('tasks_completed') || 'tâches terminées'} • {overallProgress}% {t('progress') || 'progression'}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <IconPlus className="w-4 h-4" />
            {t('add_task') || 'Nouvelle tâche'}
          </button>
        )}
      </div>

      {/* Barre de progression globale */}
      {tasks.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">{t('overall_progress') || 'Progression globale'}</span>
            <span className="text-sm font-medium text-emerald-400">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
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
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
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
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {option.icon}
                {option.label} ({tasks.filter(t => t.task_status === option.value).length})
              </button>
            ))}
          </div>

          {/* Sélecteur de vue */}
          <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg">
            {VIEW_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === option.value
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
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
            className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-zinc-200">{t('new_task') || 'Nouvelle tâche'}</h4>
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200"
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
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />

              <textarea
                placeholder={t('task_description') || 'Description (optionnel)'}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">{t('priority') || 'Priorité'}</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    {PRIORITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">{t('due_date') || 'Échéance'}</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">{t('estimated_hours') || 'Heures estimées'}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={!newTask.title.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {t('create') || 'Créer'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Liste des tâches selon la vue */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-zinc-800/30 rounded-xl">
          <IconProgress className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">
            {filter === 'all' 
              ? (t('no_tasks') || 'Aucune tâche pour ce projet')
              : (t('no_tasks_filter') || 'Aucune tâche avec ce statut')}
          </p>
          {canEdit && filter === 'all' && (
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors inline-flex items-center gap-2"
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
  t: _t,
}: TaskCardProps) {
  void _t; // Utilisé pour éviter l'erreur de lint
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-zinc-800/50 border rounded-xl overflow-hidden transition-colors ${
        isOverdue ? 'border-red-500/50' : 'border-zinc-700/50'
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
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-zinc-600 hover:border-emerald-500'
            } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {task.task_status === 'completed' && <IconCheck className="w-4 h-4" />}
          </button>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium ${
                task.task_status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'
              }`}>
                {task.title}
              </h4>
              
              {/* Badge priorité */}
              <IconFlag className={`w-4 h-4 ${getPriorityStyle(task.priority)}`} />
              
              {/* Badge statut */}
              <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusStyle(task.task_status)}`}>
                {TASK_STATUS_OPTIONS.find(o => o.value === task.task_status)?.label}
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
                <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    className={`h-full rounded-full ${
                      task.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-10">{task.progress}%</span>
              </div>
            )}

            {/* Dates */}
            {(task.due_date || task.estimated_hours) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
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
                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                >
                  <IconEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
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
              className="mt-3 pt-3 border-t border-zinc-700/50"
            >
              <p className="text-sm text-zinc-400 whitespace-pre-wrap">{task.description}</p>
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
            value={task.progress}
            onChange={(e) => onProgressChange(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
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
  t: (key: string) => string;
}

function TaskEditModal({ task, onClose, onSave, t }: TaskEditModalProps) {
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
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-100">
              {t('edit_task') || 'Modifier la tâche'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                {t('title') || 'Titre'} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                {t('description') || 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('status') || 'Statut'}
                </label>
                <select
                  value={formData.task_status}
                  onChange={(e) => setFormData({ ...formData, task_status: e.target.value as TaskStatus })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {TASK_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('priority') || 'Priorité'}
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
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
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('start_date') || 'Date de début'}
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('due_date') || 'Échéance'}
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('estimated_hours') || 'Heures estimées'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('actual_hours') || 'Heures réelles'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
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
  t: _t,
}: TaskTableViewProps) {
  void _t; // Utilisé pour éviter l'erreur de lint
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tâche</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Statut</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Priorité</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Progression</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Échéance</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Heures</th>
            {canEdit && <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {tasks.map((task, index) => (
            <tr 
              key={`${task.documentId}-${index}`}
              className="hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="text-zinc-200 font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{task.description}</p>
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
                    {TASK_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(task.task_status)}`}>
                    {TASK_STATUS_OPTIONS.find(o => o.value === task.task_status)?.label}
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityStyle(task.priority)}`}>
                  {PRIORITY_OPTIONS.find(o => o.value === task.priority)?.label}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{task.progress || 0}%</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`text-sm ${
                  task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'completed'
                    ? 'text-red-400'
                    : 'text-zinc-400'
                }`}>
                  {formatDate(task.due_date)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-zinc-400">
                  {task.actual_hours || 0}/{task.estimated_hours || 0}h
                </span>
              </td>
              {canEdit && (
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(task)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(task.documentId)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
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
  t: (key: string) => string;
}

function TaskGanttView({
  tasks,
  onEdit,
  getStatusStyle,
}: TaskGanttViewProps) {
  // Calculer la plage de dates
  const today = new Date();
  const tasksWithDates = tasks.filter(t => t.start_date || t.due_date);
  
  if (tasksWithDates.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-800/30 rounded-xl">
        <IconTimeline className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500">Aucune tâche avec des dates pour afficher le Gantt</p>
        <p className="text-xs text-zinc-600 mt-1">Ajoutez des dates de début et d&apos;échéance à vos tâches</p>
      </div>
    );
  }

  // Trouver les dates min et max
  const allDates = tasksWithDates.flatMap(t => [
    t.start_date ? new Date(t.start_date) : null,
    t.due_date ? new Date(t.due_date) : null,
  ]).filter((d): d is Date => d !== null);

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime()), today.getTime()));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime()), today.getTime()));
  
  // Ajouter quelques jours de marge
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Générer les en-têtes de colonnes (jours)
  const dayHeaders: Date[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(minDate);
    date.setDate(date.getDate() + i);
    dayHeaders.push(date);
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

  const getTaskPosition = (task: ProjectTask) => {
    const start = task.start_date ? new Date(task.start_date) : new Date(task.due_date || today);
    const end = task.due_date ? new Date(task.due_date) : start;
    
    const startOffset = Math.max(0, Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return { startOffset, duration };
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500/50';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* En-tête avec les dates */}
        <div className="flex border-b border-zinc-800">
          <div className="w-48 flex-shrink-0 py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Tâche
          </div>
          <div className="flex-1 flex">
            {weeks.map((week, i) => (
              <div key={i} className="flex-1 min-w-0">
                <div className="text-xs text-zinc-500 text-center py-1 border-b border-zinc-800/50">
                  Sem. {Math.ceil((week.start.getTime() - new Date(week.start.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}
                </div>
                <div className="flex">
                  {week.days.map((day, j) => (
                    <div 
                      key={j}
                      className={`flex-1 text-center py-1 text-xs ${
                        isToday(day) 
                          ? 'bg-emerald-500/20 text-emerald-400 font-medium' 
                          : day.getDay() === 0 || day.getDay() === 6
                            ? 'text-zinc-600'
                            : 'text-zinc-500'
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

        {/* Lignes des tâches */}
        {tasks.map((task, index) => {
          const { startOffset, duration } = getTaskPosition(task);
          const widthPercent = (duration / totalDays) * 100;
          const leftPercent = (startOffset / totalDays) * 100;

          return (
            <div 
              key={`${task.documentId}-${index}`}
              className="flex border-b border-zinc-800/50 hover:bg-zinc-800/20 group"
            >
              {/* Nom de la tâche */}
              <div 
                className="w-48 flex-shrink-0 py-3 px-3 cursor-pointer"
                onClick={() => onEdit(task)}
              >
                <p className="text-sm text-zinc-300 truncate group-hover:text-emerald-400 transition-colors">
                  {task.title}
                </p>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusStyle(task.task_status)}`}>
                  {TASK_STATUS_OPTIONS.find(o => o.value === task.task_status)?.label}
                </span>
              </div>

              {/* Barre de Gantt */}
              <div className="flex-1 relative py-2">
                {/* Grille des jours */}
                <div className="absolute inset-0 flex">
                  {dayHeaders.map((day, i) => (
                    <div 
                      key={i}
                      className={`flex-1 border-l border-zinc-800/30 ${
                        isToday(day) ? 'bg-emerald-500/10' : ''
                      } ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-zinc-800/20' : ''}`}
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

        {/* Ligne de marqueur aujourd'hui */}
        <div className="relative h-0">
          <div 
            className="absolute top-0 w-0.5 bg-emerald-500 z-10"
            style={{
              left: `calc(192px + ${((today.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100}% * (100% - 192px) / 100%)`,
              height: `${tasks.length * 52}px`,
              transform: 'translateY(-100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

