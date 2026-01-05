'use client';

import React from 'react';

export default function LandingPageSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border border-default">
          <div className="h-6 bg-muted rounded mb-2 animate-pulse"></div>
          <div className="h-8 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-default">
          <div className="h-6 bg-muted rounded mb-2 animate-pulse"></div>
          <div className="h-8 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-default">
          <div className="h-6 bg-muted rounded mb-2 animate-pulse"></div>
          <div className="h-8 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
      <div className="bg-card rounded-lg border border-default">
        <div className="p-6 border-b border-default">
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-muted p-6 rounded-lg border border-default"
              >
                <div className="h-6 bg-hover rounded mb-2 animate-pulse"></div>
                <div className="h-4 bg-hover rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
