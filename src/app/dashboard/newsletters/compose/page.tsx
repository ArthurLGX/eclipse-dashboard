'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconSend,
  IconCheck,
  IconChevronRight,
  IconEye,
  IconLoader2,
  IconNews,
  IconSparkles,
  IconSpeakerphone,
  IconPalette,
  IconCirclePlus,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useClients, useCompany } from '@/hooks/useApi';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useDraftSave } from '@/hooks/useDraftSave';
import {
  fetchSmtpConfig,
  fetchEmailSignature,
  fetchUserCustomTemplates,
  createNewsletter,
  findOrCreateSubscriber,
} from '@/lib/api';
import type { CustomTemplate, CreateEmailSignatureData, SmtpConfig } from '@/types';
import type { Client } from '@/types';

type TemplateType = 'standard' | 'promotional' | 'announcement' | 'custom';
type Step = 0 | 1 | 2 | 3;

const STEPS = [
  { id: 0, name: 'Template', desc: 'Style et thème' },
  { id: 1, name: 'Contenu', desc: 'Titre, corps, CTA' },
  { id: 2, name: 'Destinataires', desc: 'Clients et emails' },
  { id: 3, name: 'Envoi', desc: 'Vérifier et envoyer' },
];

const TEMPLATES: { id: TemplateType; name: string; desc: string; tags: string[] }[] = [
  { id: 'standard', name: 'Standard', desc: 'Newsletter classique pour vos mises à jour régulières', tags: ['Design épuré', 'Focus sur le contenu', 'Idéal pour les MàJ'] },
  { id: 'promotional', name: 'Promotionnel', desc: 'Idéal pour annoncer des offres et promotions', tags: ['Badge promo', 'CTA prominent', 'Idéal pour les offres'] },
  { id: 'announcement', name: 'Annonce', desc: 'Pour les grandes nouvelles et annonces importantes', tags: ['Impact visuel fort', 'Message centré', 'Idéal pour les événements'] },
  { id: 'custom', name: 'Personnalisé', desc: 'Créez votre propre design depuis zéro', tags: ['Liberté totale', 'Sans contrainte', 'Design unique'] },
];

