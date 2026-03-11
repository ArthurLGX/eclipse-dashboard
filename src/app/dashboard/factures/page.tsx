'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { deleteFacture, convertQuoteToInvoice } from '@/lib/api';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import Modal from '@/app/components/Modal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DataTable, { Column } from '@/app/components/DataTable';
import TableFilters, { FilterOption, AdvancedFilter, DateRangeFilter } from '@/app/components/TableFilters';
import {
  IconCheck,
  IconClock,
  IconFileInvoice,
  IconFileDescription,
  IconHourglass,
  IconX,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateSlug } from '@/utils/slug';
import { useFactures, clearCache } from '@/hooks/useApi';
import type { Facture, Client, Project } from '@/types';

export default function FacturesPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = usePreferences();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Déterminer le type de document (quote ou invoice)
  const documentType = searchParams.get('type') === 'quote' ? 'quote' : 'invoice';
  const isQuoteMode = documentType === 'quote';

  const { preferences } = usePreferences();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; facture: Facture | null }>({
    isOpen: false,
    facture: null,
  });
  
  // Convert quote modal state
  const [convertModal, setConvertModal] = useState<{ isOpen: boolean; quote: Facture | null }>({
    isOpen: false,
    quote: null,
  });
  const [isConverting, setIsConverting] = useState(false);
  const [updateClientOnConvert, setUpdateClientOnConvert] = useState(true);

  // Advanced filters state
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ from: '', to: '' });
  const [isOverdueFilter, setIsOverdueFilter] = useState<boolean | undefined>(undefined);

  // Hook avec cache
  const { data: facturesData, loading, refetch } = useFactures(user?.id);

  // Rafraîchir les données au montage de la page (invalide le cache)
  useEffect(() => {
    clearCache('factures');
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrer par type de document
  // Les factures sans document_type sont considérées comme des factures (invoice)
  const factures = useMemo(() => {
    const all = (facturesData as Facture[]) || [];
    if (isQuoteMode) {
      return all.filter(f => f.document_type === 'quote');
    } else {
      // Inclure les factures avec document_type='invoice' OU sans document_type (anciennes factures)
      return all.filter(f => f.document_type === 'invoice' || !f.document_type);
    }
  }, [facturesData, isQuoteMode]);

  // Générer un slug parlant pour une facture
  const getFactureSlug = (facture: Facture) => {
    // Strapi peut retourner "client" ou "client_id" selon la config
    const clientData = facture.client || facture.client_id;
    const clientName = clientData && typeof clientData === 'object'
      ? (clientData as Client).name
      : '';
    return generateSlug(`${facture.reference}-${clientName || 'facture'}`, facture.documentId);
  };

  // Stats - adaptées selon le type de document
  const stats = useMemo(() => {
    const now = new Date();
    
    if (isQuoteMode) {
      // Stats pour les devis
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
      // Stats pour les factures
      const paidAmount = factures
        .filter(f => f.facture_status === 'paid')
        .reduce((acc, f) => acc + (f.number || 0), 0);

      return {
        total: factures.length,
        paid: factures.filter(f => f.facture_status === 'paid').length,
        paidAmount,
        newThisMonth: factures.filter(f => {
          const created = new Date(f.createdAt);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length,
      };
    }
  }, [factures, isQuoteMode]);

  // Options de filtre - adaptées selon le type de document
  const statusOptions: FilterOption[] = useMemo(() => {
    if (isQuoteMode) {
      // Options de statut pour les devis
      return [
        {
          value: 'accepted',
          label: t('accepted') || 'Accepté',
          count: factures.filter(f => f.quote_status === 'accepted').length,
        },
        {
          value: 'sent',
          label: t('sent') || 'Envoyé',
          count: factures.filter(f => f.quote_status === 'sent').length,
        },
        {
          value: 'draft',
          label: t('draft') || 'Brouillon',
          count: factures.filter(f => f.quote_status === 'draft').length,
        },
        {
          value: 'rejected',
          label: t('rejected') || 'Refusé',
          count: factures.filter(f => f.quote_status === 'rejected').length,
        },
        {
          value: 'expired',
          label: t('expired') || 'Expiré',
          count: factures.filter(f => f.quote_status === 'expired').length,
        },
      ];
    } else {
      // Options de statut pour les factures
      return [
        {
          value: 'paid',
          label: t('paid') || 'Payée',
          count: factures.filter(f => f.facture_status === 'paid').length,
        },
        {
          value: 'sent',
          label: t('sent') || 'Envoyée',
          count: factures.filter(f => f.facture_status === 'sent').length,
        },
        {
          value: 'draft',
          label: t('draft') || 'Brouillon',
          count: factures.filter(f => f.facture_status === 'draft').length,
        },
      ];
    }
  }, [factures, t, isQuoteMode]);

  // Get unique clients with invoices
  const clientOptions: FilterOption[] = useMemo(() => {
    const clientMap = new Map<string, { name: string; count: number }>();
    factures.forEach(f => {
      const clientData = f.client || f.client_id;
      if (clientData && typeof clientData === 'object') {
        const client = clientData as Client;
        if (client.documentId && client.name) {
          const existing = clientMap.get(client.documentId);
          if (existing) {
            existing.count++;
          } else {
            clientMap.set(client.documentId, { name: client.name, count: 1 });
          }
        }
      }
    });
    return Array.from(clientMap.entries()).map(([id, { name, count }]) => ({
      value: id,
      label: name,
      count,
    }));
  }, [factures]);

  // Get unique projects with invoices
  const projectOptions: FilterOption[] = useMemo(() => {
    const projectMap = new Map<string, { title: string; count: number }>();
    factures.forEach(f => {
      if (f.project && typeof f.project === 'object') {
        const project = f.project as Project;
        if (project.documentId && project.title) {
          const existing = projectMap.get(project.documentId);
          if (existing) {
            existing.count++;
          } else {
            projectMap.set(project.documentId, { title: project.title, count: 1 });
          }
        }
      }
    });
    return Array.from(projectMap.entries()).map(([id, { title, count }]) => ({
      value: id,
      label: title,
      count,
    }));
  }, [factures]);

  // Advanced filters configuration
  const advancedFilters: AdvancedFilter[] = useMemo(() => [
    {
      id: 'client',
      type: 'select',
      label: t('client'),
      options: clientOptions,
      value: clientFilter,
      placeholder: t('all_clients') || 'Tous les clients',
    },
    {
      id: 'project',
      type: 'select',
      label: t('project'),
      options: projectOptions,
      value: projectFilter,
      placeholder: t('all_projects') || 'Tous les projets',
    },
    {
      id: 'isOverdue',
      type: 'toggle',
      label: t('overdue') || 'En retard',
      value: isOverdueFilter,
    },
    {
      id: 'dateRange',
      type: 'date-range',
      label: t('invoice_date') || 'Date de facture',
      value: dateRangeFilter,
    },
  ], [t, clientOptions, projectOptions, clientFilter, projectFilter, isOverdueFilter, dateRangeFilter]);

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (filterId: string, value: string | string[] | boolean | DateRangeFilter) => {
    switch (filterId) {
      case 'client':
        setClientFilter(value as string);
        break;
      case 'project':
        setProjectFilter(value as string);
        break;
      case 'isOverdue':
        setIsOverdueFilter(value as boolean ? true : undefined);
        break;
      case 'dateRange':
        setDateRangeFilter(value as DateRangeFilter);
        break;
    }
  };

  // Filtrage
  const filteredFactures = useMemo(() => {
    const now = new Date();
    
    return factures.filter(facture => {
      // Strapi peut retourner "client" ou "client_id" selon la config
      const clientData = facture.client || facture.client_id;
      const clientName = clientData && typeof clientData === 'object'
        ? (clientData as Client).name
        : '';

      const matchesSearch =
        searchTerm === '' ||
        facture.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === '' || 
        (isQuoteMode ? facture.quote_status === statusFilter : facture.facture_status === statusFilter);

      // Client filter
      const matchesClient =
        clientFilter === '' ||
        (clientData && typeof clientData === 'object' && (clientData as Client).documentId === clientFilter);

      // Project filter
      const matchesProject =
        projectFilter === '' ||
        (facture.project && typeof facture.project === 'object' && (facture.project as Project).documentId === projectFilter);

      // Overdue filter (due_date is in the past and not paid)
      const matchesOverdue =
        isOverdueFilter === undefined ||
        (isOverdueFilter && facture.due_date && new Date(facture.due_date) < now && facture.facture_status !== 'paid');

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter.from || dateRangeFilter.to) {
        const factureDate = facture.date ? new Date(facture.date) : null;
        if (factureDate) {
          if (dateRangeFilter.from) {
            matchesDateRange = matchesDateRange && factureDate >= new Date(dateRangeFilter.from);
          }
          if (dateRangeFilter.to) {
            matchesDateRange = matchesDateRange && factureDate <= new Date(dateRangeFilter.to);
          }
        }
      }

      return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesOverdue && matchesDateRange;
    });
  }, [factures, searchTerm, statusFilter, clientFilter, projectFilter, isOverdueFilter, dateRangeFilter]);

  // Colonnes - adaptées selon le type de document
  const columns: Column<Facture>[] = useMemo(() => {
    const baseColumns: Column<Facture>[] = [
      {
        key: 'reference',
        label: t('reference'),
        render: (value, row) => (
          <div
            className="flex items-center gap-3 cursor-pointer transition-colors"
            onClick={() => router.push(`/dashboard/factures/${getFactureSlug(row)}${isQuoteMode ? '?type=quote' : ''}`)}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isQuoteMode ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {isQuoteMode ? (
                <IconFileDescription className="w-4 h-4 !text-violet-500" />
              ) : (
                <IconFileInvoice className="w-4 h-4 !text-amber-500" />
              )}
            </div>
            <p className="!text-primary font-medium">{value as string}</p>
          </div>
        ),
      },
      {
        key: 'date',
        label: t('date'),
        render: (value) => (
          <p className="!text-primary">
            {value ? formatDate(value as string) : '-'}
          </p>
        ),
      },
    ];
    
    // Colonne spécifique selon le type
    if (isQuoteMode) {
      baseColumns.push({
        key: 'valid_until',
        label: t('valid_until') || 'Valide jusqu\'au',
        render: (value) => (
          <p className="!text-primary">
            {value ? formatDate(value as string) : '-'}
          </p>
        ),
      });
      
      baseColumns.push({
        key: 'quote_status',
        label: t('status'),
        render: (value) => {
          const status = value as string;
          const config =
            status === 'accepted' ? { icon: IconCheck, label: t('accepted') || 'Accepté', colorClass: 'text-success' } :
            status === 'rejected' ? { icon: IconX, label: t('rejected') || 'Refusé', colorClass: 'text-error' } :
            status === 'expired' ? { icon: IconHourglass, label: t('expired') || 'Expiré', colorClass: 'text-warning' } :
            status === 'sent' ? { icon: IconClock, label: t('sent') || 'Envoyé', colorClass: 'text-info' } :
            { icon: IconClock, label: t('draft') || 'Brouillon', colorClass: 'text-muted' };

          const Icon = config.icon;
          return (
            <div className={`flex items-center gap-2 ${config.colorClass}`}>
              <Icon className={`w-4 h-4`} />
              {config.label}
            </div>
          );
        },
      });
    } else {
      baseColumns.push({
        key: 'due_date',
        label: t('due_date'),
        render: (value) => (
          <p className="!text-primary">
            {value ? formatDate(value as string) : '-'}
          </p>
        ),
      });
      
      baseColumns.push({
        key: 'facture_status',
        label: t('status'),
        render: (value) => {
          const status = value as string;
          const config =
            status === 'paid' ? { icon: IconCheck, label: t('paid') || 'Payée', colorClass: 'text-success' } :
            status === 'sent' ? { icon: IconClock, label: t('sent') || 'Envoyée', colorClass: 'text-info' } :
            { icon: IconClock, label: t('draft') || 'Brouillon', colorClass: 'text-warning' };

          const Icon = config.icon;
          return (
            <div className={`flex items-center gap-2 ${config.colorClass}`}>
              <Icon className={`w-4 h-4`} />
              {config.label}
            </div>
          );
        },
      });
    }
    
    // Colonnes communes
    baseColumns.push(
      {
        key: 'number',
        label: t('amount'),
        render: (value) => (
          <p className={`font-medium ${isQuoteMode ? '!text-secondary' : '!text-accent'}`}>
            {value ? formatCurrency(value as number) : '-'}
          </p>
        ),
      },
      {
        key: 'client',
        label: t('client'),
        render: (value, row) => {
          const clientData = value || row.client_id;
          return (
            <p className="!text-primary">
              {clientData && typeof clientData === 'object' ? (clientData as Client).name : '-'}
            </p>
          );
        },
      },
      {
        key: 'project',
        label: t('project'),
        render: (value) => (
          <p className="!text-primary">
            {value && typeof value === 'object' ? (value as Project).title : '-'}
          </p>
        ),
      },
      {
        key: 'actions',
        label: t('actions'),
        render: (_, row) => (
          <TableActions
            onEdit={() => router.push(`/dashboard/factures/${getFactureSlug(row)}?edit=1${isQuoteMode ? '&type=quote' : ''}`)}
            onDelete={() => setDeleteModal({ isOpen: true, facture: row })}
            onConvert={isQuoteMode && row.quote_status !== 'rejected' ? () => setConvertModal({ isOpen: true, quote: row }) : undefined}
            convertLabel={t('convert_to_invoice') || 'Convertir en facture'}
          />
        ),
      }
    );
    
    return baseColumns;
  }, [t, formatDate, formatCurrency, router, isQuoteMode]);

  const handleDeleteFacture = async () => {
    if (!deleteModal.facture?.documentId) return;
    
    await deleteFacture(deleteModal.facture.documentId);
    showGlobalPopup(
      isQuoteMode 
        ? (t('quote_deleted_success') || 'Devis supprimé avec succès') 
        : (t('facture_deleted_success') || 'Facture supprimée avec succès'), 
      'success'
    );
    clearCache('factures');
    await refetch();
  };

  // Handler pour convertir un devis en facture
  const handleConvertQuote = useCallback(async () => {
    if (!convertModal.quote || !user?.id) return;
    
    const quote = convertModal.quote;

    setIsConverting(true);
    try {
      // Extraire le documentId du client
      const clientDocId = quote.client_id && typeof quote.client_id === 'object' 
        ? (quote.client_id as Client).documentId 
        : (quote.client && typeof quote.client === 'object' 
            ? (quote.client as Client).documentId 
            : undefined);

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
        {
          updateClientStatus: updateClientOnConvert,
          clientDocumentId: clientDocId,
          invoicePrefix: preferences.invoice.invoicePrefix,
          defaultPaymentDays: preferences.invoice.defaultPaymentDays,
        }
      );

      setConvertModal({ isOpen: false, quote: null });
      showGlobalPopup(t('quote_converted_success') || 'Devis converti en facture avec succès !', 'success');
      
      // Invalider le cache et rafraîchir
      clearCache('factures');
      await refetch();
      
      // Optionnel : rediriger vers la nouvelle facture
      const invoiceData = result.invoice as { data?: { documentId?: string } };
      if (invoiceData?.data?.documentId) {
        router.push(`/dashboard/factures/${invoiceData.data.documentId}`);
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      showGlobalPopup(t('quote_converted_error') || 'Erreur lors de la conversion', 'error');
    } finally {
      setIsConverting(false);
    }
  }, [convertModal.quote, user?.id, updateClientOnConvert, preferences.invoice, showGlobalPopup, t, refetch, router]);

  // Handle multiple deletion
  const handleDeleteMultipleFactures = async (facturesToDelete: Facture[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const facture of facturesToDelete) {
      if (!facture.documentId) continue;
      try {
        await deleteFacture(facture.documentId);
        successCount++;
      } catch (error) {
        console.error(`Error deleting ${isQuoteMode ? 'quote' : 'facture'} ${facture.reference}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      const message = isQuoteMode 
        ? `${successCount} devis supprimé(s) avec succès`
        : `${successCount} facture(s) supprimée(s) avec succès`;
      showGlobalPopup(message, 'success');
      clearCache('factures');
      await refetch();
    }
    if (errorCount > 0) {
      showGlobalPopup(`${errorCount} erreur(s) lors de la suppression`, 'error');
    }
  };


  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header épuré */}
        <div className="bg-card border-b border-default">
          <div className="max-w-7xl mx-auto px-8 py-5">
            {/* Breadcrumb + Actions */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="!text-xs !text-muted mb-1">
                  <span>{t('dashboard') || 'Tableau de Bord'}</span>
                  <span className="mx-1.5">→</span>
                  <span>{t('invoices_and_quotes') || 'Factures / Devis'}</span>
                </div>
                <h1 className="!text-[22px] font-bold tracking-tight !text-primary">
                  {t('invoices_and_quotes') || 'Factures & Devis'}
                </h1>
              </div>
              <button
                onClick={() => router.push(`/dashboard/factures/new${isQuoteMode ? '?type=quote' : ''}`)}
                className="flex items-center gap-2 bg-primary !text-white border-none px-4 py-2 rounded-lg !text-sm font-semibold hover:opacity-90 transition-all"
              >
                <IconFileInvoice className="w-4 h-4" />
                {isQuoteMode ? (t('create_quote') || 'Créer un devis') : (t('create_facture') || 'Créer une facture')}
              </button>
            </div>

            {/* Stats inline */}
            <div className="flex gap-3 mb-5 flex-wrap">
              {isQuoteMode ? (
                <>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('total_quotes') || 'Total'}</div>
                    <div className="!text-[22px] font-bold tracking-tight !text-primary">{loading ? '...' : stats.total}</div>
                  </div>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('accepted_quotes') || 'Acceptés'}</div>
                    <div className="!text-[22px] font-bold tracking-tight text-emerald-500">{loading ? '...' : stats.accepted}</div>
                  </div>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('pending_quotes') || 'En attente'}</div>
                    <div className="!text-[22px] font-bold tracking-tight !text-primary">{loading ? '...' : stats.pending}</div>
                  </div>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('total_amount') || 'Montant'}</div>
                    <div className="!text-[22px] font-bold tracking-tight text-violet-500">{loading ? '...' : formatCurrency(stats.totalAmount || 0)}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('total_invoices') || 'Total factures'}</div>
                    <div className="!text-[22px] font-bold tracking-tight !text-primary">{loading ? '...' : stats.total}</div>
                  </div>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('paid_invoices') || 'Payées'}</div>
                    <div className="!text-[22px] font-bold tracking-tight text-emerald-500">{loading ? '...' : stats.paid}</div>
                  </div>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('revenue') || 'Chiffre d\'affaires'}</div>
                    <div className="!text-[22px] font-bold tracking-tight text-violet-500">{loading ? '...' : formatCurrency(stats.paidAmount || 0)}</div>
                  </div>
                  <div className="card flex-1 min-w-[140px] p-3.5">
                    <div className="!text-xs !text-muted mb-1">{t('this_month') || 'Ce mois'}</div>
                    <div className="!text-[22px] font-bold tracking-tight !text-primary">{loading ? '...' : stats.newThisMonth}</div>
                  </div>
                </>
              )}
            </div>

            {/* Tabs pills */}
            <div className="flex gap-0.5 bg-muted rounded-lg p-0.5 w-fit">
              <button
                onClick={() => router.push('/dashboard/factures')}
                className={`px-3.5 py-1.5 rounded-lg !text-sm font-medium transition-all ${
                  !isQuoteMode
                    ? 'bg-card !text-primary shadow-sm'
                    : '!text-muted hover:!text-primary'
                }`}
              >
                {t('invoices') || 'Factures'}
              </button>
              <button
                onClick={() => router.push('/dashboard/factures?type=quote')}
                className={`px-3.5 py-1.5 rounded-lg !text-sm font-medium transition-all ${
                  isQuoteMode
                    ? 'bg-card !text-primary shadow-sm'
                    : '!text-muted hover:!text-primary'
                }`}
              >
                {t('quotes') || 'Devis'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Filtres */}
          <div className="mb-4">
            <TableFilters
              searchValue={searchTerm}
              onSearchChangeAction={setSearchTerm}
              searchPlaceholder={isQuoteMode ? (t('search_placeholder_quotes') || 'Rechercher un devis...') : (t('search_placeholder_factures') || 'Référence, client ou projet...')}
              statusOptions={statusOptions}
              statusValue={statusFilter}
              onStatusChangeAction={setStatusFilter}
              advancedFilters={advancedFilters}
              onAdvancedFilterChange={handleAdvancedFilterChange}
            />
          </div>

          {/* Tableau */}
          <div className="bg-card border border-default rounded-lg overflow-hidden">
            <DataTable<Facture>
              columns={columns}
              data={filteredFactures}
              emptyMessage={isQuoteMode ? (t('no_quote_found') || 'Aucun devis trouvé') : (t('no_invoice_found') || 'Aucune facture trouvée')}
              onRowClick={(row) => router.push(`/dashboard/factures/${getFactureSlug(row)}${isQuoteMode ? '?type=quote' : ''}`)}
              selectable={true}
              onDeleteSelected={handleDeleteMultipleFactures}
              getItemId={(facture) => facture.documentId || ''}
              getItemName={(facture) => facture.reference}
              loading={loading}
            />
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

      {/* Modal de confirmation de conversion devis → facture */}
      <Modal open={convertModal.isOpen} onClose={() => setConvertModal({ isOpen: false, quote: null })}>
        <div className="p-6 !space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <IconFileInvoice className="w-6 h-6 !text-green-500" />
            </div>
            <div>
              <h3 className="!text-lg font-semibold !text-primary">
                {t('convert_quote_to_invoice') || 'Convertir ce devis en facture'}
              </h3>
              <p className="!text-sm !text-muted">
                {convertModal.quote?.reference}
              </p>
            </div>
          </div>

          <p className="!text-primary">
            {t('convert_quote_confirm_desc') || 'Le devis sera marqué comme "accepté" et une nouvelle facture sera créée avec les mêmes informations.'}
          </p>

          {/* Option pour mettre à jour le statut du client */}
          <div className="flex items-start gap-3 p-4 bg-muted ">
            <input
              type="checkbox"
              id="updateClientStatusTable"
              checked={updateClientOnConvert}
              onChange={(e) => setUpdateClientOnConvert(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-default !text-accent focus:ring-accent"
            />
            <div>
              <label htmlFor="updateClientStatusTable" className="!text-sm font-medium !text-primary cursor-pointer">
                {t('update_client_status') || 'Mettre à jour le statut du client'}
              </label>
              <p className="!text-xs !text-muted mt-1">
                {t('update_client_status_desc') || 'Passer le client en "Devis accepté" dans le pipeline'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConvertModal({ isOpen: false, quote: null })}
              disabled={isConverting}
              className="px-4 py-2 !text-secondary hover:!text-primary transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              onClick={handleConvertQuote}
              disabled={isConverting}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 !text-white  hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('converting_quote') || 'Conversion...'}
                </>
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  {t('convert_to_invoice') || 'Convertir en facture'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
