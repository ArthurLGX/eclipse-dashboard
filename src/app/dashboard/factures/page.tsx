'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { deleteFacture, convertQuoteToInvoice } from '@/lib/api';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import Modal from '@/app/components/Modal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  IconCheck,
  IconFileInvoice,
  IconSearch,
  IconFilter,
  IconDownload,
  IconEye,
  IconDots,
  IconPlus,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateSlug } from '@/utils/slug';
import { useFactures, clearCache } from '@/hooks/useApi';
import type { Facture, Client, Project } from '@/types';

const AVATAR_COLORS = ['av-blue', 'av-teal', 'av-purple', 'av-coral', 'av-amber'] as const;
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function FacturesPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = usePreferences();
  const router = useRouter();
  const searchParams = useSearchParams();

  const documentType = searchParams.get('type') === 'quote' ? 'quote' : 'invoice';
  const isQuoteMode = documentType === 'quote';

  const { preferences } = usePreferences();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; facture: Facture | null }>({ isOpen: false, facture: null });
  const [convertModal, setConvertModal] = useState<{ isOpen: boolean; quote: Facture | null }>({ isOpen: false, quote: null });
  const [isConverting, setIsConverting] = useState(false);
  const [updateClientOnConvert, setUpdateClientOnConvert] = useState(true);
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [isOverdueFilter, setIsOverdueFilter] = useState<boolean | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: facturesData, loading, refetch } = useFactures(user?.id);

  useEffect(() => {
    clearCache('factures');
    refetch();
  }, []);

  const factures = useMemo(() => {
    const all = (facturesData as Facture[]) || [];
    if (isQuoteMode) return all.filter(f => f.document_type === 'quote');
    return all.filter(f => f.document_type === 'invoice' || !f.document_type);
  }, [facturesData, isQuoteMode]);

  const getFactureSlug = (facture: Facture) => {
    const clientData = facture.client || facture.client_id;
    const clientName = clientData && typeof clientData === 'object' ? (clientData as Client).name : '';
    return generateSlug(`${facture.reference}-${clientName || 'facture'}`, facture.documentId);
  };

  const stats = useMemo(() => {
    const now = new Date();
    if (isQuoteMode) {
      const totalAmount = factures.reduce((acc, f) => acc + (f.number || 0), 0);
      return {
        total: factures.length,
        accepted: factures.filter(f => f.quote_status === 'accepted').length,
        pending: factures.filter(f => f.quote_status === 'sent' || f.quote_status === 'draft').length,
        totalAmount,
        newThisMonth: factures.filter(f => {
          const created = new Date(f.createdAt);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length,
      };
    } else {
      const paidAmount = factures.filter(f => f.facture_status === 'paid').reduce((acc, f) => acc + (Number(f.number) || 0), 0);
      const pendingAmount = factures.filter(f => f.facture_status === 'sent').reduce((acc, f) => acc + (Number(f.number) || 0), 0);
      const pendingCount = factures.filter(f => f.facture_status === 'sent').length;
      const overdueCount = factures.filter(f => f.due_date && new Date(f.due_date) < now && f.facture_status !== 'paid').length;
      return {
        total: factures.length,
        paid: factures.filter(f => f.facture_status === 'paid').length,
        paidAmount,
        pendingAmount,
        pendingCount,
        overdueCount,
        newThisMonth: factures.filter(f => {
          const created = new Date(f.createdAt);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length,
      };
    }
  }, [factures, isQuoteMode]);

  const statusOptions = useMemo(() => {
    if (isQuoteMode) {
      return [
        { value: 'accepted', label: t('accepted') || 'Accepté' },
        { value: 'sent', label: t('sent') || 'Envoyé' },
        { value: 'draft', label: t('draft') || 'Brouillon' },
        { value: 'rejected', label: t('rejected') || 'Refusé' },
        { value: 'expired', label: t('expired') || 'Expiré' },
      ];
    }
    return [
      { value: 'paid', label: t('paid') || 'Payée' },
      { value: 'sent', label: t('sent') || 'Envoyée' },
      { value: 'draft', label: t('draft') || 'Brouillon' },
      { value: 'overdue', label: t('overdue') || 'En retard' },
    ];
  }, [isQuoteMode, t]);

  const clientOptions = useMemo(() => {
    const clientMap = new Map<string, string>();
    factures.forEach(f => {
      const clientData = f.client || f.client_id;
      if (clientData && typeof clientData === 'object') {
        const client = clientData as Client;
        if (client.documentId && client.name) clientMap.set(client.documentId, client.name);
      }
    });
    return Array.from(clientMap.entries()).map(([value, label]) => ({ value, label }));
  }, [factures]);

  const projectOptions = useMemo(() => {
    const projectMap = new Map<string, string>();
    factures.forEach(f => {
      if (f.project && typeof f.project === 'object') {
        const project = f.project as Project;
        if (project.documentId && project.title) projectMap.set(project.documentId, project.title);
      }
    });
    return Array.from(projectMap.entries()).map(([value, label]) => ({ value, label }));
  }, [factures]);

  const filteredFactures = useMemo(() => {
    const now = new Date();
    return factures.filter(facture => {
      const clientData = facture.client || facture.client_id;
      const clientName = clientData && typeof clientData === 'object' ? (clientData as Client).name : '';
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        facture.reference.toLowerCase().includes(searchLower) ||
        clientName.toLowerCase().includes(searchLower) ||
        (facture.project && typeof facture.project === 'object' && (facture.project as Project).title?.toLowerCase().includes(searchLower));
      const status = isQuoteMode ? facture.quote_status : facture.facture_status;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'overdue' ? (facture.due_date && new Date(facture.due_date) < now && facture.facture_status !== 'paid') : status === statusFilter);
      const matchesClient = !clientFilter || (clientData && typeof clientData === 'object' && (clientData as Client).documentId === clientFilter);
      const matchesProject = !projectFilter || (facture.project && typeof facture.project === 'object' && (facture.project as Project).documentId === projectFilter);
      const isOverdue = !isQuoteMode && !!(facture.due_date && new Date(facture.due_date) < now && facture.facture_status !== 'paid');
      const matchesOverdue = isOverdueFilter === undefined ? true : isOverdueFilter === true ? isOverdue : !isOverdue;
      let matchesDateRange = true;
      if (dateRangeFilter.from || dateRangeFilter.to) {
        const factureDate = facture.date ? new Date(facture.date) : null;
        if (factureDate) {
          if (dateRangeFilter.from) matchesDateRange = matchesDateRange && factureDate >= new Date(dateRangeFilter.from);
          if (dateRangeFilter.to) matchesDateRange = matchesDateRange && factureDate <= new Date(dateRangeFilter.to);
        }
      }
      return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesOverdue && matchesDateRange;
    });
  }, [factures, searchTerm, statusFilter, clientFilter, projectFilter, isOverdueFilter, dateRangeFilter, isQuoteMode]);

  const totalPages = Math.ceil(filteredFactures.length / itemsPerPage);
  const paginatedFactures = useMemo(
    () => filteredFactures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredFactures, currentPage, itemsPerPage]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedFactures.map(f => f.documentId || '').filter(Boolean);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedItems = useMemo(() => filteredFactures.filter(f => selectedIds.has(f.documentId || '')), [filteredFactures, selectedIds]);

  const handleDeleteFacture = async () => {
    if (!deleteModal.facture?.documentId) return;
    await deleteFacture(deleteModal.facture.documentId);
    showGlobalPopup(isQuoteMode ? (t('quote_deleted_success') || 'Devis supprimé') : (t('facture_deleted_success') || 'Facture supprimée'), 'success');
    clearCache('factures');
    await refetch();
    setDeleteModal({ isOpen: false, facture: null });
  };

  const handleDeleteMultiple = async () => {
    let success = 0;
    for (const f of selectedItems) {
      if (!f.documentId) continue;
      try {
        await deleteFacture(f.documentId);
        success++;
      } catch (e) {
        console.error(e);
      }
    }
    if (success > 0) {
      showGlobalPopup(`${success} ${isQuoteMode ? 'devis' : 'facture(s)'} supprimé(s)`, 'success');
      clearCache('factures');
      await refetch();
      setSelectedIds(new Set());
    }
  };

  const handleConvertQuote = useCallback(async () => {
    if (!convertModal.quote || !user?.id) return;
    const quote = convertModal.quote;
    const clientDocId = quote.client_id && typeof quote.client_id === 'object' ? (quote.client_id as Client).documentId : (quote.client && typeof quote.client === 'object' ? (quote.client as Client).documentId : undefined);
    setIsConverting(true);
    try {
      const result = await convertQuoteToInvoice(
        {
          documentId: quote.documentId,
          reference: quote.reference,
          number: quote.number,
          date: quote.date,
          currency: quote.currency,
          description: quote.description || '',
          notes: quote.notes || '',
          tva_applicable: quote.tva_applicable,
          invoice_lines: (quote.invoice_lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            total: line.total,
            unit: line.unit,
          })),
          client_id: quote.client_id || quote.client,
          project: quote.project,
        },
        user.id,
        { updateClientStatus: updateClientOnConvert, clientDocumentId: clientDocId, invoicePrefix: preferences.invoice.invoicePrefix, defaultPaymentDays: preferences.invoice.defaultPaymentDays }
      );
      setConvertModal({ isOpen: false, quote: null });
      showGlobalPopup(t('quote_converted_success') || 'Devis converti en facture !', 'success');
      clearCache('factures');
      await refetch();
      const invoiceData = result.invoice as { data?: { documentId?: string } };
      if (invoiceData?.data?.documentId) router.push(`/dashboard/factures/${invoiceData.data.documentId}`);
    } catch (e) {
      console.error(e);
      showGlobalPopup(t('quote_converted_error') || 'Erreur lors de la conversion', 'error');
    } finally {
      setIsConverting(false);
    }
  }, [convertModal.quote, user?.id, updateClientOnConvert, preferences.invoice, t, refetch, router]);

  const getStatusBadge = (facture: Facture) => {
    const status = isQuoteMode ? facture.quote_status : facture.facture_status;
    const now = new Date();
    const isOverdue = !isQuoteMode && facture.due_date && new Date(facture.due_date) < now && facture.facture_status !== 'paid';
    const effectiveStatus = isOverdue ? 'overdue' : status;
    const configs: Record<string, { label: string; className: string }> = isQuoteMode
      ? {
          accepted: { label: t('accepted') || 'Accepté', className: 'facture-badge facture-badge-paid' },
          rejected: { label: t('rejected') || 'Refusé', className: 'facture-badge facture-badge-late' },
          expired: { label: t('expired') || 'Expiré', className: 'facture-badge facture-badge-pending' },
          sent: { label: t('sent') || 'Envoyé', className: 'facture-badge facture-badge-pending' },
          draft: { label: t('draft') || 'Brouillon', className: 'facture-badge facture-badge-draft' },
        }
      : {
          paid: { label: t('paid') || 'Payée', className: 'facture-badge facture-badge-paid' },
          sent: { label: t('sent') || 'Envoyée', className: 'facture-badge facture-badge-pending' },
          overdue: { label: t('overdue') || 'En retard', className: 'facture-badge facture-badge-late' },
          draft: { label: t('draft') || 'Brouillon', className: 'facture-badge facture-badge-draft' },
        };
    const config = configs[effectiveStatus || 'draft'] || configs.draft;
    return <span className={config.className}><span className="facture-badge-dot" />{config.label}</span>;
  };

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const allFactures = (facturesData as Facture[]) || [];
  const invoicesCount = allFactures.filter(f => f.document_type === 'invoice' || !f.document_type).length;
  const quotesCount = allFactures.filter(f => f.document_type === 'quote').length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 w-full mx-auto px-6 md:px-8 py-6 md:py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
            <div>
              <h1 className="!text-2xl font-semibold !text-primary tracking-tight">
                {t('invoices_and_quotes') || 'Factures & Devis'}
              </h1>
              <p className="!text-sm !text-muted mt-1">
                {monthLabel} · {factures.length} {t('documents') || 'documents'}
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/factures/new${isQuoteMode ? '?type=quote' : ''}`)}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 !text-sm font-medium shrink-0"
            >
              <IconPlus className="w-3.5 h-3.5" stroke={2} />
              {isQuoteMode ? (t('create_quote') || 'Créer un devis') : (t('create_facture') || 'Créer une facture')}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-7">
            {isQuoteMode ? (
              <>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('total_quotes') || 'Total devis'}</div>
                  <div className="facture-stat-value">{loading ? '…' : stats.total}</div>
                  <div className="facture-stat-meta facture-stat-meta-up"><span className="facture-stat-dot" />+{stats.newThisMonth} {t('this_month') || 'ce mois'}</div>
                </div>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('accepted') || 'Acceptés'}</div>
                  <div className="facture-stat-value facture-stat-green">{loading ? '…' : stats.accepted}</div>
                  <div className="facture-stat-meta facture-stat-meta-up"><span className="facture-stat-dot" />{stats.total ? Math.round(((stats.accepted ?? 0) / stats.total) * 100) : 0}%</div>
                </div>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('total_amount') || 'Montant total'}</div>
                  <div className="facture-stat-value facture-stat-purple">{loading ? '…' : formatCurrency(stats.totalAmount || 0)}</div>
                </div>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('pending') || 'En attente'}</div>
                  <div className="facture-stat-value facture-stat-amber">{loading ? '…' : stats.pending}</div>
                </div>
              </>
            ) : (
              <>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('total_invoices') || 'Total factures'}</div>
                  <div className="facture-stat-value">{loading ? '…' : stats.total}</div>
                  <div className="facture-stat-meta facture-stat-meta-up"><span className="facture-stat-dot" />+{stats.newThisMonth} {t('this_month') || 'ce mois'}</div>
                </div>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('paid') || 'Payées'}</div>
                  <div className="facture-stat-value facture-stat-green">{loading ? '…' : stats.paid}</div>
                  <div className="facture-stat-meta facture-stat-meta-up"><span className="facture-stat-dot" />{stats.total ? Math.round(((stats.paid ?? 0) / stats.total) * 100) : 0}%</div>
                </div>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('revenue') || 'Chiffre d\'affaires'}</div>
                  <div className="facture-stat-value facture-stat-purple">{loading ? '…' : formatCurrency(stats.paidAmount || 0)}</div>
                </div>
                <div className="facture-stat-card">
                  <div className="facture-stat-label">{t('pending') || 'En attente'}</div>
                  <div className="facture-stat-value facture-stat-amber">{loading ? '…' : formatCurrency(stats.pendingAmount || 0)}</div>
                  <div className="facture-stat-meta facture-stat-warn"><span className="facture-stat-dot" />{stats.pendingCount} {t('invoices') || 'factures'}</div>
                </div>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-default mb-5">
            <button
              onClick={() => router.push('/dashboard/factures')}
              className={`facture-tab ${!isQuoteMode ? 'facture-tab-active' : ''}`}
            >
              {t('invoices') || 'Factures'}
              <span className={`facture-tab-count ${!isQuoteMode ? 'facture-tab-count-active' : ''}`}>{invoicesCount}</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/factures?type=quote')}
              className={`facture-tab ${isQuoteMode ? 'facture-tab-active' : ''}`}
            >
              {t('quotes') || 'Devis'}
              <span className={`facture-tab-count ${isQuoteMode ? 'facture-tab-count-active' : ''}`}>{quotesCount}</span>
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 !text-muted pointer-events-none z-10">
                <IconSearch className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={isQuoteMode ? (t('search_placeholder_quotes') || 'Rechercher…') : (t('search_placeholder_factures') || 'Référence, client ou projet…')}
                className="facture-search-input"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="facture-filter-select"
            >
              <option value="">{t('all_statuses') || 'Tous les statuts'}</option>
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`facture-btn-outline ${showAdvancedFilters ? '!bg-hover' : ''}`}
            >
              <IconFilter className="w-3.5 h-3.5" />
              {t('advanced_filters') || 'Filtres avancés'}
            </button>
            <button className="facture-btn-outline">
              <IconDownload className="w-3.5 h-3.5" />
              {t('export') || 'Exporter'}
            </button>
          </div>

          {/* Advanced filters */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap gap-3 mb-4 p-4 bg-muted/50  border border-default">
              <div>
                <label className="!text-xs !text-muted block mb-1">{t('client')}</label>
                <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="facture-filter-select min-w-[140px]">
                  <option value="">{t('all_clients') || 'Tous'}</option>
                  {clientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="!text-xs !text-muted block mb-1">{t('project')}</label>
                <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="facture-filter-select min-w-[140px]">
                  <option value="">{t('all_projects') || 'Tous'}</option>
                  {projectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="!text-xs !text-muted block mb-1">{t('overdue')}</label>
                <select value={isOverdueFilter === undefined ? '' : String(isOverdueFilter)} onChange={e => setIsOverdueFilter(e.target.value === '' ? undefined : e.target.value === 'true')} className="facture-filter-select min-w-[100px]">
                  <option value="">—</option>
                  <option value="true">{t('yes') || 'Oui'}</option>
                  <option value="false">{t('no') || 'Non'}</option>
                </select>
              </div>
              <div>
                <label className="!text-xs !text-muted block mb-1">{t('date') || 'Date'}</label>
                <div className="flex gap-2">
                  <input type="date" value={dateRangeFilter.from} onChange={e => setDateRangeFilter(p => ({ ...p, from: e.target.value }))} className="facture-filter-select min-w-[120px]" />
                  <input type="date" value={dateRangeFilter.to} onChange={e => setDateRangeFilter(p => ({ ...p, to: e.target.value }))} className="facture-filter-select min-w-[120px]" />
                </div>
              </div>
            </div>
          )}

          {/* Bulk bar */}
          {selectedIds.size > 0 && (
            <div className="facture-bulk-bar mb-3">
              <span>{selectedIds.size} {t('items_selected') || 'sélectionnée(s)'}</span>
              <div className="flex-1" />
              <button className="facture-bulk-btn" onClick={() => {}}>{t('download') || 'Télécharger'}</button>
              <button className="facture-bulk-btn danger" onClick={handleDeleteMultiple}>{t('delete') || 'Supprimer'}</button>
            </div>
          )}

          {/* Table */}
          <div className="facture-table-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr>
                    <th className="facture-th facture-th-check w-10">
                      <input type="checkbox" checked={paginatedFactures.length > 0 && paginatedFactures.every(f => selectedIds.has(f.documentId || ''))} onChange={toggleSelectAll} className="facture-checkbox" />
                    </th>
                    <th className="facture-th">{t('reference')}</th>
                    <th className="facture-th">{t('date')}</th>
                    <th className="facture-th">{isQuoteMode ? (t('valid_until') || 'Valide jusqu\'au') : t('due_date')}</th>
                    <th className="facture-th">{t('client')}</th>
                    <th className="facture-th">{t('project')}</th>
                    <th className="facture-th">{t('status')}</th>
                    <th className="facture-th facture-th-amount text-right">{t('amount') || 'Montant HT'}</th>
                    <th className="facture-th facture-th-actions text-center w-24">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="facture-td !text-center !text-muted py-12">Chargement…</td></tr>
                  ) : paginatedFactures.length === 0 ? (
                    <tr><td colSpan={9} className="facture-td !text-center !text-muted py-12">{isQuoteMode ? (t('no_quote_found') || 'Aucun devis') : (t('no_invoice_found') || 'Aucune facture')}</td></tr>
                  ) : (
                    paginatedFactures.map(facture => {
                      const clientData = facture.client || facture.client_id;
                      const client = clientData && typeof clientData === 'object' ? clientData as Client : null;
                      const project = facture.project && typeof facture.project === 'object' ? facture.project as Project : null;
                      const isOverdue = !isQuoteMode && facture.due_date && new Date(facture.due_date) < new Date() && facture.facture_status !== 'paid';
                      const id = facture.documentId || '';
                      const isSelected = selectedIds.has(id);
                      return (
                        <tr
                          key={id}
                          onClick={() => router.push(`/dashboard/factures/${getFactureSlug(facture)}${isQuoteMode ? '?type=quote' : ''}`)}
                          className={`facture-tr ${isSelected ? 'facture-tr-selected' : ''}`}
                        >
                          <td className="facture-td" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(id)} className="facture-checkbox" />
                          </td>
                          <td className="facture-td"><span className="facture-ref-cell">{facture.reference}</span></td>
                          <td className="facture-td facture-date-cell">{facture.date ? formatDate(facture.date) : '—'}</td>
                          <td className="facture-td facture-date-cell">
                            {isQuoteMode ? (facture.valid_until ? formatDate(facture.valid_until) : '—') : (facture.due_date ? formatDate(facture.due_date) : '—')}
                          </td>
                          <td className="facture-td">
                            <div className="flex items-center gap-2.5">
                              {client ? (
                                <>
                                  <div className={`facture-avatar facture-avatar-${getAvatarColor(client.name)}`}>
                                    {(client.name || '').split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                  </div>
                                  <span className="facture-client-name">{client.name}</span>
                                </>
                              ) : (
                                <span className="!text-muted">—</span>
                              )}
                            </div>
                          </td>
                          <td className="facture-td">
                            {project ? <span className="facture-project-tag">{project.title}</span> : '—'}
                          </td>
                          <td className="facture-td">{getStatusBadge(facture)}</td>
                          <td className={`facture-td facture-amount-cell ${isOverdue ? 'facture-amount-late' : ''}`}>{facture.number ? formatCurrency(facture.number) : '—'}</td>
                          <td className="facture-td facture-actions-cell">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                className="facture-action-btn"
                                title={t('view') || 'Voir'}
                                onClick={e => { e.stopPropagation(); router.push(`/dashboard/factures/${getFactureSlug(facture)}${isQuoteMode ? '?type=quote' : ''}`); }}
                              >
                                <IconEye className="w-3.5 h-3.5" />
                              </button>
                              {facture.pdf?.[0]?.url && (
                                <a
                                  href={(process.env.NEXT_PUBLIC_STRAPI_URL || '') + facture.pdf[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="facture-action-btn"
                                  title={t('download') || 'Télécharger'}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <IconDownload className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <div className="relative">
                                <button
                                  className="facture-action-btn"
                                  title={t('more') || 'Plus'}
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); }}
                                >
                                  <IconDots className="w-3.5 h-3.5" />
                                </button>
                                {openMenuId === id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1 bg-card border border-default  shadow-lg">
                                      <button
                                        className="w-full px-3 py-2 !text-left !text-sm hover:bg-hover flex items-center gap-2"
                                        onClick={e => { e.stopPropagation(); setOpenMenuId(null); router.push(`/dashboard/factures/${getFactureSlug(facture)}?edit=1${isQuoteMode ? '&type=quote' : ''}`); }}
                                      >
                                        {t('edit') || 'Modifier'}
                                      </button>
                                      {isQuoteMode && facture.quote_status !== 'rejected' && (
                                        <button
                                          className="w-full px-3 py-2 !text-left !text-sm hover:bg-hover flex items-center gap-2"
                                          onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConvertModal({ isOpen: true, quote: facture }); }}
                                        >
                                          {t('convert_to_invoice') || 'Convertir en facture'}
                                        </button>
                                      )}
                                      <button
                                        className="w-full px-3 py-2 !text-left !text-sm hover:bg-hover !text-danger flex items-center gap-2"
                                        onClick={e => { e.stopPropagation(); setOpenMenuId(null); setDeleteModal({ isOpen: true, facture }); }}
                                      >
                                        {t('delete') || 'Supprimer'}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="facture-pagination">
              <div className="flex items-center gap-3">
                <span className="!text-sm !text-muted">
                  {filteredFactures.length} {t('results') || 'résultats'}
                </span>
                <span className="!text-muted">|</span>
                <span className="!text-muted !text-sm">{t('per_page') || 'Par page'}</span>
                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="facture-per-page-select">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex gap-1">
                <button className="facture-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} className={`facture-page-btn ${currentPage === p ? 'facture-page-btn-active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                  );
                })}
                <button className="facture-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>›</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, facture: null })}
        onConfirm={handleDeleteFacture}
        title={isQuoteMode ? (t('delete_quote') || 'Supprimer le devis') : (t('delete_facture') || 'Supprimer la facture')}
        itemName={deleteModal.facture?.reference || ''}
        itemType={isQuoteMode ? 'quote' : 'facture'}
      />

      <Modal open={convertModal.isOpen} onClose={() => setConvertModal({ isOpen: false, quote: null })}>
        <div className="p-6 !space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <IconFileInvoice className="w-6 h-6 !text-success" />
            </div>
            <div>
              <h3 className="!text-lg font-semibold !text-primary">{t('convert_quote_to_invoice') || 'Convertir ce devis en facture'}</h3>
              <p className="!text-sm !text-muted">{convertModal.quote?.reference}</p>
            </div>
          </div>
          <p className="!text-primary">{t('convert_quote_confirm_desc') || 'Le devis sera marqué comme "accepté" et une nouvelle facture sera créée.'}</p>
          <div className="flex items-start gap-3 p-4 bg-muted ">
            <input type="checkbox" id="updateClient" checked={updateClientOnConvert} onChange={e => setUpdateClientOnConvert(e.target.checked)} className="mt-1" />
            <div>
              <label htmlFor="updateClient" className="!text-sm font-medium !text-primary cursor-pointer">{t('update_client_status') || 'Mettre à jour le statut du client'}</label>
              <p className="!text-xs !text-muted mt-1">{t('update_client_status_desc') || 'Passer le client en "Devis accepté"'}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConvertModal({ isOpen: false, quote: null })} disabled={isConverting} className="facture-btn-outline">
              {t('cancel') || 'Annuler'}
            </button>
            <button onClick={handleConvertQuote} disabled={isConverting} className="btn-primary flex items-center gap-2 px-4 py-2 disabled:opacity-50">
              {isConverting ? '…' : <><IconCheck className="w-4 h-4" />{t('convert_to_invoice') || 'Convertir'}</>}
            </button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
