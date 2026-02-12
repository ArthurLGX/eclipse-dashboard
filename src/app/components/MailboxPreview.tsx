'use client';

import React from 'react';
import DOMPurify from 'dompurify';
import {
  IconMail,
  IconInbox,
  IconStar,
  IconStarFilled,
  IconSend,
  IconArchive,
  IconTrash,
  IconSearch,
  IconPaperclip,
  IconDots,
  IconChevronDown,
} from '@tabler/icons-react';
import type { CreateEmailSignatureData } from '@/types';

// Types
interface EmailTemplate {
  id: string;
  primaryColor: string;
  accentColor: string;
}

interface SenderInfo {
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string | null;
}

interface NewsletterData {
  title: string;
  subject: string;
  content: string;
  template: string;
  send_at?: string | null;
  author?: {
    username?: string;
    email?: string;
  } | null;
}

interface MailboxPreviewProps {
  newsletter: NewsletterData;
  senderInfo?: SenderInfo;
  /** Données de signature email pour afficher la signature complète */
  signatureData?: CreateEmailSignatureData | null;
  /** URL de la bannière de fin (prioritaire sur signatureData.banner_url) */
  bannerUrl?: string;
  /** Lien de la bannière */
  bannerLink?: string;
  /** Police personnalisée */
  fontFamily?: string;
  translations: {
    inbox: string;
    favorites: string;
    sent_folder: string;
    archives: string;
    trash: string;
    search_placeholder: string;
    now: string;
    to_me: string;
    no_content: string;
    special_offer?: string;
    unsubscribe?: string;
  };
}

// Configuration des templates
const TEMPLATE_CONFIG: Record<string, EmailTemplate> = {
  standard: { id: 'standard', primaryColor: '#8B9DC3', accentColor: '#A8B5D4' },
  promotional: { id: 'promotional', primaryColor: '#7BB8E0', accentColor: '#9DCEF0' },
  announcement: { id: 'announcement', primaryColor: '#9DD1CA', accentColor: '#B5DDD8' },
  custom: { id: 'custom', primaryColor: '#E8D9B5', accentColor: '#F9EDD8' },
};

// Fake emails pour la simulation
const FAKE_EMAILS = [
  { from: 'LinkedIn', subject: 'Nouvelles opportunités pour vous', time: '10:32', avatar: '#0A66C2' },
  { from: 'Stripe', subject: 'Votre facture mensuelle', time: '09:15', avatar: '#635BFF' },
  { from: 'GitHub', subject: 'Security alert: new sign-in', time: 'Hier', avatar: '#24292F' },
  { from: 'Google', subject: 'Alerte de sécurité', time: 'Hier', avatar: '#EA4335' },
  { from: 'Figma', subject: 'Quelqu\'un vous a mentionné', time: 'Lun.', avatar: '#F24E1E' },
  { from: 'Slack', subject: 'Messages non lus dans #general', time: 'Dim.', avatar: '#4A154B' },
];

// Labels par défaut pour les plateformes sociales
const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  github: 'GitHub',
  custom: 'Lien',
};

