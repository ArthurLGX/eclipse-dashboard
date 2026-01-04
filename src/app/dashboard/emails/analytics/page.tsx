'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  IconMail,
  IconEye,
  IconClick,
  IconChartBar,
  IconLoader2,
  IconExternalLink,
  IconCalendar,
  IconUsers,
  IconTrendingUp,
  IconFilter,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { fetchSentEmails } from '@/lib/api';
import type { SentEmail, EmailCategory } from '@/types';

type TimeFilter = '7d' | '30d' | '90d' | 'all';

interface EmailStats {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

export default function EmailAnalyticsPage() {
  return (
    <ProtectedRoute>
      <EmailAnalytics />
    </ProtectedRoute>
  );
}

function EmailAnalytics() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | 'all'>('all');

  // Charger les emails
  useEffect(() => {
    const loadEmails = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const data = await fetchSentEmails(user.id, 100);
        setEmails(data);
      } catch (error) {
        console.error('Error loading emails:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEmails();
  }, [user?.id]);

  // Filtrer les emails par période
  const filteredEmails = useMemo(() => {
    let result = emails;

    // Filtre par catégorie
    if (categoryFilter !== 'all') {
      result = result.filter(e => e.category === categoryFilter);
    }

    // Filtre par période
    if (timeFilter !== 'all') {
      const now = new Date();
      const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter(e => new Date(e.sent_at) >= cutoff);
    }

    return result;
  }, [emails, timeFilter, categoryFilter]);

  // Calculer les statistiques
  const stats: EmailStats = useMemo(() => {
    const totalSent = filteredEmails.length;
    const totalOpens = filteredEmails.reduce((sum, e) => sum + (e.opens_count || 0), 0);
    const totalClicks = filteredEmails.reduce((sum, e) => sum + (e.clicks_count || 0), 0);
    
    // Nombre total de destinataires
    const totalRecipients = filteredEmails.reduce((sum, e) => sum + (e.recipients?.length || 0), 0);
    
    const openRate = totalRecipients > 0 ? (totalOpens / totalRecipients) * 100 : 0;
    const clickRate = totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0;
    const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;

    return {
      totalSent,
      totalOpens,
      totalClicks,
      openRate,
      clickRate,
      clickToOpenRate,
    };
  }, [filteredEmails]);

  // Top liens cliqués
  const topLinks = useMemo(() => {
    const linkMap = new Map<string, number>();
    
    filteredEmails.forEach(email => {
      email.click_details?.forEach(click => {
        const current = linkMap.get(click.url) || 0;
        linkMap.set(click.url, current + click.count);
      });
    });

    return Array.from(linkMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([url, count]) => ({ url, count }));
  }, [filteredEmails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <IconChartBar className="w-7 h-7 text-accent" />
            {t('email_analytics') || 'Analytics Email'}
          </h1>
          <p className="text-muted mt-1">
            {t('email_analytics_desc') || 'Suivez les performances de vos emails et newsletters'}
          </p>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-default rounded-lg p-1">
            {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeFilter === filter
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {filter === 'all' ? t('all') || 'Tout' : filter}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EmailCategory | 'all')}
            className="input py-1.5 text-sm"
          >
            <option value="all">{t('all_categories') || 'Toutes catégories'}</option>
            <option value="newsletter">Newsletters</option>
            <option value="classic">Emails</option>
            <option value="invoice">{t('invoices') || 'Factures'}</option>
            <option value="quote">{t('quotes') || 'Devis'}</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<IconMail className="w-5 h-5" />}
          label={t('emails_sent') || 'Emails envoyés'}
          value={stats.totalSent}
          color="blue"
        />
        <StatCard
          icon={<IconUsers className="w-5 h-5" />}
          label={t('recipients') || 'Destinataires'}
          value={filteredEmails.reduce((sum, e) => sum + (e.recipients?.length || 0), 0)}
          color="purple"
        />
        <StatCard
          icon={<IconEye className="w-5 h-5" />}
          label={t('opens') || 'Ouvertures'}
          value={stats.totalOpens}
          color="green"
        />
        <StatCard
          icon={<IconClick className="w-5 h-5" />}
          label={t('clicks') || 'Clics'}
          value={stats.totalClicks}
          color="orange"
        />
        <StatCard
          icon={<IconTrendingUp className="w-5 h-5" />}
          label={t('open_rate') || 'Taux d\'ouverture'}
          value={`${stats.openRate.toFixed(1)}%`}
          color="emerald"
        />
        <StatCard
          icon={<IconTrendingUp className="w-5 h-5" />}
          label={t('click_rate') || 'Taux de clic'}
          value={`${stats.clickRate.toFixed(1)}%`}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des emails récents */}
        <div className="bg-card border border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconMail className="w-5 h-5 text-accent" />
            {t('recent_emails') || 'Emails récents'}
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredEmails.slice(0, 10).map(email => (
              <EmailRow key={email.documentId} email={email} />
            ))}

            {filteredEmails.length === 0 && (
              <p className="text-muted text-center py-8">
                {t('no_emails_found') || 'Aucun email trouvé pour cette période'}
              </p>
            )}
          </div>
        </div>

        {/* Top liens cliqués */}
        <div className="bg-card border border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconClick className="w-5 h-5 text-accent" />
            {t('top_clicked_links') || 'Liens les plus cliqués'}
          </h2>

          <div className="space-y-3">
            {topLinks.map((link, index) => (
              <div
                key={link.url}
                className="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-accent truncate block flex items-center gap-1"
                  >
                    {new URL(link.url).hostname}
                    <IconExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <p className="text-xs text-muted truncate">{link.url}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{link.count}</div>
                  <div className="text-xs text-muted">clics</div>
                </div>
              </div>
            ))}

            {topLinks.length === 0 && (
              <p className="text-muted text-center py-8">
                {t('no_clicks_yet') || 'Aucun clic enregistré'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant StatCard
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-default rounded-xl p-4"
    >
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </motion.div>
  );
}

// Composant EmailRow
function EmailRow({ email }: { email: SentEmail }) {
  const openRate = email.recipients?.length
    ? ((email.opens_count || 0) / email.recipients.length) * 100
    : 0;

  return (
    <div className="flex items-center gap-4 p-3 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-primary truncate">{email.subject}</h3>
        <div className="flex items-center gap-3 text-xs text-muted mt-1">
          <span className="flex items-center gap-1">
            <IconCalendar className="w-3 h-3" />
            {new Date(email.sent_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <IconUsers className="w-3 h-3" />
            {email.recipients?.length || 0}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            email.category === 'newsletter' 
              ? 'bg-purple-500/10 text-purple-500'
              : email.category === 'invoice'
                ? 'bg-blue-500/10 text-blue-500'
                : 'bg-gray-500/10 text-gray-500'
          }`}>
            {email.category}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="flex items-center gap-1 text-green-500">
            <IconEye className="w-4 h-4" />
            <span className="font-medium">{email.opens_count || 0}</span>
          </div>
          <div className="text-xs text-muted">{openRate.toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-1 text-orange-500">
            <IconClick className="w-4 h-4" />
            <span className="font-medium">{email.clicks_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

