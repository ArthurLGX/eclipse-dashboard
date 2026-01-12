'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { 
  IconWebhook, 
  IconBrandGoogle, 
  IconCopy, 
  IconCheck,
  IconExternalLink,
  IconSettings,
  IconArrowLeft,
  IconKey,
  IconTrash,
  IconPlus,
  IconEye,
  IconEyeOff,
  IconClock
} from '@tabler/icons-react';
import Link from 'next/link';
import { fetchApiTokens, createApiToken, deleteApiToken, ApiToken } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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

function ApiTokensSection() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const data = await fetchApiTokens();
      setTokens(data);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) return;
    
    setCreating(true);
    try {
      const token = await createApiToken({ name: newTokenName.trim() });
      setNewlyCreatedToken(token.token || null);
      setTokens(prev => [token, ...prev]);
      setNewTokenName('');
      showGlobalPopup(t('token_created') || 'Token créé !', 'success');
    } catch (error) {
      console.error('Error creating token:', error);
      showGlobalPopup(t('token_create_error') || 'Erreur lors de la création', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async (tokenId: number) => {
    if (!confirm(t('confirm_delete_token') || 'Révoquer ce token ? Cette action est irréversible.')) {
      return;
    }

    try {
      await deleteApiToken(tokenId);
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      showGlobalPopup(t('token_revoked') || 'Token révoqué', 'success');
    } catch (error) {
      console.error('Error deleting token:', error);
      showGlobalPopup(t('token_revoke_error') || 'Erreur lors de la révocation', 'error');
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      showGlobalPopup(t('copied_to_clipboard') || 'Copié !', 'success');
    } catch {
      showGlobalPopup(t('copy_failed') || 'Erreur de copie', 'error');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <IntegrationCard
      title={t('api_tokens') || 'Tokens API'}
      description={t('api_tokens_description') || 'Générez des tokens pour connecter VS Code, Cursor ou d\'autres applications'}
      icon={<IconKey size={24} />}
      status={tokens.length > 0 ? 'active' : 'inactive'}
    >
      <div className="space-y-4">
        {/* Token créé - affiché une seule fois */}
        <AnimatePresence>
          {newlyCreatedToken && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-green-800 dark:text-green-300">
                  {t('token_created_title') || '✅ Token créé avec succès'}
                </h4>
                <button
                  onClick={() => setNewlyCreatedToken(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                {t('token_created_warning') || 'Copiez ce token maintenant. Il ne sera plus affiché !'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white/50 dark:bg-black/20 rounded-lg text-sm font-mono break-all">
                  {showToken ? newlyCreatedToken : '•'.repeat(40)}
                </code>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 hover:bg-green-200/50 rounded-lg transition-colors"
                >
                  {showToken ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
                <button
                  onClick={() => handleCopyToken(newlyCreatedToken)}
                  className="p-2 hover:bg-green-200/50 rounded-lg transition-colors"
                >
                  <IconCopy size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton créer */}
        {!showCreateModal ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
          >
            <IconPlus size={18} />
            {t('create_api_token') || 'Générer un nouveau token'}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-background border border-border rounded-lg space-y-3"
          >
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder={t('token_name_placeholder') || 'Ex: VS Code - MacBook Pro'}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateToken}
                disabled={creating || !newTokenName.trim()}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] disabled:opacity-50 transition-colors"
              >
                {creating ? (t('creating') || 'Création...') : (t('create') || 'Créer')}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTokenName('');
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Liste des tokens */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('loading') || 'Chargement...'}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('no_api_tokens') || 'Aucun token API'}
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{token.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <code className="font-mono">{token.token_preview}</code>
                    {token.last_used_at && (
                      <span className="flex items-center gap-1">
                        <IconClock size={12} />
                        {formatDate(token.last_used_at)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteToken(token.id)}
                  className="p-2 text-muted-foreground hover:text-danger transition-colors"
                  title={t('revoke_token') || 'Révoquer'}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-blue-800 dark:text-blue-300">
            {t('api_token_usage') || 'Comment utiliser ?'}
          </h4>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>{t('api_token_step_1') || 'Installez l\'extension Eclipse Time Tracker dans VS Code/Cursor'}</li>
            <li>{t('api_token_step_2') || 'Générez un token ci-dessus et copiez-le'}</li>
            <li>{t('api_token_step_3') || 'Dans VS Code : Ctrl+Shift+P → Eclipse: Configure API Token'}</li>
            <li>{t('api_token_step_4') || 'Collez le token et liez vos dossiers aux projets'}</li>
          </ol>
        </div>

        <a 
          href="https://github.com/ArthurLGX/eclipse-tracker-extension"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
        >
          {t('download_extension') || 'Télécharger l\'extension VS Code'}
          <IconExternalLink size={14} />
        </a>
      </div>
    </IntegrationCard>
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

      {/* API Tokens for VS Code Extension */}
      <ApiTokensSection />

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