// Composant Email Preview interne - rendu identique à l'email réel
function EmailPreviewContent({ 
  newsletter, 
  templateConfig,
  translations,
  signatureData,
  bannerUrl,
  bannerLink,
  fontFamily,
}: { 
  newsletter: NewsletterData; 
  templateConfig: EmailTemplate;
  translations: MailboxPreviewProps['translations'];
  signatureData?: CreateEmailSignatureData | null;
  bannerUrl?: string;
  bannerLink?: string;
  fontFamily?: string;
}) {
  const isPromo = newsletter.template === 'promotional';
  const isAnnouncement = newsletter.template === 'announcement';
  
  // Utiliser la police personnalisée ou celle de la signature
  const emailFontFamily = fontFamily 
    ? `'${fontFamily}', Arial, sans-serif` 
    : signatureData?.font_family 
      ? `'${signatureData.font_family}', Arial, sans-serif`
      : 'Arial, sans-serif';
  
  // Bannière effective (priorité: prop > signature)
  const effectiveBannerUrl = bannerUrl || signatureData?.banner_url;
  const effectiveBannerLink = bannerLink || signatureData?.banner_link;
  
  // Couleurs de la signature
  const sigPrimaryColor = signatureData?.primary_color || '#10b981';
  const sigTextColor = signatureData?.text_color || '#333333';
  const sigSecondaryColor = signatureData?.secondary_color || '#666666';

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden text-gray-800 w-full" style={{ fontFamily: emailFontFamily }}>
      {/* Header with template-specific styling */}
      <div 
        className={`text-center ${isAnnouncement ? 'py-12' : 'py-8'}`}
        style={{ 
          background: `linear-gradient(135deg, ${templateConfig.primaryColor}, ${templateConfig.accentColor})` 
        }}
      >
        {isPromo && (
          <div className="inline-block px-4 py-1 bg-white/40 backdrop-blur rounded-full text-gray-800 text-sm font-bold mb-4">
            🎉 {translations.special_offer || 'Offre Spéciale'}
          </div>
        )}
        
        <h1 
          className={`font-bold text-gray-800 mb-2 px-6 ${isAnnouncement ? 'text-3xl' : 'text-2xl'}`}
          style={{ fontFamily: emailFontFamily }}
        >
          {newsletter.title}
        </h1>
        
        {newsletter.subject && newsletter.subject !== newsletter.title && (
          <p className="text-gray-700/80 px-6" style={{ fontFamily: emailFontFamily }}>
            {newsletter.subject}
          </p>
        )}
      </div>

      {/* Email body */}
      <div className="p-8">
        {newsletter.content ? (
          <div 
            className="prose prose-sm max-w-none text-gray-700 
              [&_*]:!font-[inherit]
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-gray-800
              [&_p]:mb-3 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_ol]:space-y-1
              [&_li]:text-gray-700
              [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800
              [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3
              [&_strong]:font-bold [&_b]:font-bold
              [&_em]:italic [&_i]:italic"
            style={{ fontFamily: emailFontFamily }}
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(newsletter.content, {
                ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'video', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'blockquote'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'controls', 'width', 'height', 'rel'],
                ALLOW_DATA_ATTR: false,
              })
            }}
          />
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            {translations.no_content}
          </p>
        )}
      </div>

      {/* Signature - rendu identique à l'email réel */}
      {signatureData && (signatureData.sender_name || signatureData.company_name || signatureData.logo_url) && (
        <div className="px-8 py-6 border-t border-gray-200">
          <SignaturePreview 
            data={signatureData}
            fontFamily={emailFontFamily}
            primaryColor={sigPrimaryColor}
            textColor={sigTextColor}
            secondaryColor={sigSecondaryColor}
          />
        </div>
      )}

      {/* Bannière de fin */}
      {effectiveBannerUrl && (
        <div className="px-8 pb-6">
          {effectiveBannerLink ? (
            <a href={effectiveBannerLink} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={effectiveBannerUrl} 
                alt="Banner" 
                className="w-full rounded-lg object-contain max-h-48"
              />
            </a>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={effectiveBannerUrl} 
              alt="Banner" 
              className="w-full rounded-lg object-contain max-h-48"
            />
          )}
        </div>
      )}

      {/* Footer avec lien de désinscription */}
      <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
        {translations.unsubscribe && (
          <a 
            href="#" 
            className="text-sm hover:underline"
            style={{ color: sigPrimaryColor }}
          >
            {translations.unsubscribe}
          </a>
        )}
      </div>
    </div>
  );
}

