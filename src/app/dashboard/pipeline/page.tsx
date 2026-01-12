'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useContacts, useFactures, useProjects, clearCache } from '@/hooks/useApi';
import { updateClient, deleteClient, addClientUser } from '@/lib/api';
import KanbanBoard, { PIPELINE_COLUMNS } from '@/app/components/KanbanBoard';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import type { Client, PipelineStatus, ContactSource, ContactPriority, Facture, Project } from '@/types';
import { calculatePipelineKPIs } from '@/utils/pipelineSync';
import { 
  IconChartBar, 
  IconPlus,
  IconSearch,
  IconX,
  IconMail,
  IconPhone,
  IconWorld,
  IconBuilding,
  IconCurrencyEuro,
  IconCalendar,
  IconFlag,
  IconNotes,
  IconUsers,
  IconTrendingUp,
  IconReceipt,
  IconCheck,
  IconClock,
  IconChartLine,
} from '@tabler/icons-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Modal pour sélectionner un contact existant
function SelectContactModal({
  isOpen,
  onClose,
  contacts,
  onSelect,
  targetStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  contacts: Client[];
  onSelect: (contact: Client, status: PipelineStatus) => void;
  targetStatus: PipelineStatus;
}) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer les contacts qui ne sont pas déjà dans le pipeline (pas de pipeline_status ou archivés)
  const availableContacts = useMemo(() => {
    return contacts.filter(c => {
      // Exclure ceux déjà dans le pipeline actif
      const isInPipeline = c.pipeline_status && c.pipeline_status !== 'lost';
      const matchesSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.enterprise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return !isInPipeline && matchesSearch;
    });
  }, [contacts, searchTerm]);

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-default rounded-xl shadow-xl w-full max-w-md m-4">
        <div className="sticky top-0 bg-card border-b border-default p-4 rounded-t-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <IconUsers size={20} />
              {t('select_existing_contact') || 'Sélectionner un contact'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg">
              <IconX size={20} />
            </button>
          </div>
          
          {/* Barre de recherche */}
          <div className="relative">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_contacts') || 'Rechercher...'}
              className="w-full !pl-9 pr-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Liste des contacts avec scroll */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {availableContacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <IconUsers size={48} className="mx-auto mb-2 opacity-30" />
              <p>{t('no_contacts_available') || 'Aucun contact disponible'}</p>
              <p className="text-sm mt-1">{t('all_contacts_in_pipeline') || 'Tous vos contacts sont déjà dans le pipeline'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {availableContacts.map((contact) => (
                <button
                  key={contact.documentId}
                  onClick={() => {
                    onSelect(contact, targetStatus);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-hover transition-colors text-left"
                >
                  {/* Avatar */}
                  {contact.image?.url ? (
                    <img 
                      src={contact.image.url} 
                      alt={contact.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-accent">{getInitials(contact.name)}</span>
                    </div>
                  )}
                  
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{contact.name}</span>
                      {contact.processStatus === 'client' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0">
                          Client
                        </span>
                      )}
                      {contact.processStatus === 'prospect' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0">
                          Prospect
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.enterprise && <span className="truncate">{contact.enterprise}</span>}
                      {contact.enterprise && contact.email && <span>•</span>}
                      {contact.email && <span className="truncate">{contact.email}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-default p-3">
          <p className="text-xs text-muted-foreground text-center">
            {availableContacts.length} {t('contacts_available') || 'contact(s) disponible(s)'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Modal pour créer/éditer un contact
function ContactModal({ 
  isOpen, 
  onClose, 
  contact,
  initialStatus,
  onSave 
}: { 
  isOpen: boolean;
  onClose: () => void;
  contact?: Client | null;
  initialStatus?: PipelineStatus;
  onSave: (data: Partial<Client>) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    enterprise: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    pipeline_status: 'new',
    source: 'cold_outreach',
    priority: 'medium',
    estimated_value: undefined,
    next_action: '',
    next_action_date: '',
    budget: undefined,
  });

  // Synchroniser formData quand le contact ou le modal change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: contact?.name || '',
        enterprise: contact?.enterprise || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        website: contact?.website || '',
        notes: contact?.notes || '',
        pipeline_status: contact?.pipeline_status || initialStatus || 'new',
        source: contact?.source || 'cold_outreach',
        priority: contact?.priority || 'medium',
        estimated_value: contact?.estimated_value || undefined,
        next_action: contact?.next_action || '',
        next_action_date: contact?.next_action_date || '',
        budget: contact?.budget || undefined,
      });
    }
  }, [isOpen, contact, initialStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const sourceOptions: { value: ContactSource; label: string }[] = [
    { value: 'cold_outreach', label: t('source_cold_outreach') || 'Prospection froide' },
    { value: 'referral', label: t('source_referral') || 'Recommandation' },
    { value: 'website', label: t('source_website') || 'Site web' },
    { value: 'social_media', label: t('source_social_media') || 'Réseaux sociaux' },
    { value: 'typeform', label: t('source_typeform') || 'Typeform' },
    { value: 'other', label: t('source_other') || 'Autre' },
  ];

  const priorityOptions: { value: ContactPriority; label: string }[] = [
    { value: 'low', label: t('priority_low') || 'Basse' },
    { value: 'medium', label: t('priority_medium') || 'Moyenne' },
    { value: 'high', label: t('priority_high') || 'Haute' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-default rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b border-default p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {contact ? t('edit_contact') || 'Modifier le contact' : t('new_contact') || 'Nouveau contact'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg">
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Infos principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                {t('contact_name') || 'Nom du contact'} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconBuilding size={14} className="inline mr-1" />
                {t('company') || 'Entreprise'}
              </label>
              <input
                type="text"
                value={formData.enterprise}
                onChange={(e) => setFormData({ ...formData, enterprise: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconMail size={14} className="inline mr-1" />
                {t('email') || 'Email'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconPhone size={14} className="inline mr-1" />
                {t('phone') || 'Téléphone'}
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconWorld size={14} className="inline mr-1" />
                {t('website') || 'Site web'}
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Statut & Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                {t('status') || 'Statut'}
              </label>
              <select
                value={formData.pipeline_status ?? 'new'}
                onChange={(e) => setFormData({ ...formData, pipeline_status: e.target.value as PipelineStatus })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {PIPELINE_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {t(col.title) || col.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                {t('source') || 'Source'}
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as ContactSource })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconFlag size={14} className="inline mr-1" />
                {t('priority') || 'Priorité'}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as ContactPriority })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Valeurs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconCurrencyEuro size={14} className="inline mr-1" />
                {t('estimated_value') || 'Valeur estimée (€)'}
              </label>
              <input
                type="number"
                value={formData.estimated_value || ''}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                {t('budget') || 'Budget client (€)'}
              </label>
              <input
                type="number"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Next action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                {t('next_action') || 'Prochaine action'}
              </label>
              <input
                type="text"
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Ex: Appeler pour relance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                <IconCalendar size={14} className="inline mr-1" />
                {t('next_action_date') || 'Date prochaine action'}
              </label>
              <input
                type="date"
                value={formData.next_action_date || ''}
                onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              <IconNotes size={14} className="inline mr-1" />
              {t('notes') || 'Notes internes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
              rows={2}
              placeholder="Notes privées..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-default rounded-lg hover:bg-hover transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : (contact ? t('save') || 'Enregistrer' : t('create') || 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { formatCurrency } = usePreferences();

  // États
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ContactPriority | ''>('');
  const [sourceFilter, setSourceFilter] = useState<ContactSource | ''>('');
  const [showKPIs, setShowKPIs] = useState(true);
  const [contactModal, setContactModal] = useState<{ 
    isOpen: boolean; 
    contact: Client | null;
    initialStatus?: PipelineStatus;
  }>({ isOpen: false, contact: null });
  const [selectModal, setSelectModal] = useState<{
    isOpen: boolean;
    targetStatus: PipelineStatus;
  }>({ isOpen: false, targetStatus: 'new' });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; contact: Client | null }>({
    isOpen: false,
    contact: null,
  });

  // Données - utiliser les Contacts (Clients) unifiés
  const { data: contactsData, loading, refetch } = useContacts(user?.id);
  // Données pour les KPIs
  const { data: facturesData } = useFactures(user?.id);
  const { data: projectsData } = useProjects(user?.id);
  
  // État local pour les mises à jour optimistes (évite le rechargement complet)
  const [localContacts, setLocalContacts] = useState<Client[] | null>(null);
  
  // Synchroniser les données API avec l'état local
  useEffect(() => {
    if (contactsData) {
      setLocalContacts(contactsData as Client[]);
    }
  }, [contactsData]);
  
  // Dédupliquer les contacts par documentId pour éviter les doublons
  const allContacts = useMemo(() => {
    const contacts = localContacts || (contactsData as Client[]) || [];
    const seen = new Set<string>();
    return contacts.filter(c => {
      if (!c.documentId || seen.has(c.documentId)) return false;
      seen.add(c.documentId);
      return true;
    });
  }, [localContacts, contactsData]);

  // Calcul des KPIs du pipeline
  const kpis = useMemo(() => {
    const factures = (facturesData as Facture[]) || [];
    return calculatePipelineKPIs(allContacts, factures);
  }, [allContacts, facturesData]);

  // Configuration du graphique d'évolution
  const chartData = useMemo(() => ({
    labels: kpis.monthlyPotential.map(m => m.month),
    datasets: [
      {
        label: t('kpi_potential_value') || 'Potentiel (Devis envoyés)',
        data: kpis.monthlyPotential.map(m => m.potential),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('kpi_won_value') || 'Gagné (Devis acceptés)',
        data: kpis.monthlyPotential.map(m => m.won),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }), [kpis.monthlyPotential, t]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: { dataset: { label?: string }; parsed: { y: number | null } }) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: number | string) {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0,
              notation: 'compact',
            }).format(typeof value === 'number' ? value : parseInt(value));
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }), []);

  // Filtrer pour n'afficher que les contacts avec un pipeline_status défini (dans le pipeline)
  const pipelineContacts = useMemo(() => {
    return allContacts.filter(c => c.pipeline_status && c.processStatus !== 'archived');
  }, [allContacts]);

  // Filtrage supplémentaire
  const filteredContacts = useMemo(() => {
    return pipelineContacts.filter((contact) => {
      // Recherche
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          contact.name?.toLowerCase().includes(search) ||
          contact.enterprise?.toLowerCase().includes(search) ||
          contact.email?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtre priorité
      if (priorityFilter && contact.priority !== priorityFilter) return false;

      // Filtre source
      if (sourceFilter && contact.source !== sourceFilter) return false;

      return true;
    });
  }, [pipelineContacts, searchTerm, priorityFilter, sourceFilter]);

  // Handlers
  const handleStatusChange = useCallback(async (contactId: string, newStatus: PipelineStatus) => {
    // Mise à jour optimiste - modifier l'état local immédiatement
    const previousContacts = localContacts;
    
    setLocalContacts(prev => {
      if (!prev) return prev;
      return prev.map(contact => 
        contact.documentId === contactId 
          ? { ...contact, pipeline_status: newStatus }
          : contact
      );
    });
    
    try {
      // Envoyer la mise à jour au serveur en arrière-plan
      await updateClient(contactId, { pipeline_status: newStatus });
      clearCache('clients');
      clearCache('contacts');
      // Pas de refetch pour éviter le rechargement - l'état local est déjà à jour
    } catch (error) {
      console.error('Error updating status:', error);
      // En cas d'erreur, revenir à l'état précédent
      setLocalContacts(previousContacts);
      showGlobalPopup(t('error_updating_status') || 'Erreur lors de la mise à jour', 'error');
    }
  }, [localContacts, showGlobalPopup, t]);

  const handleSelectExistingContact = useCallback(async (contact: Client, status: PipelineStatus) => {
    // Mise à jour optimiste
    const updatedContact = { 
      ...contact, 
      pipeline_status: status,
      processStatus: contact.processStatus === 'archived' ? 'prospect' as const : contact.processStatus
    };
    
    setLocalContacts(prev => {
      if (!prev) return prev;
      return prev.map(c => c.documentId === contact.documentId ? updatedContact : c);
    });
    
    try {
      await updateClient(contact.documentId, { 
        pipeline_status: status,
        processStatus: contact.processStatus === 'archived' ? 'prospect' : contact.processStatus
      });
      clearCache('clients');
      clearCache('contacts');
      showGlobalPopup(t('contact_added_to_pipeline') || 'Contact ajouté au pipeline', 'success');
    } catch (error) {
      console.error('Error adding contact to pipeline:', error);
      // Revenir à l'état précédent
      setLocalContacts(prev => {
        if (!prev) return prev;
        return prev.map(c => c.documentId === contact.documentId ? contact : c);
      });
      showGlobalPopup(t('error_adding_contact') || 'Erreur lors de l\'ajout', 'error');
    }
  }, [showGlobalPopup, t]);

  const handleSaveContact = useCallback(async (data: Partial<Client>) => {
    try {
      if (contactModal.contact) {
        // Mise à jour optimiste
        const updatedContact = { ...contactModal.contact, ...data };
        setLocalContacts(prev => {
          if (!prev) return prev;
          return prev.map(c => c.documentId === contactModal.contact!.documentId ? updatedContact as Client : c);
        });
        
        await updateClient(contactModal.contact.documentId, data);
        showGlobalPopup(t('contact_updated') || 'Contact mis à jour', 'success');
      } else {
        // Create - nouveau contact avec pipeline_status
        const result = await addClientUser(user?.id || 0, {
          name: data.name || '',
          email: data.email || `${(data.name || 'contact').toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
          enterprise: data.enterprise || '',
          phone: data.phone || '',
          website: data.website || '',
          processStatus: 'prospect',
          pipeline_status: data.pipeline_status || 'new',
          source: data.source,
          priority: data.priority,
          estimated_value: data.estimated_value,
          budget: data.budget,
          notes: data.notes,
          next_action: data.next_action,
          next_action_date: data.next_action_date,
        });
        
        // Ajouter le nouveau contact à l'état local
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newContact = (result as any)?.data;
        if (newContact) {
          setLocalContacts(prev => prev ? [...prev, newContact] : [newContact]);
        } else {
          // Fallback: refetch si on ne peut pas récupérer le nouveau contact
          await refetch();
        }
        
        showGlobalPopup(t('contact_created') || 'Contact créé', 'success');
      }
      clearCache('clients');
      clearCache('contacts');
    } catch (error) {
      console.error('Error saving contact:', error);
      // Refetch pour synchroniser l'état en cas d'erreur
      await refetch();
      showGlobalPopup(t('error_saving') || 'Erreur lors de la sauvegarde', 'error');
      throw error;
    }
  }, [contactModal.contact, user?.id, refetch, showGlobalPopup, t]);

  const handleDeleteContact = useCallback(async () => {
    if (!deleteModal.contact) return;
    
    const contactToDelete = deleteModal.contact;
    
    // Mise à jour optimiste - retirer le contact immédiatement
    setLocalContacts(prev => {
      if (!prev) return prev;
      return prev.filter(c => c.documentId !== contactToDelete.documentId);
    });
    setDeleteModal({ isOpen: false, contact: null });
    
    try {
      await deleteClient(contactToDelete.documentId);
      clearCache('clients');
      clearCache('contacts');
      showGlobalPopup(t('contact_deleted') || 'Contact supprimé', 'success');
    } catch (error) {
      console.error('Error deleting contact:', error);
      // Remettre le contact en cas d'erreur
      setLocalContacts(prev => prev ? [...prev, contactToDelete] : [contactToDelete]);
      showGlobalPopup(t('error_deleting') || 'Erreur lors de la suppression', 'error');
    }
  }, [deleteModal.contact, showGlobalPopup, t]);

  const handleRemoveFromKanban = useCallback(async (contact: Client) => {
    const previousContact = contact;
    
    // Mise à jour optimiste - retirer le pipeline_status
    setLocalContacts(prev => {
      if (!prev) return prev;
      return prev.map(c => 
        c.documentId === contact.documentId 
          ? { ...c, pipeline_status: undefined }
          : c
      );
    });
    
    try {
      // Mettre le pipeline_status à null dans la base de données
      await updateClient(contact.documentId, { pipeline_status: null });
      clearCache('clients');
      clearCache('contacts');
      showGlobalPopup(t('contact_removed_from_kanban') || 'Contact retiré du pipeline', 'success');
    } catch (error) {
      console.error('Error removing from kanban:', error);
      // Remettre l'état précédent en cas d'erreur
      setLocalContacts(prev => {
        if (!prev) return prev;
        return prev.map(c => 
          c.documentId === contact.documentId ? previousContact : c
        );
      });
      showGlobalPopup(t('error_removing_from_kanban') || 'Erreur lors du retrait', 'error');
    }
  }, [showGlobalPopup, t]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconChartBar size={28} className="text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {t('pipeline') || 'Pipeline CRM'}
            </h1>
            <p className="text-sm text-muted">
              {t('pipeline_description') || 'Suivez vos contacts de la prise de contact à la conversion'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKPIs(!showKPIs)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showKPIs 
                ? 'bg-accent/10 text-accent border-accent/30' 
                : 'bg-card text-muted border-default hover:bg-hover'
            }`}
          >
            <IconChartLine size={18} />
            {t('show_kpis') || 'KPIs'}
          </button>
          <button
            onClick={() => setContactModal({ isOpen: true, contact: null })}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <IconPlus size={18} />
            {t('new_contact') || 'Nouveau contact'}
          </button>
        </div>
      </div>

      {/* KPIs et Graphique */}
      {showKPIs && (
        <div className="space-y-4">
          {/* Cartes de stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* CA Potentiel (Devis envoyés) */}
            <div className="bg-card border border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <IconReceipt size={16} />
                <span className="text-xs font-medium">{t('kpi_potential_revenue') || 'CA Potentiel'}</span>
              </div>
              <p className="text-xl font-bold text-violet-500">
                {formatCurrency(kpis.potentialValue + kpis.inNegotiationValue)}
              </p>
              <p className="text-xs text-muted mt-1">
                {kpis.quotesSentCount} {t('kpi_quotes_sent') || 'devis envoyés'}
              </p>
            </div>

            {/* CA Gagné */}
            <div className="bg-card border border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <IconCheck size={16} />
                <span className="text-xs font-medium">{t('kpi_won_revenue') || 'CA Gagné'}</span>
              </div>
              <p className="text-xl font-bold text-success">
                {formatCurrency(kpis.wonValue)}
              </p>
              <p className="text-xs text-muted mt-1">
                {kpis.quotesAcceptedCount} {t('kpi_quotes_accepted') || 'devis acceptés'}
              </p>
            </div>

            {/* Taux de conversion */}
            <div className="bg-card border border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <IconTrendingUp size={16} />
                <span className="text-xs font-medium">{t('conversion_rate') || 'Conversion'}</span>
              </div>
              <p className="text-xl font-bold text-accent">
                {kpis.conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted mt-1">
                {t('kpi_quotes_to_deals') || 'devis → clients'}
              </p>
            </div>

            {/* Contacts dans le pipeline */}
            <div className="bg-card border border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <IconUsers size={16} />
                <span className="text-xs font-medium">{t('total_contacts') || 'Total contacts'}</span>
              </div>
              <p className="text-xl font-bold text-primary">
                {kpis.totalContacts}
              </p>
              <p className="text-xs text-muted mt-1">
                {kpis.newContacts} {t('kpi_new_this_month') || 'nouveaux'}
              </p>
            </div>

            {/* En cours */}
            <div className="bg-card border border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <IconClock size={16} />
                <span className="text-xs font-medium">{t('in_progress') || 'En cours'}</span>
              </div>
              <p className="text-xl font-bold text-warning">
                {kpis.inProgressCount}
              </p>
              <p className="text-xs text-muted mt-1">
                {t('active_projects') || 'projets actifs'}
              </p>
            </div>

            {/* Gagnés */}
            <div className="bg-card border border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <IconCheck size={16} />
                <span className="text-xs font-medium">{t('won') || 'Gagnés'}</span>
              </div>
              <p className="text-xl font-bold text-success">
                {kpis.wonCount}
              </p>
              <p className="text-xs text-muted mt-1">
                {kpis.lostCount} {t('lost') || 'perdus'}
              </p>
            </div>
          </div>

          {/* Graphique d'évolution */}
          <div className="bg-card border border-default rounded-xl p-4">
            <h3 className="text-sm font-medium text-primary mb-4 flex items-center gap-2">
              <IconChartLine size={18} />
              {t('kpi_revenue_evolution') || 'Évolution du CA (12 derniers mois)'}
            </h3>
            <div className="h-[200px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border border-default">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_contacts') || 'Rechercher...'}
            className="w-full !pl-9 !pr-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Filtre priorité */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as ContactPriority | '')}
          className="px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="">{t('all_priorities') || 'Toutes priorités'}</option>
          <option value="low">{t('priority_low') || 'Basse'}</option>
          <option value="medium">{t('priority_medium') || 'Moyenne'}</option>
          <option value="high">{t('priority_high') || 'Haute'}</option>
        </select>

        {/* Filtre source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as ContactSource | '')}
          className="px-3 py-2 bg-background border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="">{t('all_sources') || 'Toutes sources'}</option>
          <option value="cold_outreach">{t('source_cold_outreach') || 'Prospection'}</option>
          <option value="referral">{t('source_referral') || 'Recommandation'}</option>
          <option value="website">{t('source_website') || 'Site web'}</option>
          <option value="social_media">{t('source_social_media') || 'Réseaux sociaux'}</option>
          <option value="typeform">{t('source_typeform') || 'Typeform'}</option>
          <option value="other">{t('source_other') || 'Autre'}</option>
        </select>

        {/* Reset filters */}
        {(searchTerm || priorityFilter || sourceFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setPriorityFilter('');
              setSourceFilter('');
            }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-muted hover:text-primary transition-colors"
          >
            <IconX size={14} />
            {t('clear_filters') || 'Effacer'}
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        contacts={filteredContacts}
        onStatusChange={handleStatusChange}
        onContactClick={(contact) => setContactModal({ isOpen: true, contact })}
        onAddContact={(status) => setContactModal({ isOpen: true, contact: null, initialStatus: status })}
        onSelectExistingContact={(status) => setSelectModal({ isOpen: true, targetStatus: status })}
        onDeleteContact={(contact) => setDeleteModal({ isOpen: true, contact })}
        onRemoveFromKanban={handleRemoveFromKanban}
        loading={loading}
      />

      {/* Modals */}
      <ContactModal
        isOpen={contactModal.isOpen}
        onClose={() => setContactModal({ isOpen: false, contact: null })}
        contact={contactModal.contact}
        initialStatus={contactModal.initialStatus}
        onSave={handleSaveContact}
      />

      <SelectContactModal
        isOpen={selectModal.isOpen}
        onClose={() => setSelectModal({ isOpen: false, targetStatus: 'new' })}
        contacts={allContacts}
        onSelect={handleSelectExistingContact}
        targetStatus={selectModal.targetStatus}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, contact: null })}
        onConfirm={handleDeleteContact}
        title={t('delete_contact') || 'Supprimer le contact'}
        itemName={deleteModal.contact?.name || ''}
        itemType="contact"
      />
    </div>
  );
}
