'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useProspects, clearCache } from '@/hooks/useApi';
import { updateProspect, deleteProspect, createProspect } from '@/lib/api';
import KanbanBoard, { PIPELINE_COLUMNS } from '@/app/components/KanbanBoard';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import type { Prospect, ProspectStatus, ProspectSource, ProspectPriority } from '@/types';
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
  IconNotes
} from '@tabler/icons-react';

// Modal pour créer/éditer un prospect
function ProspectModal({ 
  isOpen, 
  onClose, 
  prospect,
  initialStatus,
  onSave 
}: { 
  isOpen: boolean;
  onClose: () => void;
  prospect?: Prospect | null;
  initialStatus?: ProspectStatus;
  onSave: (data: Partial<Prospect>) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Prospect>>({
    title: prospect?.title || '',
    company: prospect?.company || '',
    email: prospect?.email || '',
    phone: prospect?.phone || '',
    website: prospect?.website || '',
    description: prospect?.description || '',
    notes: prospect?.notes || '',
    prospect_status: prospect?.prospect_status || initialStatus || 'new',
    source: prospect?.source || 'cold_outreach',
    priority: prospect?.priority || 'medium',
    estimated_value: prospect?.estimated_value || undefined,
    next_action: prospect?.next_action || '',
    next_action_date: prospect?.next_action_date || '',
    budget: prospect?.budget || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving prospect:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const sourceOptions: { value: ProspectSource; label: string }[] = [
    { value: 'cold_outreach', label: t('source_cold_outreach') || 'Prospection froide' },
    { value: 'referral', label: t('source_referral') || 'Recommandation' },
    { value: 'website', label: t('source_website') || 'Site web' },
    { value: 'social_media', label: t('source_social_media') || 'Réseaux sociaux' },
    { value: 'typeform', label: t('source_typeform') || 'Typeform' },
    { value: 'other', label: t('source_other') || 'Autre' },
  ];

  const priorityOptions: { value: ProspectPriority; label: string }[] = [
    { value: 'low', label: t('priority_low') || 'Basse' },
    { value: 'medium', label: t('priority_medium') || 'Moyenne' },
    { value: 'high', label: t('priority_high') || 'Haute' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {prospect ? t('edit_prospect') || 'Modifier le prospect' : t('new_prospect') || 'Nouveau prospect'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg">
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Infos principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('prospect_name') || 'Nom du prospect'} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconBuilding size={14} className="inline mr-1" />
                {t('company') || 'Entreprise'}
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconMail size={14} className="inline mr-1" />
                {t('email') || 'Email'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconPhone size={14} className="inline mr-1" />
                {t('phone') || 'Téléphone'}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconWorld size={14} className="inline mr-1" />
                {t('website') || 'Site web'}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Statut & Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('status') || 'Statut'}
              </label>
              <select
                value={formData.prospect_status}
                onChange={(e) => setFormData({ ...formData, prospect_status: e.target.value as ProspectStatus })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {PIPELINE_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {t(col.title) || col.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('source') || 'Source'}
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as ProspectSource })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconFlag size={14} className="inline mr-1" />
                {t('priority') || 'Priorité'}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as ProspectPriority })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconCurrencyEuro size={14} className="inline mr-1" />
                {t('estimated_value') || 'Valeur estimée (€)'}
              </label>
              <input
                type="number"
                value={formData.estimated_value || ''}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('budget') || 'Budget client (€)'}
              </label>
              <input
                type="number"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Next action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('next_action') || 'Prochaine action'}
              </label>
              <input
                type="text"
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Ex: Appeler pour relance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <IconCalendar size={14} className="inline mr-1" />
                {t('next_action_date') || 'Date prochaine action'}
              </label>
              <input
                type="date"
                value={formData.next_action_date || ''}
                onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('description') || 'Description du projet'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
              rows={3}
              placeholder="Décrivez brièvement le projet..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <IconNotes size={14} className="inline mr-1" />
              {t('notes') || 'Notes internes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
              rows={2}
              placeholder="Notes privées..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-hover transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : (prospect ? t('save') || 'Enregistrer' : t('create') || 'Créer')}
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

  // États
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ProspectPriority | ''>('');
  const [sourceFilter, setSourceFilter] = useState<ProspectSource | ''>('');
  const [prospectModal, setProspectModal] = useState<{ 
    isOpen: boolean; 
    prospect: Prospect | null;
    initialStatus?: ProspectStatus;
  }>({ isOpen: false, prospect: null });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; prospect: Prospect | null }>({
    isOpen: false,
    prospect: null,
  });

  // Données
  const { data: prospectsData, loading, refetch } = useProspects(user?.id);
  const allProspects = useMemo(() => (prospectsData as Prospect[]) || [], [prospectsData]);

  // Filtrage
  const filteredProspects = useMemo(() => {
    return allProspects.filter((prospect) => {
      // Recherche
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          prospect.title?.toLowerCase().includes(search) ||
          prospect.company?.toLowerCase().includes(search) ||
          prospect.email?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtre priorité
      if (priorityFilter && prospect.priority !== priorityFilter) return false;

      // Filtre source
      if (sourceFilter && prospect.source !== sourceFilter) return false;

      return true;
    });
  }, [allProspects, searchTerm, priorityFilter, sourceFilter]);

  // Handlers
  const handleStatusChange = useCallback(async (prospectId: string, newStatus: ProspectStatus) => {
    try {
      await updateProspect(prospectId, { prospect_status: newStatus });
      clearCache('prospects');
      await refetch();
      showGlobalPopup(t('status_updated') || 'Statut mis à jour', 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showGlobalPopup(t('error_updating_status') || 'Erreur lors de la mise à jour', 'error');
    }
  }, [refetch, showGlobalPopup, t]);

  const handleSaveProspect = useCallback(async (data: Partial<Prospect>) => {
    try {
      if (prospectModal.prospect) {
        // Update
        await updateProspect(prospectModal.prospect.documentId, data);
        showGlobalPopup(t('prospect_updated') || 'Prospect mis à jour', 'success');
      } else {
        // Create
        await createProspect({ ...data, users: user?.id ? [user.id] : [] } as Prospect);
        showGlobalPopup(t('prospect_created') || 'Prospect créé', 'success');
      }
      clearCache('prospects');
      await refetch();
    } catch (error) {
      console.error('Error saving prospect:', error);
      showGlobalPopup(t('error_saving') || 'Erreur lors de la sauvegarde', 'error');
      throw error;
    }
  }, [prospectModal.prospect, user?.id, refetch, showGlobalPopup, t]);

  const handleDeleteProspect = useCallback(async () => {
    if (!deleteModal.prospect) return;
    
    try {
      await deleteProspect(deleteModal.prospect.documentId);
      clearCache('prospects');
      await refetch();
      showGlobalPopup(t('prospect_deleted') || 'Prospect supprimé', 'success');
      setDeleteModal({ isOpen: false, prospect: null });
    } catch (error) {
      console.error('Error deleting prospect:', error);
      showGlobalPopup(t('error_deleting') || 'Erreur lors de la suppression', 'error');
    }
  }, [deleteModal.prospect, refetch, showGlobalPopup, t]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconChartBar size={28} className="text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('pipeline') || 'Pipeline CRM'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('pipeline_description') || 'Suivez vos prospects de la prise de contact à la conversion'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setProspectModal({ isOpen: true, prospect: null })}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <IconPlus size={18} />
          {t('new_prospect') || 'Nouveau prospect'}
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border border-border">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_prospects') || 'Rechercher...'}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Filtre priorité */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as ProspectPriority | '')}
          className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="">{t('all_priorities') || 'Toutes priorités'}</option>
          <option value="low">{t('priority_low') || 'Basse'}</option>
          <option value="medium">{t('priority_medium') || 'Moyenne'}</option>
          <option value="high">{t('priority_high') || 'Haute'}</option>
        </select>

        {/* Filtre source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as ProspectSource | '')}
          className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
            className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconX size={14} />
            {t('clear_filters') || 'Effacer'}
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        prospects={filteredProspects}
        onStatusChange={handleStatusChange}
        onProspectClick={(prospect) => setProspectModal({ isOpen: true, prospect })}
        onAddProspect={(status) => setProspectModal({ isOpen: true, prospect: null, initialStatus: status })}
        onDeleteProspect={(prospect) => setDeleteModal({ isOpen: true, prospect })}
        loading={loading}
      />

      {/* Modals */}
      <ProspectModal
        isOpen={prospectModal.isOpen}
        onClose={() => setProspectModal({ isOpen: false, prospect: null })}
        prospect={prospectModal.prospect}
        initialStatus={prospectModal.initialStatus}
        onSave={handleSaveProspect}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, prospect: null })}
        onConfirm={handleDeleteProspect}
        title={t('delete_prospect') || 'Supprimer le prospect'}
        itemName={deleteModal.prospect?.title || ''}
        itemType="prospect"
      />
    </div>
  );
}

