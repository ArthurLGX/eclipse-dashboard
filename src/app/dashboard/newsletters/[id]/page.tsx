'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { fetchNewsletterById, fetchEmailSignature } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  IconArrowLeft,
  IconMail,
  IconSend,
  IconCalendar,
  IconUser,
  IconUsers,
  IconTemplate,
  IconClock,
  IconLoader2,
  IconEye,
} from '@tabler/icons-react';
import MailboxPreview from '@/app/components/MailboxPreview';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import type { CreateEmailSignatureData } from '@/types';

// Types
interface Subscriber {
  id: number;
  documentId: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Newsletter {
  id: number;
  documentId: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  send_at: string | null;
  n_status: 'draft' | 'sent';
  template: 'standard' | 'promotional' | 'announcement' | 'custom';
  author: {
    id: number;
    documentId: string;
    username: string;
    email: string;
  } | null;
  subscribers: Subscriber[];
}

// Composant pour afficher une info avec icône
function InfoCard({ 
  icon, 
  label, 
  value, 
  className = '' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 p-4 bg-muted rounded-xl border border-default ${className}`}>
      <div className="p-2 rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
        <div className="text-primary font-medium">{value}</div>
      </div>
    </div>
  );
}

// Composant pour le badge de statut
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const config = {
    sent: { bg: 'bg-accent/10', text: 'text-accent', label: t('sent') || 'Envoyée' },
    draft: { bg: 'bg-warning/10', text: 'text-warning', label: t('draft') || 'Brouillon' },
  };
  
  const style = config[status as keyof typeof config] || config.draft;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
      {status === 'sent' ? <IconSend className="w-3.5 h-3.5" /> : <IconMail className="w-3.5 h-3.5" />}
      {style.label}
    </span>
  );
}

// Composant pour le badge de template
function TemplateBadge({ template, t }: { template: string; t: (key: string) => string }) {
  const labels: Record<string, string> = {
    standard: t('template_standard') || 'Standard',
    promotional: t('template_promotional') || 'Promotionnel',
    announcement: t('template_announcement') || 'Annonce',
    custom: t('template_custom') || 'Personnalisé',
  };
  
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-info/10 text-info">
      <IconTemplate className="w-3.5 h-3.5" />
      {labels[template] || template}
    </span>
  );
}

// Composant pour afficher un subscriber
function SubscriberItem({ subscriber }: { subscriber: Subscriber }) {
  // Déterminer le nom à afficher
  const displayName = subscriber.first_name || subscriber.last_name
    ? `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
    : null;
  
  // Générer les initiales (du nom si disponible, sinon des 2 premières lettres de l'email)
  const getInitials = () => {
    if (subscriber.first_name) {
      return subscriber.last_name 
        ? `${subscriber.first_name[0]}${subscriber.last_name[0]}`.toUpperCase()
        : subscriber.first_name[0].toUpperCase();
    }
    // Initiales basées sur l'email (avant @)
    const emailName = subscriber.email.split('@')[0];
    return emailName.length >= 2 
      ? `${emailName[0]}${emailName[1]}`.toUpperCase()
      : emailName[0].toUpperCase();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-default hover:border-accent/30 transition-colors">
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
        {getInitials()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary truncate">
          {displayName || subscriber.email}
        </p>
        {displayName && (
          <p className="text-sm text-muted truncate">{subscriber.email}</p>
        )}
      </div>
    </div>
  );
}


export default function NewsletterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const newsletterId = params.id as string;
  
  // Mettre à jour le titre de l'onglet avec le titre de la newsletter
  useDocumentTitle(newsletter?.title, { prefix: 'Newsletter' });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !newsletterId) return;

      try {
        setLoading(true);
        setError(null);
        
        // Charger la newsletter et la signature en parallèle
        const [newsletterResponse, signature] = await Promise.all([
          fetchNewsletterById(newsletterId),
          fetchEmailSignature(user.id),
        ]);
        
        setNewsletter(newsletterResponse.data);
        
        if (signature) {
          setSignatureData({
            company_name: signature.company_name || '',
            sender_name: signature.sender_name || '',
            sender_title: signature.sender_title || '',
            phone: signature.phone || '',
            website: signature.website || '',
            address: signature.address || '',
            linkedin_url: signature.linkedin_url || '',
            twitter_url: signature.twitter_url || '',
            instagram_url: signature.instagram_url || '',
            facebook_url: signature.facebook_url || '',
            logo_url: signature.logo_url || '',
            banner_url: signature.banner_url || '',
            banner_link: signature.banner_link || '',
            banner_alt: signature.banner_alt || '',
            logo_size: signature.logo_size || 100,
            primary_color: signature.primary_color || '#10b981',
            text_color: signature.text_color || '#333333',
            secondary_color: signature.secondary_color || '#666666',
            font_family: signature.font_family || 'Inter',
            social_links: signature.social_links || [],
          });
        }
      } catch (err) {
        console.error('Error fetching newsletter:', err);
        setError(t('newsletter_not_found') || 'Newsletter non trouvée');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, newsletterId, t]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-page">
        {/* Header */}
        <div className="bg-card border-b border-default sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/newsletters')}
                className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors"
              >
                <IconArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0 items-center justify-start">
                <h1 className="text-xl font-bold text-primary truncate items-center justify-start w-fit">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <IconLoader2 className="w-5 h-5 animate-spin" />
                      {t('loading') || 'Chargement...'}
                    </span>
                  ) : newsletter?.title || t('newsletter_detail') || 'Détail Newsletter'}
                </h1>
              </div>
              {newsletter && (
                <div className="flex items-center gap-2">
                  <StatusBadge status={newsletter.n_status} t={t} />
                  <TemplateBadge template={newsletter.template} t={t} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <IconLoader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
                <p className="text-muted">{t('loading_newsletter') || 'Chargement de la newsletter...'}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <IconMail className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-primary font-medium mb-2">{error}</p>
                <button
                  onClick={() => router.push('/dashboard/newsletters')}
                  className="text-accent hover:underline"
                >
                  {t('back_to_newsletters') || 'Retour aux newsletters'}
                </button>
              </div>
            </div>
          ) : newsletter ? (
            <div className="space-y-8">
              {/* Top section: Info + Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content - Left side */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Info cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard
                      icon={<IconMail className="w-5 h-5" />}
                      label={t('subject') || 'Sujet'}
                      value={newsletter.subject}
                    />
                    <InfoCard
                      icon={<IconCalendar className="w-5 h-5" />}
                      label={t('sent_at') || 'Date d\'envoi'}
                      value={formatDate(newsletter.send_at)}
                    />
                    <InfoCard
                      icon={<IconUser className="w-5 h-5" />}
                      label={t('author') || 'Auteur'}
                      value={newsletter.author?.username || newsletter.author?.email || '-'}
                    />
                    <InfoCard
                      icon={<IconUsers className="w-5 h-5" />}
                      label={t('recipients_count') || 'Destinataires'}
                      value={`${newsletter.subscribers?.length || 0} ${t('contacts') || 'contacts'}`}
                    />
                  </div>

                  {/* Metadata */}
                  <div className="bg-card rounded-xl border border-default p-4">
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <div className="flex items-center gap-1.5">
                        <IconClock className="w-4 h-4" />
                        <span>{t('created_at') || 'Créée le'}: {formatDate(newsletter.createdAt)}</span>
                      </div>
                      <div className="w-px h-4 bg-default" />
                      <div className="flex items-center gap-1.5">
                        <IconClock className="w-4 h-4" />
                        <span>{t('updated_at') || 'Modifiée le'}: {formatDate(newsletter.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar - Right side */}
                <div className="space-y-6">
                  {/* Subscribers list */}
                  <div className="bg-card rounded-xl border border-default overflow-hidden">
                    <div className="p-4 border-b border-default bg-muted/30">
                      <h2 className="font-semibold text-primary flex items-center gap-2">
                        <IconUsers className="w-5 h-5 text-accent" />
                        {t('subscribers') || 'Destinataires'}
                        <span className="ml-auto px-2 py-0.5 bg-accent/10 text-accent text-sm rounded-full">
                          {newsletter.subscribers?.length || 0}
                        </span>
                      </h2>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                      {newsletter.subscribers && newsletter.subscribers.length > 0 ? (
                        newsletter.subscribers.map((subscriber) => (
                          <SubscriberItem key={subscriber.id} subscriber={subscriber} />
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted">
                          <IconUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>{t('no_subscribers') || 'Aucun destinataire'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="bg-active-border rounded-xl p-6 border border-input">
                    <h3 className="font-semibold text-primary mb-4">{t('quick_stats') || 'Statistiques rapides'}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-secondary">{t('total_recipients') || 'Total destinataires'}</span>
                        <span className="font-bold text-primary">{newsletter.subscribers?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary">{t('status') || 'Statut'}</span>
                        <StatusBadge status={newsletter.n_status} t={t} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary">{t('template') || 'Template'}</span>
                        <TemplateBadge template={newsletter.template} t={t} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Preview Section - Mailbox Simulation */}
              <div className="bg-card rounded-xl border border-default overflow-hidden">
                <div className="p-4 border-b border-default bg-muted/30">
                  <h2 className="font-semibold text-primary flex items-center gap-2">
                    <IconEye className="w-5 h-5 text-accent" />
                    {t('email_preview') || 'Aperçu de l\'email'}
                  </h2>
                </div>
                <div className="p-6 bg-page">
                  <MailboxPreview
                    newsletter={{
                      title: newsletter.title,
                      subject: newsletter.subject,
                      content: newsletter.content,
                      template: newsletter.template,
                      send_at: newsletter.send_at,
                      author: newsletter.author,
                    }}
                    signatureData={signatureData}
                    fontFamily={signatureData?.font_family}
                    translations={{
                      inbox: t('inbox') || 'Boîte de réception',
                      favorites: t('favorites') || 'Favoris',
                      sent_folder: t('sent_folder') || 'Envoyés',
                      archives: t('archives') || 'Archives',
                      trash: t('trash') || 'Corbeille',
                      search_placeholder: t('search_placeholder') || 'Rechercher...',
                      now: t('now') || 'Maintenant',
                      to_me: t('to_me') || 'à moi',
                      no_content: t('no_content') || 'Aucun contenu',
                      special_offer: t('special_offer') || 'Offre Spéciale',
                      unsubscribe: t('unsubscribe') || 'Se désabonner',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}

