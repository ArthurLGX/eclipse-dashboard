'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  IconKey
} from '@tabler/icons-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePopup } from '../context/PopupContext';
import { fetchSmtpConfig, saveSmtpConfig, deleteSmtpConfig, testSmtpConnection } from '@/lib/api';
import type { SmtpConfig, CreateSmtpConfigData } from '@/types';

export default function SmtpConfigSection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [existingConfig, setExistingConfig] = useState<SmtpConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateSmtpConfigData>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: false,
    smtp_from_name: '',
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
        });
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
  };

  // Test connection
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

      // Passer is_verified basé sur le résultat du test
      const isVerified = testResult?.success === true;
      await saveSmtpConfig(user.id, dataToSave as CreateSmtpConfigData, isVerified);
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de suppression';
      showGlobalPopup(message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="w-8 h-8 animate-spin text-accent" />
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
            <IconMail className="w-5 h-5 text-accent" />
            {t('smtp_config_title') || 'Configuration SMTP'}
          </h3>
          <p className="text-sm text-secondary mt-1">
            {t('smtp_config_description') || 'Configurez votre serveur SMTP pour envoyer des newsletters depuis votre propre adresse email.'}
          </p>
        </div>
        {existingConfig && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            existingConfig.is_verified 
              ? 'bg-success/10 text-success' 
              : 'bg-warning/10 text-warning'
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
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-card border-default text-secondary hover:border-accent/50'
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
              <IconKey className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm !font-bold text-warning font-medium mb-1">
                  {t('smtp_app_password_title') || 'Mot de passe d\'application requis'}
                </p>
                <p className="text-xs text-warning mb-4">
                  {t('smtp_app_password_desc') || 'Pour des raisons de sécurité, la plupart des fournisseurs exigent un mot de passe d\'application au lieu de votre mot de passe habituel.'}
                </p>
                <a
                  href={presets.find(p => p.host === formData.smtp_host)?.appPasswordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex btn-outline transition-all ease-in-out duration-300 items-center gap-1.5 text-sm text-warning underline hover:underline font-medium"
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
              className="input w-full pr-10"
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
            : 'bg-danger/10 border border-danger/20'
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

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-default">
        {existingConfig && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
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

