'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface TableFiltersProps {
  searchPlaceholder?: string;
  statusOptions?: FilterOption[];
  onSearchChangeAction: (value: string) => void;
  onStatusChangeAction: (value: string) => void;
  searchValue: string;
  statusValue: string;
}

export default function TableFilters({
  searchPlaceholder = 'Rechercher...',
  statusOptions = [],
  onSearchChangeAction,
  onStatusChangeAction,
  searchValue,
  statusValue,
}: TableFiltersProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center sm:flex-row gap-4 mb-6">
      {/* Barre de recherche */}
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChangeAction(e.target.value)}
            className="w-full px-4 py-2 pl-10 placeholder:text-sm bg-zinc-800 border border-zinc-700 rounded-lg !text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 !text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Filtre par statut */}
      {statusOptions.length > 0 && (
        <div className="sm:w-48">
          <select
            value={statusValue}
            onChange={e => onStatusChangeAction(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg !text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t('all_statuses')}</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}{' '}
                {option.count !== undefined && `(${option.count})`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
