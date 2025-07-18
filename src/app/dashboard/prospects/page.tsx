'use client';

import React, { useEffect, useState } from 'react';
import { fetchProspectsUser } from '@/lib/api';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FilterOption } from '@/app/components/TableFilters';
import { useRouter } from 'next/navigation';

interface Prospect {
  id: string;
  title: string;
  email: string;
  phone: string;
  prospect_status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProspectsPage() {
  const { t } = useLanguage();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  // Options de filtres par statut
  const statusOptions: FilterOption[] = [
    {
      value: 'prospect',
      label: t('prospect'),
      count: prospects.filter(p => p.prospect_status === 'prospect').length,
    },
    {
      value: 'answers',
      label: t('answers'),
      count: prospects.filter(p => p.prospect_status === 'answer').length,
    },
    {
      value: 'to_be_contacted',
      label: t('to_be_contacted'),
      count: prospects.filter(p => p.prospect_status === 'to_be_contacted')
        .length,
    },
    {
      value: 'contacted',
      label: t('contacted'),
      count: prospects.filter(p => p.prospect_status === 'contacted').length,
    },
  ];

  // Filtrage des données
  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch =
      searchTerm === '' ||
      prospect.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === '' ||
      prospect.prospect_status === statusFilter ||
      prospect.prospect_status === 'answer' ||
      prospect.prospect_status === 'to_be_contacted' ||
      prospect.prospect_status === 'contacted';

    return matchesSearch && matchesStatus;
  });

  const columns: Column<Prospect>[] = [
    {
      key: 'title',
      label: t('name'),
      render: (value: unknown) => (
        <p className="!text-zinc-200 font-medium">{value as string}</p>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (value: unknown) => (
        <p className="!text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'phone',
      label: t('phone'),
      render: (value: unknown) => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'prospect_status',
      label: t('status'),
      render: (value: unknown) => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'answer':
              return {
                label: t('answer'),
                className: 'bg-green-100 !text-green-800',
              };
            case 'to_be_contacted':
              return {
                label: t('to_be_contacted'),
                className: 'bg-blue-100 !text-blue-800',
              };
            case 'contacted':
              return {
                label: t('contacted'),
                className: 'bg-yellow-100 !text-yellow-800',
              };
            default:
              return {
                label: status,
                className: 'bg-gray-100 !text-gray-800',
              };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('creation_date'),
      render: (value: unknown) => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_: unknown, row: Prospect) => (
        <TableActions
          onEdit={() => console.log('Edit prospect:', row.id)}
          onDelete={() => console.log('Delete prospect:', row.id)}
        />
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchProspectsUser(user?.id || 0);
        setProspects(response.data || []);
      } catch (error) {
        console.error('Error fetching prospects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  return (
    <DashboardPageTemplate<Prospect>
      title={t('prospects')}
      onRowClick={row => router.push(`/dashboard/prospects/${row.id}`)}
      actionButtonLabel={t('new_prospect')}
      onActionButtonClick={() => {}}
      stats={[
        {
          label: t('total_prospects'),
          value: prospects.length,
          colorClass: '!text-blue-400',
        },
        {
          label: t('answers'),
          value: prospects.filter(p => p.prospect_status === 'answer').length,
          colorClass: '!text-yellow-400',
        },
        {
          label: t('contacted'),
          value: prospects.filter(p => p.prospect_status === 'contacted')
            .length,
          colorClass: '!text-green-400',
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
  );
}
