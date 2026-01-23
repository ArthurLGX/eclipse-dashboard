'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers login avec le paramètre type=register
    router.push('/login?type=register');
  }, [router]);

  // Loader pendant la redirection
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted">Redirection...</p>
      </div>
    </div>
  );
}
