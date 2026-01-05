'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconMail,
  IconSend,
  IconArrowLeft,
  IconLoader2,
  IconUser,
  IconPaperclip,
  IconTrash,
  IconX,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconSignature,
  IconClock,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import EmailFooter, { type FooterLanguage } from '@/app/components/EmailFooter';
import MediaPickerModal from '@/app/components/MediaPickerModal';
import EmailScheduler from '@/app/components/EmailScheduler';
import { fetchEmailSignature, createSentEmail } from '@/lib/api';
import { uploadToStrapi } from '@/lib/strapi-upload';
import { useDraftSave } from '@/hooks/useDraftSave';
import type { CreateEmailSignatureData } from '@/types';

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
}

interface Recipient {
  id: string;
  email: string;
  name?: string;
}

export default function ComposeEmailPage() {
  return (
    <ProtectedRoute>
      <ComposeEmail />
    </ProtectedRoute>
  );
}

function ComposeEmail() {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  
  // UI state
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // Signature data
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [footerLanguage, setFooterLanguage] = useState<FooterLanguage>('fr');
  
  // Draft management
  const { clearDraft } = useDraftSave({
    draftKey: 'email-compose-draft',
    data: {
      subject,
      message,
      recipients,
      attachments,
      includeSignature,
      footerLanguage,
    },
    onRestore: (draft) => {
      if (draft.subject) setSubject(draft.subject as string);
      if (draft.message) setMessage(draft.message as string);
      if (draft.recipients) setRecipients(draft.recipients as Recipient[]);
      if (draft.attachments) setAttachments(draft.attachments as Attachment[]);
      if (typeof draft.includeSignature === 'boolean') setIncludeSignature(draft.includeSignature);
      if (draft.footerLanguage) setFooterLanguage(draft.footerLanguage as FooterLanguage);
    },
    autoSaveDelay: 10000, // Sauvegarde toutes les 10 secondes
  });
  
  // Charger la signature email
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
          });
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      } finally {
        setLoadingSignature(false);
      }
    };
    
    loadSignature();
  }, [user?.id]);
  
  // Ajouter un destinataire
  const addRecipient = useCallback(() => {
    const email = newRecipient.trim().toLowerCase();
    if (!email) return;
    
    // Validation basique
    if (!email.includes('@') || !email.includes('.')) {
      showGlobalPopup(t('invalid_email') || 'Email invalide', 'error');
      return;
    }
    
    // Vérifier les doublons
    if (recipients.some(r => r.email === email)) {
      showGlobalPopup(t('recipient_exists') || 'Ce destinataire existe déjà', 'warning');
      return;
    }
    
    setRecipients(prev => [...prev, { id: crypto.randomUUID(), email }]);
    setNewRecipient('');
  }, [newRecipient, recipients, showGlobalPopup, t]);
  
  // Supprimer un destinataire
  const removeRecipient = useCallback((id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  }, []);
  
  // Gérer l'upload de pièce jointe
  const handleAttachmentUpload = useCallback(async (file: File) => {
    if (!token) return;
    
    setUploadingAttachment(true);
    try {
      const result = await uploadToStrapi(file, token);
      
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(),
        name: file.name,
        url: result.url,
        size: file.size,
      }]);
      
      showGlobalPopup(t('attachment_added') || 'Pièce jointe ajoutée', 'success');
    } catch (error) {
      console.error('Error uploading attachment:', error);
      showGlobalPopup(t('attachment_error') || 'Erreur lors de l\'upload', 'error');
    } finally {
      setUploadingAttachment(false);
    }
  }, [token, showGlobalPopup, t]);
  
  // Supprimer une pièce jointe
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);
  
  // Sélection depuis le media picker
  const handleMediaSelect = useCallback((url: string) => {
    // Extraire le nom du fichier depuis l'URL
    const fileName = url.split('/').pop() || 'attachment';
    
    setAttachments(prev => [...prev, {
      id: crypto.randomUUID(),
      name: fileName,
      url,
      size: 0,
    }]);
    
    setShowMediaPicker(false);
    showGlobalPopup(t('attachment_added') || 'Pièce jointe ajoutée', 'success');
  }, [showGlobalPopup, t]);
  
  // Envoyer l'email (immédiat ou planifié)
  const handleSend = async () => {
    if (!user?.id) return;
    
    // Validations
    if (recipients.length === 0) {
      showGlobalPopup(t('no_recipients') || 'Ajoutez au moins un destinataire', 'error');
      return;
    }
    
    if (!subject.trim()) {
      showGlobalPopup(t('no_subject') || 'L\'objet est requis', 'error');
      return;
    }
    
    if (!message.trim()) {
      showGlobalPopup(t('no_message') || 'Le message est requis', 'error');
      return;
    }
    
    setSending(true);
    
    try {
      // Construire le contenu HTML de l'email
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px;">
            ${message.split('\n').map(line => `<p style="margin: 0 0 10px; line-height: 1.6;">${line || '&nbsp;'}</p>`).join('')}
          </div>
      `;
      
      // Ajouter la signature si activée
      if (includeSignature && signatureData) {
        htmlContent += `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            ${renderSignatureHtml(signatureData)}
          </div>
        `;
      }
      
      htmlContent += '</div>';

      const isScheduled = scheduledAt !== null;
      
      if (isScheduled) {
        // Email planifié - on enregistre seulement dans la base de données
        await createSentEmail(user.id, {
          subject,
          recipients: recipients.map(r => r.email),
          content: message,
          category: 'classic',
          attachments: attachments.length > 0 ? attachments.map(a => ({ name: a.name, url: a.url })) : undefined,
          sent_at: new Date().toISOString(),
          status_mail: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
        });
        
        showGlobalPopup(
          t('email_scheduled') || `Email planifié pour le ${scheduledAt.toLocaleDateString('fr-FR')} à ${scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 
          'success'
        );
      } else {
        // Envoi immédiat
        const response = await fetch('/api/emails/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: recipients.map(r => r.email),
            subject,
            html: htmlContent,
            attachments: attachments.map(a => ({ filename: a.name, path: a.url })),
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send email');
        }
        
        // Enregistrer dans l'historique avec le tracking_id
        await createSentEmail(user.id, {
          subject,
          recipients: recipients.map(r => r.email),
          content: message,
          category: 'classic',
          attachments: attachments.length > 0 ? attachments.map(a => ({ name: a.name, url: a.url })) : undefined,
          sent_at: new Date().toISOString(),
          status_mail: 'sent',
          tracking_id: result.trackingId,
        });
        
        showGlobalPopup(t('email_sent') || 'Email envoyé avec succès', 'success');
      }
      
      // Supprimer le brouillon après envoi réussi
      clearDraft();
      
      router.push('/dashboard/emails');
    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup(t('email_send_error') || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-default px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-muted hover:text-primary hover:bg-accent/10 rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
              <IconMail className="w-6 h-6 text-accent" />
              {t('compose_email') || 'Nouvel email'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded-lg transition-colors"
            >
              {showPreview ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
              {showPreview ? (t('edit') || 'Éditer') : (t('preview') || 'Aperçu')}
            </button>
            
            <button
              onClick={handleSend}
              disabled={sending || recipients.length === 0 || !subject.trim() || !message.trim()}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                scheduledAt 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              {sending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : scheduledAt ? (
                <IconClock className="w-4 h-4" />
              ) : (
                <IconSend className="w-4 h-4" />
              )}
              {scheduledAt 
                ? (t('schedule') || 'Planifier') 
                : (t('send') || 'Envoyer')
              }
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {showPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="text-sm text-gray-500 mb-1">{t('to') || 'À'}: {recipients.map(r => r.email).join(', ')}</div>
                <div className="font-semibold text-gray-800">{subject || '(Sans objet)'}</div>
              </div>
              
              <div className="p-6">
                <div style={{ fontFamily: 'Arial, sans-serif' }}>
                  {message.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
                
                {includeSignature && signatureData && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <EmailFooter 
                      data={signatureData} 
                      mode="preview" 
                      compact 
                      language={footerLanguage}
                      onLanguageChange={setFooterLanguage}
                      showLanguageToggle
                    />
                  </div>
                )}
                
                {attachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {t('attachments') || 'Pièces jointes'} ({attachments.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                          <IconPaperclip className="w-4 h-4 text-gray-500" />
                          <span>{att.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Recipients */}
              <div className="bg-card border border-default rounded-xl p-6">
                <label className="block text-sm font-medium text-secondary mb-3 flex items-center gap-2">
                  <IconUser className="w-4 h-4" />
                  {t('recipients') || 'Destinataires'}
                </label>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {recipients.map(recipient => (
                    <motion.div
                      key={recipient.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm"
                    >
                      <span>{recipient.email}</span>
                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="p-0.5 hover:bg-accent/20 rounded-full transition-colors"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                    placeholder={t('add_recipient_placeholder') || 'email@example.com'}
                    className="input flex-1"
                  />
                  <button
                    onClick={addRecipient}
                    disabled={!newRecipient.trim()}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {t('add') || 'Ajouter'}
                  </button>
                </div>
              </div>
              
              {/* Subject */}
              <div className="bg-card border border-default rounded-xl p-6">
                <label className="block text-sm font-medium text-secondary mb-3">
                  {t('subject') || 'Objet'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('subject_placeholder') || 'Objet de votre email'}
                  className="input w-full text-lg"
                />
              </div>
              
              {/* Message */}
              <div className="bg-card border border-default rounded-xl p-6">
                <label className="block text-sm font-medium text-secondary mb-3">
                  {t('message') || 'Message'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('message_placeholder') || 'Rédigez votre message...'}
                  rows={12}
                  className="input w-full resize-none"
                />
              </div>
              
              {/* Attachments */}
              <div className="bg-card border border-default rounded-xl p-6">
                <label className="block text-sm font-medium text-secondary mb-3 flex items-center gap-2">
                  <IconPaperclip className="w-4 h-4" />
                  {t('attachments') || 'Pièces jointes'}
                </label>
                
                {attachments.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {attachments.map(att => (
                      <div 
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <IconPaperclip className="w-5 h-5 text-muted" />
                          <div>
                            <div className="text-sm font-medium text-primary">{att.name}</div>
                            <div className="text-xs text-muted">{formatFileSize(att.size)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAttachment(att.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAttachmentUpload(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-default rounded-lg text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors">
                      {uploadingAttachment ? (
                        <IconLoader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <IconPaperclip className="w-5 h-5" />
                          <span>{t('upload_file') || 'Ajouter un fichier'}</span>
                        </>
                      )}
                    </div>
                  </label>
                  
                  <button
                    onClick={() => setShowMediaPicker(true)}
                    className="px-4 py-3 border border-default rounded-lg text-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    {t('from_library') || 'Depuis la bibliothèque'}
                  </button>
                </div>
              </div>
              
              {/* Signature toggle */}
              <div className="bg-card border border-default rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconSignature className="w-5 h-5 text-accent" />
                    <div>
                      <div className="font-medium text-primary">
                        {t('include_signature') || 'Inclure la signature'}
                      </div>
                      <div className="text-sm text-muted">
                        {t('include_signature_desc') || 'Ajoute votre signature email à la fin du message'}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIncludeSignature(!includeSignature)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      includeSignature ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div 
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        includeSignature ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                
                {!signatureData && !loadingSignature && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                    <IconAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      {t('no_signature_configured') || 'Aucune signature configurée. '}
                      <a 
                        href="/dashboard/settings?tab=email" 
                        className="underline hover:no-underline"
                      >
                        {t('configure_signature') || 'Configurer ma signature'}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Planification d'envoi */}
              <div className="bg-card border border-default rounded-xl p-6">
                <EmailScheduler
                  onSchedule={setScheduledAt}
                  initialDate={scheduledAt}
                  disabled={sending}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        title={t('select_attachment') || 'Sélectionner un fichier'}
      />
    </div>
  );
}

// Helper function to render signature as HTML for email
function renderSignatureHtml(data: CreateEmailSignatureData): string {
  const hasSocialLinks = data.linkedin_url || data.twitter_url || data.instagram_url || data.facebook_url;
  
  let html = '<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">';
  html += '<tr>';
  
  // Logo
  if (data.logo_url) {
    html += `<td style="padding-right: 16px; vertical-align: middle;">
      <img src="${data.logo_url}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; display: block;" />
    </td>`;
  }
  
  html += '<td style="vertical-align: middle;">';
  
  // Name & Title
  if (data.sender_name) {
    html += `<div style="font-weight: bold; font-size: 16px; color: #111;">${data.sender_name}</div>`;
  }
  if (data.sender_title) {
    html += `<div style="color: #666; margin-bottom: 8px;">${data.sender_title}</div>`;
  }
  
  // Company
  if (data.company_name) {
    html += `<div style="font-weight: 600; color: #10b981; margin-bottom: 4px;">${data.company_name}</div>`;
  }
  
  // Contact
  html += '<div style="font-size: 13px; color: #666;">';
  if (data.phone) html += `<div>📞 ${data.phone}</div>`;
  if (data.website) html += `<div>🌐 <a href="${data.website}" style="color: #10b981; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>`;
  if (data.address) html += `<div>📍 ${data.address}</div>`;
  html += '</div>';
  
  // Social links
  if (hasSocialLinks) {
    html += '<div style="margin-top: 12px;">';
    if (data.linkedin_url) html += `<a href="${data.linkedin_url}" style="color: #0A66C2; margin-right: 8px; text-decoration: none;">LinkedIn</a>`;
    if (data.twitter_url) html += `<a href="${data.twitter_url}" style="color: #1DA1F2; margin-right: 8px; text-decoration: none;">Twitter</a>`;
    if (data.instagram_url) html += `<a href="${data.instagram_url}" style="color: #E4405F; margin-right: 8px; text-decoration: none;">Instagram</a>`;
    if (data.facebook_url) html += `<a href="${data.facebook_url}" style="color: #1877F2; text-decoration: none;">Facebook</a>`;
    html += '</div>';
  }
  
  html += '</td></tr></table>';
  
  return html;
}

