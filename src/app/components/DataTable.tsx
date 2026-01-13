'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { IconTrash, IconX, IconSquare, IconSquareCheck, IconSquareMinus, IconChevronUp, IconChevronDown, IconGripVertical, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useLanguage } from '../context/LanguageContext';

export interface Column<T = unknown> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean; // Enable sorting for this column
}

export interface CustomAction<T = unknown> {
  label: string;
  icon?: React.ReactNode;
  onClick: (items: T[]) => Promise<void>;
  className?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

export type SortDirection = 'asc' | 'desc' | null;

export type ViewMode = 'table' | 'cards';

export interface DataTableProps<T = unknown> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  // Multi-select props
  selectable?: boolean;
  onDeleteSelected?: (items: T[]) => Promise<void>;
  customActions?: CustomAction<T>[];
  getItemId?: (item: T) => string;
  getItemName?: (item: T) => string;
  // Sorting props
  sortable?: boolean;
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
  // Drag & drop props
  draggable?: boolean;
  onReorder?: (items: T[]) => void;
  // Favorites props
  showFavorites?: boolean;
  onToggleFavorite?: (item: T) => void;
  isFavorite?: (item: T) => boolean;
  favoritesFirst?: boolean;
  // View mode props (table vs cards)
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  mobileBreakpoint?: number; // Default 768
  // Card display customization
  cardTitleKey?: string; // Column key for card title
  cardSubtitleKey?: string; // Column key for card subtitle
  cardStatusKey?: string; // Column key for status badge
  cardTimeKey?: string; // Column key for time/date display
  cardImageKey?: string; // Column key for image (used in desktop grid)
  cardAvatarKey?: string; // Column key for avatar image
}

