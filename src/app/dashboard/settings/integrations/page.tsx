'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { 
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
  IconClock,
  IconCircleCheck,
  IconCircleDashed
} from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';
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
    active: 'bg-success-lighttext-success-light',
    inactive: 'bg-muted text-secondary',
    pending: 'bg-warning-lighttext-warning-light',
  };

  const statusLabels = {
    active: t('integration_active') || 'Actif',
    inactive: t('integration_inactive') || 'Inactif',
    pending: t('integration_pending') || 'En attente',
  };

  return (
    <div className="bg-card border border-default rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-light rounded-lg !text-accent">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-primary">{title}</h3>
            <p className="text-sm text-muted">{description}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <div className="pt-4 border-t border-default">
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
      <label className="text-xs font-medium text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-muted border border-default rounded-lg text-sm font-mono truncate text-primary">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-hover rounded-lg transition-colors text-secondary"
          title={t('copy') || 'Copier'}
        >
          {copied ? <IconCheck size={18} className="text-success" /> : <IconCopy size={18} />}
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
      icon={<IconKey size={24} className="text-primary" />}
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
              className="bg-success-light border border-success rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-mediumtext-success-light">
                  {t('token_created_title') || '✅ Token créé avec succès'}
                </h4>
                <button
                  onClick={() => setNewlyCreatedToken(null)}
                  className="text-success hover:text-primary transition-colors"
                >
                  ×
                </button>
              </div>
              <p className="text-smtext-success-light">
                {t('token_created_warning') || 'Copiez ce token maintenant. Il ne sera plus affiché !'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-card rounded-lg text-sm font-mono break-all text-primary">
                  {showToken ? newlyCreatedToken : '•'.repeat(40)}
                </code>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 hover:bg-hover rounded-lg transition-colors text-secondary"
                >
                  {showToken ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
                <button
                  onClick={() => handleCopyToken(newlyCreatedToken)}
                  className="p-2 hover:bg-hover rounded-lg transition-colors text-secondary"
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
            className="w-full p-3 border-2 border-dashed border-default rounded-lg text-muted hover:!border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
          >
            <IconPlus size={18} />
            {t('create_api_token') || 'Générer un nouveau token'}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-muted border border-default rounded-lg space-y-3"
          >
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder={t('token_name_placeholder') || 'Ex: VS Code - MacBook Pro'}
              className="w-full px-3 py-2 bg-card border border-default rounded-lg text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateToken}
                disabled={creating || !newTokenName.trim()}
                className="flex-1 px-4 py-2 bg-accenttext-accent rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {creating ? (t('creating') || 'Création...') : (t('create') || 'Créer')}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTokenName('');
                }}
                className="px-4 py-2 text-muted hover:text-primary transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Liste des tokens */}
        {loading ? (
          <div className="text-center py-4 text-muted">
            {t('loading') || 'Chargement...'}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-4 text-muted">
            {t('no_api_tokens') || 'Aucun token API'}
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-muted border border-default rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary truncate">{token.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted">
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
                  className="p-2 text-muted hover:text-danger transition-colors"
                  title={t('revoke_token') || 'Révoquer'}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-info-light border border-info rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-info">
            {t('api_token_usage') || 'Comment utiliser ?'}
          </h4>
          <ol className="text-sm text-info space-y-1 list-decimal list-inside">
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
          className="inline-flex items-center gap-2 text-sm !text-accent hover:underline"
        >
          {t('download_extension') || 'Télécharger l\'extension VS Code'}
          <IconExternalLink size={14} />
        </a>
      </div>
    </IntegrationCard>
  );
}

function GoogleIntegrationCard() {
  const { t } = useLanguage();
  const { user, authenticated } = useAuth();
  
  // L'utilisateur est connecté s'il est sur cette page
  const isAuthenticated = authenticated && user;
  
  return (
    <IntegrationCard
      title="Google"
      description={t('google_description') || 'Connexion Google et import Google Sheets'}
      icon={<Image src="/images/google-icon.png" alt="Google" width={24} height={24} />}
      status={isAuthenticated ? 'active' : 'inactive'}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted border border-default rounded-lg">
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <IconCircleCheck size={20} className="text-success flex-shrink-0" />
            ) : (
              <IconCircleDashed size={20} className="text-muted flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-primary">{t('google_login') || 'Connexion Google'}</p>
              <p className="text-sm text-muted">{t('google_login_desc') || 'Se connecter avec votre compte Google'}</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            isAuthenticated 
              ? 'bg-success-light text-success' 
              : 'bg-muted text-secondary'
          }`}>
            {isAuthenticated ? (t('integration_available') || 'Disponible') : (t('integration_not_configured') || 'Non configuré')}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted border border-default rounded-lg">
          <div className="flex items-center gap-3">
            <IconCircleCheck size={20} className="text-success flex-shrink-0" />
            <div>
              <p className="font-medium text-primary">{t('google_sheets') || 'Google Sheets'}</p>
              <p className="text-sm text-muted">{t('google_sheets_desc') || 'Importer des tâches depuis Google Sheets'}</p>
            </div>
          </div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-light text-success">
            {t('integration_available') || 'Disponible'}
          </span>
        </div>
        
        <p className="text-xs text-muted">
          {t('google_integration_note') || 'L\'import Google Sheets est disponible dans les pages Projets et Clients.'}
        </p>
      </div>
    </IntegrationCard>
  );
}

function TypeformIntegrationCard() {
  const { t } = useLanguage();
  const { resolvedMode } = useTheme();
  const typeformWebhookUrl = `${STRAPI_URL}/api/prospects/typeform-webhook`;
  
  // Le webhook est toujours disponible, mais on vérifie s'il a été utilisé
  // Pour l'instant on affiche "Disponible" car on n'a pas de moyen de vérifier
  
  const typeformLogo = resolvedMode === 'dark'
    ? '/images/typeform-icon-dark.svg' 
    : '/images/typeform-icon-light.svg';
  
  return (
    <IntegrationCard
      title="Typeform"
      description={t('typeform_description') || 'Recevez automatiquement les prospects depuis vos formulaires Typeform'}
      icon={<Image src={typeformLogo} alt="Typeform" width={24} height={24} />}
      status="active"
    >
      <div className="space-y-4">
        <CopyableField 
          label={t('webhook_url') || 'URL du Webhook'}
          value={typeformWebhookUrl}
        />
        
        <div className="bg-info-light border border-info rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-info">
            {t('typeform_setup_title') || 'Comment configurer ?'}
          </h4>
          <ol className="text-sm text-info space-y-1 list-decimal list-inside">
            <li>{t('typeform_step_1') || 'Ouvrez votre formulaire Typeform'}</li>
            <li>{t('typeform_step_2') || 'Allez dans Connect → Webhooks'}</li>
            <li>{t('typeform_step_3') || 'Cliquez sur "Add a webhook"'}</li>
            <li>{t('typeform_step_4') || 'Collez l\'URL du webhook ci-dessus'}</li>
            <li>{t('typeform_step_5') || 'Activez le webhook'}</li>
          </ol>
        </div>

        <div className="bg-warning-light border border-warning rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-warning">
            {t('typeform_mapping_title') || 'Mappage des champs'}
          </h4>
          <p className="text-sm text-warning">
            {t('typeform_mapping_description') || 'Pour un mappage automatique optimal, nommez vos champs Typeform avec ces références :'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <code className="px-2 py-1 bg-card rounded text-primary">nom, name, full_name</code>
            <span className="text-warning">→ Nom du prospect</span>
            <code className="px-2 py-1 bg-card rounded text-primary">email, mail</code>
            <span className="text-warning">→ Email</span>
            <code className="px-2 py-1 bg-card rounded text-primary">telephone, phone</code>
            <span className="text-warning">→ Téléphone</span>
            <code className="px-2 py-1 bg-card rounded text-primary">entreprise, company</code>
            <span className="text-warning">→ Entreprise</span>
            <code className="px-2 py-1 bg-card rounded text-primary">budget</code>
            <span className="text-warning">→ Budget estimé</span>
            <code className="px-2 py-1 bg-card rounded text-primary">projet, description</code>
            <span className="text-warning">→ Description</span>
          </div>
        </div>

        <a 
          href="https://www.typeform.com/help/a/webhooks-360029573471/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm !text-accent hover:underline"
        >
          {t('typeform_docs') || 'Documentation Typeform Webhooks'}
          <IconExternalLink size={14} />
        </a>
      </div>
    </IntegrationCard>
  );
}

export default function IntegrationsPage() {
  const { t } = useLanguage();
  

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/settings"
          className="p-2 hover:bg-hover rounded-lg transition-colors text-secondary"
        >
          <IconArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {t('integrations') || 'Intégrations'}
          </h1>
          <p className="text-sm text-muted">
            {t('integrations_description') || 'Connectez vos outils externes'}
          </p>
        </div>
      </div>

      {/* API Tokens for VS Code Extension - First for visibility */}
      <ApiTokensSection />

      {/* Typeform Integration */}
      <TypeformIntegrationCard />

      {/* Google Integration */}
      <GoogleIntegrationCard />

      {/* Future integrations */}
      <div className="text-center py-8">
        <IconSettings size={48} className="mx-auto text-muted mb-4" />
        <p className="text-muted">
          {t('more_integrations_coming') || 'Plus d\'intégrations bientôt...'}
        </p>
        <p className="text-sm text-muted">
          Stripe, Slack, Notion, etc.
        </p>
      </div>
    </div>
  );
}
