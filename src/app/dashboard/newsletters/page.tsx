'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { fetchNewslettersUser } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import TableFilters from '@/app/components/TableFilters';
import DataTable, { Column } from '@/app/components/DataTable';
import { IconPencil, IconTrash } from '@tabler/icons-react';

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
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const statusOptions = [
    { label: t('all'), value: '' },
    { label: t('sent'), value: 'sent' },
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
        const response = await fetchNewslettersUser(user.id);
        setNewsletters(response.data || []);
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
      render: value => <p className="!text-zinc-300">{value as string}</p>,
    },
    {
      key: 'subject',
      label: t('subject'),
      render: value => <p className="!text-zinc-300">{value as string}</p>,
    },
    {
      key: 'n_status',
      label: t('status'),
      render: value => (
        <p
          className={`${
            value === 'sent'
              ? '!text-green-400 bg-emerald-400/20 px-2 py-1 rounded-full lg:w-fit w-full !text-sm'
              : '!text-orange-400 bg-orange-400/20 px-2 py-1 rounded-full lg:w-fit w-full !text-sm'
          } !text-sm`}
        >
          {value === 'sent' ? t('sent') : t('draft')}
        </p>
      ),
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: value => <p className="!text-zinc-300">{value as string}</p>,
    },
    {
      key: 'actions',
      label: t('actions'),
      render: () => (
        <p className="!text-zinc-300 flex items-center gap-2 cursor-pointer hover:text-zinc-200 transition-colors">
          <IconPencil className="w-4 h-4" />
          <IconTrash className="w-4 h-4 !text-red-400" />
        </p>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
          <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-zinc-200">
            {t('newsletters')}
          </h1>
          <button className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 transition-colors">
            {t('add_newsletter')}
          </button>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800"
                    >
                      <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 bg-zinc-800 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : newsletters.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('total_newsletters')}
                </h3>
                <p className="!text-3xl font-bold !text-pink-400">
                  {newsletters.length}
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('sent')}
                </h3>
                <p className="!text-3xl font-bold !text-green-400">
                  {
                    newsletters.filter(
                      newsletter => newsletter.n_status === 'sent'
                    ).length
                  }
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="!text-xl font-semibold !text-zinc-200">
                  {t('newsletters_list')}
                </h2>
              </div>
              <div className="p-6">
                <TableFilters
                  searchPlaceholder={t('search_placeholder_newsletters')}
                  statusOptions={statusOptions}
                  onSearchChangeAction={setSearchTerm}
                  onStatusChangeAction={setStatusFilter}
                  searchValue={searchTerm}
                  statusValue={statusFilter}
                />
                <DataTable<Newsletter>
                  columns={columns}
                  data={filteredNewsletters}
                  loading={loading}
                  emptyMessage={t('no_newsletter_found')}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <p className="!text-zinc-400">{t('no_newsletter_found')}</p>
          </div>
        )}
      </motion.div>
    </ProtectedRoute>
  );
}