export default function DataTable<T = unknown>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Aucune donnée trouvée',
  className = '',
  onRowClick,
  selectable = false,
  onDeleteSelected,
  customActions = [],
  getItemId = (item) => (item as { id?: string; documentId?: string }).documentId || (item as { id?: string }).id || '',
  getItemName = (item) => (item as { name?: string }).name || '',
  // Sorting
  sortable = false,
  defaultSortKey,
  defaultSortDirection = null,
  // Drag & drop
  draggable = false,
  onReorder,
  // Favorites
  showFavorites = false,
  onToggleFavorite,
  isFavorite,
  favoritesFirst = true,
  // View mode
  viewMode: controlledViewMode,
  onViewModeChange,
  mobileBreakpoint = 768,
  cardTitleKey,
  cardSubtitleKey,
  cardStatusKey,
  cardImageKey,
  cardAvatarKey,
}: DataTableProps<T>) {
  const { t } = useLanguage();
  
  // Detect mobile screen
  const [isMobile, setIsMobile] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('table');
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);
      // Auto-switch to cards on mobile if not controlled
      if (!controlledViewMode && mobile) {
        setInternalViewMode('cards');
      } else if (!controlledViewMode && !mobile) {
        setInternalViewMode('table');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint, controlledViewMode]);
  
  // Use controlled or internal view mode
  const viewMode = controlledViewMode ?? internalViewMode;
  // Note: setViewMode available via onViewModeChange prop if needed
  
  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Handle column sort
  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  // Sort data
  const sortedData = useMemo(() => {
    const result = [...data];
    
    // Sort favorites first if enabled
    if (showFavorites && favoritesFirst && isFavorite) {
      result.sort((a, b) => {
        const aFav = isFavorite(a) ? 1 : 0;
        const bFav = isFavorite(b) ? 1 : 0;
        return bFav - aFav;
      });
    }
    
    // Apply column sorting
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        
        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
        
        // Compare values
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Date comparison
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortDirection === 'asc' 
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }
        
        // String comparison as fallback
        return sortDirection === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    
    return result;
  }, [data, sortKey, sortDirection, showFavorites, favoritesFirst, isFavorite]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => 
    sortedData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ),
    [sortedData, currentPage, itemsPerPage]
  );

  // For drag & drop, we need local state
  const [localData, setLocalData] = useState<T[]>(paginatedData);
  useEffect(() => {
    setLocalData(paginatedData);
  }, [paginatedData]);

  // Handle reorder
  const handleReorder = useCallback((newOrder: T[]) => {
    setLocalData(newOrder);
    if (onReorder) {
      // Reconstruct full data with new order
      const beforePage = sortedData.slice(0, (currentPage - 1) * itemsPerPage);
      const afterPage = sortedData.slice(currentPage * itemsPerPage);
      const fullNewOrder = [...beforePage, ...newOrder, ...afterPage];
      onReorder(fullNewOrder);
    }
  }, [sortedData, currentPage, itemsPerPage, onReorder]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Drag state - prevent click after drag
  const [isDragging, setIsDragging] = useState(false);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  // Get IDs of current page items
  const currentPageIds = useMemo(() => 
    (draggable ? localData : paginatedData).map(item => getItemId(item)),
    [draggable, localData, paginatedData, getItemId]
  );

  // Get IDs of all items
  const allIds = useMemo(() => 
    sortedData.map(item => getItemId(item)),
    [sortedData, getItemId]
  );

  // Check selection state
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const someCurrentPageSelected = currentPageIds.some(id => selectedIds.has(id));
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const isSelectionMode = selectable && selectedIds.size > 0;

  // Toggle single item selection
  const toggleItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle row click - toggle selection if in selection mode, otherwise navigate
  // Skip if we just finished dragging
  const handleRowClick = (row: T, itemId: string) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }
    if (isSelectionMode) {
      toggleItem(itemId);
    } else {
      onRowClick?.(row);
    }
  };

  // Toggle all items on current page
  const toggleCurrentPage = () => {
    const newSelected = new Set(selectedIds);
    if (allCurrentPageSelected) {
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      currentPageIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  // Select all items
  const selectAll = () => {
    setSelectedIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDeleteSelected) return;
    
    setIsDeleting(true);
    try {
      const itemsToDelete = data.filter(item => selectedIds.has(getItemId(item)));
      await onDeleteSelected(itemsToDelete);
      setSelectedIds(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting items:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get selected items
  const selectedItems = sortedData.filter(item => selectedIds.has(getItemId(item)));
  
  // Display data (drag mode uses local state)
  const displayData = draggable ? localData : paginatedData;

  if (loading) {
    return (
      <div className={` ${className}`}>
        <table className="table w-full">
          <thead>
            <tr className="border-b border-default">
              {draggable && (
                <th className="w-10 py-3 px-2">
                  <div className="h-4 w-4 bg-hover rounded animate-pulse"></div>
                </th>
              )}
              {showFavorites && (
                <th className="w-10 py-3 px-2">
                  <div className="h-4 w-4 bg-hover rounded animate-pulse"></div>
                </th>
              )}
              {selectable && (
                <th className="w-12 py-3 px-4">
                  <div className="h-5 w-5 bg-hover rounded animate-pulse"></div>
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="!text-left py-3 px-4 text-secondary font-semibold"
                >
                  <div className="h-4 bg-hover rounded w-24 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(i => (
              <tr key={i} className="border-b border-default">
                {draggable && (
                  <td className="w-10 px-2">
                    <div className="h-4 w-4 bg-hover rounded animate-pulse"></div>
                  </td>
                )}
                {showFavorites && (
                  <td className="w-10 px-2">
                    <div className="h-4 w-4 bg-hover rounded animate-pulse"></div>
                  </td>
                )}
                {selectable && (
                  <td className="w-12 px-4">
                    <div className="h-5 w-5 bg-hover rounded animate-pulse"></div>
                  </td>
                )}
                {columns.map((column, index) => (
                  <td key={index} className="px-4">
                    <div className="h-4 bg-hover rounded w-20 animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render mobile list view (like appointment list - clean design)
  const renderMobileListView = () => (
    <div className="space-y-0">
      {displayData.length === 0 ? (
        <div className="text-center py-12 text-secondary">
          {emptyMessage}
        </div>
      ) : (
        displayData.map((row, index) => {
          const itemId = getItemId(row);
          const isSelected = selectedIds.has(itemId);
          const isFav = isFavorite?.(row);
          
          // Get values from configured keys
          const titleCol = columns.find(c => c.key === cardTitleKey) || columns[0];
          const subtitleCol = columns.find(c => c.key === cardSubtitleKey) || columns[1];
          const statusCol = columns.find(c => c.key === cardStatusKey);
          const avatarCol = columns.find(c => c.key === cardAvatarKey);
          
          const titleValue = titleCol ? (row as Record<string, unknown>)[titleCol.key] : '';
          const subtitleValue = subtitleCol ? (row as Record<string, unknown>)[subtitleCol.key] : '';
          const statusValue = statusCol ? (row as Record<string, unknown>)[statusCol.key] : null;
          const avatarValue = avatarCol ? (row as Record<string, unknown>)[avatarCol.key] : null;
          
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className={`flex items-center gap-3 py-3 px-4 mb-2 border-default border cursor-pointer transition-colors hover:bg-card-hover active:bg-card-hover rounded-xl ${
                isSelected ? 'bg-accent-light' : 'bg-muted'
              }`}
              onClick={() => handleRowClick(row, itemId)}
            >
              {/* Selection checkbox (drag not supported in cards mode) */}
              {selectable && (
                <button
                  onClick={(e) => toggleItem(itemId, e)}
                  className="flex-shrink-0"
                >
                  {isSelected ? (
                    <IconSquareCheck stroke={1} className="w-5 h-5 text-accent" />
                  ) : (
                    <IconSquare className="w-5 h-5 text-muted" />
                  )}
                </button>
              )}
              
              {/* Logo client - affiché seulement si cardAvatarKey est configuré et a une valeur */}
{!!avatarValue && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-card flex items-center justify-center">
                  <img 
                    src={typeof avatarValue === 'string' ? avatarValue : ''} 
                    alt="" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Name + Description */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-primary truncate">
                  {titleCol?.render ? titleCol.render(titleValue, row) : String(titleValue || '')}
                </div>
                {subtitleValue !== undefined && subtitleValue !== null && subtitleValue !== '' && (
                  <div className="text-sm text-muted truncate">
                    {subtitleCol?.render ? subtitleCol.render(subtitleValue, row) : String(subtitleValue)}
                  </div>
                )}
              </div>
              
              {/* Status badge */}
              {statusValue !== null && statusValue !== undefined && (
                <div className="flex-shrink-0">
                  {statusCol?.render ? statusCol.render(statusValue, row) : (
                    <span className="px-2.5 py-1 rounded-full bg-success-light text-success text-xs font-medium">
                      {String(statusValue)}
                    </span>
                  )}
                </div>
              )}
              
              {/* Favorite star - à droite */}
              {showFavorites && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(row);
                  }}
                  className="flex-shrink-0"
                >
                  {isFav ? (
                    <IconStarFilled className="w-5 h-5 text-warning" />
                  ) : (
                    <IconStar className="w-5 h-5 text-muted" />
                  )}
                </button>
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );

  // Render desktop grid view (visual cards with images)
  const renderDesktopGridView = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {displayData.length === 0 ? (
        <div className="col-span-full text-center py-12 text-secondary">
          {emptyMessage}
        </div>
      ) : (
        displayData.map((row, index) => {
          const itemId = getItemId(row);
          const isSelected = selectedIds.has(itemId);
          const isFav = isFavorite?.(row);
          
          // Get values from configured keys
          const titleCol = columns.find(c => c.key === cardTitleKey) || columns[0];
          const subtitleCol = columns.find(c => c.key === cardSubtitleKey) || columns[1];
          const statusCol = columns.find(c => c.key === cardStatusKey);
          const imageCol = columns.find(c => c.key === cardImageKey);
          
          const titleValue = titleCol ? (row as Record<string, unknown>)[titleCol.key] : '';
          const subtitleValue = subtitleCol ? (row as Record<string, unknown>)[subtitleCol.key] : '';
          const statusValue = statusCol ? (row as Record<string, unknown>)[statusCol.key] : null;
          const imageValue = imageCol ? (row as Record<string, unknown>)[imageCol.key] : null;
          
          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.015 }}
              className={`group card overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                isSelected ? 'ring-1 ring-[var(--color-accent)] bg-accent-light' : ''
              }`}
              onClick={() => handleRowClick(row, itemId)}
            >
              {/* Image header */}
              <div className="relative aspect-square bg-gradient-to-br from-muted to-muted overflow-hidden">
                {imageValue ? (
                  <img 
                    src={typeof imageValue === 'string' ? imageValue : ''} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted-light to-muted">
                    <span className="text-5xl font-bold text-secondary">
                      {String(titleValue || '').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Top left overlays: Checkbox (drag not supported in grid mode) */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {/* Selection checkbox */}
                  {selectable && (
                    <button
                      onClick={(e) => toggleItem(itemId, e)}
                      className={`p-1 rounded-lg transition-opacity ${
                        isSelected ? 'bg-accent' : 'bg-card-hover backdrop-blur shadow-sm opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected ? (
                        <IconSquareCheck stroke={1} className="w-5 h-5 text-white" />
                      ) : (
                        <IconSquare className="w-5 h-5 text-secondary" />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Status badge overlay - top right */}
                {statusValue !== null && statusValue !== undefined && (
                  <div className="absolute top-2 right-2">
                    {statusCol?.render ? statusCol.render(statusValue, row) : (
                      <span className="px-2 py-1 rounded-lg bg-card/90 backdrop-blur text-xs font-medium text-primary shadow-sm">
                        {String(statusValue)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Card content */}
              <div className="p-3">
                <div className="flex items-start gap-2">
                  {/* Favorite star */}
                  {showFavorites && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite?.(row);
                      }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {isFav ? (
                        <IconStarFilled className="w-4 h-4 text-warning" />
                      ) : (
                        <IconStar className="w-4 h-4 text-muted hover:text-warning transition-colors" />
                      )}
                    </button>
                  )}
                  
                  {/* Title and subtitle */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary truncate text-sm">
                      {titleCol?.render ? titleCol.render(titleValue, row) : String(titleValue || '')}
                    </h3>
                    {subtitleValue !== undefined && subtitleValue !== null && subtitleValue !== '' && (
                      <div className="text-xs text-muted truncate mt-0.5">
                        {subtitleCol?.render ? subtitleCol.render(subtitleValue, row) : String(subtitleValue)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  // Choose which card view to render based on screen size
  const renderCardsView = () => {
    if (isMobile) {
      return renderMobileListView();
    }
    return renderDesktopGridView();
  };

  return (
    <div className={` h-fit ${className}`}>
      {/* Selection action bar */}
      <AnimatePresence>
        {selectable && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-4 p-3 rounded-xl bg-muted border border-muted"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-primary font-medium">
                {selectedIds.size} {t('items_selected') || 'élément(s) sélectionné(s)'}
              </span>
              {!allSelected && (
                <button
                  onClick={selectAll}
                  className="text-sm text-accent hover:underline"
                >
                  {t('select_all') || 'Tout sélectionner'} ({allIds.length})
                </button>
              )}
              <button
                onClick={clearSelection}
                className="text-sm text-secondary hover:text-primary"
              >
                {t('clear_selection') || 'Annuler la sélection'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Custom actions */}
              {customActions.map((action, index) => {
                const variantClasses = {
                  primary: 'bg-accent text-white hover:bg-[var(--color-accent)]',
                  success: 'bg-success text-white hover:bg-[var(--color-success)]',
                  warning: 'bg-warning text-white hover:bg-[var(--color-warning)]',
                  danger: 'bg-danger text-white hover:bg-[var(--color-danger)]',
                };
                return (
                  <button
                    key={index}
                    onClick={async () => {
                      await action.onClick(selectedItems);
                      clearSelection();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      action.className || variantClasses[action.variant || 'primary']
                    }`}
                  >
                    {action.icon}
                    {action.label} ({selectedIds.size})
                  </button>
                );
              })}
              {/* Delete action */}
              {onDeleteSelected && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger text-white hover:bg-[var(--color-danger)] transition-colors"
                >
                  <IconTrash className="w-4 h-4" />
                  {t('delete_selected') || 'Supprimer'} ({selectedIds.size})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards view for mobile */}
      {viewMode === 'cards' && renderCardsView()}
      
      {/* Table view for desktop */}
      {viewMode === 'table' && (
      <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr className="border-b border-default">
            {draggable && (
              <th className="w-10 py-3 px-2">
                {/* Drag handle column */}
              </th>
            )}
            {showFavorites && (
              <th className="w-10 py-3 px-2">
                <IconStar className="w-4 h-4 text-muted" />
              </th>
            )}
            {selectable && (
              <th className="w-12 py-3 px-2 lg:px-4">
                <button
                  onClick={toggleCurrentPage}
                  className="flex items-center justify-center text-secondary hover:text-primary transition-colors"
                >
                  {allCurrentPageSelected ? (
                    <IconSquareCheck stroke={1} className="w-5 h-5 text-accent" />
                  ) : someCurrentPageSelected ? (
                    <IconSquareMinus stroke={1} className="w-5 h-5 text-accent" />
                  ) : (
                    <IconSquare className="w-5 h-5" />
                  )}
                </button>
              </th>
            )}
            {columns.map((column, index) => {
              const isSortable = sortable && column.sortable !== false;
              const isCurrentSort = sortKey === column.key;
              
              return (
                <th
                  key={index}
                  className={`!text-left py-3 px-2 lg:px-4 text-secondary font-semibold !capitalize ${isSortable ? 'cursor-pointer hover:text-primary select-none' : ''}`}
                  onClick={isSortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {isSortable && (
                      <span className="flex flex-col">
                        <IconChevronUp 
                          className={`w-3 h-3 -mb-1 ${isCurrentSort && sortDirection === 'asc' ? 'text-accent' : 'text-muted'}`} 
                        />
                        <IconChevronDown 
                          className={`w-3 h-3 ${isCurrentSort && sortDirection === 'desc' ? 'text-accent' : 'text-muted'}`} 
                        />
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        {draggable && displayData.length > 0 ? (
          <Reorder.Group 
            as="tbody" 
            axis="y" 
            values={localData} 
            onReorder={handleReorder}
          >
                {localData.map((row, index) => {
                  const itemId = getItemId(row);
                  const isSelected = selectedIds.has(itemId);
                  const rowIsFavorite = isFavorite ? isFavorite(row) : false;
                  
                  return (
                    <Reorder.Item
                      as="tr"
                      key={itemId || index}
                      value={row}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
                      onClick={() => handleRowClick(row, itemId)}
                      className={`cursor-pointer border-b border-default !font-light transition-colors ${
                          isSelected ? 'bg-accent-light' : ''
                      } ${rowIsFavorite ? 'bg-warning-light' : ''}`}
                    >
                      <td className="w-10 py-4 px-2">
                        <IconGripVertical className="w-4 h-4 text-muted cursor-grab active:cursor-grabbing" />
                      </td>
                      {showFavorites && (
                        <td className="w-10 py-4 px-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite?.(row);
                            }}
                            className="text-muted hover:text-warning transition-colors"
                          >
                            {rowIsFavorite ? (
                              <IconStarFilled className="w-4 h-4 text-warning" />
                            ) : (
                              <IconStar className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      {selectable && (
                        <td className="w-12 py-4 px-2 lg:px-4">
                          <button
                            onClick={(e) => toggleItem(itemId, e)}
                            className="flex items-center justify-center text-secondary hover:text-primary transition-colors"
                          >
                            {isSelected ? (
                              <IconSquareCheck className="w-5 h-5 text-accent" />
                            ) : (
                              <IconSquare className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((column, colIndex) => (
                        <td
                          key={colIndex}
                          className={`py-4 px-2 lg:px-4 text-muted !font-light ${column.className || ''}`}
                        >
                          {column.render
                            ? column.render(
                                (row as Record<string, unknown>)[column.key],
                                row
                              )
                            : ((row as Record<string, unknown>)[
                                column.key
                              ] as string) || 'N/A'}
                        </td>
                      ))}
                    </Reorder.Item>
                  );
                })}
          </Reorder.Group>
        ) : (
          <tbody>
            {displayData.length > 0 ? (
              displayData.map((row, index) => {
                const itemId = getItemId(row);
                const isSelected = selectedIds.has(itemId);
                const rowIsFavorite = isFavorite ? isFavorite(row) : false;
                
                return (
                  <tr
                    key={itemId || index}
                    onClick={() => handleRowClick(row, itemId)}
                    className={`cursor-pointer border-b border-default !font-light transition-colors hover:bg-hover ${
                      isSelected ? 'bg-accent-light' : ''
                    } ${rowIsFavorite ? 'bg-warning-light' : ''}`}
                  >
                    {showFavorites && (
                      <td className="w-10 py-4 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(row);
                          }}
                          className="text-muted hover:text-warning transition-colors"
                        >
                          {rowIsFavorite ? (
                            <IconStarFilled className="w-4 h-4 text-warning" />
                          ) : (
                            <IconStar className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}
                    {selectable && (
                      <td className="w-12 py-4 px-2 lg:px-4">
                        <button
                          onClick={(e) => toggleItem(itemId, e)}
                          className="flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        >
                          {isSelected ? (
                            <IconSquareCheck className="w-5 h-5 text-accent" />
                          ) : (
                            <IconSquare className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className={`py-4 px-2 lg:px-4 text-muted !font-light ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(
                              (row as Record<string, unknown>)[column.key],
                              row
                            )
                          : ((row as Record<string, unknown>)[
                              column.key
                            ] as string) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (showFavorites ? 1 : 0)}
                  className="py-8 px-2 lg:px-4 !text-center text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        )}
      </table>
      </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-ghost px-3 py-1 disabled:opacity-50"
          >
            {t('previous') || 'Précédent'}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded border ${
                page === currentPage
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-ghost px-3 py-1 disabled:opacity-50"
          >
            {t('next') || 'Suivant'}
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-muted rounded-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-muted">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-danger-light">
                    <IconTrash className="w-6 h-6 text-danger" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-primary">
                      {t('delete_multiple_title') || 'Supprimer les éléments'}
                    </h2>
                    <p className="text-sm text-secondary">
                      {t('delete_multiple_subtitle')?.replace('{count}', selectedIds.size.toString()) || 
                        `${selectedIds.size} élément(s) sélectionné(s)`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="p-2 rounded-lg hover:bg-card-hover transition-colors disabled:opacity-50"
                >
                  <IconX className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-muted border border-muted">
                  <p className="text-sm text-danger">
                    {t('delete_multiple_warning') || 'Cette action est irréversible. Les éléments suivants seront définitivement supprimés :'}
                  </p>
                </div>

                {/* List of items to delete */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedItems.slice(0, 10).map((item) => (
                    <div
                      key={getItemId(item)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-card-hover"
                    >
                      <div className="w-2 h-2 rounded-full bg-danger" />
                      <span className="text-sm text-primary truncate">
                        {getItemName(item) || getItemId(item)}
                      </span>
                    </div>
                  ))}
                  {selectedItems.length > 10 && (
                    <p className="text-sm text-secondary text-center py-2">
                      ... {t('and_more')?.replace('{count}', (selectedItems.length - 10).toString()) || 
                        `et ${selectedItems.length - 10} autre(s)`}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-default bg-card-hover">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-secondary hover:text-primary hover:bg-card-hover transition-colors disabled:opacity-50"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-danger text-white hover:bg-[var(--color-danger)] transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('deleting') || 'Suppression...'}
                    </>
                  ) : (
                    <>
                      <IconTrash className="w-4 h-4" />
                      {t('delete_x_elements')?.replace('{count}', selectedIds.size.toString()) || 
                        `Supprimer ${selectedIds.size} élément(s)`}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
