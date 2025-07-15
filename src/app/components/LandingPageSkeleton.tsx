'use client';

import React from 'react';

export default function LandingPageSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
          <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
          <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
          <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
          <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
          <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
          <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <div className="h-6 bg-zinc-800 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800"
              >
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-4 bg-zinc-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
