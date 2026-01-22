'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconSparkles,
  IconLoader2,
  IconClipboardList,
  IconFileInvoice,
  IconReceipt,
  IconFileText,
  IconClock,
  IconAlertTriangle,
  IconChevronRight,
  IconCalendarEvent,
  IconSun,
  IconMoon,
  IconSunrise,
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';

interface Suggestion {
  id: string;
  type: 'task' | 'quote' | 'invoice' | 'contract' | 'timesheet' | 'alert' | 'follow_up';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: {
    label: string;
    href: string;
  };
  metadata?: {
    count?: number;
    amount?: number;
    projectTitle?: string;
    clientName?: string;
    dueDate?: string;
  };
}

interface DailySuggestionsResponse {
  greeting: string;
  summary: string;
  suggestions: Suggestion[];
  motivational_tip?: string;
}

const STORAGE_KEY = 'eclipse_daily_suggestions_last_shown';

export default function DailySuggestionsModal() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DailySuggestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if we should show the modal today
  useEffect(() => {
    if (!user?.id) return;
    
    const lastShown = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    
    if (lastShown !== today) {
      setIsOpen(true);
      fetchSuggestions();
    }
  }, [user?.id]);

  const fetchSuggestions = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/daily-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          language: language || 'fr',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const result = await response.json();
      setData(result);
      
      // Mark as shown today
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    } catch (err) {
      console.error('Error fetching daily suggestions:', err);
      setError(t('ai_suggestions_error') || 'Impossible de charger les suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Mark as shown even if closed early
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
  };

  const getTimeOfDayIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return <IconSunrise className="w-5 h-5 text-amber-400" />;
    if (hour >= 12 && hour < 18) return <IconSun stroke={'#ffd700'} className="!text-warning-text w-5 h-5" />;
    return <IconMoon className="w-5 h-5 text-indigo-400" />;
  };

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'task':
        return <IconClipboardList className="w-5 h-5" />;
      case 'quote':
        return <IconFileText className="w-5 h-5" />;
      case 'invoice':
        return <IconFileInvoice className="w-5 h-5" />;
      case 'contract':
        return <IconReceipt className="w-5 h-5" />;
      case 'timesheet':
        return <IconClock className="w-5 h-5" />;
      case 'alert':
        return <IconAlertTriangle className="w-5 h-5" />;
      case 'follow_up':
        return <IconCalendarEvent className="w-5 h-5" />;
      default:
        return <IconSparkles className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-danger-light text-danger border-danger';
      case 'medium':
        return 'bg-warning-light text-warning-text border-warning';
      case 'low':
        return 'bg-info-light text-info border-info';
      default:
        return 'bg-hover text-secondary border-muted';
    }
  };

  const getTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'task':
        return 'text-info';
      case 'quote':
        return 'text-accent';
      case 'invoice':
        return 'text-success';
      case 'contract':
        return 'text-warning';
      case 'timesheet':
        return 'text-cyan-500';
      case 'alert':
        return 'text-danger';
      case 'follow_up':
        return 'text-amber-500';
      default:
        return 'text-muted';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-page rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-muted">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent-light rounded-2xl">
                  <Image 
                    src="/images/logo/eclipse-logo.png" 
                    alt="Eclipse Assistant" 
                    width={32} 
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getTimeOfDayIcon()}
                    <h2 className="text-xl font-bold text-primary">
                      {loading ? (t('loading') || 'Chargement...') : data?.greeting}
                    </h2>
                  </div>
                  <p className="text-sm text-muted">
                    {loading 
                      ? (t('analyzing_data') || 'Analyse de vos données en cours...')
                      : data?.summary
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-hover rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5 text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center">
                    <IconLoader2 className="w-8 h-8 !text-accent animate-spin" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-accent"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <p className="mt-4 text-sm text-muted">
                  {t('ai_analyzing') || 'Eclipse Assistant analyse vos projets...'}
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-danger-light rounded-xl text-center">
                <IconAlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
                <p className="text-sm text-danger">{error}</p>
                <button
                  onClick={fetchSuggestions}
                  className="mt-3 px-4 py-2 bg-danger text-white rounded-lg text-sm hover:opacity-90"
                >
                  {t('retry') || 'Réessayer'}
                </button>
              </div>
            )}

            {!loading && !error && data && (
              <div className="space-y-4">
                {data.suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                      <IconSparkles className="w-8 h-8 !text-success-text -text" />
                    </div>
                    <p className="text-lg font-medium text-primary mb-2">
                      {t('all_caught_up') || 'Tout est à jour !'}
                    </p>
                    <p className="text-sm text-muted">
                      {t('no_urgent_tasks') || 'Aucune tâche urgente pour le moment.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-secondary mb-3">
                      {t('suggested_actions') || 'Actions suggérées pour aujourd\'hui'}
                    </p>
                    
                    {data.suggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link
                          href={suggestion.action.href}
                          onClick={handleClose}
                          className="block p-4 bg-card rounded-xl border border-muted hover:border-accent transition-all group"
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`p-2.5 rounded-xl ${getPriorityColor(suggestion.priority)} bg-opacity-20`}>
                              <span className={getTypeColor(suggestion.type)}>
                                {getSuggestionIcon(suggestion.type)}
                              </span>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-primary truncate">
                                  {suggestion.title}
                                </h3>
                                {suggestion.priority === 'high' && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-danger-light text-danger rounded-full">
                                    {t('urgent') || 'Urgent'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted line-clamp-2">
                                {suggestion.description}
                              </p>
                              
                              {/* Metadata */}
                              {suggestion.metadata && (
                                <div className="flex items-center gap-3 mt-2 text-xs text-secondary">
                                  {suggestion.metadata.clientName && (
                                    <span>👤 {suggestion.metadata.clientName}</span>
                                  )}
                                  {suggestion.metadata.projectTitle && (
                                    <span>📁 {suggestion.metadata.projectTitle}</span>
                                  )}
                                  {suggestion.metadata.amount && (
                                    <span>💰 {suggestion.metadata.amount.toLocaleString()}€</span>
                                  )}
                                  {suggestion.metadata.count && (
                                    <span>📊 {suggestion.metadata.count}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Action */}
                            <div className="flex items-center gap-2 !text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-sm font-medium hidden sm:inline">
                                {suggestion.action.label}
                              </span>
                              <IconChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </>
                )}

                {/* Motivational tip */}
                {data.motivational_tip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 bg-gradient-to-r from-accent-light to-info-light rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div>
                        <p className="text-sm font-medium text-primary mb-1">
                          {t('tip_of_the_day') || 'Conseil du jour'}
                        </p>
                        <p className="text-sm text-secondary">
                          {data.motivational_tip}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-muted bg-muted flex items-center justify-between">
            <p className="text-xs text-muted">
              {t('powered_by_eclipse') || 'Propulsé par Eclipse Assistant'}
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:opacity-90 transition-colors"
            >
              {t('start_day') || 'Commencer ma journée'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

