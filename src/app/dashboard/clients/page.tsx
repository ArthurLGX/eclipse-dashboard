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
import { useQuota } from '@/app/context/QuotaContext';

export default function ClientsPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { canAdd, getVisibleCount, limits } = useQuota();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; client: Client | null }>({
    isOpen: false,
    client: null,
  });

  // Hook avec cache
  const { data: clientsData, loading, refetch } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);

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

  // Limiter les clients selon le quota
  const visibleClients = useMemo(() => {
    const visibleCount = getVisibleCount('clients');
    return clients.slice(0, visibleCount);
  }, [clients, getVisibleCount]);

  const filteredClients = useMemo(() => {
    return visibleClients.filter(client => {
      const matchesSearch =
        searchTerm === '' ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.enterprise?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === '' || client.processStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [visibleClients, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const visibleCount = getVisibleCount('clients');
    return {
      total: visibleCount,
      limit: limits.clients,
      active: visibleClients.filter(c => c.processStatus === 'client').length,
      newThisMonth: visibleClients.filter(client => {
        const created = new Date(client.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [visibleClients, getVisibleCount, limits]);

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
          <p className="text-primary font-medium">{value as string}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (value) => <p className="text-secondary">{value as string}</p>,
    },
    {
      key: 'enterprise',
      label: t('enterprise'),
      render: (value) => <p className="text-zinc-300">{(value as string) || 'N/A'}</p>,
    },
    {
      key: 'website',
      label: t('website'),
      render: (value) => <p className="text-zinc-300">{(value as string) || 'N/A'}</p>,
    },
    {
      key: 'processStatus',
      label: t('status'),
      render: (value) => {
        const status = value as string;
        const config = status === 'client'
          ? { label: 'Client', className: 'badge-success' }
          : status === 'prospect'
            ? { label: 'Prospect', className: 'badge-info' }
            : { label: status, className: 'badge-primary' };

        return (
          <span className={`badge ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('creation_date'),
      render: (value) => (
        <p className="text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
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
        actionButtonLabel={canAdd('clients') ? t('add_client') : `${t('add_client')} (${t('quota_reached') || 'Quota atteint'})`}
        onActionButtonClick={canAdd('clients') ? () => setShowAddModal(true) : () => showGlobalPopup(t('quota_reached_message') || 'Quota atteint. Passez à un plan supérieur.', 'warning')}
        stats={[
          {
            label: t('total_clients'),
            value: stats.limit > 0 ? `${stats.total}/${stats.limit}` : stats.total,
            colorClass: 'text-success',
            icon: <IconUsers className="w-6 h-6 text-success" />,
          },
          {
            label: t('active_clients'),
            value: stats.active,
            colorClass: 'text-info',
            icon: <IconUserCheck className="w-6 h-6 text-info" />,
          },
          {
            label: t('new_clients_this_month'),
            value: stats.newThisMonth,
            colorClass: 'text-color-primary',
            icon: <IconUserPlus className="w-6 h-6 text-color-primary" />,
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
