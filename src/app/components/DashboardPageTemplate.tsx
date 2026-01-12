import React from 'react';
import { motion } from 'framer-motion';
import TableFilters, { FilterOption, AdvancedFilter, DateRangeFilter } from '@/app/components/TableFilters';
import DataTable, { Column, CustomAction } from '@/app/components/DataTable';
import LandingPageSkeleton from './LandingPageSkeleton';

interface StatCard {
  label: string;
  value: React.ReactNode;
  colorClass?: string;
  icon?: React.ReactNode;
}

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
}

interface DashboardPageTemplateProps<T> {
  title: string;
  actionButtonLabel: string;
  onActionButtonClick?: () => void;
  additionalActions?: ActionButton[];
  stats?: StatCard[];
  loading: boolean;
  filterOptions?: FilterOption[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  // Advanced filters
  advancedFilters?: AdvancedFilter[];
  onAdvancedFilterChange?: (filterId: string, value: string | string[] | boolean | DateRangeFilter) => void;
  showAdvancedToggle?: boolean;
  // Table props
  columns: Column<T>[];
  data: T[];
  emptyMessage: string;
  children?: React.ReactNode;
  onRowClick?: (row: T) => void;
  // Multi-select props
  selectable?: boolean;
  onDeleteSelected?: (items: T[]) => Promise<void>;
  customActions?: CustomAction<T>[];
  getItemId?: (item: T) => string;
  getItemName?: (item: T) => string;
  // Header extra content (tabs, etc.)
  headerExtra?: React.ReactNode;
  // Sorting, favorites, drag & drop
  sortable?: boolean;
  draggable?: boolean;
  showFavorites?: boolean;
  favoritesFirst?: boolean;
  isFavorite?: (item: T) => boolean;
  onToggleFavorite?: (item: T) => void;
  onReorder?: (items: T[]) => void;
}

export default function DashboardPageTemplate<T>({
  title,
  actionButtonLabel,
  onActionButtonClick,
  additionalActions = [],
  stats = [],
  loading,
  filterOptions = [],
  searchPlaceholder = '',
  searchValue = '',
  onSearchChange,
  statusValue = '',
  onStatusChange,
  advancedFilters = [],
  onAdvancedFilterChange,
  showAdvancedToggle = true,
  columns,
  data,
  emptyMessage,
  children,
  onRowClick,
  selectable = false,
  onDeleteSelected,
  customActions = [],
  getItemId,
  getItemName,
  headerExtra,
  sortable = true,
  draggable = false,
  showFavorites = false,
  favoritesFirst = true,
  isFavorite,
  onToggleFavorite,
  onReorder,
}: DashboardPageTemplateProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="text-3xl !uppercase font-extrabold text-left text-primary">
          {title}
        </h1>
        <div className="flex flex-wrap gap-3 lg:w-fit w-full">
          {/* Additional action buttons */}
          {additionalActions.map((action, index) => (
            <button
              key={index}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-300 cursor-pointer ${
                action.variant === 'outline' 
                  ? 'btn-outline border border-default text-secondary hover:bg-card-hover' 
                  : action.variant === 'primary'
                    ? 'btn-primary'
                    : 'btn-secondary'
              }`}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          {/* Main action button */}
          <button
            className="btn-primary cursor-pointer lg:w-fit w-full rounded-lg px-4 py-2 transition-all duration-300"
            onClick={onActionButtonClick || (() => {})}
          >
            {actionButtonLabel}
          </button>
        </div>
      </div>

      {/* Header extra content (tabs, etc.) */}
      {headerExtra}

      {loading ? (
        <LandingPageSkeleton />
      ) : (
        <>
          {/* Statistiques */}
          {stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="card p-6"
                >
                  <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                    {stat.icon && (
                      <span className="w-6 h-6 flex items-center justify-center">
                        {stat.icon}
                      </span>
                    )}
                    {stat.label}
                  </h3>
                  <p
                    className={`text-3xl font-bold ${
                      stat.colorClass || 'text-accent'
                    }`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Custom content (optionnel) */}
          {children}

          {/* Filtres + Table */}
          <div className="card">
            <div className="p-6">
              <TableFilters
                searchPlaceholder={searchPlaceholder}
                statusOptions={filterOptions}
                onSearchChangeAction={
                  onSearchChange ? onSearchChange : () => {}
                }
                onStatusChangeAction={
                  onStatusChange ? onStatusChange : () => {}
                }
                searchValue={searchValue}
                statusValue={statusValue}
                advancedFilters={advancedFilters}
                onAdvancedFilterChange={onAdvancedFilterChange}
                showAdvancedToggle={showAdvancedToggle}
              />
              <DataTable<T>
                columns={columns}
                data={data}
                loading={loading}
                emptyMessage={emptyMessage}
                onRowClick={onRowClick}
                selectable={selectable}
                onDeleteSelected={onDeleteSelected}
                customActions={customActions}
                getItemId={getItemId}
                getItemName={getItemName}
                sortable={sortable}
                draggable={draggable}
                showFavorites={showFavorites}
                favoritesFirst={favoritesFirst}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
                onReorder={onReorder}
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
