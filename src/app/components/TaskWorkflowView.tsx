'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconX,
  IconCalendar,
  IconUser,
  IconFlag,
  IconZoomIn,
  IconZoomOut,
  IconFocus2,
  IconMaximize,
  IconMinimize,
  IconPlayerPause,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress: number; // 0-100
  priority?: TaskPriority;
  assignee?: string;
  startDate?: string;
  endDate?: string;
  dependencies?: string[]; // IDs des tâches dont celle-ci dépend
  subtasks?: WorkflowTask[];
  position?: { x: number; y: number }; // Position pour le mode libre
}

interface TaskWorkflowViewProps {
  tasks: WorkflowTask[];
  onTaskUpdate?: (taskId: string, updates: Partial<WorkflowTask>) => void;
  onTaskClick?: (task: WorkflowTask) => void;
  onReorder?: (tasks: WorkflowTask[]) => void;
  readOnly?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<TaskStatus, { color: string; bgColor: string; borderColor: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  not_started: {
    color: 'text-muted',
    bgColor: 'bg-muted',
    borderColor: 'border-default',
    icon: IconClock,
  },
  in_progress: {
    color: 'text-warning',
    bgColor: 'bg-warning-light',
    borderColor: 'border-warning',
    icon: IconClock,
  },
  completed: {
    color: 'text-success',
    bgColor: 'bg-success-light',
    borderColor: 'border-success',
    icon: IconCheck,
  },
  blocked: {
    color: 'text-danger',
    bgColor: 'bg-danger-light',
    borderColor: 'border-danger',
    icon: IconAlertTriangle,
  },
  on_hold: {
    color: 'text-info',
    bgColor: 'bg-info-light',
    borderColor: 'border-info',
    icon: IconPlayerPause,
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: 'text-muted', label: 'Basse' },
  medium: { color: 'text-info', label: 'Moyenne' },
  high: { color: 'text-warning', label: 'Haute' },
  urgent: { color: 'text-danger', label: 'Urgente' },
};

const NODE_SIZE = 80;
const NODE_SPACING_X = 200;
const NODE_SPACING_Y = 150;
const SUBTASK_NODE_SIZE = 50;

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Anneau de progression circulaire
const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth?: number;
  status: TaskStatus;
}> = ({ progress, size, strokeWidth = 4, status }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const config = STATUS_CONFIG[status];

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90"
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted opacity-20"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`transition-all duration-500 ${config.color}`}
      />
    </svg>
  );
};

// Connecteur SVG entre deux nodes
const NodeConnector: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  isActive?: boolean;
}> = ({ from, to, isActive }) => {
  // Calcul du chemin courbe (style n8n)
  const controlOffset = Math.abs(to.x - from.x) * 0.4;
  
  const path = `
    M ${from.x} ${from.y}
    C ${from.x + controlOffset} ${from.y},
      ${to.x - controlOffset} ${to.y},
      ${to.x} ${to.y}
  `;

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={isActive ? 'var(--color-accent)' : 'var(--color-border)'}
      strokeWidth={isActive ? 3 : 2}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`${isActive ? '' : 'opacity-50'}`}
    />
  );
};

