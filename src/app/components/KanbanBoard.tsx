'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { IconGripVertical, IconPlus, IconDots, IconTrash, IconEye, IconEdit, IconMail, IconPhone, IconWorld, IconBuilding, IconCurrencyEuro, IconCalendar } from '@tabler/icons-react';
import type { Prospect, ProspectStatus, ProspectPriority } from '@/types';

// Configuration des colonnes du pipeline
export interface PipelineColumn {
  id: ProspectStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface KanbanBoardProps {
  prospects: Prospect[];
  onStatusChange: (prospectId: string, newStatus: ProspectStatus) => Promise<void>;
  onProspectClick: (prospect: Prospect) => void;
  onAddProspect?: (status: ProspectStatus) => void;
  onDeleteProspect?: (prospect: Prospect) => void;
  loading?: boolean;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: 'new', title: 'pipeline_new', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800' },
  { id: 'form_sent', title: 'pipeline_form_sent', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/30', borderColor: 'border-purple-200 dark:border-purple-800' },
  { id: 'qualified', title: 'pipeline_qualified', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30', borderColor: 'border-cyan-200 dark:border-cyan-800' },
  { id: 'quote_sent', title: 'pipeline_quote_sent', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800' },
  { id: 'quote_accepted', title: 'pipeline_quote_accepted', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30', borderColor: 'border-green-200 dark:border-green-800' },
  { id: 'in_progress', title: 'pipeline_in_progress', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'delivered', title: 'pipeline_delivered', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'maintenance', title: 'pipeline_maintenance', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950/30', borderColor: 'border-teal-200 dark:border-teal-800' },
  { id: 'lost', title: 'pipeline_lost', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800' },
];

const PRIORITY_COLORS: Record<ProspectPriority, { bg: string; text: string; icon: string }> = {
  low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: 'text-slate-400' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
  high: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: 'text-red-500' },
};

// Composant carte prospect
function ProspectCard({ 
  prospect,
  onClick,
  onDelete,
  isDragging 
}: { 
  prospect: Prospect;
  onClick: () => void;
  onDelete?: () => void;
  isDragging: boolean;
}) {
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  const priorityStyle = prospect.priority 
    ? PRIORITY_COLORS[prospect.priority] 
    : PRIORITY_COLORS.medium;

  const formatCurrency = (value: number | undefined) => {
    if (!value) return null;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={`
        group relative bg-card border border-border rounded-lg p-3 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-accent/50
        ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-xl' : ''}
      `}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('prospectId', prospect.documentId);
        e.dataTransfer.setData('currentStatus', prospect.prospect_status);
      }}
    >
      {/* Header avec titre et menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconGripVertical size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <h4 className="font-medium text-sm text-foreground truncate">{prospect.title}</h4>
        </div>
        
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <IconDots size={14} className="text-muted-foreground" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-6 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={(e) => { e.stopPropagation(); onClick(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
                >
                  <IconEye size={14} /> {t('view') || 'Voir'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onClick(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
                >
                  <IconEdit size={14} /> {t('edit') || 'Modifier'}
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-hover text-red-600 flex items-center gap-2"
                  >
                    <IconTrash size={14} /> {t('delete') || 'Supprimer'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Company */}
      {prospect.company && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <IconBuilding size={12} />
          <span className="truncate">{prospect.company}</span>
        </div>
      )}

      {/* Contact info */}
      <div className="flex flex-wrap gap-2 mb-2">
        {prospect.email && (
          <a 
            href={`mailto:${prospect.email}`} 
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
          >
            <IconMail size={12} />
          </a>
        )}
        {prospect.phone && (
          <a 
            href={`tel:${prospect.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
          >
            <IconPhone size={12} />
          </a>
        )}
        {prospect.website && (
          <a 
            href={prospect.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
          >
            <IconWorld size={12} />
          </a>
        )}
      </div>

      {/* Footer avec budget, date, priorité */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          {prospect.estimated_value && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <IconCurrencyEuro size={12} />
              {formatCurrency(prospect.estimated_value)?.replace('€', '')}
            </span>
          )}
          {prospect.next_action_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <IconCalendar size={12} />
              {formatDate(prospect.next_action_date)}
            </span>
          )}
        </div>
        
        {prospect.priority && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
            {t(`priority_${prospect.priority}`) || prospect.priority}
          </span>
        )}
      </div>

      {/* Next action reminder */}
      {prospect.next_action && (
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs text-amber-700 dark:text-amber-400 truncate">
          📌 {prospect.next_action}
        </div>
      )}
    </div>
  );
}

// Composant colonne
function KanbanColumn({ 
  column, 
  prospects,
  onStatusChange,
  onProspectClick,
  onAddProspect,
  onDeleteProspect,
  totalValue,
}: {
  column: PipelineColumn;
  prospects: Prospect[];
  onStatusChange: (prospectId: string, newStatus: ProspectStatus) => Promise<void>;
  onProspectClick: (prospect: Prospect) => void;
  onAddProspect?: () => void;
  onDeleteProspect?: (prospect: Prospect) => void;
  totalValue: number;
}) {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [_draggingId, _setDraggingId] = useState<string | null>(null);

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
    
    const prospectId = e.dataTransfer.getData('prospectId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    
    if (prospectId && currentStatus !== column.id) {
      await onStatusChange(prospectId, column.id);
    }
  }, [column.id, onStatusChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div 
      className={`
        flex flex-col min-w-[280px] max-w-[320px] rounded-xl border-2 transition-all duration-200
        ${isDragOver ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-transparent'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={`p-3 rounded-t-lg ${column.bgColor} border-b ${column.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm ${column.color}`}>
              {t(column.title) || column.title}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${column.bgColor} ${column.color} border ${column.borderColor}`}>
              {prospects.length}
            </span>
          </div>
          {onAddProspect && (
            <button
              onClick={onAddProspect}
              className={`p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors ${column.color}`}
            >
              <IconPlus size={16} />
            </button>
          )}
        </div>
        {totalValue > 0 && (
          <div className={`text-xs mt-1 ${column.color} opacity-80`}>
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[200px]">
        {prospects.map((prospect) => (
          <ProspectCard
            key={prospect.documentId}
            prospect={prospect}
            onClick={() => onProspectClick(prospect)}
            onDelete={onDeleteProspect ? () => onDeleteProspect(prospect) : undefined}
            isDragging={_draggingId === prospect.documentId}
          />
        ))}
        
        {prospects.length === 0 && (
          <div className="h-full min-h-[100px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              {t('pipeline_empty_column') || 'Glissez un prospect ici'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant principal KanbanBoard
export default function KanbanBoard({
  prospects,
  onStatusChange,
  onProspectClick,
  onAddProspect,
  onDeleteProspect,
  loading = false,
}: KanbanBoardProps) {
  const { t } = useLanguage();

  // Grouper les prospects par statut
  const prospectsByStatus = PIPELINE_COLUMNS.reduce((acc, column) => {
    acc[column.id] = prospects.filter(p => p.prospect_status === column.id);
    return acc;
  }, {} as Record<ProspectStatus, Prospect[]>);

  // Calculer la valeur totale par colonne
  const valueByStatus = PIPELINE_COLUMNS.reduce((acc, column) => {
    acc[column.id] = prospectsByStatus[column.id].reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    return acc;
  }, {} as Record<ProspectStatus, number>);

  // Stats globales
  const totalProspects = prospects.length;
  const totalValue = prospects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const wonValue = prospectsByStatus['quote_accepted'].reduce((sum, p) => sum + (p.estimated_value || 0), 0)
    + prospectsByStatus['in_progress'].reduce((sum, p) => sum + (p.estimated_value || 0), 0)
    + prospectsByStatus['delivered'].reduce((sum, p) => sum + (p.estimated_value || 0), 0)
    + prospectsByStatus['maintenance'].reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('pipeline_total_prospects') || 'Total prospects'}:</span>
          <span className="font-semibold text-foreground">{totalProspects}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('pipeline_potential_value') || 'Valeur potentielle'}:</span>
          <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('pipeline_won_value') || 'Valeur gagnée'}:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(wonValue)}</span>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {PIPELINE_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            prospects={prospectsByStatus[column.id]}
            onStatusChange={onStatusChange}
            onProspectClick={onProspectClick}
            onAddProspect={onAddProspect ? () => onAddProspect(column.id) : undefined}
            onDeleteProspect={onDeleteProspect}
            totalValue={valueByStatus[column.id]}
          />
        ))}
      </div>
    </div>
  );
}

export { PIPELINE_COLUMNS };

