'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconMail, 
  IconServer, 
  IconLock, 
  IconCheck, 
  IconX,
  IconLoader2,
  IconInfoCircle,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconPlugConnected,
  IconExternalLink,
  IconKey,
  IconInbox,
  IconChevronDown,
  IconChevronUp,
  IconMessageCircle,
} from '@tabler/icons-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePopup } from '../context/PopupContext';
import { fetchSmtpConfig, saveSmtpConfig, deleteSmtpConfig, testSmtpConnection, testImapConnection } from '@/lib/api';
import type { SmtpConfig, CreateSmtpConfigData } from '@/types';

export default function SmtpConfigSection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [existingConfig, setExistingConfig] = useState<SmtpConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imapTestResult, setImapTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showImapConfig, setShowImapConfig] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSmtpConfigData>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: false,
    smtp_from_name: '',
    // IMAP fields
    imap_enabled: false,
    imap_host: '',
    imap_port: 993,
    imap_user: '',
    imap_password: '',
    imap_secure: true,
  });

  // Preset configurations with app password help links
  const presets = [
    { 
      name: 'Gmail', 
      host: 'smtp.gmail.com', 
      port: 587, 
      secure: false,
      appPasswordUrl: 'https://myaccount.google.com/apppasswords',
      appPasswordLabel: 'Créer un mot de passe d\'application Google'
    },
    { 
      name: 'Outlook', 
      host: 'smtp-mail.outlook.com', 
      port: 587, 
      secure: false,
      appPasswordUrl: 'https://account.live.com/proofs/AppPassword',
      appPasswordLabel: 'Créer un mot de passe d\'application Microsoft'
    },
    { 
      name: 'Yahoo', 
      host: 'smtp.mail.yahoo.com', 
      port: 587, 
      secure: false,
      appPasswordUrl: 'https://login.yahoo.com/account/security/app-passwords',
      appPasswordLabel: 'Créer un mot de passe d\'application Yahoo'
    },
    { 
      name: 'OVH', 
      host: 'ssl0.ovh.net', 
      port: 465, 
      secure: true,
      appPasswordUrl: 'https://www.ovh.com/manager/',
      appPasswordLabel: 'Accéder à l\'espace client OVH'
    },
    { 
      name: 'Ionos', 
      host: 'smtp.ionos.fr', 
      port: 587, 
      secure: false,
      appPasswordUrl: 'https://my.ionos.fr/',
      appPasswordLabel: 'Accéder à l\'espace client Ionos'
    },
    { 
      name: 'Hostinger', 
      host: 'smtp.hostinger.com', 
      port: 587, 
      secure: false,
      appPasswordUrl: 'https://hpanel.hostinger.com/',
      appPasswordLabel: 'Accéder au panel Hostinger'
    },
  ];

  // Load existing config
  const loadConfig = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const config = await fetchSmtpConfig(user.id);
      if (config) {
        setExistingConfig(config);
        setFormData({
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_user: config.smtp_user,
          smtp_password: '', // Ne pas exposer le mot de passe
          smtp_secure: config.smtp_secure,
          smtp_from_name: config.smtp_from_name || '',
          // IMAP fields
          imap_enabled: config.imap_enabled || false,
          imap_host: config.imap_host || '',
          imap_port: config.imap_port || 993,
          imap_user: config.imap_user || '',
          imap_password: '', // Ne pas exposer le mot de passe
          imap_secure: config.imap_secure !== false,
        });
        // Show IMAP section if already enabled
        if (config.imap_enabled) {
          setShowImapConfig(true);
        }
      }
    } catch (error) {
      console.error('Error loading SMTP config:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Apply preset
  const applyPreset = (preset: typeof presets[0]) => {
    setFormData(prev => ({
      ...prev,
      smtp_host: preset.host,
      smtp_port: preset.port,
      smtp_secure: preset.secure,
    }));
  };

  // Handle form change
  const handleChange = (field: keyof CreateSmtpConfigData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
    // Clear IMAP test result if IMAP fields change
    if (field.startsWith('imap_')) {
      setImapTestResult(null);
    }
  };

  // Test SMTP connection
  const handleTest = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      showGlobalPopup(t('smtp_fill_all_fields') || 'Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testSmtpConnection(formData);
      setTestResult(result);
      
      if (result.success) {
        showGlobalPopup(result.message, 'success');
      } else {
        showGlobalPopup(result.message, 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de test';
      setTestResult({ success: false, message });
      showGlobalPopup(message, 'error');
    } finally {
      setTesting(false);
    }
  };

  // Test IMAP connection
  const handleTestImap = async () => {
    const imapHost = formData.imap_host || '';
    const imapUser = formData.imap_user || formData.smtp_user;
    // For password: use IMAP password if provided, otherwise use SMTP password if provided
    // If editing existing config and no new password entered, we need at least one password
    const imapPassword = formData.imap_password || formData.smtp_password;

    if (!imapHost) {
      showGlobalPopup(t('imap_host_required') || 'Le serveur IMAP est obligatoire', 'warning');
      return;
    }

    if (!imapUser) {
      showGlobalPopup(t('imap_user_required') || 'L\'email IMAP est obligatoire (ou configurez d\'abord votre SMTP)', 'warning');
      return;
    }

    // If no password provided and we have an existing config, tell user to enter password for testing
    if (!imapPassword) {
      if (existingConfig) {
        showGlobalPopup(
          t('imap_password_required_for_test') || 'Pour tester, veuillez saisir le mot de passe IMAP ou SMTP (il ne sera pas réenregistré si vous ne sauvegardez pas)', 
          'warning'
        );
      } else {
        showGlobalPopup(t('imap_password_required') || 'Le mot de passe est obligatoire', 'warning');
      }
      return;
    }

    setTestingImap(true);
    setImapTestResult(null);

    try {
      const result = await testImapConnection({
        imap_host: imapHost,
        imap_port: formData.imap_port || 993,
        imap_user: imapUser,
        imap_password: imapPassword,
        imap_secure: formData.imap_secure !== false,
      });
      setImapTestResult(result);
      
      if (result.success) {
        showGlobalPopup(result.message, 'success');
      } else {
        showGlobalPopup(result.message, 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de test IMAP';
      setImapTestResult({ success: false, message });
      showGlobalPopup(message, 'error');
    } finally {
      setTestingImap(false);
    }
  };

  // Save configuration
  const handleSave = async () => {
    if (!user?.id) return;

    if (!formData.smtp_host || !formData.smtp_user) {
      showGlobalPopup(t('smtp_fill_all_fields') || 'Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }

    // Require password for new config or if changed
    if (!existingConfig && !formData.smtp_password) {
      showGlobalPopup(t('smtp_password_required') || 'Le mot de passe est requis', 'warning');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };
      // If editing and password is empty, don't send it (keep existing)
      if (existingConfig && !formData.smtp_password) {
        delete (dataToSave as Partial<CreateSmtpConfigData>).smtp_password;
      }
      // If editing and IMAP password is empty, don't send it (keep existing)
      if (existingConfig && !formData.imap_password) {
        delete (dataToSave as Partial<CreateSmtpConfigData>).imap_password;
      }

      // Passer is_verified basé sur le résultat du test
      const isVerified = testResult?.success === true;
      // Passer imap_verified basé sur le résultat du test IMAP (seulement si IMAP activé)
      const imapVerified = formData.imap_enabled && imapTestResult?.success === true;
      await saveSmtpConfig(user.id, dataToSave as CreateSmtpConfigData, isVerified, imapVerified);
      showGlobalPopup(t('smtp_saved_success') || 'Configuration SMTP enregistrée', 'success');
      await loadConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de sauvegarde';
      showGlobalPopup(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete configuration
  const handleDelete = async () => {
    if (!existingConfig) return;

    if (!confirm(t('smtp_delete_confirm') || 'Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      return;
    }

    try {
      await deleteSmtpConfig(existingConfig.documentId);
      showGlobalPopup(t('smtp_deleted_success') || 'Configuration SMTP supprimée', 'success');
      setExistingConfig(null);
      setFormData({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        smtp_secure: false,
        smtp_from_name: '',
        imap_enabled: false,
        imap_host: '',
        imap_port: 993,
        imap_user: '',
        imap_password: '',
        imap_secure: true,
      });
      setShowImapConfig(false);
      setImapTestResult(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de suppression';
      showGlobalPopup(message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="w-8 h-8 animate-spin !text-accent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <IconMail className="w-5 h-5 !text-accent" />
            {t('smtp_config_title') || 'Configuration SMTP'}
          </h3>
          <p className="text-sm text-secondary mt-1">
            {t('smtp_config_description') || 'Configurez votre serveur SMTP pour envoyer des newsletters depuis votre propre adresse email.'}
          </p>
        </div>
        {existingConfig && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            existingConfig.is_verified 
              ? 'bg-success-light !text-success-text ' 
              : 'bg-warning-light text-warning'
          }`}>
            {existingConfig.is_verified ? (
              <>
                <IconCheck className="w-4 h-4" />
                {t('smtp_verified') || 'Vérifié'}
              </>
            ) : (
              <>
                <IconInfoCircle className="w-4 h-4" />
                {t('smtp_not_verified') || 'Non vérifié'}
              </>
            )}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-info-light border border-info">
        <div className="flex gap-3">
          <IconInfoCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
          <div className="text-sm text-secondary space-y-2">
            <p>{t('smtp_info_1') || 'Les newsletters seront envoyées depuis votre adresse email personnelle.'}</p>
            <p>{t('smtp_info_2') || 'Pour Gmail, vous devez créer un "mot de passe d\'application" dans les paramètres de sécurité de votre compte Google.'}</p>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-primary">
          {t('smtp_presets') || 'Configurations prédéfinies'}
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                formData.smtp_host === preset.host
                  ? 'bg-accent-light border-accent !text-accent'
                  : 'bg-card border-default text-secondary hover:border-accent'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        
        {/* App Password Help Link - Only show if no existing config */}
        {!existingConfig && presets.find(p => p.host === formData.smtp_host) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 rounded-lg bg-warning-light border border-warning"
          >
            <div className="flex items-start gap-3">
              <IconKey className="w-5 h-5 text-warning-text flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm !font-bold text-warning-text font-medium mb-1">
                  {t('smtp_app_password_title') || 'Mot de passe d\'application requis'}
                </p>
                <p className="text-xs text-warning-text mb-4">
                  {t('smtp_app_password_desc') || 'Pour des raisons de sécurité, la plupart des fournisseurs exigent un mot de passe d\'application au lieu de votre mot de passe habituel.'}
                </p>
                <a
                  href={presets.find(p => p.host === formData.smtp_host)?.appPasswordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex btn-outline transition-all ease-in-out duration-300 items-center gap-1.5 text-sm text-warning-text underline hover:underline font-medium"
                >
                  <IconExternalLink className="w-4 h-4" />
                  {presets.find(p => p.host === formData.smtp_host)?.appPasswordLabel}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SMTP Host */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <IconServer className="w-4 h-4 text-secondary" />
            {t('smtp_host') || 'Serveur SMTP'} *
          </label>
          <input
            type="text"
            value={formData.smtp_host}
            onChange={(e) => handleChange('smtp_host', e.target.value)}
            placeholder="smtp.gmail.com"
            className="input w-full"
          />
        </div>

        {/* SMTP Port */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">
            {t('smtp_port') || 'Port'} *
          </label>
          <input
            type="number"
            value={formData.smtp_port}
            onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 587)}
            placeholder="587"
            className="input w-full"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <IconMail className="w-4 h-4 text-secondary" />
            {t('smtp_email') || 'Email'} *
          </label>
          <input
            type="email"
            value={formData.smtp_user}
            onChange={(e) => handleChange('smtp_user', e.target.value)}
            placeholder="votre@email.com"
            className="input w-full"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <IconLock className="w-4 h-4 text-secondary" />
            {t('smtp_password') || 'Mot de passe'} {!existingConfig && '*'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.smtp_password}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              placeholder={existingConfig ? '••••••••' : 'Mot de passe ou app password'}
              className="input w-full !pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
            >
              {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
            </button>
          </div>
          {existingConfig && (
            <p className="text-xs text-secondary">
              {t('smtp_password_hint') || 'Laissez vide pour conserver le mot de passe actuel'}
            </p>
          )}
        </div>

        {/* From Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">
            {t('smtp_from_name') || 'Nom d\'expéditeur'}
          </label>
          <input
            type="text"
            value={formData.smtp_from_name}
            onChange={(e) => handleChange('smtp_from_name', e.target.value)}
            placeholder="Mon Entreprise"
            className="input w-full"
          />
          <p className="text-xs text-secondary">
            {t('smtp_from_name_hint') || 'Le nom qui apparaîtra comme expéditeur'}
          </p>
        </div>

        {/* Secure */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">
            {t('smtp_security') || 'Sécurité'}
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!formData.smtp_secure}
                onChange={() => handleChange('smtp_secure', false)}
                className="accent-accent"
              />
              <span className="text-sm text-primary">STARTTLS (Port 587)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.smtp_secure}
                onChange={() => handleChange('smtp_secure', true)}
                className="accent-accent"
              />
              <span className="text-sm text-primary">SSL/TLS (Port 465)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          testResult.success 
            ? 'bg-emerald-300/80 !text-white border border-success' 
            : 'bg-danger-light border border-danger'
        }`}>
          {testResult.success ? (
            <IconCheck className="w-5 h-5 !text-emerald-900" />
          ) : (
            <IconX className="w-5 h-5 text-danger" />
          )}
          <p className={`text-sm ${testResult.success ? '!text-emerald-900' : 'text-danger'}`}>
            {testResult.message}
          </p>
        </div>
      )}

      {/* IMAP Configuration Section */}
      <div className="border-t border-default pt-6 mt-6">
        <button
          type="button"
          onClick={() => setShowImapConfig(!showImapConfig)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary hover:bg-secondary hover:opacity-80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <IconMessageCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-primary">
                {t('imap_config_title') || 'Détection des réponses (IMAP)'}
              </h4>
              <p className="text-sm text-secondary">
                {t('imap_config_description') || 'Activez pour suivre les réponses à vos emails dans les analytics'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {existingConfig?.imap_verified && (
              <span className="px-2 py-1 rounded-full bg-success-light !text-success-text -text text-xs flex items-center gap-1">
                <IconCheck className="w-3 h-3" />
                {t('verified') || 'Vérifié'}
              </span>
            )}
            {showImapConfig ? (
              <IconChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <IconChevronDown className="w-5 h-5 text-muted" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showImapConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 space-y-4">
                {/* IMAP Info */}
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <div className="flex gap-3">
                    <IconInbox className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-secondary space-y-2">
                      <p>{t('imap_info_1') || 'IMAP permet de scanner votre boîte de réception pour détecter les réponses à vos emails.'}</p>
                      <p>{t('imap_info_2') || 'Les réponses détectées apparaîtront dans la page Analytics de vos emails.'}</p>
                    </div>
                  </div>
                </div>

                {/* Enable IMAP Toggle */}
                <div className="flex items-center justify-between p-4 bg-secondary hover:opacity-80 transition-colors rounded-xl">
                  <div>
                    <h5 className="font-medium text-primary">
                      {t('enable_imap') || 'Activer la détection des réponses'}
                    </h5>
                    <p className="text-sm text-secondary">
                      {t('enable_imap_desc') || 'Scanne automatiquement votre boîte mail pour les réponses'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('imap_enabled', !formData.imap_enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.imap_enabled ? 'bg-purple-500' : 'bg-secondary'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.imap_enabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* IMAP Fields (shown only if enabled) */}
                {formData.imap_enabled && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Use same credentials option */}
                    <div className="p-3 bg-info-light rounded-lg border border-info text-sm text-secondary">
                      <p>{existingConfig 
                        ? (t('imap_existing_config_hint') || 'Pour tester la connexion, vous devez re-saisir le mot de passe (SMTP ou IMAP). À l\'enregistrement, les mots de passe vides seront conservés.')
                        : (t('imap_same_credentials_hint') || 'Astuce: Si vous utilisez le même compte email, vous pouvez laisser les champs email et mot de passe vides pour utiliser ceux du SMTP.')
                      }</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* IMAP Host */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary flex items-center gap-2">
                          <IconServer className="w-4 h-4 text-secondary" />
                          {t('imap_host') || 'Serveur IMAP'} *
                        </label>
                        <input
                          type="text"
                          value={formData.imap_host || ''}
                          onChange={(e) => handleChange('imap_host', e.target.value)}
                          placeholder="imap.gmail.com"
                          className="input w-full"
                        />
                        <p className="text-xs text-muted">
                          {t('imap_host_hint') || 'Gmail: imap.gmail.com, Outlook: outlook.office365.com'}
                        </p>
                      </div>

                      {/* IMAP Port */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary">
                          {t('imap_port') || 'Port IMAP'}
                        </label>
                        <input
                          type="number"
                          value={formData.imap_port || 993}
                          onChange={(e) => handleChange('imap_port', parseInt(e.target.value) || 993)}
                          placeholder="993"
                          className="input w-full"
                        />
                      </div>

                      {/* IMAP User */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary flex items-center gap-2">
                          <IconMail className="w-4 h-4 text-secondary" />
                          {t('imap_email') || 'Email IMAP'}
                        </label>
                        <input
                          type="email"
                          value={formData.imap_user || ''}
                          onChange={(e) => handleChange('imap_user', e.target.value)}
                          placeholder={formData.smtp_user || 'votre@email.com'}
                          className="input w-full"
                        />
                        <p className="text-xs text-muted">
                          {t('imap_user_hint') || 'Laissez vide pour utiliser l\'email SMTP'}
                        </p>
                      </div>

                      {/* IMAP Password */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary flex items-center gap-2">
                          <IconLock className="w-4 h-4 text-secondary" />
                          {t('imap_password') || 'Mot de passe IMAP'}
                        </label>
                        <div className="relative">
                          <input
                            type={showImapPassword ? 'text' : 'password'}
                            value={formData.imap_password || ''}
                            onChange={(e) => handleChange('imap_password', e.target.value)}
                            placeholder={existingConfig?.imap_enabled ? '••••••••' : 'App password'}
                            className="input w-full !pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowImapPassword(!showImapPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                          >
                            {showImapPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted">
                          {t('imap_password_hint') || 'Laissez vide pour utiliser le mot de passe SMTP'}
                        </p>
                      </div>
                    </div>

                    {/* IMAP Security */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-primary">
                        {t('imap_security') || 'Sécurité IMAP'}
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={formData.imap_secure !== false}
                            onChange={() => handleChange('imap_secure', true)}
                            className="accent-purple-500"
                          />
                          <span className="text-sm text-primary">SSL/TLS (Port 993)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={formData.imap_secure === false}
                            onChange={() => handleChange('imap_secure', false)}
                            className="accent-purple-500"
                          />
                          <span className="text-sm text-primary">STARTTLS (Port 143)</span>
                        </label>
                      </div>
                    </div>

                    {/* IMAP Test Result */}
                    {imapTestResult && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 ${
                        imapTestResult.success 
                          ? 'bg-purple-300/80 !text-white border border-purple-500' 
                          : 'bg-danger-light border border-danger'
                      }`}>
                        {imapTestResult.success ? (
                          <IconCheck className="w-5 h-5 !text-purple-900" />
                        ) : (
                          <IconX className="w-5 h-5 text-danger" />
                        )}
                        <p className={`text-sm ${imapTestResult.success ? '!text-purple-900' : 'text-danger'}`}>
                          {imapTestResult.message}
                        </p>
                      </div>
                    )}

                    {/* Test IMAP Button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleTestImap}
                        disabled={testingImap || !formData.imap_host}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testingImap ? (
                          <IconLoader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <IconPlugConnected className="w-4 h-4 text-primary" />
                        )}
                        {t('imap_test') || 'Tester la connexion IMAP'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-default">
        {existingConfig && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-danger hover:bg-danger-light transition-colors"
          >
            <IconTrash className="w-4 h-4" />
            {t('delete') || 'Supprimer'}
          </button>
        )}
        
        <div className="flex-1" />

        <button
          onClick={handleTest}
          disabled={testing || !formData.smtp_host || !formData.smtp_user || !formData.smtp_password}
          className="flex items-center gap-2 px-4 py-2 rounded-lg btn-outline border border-default disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? (
            <IconLoader2 className="w-4 h-4 animate-spin" />
          ) : (
            <IconPlugConnected className="w-4 h-4" />
          )}
          {t('smtp_test') || 'Tester la connexion'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !formData.smtp_host || !formData.smtp_user}
          className="flex items-center gap-2 px-6 py-2 rounded-lg btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <IconLoader2 className="w-4 h-4 animate-spin" />
          ) : (
            <IconCheck className="w-4 h-4" />
          )}
          {t('save') || 'Enregistrer'}
        </button>
      </div>
    </motion.div>
  );
}

