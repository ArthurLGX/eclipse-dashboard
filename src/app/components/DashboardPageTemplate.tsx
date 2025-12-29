import React from 'react';
import { motion } from 'framer-motion';
import TableFilters, { FilterOption } from '@/app/components/TableFilters';
import DataTable, { Column } from '@/app/components/DataTable';
import LandingPageSkeleton from './LandingPageSkeleton';

interface StatCard {
  label: string;
  value: React.ReactNode;
  colorClass?: string;
  icon?: React.ReactNode;
}

interface DashboardPageTemplateProps<T> {
  title: string;
  actionButtonLabel: string;
  onActionButtonClick?: () => void;
  stats?: StatCard[];
  loading: boolean;
  filterOptions?: FilterOption[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  columns: Column<T>[];
  data: T[];
  emptyMessage: string;
  children?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

export default function DashboardPageTemplate<T>({
  title,
  actionButtonLabel,
  onActionButtonClick,
  stats = [],
  loading,
  filterOptions = [],
  searchPlaceholder = '',
  searchValue = '',
  onSearchChange,
  statusValue = '',
  onStatusChange,
  columns,
  data,
  emptyMessage,
  children,
  onRowClick,
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
        <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-zinc-200">
          {title}
        </h1>
        <button
          className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:!text-white transition-colors"
          onClick={onActionButtonClick || (() => {})}
        >
          {actionButtonLabel}
        </button>
      </div>

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
                  className={`bg-zinc-900 p-6 rounded-lg border border-zinc-800 ${stat.colorClass || ''}`}
                >
                  <h3 className="!text-lg font-semibold !text-zinc-200 mb-2 flex items-center gap-2">
                    {stat.icon && (
                      <span className="w-6 h-6 flex items-center justify-center">
                        {stat.icon}
                      </span>
                    )}
                    {stat.label}
                  </h3>
                  <p
                    className={`!text-3xl font-bold ${
                      stat.colorClass ? '' : '!text-emerald-400'
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
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="!text-xl font-semibold !text-zinc-200">{title}</h2>
            </div>
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
              />
              <DataTable<T>
                columns={columns}
                data={data}
                loading={loading}
                emptyMessage={emptyMessage}
                onRowClick={onRowClick}
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
