'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconDeviceFloppy,
  IconArrowLeft,
  IconTrash,
  IconLoader2,
  IconFileInvoice,
  IconFileDescription,
  IconNews,
  IconPencil,
  IconSearch,
  IconFilter,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { fetchEmailDrafts, deleteEmailDraft, type EmailDraft, type EmailCategory } from '@/lib/api';

export default function DraftsPage() {
  return (
    <ProtectedRoute>
      <DraftsContent />
    </ProtectedRoute>
  );
}

function DraftsContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | 'all'>('all');
  
  // Charger les brouillons
  useEffect(() => {
    const loadDrafts = async () => {
      if (!user?.id) return;
      
      try {
        const data = await fetchEmailDrafts(
          user.id, 
          categoryFilter !== 'all' ? categoryFilter : undefined
        );
        setDrafts(data);
      } catch (error) {
        console.error('Error loading drafts:', error);
        showGlobalPopup(t('error_loading_drafts') || 'Erreur lors du chargement', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadDrafts();
  }, [user?.id, categoryFilter, showGlobalPopup, t]);
  
  // Supprimer un brouillon
  const handleDelete = async (documentId: string) => {
    if (!confirm(t('confirm_delete_draft') || 'Supprimer ce brouillon ?')) return;
    
    setDeletingId(documentId);
    try {
      await deleteEmailDraft(documentId);
      setDrafts(prev => prev.filter(d => d.documentId !== documentId));
      showGlobalPopup(t('draft_deleted') || 'Brouillon supprimé', 'success');
    } catch (error) {
      console.error('Error deleting draft:', error);
      showGlobalPopup(t('error_deleting_draft') || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };
  
  // Ouvrir un brouillon
  const handleOpen = (draft: EmailDraft) => {
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
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
  
  // Helper pour le label de catégorie
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'invoice': return t('invoice') || 'Facture';
      case 'quote': return t('quote') || 'Devis';
      case 'newsletter': return t('newsletter') || 'Newsletter';
      default: return t('classic') || 'Classique';
    }
  };
  
  // Filtrer les brouillons
  const filteredDrafts = drafts.filter(draft => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (draft.name?.toLowerCase().includes(searchLower)) ||
      (draft.subject?.toLowerCase().includes(searchLower)) ||
      (draft.recipients?.some(r => r.email.toLowerCase().includes(searchLower)))
    );
  });
  
  const categories: Array<{ value: EmailCategory | 'all'; label: string }> = [
    { value: 'all', label: t('all') || 'Tous' },
    { value: 'classic', label: t('classic') || 'Classique' },
    { value: 'invoice', label: t('invoice') || 'Facture' },
    { value: 'quote', label: t('quote') || 'Devis' },
    { value: 'newsletter', label: t('newsletter') || 'Newsletter' },
  ];
  
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/dashboard/emails"
          className="inline-flex items-center gap-2 text-muted hover:text-accent mb-4 transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
          {t('back_to_emails') || 'Retour aux emails'}
        </Link>
        
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <IconDeviceFloppy className="w-8 h-8 text-accent" />
          {t('drafts') || 'Brouillons'}
        </h1>
        <p className="text-muted mt-2">
          {t('drafts_page_desc') || 'Retrouvez tous vos brouillons d\'emails'}
        </p>
      </motion.div>
      
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4 mb-6"
      >
        {/* Search */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_drafts') || 'Rechercher un brouillon...'}
            className="w-full pl-10 pr-4 py-3 bg-card border border-default rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>
        
        {/* Category Filter */}
        <div className="relative">
          <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EmailCategory | 'all')}
            className="pl-10 pr-8 py-3 bg-card border border-default rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </motion.div>
      
      {/* Drafts List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-default rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <IconDeviceFloppy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium text-primary mb-2">
              {t('no_drafts_found') || 'Aucun brouillon trouvé'}
            </h3>
            <p>{t('no_drafts_message') || 'Vos brouillons apparaîtront ici'}</p>
          </div>
        ) : (
          <div className="divide-y divide-default">
            <AnimatePresence mode="popLayout">
              {filteredDrafts.map((draft, index) => {
                const CategoryIcon = getCategoryIcon(draft.category);
                const color = getCategoryColor(draft.category);
                
                return (
                  <motion.div
                    key={draft.documentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleOpen(draft)}
                    className="group flex items-center gap-4 p-5 cursor-pointer hover:bg-hover transition-colors"
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <CategoryIcon className="w-6 h-6" style={{ color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-primary truncate group-hover:text-accent transition-colors">
                          {draft.name || draft.subject || t('untitled_draft') || 'Sans titre'}
                        </h4>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full shrink-0"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {getCategoryLabel(draft.category)}
                        </span>
                      </div>
                      <p className="text-sm text-muted truncate mb-1">
                        {draft.subject || t('no_subject') || 'Sans objet'}
                      </p>
                      <p className="text-xs text-muted">
                        {draft.recipients && draft.recipients.length > 0 
                          ? `${draft.recipients.length} destinataire(s): ${draft.recipients.map(r => r.email).join(', ')}`
                          : t('no_recipients') || 'Aucun destinataire'
                        }
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-sm text-muted">
                        {formatDate(draft.updatedAt)}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(draft.documentId);
                      }}
                      disabled={deletingId === draft.documentId}
                      className="p-2 text-muted hover:text-error rounded-lg hover:bg-error-light transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      {deletingId === draft.documentId ? (
                        <IconLoader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <IconTrash className="w-5 h-5" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
      
      {/* Count */}
      {!loading && filteredDrafts.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-muted mt-4"
        >
          {filteredDrafts.length} {t('drafts_count') || 'brouillon(s)'}
        </motion.p>
      )}
    </div>
  );
}


