'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchProspectsUser } from '@/lib/api';
import DataTable, { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import TableFilters, { FilterOption } from '@/app/components/TableFilters';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

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
      render: value => (
        <p className="!text-zinc-200 font-medium">{value as string}</p>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: value => <p className="!text-zinc-300">{value as string}</p>,
    },
    {
      key: 'phone',
      label: t('phone'),
      render: value => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'prospect_status',
      label: t('status'),
      render: value => {
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
              return { label: status, className: 'bg-gray-100 !text-gray-800' };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('creation_date'),
      render: value => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_, row) => (
        <TableActions
          onEdit={() => console.log('Edit prospect:', (row as Prospect).id)}
          onDelete={() => console.log('Delete prospect:', (row as Prospect).id)}
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
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex lg:flex-row flex-col gap-4   items-center justify-between">
        <h1 className="!text-3xl !uppercase font-extrabold text-left !text-zinc-200">
          {t('prospects')}
        </h1>
        <button className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:text-white    transition-colors">
          {t('new_prospect')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
            {t('total_prospects')}
          </h3>
          <p className="!text-3xl font-bold !text-blue-400">
            {prospects.length}
          </p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
            {t('answers')}
          </h3>
          <p className="!text-3xl font-bold !text-yellow-400">
            {prospects.filter(p => p.prospect_status === 'answer').length}
          </p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
            {t('contacted')}
          </h3>
          <p className="!text-3xl font-bold !text-green-400">
            {prospects.filter(p => p.prospect_status === 'contacted').length}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="!text-xl font-semibold !text-zinc-200">
            {t('list_of_prospects')}
          </h2>
        </div>
        <div className="p-6">
          <TableFilters
            searchPlaceholder={t('search_by_name_or_email')}
            statusOptions={statusOptions}
            onSearchChangeAction={setSearchTerm}
            onStatusChangeAction={setStatusFilter}
            searchValue={searchTerm}
            statusValue={statusFilter}
          />
          <DataTable<Prospect>
            columns={columns}
            data={filteredProspects}
            loading={loading}
            emptyMessage={t('no_prospects_found')}
          />
        </div>
      </div>
    </motion.div>
  );
}
