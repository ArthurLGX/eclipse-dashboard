'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconLoader2 } from '@tabler/icons-react';

/**
 * Page emails redirigée vers Smart Follow-Up
 * La gestion des emails est maintenant centralisée dans Smart Follow-Up
 */
export default function EmailsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/smart-follow-up');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <IconLoader2 className="w-12 h-12 text-accent-text mx-auto mb-4 animate-spin" />
        <p className="text-muted">Redirection vers Smart Follow-Up...</p>
      </div>
    </div>
  );
}
