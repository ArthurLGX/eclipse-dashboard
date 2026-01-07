'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  IconFileDescription,
  IconPlus,
  IconCheck,
  IconX,
  IconClock,
  IconSend,
  IconArrowRight,
  IconTrash,
  IconEdit,
  IconEye,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { Column } from '@/app/components/DataTable';
import { FilterOption } from '@/app/components/TableFilters';
import { 
  fetchQuotes, 
  deleteFacture,
  convertQuoteToInvoice,
} from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { Facture, Client, QuoteStatus } from '@/types';
import useSWR from 'swr';

const QUOTE_STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-muted/20', text: 'text-muted', label: 'Brouillon' },
  sent: { bg: 'bg-info/20', text: 'text-info', label: 'Envoyé' },
  accepted: { bg: 'bg-success/20', text: 'text-success', label: 'Accepté' },
  rejected: { bg: 'bg-error/20', text: 'text-error', label: 'Refusé' },
  expired: { bg: 'bg-warning/20', text: 'text-warning', label: 'Expiré' },
};

export default function DevisPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { formatCurrency, formatDate } = usePreferences();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; quote: Facture | null }>({
    isOpen: false,
    quote: null,
  });
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Fetch quotes
  const { data: quotes, mutate, isLoading } = useSWR(
    user?.id ? ['quotes', user.id] : null,
    () => fetchQuotes(user!.id)
  );

  // Stats
  const stats = useMemo(() => {
    if (!quotes) return { total: 0, pending: 0, pendingAmount: 0, accepted: 0, acceptedAmount: 0 };
    
    const pending = quotes.filter(q => q.quote_status === 'sent' || q.quote_status === 'draft');
    const accepted = quotes.filter(q => q.quote_status === 'accepted');
    
    return {
      total: quotes.length,
      pending: pending.length,
      pendingAmount: pending.reduce((acc, q) => acc + (q.number || 0), 0),
      accepted: accepted.length,
      acceptedAmount: accepted.reduce((acc, q) => acc + (q.number || 0), 0),
    };
  }, [quotes]);

  // Filter options
  const statusOptions: FilterOption[] = useMemo(() => [
    { value: 'draft', label: t('draft') || 'Brouillon', count: quotes?.filter(q => q.quote_status === 'draft').length || 0 },
    { value: 'sent', label: t('sent') || 'Envoyé', count: quotes?.filter(q => q.quote_status === 'sent').length || 0 },
    { value: 'accepted', label: t('accepted') || 'Accepté', count: quotes?.filter(q => q.quote_status === 'accepted').length || 0 },
    { value: 'rejected', label: t('quote_rejected') || 'Refusé', count: quotes?.filter(q => q.quote_status === 'rejected').length || 0 },
    { value: 'expired', label: t('quote_expired') || 'Expiré', count: quotes?.filter(q => q.quote_status === 'expired').length || 0 },
  ], [quotes, t]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    
    return quotes.filter(quote => {
      const clientName = (quote.client_id as Client)?.name || (quote.client as Client)?.name || '';
      const matchesSearch = !searchTerm || 
        quote.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || quote.quote_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  // Convert quote to invoice
  const handleConvert = async (quote: Facture) => {
    setConvertingId(quote.documentId);
    try {
      await convertQuoteToInvoice(quote.documentId, user!.id);
      await mutate();
      showGlobalPopup(t('quote_converted') || 'Devis converti en facture !', 'success');
    } catch {
      showGlobalPopup(t('convert_error') || 'Erreur lors de la conversion', 'error');
    } finally {
      setConvertingId(null);
    }
  };

  // Delete quote
  const handleDelete = async () => {
    if (!deleteModal.quote) return;
    try {
      await deleteFacture(deleteModal.quote.documentId);
      await mutate();
      showGlobalPopup(t('quote_deleted') || 'Devis supprimé', 'success');
      setDeleteModal({ isOpen: false, quote: null });
    } catch {
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    }
  };

  // Table columns
  const columns: Column<Facture>[] = [
    {
      key: 'reference',
      label: t('reference') || 'Référence',
      render: (_, quote) => (
        <span className="font-mono font-medium text-primary">{quote.reference}</span>
      ),
    },
    {
      key: 'client',
      label: t('client') || 'Client',
      render: (_, quote) => {
        const client = (quote.client_id as Client) || (quote.client as Client);
        return <span className="text-secondary">{client?.name || '---'}</span>;
      },
    },
    {
      key: 'number',
      label: t('amount') || 'Montant',
      render: (_, quote) => (
        <span className="font-semibold text-primary">{formatCurrency(quote.number)}</span>
      ),
    },
    {
      key: 'date',
      label: t('date') || 'Date',
      render: (_, quote) => (
        <span className="text-muted text-sm">{formatDate(quote.date)}</span>
      ),
    },
    {
      key: 'valid_until',
      label: t('valid_until') || 'Validité',
      render: (_, quote) => {
        if (!quote.valid_until) return <span className="text-muted">---</span>;
        const isExpired = new Date(quote.valid_until) < new Date();
        return (
          <span className={`text-sm ${isExpired ? 'text-error' : 'text-muted'}`}>
            {formatDate(quote.valid_until)}
          </span>
        );
      },
    },
    {
      key: 'quote_status',
      label: t('status') || 'Statut',
      render: (_, quote) => {
        const status = quote.quote_status || 'draft';
        const config = QUOTE_STATUS_COLORS[status];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {status === 'accepted' && <IconCheck className="w-3 h-3" />}
            {status === 'rejected' && <IconX className="w-3 h-3" />}
            {status === 'sent' && <IconSend className="w-3 h-3" />}
            {status === 'expired' && <IconClock className="w-3 h-3" />}
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (_, quote) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => router.push(`/dashboard/factures/${quote.documentId}?type=quote`)}
            className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded-lg"
            title={t('view') || 'Voir'}
          >
            <IconEye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/dashboard/factures/${quote.documentId}?type=quote&edit=true`)}
            className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded-lg"
            title={t('edit') || 'Modifier'}
          >
            <IconEdit className="w-4 h-4" />
          </button>
          {quote.quote_status !== 'accepted' && (
            <button
              onClick={() => handleConvert(quote)}
              disabled={convertingId === quote.documentId}
              className="p-1.5 text-muted hover:text-success hover:bg-success/10 rounded-lg"
              title={t('convert_to_invoice') || 'Convertir en facture'}
            >
              {convertingId === quote.documentId ? (
                <div className="animate-spin w-4 h-4 border-2 border-success border-t-transparent rounded-full" />
              ) : (
                <IconArrowRight className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={() => setDeleteModal({ isOpen: true, quote })}
            className="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded-lg"
            title={t('delete') || 'Supprimer'}
          >
            <IconTrash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconFileDescription className="w-7 h-7 text-accent" />
              {t('quotes') || 'Devis'}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('quotes_desc') || 'Gérez vos devis et convertissez-les en factures'}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/factures/new?type=quote')}
            className="btn-primary px-4 py-2 flex items-center gap-2 rounded-lg"
          >
            <IconPlus className="w-4 h-4" />
            {t('new_quote') || 'Nouveau devis'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted">{t('total_quotes') || 'Total devis'}</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-info">{stats.pending}</p>
            <p className="text-xs text-muted">{t('pending_quotes') || 'En attente'}</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-warning">{formatCurrency(stats.pendingAmount)}</p>
            <p className="text-xs text-muted">{t('pending_amount') || 'Montant en attente'}</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-success">{formatCurrency(stats.acceptedAmount)}</p>
            <p className="text-xs text-muted">{t('accepted_amount') || 'Montant accepté'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder={t('search') || 'Rechercher...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input px-4 py-2 w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input px-3 py-2"
          >
            <option value="">{t('all_status') || 'Tous les statuts'}</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-8 text-center">
              <IconFileDescription className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">{t('no_quotes') || 'Aucun devis'}</p>
              <button
                onClick={() => router.push('/dashboard/factures/new?type=quote')}
                className="mt-4 btn-primary px-4 py-2 rounded-lg"
              >
                {t('create_first_quote') || 'Créer votre premier devis'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-hover">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.documentId} className="hover:bg-hover transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          {col.render ? col.render(quote) : (quote as Record<string, unknown>)[col.key] as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, quote: null })}
          onConfirm={handleDelete}
          title={t('delete_quote') || 'Supprimer le devis'}
          itemName={deleteModal.quote?.reference || ''}
          itemType="quote"
        />
      </motion.div>
    </ProtectedRoute>
  );
}

