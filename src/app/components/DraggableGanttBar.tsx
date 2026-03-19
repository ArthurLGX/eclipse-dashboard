'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';

interface DraggableGanttBarProps {
  children: React.ReactNode;
  taskId: string;
  startOffset: number; // Position de début en jours
  duration: number; // Durée en jours
  dayWidth: number; // Largeur d'un jour en pixels (ex: 32px)
  minDate: Date; // Date minimale du Gantt pour calculer les nouvelles dates
  color: string;
  taskStatus?: string;
  progress: number;
  onDateChange: (taskId: string, newStartDate: string, newDueDate: string) => Promise<void>;
  onDragEnd?: (taskId: string) => void; // Appelé après un drag pour éviter ouverture modale au clic
  className?: string;
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | null;

export default function DraggableGanttBar({
  children,
  taskId,
  startOffset,
  duration,
  dayWidth,
  minDate,
  color,
  taskStatus,
  progress,
  onDateChange,
  onDragEnd,
  className = '',
}: DraggableGanttBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [tempStartOffset, setTempStartOffset] = useState(startOffset);
  const [tempDuration, setTempDuration] = useState(duration);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false);

  // Reset temp values when props change
  useEffect(() => {
    setTempStartOffset(startOffset);
    setTempDuration(duration);
  }, [startOffset, duration]);

