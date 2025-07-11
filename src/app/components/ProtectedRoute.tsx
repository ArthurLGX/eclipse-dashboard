'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import PageSkeleton from './PageSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, hasHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !authenticated) {
      router.push('/login?type=login');
    }
  }, [authenticated, hasHydrated, router]);

  if (!hasHydrated) {
    return <PageSkeleton />;
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
