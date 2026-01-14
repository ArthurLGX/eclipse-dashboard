'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconFileInvoice,
  IconSend,
  IconArrowLeft,
  IconLoader2,
  IconUser,
  IconX,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconSignature,
  IconSearch,
  IconPaperclip,
  IconFileText,
  IconCalendar,
  IconPencil,
  IconDeviceFloppy,
  IconBrain,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import EmailFooter, { type FooterLanguage } from '@/app/components/EmailFooter';
import SmtpStatusIndicator, { SmtpWarningBanner } from '@/app/components/SmtpStatusIndicator';
import { fetchEmailSignature, createSentEmail, createEmailDraft, updateEmailDraft, fetchEmailDraft, fetchCompanyUser, updateFactureById } from '@/lib/api';
import { generatePdfBase64 } from '@/lib/generatePdfBase64';
import EmailSentSuccessModal from '@/app/components/EmailSentSuccessModal';
import type { CreateEmailSignatureData, Facture, Company } from '@/types';

interface Recipient {
  id: string;
  email: string;
  name?: string;
}

export default function InvoiceEmailPage() {
  return (
    <ProtectedRoute>
      <InvoiceEmail />
    </ProtectedRoute>
  );
}

function InvoiceEmail() {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [includeSignature, setIncludeSignature] = useState(true);
  
  // Invoice state
  const [invoices, setInvoices] = useState<Facture[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Facture | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  
  // UI state
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Draft state (si on reprend un brouillon)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  
  // Signature data
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [footerLanguage, setFooterLanguage] = useState<FooterLanguage>('fr');
  
  // Charger les factures
  useEffect(() => {
    const loadInvoices = async () => {
      if (!user?.id || !token) return;
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/factures?filters[user][id][$eq]=${user.id}&populate=*&sort=date:desc`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.data || []);
          
          // Check if invoice ID is in URL
          const invoiceId = searchParams.get('invoiceId');
          if (invoiceId) {
            const invoice = data.data?.find((f: Facture) => f.documentId === invoiceId);
            if (invoice) {
              setSelectedInvoice(invoice);
              // Pre-fill subject
              const invoiceTotal = invoice.invoice_lines?.reduce((sum: number, line: { total?: number; quantity?: number; unit_price?: number }) => {
                return sum + (line.total || (line.quantity || 0) * (line.unit_price || 0));
              }, 0) || 0;
              const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoiceTotal);
              const formattedDate = invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '-';
              setSubject(`Facture ${invoice.reference} - ${formattedAmount}`);
              // Pre-fill message
              setMessage(`Bonjour,

Veuillez trouver ci-joint la facture ${invoice.reference} datée du ${formattedDate} pour un montant de ${formattedAmount}.

Nous restons à votre disposition pour toute question.

Cordialement`);
              // Pre-fill recipient from client
              if (invoice.client_id?.email) {
                setRecipients([{ id: crypto.randomUUID(), email: invoice.client_id.email, name: invoice.client_id.name }]);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setLoadingInvoices(false);
      }
    };
    
    loadInvoices();
  }, [user?.id, token, searchParams]);

  // Load company data for PDF generation
  useEffect(() => {
    const loadCompany = async () => {
      if (!user?.id) return;
      try {
        const companyResponse = await fetchCompanyUser(user.id) as { data?: Company[] };
        if (companyResponse?.data && companyResponse.data.length > 0) {
          setCompany(companyResponse.data[0]);
        }
      } catch {
        // Silencieux - les données de l'entreprise sont optionnelles
      }
    };
    loadCompany();
  }, [user?.id]);
  
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
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      } finally {
        setLoadingSignature(false);
      }
    };
    
    loadSignature();
  }, [user?.id]);
  
  // Charger un brouillon si présent dans l'URL (une seule fois, après que les factures soient chargées)
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [restoringFromDraft, setRestoringFromDraft] = useState(false);
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (!draftId || draftLoaded || loadingInvoices) return;
    
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
          
          // Si un document lié existe, le sélectionner (sans écraser le message/sujet)
          if (draft.related_document_id && invoices.length > 0) {
            const invoice = invoices.find(f => f.documentId === draft.related_document_id);
            if (invoice) setSelectedInvoice(invoice);
          }
          
          setDraftLoaded(true);
          // Reset flag après un court délai pour permettre les futures sélections
          setTimeout(() => setRestoringFromDraft(false), 100);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        setDraftLoaded(true); // Prevent infinite retry
      }
    };
    
    loadDraft();
  }, [searchParams, invoices, draftLoaded, loadingInvoices]);
  
  // Helper functions
  const calculateTotal = (invoice: Facture): number => {
    if (!invoice.invoice_lines) return 0;
    const lines = typeof invoice.invoice_lines === 'string' ? JSON.parse(invoice.invoice_lines) : invoice.invoice_lines;
    return lines.reduce((sum: number, line: { total?: number; quantity?: number; unit_price?: number }) => {
      return sum + (line.total || (line.quantity || 0) * (line.unit_price || 0));
    }, 0);
  };
  
  const formatAmount = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
  };
  
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const getDefaultMessage = (invoice: Facture): string => {
    return `Bonjour,

Veuillez trouver ci-joint la facture ${invoice.reference} datée du ${formatDate(invoice.date)} pour un montant de ${formatAmount(calculateTotal(invoice), invoice.currency)}.

Date d'échéance : ${formatDate(invoice.due_date)}

Nous vous remercions de votre confiance et restons à votre disposition pour toute question.

Cordialement`;
  };

  // Générer le contenu email avec l'IA
  const handleGenerateAIContent = async () => {
    if (!selectedInvoice) {
      showGlobalPopup(t('select_invoice_first') || 'Sélectionnez d\'abord une facture', 'warning');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/email-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: 'invoice_send',
          quote: {
            reference: selectedInvoice.reference,
            total: calculateTotal(selectedInvoice),
            lines: selectedInvoice.invoice_lines?.map(line => ({
              description: line.description,
              quantity: line.quantity,
              unit_price: line.unit_price,
            })) || [],
          },
          client: selectedInvoice.client_id ? {
            name: selectedInvoice.client_id.name,
            enterprise: selectedInvoice.client_id.enterprise,
            email: selectedInvoice.client_id.email,
          } : undefined,
          tone: 'friendly',
          language: 'fr',
          senderName: user?.username,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const data = await response.json();
      
      if (data.subject) setSubject(data.subject);
      
      // Construire le message complet
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
  };
  
  // Select invoice (ne pas écraser les champs si on restaure un brouillon)
  const handleSelectInvoice = (invoice: Facture, skipPrefill: boolean = false) => {
    setSelectedInvoice(invoice);
    setShowInvoiceSelector(false);
    
    // Ne pas pré-remplir si on restaure depuis un brouillon ou si explicitement demandé
    if (!skipPrefill && !restoringFromDraft) {
      setSubject(`Facture ${invoice.reference} - ${formatAmount(calculateTotal(invoice), invoice.currency)}`);
      setMessage(getDefaultMessage(invoice));
      
      // Pre-fill recipient from client
      if (invoice.client_id?.email && !recipients.some(r => r.email === invoice.client_id?.email)) {
        setRecipients(prev => [...prev, { 
          id: crypto.randomUUID(), 
          email: invoice.client_id!.email!, 
          name: invoice.client_id!.name 
        }]);
      }
    }
  };
  
  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => 
    inv.reference.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.client?.name?.toLowerCase().includes(invoiceSearch.toLowerCase())
  );
  
  // Ajouter un destinataire
  const addRecipient = useCallback(() => {
    const email = newRecipient.trim().toLowerCase();
    if (!email) return;
    
    if (!email.includes('@') || !email.includes('.')) {
      showGlobalPopup(t('invalid_email') || 'Email invalide', 'error');
      return;
    }
    
    if (recipients.some(r => r.email === email)) {
      showGlobalPopup(t('recipient_exists') || 'Ce destinataire existe déjà', 'warning');
      return;
    }
    
    setRecipients(prev => [...prev, { id: crypto.randomUUID(), email }]);
    setNewRecipient('');
  }, [newRecipient, recipients, showGlobalPopup, t]);
  
  const removeRecipient = useCallback((id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  }, []);
  
  // Envoyer l'email
  const handleSend = async () => {
    if (!user?.id || !selectedInvoice) return;
    
    if (recipients.length === 0) {
      showGlobalPopup(t('no_recipients') || 'Ajoutez au moins un destinataire', 'error');
      return;
    }
    
    if (!subject.trim()) {
      showGlobalPopup(t('no_subject') || 'L\'objet est requis', 'error');
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
          
          <!-- Invoice Summary Card -->
          <div style="margin: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Facture</div>
            <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 4px;">${selectedInvoice.reference}</div>
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${formatAmount(calculateTotal(selectedInvoice), selectedInvoice.currency)}</div>
            <div style="margin-top: 12px; font-size: 13px; color: #666;">
              <div>📅 Date : ${formatDate(selectedInvoice.date)}</div>
              <div>⏰ Échéance : ${formatDate(selectedInvoice.due_date)}</div>
            </div>
          </div>
      `;
      
      // Ajouter la signature si activée
      if (includeSignature && signatureData) {
        htmlContent += `
          <div style="margin-top: 30px; padding: 20px; border-top: 1px solid #eee;">
            ${renderSignatureHtml(signatureData)}
          </div>
        `;
      }
      
      htmlContent += '</div>';
      
      // Générer le PDF côté client
      const pdfBase64 = await generatePdfBase64(selectedInvoice, company);
      const filename = `${selectedInvoice.document_type === 'quote' ? 'Devis' : 'Facture'}-${selectedInvoice.reference}.pdf`;
      
      // Appel API pour envoyer l'email avec le PDF en pièce jointe (base64)
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
          attachments: [{ 
            filename,
            content: pdfBase64,
            contentType: 'application/pdf',
          }],
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
        category: 'invoice',
        attachments: [{ name: filename, url: '' }],
        sent_at: new Date().toISOString(),
        status_mail: 'sent',
        tracking_id: result.trackingId,
      });
      
      // Mettre à jour le statut de la facture en "envoyée"
      try {
        await updateFactureById(selectedInvoice.documentId, {
          facture_status: 'sent',
        });
      } catch (syncError) {
        console.error('Error updating invoice status:', syncError);
        // Ne pas bloquer le succès de l'envoi, juste logger l'erreur
      }
      
      // Afficher la modale de succès
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup(t('email_send_error') || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };
  
  // Sauvegarder en brouillon
  const handleSaveDraft = async () => {
    if (!user?.id) return;
    
    setSavingDraft(true);
    
    try {
      const draftData = {
        name: subject || `Brouillon facture - ${new Date().toLocaleDateString('fr-FR')}`,
        subject,
        recipients: recipients.map(r => ({ id: r.id, email: r.email, name: r.name })),
        content: message,
        category: 'invoice' as const,
        related_document_id: selectedInvoice?.documentId,
        related_document_type: 'invoice' as const,
        include_signature: includeSignature,
        footer_language: footerLanguage,
      };
      
      if (currentDraftId) {
        // Mettre à jour le brouillon existant
        await updateEmailDraft(currentDraftId, draftData);
        showGlobalPopup(t('draft_updated') || 'Brouillon mis à jour', 'success');
      } else {
        // Créer un nouveau brouillon
        const draft = await createEmailDraft(user.id, draftData);
        setCurrentDraftId(draft.documentId);
        showGlobalPopup(t('draft_saved') || 'Brouillon enregistré', 'success');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      showGlobalPopup(t('draft_save_error') || 'Erreur lors de l\'enregistrement du brouillon', 'error');
    } finally {
      setSavingDraft(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-default px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-row items-center justify-between gap-4 p-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-muted hover:text-primary hover:bg-accent-light rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
              <IconFileInvoice className="w-6 h-6 text-accent" />
              {t('send_invoice') || 'Envoyer une facture'}
            </h1>
            
            <SmtpStatusIndicator />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-light text-accent hover:bg-[var(--color-accent)] hover:text-white rounded-lg transition-colors"
            >
              {showPreview ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
              {showPreview ? (t('edit') || 'Éditer') : (t('preview') || 'Aperçu')}
            </button>
            
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
            
            <button
              onClick={handleSend}
              disabled={sending || recipients.length === 0 || !subject.trim() || !selectedInvoice}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconSend className="w-4 h-4" />
              )}
              {t('send') || 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* SMTP Warning Banner */}
        <SmtpWarningBanner className="mb-6" />
        
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
                
                {/* Invoice Card Preview */}
                {selectedInvoice && (
                  <div className="my-6 p-5 bg-gray-50 rounded-lg border-l-4 border-amber-500">
                    <div className="text-xs text-gray-500 uppercase mb-2">{t('invoice') || 'Facture'}</div>
                    <div className="text-lg font-bold text-gray-800 mb-1">{selectedInvoice.reference}</div>
                    <div className="text-2xl font-bold text-amber-500">{formatAmount(calculateTotal(selectedInvoice), selectedInvoice.currency)}</div>
                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <IconCalendar className="w-4 h-4" />
                        Date : {formatDate(selectedInvoice.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <IconCalendar className="w-4 h-4" />
                        Échéance : {formatDate(selectedInvoice.due_date)}
                      </div>
                    </div>
                  </div>
                )}
                
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
                
                {/* Attachment indicator */}
                {selectedInvoice && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {t('attachments') || 'Pièces jointes'} (1)
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                      <IconPaperclip className="w-4 h-4 text-gray-500" />
                      <span>Facture-{selectedInvoice.reference}.pdf</span>
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
              {/* Invoice Selector */}
              <div className="bg-card border border-default rounded-xl p-6">
                <label className="block text-sm font-medium text-secondary mb-3 flex items-center gap-2">
                  <IconFileText className="w-4 h-4 text-amber-500" />
                  {t('select_invoice') || 'Sélectionner une facture'}
                </label>
                
                {selectedInvoice ? (
                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                        <IconFileInvoice className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-primary">{selectedInvoice.reference}</div>
                        <div className="text-sm text-muted">
                          {selectedInvoice.client?.name || 'Client'} • {formatAmount(calculateTotal(selectedInvoice), selectedInvoice.currency)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowInvoiceSelector(true)}
                      className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                    >
                      {t('change') || 'Changer'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowInvoiceSelector(true)}
                    className="w-full p-6 border-2 border-dashed border-default rounded-lg text-center text-muted hover:border-amber-500 hover:text-amber-500 transition-colors"
                  >
                    <IconFileInvoice className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <span>{t('click_to_select_invoice') || 'Cliquez pour sélectionner une facture'}</span>
                  </button>
                )}
                
                {/* Invoice Selector Modal */}
                <AnimatePresence>
                  {showInvoiceSelector && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                      onClick={() => setShowInvoiceSelector(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="p-4 border-b border-default">
                          <div className="flex items-center gap-3">
                            <IconSearch className="w-5 h-5 text-muted" />
                            <input
                              type="text"
                              value={invoiceSearch}
                              onChange={e => setInvoiceSearch(e.target.value)}
                              placeholder={t('search_invoice') || 'Rechercher une facture...'}
                              className="flex-1 bg-transparent border-none outline-none text-primary"
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-[50vh] overflow-y-auto p-2">
                          {loadingInvoices ? (
                            <div className="flex items-center justify-center py-12">
                              <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
                            </div>
                          ) : filteredInvoices.length === 0 ? (
                            <div className="text-center py-12 text-muted">
                              <IconFileInvoice className="w-12 h-12 mx-auto mb-4 opacity-30" />
                              <p>{t('no_invoices') || 'Aucune facture trouvée'}</p>
                            </div>
                          ) : (
                            filteredInvoices.map(invoice => (
                              <button
                                key={invoice.documentId}
                                onClick={() => handleSelectInvoice(invoice)}
                                className="w-full p-3 flex items-center gap-4 hover:bg-accent-light rounded-lg transition-colors text-left"
                              >
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                  <IconFileInvoice className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-primary truncate">{invoice.reference}</div>
                                  <div className="text-sm text-muted truncate">
                                    {invoice.client_id?.name || 'Client'} • {formatDate(invoice.date)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-amber-500">
                                    {formatAmount(calculateTotal(invoice), invoice.currency)}
                                  </div>
                                  <div className={`text-xs ${
                                    invoice.facture_status === 'paid' ? 'text-green-500' :
                                    invoice.facture_status === 'overdue' ? 'text-red-500' :
                                    'text-muted'
                                  }`}>
                                    {invoice.facture_status === 'paid' ? 'Payée' :
                                     invoice.facture_status === 'overdue' ? 'En retard' :
                                     invoice.facture_status === 'sent' ? 'Envoyée' : 'Brouillon'}
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
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-light text-accent rounded-full text-sm"
                    >
                      <span>{recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}</span>
                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="p-0.5 hover:bg-[var(--color-accent)] hover:text-white rounded-full transition-colors"
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
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50"
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
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-secondary">
                    {t('message') || 'Message'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAIContent}
                    disabled={generatingAI || !selectedInvoice}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generatingAI ? (
                      <>
                        <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('generating') || 'Génération...'}
                      </>
                    ) : (
                      <>
                        <IconBrain className="w-3.5 h-3.5" />
                        {t('ai_suggest_email') || 'Suggérer avec IA'}
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('message_placeholder') || 'Rédigez votre message...'}
                  rows={10}
                  className="input w-full resize-none"
                />
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
                
                {/* Bouton modifier la signature */}
                {signatureData && (
                  <Link
                    href="/dashboard/settings?tab=email"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                    {t('edit_signature') || 'Modifier la signature'}
                  </Link>
                )}
                
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success Modal */}
      <EmailSentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/dashboard/emails');
        }}
        type="invoice"
        recipientCount={recipients.length}
        documentReference={selectedInvoice?.reference}
      />
    </div>
  );
}

// Helper function to render signature as HTML for email
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
  // Utiliser les valeurs personnalisées ou les valeurs par défaut
  const logoSize = data.logo_size || 100;
  const primaryColor = data.primary_color || '#10b981';
  const textColor = data.text_color || '#333333';
  const secondaryColor = data.secondary_color || '#666666';
  const baseFontFamily = data.font_family || 'Inter';
  const fontFamily = `'${baseFontFamily}', Arial, sans-serif`;
  
  // Utiliser uniquement le nouveau système de liens sociaux
  const socialLinks = data.social_links || [];
  
  // Web-safe fonts n'ont pas besoin de Google Fonts import
  const webSafe = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman', 'Tahoma', 'Trebuchet MS'];
  const needsGoogleFont = !webSafe.includes(baseFontFamily);
  
  // Ajouter l'import Google Font si nécessaire
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
  
  // Social links - nouveau système dynamique
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
  
  // Bannière promotionnelle
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

