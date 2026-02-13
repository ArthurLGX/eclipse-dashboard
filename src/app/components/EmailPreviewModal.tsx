'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalFocus } from '@/hooks/useModalFocus';
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
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import type { CreateEmailSignatureData } from '@/types';

// Types
export interface EmailPreviewData {
  title?: string;
  subject: string;
  content: string;
  /** HTML content - if provided, will be used instead of content */
  htmlContent?: string;
}

export interface SenderInfo {
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string | null;
}

export interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: EmailPreviewData;
  senderInfo: SenderInfo;
  signatureData?: CreateEmailSignatureData | null;
  /** Include signature in preview */
  includeSignature?: boolean;
  /** Custom font family for content */
  fontFamily?: string;
  /** Custom banner URL (overrides signature banner) */
  bannerUrl?: string;
  /** Banner link */
  bannerLink?: string;
  /** Header background (for newsletters) */
  headerBackground?: {
    url?: string;
    gradient?: string;
    color?: string;
  };
  /** Primary color for styling */
  primaryColor?: string;
  translations: {
    mailbox_preview: string;
    inbox: string;
    favorites: string;
    sent_folder: string;
    archives: string;
    trash: string;
    search_placeholder: string;
    now: string;
    to_me: string;
    unsubscribe?: string;
  };
}

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

/**
 * Composant modal de prévisualisation d'email avec simulation de boîte mail
 * Réutilisable pour les emails classiques et les newsletters
 */
