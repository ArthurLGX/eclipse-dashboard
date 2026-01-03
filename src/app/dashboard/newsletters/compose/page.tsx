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
} from '@tabler/icons-react';
import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useClients, useCompany } from '@/hooks/useApi';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import type { Client, Company } from '@/types';

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
  features: string[];
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
  translations: {
    specialOffer: string;
    yourTitleHere: string;
    contentPreviewPlaceholder: string;
  };
}

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
  translations,
}: EmailPreviewProps) {
  const isPromo = template.id === 'promotional';
  const isAnnouncement = template.id === 'announcement';

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full text-gray-800">
      {/* Header with template-specific styling */}
      <div 
        className={`text-center ${isAnnouncement ? 'py-12' : 'py-8'}`}
        style={{ 
          background: `linear-gradient(135deg, ${template.primaryColor}, ${template.accentColor})` 
        }}
      >
        {isPromo && (
          <div className="inline-block px-4 py-1 bg-white/40 backdrop-blur rounded-full text-gray-800 text-sm font-bold mb-4">
            🎉 {translations.specialOffer}
          </div>
        )}
        
        <h1 className={`font-bold !text-gray-800 mb-2 px-6 ${isAnnouncement ? 'text-3xl' : 'text-2xl'}`}>
          {emailTitle || translations.yourTitleHere}
        </h1>
      </div>

      {/* Email body */}
      <div className="p-8">
        {/* Content */}
        <div 
          className="prose prose-sm max-w-none text-gray-700 mb-6"
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
                backgroundColor: template.primaryColor,
                color: '#1F2937',
              }}
            >
              {ctaText}
              {isPromo && ' →'}
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6">
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
      
      {/* Banner (end of email) */}
      {bannerImageUrl && (
        <div className="flex justify-center items-center w-full pb-8 px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={bannerImageUrl} 
            alt="Bannière" 
            className="w-full rounded-lg object-contain max-h-48"
          />
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
  };
}

