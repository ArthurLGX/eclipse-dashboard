'use client';

import React from 'react';
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
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function EmailsPage() {
  return (
    <ProtectedRoute>
      <EmailsDashboard />
    </ProtectedRoute>
  );
}

function EmailsDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  
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
          <IconMail className="w-8 h-8 text-accent" />
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
            
            <div className="flex items-center gap-2 text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity">
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
          className="group cursor-pointer bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
              <IconChartBar className="w-7 h-7 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
                {t('email_analytics') || 'Analytics'}
              </h3>
              <p className="text-sm text-muted">
                {t('email_analytics_desc') || 'Suivez les ouvertures et clics de vos emails'}
              </p>
            </div>
            <IconArrowRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
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
            <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
              <IconHistory className="w-7 h-7 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
                {t('email_history') || 'Historique'}
              </h3>
              <p className="text-sm text-muted">
                {t('email_history_desc') || 'Consultez tous vos emails envoyés'}
              </p>
            </div>
            <IconArrowRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>
      </div>

      {/* Scheduled Emails Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() => router.push('/dashboard/emails/scheduled')}
        className="group cursor-pointer bg-gradient-to-br from-purple-600/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/50 hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <IconClock className="w-7 h-7 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-primary group-hover:text-purple-400 transition-colors">
              {t('scheduled_emails') || 'Emails planifiés'}
            </h3>
            <p className="text-sm text-muted">
              {t('scheduled_emails_desc') || 'Gérez vos emails programmés pour plus tard'}
            </p>
          </div>
          <IconArrowRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
        </div>
      </motion.div>
    </div>
  );
}

