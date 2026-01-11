'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { 
  IconWebhook, 
  IconBrandGoogle, 
  IconCopy, 
  IconCheck,
  IconExternalLink,
  IconSettings,
  IconArrowLeft
} from '@tabler/icons-react';
import Link from 'next/link';

// Configuration
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.dashboard.eclipsestudiodev.fr';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'inactive' | 'pending';
  children: React.ReactNode;
}

function IntegrationCard({ title, description, icon, status, children }: IntegrationCardProps) {
  const { t } = useLanguage();
  
  const statusColors = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  };

  const statusLabels = {
    active: t('integration_active') || 'Actif',
    inactive: t('integration_inactive') || 'Inactif',
    pending: t('integration_pending') || 'En attente',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <div className="pt-4 border-t border-border">
        {children}
      </div>
    </div>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showGlobalPopup(t('copied_to_clipboard') || 'Copié !', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showGlobalPopup(t('copy_failed') || 'Erreur de copie', 'error');
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono truncate">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-hover rounded-lg transition-colors"
          title={t('copy') || 'Copier'}
        >
          {copied ? <IconCheck size={18} className="text-green-500" /> : <IconCopy size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { t } = useLanguage();
  
  const typeformWebhookUrl = `${STRAPI_URL}/api/prospects/typeform-webhook`;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/settings"
          className="p-2 hover:bg-hover rounded-lg transition-colors"
        >
          <IconArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('integrations') || 'Intégrations'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('integrations_description') || 'Connectez vos outils externes'}
          </p>
        </div>
      </div>

      {/* Typeform Integration */}
      <IntegrationCard
        title="Typeform"
        description={t('typeform_description') || 'Recevez automatiquement les prospects depuis vos formulaires Typeform'}
        icon={<IconWebhook size={24} />}
        status="active"
      >
        <div className="space-y-4">
          <CopyableField 
            label={t('webhook_url') || 'URL du Webhook'}
            value={typeformWebhookUrl}
          />
          
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-blue-800 dark:text-blue-300">
              {t('typeform_setup_title') || 'Comment configurer ?'}
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>{t('typeform_step_1') || 'Ouvrez votre formulaire Typeform'}</li>
              <li>{t('typeform_step_2') || 'Allez dans Connect → Webhooks'}</li>
              <li>{t('typeform_step_3') || 'Cliquez sur "Add a webhook"'}</li>
              <li>{t('typeform_step_4') || 'Collez l\'URL du webhook ci-dessus'}</li>
              <li>{t('typeform_step_5') || 'Activez le webhook'}</li>
            </ol>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-amber-800 dark:text-amber-300">
              {t('typeform_mapping_title') || 'Mappage des champs'}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('typeform_mapping_description') || 'Pour un mappage automatique optimal, nommez vos champs Typeform avec ces références :'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <code className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">nom, name, full_name</code>
              <span className="text-amber-600 dark:text-amber-400">→ Nom du prospect</span>
              <code className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">email, mail</code>
              <span className="text-amber-600 dark:text-amber-400">→ Email</span>
              <code className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">telephone, phone</code>
              <span className="text-amber-600 dark:text-amber-400">→ Téléphone</span>
              <code className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">entreprise, company</code>
              <span className="text-amber-600 dark:text-amber-400">→ Entreprise</span>
              <code className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">budget</code>
              <span className="text-amber-600 dark:text-amber-400">→ Budget estimé</span>
              <code className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">projet, description</code>
              <span className="text-amber-600 dark:text-amber-400">→ Description</span>
            </div>
          </div>

          <a 
            href="https://www.typeform.com/help/a/webhooks-360029573471/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            {t('typeform_docs') || 'Documentation Typeform Webhooks'}
            <IconExternalLink size={14} />
          </a>
        </div>
      </IntegrationCard>

      {/* Google Integration */}
      <IntegrationCard
        title="Google"
        description={t('google_description') || 'Connexion Google et import Google Sheets'}
        icon={<IconBrandGoogle size={24} />}
        status="active"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">{t('google_login') || 'Connexion Google'}</p>
              <p className="text-sm text-muted-foreground">{t('google_login_desc') || 'Se connecter avec votre compte Google'}</p>
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {t('configured') || 'Configuré'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">{t('google_sheets') || 'Google Sheets'}</p>
              <p className="text-sm text-muted-foreground">{t('google_sheets_desc') || 'Importer des tâches depuis Google Sheets'}</p>
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {t('configured') || 'Configuré'}
            </span>
          </div>
        </div>
      </IntegrationCard>

      {/* Future integrations */}
      <div className="text-center py-8">
        <IconSettings size={48} className="mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">
          {t('more_integrations_coming') || 'Plus d\'intégrations bientôt...'}
        </p>
        <p className="text-sm text-muted-foreground">
          Stripe, Slack, Notion, etc.
        </p>
      </div>
    </div>
  );
}



