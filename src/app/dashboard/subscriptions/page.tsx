'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { 
  IconCreditCard, 
  IconPlus, 
  IconEdit, 
  IconTrash,
  IconSearch,
  IconX,
  IconCalendar,
  IconCurrencyEuro,
  IconRefresh,
  IconBuilding
} from '@tabler/icons-react';
import type { Client, Project } from '@/types';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.dashboard.eclipsestudiodev.fr';

interface ClientSubscription {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'paused';
  monthly_amount: number;
  currency: string;
  billing_day: number;
  start_date: string;
  end_date?: string;
  next_billing_date?: string;
  last_billed_date?: string;
  auto_invoice: boolean;
  services_included: string[];
  total_billed: number;
  invoices_generated: number;
  client?: Client;
  project?: Project;
}

// Type pour les données du formulaire (utilise des IDs au lieu d'objets)
interface SubscriptionFormData {
  name: string;
  description: string;
  client: string | number;
  project: string | number;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'paused';
  monthly_amount: number;
  currency: string;
  billing_day: number;
  start_date: string;
  auto_invoice: boolean;
  services_included: string[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-success-light', text: 'text-success', label: 'Actif' },
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'En attente' },
  cancelled: { bg: 'bg-danger-light', text: 'text-danger', label: 'Annulé' },
  expired: { bg: 'bg-hover', text: 'text-muted', label: 'Expiré' },
  paused: { bg: 'bg-info-light', text: 'text-info', label: 'Pausé' },
};

function formatCurrency(amount: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}

