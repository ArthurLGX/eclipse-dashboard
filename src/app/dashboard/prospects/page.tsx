'use client';

import React, { useState, useMemo } from 'react';
import { deleteProspect } from '@/lib/api';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FilterOption, AdvancedFilter, DateRangeFilter } from '@/app/components/TableFilters';
import { useRouter } from 'next/navigation';
import { useProspects, clearCache } from '@/hooks/useApi';
import { IconUsers, IconUserCheck, IconUserPlus } from '@tabler/icons-react';
import type { Prospect } from '@/types';
import { useQuota } from '@/app/context/QuotaContext';
import QuotaExceededModal from '@/app/components/QuotaExceededModal';
import { useQuotaExceeded } from '@/hooks/useQuotaExceeded';
import { updateProspect } from '@/lib/api';

export default function ProspectsPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const { user } = useAuth();
  const router = useRouter();
  const { canAdd, getVisibleCount, limits } = useQuota();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; prospect: Prospect | null }>({
    isOpen: false,
    prospect: null,
  });

  // Advanced filters state
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ from: '', to: '' });
  const [hasEmailFilter, setHasEmailFilter] = useState<boolean | undefined>(undefined);

  // Hook avec cache
  const { data: prospectsData, loading, refetch } = useProspects(user?.id);
  const allProspects = useMemo(() => (prospectsData as Prospect[]) || [], [prospectsData]);
  
  // Limiter les prospects selon le quota
  const prospects = useMemo(() => {
    const visibleCount = getVisibleCount('prospects');
    return allProspects.slice(0, visibleCount);
  }, [allProspects, getVisibleCount]);

  // Quota exceeded detection
  const { 
    showModal: showQuotaModal, 
    setShowModal: setShowQuotaModal, 
    quota: prospectsQuota,
    markAsHandled: markQuotaHandled 
  } = useQuotaExceeded('prospects', allProspects, !loading && allProspects.length > 0);

  // Handle quota exceeded selection
  const handleQuotaSelection = async (itemsToKeep: Prospect[], itemsToRemove: Prospect[]) => {
    // Désactiver les prospects non sélectionnés
    let deactivatedCount = 0;
    for (const prospect of itemsToRemove) {
      if (!prospect.documentId) continue;
      try {
        await updateProspect(prospect.documentId, { isActive: false });
        deactivatedCount++;
      } catch (error) {
        console.error(`Error deactivating prospect ${prospect.title}:`, error);
      }
    }
    
    if (deactivatedCount > 0) {
      showGlobalPopup(
        `${deactivatedCount} ${t('items_deactivated') || 'prospects désactivés'}`,
        'success'
      );
    }
    
    markQuotaHandled();
    clearCache('prospects');
    await refetch();
  };

  // Options de filtres
  const statusOptions: FilterOption[] = useMemo(() => [
    {
      value: 'new',
      label: t('new') || 'Nouveau',
      count: prospects.filter(p => p.prospect_status === 'new').length,
    },
    {
      value: 'form_sent',
      label: t('form_sent') || 'Formulaire envoyé',
      count: prospects.filter(p => p.prospect_status === 'form_sent').length,
    },
    {
      value: 'qualified',
      label: t('qualified') || 'Qualifié',
      count: prospects.filter(p => p.prospect_status === 'qualified').length,
    },
    {
      value: 'quote_sent',
      label: t('quote_sent') || 'Devis envoyé',
      count: prospects.filter(p => p.prospect_status === 'quote_sent').length,
    },
  ], [prospects, t]);

  // Advanced filters configuration
  const advancedFilters: AdvancedFilter[] = useMemo(() => [
    {
      id: 'hasEmail',
      type: 'toggle',
      label: t('with_email') || 'Avec email',
      value: hasEmailFilter,
    },
    {
      id: 'dateRange',
      type: 'date-range',
      label: t('creation_date') || 'Date de création',
      value: dateRangeFilter,
    },
  ], [t, hasEmailFilter, dateRangeFilter]);

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (filterId: string, value: string | string[] | boolean | DateRangeFilter) => {
    switch (filterId) {
      case 'hasEmail':
        setHasEmailFilter(value as boolean ? true : undefined);
        break;
      case 'dateRange':
        setDateRangeFilter(value as DateRangeFilter);
        break;
    }
  };

  // Filtrage
  const filteredProspects = useMemo(() => {
    return prospects.filter(prospect => {
      const matchesSearch =
        searchTerm === '' ||
        prospect.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === '' || prospect.prospect_status === statusFilter;

      // Email filter
      const matchesEmail =
        hasEmailFilter === undefined || (hasEmailFilter && prospect.email && prospect.email.length > 0);

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter.from || dateRangeFilter.to) {
        const prospectDate = new Date(prospect.createdAt);
        if (dateRangeFilter.from) {
          matchesDateRange = matchesDateRange && prospectDate >= new Date(dateRangeFilter.from);
        }
        if (dateRangeFilter.to) {
          matchesDateRange = matchesDateRange && prospectDate <= new Date(dateRangeFilter.to);
        }
      }

      return matchesSearch && matchesStatus && matchesEmail && matchesDateRange;
    });
  }, [prospects, searchTerm, statusFilter, hasEmailFilter, dateRangeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: prospects.length,
    limit: limits.prospects,
    qualified: prospects.filter(p => p.prospect_status === 'qualified').length,
    quote_sent: prospects.filter(p => p.prospect_status === 'quote_sent').length,
  }), [prospects, limits]);

  // Colonnes
  const columns: Column<Prospect>[] = [
    {
      key: 'title',
      label: t('name'),
      render: (value) => (
        <p className="text-primary font-medium">{value as string}</p>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (value) => (
        <p className="text-primary">{value as string}</p>
      ),
    },
    {
      key: 'prospect_status',
      label: t('status'),
      render: (value) => {
        const status = value as string;
        const config =
          status === 'answer' ? { label: t('answer') || 'Réponse', className: 'badge-success' } :
          status === 'to_be_contacted' ? { label: t('to_be_contacted') || 'À contacter', className: 'badge-info' } :
          status === 'contacted' ? { label: t('contacted') || 'Contacté', className: 'badge-warning' } :
          { label: t('prospect') || 'Prospect', className: 'badge-primary' };

        return (
          <span className={`badge ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('creation_date'),
      render: (value) => (
        <p className="text-primary">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_, row) => (
        <TableActions
          onEdit={() => router.push(`/dashboard/prospects/${row.id}?edit=1`)}
          onDelete={() => setDeleteModal({ isOpen: true, prospect: row })}
        />
      ),
    },
  ];

  const handleDeleteProspect = async () => {
    if (!deleteModal.prospect?.documentId) return;
    
    await deleteProspect(deleteModal.prospect.documentId);
    showGlobalPopup(t('prospect_deleted_success') || 'Prospect supprimé avec succès', 'success');
    clearCache('prospects');
    await refetch();
  };

  // Handle multiple deletion
  const handleDeleteMultipleProspects = async (prospectsToDelete: Prospect[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const prospect of prospectsToDelete) {
      if (!prospect.documentId) continue;
      try {
        await deleteProspect(prospect.documentId);
        successCount++;
      } catch (error) {
        console.error(`Error deleting prospect ${prospect.title}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showGlobalPopup(`${successCount} prospect(s) supprimé(s) avec succès`, 'success');
      clearCache('prospects');
      await refetch();
    }
    if (errorCount > 0) {
      showGlobalPopup(`${errorCount} erreur(s) lors de la suppression`, 'error');
    }
  };

  return (
    <>
    <DashboardPageTemplate<Prospect>
      title={t('prospects')}
      onRowClick={row => router.push(`/dashboard/prospects/${row.id}`)}
      actionButtonLabel={canAdd('prospects') ? t('add_prospect') : `${t('add_prospect')} (${t('quota_reached') || 'Quota atteint'})`}
      onActionButtonClick={canAdd('prospects') ? () => {} : () => showGlobalPopup(t('quota_reached_message') || 'Quota atteint. Passez à un plan supérieur.', 'warning')}
      stats={[
        {
          label: t('total_prospects'),
          value: stats.limit > 0 ? `${stats.total}/${stats.limit}` : stats.total,
          colorClass: 'text-info',
          icon: <IconUsers className="w-6 h-6 text-info" />,
        },
        {
          label: t('qualified') || 'Qualifiés',
          value: stats.qualified,
          colorClass: 'text-warning',
          icon: <IconUserCheck className="w-6 h-6 text-warning" />,
        },
        {
          label: t('quote_sent') || 'Devis envoyés',
          value: stats.quote_sent,
          colorClass: 'text-success',
          icon: <IconUserPlus className="w-6 h-6 !text-success-text -text" />,
        },
      ]}
      loading={loading}
      filterOptions={statusOptions}
      searchPlaceholder={t('search_by_name_or_email')}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      statusValue={statusFilter}
      onStatusChange={setStatusFilter}
      advancedFilters={advancedFilters}
      onAdvancedFilterChange={handleAdvancedFilterChange}
      columns={columns}
      data={filteredProspects}
      emptyMessage={t('no_prospects_found')}
      selectable={true}
      onDeleteSelected={handleDeleteMultipleProspects}
      getItemId={(prospect) => prospect.documentId || ''}
      getItemName={(prospect) => prospect.title || prospect.email || ''}
    />

    <DeleteConfirmModal
      isOpen={deleteModal.isOpen}
      onClose={() => setDeleteModal({ isOpen: false, prospect: null })}
      onConfirm={handleDeleteProspect}
      title={t('delete_prospect') || 'Supprimer le prospect'}
      itemName={deleteModal.prospect?.title || deleteModal.prospect?.email || ''}
      itemType="prospect"
    />

    {/* Quota Exceeded Modal */}
    <QuotaExceededModal<Prospect>
      isOpen={showQuotaModal}
      onClose={() => setShowQuotaModal(false)}
      items={allProspects}
      quota={prospectsQuota}
      entityName={t('prospects') || 'prospects'}
      getItemId={(prospect) => prospect.documentId || ''}
      getItemName={(prospect) => prospect.title || prospect.email || ''}
      getItemSubtitle={(prospect) => prospect.email || ''}
      onConfirmSelection={handleQuotaSelection}
    />
    </>
    
  );
}