// Convert plain text to HTML for email
function textToHtml(text: string): string {
  if (!text.trim()) return '';
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Generate email HTML (simplified - core structure preserved)
function generateEmailHtml(params: {
  templateId: TemplateType;
  title: string;
  content: string;
  ctaText: string;
  ctaUrl: string;
  bannerUrl: string;
  signature: CreateEmailSignatureData | null;
  footer: { firstName: string; lastName: string; email: string; phone?: string; website?: string; customText?: string };
  companyLogo?: string;
  profilePic?: string;
  translations: Record<string, string>;
}): string {
  const { templateId, title, content, ctaText, ctaUrl, bannerUrl, signature, footer, companyLogo, profilePic, translations } = params;
  const isPromo = templateId === 'promotional';
  const isAnnouncement = templateId === 'announcement';
  const base = process.env.NEXT_PUBLIC_STRAPI_URL || '';
  const toAbs = (url: string) => (!url || url.startsWith('http')) ? url : (url.startsWith('/') ? base + url : base + '/' + url);

  const primary = signature?.primary_color || '#10b981';
  const sigText = signature?.text_color || '#333333';
  const sigSecondary = signature?.secondary_color || '#666666';

  let headerStyle = 'background: linear-gradient(135deg, #8B9DC3, #A8B5D4);';
  if (templateId === 'promotional') headerStyle = 'background: linear-gradient(135deg, #7BB8E0, #9DCEF0);';
  if (templateId === 'announcement') headerStyle = 'background: linear-gradient(135deg, #9DD1CA, #B5DDD8);';

  const footerHtml = signature && (signature.sender_name || signature.company_name || signature.logo_url)
    ? `
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${signature.logo_url ? `<td valign="top" style="padding-right:12px"><img src="${toAbs(signature.logo_url)}" alt="" style="width:${signature.logo_size || 100}px;height:${signature.logo_size || 100}px;object-fit:contain;border-radius:8px"></td>` : ''}
        <td valign="top">
          ${signature.sender_name ? `<div style="font-weight:bold;font-size:16px;color:${sigText}">${signature.sender_name}</div>` : ''}
          ${signature.sender_title ? `<div style="color:${sigSecondary};margin-bottom:6px;font-size:14px">${signature.sender_title}</div>` : ''}
          ${signature.company_name ? `<div style="font-weight:600;color:${primary};margin-bottom:4px">${signature.company_name}</div>` : ''}
          <div style="font-size:13px;color:${sigSecondary}">
            ${signature.phone ? `<div>📞 ${signature.phone}</div>` : ''}
            ${signature.website ? `<div>🌐 <a href="${signature.website}" style="color:${primary};text-decoration:none">${signature.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
          </div>
        </td>
      </tr></table>
      <p style="margin:16px 0 0 0;text-align:center;color:#9ca3af;font-size:12px"><a href="#" style="color:#9ca3af;text-decoration:underline">${translations.unsubscribe || 'Se désabonner'}</a></p>
    `
    : `
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="80" valign="top">
          ${companyLogo ? `<img src="${toAbs(companyLogo)}" alt="Logo" style="width:64px;height:64px;border-radius:8px;object-fit:cover">` : profilePic ? `<img src="${toAbs(profilePic)}" alt="" style="width:64px;height:64px;border-radius:8px;object-fit:cover">` : '<div style="width:64px;height:64px;border-radius:8px;background:#e5e7eb"></div>'}
        </td>
        <td valign="top" style="padding-left:16px">
          <p style="margin:0 0 4px 0;font-weight:600;color:#1f2937">${footer.firstName} ${footer.lastName}</p>
          ${footer.email ? `<p style="margin:0 0 2px 0;color:#374151;font-size:14px">✉️ ${footer.email}</p>` : ''}
          ${footer.phone ? `<p style="margin:0 0 2px 0;color:#374151;font-size:14px">📞 ${footer.phone}</p>` : ''}
          ${footer.website ? `<p style="margin:0;color:#374151;font-size:14px">🌐 <a href="${footer.website}" style="color:#3b82f6;text-decoration:none">${footer.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
        </td>
      </tr></table>
      ${footer.customText ? `<p style="margin:16px 0 0 0;padding-top:16px;border-top:1px solid #e5e7eb;color:#374151;font-size:14px">${footer.customText}</p>` : ''}
      <p style="margin:16px 0 0 0;text-align:center;color:#9ca3af;font-size:12px"><a href="#" style="color:#9ca3af;text-decoration:underline">${translations.unsubscribe || 'Se désabonner'}</a></p>
    `;

  const absBanner = bannerUrl ? toAbs(bannerUrl) : (signature?.banner_url ? toAbs(signature.banner_url) : '');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0"><tr><td align="center">
    <table width="700" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
      <tr><td align="center" style="${headerStyle}padding:${isAnnouncement ? '48px' : '32px'} 24px;text-align:center">
        ${isPromo ? `<div style="display:inline-block;padding:4px 16px;background:rgba(255,255,255,0.4);border-radius:20px;color:#1f2937;font-size:14px;font-weight:bold;margin-bottom:16px">🎉 ${translations.special_offer || 'Offre Spéciale'}</div>` : ''}
        <h1 style="margin:0;color:#1f2937;font-size:${isAnnouncement ? '28px' : '24px'};font-weight:bold;text-align:center">${title}</h1>
      </td></tr>
      <tr><td style="padding:32px 24px">
        <div style="color:#374151;font-size:16px;line-height:1.6">${content}</div>
        ${ctaText && ctaUrl ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0"><tr><td align="center"><a href="${ctaUrl}" style="display:inline-block;padding:16px 32px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">${ctaText}${isPromo ? ' →' : ''}</a></td></tr></table>` : ''}
      </td></tr>
      <tr><td style="padding:24px;border-top:1px solid #e5e7eb">${footerHtml}</td></tr>
      ${absBanner ? `<tr><td style="padding:0 24px 24px"><img src="${absBanner}" alt="Banner" style="width:100%;max-height:192px;object-fit:contain;border-radius:8px"></td></tr>` : ''}
    </table>
  </td></tr></table>
</body></html>`;
}

export default function NewsletterComposePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { data: clients = [] } = useClients(user?.id);
  const { data: company } = useCompany(user?.id);

  const [step, setStep] = useState<Step>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('standard');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [recipients, setRecipients] = useState<Array<{ email: string; name?: string; clientId?: number }>>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [signature, setSignature] = useState<CreateEmailSignatureData | null>(null);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  const footer = useMemo(() => ({
    firstName: user?.username?.split(' ')[0] || '',
    lastName: user?.username?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: company?.phoneNumber || '',
    website: company?.website || '',
    customText: '',
  }), [user, company]);

  const companyLogo = company?.logo ? (company.logo.startsWith('http') ? company.logo : `${process.env.NEXT_PUBLIC_STRAPI_URL}${company.logo}`) : undefined;
  const profilePic = user?.profile_picture?.url ? (user.profile_picture.url.startsWith('http') ? user.profile_picture.url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${user.profile_picture.url}`) : undefined;

  const { clearDraft } = useDraftSave({
    draftKey: 'newsletter-compose-draft',
    data: { selectedTemplate, title, subject, preview, body, ctaText, ctaUrl, bannerUrl, recipients },
    onRestore: (d) => {
      if (d.selectedTemplate) setSelectedTemplate(d.selectedTemplate as TemplateType);
      if (d.title) setTitle(d.title as string);
      if (d.subject) setSubject(d.subject as string);
      if (d.preview) setPreview(d.preview as string);
      if (d.body) setBody(d.body as string);
      if (d.ctaText) setCtaText(d.ctaText as string);
      if (d.ctaUrl) setCtaUrl(d.ctaUrl as string);
      if (d.bannerUrl) setBannerUrl(d.bannerUrl as string);
      if (d.recipients) setRecipients(d.recipients as typeof recipients);
    },
    autoSaveDelay: 15000,
  });

  useEffect(() => {
    if (!user?.id) return;
    fetchSmtpConfig(user.id).then(setSmtpConfig).catch(console.error);
    fetchEmailSignature(user.id).then((sig) => sig && setSignature(sig)).catch(console.error);
    fetchUserCustomTemplates(user.id).then(setCustomTemplates).catch(console.error);
  }, [user?.id]);

  const addRecipient = useCallback((email: string, client?: Client) => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) return;
    if (recipients.some(r => r.email.toLowerCase() === e)) return;
    setRecipients(prev => [...prev, {
      email: e,
      name: client?.name,
      clientId: client?.id,
    }]);
    setRecipientInput('');
  }, [recipients]);

  const removeRecipient = useCallback((email: string) => {
    setRecipients(prev => prev.filter(r => r.email.toLowerCase() !== email.toLowerCase()));
  }, []);

  const handleRecipientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(recipientInput);
    }
  };

  const validateContent = () => {
    if (!subject.trim()) return false;
    if (!body.trim()) return false;
    if (ctaText.trim() && !ctaUrl.trim()) return false;
    return true;
  };

  const validateRecipients = () => recipients.length > 0;

  const canGoNext = () => {
    if (step === 0) return true;
    if (step === 1) return validateContent();
    if (step === 2) return validateRecipients();
    return true;
  };

  const goNext = () => {
    if (step < 3 && canGoNext()) setStep((step + 1) as Step);
    else if (step === 3) handleSend();
  };

  const goPrev = () => {
    if (step > 0) setStep((step - 1) as Step);
  };

  const jumpStep = (n: Step) => {
    if (n <= step) setStep(n);
  };

  const handleSend = async () => {
    if (!smtpConfig?.is_verified) {
      showGlobalPopup(t('smtp_not_configured') || 'Configurez votre SMTP avant l\'envoi.', 'error');
      return;
    }
    if (!user?.id) return;
    if (recipients.length === 0) {
      showGlobalPopup(t('please_select_recipient') || 'Sélectionnez au moins un destinataire.', 'error');
      return;
    }

    setSending(true);
    try {
      const subscriberIds: number[] = [];
      for (const r of recipients) {
        const parts = (r.name || '').trim().split(' ');
        try {
          const id = await findOrCreateSubscriber({
            email: r.email,
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' ') || '',
            userId: user.id,
          });
          subscriberIds.push(id);
        } catch (err) {
          console.warn('Subscriber creation failed for', r.email, err);
        }
      }

      const htmlContent = generateEmailHtml({
        templateId: selectedTemplate,
        title: title || subject,
        content: body.includes('<') ? body : textToHtml(body),
        ctaText,
        ctaUrl,
        bannerUrl,
        signature,
        footer,
        companyLogo,
        profilePic,
        translations: {
          special_offer: t('special_offer'),
          unsubscribe: t('unsubscribe'),
        },
      });

      const allRecipients = recipients.map(r => ({
        email: r.email,
        firstName: (r.name || '').split(' ')[0] || '',
        lastName: (r.name || '').split(' ').slice(1).join(' ') || '',
      }));

      const isScheduled = scheduleMode === 'later' && scheduledAt;
      if (!isScheduled) {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/newsletters/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            recipients: allRecipients,
            subject,
            htmlContent,
            textContent: (title || '') + '\n\n' + body.replace(/<[^>]*>/g, ''),
          }),
        });
        const result = await res.json();
        if (!res.ok) console.error('Send failed', result);
      }

      await createNewsletter({
        title: title || subject,
        subject,
        content: body,
        template: selectedTemplate,
        n_status: isScheduled ? 'scheduled' : 'sent',
        send_at: isScheduled ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        author: user.id,
        subscribers: subscriberIds.length ? subscriberIds : undefined,
        banner_url: bannerUrl || undefined,
        cta_text: ctaText || undefined,
        cta_url: ctaUrl || undefined,
        html_content: isScheduled ? htmlContent : undefined,
      });

      clearDraft();
      showGlobalPopup(
        isScheduled
          ? (t('newsletter_scheduled') || `Newsletter planifiée pour le ${new Date(scheduledAt).toLocaleDateString('fr-FR')}`)
          : (t('newsletter_sent_success') || `Newsletter envoyée à ${recipients.length} destinataire${recipients.length > 1 ? 's' : ''}`),
        'success'
      );
      setTimeout(() => { window.location.href = '/dashboard/newsletters'; }, 1200);
    } catch (err) {
      console.error(err);
      showGlobalPopup(t('newsletter_send_error') || 'Erreur lors de l\'envoi.', 'error');
    } finally {
      setSending(false);
    }
  };

  const progressPct = ((step + 1) / 4) * 100;

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#F8F7F4] overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 bg-white border-b border-black/8 px-7 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/newsletters"
              className="w-8 h-8 flex items-center justify-center rounded-md border border-black/13 text-[#6B6860] hover:bg-[#F8F7F4] hover:text-[#1A1917] transition-colors"
            >
              <IconArrowLeft className="w-3.5 h-3.5" stroke={1.8} />
            </Link>
            <div>
              <div className="text-[15px] font-medium text-[#1A1917]">{t('create_newsletter') || 'Créer une newsletter'}</div>
              <div className="text-xs text-[#A09E98] mt-0.5">Étape {step + 1} sur 4</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 px-3.5 rounded-md border border-black/13 bg-transparent text-[#6B6860] text-[13px] flex items-center gap-1.5 hover:bg-[#F8F7F4] hover:text-[#1A1917] transition-colors"
            >
              <IconEye className="w-3.5 h-3.5" stroke={1.5} />
              {t('preview') || 'Aperçu'}
            </button>
          </div>
        </header>

        {/* Progress */}
        <div className="h-0.5 bg-black/8 relative">
          <div
            className="h-full bg-[#1A1917] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-60 bg-white border-r border-black/8 flex-shrink-0 py-5 flex flex-col gap-1">
            <div className="text-[10px] font-semibold tracking-wider text-[#A09E98] uppercase px-5 pb-1.5">Étapes</div>
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => jumpStep(s.id as Step)}
                className={`flex items-center gap-2.5 py-2 px-5 transition-colors text-left relative
                  ${step === s.id ? 'bg-[#F8F7F4]' : 'hover:bg-[#F8F7F4]'}`}
              >
                <div
                  className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 transition-colors
                    ${step === s.id ? 'bg-[#1A1917] text-white border-[#1A1917]' : step > s.id ? 'bg-[#EAF5EE] text-[#2D7D52] border-[#2D7D52]' : 'border border-black/13 text-[#A09E98]'}`}
                >
                  {step > s.id ? <IconCheck className="w-3 h-3" /> : s.id + 1}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[13px] ${step === s.id ? 'text-[#1A1917] font-medium' : 'text-[#6B6860]'}`}>
                    {s.name}
                  </span>
                  <span className="text-[11px] text-[#A09E98]">{s.desc}</span>
                </div>
                {step === s.id && (
                  <div className="absolute left-0 top-[10%] h-[80%] w-1 bg-[#1A1917] rounded-r" />
                )}
              </button>
            ))}
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-y-auto bg-[#F8F7F4]">
            {showPreview ? (
              <div className="p-8 w-full ">
                <div className="bg-white shadow-xl overflow-hidden rounded-lg">
                  <iframe
                    srcDoc={generateEmailHtml({
                      templateId: selectedTemplate,
                      title: title || subject || t('your_title_here') || 'Votre titre',
                      content: body.includes('<') ? body : textToHtml(body) || `<p class="text-gray-400">${t('content_preview_placeholder') || 'Votre contenu...'}</p>`,
                      ctaText,
                      ctaUrl,
                      bannerUrl,
                      signature,
                      footer,
                      companyLogo,
                      profilePic,
                      translations: { special_offer: t('special_offer'), unsubscribe: t('unsubscribe') },
                    })}
                    className="w-full h-[70vh] border-0"
                    title="Aperçu"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 max-w-[820px]">
                {/* Step 0: Template */}
                {step === 0 && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="font-serif text-[26px] font-normal text-[#1A1917] leading-tight">
                      {t('choose_template') || 'Choisissez un template'}
                    </h2>
                    <p className="text-[13px] text-[#6B6860] mt-1.5">
                      Le style structurel de votre newsletter — vous pourrez personnaliser les couleurs à l'étape suivante.
                    </p>
                    <div className="grid grid-cols-4 gap-3 mt-6">
                      {TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl.id)}
                          className={`relative bg-white border rounded-[14px] p-4 text-left transition-all overflow-hidden
                            ${selectedTemplate === tpl.id ? 'border-[#1A1917] border-2' : 'border-black/8 hover:border-black/22 hover:shadow-sm'}`}
                        >
                          {selectedTemplate === tpl.id && (
                            <>
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1A1917]" />
                              <div className="absolute top-3 right-3 w-[18px] h-[18px] rounded-full bg-[#1A1917] flex items-center justify-center">
                                <IconCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                              </div>
                            </>
                          )}
                          <div className="w-10 h-10 rounded-[10px] bg-[#F8F7F4] flex items-center justify-center mb-3">
                            {tpl.id === 'standard' && <IconNews className="w-5 h-5 text-[#6B6860]" stroke={1.4} />}
                            {tpl.id === 'promotional' && <IconSparkles className="w-5 h-5 text-[#6B6860]" stroke={1.4} />}
                            {tpl.id === 'announcement' && <IconSpeakerphone className="w-5 h-5 text-[#6B6860]" stroke={1.4} />}
                            {tpl.id === 'custom' && <IconPalette className="w-5 h-5 text-[#1A1917]" stroke={1.4} />}
                          </div>
                          <div className="text-[14px] font-medium mb-1">{tpl.name}</div>
                          <div className="text-[12px] text-[#6B6860] leading-snug mb-2.5">{tpl.desc}</div>
                          <div className="flex flex-col gap-0.5">
                            {tpl.tags.map((tag) => (
                              <div key={tag} className="text-[11px] text-[#A09E98] flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-black/22" />
                                {tag}
                              </div>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                    <hr className="border-0 border-t border-black/8 my-7" />
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="text-[13px] font-medium flex items-center gap-2 text-[#1A1917]">
                        <IconPalette className="w-3.5 h-3.5 text-[#6B6860]" stroke={1.4} />
                        Mes thèmes sauvegardés
                      </div>
                      <span className="text-xs text-[#A09E98] bg-[#F8F7F4] border border-black/8 px-2 py-0.5 rounded-full">
                        {customTemplates.length} thème{customTemplates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5">
                      {customTemplates.slice(0, 3).map((ct) => (
                        <div
                          key={ct.id}
                          className="bg-white border border-black/8 rounded-[10px] p-3 cursor-pointer hover:border-black/22 transition-colors"
                        >
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1A1917] text-white mb-2">
                            {ct.name || 'Thème'}
                          </span>
                          <div className="text-[12px] font-medium text-[#1A1917]">{ct.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 1: Content */}
                {step === 1 && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="font-serif text-[26px] font-normal text-[#1A1917] leading-tight">
                      {t('content') || 'Rédigez votre contenu'}
                    </h2>
                    <p className="text-[13px] text-[#6B6860] mt-1.5">
                      Ce que verront vos destinataires dans leur boîte de réception.
                    </p>
                    <div className="flex flex-col gap-4 mt-7">
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-[#6B6860]">{t('title') || 'Titre interne'}</label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Newsletter Mars 2026"
                            className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10"
                          />
                          <span className="text-[11px] text-[#A09E98]">Visible uniquement dans votre dashboard</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-[#6B6860]">{t('subject') || 'Sujet de l\'email'}</label>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ce que verront vos destinataires…"
                            maxLength={80}
                            className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10"
                          />
                          <div className="flex justify-between">
                            <span className="text-[11px] text-[#A09E98]">Vise 30–50 caractères pour le mobile</span>
                            <span className={`text-[11px] ${subject.length > 72 ? 'text-[#C0392B]' : subject.length > 60 ? 'text-[#C07030]' : 'text-[#A09E98]'}`}>
                              {subject.length} / 80
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6B6860]">
                          Texte d'aperçu <span className="font-normal text-[#A09E98]">(preheader)</span>
                        </label>
                        <input
                          type="text"
                          value={preview}
                          onChange={(e) => setPreview(e.target.value)}
                          placeholder="Court résumé visible dans la boîte de réception…"
                          maxLength={130}
                          className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10"
                        />
                        <div className="flex justify-between">
                          <span className="text-[11px] text-[#A09E98]">Complète le sujet pour augmenter le taux d'ouverture</span>
                          <span className="text-[11px] text-[#A09E98]">{preview.length} / 130</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6B6860]">{t('content') || 'Corps du message'}</label>
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          placeholder="Rédigez votre newsletter ici…"
                          rows={8}
                          className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none resize-y min-h-[160px] focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10 leading-relaxed"
                        />
                      </div>
                      <hr className="border-0 border-t border-black/8 my-1" />
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-[#6B6860]">Texte du bouton CTA</label>
                          <input
                            type="text"
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            placeholder="Ex : Découvrir →"
                            className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-[#6B6860]">URL du CTA</label>
                          <input
                            type="url"
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            placeholder="https://…"
                            className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6B6860]">
                          URL de la bannière <span className="font-normal text-[#A09E98]">(optionnel)</span>
                        </label>
                        <input
                          type="url"
                          value={bannerUrl}
                          onChange={(e) => setBannerUrl(e.target.value)}
                          placeholder="https://… image d'en-tête"
                          className="border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/10"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Recipients */}
                {step === 2 && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="font-serif text-[26px] font-normal text-[#1A1917] leading-tight">
                      {t('recipients') || 'Choisissez les destinataires'}
                    </h2>
                    <p className="text-[13px] text-[#6B6860] mt-1.5">
                      Sélectionnez des clients existants ou ajoutez des adresses email manuellement.
                    </p>
                    <div className="flex flex-col gap-4 mt-7">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6B6860]">Ajouter des clients ou des emails</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={recipientInput}
                            onChange={(e) => setRecipientInput(e.target.value)}
                            onKeyDown={handleRecipientKeyDown}
                            placeholder="Rechercher un client ou entrer un email…"
                            className="flex-1 border border-black/13 rounded-[10px] px-3 py-2 text-[13px] text-[#1A1917] bg-white outline-none focus:border-[#1A1917]"
                          />
                          <button
                            onClick={() => addRecipient(recipientInput)}
                            className="h-[38px] px-4 rounded-[10px] border border-black/13 bg-white text-[13px] text-[#1A1917] flex items-center gap-1.5 hover:bg-[#F8F7F4] transition-colors whitespace-nowrap"
                          >
                            <IconCirclePlus className="w-3 h-3" stroke={2} />
                            Ajouter
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#6B6860] py-1.5">
                          {recipients.length} destinataire{recipients.length !== 1 ? 's' : ''} sélectionné{recipients.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex flex-wrap gap-1.5 min-h-10 py-1">
                          {recipients.map((r) => (
                            <div
                              key={r.email}
                              className="inline-flex items-center gap-2 h-7 !pl-2.5 !pr-2 rounded-full bg-white border border-black/13 text-xs text-[#1A1917] animate-in fade-in duration-150"
                            >
                              {r.email}
                              <button
                                onClick={() => removeRecipient(r.email)}
                                className="w-3.5 h-3.5 rounded-full bg-[#F8F7F4] border border-black/13 flex items-center justify-center text-[10px] text-[#A09E98] hover:bg-[#FDECEA] hover:border-[#C0392B] hover:text-[#C0392B] transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#EEF3FF] border border-[#3557C7]/15 rounded-[10px] p-3 text-xs text-[#3557C7] flex gap-2 leading-relaxed">
                        <IconInfoCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" stroke={1.4} />
                        Chaque adresse sera enregistrée comme subscriber dans votre base si elle n'existe pas encore. La config SMTP doit être vérifiée avant l'envoi.
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6B6860]">Clients suggérés</label>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {clients.slice(0, 5).map((c: Client) => (
                            <button
                              key={c.id}
                              onClick={() => addRecipient(c.email, c)}
                              className="h-7 px-3 rounded-md border border-black/13 bg-transparent text-xs text-[#6B6860] hover:bg-[#F8F7F4] hover:text-[#1A1917] transition-colors"
                            >
                              {c.email}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                  <div className="animate-in fade-in duration-200">
                    <h2 className="font-serif text-[26px] font-normal text-[#1A1917] leading-tight">
                      {t('review_and_send') || 'Vérifier et envoyer'}
                    </h2>
                    <p className="text-[13px] text-[#6B6860] mt-1.5">
                      Relisez le récapitulatif avant de lancer l'envoi.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-7">
                      <div className="bg-white border border-black/8 rounded-[14px] p-4">
                        <div className="text-[10px] font-semibold tracking-wider uppercase text-[#A09E98] mb-3">
                          Récapitulatif
                        </div>
                        <div className="flex flex-col">
                          {[
                            ['Template', TEMPLATES.find(t => t.id === selectedTemplate)?.name || selectedTemplate],
                            ['Titre interne', title || '—'],
                            ['Sujet', subject.length > 35 ? subject.slice(0, 35) + '…' : subject || '—'],
                            ['Destinataires', `${recipients.length} destinataire${recipients.length !== 1 ? 's' : ''}`],
                            ['CTA', ctaText || 'Non défini'],
                            ['SMTP', smtpConfig?.is_verified ? '✓ Configuré' : '—'],
                          ].map(([k, v]) => (
                            <div key={String(k)} className="flex justify-between items-center py-1.5 border-b border-black/8 last:border-0">
                              <span className="text-xs text-[#6B6860]">{k}</span>
                              <span className={`text-xs font-medium text-[#1A1917] max-w-[55%] truncate text-right ${k === 'Destinataires' || k === 'SMTP' ? 'text-[#2D7D52]' : ''}`}>
                                {String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white border border-black/8 rounded-[14px] p-4">
                        <div className="text-[10px] font-semibold tracking-wider uppercase text-[#A09E98] mb-3">
                          Planification
                        </div>
                        <div className="flex bg-[#F8F7F4] rounded-[10px] p-0.5 gap-0.5 mb-3">
                          <button
                            onClick={() => setScheduleMode('now')}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-xs text-center transition-all ${scheduleMode === 'now' ? 'bg-white text-[#1A1917] font-medium shadow-sm' : 'text-[#6B6860]'}`}
                          >
                            Envoyer maintenant
                          </button>
                          <button
                            onClick={() => setScheduleMode('later')}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-xs text-center transition-all ${scheduleMode === 'later' ? 'bg-white text-[#1A1917] font-medium shadow-sm' : 'text-[#6B6860]'}`}
                          >
                            Planifier
                          </button>
                        </div>
                        {scheduleMode === 'later' && (
                          <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full border border-black/13 rounded-[10px] px-2.5 py-2 text-xs text-[#1A1917] bg-white outline-none focus:border-[#1A1917]"
                          />
                        )}
                        <div className="mt-2.5 py-2 px-2.5 bg-[#F8F7F4] rounded-md text-[11px] text-[#A09E98] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2D7D52] flex-shrink-0" />
                          Config SMTP vérifiée et prête
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 bg-white border-t border-black/8 px-7 py-3.5 flex items-center justify-between">
          <div className="text-xs text-[#A09E98] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D7D52] animate-pulse" />
            Brouillon sauvegardé automatiquement
          </div>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={step === 0}
              className="h-9 px-4 rounded-[10px] border border-black/13 bg-transparent text-[13px] text-[#6B6860] disabled:opacity-35 disabled:cursor-default hover:bg-[#F8F7F4] hover:text-[#1A1917] transition-colors disabled:hover:bg-transparent disabled:hover:text-[#6B6860]"
            >
              ← Précédent
            </button>
            <button
              onClick={goNext}
              disabled={(step === 1 && !validateContent()) || (step === 2 && !validateRecipients())}
              className={`h-9 px-5 rounded-[10px] font-medium text-[13px] text-white flex items-center gap-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
                ${step === 3 ? 'bg-[#2D7D52] hover:opacity-90' : 'bg-[#1A1917] hover:opacity-90'}`}
            >
              {sending ? (
                <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
              ) : step === 3 ? (
                <>
                  {t('send') || 'Envoyer'}
                  <IconSend className="w-3.5 h-3.5" stroke={2} style={{ transform: 'rotate(-45deg)' }} />
                </>
              ) : (
                <>
                  Suivant
                  <IconChevronRight className="w-3.5 h-3.5" stroke={2} />
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
