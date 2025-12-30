'use client';

import React, { useState, useMemo } from 'react';
import ClientAvatar from '@/app/components/ClientAvatar';
import { addClientUser, deleteClient } from '@/lib/api';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import { FilterOption } from '@/app/components/TableFilters';
import { IconUsers, IconUserCheck, IconUserPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import AddClientModal from './AddClientModal';
import { useClients, clearCache } from '@/hooks/useApi';
import { generateClientSlug } from '@/utils/slug';
import type { Client, CreateClientData } from '@/types';

export default function ClientsPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; client: Client | null }>({
    isOpen: false,
    client: null,
  });

  // Hook avec cache
  const { data: clientsData, loading, refetch } = useClients(user?.id);
  const clients = (clientsData as Client[]) || [];

  const handleAddClient = async (clientData: CreateClientData) => {
    if (!user?.id) {
      showGlobalPopup(t('error_not_authenticated') || 'Vous devez être connecté', 'error');
      throw new Error('Not authenticated');
    }

    try {
      await addClientUser(user.id, {
        name: clientData.name,
        email: clientData.email,
        number: clientData.number || '',
        enterprise: clientData.enterprise || '',
        adress: clientData.adress || '',
        website: clientData.website || '',
        processStatus: clientData.processStatus,
        isActive: clientData.isActive,
      });

      showGlobalPopup(t('client_added_success') || 'Client ajouté avec succès', 'success');
      
      // Invalider le cache et recharger
      clearCache('clients');
      await refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showGlobalPopup(errorMessage, 'error');
      throw error;
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteModal.client?.documentId) return;
    
    await deleteClient(deleteModal.client.documentId);
    showGlobalPopup(t('client_deleted_success') || 'Client supprimé avec succès', 'success');
    clearCache('clients');
    await refetch();
  };

  const statusOptions: FilterOption[] = useMemo(() => [
    {
      value: 'client',
      label: 'Client',
      count: clients.filter(client => client.processStatus === 'client').length,
    },
  ], [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch =
        searchTerm === '' ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.enterprise?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === '' || client.processStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: clients.length,
      active: clients.filter(c => c.processStatus === 'client').length,
      newThisMonth: clients.filter(client => {
        const created = new Date(client.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [clients]);

  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;

  const columns: Column<Client>[] = [
    {
      key: 'name',
      label: t('name'),
      render: (value, row) => (
        <div
          className="flex items-center gap-3 cursor-pointer transition-colors"
          onClick={() => router.push(`/dashboard/clients/${generateClientSlug(row.name)}`)}
        >
          <ClientAvatar
            name={row.name}
            imageUrl={row.image?.url ? apiUrl + row.image.url : null}
            website={row.website}
            size="sm"
          />
          <p className="text-zinc-200 font-medium">{value as string}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => <p className="text-zinc-300">{value as string}</p>,
    },
    {
      key: 'enterprise',
      label: 'Entreprise',
      render: (value) => <p className="text-zinc-300">{(value as string) || 'N/A'}</p>,
    },
    {
      key: 'website',
      label: 'Site web',
      render: (value) => <p className="text-zinc-300">{(value as string) || 'N/A'}</p>,
    },
    {
      key: 'processStatus',
      label: 'Statut',
      render: (value) => {
        const status = value as string;
        const config = status === 'client'
          ? { label: 'Client', className: 'bg-emerald-100 !text-emerald-800' }
          : status === 'prospect'
            ? { label: 'Prospect', className: 'bg-blue-100 !text-blue-800' }
            : { label: status, className: 'bg-gray-100 !text-gray-800' };

        return (
          <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}>
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date de création',
      render: (value) => (
        <p className="text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const clientSlug = generateClientSlug(row.name);
        return (
          <div className="flex items-center gap-2">
            <TableActions
              onEdit={() => router.push(`/dashboard/clients/${clientSlug}?edit=1`)}
              onDelete={() => setDeleteModal({ isOpen: true, client: row })}
              onFactures={
                (row.factures?.length ?? 0) > 0
                  ? () => router.push(`/dashboard/clients/${clientSlug}/factures?name=${encodeURIComponent(row.name)}`)
                  : undefined
              }
            />
          </div>
        );
      },
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Client>
        title={t('clients')}
        onRowClick={row => router.push(`/dashboard/clients/${generateClientSlug(row.name)}`)}
        actionButtonLabel={t('add_client')}
        onActionButtonClick={() => setShowAddModal(true)}
        stats={[
          {
            label: t('total_clients'),
            value: stats.total,
            colorClass: '!text-emerald-400',
            icon: <IconUsers className="w-6 h-6 !text-emerald-400" />,
          },
          {
            label: t('active_clients'),
            value: stats.active,
            colorClass: '!text-blue-400',
            icon: <IconUserCheck className="w-6 h-6 !text-blue-400" />,
          },
          {
            label: t('new_clients_this_month'),
            value: stats.newThisMonth,
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
        columns={columns}
        data={filteredClients}
        emptyMessage={t('no_client_found')}
      />

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddClient}
        t={t}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, client: null })}
        onConfirm={handleDeleteClient}
        title={t('delete_client') || 'Supprimer le client'}
        itemName={deleteModal.client?.name || ''}
        itemType="client"
        warningMessage={
          (deleteModal.client?.factures?.length ?? 0) > 0
            ? `Ce client a ${deleteModal.client?.factures?.length} facture(s) associée(s). Ces données seront conservées.`
            : undefined
        }
      />
    </ProtectedRoute>
  );
}
