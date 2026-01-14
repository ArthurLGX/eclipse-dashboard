'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { 
  IconFileText, 
  IconSearch,
  IconCheck,
  IconClock,
  IconX,
  IconDownload,
  IconEye,
  IconTrash,
  IconFilter,
  IconSignature,
  IconRefresh,
} from '@tabler/icons-react';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AIContractGenerator from '@/app/components/AIContractGenerator';
import ContractPDF from '@/app/components/ContractPDF';
import { useCompany } from '@/hooks/useApi';
import { fetchUserContracts, deleteContract, type Contract, type ContractStatus } from '@/lib/api';
import { pdf } from '@react-pdf/renderer';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type StatusFilter = 'all' | ContractStatus;

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  draft: { label: 'Brouillon', color: 'text-muted', icon: IconFileText, bgColor: 'bg-hover' },
  pending_client: { label: 'En attente client', color: 'text-warning', icon: IconClock, bgColor: 'bg-warning-light' },
  pending_provider: { label: 'En attente prestataire', color: 'text-info', icon: IconClock, bgColor: 'bg-info-light' },
  signed: { label: 'Signé', color: 'text-success', icon: IconCheck, bgColor: 'bg-success-light' },
  cancelled: { label: 'Annulé', color: 'text-danger', icon: IconX, bgColor: 'bg-danger-light' },
};

