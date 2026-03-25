'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './Footer';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isLandingRoute = pathname === '/' || pathname === '/pricing';
  const isShareProjectPage = pathname.startsWith('/share/project');

  if (isAuthPage || isShareProjectPage) {
    return <>{children}</>;
  }

  if (isLandingRoute) {
    return (
      <>
        <Header />
        {children}
      </>
    );
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
