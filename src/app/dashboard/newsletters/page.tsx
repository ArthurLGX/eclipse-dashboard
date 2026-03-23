'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { fetchNewslettersUser } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import DataTable, { Column } from '@/app/components/DataTable';
import TableFilters, { FilterOption } from '@/app/components/TableFilters';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Newsletter {
  id: number;
  documentId: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  n_status: string;
  template: string;
  author: {
    id: number;
    documentId: string;
    username: string;
    email: string;
    profile_picture: {
      url: string;
    };
    subscribers: {
      id: number;
      documentId: string;
      email: string;
      first_name: string;
      last_name: string;
    }[];
  };
}
export default function NewslettersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const statusOptions: FilterOption[] = [
    { label: t('sent') || 'Envoyée', value: 'sent', count: newsletters.filter(n => n.n_status === 'sent').length },
    { label: t('draft') || 'Brouillon', value: 'draft', count: newsletters.filter(n => n.n_status === 'draft').length },
    { label: t('scheduled') || 'Planifiée', value: 'scheduled', count: newsletters.filter(n => n.n_status === 'scheduled').length },
  ];

  const filteredNewsletters = newsletters.filter(newsletter => {
    return (
      newsletter.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === '' || newsletter.n_status === statusFilter)
    );
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetchNewslettersUser(user.id) as { data?: Newsletter[] };
        setNewsletters(response?.data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const columns: Column<Newsletter>[] = [
    {
      key: 'title',
      label: t('title'),
      render: (value: unknown) => (
        <p className="!text-primary">{value as string}</p>
      ),
    },
    {
      key: 'subject',
      label: t('subject'),
      render: (value: unknown) => (
        <p className="!text-primary">{value as string}</p>
      ),
    },
    {
      key: 'n_status',
      label: t('status'),
      render: (value: unknown) => {
        const v = value as string;
        const statusConfig = 
          v === 'sent' 
            ? { bg: 'bg-emerald-100', text: '!text-emerald-600', label: t('sent') || 'Envoyée' }
            : v === 'draft'
            ? { bg: 'bg-muted', text: '!text-muted', label: t('draft') || 'Brouillon' }
            : v === 'scheduled'
            ? { bg: 'bg-blue-100', text: '!text-blue-600', label: t('scheduled') || 'Planifiée' }
            : { bg: 'bg-muted', text: '!text-muted', label: v };
        
        return (
          <span className={`${statusConfig.bg} ${statusConfig.text} px-2 py-1 rounded-md !text-xs font-medium inline-block whitespace-nowrap`}>
            {statusConfig.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('created_at') || 'Créée le',
      render: (value: unknown) => {
        const date = new Date(value as string);
        return (
          <p className="!text-sm !text-secondary">
            {date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        );
      },
    },
    {
      key: 'actions',
      label: t('actions'),
      render: () => (
        <p className="!text-primary flex items-center gap-2 cursor-pointer hover:!text-zinc-200 transition-colors">
          <IconPencil className="w-4 h-4" />
          <IconTrash className="w-4 h-4 !text-red-400" />
        </p>
      ),
    },
  ];

  // Stats
  const sentCount = newsletters.filter(n => n.n_status === 'sent').length;
  const draftCount = newsletters.filter(n => n.n_status === 'draft').length;
  const scheduledCount = newsletters.filter(n => n.n_status === 'scheduled').length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header épuré */}
        <div className="bg-card border-b border-default">
          <div className=" mx-auto px-8 py-5">
            {/* Breadcrumb + Actions */}
            <div className="flex items-start justify-between mb-6">

              <button
                onClick={() => router.push('/dashboard/newsletters/compose')}
                className="btn-primary flex items-center gap-2 px-4 py-2  !text-sm font-semibold hover:opacity-90 transition-all"
              >
                <IconPlus className="w-4 h-4 !text-white" />
                {t('add_newsletter') || 'Nouvelle newsletter'}
              </button>
            </div>

            {/* Stats inline */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-card flex-1 min-w-[140px] p-3.5 rounded-lg">
                <div className="!text-xs !text-muted mb-1">{t('total_newsletters') || 'Total'}</div>
                <div className="!text-[22px] font-bold tracking-tight !text-primary">{loading ? '...' : newsletters.length}</div>
              </div>
              <div className="bg-card flex-1 min-w-[140px] p-3.5">
                <div className="!text-xs !text-muted mb-1">{t('sent') || 'Envoyées'}</div>
                <div className="!text-[22px] font-bold tracking-tight text-emerald-500">{loading ? '...' : sentCount}</div>
              </div>
              <div className="bg-card flex-1 min-w-[140px] p-3.5 rounded-lg">
                <div className="!text-xs !text-muted mb-1">{t('draft') || 'Brouillons'}</div>
                <div className="!text-[22px] font-bold tracking-tight !text-secondary">{loading ? '...' : draftCount}</div>
              </div>
              <div className="bg-card flex-1 min-w-[140px] p-3.5 rounded-lg">
                <div className="!text-xs !text-muted mb-1">{t('scheduled') || 'Planifiées'}</div>
                <div className="!text-[22px] font-bold tracking-tight text-blue-500">{loading ? '...' : scheduledCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className=" mx-auto px-8 py-6">
          {/* Filtres */}
          <div className="mb-4">
            <TableFilters
              searchValue={searchTerm}
              onSearchChangeAction={setSearchTerm}
              searchPlaceholder={t('search_placeholder_newsletters') || 'Rechercher une newsletter...'}
              statusOptions={statusOptions}
              statusValue={statusFilter}
              onStatusChangeAction={setStatusFilter}
            />
          </div>

          {/* Tableau */}
          <div className="overflow-hidden">
            <DataTable<Newsletter>
              columns={columns}
              data={filteredNewsletters}
              emptyMessage={t('no_newsletters_found') || 'Aucune newsletter trouvée'}
              onRowClick={(row) => router.push(`/dashboard/newsletters/${row.documentId}`)}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
