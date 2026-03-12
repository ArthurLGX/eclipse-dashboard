'use client';

import React, { useState, useMemo } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DataTable, { Column } from '@/app/components/DataTable';
import TableFilters from '@/app/components/TableFilters';
import TableActions from '@/app/components/TableActions';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { IconPlus, IconUserCircle } from '@tabler/icons-react';
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
            <p className="!text-zinc-200 font-medium">
              {value as string} {row.lastName}
            </p>
            <p className="!text-zinc-500 !text-sm">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (value) => (
        <p className="!text-primary">{value as string}</p>
      ),
    },
    {
      key: 'projects',
      label: t('projects'),
      render: (value) => {
        const projects = value as { id: number; title: string }[] | undefined;
        return (
          <p className="!text-primary">
            {projects?.length || 0} {t('projects')?.toLowerCase()}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: (value) => (
        <p className="!text-primary">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: () => (
        <TableActions
          onEdit={() => {}}
          onDelete={() => {}}
        />
      ),
    },
  ];

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
                  <span>{t('mentors') || 'Mentors'}</span>
                </div>
                <h1 className="!text-[22px] font-bold tracking-tight !text-primary mb-0.5">
                  {t('mentors') || 'Mentors'}
                </h1>
                <p className="!text-sm !text-secondary">
                  {t('manage_mentors_desc') || 'Gérez vos collaborateurs et mentors de projet'}
                </p>
              </div>
              <button
                onClick={() => {}}
                className="flex items-center gap-2 bg-primary !text-black border-none px-4 py-2 rounded-lg !text-sm font-semibold hover:opacity-90 transition-all"
              >
                <IconPlus className="w-4 h-4" />
                {t('add_mentor') || 'Ajouter un mentor'}
              </button>
            </div>

            {/* Stats inline */}
            <div className="flex gap-3 flex-wrap">
              <div className="card min-w-[160px] p-3.5">
                <div className="!text-xs !text-muted mb-1">{t('total_mentors') || 'Total mentors'}</div>
                <div className="!text-[22px] font-bold tracking-tight !text-primary">{loading ? '...' : mentors.length}</div>
              </div>
              <div className="card min-w-[160px] p-3.5">
                <div className="!text-xs !text-muted mb-1">{t('available') || 'Disponibles'}</div>
                <div className="!text-[22px] font-bold tracking-tight text-emerald-500">{loading ? '...' : mentors.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          {mentors.length === 0 && !loading ? (
            /* Empty state actionnable */
            <div className="card p-16 text-center">
              <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                <IconUserCircle className="w-7 h-7 !text-muted" />
              </div>
              <div className="!text-base font-semibold !text-primary mb-1.5">
                {t('no_mentor_yet') || 'Aucun mentor pour l\'instant'}
              </div>
              <div className="!text-sm !text-muted mb-5 max-w-xs mx-auto">
                {t('invite_mentor_desc') || 'Invitez des collaborateurs à rejoindre vos projets en tant que mentors.'}
              </div>
              <button
                onClick={() => {}}
                className="flex items-center gap-2 bg-primary !text-black border-none px-4 py-2 rounded-lg !text-sm font-semibold hover:opacity-90 transition-all mx-auto"
              >
                <IconPlus className="w-4 h-4" />
                {t('add_first_mentor') || 'Ajouter le premier mentor'}
              </button>
            </div>
          ) : (
            <>
              {/* Filtres */}
              <div className="mb-4">
                <TableFilters
                  searchValue={searchTerm}
                  onSearchChangeAction={setSearchTerm}
                  searchPlaceholder={t('search_placeholder_mentors') || 'Rechercher par nom ou email...'}
                  statusOptions={[]}
                  statusValue={''}
                  onStatusChangeAction={() => {}}
                />
              </div>

              {/* Tableau */}
              <div className="overflow-hidden">
                <DataTable<Mentor>
                  columns={columns}
                  data={filteredMentors}
                  emptyMessage={t('no_mentor_found') || 'Aucun mentor trouvé'}
                  onRowClick={(row) => router.push(`/dashboard/mentors/${row.id}`)}
                  loading={loading}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
