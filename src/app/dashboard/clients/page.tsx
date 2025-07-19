'use client';

import React, { useEffect, useState } from 'react';
import { fetchClientsUser } from '@/lib/api';
import useLenis from '@/utils/useLenis';
import TableActions from '@/app/components/TableActions';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import { FilterOption } from '@/app/components/TableFilters';
import { IconUsers, IconUserCheck, IconUserPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Client {
  id: number;
  documentId: string;
  name: string;
  email: string;
  enterprise: string;
  address: string;
  website: string;
  processStatus: string;
  image: {
    url: string;
  };
  createdAt: string;
  updatedAt: string;
  factures: {
    id: number;
    documentId: string;
    reference: string;
    date: string;
    due_date: string;
  }[];
}

export default function ClientsPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  useLenis();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetchClientsUser(user.id);
        setClients(response.data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const statusOptions: FilterOption[] = [
    {
      value: 'client',
      label: 'Client',
      count: clients.filter(client => client.processStatus === 'client').length,
    },
  ];

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      searchTerm === '' ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.enterprise.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === '' || client.processStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      label: t('name'),
      render: (value: string, row: Client) => (
        <div
          className="flex items-center gap-3 cursor-pointer  transition-colors"
          onClick={() => router.push(`/dashboard/clients/${row.id}`)}
        >
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
            <span className="!text-zinc-300 font-medium !text-sm">
              {value.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="!text-zinc-200 font-medium">{value}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: string) => (
        <p className="!text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'enterprise',
      label: 'Entreprise',
      render: (value: string) => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'website',
      label: 'Site web',
      render: (value: string) => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'processStatus',
      label: 'Statut',
      render: (value: string) => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'client':
              return {
                label: 'Client',
                className: 'bg-green-100 !text-green-800',
              };
            case 'prospect':
              return {
                label: 'Prospect',
                className: 'bg-blue-100 !text-blue-800',
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
      label: 'Date de création',
      render: (value: string) => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: string, row: Client) => (
        <div className="flex items-center gap-2">
          <TableActions
            onEdit={() => {
              router.push(`/dashboard/clients/${row.id}?edit=1`);
            }}
            onDelete={() => {
              console.log('Delete client:', (row as Client).id);
              showGlobalPopup('Client supprimé avec succès', 'success');
            }}
            onFactures={
              row.factures.length > 0
                ? () => {
                    console.log('Factures client:', (row as Client).id);
                    router.push(
                      `/dashboard/clients/${row.id}/factures?name=${encodeURIComponent(row.name)}`
                    );
                  }
                : undefined
            }
          />
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Client>
        title={t('clients')}
        onRowClick={row => router.push(`/dashboard/clients/${row.id}`)}
        actionButtonLabel={t('add_client')}
        onActionButtonClick={() => {
          console.log('Add client');
        }}
        stats={[
          {
            label: t('total_clients'),
            value: clients.length,
            colorClass: '!text-green-400',
            icon: <IconUsers className="w-6 h-6 !text-green-400" />,
          },
          {
            label: t('active_clients'),
            value: clients.filter(client => client.processStatus === 'client')
              .length,
            colorClass: '!text-blue-400',
            icon: <IconUserCheck className="w-6 h-6 !text-blue-400" />,
          },
          {
            label: t('new_clients_this_month'),
            value: clients.filter(client => {
              const created = new Date(client.createdAt);
              const now = new Date();
              return (
                created.getMonth() === now.getMonth() &&
                created.getFullYear() === now.getFullYear()
              );
            }).length,
            colorClass: '!text-purple-400',
            icon: <IconUserPlus className="w-6 h-6 !text-purple-400" />,
          },
        ]}
        loading={loading}
        filterOptions={statusOptions}
        searchPlaceholder={t('search_placeholder_clients')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        columns={columns as unknown as Column<Client>[]}
        data={filteredClients}
        emptyMessage={t('no_client_found')}
      />
    </ProtectedRoute>
  );
}
