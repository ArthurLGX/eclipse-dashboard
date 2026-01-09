'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  IconSettings,
  IconBuildingStore,
  IconBell,
  IconShield,
  IconPalette,
  IconDeviceFloppy,
  IconRefresh,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ToggleButton from '@/app/components/ToggleButton';

interface AppSettings {
  general: {
    appName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    slackIntegration: boolean;
    webhookUrl: string;
  };
  security: {
    maxLoginAttempts: number;
    sessionTimeout: number;
    requireEmailConfirmation: boolean;
    twoFactorEnabled: boolean;
  };
  features: {
    chatbotEnabled: boolean;
    analyticsEnabled: boolean;
    betaFeatures: boolean;
  };
}

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    general: {
      appName: 'Eclipse Studio',
      supportEmail: 'support@eclipsestudio.dev',
      maintenanceMode: false,
      registrationEnabled: true,
    },
    notifications: {
      emailNotifications: true,
      slackIntegration: false,
      webhookUrl: '',
    },
    security: {
      maxLoginAttempts: 5,
      sessionTimeout: 60,
      requireEmailConfirmation: true,
      twoFactorEnabled: false,
    },
    features: {
      chatbotEnabled: true,
      analyticsEnabled: true,
      betaFeatures: false,
    },
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    showGlobalPopup(t('settings_saved') || 'Paramètres enregistrés avec succès', 'success');
    setSaving(false);
  };

  // Composant local pour les settings avec label et description
  const SettingToggle = ({
    enabled,
    onChange,
    label,
    description,
    variant = 'accent',
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 mr-4">
        <p className="font-medium text-primary">{label}</p>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <ToggleButton
        checked={enabled}
        onChange={onChange}
        variant={variant}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <IconSettings className="w-7 h-7 text-accent" />
            {t('configuration') || 'Configuration'}
          </h1>
          <p className="text-sm text-muted">{t('global_platform_settings') || 'Paramètres globaux de la plateforme'}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50"
        >
          {saving ? (
            <IconRefresh className="w-4 h-4 animate-spin" />
          ) : (
            <IconDeviceFloppy className="w-4 h-4" />
          )}
          {saving ? t('saving') || 'Enregistrement...' : t('save') || 'Enregistrer'}
        </button>
      </div>

      {/* Maintenance Mode Warning */}
      {settings.general.maintenanceMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-warning-light border border-warning/30 rounded-xl p-4 flex items-center gap-3"
        >
          <IconAlertTriangle className="w-6 h-6 text-warning" />
          <div>
            <p className="font-medium text-warning">{t('maintenance_mode_active') || 'Mode maintenance activé'}</p>
            <p className="text-sm text-muted">
              {t('users_cannot_access') || "Les utilisateurs ne peuvent pas accéder à l'application."}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconBuildingStore className="w-5 h-5 text-accent" />
            {t('general_settings') || 'Paramètres généraux'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('app_name') || "Nom de l'application"}
              </label>
              <input
                type="text"
                value={settings.general.appName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, appName: e.target.value },
                  })
                }
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('support_email') || 'Email de support'}
              </label>
              <input
                type="email"
                value={settings.general.supportEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, supportEmail: e.target.value },
                  })
                }
                className="input w-full"
              />
            </div>
            <div className="border-t border-muted pt-4">
              <SettingToggle
                enabled={settings.general.maintenanceMode}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, maintenanceMode: value },
                  })
                }
                label={t('maintenance_mode') || 'Mode maintenance'}
                description={t('disable_app_access') || "Désactive l'accès à l'application"}
                variant="warning"
              />
              <SettingToggle
                enabled={settings.general.registrationEnabled}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, registrationEnabled: value },
                  })
                }
                label={t('open_registration') || 'Inscription ouverte'}
                description={t('allow_new_users') || "Permet aux nouveaux utilisateurs de s'inscrire"}
                variant="success"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconShield className="w-5 h-5 text-accent" />
            {t('security') || 'Sécurité'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('max_login_attempts') || 'Tentatives de connexion max'}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.security.maxLoginAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      maxLoginAttempts: parseInt(e.target.value) || 5,
                    },
                  })
                }
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('session_timeout') || 'Timeout session (minutes)'}
              </label>
              <input
                type="number"
                min="5"
                max="1440"
                value={settings.security.sessionTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      sessionTimeout: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className="input w-full"
              />
            </div>
            <div className="border-t border-muted pt-4">
              <SettingToggle
                enabled={settings.security.requireEmailConfirmation}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, requireEmailConfirmation: value },
                  })
                }
                label={t('email_confirmation_required') || 'Confirmation email requise'}
                description={t('users_must_confirm_email') || 'Les utilisateurs doivent confirmer leur email'}
              />
              <SettingToggle
                enabled={settings.security.twoFactorEnabled}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, twoFactorEnabled: value },
                  })
                }
                label={t('fa_authentication') || 'Authentification 2FA'}
                description={t('enable_2fa') || "Activer l'authentification à deux facteurs"}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconBell className="w-5 h-5 text-accent" />
            {t('notifications') || 'Notifications'}
          </h2>
          <div className="space-y-4">
            <SettingToggle
              enabled={settings.notifications.emailNotifications}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, emailNotifications: value },
                })
              }
              label={t('email_notifications') || 'Notifications email'}
              description={t('send_important_events') || 'Envoyer des emails pour les événements importants'}
            />
            <SettingToggle
              enabled={settings.notifications.slackIntegration}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, slackIntegration: value },
                })
              }
              label={t('slack_integration') || 'Intégration Slack'}
              description={t('send_slack_notifications') || 'Envoyer des notifications sur Slack'}
            />
            {settings.notifications.slackIntegration && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('slack_webhook_url') || 'URL Webhook Slack'}
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/..."
                  value={settings.notifications.webhookUrl}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, webhookUrl: e.target.value },
                    })
                  }
                  className="input w-full"
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconPalette className="w-5 h-5 text-accent" />
            {t('features') || 'Fonctionnalités'}
          </h2>
          <div className="space-y-4">
            <SettingToggle
              enabled={settings.features.chatbotEnabled}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, chatbotEnabled: value },
                })
              }
              label={t('ai_chatbot') || 'Chatbot IA'}
              description={t('enable_ai_assistant') || "Activer l'assistant IA"}
            />
            <SettingToggle
              enabled={settings.features.analyticsEnabled}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, analyticsEnabled: value },
                })
              }
              label={t('analytics') || 'Analytics'}
              description={t('collect_usage_data') || "Collecter les données d'utilisation"}
            />
            <SettingToggle
              enabled={settings.features.betaFeatures}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, betaFeatures: value },
                })
              }
              label={t('beta_features') || 'Fonctionnalités Beta'}
              description={t('enable_dev_features') || 'Activer les features en cours de développement'}
              variant="warning"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-danger-light border border-danger/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-danger mb-4">{t('danger_zone') || 'Zone de danger'}</h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-danger-light text-danger rounded-lg hover:bg-danger-light transition-colors">
            {t('reset_settings') || 'Réinitialiser les paramètres'}
          </button>
          <button className="px-4 py-2 bg-danger-light text-danger rounded-lg hover:bg-danger-light transition-colors">
            {t('clear_cache') || 'Vider le cache'}
          </button>
          <button className="px-4 py-2 bg-danger-light text-danger rounded-lg hover:bg-danger-light transition-colors">
            {t('export_data') || 'Exporter les données'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
