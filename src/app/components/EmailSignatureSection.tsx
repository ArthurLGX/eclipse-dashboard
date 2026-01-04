'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
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
  IconPhoto,
  IconTrash,
  IconEye,
  IconLanguage,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { fetchEmailSignature, saveEmailSignature, fetchCompanyUser } from '@/lib/api';
import type { EmailSignature, CreateEmailSignatureData, Company } from '@/types';
import MediaPickerModal from './MediaPickerModal';

type FooterLanguage = 'fr' | 'en';

export default function EmailSignatureSection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<EmailSignature | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [footerLanguage, setFooterLanguage] = useState<FooterLanguage>('fr');
  
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
  });
  
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
  const updateField = (field: keyof CreateEmailSignatureData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle logo selection
  const handleLogoSelect = (url: string) => {
    updateField('logo_url', url);
    setShowMediaPicker(false);
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
            className="p-6 bg-white rounded-xl border border-default"
          >
            <SignaturePreview data={formData} language={footerLanguage} />
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
        
        {/* Social links */}
        <div className="pt-4 border-t border-default">
          <h4 className="font-medium text-primary mb-4">
            {t('social_links') || 'Réseaux sociaux'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LinkedIn */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconBrandLinkedin className="w-4 h-4 inline mr-1 text-[#0A66C2]" />
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => updateField('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="input w-full"
              />
            </div>
            
            {/* Twitter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconBrandTwitter className="w-4 h-4 inline mr-1 text-[#1DA1F2]" />
                Twitter / X
              </label>
              <input
                type="url"
                value={formData.twitter_url}
                onChange={(e) => updateField('twitter_url', e.target.value)}
                placeholder="https://twitter.com/username"
                className="input w-full"
              />
            </div>
            
            {/* Instagram */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconBrandInstagram className="w-4 h-4 inline mr-1 text-[#E4405F]" />
                Instagram
              </label>
              <input
                type="url"
                value={formData.instagram_url}
                onChange={(e) => updateField('instagram_url', e.target.value)}
                placeholder="https://instagram.com/username"
                className="input w-full"
              />
            </div>
            
            {/* Facebook */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconBrandFacebook className="w-4 h-4 inline mr-1 text-[#1877F2]" />
                Facebook
              </label>
              <input
                type="url"
                value={formData.facebook_url}
                onChange={(e) => updateField('facebook_url', e.target.value)}
                placeholder="https://facebook.com/page"
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
      
      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleLogoSelect}
        mediaType="image"
        title={t('select_logo') || 'Sélectionner un logo'}
      />
    </>
  );
}

// Composant de prévisualisation de la signature avec logo pleine hauteur
function SignaturePreview({ data, language }: { data: CreateEmailSignatureData; language: FooterLanguage }) {
  const hasSocialLinks = data.linkedin_url || data.twitter_url || data.instagram_url || data.facebook_url;
  
  // Textes selon la langue
  const texts = {
    fr: {
      unsubscribe: 'Se désinscrire',
      legal: 'Cet email a été envoyé par',
    },
    en: {
      unsubscribe: 'Unsubscribe',
      legal: 'This email was sent by',
    },
  };
  
  const t = texts[language];
  
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#333' }}>
      <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* Logo - prend la hauteur totale */}
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
                    height: '100px', 
                    width: 'auto',
                    maxWidth: '100px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </td>
            )}
            
            {/* Info */}
            <td style={{ verticalAlign: 'middle', paddingLeft: data.logo_url ? '16px' : '0' }}>
              {/* Name & Title */}
              {data.sender_name && (
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111' }}>
                  {data.sender_name}
                </div>
              )}
              {data.sender_title && (
                <div style={{ color: '#666', marginBottom: '8px' }}>
                  {data.sender_title}
                </div>
              )}
              
              {/* Company */}
              {data.company_name && (
                <div style={{ fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
                  {data.company_name}
                </div>
              )}
              
              {/* Contact */}
              <div style={{ fontSize: '13px', color: '#666' }}>
                {data.phone && <div>📞 {data.phone}</div>}
                {data.website && (
                  <div>
                    🌐 <a href={data.website} style={{ color: '#10b981', textDecoration: 'none' }}>
                      {data.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {data.address && <div>📍 {data.address}</div>}
              </div>
              
              {/* Social links */}
              {hasSocialLinks && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  {data.linkedin_url && (
                    <a href={data.linkedin_url} style={{ color: '#0A66C2' }}>
                      <IconBrandLinkedin style={{ width: '20px', height: '20px' }} />
                    </a>
                  )}
                  {data.twitter_url && (
                    <a href={data.twitter_url} style={{ color: '#1DA1F2' }}>
                      <IconBrandTwitter style={{ width: '20px', height: '20px' }} />
                    </a>
                  )}
                  {data.instagram_url && (
                    <a href={data.instagram_url} style={{ color: '#E4405F' }}>
                      <IconBrandInstagram style={{ width: '20px', height: '20px' }} />
                    </a>
                  )}
                  {data.facebook_url && (
                    <a href={data.facebook_url} style={{ color: '#1877F2' }}>
                      <IconBrandFacebook style={{ width: '20px', height: '20px' }} />
                    </a>
                  )}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Footer legal text */}
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '12px', 
        borderTop: '1px solid #e5e7eb',
        fontSize: '11px',
        color: '#999',
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
