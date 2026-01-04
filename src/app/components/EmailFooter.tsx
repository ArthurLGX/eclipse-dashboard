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
  const hasSocialLinks = !!(data.linkedin_url || data.twitter_url || data.instagram_url || data.facebook_url);
  const hasContactInfo = !!(data.phone || data.website || data.address);
  
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
  
  // Mode preview (React avec classes) - Disposition horizontale comme la signature
  return (
    <div 
      className={`w-full ${compact ? 'py-4' : 'py-6'}`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="max-w-[600px] mx-auto px-6">
        {/* Language Toggle (preview mode only) */}
        {showLanguageToggle && onLanguageChange && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
              <IconLanguage className="w-4 h-4" style={{ color: textColor }} />
              <button
                onClick={() => onLanguageChange('fr')}
                className="px-2 py-0.5 rounded transition-colors"
                style={{ 
                  backgroundColor: language === 'fr' ? accentColor : 'transparent',
                  color: language === 'fr' ? 'white' : textColor,
                }}
              >
                FR
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className="px-2 py-0.5 rounded transition-colors"
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
        
        {/* Signature horizontale : Logo à gauche, infos à droite */}
        <div className="flex items-start gap-4">
          {/* Logo */}
          {data.logo_url && (
            <div className="flex-shrink-0 pr-4 border-r-2 border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={data.logo_url} 
                alt="Logo" 
                className="h-20 w-auto object-contain"
                style={{ maxWidth: '80px' }}
              />
            </div>
          )}
          
          {/* Infos */}
          <div className="flex-1 min-w-0">
            {/* Nom & Titre */}
            {data.sender_name && (
              <div className="font-bold text-base" style={{ color: '#111' }}>
                {data.sender_name}
              </div>
            )}
            {data.sender_title && (
              <div className="text-sm mb-2" style={{ color: textColor }}>
                {data.sender_title}
              </div>
            )}
            
            {/* Entreprise */}
            {data.company_name && (
              <div className="font-semibold mb-1" style={{ color: accentColor }}>
                {data.company_name}
              </div>
            )}
            
            {/* Contact */}
            {hasContactInfo && (
              <div className={`${compact ? 'text-xs' : 'text-sm'} space-y-0.5`} style={{ color: textColor }}>
                {data.phone && (
                  <div className="flex items-center gap-1">
                    <IconPhone className="w-3.5 h-3.5" />
                    <span>{data.phone}</span>
                  </div>
                )}
                {data.website && (
                  <a 
                    href={data.website} 
                    className="flex items-center gap-1 hover:underline"
                    style={{ color: accentColor }}
                  >
                    <IconWorld className="w-3.5 h-3.5" />
                    <span>{data.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {data.address && (
                  <div className="flex items-center gap-1">
                    <IconMapPin className="w-3.5 h-3.5" />
                    <span>{data.address}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Social Links - Plus compacts */}
            {hasSocialLinks && (
              <div className="flex gap-2 mt-2">
                {data.linkedin_url && (
                  <a 
                    href={data.linkedin_url}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#0A66C2', color: 'white' }}
                  >
                    <IconBrandLinkedin className="w-4 h-4" />
                  </a>
                )}
                {data.twitter_url && (
                  <a 
                    href={data.twitter_url}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#1DA1F2', color: 'white' }}
                  >
                    <IconBrandTwitter className="w-4 h-4" />
                  </a>
                )}
                {data.instagram_url && (
                  <a 
                    href={data.instagram_url}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#E4405F', color: 'white' }}
                  >
                    <IconBrandInstagram className="w-4 h-4" />
                  </a>
                )}
                {data.facebook_url && (
                  <a 
                    href={data.facebook_url}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#1877F2', color: 'white' }}
                  >
                    <IconBrandFacebook className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Legal & Unsubscribe - Séparateur fin */}
        {(finalLegalText || unsubscribeUrl) && (
          <div 
            className="text-center text-xs mt-4 pt-4 border-t border-gray-100"
            style={{ color: textColor, opacity: 0.7 }}
          >
            {finalLegalText && <p className="mb-1">{finalLegalText}</p>}
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
        )}
      </div>
    </div>
  );
}

// Version avec styles inline pour les emails - Disposition horizontale
function EmailFooterInline({
  data,
  textColor,
  accentColor,
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
        backgroundColor: '#ffffff',
        padding: compact ? '16px 0' : '24px 0',
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
                {/* Signature horizontale */}
                <tr>
                  <td>
                    <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          {/* Logo à gauche */}
                          {data.logo_url && (
                            <td style={{ 
                              paddingRight: '16px', 
                              verticalAlign: 'middle',
                              borderRight: '2px solid #e5e7eb',
                            }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={data.logo_url} 
                                alt="Logo" 
                                style={{ 
                                  height: '80px', 
                                  width: 'auto',
                                  maxWidth: '80px',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                              />
                            </td>
                          )}
                          
                          {/* Infos à droite */}
                          <td style={{ 
                            verticalAlign: 'middle', 
                            paddingLeft: data.logo_url ? '16px' : '0',
                          }}>
                            {/* Nom */}
                            {data.sender_name && (
                              <div style={{ 
                                fontWeight: 'bold', 
                                fontSize: '16px', 
                                color: '#111',
                                marginBottom: '2px',
                              }}>
                                {data.sender_name}
                              </div>
                            )}
                            {/* Titre */}
                            {data.sender_title && (
                              <div style={{ 
                                color: textColor, 
                                fontSize: '14px',
                                marginBottom: '8px',
                              }}>
                                {data.sender_title}
                              </div>
                            )}
                            
                            {/* Entreprise */}
                            {data.company_name && (
                              <div style={{ 
                                fontWeight: 600,
                                color: accentColor,
                                marginBottom: '4px',
                              }}>
                                {data.company_name}
                              </div>
                            )}
                            
                            {/* Contact */}
                            {hasContactInfo && (
                              <div style={{ 
                                fontSize: compact ? '12px' : '13px',
                                color: textColor,
                              }}>
                                {data.phone && (
                                  <div style={{ marginBottom: '2px' }}>
                                    📞 {data.phone}
                                  </div>
                                )}
                                {data.website && (
                                  <div style={{ marginBottom: '2px' }}>
                                    🌐 <a 
                                      href={data.website}
                                      style={{ 
                                        color: accentColor, 
                                        textDecoration: 'none',
                                      }}
                                    >
                                      {data.website.replace(/^https?:\/\//, '')}
                                    </a>
                                  </div>
                                )}
                                {data.address && (
                                  <div>📍 {data.address}</div>
                                )}
                              </div>
                            )}
                            
                            {/* Social Links */}
                            {hasSocialLinks && (
                              <div style={{ marginTop: '8px' }}>
                                <table cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    <tr>
                                      {data.linkedin_url && (
                                        <td style={{ paddingRight: '6px' }}>
                                          <a 
                                            href={data.linkedin_url}
                                            style={{
                                              display: 'inline-block',
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: '#0A66C2',
                                              borderRadius: '4px',
                                              textAlign: 'center',
                                              lineHeight: '24px',
                                              color: 'white',
                                              textDecoration: 'none',
                                              fontSize: '12px',
                                            }}
                                          >
                                            in
                                          </a>
                                        </td>
                                      )}
                                      {data.twitter_url && (
                                        <td style={{ paddingRight: '6px' }}>
                                          <a 
                                            href={data.twitter_url}
                                            style={{
                                              display: 'inline-block',
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: '#1DA1F2',
                                              borderRadius: '4px',
                                              textAlign: 'center',
                                              lineHeight: '24px',
                                              color: 'white',
                                              textDecoration: 'none',
                                              fontSize: '12px',
                                            }}
                                          >
                                            X
                                          </a>
                                        </td>
                                      )}
                                      {data.instagram_url && (
                                        <td style={{ paddingRight: '6px' }}>
                                          <a 
                                            href={data.instagram_url}
                                            style={{
                                              display: 'inline-block',
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: '#E4405F',
                                              borderRadius: '4px',
                                              textAlign: 'center',
                                              lineHeight: '24px',
                                              color: 'white',
                                              textDecoration: 'none',
                                              fontSize: '11px',
                                            }}
                                          >
                                            📷
                                          </a>
                                        </td>
                                      )}
                                      {data.facebook_url && (
                                        <td>
                                          <a 
                                            href={data.facebook_url}
                                            style={{
                                              display: 'inline-block',
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: '#1877F2',
                                              borderRadius: '4px',
                                              textAlign: 'center',
                                              lineHeight: '24px',
                                              color: 'white',
                                              textDecoration: 'none',
                                              fontSize: '12px',
                                            }}
                                          >
                                            f
                                          </a>
                                        </td>
                                      )}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                {/* Legal & Unsubscribe */}
                {(legalText || (unsubscribeUrl && unsubscribeText)) && (
                  <tr>
                    <td 
                      align="center" 
                      style={{ 
                        fontSize: '12px',
                        color: textColor,
                        opacity: 0.7,
                        paddingTop: '16px',
                        borderTop: '1px solid #f0f0f0',
                        marginTop: '16px',
                      }}
                    >
                      {legalText && <p style={{ margin: '0 0 4px' }}>{legalText}</p>}
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
                )}
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
