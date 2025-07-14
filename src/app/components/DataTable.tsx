'use client';

import React from 'react';

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
}

export default function DataTable<T = unknown>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Aucune donnée trouvée',
  className = '',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="!text-left py-3 px-4 !text-zinc-300 font-semibold"
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
                  <td key={index} className="py-4 px-4">
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
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((column, index) => (
              <th
                key={index}
                className="!text-left py-3 px-4 !text-zinc-300 font-semibold !capitalize"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <tr
                key={(row as { id: string }).id || index}
                className={`border-b border-zinc-800/50 !font-light hover:bg-zinc-800/30 transition-colors ${
                  index % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/10'
                }`}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`py-4 px-4 !font-light ${column.className || ''}`}
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
                className="py-8 px-4 !text-center !text-zinc-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
