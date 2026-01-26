'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconInbox,
  IconMail,
  IconMailOpened,
  IconStar,
  IconStarFilled,
  IconArchive,
  IconTrash,
  IconRefresh,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconSend,
  IconPaperclip,
  IconUser,
  IconBuilding,
  IconArrowLeft,
  IconArchiveOff,
} from '@tabler/icons-react';
import EmailSidebar, { type EmailView } from '@/app/components/EmailSidebar';
import GmailStyleComposer from '@/app/components/GmailStyleComposer';
import type { EmailComposerType } from '@/app/components/EmailComposer';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  fetchInbox,
  syncInbox,
  markEmailAsRead,
  markEmailAsUnread,
  toggleEmailStar,
  archiveEmail,
  unarchiveEmail,
  deleteReceivedEmail,
  fetchReceivedEmail,
  type ReceivedEmail,
  type InboxFilters,
} from '@/lib/api';

export default function InboxPage() {
  return (
    <ProtectedRoute>
      <InboxView />
    </ProtectedRoute>
  );
}

function InboxView() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  // Current view (sidebar navigation)
  const [activeView, setActiveView] = useState<EmailView>('inbox');

  // State
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const pageSize = 25;

  // Gmail-style composer
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<EmailComposerType>('compose');
  const [replyToEmail, setReplyToEmail] = useState<ReceivedEmail | null>(null);

  // Gérer le scroll focus - bloquer le scroll du body pour cette page
  useEffect(() => {
    // Bloquer le scroll du body
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restaurer le scroll du body lors du démontage
      document.body.style.overflow = '';
    };
  }, []);

  // Gérer le changement de vue depuis la sidebar
  const handleViewChange = useCallback((view: EmailView) => {
    setActiveView(view);
    setSelectedEmail(null);
    setPage(1);
    
    // Réinitialiser les filtres selon la vue
    switch (view) {
      case 'inbox':
        setShowArchived(false);
        setShowStarredOnly(false);
        setShowUnreadOnly(false);
        break;
      case 'starred':
        setShowStarredOnly(true);
        setShowArchived(false);
        setShowUnreadOnly(false);
        break;
      case 'sent':
        // TODO: Charger les emails envoyés
        break;
      case 'drafts':
        // TODO: Charger les brouillons
        break;
      default:
        setShowArchived(false);
        setShowStarredOnly(false);
        setShowUnreadOnly(false);
    }
  }, []);

  // Load emails
  const loadEmails = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Adapter les filtres selon la vue active
      const filters: InboxFilters = {
        page,
        pageSize,
        isArchived: showArchived || activeView === 'waiting',
      };
      
      // Filtres spécifiques par vue
      switch (activeView) {
        case 'inbox':
          // Boîte de réception normale
          break;
        case 'starred':
          filters.isStarred = true;
          break;
        case 'sent':
          // TODO: Implémenter fetchSentEmails
          setEmails([]);
          setTotalPages(1);
          setUnreadCount(0);
          setLoading(false);
          return;
        case 'drafts':
          // TODO: Implémenter fetchDrafts
          setEmails([]);
          setTotalPages(1);
          setUnreadCount(0);
          setLoading(false);
          return;
        default:
          // Pour les autres vues (purchases, social, etc.), on pourrait filtrer par catégories
          // Pour l'instant, on affiche la boîte de réception
          break;
      }
      
      if (showUnreadOnly) filters.isRead = false;
      if (showStarredOnly) filters.isStarred = true;
      if (searchQuery) filters.search = searchQuery;
      
      const response = await fetchInbox(filters);
      setEmails(response.data || []);
      setTotalPages(response.meta?.pagination?.pageCount || 1);
      setUnreadCount(response.meta?.unreadCount || 0);
    } catch (error) {
      console.error('Error loading inbox:', error);
      showGlobalPopup(t('error_loading_inbox') || 'Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, pageSize, showArchived, showUnreadOnly, showStarredOnly, searchQuery, activeView, showGlobalPopup, t]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Sync inbox
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncInbox();
      if (result.synced > 0) {
        showGlobalPopup(
          `${result.synced} ${t('emails_synced') || 'email(s) synchronisé(s)'}`,
          'success'
        );
        loadEmails();
      } else if (result.errors.length > 0) {
        showGlobalPopup(result.errors[0], 'error');
      } else {
        showGlobalPopup(t('inbox_up_to_date') || 'Boîte de réception à jour', 'info');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showGlobalPopup(t('sync_error') || 'Erreur de synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Open email detail
  const openEmail = async (email: ReceivedEmail) => {
    setLoadingEmail(true);
    try {
      // Mark as read if not already
      if (!email.is_read) {
        await markEmailAsRead(email.id);
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, is_read: true } : e
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Fetch full email content
      const fullEmail = await fetchReceivedEmail(email.id);
      setSelectedEmail(fullEmail || email);
    } catch (error) {
      console.error('Error opening email:', error);
      setSelectedEmail(email);
    } finally {
      setLoadingEmail(false);
    }
  };

  // Toggle read status
  const handleToggleRead = async (email: ReceivedEmail, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (email.is_read) {
        await markEmailAsUnread(email.id);
        setUnreadCount(prev => prev + 1);
      } else {
        await markEmailAsRead(email.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, is_read: !e.is_read } : e
      ));
    } catch (error) {
      console.error('Error toggling read:', error);
    }
  };

  // Toggle star
  const handleToggleStar = async (email: ReceivedEmail, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleEmailStar(email.id);
      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
      ));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null);
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Archive email
  const handleArchive = async (email: ReceivedEmail, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (email.is_archived) {
        await unarchiveEmail(email.id);
        showGlobalPopup(t('email_unarchived') || 'Email désarchivé', 'success');
      } else {
        await archiveEmail(email.id);
        showGlobalPopup(t('email_archived') || 'Email archivé', 'success');
      }
      
      // Remove from current view or update
      if (!showArchived && !email.is_archived) {
        setEmails(prev => prev.filter(e => e.id !== email.id));
        if (selectedEmail?.id === email.id) setSelectedEmail(null);
      } else {
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, is_archived: !e.is_archived } : e
        ));
      }
    } catch (error) {
      console.error('Error archiving:', error);
    }
  };

  // Delete email
  const handleDelete = async (email: ReceivedEmail) => {
    if (!confirm(t('confirm_delete_email') || 'Supprimer cet email ?')) return;
    
    try {
      await deleteReceivedEmail(email.id);
      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
      showGlobalPopup(t('email_deleted') || 'Email supprimé', 'success');
    } catch (error) {
      console.error('Error deleting:', error);
      showGlobalPopup(t('error_deleting') || 'Erreur lors de la suppression', 'error');
    }
  };

  // Reply to email
  const handleReply = (email: ReceivedEmail) => {
    setReplyToEmail(email);
    setComposerType('compose');
    setShowComposer(true);
  };

  // Open new email composer
  const handleNewEmail = (type: EmailComposerType) => {
    setReplyToEmail(null);
    setComposerType(type);
    setShowComposer(true);
  };

  // Titre de la vue active
  const getViewTitle = (view: EmailView): string => {
    const titles: Record<EmailView, string> = {
      inbox: t('inbox') || 'Boîte de réception',
      starred: t('starred') || 'Messages suivis',
      waiting: t('waiting') || 'En attente',
      important: t('important') || 'Important',
      sent: t('sent') || 'Messages envoyés',
      drafts: t('drafts') || 'Brouillons',
      purchases: t('purchases') || 'Achats',
      social: t('social') || 'Réseaux sociaux',
      notifications: t('notifications') || 'Notifications',
      forums: t('forums') || 'Forums',
      promotions: t('promotions') || 'Promotions',
    };
    return titles[view] || 'Mail';
  };

  // Icône de la vue active
  const getViewIcon = (view: EmailView) => {
    const icons: Record<EmailView, React.ReactNode> = {
      inbox: <IconInbox className="w-6 h-6 text-accent" />,
      starred: <IconStarFilled className="w-6 h-6 text-amber-500" />,
      waiting: <IconArchive className="w-6 h-6 text-muted" />,
      important: <IconMail className="w-6 h-6 text-red-500" />,
      sent: <IconSend className="w-6 h-6 text-blue-500" />,
      drafts: <IconMailOpened className="w-6 h-6 text-gray-500" />,
      purchases: <IconInbox className="w-6 h-6 text-green-500" />,
      social: <IconInbox className="w-6 h-6 text-purple-500" />,
      notifications: <IconInbox className="w-6 h-6 text-orange-500" />,
      forums: <IconInbox className="w-6 h-6 text-teal-500" />,
      promotions: <IconInbox className="w-6 h-6 text-pink-500" />,
    };
    return icons[view] || <IconInbox className="w-6 h-6 text-accent" />;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('yesterday') || 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  // Get sender display name
  const getSenderName = (email: ReceivedEmail): string => {
    if (email.client) {
      if (email.client.first_name && email.client.last_name) {
        return `${email.client.first_name} ${email.client.last_name}`;
      }
      if (email.client.enterprise) {
        return email.client.enterprise;
      }
    }
    return email.from_name || email.from_email.split('@')[0];
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-page rounded-xl overflow-hidden border border-default overscroll-contain">
      {/* Gmail-style Sidebar */}
      <EmailSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        onNewMessage={() => handleNewEmail('compose')}
        onNewQuote={() => handleNewEmail('quote')}
        onNewInvoice={() => handleNewEmail('invoice')}
        unreadCounts={{
          inbox: unreadCount,
        }}
      />
      {/* Email List */}
      <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[400px] lg:w-[450px] border-r border-default bg-card overscroll-contain`}>
        {/* Header */}
        <div className="p-4 border-b border-default">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getViewIcon(activeView)}
              <h1 className="text-xl font-bold text-primary">
                {getViewTitle(activeView)}
              </h1>
              {activeView === 'inbox' && unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-accent text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors disabled:opacity-50"
              title={t('sync_inbox') || 'Synchroniser'}
            >
              <IconRefresh className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_emails') || 'Rechercher...'}
              className="w-full !pl-10 !pr-4 py-2 bg-page border border-default rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => { setShowUnreadOnly(false); setShowStarredOnly(false); setShowArchived(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                !showUnreadOnly && !showStarredOnly && !showArchived
                  ? 'bg-accent text-white'
                  : 'bg-page border border-default text-muted hover:border-accent'
              }`}
            >
              {t('all') || 'Tous'}
            </button>
            <button
              onClick={() => { setShowUnreadOnly(true); setShowStarredOnly(false); setShowArchived(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                showUnreadOnly
                  ? 'bg-accent text-white'
                  : 'bg-page border border-default text-muted hover:border-accent'
              }`}
            >
              {t('unread') || 'Non lus'}
            </button>
            <button
              onClick={() => { setShowStarredOnly(true); setShowUnreadOnly(false); setShowArchived(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                showStarredOnly
                  ? 'bg-amber-500 text-white'
                  : 'bg-page border border-default text-muted hover:border-amber-500'
              }`}
            >
              <IconStarFilled className="w-3 h-3 inline mr-1" />
              {t('starred') || 'Favoris'}
            </button>
            <button
              onClick={() => { setShowArchived(true); setShowUnreadOnly(false); setShowStarredOnly(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                showArchived
                  ? 'bg-gray-500 text-white'
                  : 'bg-page border border-default text-muted hover:border-gray-500'
              }`}
            >
              <IconArchive className="w-3 h-3 inline mr-1" />
              {t('archived') || 'Archivés'}
            </button>
          </div>
        </div>
        
        {/* Email List */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted">
              <IconInbox className="w-12 h-12 mb-2 opacity-50" />
              <p>{t('no_emails') || 'Aucun email'}</p>
              <button
                onClick={handleSync}
                className="mt-2 text-accent hover:underline text-sm"
              >
                {t('sync_now') || 'Synchroniser maintenant'}
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {emails.map((email) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => openEmail(email)}
                  className={`flex items-start gap-3 p-4 border-b border-default cursor-pointer transition-colors ${
                    email.is_read ? 'bg-card hover:bg-page' : 'bg-accent/10 hover:bg-accent/15'
                  } ${selectedEmail?.id === email.id ? 'bg-accent/10 border-l-2 border-l-accent' : ''}`}
                >
                  {/* Read indicator */}
                  <button
                    onClick={(e) => handleToggleRead(email, e)}
                    className="mt-1 flex-shrink-0"
                    title={email.is_read ? t('mark_unread') : t('mark_read')}
                  >
                    {email.is_read ? (
                      <IconMailOpened className="w-5 h-5 text-muted hover:text-accent" />
                    ) : (
                      <IconMail className="w-5 h-5 text-accent" />
                    )}
                  </button>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium truncate ${email.is_read ? 'text-primary' : 'text-primary font-semibold'}`}>
                        {getSenderName(email)}
                      </span>
                      <span className="text-xs text-muted whitespace-nowrap">
                        {formatDate(email.received_at)}
                      </span>
                    </div>
                    
                    <p className={`text-sm truncate ${email.is_read ? 'text-muted' : 'text-primary'}`}>
                      {email.subject || '(Sans objet)'}
                    </p>
                    
                    <p className="text-xs text-muted truncate mt-0.5">
                      {email.snippet || ''}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2 mt-1">
                      {email.client?.enterprise && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <IconBuilding className="w-3 h-3" />
                          {email.client.enterprise}
                        </span>
                      )}
                      {email.has_attachments && (
                        <IconPaperclip className="w-3 h-3 text-muted" />
                      )}
                    </div>
                  </div>
                  
                  {/* Star */}
                  <button
                    onClick={(e) => handleToggleStar(email, e)}
                    className="mt-1 flex-shrink-0"
                  >
                    {email.is_starred ? (
                      <IconStarFilled className="w-5 h-5 text-amber-500" />
                    ) : (
                      <IconStar className="w-5 h-5 text-muted hover:text-amber-500" />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-default bg-card">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-muted hover:text-accent disabled:opacity-50"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 text-muted hover:text-accent disabled:opacity-50"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      {/* Email Detail */}
      <div className={`${selectedEmail ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-page`}>
        {selectedEmail ? (
          <>
            {/* Detail Header */}
            <div className="flex items-center justify-between p-4 border-b border-default bg-card">
              <button
                onClick={() => setSelectedEmail(null)}
                className="md:hidden p-2 text-muted hover:text-accent rounded-lg"
              >
                <IconArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-colors"
                >
                  <IconSend className="w-4 h-4" color="white" />
                  {t('reply') || 'Répondre'}
                </button>
                
                <button
                  onClick={(e) => handleArchive(selectedEmail, e)}
                  className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                  title={selectedEmail.is_archived ? t('unarchive') : t('archive')}
                >
                  {selectedEmail.is_archived ? (
                    <IconArchiveOff className="w-5 h-5" />
                  ) : (
                    <IconArchive className="w-5 h-5" />
                  )}
                </button>
                
                <button
                  onClick={() => handleDelete(selectedEmail)}
                  className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  title={t('delete')}
                >
                  <IconTrash className="w-5 h-5" color="red" />
                </button>
              </div>
            </div>
            
            {/* Email Content */}
            <div 
              className="flex-1 overflow-y-auto p-6 bg-card overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {loadingEmail ? (
                <div className="flex items-center justify-center h-40">
                  <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              ) : (
                <>
                  {/* Subject */}
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {selectedEmail.subject || '(Sans objet)'}
                  </h2>
                  
                  {/* Sender Info */}
                  <div className="flex items-start gap-4 mb-6 pb-6 border-b border-default">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {selectedEmail.client?.enterprise ? (
                        <IconBuilding className="w-6 h-6 text-accent" />
                      ) : (
                        <IconUser className="w-6 h-6 text-accent" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-primary">
                          {getSenderName(selectedEmail)}
                        </span>
                        {selectedEmail.client?.enterprise && (
                          <span className="text-sm text-muted">
                            • {selectedEmail.client.enterprise}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted">{selectedEmail.from_email}</p>
                      <p className="text-xs text-muted mt-1">
                        {new Date(selectedEmail.received_at).toLocaleString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => handleToggleStar(selectedEmail, e)}
                      className="p-2"
                    >
                      {selectedEmail.is_starred ? (
                        <IconStarFilled className="w-6 h-6 text-amber-500" />
                      ) : (
                        <IconStar className="w-6 h-6 text-muted hover:text-amber-500" />
                      )}
                    </button>
                  </div>
                  
                  {/* Attachments */}
                  {selectedEmail.has_attachments && selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="mb-6 p-4 bg-page border border-default rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <IconPaperclip className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-primary">
                          {selectedEmail.attachments.length} {t('attachments') || 'pièce(s) jointe(s)'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 bg-card rounded border border-default text-sm"
                          >
                            <IconPaperclip className="w-3 h-3 text-muted" />
                            <span className="truncate max-w-[150px] text-primary">{att.filename}</span>
                            <span className="text-xs text-muted">
                              ({Math.round(att.size / 1024)} Ko)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Email Body */}
                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.content_html ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedEmail.content_html }}
                        className="email-content"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-primary">
                        {selectedEmail.content_text || ''}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted">
            <IconMail className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">{t('select_email') || 'Sélectionnez un email'}</p>
            <p className="text-sm">{t('click_to_read') || 'Cliquez sur un email pour le lire'}</p>
          </div>
        )}
      </div>

      {/* Gmail-style composer window */}
      <GmailStyleComposer
        isOpen={showComposer}
        onClose={() => {
          setShowComposer(false);
          setReplyToEmail(null);
        }}
        initialType={composerType}
        replyToEmail={replyToEmail || undefined}
      />
    </div>
  );
}

