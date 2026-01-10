'use client';

import { useEffect } from 'react';

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force light mode for public portfolio pages
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    
    return () => {
      // Restore theme when leaving portfolio pages
      const savedTheme = localStorage.getItem('eclipse-theme') || 'dark';
      const resolved = savedTheme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : savedTheme;
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    };
  }, []);

  return <>{children}</>;
}

