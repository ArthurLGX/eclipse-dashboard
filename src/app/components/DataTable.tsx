'use client';

import React, { useState } from 'react';

export interface Column<T = unknown> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T = unknown> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T = unknown>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Aucune donnée trouvée',
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className={` ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="!text-left py-3 px-4 text-zinc-300 font-semibold"
                >
                  <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(i => (
              <tr key={i} className="border-b border-zinc-800/50">
                {columns.map((column, index) => (
                  <td key={index} className="px-4">
                    <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={` h-fit ${className}`}>
      <table className="w-full ">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((column, index) => (
              <th
                key={index}
                className="!text-left py-3 px-2 lg:px-4 text-zinc-300 font-semibold !capitalize"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, index) => (
              <tr
                key={(row as { id: string }).id || index}
                onClick={() => onRowClick?.(row)}
                className={`cursor-pointer border-b border-zinc-800/50 !font-light hover:bg-zinc-800/30 transition-colors ${
                  (index + (currentPage - 1) * itemsPerPage) % 2 === 0
                    ? 'bg-zinc-900/30'
                    : 'bg-zinc-900/10'
                }`}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`py-4 px-2 lg:px-4 text-zinc-400 !font-light ${column.className || ''}`}
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
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 px-2 lg:px-4 !text-center text-zinc-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 disabled:opacity-50"
          >
            Précédent
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded border border-zinc-700 text-zinc-300 ${
                page === currentPage
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-zinc-900'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
