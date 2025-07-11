'use client';

import React from 'react';

interface PageSkeletonProps {
  showHeader?: boolean;
  showFooter?: boolean;
}

export default function PageSkeleton({
  showHeader = true,
  showFooter = true,
}: PageSkeletonProps) {
  return (
    <div className="w-full">
      {/* Skeleton pour le header */}
      {showHeader && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="h-8 bg-zinc-800 rounded w-32 animate-pulse"></div>
              <div className="flex items-center space-x-4">
                <div className="h-8 bg-zinc-800 rounded w-20 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded w-20 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skeleton pour le contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Skeleton pour la barre de progression */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 min-w-48">
                <div className="h-4 bg-zinc-800 rounded animate-pulse mb-2"></div>
                <div className="h-2 bg-zinc-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton pour le contenu de la page */}
        <div className="space-y-6">
          {/* Titre */}
          <div className="h-8 bg-zinc-800 rounded w-64 animate-pulse"></div>

          {/* Grille de contenu */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="bg-zinc-900 p-6 rounded-lg border border-zinc-800"
                >
                  <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-4">
                <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse mb-4"></div>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-12 bg-zinc-800 rounded animate-pulse"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton pour le footer */}
      {showFooter && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border-t border-zinc-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse"></div>
              <div className="flex space-x-4">
                <div className="h-6 bg-zinc-800 rounded w-20 animate-pulse"></div>
                <div className="h-6 bg-zinc-800 rounded w-20 animate-pulse"></div>
                <div className="h-6 bg-zinc-800 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
