'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  IconMail,
  IconFileInvoice,
  IconFileDescription,
  IconNews,
  IconPencil,
  IconArrowRight,
  IconHistory,
  IconChartBar,
  IconClock,
  IconDeviceFloppy,
  IconTrash,
  IconLoader2,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { fetchEmailDrafts, deleteEmailDraft, type EmailDraft } from '@/lib/api';

export default function EmailsPage() {
  return (
    <ProtectedRoute>
      <EmailsDashboard />
    </ProtectedRoute>
  );
}

function EmailsDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  
  // Drafts state
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  
  // Charger les brouillons
  useEffect(() => {
    const loadDrafts = async () => {
      if (!user?.id) return;
      
      try {
        const data = await fetchEmailDrafts(user.id);
        setDrafts(data);
      } catch (error) {
        console.error('Error loading drafts:', error);
      } finally {
        setLoadingDrafts(false);
      }
    };
    
    loadDrafts();
  }, [user?.id]);
  
  // Supprimer un brouillon
  const handleDeleteDraft = async (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    
    if (!confirm(t('confirm_delete_draft') || 'Supprimer ce brouillon ?')) return;
    
    setDeletingDraftId(documentId);
    try {
      await deleteEmailDraft(documentId);
      setDrafts(prev => prev.filter(d => d.documentId !== documentId));
      showGlobalPopup(t('draft_deleted') || 'Brouillon supprimé', 'success');
    } catch (error) {
      console.error('Error deleting draft:', error);
      showGlobalPopup(t('error_deleting_draft') || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingDraftId(null);
    }
  };
  
  // Ouvrir un brouillon
  const handleOpenDraft = (draft: EmailDraft) => {
    const categoryRoutes: Record<string, string> = {
      classic: '/dashboard/emails/compose',
      invoice: '/dashboard/emails/invoice',
      quote: '/dashboard/emails/quote',
      newsletter: '/dashboard/newsletters/compose',
    };
    
    const baseUrl = categoryRoutes[draft.category] || '/dashboard/emails/compose';
    router.push(`${baseUrl}?draft=${draft.documentId}`);
  };
  
  // Helper pour formater la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return t('just_now') || 'À l\'instant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };
  
  // Helper pour l'icône de catégorie
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'invoice': return IconFileInvoice;
      case 'quote': return IconFileDescription;
      case 'newsletter': return IconNews;
      default: return IconPencil;
    }
  };
  
  // Helper pour la couleur de catégorie
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'invoice': return '#f59e0b';
      case 'quote': return '#8b5cf6';
      case 'newsletter': return '#3b82f6';
      default: return '#10b981';
    }
  };
  
  const emailTypes = [
    {
      id: 'classic',
      title: t('classic_email') || 'Email classique',
      description: t('classic_email_desc') || 'Envoyez un email simple à vos contacts',
      icon: IconPencil,
      color: '#10b981',
      href: '/dashboard/emails/compose',
    },
    {
      id: 'invoice',
      title: t('invoice_email') || 'Email facture',
      description: t('invoice_email_desc') || 'Envoyez une facture avec pièce jointe',
      icon: IconFileInvoice,
      color: '#f59e0b',
      href: '/dashboard/emails/invoice',
    },
    {
      id: 'quote',
      title: t('quote_email') || 'Email devis',
      description: t('quote_email_desc') || 'Envoyez un devis à vos prospects',
      icon: IconFileDescription,
      color: '#8b5cf6',
      href: '/dashboard/emails/quote',
    },
    {
      id: 'newsletter',
      title: t('newsletter') || 'Newsletter',
      description: t('newsletter_email_desc') || 'Créez et envoyez des newsletters',
      icon: IconNews,
      color: '#3b82f6',
      href: '/dashboard/newsletters/compose',
    },
  ];
  
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <IconMail className="w-8 h-8 !text-accent" />
          {t('emails') || 'Emails'}
        </h1>
        <p className="text-muted mt-2">
          {t('emails_page_desc') || 'Gérez et envoyez tous vos emails depuis un seul endroit'}
        </p>
      </motion.div>
      
      {/* Email Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {emailTypes.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => router.push(type.href)}
            className="group cursor-pointer bg-card border border-default rounded-xl p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300"
          >
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${type.color}15` }}
            >
              <type.icon className="w-7 h-7" style={{ color: type.color }} />
            </div>
            
            <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
              {type.title}
            </h3>
            
            <p className="text-sm text-muted mb-4">
              {type.description}
            </p>
            
            <div className="flex items-center gap-2 text-sm !text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              <span>{t('create') || 'Créer'}</span>
              <IconArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Analytics Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => router.push('/dashboard/emails/analytics')}
          className="group cursor-pointer bg-card border border-default rounded-xl p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl border-accent-light flex items-center justify-center">
              <IconChartBar className="w-7 h-7 !text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
                {t('email_analytics') || 'Analytics'}
              </h3>
              <p className="text-sm text-muted">
                {t('email_analytics_desc') || 'Suivez les ouvertures et clics de vos emails'}
              </p>
            </div>
            <IconArrowRight className="w-5 h-5 !text-accent opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

        {/* History Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => router.push('/dashboard/emails/history')}
          className="group cursor-pointer bg-card border border-default rounded-xl p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-info-light flex items-center justify-center">
              <IconHistory className="w-7 h-7 text-info" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
                {t('email_history') || 'Historique'}
              </h3>
              <p className="text-sm text-muted">
                {t('email_history_desc') || 'Consultez tous vos emails envoyés'}
              </p>
            </div>
            <IconArrowRight className="w-5 h-5 !text-accent opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>
      </div>

      {/* Scheduled Emails Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() => router.push('/dashboard/emails/scheduled')}
        className="group cursor-pointer bg-card border border-default rounded-xl p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300 mb-10"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-warning-light flex items-center justify-center">
            <IconClock className="w-7 h-7 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
              {t('scheduled_emails') || 'Emails planifiés'}
            </h3>
            <p className="text-sm text-muted">
              {t('scheduled_emails_desc') || 'Gérez vos emails programmés pour plus tard'}
            </p>
          </div>
          <IconArrowRight className="w-5 h-5 !text-accent opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
        </div>
      </motion.div>
      
      {/* Drafts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-card border border-default rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconDeviceFloppy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {t('drafts') || 'Brouillons'}
              </h3>
              <p className="text-sm text-muted">
                {drafts.length > 0 
                  ? `${drafts.length} ${t('drafts_count') || 'brouillon(s) enregistré(s)'}`
                  : t('no_drafts') || 'Aucun brouillon'
                }
              </p>
            </div>
          </div>
        </div>
        
        {loadingDrafts ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="w-6 h-6 !text-accent animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <IconDeviceFloppy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('no_drafts_message') || 'Vos brouillons apparaîtront ici'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.slice(0, 5).map((draft) => {
              const CategoryIcon = getCategoryIcon(draft.category);
              const color = getCategoryColor(draft.category);
              
              return (
                <div
                  key={draft.documentId}
                  onClick={() => handleOpenDraft(draft)}
                  className="group flex items-center gap-4 p-4 bg-hover rounded-lg cursor-pointer hover:bg-hover transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <CategoryIcon className="w-5 h-5" style={{ color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-primary truncate group-hover:text-accent transition-colors">
                      {draft.name || draft.subject || t('untitled_draft') || 'Sans titre'}
                    </h4>
                    <p className="text-sm text-muted truncate">
                      {draft.recipients && draft.recipients.length > 0 
                        ? draft.recipients.map(r => r.email).join(', ')
                        : t('no_recipients') || 'Aucun destinataire'
                      }
                    </p>
                  </div>
                  
                  <span className="text-xs text-muted whitespace-nowrap">
                    {formatDate(draft.updatedAt)}
                  </span>
                  
                  <button
                    onClick={(e) => handleDeleteDraft(e, draft.documentId)}
                    disabled={deletingDraftId === draft.documentId}
                    className="p-2 text-muted hover:text-error rounded-lg hover:bg-error-light transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {deletingDraftId === draft.documentId ? (
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <IconTrash className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
            
            {drafts.length > 5 && (
              <button
                onClick={() => router.push('/dashboard/emails/drafts')}
                className="w-full py-3 text-sm !text-accent hover:underline"
              >
                {t('view_all_drafts') || `Voir tous les brouillons (${drafts.length})`}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