function RichTextEditor({ value, onChange, placeholder, translations }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Initialiser le contenu une seule fois au montage
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || '';
      isInitialized.current = true;
    }
  }, [value]);

  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
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
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.heading1}
          >
            <IconH1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.heading2}
          >
            <IconH2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
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
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.bold}
          >
            <IconBold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
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
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.bulletList}
          >
            <IconList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
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
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.alignLeft}
          >
            <IconAlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.alignCenter}
          >
            <IconAlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
            title={translations.alignRight}
          >
            <IconAlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Color */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
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
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
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
            onClick={() => setShowLinkInput(!showLinkInput)}
            className="p-2 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
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
                className="px-3 py-1 bg-accent text-white rounded text-sm"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        onInput={handleInput}
        className="min-h-[200px] p-4 text-primary focus:outline-none prose prose-sm max-w-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
          [&_p]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5
          [&_ol]:list-decimal [&_ol]:pl-5
          [&_a]:text-accent [&_a]:underline
          empty:before:content-[attr(data-placeholder)] empty:before:text-placeholder empty:before:pointer-events-none"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
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
  
  // CTA
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  
  // Banner
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  
  // Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [showFooterSettings, setShowFooterSettings] = useState(false);
  
  // Refs
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  
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

  // Templates configuration - Palette personnalisée
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
    },
    {
      id: 'custom',
      name: t('template_custom'),
      description: t('template_custom_desc'),
      icon: <IconPalette className="w-8 h-8" stroke={1} />,
      primaryColor: '#E8D9B5',
      accentColor: '#F9EDD8',
      borderColor: '#F0E4C8',
      features: [t('feature_total_freedom'), t('feature_no_constraints'), t('feature_unique_design')],
    },
  ], [t]);

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = useMemo(() => [
    { id: 'template', label: t('step_template'), icon: <IconTemplate className="w-5 h-5" /> },
    { id: 'content', label: t('step_content'), icon: <IconMail className="w-5 h-5" /> },
    { id: 'recipients', label: t('step_recipients'), icon: <IconUsers className="w-5 h-5" /> },
    { id: 'review', label: t('step_send'), icon: <IconSend className="w-5 h-5" /> },
  ], [t]);

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  // Handlers
  const handleSelectTemplate = (templateId: TemplateType) => {
    setSelectedTemplate(templateId);
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

  // Image upload handlers
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showGlobalPopup(t('please_select_image'), 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showGlobalPopup(t('image_max_size'), 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setBannerImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleContentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showGlobalPopup(t('please_select_image'), 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showGlobalPopup(t('image_max_size'), 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setContentImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      showGlobalPopup(t('please_select_recipient'), 'error');
      return;
    }
    if (!emailSubject.trim()) {
      showGlobalPopup(t('please_enter_subject'), 'error');
      return;
    }
    if (!user?.id) {
      showGlobalPopup(t('not_authenticated'), 'error');
      return;
    }

    setSending(true);
    try {
      // Importer la fonction createNewsletter
      const { createNewsletter } = await import('@/lib/api');
      
      // Créer la newsletter dans la base de données
      await createNewsletter({
        title: emailTitle || emailSubject,
        subject: emailSubject,
        content: emailContent,
        template: (selectedTemplate as 'standard' | 'promotional' | 'announcement' | 'custom') || 'standard',
        n_status: 'sent',
        send_at: new Date().toISOString(),
        author: user.id,
        subscribers: selectedRecipients,
      });

      showGlobalPopup(`${t('newsletter_sent_success')} ${selectedRecipients.length} ${t('recipients_count')}`, 'success');
      
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

  const canProceed = () => {
    switch (currentStep) {
      case 'template':
        return selectedTemplate !== null;
      case 'content':
        return emailSubject.trim() !== '' && emailContent.trim() !== '';
      case 'recipients':
        return selectedRecipients.length > 0;
      default:
        return true;
    }
  };

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
  }), [t]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-page">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-default py-4 rounded-t-xl">
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
                    <p className="text-sm text-muted">
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
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent text-accent-text font-medium
                      hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <IconSend className="w-4 h-4" />
                    )}
                    <span>{t('send')}</span>
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
                        ? 'bg-accent text-accent-text' 
                        : index < stepIndex 
                          ? 'bg-success-light text-success' 
                          : 'text-muted hover:text-secondary'
                      }`}
                  >
                    {index < stepIndex ? (
                      <IconCheck className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                    <span className="hidden sm:inline font-medium">{step.label}</span>
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
                      <button
                        onClick={() => setShowFooterSettings(!showFooterSettings)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                          ${showFooterSettings ? 'bg-accent text-white' : 'bg-muted hover:bg-hover text-secondary'}`}
                      >
                        <IconSettings className="w-4 h-4" />
                        <span>{t('footer')}</span>
                      </button>
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
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-primary">{t('message_label')} *</h3>
                        <div className="flex items-center gap-2">
                          <input
                            ref={contentImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleContentImageUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => contentImageInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-hover text-secondary text-sm"
                          >
                            <IconPhoto className="w-4 h-4" />
                            {t('add_image')}
                          </button>
                        </div>
                      </div>
                      
                      <RichTextEditor 
                        value={emailContent}
                        onChange={setEmailContent}
                        placeholder={t('write_message_placeholder')}
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
                        }}
                      />

                      {/* Content Images Preview */}
                      {contentImages.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-default">
                          {contentImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt="" className="w-24 h-24 object-cover rounded-lg" />
                              <button
                                onClick={() => setContentImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IconX className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
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
                      <h3 className="font-semibold text-primary">{t('banner_section_title')}</h3>
                      
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                      
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
                              onClick={() => bannerInputRef.current?.click()}
                              className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-700 shadow-lg transition-all"
                            >
                              <IconPhoto className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setBannerImageUrl('')}
                              className="p-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white shadow-lg transition-all"
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => bannerInputRef.current?.click()}
                          className="border-2 border-dashed border-default rounded-xl p-6 text-center 
                            hover:border-accent hover:bg-accent-light/30 transition-all cursor-pointer group"
                        >
                          <IconUpload className="w-8 h-8 mx-auto mb-2 text-muted group-hover:text-accent transition-colors" />
                          <p className="text-primary font-medium">{t('add_banner')}</p>
                          <p className="text-sm text-muted">{t('banner_hint')}</p>
                        </div>
                      )}
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
                          {selectedRecipients.length} {t('recipients_selected')}
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
                            {selectedRecipients.length} {t('contacts')}
                          </p>
                        </div>
                      </div>

                      <div className="bg-card rounded-xl p-5 border border-default">
                        <h3 className="font-semibold text-primary mb-3">{t('step_recipients')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {clients
                            .filter(c => selectedRecipients.includes(c.id))
                            .slice(0, 10)
                            .map(client => (
                              <span
                                key={client.id}
                                className="px-3 py-1 bg-muted rounded-full text-sm text-secondary"
                              >
                                {client.name}
                              </span>
                            ))}
                          {selectedRecipients.length > 10 && (
                            <span className="px-3 py-1 bg-accent-light rounded-full text-sm text-accent">
                              +{selectedRecipients.length - 10} {t('others')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-accent/10 to-info/10 rounded-xl p-6 border border-accent/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-primary mb-1">{t('ready_to_send')}</h3>
                            <p className="text-sm text-secondary">
                              {t('newsletter_will_be_sent')} {selectedRecipients.length} {t('recipients_count')}
                            </p>
                          </div>
                          <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-accent-text font-semibold
                              hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-accent/25"
                          >
                            {sending ? (
                              <IconLoader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <IconSend className="w-5 h-5" />
                            )}
                            <span>{sending ? t('sending') : t('send_now')}</span>
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
      </div>
    </ProtectedRoute>
  );
}
