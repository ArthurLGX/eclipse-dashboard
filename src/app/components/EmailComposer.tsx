'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  IconMail,
  IconFileDescription,
  IconFileInvoice,
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
  IconPencil,
  IconHeading,
  IconBuilding,
  IconCornerUpLeft,
  IconSearch,
  IconFileText,
  IconDeviceFloppy,
  IconPlus,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import MediaPickerModal from '@/app/components/MediaPickerModal';
import EmailScheduler from '@/app/components/EmailScheduler';
import EmailPreviewModal from '@/app/components/EmailPreviewModal';
import RichTextEditor, { cleanRichTextForEmail } from '@/app/components/RichTextEditor';
import ContactAutocomplete from '@/app/components/ContactAutocomplete';
import EmailFooter, { type FooterLanguage } from '@/app/components/EmailFooter';
import SmtpStatusIndicator, { SmtpWarningBanner } from '@/app/components/SmtpStatusIndicator';
import EmailSentSuccessModal from '@/app/components/EmailSentSuccessModal';
import { 
  fetchEmailSignature, 
  createSentEmail, 
  fetchClientsUser,
  createEmailDraft,
  updateEmailDraft,
  fetchEmailDraft,
  fetchCompanyUser,
  updateQuoteStatusWithSync,
  updateFactureById,
} from '@/lib/api';
import { uploadToStrapi } from '@/lib/strapi-upload';
import { useDraftSave } from '@/hooks/useDraftSave';
import { generatePdfBase64 } from '@/lib/generatePdfBase64';
import type { CreateEmailSignatureData, Client, Facture, Company } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export type EmailComposerType = 'compose' | 'quote' | 'invoice';

interface Recipient {
  id: string;
  email: string;
  name?: string;
  enterprise?: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
}

interface ReplyToData {
  name: string;
  email: string;
  subject: string;
  snippet: string;
  date: string;
  enterprise?: string;
}

export interface EmailComposerProps {
  /** Type d'email à composer */
  type: EmailComposerType;
  
