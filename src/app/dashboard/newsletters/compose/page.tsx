'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowLeft,
  IconSend,
  IconTemplate,
  IconUsers,
  IconMail,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconEye,
  IconSparkles,
  IconSpeakerphone,
  IconNews,
  IconPalette,
  IconLoader2,
  IconPhoto,
  IconLink,
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconSettings,
  IconUpload,
  IconX,
  IconH1,
  IconH2,
  IconTypography,
  IconColorSwatch,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandInstagram,
  IconBrandFacebook,
  IconPhone,
  IconWorld,
  IconUser,
  IconInbox,
  IconStar,
  IconStarFilled,
  IconArchive,
  IconTrash,
  IconDots,
  IconRefresh,
  IconSearch,
  IconChevronDown,
  IconPaperclip,
  IconVideo,
  IconClock,
} from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useClients, useCompany } from '@/hooks/useApi';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import ThemeCustomizer from '@/app/components/ThemeCustomizer';
import MediaPickerModal from '@/app/components/MediaPickerModal';
import SaveTemplateModal from '@/app/components/SaveTemplateModal';
import LoadTemplateModal from '@/app/components/LoadTemplateModal';
import EmailScheduler from '@/app/components/EmailScheduler';
import { fetchSmtpConfig, fetchUserCustomTemplates, createCustomTemplate, deleteCustomTemplate, setDefaultCustomTemplate, fetchEmailSignature } from '@/lib/api';
import { useDraftSave } from '@/hooks/useDraftSave';
import type { CustomTemplate, CreateEmailSignatureData } from '@/types';
import type { Client, Company, SmtpConfig } from '@/types';

// Types
type TemplateType = 'standard' | 'promotional' | 'announcement' | 'custom';
type Step = 'template' | 'content' | 'recipients' | 'review';

interface EmailTemplate {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  primaryColor: string;
  accentColor: string;
  borderColor: string;
  textColor?: string;
  features: string[];
  useGradient?: boolean;
  gradientAngle?: number;
  gradientCSS?: string; // Full CSS gradient string
}

interface FooterSettings {
  showLogo: boolean;
  logoUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  facebook: string;
  customText: string;
  unsubscribeText: string;
}

