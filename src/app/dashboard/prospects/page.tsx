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
import { FilterOption } from '@/app/components/TableFilters';
import { useRouter } from 'next/navigation';
import { useProspects, clearCache } from '@/hooks/useApi';
import { IconUsers, IconUserCheck, IconUserPlus } from '@tabler/icons-react';
import type { Prospect } from '@/types';

export default function ProspectsPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const { user } = useAuth();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; prospect: Prospect | null }>({
    isOpen: false,
    prospect: null,
  });

  // Hook avec cache
  const { data: prospectsData, loading, refetch } = useProspects(user?.id);
  const prospects = (prospectsData as Prospect[]) || [];

  // Options de filtres
  const statusOptions: FilterOption[] = useMemo(() => [
    {
      value: 'prospect',
      label: t('prospect') || 'Prospect',
      count: prospects.filter(p => p.prospect_status === 'prospect').length,
    },
    {
      value: 'answer',
      label: t('answer') || 'Réponse',
      count: prospects.filter(p => p.prospect_status === 'answer').length,
    },
    {
      value: 'to_be_contacted',
      label: t('to_be_contacted') || 'À contacter',
      count: prospects.filter(p => p.prospect_status === 'to_be_contacted').length,
    },
    {
      value: 'contacted',
      label: t('contacted') || 'Contacté',
      count: prospects.filter(p => p.prospect_status === 'contacted').length,
    },
  ], [prospects, t]);

  // Filtrage
  const filteredProspects = useMemo(() => {
    return prospects.filter(prospect => {
      const matchesSearch =
        searchTerm === '' ||
        prospect.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === '' || prospect.prospect_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [prospects, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: prospects.length,
    answers: prospects.filter(p => p.prospect_status === 'answer').length,
    contacted: prospects.filter(p => p.prospect_status === 'contacted').length,
  }), [prospects]);

  // Colonnes
  const columns: Column<Prospect>[] = [
    {
      key: 'title',
      label: t('name'),
      render: (value) => (
        <p className="!text-zinc-200 font-medium">{value as string}</p>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (value) => (
        <p className="!text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'prospect_status',
      label: t('status'),
      render: (value) => {
        const status = value as string;
        const config =
          status === 'answer' ? { label: t('answer') || 'Réponse', className: 'bg-emerald-100 !text-emerald-800' } :
          status === 'to_be_contacted' ? { label: t('to_be_contacted') || 'À contacter', className: 'bg-blue-100 !text-blue-800' } :
          status === 'contacted' ? { label: t('contacted') || 'Contacté', className: 'bg-yellow-100 !text-yellow-800' } :
          { label: t('prospect') || 'Prospect', className: 'bg-gray-100 !text-gray-800' };

        return (
          <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}>
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('creation_date'),
      render: (value) => (
        <p className="!text-zinc-300">
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

  return (
    <>
    <DashboardPageTemplate<Prospect>
      title={t('prospects')}
      onRowClick={row => router.push(`/dashboard/prospects/${row.id}`)}
      actionButtonLabel={t('add_prospect')}
      onActionButtonClick={() => {}}
      stats={[
        {
          label: t('total_prospects'),
          value: stats.total,
          colorClass: '!text-blue-400',
          icon: <IconUsers className="w-6 h-6 !text-blue-400" />,
        },
        {
          label: t('answer') || 'Réponses',
          value: stats.answers,
          colorClass: '!text-yellow-400',
          icon: <IconUserCheck className="w-6 h-6 !text-yellow-400" />,
        },
        {
          label: t('contacted'),
          value: stats.contacted,
          colorClass: '!text-emerald-400',
          icon: <IconUserPlus className="w-6 h-6 !text-emerald-400" />,
        },
      ]}
      loading={loading}
      filterOptions={statusOptions}
      searchPlaceholder={t('search_by_name_or_email')}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      statusValue={statusFilter}
      onStatusChange={setStatusFilter}
      columns={columns}
      data={filteredProspects}
      emptyMessage={t('no_prospects_found')}
    />

    <DeleteConfirmModal
      isOpen={deleteModal.isOpen}
      onClose={() => setDeleteModal({ isOpen: false, prospect: null })}
      onConfirm={handleDeleteProspect}
      title={t('delete_prospect') || 'Supprimer le prospect'}
      itemName={deleteModal.prospect?.title || deleteModal.prospect?.email || ''}
      itemType="prospect"
    />
    </>
    
  );
}
