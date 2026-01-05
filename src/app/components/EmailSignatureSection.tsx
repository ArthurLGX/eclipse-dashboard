'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSignature,
  IconLoader2,
  IconCheck,
  IconBuilding,
  IconUser,
  IconPhone,
  IconWorld,
  IconMapPin,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandYoutube,
  IconBrandTiktok,
  IconBrandGithub,
  IconPhoto,
  IconTrash,
  IconEye,
  IconLanguage,
  IconLink,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconPalette,
  IconPlus,
  IconGripVertical,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { fetchEmailSignature, saveEmailSignature, fetchCompanyUser } from '@/lib/api';
import type { EmailSignature, CreateEmailSignatureData, Company, SocialLink } from '@/types';
import MediaPickerModal from './MediaPickerModal';

type FooterLanguage = 'fr' | 'en';

// Plateformes sociales disponibles
const SOCIAL_PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: IconBrandLinkedin },
  { id: 'twitter', label: 'Twitter / X', color: '#1DA1F2', icon: IconBrandTwitter },
  { id: 'instagram', label: 'Instagram', color: '#E4405F', icon: IconBrandInstagram },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: IconBrandFacebook },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', icon: IconBrandYoutube },
  { id: 'tiktok', label: 'TikTok', color: '#000000', icon: IconBrandTiktok },
  { id: 'github', label: 'GitHub', color: '#333333', icon: IconBrandGithub },
  { id: 'custom', label: 'Personnalisé', color: '#7C3AED', icon: IconLink },
];