// Types pour EmailPreview
interface EmailPreviewProps {
  template: EmailTemplate;
  emailTitle: string;
  emailContent: string;
  contentImages: string[];
  ctaText: string;
  ctaUrl: string;
  bannerImageUrl: string;
  footerSettings: FooterSettings;
  footerLogoUrl: string | null;
  userProfilePicture?: string | null;
  headerTitleColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  headerBackgroundUrl?: string;
  fontFamily?: string;
  /** Données de signature email - si fournies, utilisées pour le footer */
  signatureData?: CreateEmailSignatureData | null;
  translations: {
    specialOffer: string;
    yourTitleHere: string;
    contentPreviewPlaceholder: string;
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

// Composant Email Preview
function EmailPreview({
  template,
  emailTitle,
  emailContent,
  contentImages,
  ctaText,
  ctaUrl,
  bannerImageUrl,
  footerSettings,
  footerLogoUrl,
  userProfilePicture,
  headerTitleColor,
  buttonColor,
  buttonTextColor,
  headerBackgroundUrl,
  fontFamily,
  signatureData,
  translations,
}: EmailPreviewProps) {
  const isPromo = template.id === 'promotional';
  const isAnnouncement = template.id === 'announcement';
  
  // Use custom colors if provided, otherwise use template defaults
  const titleColor = headerTitleColor || template.textColor || '#1F2937';
  const ctaButtonColor = buttonColor || template.primaryColor;
  const ctaButtonTextColor = buttonTextColor || '#FFFFFF';
  const emailFontFamily = fontFamily ? `'${fontFamily}', Arial, sans-serif` : 'Arial, sans-serif';

  // Couleurs de la signature si disponible
  const sigPrimaryColor = signatureData?.primary_color || '#10b981';
  const sigTextColor = signatureData?.text_color || '#333333';
  const sigSecondaryColor = signatureData?.secondary_color || '#666666';

  // Create a style object that will be applied to all text elements
  const fontStyle = { fontFamily: emailFontFamily };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full text-gray-800" style={fontStyle}>
      {/* Header with template-specific styling */}
      <div 
        className={`text-center ${isAnnouncement ? 'py-12' : 'py-8'}`}
        style={{ 
          backgroundImage: headerBackgroundUrl 
            ? `url(${headerBackgroundUrl})`
            : template.gradientCSS 
              ? template.gradientCSS
              : template.useGradient 
                ? `linear-gradient(${template.gradientAngle || 135}deg, ${template.primaryColor}, ${template.accentColor})` 
                : undefined,
          backgroundColor: template.primaryColor,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {isPromo && (
          <div className="inline-block px-4 py-1 bg-white/40 backdrop-blur rounded-full text-gray-800 text-sm font-bold mb-4">
            🎉 {translations.specialOffer}
          </div>
        )}
        
        <h1 
          className={`font-bold mb-2 px-6 ${isAnnouncement ? 'text-3xl' : 'text-2xl'}`}
          style={{ color: titleColor, fontFamily: emailFontFamily }}
        >
          {emailTitle || translations.yourTitleHere}
        </h1>
      </div>

      {/* Email body */}
      <div className="p-8">
        {/* Content - with forced font inheritance */}
        <div 
          className="prose prose-sm max-w-none text-gray-700 mb-6 [&_*]:!font-[inherit]"
          style={{ fontFamily: emailFontFamily }}
          dangerouslySetInnerHTML={{ 
            __html: emailContent || `<p style="color: #9CA3AF;">${translations.contentPreviewPlaceholder}</p>` 
          }}
        />

        {/* Content Images */}
        {contentImages.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {contentImages.map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={img} alt="" className="rounded-lg w-full object-cover" />
            ))}
          </div>
        )}
        
        {/* CTA Button */}
        {ctaText && ctaUrl && (
          <div className="text-center my-8">
            <a 
              href={ctaUrl}
              className={`inline-block px-8 py-4 rounded-lg font-bold shadow-lg ${
                isPromo ? 'text-lg' : ''
              }`}
              style={{ 
                backgroundColor: ctaButtonColor,
                color: ctaButtonTextColor,
                fontFamily: emailFontFamily,
              }}
            >
              {ctaText}
              {isPromo && ' →'}
            </a>
          </div>
        )}
      </div>

      {/* Footer / Signature */}
      {signatureData && (signatureData.sender_name || signatureData.company_name || signatureData.logo_url) ? (
        // Signature email - rendu identique aux emails réels
        <div className="px-8 py-6 border-t border-gray-200" style={{ fontFamily: emailFontFamily }}>
          <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                {/* Logo */}
                {signatureData.logo_url && (
                  <td style={{ paddingRight: '12px', verticalAlign: 'top' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={signatureData.logo_url} 
                      alt="Logo" 
                      style={{ 
                        width: `${signatureData.logo_size || 100}px`, 
                        height: `${signatureData.logo_size || 100}px`, 
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
                  {signatureData.sender_name && (
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: sigTextColor }}>
                      {signatureData.sender_name}
                    </div>
                  )}
                  {signatureData.sender_title && (
                    <div style={{ color: sigSecondaryColor, marginBottom: '6px', fontSize: '14px' }}>
                      {signatureData.sender_title}
                    </div>
                  )}
                  
                  {/* Company */}
                  {signatureData.company_name && (
                    <div style={{ fontWeight: 600, color: sigPrimaryColor, marginBottom: '4px' }}>
                      {signatureData.company_name}
                    </div>
                  )}
                  
                  {/* Contact */}
                  <div style={{ fontSize: '13px', color: sigSecondaryColor }}>
                    {signatureData.phone && <div>📞 {signatureData.phone}</div>}
                    {signatureData.website && (
                      <div>
                        🌐 <a href={signatureData.website} style={{ color: sigPrimaryColor, textDecoration: 'none' }}>
                          {signatureData.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {signatureData.address && <div>📍 {signatureData.address}</div>}
                  </div>
                  
                  {/* Social links */}
                  {signatureData.social_links && signatureData.social_links.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      {signatureData.social_links.map((link, index) => {
                        const label = link.label || SOCIAL_PLATFORM_LABELS[link.platform] || link.platform;
                        const color = link.color || sigPrimaryColor;
                        
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
          
          {/* Unsubscribe */}
          {translations.unsubscribe && (
            <p className="text-xs mt-4 text-center">
              <a href="#" style={{ color: sigPrimaryColor }} className="hover:underline">
                {translations.unsubscribe}
              </a>
            </p>
          )}
        </div>
      ) : (
        // Footer classique avec footerSettings
        <div className="p-6" style={{ fontFamily: emailFontFamily }}>
          <div className="flex items-start gap-6">
            {/* Logo / Avatar */}
            <div className="flex-shrink-0">
              {footerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={footerLogoUrl} 
                  alt="Logo" 
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : userProfilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={userProfilePicture}
                  alt="Profile"
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-300 flex items-center justify-center">
                  <IconUser className="w-8 h-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex-1 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">
                {footerSettings.firstName} {footerSettings.lastName}
              </p>
              {footerSettings.email && (
                <p className="flex items-center gap-2 mb-0.5">
                  <IconMail className="w-4 h-4" />
                  {footerSettings.email}
                </p>
              )}
              {footerSettings.phone && (
                <p className="flex items-center gap-2 mb-0.5">
                  <IconPhone className="w-4 h-4" />
                  {footerSettings.phone}
                </p>
              )}
              {footerSettings.website && (
                <p className="flex items-center gap-2 mb-0.5">
                  <IconWorld className="w-4 h-4" />
                  <a href={footerSettings.website} className="text-blue-600 hover:underline">
                    {footerSettings.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
              
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-3">
                {footerSettings.linkedin && (
                  <a href={footerSettings.linkedin} className="text-gray-500 hover:text-blue-600">
                    <IconBrandLinkedin className="w-5 h-5" />
                  </a>
                )}
                {footerSettings.twitter && (
                  <a href={footerSettings.twitter} className="text-gray-500 hover:text-sky-500">
                    <IconBrandTwitter className="w-5 h-5" />
                  </a>
                )}
                {footerSettings.instagram && (
                  <a href={footerSettings.instagram} className="text-gray-500 hover:text-pink-600">
                    <IconBrandInstagram className="w-5 h-5" />
                  </a>
                )}
                {footerSettings.facebook && (
                  <a href={footerSettings.facebook} className="text-gray-500 hover:text-blue-700">
                    <IconBrandFacebook className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Custom text */}
          {footerSettings.customText && (
            <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200">
              {footerSettings.customText}
            </p>
          )}

          {/* Unsubscribe */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            <a href="#" className="hover:underline">{footerSettings.unsubscribeText}</a>
          </p>
        </div>
      )}
      
      {/* Banner (end of email) - utilise la bannière de la signature si aucune bannière spécifique */}
      {(bannerImageUrl || signatureData?.banner_url) && (
        <div className="flex justify-center items-center w-full pb-8 px-6">
          {(signatureData?.banner_link || '') ? (
            <a href={signatureData?.banner_link} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={bannerImageUrl || signatureData?.banner_url || ''} 
                alt="Bannière" 
                className="w-full rounded-lg object-contain max-h-48"
              />
            </a>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={bannerImageUrl || signatureData?.banner_url || ''} 
              alt="Bannière" 
              className="w-full rounded-lg object-contain max-h-48"
            />
          )}
        </div>
      )}
    </div>
  );
}

// Composant éditeur de texte riche simplifié
interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onImageFromComputer?: () => void;
  onImageFromLibrary?: () => void;
  onImageFromUrl?: (url: string) => void;
  uploadingImage?: boolean;
  fontFamily?: string;
  onVideoFromComputer?: () => void;
  onVideoFromLibrary?: () => void;
  onVideoFromUrl?: (url: string) => void;
  uploadingVideo?: boolean;
  translations: {
    heading1: string;
    heading2: string;
    paragraph: string;
    bold: string;
    italic: string;
    bulletList: string;
    numberedList: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    textColor: string;
    insertLink: string;
    insertImage?: string;
    insertVideo?: string;
    fromComputer?: string;
    fromLibrary?: string;
    fromUrl?: string;
    cancel?: string;
  };
  onMediaDeleted?: (url: string, type: 'image' | 'video') => void;
}

function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  onImageFromComputer, 
  onImageFromLibrary,
  onImageFromUrl,
  uploadingImage, 
  onVideoFromComputer, 
  onVideoFromLibrary,
  onVideoFromUrl,
  uploadingVideo, 
  translations, 
  fontFamily,
  onMediaDeleted,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const isInternalChange = useRef(false); // Track if change is from inside editor
  const lastExternalValue = useRef<string>(''); // Track last value from outside
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // Media picker state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  
  // Media selection state
  const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
  const [mediaToolbarPosition, setMediaToolbarPosition] = useState({ top: 0, left: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Close all popups
  const closeAllPopups = () => {
    setShowColorPicker(false);
    setShowLinkInput(false);
    setShowImagePicker(false);
    setShowVideoPicker(false);
    setShowImageUrlInput(false);
    setShowVideoUrlInput(false);
  };

  // Internal onChange wrapper - marks change as internal to prevent sync loop
  const notifyChange = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      lastExternalValue.current = editorRef.current.innerHTML;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Toggle color picker (close others)
  const toggleColorPicker = () => {
    closeAllPopups();
    setShowColorPicker(!showColorPicker);
  };

  // Toggle link input (close others)
  const toggleLinkInput = () => {
    closeAllPopups();
    setShowLinkInput(!showLinkInput);
  };

  // Toggle image picker (close others)
  const toggleImagePicker = () => {
    closeAllPopups();
    setShowImagePicker(!showImagePicker);
  };

  // Toggle video picker (close others)
  const toggleVideoPicker = () => {
    closeAllPopups();
    setShowVideoPicker(!showVideoPicker);
  };

  // Handle image from URL
  const handleImageUrl = () => {
    if (imageUrlInput && onImageFromUrl) {
      onImageFromUrl(imageUrlInput);
      setImageUrlInput('');
      setShowImageUrlInput(false);
      setShowImagePicker(false);
    }
  };

  // Handle video from URL
  const handleVideoUrl = () => {
    if (videoUrlInput && onVideoFromUrl) {
      onVideoFromUrl(videoUrlInput);
      setVideoUrlInput('');
      setShowVideoUrlInput(false);
      setShowVideoPicker(false);
    }
  };

  // Font family CSS
  const editorFontFamily = fontFamily ? `'${fontFamily}', Arial, sans-serif` : 'Arial, sans-serif';

  // Initialiser le contenu et synchroniser avec les changements externes
  useEffect(() => {
    if (editorRef.current) {
      // Initial mount
      if (!isInitialized.current) {
        editorRef.current.innerHTML = value || '';
        lastExternalValue.current = value || '';
        isInitialized.current = true;
      } 
      // External change (from removeImage/removeVideo)
      else if (!isInternalChange.current && value !== lastExternalValue.current) {
        // Only update if content is different (external update)
        editorRef.current.innerHTML = value || '';
        lastExternalValue.current = value || '';
        setSelectedMedia(null); // Deselect any media since DOM changed
      }
      // Reset internal change flag
      isInternalChange.current = false;
    }
  }, [value]);

  // Handle click on media elements
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
      e.preventDefault();
      setSelectedMedia(target);
      
      // Position the toolbar above the media
      const rect = target.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      if (editorRect) {
        setMediaToolbarPosition({
          top: rect.top - editorRect.top - 45,
          left: rect.left - editorRect.left + rect.width / 2,
        });
      }
    } else {
      setSelectedMedia(null);
    }
  }, []);

  // Deselect media when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedMedia && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setSelectedMedia(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedMedia]);

  // Media alignment functions
  const setMediaAlignment = (alignment: 'left' | 'center' | 'right' | 'inline') => {
    if (!selectedMedia) return;
    
    // Reset all styles
    selectedMedia.style.float = '';
    selectedMedia.style.display = '';
    selectedMedia.style.margin = '';
    selectedMedia.style.marginLeft = '';
    selectedMedia.style.marginRight = '';
    
    switch (alignment) {
      case 'left':
        selectedMedia.style.float = 'left';
        selectedMedia.style.marginRight = '16px';
        selectedMedia.style.marginBottom = '8px';
        break;
      case 'right':
        selectedMedia.style.float = 'right';
        selectedMedia.style.marginLeft = '16px';
        selectedMedia.style.marginBottom = '8px';
        break;
      case 'center':
        selectedMedia.style.display = 'block';
        selectedMedia.style.marginLeft = 'auto';
        selectedMedia.style.marginRight = 'auto';
        selectedMedia.style.marginBottom = '8px';
        break;
      case 'inline':
        selectedMedia.style.display = 'inline';
        selectedMedia.style.marginBottom = '8px';
        break;
    }
    
    notifyChange();
  };

  // Resize functions
  const startResize = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedMedia) return;
    
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: selectedMedia.offsetWidth,
      height: selectedMedia.offsetHeight,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedMedia) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.x;
      
      let newWidth = resizeStartRef.current.width;
      
      if (direction.includes('e')) newWidth += deltaX;
      if (direction.includes('w')) newWidth -= deltaX;
      
      // Minimum size
      newWidth = Math.max(50, newWidth);
      
      selectedMedia.style.width = `${newWidth}px`;
      selectedMedia.style.height = 'auto';
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      notifyChange();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Delete selected media
  const deleteSelectedMedia = useCallback(() => {
    if (!selectedMedia) {
      console.log('No media selected');
      return;
    }
    
    // Get media info before deleting
    const mediaUrl = selectedMedia.getAttribute('src') || '';
    const mediaType: 'image' | 'video' = selectedMedia.tagName === 'IMG' ? 'image' : 'video';
    
    // Remove from DOM
    if (selectedMedia.parentNode) {
      selectedMedia.parentNode.removeChild(selectedMedia);
    }
    
    setSelectedMedia(null);
    
    // Update editor content
    notifyChange();
    
    // Notify parent to update lists
    if (onMediaDeleted && mediaUrl) {
      onMediaDeleted(mediaUrl, mediaType);
    }
  }, [selectedMedia, notifyChange, onMediaDeleted]);

  // Handle Delete/Backspace key to delete selected media
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMedia && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteSelectedMedia();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia, deleteSelectedMedia]);

  // Resize presets
  const setMediaSize = (size: 'small' | 'medium' | 'large' | 'full') => {
    if (!selectedMedia) return;
    
    switch (size) {
      case 'small':
        selectedMedia.style.width = '150px';
        break;
      case 'medium':
        selectedMedia.style.width = '300px';
        break;
      case 'large':
        selectedMedia.style.width = '450px';
        break;
      case 'full':
        selectedMedia.style.width = '100%';
        break;
    }
    selectedMedia.style.height = 'auto';
    
    notifyChange();
  };

  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    notifyChange();
  }, [notifyChange]);

  const handleInput = () => {
    notifyChange();
  };

  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const colors = ['#000000', '#374151', '#7C3AED', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="border border-default rounded-xl overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted border-b border-default">
        {/* Text Style */}
        <div className="flex items-center gap-0.5 px-1 border-r border-default mr-1">
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h1')}
            className="p-2 rounded cursor-pointer hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.heading1}
          >
            <IconH1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="p-2 rounded cursor-pointer   hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.heading2}
          >
            <IconH2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="p-2 rounded cursor-pointer hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.paragraph}
          >
            <IconTypography className="w-4 h-4" />
          </button>
        </div>

        {/* Format */}
        <div className="flex items-center gap-0.5 px-1 border-r border-default mr-1">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.bold}
          >
            <IconBold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.italic}
          >
            <IconItalic className="w-4 h-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 px-1 border-r border-default mr-1">
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.bulletList}
          >
            <IconList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.numberedList}
          >
            <IconListNumbers className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-1 border-r border-default mr-1"> 
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.alignLeft}
          >
            <IconAlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.alignCenter}
          >
            <IconAlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-2 rounded hover:bg-hover cursor-pointer transition-colors text-secondary hover:text-primary"
            title={translations.alignRight}
          >
            <IconAlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Color */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleColorPicker}
            className={`p-2 rounded transition-colors ${
              showColorPicker 
                ? 'bg-accent text-white' 
                : 'hover:bg-hover text-secondary cursor-pointer hover:text-primary'
            }`}
            title={translations.textColor}
          >
            <IconColorSwatch className="w-4 h-4" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-default rounded-lg shadow-lg z-10 flex gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    execCommand('foreColor', color);
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Link */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleLinkInput}
            className={`p-2 rounded transition-colors ${
              showLinkInput 
                ? 'bg-accent text-white' 
                : 'hover:bg-hover text-secondary cursor-pointer hover:text-primary'
            }`}
            title={translations.insertLink}
          >
            <IconLink className="w-4 h-4" />
          </button>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-default rounded-lg shadow-lg z-10 flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="input text-sm w-48"
              />
              <button
                type="button"
                onClick={insertLink}
                className="px-3 py-1 bg-accent text-white rounded cursor-pointer text-sm"
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Image & Video with dropdowns */}
        <div className="flex items-center gap-0.5 px-1 border-l border-default ml-1">
          {/* Image picker */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleImagePicker}
              disabled={uploadingImage}
              className={`p-2 rounded cursor-pointer transition-colors disabled:opacity-50 ${
                showImagePicker 
                  ? 'bg-accent text-white' 
                  : 'hover:bg-hover text-secondary hover:text-primary'
              }`}
              title={translations.insertImage || 'Image'}
            >
              {uploadingImage ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconPhoto className="w-4 h-4" />
              )}
            </button>
            
            {showImagePicker && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-default rounded-lg shadow-xl z-20 overflow-hidden">
                {!showImageUrlInput ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onImageFromComputer?.();
                        setShowImagePicker(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-hover transition-colors flex items-center gap-3 text-primary"
                    >
                      <IconUpload className="w-4 h-4 text-secondary" />
                      {translations.fromComputer || 'Depuis l\'ordinateur'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onImageFromLibrary?.();
                        setShowImagePicker(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-hover transition-colors flex items-center gap-3 text-primary border-t border-default"
                    >
                      <IconPhoto className="w-4 h-4 text-secondary" />
                      {translations.fromLibrary || 'Depuis la bibliothèque'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImageUrlInput(true)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-hover transition-colors flex items-center gap-3 text-primary border-t border-default"
                    >
                      <IconLink className="w-4 h-4 text-secondary" />
                      {translations.fromUrl || 'Depuis une URL'}
                    </button>
                  </>
                ) : (
                  <div className="p-3 space-y-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="input text-sm w-full"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowImageUrlInput(false)}
                        className="flex-1 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
                      >
                        {translations.cancel || 'Annuler'}
                      </button>
                      <button
                        type="button"
                        onClick={handleImageUrl}
                        className="flex-1 px-3 py-1.5 bg-accent text-white rounded text-sm"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video picker */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleVideoPicker}
              disabled={uploadingVideo}
              className={`p-2 rounded cursor-pointer transition-colors disabled:opacity-50 ${
                showVideoPicker 
                  ? 'bg-accent text-white' 
                  : 'hover:bg-hover text-secondary hover:text-primary'
              }`}
              title={translations.insertVideo || 'Video'}
            >
              {uploadingVideo ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconVideo className="w-4 h-4" />
              )}
            </button>
            
            {showVideoPicker && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-default rounded-lg shadow-xl z-20 overflow-hidden">
                {!showVideoUrlInput ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onVideoFromComputer?.();
                        setShowVideoPicker(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-hover transition-colors flex items-center gap-3 text-primary"
                    >
                      <IconUpload className="w-4 h-4 text-secondary" />
                      {translations.fromComputer || 'Depuis l\'ordinateur'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onVideoFromLibrary?.();
                        setShowVideoPicker(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-hover transition-colors flex items-center gap-3 text-primary border-t border-default"
                    >
                      <IconVideo className="w-4 h-4 text-secondary" />
                      {translations.fromLibrary || 'Depuis la bibliothèque'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVideoUrlInput(true)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-hover transition-colors flex items-center gap-3 text-primary border-t border-default"
                    >
                      <IconLink className="w-4 h-4 text-secondary" />
                      {translations.fromUrl || 'Depuis une URL'}
                    </button>
                  </>
                ) : (
                  <div className="p-3 space-y-2">
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="input text-sm w-full"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowVideoUrlInput(false)}
                        className="flex-1 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
                      >
                        {translations.cancel || 'Annuler'}
                      </button>
                      <button
                        type="button"
                        onClick={handleVideoUrl}
                        className="flex-1 px-3 py-1.5 bg-accent text-white rounded text-sm"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="relative">
        {/* Media Toolbar - appears when media is selected */}
        {selectedMedia && !isResizing && (
          <div 
            className="absolute z-20 flex items-center gap-1 p-1.5 bg-gray-900 rounded-lg shadow-xl"
            style={{ 
              top: mediaToolbarPosition.top,
              left: mediaToolbarPosition.left,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Alignment buttons */}
            <button
              type="button"
              onClick={() => setMediaAlignment('left')}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Aligner à gauche avec texte"
            >
              <IconAlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMediaAlignment('center')}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Centrer"
            >
              <IconAlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMediaAlignment('right')}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Aligner à droite avec texte"
            >
              <IconAlignRight className="w-4 h-4" />
            </button>
            
            <div className="w-px h-5 bg-gray-600 mx-1" />
            
            {/* Size presets */}
            <button
              type="button"
              onClick={() => setMediaSize('small')}
              className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs font-medium"
              title="Petit"
            >
              S
            </button>
            <button
              type="button"
              onClick={() => setMediaSize('medium')}
              className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs font-medium"
              title="Moyen"
            >
              M
            </button>
            <button
              type="button"
              onClick={() => setMediaSize('large')}
              className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs font-medium"
              title="Grand"
            >
              L
            </button>
            <button
              type="button"
              onClick={() => setMediaSize('full')}
              className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs font-medium"
              title="Pleine largeur"
            >
              100%
            </button>
            
            <div className="w-px h-5 bg-gray-600 mx-1" />
            
            {/* Delete button */}
            <button
              type="button"
              onClick={deleteSelectedMedia}
              className="p-1.5 rounded hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
              title="Supprimer"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Resize handles - show when media is selected */}
        {selectedMedia && (
          <>
            {/* Corner handles for resizing */}
            <div
              className="absolute w-3 h-3 bg-accent border-2 border-white rounded-sm cursor-se-resize z-30 shadow"
              style={{
                top: (selectedMedia.offsetTop || 0) + selectedMedia.offsetHeight - 6,
                left: (selectedMedia.offsetLeft || 0) + selectedMedia.offsetWidth - 6,
              }}
              onMouseDown={(e) => startResize(e, 'se')}
            />
          </>
        )}

        <div
          ref={editorRef}
          contentEditable
          dir="ltr"
          onInput={handleInput}
          onClick={handleEditorClick}
          className="min-h-[200px] p-4 bg-white focus:outline-none prose prose-sm max-w-none
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
            [&_p]:mb-2
            [&_ul]:list-disc [&_ul]:pl-5
            [&_ol]:list-decimal [&_ol]:pl-5
            [&_a]:text-accent [&_a]:underline
            [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:transition-all [&_img]:max-w-full
            [&_video]:rounded-lg [&_video]:cursor-pointer [&_video]:transition-all [&_video]:max-w-full
            empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
          style={{ 
            fontFamily: editorFontFamily,
            color: '#000000',
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />

        {/* Selection indicator */}
        {selectedMedia && (
          <div
            className="absolute pointer-events-none border-2 border-accent rounded-lg"
            style={{
              top: selectedMedia.offsetTop,
              left: selectedMedia.offsetLeft,
              width: selectedMedia.offsetWidth,
              height: selectedMedia.offsetHeight,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function ComposeNewsletterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  // Data hooks
  const { data: clientsData } = useClients(user?.id);
  const { data: companyData } = useCompany(user?.id);
  
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);
  const company = useMemo(() => {
    const data = companyData as Company[] | undefined;
    return data?.[0] || null;
  }, [companyData]);

  // State
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  
  // Email content
  const [emailTitle, setEmailTitle] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [contentImages, setContentImages] = useState<string[]>([]);
  const [contentVideos, setContentVideos] = useState<string[]>([]);
  
  // CTA
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  
  // Banner
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  
  // Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [manualEmails, setManualEmails] = useState<Array<{ email: string; name?: string }>>([]);
  const [emailInput, setEmailInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [showFooterSettings, setShowFooterSettings] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  
  // SMTP Config State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [showSmtpWarning, setShowSmtpWarning] = useState(false);
  
  // Email Signature State (for banner and signature data)
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  
  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [activeCustomTemplateId, setActiveCustomTemplateId] = useState<string | null>(null);
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  
  // Custom template colors with gradient stops
  interface GradientStop {
    id: string;
    color: string;
    position: number; // 0-100%
    opacity: number;  // 0-100%
  }
  
  // Polices Google disponibles
  const availableFonts = [
    { name: 'Inter', family: 'Inter, sans-serif' },
    { name: 'Roboto', family: 'Roboto, sans-serif' },
    { name: 'Open Sans', family: "'Open Sans', sans-serif" },
    { name: 'Lato', family: 'Lato, sans-serif' },
    { name: 'Montserrat', family: 'Montserrat, sans-serif' },
    { name: 'Poppins', family: 'Poppins, sans-serif' },
    { name: 'Nunito', family: 'Nunito, sans-serif' },
    { name: 'Raleway', family: 'Raleway, sans-serif' },
    { name: 'Playfair Display', family: "'Playfair Display', serif" },
    { name: 'Merriweather', family: 'Merriweather, serif' },
    { name: 'Source Sans Pro', family: "'Source Sans Pro', sans-serif" },
    { name: 'Oswald', family: 'Oswald, sans-serif' },
    { name: 'Quicksand', family: 'Quicksand, sans-serif' },
    { name: 'Work Sans', family: "'Work Sans', sans-serif" },
    { name: 'DM Sans', family: "'DM Sans', sans-serif" },
  ];

  const [customColors, setCustomColors] = useState({
    gradientStops: [
      { id: '1', color: '#FFFFFF', position: 0, opacity: 100 },
      { id: '2', color: '#FFFFFF', position: 100, opacity: 100 },
    ] as GradientStop[],
    buttonColor: '#3B82F6',
    buttonTextColor: '#FFFFFF', // Couleur du texte du bouton
    textColor: '#1F2937',
    headerTitleColor: '#1F2937', // Couleur du titre sur le header
    gradientAngle: 90,
    fontFamily: 'Inter', // Police Google Fonts
  });
  
  // UI State for theme customization in content step
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  // Draft management for newsletter
  const { clearDraft: clearNewsletterDraft } = useDraftSave({
    draftKey: 'newsletter-compose-draft',
    data: {
      selectedTemplate,
      emailTitle,
      emailSubject,
      emailContent,
      contentImages,
      ctaText,
      ctaUrl,
      bannerImageUrl,
      selectedRecipients,
      manualEmails,
      customColors,
    },
    onRestore: (draft) => {
      if (draft.selectedTemplate) setSelectedTemplate(draft.selectedTemplate as TemplateType);
      if (draft.emailTitle) setEmailTitle(draft.emailTitle as string);
      if (draft.emailSubject) setEmailSubject(draft.emailSubject as string);
      if (draft.emailContent) setEmailContent(draft.emailContent as string);
      if (draft.contentImages) setContentImages(draft.contentImages as string[]);
      if (draft.ctaText) setCtaText(draft.ctaText as string);
      if (draft.ctaUrl) setCtaUrl(draft.ctaUrl as string);
      if (draft.bannerImageUrl) setBannerImageUrl(draft.bannerImageUrl as string);
      if (draft.selectedRecipients) setSelectedRecipients(draft.selectedRecipients as number[]);
      if (draft.manualEmails) setManualEmails(draft.manualEmails as Array<{ email: string; name?: string }>);
      if (draft.customColors) setCustomColors(draft.customColors as typeof customColors);
      // Go to content step if template was selected
      if (draft.selectedTemplate) setCurrentStep('content');
    },
    autoSaveDelay: 15000, // Sauvegarde toutes les 15 secondes
  });

  // Generate CSS gradient from stops
  const generateGradientCSS = (stops: GradientStop[], angle: number) => {
    if (stops.length === 0) return '#FFFFFF';
    if (stops.length === 1) {
      const s = stops[0];
      return hexToRgba(s.color, s.opacity / 100);
    }
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const colorStops = sortedStops
      .map(s => `${hexToRgba(s.color, s.opacity / 100)} ${s.position}%`)
      .join(', ');
    return `linear-gradient(${angle}deg, ${colorStops})`;
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Add a new stop
  const addGradientStop = () => {
    const newId = Date.now().toString();
    const newPosition = 50;
    setCustomColors(prev => ({
      ...prev,
      gradientStops: [...prev.gradientStops, { id: newId, color: '#9CA3AF', position: newPosition, opacity: 100 }]
    }));
  };

  // Remove a stop
  const removeGradientStop = (id: string) => {
    if (customColors.gradientStops.length <= 1) return;
    setCustomColors(prev => ({
      ...prev,
      gradientStops: prev.gradientStops.filter(s => s.id !== id)
    }));
  };

  // Update a stop
  const updateGradientStop = (id: string, updates: Partial<GradientStop>) => {
    setCustomColors(prev => ({
      ...prev,
      gradientStops: prev.gradientStops.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  // Load SMTP config on mount
  useEffect(() => {
    const loadSmtpConfig = async () => {
      if (!user?.id) {
        return;
      }
      
      try {
        const config = await fetchSmtpConfig(user.id);
        setSmtpConfig(config);
      } catch (error) {
        console.error('Error loading SMTP config:', error);
      }
    };
    
    loadSmtpConfig();
  }, [user?.id]);
  
  // Load email signature on mount (for banner and signature data)
  useEffect(() => {
    const loadSignature = async () => {
      if (!user?.id) return;
      
      try {
        const sig = await fetchEmailSignature(user.id);
        if (sig) {
          setSignatureData({
            company_name: sig.company_name || '',
            sender_name: sig.sender_name || '',
            sender_title: sig.sender_title || '',
            phone: sig.phone || '',
            website: sig.website || '',
            address: sig.address || '',
            linkedin_url: sig.linkedin_url || '',
            twitter_url: sig.twitter_url || '',
            instagram_url: sig.instagram_url || '',
            facebook_url: sig.facebook_url || '',
            logo_url: sig.logo_url || '',
            banner_url: sig.banner_url || '',
            banner_link: sig.banner_link || '',
            banner_alt: sig.banner_alt || '',
            logo_size: sig.logo_size || 100,
            primary_color: sig.primary_color || '#10b981',
            text_color: sig.text_color || '#333333',
            secondary_color: sig.secondary_color || '#666666',
            font_family: sig.font_family || 'Inter',
            social_links: sig.social_links || [],
          });
          
          // Auto-fill banner from signature if no banner set yet
          if (sig.banner_url && !bannerImageUrl) {
            setBannerImageUrl(sig.banner_url);
          }
        }
      } catch (error) {
        console.error('Error loading email signature:', error);
      } finally {
        setSignatureLoaded(true);
      }
    };
    
    loadSignature();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load ALL Google Fonts on mount for font preview buttons
  useEffect(() => {
    availableFonts.forEach(font => {
      const fontName = font.name.replace(/\s+/g, '+');
      const linkId = `google-font-${fontName}`;
      
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        // Use the correct Google Fonts API v2 format with variable weights
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,400..900;1,400..900&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [availableFonts]);
  
  // Refs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _bannerInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const contentVideoInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _headerBackgroundInputRef = useRef<HTMLInputElement>(null);
  
  // Footer settings with company data
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    showLogo: true,
    logoUrl: '',
    firstName: user?.username?.split(' ')[0] || '',
    lastName: user?.username?.split(' ')[1] || '',
    email: user?.email || '',
    phone: company?.phoneNumber || '',
    website: company?.website || '',
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    customText: '',
    unsubscribeText: 'Se désabonner',
  });

  // Update footer when data loads
  React.useEffect(() => {
    if (company || user) {
      setFooterSettings(prev => ({
        ...prev,
        logoUrl: company?.logo || '',
        firstName: user?.username?.split(' ')[0] || prev.firstName,
        lastName: user?.username?.split(' ')[1] || prev.lastName,
        email: user?.email || prev.email,
        phone: company?.phoneNumber || prev.phone,
        website: company?.website || prev.website,
      }));
    }
  }, [company, user]);

  // Templates configuration - Palette personnalisée (pas de gradient par défaut)
  const templates: EmailTemplate[] = useMemo(() => [
    {
      id: 'standard',
      name: t('template_standard'),
      description: t('template_standard_desc'),
      icon: <IconNews className="w-8 h-8" stroke={1} />,
      primaryColor: '#8B9DC3',
      accentColor: '#A8B5D4',
      borderColor: '#9BA8C7',
      features: [t('feature_clean_design'), t('feature_content_focus'), t('feature_ideal_updates')],
      useGradient: false, // Couleur unie par défaut
    },
    {
      id: 'promotional',
      name: t('template_promotional'),
      description: t('template_promotional_desc'),
      icon: <IconSparkles className="w-8 h-8" stroke={1} />,
      primaryColor: '#7BB8E0',
      accentColor: '#9DCEF0',
      borderColor: '#8FC4E8',
      features: [t('feature_promo_badge'), t('feature_prominent_cta'), t('feature_ideal_offers')],
      useGradient: false, // Couleur unie par défaut
    },
    {
      id: 'announcement',
      name: t('template_announcement'),
      description: t('template_announcement_desc'),
      icon: <IconSpeakerphone className="w-8 h-8" stroke={1} />,
      primaryColor: '#9DD1CA',
      accentColor: '#B5DDD8',
      borderColor: '#A8D5CF',
      features: [t('feature_visual_impact'), t('feature_centered_message'), t('feature_ideal_events')],
      useGradient: false, // Couleur unie par défaut
    },
    {
      id: 'custom',
      name: t('template_custom'),
      description: t('template_custom_desc'),
      icon: <IconPalette className="w-8 h-8 !text-primary" stroke={1} />,
      primaryColor: customColors.gradientStops[0]?.color || '#FFFFFF',
      accentColor: customColors.gradientStops[customColors.gradientStops.length - 1]?.color || '#FFFFFF',
      borderColor: customColors.gradientStops[0]?.color || '#FFFFFF',
      textColor: customColors.textColor,
      features: [t('feature_total_freedom'), t('feature_no_constraints'), t('feature_unique_design')],
      useGradient: true,
      gradientAngle: customColors.gradientAngle,
      gradientCSS: generateGradientCSS(customColors.gradientStops, customColors.gradientAngle),
    },
  ], [t, customColors]);

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = useMemo(() => [
    { id: 'template', label: t('step_template'), icon: <IconTemplate className="w-5 h-5" /> },
    { id: 'content', label: t('step_content'), icon: <IconMail className="w-5 h-5" /> },
    { id: 'recipients', label: t('step_recipients'), icon: <IconUsers className="w-5 h-5" /> },
    { id: 'review', label: t('step_send'), icon: <IconSend className="w-5 h-5" /> },
  ], [t]);

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  // Handlers
  const handleSelectTemplate = (templateId: TemplateType) => {
    // Toggle selection - si on clique sur le même template, on le désélectionne
    if (selectedTemplate === templateId) {
      setSelectedTemplate(null);
    } else {
      setSelectedTemplate(templateId);
    }
  };

  const handleSelectAllRecipients = () => {
    if (selectAll) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(clients.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleRecipient = (clientId: number) => {
    setSelectedRecipients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Filtrer les clients en fonction de l'input email
  const filteredSuggestions = useMemo(() => {
    if (!emailInput.trim()) return [];
    const search = emailInput.toLowerCase();
    return clients.filter(client => 
      (client.email.toLowerCase().includes(search) || 
       client.name.toLowerCase().includes(search)) &&
      !selectedRecipients.includes(client.id)
    ).slice(0, 5); // Limiter à 5 suggestions
  }, [emailInput, clients, selectedRecipients]);

  // Ajouter un email manuel
  const handleAddManualEmail = (email: string, name?: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      showGlobalPopup(t('invalid_email'), 'error');
      return;
    }
    // Vérifier si l'email existe déjà dans les clients
    const existingClient = clients.find(c => c.email.toLowerCase() === trimmedEmail);
    if (existingClient) {
      if (!selectedRecipients.includes(existingClient.id)) {
        setSelectedRecipients(prev => [...prev, existingClient.id]);
      }
    } else {
      // Vérifier si l'email n'est pas déjà dans les emails manuels
      if (!manualEmails.some(m => m.email.toLowerCase() === trimmedEmail)) {
        setManualEmails(prev => [...prev, { email: trimmedEmail, name }]);
      }
    }
    setEmailInput('');
    setShowSuggestions(false);
  };

  // Supprimer un email manuel
  const handleRemoveManualEmail = (email: string) => {
    setManualEmails(prev => prev.filter(m => m.email !== email));
  };

  // Obtenir les initiales d'un email
  const getEmailInitials = (email: string) => {
    const parts = email.split('@')[0];
    if (parts.length >= 2) {
      return (parts[0] + parts[1]).toUpperCase();
    }
    return parts[0]?.toUpperCase() || '?';
  };

  // Gérer la touche Enter dans l'input
  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        // Sélectionner le premier client suggéré
        const firstClient = filteredSuggestions[0];
        setSelectedRecipients(prev => [...prev, firstClient.id]);
        setEmailInput('');
        setShowSuggestions(false);
      } else if (emailInput.includes('@')) {
        // Ajouter comme email manuel
        handleAddManualEmail(emailInput);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleNextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // State pour le chargement des uploads
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingContentImage, setUploadingContentImage] = useState(false);
  const [uploadingContentVideo, setUploadingContentVideo] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_uploadingHeaderBackground, setUploadingHeaderBackground] = useState(false);
  
  // MediaPickerModal state - modal unifié pour tous les uploads
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{
    isOpen: boolean;
    type: 'image' | 'video' | 'all';
    target: 'banner' | 'header' | 'content-image' | 'content-video' | null;
  }>({ isOpen: false, type: 'image', target: null });
  
  // Library modal state (legacy - kept for RichTextEditor)
  const [showLibraryModal, setShowLibraryModal] = useState<{ type: 'image' | 'video'; isOpen: boolean }>({ type: 'image', isOpen: false });
  const [libraryMedia, setLibraryMedia] = useState<{ images: string[]; videos: string[] }>({ images: [], videos: [] });
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Load library media when modal opens
  useEffect(() => {
    if (showLibraryModal.isOpen) {
      const loadMedia = async () => {
        setLoadingLibrary(true);
        try {
          const { fetchUserMedia } = await import('@/lib/api');
          const media = await fetchUserMedia();
          
          const images = media
            .filter(m => m.mime.startsWith('image/'))
            .map(m => m.url);
          const videos = media
            .filter(m => m.mime.startsWith('video/'))
            .map(m => m.url);
          
          setLibraryMedia({ images, videos });
        } catch (error) {
          console.error('Error loading media library:', error);
        } finally {
          setLoadingLibrary(false);
        }
      };
      loadMedia();
    }
  }, [showLibraryModal.isOpen]);

  // Insert media from URL directly into editor
  const insertMediaFromUrl = useCallback((url: string, type: 'image' | 'video') => {
    if (!url) return;
    
    // Add empty paragraphs before and after to allow cursor placement
    if (type === 'image') {
      // Insert image HTML at cursor position with surrounding paragraphs
      const html = `<p><br></p><img src="${url}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block;" /><p><br></p>`;
      document.execCommand('insertHTML', false, html);
      setContentImages(prev => [...prev, url]);
    } else {
      // Insert video HTML at cursor position with surrounding paragraphs
      const html = `<p><br></p><video src="${url}" controls style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block;"></video><p><br></p>`;
      document.execCommand('insertHTML', false, html);
      setContentVideos(prev => [...prev, url]);
    }
  }, []);

  // Insert media from library
  const insertMediaFromLibrary = useCallback((url: string) => {
    insertMediaFromUrl(url, showLibraryModal.type);
    setShowLibraryModal({ type: 'image', isOpen: false });
  }, [insertMediaFromUrl, showLibraryModal.type]);

  // Remove image from list AND from editor content
  const removeImage = useCallback((url: string, idx: number) => {
    // Remove from list
    setContentImages(prev => prev.filter((_, i) => i !== idx));
    
    // Remove from editor HTML content
    setEmailContent(prev => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = prev;
      const images = tempDiv.querySelectorAll(`img[src="${url}"]`);
      images.forEach(img => {
        // Remove surrounding empty paragraphs if any
        const parent = img.parentElement;
        img.remove();
        if (parent && parent.tagName === 'P' && !parent.textContent?.trim()) {
          parent.remove();
        }
      });
      return tempDiv.innerHTML;
    });
  }, []);

  // Remove video from list AND from editor content
  const removeVideo = useCallback((url: string, idx: number) => {
    // Remove from list
    setContentVideos(prev => prev.filter((_, i) => i !== idx));
    
    // Remove from editor HTML content
    setEmailContent(prev => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = prev;
      const videos = tempDiv.querySelectorAll(`video[src="${url}"]`);
      videos.forEach(video => {
        // Remove surrounding empty paragraphs if any
        const parent = video.parentElement;
        video.remove();
        if (parent && parent.tagName === 'P' && !parent.textContent?.trim()) {
          parent.remove();
        }
      });
      return tempDiv.innerHTML;
    });
  }, []);

  // Handle media deletion from editor (called by RichTextEditor)
  const handleMediaDeleted = useCallback((url: string, type: 'image' | 'video') => {
    if (type === 'image') {
      setContentImages(prev => prev.filter(img => img !== url));
    } else {
      setContentVideos(prev => prev.filter(vid => vid !== url));
    }
  }, []);
  
  // Header background image
  const [headerBackgroundUrl, setHeaderBackgroundUrl] = useState('');

  // Image upload handlers - Upload vers Strapi pour compatibilité Gmail
  // Avec validation renforcée pour la sécurité
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation renforcée
      const { validateImageFile } = await import('@/lib/upload-validation');
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        showGlobalPopup(validation.error || t('please_select_image'), 'error');
        return;
      }
      
      setUploadingBanner(true);
      try {
        const { uploadImageToLibrary } = await import('@/lib/api');
        const result = await uploadImageToLibrary(file, 'newsletters');
        setBannerImageUrl(result.url);
        showGlobalPopup(t('image_uploaded_success') || 'Image uploadée avec succès', 'success');
      } catch (error) {
        console.error('Error uploading banner:', error);
        showGlobalPopup(t('image_upload_error') || 'Erreur lors de l\'upload', 'error');
      } finally {
        setUploadingBanner(false);
      }
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation renforcée
      const { validateImageFile } = await import('@/lib/upload-validation');
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        showGlobalPopup(validation.error || t('please_select_image'), 'error');
        return;
      }
      
      setUploadingContentImage(true);
      try {
        const { uploadImageToLibrary } = await import('@/lib/api');
        const result = await uploadImageToLibrary(file, 'newsletters');
        
        // Insérer l'image à la position du curseur dans l'éditeur avec paragraphes pour édition
        const imgHtml = `<p><br></p><img src="${result.url}" alt="Image" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 8px; display: block;" /><p><br></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        
        // Mettre à jour le contenu après insertion
        const editorElement = document.querySelector('[contenteditable="true"]');
        if (editorElement) {
          setEmailContent(editorElement.innerHTML);
        }
        
        // Aussi ajouter à contentImages pour le suivi (optionnel)
        setContentImages(prev => [...prev, result.url]);
        showGlobalPopup(t('image_uploaded_success') || 'Image uploadée avec succès', 'success');
      } catch (error) {
        console.error('Error uploading content image:', error);
        showGlobalPopup(t('image_upload_error') || 'Erreur lors de l\'upload', 'error');
      } finally {
        setUploadingContentImage(false);
        // Reset input pour permettre de sélectionner la même image
        e.target.value = '';
      }
    }
  };

  // Video upload handler
  const handleContentVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation renforcée
      const { validateVideoFile } = await import('@/lib/upload-validation');
      const validation = validateVideoFile(file);
      
      if (!validation.valid) {
        showGlobalPopup(validation.error || t('please_select_video'), 'error');
        return;
      }
      
      setUploadingContentVideo(true);
      try {
        const { uploadImageToLibrary } = await import('@/lib/api');
        const result = await uploadImageToLibrary(file, 'newsletters');
        
        // Insérer la vidéo à la position du curseur avec paragraphes pour édition
        const videoHtml = `<p><br></p><video src="${result.url}" controls style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 8px; display: block;"></video><p><br></p>`;
        document.execCommand('insertHTML', false, videoHtml);
        
        // Mettre à jour le contenu après insertion
        const editorElement = document.querySelector('[contenteditable="true"]');
        if (editorElement) {
          setEmailContent(editorElement.innerHTML);
        }
        
        // Ajouter à contentVideos pour le suivi
        setContentVideos(prev => [...prev, result.url]);
        
        showGlobalPopup(t('video_uploaded_success') || 'Vidéo uploadée avec succès', 'success');
      } catch (error) {
        console.error('Error uploading video:', error);
        showGlobalPopup(t('video_upload_error') || 'Erreur lors de l\'upload de la vidéo', 'error');
      } finally {
        setUploadingContentVideo(false);
        e.target.value = '';
      }
    }
  };

  // Header background image upload handler (legacy - kept for ThemeCustomizer file input)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleHeaderBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation renforcée
      const { validateImageFile } = await import('@/lib/upload-validation');
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        showGlobalPopup(validation.error || t('please_select_image'), 'error');
        return;
      }
      
      setUploadingHeaderBackground(true);
      try {
        const { uploadImageToLibrary } = await import('@/lib/api');
        const result = await uploadImageToLibrary(file, 'newsletters');
        
        setHeaderBackgroundUrl(result.url);
        showGlobalPopup(t('image_uploaded_success') || 'Image uploadée avec succès', 'success');
      } catch (error) {
        console.error('Error uploading header background:', error);
        showGlobalPopup(t('image_upload_error') || 'Erreur lors de l\'upload', 'error');
      } finally {
        setUploadingHeaderBackground(false);
        e.target.value = '';
      }
    }
  };

  // Handler pour MediaPickerModal - gestion centralisée des sélections de médias
  const handleMediaPickerSelect = useCallback((url: string) => {
    const target = mediaPickerConfig.target;
    
    switch (target) {
      case 'banner':
        setBannerImageUrl(url);
        showGlobalPopup(t('image_uploaded_success') || 'Bannière ajoutée avec succès', 'success');
        break;
      case 'header':
        setHeaderBackgroundUrl(url);
        showGlobalPopup(t('image_uploaded_success') || 'Image d\'en-tête ajoutée avec succès', 'success');
        break;
      case 'content-image':
        // Insérer l'image dans l'éditeur
        const imgHtml = `<p><br></p><img src="${url}" alt="Image" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 8px; display: block;" /><p><br></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        const editorElement = document.querySelector('[contenteditable="true"]');
        if (editorElement) {
          setEmailContent(editorElement.innerHTML);
        }
        setContentImages(prev => [...prev, url]);
        showGlobalPopup(t('image_uploaded_success') || 'Image ajoutée avec succès', 'success');
        break;
      case 'content-video':
        // Insérer la vidéo dans l'éditeur
        const videoHtml = `<p><br></p><video src="${url}" controls style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 8px; display: block;"></video><p><br></p>`;
        document.execCommand('insertHTML', false, videoHtml);
        const editorEl = document.querySelector('[contenteditable="true"]');
        if (editorEl) {
          setEmailContent(editorEl.innerHTML);
        }
        setContentVideos(prev => [...prev, url]);
        showGlobalPopup(t('video_uploaded_success') || 'Vidéo ajoutée avec succès', 'success');
        break;
    }
    
    setMediaPickerConfig({ isOpen: false, type: 'image', target: null });
  }, [mediaPickerConfig.target, showGlobalPopup, t]);

  // Fonctions pour ouvrir le MediaPicker pour différents usages
  const openBannerPicker = useCallback(() => {
    setMediaPickerConfig({ isOpen: true, type: 'image', target: 'banner' });
  }, []);

  const openHeaderBackgroundPicker = useCallback(() => {
    setMediaPickerConfig({ isOpen: true, type: 'image', target: 'header' });
  }, []);

  // Load custom templates on mount
  useEffect(() => {
    if (user?.id) {
      const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
          const templates = await fetchUserCustomTemplates(user.id);
          setCustomTemplates(templates);
          
          // If there's a default template, apply it
          const defaultTemplate = templates.find(t => t.is_default);
          if (defaultTemplate) {
            applyTemplate(defaultTemplate);
          }
        } catch (error) {
          console.error('Error loading custom templates:', error);
        } finally {
          setLoadingTemplates(false);
        }
      };
      loadTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Apply a template to the current settings
  const applyTemplate = useCallback((template: CustomTemplate) => {
    setCustomColors({
      gradientStops: template.gradient_stops || [],
      gradientAngle: template.gradient_angle || 135,
      buttonColor: template.button_color || '#10b981',
      buttonTextColor: template.button_text_color || '#ffffff',
      textColor: template.text_color || '#374151',
      headerTitleColor: template.header_title_color || '#ffffff',
      fontFamily: template.font_family || 'Inter, sans-serif',
    });
    if (template.header_background_url) {
      setHeaderBackgroundUrl(template.header_background_url);
    }
    if (template.banner_url) {
      setBannerImageUrl(template.banner_url);
    }
    setActiveCustomTemplateId(template.documentId);
    showGlobalPopup(t('template_loaded_success') || 'Thème appliqué avec succès', 'success');
  }, [setCustomColors, setHeaderBackgroundUrl, showGlobalPopup, t]);

  // Update an existing template with current settings
  const handleUpdateTemplate = useCallback(async (templateId: string) => {
    if (!user?.id) return;
    
    setUpdatingTemplateId(templateId);
    try {
      const { updateCustomTemplate } = await import('@/lib/api');
      
      await updateCustomTemplate(templateId, {
        gradient_stops: customColors.gradientStops,
        gradient_angle: customColors.gradientAngle,
        button_color: customColors.buttonColor,
        button_text_color: customColors.buttonTextColor,
        text_color: customColors.textColor,
        header_title_color: customColors.headerTitleColor,
        font_family: customColors.fontFamily,
        header_background_url: headerBackgroundUrl || undefined,
        banner_url: bannerImageUrl || undefined,
      });
      
      // Reload templates
      const templates = await fetchUserCustomTemplates(user.id);
      setCustomTemplates(templates);
      
      showGlobalPopup(t('template_updated_success') || 'Thème mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Error updating template:', error);
      showGlobalPopup(t('template_update_error') || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setUpdatingTemplateId(null);
    }
  }, [user?.id, customColors, headerBackgroundUrl, bannerImageUrl, showGlobalPopup, t]);

  // Delete a template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (!user?.id) return;
    
    setDeletingTemplateId(templateId);
    try {
      await deleteCustomTemplate(templateId);
      
      // Reload templates
      const templates = await fetchUserCustomTemplates(user.id);
      setCustomTemplates(templates);
      
      // Clear active template if it was deleted
      if (activeCustomTemplateId === templateId) {
        setActiveCustomTemplateId(null);
      }
      
      showGlobalPopup(t('template_deleted_success') || 'Thème supprimé avec succès', 'success');
    } catch (error) {
      console.error('Error deleting template:', error);
      showGlobalPopup(t('template_delete_error') || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingTemplateId(null);
    }
  }, [user?.id, activeCustomTemplateId, showGlobalPopup, t]);

  // Save template handler
  const handleSaveTemplate = useCallback(async (name: string, description: string, isDefault: boolean) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const templateData = {
      name,
      description,
      gradient_stops: customColors.gradientStops,
      gradient_angle: customColors.gradientAngle,
      button_color: customColors.buttonColor,
      button_text_color: customColors.buttonTextColor,
      text_color: customColors.textColor,
      header_title_color: customColors.headerTitleColor,
      font_family: customColors.fontFamily,
      header_background_url: headerBackgroundUrl || undefined,
      banner_url: bannerImageUrl || undefined,
      is_default: isDefault,
    };
    
    await createCustomTemplate(user.id, templateData);
    
    // Refresh templates list
    const templates = await fetchUserCustomTemplates(user.id);
    setCustomTemplates(templates);
    
    showGlobalPopup(t('template_saved_success') || 'Thème sauvegardé avec succès', 'success');
  }, [user?.id, customColors, headerBackgroundUrl, bannerImageUrl, showGlobalPopup, t]);

  // Set default template handler
  const handleSetDefaultTemplate = useCallback(async (documentId: string) => {
    if (!user?.id) return;
    
    await setDefaultCustomTemplate(user.id, documentId);
    
    // Refresh templates list
    const templates = await fetchUserCustomTemplates(user.id);
    setCustomTemplates(templates);
    
    showGlobalPopup(t('default_template_set') || 'Thème défini par défaut', 'success');
  }, [user?.id, showGlobalPopup, t]);

  const handleSend = async () => {
    // Vérifier la configuration SMTP
    if (!smtpConfig || !smtpConfig.is_verified) {
      setShowSmtpWarning(true);
      return;
    }
    
    if (selectedRecipients.length === 0 && manualEmails.length === 0) {
      showGlobalPopup(t('please_select_recipient'), 'error');
      return;
    }
    if (!emailSubject.trim()) {
      showGlobalPopup(t('please_enter_subject'), 'error');
      return;
    }
    if (!user?.id || !user?.email) {
      showGlobalPopup(t('not_authenticated'), 'error');
      return;
    }

    setSending(true);
    try {
      // Importer les fonctions API
      const { createNewsletter, findOrCreateSubscriber } = await import('@/lib/api');
      
      // Récupérer les clients sélectionnés
      const selectedClients = clients.filter(c => selectedRecipients.includes(c.id));
      
      // Créer ou trouver les subscribers correspondants aux clients ET aux emails manuels
      const subscriberIds: number[] = [];
      
      // Créer subscribers pour les clients sélectionnés
      for (const client of selectedClients) {
        const nameParts = client.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        try {
          const subscriberId = await findOrCreateSubscriber({
            email: client.email,
            first_name: firstName,
            last_name: lastName,
            userId: user.id,
          });
          subscriberIds.push(subscriberId);
        } catch (err) {
          console.warn(`Could not create subscriber for ${client.email}:`, err);
        }
      }
      
      // Créer subscribers pour les emails manuels
      for (const manual of manualEmails) {
        const nameParts = (manual.name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        try {
          const subscriberId = await findOrCreateSubscriber({
            email: manual.email,
            first_name: firstName,
            last_name: lastName,
            userId: user.id,
          });
          subscriberIds.push(subscriberId);
        } catch (err) {
          console.warn(`Could not create subscriber for ${manual.email}:`, err);
        }
      }

      // Générer le HTML complet de l'email
      const templateData = templates.find(t => t.id === selectedTemplate);
      const fullHtmlContent = generateEmailHtml({
        template: templateData || templates[0],
        title: emailTitle || emailSubject,
        content: emailContent,
        ctaText,
        ctaUrl,
        bannerImageUrl,
        footerSettings,
        footerLogoUrl: getFooterLogoUrl(),
        userProfilePicture: getUserProfilePicture(),
        headerTitleColor: customColors.headerTitleColor,
        buttonColor: customColors.buttonColor,
        buttonTextColor: customColors.buttonTextColor,
        headerBackgroundUrl,
        fontFamily: customColors.fontFamily,
      });

      // Combiner les clients sélectionnés et les emails manuels
      const allRecipients = [
        ...selectedClients.map(c => ({
          email: c.email,
          firstName: c.name.split(' ')[0],
          lastName: c.name.split(' ').slice(1).join(' '),
        })),
        ...manualEmails.map(m => ({
          email: m.email,
          firstName: m.name?.split(' ')[0] || '',
          lastName: m.name?.split(' ').slice(1).join(' ') || '',
        })),
      ];

      const isScheduled = scheduledAt !== null;
      let emailResult = { success: false, sent: 0 };
      
      // Envoyer les emails uniquement si ce n'est pas planifié
      if (!isScheduled) {
        const token = localStorage.getItem('token');
        const emailResponse = await fetch('/api/newsletters/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            recipients: allRecipients,
            subject: emailSubject,
            htmlContent: fullHtmlContent,
            textContent: emailTitle + '\n\n' + emailContent.replace(/<[^>]*>/g, ''),
          }),
        });

        emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('Email sending failed:', emailResult);
          // Continuer quand même pour enregistrer la newsletter
        }
      }
      
      // Créer la newsletter dans la base de données
      await createNewsletter({
        title: emailTitle || emailSubject,
        subject: emailSubject,
        content: emailContent,
        template: (selectedTemplate as 'standard' | 'promotional' | 'announcement' | 'custom') || 'standard',
        n_status: isScheduled ? 'scheduled' : 'sent',
        send_at: isScheduled ? scheduledAt.toISOString() : new Date().toISOString(),
        author: user.id,
        subscribers: subscriberIds.length > 0 ? subscriberIds : undefined,
        // Nouveaux champs pour le contenu enrichi
        custom_colors: selectedTemplate === 'custom' ? customColors : undefined,
        header_background_url: headerBackgroundUrl || undefined,
        banner_url: bannerImageUrl || undefined,
        cta_text: ctaText || undefined,
        cta_url: ctaUrl || undefined,
        // Stockage du HTML complet pour l'envoi différé
        html_content: isScheduled ? fullHtmlContent : undefined,
      });

      if (isScheduled) {
        showGlobalPopup(
          `${t('newsletter_scheduled') || 'Newsletter planifiée pour le'} ${scheduledAt.toLocaleDateString('fr-FR')} à ${scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 
          'success'
        );
      } else if (emailResult.success) {
        showGlobalPopup(`${t('newsletter_sent_success')} ${emailResult.sent} ${t('recipients_count')}`, 'success');
      } else if (emailResult.sent > 0) {
        showGlobalPopup(`${t('newsletter_partially_sent')}: ${emailResult.sent}/${selectedRecipients.length}`, 'warning');
      } else {
        showGlobalPopup(`${t('newsletter_saved_not_sent')}`, 'warning');
      }
      
      // Supprimer le brouillon après envoi réussi
      clearNewsletterDraft();
      
      // Rediriger vers la liste des newsletters après envoi
      setTimeout(() => {
        window.location.href = '/dashboard/newsletters';
      }, 1500);
    } catch (error) {
      console.error('Error sending newsletter:', error);
      showGlobalPopup(t('newsletter_send_error'), 'error');
    } finally {
      setSending(false);
    }
  };

  // Générer le HTML complet de l'email pour l'envoi
  const generateEmailHtml = ({
    template,
    title,
    content,
    ctaText: cta,
    ctaUrl: ctaLink,
    bannerImageUrl: banner,
    footerSettings: footer,
    footerLogoUrl,
    userProfilePicture,
    headerTitleColor,
    buttonColor,
    buttonTextColor,
    headerBackgroundUrl: headerBgUrl,
    fontFamily,
  }: {
    template: EmailTemplate;
    title: string;
    content: string;
    ctaText: string;
    ctaUrl: string;
    bannerImageUrl: string;
    footerSettings: FooterSettings;
    footerLogoUrl: string | null;
    userProfilePicture?: string | null;
    headerTitleColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    headerBackgroundUrl?: string;
    fontFamily?: string;
  }) => {
    const isPromo = template.id === 'promotional';
    const isAnnouncement = template.id === 'announcement';
    
    // Use custom colors if provided
    const titleColor = headerTitleColor || template.textColor || '#1f2937';
    const ctaButtonColor = buttonColor || template.primaryColor;
    const ctaButtonTextColor = buttonTextColor || '#ffffff';
    const emailFont = fontFamily || 'Arial';
    const fontFamilyCSS = `'${emailFont}', Arial, Helvetica, sans-serif`;
    const googleFontUrl = fontFamily 
      ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:wght@400;600;700&display=swap`
      : null;
    const headerBackground = headerBgUrl 
      ? `background-image: url(${headerBgUrl}); background-size: cover; background-position: center; background-color: ${template.primaryColor};`
      : `background: linear-gradient(135deg, ${template.primaryColor}, ${template.accentColor});`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${googleFontUrl ? `<link href="${googleFontUrl}" rel="stylesheet">` : ''}
  <style>
    @media screen {
      ${googleFontUrl ? `@import url('${googleFontUrl}');` : ''}
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: ${fontFamilyCSS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="700" cellpadding="0" cellspacing="0" style="max-width: 700px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="${headerBackground} padding: ${isAnnouncement ? '48px' : '32px'} 24px; text-align: center;">
              ${isPromo ? `<div style="display: inline-block; padding: 4px 16px; background-color: rgba(255,255,255,0.4); border-radius: 20px; color: #1f2937; font-size: 14px; font-weight: bold; margin-bottom: 16px;">🎉 ${t('special_offer') || 'Offre Spéciale'}</div>` : ''}
              <h1 style="margin: 0; color: ${titleColor}; font-size: ${isAnnouncement ? '28px' : '24px'}; font-weight: bold;">${title}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
              
              ${cta && ctaLink ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${ctaLink}" style="display: inline-block; padding: 16px 32px; background-color: ${ctaButtonColor}; color: ${ctaButtonTextColor}; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  ${cta}${isPromo ? ' →' : ''}
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="80" valign="top">
                    ${footerLogoUrl 
                      ? `<img src="${footerLogoUrl}" alt="Logo" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover;">`
                      : userProfilePicture 
                        ? `<img src="${userProfilePicture}" alt="Profile" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover;">`
                        : `<div style="width: 64px; height: 64px; border-radius: 8px; background-color: #e5e7eb;"></div>`
                    }
                  </td>
                  <td valign="top" style="padding-left: 16px;">
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #1f2937;">${footer.firstName} ${footer.lastName}</p>
                    ${footer.email ? `<p style="margin: 0 0 2px 0; color: #FFFFFF; font-size: 14px;">✉️ ${footer.email}</p>` : ''}
                    ${footer.phone ? `<p style="margin: 0 0 2px 0; color: #FFFFFF; font-size: 14px;">📞 ${footer.phone}</p>` : ''}
                    ${footer.website ? `<p style="margin: 0; color: #FFFFFF; font-size: 14px;">🌐 <a href="${footer.website}" style="color: #3b82f6;">${footer.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
                  </td>
                </tr>
              </table>
              
              ${footer.customText ? `<p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #FFFFFF; font-size: 14px;">${footer.customText}</p>` : ''}
              
              <p style="margin: 16px 0 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
                <a href="#" style="color: #9ca3af;">${footer.unsubscribeText}</a>
              </p>
            </td>
          </tr>
          
          ${banner ? `
          <!-- Banner -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <img src="${banner}" alt="Banner" style="width: 100%; max-height: 192px; object-fit: contain; border-radius: 8px;">
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'template':
        return selectedTemplate !== null;
      case 'content':
        return emailSubject.trim() !== '' && emailContent.trim() !== '';
      case 'recipients':
        return selectedRecipients.length > 0 || manualEmails.length > 0;
      default:
        return true;
    }
  };

  // Nombre total de destinataires
  const totalRecipients = selectedRecipients.length + manualEmails.length;

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  // Get logo URL for footer
  const getFooterLogoUrl = () => {
    if (footerSettings.logoUrl) return footerSettings.logoUrl;
    if (company?.logo) {
      return company.logo.startsWith('http') 
        ? company.logo 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${company.logo}`;
    }
    return null;
  };

  // Get user profile picture URL
  const getUserProfilePicture = () => {
    if (user?.profile_picture?.url) {
      return user.profile_picture.url.startsWith('http') 
        ? user.profile_picture.url 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${user.profile_picture.url}`;
    }
    return null;
  };

  // Email preview translations
  const emailPreviewTranslations = useMemo(() => ({
    specialOffer: t('special_offer'),
    yourTitleHere: t('your_title_here'),
    contentPreviewPlaceholder: t('content_preview_placeholder'),
    unsubscribe: t('unsubscribe') || 'Se désabonner',
  }), [t]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-page">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-default py-8 rounded-t-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard/newsletters"
                  className="p-2 rounded-lg hover:bg-hover transition-colors text-secondary"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex flex-col gap-1">
                  <h1 className="text-lg font-semibold text-primary">{t('create_newsletter')}</h1>
                  {selectedTemplate ? (
                    <span 
                      className="text-sm px-3 py-1 rounded-full !text-gray-800 font-medium w-fit my-2"
                      style={{ backgroundColor: templates.find(tp => tp.id === selectedTemplate)?.primaryColor }}
                    >
                      {templates.find(tp => tp.id === selectedTemplate)?.name}
                    </span>
                  ) : (
                    <p className="text-sm text-muted my-2">  
                      {t('select_template')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                    ${showPreview ? 'bg-accent text-white' : 'bg-muted hover:bg-hover text-secondary'}`}
                >
                  <IconEye className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('preview')}</span>
                </button>
                
                {currentStep === 'review' && (
                  <button
                    onClick={handleSend}
                    disabled={sending || selectedRecipients.length === 0}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium
                      hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      ${scheduledAt ? 'bg-purple-600' : 'bg-accent'}`}
                  >
                    {sending ? (
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                    ) : scheduledAt ? (
                      <IconClock className="w-4 h-4 !text-white" />
                    ) : (
                      <IconSend className="w-4 h-4 !text-white" />
                    )}
                    <span className="!text-white">
                      {scheduledAt ? (t('schedule') || 'Planifier') : t('send')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Progress Steps */}
        <div className="bg-card border-b border-default rounded-b-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      if (index <= stepIndex || canProceed()) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                      ${currentStep === step.id 
                        ? 'bg-accent-light !text-white' 
                        : index < stepIndex 
                          ? 'bg-success-light text-success' 
                          : '!text-primary hover:text-secondary'
                      }`}
                  >
                    {index < stepIndex ? (
                      <IconCheck className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                    <span className="hidden sm:inline font-medium !text-accent-text">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded ${
                      index < stepIndex ? 'bg-success' : 'bg-muted'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8 w-full">
            {/* Editor Panel */}
            <div className={`flex-1 w-full ${showPreview ? 'hidden lg:block' : ''}`}>
              <AnimatePresence mode="wait">
                {/* Step 1: Template Selection */}
                {currentStep === 'template' && (
                  <motion.div
                    key="template"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-2xl font-bold text-primary mb-2">{t('choose_template')}</h2>
                    <p className="text-secondary mb-8">{t('choose_template_desc')}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {templates.map((template) => {
                        const isSelected = selectedTemplate === template.id;
                        return (
                          <motion.button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-5 rounded-2xl border transition-all text-left
                              ${isSelected 
                                ? 'border-default !shadow-lg !shadow-accent/20' 
                                : 'border-default hover:border-accent/30'
                              }`}
                            style={{
                              background: isSelected 
                                ? `linear-gradient(135deg, ${template.primaryColor}, ${template.accentColor})`
                                : 'linear-gradient(135deg, var(--bg-card) 0%, rgba(124, 58, 237, 0.03) 100%)'
                            }}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/50 backdrop-blur flex items-center justify-center">
                                <IconCheck className="w-4 h-4 text-gray-700" />
                              </div>
                            )}
                            
                            <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                                isSelected ? 'bg-white/40' : ''
                              }`}
                              style={isSelected ? { color: '#374151' } : { 
                                background: `linear-gradient(135deg, ${template.primaryColor}15, ${template.accentColor}15)`,
                                color: template.primaryColor 
                              }}
                            >
                              {template.icon}
                            </div>
                            
                            <h3 className={`text-lg font-semibold mb-1 ${isSelected ? '!text-gray-800' : '!text-primary'}`}>
                              {template.name}
                            </h3>
                            <p className={`text-sm mb-3 ${isSelected ? '!text-gray-700' : '!text-secondary'}`}>
                              {template.description}
                            </p>
                            
                            {/* Features */}
                            <div className="space-y-1">
                              {template.features.map((feature, idx) => (
                                <div 
                                  key={idx} 
                                  className={`flex items-center gap-2 text-xs ${
                                    isSelected ? 'text-gray-600' : 'text-muted'
                                  }`}
                                >
                                  <IconCheck className="w-3 h-3" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Mes thèmes sauvegardés */}
                    {customTemplates.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                            <IconPalette className="w-5 h-5 text-accent" />
                            {t('my_saved_themes') || 'Mes thèmes'}
                          </h3>
                          <span className="text-sm text-muted">
                            {customTemplates.length} {customTemplates.length === 1 ? t('theme') || 'thème' : t('themes') || 'thèmes'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                          {customTemplates.map((template) => {
                            const isActive = activeCustomTemplateId === template.documentId;
                            const isUpdating = updatingTemplateId === template.documentId;
                            const isDeleting = deletingTemplateId === template.documentId;
                            
                            return (
                              <motion.div
                                key={template.documentId}
                                whileHover={{ scale: 1.02 }}
                                className={`relative p-4 rounded-xl border transition-all text-left bg-card group ${
                                  isActive 
                                    ? 'border-accent ring-2 ring-accent/30' 
                                    : 'border-default hover:border-accent/50'
                                }`}
                              >
                                {/* Badge défaut */}
                                {template.is_default && (
                                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                                    <IconStarFilled className="w-2.5 h-2.5" />
                                  </div>
                                )}
                                
                                {/* Active badge */}
                                {isActive && (
                                  <div className="absolute -top-2 -left-2 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                                    <IconCheck className="w-2.5 h-2.5" />
                                    {t('active') || 'Actif'}
                                  </div>
                                )}
                                
                                {/* Clickable area */}
                                <button
                                  onClick={() => {
                                    setSelectedTemplate('custom');
                                    applyTemplate(template);
                                  }}
                                  className="w-full text-left"
                                >
                                  {/* Preview */}
                                  <div className="flex items-center gap-2 mb-2">
                                    {/* Gradient preview */}
                                    <div 
                                      className="w-10 h-6 rounded-md border border-default flex-shrink-0"
                                      style={{
                                        background: template.gradient_stops?.length > 0
                                          ? `linear-gradient(${template.gradient_angle}deg, ${
                                              [...template.gradient_stops]
                                                .sort((a, b) => a.position - b.position)
                                                .map(s => `${s.color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')} ${s.position}%`)
                                                .join(', ')
                                            })`
                                          : '#333'
                                      }}
                                    />
                                    {/* Colors */}
                                    <div className="flex gap-1">
                                      <div 
                                        className="w-4 h-4 rounded-full border border-white/20"
                                        style={{ backgroundColor: template.button_color }}
                                      />
                                      <div 
                                        className="w-4 h-4 rounded-full border border-white/20"
                                        style={{ backgroundColor: template.header_title_color }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Nom */}
                                  <p className="font-medium text-primary text-sm truncate group-hover:text-accent transition-colors">
                                    {template.name}
                                  </p>
                                  
                                  {/* Font */}
                                  <p className="text-[10px] text-muted truncate">
                                    <span style={{ fontFamily: template.font_family }}>
                                      {template.font_family.split(',')[0]}
                                    </span>
                                  </p>
                                </button>
                                
                                {/* Action buttons - visible on hover or when active */}
                                <div className={`flex items-center gap-1 mt-2 pt-2 border-t border-default ${
                                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                } transition-opacity`}>
                                  {/* Update button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateTemplate(template.documentId);
                                    }}
                                    disabled={isUpdating || isDeleting}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                                    title={t('update_theme') || 'Mettre à jour avec les paramètres actuels'}
                                  >
                                    {isUpdating ? (
                                      <IconLoader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <IconRefresh className="w-3 h-3" />
                                    )}
                                    {t('update') || 'Màj'}
                                  </button>
                                  
                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(t('confirm_delete_theme') || 'Supprimer ce thème ?')) {
                                        handleDeleteTemplate(template.documentId);
                                      }
                                    }}
                                    disabled={isUpdating || isDeleting}
                                    className="flex items-center justify-center p-1.5 text-xs rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    title={t('delete_theme') || 'Supprimer ce thème'}
                                  >
                                    {isDeleting ? (
                                      <IconLoader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <IconTrash className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom Template Color Pickers - Below cards, aligned right */}
                    <AnimatePresence>
                      {selectedTemplate === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-6"
                        >
                          <ThemeCustomizer
                            customColors={customColors}
                            setCustomColors={setCustomColors}
                            headerBackgroundUrl={headerBackgroundUrl}
                            setHeaderBackgroundUrl={setHeaderBackgroundUrl}
                            onOpenMediaPicker={openHeaderBackgroundPicker}
                            availableFonts={availableFonts}
                            generateGradientCSS={generateGradientCSS}
                            addGradientStop={addGradientStop}
                            removeGradientStop={removeGradientStop}
                            updateGradientStop={updateGradientStop}
                            emailTitle={emailTitle}
                            ctaText={ctaText}
                            t={t}
                            bannerUrl={bannerImageUrl}
                            onSaveTemplate={() => setShowSaveTemplateModal(true)}
                            onLoadTemplate={() => setShowLoadTemplateModal(true)}
                            hasSavedTemplates={customTemplates.length > 0}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Step 2: Content Editor */}
                {currentStep === 'content' && (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-6 w-full"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-primary mb-2">{t('write_content')}</h2>
                        <p className="text-secondary">{t('write_content_desc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowThemeSettings(!showThemeSettings)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                            ${showThemeSettings ? 'bg-accent text-white' : 'bg-muted hover:bg-hover text-secondary'}`}
                        >
                          <IconPalette className="w-4 h-4 !text-primary" />
                          <span>{t('theme') || 'Thème'}</span>
                        </button>
                        <button
                          onClick={() => setShowFooterSettings(!showFooterSettings)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                            ${showFooterSettings ? 'bg-accent text-white' : 'bg-muted hover:bg-hover text-secondary'}`}
                        >
                          <IconSettings className="w-4 h-4" />
                          <span>{t('footer')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Footer Settings Panel */}
                    <AnimatePresence>
                      {showFooterSettings && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-muted rounded-xl p-6 space-y-4 border border-default">
                            <h3 className="font-semibold text-primary flex items-center gap-2">
                              <IconSettings className="w-5 h-5" />
                              {t('customize_footer')}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Identity */}
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">{t('first_name_label')}</label>
                                <input
                                  type="text"
                                  value={footerSettings.firstName}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, firstName: e.target.value }))}
                                  className="input w-full"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">{t('last_name_label')}</label>
                                <input
                                  type="text"
                                  value={footerSettings.lastName}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, lastName: e.target.value }))}
                                  className="input w-full"
                                />
                              </div>
                              
                              {/* Contact */}
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">{t('email_label')}</label>
                                <input
                                  type="email"
                                  value={footerSettings.email}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, email: e.target.value }))}
                                  className="input w-full"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">{t('phone_label')}</label>
                                <input
                                  type="tel"
                                  value={footerSettings.phone}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, phone: e.target.value }))}
                                  className="input w-full"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">{t('website_label')}</label>
                                <input
                                  type="url"
                                  value={footerSettings.website}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, website: e.target.value }))}
                                  className="input w-full"
                                  placeholder="https://..."
                                />
                              </div>
                              
                              {/* Social Links */}
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                  <IconBrandLinkedin className="w-4 h-4 inline mr-1" />
                                  {t('linkedin_label')}
                                </label>
                                <input
                                  type="url"
                                  value={footerSettings.linkedin}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, linkedin: e.target.value }))}
                                  className="input w-full"
                                  placeholder="https://linkedin.com/in/..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                  <IconBrandTwitter className="w-4 h-4 inline mr-1" />
                                  {t('twitter_label')}
                                </label>
                                <input
                                  type="url"
                                  value={footerSettings.twitter}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, twitter: e.target.value }))}
                                  className="input w-full"
                                  placeholder="https://twitter.com/..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                  <IconBrandInstagram className="w-4 h-4 inline mr-1" />
                                  {t('instagram_label')}
                                </label>
                                <input
                                  type="url"
                                  value={footerSettings.instagram}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, instagram: e.target.value }))}
                                  className="input w-full"
                                  placeholder="https://instagram.com/..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                  <IconBrandFacebook className="w-4 h-4 inline mr-1" />
                                  {t('facebook_label')}
                                </label>
                                <input
                                  type="url"
                                  value={footerSettings.facebook}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, facebook: e.target.value }))}
                                  className="input w-full"
                                  placeholder="https://facebook.com/..."
                                />
                              </div>
                              
                              {/* Custom text */}
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-secondary mb-1">
                                  {t('custom_text_label')}
                                </label>
                                <textarea
                                  value={footerSettings.customText}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, customText: e.target.value }))}
                                  className="input w-full"
                                  rows={2}
                                  placeholder={t('custom_text_placeholder')}
                                />
                              </div>
                              
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-secondary mb-1">
                                  {t('unsubscribe_text_label')}
                                </label>
                                <input
                                  type="text"
                                  value={footerSettings.unsubscribeText}
                                  onChange={(e) => setFooterSettings(prev => ({ ...prev, unsubscribeText: e.target.value }))}
                                  className="input w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Theme Settings Panel */}
                    <AnimatePresence>
                      {showThemeSettings && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <ThemeCustomizer
                            customColors={customColors}
                            setCustomColors={setCustomColors}
                            headerBackgroundUrl={headerBackgroundUrl}
                            setHeaderBackgroundUrl={setHeaderBackgroundUrl}
                            onOpenMediaPicker={openHeaderBackgroundPicker}
                            availableFonts={availableFonts}
                            generateGradientCSS={generateGradientCSS}
                            addGradientStop={addGradientStop}
                            removeGradientStop={removeGradientStop}
                            updateGradientStop={updateGradientStop}
                            emailTitle={emailTitle}
                            ctaText={ctaText}
                            t={t}
                            bannerUrl={bannerImageUrl}
                            onSaveTemplate={() => setShowSaveTemplateModal(true)}
                            onLoadTemplate={() => setShowLoadTemplateModal(true)}
                            hasSavedTemplates={customTemplates.length > 0}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Title */}
                    <div className="bg-card rounded-xl p-6 border border-default space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          {t('email_title_label')} *
                        </label>
                        <input
                          type="text"
                          value={emailTitle}
                          onChange={(e) => setEmailTitle(e.target.value)}
                          placeholder={t('email_title_placeholder')}
                          className="input w-full text-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          {t('email_subject_label')} *
                          <span className="text-muted font-normal ml-2">({t('email_subject_hint')})</span>
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder={t('email_subject_placeholder')}
                          className="input w-full"
                        />
                      </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div className="bg-card rounded-xl p-6 border border-default space-y-4">
                      <h3 className="font-semibold text-primary">{t('message_label')} *</h3>
                      
                      {/* Hidden file inputs for content media */}
                      <input
                        ref={contentImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleContentImageUpload}
                        className="hidden"
                      />
                      <input
                        ref={contentVideoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleContentVideoUpload}
                        className="hidden"
                      />
                      
                      <RichTextEditor 
                        value={emailContent}
                        onChange={setEmailContent}
                        placeholder={t('write_message_placeholder')}
                        onImageFromComputer={() => contentImageInputRef.current?.click()}
                        onImageFromLibrary={() => setShowLibraryModal({ type: 'image', isOpen: true })}
                        onImageFromUrl={(url) => insertMediaFromUrl(url, 'image')}
                        uploadingImage={uploadingContentImage}
                        onVideoFromComputer={() => contentVideoInputRef.current?.click()}
                        onVideoFromLibrary={() => setShowLibraryModal({ type: 'video', isOpen: true })}
                        onVideoFromUrl={(url) => insertMediaFromUrl(url, 'video')}
                        uploadingVideo={uploadingContentVideo}
                        fontFamily={customColors.fontFamily}
                        onMediaDeleted={handleMediaDeleted}
                        translations={{
                          heading1: t('toolbar_heading1'),
                          heading2: t('toolbar_heading2'),
                          paragraph: t('toolbar_paragraph'),
                          bold: t('toolbar_bold'),
                          italic: t('toolbar_italic'),
                          bulletList: t('toolbar_bullet_list'),
                          numberedList: t('toolbar_numbered_list'),
                          alignLeft: t('toolbar_align_left'),
                          alignCenter: t('toolbar_align_center'),
                          alignRight: t('toolbar_align_right'),
                          textColor: t('toolbar_text_color'),
                          insertLink: t('toolbar_insert_link'),
                          insertImage: t('toolbar_insert_image'),
                          insertVideo: t('toolbar_insert_video'),
                          fromComputer: t('from_computer'),
                          fromLibrary: t('from_library'),
                          fromUrl: t('from_url'),
                          cancel: t('cancel'),
                        }}
                      />

                      {/* Content Images & Videos Preview */}
                      {(contentImages.length > 0 || contentVideos.length > 0) && (
                        <div className="pt-4 border-t border-default space-y-3">
                          {/* Images */}
                          {contentImages.length > 0 && (
                            <div>
                              <p className="text-xs text-secondary mb-2 flex items-center gap-1">
                                <IconPhoto className="w-3 h-3" />
                                {t('images_used') || 'Images utilisées'} ({contentImages.length})
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {contentImages.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img} alt="" className="w-24 h-24 object-cover rounded-lg" />
                                    <button
                                      onClick={() => removeImage(img, idx)}
                                      className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <IconX className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Videos */}
                          {contentVideos.length > 0 && (
                            <div>
                              <p className="text-xs text-secondary mb-2 flex items-center gap-1">
                                <IconVideo className="w-3 h-3" />
                                {t('videos_used') || 'Vidéos utilisées'} ({contentVideos.length})
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {contentVideos.map((video, idx) => (
                                  <div key={idx} className="relative group">
                                    <video 
                                      src={video} 
                                      className="w-32 h-24 object-cover rounded-lg bg-gray-900"
                                      preload="metadata"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                                        <div className="w-0 h-0 border-l-[10px] border-l-gray-800 border-y-[6px] border-y-transparent ml-1" />
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removeVideo(video, idx)}
                                      className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <IconX className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="bg-card rounded-xl p-6 border border-default space-y-4">
                      <h3 className="font-semibold text-primary">{t('cta_section_title')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-2">
                            {t('cta_text_label')}
                          </label>
                          <input
                            type="text"
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            placeholder={t('cta_text_placeholder')}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-2">
                            {t('cta_link_label')}
                          </label>
                          <input
                            type="url"
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            placeholder="https://..."
                            className="input w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banner Image */}
                    <div className="bg-card rounded-xl p-6 border border-default space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-primary">{t('banner_section_title') || 'Bannière de fin'}</h3>
                        {signatureData?.banner_url && !bannerImageUrl && (
                          <button
                            onClick={() => setBannerImageUrl(signatureData.banner_url || '')}
                            className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                          >
                            <IconPhoto className="w-4 h-4" />
                            {t('use_signature_banner') || 'Utiliser la bannière de ma signature'}
                          </button>
                        )}
                      </div>
                      
                      {bannerImageUrl ? (
                        <div className="relative">
                          <div className="relative rounded-xl overflow-hidden border border-default">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={bannerImageUrl} 
                              alt="Bannière" 
                              className="w-full h-auto object-cover"
                            />
                          </div>
                          <div className="absolute top-3 right-3 flex gap-2">
                            <button
                              onClick={openBannerPicker}
                              className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-700 shadow-lg transition-all"
                              title={t('change_image') || 'Changer l\'image'}
                            >
                              <IconPhoto className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setBannerImageUrl('')}
                              className="p-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white shadow-lg transition-all"
                              title={t('remove_image') || 'Supprimer'}
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Indicator if using signature banner */}
                          {signatureData?.banner_url === bannerImageUrl && (
                            <div className="mt-2 text-xs text-muted flex items-center gap-1">
                              <IconCheck className="w-3 h-3 text-accent" />
                              {t('using_signature_banner') || 'Utilise la bannière de votre signature email'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          onClick={openBannerPicker}
                          className="border-2 border-dashed border-default rounded-xl p-6 text-center 
                            hover:border-accent hover:bg-accent-light/30 transition-all cursor-pointer group"
                        >
                          <IconUpload className="w-8 h-8 mx-auto mb-2 text-muted group-hover:text-accent transition-colors" />
                          <p className="text-primary font-medium">{t('add_banner') || 'Ajouter une bannière'}</p>
                          <p className="text-sm text-muted">{t('banner_hint') || 'Image promotionnelle en fin d\'email'}</p>
                        </div>
                      )}
                      
                      {/* Link to signature settings */}
                      <div className="pt-2 border-t border-default">
                        <Link
                          href="/dashboard/settings?tab=email"
                          className="text-sm text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
                        >
                          <IconSettings className="w-3.5 h-3.5" />
                          {t('edit_signature_banner') || 'Modifier la bannière dans ma signature email'}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Recipients Selection */}
                {currentStep === 'recipients' && (
                  <motion.div
                    key="recipients"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-2xl font-bold text-primary mb-2">{t('select_recipients')}</h2>
                    <p className="text-secondary mb-6">{t('select_recipients_desc')}</p>

                    {/* Manual email input with suggestions */}
                    <div className="bg-card rounded-xl border border-default p-4 mb-4">
                      <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                        <IconMail className="w-5 h-5 text-accent" />
                        {t('add_recipient_manually') || 'Ajouter un destinataire'}
                      </h3>
                      
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              ref={emailInputRef}
                              type="email"
                              value={emailInput}
                              onChange={(e) => {
                                setEmailInput(e.target.value);
                                setShowSuggestions(true);
                              }}
                              onFocus={() => setShowSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                              onKeyDown={handleEmailInputKeyDown}
                              placeholder={t('enter_email_placeholder') || 'Entrez un email...'}
                              className="input w-full"
                            />
                            
                            {/* Suggestions dropdown */}
                            <AnimatePresence>
                              {showSuggestions && (emailInput.trim() !== '') && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-default rounded-xl shadow-xl z-20 overflow-hidden"
                                >
                                  {filteredSuggestions.length > 0 ? (
                                    <div className="max-h-[200px] overflow-y-auto">
                                      {filteredSuggestions.map((client) => (
                                        <button
                                          key={client.id}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            setSelectedRecipients(prev => [...prev, client.id]);
                                            setEmailInput('');
                                            setShowSuggestions(false);
                                          }}
                                          className="w-full flex items-center gap-3 p-3 hover:bg-hover transition-colors text-left"
                                        >
                                          {client.image?.url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                              src={client.image.url.startsWith('http') ? client.image.url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${client.image.url}`}
                                              alt={client.name}
                                              className="w-10 h-10 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold">
                                              {client.name[0]?.toUpperCase()}
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-primary truncate">{client.name}</p>
                                            <p className="text-sm text-muted truncate">{client.email}</p>
                                          </div>
                                          <IconCheck className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100" />
                                        </button>
                                      ))}
                                    </div>
                                  ) : emailInput.includes('@') ? (
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleAddManualEmail(emailInput)}
                                      className="w-full flex items-center gap-3 p-3 hover:bg-hover transition-colors text-left"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-secondary font-semibold">
                                        {getEmailInitials(emailInput)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-primary">{t('add_new_recipient') || 'Ajouter ce destinataire'}</p>
                                        <p className="text-sm text-muted truncate">{emailInput}</p>
                                      </div>
                                      <IconChevronRight className="w-5 h-5 text-muted" />
                                    </button>
                                  ) : (
                                    <div className="p-3 text-center text-muted text-sm">
                                      {t('type_valid_email') || 'Tapez un email valide...'}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleAddManualEmail(emailInput)}
                            disabled={!emailInput.includes('@')}
                            className="px-4 py-2 rounded-lg bg-accent text-white font-medium 
                              hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {t('add') || 'Ajouter'}
                          </button>
                        </div>
                      </div>

                      {/* Manual emails list */}
                      {manualEmails.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-default">
                          <p className="text-sm text-secondary mb-2">
                            {t('manual_recipients') || 'Destinataires ajoutés'} ({manualEmails.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {manualEmails.map((manual) => (
                              <div
                                key={manual.email}
                                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full group"
                              >
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
                                  {getEmailInitials(manual.email)}
                                </div>
                                <span className="text-sm text-primary">{manual.email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManualEmail(manual.email)}
                                  className="p-0.5 rounded-full hover:bg-danger/20 text-muted hover:text-danger transition-colors"
                                >
                                  <IconX className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Existing clients list */}
                    <div className="bg-card rounded-xl border border-default overflow-hidden">
                      <div className="p-4 bg-muted border-b border-default flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAllRecipients}
                            className="w-5 h-5 rounded border-default text-accent focus:ring-accent"
                          />
                          <span className="font-medium text-primary">
                            {t('select_all_clients')} ({clients.length})
                          </span>
                        </label>
                        <span className="text-sm text-secondary">
                          {selectedRecipients.length + manualEmails.length} {t('recipients_selected')}
                        </span>
                      </div>

                      <div className="max-h-[400px] overflow-y-auto">
                        {clients.length === 0 ? (
                          <div className="p-8 text-center text-muted">
                            <IconUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>{t('no_client_found')}</p>
                          </div>
                        ) : (
                          clients.map((client) => (
                            <label
                              key={client.id}
                              className="flex items-center gap-4 p-4 hover:bg-hover transition-colors cursor-pointer border-b border-default last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={selectedRecipients.includes(client.id)}
                                onChange={() => handleToggleRecipient(client.id)}
                                className="w-5 h-5 rounded border-default text-accent focus:ring-accent"
                              />
                              {client.image?.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={client.image.url.startsWith('http') ? client.image.url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${client.image.url}`}
                                  alt={client.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold">
                                  {client.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-primary">{client.name}</p>
                                <p className="text-sm text-muted">{client.email}</p>
                              </div>
                              {client.enterprise && (
                                <span className="text-xs px-2 py-1 bg-muted rounded-full text-secondary">
                                  {client.enterprise}
                                </span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Review & Send */}
                {currentStep === 'review' && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-2xl font-bold text-primary mb-2">{t('review_and_send')}</h2>
                    <p className="text-secondary mb-6">{t('review_and_send_desc')}</p>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card rounded-xl p-5 border border-default">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                              <IconTemplate className="w-5 h-5 text-accent" />
                            </div>
                            <span className="text-sm text-secondary">{t('step_template')}</span>
                          </div>
                          <p className="font-semibold text-primary">
                            {selectedTemplateData?.name || '-'}
                          </p>
                        </div>

                        <div className="bg-card rounded-xl p-5 border border-default">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center">
                              <IconMail className="w-5 h-5 text-info" />
                            </div>
                            <span className="text-sm text-secondary">{t('subject')}</span>
                          </div>
                          <p className="font-semibold text-primary truncate">
                            {emailSubject || '-'}
                          </p>
                        </div>

                        <div className="bg-card rounded-xl p-5 border border-default">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                              <IconUsers className="w-5 h-5 text-success" />
                            </div>
                            <span className="text-sm text-secondary">{t('step_recipients')}</span>
                          </div>
                          <p className="font-semibold text-primary">
                            {totalRecipients} {t('contacts')}
                          </p>
                        </div>
                      </div>

                      <div className="bg-card rounded-xl p-5 border border-default">
                        <h3 className="font-semibold text-primary mb-3">{t('step_recipients')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {/* Clients sélectionnés */}
                          {clients
                            .filter(c => selectedRecipients.includes(c.id))
                            .slice(0, 8)
                            .map(client => (
                              <span
                                key={client.id}
                                className="px-3 py-1 bg-muted rounded-full text-sm text-secondary"
                              >
                                {client.name}
                              </span>
                            ))}
                          {/* Emails manuels */}
                          {manualEmails.slice(0, 3).map(manual => (
                            <span
                              key={manual.email}
                              className="px-3 py-1 bg-accent/10 rounded-full text-sm text-accent flex items-center gap-1"
                            >
                              <span className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold">
                                {getEmailInitials(manual.email)}
                              </span>
                              {manual.email}
                            </span>
                          ))}
                          {totalRecipients > 11 && (
                            <span className="px-3 py-1 bg-accent-light rounded-full text-sm text-accent">
                              +{totalRecipients - 11} {t('others')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Planification d'envoi */}
                      <EmailScheduler
                        onSchedule={setScheduledAt}
                        initialDate={scheduledAt}
                        disabled={sending}
                      />

                      <div className={`rounded-xl p-6 border ${scheduledAt ? 'bg-purple-600 border-purple-500' : 'bg-accent border-muted'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-white mb-1">
                              {scheduledAt 
                                ? (t('schedule_send') || 'Planifier l\'envoi')
                                : t('ready_to_send')
                              }
                            </h3>
                            <p className="text-sm text-white/80">
                              {scheduledAt 
                                ? `${t('newsletter_scheduled_for') || 'La newsletter sera envoyée le'} ${scheduledAt.toLocaleDateString('fr-FR')} à ${scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                : `${t('newsletter_will_be_sent')} ${totalRecipients} ${t('recipients_count')}`
                              }
                            </p>
                          </div>
                          <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-page hover:bg-accent-light text-primary font-semibold
                              hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-accent/25"
                          >
                            {sending ? (
                              <IconLoader2 className="w-5 h-5 animate-spin" />
                            ) : scheduledAt ? (
                              <IconClock className="w-5 h-5" />
                            ) : (
                              <IconSend className="w-5 h-5" />
                            )}
                            <span>
                              {sending 
                                ? t('sending') 
                                : scheduledAt 
                                  ? (t('schedule') || 'Planifier')
                                  : t('send_now')
                              }
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-default">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 'template'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-secondary hover:text-primary
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconChevronLeft className="w-5 h-5" />
                  <span>{t('previous')}</span>
                </button>

                {currentStep !== 'review' && (
                  <button
                    onClick={handleNextStep}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent text-accent-text font-medium
                      hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>{t('next')}</span>
                    <IconChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </main>

        {/* SMTP Warning Modal */}
        <AnimatePresence>
          {showSmtpWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowSmtpWarning(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-default"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <IconSettings className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {t('smtp_config_required') || 'Configuration email requise'}
                    </h3>
                    <p className="text-sm text-secondary">
                      {t('smtp_config_required_desc') || 'Configurez votre SMTP pour envoyer des newsletters'}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 mb-6">
                  <p className="text-sm text-secondary">
                    {smtpConfig ? (
                      t('smtp_not_verified_warning') || 'Votre configuration SMTP n\'a pas été vérifiée. Testez la connexion et enregistrez pour continuer.'
                    ) : (
                      t('smtp_not_configured_warning') || 'Vous n\'avez pas encore configuré votre serveur SMTP. Les newsletters seront envoyées depuis votre adresse email personnelle.'
                    )}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSmtpWarning(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-default text-secondary hover:bg-muted transition-colors"
                  >
                    {t('cancel') || 'Annuler'}
                  </button>
                  <Link
                    href="/dashboard/settings?tab=email"
                    className="flex-1 px-4 py-2.5 rounded-xl btn-primary flex items-center justify-center gap-2"
                  >
                    <IconSettings className="w-4 h-4" />
                    {t('configure_smtp') || 'Configurer'}
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Preview Modal - Full Screen Mailbox Simulation */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="absolute inset-4 md:inset-8 max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mailbox Header */}
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <IconMail className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-gray-800">{t('mailbox_preview')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-600">
                      <IconRefresh className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowPreview(false)}
                      className="p-2 hover:bg-gray-200 rounded-lg text-gray-600"
                    >
                      <IconX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Sidebar - Folders */}
                  <div className="w-16 md:w-48 bg-gray-50 border-r border-gray-200 flex-shrink-0 hidden sm:block">
                    <div className="p-2 md:p-4 space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                        <IconInbox className="w-5 h-5" />
                        <span className="hidden md:inline">{t('inbox')}</span>
                        <span className="hidden md:inline ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <IconStar className="w-5 h-5" />
                        <span className="hidden md:inline">{t('favorites')}</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <IconSend className="w-5 h-5" />
                        <span className="hidden md:inline">{t('sent_folder')}</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <IconArchive className="w-5 h-5" />
                        <span className="hidden md:inline">{t('archives')}</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <IconTrash className="w-5 h-5" />
                        <span className="hidden md:inline">{t('trash')}</span>
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
                          placeholder={t('search_placeholder')}
                          className="w-full !pl-10 !pr-4 py-2 !bg-gray-100 rounded-lg text-sm !text-gray-700 placeholder:!text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 !border-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Email items */}
                    <div className="flex-1 overflow-y-auto">
                      {/* New email - highlighted */}
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
                            style={{ backgroundColor: selectedTemplateData?.primaryColor || '#8B9DC3' }}
                          >
                            {(footerSettings.firstName?.[0] || 'E').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 truncate">
                                {footerSettings.firstName} {footerSettings.lastName}
                              </span>
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{t('now')}</span>
                            </div>
                            <p className="font-medium text-gray-800 text-sm truncate mb-0.5">
                              {emailSubject || t('email_subject_label')}
                            </p>
                            <p className="text-gray-500 text-xs truncate">
                              {emailTitle || t('content_preview_placeholder')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 ml-13">
                          {bannerImageUrl && <IconPaperclip className="w-3 h-3 text-gray-400" />}
                          <IconStarFilled className="w-3 h-3 text-yellow-400" />
                        </div>
                      </div>

                      {/* Fake emails */}
                      {[
                        { from: 'LinkedIn', subject: 'Nouvelles opportunités pour vous', time: '10:32', avatar: '#0A66C2' },
                        { from: 'Stripe', subject: 'Votre facture mensuelle', time: '09:15', avatar: '#635BFF' },
                        { from: 'GitHub', subject: 'Security alert: new sign-in', time: 'Hier', avatar: '#24292F' },
                        { from: 'Google', subject: 'Alerte de sécurité', time: 'Hier', avatar: '#EA4335' },
                        { from: 'Figma', subject: 'Quelqu\'un vous a mentionné', time: 'Lun.', avatar: '#F24E1E' },
                        { from: 'Slack', subject: 'Messages non lus dans #general', time: 'Dim.', avatar: '#4A154B' },
                      ].map((email, idx) => (
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
                                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{email.time}</span>
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
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {emailSubject || t('email_subject_label')}
                        </h2>
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                            <IconArchive className="w-5 h-5" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                            <IconTrash className="w-5 h-5" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                            <IconDots className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: selectedTemplateData?.primaryColor || '#8B9DC3' }}
                        >
                          {(footerSettings.firstName?.[0] || 'E').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {footerSettings.firstName} {footerSettings.lastName}
                            </span>
                            <span className="text-gray-400 text-sm">
                              &lt;{footerSettings.email || 'email@example.com'}&gt;
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{t('to_me')}</span>
                            <IconChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email body - scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-w-0">
                      <div className="w-full max-w-2xl mx-auto">
                        {selectedTemplateData ? (
                          <EmailPreview
                            template={selectedTemplateData}
                            emailTitle={emailTitle}
                            emailContent={emailContent}
                            contentImages={contentImages}
                            ctaText={ctaText}
                            ctaUrl={ctaUrl}
                            bannerImageUrl={bannerImageUrl}
                            footerSettings={footerSettings}
                            footerLogoUrl={getFooterLogoUrl()}
                            userProfilePicture={getUserProfilePicture()}
                            headerTitleColor={customColors.headerTitleColor}
                            buttonColor={customColors.buttonColor}
                            buttonTextColor={customColors.buttonTextColor}
                            headerBackgroundUrl={headerBackgroundUrl}
                            fontFamily={customColors.fontFamily}
                            signatureData={signatureData}
                            translations={emailPreviewTranslations}
                          />
                        ) : (
                          <div className="text-center py-12 text-gray-400">
                            <IconTemplate className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">{t('select_template_preview')}</p>
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
        {/* Library Modal */}
        <AnimatePresence>
          {showLibraryModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowLibraryModal({ type: 'image', isOpen: false })}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-default">
                  <h2 className="text-xl font-bold text-primary">
                    {t('select_from_library')} - {showLibraryModal.type === 'image' ? t('toolbar_insert_image') : t('toolbar_insert_video')}
                  </h2>
                  <button
                    onClick={() => setShowLibraryModal({ type: 'image', isOpen: false })}
                    className="p-2 rounded-lg hover:bg-hover transition-colors text-secondary hover:text-primary"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Content - Grid of media items */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {loadingLibrary ? (
                    <div className="flex items-center justify-center py-16">
                      <IconLoader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                  ) : showLibraryModal.type === 'image' ? (
                    libraryMedia.images.length > 0 ? (
                      <div className="grid grid-cols-4 gap-4">
                        {libraryMedia.images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertMediaFromLibrary(img)}
                            className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-accent transition-all group"
                          >
                            <Image 
                              src={img} 
                              alt=""
                              fill
                              sizes="(max-width: 768px) 25vw, 200px"
                              className="object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <IconCheck className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-secondary">
                        <IconPhoto className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>{t('no_media_in_library')}</p>
                      </div>
                    )
                  ) : (
                    libraryMedia.videos.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4">
                        {libraryMedia.videos.map((video, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertMediaFromLibrary(video)}
                            className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-accent transition-all group bg-gray-900"
                          >
                            <video 
                              src={video}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <IconCheck className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-secondary">
                        <IconVideo className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>{t('no_media_in_library')}</p>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* SaveTemplateModal */}
        <SaveTemplateModal
          isOpen={showSaveTemplateModal}
          onClose={() => setShowSaveTemplateModal(false)}
          onSave={handleSaveTemplate}
          templateData={{
            gradientStops: customColors.gradientStops,
            gradientAngle: customColors.gradientAngle,
            buttonColor: customColors.buttonColor,
            buttonTextColor: customColors.buttonTextColor,
            textColor: customColors.textColor,
            headerTitleColor: customColors.headerTitleColor,
            fontFamily: customColors.fontFamily,
            headerBackgroundUrl: headerBackgroundUrl || undefined,
            bannerUrl: bannerImageUrl || undefined,
          }}
        />
        
        {/* LoadTemplateModal */}
        <LoadTemplateModal
          isOpen={showLoadTemplateModal}
          onClose={() => setShowLoadTemplateModal(false)}
          onLoad={applyTemplate}
          onDelete={handleDeleteTemplate}
          onSetDefault={handleSetDefaultTemplate}
          templates={customTemplates}
          loading={loadingTemplates}
        />
        
        {/* MediaPickerModal - Modal unifié pour sélection de médias */}
        <MediaPickerModal
          isOpen={mediaPickerConfig.isOpen}
          onClose={() => setMediaPickerConfig({ isOpen: false, type: 'image', target: null })}
          onSelect={handleMediaPickerSelect}
          mediaType={mediaPickerConfig.type}
          title={
            mediaPickerConfig.target === 'banner' 
              ? t('select_banner_image') || 'Sélectionner une bannière'
              : mediaPickerConfig.target === 'header'
              ? t('select_header_image') || 'Sélectionner une image d\'en-tête'
              : undefined
          }
        />
      </div>
    </ProtectedRoute>
  );
}
