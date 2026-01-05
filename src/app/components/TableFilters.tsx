'use client';
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IconSearch, 
  IconFilter, 
  IconX, 
  IconChevronDown,
  IconAdjustments
} from '@tabler/icons-react';
import ToggleButton from './ToggleButton';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface DateRangeFilter {
  from: string;
  to: string;
}

export interface AdvancedFilter {
  id: string;
  type: 'select' | 'toggle' | 'date-range' | 'multi-select';
  label: string;
  options?: FilterOption[];
  value?: string | string[] | boolean | DateRangeFilter;
  placeholder?: string;
}

export interface TableFiltersProps {
  searchPlaceholder?: string;
  statusOptions?: FilterOption[];
  onSearchChangeAction: (value: string) => void;
  onStatusChangeAction: (value: string) => void;
  searchValue: string;
  statusValue: string;
  // Advanced filters
  advancedFilters?: AdvancedFilter[];
  onAdvancedFilterChange?: (filterId: string, value: string | string[] | boolean | DateRangeFilter) => void;
  showAdvancedToggle?: boolean;
}

export default function TableFilters({
  searchPlaceholder = 'Rechercher...',
  statusOptions = [],
  onSearchChangeAction,
  onStatusChangeAction,
  searchValue,
  statusValue,
  advancedFilters = [],
  onAdvancedFilterChange,
  showAdvancedToggle = true,
}: TableFiltersProps) {
  const { t } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openMultiSelect, setOpenMultiSelect] = useState<string | null>(null);

  // Count active advanced filters
  const activeFiltersCount = advancedFilters.filter(f => {
    if (f.type === 'toggle') return f.value === true;
    if (f.type === 'multi-select') return Array.isArray(f.value) && f.value.length > 0;
    if (f.type === 'date-range') {
      const range = f.value as DateRangeFilter;
      return range?.from || range?.to;
    }
    return f.value && f.value !== '';
  }).length;

  const handleMultiSelectToggle = (filterId: string, optionValue: string) => {
    const filter = advancedFilters.find(f => f.id === filterId);
    if (!filter || !onAdvancedFilterChange) return;
    
    const currentValues = (filter.value as string[]) || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    
    onAdvancedFilterChange(filterId, newValues);
  };

  const clearAllFilters = () => {
    onSearchChangeAction('');
    onStatusChangeAction('');
    advancedFilters.forEach(filter => {
      if (onAdvancedFilterChange) {
        if (filter.type === 'toggle') {
          onAdvancedFilterChange(filter.id, false);
        } else if (filter.type === 'multi-select') {
          onAdvancedFilterChange(filter.id, []);
        } else if (filter.type === 'date-range') {
          onAdvancedFilterChange(filter.id, { from: '', to: '' });
        } else {
          onAdvancedFilterChange(filter.id, '');
        }
      }
    });
  };

  const hasActiveFilters = searchValue || statusValue || activeFiltersCount > 0;

  // Séparer les filtres par type pour un meilleur affichage
  const selectFilters = advancedFilters.filter(f => f.type === 'select' || f.type === 'multi-select');
  const toggleFilters = advancedFilters.filter(f => f.type === 'toggle');
  const dateFilters = advancedFilters.filter(f => f.type === 'date-range');

  return (
    <div className="space-y-4 mb-6">
      {/* Main filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="flex-1 relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChangeAction(e.target.value)}
            className="input w-full py-2.5 pr-4 !pl-10 placeholder:text-muted"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChangeAction('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <IconX className="w-4 h-4 text-muted" />
            </button>
          )}
        </div>

        {/* Status filter */}
        {statusOptions.length > 0 && (
          <div className="sm:w-52">
            <select
              value={statusValue}
              onChange={e => onStatusChangeAction(e.target.value)}
              className="input w-full px-4 py-2.5"
            >
              <option value="">{t('all_statuses') || 'Tous les statuts'}</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}{' '}
                  {option.count !== undefined && `(${option.count})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Advanced filters toggle */}
        {showAdvancedToggle && advancedFilters.length > 0 && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
              showAdvanced || activeFiltersCount > 0
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-card border-default text-secondary hover:border-accent/50'
            }`}
          >
            <IconAdjustments className="w-5 h-5" />
            <span className="hidden sm:inline">{t('advanced_filters') || 'Filtres avancés'}</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
            <IconChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
          >
            <IconX className="w-4 h-4" />
            <span className="hidden sm:inline">{t('clear_filters') || 'Effacer'}</span>
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      <AnimatePresence>
        {showAdvanced && advancedFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 lg:p-5 rounded-xl bg-card border border-default shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-default">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <IconFilter className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm font-semibold text-primary">
                  {t('filter_by') || 'Filtrer par'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                    {activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Filters Grid */}
              <div className="space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-6">
                
                {/* Select Filters */}
                {selectFilters.map(filter => (
                  <div key={filter.id} className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3">
                    <label className="text-sm font-medium text-secondary whitespace-nowrap min-w-fit">
                      {filter.label}
                    </label>
                    
                    {filter.type === 'select' && filter.options && (
                      <select
                        value={(filter.value as string) || ''}
                        onChange={e => onAdvancedFilterChange?.(filter.id, e.target.value)}
                        className="input px-3 py-2 text-sm min-w-[180px]"
                      >
                        <option value="">{filter.placeholder || t('select') || 'Tous'}</option>
                        {filter.options.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} {opt.count !== undefined && `(${opt.count})`}
                          </option>
                        ))}
                      </select>
                    )}

                    {filter.type === 'multi-select' && filter.options && (
                      <div className="relative min-w-[180px]">
                        <button
                          onClick={() => setOpenMultiSelect(openMultiSelect === filter.id ? null : filter.id)}
                          className="input w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-2"
                        >
                          <span className={`truncate ${
                            (filter.value as string[])?.length > 0 ? 'text-primary' : 'text-muted'
                          }`}>
                            {(filter.value as string[])?.length > 0
                              ? `${(filter.value as string[]).length} sélectionné(s)`
                              : filter.placeholder || t('select') || 'Sélectionner...'
                            }
                          </span>
                          <IconChevronDown className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${
                            openMultiSelect === filter.id ? 'rotate-180' : ''
                          }`} />
                        </button>

                        <AnimatePresence>
                          {openMultiSelect === filter.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-default rounded-lg shadow-lg max-h-48 overflow-y-auto"
                            >
                              {filter.options.map(opt => {
                                const isSelected = (filter.value as string[])?.includes(opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleMultiSelectToggle(filter.id, opt.value)}
                                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-muted transition-colors text-sm ${
                                      isSelected ? 'bg-accent/10 text-accent' : 'text-primary'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                      isSelected ? 'bg-accent border-accent' : 'border-default'
                                    }`}>
                                      {isSelected && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="truncate">{opt.label}</span>
                                    {opt.count !== undefined && (
                                      <span className="ml-auto text-xs text-muted">({opt.count})</span>
                                    )}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}

                {/* Divider - only on desktop if we have toggles */}
                {selectFilters.length > 0 && toggleFilters.length > 0 && (
                  <div className="hidden lg:block w-px h-8 bg-default" />
                )}

                {/* Toggle Filters */}
                {toggleFilters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                    {toggleFilters.map(filter => (
                      <ToggleButton
                        key={filter.id}
                        checked={!!filter.value}
                        onChange={(value) => onAdvancedFilterChange?.(filter.id, value)}
                        label={filter.label}
                        labelPosition="left"
                        size="md"
                      />
                    ))}
                  </div>
                )}

                {/* Divider - only on desktop if we have dates */}
                {(selectFilters.length > 0 || toggleFilters.length > 0) && dateFilters.length > 0 && (
                  <div className="hidden lg:block w-px h-8 bg-default" />
                )}

                {/* Date Range Filters */}
                {dateFilters.map(filter => (
                  <div key={filter.id} className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3">
                    <label className="text-sm font-medium text-secondary whitespace-nowrap min-w-fit">
                      {filter.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="date"
                          value={(filter.value as DateRangeFilter)?.from || ''}
                          onChange={e => onAdvancedFilterChange?.(filter.id, {
                            ...(filter.value as DateRangeFilter || { from: '', to: '' }),
                            from: e.target.value
                          })}
                          className="input cursor-pointer pr-2 py-2 text-sm min-w-[140px]"
                        />
                      </div>
                      <span className="text-muted text-sm">→</span>
                      <div className="relative">
                        <input
                          type="date"
                          value={(filter.value as DateRangeFilter)?.to || ''}
                          onChange={e => onAdvancedFilterChange?.(filter.id, {
                            ...(filter.value as DateRangeFilter || { from: '', to: '' }),
                            to: e.target.value
                          })}
                          className="input cursor-pointer pr-2 py-2 text-sm min-w-[140px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
