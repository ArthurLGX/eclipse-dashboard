'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

type Props = {
    children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
    const { authenticated, hasHydrated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!hasHydrated) return;
        if (!authenticated) {
            router.replace('/login');
        }
    }, [authenticated, hasHydrated, router]);

    if (!hasHydrated || !authenticated) {
        return null; // or loading spinner
    }

    return <>{children}</>;
}
