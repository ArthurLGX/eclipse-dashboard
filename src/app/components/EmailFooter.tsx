'use client';

import React, { useEffect } from 'react';
import {
  IconPhone,
  IconWorld,
  IconMapPin,
  IconLanguage,
} from '@tabler/icons-react';
import type { CreateEmailSignatureData, SocialLink } from '@/types';

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

// Helper pour obtenir l'URL Google Fonts
const getGoogleFontUrl = (fontFamily: string) => {
  const webSafe = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman', 'Tahoma', 'Trebuchet MS'];
  if (webSafe.includes(fontFamily)) return null;
  
  const fontName = fontFamily.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
};

export interface EmailFooterProps {
  /** Données de la signature */
  data: CreateEmailSignatureData;
  /** Couleur de texte principale (override) */
  textColor?: string;
  /** Couleur d'accent (liens) (override) */
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
  /** Mode mobile (taille plus petite) */
  isMobile?: boolean;
}

/**
 * Composant de footer réutilisable pour newsletters et emails
 * Utilise les données de signature email avec personnalisation
 */
export default function EmailFooter({
  data,
  textColor: textColorOverride,
  accentColor: accentColorOverride,
  backgroundColor = '#ffffff',
  compact = false,
  unsubscribeText,
  unsubscribeUrl,
  legalText,
  mode = 'preview',
  language = 'fr',
  onLanguageChange,
  showLanguageToggle = false,
  isMobile = false,
}: EmailFooterProps) {
  // Utiliser les valeurs personnalisées de la signature ou les overrides/défauts
  const primaryColor = accentColorOverride || data.primary_color || '#10b981';
  const textColor = textColorOverride || data.text_color || '#333333';
  const secondaryColor = data.secondary_color || '#666666';
  const baseFontFamily = data.font_family || 'Inter';
  const fontFamily = `'${baseFontFamily}', Arial, sans-serif`;
  const logoSize = isMobile ? Math.min(60, (data.logo_size || 100) * 0.6) : (data.logo_size || 100);
  
  // Vérifier s'il y a des liens sociaux (nouveau système uniquement)
  const socialLinks = data.social_links || [];
  const hasSocialLinks = socialLinks.length > 0;
  const hasContactInfo = !!(data.phone || data.website || data.address);
  
  // Textes traduits
  const t = footerTexts[language];
  const finalUnsubscribeText = unsubscribeText || t.unsubscribe;
  const finalLegalText = legalText || (data.company_name ? `${t.legal} ${data.company_name}. ${t.allRightsReserved}` : undefined);
  
  // Charger la Google Font si nécessaire (mode preview)
  useEffect(() => {
    if (mode === 'preview') {
      const fontUrl = getGoogleFontUrl(baseFontFamily);
      if (fontUrl) {
        const fontName = baseFontFamily.replace(/\s+/g, '-');
        const linkId = `google-font-footer-${fontName}`;
        
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = fontUrl;
          document.head.appendChild(link);
        }
      }
    }
  }, [baseFontFamily, mode]);
  
  // Pour les emails, on utilise des styles inline pour la compatibilité
  if (mode === 'email') {
    return (
      <EmailFooterInline
        data={data}
        textColor={textColor}
        secondaryColor={secondaryColor}
        accentColor={primaryColor}
        fontFamily={fontFamily}
        logoSize={logoSize}
        compact={compact}
        unsubscribeText={finalUnsubscribeText}
        unsubscribeUrl={unsubscribeUrl}
        legalText={finalLegalText}
        socialLinks={socialLinks}
        hasContactInfo={hasContactInfo}
      />
    );
  }
  
  // Mode preview (React avec classes) - Disposition horizontale comme la signature
  return (
    <div 
      className={`w-full ${compact ? 'py-4' : 'py-6'}`}
      style={{ backgroundColor, fontFamily }}
    >
      <div className="max-w-[600px] mx-auto px-6">
        {/* Language Toggle (preview mode only) */}
        {showLanguageToggle && onLanguageChange && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
              <IconLanguage className="w-4 h-4" style={{ color: secondaryColor }} />
              <button
                onClick={() => onLanguageChange('fr')}
                className="px-2 py-0.5 rounded transition-colors"
                style={{ 
                  backgroundColor: language === 'fr' ? primaryColor : 'transparent',
                  color: language === 'fr' ? 'white' : secondaryColor,
                }}
              >
                FR
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className="px-2 py-0.5 rounded transition-colors"
                style={{ 
                  backgroundColor: language === 'en' ? primaryColor : 'transparent',
                  color: language === 'en' ? 'white' : secondaryColor,
                }}
              >
                EN
              </button>
            </div>
          </div>
        )}
        
        {/* Signature horizontale : Logo à gauche, infos à droite */}
        <div className="flex items-start gap-3">
          {/* Logo */}
          {data.logo_url && (
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={data.logo_url} 
                alt="Logo" 
                style={{ 
                  width: `${logoSize}px`, 
                  height: `${logoSize}px`, 
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
            </div>
          )}
          
          {/* Infos */}
          <div className="flex-1 min-w-0">
            {/* Nom & Titre */}
            {data.sender_name && (
              <div className="font-bold text-base" style={{ color: textColor }}>
                {data.sender_name}
              </div>
            )}
            {data.sender_title && (
              <div className="text-sm mb-1" style={{ color: secondaryColor }}>
                {data.sender_title}
              </div>
            )}
            
            {/* Entreprise */}
            {data.company_name && (
              <div className="font-semibold mb-1" style={{ color: primaryColor }}>
                {data.company_name}
              </div>
            )}
            
            {/* Contact */}
            {hasContactInfo && (
              <div className={`${compact ? 'text-xs' : 'text-sm'} space-y-0.5`} style={{ color: secondaryColor }}>
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
                    style={{ color: primaryColor }}
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
            
            {/* Social Links - Nouveau système dynamique */}
            {hasSocialLinks && (
              <div className="flex flex-wrap gap-2 mt-2">
                {socialLinks.map((link, index) => {
                  const label = link.label || SOCIAL_PLATFORM_LABELS[link.platform] || link.platform;
                  const color = link.color || primaryColor;
                  
                  return (
                    <a 
                      key={link.id || index}
                      href={link.url}
                      className="text-sm font-medium hover:underline"
                      style={{ color }}
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Banner */}
        {data.banner_url && (
          <div className="mt-4">
            {data.banner_link ? (
              <a href={data.banner_link} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={data.banner_url} 
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
                src={data.banner_url} 
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
        
        {/* Legal & Unsubscribe - Séparateur fin */}
        {(finalLegalText || unsubscribeUrl) && (
          <div 
            className="text-center text-xs mt-4 pt-4 border-t border-gray-100"
            style={{ color: secondaryColor, opacity: 0.7 }}
          >
            {finalLegalText && <p className="mb-1">{finalLegalText}</p>}
            {unsubscribeUrl && (
              <p>
                <a 
                  href={unsubscribeUrl}
                  style={{ color: primaryColor }}
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
interface EmailFooterInlineProps {
  data: CreateEmailSignatureData;
  textColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoSize: number;
  compact: boolean;
  unsubscribeText: string;
  unsubscribeUrl?: string;
  legalText?: string;
  socialLinks: SocialLink[];
  hasContactInfo: boolean;
}

function EmailFooterInline({
  data,
  textColor,
  secondaryColor,
  accentColor,
  fontFamily,
  logoSize,
  compact,
  unsubscribeText,
  unsubscribeUrl,
  legalText,
  socialLinks,
  hasContactInfo,
}: EmailFooterInlineProps) {
  const baseFontFamily = data.font_family || 'Inter';
  const webSafe = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman', 'Tahoma', 'Trebuchet MS'];
  const needsGoogleFont = !webSafe.includes(baseFontFamily);
  
  return (
    <>
      {/* Google Font import si nécessaire */}
      {needsGoogleFont && (
        <link 
          href={`https://fonts.googleapis.com/css2?family=${baseFontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`} 
          rel="stylesheet" 
        />
      )}
      
      <table 
        width="100%" 
        cellPadding={0} 
        cellSpacing={0}
        style={{ 
          backgroundColor: '#ffffff',
          padding: compact ? '16px 0' : '24px 0',
          fontFamily,
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
                                paddingRight: '12px', 
                                verticalAlign: 'top',
                              }}>
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
                            
                            {/* Infos à droite */}
                            <td style={{ verticalAlign: 'top' }}>
                              {/* Nom */}
                              {data.sender_name && (
                                <div style={{ 
                                  fontWeight: 'bold', 
                                  fontSize: '16px', 
                                  color: textColor,
                                }}>
                                  {data.sender_name}
                                </div>
                              )}
                              {/* Titre */}
                              {data.sender_title && (
                                <div style={{ 
                                  color: secondaryColor, 
                                  fontSize: '14px',
                                  marginBottom: '6px',
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
                                  color: secondaryColor,
                                }}>
                                  {data.phone && (
                                    <div>📞 {data.phone}</div>
                                  )}
                                  {data.website && (
                                    <div>
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
                              
                              {/* Social Links - Nouveau système dynamique */}
                              {socialLinks.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                  {socialLinks.map((link, index) => {
                                    const label = link.label || SOCIAL_PLATFORM_LABELS[link.platform] || link.platform;
                                    const color = link.color || accentColor;
                                    
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
                    </td>
                  </tr>
                  
                  {/* Banner */}
                  {data.banner_url && (
                    <tr>
                      <td style={{ paddingTop: '16px' }}>
                        {data.banner_link ? (
                          <a href={data.banner_link} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={data.banner_url} 
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
                            src={data.banner_url} 
                            alt={data.banner_alt || 'Banner'} 
                            style={{ 
                              maxWidth: '100%',
                              height: 'auto',
                              display: 'block',
                              borderRadius: '8px',
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                  
                  {/* Legal & Unsubscribe */}
                  {(legalText || (unsubscribeUrl && unsubscribeText)) && (
                    <tr>
                      <td 
                        align="center" 
                        style={{ 
                          fontSize: '12px',
                          color: secondaryColor,
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
    </>
  );
}

// Hook pour charger la signature email de l'utilisateur
export { EmailFooter };