export default function ContractsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Récupérer les données de l'entreprise
  const { data: companyData } = useCompany(user?.id);
  const company = Array.isArray(companyData) ? companyData[0] : companyData;

  // Fetch contracts
  const loadContracts = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await fetchUserContracts(user.id);
      setContracts(data);
    } catch (err) {
      console.error('Error loading contracts:', err);
      showGlobalPopup(t('error_loading_contracts') || 'Erreur lors du chargement des contrats', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showGlobalPopup, t]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleContractGenerated = () => {
    loadContracts();
    showGlobalPopup(t('contract_generated') || 'Contrat généré avec succès !', 'success');
  };

  const handleDeleteContract = async (documentId: string) => {
    if (!confirm(t('confirm_delete_contract') || 'Êtes-vous sûr de vouloir supprimer ce contrat ?')) {
      return;
    }
    
    setDeletingId(documentId);
    try {
      await deleteContract(documentId);
      setContracts(prev => prev.filter(c => c.documentId !== documentId));
      showGlobalPopup(t('contract_deleted') || 'Contrat supprimé', 'success');
    } catch (err) {
      console.error('Error deleting contract:', err);
      showGlobalPopup(t('error_deleting_contract') || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPDF = async (contract: Contract) => {
    try {
      const blob = await pdf(
        <ContractPDF 
          contract={contract} 
          companyName={company?.name}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contract.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showGlobalPopup(t('pdf_error') || 'Erreur lors de la génération du PDF', 'error');
    }
  };

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.project?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: contracts.length,
    signed: contracts.filter(c => c.status === 'signed').length,
    pending: contracts.filter(c => c.status === 'pending_client' || c.status === 'pending_provider').length,
    draft: contracts.filter(c => c.status === 'draft').length,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getSignatureStatus = (contract: Contract) => {
    const provider = !!contract.provider_signature;
    const client = !!contract.client_signature;
    
    if (provider && client) return { label: 'Signé par les deux parties', icon: '✅' };
    if (provider && !client) return { label: 'En attente signature client', icon: '⏳' };
    if (!provider && client) return { label: 'En attente signature prestataire', icon: '⏳' };
    return { label: 'Aucune signature', icon: '📝' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {t('contracts') || 'Contrats'}
          </h1>
          <p className="text-secondary mt-1">
            {t('contracts_description') || 'Gérez vos contrats, CGV et documents légaux'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadContracts}
            className="p-2 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
            title={t('refresh') || 'Actualiser'}
          >
            <IconRefresh size={20} />
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-accent-light text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-all"
            onClick={() => setShowAIGenerator(true)}
          >
            <Image 
              src="/images/logo/eclipse-logo.png" 
              alt="Eclipse Assistant" 
              width={18} 
              height={18}
              className="w-4.5 h-4.5"
            />
            Eclipse Assistant
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-xl border border-muted">
          <p className="text-sm text-muted">{t('total') || 'Total'}</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-success-light rounded-xl">
          <p className="text-sm text-success">{t('contract_signed') || 'Signés'}</p>
          <p className="text-2xl font-bold text-success mt-1">{stats.signed}</p>
        </div>
        <div className="p-4 bg-warning-light rounded-xl">
          <p className="text-sm text-warning">{t('pending') || 'En attente'}</p>
          <p className="text-2xl font-bold text-warning mt-1">{stats.pending}</p>
        </div>
        <div className="p-4 bg-hover rounded-xl">
          <p className="text-sm text-muted">{t('contract_drafts') || 'Brouillons'}</p>
          <p className="text-2xl font-bold text-secondary mt-1">{stats.draft}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder={t('search') || 'Rechercher...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full !pl-10 !pr-4 py-2.5 bg-input border border-default rounded-lg focus:ring-1 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <IconFilter className="text-muted" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2.5 bg-input border border-default rounded-lg focus:ring-1 focus:ring-accent"
          >
            <option value="all">{t('all_statuses') || 'Tous les statuts'}</option>
            <option value="draft">{t('draft') || 'Brouillon'}</option>
            <option value="pending_client">{t('pending_client') || 'En attente client'}</option>
            <option value="pending_provider">{t('pending_provider') || 'En attente prestataire'}</option>
            <option value="signed">{t('signed') || 'Signé'}</option>
            <option value="cancelled">{t('cancelled') || 'Annulé'}</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && contracts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-info-light rounded-full flex items-center justify-center mb-6">
            <IconFileText size={40} className="text-info" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">
            {t('no_contracts') || 'Aucun contrat'}
          </h3>
          <p className="text-secondary text-center max-w-md mb-6">
            {t('no_contracts_description') || 'Générez votre premier contrat avec Eclipse Assistant'}
          </p>
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:opacity-90 transition-all"
            onClick={() => setShowAIGenerator(true)}
          >
            <Image 
              src="/images/logo/eclipse-logo.png" 
              alt="Eclipse Assistant" 
              width={20} 
              height={20}
              className="w-5 h-5"
            />
            {t('generate_with_ai') || 'Générer avec Eclipse Assistant'}
          </button>
        </div>
      )}

      {/* Contracts list */}
      {!loading && filteredContracts.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredContracts.map((contract, index) => {
              const statusConfig = STATUS_CONFIG[contract.status];
              const StatusIcon = statusConfig.icon;
              const signatureStatus = getSignatureStatus(contract);
              
              return (
                <motion.div
                  key={contract.documentId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-card rounded-xl border border-muted hover:border-accent transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${statusConfig?.bgColor || 'bg-hover'}`}>
                          {StatusIcon ? (
                            <StatusIcon className={`w-5 h-5 ${statusConfig?.color || 'text-muted'}`} />
                          ) : (
                            <IconFileText className="w-5 h-5 text-muted" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-primary truncate">
                            {contract.title || contract.content?.title || t('untitled_contract') || 'Contrat sans titre'}
                          </h3>
                          <p className="text-sm text-muted">
                            {contract.client?.name || t('no_client') || 'Sans client'}
                            {contract.project?.title && ` • ${contract.project.title}`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className={`px-2 py-1 rounded-full ${statusConfig?.bgColor || 'bg-hover'} ${statusConfig?.color || 'text-muted'}`}>
                          {statusConfig?.label || contract.status || 'Inconnu'}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconSignature className="w-3 h-3" />
                          {signatureStatus.icon} {signatureStatus.label}
                        </span>
                        <span>{formatDate(contract.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* View contract page - always visible for any contract with token */}
                      {contract.signature_token && (
                        <Link
                          href={`/sign/contract/${contract.signature_token}`}
                          target="_blank"
                          className="p-2 text-info hover:bg-info-light rounded-lg transition-colors"
                          title={t('view_contract') || 'Voir le contrat'}
                        >
                          <IconEye className="w-5 h-5" />
                        </Link>
                      )}
                      
                      {/* Download PDF */}
                      <button
                        onClick={() => handleDownloadPDF(contract)}
                        className="p-2 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
                        title={t('download_pdf') || 'Télécharger PDF'}
                      >
                        <IconDownload className="w-5 h-5" />
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteContract(contract.documentId)}
                        disabled={deletingId === contract.documentId}
                        className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors disabled:opacity-50"
                        title={t('delete') || 'Supprimer'}
                      >
                        {deletingId === contract.documentId ? (
                          <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IconTrash className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* No results after filter */}
      {!loading && contracts.length > 0 && filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <IconSearch className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-secondary">
            {t('no_contracts_match') || 'Aucun contrat ne correspond à votre recherche'}
          </p>
        </div>
      )}

      {/* Modal AI Contract Generator */}
      <AIContractGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        company={company}
        onContractGenerated={handleContractGenerated}
      />
    </div>
  );
}
