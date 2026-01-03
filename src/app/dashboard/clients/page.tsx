'use client';

import React, { useState, useMemo } from 'react';
import ClientAvatar from '@/app/components/ClientAvatar';
import { addClientUser, deleteClient, DuplicateCheckMode } from '@/lib/api';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import { FilterOption } from '@/app/components/TableFilters';
import { IconUsers, IconUserCheck, IconUserPlus, IconFileImport } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import AddClientModal from './AddClientModal';
import ImportClientsModal from './ImportClientsModal';
import ImportProgressModal, { ImportProgressItem } from './ImportProgressModal';
import { useClients, clearCache } from '@/hooks/useApi';
import { generateClientSlug } from '@/utils/slug';
import type { Client, CreateClientData } from '@/types';
import { useQuota } from '@/app/context/QuotaContext';
import { uploadImage } from '@/lib/api';

export default function ClientsPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { canAdd, getVisibleCount, limits } = useQuota();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; client: Client | null }>({
    isOpen: false,
    client: null,
  });
  
  // Import progress state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressItems, setProgressItems] = useState<ImportProgressItem[]>([]);
  const [progressCurrentIndex, setProgressCurrentIndex] = useState(0);
  const [progressTotalCount, setProgressTotalCount] = useState(0);
  const [isImportComplete, setIsImportComplete] = useState(false);

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

  // Handle multiple clients deletion
  const handleDeleteMultipleClients = async (clientsToDelete: Client[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const client of clientsToDelete) {
      if (!client.documentId) continue;
      try {
        await deleteClient(client.documentId);
        successCount++;
      } catch (error) {
        console.error(`Error deleting client ${client.name}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showGlobalPopup(
        `${successCount} ${t('clients_deleted_success') || 'client(s) supprimé(s) avec succès'}`,
        errorCount > 0 ? 'warning' : 'success'
      );
    }

    if (errorCount > 0) {
      showGlobalPopup(
        `${errorCount} ${t('clients_delete_failed') || 'erreur(s) lors de la suppression'}`,
        'error'
      );
    }

    clearCache('clients');
    await refetch();
  };

  // Convert base64 to File
  const base64ToFile = (base64String: string, filename: string): File | null => {
    try {
      // Handle data URL format (data:image/jpeg;base64,...)
      const matches = base64String.match(/^data:(.+);base64,(.+)$/);
      if (!matches) return null;
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Determine file extension from mime type
      const ext = mimeType.split('/')[1] || 'jpg';
      return new File([blob], `${filename}.${ext}`, { type: mimeType });
    } catch (error) {
      console.error('Error converting base64 to file:', error);
      return null;
    }
  };

  // Import multiple clients from JSON with progress tracking
  const handleImportClients = async (importedClients: Array<{
    name: string;
    email: string;
    enterprise?: string;
    website?: string;
    image?: string;
    processStatus?: string;
    number?: string;
    adress?: string;
  }>, duplicateCheckMode: DuplicateCheckMode = 'email_only', duplicateAction: 'skip' | 'error' = 'error') => {
    if (!user?.id) {
      showGlobalPopup(t('error_not_authenticated') || 'Vous devez être connecté', 'error');
      throw new Error('Not authenticated');
    }

    // Initialize progress modal
    setShowImportModal(false);
    setShowProgressModal(true);
    setIsImportComplete(false);
    setProgressTotalCount(importedClients.length);
    setProgressCurrentIndex(0);
    
    // Initialize all items as pending
    const initialItems: ImportProgressItem[] = importedClients.map((client, index) => ({
      id: `import-${index}-${Date.now()}`,
      name: client.name,
      email: client.email,
      status: 'pending' as const,
    }));
    setProgressItems(initialItems);

    // Process each client sequentially with progress updates
    for (let i = 0; i < importedClients.length; i++) {
      const clientData = importedClients[i];
      const itemId = initialItems[i].id;

      try {
        let imageId: number | undefined;
        
        // If there's a base64 image, upload it first
        if (clientData.image && clientData.image.includes('data:image')) {
          // Update status to uploading image
          setProgressItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, status: 'uploading_image' as const } : item
          ));

          // Clean the image URL if needed
          const cleanImage = clientData.image.includes('data:image') 
            ? clientData.image.substring(clientData.image.indexOf('data:image'))
            : clientData.image;

          const file = base64ToFile(cleanImage, clientData.name.replace(/\s+/g, '_'));
          if (file) {
            try {
              const uploadResult = await uploadImage(file);
              imageId = uploadResult.id;
            } catch (uploadError) {
              console.error(`Error uploading image for ${clientData.name}:`, uploadError);
              // Continue without image
            }
          }
        }

        // Update status to creating
        setProgressItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, status: 'creating' as const } : item
        ));

        await addClientUser(user.id, {
          name: clientData.name,
          email: clientData.email,
          number: clientData.number || '',
          enterprise: clientData.enterprise || '',
          adress: clientData.adress || '',
          website: clientData.website || '',
          processStatus: clientData.processStatus || 'client',
          isActive: true,
          image: imageId,
        }, { duplicateCheckMode });

        // Update status to success
        setProgressItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, status: 'success' as const } : item
        ));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        const isDuplicateError = errorMessage.includes('existe déjà') || errorMessage.includes('already exists');
        
        // If it's a duplicate and action is skip, mark as skipped instead of error
        if (isDuplicateError && duplicateAction === 'skip') {
          setProgressItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, status: 'skipped' as const } : item
          ));
        } else {
          console.error(`Error importing client ${clientData.name}:`, errorMessage);
          // Update status to error with message
          setProgressItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, status: 'error' as const, error: errorMessage } : item
          ));
        }
      }

      // Update progress index
      setProgressCurrentIndex(i + 1);
      
      // Small delay to make the animation visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark import as complete
    setIsImportComplete(true);

    // Refresh the list
    clearCache('clients');
    await refetch();
  };

  // Close progress modal and reset
  const handleCloseProgressModal = () => {
    setShowProgressModal(false);
    setProgressItems([]);
    setProgressCurrentIndex(0);
    setProgressTotalCount(0);
    setIsImportComplete(false);
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
        additionalActions={[
          {
            label: t('import_list') || 'Importer une liste',
            onClick: () => setShowImportModal(true),
            icon: <IconFileImport className="w-4 h-4" />,
            variant: 'outline',
          },
        ]}
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
        selectable={true}
        onDeleteSelected={handleDeleteMultipleClients}
        getItemId={(client) => client.documentId || ''}
        getItemName={(client) => client.name}
      />

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddClient}
        t={t}
      />

      <ImportClientsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportClients}
        t={t}
      />

      <ImportProgressModal
        isOpen={showProgressModal}
        items={progressItems}
        totalCount={progressTotalCount}
        currentIndex={progressCurrentIndex}
        onClose={handleCloseProgressModal}
        isComplete={isImportComplete}
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
