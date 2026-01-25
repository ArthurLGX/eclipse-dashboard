'use client';

import EmailComposer from '@/app/components/EmailComposer';
import ProtectedRoute from '@/app/components/ProtectedRoute';

/**
 * Page d'envoi de facture
 * Utilise le composant EmailComposer unifié avec les features pour les factures
 */
export default function InvoiceEmailPage() {
  return (
    <ProtectedRoute>
      <EmailComposer type="invoice" />
    </ProtectedRoute>
  );
}