// Mini barre de progression pour sous-tâches
const SubtaskProgressBar: React.FC<{ progress: number; status: TaskStatus }> = ({ progress, status }) => {
  const config = STATUS_CONFIG[status];
  
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${config.bgColor.replace('-light', '')}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

// ============================================================================
// TASK NODE COMPONENT
// ============================================================================

interface TaskNodeProps {
  task: WorkflowTask;
  position: { x: number; y: number };
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  size?: number;
  isSubtask?: boolean;
  readOnly?: boolean;
}

const TaskNode: React.FC<TaskNodeProps> = ({
  task,
  position,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onExpand,
  isExpanded,
  size = NODE_SIZE,
  isSubtask = false,
}) => {
  const config = STATUS_CONFIG[task.status];
  const StatusIcon = config.icon;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <motion.div
      className="absolute"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isSelected ? 1.1 : isHovered ? 1.05 : 1, 
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
    >
      {/* Progress ring */}
      <ProgressRing
        progress={task.progress}
        size={size}
        strokeWidth={isSubtask ? 3 : 4}
        status={task.status}
      />

      {/* Node body */}
      <div
        className={`
          absolute inset-1 rounded-full flex flex-col items-center justify-center
          bg-card border-2 cursor-pointer transition-all duration-200
          ${config.borderColor}
          ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-page' : ''}
          ${isHovered ? 'shadow-lg' : 'shadow-sm'}
        `}
      >
        {/* Status icon */}
        <StatusIcon size={isSubtask ? 14 : 18} className={config.color} />
        
        {/* Progress text */}
        <span className={`text-xs font-bold mt-0.5 ${config.color}`}>
          {task.progress}%
        </span>
      </div>

      {/* Expand button for tasks with subtasks */}
      {hasSubtasks && onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className={`
            absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full
            bg-card border border-default flex items-center justify-center
            hover:bg-hover hover:border-accent transition-all z-10
          `}
        >
          {isExpanded ? (
            <IconChevronDown size={12} className="text-primary" />
          ) : (
            <IconChevronRight size={12} className="text-primary" />
          )}
        </button>
      )}

      {/* Task title (below node) */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap
          ${isSubtask ? 'top-full mt-1' : 'top-full mt-3'}
        `}
        style={{ maxWidth: size * 2 }}
      >
        <span className={`text-xs font-medium text-primary truncate block ${isSubtask ? 'text-[10px]' : ''}`}>
          {task.title}
        </span>
        {!isSubtask && task.endDate && (
          <span className="text-[10px] text-muted flex items-center justify-center gap-0.5 mt-0.5">
            <IconCalendar size={10} />
            {new Date(task.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// DETAIL PANEL COMPONENT
// ============================================================================

interface DetailPanelProps {
  task: WorkflowTask | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ task, onClose }) => {
  const { t } = useLanguage();
  
  // Calculer la progression des sous-tâches (appelé avant le early return)
  const subtaskProgress = useMemo(() => {
    if (!task?.subtasks || task.subtasks.length === 0) return null;
    const totalProgress = task.subtasks.reduce((sum, st) => sum + st.progress, 0);
    return Math.round(totalProgress / task.subtasks.length);
  }, [task?.subtasks]);

  if (!task) return null;

  const config = STATUS_CONFIG[task.status];
  const StatusIcon = config.icon;
  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-4 bottom-4 w-80 bg-card border border-default rounded-xl shadow-xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className={`p-4 ${config.bgColor} border-b border-default`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon size={20} className={config.color} />
            <span className={`text-sm font-medium ${config.color}`}>
              {t(`task_status_${task.status}`) || task.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
        <h3 className="text-lg font-bold text-primary mt-2">{task.title}</h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">{t('progress') || 'Progression'}</span>
            <span className={`text-sm font-bold ${config.color}`}>{task.progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${config.bgColor.replace('-light', '')}`}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <span className="text-sm text-secondary block mb-1">{t('description') || 'Description'}</span>
            <p className="text-sm text-primary">{task.description}</p>
          </div>
        )}

        {/* Priority */}
        {priorityConfig && (
          <div className="flex items-center gap-2">
            <IconFlag size={16} className={priorityConfig.color} />
            <span className="text-sm text-secondary">{t('priority') || 'Priorité'}:</span>
            <span className={`text-sm font-medium ${priorityConfig.color}`}>
              {t(`priority_${task.priority}`) || priorityConfig.label}
            </span>
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-2">
            <IconUser size={16} className="text-muted" />
            <span className="text-sm text-secondary">{t('assignee') || 'Assigné à'}:</span>
            <span className="text-sm text-primary font-medium">{task.assignee}</span>
          </div>
        )}

        {/* Dates */}
        {(task.startDate || task.endDate) && (
          <div className="flex items-center gap-4">
            {task.startDate && (
              <div className="flex items-center gap-1">
                <IconCalendar size={14} className="text-muted" />
                <span className="text-xs text-secondary">
                  {t('start') || 'Début'}: {new Date(task.startDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
            {task.endDate && (
              <div className="flex items-center gap-1">
                <IconCalendar size={14} className="text-muted" />
                <span className="text-xs text-secondary">
                  {t('end') || 'Fin'}: {new Date(task.endDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">
                {t('subtasks') || 'Sous-tâches'} ({task.subtasks.length})
              </span>
              {subtaskProgress !== null && (
                <span className="text-xs text-muted">{subtaskProgress}% {t('completed_short') || 'terminé'}</span>
              )}
            </div>
            <div className="space-y-2">
              {task.subtasks.map((subtask) => {
                const stConfig = STATUS_CONFIG[subtask.status];
                const StIcon = stConfig.icon;
                return (
                  <div
                    key={subtask.id}
                    className="p-2 rounded-lg bg-hover border border-default"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StIcon size={12} className={stConfig.color} />
                      <span className="text-xs text-primary font-medium flex-1 truncate">
                        {subtask.title}
                      </span>
                      <span className={`text-xs font-bold ${stConfig.color}`}>
                        {subtask.progress}%
                      </span>
                    </div>
                    <SubtaskProgressBar progress={subtask.progress} status={subtask.status} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TaskWorkflowView({
  tasks,
}: TaskWorkflowViewProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // State
  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [localTasks, setLocalTasks] = useState<WorkflowTask[]>(tasks);

  // Sync tasks with props
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number }> = new Map();
    let currentX = NODE_SIZE;
    let currentY = NODE_SIZE + 40;

    localTasks.forEach((task) => {
      // Position de la tâche principale
      positions.set(task.id, { x: currentX, y: currentY });

      // Si la tâche est étendue, positionner les sous-tâches en dessous
      if (expandedTasks.has(task.id) && task.subtasks) {
        const subtaskStartX = currentX - ((task.subtasks.length - 1) * (SUBTASK_NODE_SIZE + 30)) / 2;
        task.subtasks.forEach((subtask, stIndex) => {
          positions.set(subtask.id, {
            x: subtaskStartX + stIndex * (SUBTASK_NODE_SIZE + 30),
            y: currentY + NODE_SPACING_Y,
          });
        });
        currentY += NODE_SPACING_Y;
      }

      currentX += NODE_SPACING_X;
    });

    return positions;
  }, [localTasks, expandedTasks]);

  // Calculate connectors
  const connectors = useMemo(() => {
    const lines: Array<{
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      isActive: boolean;
    }> = [];

    // Connecteurs entre tâches principales (linéaires)
    localTasks.forEach((task, index) => {
      if (index > 0) {
        const prevTask = localTasks[index - 1];
        const fromPos = nodePositions.get(prevTask.id);
        const toPos = nodePositions.get(task.id);
        
        if (fromPos && toPos) {
          lines.push({
            id: `${prevTask.id}-${task.id}`,
            from: { x: fromPos.x + NODE_SIZE / 2, y: fromPos.y },
            to: { x: toPos.x - NODE_SIZE / 2, y: toPos.y },
            isActive: prevTask.status === 'completed',
          });
        }
      }

      // Connecteurs vers sous-tâches
      if (expandedTasks.has(task.id) && task.subtasks) {
        const parentPos = nodePositions.get(task.id);
        task.subtasks.forEach((subtask) => {
          const subtaskPos = nodePositions.get(subtask.id);
          if (parentPos && subtaskPos) {
            lines.push({
              id: `${task.id}-${subtask.id}`,
              from: { x: parentPos.x, y: parentPos.y + NODE_SIZE / 2 },
              to: { x: subtaskPos.x, y: subtaskPos.y - SUBTASK_NODE_SIZE / 2 },
              isActive: true,
            });
          }
        });
      }
    });

    // Connecteurs basés sur les dépendances
    localTasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((depId) => {
          const fromPos = nodePositions.get(depId);
          const toPos = nodePositions.get(task.id);
          const depTask = localTasks.find(t => t.id === depId);
          
          if (fromPos && toPos && depTask) {
            lines.push({
              id: `dep-${depId}-${task.id}`,
              from: { x: fromPos.x + NODE_SIZE / 2, y: fromPos.y },
              to: { x: toPos.x - NODE_SIZE / 2, y: toPos.y },
              isActive: depTask.status === 'completed',
            });
          }
        });
      }
    });

    return lines;
  }, [localTasks, nodePositions, expandedTasks]);

  // Canvas dimensions
  const canvasSize = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    nodePositions.forEach((pos) => {
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });
    return {
      width: Math.max(maxX + NODE_SIZE * 2, 800),
      height: Math.max(maxY + NODE_SIZE * 3, 500),
    };
  }, [nodePositions]);

  // Selected task
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    // Chercher dans les tâches principales
    let found = localTasks.find(t => t.id === selectedTaskId);
    if (found) return found;
    // Chercher dans les sous-tâches
    for (const task of localTasks) {
      if (task.subtasks) {
        found = task.subtasks.find(st => st.id === selectedTaskId);
        if (found) return found;
      }
    }
    return null;
  }, [selectedTaskId, localTasks]);

  // Handlers
  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
  const handleReset = () => {
    setScale(0.8);
    setOffset({ x: 50, y: 50 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.min(Math.max(s + delta, 0.3), 2));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (localTasks.length === 0) return 0;
    const totalProgress = localTasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.round(totalProgress / localTasks.length);
  }, [localTasks]);

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-card border-b border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-primary">
              {t('task_workflow') || 'Workflow des tâches'}
            </h3>
            {/* Overall progress */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-hover">
              <span className="text-xs text-secondary">{t('progress') || 'Progression'}:</span>
              <span className="text-sm font-bold text-accent">{overallProgress}%</span>
            </div>
            {/* Task count */}
            <span className="text-xs text-muted">
              {localTasks.length} {t('tasks') || 'tâches'}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button onClick={handleZoomOut} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Zoom -">
              <IconZoomOut size={18} />
            </button>
            <span className="text-xs text-muted w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Zoom +">
              <IconZoomIn size={18} />
            </button>
            <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Reset">
              <IconFocus2 size={18} />
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Fullscreen">
              {isFullscreen ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-page cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        tabIndex={0}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)
            `,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`,
          }}
        />

        {/* Workflow canvas */}
        <div
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        >
          {/* SVG layer for connectors */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            {connectors.map((connector) => (
              <NodeConnector
                key={connector.id}
                from={connector.from}
                to={connector.to}
                isActive={connector.isActive}
              />
            ))}
          </svg>

          {/* Task nodes */}
          {localTasks.map((task) => {
            const pos = nodePositions.get(task.id);
            if (!pos) return null;

            return (
              <React.Fragment key={task.id}>
                <TaskNode
                  task={task}
                  position={pos}
                  isSelected={selectedTaskId === task.id}
                  isHovered={hoveredTaskId === task.id}
                  onSelect={() => setSelectedTaskId(task.id)}
                  onHover={(h) => setHoveredTaskId(h ? task.id : null)}
                  onExpand={() => toggleTaskExpand(task.id)}
                  isExpanded={expandedTasks.has(task.id)}
                />

                {/* Subtask nodes */}
                <AnimatePresence>
                  {expandedTasks.has(task.id) && task.subtasks && task.subtasks.map((subtask) => {
                    const stPos = nodePositions.get(subtask.id);
                    if (!stPos) return null;

                    return (
                      <TaskNode
                        key={subtask.id}
                        task={subtask}
                        position={stPos}
                        isSelected={selectedTaskId === subtask.id}
                        isHovered={hoveredTaskId === subtask.id}
                        onSelect={() => setSelectedTaskId(subtask.id)}
                        onHover={(h) => setHoveredTaskId(h ? subtask.id : null)}
                        size={SUBTASK_NODE_SIZE}
                        isSubtask
                      />
                    );
                  })}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card border border-default rounded-lg p-3 text-xs space-y-1.5">
          <div className="font-medium text-primary mb-2">{t('legend') || 'Légende'}</div>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const StatusIcon = config.icon;
            return (
              <div key={status} className="flex items-center gap-2">
                <StatusIcon size={14} className={config.color} />
                <span className="text-secondary">
                  {t(`task_status_${status}`) || status.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedTask && (
            <DetailPanel
              task={selectedTask}
              onClose={() => setSelectedTaskId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// LIST VIEW ALTERNATIVE
// ============================================================================

interface TaskWorkflowListProps {
  tasks: WorkflowTask[];
  onReorder?: (tasks: WorkflowTask[]) => void;
  onTaskClick?: (task: WorkflowTask) => void;
  readOnly?: boolean;
}

export function TaskWorkflowList({ tasks, onReorder, onTaskClick, readOnly }: TaskWorkflowListProps) {
  const { t } = useLanguage();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleReorder = (newOrder: WorkflowTask[]) => {
    setLocalTasks(newOrder);
    onReorder?.(newOrder);
  };

  return (
    <div className="space-y-2 p-4">
      <Reorder.Group axis="y" values={localTasks} onReorder={handleReorder}>
        {localTasks.map((task) => {
          const config = STATUS_CONFIG[task.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedTasks.has(task.id);
          const hasSubtasks = task.subtasks && task.subtasks.length > 0;

          return (
            <Reorder.Item
              key={task.id}
              value={task}
              className="mb-2"
              whileDrag={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
            >
              <div
                className={`
                  p-4 rounded-xl bg-card border-2 ${config.borderColor}
                  hover:shadow-md transition-all cursor-pointer
                `}
                onClick={() => onTaskClick?.(task)}
              >
                <div className="flex items-center gap-3">
                  {!readOnly && (
                    <IconGripVertical size={18} className="text-muted cursor-grab" />
                  )}
                  
                  {/* Progress ring mini */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <ProgressRing progress={task.progress} size={40} strokeWidth={3} status={task.status} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <StatusIcon size={14} className={config.color} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary truncate">{task.title}</span>
                      <span className={`text-xs font-bold ${config.color}`}>{task.progress}%</span>
                    </div>
                    {task.endDate && (
                      <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <IconCalendar size={12} />
                        {t('due') || 'Échéance'}: {new Date(task.endDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {/* Expand button */}
                  {hasSubtasks && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(task.id);
                      }}
                      className="p-2 rounded-lg hover:bg-hover text-muted"
                    >
                      {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                    </button>
                  )}
                </div>

                {/* Subtasks */}
                <AnimatePresence>
                  {isExpanded && hasSubtasks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t border-default space-y-2"
                    >
                      {task.subtasks!.map((subtask) => {
                        const stConfig = STATUS_CONFIG[subtask.status];
                        const StIcon = stConfig.icon;
                        return (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-hover"
                          >
                            <StIcon size={14} className={stConfig.color} />
                            <span className="text-sm text-primary flex-1 truncate">{subtask.title}</span>
                            <span className={`text-xs font-bold ${stConfig.color}`}>{subtask.progress}%</span>
                            <div className="w-16">
                              <SubtaskProgressBar progress={subtask.progress} status={subtask.status} />
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </div>
  );
}

