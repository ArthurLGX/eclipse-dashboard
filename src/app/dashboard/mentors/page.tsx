'use client';

import React, { useState, useMemo } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { IconBrain, IconUserStar } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useMentors } from '@/hooks/useApi';
import type { Mentor } from '@/types';

export default function MentorsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');

  // Hook avec cache
  const { data: mentorsData, loading } = useMentors(user?.id);
  const mentors = useMemo(() => (mentorsData as Mentor[]) || [], [mentorsData]);

  // Filtrage
  const filteredMentors = useMemo(() => {
    return mentors.filter(mentor => {
      const matchesSearch =
        searchTerm === '' ||
        mentor.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mentor.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mentor.email?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [mentors, searchTerm]);

  // Colonnes
  const columns: Column<Mentor>[] = [
    {
      key: 'firstName',
      label: t('first_name') || 'Prénom',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <span className="!text-indigo-400 font-medium !text-sm">
              {(value as string)?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="text-zinc-200 font-medium">
              {value as string} {row.lastName}
            </p>
            <p className="text-zinc-500 !text-sm">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => (
        <p className="text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'projects',
      label: t('projects'),
      render: (value) => {
        const projects = value as { id: number; title: string }[] | undefined;
        return (
          <p className="text-zinc-300">
            {projects?.length || 0} {t('projects')?.toLowerCase()}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: (value) => (
        <p className="text-zinc-300">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <TableActions
          onEdit={() => console.log('Edit mentor:', row.id)}
          onDelete={() => console.log('Delete mentor:', row.id)}
        />
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Mentor>
        title={t('mentors')}
        onRowClick={row => router.push(`/dashboard/mentors/${row.id}`)}
        actionButtonLabel={t('add_mentor')}
        onActionButtonClick={() => {}}
        stats={[
          {
            label: t('total_mentors'),
            value: mentors.length,
            colorClass: '!text-indigo-400',
            icon: <IconBrain className="w-6 h-6 !text-indigo-400" />,
          },
          {
            label: t('available') || 'Disponibles',
            value: mentors.length,
            colorClass: '!text-emerald-400',
            icon: <IconUserStar className="w-6 h-6 !text-emerald-400" />,
          },
        ]}
        loading={loading}
        filterOptions={[]}
        searchPlaceholder={t('search_placeholder_mentors') || 'Rechercher...'}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={''}
        onStatusChange={() => {}}
        columns={columns}
        data={filteredMentors}
        emptyMessage={t('no_mentor_found')}
      />
    </ProtectedRoute>
  );
}
