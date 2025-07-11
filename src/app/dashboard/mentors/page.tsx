'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DataTable, { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import TableFilters from '@/app/components/TableFilters';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import useLenis from '@/utils/useLenis';
import { fetchMentorUsers } from '@/lib/api';

interface Mentor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  projects: {
    id: number;
    title: string;
  }[];
  users: {
    id: number;
    username: string;
  }[];
  expertises: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MentorsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  useLenis();

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetchMentorUsers(user.id);
        setMentors(response.data || []);
      } catch (error) {
        console.error('Error fetching mentors:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch =
      searchTerm === '' ||
      mentor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const columns: Column<Mentor>[] = [
    {
      key: 'firstName',
      label: 'First Name',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <h4 className="!text-zinc-200 font-medium">{value as string}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="!text-zinc-500 !text-sm">{row.firstName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'lastName',
      label: 'Last Name',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <h4 className="!text-zinc-200 font-medium">{value as string}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="!text-zinc-500 !text-sm">{row.lastName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <h4 className="!text-zinc-200 font-medium">{value as string}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="!text-zinc-500 !text-sm">{row.email}</p>
          </div>
        </div>
      ),
    },

    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <TableActions
          onEdit={() => console.log('Edit mentor:', (row as Mentor).id)}
          onDelete={() => console.log('Delete mentor:', (row as Mentor).id)}
        />
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
          <h1 className="!text-3x l !uppercase font-extrabold !text-left !text-zinc-200">
            {t('mentors')}
          </h1>
          <button className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:!text-white    transition-colors">
            {t('new_mentor')}
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
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('total_mentors')}
                </h3>
                <p className="!text-3xl font-bold !text-indigo-400">
                  {mentors.length}
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('available')}
                </h3>
                <p className="!text-3xl font-bold !text-green-400">
                  {mentors.length}
                </p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                  {t('sessions')}
                </h3>
                <p className="!text-3xl font-bold !text-blue-400">
                  {mentors.length}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="!text-xl font-semibold !text-zinc-200">
                  {t('mentors_list')}
                </h2>
              </div>
              <div className="p-6">
                <TableFilters
                  searchPlaceholder={t('search_mentor_placeholder')}
                  onSearchChangeAction={setSearchTerm}
                  onStatusChangeAction={() => {}}
                  searchValue={searchTerm}
                  statusValue={''}
                />
                <DataTable<Mentor>
                  columns={columns}
                  data={filteredMentors}
                  loading={loading}
                  emptyMessage={t('no_mentor_found')}
                />
              </div>
            </div>
          </>
        )}
      </motion.div>
    </ProtectedRoute>
  );
}
