'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { fetchNewsletterById, fetchEmailSignature, deleteNewsletter } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  IconArrowLeft,
  IconMail,
  IconSend,
  IconUsers,
  IconTemplate,
  IconClock,
  IconLoader2,
  IconEye,
  IconCopy,
  IconDownload,
  IconPencil,
  IconTrash,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconFileText,
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
  n_status: 'draft' | 'sent' | 'scheduled';
  template: 'standard' | 'promotional' | 'announcement' | 'custom';
  author: {
    id: number;
    documentId: string;
    username: string;
    email: string;
  } | null;
  subscribers: Subscriber[];
}

// Status & template labels
const TEMPLATE_LABELS: Record<string, string> = {
  standard: 'Standard',
  promotional: 'Promotionnel',
  announcement: 'Annonce',
  custom: 'Personnalisé',
};

function StatusPill({ status, t }: { status: string; t: (key: string) => string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    sent: { bg: 'bg-[#EBF5EF]', text: 'text-[#2A6B47]', label: t('sent') || 'Envoyée' },
    draft: { bg: 'bg-[#FEF5E5]', text: 'text-[#9B6B18]', label: t('draft') || 'Brouillon' },
    scheduled: { bg: 'bg-[#EEF3FF]', text: 'text-[#2B5CB8]', label: t('scheduled') || 'Planifiée' },
  };
  const style = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

function SubscriberItem({ subscriber }: { subscriber: Subscriber }) {
  const displayName = subscriber.first_name || subscriber.last_name
    ? `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
    : null;
  const initials = subscriber.first_name
    ? (subscriber.last_name ? `${subscriber.first_name[0]}${subscriber.last_name[0]}` : subscriber.first_name[0]).toUpperCase()
    : subscriber.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2 py-2.5 px-3 border-b border-[rgba(28,24,16,0.08)] last:border-b-0">
      <div className="w-7 h-7 rounded-full bg-[#F2F0EB] border border-[rgba(28,24,16,0.08)] flex items-center justify-center text-[10px] font-medium text-[#6B6450] flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#1C1810] truncate">{displayName || subscriber.email}</p>
        {displayName && <p className="text-[10px] text-[#A09680] truncate">{subscriber.email}</p>}
      </div>
      {subscriber.email && <span className="w-1.5 h-1.5 rounded-full bg-[#2A6B47] flex-shrink-0" />}
    </div>
  );
}

export default function NewsletterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [deleting, setDeleting] = useState(false);

  const newsletterId = params.id as string;

  useDocumentTitle(newsletter?.title, { prefix: 'Newsletter' });

  const fetchData = useCallback(async () => {
    if (!user?.id || !newsletterId) return;
    try {
      setLoading(true);
      setError(null);
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
  }, [user?.id, newsletterId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(',', ', ');
  };

  const handleDelete = async () => {
    if (!newsletter?.documentId || !confirm(t('confirm_delete_newsletter') || 'Supprimer définitivement cette newsletter ?')) return;
    try {
      setDeleting(true);
      await deleteNewsletter(newsletter.documentId);
      showGlobalPopup?.(t('newsletter_deleted') || 'Newsletter supprimée', 'success');
      router.push('/dashboard/newsletters');
    } catch (err) {
      showGlobalPopup?.((err as Error).message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportHtml = () => {
    if (!newsletter) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${newsletter.title}</title></head><body>${newsletter.content || ''}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${newsletter.title.replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showGlobalPopup?.(t('export_started') || 'Export téléchargé', 'success');
  };

  const handleDuplicate = () => {
    if (!newsletter) return;
    router.push(`/dashboard/newsletters/compose?duplicate=${newsletter.documentId}`);
  };

  const handleEdit = () => {
    if (!newsletter) return;
    router.push(`/dashboard/newsletters/compose?edit=${newsletter.documentId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
          <div className="text-center">
            <IconLoader2 className="w-12 h-12 animate-spin text-[#6B6450] mx-auto mb-4" />
            <p className="text-[13px] text-[#6B6450]">{t('loading_newsletter') || 'Chargement...'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
          <div className="text-center">
            <IconMail className="w-12 h-12 text-[#A09680] mx-auto mb-4" />
            <p className="font-medium text-[#1C1810] mb-2">{error}</p>
            <button onClick={() => router.push('/dashboard/newsletters')} className="text-[#2B5CB8] hover:underline text-sm">
              {t('back_to_newsletters') || 'Retour aux newsletters'}
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!newsletter) return null;

  const recipientCount = newsletter.subscribers?.length || 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F5F3EE] flex flex-col">
        {/* Top Nav */}
        <nav className="h-[52px] bg-white border-b border-[rgba(28,24,16,0.08)] flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push('/dashboard/newsletters')}
              className="w-8 h-8 rounded-md border border-[rgba(28,24,16,0.14)] flex items-center justify-center text-[#6B6450] hover:bg-[#F5F3EE] hover:text-[#1C1810] transition-colors"
              title={t('back') || 'Retour'}
            >
              <IconArrowLeft className="w-3.5 h-3.5" stroke={1.8} />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#A09680]">
              <span>Newsletters</span>
              <span>›</span>
              <span className="text-[#1C1810] font-medium truncate max-w-[180px]">{newsletter.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExportHtml} className="h-8 px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-xs text-[#6B6450] flex items-center gap-1.5 hover:bg-[#F5F3EE] hover:text-[#1C1810]">
              <IconDownload className="w-3 h-3" stroke={1.5} /> Exporter
            </button>
            <button onClick={handleDuplicate} className="h-8 px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-xs text-[#6B6450] flex items-center gap-1.5 hover:bg-[#F5F3EE] hover:text-[#1C1810]">
              <IconCopy className="w-3 h-3" stroke={1.5} /> Dupliquer
            </button>
            <button onClick={handleEdit} className="h-8 px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-xs text-[#6B6450] flex items-center gap-1.5 hover:bg-[#F5F3EE] hover:text-[#1C1810]">
              <IconPencil className="w-3 h-3" stroke={1.5} /> Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 px-3.5 rounded-md border border-[rgba(181,58,42,0.25)] text-xs text-[#B53A2A] flex items-center gap-1.5 hover:bg-[#FDECEA] hover:border-[rgba(181,58,42,0.4)] disabled:opacity-50"
            >
              <IconTrash className="w-3 h-3" stroke={1.5} /> {deleting ? '...' : 'Supprimer'}
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="bg-white border-b border-[rgba(28,24,16,0.08)] px-8 py-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <StatusPill status={newsletter.n_status} t={t} />
                <span className="h-[22px] px-2.5 rounded-full text-[11px] text-[#A09680] bg-[#F9F8F5] border border-[rgba(28,24,16,0.08)] inline-flex items-center gap-1">
                  <IconTemplate className="w-2.5 h-2.5" stroke={1.4} />
                  {TEMPLATE_LABELS[newsletter.template] || newsletter.template}
                </span>
              </div>
              <h1 className="font-serif text-[32px] font-normal text-[#1C1810] tracking-tight leading-tight mb-1.5">
                {newsletter.title}
              </h1>
              <p className="text-[13px] text-[#6B6450]">
                Objet : <span className="text-[#1C1810] font-medium">{newsletter.subject}</span>
              </p>
            </div>
            {newsletter.n_status === 'sent' && (
              <button className="h-8 px-3.5 rounded-md bg-[#1C1810] text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 shrink-0">
                <IconSend className="w-3 h-3" stroke={1.8} /> Renvoyer
              </button>
            )}
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-[#6B6450]">
              <IconMail className="w-3.5 h-3.5 text-[#A09680]" stroke={1.4} />
              {newsletter.send_at
                ? <>Envoyée le <strong className="text-[#1C1810] ml-0.5">{formatDate(newsletter.send_at)}</strong></>
                : <>Créée le <strong className="text-[#1C1810] ml-0.5">{formatDate(newsletter.createdAt)}</strong></>
              }
            </div>
            <div className="w-px h-3.5 bg-[rgba(28,24,16,0.14)]" />
            <div className="flex items-center gap-2 text-xs text-[#6B6450]">
              <IconUsers className="w-3.5 h-3.5 text-[#A09680]" stroke={1.4} />
              Auteur : <strong className="text-[#1C1810] ml-0.5">{newsletter.author?.username || newsletter.author?.email || '-'}</strong>
            </div>
            <div className="w-px h-3.5 bg-[rgba(28,24,16,0.14)]" />
            <div className="flex items-center gap-2 text-xs text-[#6B6450]">
              <IconClock className="w-3.5 h-3.5 text-[#A09680]" stroke={1.4} />
              Créée le {formatShortDate(newsletter.createdAt)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
          {/* Main */}
          <div className="p-7 pr-8 border-r border-[rgba(28,24,16,0.08)] flex flex-col gap-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] p-4 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2A6B47]" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#A09680] mb-2">Taux d&apos;ouverture</p>
                <p className="font-serif text-[28px] font-normal text-[#1C1810] leading-none mb-1">—</p>
                <p className="text-[11px] text-[#A09680]">0 ouverture · {recipientCount} destinataires</p>
                <div className="mt-2.5 h-1 bg-[#F2F0EB] rounded overflow-hidden">
                  <div className="h-full bg-[#2A6B47] rounded transition-[width] duration-500" style={{ width: 0 }} />
                </div>
              </div>
              <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] p-4 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2B5CB8]" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#A09680] mb-2">Taux de clic</p>
                <p className="font-serif text-[28px] font-normal text-[#1C1810] leading-none mb-1">—</p>
                <p className="text-[11px] text-[#A09680]">0 clic sur les liens</p>
                <div className="mt-2.5 h-1 bg-[#F2F0EB] rounded overflow-hidden">
                  <div className="h-full bg-[#2B5CB8] rounded transition-[width] duration-500" style={{ width: 0 }} />
                </div>
              </div>
              <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] p-4 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#D4921A]" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#A09680] mb-2">Destinataires</p>
                <p className="font-serif text-[28px] font-normal text-[#1C1810] leading-none mb-1">{recipientCount}</p>
                <p className="text-[11px] text-[#A09680]">Contacts touchés</p>
                <div className="mt-2.5 h-1 bg-[#F2F0EB] rounded overflow-hidden">
                  <div className="h-full bg-[#D4921A] rounded transition-[width] duration-500" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Info section */}
            <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] overflow-hidden">
              <div className="flex items-center justify-between py-3.5 px-4 border-b border-[rgba(28,24,16,0.08)]">
                <h3 className="text-[13px] font-medium text-[#1C1810] flex items-center gap-2">
                  <IconFileText className="w-3.5 h-3.5 text-[#A09680]" stroke={1.4} /> Informations
                </h3>
                <button onClick={handleEdit} className="text-[11px] text-[#2B5CB8] font-medium hover:underline cursor-pointer">Modifier →</button>
              </div>
              <div className="grid grid-cols-2">
                {[
                  { label: "Objet de l'email", val: newsletter.subject },
                  { label: 'Template', val: TEMPLATE_LABELS[newsletter.template] || newsletter.template },
                  { label: 'Auteur', val: newsletter.author?.username || newsletter.author?.email || '-' },
                  { label: 'Statut', val: <StatusPill status={newsletter.n_status} t={t} /> },
                  { label: 'Créée le', val: formatShortDate(newsletter.createdAt), muted: true },
                  { label: 'Mise à jour le', val: formatShortDate(newsletter.updatedAt), muted: true },
                ].map(({ label, val, muted }) => (
                  <div key={label} className="py-3 px-4 border-b border-r border-[rgba(28,24,16,0.08)] last:border-b-0 [&:nth-child(2n)]:border-r-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A09680] mb-1">{label}</p>
                    <div className={`text-[13px] ${muted ? 'text-[#6B6450] font-normal' : 'text-[#1C1810] font-medium'}`}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Preview */}
            <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] overflow-hidden">
              <div className="flex items-center justify-between py-3.5 px-4 border-b border-[rgba(28,24,16,0.08)]">
                <h3 className="text-[13px] font-medium text-[#1C1810] flex items-center gap-2">
                  <IconEye className="w-3.5 h-3.5 text-[#A09680]" stroke={1.4} /> Aperçu de l&apos;email
                </h3>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`h-6 px-2.5 rounded-md border text-[11px] flex items-center gap-1.5 transition-colors ${previewDevice === 'desktop' ? 'bg-[#1C1810] text-white border-[#1C1810]' : 'border-[rgba(28,24,16,0.14)] text-[#A09680] hover:bg-[#F5F3EE]'}`}
                  >
                    <IconDeviceDesktop className="w-2.5 h-2.5" stroke={1.4} /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`h-6 px-2.5 rounded-md border text-[11px] flex items-center gap-1.5 transition-colors ${previewDevice === 'mobile' ? 'bg-[#1C1810] text-white border-[#1C1810]' : 'border-[rgba(28,24,16,0.14)] text-[#A09680] hover:bg-[#F5F3EE]'}`}
                  >
                    <IconDeviceMobile className="w-2.5 h-2.5" stroke={1.4} /> Mobile
                  </button>
                </div>
              </div>
              <div className="bg-[#F9F8F5] border-b border-[rgba(28,24,16,0.08)] py-2.5 px-4 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FF6057]" />
                  <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
                </div>
                <div className="flex-1 bg-white border border-[rgba(28,24,16,0.08)] rounded-md h-[22px] px-2.5 flex items-center text-[10px] text-[#A09680]">mail.google.com</div>
                <span className="text-[10px] text-[#A09680]">Aperçu boîte mail</span>
              </div>
              <div className="p-4 flex justify-center">
                <div className={`w-full bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)] ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-[560px]'}`}>
                  <div className="h-[500px] overflow-auto">
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
            </div>

            {/* Timeline */}
            <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] overflow-hidden">
              <div className="py-3.5 px-4 border-b border-[rgba(28,24,16,0.08)]">
                <h3 className="text-[13px] font-medium text-[#1C1810] flex items-center gap-2">
                  <IconClock className="w-3.5 h-3.5 text-[#A09680]" stroke={1.4} /> Historique
                </h3>
              </div>
              <div className="py-4 px-4 flex flex-col gap-0">
                {[
                  { label: 'Newsletter créée', time: formatShortDate(newsletter.createdAt), done: true },
                  ...(newsletter.send_at ? [{ label: 'Envoi déclenché via SMTP', time: formatShortDate(newsletter.send_at), done: true }] : []),
                  ...(newsletter.n_status === 'sent' ? [{ label: 'Statut mis à jour → Envoyée', time: formatShortDate(newsletter.updatedAt), done: true }] : []),
                  { label: 'En attente de statistiques de tracking…', time: 'Pixel & liens wrappés actifs', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                    <div className="flex flex-col items-center w-5 shrink-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${item.done ? 'bg-[#2A6B47]' : 'bg-[rgba(28,24,16,0.14)]'}`} />
                      {i < 3 && <div className="flex-1 w-px bg-[rgba(28,24,16,0.08)] mt-0.5" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-xs font-medium ${item.done ? 'text-[#1C1810]' : 'text-[#A09680]'}`}>{item.label}</p>
                      <p className="text-[11px] text-[#A09680] mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="p-6 flex flex-col gap-4 lg:min-w-[300px]">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#A09680] mb-2.5 flex items-center justify-between">
                Destinataires <span className="font-semibold text-[#1C1810] text-xs normal-case tracking-normal">{recipientCount}</span>
              </h3>
              {recipientCount > 0 ? (
                <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] overflow-hidden">
                  {newsletter.subscribers.map((s) => (
                    <SubscriberItem key={s.id} subscriber={s} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-7 px-4 bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px]">
                  <IconUsers className="w-7 h-7 text-[rgba(28,24,16,0.24)]" stroke={1.2} />
                  <p className="text-xs text-[#A09680] text-center">Aucun destinataire<br />enregistré pour cette newsletter</p>
                  <button onClick={handleEdit} className="mt-1 text-[11px] h-8 px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-[#6B6450] hover:bg-[#F5F3EE] hover:text-[#1C1810]">
                    + Ajouter
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#A09680] mb-2.5">Statistiques rapides</h3>
              <div className="bg-white border border-[rgba(28,24,16,0.08)] rounded-[14px] overflow-hidden">
                {[
                  { key: 'Total destinataires', val: String(recipientCount), icon: IconUsers },
                  { key: 'Ouvertures', val: '—', icon: IconMail, muted: true },
                  { key: 'Clics', val: '—', icon: IconSend, muted: true },
                  { key: 'Statut', val: <StatusPill status={newsletter.n_status} t={t} />, icon: IconFileText },
                  { key: 'Template', val: TEMPLATE_LABELS[newsletter.template] || newsletter.template, icon: IconClock, small: true },
                ].map(({ key, val, icon: Icon, muted, small }) => (
                  <div key={key} className="flex items-center justify-between py-2.5 px-3.5 border-b border-[rgba(28,24,16,0.08)] last:border-b-0">
                    <span className="text-xs text-[#6B6450] flex items-center gap-1.5">
                      <Icon className="w-3 h-3 text-[#A09680]" stroke={1.4} /> {key}
                    </span>
                    <span className={`text-xs font-medium ${muted ? 'text-[#A09680]' : 'text-[#1C1810]'} ${small ? 'text-[11px]' : ''}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#A09680] mb-2.5">Actions</h3>
              <div className="flex flex-col gap-1.5">
                <button onClick={handleDuplicate} className="w-full h-[34px] px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-xs text-[#6B6450] flex items-center gap-2 hover:bg-[#F5F3EE] hover:text-[#1C1810]">
                  <IconCopy className="w-3.5 h-3.5" stroke={1.4} /> Dupliquer la newsletter
                </button>
                <button onClick={handleExportHtml} className="w-full h-[34px] px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-xs text-[#6B6450] flex items-center gap-2 hover:bg-[#F5F3EE] hover:text-[#1C1810]">
                  <IconDownload className="w-3.5 h-3.5" stroke={1.4} /> Exporter le HTML
                </button>
                <button onClick={handleEdit} className="w-full h-[34px] px-3 rounded-md border border-[rgba(28,24,16,0.14)] text-xs text-[#6B6450] flex items-center gap-2 hover:bg-[#F5F3EE] hover:text-[#1C1810]">
                  <IconPencil className="w-3.5 h-3.5" stroke={1.4} /> Modifier le brouillon
                </button>
                <button onClick={handleDelete} disabled={deleting} className="w-full h-[34px] px-3 rounded-md border border-[rgba(181,58,42,0.25)] text-xs text-[#B53A2A] flex items-center gap-2 hover:bg-[#FDECEA] hover:border-[rgba(181,58,42,0.4)] disabled:opacity-50">
                  <IconTrash className="w-3.5 h-3.5" stroke={1.4} /> Supprimer
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  );
}
