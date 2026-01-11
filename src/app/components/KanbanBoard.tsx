'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { IconGripVertical, IconPlus, IconDots, IconTrash, IconEye, IconEdit, IconMail, IconPhone, IconWorld, IconBuilding, IconCurrencyEuro, IconCalendar } from '@tabler/icons-react';
import type { Client, PipelineStatus, ContactPriority } from '@/types';

// Configuration des colonnes du pipeline
export interface PipelineColumn {
  id: PipelineStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface KanbanBoardProps {
  contacts: Client[];
  onStatusChange: (contactId: string, newStatus: PipelineStatus) => Promise<void>;
  onContactClick: (contact: Client) => void;
  onAddContact?: (status: PipelineStatus) => void;
  onDeleteContact?: (contact: Client) => void;
  onSelectExistingContact?: (status: PipelineStatus) => void;
  loading?: boolean;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: 'new', title: 'pipeline_new', color: 'text-info', bgColor: 'bg-info-light', borderColor: 'border-info' },
  { id: 'contacted', title: 'pipeline_contacted', color: 'text-accent', bgColor: 'bg-accent-light', borderColor: 'border-accent' },
  { id: 'form_sent', title: 'pipeline_form_sent', color: 'text-accent', bgColor: 'bg-accent-light', borderColor: 'border-accent' },
  { id: 'qualified', title: 'pipeline_qualified', color: 'text-info', bgColor: 'bg-info-light', borderColor: 'border-info' },
  { id: 'quote_sent', title: 'pipeline_quote_sent', color: 'text-warning', bgColor: 'bg-warning-light', borderColor: 'border-warning' },
  { id: 'quote_accepted', title: 'pipeline_quote_accepted', color: 'text-success', bgColor: 'bg-success-light', borderColor: 'border-success' },
  { id: 'negotiation', title: 'pipeline_negotiation', color: 'text-warning', bgColor: 'bg-warning-light', borderColor: 'border-warning' },
  { id: 'in_progress', title: 'pipeline_in_progress', color: 'text-accent', bgColor: 'bg-accent-light', borderColor: 'border-accent' },
  { id: 'delivered', title: 'pipeline_delivered', color: 'text-success', bgColor: 'bg-success-light', borderColor: 'border-success' },
  { id: 'won', title: 'pipeline_won', color: 'text-success', bgColor: 'bg-success-light', borderColor: 'border-success' },
  { id: 'maintenance', title: 'pipeline_maintenance', color: 'text-info', bgColor: 'bg-info-light', borderColor: 'border-info' },
  { id: 'lost', title: 'pipeline_lost', color: 'text-danger', bgColor: 'bg-danger-light', borderColor: 'border-danger' },
];

const PRIORITY_COLORS: Record<ContactPriority, { bg: string; text: string; icon: string }> = {
  low: { bg: 'bg-muted', text: 'text-muted-foreground', icon: 'text-muted-foreground' },
  medium: { bg: 'bg-warning-light', text: 'text-warning', icon: 'text-warning' },
  high: { bg: 'bg-danger-light', text: 'text-danger', icon: 'text-danger' },
};

