'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ClientAvatar from '@/app/components/ClientAvatar';
import { addClientUser, deleteClient, updateClientStatus, DuplicateCheckMode, toggleClientFavorite, updateClientsOrder } from '@/lib/api';
import TableActions from '@/app/components/TableActions';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DataTable, { Column } from '@/app/components/DataTable';
import TableFilters, { FilterOption, AdvancedFilter, DateRangeFilter } from '@/app/components/TableFilters';
import { IconFileImport, IconArrowRight, IconPlus, IconUsersGroup } from '@tabler/icons-react';
import { CustomAction } from '@/app/components/DataTable';
import { useRouter } from 'next/navigation';
import AddClientModal from './AddClientModal';
import ImportClientsModal from './ImportClientsModal';
import ImportProgressModal, { ImportProgressItem } from './ImportProgressModal';
import { useClients, clearCache } from '@/hooks/useApi';
import { generateClientSlug } from '@/utils/slug';
import type { Client, CreateClientData } from '@/types';
import { useQuota } from '@/app/context/QuotaContext';
import { uploadImage } from '@/lib/api';
import QuotaExceededModal from '@/app/components/QuotaExceededModal';
import { useQuotaExceeded } from '@/hooks/useQuotaExceeded';

export default function ClientsPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { canAdd, getVisibleCount, limits, refreshQuotas } = useQuota();

  // Rafraîchir les quotas au chargement pour avoir les dernières valeurs
  useEffect(() => {
    refreshQuotas();
  }, [refreshQuotas]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [ownershipFilter] = useState<'all' | 'mine' | 'collaborative'>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Advanced filters state
  const [enterpriseFilter, setEnterpriseFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ from: '', to: '' });
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState<boolean | undefined>(undefined);
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

  // Hooks avec cache
  const { data: clientsData, loading, refetch } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);
  

  // Quota exceeded detection
  const { 
    showModal: showQuotaModal, 
    setShowModal: setShowQuotaModal, 
    quota: clientsQuota,
    markAsHandled: markQuotaHandled 
  } = useQuotaExceeded('clients', clients, !loading && clients.length > 0);

  // Handle quota exceeded selection
  const handleQuotaSelection = async (itemsToKeep: Client[], itemsToRemove: Client[]) => {
    // Désactiver les clients non sélectionnés
    let deactivatedCount = 0;
    for (const client of itemsToRemove) {
      if (!client.documentId) continue;
      try {
        await updateClientStatus(client.documentId, 'inactive');
        deactivatedCount++;
      } catch (error) {
        console.error(`Error deactivating client ${client.name}:`, error);
      }
    }
    
    if (deactivatedCount > 0) {
      showGlobalPopup(
        `${deactivatedCount} ${t('items_deactivated') || 'éléments désactivés'}`,
        'success'
      );
    }
    
    markQuotaHandled();
    clearCache('clients');
    await refetch();
  };

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

  // Local state for optimistic favorite updates
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});
  
  // Handle toggle favorite (optimistic update)
  const handleToggleFavorite = async (client: Client) => {
    const currentState = localFavorites[client.documentId] ?? client.is_favorite ?? false;
    const newFavoriteState = !currentState;
    
    // Optimistic update
    setLocalFavorites(prev => ({ ...prev, [client.documentId]: newFavoriteState }));
    
    try {
      await toggleClientFavorite(client.documentId, newFavoriteState);
      clearCache('clients');
    } catch (error) {
      // Revert on error
      setLocalFavorites(prev => ({ ...prev, [client.documentId]: currentState }));
      console.error('Error toggling favorite:', error);
      showGlobalPopup(t('error') || 'Erreur', 'error');
    }
  };
  
  // Function to check if client is favorite (with optimistic state)
  const isClientFavorite = (client: Client) => 
    localFavorites[client.documentId] ?? client.is_favorite ?? false;

  // Handle reorder
  // Debounce pour éviter les appels multiples lors du drag & drop
  const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReorderingRef = useRef(false);
  
  const handleReorder = useCallback(async (reorderedClients: Client[]) => {
    // Si déjà en cours, annuler le timeout précédent
    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }
    
    // Debounce de 500ms pour attendre la fin du drag
    reorderTimeoutRef.current = setTimeout(async () => {
      if (isReorderingRef.current) return;
      isReorderingRef.current = true;
      
      try {
        const updates = reorderedClients.map((c, index) => ({
          documentId: c.documentId,
          sort_order: index,
        }));
        await updateClientsOrder(updates);
        clearCache('clients');
      } catch (error) {
        console.error('Error reordering clients:', error);
        showGlobalPopup(t('error') || 'Erreur', 'error');
      } finally {
        isReorderingRef.current = false;
      }
    }, 500);
  }, [showGlobalPopup, t]);

  // Convertir les prospects/autres en clients
  const handleConvertToClient = async (clientsToConvert: Client[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const client of clientsToConvert) {
      if (!client.documentId) continue;
      // Ne pas convertir si déjà client
      if (client.processStatus === 'client') continue;
      
      try {
        await updateClientStatus(client.documentId, 'client');
        successCount++;
      } catch (error) {
        console.error(`Error converting ${client.name} to client:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showGlobalPopup(
        `${successCount} ${t('converted_to_client') || 'contact(s) converti(s) en client'}`,
        errorCount > 0 ? 'warning' : 'success'
      );
    }

    if (errorCount > 0) {
      showGlobalPopup(
        `${errorCount} ${t('conversion_failed') || 'erreur(s) lors de la conversion'}`,
        'error'
      );
    }

    clearCache('clients');
    await refetch();
  };

  // Actions personnalisées pour la sélection multiple
  const customActions: CustomAction<Client>[] = useMemo(() => [
    {
      label: t('convert_to_client') || 'Convertir en client',
      icon: <IconArrowRight className="w-4 h-4" />,
      onClick: handleConvertToClient,
      variant: 'success',
    },
  ], [t]);

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

  // Les options de statut seront définies après visibleClients

  // Get unique enterprises for filter
  const enterpriseOptions: FilterOption[] = useMemo(() => {
    const enterprises = [...new Set(clients.map(c => c.enterprise).filter(Boolean))] as string[];
    return enterprises.map(enterprise => ({
      value: enterprise,
      label: enterprise,
      count: clients.filter(c => c.enterprise === enterprise).length,
    }));
  }, [clients]);

  // Advanced filters configuration
  const advancedFilters: AdvancedFilter[] = useMemo(() => [
    {
      id: 'enterprise',
      type: 'select',
      label: t('enterprise') || 'Entreprise',
      options: enterpriseOptions,
      value: enterpriseFilter,
      placeholder: t('all_enterprises') || 'Toutes les entreprises',
    },
    {
      id: 'isActive',
      type: 'toggle',
      label: t('active_only') || 'Actifs uniquement',
      value: isActiveFilter,
    },
    {
      id: 'hasWebsite',
      type: 'toggle',
      label: t('with_website') || 'Avec site web',
      value: hasWebsiteFilter,
    },
    {
      id: 'dateRange',
      type: 'date-range',
      label: t('creation_date') || 'Date de création',
      value: dateRangeFilter,
    },
  ], [t, enterpriseOptions, enterpriseFilter, isActiveFilter, hasWebsiteFilter, dateRangeFilter]);

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (filterId: string, value: string | string[] | boolean | DateRangeFilter) => {
    switch (filterId) {
      case 'enterprise':
        setEnterpriseFilter(value as string);
        break;
      case 'isActive':
        setIsActiveFilter(value as boolean ? true : undefined);
        break;
      case 'hasWebsite':
        setHasWebsiteFilter(value as boolean ? true : undefined);
        break;
      case 'dateRange':
        setDateRangeFilter(value as DateRangeFilter);
        break;
    }
  };

  // Limiter les clients selon le quota
  const visibleClients = useMemo(() => {
    const visibleCount = getVisibleCount('clients');
    return clients.slice(0, visibleCount);
  }, [clients, getVisibleCount]);

  // Générer les options de statut (toujours afficher Client et Prospect + autres dynamiques)
  const statusOptions: FilterOption[] = useMemo(() => {
    const statusMap = new Map<string, number>();
    
    // Initialiser avec les statuts standards
    statusMap.set('client', 0);
    statusMap.set('prospect', 0);
    
    // Compter tous les statuts existants dans les clients visibles
    visibleClients.forEach(client => {
      const status = client.processStatus || 'non_defini';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    
    // Définir les labels pour chaque statut
    const statusLabels: Record<string, string> = {
      client: 'Client',
      prospect: 'Prospect',
      lead: 'Lead',
      non_defini: t('undefined') || 'Non défini',
    };
    
    // Ordre de priorité des statuts
    const statusOrder = ['client', 'prospect', 'lead', 'non_defini'];
    
    return Array.from(statusMap.entries())
      .map(([value, count]) => ({
        value,
        label: statusLabels[value] || value,
        count,
      }))
      .sort((a, b) => {
        const orderA = statusOrder.indexOf(a.value);
        const orderB = statusOrder.indexOf(b.value);
        if (orderA !== -1 && orderB !== -1) return orderA - orderB;
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        return b.count - a.count;
      });
  }, [visibleClients, t]);

  const filteredClients = useMemo(() => {
    return visibleClients.filter(client => {
      // Search filter
      const matchesSearch =
        searchTerm === '' ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.enterprise?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      // Status filter
      const matchesStatus =
        statusFilter === '' || client.processStatus === statusFilter;

      // Ownership filter (mine / collaborative / all)
      const matchesOwnership =
        ownershipFilter === 'all' ||
        (ownershipFilter === 'mine' && !client._isCollaborative) ||
        (ownershipFilter === 'collaborative' && client._isCollaborative);

      // Enterprise filter
      const matchesEnterprise =
        enterpriseFilter === '' || client.enterprise === enterpriseFilter;

      // Active filter (based on processStatus === 'client')
      const matchesActive =
        isActiveFilter === undefined || (isActiveFilter && client.processStatus === 'client');

      // Website filter
      const matchesWebsite =
        hasWebsiteFilter === undefined || (hasWebsiteFilter && client.website && client.website.length > 0);

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter.from || dateRangeFilter.to) {
        const clientDate = new Date(client.createdAt);
        if (dateRangeFilter.from) {
          matchesDateRange = matchesDateRange && clientDate >= new Date(dateRangeFilter.from);
        }
        if (dateRangeFilter.to) {
          matchesDateRange = matchesDateRange && clientDate <= new Date(dateRangeFilter.to);
        }
      }

      return matchesSearch && matchesStatus && matchesOwnership && matchesEnterprise && matchesActive && matchesWebsite && matchesDateRange;
    });
  }, [visibleClients, searchTerm, statusFilter, ownershipFilter, enterpriseFilter, isActiveFilter, hasWebsiteFilter, dateRangeFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const visibleCount = getVisibleCount('clients');
    const collaborativeCount = visibleClients.filter(c => c._isCollaborative).length;
    const ownedCount = visibleClients.filter(c => !c._isCollaborative).length;
    return {
      total: visibleCount,
      limit: limits.clients,
      active: visibleClients.filter(c => c.processStatus === 'client').length,
      collaborative: collaborativeCount,
      owned: ownedCount,
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
          onClick={() => router.push(`/dashboard/clients/${generateClientSlug(row.name, row.documentId)}`)}
        >
          <ClientAvatar
            name={row.name}
            imageUrl={row.image?.url ? apiUrl + row.image.url : null}
            website={row.website}
            size="sm"
          />
          <div className="flex items-center gap-2">
            <p className="!text-primary font-medium">{value as string}</p>
            {row._isCollaborative && row._collaborativeProjects && (
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5  !text-[10px] font-semibold bg-accent-light !text-accent-text border border-accent"
                title={`Via projet${row._collaborativeProjects.length > 1 ? 's' : ''}: ${row._collaborativeProjects.map(p => p.title).join(', ')}`}
              >
                <IconUsersGroup className="w-3 h-3 !text-accent-text" />
                Collab
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (value) => <p className="!text-primary">{value as string}</p>,
    },
    {
      key: 'enterprise',
      label: t('enterprise'),
      render: (value) => <p className="!text-primary">{(value as string) || 'N/A'}</p>,
    },
    {
      key: 'website',
      label: t('website'),
      render: (value) => <p className="!text-primary">{(value as string) || 'N/A'}</p>,
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
        <p className="!text-primary">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (_, row) => {
        const clientSlug = generateClientSlug(row.name, row.documentId);
        const isCollaborative = row._isCollaborative;
        
        // Pour les clients collaboratifs, afficher un lien vers le projet
        if (isCollaborative && row._collaborativeProjects && row._collaborativeProjects.length > 0) {
          const firstProject = row._collaborativeProjects[0];
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/dashboard/projects/${firstProject.slug}`)}
                className="!text-xs !text-accent-text hover:underline"
                title={`${t('collaborative_via_project') || 'Via projet'}: ${row._collaborativeProjects.map(p => p.title).join(', ')}`}
              >
                {t('view_project') || 'Voir projet'}
              </button>
            </div>
          );
        }
        
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

  // Calcul des prospects pour les stats
  const prospectsCount = useMemo(() => 
    visibleClients.filter(c => c.processStatus === 'prospect').length
  , [visibleClients]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header épuré */}
        <div className="border-b border-default">
          <div className="max-w-7xl mx-auto px-8 py-5">
            {/* Breadcrumb + Title Row */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="!text-muted !text-xs">{t('dashboard') || 'Tableau de bord'}</span>
                  <span className="!text-border-default !text-xs">→</span>
                  <span className="!text-secondary !text-xs font-medium">{t('contacts') || 'Contacts'}</span>
                </div>
                <h1 className="!text-[22px] font-bold tracking-tight !text-primary">
                  {t('contacts') || 'Contacts'}
                </h1>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="btn-ghost flex items-center gap-2 px-4 py-2 !text-sm whitespace-nowrap"
                >
                  <IconFileImport className="w-3.5 h-3.5" />
                  {t('import_list') || 'Importer une liste'}
                </button>
                <button
                  onClick={canAdd('clients') ? () => setShowAddModal(true) : () => showGlobalPopup(t('quota_reached_message') || 'Quota atteint. Passez à un plan supérieur.', 'warning')}
                  className="btn-primary flex items-center gap-2 px-4 py-2 !text-sm whitespace-nowrap"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  {canAdd('clients') ? t('add_client') : `${t('add_client')} (${t('quota_reached') || 'Quota atteint'})`}
                </button>
              </div>
            </div>

            {/* Filters + Stats Row */}
            <div className="flex items-center justify-between">
              {/* Filter pills */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-4 py-1.5 !text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === '' ? 'bg-card !text-primary shadow-sm' : '!text-secondary hover:!text-primary'
                  }`}
                >
                  {t('all') || 'Tous'}
                  <span className={`ml-1.5 !text-xs ${statusFilter === '' ? '!text-muted' : '!text-secondary/60'}`}>
                    {stats.total}
                  </span>
                </button>
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-4 py-1.5 !text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                      statusFilter === option.value ? 'bg-card !text-primary shadow-sm' : '!text-secondary hover:!text-primary'
                    }`}
                  >
                    {option.label}
                    <span className={`ml-1.5 !text-xs ${statusFilter === option.value ? '!text-muted' : '!text-secondary/60'}`}>
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Mini stats inline */}
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="!text-lg font-bold !text-primary">{stats.active}</span>
                  <span className="!text-xs !text-muted">{t('clients') || 'Clients'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="!text-lg font-bold !text-primary">{prospectsCount}</span>
                  <span className="!text-xs !text-muted">{t('prospects') || 'Prospects'}</span>
                </div>
                {stats.collaborative > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="!text-lg font-bold !text-primary">{stats.collaborative}</span>
                    <span className="!text-xs !text-muted">{t('collaborative_clients') || 'Collaboratifs'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Search + Advanced Filters */}
          <div className="mb-4">
            <TableFilters
              searchPlaceholder={t('search_placeholder_clients')}
              statusOptions={[]}
              onSearchChangeAction={setSearchTerm}
              onStatusChangeAction={setStatusFilter}
              searchValue={searchTerm}
              statusValue={statusFilter}
              advancedFilters={advancedFilters}
              onAdvancedFilterChange={handleAdvancedFilterChange}
              showAdvancedToggle={true}
              viewMode="table"
              onViewModeChange={() => {}}
              showViewToggle={false}
            />
          </div>

          {/* Table */}
          <div className="overflow-hidden">
            <DataTable<Client>
              columns={columns}
              data={filteredClients}
              loading={loading}
              emptyMessage={t('no_client_found')}
              onRowClick={row => {
                if (row._isCollaborative && row._collaborativeProjects && row._collaborativeProjects.length > 0) {
                  const firstProject = row._collaborativeProjects[0];
                  showGlobalPopup(
                    `${t('collaborative_client_info') || 'Client partagé via'}: ${firstProject.title}`,
                    'info'
                  );
                  router.push(`/dashboard/projects/${firstProject.slug}`);
                } else {
                  router.push(`/dashboard/clients/${generateClientSlug(row.name, row.documentId)}`);
                }
              }}
              selectable={true}
              onDeleteSelected={handleDeleteMultipleClients}
              customActions={customActions}
              getItemId={(client) => client.documentId || ''}
              getItemName={(client) => client.name}
              sortable={true}
              showFavorites={true}
              favoritesFirst={true}
              isFavorite={isClientFavorite}
              onToggleFavorite={handleToggleFavorite}
              draggable={true}
              onReorder={handleReorder}
              viewMode="table"
              onViewModeChange={() => {}}
            />
          </div>
        </div>
      </div>

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

      {/* Quota Exceeded Modal */}
      <QuotaExceededModal<Client>
        isOpen={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        items={clients}
        quota={clientsQuota}
        entityName={t('clients') || 'clients'}
        getItemId={(client) => client.documentId || ''}
        getItemName={(client) => client.name}
        getItemSubtitle={(client) => client.enterprise || client.email || ''}
        onConfirmSelection={handleQuotaSelection}
        renderItemIcon={(client) => (
          <ClientAvatar 
            name={client.name} 
            imageUrl={client.image?.url ? apiUrl + client.image.url : null}
            website={client.website}
            size="sm"
          />
        )}
      />
    </ProtectedRoute>
  );
}
