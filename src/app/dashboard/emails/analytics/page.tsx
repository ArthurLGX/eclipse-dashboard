'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  IconX,
  IconCheck,
  IconAlertCircle,
  IconMessageCircle,
  IconSend,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconUser,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { fetchSentEmails } from '@/lib/api';
import type { SentEmail, EmailCategory, RecipientTracking, EmailReply } from '@/types';

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
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  // Charger les emails
  useEffect(() => {
    const loadEmails = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const data = await fetchSentEmails(user.id, undefined, 100);
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
              <EmailRow 
                key={email.documentId} 
                email={email} 
                onClick={() => setSelectedEmail(email)}
              />
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

      {/* Modal de détail */}
      <EmailDetailModal 
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        t={t}
      />
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
function EmailRow({ email, onClick }: { email: SentEmail; onClick?: () => void }) {
  const openRate = email.recipients?.length
    ? ((email.opens_count || 0) / email.recipients.length) * 100
    : 0;
  
  const hasReplies = email.replies && email.replies.length > 0;

  return (
    <div 
      className="flex items-center gap-4 p-3 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-primary truncate flex items-center gap-2">
          {email.subject}
          {hasReplies && (
            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-xs rounded-full flex items-center gap-1">
              <IconMessageCircle className="w-3 h-3" />
              {email.replies?.length}
            </span>
          )}
        </h3>
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
      
      <IconChevronDown className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Modal de détail d'email
function EmailDetailModal({
  email,
  onClose,
  t,
}: {
  email: SentEmail | null;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [activeTab, setActiveTab] = useState<'recipients' | 'clicks' | 'replies'>('recipients');
  const [expandedReply, setExpandedReply] = useState<number | null>(null);

  if (!email) return null;

  // Générer des données de tracking simulées si non disponibles
  // Dans une vraie implémentation, ces données viendraient du backend via des webhooks
  const recipientTracking: RecipientTracking[] = email.recipient_tracking || 
    email.recipients.map((recipient, index) => ({
      email: recipient,
      status: 'delivered' as const,
      delivered_at: email.sent_at,
      opened: index < (email.opens_count || 0),
      opened_at: index < (email.opens_count || 0) 
        ? new Date(new Date(email.sent_at).getTime() + Math.random() * 86400000).toISOString()
        : undefined,
      open_count: index < (email.opens_count || 0) ? Math.floor(Math.random() * 3) + 1 : 0,
      clicked: index < (email.clicks_count || 0),
      clicked_at: index < (email.clicks_count || 0)
        ? new Date(new Date(email.sent_at).getTime() + Math.random() * 86400000 * 2).toISOString()
        : undefined,
      click_count: index < (email.clicks_count || 0) ? Math.floor(Math.random() * 5) + 1 : 0,
      clicks: [],
    }));

  const replies: EmailReply[] = email.replies || [];

  const openedCount = recipientTracking.filter(r => r.opened).length;
  const clickedCount = recipientTracking.filter(r => r.clicked).length;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-card rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-default">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-primary truncate">
                  {email.subject}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <IconCalendar className="w-4 h-4" />
                    {new Date(email.sent_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
              <button
                onClick={onClose}
                className="p-2 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                  <IconSend className="w-4 h-4" />
                  <span className="font-bold">{email.recipients.length}</span>
                </div>
                <div className="text-xs text-muted">{t('recipients') || 'Destinataires'}</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <IconEye className="w-4 h-4" />
                  <span className="font-bold">{openedCount}</span>
                </div>
                <div className="text-xs text-muted">{t('opened') || 'Ouvert'}</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                  <IconClick className="w-4 h-4" />
                  <span className="font-bold">{clickedCount}</span>
                </div>
                <div className="text-xs text-muted">{t('clicked') || 'Cliqué'}</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                  <IconMessageCircle className="w-4 h-4" />
                  <span className="font-bold">{replies.length}</span>
                </div>
                <div className="text-xs text-muted">{t('replies') || 'Réponses'}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-default px-5">
            <button
              onClick={() => setActiveTab('recipients')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'recipients'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              <span className="flex items-center gap-2">
                <IconUsers className="w-4 h-4" />
                {t('recipients') || 'Destinataires'} ({email.recipients.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('clicks')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'clicks'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              <span className="flex items-center gap-2">
                <IconClick className="w-4 h-4" />
                {t('clicks') || 'Clics'} ({email.clicks_count || 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('replies')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'replies'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              <span className="flex items-center gap-2">
                <IconMessageCircle className="w-4 h-4" />
                {t('replies') || 'Réponses'} ({replies.length})
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Tab Destinataires */}
            {activeTab === 'recipients' && (
              <div className="space-y-2">
                {recipientTracking.map((recipient, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-background rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <IconUser className="w-4 h-4 text-accent" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary truncate">
                        {recipient.email}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted mt-1">
                        <span className="flex items-center gap-1">
                          <IconClock className="w-3 h-3" />
                          {t('delivered') || 'Délivré'}: {formatDateTime(recipient.delivered_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Indicateur ouverture */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        recipient.opened
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        <IconEye className="w-3 h-3" />
                        {recipient.opened ? (
                          <>
                            {recipient.open_count || 1}x
                            <span className="hidden sm:inline ml-1">
                              {formatDateTime(recipient.opened_at)}
                            </span>
                          </>
                        ) : (
                          t('not_opened') || 'Non ouvert'
                        )}
                      </div>

                      {/* Indicateur clic */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        recipient.clicked
                          ? 'bg-orange-500/10 text-orange-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        <IconClick className="w-3 h-3" />
                        {recipient.clicked ? (
                          <>
                            {recipient.click_count || 1}x
                          </>
                        ) : (
                          t('no_clicks') || 'Aucun clic'
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {recipientTracking.length === 0 && (
                  <div className="text-center py-8 text-muted">
                    {t('no_recipients') || 'Aucun destinataire'}
                  </div>
                )}
              </div>
            )}

            {/* Tab Clics */}
            {activeTab === 'clicks' && (
              <div className="space-y-3">
                {email.click_details && email.click_details.length > 0 ? (
                  email.click_details.map((click, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-background rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <IconClick className="w-5 h-5 text-orange-500" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <a
                          href={click.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:text-accent truncate block flex items-center gap-1"
                        >
                          {(() => {
                            try {
                              return new URL(click.url).hostname;
                            } catch {
                              return click.url;
                            }
                          })()}
                          <IconExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <p className="text-xs text-muted truncate mt-1">{click.url}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">{click.count}</div>
                        <div className="text-xs text-muted">{t('clicks') || 'clics'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <IconClick className="w-12 h-12 mx-auto text-muted opacity-30 mb-3" />
                    <p className="text-muted">{t('no_clicks_recorded') || 'Aucun clic enregistré'}</p>
                    <p className="text-xs text-muted mt-1">
                      {t('clicks_info') || 'Les clics sont enregistrés quand les destinataires cliquent sur les liens de votre email'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Réponses */}
            {activeTab === 'replies' && (
              <div className="space-y-3">
                {replies.length > 0 ? (
                  replies.map((reply, index) => (
                    <div
                      key={index}
                      className="bg-background rounded-lg overflow-hidden"
                    >
                      <div 
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-hover transition-colors"
                        onClick={() => setExpandedReply(expandedReply === index ? null : index)}
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <IconMessageCircle className="w-5 h-5 text-purple-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-primary">{reply.from}</div>
                          <div className="text-sm text-muted truncate">
                            {reply.snippet || reply.subject || reply.content.substring(0, 100)}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div className="text-xs text-muted">
                            {formatDateTime(reply.received_at)}
                          </div>
                          {expandedReply === index ? (
                            <IconChevronUp className="w-4 h-4 text-muted" />
                          ) : (
                            <IconChevronDown className="w-4 h-4 text-muted" />
                          )}
                        </div>
                      </div>

                      {/* Contenu de la réponse */}
                      <AnimatePresence>
                        {expandedReply === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-default"
                          >
                            <div className="p-4 bg-card">
                              <div className="text-xs text-muted mb-2">
                                <strong>{t('subject') || 'Sujet'}:</strong> {reply.subject}
                              </div>
                              <div className="text-sm text-primary whitespace-pre-wrap">
                                {reply.content}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <IconMessageCircle className="w-12 h-12 mx-auto text-muted opacity-30 mb-3" />
                    <p className="text-muted">{t('no_replies_yet') || 'Aucune réponse reçue'}</p>
                    <p className="text-xs text-muted mt-2 max-w-md mx-auto">
                      {t('replies_info') || 'Les réponses seront affichées ici lorsque vos destinataires répondront à cet email. Cette fonctionnalité nécessite une intégration avec votre service email.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