// Google Fonts populaires
const GOOGLE_FONTS = [
  // Sans-serif modernes
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  { value: 'Nunito Sans', label: 'Nunito Sans', category: 'Sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'Sans-serif' },
  { value: 'Work Sans', label: 'Work Sans', category: 'Sans-serif' },
  { value: 'Outfit', label: 'Outfit', category: 'Sans-serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'Sans-serif' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'Sans-serif' },
  { value: 'Source Sans 3', label: 'Source Sans 3', category: 'Sans-serif' },
  { value: 'Manrope', label: 'Manrope', category: 'Sans-serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans-serif' },
  { value: 'Figtree', label: 'Figtree', category: 'Sans-serif' },
  { value: 'Quicksand', label: 'Quicksand', category: 'Sans-serif' },
  { value: 'Mulish', label: 'Mulish', category: 'Sans-serif' },
  { value: 'Barlow', label: 'Barlow', category: 'Sans-serif' },
  { value: 'Urbanist', label: 'Urbanist', category: 'Sans-serif' },
  { value: 'Sora', label: 'Sora', category: 'Sans-serif' },
  { value: 'Albert Sans', label: 'Albert Sans', category: 'Sans-serif' },
  { value: 'Cabin', label: 'Cabin', category: 'Sans-serif' },
  { value: 'Karla', label: 'Karla', category: 'Sans-serif' },
  { value: 'Lexend', label: 'Lexend', category: 'Sans-serif' },
  { value: 'Rubik', label: 'Rubik', category: 'Sans-serif' },
  { value: 'Josefin Sans', label: 'Josefin Sans', category: 'Sans-serif' },
  { value: 'Fira Sans', label: 'Fira Sans', category: 'Sans-serif' },
  { value: 'Exo 2', label: 'Exo 2', category: 'Sans-serif' },
  // Serif élégantes
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'PT Serif', label: 'PT Serif', category: 'Serif' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', category: 'Serif' },
  { value: 'Source Serif 4', label: 'Source Serif 4', category: 'Serif' },
  { value: 'Crimson Text', label: 'Crimson Text', category: 'Serif' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif' },
  { value: 'EB Garamond', label: 'EB Garamond', category: 'Serif' },
  { value: 'Bitter', label: 'Bitter', category: 'Serif' },
  { value: 'Spectral', label: 'Spectral', category: 'Serif' },
  { value: 'DM Serif Display', label: 'DM Serif Display', category: 'Serif' },
  { value: 'Fraunces', label: 'Fraunces', category: 'Serif' },
  // Display / Créatives
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Display' },
  { value: 'Oswald', label: 'Oswald', category: 'Display' },
  { value: 'Anton', label: 'Anton', category: 'Display' },
  { value: 'Archivo Black', label: 'Archivo Black', category: 'Display' },
  { value: 'Righteous', label: 'Righteous', category: 'Display' },
  // Monospace
  { value: 'Fira Code', label: 'Fira Code', category: 'Monospace' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'Monospace' },
  { value: 'IBM Plex Mono', label: 'IBM Plex Mono', category: 'Monospace' },
  // Handwriting / Script
  { value: 'Dancing Script', label: 'Dancing Script', category: 'Handwriting' },
  { value: 'Pacifico', label: 'Pacifico', category: 'Handwriting' },
  { value: 'Caveat', label: 'Caveat', category: 'Handwriting' },
  { value: 'Satisfy', label: 'Satisfy', category: 'Handwriting' },
  { value: 'Great Vibes', label: 'Great Vibes', category: 'Handwriting' },
  // Web-safe fallbacks
  { value: 'Arial', label: 'Arial (Web-safe)', category: 'Web-safe' },
  { value: 'Helvetica', label: 'Helvetica (Web-safe)', category: 'Web-safe' },
  { value: 'Georgia', label: 'Georgia (Web-safe)', category: 'Web-safe' },
  { value: 'Verdana', label: 'Verdana (Web-safe)', category: 'Web-safe' },
  { value: 'Times New Roman', label: 'Times New Roman (Web-safe)', category: 'Web-safe' },
];

// Grouper les fonts par catégorie
const FONT_CATEGORIES = ['Sans-serif', 'Serif', 'Display', 'Monospace', 'Handwriting', 'Web-safe'];

// Helper pour obtenir l'URL Google Fonts
const getGoogleFontUrl = (fontFamily: string) => {
  // Web-safe fonts n'ont pas besoin de Google Fonts
  const webSafe = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman', 'Tahoma', 'Trebuchet MS'];
  if (webSafe.includes(fontFamily)) return null;
  
  const fontName = fontFamily.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
};

export default function EmailSignatureSection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setSignature] = useState<EmailSignature | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [footerLanguage, setFooterLanguage] = useState<FooterLanguage>('fr');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Form state
  const [formData, setFormData] = useState<CreateEmailSignatureData>({
    company_name: '',
    sender_name: '',
    sender_title: '',
    phone: '',
    website: '',
    address: '',
    linkedin_url: '',
    twitter_url: '',
    instagram_url: '',
    facebook_url: '',
    logo_url: '',
    banner_url: '',
    banner_link: '',
    banner_alt: '',
    // Nouveaux champs de personnalisation
    logo_size: 100,
    primary_color: '#10b981',
    text_color: '#333333',
    secondary_color: '#666666',
    font_family: 'Inter',
    social_links: [],
  });
  
  // État pour la personnalisation avancée
  const [showCustomization, setShowCustomization] = useState(false);
  
  // Charger la signature existante et les données entreprise
  const loadSignature = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Charger signature et données entreprise en parallèle
      const [sig, companyResponse] = await Promise.all([
        fetchEmailSignature(user.id),
        fetchCompanyUser(user.id),
      ]);
      
      // Extraire les données de l'entreprise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companyData = (companyResponse as any)?.data?.[0] as Company | undefined;
      
      if (sig) {
        // Si une signature existe, l'utiliser
        setSignature(sig);
        setFormData({
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
          // Champs de personnalisation
          logo_size: sig.logo_size || 100,
          primary_color: sig.primary_color || '#10b981',
          text_color: sig.text_color || '#333333',
          secondary_color: sig.secondary_color || '#666666',
          font_family: sig.font_family || 'Inter',
          social_links: sig.social_links || [],
        });
      } else if (companyData) {
        // Sinon, pré-remplir avec les données entreprise
        setFormData({
          company_name: companyData.name || '',
          sender_name: user.username || '',
          sender_title: '',
          phone: companyData.phoneNumber || '',
          website: companyData.website || '',
          address: companyData.location || '',
          linkedin_url: '',
          twitter_url: '',
          instagram_url: '',
          facebook_url: '',
          logo_url: companyData.logo || '',
          banner_url: '',
          banner_link: '',
          banner_alt: '',
          logo_size: 100,
          primary_color: '#10b981',
          text_color: '#333333',
          secondary_color: '#666666',
          font_family: 'Inter',
          social_links: [],
        });
      } else {
        // Aucune donnée, juste mettre le nom de l'utilisateur
        setFormData(prev => ({
          ...prev,
          sender_name: user.username || '',
        }));
      }
    } catch (error) {
      console.error('Error loading signature:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.username]);
  
  useEffect(() => {
    loadSignature();
  }, [loadSignature]);
  
  // Charger la Google Font sélectionnée
  useEffect(() => {
    const fontUrl = getGoogleFontUrl(formData.font_family || 'Inter');
    if (fontUrl) {
      const fontName = (formData.font_family || 'Inter').replace(/\s+/g, '-');
      const linkId = `google-font-signature-${fontName}`;
      
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
      }
    }
  }, [formData.font_family]);
  
  // Sauvegarder la signature
  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const saved = await saveEmailSignature(user.id, formData);
      setSignature(saved);
      showGlobalPopup(t('signature_saved') || 'Signature sauvegardée', 'success');
    } catch (error) {
      console.error('Error saving signature:', error);
      showGlobalPopup(t('signature_save_error') || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Update form field
  const updateField = (field: keyof CreateEmailSignatureData, value: string | number | SocialLink[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle logo selection
  const handleLogoSelect = (url: string) => {
    updateField('logo_url', url);
    setShowMediaPicker(false);
  };
  
  // Handle banner selection
  const handleBannerSelect = (url: string) => {
    updateField('banner_url', url);
    setShowBannerPicker(false);
  };
  
  // Gestion des liens sociaux
  const addSocialLink = () => {
    const newLink: SocialLink = {
      id: `social-${Date.now()}`,
      platform: 'linkedin',
      url: '',
      color: '#0A66C2',
    };
    updateField('social_links', [...(formData.social_links || []), newLink]);
  };
  
  const updateSocialLink = (id: string, updates: Partial<SocialLink>) => {
    const links = formData.social_links || [];
    const updatedLinks = links.map(link => 
      link.id === id ? { ...link, ...updates } : link
    );
    updateField('social_links', updatedLinks);
  };
  
  const removeSocialLink = (id: string) => {
    const links = formData.social_links || [];
    updateField('social_links', links.filter(link => link.id !== id));
  };
  
  const moveSocialLink = (id: string, direction: 'up' | 'down') => {
    const links = [...(formData.social_links || [])];
    const index = links.findIndex(link => link.id === id);
    if (direction === 'up' && index > 0) {
      [links[index], links[index - 1]] = [links[index - 1], links[index]];
    } else if (direction === 'down' && index < links.length - 1) {
      [links[index], links[index + 1]] = [links[index + 1], links[index]];
    }
    updateField('social_links', links);
  };
  
  if (loading) {
    return (
      <div className="bg-card border border-default rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-card border border-default rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <IconSignature className="w-5 h-5 text-accent" />
              {t('email_signature') || 'Signature email'}
            </h3>
            <p className="text-sm text-muted mt-1">
              {t('email_signature_desc') || 'Cette signature sera utilisée dans le footer de vos newsletters et emails'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/10 rounded-lg">
              <IconLanguage className="w-4 h-4 text-muted" />
              <button
                onClick={() => setFooterLanguage('fr')}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  footerLanguage === 'fr' 
                    ? 'bg-accent text-white' 
                    : 'text-muted hover:text-primary'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setFooterLanguage('en')}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  footerLanguage === 'en' 
                    ? 'bg-accent text-white' 
                    : 'text-muted hover:text-primary'
                }`}
              >
                EN
              </button>
            </div>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded-lg transition-colors"
            >
              <IconEye className="w-4 h-4" />
              {t('preview') || 'Aperçu'}
            </button>
          </div>
        </div>
        
        {/* Preview */}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Preview Mode Toggle */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  previewMode === 'desktop'
                    ? 'bg-accent text-white'
                    : 'bg-muted/10 text-muted hover:bg-muted/20'
                }`}
              >
                <IconDeviceDesktop className="w-4 h-4" />
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  previewMode === 'mobile'
                    ? 'bg-accent text-white'
                    : 'bg-muted/10 text-muted hover:bg-muted/20'
                }`}
              >
                <IconDeviceMobile className="w-4 h-4" />
                Mobile
              </button>
            </div>
            
            {/* Preview Container - Always white background for email preview */}
            <div className={`mx-auto transition-all duration-300 ${
              previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
            }`}>
              <div className="email-preview-light p-6 rounded-xl border border-gray-200">
                <SignaturePreview data={formData} language={footerLanguage} isMobile={previewMode === 'mobile'} />
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colonne gauche - Identité */}
          <div className="space-y-4">
            <h4 className="font-medium text-primary flex items-center gap-2">
              <IconUser className="w-4 h-4 text-accent" />
              {t('identity') || 'Identité'}
            </h4>
            
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('logo') || 'Logo'}
              </label>
              <div className="flex items-center gap-3">
                {formData.logo_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain rounded-lg border border-default bg-white"
                    />
                    <button
                      onClick={() => updateField('logo_url', '')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <IconTrash className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMediaPicker(true)}
                    className="w-16 h-16 border-2 border-dashed border-default rounded-lg flex items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    <IconPhoto className="w-6 h-6" />
                  </button>
                )}
                {!formData.logo_url && (
                  <button
                    onClick={() => setShowMediaPicker(true)}
                    className="text-sm text-accent hover:underline"
                  >
                    {t('add_logo') || 'Ajouter un logo'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Company name */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconBuilding className="w-4 h-4 inline mr-1" />
                {t('company_name') || 'Nom de l\'entreprise'}
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                placeholder="Acme Corp"
                className="input w-full"
              />
            </div>
            
            {/* Sender name */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('sender_name') || 'Votre nom'}
              </label>
              <input
                type="text"
                value={formData.sender_name}
                onChange={(e) => updateField('sender_name', e.target.value)}
                placeholder="Jean Dupont"
                className="input w-full"
              />
            </div>
            
            {/* Sender title */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('sender_title') || 'Titre / Fonction'}
              </label>
              <input
                type="text"
                value={formData.sender_title}
                onChange={(e) => updateField('sender_title', e.target.value)}
                placeholder="CEO & Fondateur"
                className="input w-full"
              />
            </div>
          </div>
          
          {/* Colonne droite - Contact */}
          <div className="space-y-4">
            <h4 className="font-medium text-primary flex items-center gap-2">
              <IconPhone className="w-4 h-4 text-accent" />
              {t('contact_info') || 'Coordonnées'}
            </h4>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('phone') || 'Téléphone'}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+33 1 23 45 67 89"
                className="input w-full"
              />
            </div>
            
            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconWorld className="w-4 h-4 inline mr-1" />
                {t('website') || 'Site web'}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.example.com"
                className="input w-full"
              />
            </div>
            
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconMapPin className="w-4 h-4 inline mr-1" />
                {t('address') || 'Adresse'}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Rue de Paris, 75001 Paris"
                className="input w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Social links - Nouveau système dynamique */}
        <div className="pt-4 border-t border-default">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-primary flex items-center gap-2">
              <IconLink className="w-4 h-4 text-accent" />
              {t('social_links') || 'Réseaux sociaux'}
            </h4>
            <button
              onClick={addSocialLink}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded-lg transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              {t('add_social') || 'Ajouter'}
            </button>
          </div>
          
          {/* Liste des liens sociaux */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(formData.social_links || []).map((link, index) => {
                const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
                const PlatformIcon = platform?.icon || IconLink;
                
                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 p-3 bg-muted/5 rounded-lg border border-default"
                  >
                    {/* Drag handle */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveSocialLink(link.id, 'up')}
                        disabled={index === 0}
                        className="text-muted hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <IconGripVertical className="w-4 h-4 rotate-180" />
                      </button>
                      <button
                        onClick={() => moveSocialLink(link.id, 'down')}
                        disabled={index === (formData.social_links?.length || 0) - 1}
                        className="text-muted hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <IconGripVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Platform selector */}
                    <select
                      value={link.platform}
                      onChange={(e) => {
                        const newPlatform = SOCIAL_PLATFORMS.find(p => p.id === e.target.value);
                        updateSocialLink(link.id, { 
                          platform: e.target.value,
                          color: newPlatform?.color || link.color,
                        });
                      }}
                      className="input py-2 pr-8"
                    >
                      {SOCIAL_PLATFORMS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    
                    {/* Icon preview */}
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${link.color}20` }}
                    >
                      <PlatformIcon className="w-4 h-4" style={{ color: link.color }} />
                    </div>
                    
                    {/* URL input */}
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateSocialLink(link.id, { url: e.target.value })}
                      placeholder={link.platform === 'custom' ? 'https://...' : `https://${link.platform}.com/...`}
                      className="input flex-1"
                    />
                    
                    {/* Custom label (only for custom platform) */}
                    {link.platform === 'custom' && (
                      <input
                        type="text"
                        value={link.label || ''}
                        onChange={(e) => updateSocialLink(link.id, { label: e.target.value })}
                        placeholder={t('label') || 'Label'}
                        className="input w-24"
                      />
                    )}
                    
                    {/* Color picker */}
                    <input
                      type="color"
                      value={link.color || '#7C3AED'}
                      onChange={(e) => updateSocialLink(link.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                      title={t('choose_color') || 'Choisir une couleur'}
                    />
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeSocialLink(link.id)}
                      className="p-2 text-danger/70 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {(!formData.social_links || formData.social_links.length === 0) && (
              <p className="text-sm text-muted text-center py-4">
                {t('no_social_links') || 'Aucun réseau social ajouté. Cliquez sur "Ajouter" pour en ajouter un.'}
              </p>
            )}
          </div>
        </div>
        
        {/* Customization section */}
        <div className="pt-4 border-t border-default">
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className="flex items-center justify-between w-full p-3 bg-accent/5 hover:bg-accent/10 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconPalette className="w-5 h-5 text-accent" />
              <span className="font-medium text-primary">
                {t('customization') || 'Personnalisation avancée'}
              </span>
            </div>
            <motion.div
              animate={{ rotate: showCustomization ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <IconGripVertical className="w-5 h-5 text-muted rotate-90" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showCustomization && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-6">
                  {/* Logo size */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('logo_size') || 'Taille du logo'} ({formData.logo_size || 100}px)
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="150"
                      value={formData.logo_size || 100}
                      onChange={(e) => updateField('logo_size', parseInt(e.target.value))}
                      className="w-full h-2 bg-muted/20 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <div className="flex justify-between text-xs text-muted mt-1">
                      <span>40px</span>
                      <span>150px</span>
                    </div>
                  </div>
                  
                  {/* Colors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Primary color */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        {t('primary_color') || 'Couleur principale'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.primary_color || '#10b981'}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={formData.primary_color || '#10b981'}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="input flex-1"
                          placeholder="#10b981"
                        />
                      </div>
                    </div>
                    
                    {/* Text color */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        {t('signature_text_color') || 'Couleur du texte'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.text_color || '#333333'}
                          onChange={(e) => updateField('text_color', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={formData.text_color || '#333333'}
                          onChange={(e) => updateField('text_color', e.target.value)}
                          className="input flex-1"
                          placeholder="#333333"
                        />
                      </div>
                    </div>
                    
                    {/* Secondary color */}
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        {t('secondary_color') || 'Couleur secondaire'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.secondary_color || '#666666'}
                          onChange={(e) => updateField('secondary_color', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={formData.secondary_color || '#666666'}
                          onChange={(e) => updateField('secondary_color', e.target.value)}
                          className="input flex-1"
                          placeholder="#666666"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Font family */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('signature_font_family') || 'Police'}
                    </label>
                    <select
                      value={formData.font_family || 'Inter'}
                      onChange={(e) => updateField('font_family', e.target.value)}
                      className="input w-full md:w-2/3"
                      style={{ fontFamily: formData.font_family }}
                    >
                      {FONT_CATEGORIES.map(category => (
                        <optgroup key={category} label={category}>
                          {GOOGLE_FONTS.filter(f => f.category === category).map(font => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-xs text-muted mt-1">
                      {t('google_fonts_note') || 'Note : Les Google Fonts peuvent ne pas s\'afficher sur tous les clients email (Outlook, etc.)'}
                    </p>
                  </div>
                  
                  {/* Preview of customization */}
                  <div className="p-4 bg-muted/5 rounded-lg border border-default">
                    <p className="text-sm text-muted mb-2">{t('preview') || 'Aperçu des couleurs'}:</p>
                    <div className="flex items-center gap-4" style={{ fontFamily: formData.font_family }}>
                      <span style={{ color: formData.text_color, fontWeight: 'bold' }}>
                        Texte principal
                      </span>
                      <span style={{ color: formData.secondary_color }}>
                        Texte secondaire
                      </span>
                      <span style={{ color: formData.primary_color, fontWeight: 600 }}>
                        Accent
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Banner section */}
        <div className="pt-4 border-t border-default">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-primary flex items-center gap-2">
                <IconPhoto className="w-4 h-4 text-accent" />
                {t('promotional_banner') || 'Bannière promotionnelle'}
              </h4>
              <p className="text-xs text-muted mt-1">
                {t('banner_desc') || 'Optionnel : ajoutez une bannière sous votre signature'}
              </p>
            </div>
          </div>
          
          {/* Banner size recommendations */}
          <div className="mb-4 p-3 rounded-lg bg-info-light border border-info">
            <p className="text-xs text-info">
              <strong>{t('recommended_sizes') || 'Tailles recommandées'}</strong>:
              <br />• Desktop : 600×150 px (max)
              <br />• Mobile : 320×100 px (min)
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Banner preview/upload */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('banner_image') || 'Image de la bannière'}
              </label>
              {formData.banner_url ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={formData.banner_url} 
                    alt={formData.banner_alt || 'Banner'} 
                    className="max-w-full h-auto max-h-32 object-contain rounded-lg border border-default bg-white"
                  />
                  <button
                    onClick={() => updateField('banner_url', '')}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <IconTrash className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBannerPicker(true)}
                  className="w-full h-24 border-2 border-dashed border-default rounded-lg flex flex-col items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors"
                >
                  <IconPhoto className="w-6 h-6 mb-1" />
                  <span className="text-sm">{t('add_banner') || 'Ajouter une bannière'}</span>
                </button>
              )}
              {formData.banner_url && (
                <button
                  onClick={() => setShowBannerPicker(true)}
                  className="mt-2 text-sm text-accent hover:underline"
                >
                  {t('change_banner') || 'Changer la bannière'}
                </button>
              )}
            </div>
            
            {/* Banner link */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconLink className="w-4 h-4 inline mr-1" />
                {t('banner_link') || 'Lien de la bannière'}
              </label>
              <input
                type="url"
                value={formData.banner_link || ''}
                onChange={(e) => updateField('banner_link', e.target.value)}
                placeholder="https://example.com/promo"
                className="input w-full"
              />
              <p className="text-xs text-muted mt-1">
                {t('banner_link_desc') || 'URL vers laquelle rediriger au clic sur la bannière'}
              </p>
            </div>
            
            {/* Banner alt text */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('banner_alt') || 'Texte alternatif'}
              </label>
              <input
                type="text"
                value={formData.banner_alt || ''}
                onChange={(e) => updateField('banner_alt', e.target.value)}
                placeholder={t('banner_alt_placeholder') || 'Promotion de fin d\'année'}
                className="input w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-default">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <IconLoader2 className="w-4 h-4 animate-spin" />
                {t('saving') || 'Sauvegarde...'}
              </>
            ) : (
              <>
                <IconCheck className="w-4 h-4" />
                {t('save_signature') || 'Sauvegarder la signature'}
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Media Picker Modal for Logo */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleLogoSelect}
        mediaType="image"
        title={t('select_logo') || 'Sélectionner un logo'}
      />
      
      {/* Media Picker Modal for Banner */}
      <MediaPickerModal
        isOpen={showBannerPicker}
        onClose={() => setShowBannerPicker(false)}
        onSelect={handleBannerSelect}
        mediaType="image"
        title={t('select_banner') || 'Sélectionner une bannière'}
      />
    </>
  );
}

// Composant de prévisualisation - COPIE CONFORME du HTML envoyé par email
function SignaturePreview({ 
  data, 
  language, 
  isMobile = false 
}: { 
  data: CreateEmailSignatureData; 
  language: FooterLanguage;
  isMobile?: boolean;
}) {
  // Vérifier s'il y a des liens sociaux (uniquement le nouveau système)
  const socialLinks = data.social_links || [];
  const hasSocialLinks = socialLinks.length > 0;
  
  // Textes selon la langue
  const texts = {
    fr: {
      legal: 'Cet email a été envoyé par',
    },
    en: {
      legal: 'This email was sent by',
    },
  };
  
  const t = texts[language];
  
  // Utiliser les valeurs personnalisées ou les valeurs par défaut
  const logoSize = isMobile ? Math.min(60, (data.logo_size || 100) * 0.6) : (data.logo_size || 100);
  const primaryColor = data.primary_color || '#10b981';
  const textColor = data.text_color || '#333333';
  const secondaryColor = data.secondary_color || '#666666';
  const baseFontFamily = data.font_family || 'Inter';
  // Ajouter les fallbacks pour les emails
  const fontFamily = `'${baseFontFamily}', Arial, sans-serif`;
  
  return (
    <div style={{ fontFamily, fontSize: '14px', color: textColor, backgroundColor: '#ffffff' }}>
      {/* Signature - Alignée à gauche avec espacement faible */}
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
                <div style={{ fontWeight: '600', color: primaryColor, marginBottom: '4px' }}>
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
              {hasSocialLinks && socialLinks.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {socialLinks.map((link, index) => {
                    const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
                    const label = link.label || platform?.label || link.platform;
                    const color = link.color || platform?.color || primaryColor;
                    
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
      {data.banner_url && (
        <div style={{ marginTop: '16px' }}>
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
      
      {/* Footer legal text */}
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '12px', 
        borderTop: '1px solid #e5e7eb',
        fontSize: '11px',
        color: '#999999',
        textAlign: 'center',
      }}>
        {data.company_name && (
          <p style={{ margin: 0 }}>
            {t.legal} {data.company_name}
          </p>
        )}
      </div>
    </div>
  );
}

// Export for use in email composition
export { SignaturePreview };