// Composant carte contact
function ContactCard({ 
  contact,
  onClick,
  onDelete,
  isDragging 
}: { 
  contact: Client;
  onClick: () => void;
  onDelete?: () => void;
  isDragging: boolean;
}) {
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  const priorityStyle = contact.priority 
    ? PRIORITY_COLORS[contact.priority] 
    : PRIORITY_COLORS.medium;

  const formatCurrency = (value: number | undefined) => {
    if (!value) return null;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className={`
        group relative bg-card border border-muted rounded-lg p-3 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-accent/50
        ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-xl' : ''}
      `}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('contactId', contact.documentId);
        e.dataTransfer.setData('currentStatus', contact.pipeline_status || 'new');
      }}
    >
      {/* Header avec avatar, titre et menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconGripVertical size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          
          {/* Avatar */}
          {contact.image?.url ? (
            <img 
              src={contact.image.url} 
              alt={contact.name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-accent">{getInitials(contact.name)}</span>
            </div>
          )}
          
          <div className="min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">{contact.name}</h4>
            {contact.processStatus === 'client' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                Client
              </span>
            )}
          </div>
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
              <div className="absolute right-0 top-6 z-50 bg-card border border-muted rounded-lg shadow-lg py-1 min-w-[140px]">
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

      {/* Entreprise */}
      {contact.enterprise && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <IconBuilding size={12} />
          <span className="truncate">{contact.enterprise}</span>
        </div>
      )}

      {/* Contact info */}
      <div className="flex flex-wrap gap-2 mb-2">
        {contact.email && (
          <a 
            href={`mailto:${contact.email}`} 
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
          >
            <IconMail size={12} />
          </a>
        )}
        {contact.phone && (
          <a 
            href={`tel:${contact.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
          >
            <IconPhone size={12} />
          </a>
        )}
        {contact.website && (
          <a 
            href={contact.website}
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
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-muted">
        <div className="flex items-center gap-2">
          {contact.estimated_value && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <IconCurrencyEuro size={12} />
              {formatCurrency(contact.estimated_value)?.replace('€', '')}
            </span>
          )}
          {contact.next_action_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <IconCalendar size={12} />
              {formatDate(contact.next_action_date)}
            </span>
          )}
        </div>
        
        {contact.priority && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
            {t(`priority_${contact.priority}`) || contact.priority}
          </span>
        )}
      </div>

      {/* Next action reminder */}
      {contact.next_action && (
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs text-amber-700 dark:text-amber-400 truncate">
          📌 {contact.next_action}
        </div>
      )}
    </div>
  );
}

// Composant colonne
function KanbanColumn({ 
  column, 
  contacts,
  onStatusChange,
  onContactClick,
  onAddContact,
  onSelectExistingContact,
  onDeleteContact,
  totalValue,
}: {
  column: PipelineColumn;
  contacts: Client[];
  onStatusChange: (contactId: string, newStatus: PipelineStatus) => Promise<void>;
  onContactClick: (contact: Client) => void;
  onAddContact?: () => void;
  onSelectExistingContact?: () => void;
  onDeleteContact?: (contact: Client) => void;
  totalValue: number;
}) {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const contactId = e.dataTransfer.getData('contactId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    
    if (contactId && currentStatus !== column.id) {
      await onStatusChange(contactId, column.id);
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
      <div className={`kanban-header p-3 rounded-t-lg ${column.bgColor} border-b ${column.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm ${column.color}`}>
              {t(column.title) || column.title}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${column.bgColor} ${column.color} border ${column.borderColor}`}>
              {contacts.length}
            </span>
          </div>
          {(onAddContact || onSelectExistingContact) && (
            <button
              onClick={onSelectExistingContact || onAddContact}
              className={`p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors ${column.color}`}
              title={t('add_contact') || 'Ajouter un contact'}
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
        {contacts.map((contact) => (
          <ContactCard
            key={contact.documentId}
            contact={contact}
            onClick={() => onContactClick(contact)}
            onDelete={onDeleteContact ? () => onDeleteContact(contact) : undefined}
            isDragging={_draggingId === contact.documentId}
          />
        ))}
        
        {contacts.length === 0 && (
          <div className="h-full min-h-[100px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              {t('pipeline_empty_column') || 'Glissez un contact ici'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant principal KanbanBoard
export default function KanbanBoard({
  contacts,
  onStatusChange,
  onContactClick,
  onAddContact,
  onSelectExistingContact,
  onDeleteContact,
  loading = false,
}: KanbanBoardProps) {
  const { t } = useLanguage();

  // Grouper les contacts par pipeline_status
  const contactsByStatus = PIPELINE_COLUMNS.reduce((acc, column) => {
    acc[column.id] = contacts.filter(c => (c.pipeline_status || 'new') === column.id);
    return acc;
  }, {} as Record<PipelineStatus, Client[]>);

  // Calculer la valeur totale par colonne
  const valueByStatus = PIPELINE_COLUMNS.reduce((acc, column) => {
    acc[column.id] = contactsByStatus[column.id].reduce((sum, c) => sum + (c.estimated_value || 0), 0);
    return acc;
  }, {} as Record<PipelineStatus, number>);

  // Stats globales
  const totalContacts = contacts.length;
  const totalValue = contacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0);
  const wonValue = (contactsByStatus['quote_accepted']?.reduce((sum, c) => sum + (c.estimated_value || 0), 0) || 0)
    + (contactsByStatus['in_progress']?.reduce((sum, c) => sum + (c.estimated_value || 0), 0) || 0)
    + (contactsByStatus['delivered']?.reduce((sum, c) => sum + (c.estimated_value || 0), 0) || 0)
    + (contactsByStatus['won']?.reduce((sum, c) => sum + (c.estimated_value || 0), 0) || 0)
    + (contactsByStatus['maintenance']?.reduce((sum, c) => sum + (c.estimated_value || 0), 0) || 0);
  
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
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border border-muted">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('pipeline_total_contacts') || 'Total contacts'}:</span>
          <span className="font-semibold text-foreground">{totalContacts}</span>
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
            contacts={contactsByStatus[column.id] || []}
            onStatusChange={onStatusChange}
            onContactClick={onContactClick}
            onAddContact={onAddContact ? () => onAddContact(column.id) : undefined}
            onSelectExistingContact={onSelectExistingContact ? () => onSelectExistingContact(column.id) : undefined}
            onDeleteContact={onDeleteContact}
            totalValue={valueByStatus[column.id] || 0}
          />
        ))}
      </div>
    </div>
  );
}

export { PIPELINE_COLUMNS };
