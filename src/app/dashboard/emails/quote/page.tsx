'use client';

import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

/**
 * Page d'envoi de devis
 * Utilise le composant EmailComposer unifié avec les features pour les devis
 */
export default function QuoteEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="quote" />
    </ProtectedRoute>
  );
}
