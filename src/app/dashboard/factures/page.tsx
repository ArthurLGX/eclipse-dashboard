'use client';

import React, { useState, useMemo } from 'react';
import { deleteFacture } from '@/lib/api';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import { FilterOption, AdvancedFilter, DateRangeFilter } from '@/app/components/TableFilters';
import {
  IconCheck,
  IconClock,
  IconFileInvoice,
  IconCurrencyEuro,
  IconCalendar,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { generateSlug } from '@/utils/slug';
import { useFactures, clearCache } from '@/hooks/useApi';
import type { Facture, Client, Project } from '@/types';

export default function FacturesPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = usePreferences();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; facture: Facture | null }>({
    isOpen: false,
    facture: null,
  });

  // Advanced filters state
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [amountRangeFilter, setAmountRangeFilter] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ from: '', to: '' });
  const [isOverdueFilter, setIsOverdueFilter] = useState<boolean | undefined>(undefined);

  // Hook avec cache
  const { data: facturesData, loading, refetch } = useFactures(user?.id);
  const factures = useMemo(() => (facturesData as Facture[]) || [], [facturesData]);

  // Générer un slug parlant pour une facture
  const getFactureSlug = (facture: Facture) => {
    // Strapi peut retourner "client" ou "client_id" selon la config
    const clientData = facture.client || facture.client_id;
    const clientName = clientData && typeof clientData === 'object'
      ? (clientData as Client).name
      : '';
    return generateSlug(`${facture.reference}-${clientName || 'facture'}`, facture.documentId);
  };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
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
  }, [factures]);

  // Options de filtre
  const statusOptions: FilterOption[] = useMemo(() => [
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
  ], [factures, t]);

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
        statusFilter === '' || facture.facture_status === statusFilter;

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

  // Colonnes
  const columns: Column<Facture>[] = [
    {
      key: 'reference',
      label: t('reference'),
      render: (value, row) => (
        <div
          className="flex items-center gap-3 cursor-pointer transition-colors"
          onClick={() => router.push(`/dashboard/factures/${getFactureSlug(row)}`)}
        >
          <div className="w-8 h-8 rounded-full bg-hover flex items-center justify-center">
            <span className="text-secondary font-medium !text-sm">
              {(value as string).charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-primary font-medium">{value as string}</p>
        </div>
      ),
    },
    {
      key: 'date',
      label: t('date'),
      render: (value) => (
        <p className="text-secondary">
          {value ? formatDate(value as string) : '-'}
        </p>
      ),
    },
    {
      key: 'due_date',
      label: t('due_date'),
      render: (value) => (
        <p className="text-secondary">
          {value ? formatDate(value as string) : '-'}
        </p>
      ),
    },
    {
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
            <Icon className={`w-4 h-4 ${config.colorClass}`} />
            {config.label}
          </div>
        );
      },
    },
    {
      key: 'number',
      label: t('amount'),
      render: (value) => (
        <p className="text-primary font-medium">
          {value ? formatCurrency(value as number) : '-'}
        </p>
      ),
    },
    {
      key: 'client',
      label: t('client'),
      render: (value, row) => {
        // Strapi peut retourner "client" ou "client_id"
        const clientData = value || row.client_id;
        return (
          <p className="text-secondary">
            {clientData && typeof clientData === 'object' ? (clientData as Client).name : '-'}
          </p>
        );
      },
    },
    {
      key: 'project',
      label: t('project'),
      render: (value) => (
        <p className="text-secondary">
          {value && typeof value === 'object' ? (value as Project).title : '-'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_, row) => (
        <TableActions
          onEdit={() => router.push(`/dashboard/factures/${getFactureSlug(row)}?edit=1`)}
          onDelete={() => setDeleteModal({ isOpen: true, facture: row })}
        />
      ),
    },
  ];

  const handleDeleteFacture = async () => {
    if (!deleteModal.facture?.documentId) return;
    
    await deleteFacture(deleteModal.facture.documentId);
    showGlobalPopup(t('facture_deleted_success') || 'Facture supprimée avec succès', 'success');
    clearCache('factures');
    await refetch();
  };

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
        console.error(`Error deleting facture ${facture.reference}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showGlobalPopup(`${successCount} facture(s) supprimée(s) avec succès`, 'success');
      clearCache('factures');
      await refetch();
    }
    if (errorCount > 0) {
      showGlobalPopup(`${errorCount} erreur(s) lors de la suppression`, 'error');
    }
  };

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Facture>
        title={t('invoices')}
        onRowClick={row => router.push(`/dashboard/factures/${getFactureSlug(row)}`)}
        actionButtonLabel={t('create_facture')}
        onActionButtonClick={() => router.push('/dashboard/factures/ajouter')}
        stats={[
          {
            label: t('total_invoices'),
            value: stats.total,
            colorClass: 'text-success',
            icon: <IconFileInvoice className="w-6 h-6 text-success" />,
          },
          {
            label: t('active_factures'),
            value: stats.paid,
            colorClass: 'text-info',
            icon: <IconCheck className="w-6 h-6 text-info" />,
          },
          {
            label: t('revenue'),
            value: formatCurrency(stats.paidAmount),
            colorClass: 'text-success',
            icon: <IconCurrencyEuro className="w-6 h-6 text-success" />,
          },
          {
            label: t('new_factures_this_month'),
            value: stats.newThisMonth,
            colorClass: 'text-color-primary',
            icon: <IconCalendar className="w-6 h-6 text-color-primary" />,
          },
        ]}
        loading={loading}
        filterOptions={statusOptions}
        searchPlaceholder={t('search_placeholder_factures')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        advancedFilters={advancedFilters}
        onAdvancedFilterChange={handleAdvancedFilterChange}
        columns={columns}
        data={filteredFactures}
        emptyMessage={t('no_facture_found')}
        selectable={true}
        onDeleteSelected={handleDeleteMultipleFactures}
        getItemId={(facture) => facture.documentId || ''}
        getItemName={(facture) => facture.reference}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, facture: null })}
        onConfirm={handleDeleteFacture}
        title={t('delete_facture') || 'Supprimer la facture'}
        itemName={deleteModal.facture?.reference || ''}
        itemType="facture"
      />
    </ProtectedRoute>
  );
}
