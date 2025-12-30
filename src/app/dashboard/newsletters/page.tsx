'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { fetchNewslettersUser } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import { Column } from '@/app/components/DataTable';
import { IconPencil, IconTrash, IconMail, IconSend } from '@tabler/icons-react';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { FilterOption } from '@/app/components/TableFilters';
import { useRouter } from 'next/navigation';

interface Newsletter {
  id: number;
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

  const statusOptions: FilterOption[] = [{ label: t('sent'), value: 'sent' }];

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
        <p className="text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'subject',
      label: t('subject'),
      render: (value: unknown) => (
        <p className="text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'n_status',
      label: t('status'),
      render: (value: unknown) => {
        const v = value as string;
        return (
          <p
            className={`${
              v === 'sent'
                ? '!text-emerald-400 bg-emerald-400/20 px-2 py-1 rounded-full lg:w-fit w-full !text-sm'
                : '!text-orange-400 bg-orange-400/20 px-2 py-1 rounded-full lg:w-fit w-full !text-sm'
            } !text-sm`}
          >
            {v === 'sent' ? t('sent') : t('draft')}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: (value: unknown) => (
        <p className="text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: () => (
        <p className="text-zinc-300 flex items-center gap-2 cursor-pointer hover:text-zinc-200 transition-colors">
          <IconPencil className="w-4 h-4" />
          <IconTrash className="w-4 h-4 !text-red-400" />
        </p>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Newsletter>
        title={t('newsletters')}
        onRowClick={row => router.push(`/dashboard/newsletters/${row.id}`)}
        actionButtonLabel={t('add_newsletter')}
        onActionButtonClick={() => {}}
        stats={[
          {
            label: t('total_newsletters'),
            value: newsletters.length,
            colorClass: '!text-pink-400',
            icon: <IconMail className="w-6 h-6 !text-pink-400" />,
          },
          {
            label: t('sent'),
            value: newsletters.filter(
              newsletter => newsletter.n_status === 'sent'
            ).length,
            colorClass: '!text-emerald-400',
            icon: <IconSend className="w-6 h-6 !text-emerald-400" />,
          },
        ]}
        loading={loading}
        filterOptions={statusOptions}
        searchPlaceholder={
          t('search_placeholder_newsletters') || 'Rechercher...'
        }
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        columns={columns as unknown as Column<Newsletter>[]}
        data={filteredNewsletters}
        emptyMessage={t('no_newsletters_found')}
      />
    </ProtectedRoute>
  );
}