// Composant de prévisualisation de la signature - identique à l'email réel
function SignaturePreview({ 
  data,
  fontFamily,
  primaryColor,
  textColor,
  secondaryColor,
}: { 
  data: CreateEmailSignatureData;
  fontFamily: string;
  primaryColor: string;
  textColor: string;
  secondaryColor: string;
}) {
  const logoSize = data.logo_size || 100;
  const socialLinks = data.social_links || [];

  return (
    <div 
      className="[&_*]:!bg-transparent"
      style={{ fontFamily, fontSize: '14px', color: textColor, background: 'transparent' }}
    >
      {/* Signature - Alignée à gauche */}
      <table 
        cellPadding={0} 
        cellSpacing={0} 
        className="!bg-transparent"
        style={{ borderCollapse: 'collapse', background: 'transparent' }}
      >
        <tbody className="!bg-transparent" style={{ background: 'transparent' }}>
          <tr className="!bg-transparent" style={{ background: 'transparent' }}>
            {/* Logo */}
            {data.logo_url && (
              <td className="!bg-transparent" style={{ paddingRight: '12px', verticalAlign: 'top', background: 'transparent' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={data.logo_url} 
                  alt="Logo" 
                  style={{ 
                    width: `${logoSize}px`, 
                    height: `${logoSize}px`, 
                    objectFit: 'contain', 
                    borderRadius: '8px', 
                    display: 'block',
                  }}
                />
              </td>
            )}
            
            {/* Info */}
            <td className="!bg-transparent" style={{ verticalAlign: 'top', background: 'transparent' }}>
              {/* Name & Title */}
              {data.sender_name && (
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: textColor }}>
                  {data.sender_name}
                </div>
              )}
              {data.sender_title && (
                <div style={{ color: secondaryColor, marginBottom: '6px', fontSize: '14px' }}>
                  {data.sender_title}
                </div>
              )}
              
              {/* Company */}
              {data.company_name && (
                <div style={{ fontWeight: 600, color: primaryColor, marginBottom: '4px' }}>
                  {data.company_name}
                </div>
              )}
              
              {/* Contact */}
              <div style={{ fontSize: '13px', color: secondaryColor }}>
                {data.phone && <div>📞 {data.phone}</div>}
                {data.website && (
                  <div>
                    🌐 <a href={data.website} style={{ color: primaryColor, textDecoration: 'none' }}>
                      {data.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {data.address && <div>📍 {data.address}</div>}
              </div>
              
              {/* Social links */}
              {socialLinks.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {socialLinks.map((link, index) => {
                    const label = link.label || SOCIAL_PLATFORM_LABELS[link.platform] || link.platform;
                    const color = link.color || primaryColor;
                    
                    return (
                      <a 
                        key={link.id || index}
                        href={link.url} 
                        style={{ 
                          color, 
                          marginRight: '8px', 
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {label}
                      </a>
                    );
                  })}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function MailboxPreview({ 
  newsletter,
  senderInfo,
  signatureData,
  bannerUrl,
  bannerLink,
  fontFamily,
  translations,
}: MailboxPreviewProps) {
  const templateConfig = TEMPLATE_CONFIG[newsletter.template] || TEMPLATE_CONFIG.standard;
  
  // Utiliser les infos de l'auteur ou de la signature si senderInfo n'est pas fourni
  const sender = senderInfo || {
    firstName: signatureData?.sender_name?.split(' ')[0] || newsletter.author?.username?.split(' ')[0] || 'Eclipse',
    lastName: signatureData?.sender_name?.split(' ').slice(1).join(' ') || newsletter.author?.username?.split(' ')[1] || '',
    email: newsletter.author?.email || 'email@example.com',
    profilePicture: null,
  };

  const sendTime = newsletter.send_at 
    ? new Date(newsletter.send_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : translations.now;
  
  // Bannière effective pour l'indicateur
  const effectiveBannerUrl = bannerUrl || signatureData?.banner_url;

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[700px]">
      {/* Mailbox Header */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <IconMail className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Aperçu Boîte Mail</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar - Folders */}
        <div className="w-16 md:w-48 bg-gray-50 border-r border-gray-200 flex-shrink-0 hidden sm:block">
          <div className="p-2 md:p-4 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
              <IconInbox className="w-5 h-5" />
              <span className="hidden md:inline">{translations.inbox}</span>
              <span className="hidden md:inline ml-auto bg-blue-500 text-white !text-xs px-2 py-0.5 rounded-full">1</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconStar className="w-5 h-5" />
              <span className="hidden md:inline">{translations.favorites}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconSend className="w-5 h-5" />
              <span className="hidden md:inline">{translations.sent_folder}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconArchive className="w-5 h-5" />
              <span className="hidden md:inline">{translations.archives}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <IconTrash className="w-5 h-5" />
              <span className="hidden md:inline">{translations.trash}</span>
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="w-64 lg:w-80 border-r border-gray-200 flex-shrink-0 flex flex-col bg-white">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={translations.search_placeholder}
                className="w-full !pl-10 !pr-4 py-2 !bg-gray-100 rounded-lg text-sm !text-gray-700 placeholder:!text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 !border-zinc-400"
                readOnly
              />
            </div>
          </div>

          {/* Email items */}
          <div 
            className="flex-1 overflow-y-auto focus:outline-none"
            tabIndex={0}
            onMouseEnter={(e) => e.currentTarget.focus()}
          >
            {/* Current newsletter - highlighted */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 cursor-pointer">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold overflow-hidden"
                  style={{ backgroundColor: templateConfig.primaryColor }}
                >
                  {sender.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={sender.profilePicture} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : signatureData?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={signatureData.logo_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (sender.firstName?.[0] || 'E').toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 truncate">
                      {signatureData?.company_name || `${sender.firstName} ${sender.lastName}`}
                    </span>
                    <span className="!text-xs text-info  flex-shrink-0 ml-2">{sendTime}</span>
                  </div>
                  <p className="font-medium text-gray-800 text-sm truncate mb-0.5">
                    {newsletter.subject}
                  </p>
                  <p className="text-info !text-xs truncate">
                    {newsletter.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-13">
                {effectiveBannerUrl && <IconPaperclip className="w-3 h-3 text-gray-400" />}
                <IconStarFilled className="w-3 h-3 text-yellow-400" />
              </div>
            </div>

            {/* Fake emails */}
            {FAKE_EMAILS.map((email, idx) => (
              <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                    style={{ backgroundColor: email.avatar }}
                  >
                    {email.from[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700 truncate">{email.from}</span>
                      <span className="!text-xs text-gray-400 flex-shrink-0 ml-2">{email.time}</span>
                    </div>
                    <p className="text-gray-600 text-sm truncate">{email.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
          {/* Email header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {newsletter.subject}
              </h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg text-info ">
                  <IconArchive className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-info ">
                  <IconTrash className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-info ">
                  <IconDots className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                style={{ backgroundColor: templateConfig.primaryColor }}
              >
                {sender.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={sender.profilePicture} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : signatureData?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={signatureData.logo_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (sender.firstName?.[0] || 'E').toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {signatureData?.company_name || `${sender.firstName} ${sender.lastName}`}
                  </span>
                  <span className="text-gray-400 text-sm">
                    &lt;{sender.email}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-info ">
                  <span>{translations.to_me}</span>
                  <IconChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Email body - scrollable */}
          <div 
            className="flex-1 overflow-y-auto p-4 bg-gray-50 min-w-0 focus:outline-none"
            tabIndex={0}
            onMouseEnter={(e) => e.currentTarget.focus()}
          >
            <div className="w-full max-w-2xl mx-auto">
              <EmailPreviewContent 
                newsletter={newsletter} 
                templateConfig={templateConfig}
                translations={translations}
                signatureData={signatureData}
                bannerUrl={bannerUrl}
                bannerLink={bannerLink}
                fontFamily={fontFamily}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