  /** Features à activer selon le type */
  features?: {
    richText?: boolean;          // RichTextEditor (compose) ou textarea (quote/invoice)
    title?: boolean;              // Champ titre optionnel (compose/newsletter)
    scheduling?: boolean;         // Planification d'envoi (compose)
    attachments?: boolean;        // Gestion des pièces jointes (compose)
    documentSelector?: boolean;   // Sélecteur de document (quote/invoice)
    pdfAttachment?: boolean;      // PDF auto-généré (quote/invoice)
    aiGeneration?: boolean;       // Génération IA (quote/invoice)
    replyTo?: boolean;            // Mode réponse (compose)
    contactAutocomplete?: boolean;// Autocomplete contacts (compose/invoice)
    draftManagement?: boolean;    // Gestion des brouillons (quote/invoice)
  };
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function EmailComposer({ type, features }: EmailComposerProps) {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Features par défaut selon le type
  const defaultFeatures = useMemo(() => {
    switch (type) {
      case 'compose':
        return {
          richText: true,
          title: true,
          scheduling: true,
          attachments: true,
          documentSelector: false,
          pdfAttachment: false,
          aiGeneration: false,
          replyTo: true,
          contactAutocomplete: true,
          draftManagement: false,
        };
      case 'quote':
        return {
          richText: false,
          title: false,
          scheduling: false,
          attachments: false,
          documentSelector: true,
          pdfAttachment: true,
          aiGeneration: true,
          replyTo: false,
          contactAutocomplete: false,
          draftManagement: true,
        };
      case 'invoice':
        return {
          richText: false,
          title: false,
          scheduling: false,
          attachments: false,
          documentSelector: true,
          pdfAttachment: true,
          aiGeneration: true,
          replyTo: false,
          contactAutocomplete: true,
          draftManagement: true,
        };
    }
  }, [type]);

  const activeFeatures = { ...defaultFeatures, ...features };

  // ============================================================================
  // STATE
  // ============================================================================

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [footerLanguage, setFooterLanguage] = useState<FooterLanguage>('fr');

  // Reply-to state (compose only)
  const [replyToData, setReplyToData] = useState<ReplyToData | null>(null);

  // Document state (quote/invoice)
  const [documents, setDocuments] = useState<Facture[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Facture | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentSearch, setDocumentSearch] = useState('');
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  // Contacts state
  const [contacts, setContacts] = useState<Client[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // UI state
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [restoringFromDraft, setRestoringFromDraft] = useState(false);

  // Signature data
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);

  // ============================================================================
  // CONFIGURATION PAR TYPE
  // ============================================================================

  const config = useMemo(() => {
    switch (type) {
      case 'compose':
        return {
          icon: IconMail,
          title: t('compose_email') || 'Nouvel email',
          color: 'accent',
          buttonColor: 'bg-accent',
          hoverColor: 'hover:bg-[var(--color-accent)]',
        };
      case 'quote':
        return {
          icon: IconFileDescription,
          title: t('send_quote') || 'Envoyer un devis',
          color: 'violet-500',
          buttonColor: 'bg-violet-500',
          hoverColor: 'hover:bg-violet-600',
        };
      case 'invoice':
        return {
          icon: IconFileInvoice,
          title: t('send_invoice') || 'Envoyer une facture',
          color: 'amber-500',
          buttonColor: 'bg-amber-500',
          hoverColor: 'hover:bg-amber-600',
        };
    }
  }, [type, t]);

  // ============================================================================
  // LOAD DATA
  // ============================================================================

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
      } finally {
        setLoadingSignature(false);
      }
    };

    loadSignature();
  }, [user?.id]);

  // Charger les contacts
  useEffect(() => {
    if (!activeFeatures.contactAutocomplete || !user?.id) return;

    const loadContacts = async () => {
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
  }, [user?.id, activeFeatures.contactAutocomplete]);

  // Charger les documents (quote/invoice)
  useEffect(() => {
    if (!activeFeatures.documentSelector || !user?.id || !token) return;

    const loadDocuments = async () => {
      try {
        const docType = type === 'quote' ? 'quote' : '';
        const url = docType
          ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/factures?filters[user][id][$eq]=${user.id}&filters[document_type][$eq]=${docType}&populate=*&sort=date:desc`
          : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/factures?filters[user][id][$eq]=${user.id}&populate=*&sort=date:desc`;

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setDocuments(data.data || []);

          // Check if document ID is in URL
          const docId = searchParams.get(type === 'quote' ? 'quoteId' : 'invoiceId');
          if (docId) {
            const doc = data.data?.find((f: Facture) => f.documentId === docId);
            if (doc) {
              handleSelectDocument(doc);
            }
          }
        }
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [user?.id, token, type, activeFeatures.documentSelector, searchParams]);

  // Charger la company (pour PDF)
  useEffect(() => {
    if (!activeFeatures.pdfAttachment || !user?.id) return;

    const loadCompany = async () => {
      try {
        const companyResponse = await fetchCompanyUser(user.id) as { data?: Company[] };
        if (companyResponse?.data && companyResponse.data.length > 0) {
          setCompany(companyResponse.data[0]);
        }
      } catch {
        // Silencieux
      }
    };

    loadCompany();
  }, [user?.id, activeFeatures.pdfAttachment]);

  // Parse reply-to data from URL (compose only)
  useEffect(() => {
    if (!activeFeatures.replyTo || searchParams.get('replyTo') !== 'true') return;

    const replyData: ReplyToData = {
      name: searchParams.get('replyToName') || '',
      email: searchParams.get('replyToEmail') || searchParams.get('to') || '',
      subject: searchParams.get('replyToSubject') || '',
      snippet: searchParams.get('replyToSnippet') || '',
      date: searchParams.get('replyToDate') || '',
      enterprise: searchParams.get('replyToEnterprise') || undefined,
    };

    setReplyToData(replyData);

    if (replyData.email) {
      setRecipients([{
        id: crypto.randomUUID(),
        email: replyData.email,
        name: replyData.name || undefined,
        enterprise: replyData.enterprise,
      }]);
    }

    const subjectParam = searchParams.get('subject');
    if (subjectParam) setSubject(subjectParam);
  }, [searchParams, activeFeatures.replyTo]);

  // Charger un brouillon (quote/invoice)
  useEffect(() => {
    if (!activeFeatures.draftManagement) return;

    const draftId = searchParams.get('draft');
    if (!draftId || draftLoaded || loadingDocuments) return;

    const loadDraft = async () => {
      try {
        const draft = await fetchEmailDraft(draftId);
        if (draft) {
          setRestoringFromDraft(true);
          setCurrentDraftId(draft.documentId);
          if (draft.subject) setSubject(draft.subject);
          if (draft.content) setMessage(draft.content);
          if (draft.recipients) setRecipients(draft.recipients as Recipient[]);
          if (draft.include_signature !== undefined) setIncludeSignature(draft.include_signature);
          if (draft.footer_language) setFooterLanguage(draft.footer_language);

          if (draft.related_document_id && documents.length > 0) {
            const doc = documents.find(f => f.documentId === draft.related_document_id);
            if (doc) setSelectedDocument(doc);
          }

          setDraftLoaded(true);
          setTimeout(() => setRestoringFromDraft(false), 100);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        setDraftLoaded(true);
      }
    };

    loadDraft();
  }, [searchParams, documents, draftLoaded, loadingDocuments, activeFeatures.draftManagement]);

  // Draft management auto-save (compose only)
  const { clearDraft } = useDraftSave({
    draftKey: `email-${type}-draft`,
    data: activeFeatures.richText ? {
      title,
      subject,
      message,
      recipients,
      attachments,
      includeSignature,
    } : {},
    onRestore: (draft) => {
      if (!activeFeatures.richText) return;
      if (draft.title) setTitle(draft.title as string);
      if (draft.subject) setSubject(draft.subject as string);
      if (draft.message) setMessage(draft.message as string);
      if (draft.recipients) setRecipients(draft.recipients as Recipient[]);
      if (draft.attachments) setAttachments(draft.attachments as Attachment[]);
      if (typeof draft.includeSignature === 'boolean') setIncludeSignature(draft.includeSignature);
    },
    autoSaveDelay: 10000,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Sélection de document
  const handleSelectDocument = useCallback((doc: Facture) => {
    setSelectedDocument(doc);
    setShowDocumentSelector(false);

    if (restoringFromDraft) return;

    // Pré-remplir le formulaire
    const total = calculateTotal(doc);
    const formattedAmount = formatAmount(total, doc.currency);
    const formattedDate = formatDate(doc.date);

    if (type === 'quote') {
      setSubject(`Devis ${doc.reference} - ${formattedAmount}`);
      setMessage(`Bonjour,

Suite à notre échange, veuillez trouver ci-joint le devis ${doc.reference} daté du ${formattedDate} pour un montant de ${formattedAmount}.

${doc.valid_until ? `Ce devis est valable jusqu'au ${formatDate(doc.valid_until)}.` : ''}

N'hésitez pas à nous contacter pour toute question.

Cordialement`);
    } else {
      setSubject(`Facture ${doc.reference} - ${formattedAmount}`);
      setMessage(`Bonjour,

Veuillez trouver ci-joint la facture ${doc.reference} datée du ${formattedDate} pour un montant de ${formattedAmount}.

Date d'échéance : ${formatDate(doc.due_date)}

Nous restons à votre disposition pour toute question.

Cordialement`);
    }

    if (doc.client_id?.email && !recipients.some(r => r.email === doc.client_id?.email)) {
      setRecipients(prev => [...prev, {
        id: crypto.randomUUID(),
        email: doc.client_id!.email!,
        name: doc.client_id!.name,
      }]);
    }
  }, [type, recipients, restoringFromDraft]);

  // Gestion des destinataires
  const addRecipientFromContact = useCallback((contact: Client) => {
    const email = contact.email?.toLowerCase();
    if (!email) return;

    if (recipients.some(r => r.email === email)) {
      showGlobalPopup(t('recipient_exists') || 'Ce destinataire existe déjà', 'warning');
      return;
    }

    setRecipients(prev => [...prev, {
      id: crypto.randomUUID(),
      email,
      name: contact.name,
      enterprise: contact.enterprise,
    }]);
  }, [recipients, showGlobalPopup, t]);

  const addRecipientManual = useCallback((email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showGlobalPopup(t('invalid_email') || 'Email invalide', 'error');
      return;
    }

    if (recipients.some(r => r.email === cleanEmail)) {
      showGlobalPopup(t('recipient_exists') || 'Ce destinataire existe déjà', 'warning');
      return;
    }

    setRecipients(prev => [...prev, { id: crypto.randomUUID(), email: cleanEmail }]);
  }, [recipients, showGlobalPopup, t]);

  const removeRecipient = useCallback((id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  }, []);

  // Gestion des pièces jointes (compose only)
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

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleMediaSelect = useCallback((url: string) => {
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

  // Génération AI (quote/invoice)
  const handleGenerateAIContent = useCallback(async () => {
    if (!selectedDocument) {
      showGlobalPopup(t('select_document_first') || 'Sélectionnez d\'abord un document', 'warning');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/email-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: type === 'quote' ? 'quote_send' : 'invoice_send',
          quote: {
            reference: selectedDocument.reference,
            total: calculateTotal(selectedDocument),
            validUntil: selectedDocument.valid_until,
            lines: selectedDocument.invoice_lines?.map(line => ({
              description: line.description,
              quantity: line.quantity,
              unit_price: line.unit_price,
            })) || [],
          },
          client: selectedDocument.client_id ? {
            name: selectedDocument.client_id.name,
            enterprise: selectedDocument.client_id.enterprise,
            email: selectedDocument.client_id.email,
          } : undefined,
          tone: 'friendly',
          language: 'fr',
          senderName: user?.username,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la génération');

      const data = await response.json();

      if (data.subject) setSubject(data.subject);

      let fullMessage = '';
      if (data.greeting) fullMessage += data.greeting + '\n\n';
      if (data.body) fullMessage += data.body;
      if (data.cta) fullMessage += '\n\n' + data.cta;
      if (data.closing) fullMessage += '\n\n' + data.closing;

      setMessage(fullMessage);
      showGlobalPopup(t('ai_content_generated') || 'Contenu généré avec succès !', 'success');
    } catch (error) {
      console.error('AI generation error:', error);
      showGlobalPopup(t('ai_generation_error') || 'Erreur lors de la génération', 'error');
    } finally {
      setGeneratingAI(false);
    }
  }, [selectedDocument, type, user?.username, showGlobalPopup, t]);

  // Sauvegarder en brouillon (quote/invoice)
  const handleSaveDraft = useCallback(async () => {
    if (!user?.id || !activeFeatures.draftManagement) return;

    setSavingDraft(true);

    try {
      const draftData = {
        name: subject || `Brouillon ${type} - ${new Date().toLocaleDateString('fr-FR')}`,
        subject,
        recipients: recipients.map(r => ({ id: r.id, email: r.email, name: r.name })),
        content: message,
        category: type as 'quote' | 'invoice',
        related_document_id: selectedDocument?.documentId,
        related_document_type: type as 'quote' | 'invoice',
        include_signature: includeSignature,
        footer_language: footerLanguage,
      };

      if (currentDraftId) {
        await updateEmailDraft(currentDraftId, draftData);
        showGlobalPopup(t('draft_updated') || 'Brouillon mis à jour', 'success');
      } else {
        const draft = await createEmailDraft(user.id, draftData);
        setCurrentDraftId(draft.documentId);
        showGlobalPopup(t('draft_saved') || 'Brouillon enregistré', 'success');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      showGlobalPopup(t('draft_save_error') || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSavingDraft(false);
    }
  }, [user?.id, subject, recipients, message, type, selectedDocument, includeSignature, footerLanguage, currentDraftId, activeFeatures.draftManagement, showGlobalPopup, t]);

  // Envoyer l'email
  const handleSend = useCallback(async () => {
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

    if (!message.trim() && !activeFeatures.richText) {
      showGlobalPopup(t('no_message') || 'Le message est requis', 'error');
      return;
    }

    if (activeFeatures.documentSelector && !selectedDocument) {
      showGlobalPopup(t('no_document_selected') || 'Sélectionnez un document', 'error');
      return;
    }

    setSending(true);

    try {
      let htmlContent = '';
      const fontFamily = signatureData?.font_family
        ? `'${signatureData.font_family}', Arial, sans-serif`
        : 'Arial, sans-serif';

      // Construire le contenu HTML
      htmlContent = `<div style="font-family: ${fontFamily}; max-width: 600px; margin: 0 auto;">`;

      // Titre (compose)
      if (activeFeatures.title && title.trim()) {
        const primaryColor = signatureData?.primary_color || '#10b981';
        htmlContent += `
          <div style="text-align: center; padding: 24px 20px; background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff;">${title}</h1>
          </div>
        `;
      }

      // Message
      htmlContent += `<div style="padding: 20px; line-height: 1.6;">`;

      if (activeFeatures.richText) {
        const cleanedMessage = cleanRichTextForEmail(message);
        htmlContent += `
          <style>
            h1 { font-size: 24px; font-weight: bold; margin: 0 0 16px; }
            h2 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
            p { margin: 0 0 12px; }
            ul, ol { margin: 0 0 12px; padding-left: 24px; }
            li { margin: 0 0 4px; }
            a { color: #3b82f6; text-decoration: underline; }
            img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
          </style>
          ${cleanedMessage}
        `;
      } else {
        htmlContent += message.split('\n').map(line => `<p style="margin: 0 0 10px;">${line || '&nbsp;'}</p>`).join('');
      }

      htmlContent += `</div>`;

      // Document card (quote/invoice)
      if (activeFeatures.documentSelector && selectedDocument) {
        const docColor = type === 'quote' ? '#7c3aed' : '#f59e0b';
        const docBgColor = type === 'quote' ? '#f5f3ff' : '#f8f9fa';
        const docLabel = type === 'quote' ? 'Devis' : 'Facture';

        htmlContent += `
          <div style="margin: 20px; padding: 20px; background: ${docBgColor}; border-radius: 8px; border-left: 4px solid ${docColor};">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px;">${docLabel}</div>
            <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 4px;">${selectedDocument.reference}</div>
            <div style="font-size: 24px; font-weight: bold; color: ${docColor};">${formatAmount(calculateTotal(selectedDocument), selectedDocument.currency)}</div>
            <div style="margin-top: 12px; font-size: 13px; color: #666;">
              <div>📅 Date : ${formatDate(selectedDocument.date)}</div>
              ${type === 'quote' && selectedDocument.valid_until ? `<div>⏰ Valide jusqu'au : ${formatDate(selectedDocument.valid_until)}</div>` : ''}
              ${type === 'invoice' ? `<div>⏰ Échéance : ${formatDate(selectedDocument.due_date)}</div>` : ''}
            </div>
          </div>
        `;
      }

      // Signature
      if (includeSignature && signatureData) {
        htmlContent += `
          <div style="margin-top: 30px; padding: 20px; border-top: 1px solid #eee;">
            ${renderSignatureHtml(signatureData)}
          </div>
        `;
      }

      htmlContent += '</div>';

      // Pièces jointes
      const emailAttachments = [];

      // PDF auto-généré (quote/invoice)
      if (activeFeatures.pdfAttachment && selectedDocument) {
        const pdfBase64 = await generatePdfBase64(selectedDocument, company);
        const filename = `${type === 'quote' ? 'Devis' : 'Facture'}-${selectedDocument.reference}.pdf`;
        emailAttachments.push({
          filename,
          content: pdfBase64,
          contentType: 'application/pdf',
        });
      }

      // Pièces jointes manuelles (compose)
      if (activeFeatures.attachments) {
        emailAttachments.push(...attachments.map(a => ({ filename: a.name, path: a.url })));
      }

      // Envoi immédiat ou planifié
      const isScheduled = activeFeatures.scheduling && scheduledAt !== null;

      if (isScheduled) {
        await createSentEmail(user.id, {
          subject,
          recipients: recipients.map(r => r.email),
          content: htmlContent,
          category: type === 'compose' ? 'classic' : type,
          attachments: emailAttachments.length > 0 ? emailAttachments.map(a => ({ name: a.filename, url: '' })) : undefined,
          sent_at: new Date().toISOString(),
          status_mail: 'scheduled',
          scheduled_at: scheduledAt!.toISOString(),
        });

        showGlobalPopup(
          t('email_scheduled') || `Email planifié pour le ${scheduledAt!.toLocaleDateString('fr-FR')}`,
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
            attachments: emailAttachments,
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
          content: activeFeatures.richText ? cleanRichTextForEmail(message) : message,
          category: type === 'compose' ? 'classic' : type,
          attachments: emailAttachments.length > 0 ? emailAttachments.map(a => ({ 
            name: a.filename || ('path' in a ? a.path : ''), 
            url: '' 
          })) : undefined,
          sent_at: new Date().toISOString(),
          status_mail: 'sent',
          tracking_id: result.trackingId,
        });

        // Mettre à jour le statut du document (quote/invoice)
        if (selectedDocument) {
          try {
            if (type === 'quote') {
              await updateQuoteStatusWithSync(
                selectedDocument.documentId,
                'sent',
                selectedDocument.client_id?.documentId
              );
            } else {
              await updateFactureById(selectedDocument.documentId, {
                facture_status: 'sent',
              });
            }
          } catch (syncError) {
            console.error('Error updating document status:', syncError);
          }
        }

        setShowSuccessModal(true);
      }

      // Supprimer le brouillon après envoi
      if (activeFeatures.richText) clearDraft();

    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup(t('email_send_error') || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  }, [user, token, recipients, subject, message, title, activeFeatures, selectedDocument, includeSignature, signatureData, type, company, attachments, scheduledAt, showGlobalPopup, t, clearDraft]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const senderInfo = useMemo(() => ({
    firstName: signatureData?.sender_name?.split(' ')[0] || user?.username?.split(' ')[0] || 'Utilisateur',
    lastName: signatureData?.sender_name?.split(' ').slice(1).join(' ') || user?.username?.split(' ').slice(1).join(' ') || '',
    email: user?.email || 'email@example.com',
    profilePicture: user?.profile_picture?.url || null,
  }), [signatureData?.sender_name, user?.username, user?.email, user?.profile_picture?.url]);

  const previewTranslations = useMemo(() => ({
    mailbox_preview: t('mailbox_preview') || 'Aperçu Boîte Mail',
    inbox: t('inbox') || 'Boîte de réception',
    favorites: t('favorites') || 'Favoris',
    sent_folder: t('sent_folder') || 'Envoyés',
    archives: t('archives') || 'Archives',
    trash: t('trash') || 'Corbeille',
    search_placeholder: t('search_placeholder') || 'Rechercher...',
    now: t('now') || 'Maintenant',
    to_me: t('to_me') || 'à moi',
  }), [t]);

  const filteredDocuments = useMemo(() => {
    if (!activeFeatures.documentSelector) return [];
    return documents.filter(doc =>
      doc.reference.toLowerCase().includes(documentSearch.toLowerCase()) ||
      doc.client_id?.name?.toLowerCase().includes(documentSearch.toLowerCase()) ||
      doc.client?.name?.toLowerCase().includes(documentSearch.toLowerCase())
    );
  }, [documents, documentSearch, activeFeatures.documentSelector]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-default px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 p-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-muted hover:text-primary hover:bg-accent-light rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
              <IconComponent className={`w-6 h-6 text-${config.color}`} />
              {config.title}
            </h1>

            {(activeFeatures.documentSelector || type === 'invoice') && <SmtpStatusIndicator />}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-light !text-accent hover:bg-[var(--color-accent)] hover:text-white rounded-lg transition-colors"
            >
              {showPreview ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
              {showPreview ? (t('edit') || 'Éditer') : (t('preview') || 'Aperçu')}
            </button>

            {activeFeatures.draftManagement && (
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-default text-secondary hover:bg-hover rounded-lg transition-colors disabled:opacity-50"
              >
                {savingDraft ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="w-4 h-4" />
                )}
                {currentDraftId ? (t('update_draft') || 'Mettre à jour') : (t('save_draft') || 'Brouillon')}
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={sending || recipients.length === 0 || !subject.trim() || (activeFeatures.documentSelector && !selectedDocument)}
              className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor} ${config.hoverColor}`}
            >
              {sending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : scheduledAt && activeFeatures.scheduling ? (
                <IconClock className="w-4 h-4" />
              ) : (
                <IconSend className="w-4 h-4" />
              )}
              {scheduledAt && activeFeatures.scheduling
                ? (t('schedule') || 'Planifier')
                : (t('send') || 'Envoyer')
              }
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {activeFeatures.documentSelector && <SmtpWarningBanner className="mb-6" />}

        <div className="space-y-6">
          {/* Reply-to preview */}
          {activeFeatures.replyTo && replyToData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent-light border border-accent rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                  <IconCornerUpLeft className="w-5 h-5 text-accent" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-accent uppercase tracking-wide">
                      {t('replying_to') || 'Réponse à'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-primary">
                      {replyToData.name || replyToData.email}
                    </span>
                    {replyToData.enterprise && (
                      <span className="flex items-center gap-1 text-xs text-muted bg-page px-2 py-0.5 rounded">
                        <IconBuilding className="w-3 h-3" />
                        {replyToData.enterprise}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted mt-0.5">{replyToData.email}</p>

                  <div className="mt-3 p-3 bg-page rounded-lg">
                    <p className="text-sm font-medium text-primary mb-1">{replyToData.subject}</p>
                    {replyToData.snippet && (
                      <p className="text-sm text-muted line-clamp-3">{replyToData.snippet}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setReplyToData(null)}
                  className="p-1.5 text-muted hover:text-primary hover:bg-page rounded-lg transition-colors"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Document selector (quote/invoice) */}
          {activeFeatures.documentSelector && (
            <div className="bg-card border border-default rounded-xl p-6">
              <label className="block text-sm font-medium text-secondary mb-3 flex items-center gap-2">
                <IconFileText className={`w-4 h-4 text-${config.color}`} />
                {t(type === 'quote' ? 'select_quote' : 'select_invoice') || `Sélectionner un ${type === 'quote' ? 'devis' : 'facture'}`}
              </label>

              {selectedDocument ? (
                <div className={`flex items-center justify-between p-4 bg-${config.color.replace('500', '50')} border border-${config.color.replace('500', '200')} rounded-lg`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${config.buttonColor} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-primary">{selectedDocument.reference}</div>
                      <div className="text-sm text-muted">
                        {selectedDocument.client_id?.name || selectedDocument.client?.name || 'Client'} • {formatAmount(calculateTotal(selectedDocument), selectedDocument.currency)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDocumentSelector(true)}
                    className={`px-3 py-1.5 text-sm text-${config.color} hover:bg-${config.color.replace('500', '100')} rounded-lg transition-colors`}
                  >
                    {t('change') || 'Changer'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDocumentSelector(true)}
                  className={`w-full p-6 border-2 border-dashed border-default rounded-lg text-center text-muted hover:border-${config.color} hover:text-${config.color} transition-colors`}
                >
                  <IconComponent className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span>{t('click_to_select') || 'Cliquez pour sélectionner'}</span>
                </button>
              )}

              {/* Document selector modal */}
              <AnimatePresence>
                {showDocumentSelector && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setShowDocumentSelector(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-card border border-default rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-default">
                        <div className="flex items-center gap-3">
                          <IconSearch className="w-5 h-5 text-muted" />
                          <input
                            type="text"
                            value={documentSearch}
                            onChange={e => setDocumentSearch(e.target.value)}
                            placeholder={t('search') || 'Rechercher...'}
                            className="flex-1 bg-transparent border-none outline-none text-primary"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-[50vh] overflow-y-auto p-2">
                        {loadingDocuments ? (
                          <div className="flex items-center justify-center py-12">
                            <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
                          </div>
                        ) : filteredDocuments.length === 0 ? (
                          <div className="text-center py-12 text-muted">
                            <IconComponent className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>{t('no_documents') || 'Aucun document trouvé'}</p>
                          </div>
                        ) : (
                          filteredDocuments.map(doc => (
                            <button
                              key={doc.documentId}
                              onClick={() => handleSelectDocument(doc)}
                              className="w-full p-3 flex items-center gap-4 hover:bg-accent-light rounded-lg transition-colors text-left"
                            >
                              <div className={`w-10 h-10 bg-${config.color.replace('500', '100')} rounded-lg flex items-center justify-center`}>
                                <IconComponent className={`w-5 h-5 text-${config.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-primary truncate">{doc.reference}</div>
                                <div className="text-sm text-muted truncate">
                                  {doc.client_id?.name || doc.client?.name || 'Client'} • {formatDate(doc.date)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-semibold text-${config.color}`}>
                                  {formatAmount(calculateTotal(doc), doc.currency)}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Recipients */}
          <div className="bg-card border border-default rounded-xl p-6">
            <label className="block text-sm font-medium text-secondary mb-3 flex items-center gap-2">
              <IconUser className="w-4 h-4" />
              {t('recipients') || 'Destinataires'}
            </label>

            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <AnimatePresence>
                  {recipients.map(recipient => (
                    <motion.div
                      key={recipient.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-2 bg-accent-light rounded-lg text-sm group"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {recipient.name
                          ? recipient.name.charAt(0).toUpperCase()
                          : recipient.email.charAt(0).toUpperCase()
                        }
                      </div>

                      <div className="flex flex-col min-w-0">
                        {recipient.name && (
                          <span className="font-medium text-primary text-sm leading-tight truncate">
                            {recipient.name}
                          </span>
                        )}
                        <span className={`text-muted truncate ${recipient.name ? 'text-xs' : 'text-sm !text-accent'}`}>
                          {recipient.email}
                        </span>
                      </div>

                      {recipient.enterprise && (
                        <span className="flex items-center gap-1 text-xs text-muted bg-page px-1.5 py-0.5 rounded">
                          <IconBuilding className="w-3 h-3" />
                          <span className="truncate max-w-[80px]">{recipient.enterprise}</span>
                        </span>
                      )}

                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="p-1 text-muted hover:text-danger hover:bg-danger-light rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {activeFeatures.contactAutocomplete ? (
              <ContactAutocomplete
                contacts={contacts}
                selectedEmails={recipients.map(r => r.email)}
                onSelect={addRecipientFromContact}
                onManualAdd={addRecipientManual}
                placeholder={t('search_contact_or_email') || 'Rechercher un contact ou entrer un email...'}
                loading={loadingContacts}
              />
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={t('add_recipient_placeholder') || 'email@example.com'}
                  className="input flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addRecipientManual(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addRecipientManual(input.value);
                    input.value = '';
                  }}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
                >
                  <IconPlus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Title & Subject */}
          <div className="bg-card border border-default rounded-xl p-6 space-y-4">
            {activeFeatures.title && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  <IconHeading className="w-4 h-4 inline mr-1.5 !text-accent" />
                  {t('email_title') || 'Titre de l\'email'}
                  <span className="text-muted font-normal ml-2">({t('optional') || 'optionnel'})</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('email_title_placeholder') || 'Ex: Bienvenue dans notre newsletter'}
                  className="input w-full text-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                <IconMail className="w-4 h-4 inline mr-1.5 !text-accent" />
                {t('subject') || 'Objet'} *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('subject_placeholder') || 'Objet de votre email'}
                className="input w-full"
              />
            </div>
          </div>

          {/* Message */}
          <div className="bg-card border border-default rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-secondary">
                {t('message') || 'Message'} *
              </label>

              {activeFeatures.aiGeneration && (
                <button
                  type="button"
                  onClick={handleGenerateAIContent}
                  disabled={generatingAI || !selectedDocument}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-accent-light !text-accent rounded-lg hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingAI ? (
                    <>
                      <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('generating') || 'Génération...'}
                    </>
                  ) : (
                    <>
                      <Image
                        src="/images/logo/eclipse-logo.png"
                        alt="Eclipse Assistant"
                        width={14}
                        height={14}
                        className="w-3.5 h-3.5"
                      />
                      Eclipse Assistant
                    </>
                  )}
                </button>
              )}
            </div>

            {activeFeatures.richText ? (
              <RichTextEditor
                value={message}
                onChange={setMessage}
                placeholder={t('message_placeholder') || 'Rédigez votre message...'}
                minHeight="250px"
                maxHeight="500px"
                showMediaOptions={true}
              />
            ) : (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('message_placeholder') || 'Rédigez votre message...'}
                rows={10}
                className="input w-full resize-none"
              />
            )}
          </div>

          {/* Attachments (compose only) */}
          {activeFeatures.attachments && (
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
                      className="flex items-center justify-between p-3 bg-page rounded-lg"
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
                        className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
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
          )}

          {/* Signature toggle */}
          <div className="bg-card border border-default rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconSignature className="w-5 h-5 !text-accent" />
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
                  includeSignature ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    includeSignature ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {signatureData && (
              <Link
                href="/dashboard/settings?tab=email"
                className="mt-3 inline-flex items-center gap-1.5 text-sm !text-accent hover:text-accent/80 transition-colors"
              >
                <IconPencil className="w-3.5 h-3.5" />
                {t('edit_signature') || 'Modifier la signature'}
              </Link>
            )}

            {!signatureData && !loadingSignature && (
              <div className="mt-4 p-3 bg-warning-light border border-warning rounded-lg flex items-start gap-2">
                <IconAlertCircle className="w-5 h-5 text-warning-text flex-shrink-0 mt-0.5" />
                <div className="text-sm text-warning-text flex items-center gap-2 flex-wrap">
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

          {/* Scheduling (compose only) */}
          {activeFeatures.scheduling && (
            <div className="bg-card border border-default rounded-xl p-6">
              <EmailScheduler
                onSchedule={setScheduledAt}
                initialDate={scheduledAt}
                disabled={sending}
              />
            </div>
          )}
        </div>
      </div>

      {/* Media Picker Modal */}
      {activeFeatures.attachments && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
          title={t('select_attachment') || 'Sélectionner un fichier'}
        />
      )}

      {/* Email Preview Modal */}
      <EmailPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        emailData={{
          title: activeFeatures.title ? title || undefined : undefined,
          subject,
          content: activeFeatures.richText ? '' : message,
          htmlContent: activeFeatures.richText ? message : undefined,
        }}
        senderInfo={senderInfo}
        signatureData={includeSignature ? signatureData : null}
        includeSignature={includeSignature}
        fontFamily={signatureData?.font_family || 'Inter'}
        primaryColor={signatureData?.primary_color || '#10b981'}
        headerBackground={activeFeatures.title && title ? {
          color: signatureData?.primary_color || '#10b981',
        } : undefined}
        translations={previewTranslations}
      />

      {/* Success Modal */}
      <EmailSentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/dashboard/emails');
        }}
        type={type === 'compose' ? 'classic' : type}
        recipientCount={recipients.length}
        documentReference={selectedDocument?.reference}
      />
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateTotal(doc: Facture): number {
  if (!doc.invoice_lines) return 0;
  const lines = typeof doc.invoice_lines === 'string' ? JSON.parse(doc.invoice_lines) : doc.invoice_lines;
  return lines.reduce((sum: number, line: { total?: number; quantity?: number; unit_price?: number }) => {
    return sum + (line.total || (line.quantity || 0) * (line.unit_price || 0));
  }, 0);
}

function formatAmount(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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

function renderSignatureHtml(data: CreateEmailSignatureData): string {
  const logoSize = data.logo_size || 100;
  const primaryColor = data.primary_color || '#10b981';
  const textColor = data.text_color || '#333333';
  const secondaryColor = data.secondary_color || '#666666';
  const baseFontFamily = data.font_family || 'Inter';
  const fontFamily = `'${baseFontFamily}', Arial, sans-serif`;
  const socialLinks = data.social_links || [];

  const webSafe = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman', 'Tahoma', 'Trebuchet MS'];
  const needsGoogleFont = !webSafe.includes(baseFontFamily);

  let html = '';
  if (needsGoogleFont) {
    const fontName = baseFontFamily.replace(/ /g, '+');
    html += `<link href="https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap" rel="stylesheet">`;
  }

  html += `<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-family: ${fontFamily};">`;
  html += '<tr>';

  if (data.logo_url) {
    html += `<td style="padding-right: 12px; vertical-align: top;">
      <img src="${data.logo_url}" alt="Logo" style="width: ${logoSize}px; height: ${logoSize}px; object-fit: contain; border-radius: 8px; display: block;" />
    </td>`;
  }

  html += '<td style="vertical-align: top;">';

  if (data.sender_name) {
    html += `<div style="font-weight: bold; font-size: 16px; color: ${textColor};">${data.sender_name}</div>`;
  }
  if (data.sender_title) {
    html += `<div style="color: ${secondaryColor}; margin-bottom: 6px; font-size: 14px;">${data.sender_title}</div>`;
  }

  if (data.company_name) {
    html += `<div style="font-weight: 600; color: ${primaryColor}; margin-bottom: 4px;">${data.company_name}</div>`;
  }

  html += `<div style="font-size: 13px; color: ${secondaryColor};">`;
  if (data.phone) html += `<div>📞 ${data.phone}</div>`;
  if (data.website) html += `<div>🌐 <a href="${data.website}" style="color: ${primaryColor}; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>`;
  if (data.address) html += `<div>📍 ${data.address}</div>`;
  html += '</div>';

  if (socialLinks.length > 0) {
    html += '<div style="margin-top: 10px;">';
    socialLinks.forEach((link) => {
      if (link && typeof link === 'object' && 'url' in link) {
        const platform = SOCIAL_PLATFORM_LABELS[link.platform] || SOCIAL_PLATFORM_LABELS.custom;
        const label = ('label' in link && link.label) ? link.label : platform;
        const color = link.color || primaryColor;
        html += `<a href="${link.url}" style="color: ${color}; margin-right: 8px; text-decoration: none; font-weight: 500;">${label}</a>`;
      }
    });
    html += '</div>';
  }

  html += '</td></tr></table>';

  if (data.banner_url) {
    html += `
      <div style="margin-top: 16px;">
        ${data.banner_link ? `<a href="${data.banner_link}" target="_blank" rel="noopener noreferrer">` : ''}
        <img
          src="${data.banner_url}"
          alt="${data.banner_alt || 'Banner'}"
          style="max-width: 100%; height: auto; display: block; border-radius: 8px;"
        />
        ${data.banner_link ? '</a>' : ''}
      </div>
    `;
  }

  return html;
}
