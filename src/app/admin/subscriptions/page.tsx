'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
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
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface Plan {
  id: number;
  documentId: string;
  name: string;
  price: number;
  interval: string;
  features?: Record<string, unknown>;
}

interface Subscription {
  id: number;
  documentId: string;
  status: string;
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
  const { t } = useLanguage();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      const plansRes = await fetch(`${API_URL}/api/plans?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const plansData = await plansRes.json();
      setPlans(plansData.data || []);

      const subsRes = await fetch(`${API_URL}/api/subscriptions?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subsData = await subsRes.json();
      setSubscriptions(subsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const planStats = useMemo((): PlanStats[] => {
    const stats: Record<string, { count: number; revenue: number }> = {};

    subscriptions.forEach(sub => {
      const planName = sub.plan?.name || 'Sans plan';
      const price = sub.plan?.price || 0;

      if (!stats[planName]) {
        stats[planName] = { count: 0, revenue: 0 };
      }
      stats[planName].count++;
      if (sub.status === 'active') {
        stats[planName].revenue += price;
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
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = !searchTerm ||
        sub.users?.some(u => 
          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesPlan = filterPlan === 'all' || sub.plan?.name === filterPlan;
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [subscriptions, searchTerm, filterPlan, filterStatus]);

  const totalMRR = useMemo(() => {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => total + (sub.plan?.price || 0), 0);
  }, [subscriptions]);

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
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <IconCreditCard className="w-7 h-7 text-accent" />
            {t('subscriptions_management') || 'Gestion des Abonnements'}
          </h1>
          <p className="text-sm text-muted">{subscriptions.length} {t('subscriptions_total') || 'abonnements au total'}</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-hover ease-in-out duration-300"
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
          className="card p-6 bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <IconTrendingUp className="w-6 h-6 text-accent" />
            </div>
            <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-full font-medium">MRR</span>
          </div>
          <p className="text-3xl font-bold text-primary">{totalMRR.toLocaleString()}€</p>
          <p className="text-sm text-muted">{t('monthly_recurring_revenue') || 'Revenu mensuel récurrent'}</p>
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
              <div className={`p-2 rounded-lg bg-muted/10 ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-xs text-muted">{stat.count} users</span>
            </div>
            <p className="text-xl font-bold text-primary">{stat.planName}</p>
            <p className="text-sm text-muted">{stat.revenue.toLocaleString()}€/{t('month') || 'mois'}</p>
          </motion.div>
        ))}
      </div>

      {/* Plans Overview */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">{t('available_plans') || 'Plans disponibles'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-4 rounded-xl bg-muted/5 border border-muted hover:border-accent/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-primary">{plan.name}</span>
                <button className="p-1.5 rounded-lg hover:bg-hover transition-colors">
                  <IconEdit className="w-4 h-4 text-muted" />
                </button>
              </div>
              <p className="text-2xl font-bold text-accent">
                {plan.price}€
                <span className="text-sm font-normal text-muted">/{plan.interval || t('month') || 'mois'}</span>
              </p>
              <p className="text-xs text-muted mt-2">
                {subscriptions.filter(s => s.plan?.id === plan.id).length} {t('subscribers') || 'abonnés'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
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
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('user') || 'Utilisateur'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('plan') || 'Plan'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('status') || 'Statut'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('start_date') || 'Date de début'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('expiration') || 'Expiration'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  {t('actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub, index) => (
                <tr 
                  key={sub.id} 
                  className={`hover:bg-hover/50 transition-colors ${
                    index !== filteredSubscriptions.length - 1 ? 'border-b border-muted' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    {sub.users && sub.users.length > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="text-accent font-medium text-sm">
                            {sub.users[0].username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-primary text-sm">{sub.users[0].username}</p>
                          <p className="text-xs text-muted">{sub.users[0].email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <IconCrown className="w-4 h-4 text-accent" />
                      <span className="font-medium text-primary text-sm">{sub.plan?.name || t('no_plan') || 'Sans plan'}</span>
                    </div>
                    {sub.plan?.price !== undefined && (
                      <p className="text-xs text-muted mt-0.5">{sub.plan.price}€/{t('month') || 'mois'}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'active' ? 'bg-success/10 text-success' :
                      sub.status === 'trial' ? 'bg-info/10 text-info' :
                      sub.status === 'canceled' ? 'bg-danger/10 text-danger' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {sub.status === 'active' ? t('active') || 'Actif' :
                       sub.status === 'trial' ? t('trial') || 'Essai' :
                       sub.status === 'canceled' ? t('canceled') || 'Annulé' :
                       sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-secondary">
                    {sub.start_date
                      ? new Date(sub.start_date).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-secondary">
                    {sub.end_date
                      ? new Date(sub.end_date).toLocaleDateString('fr-FR')
                      : t('unlimited') || 'Illimité'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end">
                      <button className="p-2 rounded-lg hover:bg-hover transition-colors">
                        <IconChevronRight className="w-4 h-4 text-muted" />
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
            <IconCreditCard className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
            <p className="text-muted">{t('no_subscription_found') || 'Aucun abonnement trouvé'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
