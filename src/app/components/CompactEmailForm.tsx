'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  IconSend,
  IconLoader2,
  IconX,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import RichTextEditor from './RichTextEditor';
import ContactAutocomplete from './ContactAutocomplete';
import { fetchEmailSignature, createSentEmail, fetchClientsUser } from '@/lib/api';
import type { CreateEmailSignatureData, Client } from '@/types';
import type { EmailComposerType } from './EmailComposer';

interface CompactEmailFormProps {
  type: EmailComposerType;
  replyToEmail?: {
    id: number;
    from_email: string;
    from_name?: string;
    subject?: string;
    content_html?: string;
    content_text?: string;
    received_at: string;
  };
  onSuccess?: () => void;
}

interface Recipient {
  id: string;
  email: string;
  name?: string;
}

export default function CompactEmailForm({
  type,
  replyToEmail,
  onSuccess,
}: CompactEmailFormProps) {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [showOriginalEmail, setShowOriginalEmail] = useState(false);
  
  // Contacts pour l'autocomplete
  const [contacts, setContacts] = useState<Client[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Charger la signature
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
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    };
    loadSignature();
  }, [user?.id]);

  // Charger les contacts pour l'autocomplete
  useEffect(() => {
    const loadContacts = async () => {
      if (!user?.id) return;
      try {
        const response = await fetchClientsUser(user.id);
        const data = (response as { data?: Client[] })?.data || [];
        const contactsWithEmail = data.filter((c: Client) => c.email);
        setContacts(contactsWithEmail);
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setLoadingContacts(false);
      }
    };
    loadContacts();
  }, [user?.id]);

  // Initialiser le mode réponse
  useEffect(() => {
    if (replyToEmail) {
      setRecipients([{
        id: replyToEmail.from_email,
        email: replyToEmail.from_email,
        name: replyToEmail.from_name,
      }]);
      
      const replySubject = replyToEmail.subject?.startsWith('Re:')
        ? replyToEmail.subject
        : `Re: ${replyToEmail.subject || ''}`;
      setSubject(replySubject);
    }
  }, [replyToEmail]);

  // Générer la signature HTML
  const renderSignatureHtml = useCallback((data: CreateEmailSignatureData) => {
    let html = '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-family: Arial, sans-serif;">';
    html += `<div style="font-size: 14px; color: #333;">`;
    if (data.sender_name) {
      html += `<div style="font-weight: bold; margin-bottom: 4px;">${data.sender_name}</div>`;
    }
    if (data.sender_title) {
      html += `<div style="color: #666; font-size: 12px; margin-bottom: 8px;">${data.sender_title}</div>`;
    }
    if (data.phone) {
      html += `<div style="font-size: 12px; color: #666;">📞 ${data.phone}</div>`;
    }
    if (data.website) {
      html += `<div style="font-size: 12px;"><a href="${data.website}" style="color: #3b82f6; text-decoration: none;">🌐 ${data.website}</a></div>`;
    }
    html += '</div></div>';
    return html;
  }, []);

  const handleSend = useCallback(async () => {
    if (!user?.id || !token || recipients.length === 0 || !subject.trim()) {
      showGlobalPopup(t('fill_required_fields') || 'Veuillez remplir tous les champs requis', 'error');
      return;
    }

    setSending(true);
    try {
      // Construire le contenu HTML
      let htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
      htmlContent += message;

      // Ajouter l'email original si mode réponse
      if (replyToEmail) {
        const formattedDate = new Date(replyToEmail.received_at).toLocaleString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        htmlContent += `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <div style="color: #666; font-size: 13px; margin-bottom: 10px;">
              Le ${formattedDate}, ${replyToEmail.from_name || replyToEmail.from_email} a écrit :
            </div>
            <blockquote style="border-left: 3px solid #cbd5e0; padding-left: 15px; margin: 10px 0; color: #666;">
              ${replyToEmail.content_html || replyToEmail.content_text?.replace(/\n/g, '<br>') || ''}
            </blockquote>
          </div>
        `;
      }

      // Ajouter la signature
      if (signatureData) {
        htmlContent += renderSignatureHtml(signatureData);
      }

      htmlContent += '</div>';

      // Envoyer l'email
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
          attachments: [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Enregistrer dans l'historique
      await createSentEmail(user.id, {
        subject,
        recipients: recipients.map(r => r.email),
        content: message,
        category: 'classic',
        sent_at: new Date().toISOString(),
        status_mail: 'sent',
        tracking_id: result.trackingId,
      });

      showGlobalPopup(t('email_sent') || 'Email envoyé !', 'success');
      
      // Appeler le callback
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500);
      }

    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup(t('email_send_error') || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  }, [user, token, recipients, subject, message, replyToEmail, signatureData, showGlobalPopup, t, renderSignatureHtml, onSuccess]);

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const addRecipient = (email: string) => {
    if (!email.trim() || recipients.some(r => r.email === email)) return;
    setRecipients(prev => [...prev, { id: email, email, name: email.split('@')[0] }]);
  };

  // Ajouter un contact depuis l'autocomplete
  const addRecipientFromContact = useCallback((contact: Client) => {
    if (!contact.email || recipients.some(r => r.email === contact.email)) return;
    setRecipients(prev => [...prev, {
      id: contact.documentId,
      email: contact.email!,
      name: contact.name || contact.enterprise,
      enterprise: contact.enterprise,
    }]);
  }, [recipients]);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Recipients */}
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-2">
            <span>{t('to') || 'À'}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {recipients.map(recipient => (
              <span
                key={recipient.id}
                className="flex items-center gap-1 px-2 py-1 bg-accent-light !text-accent rounded text-xs"
              >
                {recipient.name || recipient.email}
                <button
                  onClick={() => removeRecipient(recipient.id)}
                  className="hover:bg-accent/10 rounded"
                >
                  <IconX className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {!replyToEmail && (
            <ContactAutocomplete
              contacts={contacts}
              selectedEmails={recipients.map(r => r.email.toLowerCase())}
              onSelect={addRecipientFromContact}
              onManualAdd={addRecipient}
              placeholder={t('add_recipient') || 'Ajouter un destinataire...'}
              loading={loadingContacts}
            />
          )}
        </div>

        {/* Subject */}
        <div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('subject') || 'Objet'}
            className="input w-full text-sm"
          />
        </div>

        {/* Message */}
        <div className="flex-1">
          <RichTextEditor
            value={message}
            onChange={setMessage}
            placeholder={t('message_placeholder') || 'Rédigez votre message...'}
            minHeight="200px"
            maxHeight="300px"
            showMediaOptions={false}
          />
        </div>

        {/* Original email (reply mode) */}
        {replyToEmail && (
          <div className="border-t border-default pt-4">
            <button
              onClick={() => setShowOriginalEmail(!showOriginalEmail)}
              className="flex items-center gap-2 text-xs text-muted hover:text-primary mb-2"
            >
              {showOriginalEmail ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
              <span className="text-xs text-muted">
                {showOriginalEmail
                  ? (t('hide_original') || 'Masquer le message original')
                  : (t('show_original') || 'Afficher le message original')}
              </span>
            </button>

            {showOriginalEmail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-muted border-l-2 border-muted pl-3 py-2"
              >
                <div className="mb-2">
                  <strong className="text-primary">{replyToEmail.from_name || replyToEmail.from_email}</strong>
                  <div className="text-xs text-muted">
                    {new Date(replyToEmail.received_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {replyToEmail.content_html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: replyToEmail.content_html }}
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-xs">{replyToEmail.content_text}</pre>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Footer avec bouton d'envoi */}
      <div className="flex items-center justify-between p-4 border-t border-default bg-page">
        <div className="flex items-center gap-2">
          {/* Future: attachments button */}
        </div>
        
        <button
          onClick={handleSend}
          disabled={sending || recipients.length === 0 || !subject.trim() || !message.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('sending') || 'Envoi...'}</span>
            </>
          ) : (
            <>
              <IconSend className="w-4 h-4" />
              <span className="text-sm">{t('send') || 'Envoyer'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
