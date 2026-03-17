'use client';

import React from 'react';
import DOMPurify from 'dompurify';
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
  signatureData?: CreateEmailSignatureData | null;
  bannerUrl?: string;
  bannerLink?: string;
  fontFamily?: string;
  translations: {
    inbox?: string;
    favorites?: string;
    sent_folder?: string;
    archives?: string;
    trash?: string;
    search_placeholder?: string;
    now?: string;
    to_me?: string;
    no_content: string;
    special_offer?: string;
    unsubscribe?: string;
  };
}

const TEMPLATE_CONFIG: Record<string, EmailTemplate> = {
  standard: { id: 'standard', primaryColor: '#8B9DC3', accentColor: '#A8B5D4' },
  promotional: { id: 'promotional', primaryColor: '#7BB8E0', accentColor: '#9DCEF0' },
  announcement: { id: 'announcement', primaryColor: '#9DD1CA', accentColor: '#B5DDD8' },
  custom: { id: 'custom', primaryColor: '#E8D9B5', accentColor: '#F9EDD8' },
};

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

  const emailFontFamily = fontFamily
    ? `'${fontFamily}', Arial, sans-serif`
    : signatureData?.font_family
      ? `'${signatureData.font_family}', Arial, sans-serif`
      : 'Arial, sans-serif';

  const effectiveBannerUrl = bannerUrl || signatureData?.banner_url;
  const effectiveBannerLink = bannerLink || signatureData?.banner_link;
  const sigPrimaryColor = signatureData?.primary_color || '#10b981';
  const sigTextColor = signatureData?.text_color || '#333333';
  const sigSecondaryColor = signatureData?.secondary_color || '#666666';

  return (
    <div className="bg-white shadow-xl overflow-hidden text-gray-800 w-full" style={{ fontFamily: emailFontFamily }}>
      {/* Header */}
      <div
        className={`text-center ${isAnnouncement ? 'py-12' : 'py-8'}`}
        style={{
          background: `linear-gradient(135deg, ${templateConfig.primaryColor}, ${templateConfig.accentColor})`,
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

      {/* Body */}
      <div className="p-8">
        {newsletter.content ? (
          <div
            className="prose prose-sm max-w-none text-gray-700
              [&_*]:font-[inherit]
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
              __html: DOMPurify.sanitize(newsletter.content, {
                ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'video', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'blockquote'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'controls', 'width', 'height', 'rel'],
                ALLOW_DATA_ATTR: false,
              }),
            }}
          />
        ) : (
          <p className="text-gray-400 italic text-center py-8">{translations.no_content}</p>
        )}
      </div>

      {/* Signature */}
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

      {/* Banner */}
      {effectiveBannerUrl && (
        <div className="px-8 pb-6">
          {effectiveBannerLink ? (
            <a href={effectiveBannerLink} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={effectiveBannerUrl} alt="Banner" className="w-full object-contain max-h-48" />
            </a>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={effectiveBannerUrl} alt="Banner" className="w-full object-contain max-h-48" />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
        {translations.unsubscribe && (
          <a href="#" className="text-sm hover:underline" style={{ color: sigPrimaryColor }}>
            {translations.unsubscribe}
          </a>
        )}
      </div>
    </div>
  );
}

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
    <div style={{ fontFamily, fontSize: '14px', color: textColor, background: 'transparent' }}>
      <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', background: 'transparent' }}>
        <tbody style={{ background: 'transparent' }}>
          <tr style={{ background: 'transparent' }}>
            {data.logo_url && (
              <td style={{ paddingRight: '12px', verticalAlign: 'top', background: 'transparent' }}>
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
            <td style={{ verticalAlign: 'top', background: 'transparent' }}>
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
    </div>
  );
}

export default function MailboxPreview({
  newsletter,
  signatureData,
  bannerUrl,
  bannerLink,
  fontFamily,
  translations,
}: MailboxPreviewProps) {
  const templateConfig = TEMPLATE_CONFIG[newsletter.template] || TEMPLATE_CONFIG.standard;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
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
  );
}
