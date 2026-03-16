'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlus,
  IconCheck,
  IconClock,
  IconTrash,
  IconEdit,
  IconCalendar,
  IconUpload,
  IconSparkles,
  IconList,
  IconLayoutGrid,
  IconX,
  IconSubtask,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchProjectTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  updateTaskStatus,
} from '@/lib/api';
import type { ProjectTask, TaskStatus } from '@/types';
import { calculateParentTaskState } from '@/utils/dataCoherence';
import ExcelImportModal, { type ImportedTask } from './ExcelImportModal';
import AITaskGenerator, { type GeneratedTask } from './AITaskGenerator';
import RichTextEditor from './RichTextEditor';

const TASK_COLORS = [
  '#e5381a', '#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#06b6d4', '#ec4899', '#84cc16',
];

interface Collaborator {
  documentId: string;
  user?: { id: number; documentId: string; username?: string; email?: string };
  is_owner?: boolean;
}

interface TaskSectionRedesignProps {
  projectDocumentId: string;
  projectName?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  userId: number;
  canEdit: boolean;
  collaborators?: Collaborator[];
  ownerInfo?: { id: number; documentId: string; username?: string; email?: string };
  onTaskAssigned?: (taskTitle: string, assignedTo: { email: string; username: string }) => void;
  onAllTasksCompleted?: () => void;
}

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'completed' | 'late';

