'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconMail,
  IconFileInvoice,
  IconFileDescription,
  IconNews,
  IconPencil,
  IconArrowLeft,
  IconLoader2,
  IconSearch,
  IconFilter,
  IconCalendar,
  IconUser,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPaperclip,
  IconChevronRight,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import MailboxPreview from '@/app/components/MailboxPreview';
import { fetchSentEmails, fetchEmailSignature } from '@/lib/api';
import type { SentEmail, EmailCategory, CreateEmailSignatureData } from '@/types';

export default function EmailHistoryPage() {
  return (
    <ProtectedRoute>
      <EmailHistory />
    </ProtectedRoute>
  );
}

function EmailHistory() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [signatureData, setSignatureData] = useState<CreateEmailSignatureData | null>(null);
  
  // Load initial category from URL
  useEffect(() => {
    const category = searchParams.get('category');
    if (category && ['newsletter', 'invoice', 'quote', 'classic'].includes(category)) {
      setSelectedCategory(category as EmailCategory);
    }
  }, [searchParams]);
  
  // Load signature on mount
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
  
  // Load emails
  const loadEmails = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await fetchSentEmails(user.id, category, 100);
      setEmails(data);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedCategory]);
  
  useEffect(() => {
    loadEmails();
  }, [loadEmails]);
  
  // Categories config
  const categories: { id: EmailCategory | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: t('all') || 'Tous', icon: <IconMail className="w-4 h-4" />, color: '#64748b' },
    { id: 'classic', label: t('classic') || 'Classiques', icon: <IconPencil className="w-4 h-4" />, color: '#10b981' },
    { id: 'invoice', label: t('invoices') || 'Factures', icon: <IconFileInvoice className="w-4 h-4" />, color: '#f59e0b' },
    { id: 'quote', label: t('quotes') || 'Devis', icon: <IconFileDescription className="w-4 h-4" />, color: '#8b5cf6' },
    { id: 'newsletter', label: t('newsletters') || 'Newsletters', icon: <IconNews className="w-4 h-4" />, color: '#3b82f6' },
  ];
  
  // Filtered emails
  const filteredEmails = emails.filter(email => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        email.subject.toLowerCase().includes(query) ||
        email.recipients.some(r => r.toLowerCase().includes(query)) ||
        email.content.toLowerCase().includes(query)
      );
    }
    return true;
  });
  
  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('yesterday') || 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };
  
  // Get category info
  const getCategoryInfo = (category: EmailCategory) => {
    return categories.find(c => c.id === category) || categories[0];
  };
  
  // Status icon
  const getStatusIcon = (status_mail: string) => {
    switch (status_mail) {
      case 'sent':
        return <IconCheck className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <IconAlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <IconLoader2 className="w-4 h-4 text-muted animate-spin" />;
    }
  };
  
  // Extraire le texte brut du HTML pour l'aperçu
  const stripHtml = (html: string): string => {
    if (!html) return '';
    // Supprimer d'abord les balises style et script avec leur contenu
    const cleanHtml = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Créer un élément temporaire pour parser le HTML
    if (typeof document !== 'undefined') {
      const tmp = document.createElement('div');
      tmp.innerHTML = cleanHtml;
      return (tmp.textContent || tmp.innerText || '').trim();
    }
    // Fallback pour SSR - simple regex
    return cleanHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-default p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/emails')}
              className="p-2 text-muted hover:text-primary hover:bg-accent-light rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl font-semibold text-primary flex items-center gap-2">
              <IconMail className="w-6 h-6 text-accent" />
              {t('email_history') || 'Historique des emails'}
            </h1>
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-2 bg-background rounded-lg  px-3 py-2 w-72">
            <IconSearch className="w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_emails') || 'Rechercher un email...'}
              className="flex-1 bg-transparent border-none outline-none text-sm text-primary placeholder:text-muted"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-muted hover:text-primary">
                <IconX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-6">
          {/* Sidebar - Categories */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card border border-default rounded-xl p-4 sticky top-24">
              <h3 className="text-sm font-medium text-secondary mb-3 flex items-center gap-2">
                <IconFilter className="w-4 h-4" />
                {t('categories') || 'Catégories'}
              </h3>
              
              <div className="space-y-1">
                {categories.map((cat) => {
                  const count = cat.id === 'all' 
                    ? emails.length 
                    : emails.filter(e => e.category === cat.id).length;
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-accent-light text-accent'
                          : 'text-secondary hover:bg-hover hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: cat.color }}>{cat.icon}</span>
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === cat.id
                          ? 'bg-accent-light text-accent'
                          : 'bg-background text-muted'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Main content - Email list */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-20">
                <IconMail className="w-16 h-16 mx-auto text-muted opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">
                  {t('no_emails_found') || 'Aucun email trouvé'}
                </h3>
                <p className="text-muted">
                  {searchQuery 
                    ? (t('try_different_search') || 'Essayez une recherche différente')
                    : (t('no_emails_in_category') || 'Aucun email dans cette catégorie')
                  }
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl overflow-hidden">
                {filteredEmails.map((email, index) => {
                  const catInfo = getCategoryInfo(email.category);
                  
                  return (
                    <motion.div
                      key={`${email.documentId}-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 hover:bg-hover cursor-pointer transition-colors group ${
                        index > 0 ? 'border-t border-default' : ''
                      }`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Category Icon */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${catInfo.color}15` }}
                        >
                          <span style={{ color: catInfo.color }}>{catInfo.icon}</span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h4 className="font-medium text-primary truncate">
                              {email.subject}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted flex-shrink-0">
                              {getStatusIcon(email.status_mail)}
                              <span>{formatDate(email.sent_at)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted mb-2">
                            <IconUser className="w-3.5 h-3.5" />
                            <span className="truncate">
                              {email.recipients.slice(0, 3).join(', ')}
                              {email.recipients.length > 3 && ` +${email.recipients.length - 3}`}
                            </span>
                          </div>
                          
                          <p className="text-sm text-secondary line-clamp-1">
                            {stripHtml(email.content)}
                          </p>
                          
                          {/* Attachments indicator */}
                          {email.attachments && email.attachments.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted">
                              <IconPaperclip className="w-3.5 h-3.5" />
                              <span>{email.attachments.length} {t('attachments') || 'pièce(s) jointe(s)'}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Arrow */}
                        <IconChevronRight className="w-5 h-5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Email Detail Modal with MailboxPreview */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedEmail(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-default flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${getCategoryInfo(selectedEmail.category).color}15` }}
                  >
                    <span style={{ color: getCategoryInfo(selectedEmail.category).color }}>
                      {getCategoryInfo(selectedEmail.category).icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">{selectedEmail.subject}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <IconCalendar className="w-3.5 h-3.5" />
                      {new Date(selectedEmail.sent_at).toLocaleString('fr-FR')}
                      {getStatusIcon(selectedEmail.status_mail)}
                      <span className="ml-2">
                        {t('to') || 'À'}: {selectedEmail.recipients.slice(0, 2).join(', ')}
                        {selectedEmail.recipients.length > 2 && ` +${selectedEmail.recipients.length - 2}`}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-2 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              
              {/* Error message if failed */}
              {selectedEmail.status_mail === 'failed' && selectedEmail.error_message && (
                <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <IconAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-700 dark:text-red-300 mb-1">
                        {t('send_error') || 'Erreur d\'envoi'}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {selectedEmail.error_message}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Attachments if any */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="px-4 py-3 border-b border-default bg-background/50">
                  <div className="flex items-center gap-2 text-sm">
                    <IconPaperclip className="w-4 h-4 text-muted" />
                    <span className="text-muted">{t('attachments') || 'Pièces jointes'}:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-accent-light text-accent rounded-full text-xs hover:bg-accent/20 transition-colors"
                        >
                          {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* MailboxPreview */}
              <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                <MailboxPreview
                  newsletter={{
                    title: selectedEmail.subject || 'Email',
                    subject: selectedEmail.subject,
                    content: selectedEmail.content,
                    template: 'standard',
                    send_at: selectedEmail.sent_at,
                    author: {
                      username: user?.username || '',
                      email: user?.email || '',
                    },
                  }}
                  signatureData={signatureData}
                  fontFamily={signatureData?.font_family}
                  senderInfo={{
                    firstName: user?.username?.split(' ')[0] || 'Utilisateur',
                    lastName: user?.username?.split(' ').slice(1).join(' ') || '',
                    email: user?.email || 'email@example.com',
                  }}
                  translations={{
                    inbox: t('inbox') || 'Boîte de réception',
                    favorites: t('favorites') || 'Favoris',
                    sent_folder: t('sent_folder') || 'Envoyés',
                    archives: t('archives') || 'Archives',
                    trash: t('trash') || 'Corbeille',
                    search_placeholder: t('search_placeholder') || 'Rechercher...',
                    now: t('now') || 'Maintenant',
                    to_me: t('to_me') || 'à moi',
                    no_content: t('no_content') || 'Aucun contenu',
                    special_offer: t('special_offer') || 'Offre Spéciale',
                    unsubscribe: t('unsubscribe') || 'Se désabonner',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

