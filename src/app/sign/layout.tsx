import React from 'react';

/**
 * Layout for public signing pages (/sign/*)
 * This layout excludes the global Header and Footer components
 * to provide a clean, focused experience for external users
 */
export default function SignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