  // Calculer une nouvelle date à partir de l'offset (format YYYY-MM-DD en local, évite décalage timezone)
  const calculateDateFromOffset = useCallback((dayOffset: number): string => {
    const newDate = new Date(minDate);
    newDate.setDate(newDate.getDate() + dayOffset);
    return `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
  }, [minDate]);

  // Gestion du début du drag (marquer tout de suite pour éviter ouverture modale au relâchement)
  const handleDragStart = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, mode: DragMode) => {
    event.stopPropagation();
    hasDraggedRef.current = true;
    setIsDragging(true);
    setDragMode(mode);
  }, []);

  // Gestion du mouvement pendant le drag
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!dragMode) return;

    const deltaX = info.offset.x;
    const deltaDays = Math.round(deltaX / dayWidth);

    if (dragMode === 'move') {
      // Déplacer la tâche entière (garder la durée)
      const newStartOffset = Math.max(0, startOffset + deltaDays);
      setTempStartOffset(newStartOffset);
    } else if (dragMode === 'resize-left') {
      // Redimensionner par la gauche (modifier start_date)
      const newStartOffset = Math.max(0, startOffset + deltaDays);
      const newDuration = Math.max(1, duration - deltaDays);
      setTempStartOffset(newStartOffset);
      setTempDuration(newDuration);
    } else if (dragMode === 'resize-right') {
      // Redimensionner par la droite (modifier due_date)
      const newDuration = Math.max(1, duration + deltaDays);
      setTempDuration(newDuration);
    }
  }, [dragMode, startOffset, duration, dayWidth]);

  // Gestion de la fin du drag
  const handleDragEnd = useCallback(async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    // Signaler immédiatement pour bloquer l'ouverture de la modale au clic (avant tout await)
    onDragEnd?.(taskId);

    if (!dragMode) {
      setDragMode(null);
      return;
    }

    const deltaX = info.offset.x;
    const deltaDays = Math.round(deltaX / dayWidth);

    // Ignorer si pas de mouvement
    if (deltaDays === 0) {
      setDragMode(null);
      return;
    }

    let newStartDate: string;
    let newDueDate: string;

    if (dragMode === 'move') {
      // Déplacer la tâche entière
      const newStartOffset = Math.max(0, startOffset + deltaDays);
      newStartDate = calculateDateFromOffset(newStartOffset);
      newDueDate = calculateDateFromOffset(newStartOffset + duration - 1);
    } else if (dragMode === 'resize-left') {
      // Redimensionner par la gauche
      const newStartOffset = Math.max(0, startOffset + deltaDays);
      const newDuration = Math.max(1, duration - deltaDays);
      newStartDate = calculateDateFromOffset(newStartOffset);
      newDueDate = calculateDateFromOffset(newStartOffset + newDuration - 1);
    } else if (dragMode === 'resize-right') {
      // Redimensionner par la droite
      const newDuration = Math.max(1, duration + deltaDays);
      newStartDate = calculateDateFromOffset(startOffset);
      newDueDate = calculateDateFromOffset(startOffset + newDuration - 1);
    } else {
      setDragMode(null);
      return;
    }

    // Appeler le callback avec les nouvelles dates
    try {
      await onDateChange(taskId, newStartDate, newDueDate);
    } catch (error) {
      console.error('Error updating task dates:', error);
      // Réinitialiser en cas d'erreur
      setTempStartOffset(startOffset);
      setTempDuration(duration);
    }

    setDragMode(null);
  }, [dragMode, startOffset, duration, dayWidth, taskId, calculateDateFromOffset, onDateChange, onDragEnd]);

  const currentStartOffset = isDragging ? tempStartOffset : startOffset;
  const currentDuration = isDragging ? tempDuration : duration;

  // Empêcher le clic de remonter après un drag (pour ne pas ouvrir la modale) ; sinon laisser le clic ouvrir la modale
  const handleBarClick = useCallback((e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  }, []);

  // Les poignées de redimensionnement ne doivent jamais ouvrir la modale (clic sans drag)
  const handleResizeHandleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasDraggedRef.current) hasDraggedRef.current = false;
  }, []);

  return (
    <div
      ref={constraintsRef}
      className="absolute top-1/2 -translate-y-1/2 group/bar"
      style={{
        left: `${currentStartOffset * dayWidth}px`,
        width: `${Math.max(currentDuration * dayWidth, dayWidth)}px`,
      }}
    >
      {/* Poignée de redimensionnement gauche */}
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={(e, info) => handleDragStart(e, info, 'resize-left')}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 group-hover/bar:bg-white/20 transition-colors ${
          isDragging && dragMode === 'resize-left' ? 'bg-white/30' : ''
        }`}
        style={{ touchAction: 'none' }}
        onClick={handleResizeHandleClick}
      >
        <div className="absolute inset-y-0 left-0 w-0.5 bg-white/50" />
      </motion.div>

      {/* Barre principale (déplaçable) */}
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={(e, info) => handleDragStart(e, info, 'move')}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={`relative h-7 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-move ${className} ${
          isDragging && dragMode === 'move' ? 'opacity-80 shadow-lg scale-105' : ''
        }`}
        style={{
          backgroundColor: taskStatus === 'cancelled' ? 'rgb(239 68 68 / 0.4)' : color,
          touchAction: 'none',
        }}
        onClick={handleBarClick}
      >
        {/* Partie complétée (gauche) = pleine couleur, partie restante (droite) = estompée */}
        <div
          className="absolute inset-y-0 right-0 bg-white/35 transition-all pointer-events-none"
          style={{ left: `${Math.min(100, Math.max(0, progress))}%` }}
        />

        {/* Contenu */}
        <div className="relative h-full">{children}</div>

        {/* Indicateur de drag */}
        {isDragging && dragMode === 'move' && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 !text-white !text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
            {calculateDateFromOffset(currentStartOffset)} → {calculateDateFromOffset(currentStartOffset + currentDuration - 1)}
          </div>
        )}
      </motion.div>

      {/* Poignée de redimensionnement droite */}
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={(e, info) => handleDragStart(e, info, 'resize-right')}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 group-hover/bar:bg-white/20 transition-colors ${
          isDragging && dragMode === 'resize-right' ? 'bg-white/30' : ''
        }`}
        style={{ touchAction: 'none' }}
        onClick={handleResizeHandleClick}
      >
        <div className="absolute inset-y-0 right-0 w-0.5 bg-white/50" />
      </motion.div>

      {/* Overlay de resize pour indiquer le nouveau range */}
      {isDragging && (dragMode === 'resize-left' || dragMode === 'resize-right') && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 !text-white !text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
          {calculateDateFromOffset(currentStartOffset)} → {calculateDateFromOffset(currentStartOffset + currentDuration - 1)}
          <div className="!text-[10px] !text-white/70 mt-0.5">
            {currentDuration} {currentDuration > 1 ? 'jours' : 'jour'}
          </div>
        </div>
      )}
    </div>
  );
}
