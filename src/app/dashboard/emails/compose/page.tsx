'use client';

import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

/**
 * Page d'envoi d'email classique
 * Utilise le composant EmailComposer unifié avec les features pour les emails classiques
 */
export default function ComposeEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="compose" />
    </ProtectedRoute>
  );
}