export default function TaskSectionRedesign({
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
}: TaskSectionRedesignProps) {
  void onTaskAssigned; // réservé pour usage futur
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'edit' | 'subtasks'>('edit');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFocused, setNewTaskFocused] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const allMembers = useMemo(() => {
    const m: { id: number; documentId: string; username: string; email: string }[] = [];
    if (ownerInfo) m.push({ id: ownerInfo.id, documentId: ownerInfo.documentId, username: ownerInfo.username || 'Propriétaire', email: ownerInfo.email || '' });
    collaborators.forEach((c) => {
      if (c.user && !c.is_owner) m.push({ id: c.user.id, documentId: c.user.documentId, username: c.user.username || '', email: c.user.email || '' });
    });
    return m;
  }, [ownerInfo, collaborators]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProjectTasks(projectDocumentId);
      setTasks(res.data || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectDocumentId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const rootTasks = useMemo(() => tasks.filter((t) => !t.parent_task), [tasks]);
  const filteredTasks = useMemo(() => {
    if (filter === 'all') return rootTasks;
    if (filter === 'late') return rootTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date());
    return rootTasks.filter((t) => t.task_status === filter);
  }, [rootTasks, filter]);

  const doneCount = rootTasks.filter((t) => t.task_status === 'completed').length;
  const globalPct = rootTasks.length > 0 ? Math.round((doneCount / rootTasks.length) * 100) : 0;

  const syncParentFromSubtasks = async (parentDocId: string) => {
    try {
      const res = await fetchProjectTasks(projectDocumentId);
      const fresh = res.data || [];
      const parent = fresh.find((t) => t.documentId === parentDocId);
      const subtasks = fresh.filter((t) => t.parent_task?.documentId === parentDocId);
      if (!parent || subtasks.length === 0) return;
      const { status, progress } = calculateParentTaskState(subtasks);
      await updateProjectTask(parentDocId, { task_status: status, progress });
      await loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleDone = async (e: React.MouseEvent, task: ProjectTask) => {
    e.stopPropagation();
    if (!canEdit) return;
    const next = task.task_status === 'completed' ? 'todo' : 'completed';
    try {
      await updateTaskStatus(task.documentId, next);
      const res = await fetchProjectTasks(projectDocumentId);
      const fresh = res.data || [];
      setTasks(fresh);
      const roots = fresh.filter((t) => !t.parent_task);
      if (next === 'completed' && roots.length > 0 && roots.every((t) => t.task_status === 'completed')) {
        onAllTasksCompleted?.();
      }
      showGlobalPopup(next === 'completed' ? 'Tâche terminée ✓' : 'Tâche réouverte', 'success');
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleStatusChange = async (task: ProjectTask, status: TaskStatus) => {
    if (!canEdit) return;
    try {
      await updateTaskStatus(task.documentId, status);
      await loadTasks();
      showGlobalPopup('Statut mis à jour', 'success');
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleSaveTask = async (
    task: ProjectTask,
    updates: {
      title?: string;
      description?: string;
      task_status?: TaskStatus;
      due_date?: string | null;
      estimated_hours?: number | null;
      assignedToDocId?: string;
    }
  ) => {
    if (!canEdit) return;
    try {
      await updateProjectTask(task.documentId, {
        title: updates.title,
        description: updates.description,
        task_status: updates.task_status,
        due_date: updates.due_date ?? null,
        estimated_hours: updates.estimated_hours ?? null,
        assigned_to: updates.assignedToDocId ? allMembers.find((m) => m.documentId === updates.assignedToDocId)?.id ?? null : null,
      });
      await loadTasks();
      showGlobalPopup('Modifications sauvegardées', 'success');
      setExpandedId(null);
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, task: ProjectTask) => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await deleteProjectTask(task.documentId);
      await loadTasks();
      showGlobalPopup('Tâche supprimée', 'success');
      if (expandedId === task.documentId) setExpandedId(null);
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !canEdit) return;
    try {
      await createProjectTask({
        project: projectDocumentId,
        title,
        created_user: userId,
        order: tasks.length,
      });
      setNewTaskTitle('');
      await loadTasks();
      showGlobalPopup(`"${title}" ajoutée`, 'success');
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleExcelImport = async (
    imported: ImportedTask[],
    _opts: { sendNotificationEmails: boolean },
    onProgress?: (current: number, total: number, taskTitle: string) => void
  ) => {
    for (let i = 0; i < imported.length; i++) {
      const it = imported[i];
      onProgress?.(i + 1, imported.length, it.title);
      await createProjectTask({
        project: projectDocumentId,
        title: it.title,
        description: it.description,
        task_status: it.task_status,
        priority: it.priority,
        progress: it.progress,
        start_date: it.start_date,
        due_date: it.due_date,
        estimated_hours: it.estimated_hours,
        created_user: userId,
        assigned_to: it.assigned_to ? allMembers.find((m) => m.documentId === it.assigned_to)?.id : undefined,
        order: tasks.length + i,
        color: it.color || TASK_COLORS[0],
      });
    }
    await loadTasks();
    showGlobalPopup(`${imported.length} tâche(s) importée(s)`, 'success');
    setShowExcelImport(false);
  };

  const handleAITasksGenerated = async (generated: GeneratedTask[]) => {
    const selected = generated.filter((g) => g.selected);
    for (const g of selected) {
      await createProjectTask({
        project: projectDocumentId,
        title: g.title,
        description: g.description,
        task_status: 'todo',
        priority: g.priority || 'medium',
        estimated_hours: g.estimated_hours ?? null,
        start_date: g.start_date || null,
        due_date: g.due_date || null,
        created_user: userId,
        order: tasks.length,
      });
    }
    await loadTasks();
    showGlobalPopup(`${selected.length} tâche(s) créée(s)`, 'success');
    setShowAIGenerator(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="!text-base font-semibold !text-primary flex items-center gap-2">
            <IconClock className="w-4 h-4 !text-muted" />
            {t('project_tasks') || 'Tâches du projet'}
          </h3>
          <p className="font-mono !text-[11px] !text-muted mt-0.5">
            {doneCount}/{rootTasks.length} terminées · {globalPct}% progression
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setShowExcelImport(true)}
                className="flex items-center gap-1.5 px-3.5 py-2  !text-xs font-medium bg-card border border-default !text-muted hover:border-[#ccc8c2] hover:!text-primary transition-colors"
              >
                <IconUpload className="w-3.5 h-3.5" />
                Importer
              </button>
              <button
                type="button"
                onClick={() => setShowAIGenerator(true)}
                className="flex items-center gap-1.5 px-3.5 py-2  !text-xs font-medium bg-card border border-default !text-primary font-semibold hover:border-primary transition-colors"
              >
                <IconSparkles className="w-3.5 h-3.5" />
                Assistant IA Eclipse
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('newTaskInput')?.focus()}
                className="flex items-center gap-1.5 px-3.5 py-2  !text-xs font-medium bg-primary !text-white hover:opacity-90 transition-opacity"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Nouvelle tâche
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border border-default  py-3.5 px-5 flex items-center gap-4">
        <span className="!text-[13px] font-medium !text-muted whitespace-nowrap">Progression globale</span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${globalPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="font-mono !text-xs font-medium !text-success whitespace-nowrap">{globalPct}%</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'todo', 'in_progress', 'completed', 'late'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md border font-mono !text-[11px] transition-colors ${
              filter === f
                ? 'bg-primary border-primary !text-white'
                : 'bg-card border-default !text-muted hover:border-[#ccc8c2] hover:!text-primary'
            }`}
          >
            {f === 'all' && `Toutes (${rootTasks.length})`}
            {f === 'todo' && `À faire (${rootTasks.filter((t) => t.task_status === 'todo').length})`}
            {f === 'in_progress' && `En cours (${rootTasks.filter((t) => t.task_status === 'in_progress').length})`}
            {f === 'completed' && `Terminé (${doneCount})`}
            {f === 'late' && `En retard (${rootTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date()).length})`}
          </button>
        ))}
        <div className="w-px h-5 bg-default mx-1" />
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
              viewMode === 'list' ? 'bg-primary border-primary !text-white' : 'bg-card border-default !text-muted hover:!text-primary'
            }`}
            title="Liste"
          >
            <IconList className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
              viewMode === 'kanban' ? 'bg-primary border-primary !text-white' : 'bg-card border-default !text-muted hover:!text-primary'
            }`}
            title="Kanban"
          >
            <IconLayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task list */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, i) => (
              <TaskCardRedesign
                key={task.documentId}
                task={task}
                tasks={tasks}
                canEdit={canEdit}
                allMembers={allMembers}
                isExpanded={expandedId === task.documentId}
                expandedTab={expandedTab}
                onToggleExpand={() => {
                  if (expandedId === task.documentId) {
                    setExpandedId(null);
                  } else {
                    setExpandedId(task.documentId);
                    setExpandedTab('edit');
                  }
                }}
                onSwitchTab={setExpandedTab}
                onToggleDone={handleToggleDone}
                onStatusChange={handleStatusChange}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                onAddSubtask={async (title) => {
                  if (!title.trim()) return;
                  await createProjectTask({
                    project: projectDocumentId,
                    title: title.trim(),
                    created_user: userId,
                    order: task.subtasks?.length ?? 0,
                    parent_task: task.documentId,
                    color: task.color || TASK_COLORS[0],
                  });
                  await loadTasks();
                  await syncParentFromSubtasks(task.documentId);
                }}
                onSubtaskToggle={async (st) => {
                  const next = st.task_status === 'completed' ? 'todo' : 'completed';
                  await updateTaskStatus(st.documentId, next);
                  await loadTasks();
                  await syncParentFromSubtasks(task.documentId);
                }}
                onSubtaskDelete={async (st) => {
                  await deleteProjectTask(st.documentId);
                  await loadTasks();
                  await syncParentFromSubtasks(task.documentId);
                }}
                t={t}
                animateIndex={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="!text-muted !text-sm py-8 text-center">
          Vue Kanban à intégrer (affichage liste pour l&apos;instant)
        </div>
      )}

      {/* New task row */}
      {canEdit && (
        <div
          className={`flex items-center gap-3 p-3 bg-card border-2 border-dashed  cursor-text transition-colors ${
            newTaskFocused || newTaskTitle ? 'border-primary' : 'border-default hover:border-[#ccc8c2]'
          }`}
        >
          <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#ccc8c2] flex-shrink-0 opacity-40" />
          <input
            id="newTaskInput"
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onFocus={() => setNewTaskFocused(true)}
            onBlur={() => setNewTaskFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') {
                setNewTaskTitle('');
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Ajouter une tâche… (appuyez sur Entrée)"
            className="flex-1 border-none bg-transparent font-sans !text-sm font-medium !text-primary outline-none placeholder:!text-muted2"
          />
          {(newTaskFocused || newTaskTitle) && (
            <div className="flex items-center gap-2">
              <span className="font-mono !text-[10px] !text-muted2">↵ confirmer · Esc annuler</span>
              <button
                type="button"
                onClick={() => {
                  setNewTaskTitle('');
                  document.getElementById('newTaskInput')?.blur();
                }}
                className="px-2.5 py-1 rounded-md !text-[11px] font-medium bg-secondary border border-default !text-muted hover:!text-primary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                className="px-3 py-1 rounded-md !text-[11px] font-medium bg-primary !text-white hover:opacity-90"
              >
                Ajouter
              </button>
            </div>
          )}
        </div>
      )}

      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImport={handleExcelImport}
        projectDocumentId={projectDocumentId}
        projectName={projectName}
        projectUrl={typeof window !== 'undefined' ? window.location.origin : ''}
        collaborators={allMembers}
      />
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

interface TaskCardRedesignProps {
  task: ProjectTask;
  tasks: ProjectTask[];
  canEdit: boolean;
  allMembers: { id: number; documentId: string; username: string; email: string }[];
  isExpanded: boolean;
  expandedTab: 'edit' | 'subtasks';
  onToggleExpand: () => void;
  onSwitchTab: (tab: 'edit' | 'subtasks') => void;
  onToggleDone: (e: React.MouseEvent, task: ProjectTask) => void;
  onStatusChange: (task: ProjectTask, status: TaskStatus) => void;
  onSave: (
    task: ProjectTask,
    updates: {
      title?: string;
      description?: string;
      task_status?: TaskStatus;
      due_date?: string | null;
      estimated_hours?: number | null;
      assignedToDocId?: string;
    }
  ) => void;
  onDelete: (e: React.MouseEvent, task: ProjectTask) => void;
  onAddSubtask: (title: string) => Promise<void>;
  onSubtaskToggle: (st: ProjectTask) => Promise<void>;
  onSubtaskDelete: (st: ProjectTask) => Promise<void>;
  t: (key: string) => string;
  animateIndex: number;
}

function TaskCardRedesign({
  task,
  tasks,
  canEdit,
  allMembers,
  isExpanded,
  expandedTab,
  onToggleExpand,
  onSwitchTab,
  onToggleDone,
  onStatusChange,
  onSave,
  onDelete,
  onAddSubtask,
  onSubtaskToggle,
  onSubtaskDelete,
  t,
  animateIndex,
}: TaskCardRedesignProps) {
  void onStatusChange;
  void t;
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.task_status);
  const [editDueDate, setEditDueDate] = useState(task.due_date?.split('T')[0] || '');
  const [editEstimated, setEditEstimated] = useState(task.estimated_hours?.toString() || '');
  const [editAssigned, setEditAssigned] = useState(task.assigned_to?.documentId || '');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatus(task.task_status);
    setEditDueDate(task.due_date?.split('T')[0] || '');
    setEditEstimated(task.estimated_hours?.toString() || '');
    setEditAssigned(task.assigned_to?.documentId || '');
  }, [task.documentId, task.title, task.description, task.task_status, task.due_date, task.estimated_hours, task.assigned_to?.documentId]);
  const [subtaskInputFocused, setSubtaskInputFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const subtasks = tasks.filter((t) => t.parent_task?.documentId === task.documentId);
  const doneSt = subtasks.filter((s) => s.task_status === 'completed').length;
  const stPct = subtasks.length > 0 ? Math.round((doneSt / subtasks.length) * 100) : 0;
  const badgeLabel = task.task_status === 'todo' ? 'À faire' : task.task_status === 'in_progress' ? 'En cours' : 'Terminé';
  const badgeClass =
    task.task_status === 'todo'
      ? 'bg-secondary border-default !text-muted'
      : task.task_status === 'in_progress'
        ? 'bg-blue-500/10 border-blue-500/20 !text-blue-600'
        : 'bg-green-500/10 border-green-500/20 !text-green-600';
  const isLate = task.due_date && new Date(task.due_date) < new Date();

  const handleSave = async () => {
    setSaving(true);
    await onSave(task, {
      title: editTitle,
      description: editDescription,
      task_status: editStatus,
      due_date: editDueDate || null,
      estimated_hours: editEstimated ? parseFloat(editEstimated) : null,
      assignedToDocId: editAssigned || undefined,
    });
    setSaving(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: animateIndex * 0.05 }}
      className={`bg-card border border-default  overflow-hidden transition-all ${
        isExpanded ? 'border-[#ccc8c2] shadow-lg' : 'hover:border-[#ccc8c2]'
      }`}
    >
      <div className="flex items-center gap-3 py-3.5 px-4 cursor-pointer" onClick={onToggleExpand}>
        <button
          type="button"
          className={`w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center transition-colors border-[1.5px] ${
            task.task_status === 'completed'
              ? 'bg-green-500 border-green-500'
              : 'border-[#ccc8c2] hover:border-green-500 hover:bg-green-500/10'
          }`}
          onClick={(e) => onToggleDone(e, task)}
        >
          {task.task_status === 'completed' && <IconCheck className="w-2.5 h-2.5 !text-white" strokeWidth={3} />}
        </button>
        <div
          className="w-[3px] h-8 rounded-full flex-shrink-0"
          style={{ background: task.color || TASK_COLORS[0] }}
        />
        <div className="flex-1 min-w-0">
          <div className={`!text-sm font-medium !text-primary mb-1 flex items-center gap-2 flex-wrap ${task.task_status === 'completed' ? 'line-through !text-muted' : ''}`}>
            {task.title}
            <span className={`font-mono !text-[10px] px-1.5 py-0.5 rounded border ${badgeClass}`}>{badgeLabel}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {task.due_date && (
              <span className={`flex items-center gap-1 font-mono !text-[11px] !text-muted ${isLate ? '!text-red-600' : ''}`}>
                <IconCalendar className="w-[11px] h-[11px]" />
                {new Date(task.due_date).toLocaleDateString('fr-FR')}
              </span>
            )}
            {task.estimated_hours != null && (
              <span className="flex items-center gap-1 font-mono !text-[11px] !text-muted">
                <IconClock className="w-[11px] h-[11px]" />
                {task.estimated_hours}h
              </span>
            )}
            {isLate && (
              <span className="flex items-center gap-1 font-mono !text-[11px] !text-red-600">
                <IconClock className="w-[11px] h-[11px]" />
                En retard
              </span>
            )}
            <span className="font-mono !text-[11px] !text-muted">
              {doneSt}/{subtasks.length} sous-tâches
            </span>
          </div>
        </div>
        <span className="font-mono !text-[11px] !text-muted flex-shrink-0 mr-2">{task.progress}%</span>
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchTab('edit');
                onToggleExpand();
              }}
              className="w-7 h-7 rounded-md border border-transparent flex items-center justify-center !text-muted hover:bg-secondary hover:border-default hover:!text-primary"
              title="Modifier"
            >
              <IconEdit className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchTab('subtasks');
                onToggleExpand();
              }}
              className="w-7 h-7 rounded-md border border-transparent flex items-center justify-center !text-muted hover:bg-secondary hover:border-default hover:!text-primary"
              title="Sous-tâches"
            >
              <IconSubtask className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => onDelete(e, task)}
              className="w-7 h-7 rounded-md border border-transparent flex items-center justify-center !text-muted hover:bg-red-500/10 hover:border-red-500/20 hover:!text-red-600"
              title="Supprimer"
            >
              <IconTrash className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-default overflow-hidden"
          >
            <div className="flex border-b border-default px-4">
              <button
                type="button"
                onClick={() => onSwitchTab('edit')}
                className={`py-2.5 px-3.5 !text-xs font-medium flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
                  expandedTab === 'edit' ? '!text-primary border-primary' : '!text-muted border-transparent hover:!text-primary'
                }`}
              >
                <IconEdit className="w-3 h-3" /> Modifier
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab('subtasks')}
                className={`py-2.5 px-3.5 !text-xs font-medium flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
                  expandedTab === 'subtasks' ? '!text-primary border-primary' : '!text-muted border-transparent hover:!text-primary'
                }`}
              >
                <IconSubtask className="w-3 h-3" /> Sous-tâches{' '}
                <span className={`px-1 py-0 rounded border text-[10px] ${expandedTab === 'subtasks' ? 'bg-primary border-primary !text-white' : 'bg-secondary border-default !text-muted'}`}>
                  {subtasks.length}
                </span>
              </button>
            </div>

            {expandedTab === 'edit' && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="font-mono !text-[10px] !text-muted2 uppercase tracking-wider block mb-1">Titre</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-card border border-default  px-3 py-2 !text-sm font-medium !text-primary outline-none focus:border-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-mono !text-[10px] !text-muted2 uppercase tracking-wider block mb-1">Description</label>
                    <RichTextEditor
                      value={editDescription}
                      onChange={setEditDescription}
                      placeholder="Ajouter une description…"
                      minHeight="72px"
                      maxHeight="200px"
                    />
                  </div>
                  <div>
                    <label className="font-mono !text-[10px] !text-muted2 uppercase tracking-wider block mb-1">Statut</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditStatus(s)}
                          className={`px-3 py-1.5 rounded-md border font-mono !text-[11px] transition-colors ${
                            editStatus === s
                              ? s === 'todo'
                                ? 'bg-secondary border-[#ccc8c2] !text-primary'
                                : s === 'in_progress'
                                  ? 'bg-blue-500/10 border-blue-500/30 !text-blue-600'
                                  : 'bg-green-500/10 border-green-500/30 !text-green-600'
                              : 'bg-card border-default !text-muted hover:border-[#ccc8c2] hover:!text-primary'
                          }`}
                        >
                          {s === 'todo' ? 'À faire' : s === 'in_progress' ? 'En cours' : 'Terminé'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-mono !text-[10px] !text-muted2 uppercase tracking-wider block mb-1">Échéance</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-card border border-default  px-3 py-2 !text-[13px] !text-primary outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="font-mono !text-[10px] !text-muted2 uppercase tracking-wider block mb-1">Estimation</label>
                    <input
                      value={editEstimated}
                      onChange={(e) => setEditEstimated(e.target.value)}
                      placeholder="Ex: 10h"
                      className="w-full bg-card border border-default  px-3 py-2 !text-[13px] !text-primary outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="font-mono !text-[10px] !text-muted2 uppercase tracking-wider block mb-1">Assigné à</label>
                    <select
                      value={editAssigned}
                      onChange={(e) => setEditAssigned(e.target.value)}
                      className="w-full bg-card border border-default  px-3 py-2 !text-[13px] !text-primary outline-none focus:border-primary appearance-none cursor-pointer"
                    >
                      <option value="">Non assigné</option>
                      {allMembers.map((m) => (
                        <option key={m.documentId} value={m.documentId}>
                          {m.username || m.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-default mt-1">
                  <button
                    type="button"
                    onClick={() => onToggleExpand()}
                    className="px-4 py-2 !text-primary hover:!text-primary transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary !text-white  font-medium !text-xs hover:opacity-90 disabled:opacity-50"
                  >
                    <IconCheck className="w-3.5 h-3.5" /> Sauvegarder
                  </button>
                </div>
              </div>
            )}

            {expandedTab === 'subtasks' && (
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="font-mono !text-[11px] !text-muted whitespace-nowrap">{doneSt}/{subtasks.length}</span>
                  <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all" style={{ width: `${stPct}%` }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mb-2.5">
                  {subtasks.length === 0 ? (
                    <div className="!text-center py-5 !text-muted2 font-mono !text-xs">Aucune sous-tâche · ajoutez-en ci-dessous</div>
                  ) : (
                    subtasks.map((st) => (
                      <div
                        key={st.documentId}
                        className="flex items-center gap-2.5 py-2 px-3 bg-card border border-default  hover:border-[#ccc8c2] transition-colors group"
                      >
                        <button
                          type="button"
                          className={`w-[15px] h-[15px] rounded-full flex-shrink-0 flex items-center justify-center transition-colors border-[1.5px] ${
                            st.task_status === 'completed' ? 'bg-green-500 border-green-500' : 'border-[#ccc8c2] hover:border-green-500 hover:bg-green-500/10'
                          }`}
                          onClick={() => onSubtaskToggle(st)}
                        >
                          {st.task_status === 'completed' && <IconCheck className="w-2 h-2 !text-white" strokeWidth={3} />}
                        </button>
                        <span className={`flex-1 !text-[13px] !text-primary ${st.task_status === 'completed' ? 'line-through !text-muted' : ''}`}>{st.title}</span>
                        <button
                          type="button"
                          onClick={() => onSubtaskDelete(st)}
                          className="w-6 h-6 rounded flex items-center justify-center !text-muted2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:!text-red-600 transition-all"
                        >
                          <IconX className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {canEdit && (
                  <div className={`flex items-center gap-2.5 py-2 px-3 border-2 border-dashed  cursor-text transition-colors ${subtaskInputFocused || newSubtaskTitle ? 'border-[#ccc8c2] bg-card' : 'border-default hover:border-[#ccc8c2]'}`}>
                    <div className="w-[15px] h-[15px] rounded-full border-[1.5px] border-dashed border-[#ccc8c2] flex items-center justify-center flex-shrink-0 !text-muted2">
                      <IconPlus className="w-2 h-2" />
                    </div>
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onFocus={() => setSubtaskInputFocused(true)}
                      onBlur={() => setSubtaskInputFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onAddSubtask(newSubtaskTitle);
                          setNewSubtaskTitle('');
                        }
                        if (e.key === 'Escape') setNewSubtaskTitle('');
                      }}
                      placeholder="Ajouter une sous-tâche… (Entrée pour valider)"
                      className="flex-1 border-none bg-transparent !text-[13px] !text-primary outline-none placeholder:!text-muted2"
                    />
                    {(subtaskInputFocused || newSubtaskTitle) && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onAddSubtask(newSubtaskTitle);
                            setNewSubtaskTitle('');
                          }}
                          className="px-2.5 py-1 rounded-md font-mono !text-[11px] font-medium bg-primary !text-white hover:opacity-90"
                        >
                          Ajouter
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewSubtaskTitle('')}
                          className="px-2.5 py-1 rounded-md font-mono !text-[11px] font-medium bg-secondary border border-default !text-muted hover:!text-primary"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[3px] bg-secondary overflow-hidden rounded-b-xl">
        <div
          className="h-full rounded-b-xl transition-[width] duration-400"
          style={{ width: `${task.progress}%`, background: task.color || TASK_COLORS[0] }}
        />
      </div>
    </motion.div>
  );
}

/** Vue liste redesign pour intégration dans ProjectTasks (useListRedesign) */
export interface TaskListRedesignViewProps {
  tasks: ProjectTask[];
  filteredTasks: ProjectTask[];
  canEdit: boolean;
  projectDocumentId: string;
  userId: number;
  allMembers: { id: number; documentId: string; username: string; email: string }[];
  loadTasks: () => Promise<void>;
  onAllTasksCompleted?: () => void;
  t: (key: string) => string;
}

export function TaskListRedesignView({
  tasks,
  filteredTasks,
  canEdit,
  projectDocumentId,
  userId,
  allMembers,
  loadTasks,
  onAllTasksCompleted,
  t,
}: TaskListRedesignViewProps) {
  const { showGlobalPopup } = usePopup();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'edit' | 'subtasks'>('edit');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFocused, setNewTaskFocused] = useState(false);

  const rootTasks = useMemo(() => tasks.filter((x) => !x.parent_task), [tasks]);
  const doneCount = rootTasks.filter((t) => t.task_status === 'completed').length;
  const globalPct = rootTasks.length > 0 ? Math.round((doneCount / rootTasks.length) * 100) : 0;

  const syncParentFromSubtasks = useCallback(
    async (parentDocId: string) => {
      try {
        const res = await fetchProjectTasks(projectDocumentId);
        const fresh = res.data || [];
        const parent = fresh.find((x) => x.documentId === parentDocId);
        const subtasks = fresh.filter((x) => x.parent_task?.documentId === parentDocId);
        if (!parent || subtasks.length === 0) return;
        const { status, progress } = calculateParentTaskState(subtasks);
        await updateProjectTask(parentDocId, { task_status: status, progress });
        await loadTasks();
      } catch (e) {
        console.error(e);
      }
    },
    [projectDocumentId, loadTasks]
  );

  const handleToggleDone = async (e: React.MouseEvent, task: ProjectTask) => {
    e.stopPropagation();
    if (!canEdit) return;
    const next = task.task_status === 'completed' ? 'todo' : 'completed';
    try {
      await updateTaskStatus(task.documentId, next);
      await loadTasks();
      if (next === 'completed') {
        const res = await fetchProjectTasks(projectDocumentId);
        const fresh = res.data || [];
        const roots = fresh.filter((x) => !x.parent_task);
        if (roots.length > 0 && roots.every((x) => x.task_status === 'completed')) {
          onAllTasksCompleted?.();
        }
      }
      showGlobalPopup(next === 'completed' ? 'Tâche terminée ✓' : 'Tâche réouverte', 'success');
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleStatusChange = async (task: ProjectTask, status: TaskStatus) => {
    if (!canEdit) return;
    try {
      await updateTaskStatus(task.documentId, status);
      await loadTasks();
      showGlobalPopup('Statut mis à jour', 'success');
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleSaveTask = async (
    task: ProjectTask,
    updates: {
      title?: string;
      description?: string;
      task_status?: TaskStatus;
      due_date?: string | null;
      estimated_hours?: number | null;
      assignedToDocId?: string;
    }
  ) => {
    if (!canEdit) return;
    try {
      await updateProjectTask(task.documentId, {
        title: updates.title,
        description: updates.description,
        task_status: updates.task_status,
        due_date: updates.due_date ?? null,
        estimated_hours: updates.estimated_hours ?? null,
        assigned_to: updates.assignedToDocId ? allMembers.find((m) => m.documentId === updates.assignedToDocId)?.id ?? null : null,
      });
      await loadTasks();
      showGlobalPopup('Modifications sauvegardées', 'success');
      setExpandedId(null);
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, task: ProjectTask) => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await deleteProjectTask(task.documentId);
      await loadTasks();
      showGlobalPopup('Tâche supprimée', 'success');
      if (expandedId === task.documentId) setExpandedId(null);
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !canEdit) return;
    try {
      await createProjectTask({
        project: projectDocumentId,
        title,
        created_user: userId,
        order: tasks.length,
      });
      setNewTaskTitle('');
      await loadTasks();
      showGlobalPopup(`"${title}" ajoutée`, 'success');
    } catch {
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="bg-card border border-default  py-3.5 px-5 flex items-center gap-4">
        <span className="!text-[13px] font-medium !text-muted whitespace-nowrap">Progression globale</span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${globalPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="font-mono !text-xs font-medium !text-success whitespace-nowrap">{globalPct}%</span>
      </div>

      {/* Liste des cartes */}
      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task, i) => (
            <TaskCardRedesign
              key={task.documentId}
              task={task}
              tasks={tasks}
              canEdit={canEdit}
              allMembers={allMembers}
              isExpanded={expandedId === task.documentId}
              expandedTab={expandedTab}
              onToggleExpand={() => {
                if (expandedId === task.documentId) {
                  setExpandedId(null);
                } else {
                  setExpandedId(task.documentId);
                  setExpandedTab('edit');
                }
              }}
              onSwitchTab={setExpandedTab}
              onToggleDone={handleToggleDone}
              onStatusChange={handleStatusChange}
              onSave={handleSaveTask}
              onDelete={handleDeleteTask}
              onAddSubtask={async (title) => {
                if (!title.trim()) return;
                await createProjectTask({
                  project: projectDocumentId,
                  title: title.trim(),
                  created_user: userId,
                  order: task.subtasks?.length ?? 0,
                  parent_task: task.documentId,
                  color: task.color || TASK_COLORS[0],
                });
                await loadTasks();
                await syncParentFromSubtasks(task.documentId);
              }}
              onSubtaskToggle={async (st) => {
                const next = st.task_status === 'completed' ? 'todo' : 'completed';
                await updateTaskStatus(st.documentId, next);
                await loadTasks();
                await syncParentFromSubtasks(task.documentId);
              }}
              onSubtaskDelete={async (st) => {
                await deleteProjectTask(st.documentId);
                await loadTasks();
                await syncParentFromSubtasks(task.documentId);
              }}
              t={t}
              animateIndex={i}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Ligne nouvelle tâche */}
      {canEdit && (
        <div
          className={`flex items-center gap-3 p-3 bg-card border-2 border-dashed  cursor-text transition-colors ${
            newTaskFocused || newTaskTitle ? 'border-primary' : 'border-default hover:border-[#ccc8c2]'
          }`}
        >
          <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#ccc8c2] flex-shrink-0 opacity-40" />
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onFocus={() => setNewTaskFocused(true)}
            onBlur={() => setNewTaskFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') {
                setNewTaskTitle('');
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Ajouter une tâche… (appuyez sur Entrée)"
            className="flex-1 border-none bg-transparent font-sans !text-sm font-medium !text-primary outline-none placeholder:!text-muted2"
          />
          {(newTaskFocused || newTaskTitle) && (
            <div className="flex items-center gap-2">
              <span className="font-mono !text-[10px] !text-muted2">↵ confirmer · Esc annuler</span>
              <button
                type="button"
                onClick={() => {
                  setNewTaskTitle('');
                  (document.activeElement as HTMLElement)?.blur();
                }}
                className="px-2.5 py-1 rounded-md !text-[11px] font-medium bg-secondary border border-default !text-muted hover:!text-primary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                className="px-3 py-1 rounded-md !text-[11px] font-medium bg-primary !text-white hover:opacity-90"
              >
                Ajouter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
