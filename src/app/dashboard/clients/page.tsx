'use client';

import React, { useEffect, useState } from 'react';
import { fetchClientsUser, addClientUser } from '@/lib/api';
import useLenis from '@/utils/useLenis';
import TableActions from '@/app/components/TableActions';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import { FilterOption } from '@/app/components/TableFilters';
import {
  IconUsers,
  IconUserCheck,
  IconUserPlus,
  IconFileInvoice,
} from '@tabler/icons-react';
import AddClientModal from './AddClientModal';
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
  const [showAddClientModal, setShowAddClientModal] = useState(false);
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

  const handleAddClient = async (clientData: {
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    website: string;
    processStatus: string;
    isActive: boolean;
  }) => {
    const response = await addClientUser(user?.id || 0, clientData);
    if (response?.data) {
      setClients(prev => [response.data, ...prev] as Client[]);
      showGlobalPopup(t('client_added_successfully'), 'success');
    }
  };

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
          className="flex items-center gap-3 cursor-pointer hover:underline hover:text-emerald-400 transition-colors"
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
              console.log('Edit client:', (row as Client).id);
              showGlobalPopup('Client modifié avec succès', 'success');
            }}
            onDelete={() => {
              console.log('Delete client:', (row as Client).id);
              showGlobalPopup('Client supprimé avec succès', 'success');
            }}
          />
          {row.factures.length > 0 && (
            <button
              onClick={() => {
                router.push(
                  `/dashboard/clients/${row.id}/factures?name=${encodeURIComponent(row.name)}`
                );
              }}
              title="Voir les factures"
              className="p-2 rounded hover:bg-zinc-800 transition-colors"
            >
              <IconFileInvoice className="w-5 h-5 text-emerald-400" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Client>
        title={t('clients')}
        actionButtonLabel={t('add_client')}
        onActionButtonClick={() => setShowAddClientModal(true)}
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
      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onAdd={handleAddClient}
        t={t}
      />
    </ProtectedRoute>
  );
}
