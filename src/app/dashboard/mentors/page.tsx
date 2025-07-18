'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import useLenis from '@/utils/useLenis';
import { fetchMentorUsers } from '@/lib/api';
import { IconBrain, IconUserStar } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  const columns = [
    {
      key: 'firstName',
      label: 'First Name',
      render: (value: string, row: Mentor) => (
        <div className="flex items-center gap-2">
          <h4 className="!text-zinc-200 font-medium">{value}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="!text-zinc-500 !text-sm">{row.firstName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'lastName',
      label: 'Last Name',
      render: (value: string, row: Mentor) => (
        <div className="flex items-center gap-2">
          <h4 className="!text-zinc-200 font-medium">{value}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="!text-zinc-500 !text-sm">{row.lastName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: string, row: Mentor) => (
        <div className="flex items-center gap-2">
          <h4 className="!text-zinc-200 font-medium">{value}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="!text-zinc-500 !text-sm">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: t('created_at'),
      render: (value: string, row: Mentor) => (
        <p className="!text-zinc-500 !text-sm">{row.createdAt}</p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: string, row: Mentor) => (
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
            label: t('available'),
            value: mentors.length,
            colorClass: '!text-green-400',
            icon: <IconUserStar className="w-6 h-6 !text-green-400" />,
          },
        ]}
        loading={loading}
        filterOptions={[]}
        searchPlaceholder={t('search_placeholder_mentors') || 'Rechercher...'}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={''}
        onStatusChange={() => {}}
        columns={columns as unknown as Column<Mentor>[]}
        data={filteredMentors}
        emptyMessage={t('no_mentor_found')}
      />
    </ProtectedRoute>
  );
}
