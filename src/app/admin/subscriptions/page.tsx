'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconCreditCard,
  IconSearch,
  IconTrendingUp,
  IconCrown,
  IconSparkles,
  IconStar,
  IconEdit,
  IconRefresh,
  IconChevronRight,
  IconX,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';

interface Plan {
  id: number;
  documentId: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  billing_type?: string;
  description?: string;
  features?: Record<string, unknown>;
  rank?: string;
}

interface Subscription {
  id: number;
  documentId: string;
  status?: string;
  subscription_status?: string; // Strapi field name
  start_date: string;
  end_date?: string;
  plan?: Plan;
  users?: Array<{
    id: number;
    username: string;
    email: string;
  }>;
}

interface PlanStats {
  planName: string;
  count: number;
  revenue: number;
  color: string;
  icon: React.ReactNode;
}

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Récupérer les plans avec tous leurs champs
      const plansRes = await fetch(`${API_URL}/api/plans?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const plansData = await plansRes.json();
      setPlans(plansData.data || []);

      // Récupérer les subscriptions avec le plan et les users
      const subsRes = await fetch(`${API_URL}/api/subscriptions?populate[plan][populate]=*&populate[users][populate]=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subsData = await subsRes.json();
      
      // Mapper les subscriptions pour inclure le prix du plan
      const mappedSubs = (subsData.data || []).map((sub: Subscription & { plan?: Plan }) => {
        // Si le plan n'a pas de price_monthly, chercher dans la liste des plans
        if (sub.plan && !sub.plan.price_monthly) {
          const fullPlan = plansData.data?.find((p: Plan) => p.id === sub.plan?.id || p.documentId === sub.plan?.documentId);
          if (fullPlan) {
            return { ...sub, plan: fullPlan };
          }
        }
        return sub;
      });
      
      setSubscriptions(mappedSubs);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper pour obtenir le statut (supporte les deux noms de champs)
  const getSubStatus = (sub: Subscription) => sub.subscription_status || sub.status || '';

  const planStats = useMemo((): PlanStats[] => {
    const stats: Record<string, { count: number; revenue: number }> = {};

    subscriptions.forEach(sub => {
      const planName = sub.plan?.name || 'Sans plan';
      // Chercher le prix dans la liste des plans si non disponible dans la subscription
      let price = sub.plan?.price_monthly;
      if (price === undefined && sub.plan) {
        const fullPlan = plans.find(p => p.id === sub.plan?.id || p.documentId === sub.plan?.documentId);
        price = fullPlan?.price_monthly || 0;
      }

      if (!stats[planName]) {
        stats[planName] = { count: 0, revenue: 0 };
      }
      stats[planName].count++;
      if (getSubStatus(sub).toLowerCase() === 'active') {
        stats[planName].revenue += price || 0;
      }
    });

    const colors = ['text-info', 'text-accent', 'text-success', 'text-warning'];
    const icons = [<IconStar key="star" className="w-5 h-5" />, <IconSparkles key="sparkles" className="w-5 h-5" />, <IconCrown key="crown" className="w-5 h-5" />, <IconCreditCard key="card" className="w-5 h-5" />];

    return Object.entries(stats).map(([planName, data], index) => ({
      planName,
      count: data.count,
      revenue: data.revenue,
      color: colors[index % colors.length],
      icon: icons[index % icons.length],
    }));
  }, [subscriptions, plans]);

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    
    setSavingPlan(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/plans/${editingPlan.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            name: editingPlan.name,
            price_monthly: editingPlan.price_monthly,
            price_yearly: editingPlan.price_yearly,
            description: editingPlan.description,
            features: editingPlan.features,
          },
        }),
      });

      if (response.ok) {
        showGlobalPopup(t('plan_updated') || 'Plan mis à jour avec succès', 'success');
        setEditingPlan(null);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        showGlobalPopup(error.error?.message || t('error_updating_plan') || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      showGlobalPopup(t('error_updating_plan') || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = !searchTerm ||
        sub.users?.some(u => 
          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesPlan = filterPlan === 'all' || sub.plan?.name === filterPlan;
      const subStatus = getSubStatus(sub).toLowerCase();
      const matchesStatus = filterStatus === 'all' || subStatus === filterStatus.toLowerCase();

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [subscriptions, searchTerm, filterPlan, filterStatus]);

  const totalMRR = useMemo(() => {
    const activeSubs = subscriptions.filter(sub => 
      getSubStatus(sub).toLowerCase() === 'active'
    );
    
    return activeSubs.reduce((total, sub) => {
      // Chercher le prix dans la liste des plans si non disponible dans la subscription
      let price = sub.plan?.price_monthly;
      if ((price === undefined || price === null) && sub.plan) {
        const fullPlan = plans.find(p => 
          p.id === sub.plan?.id || 
          p.documentId === sub.plan?.documentId ||
          p.name?.toLowerCase() === sub.plan?.name?.toLowerCase()
        );
        price = fullPlan?.price_monthly || 0;
      }
      return total + (price || 0);
    }, 0);
  }, [subscriptions, plans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold !text-primary flex items-center gap-2">
            <IconCreditCard className="w-7 h-7 !text-accent" />
            {t('subscriptions_management') || 'Gestion des Abonnements'}
          </h1>
          <p className="text-sm !text-muted">{subscriptions.length} {t('subscriptions_total') || 'abonnements au total'}</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2 px-4 py-2  transition-colors hover:bg-hover ease-in-out duration-300"
        >
          <IconRefresh className="w-4 h-4" />
          {t('refresh') || 'Actualiser'}
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 bg-gradient-to-br from-accent to-accent-light border-accent"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2  bg-accent-light">
              <IconTrendingUp className="w-6 h-6 !text-accent" />
            </div>
            <span className="!text-xs !text-accent bg-accent-light px-2 py-1 rounded-full font-medium">MRR</span>
          </div>
          <p className="text-3xl font-bold !text-primary">{totalMRR.toLocaleString()}€</p>
          <p className="text-sm !text-muted">{t('monthly_recurring_revenue') || 'Revenu mensuel récurrent'}</p>
        </motion.div>

        {planStats.slice(0, 3).map((stat, index) => (
          <motion.div
            key={stat.planName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2  bg-muted ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="!text-xs !text-muted">{stat.count} users</span>
            </div>
            <p className="text-xl font-bold !text-primary">{stat.planName}</p>
            <p className="text-sm !text-muted">{stat.revenue.toLocaleString()}€/{t('month') || 'mois'}</p>
          </motion.div>
        ))}
      </div>

      {/* Plans Overview */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold !text-primary mb-4">{t('available_plans') || 'Plans disponibles'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-4  bg-muted border border-muted hover:bg-accent-light transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold !text-primary">{plan.name}</span>
                <button 
                  onClick={() => setEditingPlan({ ...plan })}
                  className="p-1.5  hover:bg-hover transition-colors"
                  title={t('edit_plan') || 'Modifier le plan'}
                >
                  <IconEdit className="w-4 h-4 !text-muted hover:!text-accent" />
                </button>
              </div>
              <p className="text-2xl font-bold !text-accent">
                {plan.price_monthly || 0}€
                <span className="text-sm font-normal !text-muted">/{t('month') || 'mois'}</span>
              </p>
              {plan.price_yearly !== undefined && plan.price_yearly > 0 && (
                <p className="text-sm !text-muted">
                  {plan.price_yearly}€/{t('year') || 'an'}
                </p>
              )}
              <p className="!text-xs !text-muted mt-2">
                {subscriptions.filter(s => s.plan?.id === plan.id).length} {t('plan_subscribers') || 'abonnés'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 !text-muted" />
            <input
              type="text"
              placeholder={t('search_user') || 'Rechercher un utilisateur...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full !pl-10"
            />
          </div>

          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">{t('all_plans') || 'Tous les plans'}</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.name}>{plan.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">{t('all_status') || 'Tous les statuts'}</option>
            <option value="active">{t('active') || 'Actif'}</option>
            <option value="trial">{t('trial') || 'Essai'}</option>
            <option value="canceled">{t('canceled') || 'Annulé'}</option>
            <option value="expired">{t('expired') || 'Expiré'}</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-muted">
                <th className="px-4 py-3 !text-left !text-xs font-medium !text-muted uppercase tracking-wider">
                  {t('user') || 'Utilisateur'}
                </th>
                <th className="px-4 py-3 !text-left !text-xs font-medium !text-muted uppercase tracking-wider">
                  {t('plan') || 'Plan'}
                </th>
                <th className="px-4 py-3 !text-left !text-xs font-medium !text-muted uppercase tracking-wider">
                  {t('status') || 'Statut'}
                </th>
                <th className="px-4 py-3 !text-left !text-xs font-medium !text-muted uppercase tracking-wider">
                  {t('start_date') || 'Date de début'}
                </th>
                <th className="px-4 py-3 !text-left !text-xs font-medium !text-muted uppercase tracking-wider">
                  {t('expiration') || 'Expiration'}
                </th>
                <th className="px-4 py-3 !text-right !text-xs font-medium !text-muted uppercase tracking-wider">
                  {t('actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub, index) => (
                <tr 
                  key={sub.id} 
                  className={`hover:bg-hover transition-colors ${
                    index !== filteredSubscriptions.length - 1 ? 'border-b border-muted' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    {sub.users && sub.users.length > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center">
                          <span className="text-accent font-medium !text-sm">
                            {sub.users[0].username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium !text-primary !text-sm">{sub.users[0].username}</p>
                          <p className="!text-xs !text-muted">{sub.users[0].email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <IconCrown className="w-4 h-4 !text-accent" />
                      <span className="font-medium !text-primary !text-sm">{sub.plan?.name || t('no_plan') || 'Sans plan'}</span>
                    </div>
                    {sub.plan?.price_monthly !== undefined && (
                      <p className="!text-xs !text-muted mt-0.5">{sub.plan.price_monthly}€/{t('month') || 'mois'}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const status = getSubStatus(sub).toLowerCase();
                      return (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full !text-xs font-medium ${
                          status === 'active' ? 'bg-success-light !text-success-text ' :
                          status === 'trial' ? 'bg-info-light !text-info' :
                          status === 'canceled' ? 'bg-danger-light !text-danger' :
                          'bg-warning-light !text-warning'
                        }`}>
                          {status === 'active' ? t('active') || 'Actif' :
                           status === 'trial' ? t('trial') || 'Essai' :
                           status === 'canceled' ? t('canceled') || 'Annulé' :
                           getSubStatus(sub)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 !text-sm !text-secondary">
                    {sub.start_date
                      ? new Date(sub.start_date).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-4 py-4 !text-sm !text-secondary">
                    {sub.end_date
                      ? new Date(sub.end_date).toLocaleDateString('fr-FR')
                      : t('unlimited') || 'Illimité'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end">
                      <button className="p-2  hover:bg-hover transition-colors">
                        <IconChevronRight className="w-4 h-4 !text-muted" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <IconCreditCard className="w-12 h-12 !text-muted mx-auto mb-4 opacity-50" />
            <p className="text-muted">{t('no_subscription_found') || 'Aucun abonnement trouvé'}</p>
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      <AnimatePresence>
        {editingPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingPlan(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold !text-primary flex items-center gap-2">
                  <IconEdit className="w-5 h-5 !text-accent" />
                  {t('edit_plan') || 'Modifier le plan'}
                </h2>
                <button
                  onClick={() => setEditingPlan(null)}
                  className="p-2  hover:bg-hover transition-colors"
                >
                  <IconX className="w-5 h-5 !text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block !text-sm font-medium !text-secondary mb-1">
                    {t('plan_name') || 'Nom du plan'}
                  </label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block !text-sm font-medium !text-secondary mb-1">
                      {t('price_monthly') || 'Prix mensuel'} (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPlan.price_monthly || 0}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block !text-sm font-medium !text-secondary mb-1">
                      {t('price_yearly') || 'Prix annuel'} (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPlan.price_yearly || 0}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: parseFloat(e.target.value) || 0 })}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block !text-sm font-medium !text-secondary mb-1">
                    {t('description') || 'Description'}
                  </label>
                  <textarea
                    value={editingPlan.description || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    className="input w-full h-24 resize-none"
                    placeholder={t('plan_description_placeholder') || 'Description du plan...'}
                  />
                </div>

                {/* Features Editor */}
                {editingPlan.features && Object.keys(editingPlan.features).length > 0 && (
                  <div>
                    <label className="block !text-sm font-medium !text-secondary mb-2">
                      {t('features') || 'Fonctionnalités'}
                    </label>
                    <div className="bg-muted  p-3 max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(editingPlan.features).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-2  bg-card border border-default">
                            <span className="text-sm !text-primary truncate capitalize" title={key}>
                              {key.replace(/_/g, ' ')}
                            </span>
                            {typeof value === 'boolean' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFeatures = { ...editingPlan.features, [key]: !value };
                                  setEditingPlan({ ...editingPlan, features: newFeatures });
                                }}
                                className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                                  value ? 'bg-success' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                              >
                                <div
                                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                                    value ? 'left-5' : 'left-0.5'
                                  }`}
                                />
                              </button>
                            ) : (
                              <input
                                type="number"
                                value={value as number}
                                onChange={(e) => {
                                  const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                  const newFeatures = { ...editingPlan.features, [key]: newValue };
                                  setEditingPlan({ ...editingPlan, features: newFeatures });
                                }}
                                className="input w-20 !text-right !text-sm py-1 px-2"
                                min="0"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="!text-xs !text-muted mt-2">
                      💡 {t('features_help') || '0 = illimité pour les quotas numériques'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-muted">
                <button
                  onClick={() => setEditingPlan(null)}
                  className="btn-secondary px-4 py-2 "
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleSavePlan}
                  disabled={savingPlan}
                  className="flex items-center gap-2 px-4 py-2 bg-accent !text-white  hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50"
                >
                  {savingPlan ? (
                    <IconRefresh className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconDeviceFloppy className="w-4 h-4" />
                  )}
                  {savingPlan ? t('saving') || 'Enregistrement...' : t('save') || 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
