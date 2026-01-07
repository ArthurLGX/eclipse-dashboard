'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  IconBrain,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLoader2,
  IconAlertCircle,
  IconChevronRight,
  IconCalendar,
  IconWebhook,
  IconPlayerPlay,
  IconSettings,
  IconNotes,
  IconArrowLeft,
} from '@tabler/icons-react';
import Link from 'next/link';

interface FathomConfig {
  webhook_secret: string;
  api_key: string;
  auto_join: boolean;
  include_transcript: boolean;
  include_summary: boolean;
  include_action_items: boolean;
}

interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
  externalLink?: string;
}

export default function MeetingIntegrationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTutorial, setShowTutorial] = useState(true);
  
  const [config, setConfig] = useState<FathomConfig>({
    webhook_secret: '',
    api_key: '',
    auto_join: true,
    include_transcript: true,
    include_summary: true,
    include_action_items: true,
  });

  // Webhook URL personnalisée pour l'utilisateur
  const webhookUrl = typeof window !== 'undefined' && user?.id
    ? `${window.location.origin}/api/webhooks/fathom/${user.id}`
    : '';

  // Charger la config existante
  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/integrations/fathom?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setConfig(data.config);
            setIsConnected(data.connected);
            setShowTutorial(!data.connected);
            // Déterminer l'étape actuelle basée sur la config
            if (data.config.api_key) setCurrentStep(2);
            if (data.config.webhook_secret) setCurrentStep(3);
            if (data.connected) setCurrentStep(4);
          }
        }
      } catch (error) {
        console.error('Error loading Fathom config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user?.id]);

  // Sauvegarder la config
  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/fathom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          config,
        }),
      });

      if (response.ok) {
        showGlobalPopup('Configuration sauvegardée !', 'success');
        if (config.api_key && currentStep === 1) setCurrentStep(2);
        if (config.webhook_secret && currentStep === 2) setCurrentStep(3);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showGlobalPopup('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Tester la connexion
  const handleTest = async () => {
    if (!user?.id) return;
    
    setTesting(true);
    try {
      const response = await fetch(`/api/webhooks/fathom/${user.id}`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setIsConnected(true);
        setCurrentStep(4);
        showGlobalPopup('Connexion réussie ! Le webhook est prêt.', 'success');
      } else {
        showGlobalPopup('Erreur de connexion au webhook', 'error');
      }
    } catch (error) {
      console.error('Test error:', error);
      showGlobalPopup('Erreur lors du test', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Copier dans le presse-papier
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showGlobalPopup(`${label} copié !`, 'success');
  };

  // Étapes du tutoriel
  const steps: SetupStep[] = [
    {
      id: 1,
      title: t('fathom_step1_title') || 'Créer un compte Fathom',
      description: t('fathom_step1_desc') || 'Inscrivez-vous sur Fathom AI et obtenez votre clé API dans les paramètres.',
      completed: !!config.api_key,
      externalLink: 'https://fathom.video/settings/api',
      actionLabel: t('open_fathom') || 'Ouvrir Fathom',
    },
    {
      id: 2,
      title: t('fathom_step2_title') || 'Configurer le webhook',
      description: t('fathom_step2_desc') || 'Dans Fathom, ajoutez un webhook avec l\'URL ci-dessous et copiez le secret généré.',
      completed: !!config.webhook_secret,
      externalLink: 'https://fathom.video/settings/api',
      actionLabel: t('configure_webhook') || 'Configurer webhook',
    },
    {
      id: 3,
      title: t('fathom_step3_title') || 'Tester la connexion',
      description: t('fathom_step3_desc') || 'Vérifiez que le webhook fonctionne correctement.',
      completed: isConnected,
      action: handleTest,
      actionLabel: t('test_connection') || 'Tester',
    },
    {
      id: 4,
      title: t('fathom_step4_title') || 'Prêt !',
      description: t('fathom_step4_desc') || 'Fathom enverra automatiquement les notes de vos réunions.',
      completed: isConnected,
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[400px]">
          <IconLoader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4 pb-4">
          <Link
            href="/dashboard/settings"
            className="p-2 rounded-lg hover:bg-hover transition-colors"
          >
            <IconArrowLeft className="w-5 h-5 text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconBrain className="w-7 h-7 text-accent" />
              {t('fathom_ai') || 'Fathom AI - Notes de réunion'}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('meeting_integrations_desc') || 'Configurez Fathom pour recevoir automatiquement les transcriptions et résumés de vos réunions'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-success-light text-success' 
            : 'bg-warning-light text-warning'
        }`}>
          {isConnected ? (
            <>
              <IconCheck className="w-4 h-4" />
              {t('fathom_connected') || 'Connecté et actif'}
            </>
          ) : (
            <>
              <IconAlertCircle className="w-4 h-4" />
              {t('fathom_not_configured') || 'Non configuré'}
            </>
          )}
        </div>

        {/* Tutorial Steps */}
        {showTutorial && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
              <IconSettings className="w-5 h-5 text-accent" />
              {t('setup_guide') || 'Guide de configuration'}
            </h2>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    currentStep === step.id
                      ? 'border-accent bg-accent/5'
                      : step.completed
                      ? 'border-success/30 bg-success/5'
                      : 'border-default bg-hover'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Step Number */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed
                        ? 'bg-success text-white'
                        : currentStep === step.id
                        ? 'bg-accent text-white'
                        : 'bg-muted text-secondary'
                    }`}>
                      {step.completed ? (
                        <IconCheck className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        step.completed ? 'text-success' : 'text-primary'
                      }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {step.description}
                      </p>

                      {/* Step 1: API Key */}
                      {step.id === 1 && currentStep >= 1 && (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="text-sm text-secondary block mb-1">
                              Clé API Fathom
                            </label>
                            <input
                              type="password"
                              value={config.api_key}
                              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                              placeholder="fathom_xxxxxxxxxxxxx"
                              className="w-full input px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Step 2: Webhook Config */}
                      {step.id === 2 && currentStep >= 2 && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="text-sm text-secondary block mb-1">
                              URL du Webhook (à copier dans Fathom)
                            </label>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-2 bg-card rounded-lg text-sm font-mono text-accent overflow-x-auto">
                                {webhookUrl}
                              </code>
                              <button
                                onClick={() => copyToClipboard(webhookUrl, 'URL')}
                                className="p-2 rounded-lg bg-accent-light text-accent hover:opacity-80 transition-colors"
                              >
                                <IconCopy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm text-secondary block mb-1">
                              Secret du Webhook (généré par Fathom)
                            </label>
                            <input
                              type="password"
                              value={config.webhook_secret}
                              onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
                              placeholder="whsec_xxxxxxxxxxxxx"
                              className="w-full input px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                            <h4 className="text-sm font-medium text-info mb-2">
                              📋 Instructions dans Fathom :
                            </h4>
                            <ol className="text-sm text-secondary space-y-1 list-decimal list-inside">
                              <li>Allez dans <strong>Settings → API Access</strong></li>
                              <li>Cliquez sur <strong>Manage → Add Webhook</strong></li>
                              <li>Collez l&apos;URL ci-dessus dans <strong>Destination URL</strong></li>
                              <li>Cochez : <strong>Summary, Transcript, Action Items</strong></li>
                              <li>Copiez le <strong>Webhook Secret</strong> généré</li>
                              <li>Collez-le dans le champ ci-dessus</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        {step.externalLink && (
                          <a
                            href={step.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-colors text-sm"
                          >
                            {step.actionLabel}
                            <IconExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {step.action && (
                          <button
                            onClick={step.action}
                            disabled={testing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-colors text-sm disabled:opacity-50"
                          >
                            {testing ? (
                              <IconLoader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <IconPlayerPlay className="w-4 h-4" />
                            )}
                            {step.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    {!step.completed && currentStep === step.id && (
                      <IconChevronRight className="w-5 h-5 text-accent animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconCheck className="w-4 h-4" />
                )}
                Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <IconNotes className="w-5 h-5 text-accent" />
            Comment ça marche ?
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                icon: IconCalendar,
                title: '1. Créer l\'événement',
                desc: 'Crée un meeting dans Eclipse et associe-le à un projet',
              },
              {
                icon: IconPlayerPlay,
                title: '2. Lancer la réunion',
                desc: 'Fathom rejoint automatiquement et enregistre',
              },
              {
                icon: IconWebhook,
                title: '3. Envoi automatique',
                desc: 'À la fin, Fathom envoie les notes via webhook',
              },
              {
                icon: IconNotes,
                title: '4. Notes liées',
                desc: 'Retrouve les notes dans l\'onglet Réunions du projet',
              },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-medium text-primary text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Tips */}
        <div className="card p-6 bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
          <h2 className="text-lg font-semibold text-primary mb-4">
            💡 Conseils pour un matching parfait
          </h2>
          <ul className="space-y-2 text-sm text-secondary">
            <li className="flex items-start gap-2">
              <IconCheck className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span><strong>Mets le lien Google Meet/Zoom</strong> dans le champ &quot;Lieu&quot; de l&apos;événement Eclipse</span>
            </li>
            <li className="flex items-start gap-2">
              <IconCheck className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span><strong>Utilise des titres similaires</strong> entre Eclipse et la réunion réelle</span>
            </li>
            <li className="flex items-start gap-2">
              <IconCheck className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span><strong>Associe toujours un projet</strong> pour retrouver les notes facilement</span>
            </li>
            <li className="flex items-start gap-2">
              <IconCheck className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span><strong>Crée l&apos;événement avant</strong> la réunion pour que le matching fonctionne</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}