// Modal pour créer/éditer un abonnement
function SubscriptionModal({
  isOpen,
  onClose,
  subscription,
  clients,
  projects,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  subscription: ClientSubscription | null;
  clients: Client[];
  projects: Project[];
  onSave: (data: SubscriptionFormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: '',
    description: '',
    client: '',
    project: '',
    status: 'pending',
    monthly_amount: 20,
    currency: 'EUR',
    billing_day: 1,
    start_date: new Date().toISOString().split('T')[0],
    auto_invoice: true,
    services_included: [
      'Mises à jour de sécurité',
      'Corrections de bugs',
      'Optimisations SEO',
      'Support prioritaire',
    ],
  });

  // Synchroniser le formulaire quand le modal s'ouvre ou le subscription change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: subscription?.name || '',
        description: subscription?.description || '',
        client: subscription?.client?.id || '',
        project: subscription?.project?.id || '',
        status: subscription?.status || 'pending',
        monthly_amount: subscription?.monthly_amount || 20,
        currency: subscription?.currency || 'EUR',
        billing_day: subscription?.billing_day || 1,
        start_date: subscription?.start_date || new Date().toISOString().split('T')[0],
        auto_invoice: subscription?.auto_invoice ?? true,
        services_included: subscription?.services_included || [
          'Mises à jour de sécurité',
          'Corrections de bugs',
          'Optimisations SEO',
          'Support prioritaire',
        ],
      });
    }
  }, [isOpen, subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-muted rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b border-muted p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {subscription ? 'Modifier l&apos;abonnement' : 'Nouvel abonnement'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg">
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom de l&apos;abonnement *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              placeholder="Maintenance site vitrine"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <select
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              >
                <option value="">Sélectionner...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Projet lié</label>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              >
                <option value="">Sélectionner...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Montant/mois *</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.monthly_amount}
                  onChange={(e) => setFormData({ ...formData, monthly_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-page border border-muted rounded-lg !pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jour facturation</label>
              <input
                type="number"
                min="1"
                max="28"
                value={formData.billing_day}
                onChange={(e) => setFormData({ ...formData, billing_day: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientSubscription['status'] })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              >
                <option value="pending">En attente</option>
                <option value="active">Actif</option>
                <option value="paused">Pausé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date de début *</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-page border border-muted rounded-lg resize-none"
              rows={2}
              placeholder="Accompagnement mensuel..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.auto_invoice}
              onChange={(e) => setFormData({ ...formData, auto_invoice: e.target.checked })}
              className="w-4 h-4 !text-accent rounded"
            />
            <span className="text-sm">Générer automatiquement les factures</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-muted">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-muted rounded-lg hover:bg-hover">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent disabled:opacity-50"
            >
              {loading ? '...' : (subscription ? 'Enregistrer' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<ClientSubscription | null>(null);

  // Fetch data
  const fetchData = async () => {
    if (!user?.id || !token) {
      setLoading(false);
      return;
    }
    
    try {
      const [subsRes, clientsRes, projectsRes] = await Promise.all([
        fetch(`${strapiUrl}/api/client-subscriptions?filters[users][id][$eq]=${user.id}&populate=*`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${strapiUrl}/api/clients?filters[users][id][$eq]=${user.id}&populate=*`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${strapiUrl}/api/projects?filters[user][id][$eq]=${user.id}&populate=*`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [subsData, clientsData, projectsData] = await Promise.all([
        subsRes.json(),
        clientsRes.json(),
        projectsRes.json(),
      ]);

      setSubscriptions(subsData.data || []);
      setClients(clientsData.data || []);
      setProjects(projectsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  // Stats
  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active');
    return {
      total: subscriptions.length,
      active: active.length,
      monthlyRevenue: active.reduce((sum, s) => sum + s.monthly_amount, 0),
      yearlyRevenue: active.reduce((sum, s) => sum + s.monthly_amount * 12, 0),
    };
  }, [subscriptions]);

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  // Save subscription
  const handleSaveSubscription = async (data: SubscriptionFormData) => {
    try {
      const url = editingSubscription
        ? `${strapiUrl}/api/client-subscriptions/${editingSubscription.documentId}`
        : `${strapiUrl}/api/client-subscriptions`;
      
      const response = await fetch(url, {
        method: editingSubscription ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            ...data,
            users: user?.id,
            publishedAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      showGlobalPopup(
        editingSubscription ? 'Abonnement mis à jour' : 'Abonnement créé',
        'success'
      );
      
      fetchData();
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error saving subscription:', error);
      showGlobalPopup('Erreur', 'error');
      throw error;
    }
  };

  // Delete subscription
  const handleDeleteSubscription = async (sub: ClientSubscription) => {
    if (!confirm(`Supprimer l'abonnement "${sub.name}" ?`)) return;
    
    try {
      await fetch(`${strapiUrl}/api/client-subscriptions/${sub.documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showGlobalPopup('Abonnement supprimé', 'success');
      fetchData();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      showGlobalPopup('Erreur', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconCreditCard size={28} className="!text-accent" />
          <div>
            <h1 className="text-2xl font-bold">{t('subscriptions') || 'Abonnements clients'}</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos abonnements de maintenance et accompagnement
            </p>
          </div>
        </div>

        <button
          onClick={() => { setEditingSubscription(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent"
        >
          <IconPlus size={18} />
          Nouvel abonnement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-muted rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total abonnements</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border border-muted rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Actifs</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-card border border-muted rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Revenu mensuel</p>
          <p className="text-2xl font-bold !text-accent">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>
        <div className="bg-card border border-muted rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Revenu annuel</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.yearlyRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border border-muted">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full !pl-9 !pr-3 py-2 bg-page border border-muted rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-page border border-muted rounded-lg"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="paused">Pausé</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      {/* Subscriptions list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <IconCreditCard size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun abonnement trouvé</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubscriptions.map((sub) => {
            const statusStyle = STATUS_COLORS[sub.status];
            return (
              <div 
                key={sub.documentId} 
                className="bg-card border border-muted rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4 border-b border-muted">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{sub.name}</h3>
                      {sub.client && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <IconBuilding size={12} />
                          {sub.client.name || sub.client.enterprise}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold !text-accent">
                      {formatCurrency(sub.monthly_amount)}<span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingSubscription(sub); setModalOpen(true); }}
                        className="p-1.5 hover:bg-hover rounded"
                        title="Modifier"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubscription(sub)}
                        className="p-1.5 hover:bg-hover rounded text-red-500"
                        title="Supprimer"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IconCalendar size={14} />
                      Début
                    </span>
                    <span>{formatDate(sub.start_date)}</span>
                  </div>
                  {sub.next_billing_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <IconRefresh size={14} />
                        Prochaine facture
                      </span>
                      <span>{formatDate(sub.next_billing_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IconCurrencyEuro size={14} />
                      Total facturé
                    </span>
                    <span className="font-medium">{formatCurrency(sub.total_billed || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSubscription(null); }}
        subscription={editingSubscription}
        clients={clients}
        projects={projects}
        onSave={handleSaveSubscription}
      />
    </div>
  );
}