export default function EmailPreviewModal({
  isOpen,
  onClose,
  emailData,
  senderInfo,
  signatureData,
  includeSignature = true,
  fontFamily = 'Inter',
  bannerUrl,
  bannerLink,
  headerBackground,
  primaryColor = '#8B9DC3',
  translations: t,
}: EmailPreviewModalProps) {
  const modalRef = useModalFocus(isOpen);
  
  // Déterminer la bannière à utiliser (priorité : prop > signature)
  const effectiveBannerUrl = bannerUrl || signatureData?.banner_url;
  const effectiveBannerLink = bannerLink || signatureData?.banner_link;
  
  // Couleurs de la signature
  const sigPrimaryColor = signatureData?.primary_color || primaryColor;
  const sigTextColor = signatureData?.text_color || '#333333';
  const sigSecondaryColor = signatureData?.secondary_color || '#666666';
  const sigFontFamily = signatureData?.font_family || fontFamily;
  
  const emailFontFamily = `'${fontFamily}', Arial, sans-serif`;
  const sigFontFamilyCSS = `'${sigFontFamily}', Arial, sans-serif`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overscroll-contain"
          onClick={onClose}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-4 md:inset-8 max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col outline-none overscroll-contain"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Mailbox Header */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <IconMail className="w-4 h-4 !text-white" />
                  </div>
                  <span className="font-semibold !text-gray-800">{t.mailbox_preview}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-lg !text-gray-600">
                  <IconRefresh className="w-5 h-5" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg !text-gray-600"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Sidebar - Folders */}
              <div className="w-16 md:w-48 bg-gray-50 border-r border-gray-200 flex-shrink-0 hidden sm:block">
                <div className="p-2 md:p-4 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-100 !text-blue-700 rounded-lg font-medium">
                    <IconInbox className="w-5 h-5" />
                    <span className="hidden md:inline">{t.inbox}</span>
                    <span className="hidden md:inline ml-auto bg-blue-500 !text-white !text-xs px-2 py-0.5 rounded-full">1</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 !text-gray-600 hover:bg-gray-100 rounded-lg">
                    <IconStar className="w-5 h-5" />
                    <span className="hidden md:inline">{t.favorites}</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 !text-gray-600 hover:bg-gray-100 rounded-lg">
                    <IconSend className="w-5 h-5" />
                    <span className="hidden md:inline">{t.sent_folder}</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 !text-gray-600 hover:bg-gray-100 rounded-lg">
                    <IconArchive className="w-5 h-5" />
                    <span className="hidden md:inline">{t.archives}</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 !text-gray-600 hover:bg-gray-100 rounded-lg">
                    <IconTrash className="w-5 h-5" />
                    <span className="hidden md:inline">{t.trash}</span>
                  </button>
                </div>
              </div>

              {/* Email List */}
              <div className="w-64 lg:w-80 border-r border-gray-200 flex-shrink-0 flex flex-col bg-white">
                {/* Search bar */}
                <div className="p-3 border-b border-gray-200">
                  <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 !text-gray-400" />
                    <input 
                      type="text" 
                      placeholder={t.search_placeholder}
                      className="w-full !pl-10 !pr-4 py-2 !bg-gray-100 rounded-lg !text-sm !text-gray-700 placeholder:!text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 !border-zinc-400"
                      readOnly
                    />
                  </div>
                </div>

                {/* Email items */}
                <div className="flex-1 overflow-y-auto">
                  {/* Current email - highlighted */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 !text-white font-semibold overflow-hidden"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {senderInfo.profilePicture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={senderInfo.profilePicture} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (senderInfo.firstName?.[0] || 'E').toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold !text-gray-900 truncate">
                            {senderInfo.firstName} {senderInfo.lastName}
                          </span>
                          <span className="!text-xs !text-info  flex-shrink-0 ml-2">{t.now}</span>
                        </div>
                        <p className="font-medium !text-gray-800 !text-sm truncate mb-0.5">
                          {emailData.subject || 'Objet de l\'email'}
                        </p>
                        <p className="text-info !text-xs truncate">
                          {emailData.title || emailData.content?.substring(0, 50) || 'Votre contenu apparaîtra ici...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 ml-13">
                      {effectiveBannerUrl && <IconPaperclip className="w-3 h-3 !text-gray-400" />}
                      <IconStarFilled className="w-3 h-3 !text-yellow-400" />
                    </div>
                  </div>

                  {/* Fake emails */}
                  {FAKE_EMAILS.map((email, idx) => (
                    <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 !text-white font-semibold !text-sm"
                          style={{ backgroundColor: email.avatar }}
                        >
                          {email.from[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium !text-gray-700 truncate">{email.from}</span>
                            <span className="!text-xs !text-gray-400 flex-shrink-0 ml-2">{email.time}</span>
                          </div>
                          <p className="text-gray-600 !text-sm truncate">{email.subject}</p>
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
                    <h2 className="text-xl font-semibold !text-gray-900">
                      {emailData.subject || 'Objet de l\'email'}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg !text-info ">
                        <IconArchive className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg !text-info ">
                        <IconTrash className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg !text-info ">
                        <IconDots className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center !text-white font-semibold overflow-hidden"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {senderInfo.profilePicture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={senderInfo.profilePicture} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (senderInfo.firstName?.[0] || 'E').toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold !text-gray-900">
                          {senderInfo.firstName} {senderInfo.lastName}
                        </span>
                        <span className="text-gray-400 !text-sm">
                          &lt;{senderInfo.email || 'email@example.com'}&gt;
                        </span>
                      </div>
                      <div className="flex items-center gap-2 !text-sm !text-info ">
                        <span>{t.to_me}</span>
                        <IconChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email body - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-w-0">
                  <div className="w-full max-w-2xl mx-auto">
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden !text-gray-800">
                      {/* Header with title (if provided) */}
                      {(emailData.title || headerBackground) && (
                        <div 
                          className="text-center py-8"
                          style={{ 
                            backgroundImage: headerBackground?.url 
                              ? `url(${headerBackground.url})`
                              : headerBackground?.gradient || undefined,
                            backgroundColor: headerBackground?.color || primaryColor,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {emailData.title && (
                            <h1 
                              className="font-bold !text-2xl px-6"
                              style={{ 
                                color: headerBackground ? '#ffffff' : sigTextColor,
                                fontFamily: emailFontFamily,
                                textShadow: headerBackground ? '0 1px 2px rgba(0,0,0,0.3)' : undefined,
                              }}
                            >
                              {emailData.title}
                            </h1>
                          )}
                        </div>
                      )}

                      {/* Email body */}
                      <div className="p-8">
                        {/* Content */}
                        {emailData.htmlContent ? (
                          <div 
                            className="prose prose-sm max-w-none !text-gray-700
                              [&_h1]:!text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:!text-gray-900
                              [&_h2]:!text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:!text-gray-800
                              [&_p]:mb-3 [&_p]:leading-relaxed
                              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:space-y-1
                              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_ol]:space-y-1
                              [&_li]:!text-gray-700
                              [&_a]:!text-blue-600 [&_a]:underline [&_a]:hover:!text-blue-800
                              [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3
                              [&_strong]:font-bold [&_b]:font-bold
                              [&_em]:italic [&_i]:italic"
                            style={{ fontFamily: emailFontFamily }}
                            dangerouslySetInnerHTML={{ 
                              __html: DOMPurify.sanitize(emailData.htmlContent, {
                                ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'video', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'blockquote'],
                                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'controls', 'width', 'height', 'rel'],
                                ALLOW_DATA_ATTR: false,
                              })
                            }}
                          />
                        ) : (
                          <div style={{ fontFamily: emailFontFamily }}>
                            {emailData.content ? (
                              emailData.content.split('\n').map((line, i) => (
                                <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.6, color: '#374151' }}>
                                  {line || '\u00A0'}
                                </p>
                              ))
                            ) : (
                              <p className="text-gray-400 italic !text-center py-8">
                                Votre contenu apparaîtra ici...
                              </p>
                            )}
                          </div>
                        )}

                        {/* Signature */}
                        {includeSignature && signatureData && (
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            <SignaturePreview 
                              data={signatureData}
                              fontFamily={sigFontFamilyCSS}
                              primaryColor={sigPrimaryColor}
                              textColor={sigTextColor}
                              secondaryColor={sigSecondaryColor}
                              bannerOverride={effectiveBannerUrl !== signatureData.banner_url ? {
                                url: effectiveBannerUrl,
                                link: effectiveBannerLink,
                              } : undefined}
                            />
                          </div>
                        )}

                        {/* Banner (if no signature but banner provided) */}
                        {(!includeSignature || !signatureData) && effectiveBannerUrl && (
                          <div className="mt-6">
                            {effectiveBannerLink ? (
                              <a href={effectiveBannerLink} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={effectiveBannerUrl} 
                                  alt="Banner" 
                                  style={{ 
                                    maxWidth: '100%',
                                    height: 'auto',
                                    display: 'block',
                                    borderRadius: '8px',
                                  }}
                                />
                              </a>
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={effectiveBannerUrl} 
                                alt="Banner" 
                                style={{ 
                                  maxWidth: '100%',
                                  height: 'auto',
                                  display: 'block',
                                  borderRadius: '8px',
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* Unsubscribe link (for newsletters) */}
                        {t.unsubscribe && (
                          <div className="mt-6 pt-4 border-t border-gray-100 !text-center">
                            <a 
                              href="#" 
                              className="text-sm hover:underline"
                              style={{ color: sigPrimaryColor }}
                            >
                              {t.unsubscribe}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Composant interne pour la prévisualisation de la signature
function SignaturePreview({ 
  data,
  fontFamily,
  primaryColor,
  textColor,
  secondaryColor,
  bannerOverride,
}: { 
  data: CreateEmailSignatureData;
  fontFamily: string;
  primaryColor: string;
  textColor: string;
  secondaryColor: string;
  bannerOverride?: { url?: string; link?: string };
}) {
  const logoSize = data.logo_size || 100;
  const socialLinks = data.social_links || [];
  
  // Utiliser la bannière override si fournie
  const bannerUrl = bannerOverride?.url ?? data.banner_url;
  const bannerLink = bannerOverride?.link ?? data.banner_link;

  return (
    <div style={{ fontFamily, fontSize: '14px', color: textColor }}>
      {/* Signature - Alignée à gauche */}
      <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* Logo */}
            {data.logo_url && (
              <td style={{ paddingRight: '12px', verticalAlign: 'top' }}>
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
            <td style={{ verticalAlign: 'top' }}>
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
      
      {/* Promotional Banner */}
      {bannerUrl && (
        <div style={{ marginTop: '16px' }}>
          {bannerLink ? (
            <a href={bannerLink} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={bannerUrl} 
                alt={data.banner_alt || 'Banner'} 
                style={{ 
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '8px',
                }}
              />
            </a>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={bannerUrl} 
              alt={data.banner_alt || 'Banner'} 
              style={{ 
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '8px',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export { EmailPreviewModal };

