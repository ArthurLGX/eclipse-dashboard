'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconFileInvoice,
  IconSend,
  IconArrowLeft,
  IconLoader2,
  IconUser,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconSignature,
  IconSearch,
  IconPaperclip,
  IconFileText,
  IconCurrencyEuro,
  IconCalendar,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import EmailFooter, { type FooterLanguage } from '@/app/components/EmailFooter';
import SmtpStatusIndicator, { SmtpWarningBanner } from '@/app/components/SmtpStatusIndicator';
import { fetchEmailSignature, createSentEmail } from '@/lib/api';
import type { CreateEmailSignatureData, Facture } from '@/types';

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
  
  // UI state
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
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
              setSubject(`Facture ${invoice.reference} - ${formatAmount(calculateTotal(invoice), invoice.currency)}`);
              // Pre-fill message
              setMessage(getDefaultMessage(invoice));
              // Pre-fill recipient from client
              if (invoice.client?.email) {
                setRecipients([{ id: crypto.randomUUID(), email: invoice.client.email, name: invoice.client.name }]);
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
  
  // Helper functions
  const calculateTotal = (invoice: Facture): number => {
    if (!invoice.lines) return 0;
    const lines = typeof invoice.lines === 'string' ? JSON.parse(invoice.lines) : invoice.lines;
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
  
  // Select invoice
  const handleSelectInvoice = (invoice: Facture) => {
    setSelectedInvoice(invoice);
    setShowInvoiceSelector(false);
    setSubject(`Facture ${invoice.reference} - ${formatAmount(calculateTotal(invoice), invoice.currency)}`);
    setMessage(getDefaultMessage(invoice));
    
    // Pre-fill recipient from client
    if (invoice.client?.email && !recipients.some(r => r.email === invoice.client?.email)) {
      setRecipients(prev => [...prev, { 
        id: crypto.randomUUID(), 
        email: invoice.client!.email!, 
        name: invoice.client!.name 
      }]);
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
      
      // Générer l'URL du PDF de la facture
      const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/invoices/${selectedInvoice.documentId}/pdf`;
      
      // Appel API pour envoyer l'email
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
          attachments: [{ filename: `Facture-${selectedInvoice.reference}.pdf`, path: pdfUrl }],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      // Enregistrer dans l'historique
      await createSentEmail(user.id, {
        subject,
        recipients: recipients.map(r => r.email),
        content: message,
        category: 'invoice',
        attachments: [{ name: `Facture-${selectedInvoice.reference}.pdf`, url: pdfUrl }],
        sent_at: new Date().toISOString(),
        status_mail: 'sent',
      });
      
      showGlobalPopup(t('email_sent') || 'Email envoyé avec succès', 'success');
      router.push('/dashboard/emails');
    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup(t('email_send_error') || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-default px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-muted hover:text-primary hover:bg-accent/10 rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
              <IconFileInvoice className="w-6 h-6 text-amber-500" />
              {t('send_invoice') || 'Envoyer une facture'}
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
                                className="w-full p-3 flex items-center gap-4 hover:bg-accent/10 rounded-lg transition-colors text-left"
                              >
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                  <IconFileInvoice className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-primary truncate">{invoice.reference}</div>
                                  <div className="text-sm text-muted truncate">
                                    {invoice.client?.name || 'Client'} • {formatDate(invoice.date)}
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
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm"
                    >
                      <span>{recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}</span>
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
    </div>
  );
}

// Helper function to render signature as HTML for email
function renderSignatureHtml(data: CreateEmailSignatureData): string {
  const hasSocialLinks = data.linkedin_url || data.twitter_url || data.instagram_url || data.facebook_url;
  
  let html = '<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">';
  html += '<tr>';
  
  if (data.logo_url) {
    html += `<td style="padding-right: 16px; vertical-align: top;">
      <img src="${data.logo_url}" alt="Logo" style="width: 80px; height: auto; border-radius: 8px;" />
    </td>`;
  }
  
  html += '<td style="vertical-align: top;">';
  
  if (data.sender_name) {
    html += `<div style="font-weight: bold; font-size: 16px; color: #111;">${data.sender_name}</div>`;
  }
  if (data.sender_title) {
    html += `<div style="color: #666; margin-bottom: 8px;">${data.sender_title}</div>`;
  }
  
  if (data.company_name) {
    html += `<div style="font-weight: 600; color: #10b981; margin-bottom: 4px;">${data.company_name}</div>`;
  }
  
  html += '<div style="font-size: 13px; color: #666;">';
  if (data.phone) html += `<div>📞 ${data.phone}</div>`;
  if (data.website) html += `<div>🌐 <a href="${data.website}" style="color: #10b981; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>`;
  if (data.address) html += `<div>📍 ${data.address}</div>`;
  html += '</div>';
  
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

