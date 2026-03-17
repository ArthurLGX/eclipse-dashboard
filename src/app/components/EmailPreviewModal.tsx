'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalFocus } from '@/hooks/useModalFocus';
import DOMPurify from 'dompurify';
import { IconX } from '@tabler/icons-react';
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
  translations?: {
    mailbox_preview?: string;
    inbox?: string;
    favorites?: string;
    sent_folder?: string;
    archives?: string;
    trash?: string;
    search_placeholder?: string;
    now?: string;
    to_me?: string;
    unsubscribe?: string;
  };
}

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
 * Modal d'aperçu email simplifié : juste le contenu du mail tel qu'il serait reçu.
 * Pas de simulation boîte mail ni de sidebar.
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
  translations: t = {},
}: EmailPreviewModalProps) {
  const modalRef = useModalFocus(isOpen);

  const effectiveBannerUrl = bannerUrl || signatureData?.banner_url;
  const effectiveBannerLink = bannerLink || signatureData?.banner_link;

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
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overscroll-contain"
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="relative w-full max-h-[90vh] bg-white shadow-2xl overflow-hidden flex flex-col outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre de fermeture */}
            <div className="flex justify-end p-2 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu du mail - scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6 bg-gray-50">
                <div className="w-full mx-auto bg-white shadow-sm rounded-lg overflow-hidden text-gray-800">
                  {/* En-tête du mail (expéditeur + objet) */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      {emailData.subject || "Objet de l'email"}
                    </h2>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {senderInfo.profilePicture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={senderInfo.profilePicture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (senderInfo.firstName?.[0] || 'E').toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {senderInfo.firstName} {senderInfo.lastName}
                          <span className="text-gray-500 font-normal text-sm ml-1">
                            &lt;{senderInfo.email || 'email@example.com'}&gt;
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">{t.to_me || 'à moi'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Corps du mail */}
                  <div className="p-6">
                    {/* En-tête visuel (newsletter) */}
                    {(emailData.title || headerBackground) && (
                      <div
                        className="text-center py-8 -mx-6 -mt-6 mb-6"
                        style={{
                          backgroundImage: headerBackground?.url ? `url(${headerBackground.url})` : headerBackground?.gradient || undefined,
                          backgroundColor: headerBackground?.color || primaryColor,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {emailData.title && (
                          <h1
                            className="font-bold text-2xl px-6"
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

                    {/* Contenu */}
                    {emailData.htmlContent ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-700
                          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900
                          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-gray-800
                          [&_p]:mb-3 [&_p]:leading-relaxed
                          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:space-y-1
                          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_ol]:space-y-1
                          [&_li]:text-gray-700
                          [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800
                          [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3
                          [&_strong]:font-bold [&_b]:font-bold
                          [&_em]:italic [&_i]:italic"
                        style={{ fontFamily: emailFontFamily }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(emailData.htmlContent, {
                            ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'video', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'blockquote'],
                            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'controls', 'width', 'height', 'rel'],
                            ALLOW_DATA_ATTR: false,
                          }),
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
                          <p className="text-gray-400 italic text-center py-8">Votre contenu apparaîtra ici...</p>
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
                          bannerOverride={
                            effectiveBannerUrl !== signatureData.banner_url
                              ? { url: effectiveBannerUrl, link: effectiveBannerLink }
                              : undefined
                          }
                        />
                      </div>
                    )}

                    {/* Bannière (sans signature) */}
                    {(!includeSignature || !signatureData) && effectiveBannerUrl && (
                      <div className="mt-6">
                        {effectiveBannerLink ? (
                          <a href={effectiveBannerLink} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={effectiveBannerUrl} alt="Banner" className="max-w-full h-auto block rounded-lg" />
                          </a>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={effectiveBannerUrl} alt="Banner" className="max-w-full h-auto block rounded-lg" />
                        )}
                      </div>
                    )}

                    {/* Lien désabonnement */}
                    {t.unsubscribe && (
                      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                        <a href="#" className="text-sm hover:underline" style={{ color: sigPrimaryColor }}>
                          {t.unsubscribe}
                        </a>
                      </div>
                    )}
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
  const bannerUrl = bannerOverride?.url ?? data.banner_url;
  const bannerLink = bannerOverride?.link ?? data.banner_link;

  return (
    <div style={{ fontFamily, fontSize: '14px', color: textColor }}>
      <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
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
            <td style={{ verticalAlign: 'top' }}>
              {data.sender_name && (
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: textColor }}>{data.sender_name}</div>
              )}
              {data.sender_title && (
                <div style={{ color: secondaryColor, marginBottom: '6px', fontSize: '14px' }}>{data.sender_title}</div>
              )}
              {data.company_name && (
                <div style={{ fontWeight: 600, color: primaryColor, marginBottom: '4px' }}>{data.company_name}</div>
              )}
              <div style={{ fontSize: '13px', color: secondaryColor }}>
                {data.phone && <div>📞 {data.phone}</div>}
                {data.website && (
                  <div>
                    🌐{' '}
                    <a href={data.website} style={{ color: primaryColor, textDecoration: 'none' }}>
                      {data.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {data.address && <div>📍 {data.address}</div>}
              </div>
              {socialLinks.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {socialLinks.map((link, index) => {
                    const label = link.label || SOCIAL_PLATFORM_LABELS[link.platform] || link.platform;
                    const color = link.color || primaryColor;
                    return (
                      <a
                        key={link.id || index}
                        href={link.url}
                        style={{ color, marginRight: '8px', textDecoration: 'none', fontWeight: 500 }}
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
      {bannerUrl && (
        <div style={{ marginTop: '16px' }}>
          {bannerLink ? (
            <a href={bannerLink} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt={data.banner_alt || 'Banner'}
                style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
              />
            </a>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={bannerUrl}
              alt={data.banner_alt || 'Banner'}
              style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export { EmailPreviewModal };
