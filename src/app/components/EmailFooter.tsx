'use client';

import React from 'react';
import {
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandInstagram,
  IconBrandFacebook,
  IconPhone,
  IconWorld,
  IconMapPin,
  IconLanguage,
} from '@tabler/icons-react';
import type { CreateEmailSignatureData } from '@/types';

export type FooterLanguage = 'fr' | 'en';

// Textes traduits pour le footer
const footerTexts = {
  fr: {
    unsubscribe: 'Se désinscrire de cette liste',
    legal: 'Cet email vous a été envoyé par',
    allRightsReserved: 'Tous droits réservés.',
    viewInBrowser: 'Voir dans le navigateur',
  },
  en: {
    unsubscribe: 'Unsubscribe from this list',
    legal: 'This email was sent to you by',
    allRightsReserved: 'All rights reserved.',
    viewInBrowser: 'View in browser',
  },
};

export interface EmailFooterProps {
  /** Données de la signature */
  data: CreateEmailSignatureData;
  /** Couleur de texte principale */
  textColor?: string;
  /** Couleur d'accent (liens) */
  accentColor?: string;
  /** Couleur de fond */
  backgroundColor?: string;
  /** Afficher en mode compact */
  compact?: boolean;
  /** Texte de désinscription (pour newsletters) - override la traduction */
  unsubscribeText?: string;
  /** URL de désinscription */
  unsubscribeUrl?: string;
  /** Texte légal - override la traduction */
  legalText?: string;
  /** Preview mode (React) vs Email mode (inline styles) */
  mode?: 'preview' | 'email';
  /** Langue du footer */
  language?: FooterLanguage;
  /** Callback pour changer la langue (mode preview uniquement) */
  onLanguageChange?: (language: FooterLanguage) => void;
  /** Afficher le toggle de langue */
  showLanguageToggle?: boolean;
}

/**
 * Composant de footer réutilisable pour newsletters et emails
 * Peut être utilisé en mode preview (React) ou email (inline styles pour compatibilité)
 */
