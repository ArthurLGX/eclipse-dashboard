'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconBrain,
  IconLoader2,
  IconX,
  IconSparkles,
  IconListCheck,
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconCheck,
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconFlag,
  IconSubtask,
  IconMicrophone,
  IconClipboard,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { ProjectTask, TaskPriority } from '@/types';

interface AITaskGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  projectDescription?: string;
  existingTasks?: ProjectTask[];
  onTasksGenerated: (tasks: GeneratedTask[]) => void;
}

export interface GeneratedTask {
  title: string;
  description?: string;
  estimated_hours?: number;
  priority: TaskPriority;
  phase?: string;
  subtasks?: GeneratedTask[];
  selected: boolean;
}

interface AITaskResponse {
  tasks: {
    title: string;
    description?: string;
    estimated_hours?: number;
    priority: TaskPriority;
    phase?: string;
    subtasks?: {
      title: string;
      description?: string;
      estimated_hours?: number;
      priority: TaskPriority;
    }[];
  }[];
  total_estimated_hours: number;
  phases: string[];
  reasoning?: string;
  confidence: number;
}

type InputMode = 'prompt' | 'meeting' | 'fathom';

export default function AITaskGenerator({
  isOpen,
  onClose,
  projectTitle,
  projectDescription,
  existingTasks,
  onTasksGenerated,
}: AITaskGeneratorProps) {
  const { t } = useLanguage();

  const [inputMode, setInputMode] = useState<InputMode>('prompt');
  const [prompt, setPrompt] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [fathomUrl, setFathomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setMeetingNotes('');
      setFathomUrl('');
      setError(null);
      setGeneratedTasks([]);
      setStep('input');
      setExpandedTasks(new Set());
    }
  }, [isOpen]);

  const getInputContent = () => {
    switch (inputMode) {
      case 'prompt':
        return prompt;
      case 'meeting':
        return meetingNotes;
      case 'fathom':
        return fathomUrl;
      default:
        return prompt;
    }
  };

  const handleGenerate = async () => {
    const content = getInputContent();
    if (!content.trim()) {
      setError(t('ai_tasks_input_required') || 'Veuillez fournir des informations pour générer les tâches');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/tasks-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMode,
          content,
          projectTitle,
          projectDescription,
          existingTasks: existingTasks?.map(t => ({
            title: t.title,
            task_status: t.task_status,
            priority: t.priority,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('ai_generation_error'));
      }

      const data: AITaskResponse = await response.json();
      
      // Transform to GeneratedTask with selection state
      const tasks: GeneratedTask[] = data.tasks.map(task => ({
        ...task,
        selected: true,
        subtasks: task.subtasks?.map(sub => ({
          ...sub,
          selected: true,
        })),
      }));

      setGeneratedTasks(tasks);
      setStep('review');
    } catch (err) {
      console.error('AI task generation error:', err);
      setError(err instanceof Error ? err.message : t('ai_generation_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    // Filter only selected tasks
    const selectedTasks = generatedTasks
      .filter(task => task.selected)
      .map(task => ({
        ...task,
        subtasks: task.subtasks?.filter(sub => sub.selected),
      }));

    onTasksGenerated(selectedTasks);
    onClose();
  };

  const toggleTaskSelection = (taskIndex: number) => {
    setGeneratedTasks(prev => prev.map((task, i) => 
      i === taskIndex ? { ...task, selected: !task.selected } : task
    ));
  };

  const toggleSubtaskSelection = (taskIndex: number, subtaskIndex: number) => {
    setGeneratedTasks(prev => prev.map((task, i) => 
      i === taskIndex ? {
        ...task,
        subtasks: task.subtasks?.map((sub, j) => 
          j === subtaskIndex ? { ...sub, selected: !sub.selected } : sub
        ),
      } : task
    ));
  };

  const toggleTaskExpansion = (taskIndex: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskIndex)) {
        next.delete(taskIndex);
      } else {
        next.add(taskIndex);
      }
      return next;
    });
  };

  const updateTaskField = (taskIndex: number, field: keyof GeneratedTask, value: unknown) => {
    setGeneratedTasks(prev => prev.map((task, i) => 
      i === taskIndex ? { ...task, [field]: value } : task
    ));
  };

  const removeTask = (taskIndex: number) => {
    setGeneratedTasks(prev => prev.filter((_, i) => i !== taskIndex));
  };

  const addTask = () => {
    setGeneratedTasks(prev => [...prev, {
      title: '',
      description: '',
      estimated_hours: 1,
      priority: 'medium' as TaskPriority,
      selected: true,
    }]);
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-muted bg-muted/10';
    }
  };

  const totalSelectedHours = generatedTasks
    .filter(t => t.selected)
    .reduce((sum, t) => {
      const taskHours = t.estimated_hours || 0;
      const subtaskHours = t.subtasks?.filter(s => s.selected).reduce((s, sub) => s + (sub.estimated_hours || 0), 0) || 0;
      return sum + taskHours + subtaskHours;
    }, 0);

  const totalSelectedTasks = generatedTasks.filter(t => t.selected).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <IconBrain className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  {t('ai_generate_tasks') || 'Générer des tâches avec l\'IA'}
                </h2>
                <p className="text-sm text-muted">
                  {projectTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover rounded-lg transition-colors"
            >
              <IconX className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 'input' && (
              <div className="space-y-6">
                {/* Input mode selector */}
                <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
                  {[
                    { id: 'prompt' as InputMode, label: t('from_description') || 'Description', icon: IconListCheck },
                    { id: 'meeting' as InputMode, label: t('from_meeting') || 'Notes de réunion', icon: IconMicrophone },
                    { id: 'fathom' as InputMode, label: 'Fathom AI', icon: IconClipboard },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setInputMode(mode.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        inputMode === mode.id
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      <mode.icon className="w-4 h-4" />
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* Input content */}
                {inputMode === 'prompt' && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {t('describe_tasks_needed') || 'Décrivez les objectifs ou fonctionnalités à développer'}
                    </label>
                    <textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder={t('ai_tasks_prompt_placeholder') || 'Ex: Développer un système d\'authentification avec login, register, reset password, et 2FA...'}
                      className="w-full h-40 p-4 bg-muted/30 border border-default rounded-xl resize-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                )}

                {inputMode === 'meeting' && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {t('paste_meeting_notes') || 'Collez vos notes de réunion'}
                    </label>
                    <textarea
                      value={meetingNotes}
                      onChange={e => setMeetingNotes(e.target.value)}
                      placeholder={t('ai_meeting_placeholder') || 'Collez le transcript ou les notes de votre réunion client...'}
                      className="w-full h-48 p-4 bg-muted/30 border border-default rounded-xl resize-none focus:ring-2 focus:ring-accent focus:border-transparent font-mono text-sm"
                    />
                  </div>
                )}

                {inputMode === 'fathom' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        {t('fathom_meeting_url') || 'URL de la réunion Fathom ou contenu exporté'}
                      </label>
                      <textarea
                        value={fathomUrl}
                        onChange={e => setFathomUrl(e.target.value)}
                        placeholder={t('ai_fathom_placeholder') || 'Collez l\'URL de votre réunion Fathom ou le contenu exporté (résumé, action items, transcript)...'}
                        className="w-full h-48 p-4 bg-muted/30 border border-default rounded-xl resize-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                    <div className="p-4 bg-info-light rounded-xl">
                      <p className="text-sm text-info">
                        💡 {t('fathom_tip') || 'Astuce : Exportez le résumé et les action items depuis Fathom pour de meilleurs résultats'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Project context */}
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">
                    {t('project_context') || 'Contexte du projet'}
                  </p>
                  <p className="text-sm font-medium text-primary">{projectTitle}</p>
                  {projectDescription && (
                    <p className="text-sm text-secondary mt-1 line-clamp-2">{projectDescription}</p>
                  )}
                  {existingTasks && existingTasks.length > 0 && (
                    <p className="text-xs text-muted mt-2">
                      {existingTasks.length} {t('existing_tasks') || 'tâches existantes'}
                    </p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-danger-light rounded-xl flex items-center gap-3">
                    <IconAlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                    <p className="text-sm text-danger">{error}</p>
                  </div>
                )}
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <IconListCheck className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium text-primary">
                      {totalSelectedTasks} {t('tasks') || 'tâches'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconClock className="w-5 h-5 text-info" />
                    <span className="text-sm font-medium text-primary">
                      {totalSelectedHours}h {t('estimated') || 'estimées'}
                    </span>
                  </div>
                  <button
                    onClick={addTask}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                    {t('add_task') || 'Ajouter'}
                  </button>
                </div>

                {/* Tasks list */}
                <div className="space-y-3">
                  {generatedTasks.map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className={`border rounded-xl transition-colors ${
                        task.selected ? 'border-accent/50 bg-accent/5' : 'border-default bg-muted/30 opacity-60'
                      }`}
                    >
                      {/* Task header */}
                      <div className="p-4 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.selected}
                          onChange={() => toggleTaskSelection(taskIndex)}
                          className="mt-1 w-4 h-4 rounded border-default text-accent focus:ring-accent"
                        />
                        
                        {task.subtasks && task.subtasks.length > 0 && (
                          <button
                            onClick={() => toggleTaskExpansion(taskIndex)}
                            className="mt-0.5 p-1 hover:bg-hover rounded"
                          >
                            {expandedTasks.has(taskIndex) 
                              ? <IconChevronDown className="w-4 h-4 text-muted" />
                              : <IconChevronRight className="w-4 h-4 text-muted" />
                            }
                          </button>
                        )}
                        
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={task.title}
                            onChange={e => updateTaskField(taskIndex, 'title', e.target.value)}
                            placeholder={t('task_title') || 'Titre de la tâche'}
                            className="w-full px-3 py-2 bg-background border border-default rounded-lg text-sm font-medium"
                          />
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <IconClock className="w-4 h-4 text-muted" />
                              <input
                                type="number"
                                value={task.estimated_hours || ''}
                                onChange={e => updateTaskField(taskIndex, 'estimated_hours', parseFloat(e.target.value) || undefined)}
                                placeholder="0"
                                className="w-16 px-2 py-1 bg-background border border-default rounded text-sm text-center"
                                min="0"
                                step="0.5"
                              />
                              <span className="text-xs text-muted">h</span>
                            </div>
                            
                            <select
                              value={task.priority}
                              onChange={e => updateTaskField(taskIndex, 'priority', e.target.value)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium ${getPriorityColor(task.priority)}`}
                            >
                              <option value="low">{t('low') || 'Faible'}</option>
                              <option value="medium">{t('medium') || 'Moyen'}</option>
                              <option value="high">{t('high') || 'Haute'}</option>
                              <option value="urgent">{t('urgent') || 'Urgent'}</option>
                            </select>
                            
                            {task.phase && (
                              <span className="px-2 py-1 bg-muted/50 rounded text-xs text-secondary">
                                {task.phase}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeTask(taskIndex)}
                          className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subtasks */}
                      {task.subtasks && task.subtasks.length > 0 && expandedTasks.has(taskIndex) && (
                        <div className="px-4 pb-4 ml-11 space-y-2">
                          {task.subtasks.map((subtask, subtaskIndex) => (
                            <div
                              key={subtaskIndex}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                subtask.selected ? 'bg-background' : 'bg-muted/30 opacity-60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={subtask.selected}
                                onChange={() => toggleSubtaskSelection(taskIndex, subtaskIndex)}
                                className="w-4 h-4 rounded border-default text-accent focus:ring-accent"
                              />
                              <IconSubtask className="w-4 h-4 text-muted" />
                              <span className="flex-1 text-sm text-secondary">{subtask.title}</span>
                              {subtask.estimated_hours && (
                                <span className="text-xs text-muted">{subtask.estimated_hours}h</span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(subtask.priority)}`}>
                                {subtask.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-default bg-muted/30">
            {step === 'input' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !getInputContent().trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      {t('generating') || 'Génération...'}
                    </>
                  ) : (
                    <>
                      <IconSparkles className="w-4 h-4" />
                      {t('generate_tasks') || 'Générer les tâches'}
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={totalSelectedTasks === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-success text-white rounded-xl hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconCheck className="w-4 h-4" />
                  {t('add_selected_tasks') || `Ajouter ${totalSelectedTasks} tâche${totalSelectedTasks > 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