export default function EmailFooter({
  data,
  textColor = '#666666',
  accentColor = '#10b981',
  backgroundColor = '#f8f8f8',
  compact = false,
  unsubscribeText,
  unsubscribeUrl,
  legalText,
  mode = 'preview',
  language = 'fr',
  onLanguageChange,
  showLanguageToggle = false,
}: EmailFooterProps) {
  const hasSocialLinks = data.linkedin_url || data.twitter_url || data.instagram_url || data.facebook_url;
  const hasContactInfo = data.phone || data.website || data.address;
  
  // Textes traduits
  const t = footerTexts[language];
  const finalUnsubscribeText = unsubscribeText || t.unsubscribe;
  const finalLegalText = legalText || (data.company_name ? `${t.legal} ${data.company_name}. ${t.allRightsReserved}` : undefined);
  
  // Pour les emails, on utilise des styles inline pour la compatibilité
  if (mode === 'email') {
    return (
      <EmailFooterInline
        data={data}
        textColor={textColor}
        accentColor={accentColor}
        backgroundColor={backgroundColor}
        compact={compact}
        unsubscribeText={finalUnsubscribeText}
        unsubscribeUrl={unsubscribeUrl}
        legalText={finalLegalText}
        hasSocialLinks={hasSocialLinks}
        hasContactInfo={hasContactInfo}
      />
    );
  }
  
  // Mode preview (React avec classes)
  return (
    <div 
      className={`w-full ${compact ? 'py-6' : 'py-10'}`}
      style={{ backgroundColor }}
    >
      <div className="max-w-[600px] mx-auto px-6">
        {/* Language Toggle (preview mode only) */}
        {showLanguageToggle && onLanguageChange && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-lg text-sm">
              <IconLanguage className="w-4 h-4" style={{ color: textColor }} />
              <button
                onClick={() => onLanguageChange('fr')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  language === 'fr' 
                    ? 'text-white' 
                    : ''
                }`}
                style={{ 
                  backgroundColor: language === 'fr' ? accentColor : 'transparent',
                  color: language === 'fr' ? 'white' : textColor,
                }}
              >
                FR
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-0.5 rounded transition-colors`}
                style={{ 
                  backgroundColor: language === 'en' ? accentColor : 'transparent',
                  color: language === 'en' ? 'white' : textColor,
                }}
              >
                EN
              </button>
            </div>
          </div>
        )}
        
        {/* Logo & Company */}
        <div className="text-center mb-6">
          {data.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={data.logo_url} 
              alt="Logo" 
              className="h-12 mx-auto mb-4 object-contain"
            />
          )}
          {data.company_name && (
            <div 
              className="text-lg font-semibold mb-1"
              style={{ color: accentColor }}
            >
              {data.company_name}
            </div>
          )}
          {data.sender_name && (
            <div style={{ color: textColor }}>
              {data.sender_name}
              {data.sender_title && ` - ${data.sender_title}`}
            </div>
          )}
        </div>
        
        {/* Contact Info */}
        {hasContactInfo && (
          <div 
            className={`flex flex-wrap justify-center gap-4 ${compact ? 'text-xs' : 'text-sm'} mb-6`}
            style={{ color: textColor }}
          >
            {data.phone && (
              <div className="flex items-center gap-1">
                <IconPhone className="w-4 h-4" />
                <span>{data.phone}</span>
              </div>
            )}
            {data.website && (
              <a 
                href={data.website} 
                className="flex items-center gap-1 hover:underline"
                style={{ color: accentColor }}
              >
                <IconWorld className="w-4 h-4" />
                <span>{data.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {data.address && (
              <div className="flex items-center gap-1">
                <IconMapPin className="w-4 h-4" />
                <span>{data.address}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Social Links */}
        {hasSocialLinks && (
          <div className="flex justify-center gap-4 mb-6">
            {data.linkedin_url && (
              <a 
                href={data.linkedin_url}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: '#0A66C2', color: 'white' }}
              >
                <IconBrandLinkedin className="w-5 h-5" />
              </a>
            )}
            {data.twitter_url && (
              <a 
                href={data.twitter_url}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: '#1DA1F2', color: 'white' }}
              >
                <IconBrandTwitter className="w-5 h-5" />
              </a>
            )}
            {data.instagram_url && (
              <a 
                href={data.instagram_url}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: '#E4405F', color: 'white' }}
              >
                <IconBrandInstagram className="w-5 h-5" />
              </a>
            )}
            {data.facebook_url && (
              <a 
                href={data.facebook_url}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: '#1877F2', color: 'white' }}
              >
                <IconBrandFacebook className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
        
        {/* Legal & Unsubscribe */}
        <div 
          className={`text-center ${compact ? 'text-xs' : 'text-xs'} space-y-2`}
          style={{ color: textColor, opacity: 0.8 }}
        >
          {finalLegalText && <p>{finalLegalText}</p>}
          {unsubscribeUrl && (
            <p>
              <a 
                href={unsubscribeUrl}
                style={{ color: accentColor }}
                className="hover:underline"
              >
                {finalUnsubscribeText}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Version avec styles inline pour les emails
function EmailFooterInline({
  data,
  textColor,
  accentColor,
  backgroundColor,
  compact,
  unsubscribeText,
  unsubscribeUrl,
  legalText,
  hasSocialLinks,
  hasContactInfo,
}: EmailFooterProps & { hasSocialLinks: boolean; hasContactInfo: boolean }) {
  return (
    <table 
      width="100%" 
      cellPadding={0} 
      cellSpacing={0}
      style={{ 
        backgroundColor,
        padding: compact ? '24px 0' : '40px 0',
      }}
    >
      <tbody>
        <tr>
          <td align="center">
            <table 
              width="600" 
              cellPadding={0} 
              cellSpacing={0}
              style={{ maxWidth: '600px', padding: '0 24px' }}
            >
              <tbody>
                {/* Logo & Company */}
                <tr>
                  <td align="center" style={{ paddingBottom: '24px' }}>
                    {data.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={data.logo_url} 
                        alt="Logo" 
                        style={{ 
                          height: '48px', 
                          display: 'block',
                          margin: '0 auto 16px',
                        }}
                      />
                    )}
                    {data.company_name && (
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 600,
                        color: accentColor,
                        marginBottom: '4px',
                      }}>
                        {data.company_name}
                      </div>
                    )}
                    {data.sender_name && (
                      <div style={{ color: textColor }}>
                        {data.sender_name}
                        {data.sender_title && ` - ${data.sender_title}`}
                      </div>
                    )}
                  </td>
                </tr>
                
                {/* Contact Info */}
                {hasContactInfo && (
                  <tr>
                    <td 
                      align="center" 
                      style={{ 
                        fontSize: compact ? '12px' : '14px',
                        color: textColor,
                        paddingBottom: '24px',
                      }}
                    >
                      {data.phone && <span style={{ marginRight: '16px' }}>📞 {data.phone}</span>}
                      {data.website && (
                        <a 
                          href={data.website}
                          style={{ 
                            color: accentColor, 
                            textDecoration: 'none',
                            marginRight: '16px',
                          }}
                        >
                          🌐 {data.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                      {data.address && <span>📍 {data.address}</span>}
                    </td>
                  </tr>
                )}
                
                {/* Social Links */}
                {hasSocialLinks && (
                  <tr>
                    <td align="center" style={{ paddingBottom: '24px' }}>
                      <table cellPadding={0} cellSpacing={0}>
                        <tbody>
                          <tr>
                            {data.linkedin_url && (
                              <td style={{ padding: '0 8px' }}>
                                <a 
                                  href={data.linkedin_url}
                                  style={{
                                    display: 'inline-block',
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#0A66C2',
                                    borderRadius: '50%',
                                    textAlign: 'center',
                                    lineHeight: '32px',
                                    color: 'white',
                                    textDecoration: 'none',
                                  }}
                                >
                                  in
                                </a>
                              </td>
                            )}
                            {data.twitter_url && (
                              <td style={{ padding: '0 8px' }}>
                                <a 
                                  href={data.twitter_url}
                                  style={{
                                    display: 'inline-block',
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#1DA1F2',
                                    borderRadius: '50%',
                                    textAlign: 'center',
                                    lineHeight: '32px',
                                    color: 'white',
                                    textDecoration: 'none',
                                  }}
                                >
                                  X
                                </a>
                              </td>
                            )}
                            {data.instagram_url && (
                              <td style={{ padding: '0 8px' }}>
                                <a 
                                  href={data.instagram_url}
                                  style={{
                                    display: 'inline-block',
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#E4405F',
                                    borderRadius: '50%',
                                    textAlign: 'center',
                                    lineHeight: '32px',
                                    color: 'white',
                                    textDecoration: 'none',
                                  }}
                                >
                                  📷
                                </a>
                              </td>
                            )}
                            {data.facebook_url && (
                              <td style={{ padding: '0 8px' }}>
                                <a 
                                  href={data.facebook_url}
                                  style={{
                                    display: 'inline-block',
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#1877F2',
                                    borderRadius: '50%',
                                    textAlign: 'center',
                                    lineHeight: '32px',
                                    color: 'white',
                                    textDecoration: 'none',
                                  }}
                                >
                                  f
                                </a>
                              </td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                
                {/* Legal & Unsubscribe */}
                <tr>
                  <td 
                    align="center" 
                    style={{ 
                      fontSize: '12px',
                      color: textColor,
                      opacity: 0.8,
                    }}
                  >
                    {legalText && <p style={{ margin: '0 0 8px' }}>{legalText}</p>}
                    {unsubscribeUrl && unsubscribeText && (
                      <p style={{ margin: 0 }}>
                        <a 
                          href={unsubscribeUrl}
                          style={{ color: accentColor, textDecoration: 'none' }}
                        >
                          {unsubscribeText}
                        </a>
                      </p>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// Hook pour charger la signature email de l'utilisateur
export { EmailFooter };
