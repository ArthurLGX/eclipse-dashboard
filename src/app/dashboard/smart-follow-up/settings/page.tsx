'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBell,
  IconPlus,
  IconDeviceFloppy,
  IconCircleDot,
  IconBan,
  IconSparkles,
  IconPlug,
  IconMail,
} from '@tabler/icons-react';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import {
  updateAutomationSettings,
  createAutomationSettings,
  testWhatsAppConnection,
  testWhatsAppNotificationFromSavedSettings,
} from '@/lib/smart-follow-up-api';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useSettingsLayout } from './settings-context';
import { resetSFUOnboarding } from '@/app/components/onboarding/SFUOnboarding';
import type { AutomationSettings } from '@/types/smart-follow-up';
import { SourcesManager } from '@/app/components/smart-follow-up/SourcesManager';
import { GoogleGlyph } from '@/app/components/smart-follow-up/onboarding/StepCredentials';
import { getToken } from '@/lib/api';
import { getGmailOAuthErrorMessage } from '@/lib/gmail-oauth-feedback';

const DEFAULT_WHATSAPP_TEMPLATE =
  '{{emoji}} {{source}} · {{name}}\n{{title}}\n{{signal}}\n→ {{action_url}}';

const PREVIEW_VARS: Record<string, string> = {
  emoji: '🔴',
  source: 'Walego',
  name: 'Charlotte Joseph',
  title: 'Creative Project Manager · Freelance',
  company: '',
  signal: 'A bookée un discovery call ce mois',
  score: 'hot',
  linkedin_url: 'linkedin.com/in/charlottejoseph',
  app_url: 'app.votre-dashboard.fr/leads/123',
  action_url: 'linkedin.com/in/charlottejoseph',
  date: '14/03 à 18h50',
};

function renderWhatsAppPreview(template?: string): string {
  const tpl = template?.trim() || DEFAULT_WHATSAPP_TEMPLATE;
  return Object.entries(PREVIEW_VARS).reduce(
    (msg, [key, val]) => msg.replaceAll(`{{${key}}}`, val),
    tpl
  )
    .split('\n')
    .filter((l, i, arr) => l.trim() !== '' || arr[i - 1]?.trim() !== '')
    .join('\n')
    .trim();
}

/** Toggle custom style redesign */
function SettingToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full border-none cursor-pointer transition-all flex-shrink-0 relative ${
        checked ? 'bg-success' : 'bg-muted'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/** Toggle orange pour auto-approve */
function SettingToggleOrange({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full border-none cursor-pointer transition-all flex-shrink-0 relative ${
        checked ? 'bg-warning' : 'bg-muted'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SmartFollowUpSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { activeSection, setActiveSection } = useSettingsLayout();
  const { data: settings, mutate } = useAutomationSettings();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newInboxDomain, setNewInboxDomain] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  /** 70–99, affiché comme pourcentage ; persisté en auto_approve_threshold 0–1 */
  const [autoApproveThresholdPct, setAutoApproveThresholdPct] = useState(92);
  const [inboxAllowedDomains, setInboxAllowedDomains] = useState<string[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    dashboard: true,
    frequency: 'immediate',
  });
  const [whatsappConfig, setWhatsappConfig] = useState({
    enabled: false,
    provider: 'meta' as 'twilio' | 'meta',
    twilio: {
      account_sid: '',
      auth_token: '',
      from_number: '',
      to_number: '',
    },
    meta: {
      phone_number_id: '',
      access_token: '',
      recipient_number: '',
    },
    notification_template: DEFAULT_WHATSAPP_TEMPLATE,
    use_smart_follow_up_template: false,
  });
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testWhatsAppResult, setTestWhatsAppResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testingSavedNotif, setTestingSavedNotif] = useState(false);
  const [aiInstructionsBySource, setAiInstructionsBySource] = useState<Record<string, string>>({});
  const [instructionTab, setInstructionTab] = useState<string>('default');
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [seasonalInstruction, setSeasonalInstruction] = useState({
    enabled: false,
    content: '',
    active_from: '',
    active_until: '',
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAutoApprove(settings.auto_approve);
      const th = settings.auto_approve_threshold;
      setAutoApproveThresholdPct(
        th != null && Number.isFinite(Number(th)) ? Math.round(Number(th) * 100) : 92
      );
      setInboxAllowedDomains(
        Array.isArray(settings.inbox_allowed_domains) ? settings.inbox_allowed_domains : []
      );
      setNotificationPreferences(settings.notification_preferences);
      if (settings.ai_instructions_by_source) {
        setAiInstructionsBySource(settings.ai_instructions_by_source as Record<string, string>);
      } else if (settings.ai_instruction) {
        setAiInstructionsBySource({ default: settings.ai_instruction });
      }
      if (settings.seasonal_instruction && typeof settings.seasonal_instruction === 'object') {
        setSeasonalInstruction((s) => ({ ...s, ...settings.seasonal_instruction }));
      }
      if (settings.whatsapp_config) {
        const wc = settings.whatsapp_config;
        setWhatsappConfig({
          enabled: wc.enabled ?? false,
          provider: (wc.provider as 'twilio' | 'meta') ?? 'meta',
          twilio: {
            account_sid: wc.twilio?.account_sid ?? '',
            auth_token: wc.twilio?.auth_token ?? '',
            from_number: wc.twilio?.from_number ?? '',
            to_number: wc.twilio?.to_number ?? '',
          },
          meta: {
            phone_number_id: wc.meta?.phone_number_id ?? wc.phone_number_id ?? '',
            access_token: wc.meta?.access_token ?? wc.access_token ?? '',
            recipient_number: wc.meta?.recipient_number ?? wc.recipient_number ?? '',
          },
          notification_template: wc.notification_template ?? DEFAULT_WHATSAPP_TEMPLATE,
          use_smart_follow_up_template: wc.use_smart_follow_up_template ?? false,
        });
      }
    }
  }, [settings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const gmail = sp.get('gmail');
    if (gmail !== 'connected' && gmail !== 'error') return;
    let cancelled = false;
    void (async () => {
      await mutate();
      if (cancelled) return;
      setActiveSection('gmail');
      if (gmail === 'connected') {
        const email = sp.get('email');
        showGlobalPopup(
          email
            ? `Connexion Gmail réussie (${decodeURIComponent(email)})`
            : 'Connexion Gmail réussie',
          'success'
        );
      } else {
        const gmailErr = sp.get('gmail_err');
        showGlobalPopup(getGmailOAuthErrorMessage(gmailErr), 'error');
      }
      router.replace('/dashboard/smart-follow-up/settings', { scroll: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [mutate, router, showGlobalPopup, setActiveSection]);

  const handleConnectGmail = async () => {
    const token = getToken();
    if (!token) {
      showGlobalPopup('Session requise pour connecter Gmail.', 'error');
      return;
    }
    setGmailConnecting(true);
    try {
      const res = await fetch('/api/auth/gmail?from=settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { authUrl?: string; error?: string };
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Impossible de démarrer la connexion Gmail');
      }
      window.location.href = data.authUrl;
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur Gmail OAuth', 'error');
      setGmailConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: Partial<AutomationSettings> = {
        enabled,
        auto_approve: autoApprove,
        auto_approve_threshold: Math.min(0.99, Math.max(0.7, autoApproveThresholdPct / 100)),
        inbox_allowed_domains: inboxAllowedDomains,
        notification_preferences: notificationPreferences,
        whatsapp_config: whatsappConfig,
        ai_instructions_by_source: aiInstructionsBySource,
        seasonal_instruction: seasonalInstruction,
        ai_instruction: aiInstructionsBySource.default || undefined,
      };
      if (settings?.documentId) {
        await updateAutomationSettings(settings.documentId, data);
      } else {
        await createAutomationSettings(data);
      }
      mutate();
      setSaved(true);
      showGlobalPopup('Paramètres enregistrés avec succès', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error(error);
      showGlobalPopup('Erreur lors de la sauvegarde des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInboxDomain = () => {
    const d = newInboxDomain.trim().toLowerCase().replace(/^@/, '');
    if (d && !inboxAllowedDomains.includes(d)) {
      setInboxAllowedDomains([...inboxAllowedDomains, d]);
      setNewInboxDomain('');
    }
  };

  const handleRemoveInboxDomain = (domain: string) =>
    setInboxAllowedDomains(inboxAllowedDomains.filter((x) => x !== domain));

  const handleTestWhatsApp = async () => {
    const isMeta = whatsappConfig.provider === 'meta';
    const validMeta = isMeta &&
      whatsappConfig.meta.phone_number_id &&
      whatsappConfig.meta.access_token &&
      whatsappConfig.meta.recipient_number;
    const validTwilio = !isMeta &&
      whatsappConfig.twilio.account_sid &&
      whatsappConfig.twilio.auth_token &&
      whatsappConfig.twilio.from_number &&
      whatsappConfig.twilio.to_number;

    if (!validMeta && !validTwilio) {
      showGlobalPopup('Remplissez tous les champs avant de tester', 'error');
      return;
    }
    setTestingWhatsApp(true);
    setTestWhatsAppResult(null);
    try {
      const payload = isMeta
        ? {
            provider: 'meta' as const,
            phone_number_id: whatsappConfig.meta.phone_number_id,
            access_token: whatsappConfig.meta.access_token,
            recipient_number: whatsappConfig.meta.recipient_number,
            notification_template: whatsappConfig.notification_template,
            use_smart_follow_up_template: whatsappConfig.use_smart_follow_up_template,
          }
        : {
            provider: 'twilio' as const,
            account_sid: whatsappConfig.twilio.account_sid,
            auth_token: whatsappConfig.twilio.auth_token,
            from_number: whatsappConfig.twilio.from_number,
            to_number: whatsappConfig.twilio.to_number,
            notification_template: whatsappConfig.notification_template,
          };
      const result = await testWhatsAppConnection(payload);
      setTestWhatsAppResult(result);
      if (result.success) showGlobalPopup('Message de test envoyé !', 'success');
    } catch (err) {
      setTestWhatsAppResult({ success: false, error: String(err) });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  /** Test avec la config WhatsApp/Twilio **déjà enregistrée** (Strapi), pas le formulaire courant. */
  const handleTestSavedWhatsAppNotif = async () => {
    setTestingSavedNotif(true);
    try {
      const result = await testWhatsAppNotificationFromSavedSettings();
      if (result.success) {
        showGlobalPopup('Message de test envoyé (config enregistrée)', 'success');
      } else {
        showGlobalPopup(result.error || 'Échec du test', 'error');
      }
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur test', 'error');
    } finally {
      setTestingSavedNotif(false);
    }
  };

  const insertTemplateVariable = (variable: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = whatsappConfig.notification_template ?? DEFAULT_WHATSAPP_TEMPLATE;
    const newVal = current.slice(0, start) + variable + current.slice(end);
    setWhatsappConfig({ ...whatsappConfig, notification_template: newVal });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const settingRow = 'flex items-center gap-4 p-4 border-b border-default last:border-b-0 hover:bg-muted/30 transition-colors';
  const settingLabel = 'flex-1';
  const settingInput =
    'bg-muted border border-default  px-3 py-2 !text-sm !text-primary outline-none focus:border-primary transition-colors w-full';

  return (
    <>
    <main className="p-8 max-w-7xl w-full overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-9 w-full">
          <div>
            <h1 className="font-serif !text-[28px] !text-primary leading-tight mb-1">Paramètres</h1>
            <p className="font-mono !text-xs !text-muted">Smart Follow-Up · Automatisation des relances</p>
            <button
              onClick={resetSFUOnboarding}
              className="mt-2 font-mono !text-[11px] !text-muted hover:!text-primary underline"
            >
              ↩ Revoir l&apos;introduction
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5  font-semibold !text-[11px] transition-all flex-shrink-0 ${
              saved
                ? 'bg-success !text-white'
                : 'bg-primary !text-white hover:opacity-90 disabled:opacity-50'
            }`}
          >
            {saved ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Enregistré
              </>
            ) : loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <IconDeviceFloppy className="w-3.5 h-3.5" />
                Enregistrer
              </>
            )}
          </button>
        </div>

        {/* 1. ACTIVATION */}
        {activeSection === 'activation' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-success border border-success flex items-center justify-center !text-white">
                <IconCircleDot className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Activation du système</div>
                <div className="font-mono !text-[11px] !text-muted">Contrôle global du Smart Follow-Up</div>
              </div>
            </div>
            <div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Smart Follow-Up activé</h4>
                  <p className="font-mono !text-[11px] !text-muted">Activer ou désactiver le système de relances automatiques</p>
                </div>
                <SettingToggle checked={enabled} onChange={setEnabled} />
              </div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Approbation automatique</h4>
                  <p className="font-mono !text-[11px] !text-muted">
                    Les actions dont le score dépasse le seuil peuvent être approuvées sans review. Walego, Folk,
                    WhatsApp et les fils « direct » restent toujours en attente de validation.
                  </p>
                </div>
                <SettingToggleOrange checked={autoApprove} onChange={setAutoApprove} />
              </div>
              {autoApprove && (
                <div className={settingRow}>
                  <div className={settingLabel}>
                    <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Seuil de confiance minimum</h4>
                    <p className="font-mono !text-[11px] !text-muted">Score minimum pour l&apos;auto-approbation (recommandé : 92 ou plus)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={70}
                      max={99}
                      value={autoApproveThresholdPct}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v)) setAutoApproveThresholdPct(Math.min(99, Math.max(70, v)));
                      }}
                      className={`${settingInput} w-20 font-mono text-center`}
                    />
                    <span className="font-mono !text-[11px] !text-muted">/ 100</span>
                  </div>
                </div>
              )}
              <div className="px-4 py-3 border-t border-default bg-muted/20">
                <p className="font-mono !text-[10px] !text-muted leading-relaxed">
                  Les sources Walego, Folk, WhatsApp et les emails classés « direct » sont toujours soumis à validation
                  manuelle, quel que soit le seuil.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'domaines' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconBan className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Domaines autorisés (boîte mail)</div>
                <div className="font-mono !text-[11px] !text-muted">
                  En plus des emails de vos contacts et des domaines définis dans les sources de leads, seuls ces
                  domaines sont importés depuis IMAP. Le reste est ignoré.
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newInboxDomain}
                  onChange={(e) => setNewInboxDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInboxDomain()}
                  placeholder="ex: monclient.fr"
                  className={`${settingInput} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleAddInboxDomain}
                  className="px-3.5 py-2 bg-primary !text-white !text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 flex-shrink-0"
                >
                  <IconPlus className="w-3 h-3" />
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inboxAllowedDomains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono !text-[11px] bg-muted border border-default !text-primary"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveInboxDomain(d)}
                      className="w-3.5 h-3.5 rounded flex items-center justify-center opacity-50 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {inboxAllowedDomains.length === 0 && (
                  <span className="font-mono !text-[11px] !text-muted">
                    Aucun domaine supplémentaire — seuls contacts + sources de leads s’appliquent.
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Sources de leads (détection dynamique) */}
        {activeSection === 'sources' && settings?.documentId && (
          <section className="bg-card border border-default w-full overflow-visible mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary border border-default flex items-center justify-center !text-white">
                <IconPlug className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Sources de leads</div>
                <div className="font-mono !text-[11px] !text-muted">
                  Les domaines de ces sources sont autorisés pour l’import des emails ; notifications WhatsApp selon la config.
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Outils connectés</h4>
                <p className="font-mono !text-[11px] !text-muted mb-3">
                  Les domaines configurés ici sont pris en compte pour l’import boîte mail et la détection des leads.
                </p>
                <SourcesManager settingsId={settings.documentId} initialSources={settings.lead_sources} />
              </div>
            </div>
          </section>
        )}

        {/* Boîte Gmail (OAuth) */}
        {activeSection === 'gmail' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EA4335]/15 border border-[#EA4335]/30 flex items-center justify-center !text-[#EA4335]">
                <IconMail className="w-4 h-4" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Boîte Gmail</div>
                <div className="font-mono !text-[11px] !text-muted">
                  Connexion OAuth (lecture Gmail) pour la synchronisation et l&apos;automatisation Smart Follow-Up
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {settings?.gmail_configured || settings?.gmail_config?.connected ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
                  <span className="text-success text-lg leading-none">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="!text-[12px] font-semibold !text-primary">Gmail connecté</div>
                    {settings?.gmail_config?.email ? (
                      <div className="font-mono !text-[11px] !text-muted truncate">{settings.gmail_config.email}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={gmailConnecting}
                    className="font-mono !text-[10px] px-2.5 py-1.5 rounded-md border border-default !text-muted hover:!text-primary hover:border-primary/30 disabled:opacity-50"
                  >
                    Reconnecter
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={gmailConnecting}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-primary !text-white !text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {gmailConnecting ? (
                      'Redirection…'
                    ) : (
                      <>
                        <GoogleGlyph />
                        Connecter avec Gmail (OAuth)
                      </>
                    )}
                  </button>
                  <p className="font-mono !text-[10px] !text-muted">
                    Vous serez redirigé vers Google pour autoriser l&apos;accès en lecture à votre boîte (scopes Gmail
                    readonly + profil).
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* INSTRUCTION IA (par source + saisonnier) */}
        {activeSection === 'instruction' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconSparkles className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Instruction IA</div>
                <div className="font-mono !text-[11px] !text-muted">
                  Contexte métier et priorités par source. Plus c&apos;est précis, plus les suggestions sont pertinentes.
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1 mb-3">
                {[
                  { id: 'default', label: 'Générale' },
                  { id: 'walego', label: 'Walego' },
                  { id: 'folk', label: 'Folk' },
                  { id: 'direct', label: 'Email direct' },
                  { id: 'inbound', label: 'Inbound' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setInstructionTab(id)}
                    className={`px-3 py-1.5 font-mono !text-[11px] transition-all ${
                      instructionTab === id
                        ? 'bg-primary !text-white border border-primary'
                        : 'bg-muted border border-default !text-muted hover:border-[#ccc8c2]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                value={aiInstructionsBySource[instructionTab] || ''}
                onChange={(e) => setAiInstructionsBySource((s) => ({ ...s, [instructionTab]: e.target.value }))}
                placeholder={`Instruction pour ${instructionTab === 'default' ? 'tous les leads' : instructionTab}...`}
                className={`${settingInput} min-h-[120px] resize-y`}
                rows={5}
              />
              <div className="mt-6 pt-4 border-t border-default">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={seasonalInstruction.enabled}
                    onChange={(e) => setSeasonalInstruction((s) => ({ ...s, enabled: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="!text-[11px] font-medium !text-primary">Activer une instruction saisonnière</span>
                </label>
                <p className="font-mono !text-[11px] !text-muted mb-3">Du [date] au [date] — contexte temporaire (ex: période refonte)</p>
                {seasonalInstruction.enabled && (
                  <div className="space-y-2 mb-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="font-mono !text-[10px] !text-muted block mb-1">Du</label>
                        <input
                          type="date"
                          value={seasonalInstruction.active_from}
                          onChange={(e) => setSeasonalInstruction((s) => ({ ...s, active_from: e.target.value }))}
                          className={settingInput}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="font-mono !text-[10px] !text-muted block mb-1">Au</label>
                        <input
                          type="date"
                          value={seasonalInstruction.active_until}
                          onChange={(e) => setSeasonalInstruction((s) => ({ ...s, active_until: e.target.value }))}
                          className={settingInput}
                        />
                      </div>
                    </div>
                    <textarea
                      value={seasonalInstruction.content}
                      onChange={(e) => setSeasonalInstruction((s) => ({ ...s, content: e.target.value }))}
                      placeholder="Ex: Période refonte — prioriser les demandes de refonte site..."
                      className={`${settingInput} min-h-[80px] resize-y`}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* NOTIFICATIONS */}
        {activeSection === 'notifications' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconBell className="w-4 h-4 !text-white" />
              </div>  
              <div>
                <div className="!text-sm font-semibold !text-primary">Préférences de notification</div>
                <div className="font-mono !text-[11px] !text-muted">Comment et quand être alerté</div>
              </div>
            </div>
            <div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Notifications email</h4>
                  <p className="font-mono !text-[11px] !text-muted">Recevoir un email pour chaque action</p>
                </div>
                <SettingToggle checked={notificationPreferences.email} onChange={(v) => setNotificationPreferences({ ...notificationPreferences, email: v })} />
              </div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Notifications dashboard</h4>
                  <p className="font-mono !text-[11px] !text-muted">Afficher les notifications dans l&apos;interface</p>
                </div>
                <SettingToggle checked={notificationPreferences.dashboard} onChange={(v) => setNotificationPreferences({ ...notificationPreferences, dashboard: v })} />
              </div>
              <div className={`${settingRow} flex-col items-stretch`}>
                <div className={settingLabel}><h4 className="!text-[11px] font-medium !text-primary mb-1">Fréquence des notifications</h4></div>
                <select
                  value={notificationPreferences.frequency}
                  onChange={(e) => setNotificationPreferences({ ...notificationPreferences, frequency: e.target.value })}
                  className={settingInput}
                >
                  <option value="immediate">Immédiate</option>
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Résumé quotidien</option>
                  <option value="weekly">Résumé hebdomadaire</option>
                </select>
              </div>
              <div className={`${settingRow} flex-col items-stretch gap-3`}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Test envoi notifs WhatsApp</h4>
                  <p className="font-mono !text-[11px] !text-muted">
                    Envoie un message de test via Twilio ou Meta selon la configuration <strong>enregistrée</strong> (section
                    WhatsApp ci-dessous). À utiliser après avoir cliqué sur Enregistrer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestSavedWhatsAppNotif}
                  disabled={testingSavedNotif}
                  className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] !text-white !text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {testingSavedNotif ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <IconBrandWhatsapp className="w-4 h-4" />
                      Test envoi notifs
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 9. WHATSAPP */}
        {activeSection === 'whatsapp' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#25D366] border border-[#25D366] flex items-center justify-center !text-white">
                <IconBrandWhatsapp className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Notifications WhatsApp</div>
                <div className="font-mono !text-[11px] !text-muted">Recevez une notification WhatsApp pour chaque nouveau lead (Twilio ou Meta API)</div>
              </div>
            </div>
            <div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Activer les notifications</h4>
                  <p className="font-mono !text-[11px] !text-muted">Envoyer un message WhatsApp à chaque nouveau lead</p>
                </div>
                <SettingToggle
                  checked={whatsappConfig.enabled}
                  onChange={(v) => setWhatsappConfig({ ...whatsappConfig, enabled: v })}
                />
              </div>

              {whatsappConfig.enabled && (
                <>
                  {/* Sélecteur Provider */}
                  <div className={settingRow}>
                    <div className={settingLabel}>
                      <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Provider</h4>
                      <p className="font-mono !text-[11px] !text-muted">Twilio ou Meta API (WhatsApp Business)</p>
                    </div>
                    <select
                      value={whatsappConfig.provider}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, provider: e.target.value as 'twilio' | 'meta' })}
                      className={`${settingInput} max-w-xs`}
                    >
                      <option value="meta">Meta API</option>
                      <option value="twilio">Twilio</option>
                    </select>
                  </div>

                  {/* Champs Twilio */}
                  {whatsappConfig.provider === 'twilio' && (
                    <>
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Account SID</h4>
                          <p className="font-mono !text-[11px] !text-muted">Console Twilio → Account</p>
                        </div>
                        <input
                          type="text"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={whatsappConfig.twilio.account_sid}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            twilio: { ...whatsappConfig.twilio, account_sid: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Auth Token</h4>
                          <p className="font-mono !text-[11px] !text-muted">Token secret Twilio</p>
                        </div>
                        <input
                          type="password"
                          placeholder="••••••••••••••••••••••••••••••••"
                          value={whatsappConfig.twilio.auth_token}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            twilio: { ...whatsappConfig.twilio, auth_token: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">From number</h4>
                          <p className="font-mono !text-[11px] !text-muted">Numéro Twilio WhatsApp (ex: whatsapp:+14155238886)</p>
                        </div>
                        <input
                          type="text"
                          placeholder="whatsapp:+14155238886"
                          value={whatsappConfig.twilio.from_number}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            twilio: { ...whatsappConfig.twilio, from_number: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">To number</h4>
                          <p className="font-mono !text-[11px] !text-muted">Votre numéro WhatsApp (ex: 33612345678)</p>
                        </div>
                        <input
                          type="text"
                          placeholder="33612345678"
                          value={whatsappConfig.twilio.to_number}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            twilio: { ...whatsappConfig.twilio, to_number: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                    </>
                  )}

                  {/* Champs Meta API */}
                  {whatsappConfig.provider === 'meta' && (
                    <>
                      {/* Toggles template Meta */}
                      <div className={`${settingRow} flex-col items-stretch`}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Template Meta</h4>
                          <p className="font-mono !text-[11px] !text-muted">Choisir le template WhatsApp Business</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <SettingToggle
                              checked={!whatsappConfig.use_smart_follow_up_template}
                              onChange={(v) => setWhatsappConfig({ ...whatsappConfig, use_smart_follow_up_template: !v })}
                            />
                            <span className="!text-[11px]">hello_world (pour le moment)</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <SettingToggle
                              checked={whatsappConfig.use_smart_follow_up_template}
                              onChange={(v) => setWhatsappConfig({ ...whatsappConfig, use_smart_follow_up_template: v })}
                            />
                            <span className="!text-[11px]">smart_follow_up_notification (quand approuvé)</span>
                          </label>
                        </div>
                      </div>

                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Phone Number ID</h4>
                          <p className="font-mono !text-[11px] !text-muted">Meta for Developers → App → WhatsApp → Getting Started</p>
                        </div>
                        <input
                          type="text"
                          placeholder="123456789012345"
                          value={whatsappConfig.meta.phone_number_id}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            meta: { ...whatsappConfig.meta, phone_number_id: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Access Token</h4>
                          <p className="font-mono !text-[11px] !text-muted">Token permanent depuis Meta Business Suite</p>
                        </div>
                        <input
                          type="password"
                          placeholder="EAAxxxxxxxxxxxxxxxx"
                          value={whatsappConfig.meta.access_token}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            meta: { ...whatsappConfig.meta, access_token: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Votre numéro WhatsApp</h4>
                          <p className="font-mono !text-[11px] !text-muted">Format international sans + ni espaces (ex: 33612345678)</p>
                        </div>
                        <input
                          type="text"
                          placeholder="33612345678"
                          value={whatsappConfig.meta.recipient_number}
                          onChange={(e) => setWhatsappConfig({
                            ...whatsappConfig,
                            meta: { ...whatsappConfig.meta, recipient_number: e.target.value },
                          })}
                          className={`${settingInput} max-w-xs`}
                        />
                      </div>
                    </>
                  )}

                  {/* Template de notification */}
                  <div className={`${settingRow} flex-col items-stretch`}>
                    <div className={settingLabel}>
                      <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Template du message</h4>
                      <p className="font-mono !text-[11px] !text-muted">Personnalisez le message WhatsApp reçu pour chaque lead</p>
                    </div>
                    <div className="w-full flex flex-col gap-2">
                      <textarea
                        ref={templateTextareaRef}
                        rows={4}
                        value={whatsappConfig.notification_template ?? DEFAULT_WHATSAPP_TEMPLATE}
                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, notification_template: e.target.value })}
                        className={`${settingInput} font-mono !text-xs resize-y min-h-[80px]`}
                        placeholder={DEFAULT_WHATSAPP_TEMPLATE}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {['{{emoji}}', '{{source}}', '{{name}}', '{{title}}', '{{company}}', '{{signal}}', '{{action_url}}', '{{linkedin_url}}', '{{app_url}}', '{{date}}'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertTemplateVariable(v)}
                            className="px-2 py-1 font-mono !text-[10px] bg-muted border border-default hover:border-primary hover:!text-primary transition-colors"
                            title="Cliquer pour insérer"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="bg-muted/50 border border-default rounded p-3">
                        <div className="font-mono !text-[10px] !text-muted mb-2">APERÇU</div>
                        <pre className="font-sans !text-[11px] !text-primary whitespace-pre-wrap break-words m-0 leading-relaxed">
                          {renderWhatsAppPreview(whatsappConfig.notification_template)}
                        </pre>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setWhatsappConfig({ ...whatsappConfig, notification_template: DEFAULT_WHATSAPP_TEMPLATE })}
                          className="font-mono !text-[11px] !text-muted hover:!text-primary transition-colors"
                        >
                          Réinitialiser le template
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-default flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={testingWhatsApp}
                      className="px-4 py-2 bg-[#25D366] !text-white !text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {testingWhatsApp ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Test en cours...
                        </>
                      ) : (
                        <>
                          <IconBrandWhatsapp className="w-4 h-4" />
                          Tester la connexion (formulaire)
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestSavedWhatsAppNotif}
                      disabled={testingSavedNotif}
                      className="px-4 py-2 border border-[#25D366] !text-[#128C7E] dark:!text-[#25D366] !text-sm font-semibold hover:bg-[#25D366]/10 disabled:opacity-50 flex items-center gap-2"
                      title="Utilise la config enregistrée sur le serveur (après Enregistrer)"
                    >
                      {testingSavedNotif ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Envoi…
                        </>
                      ) : (
                        <>
                          <IconBrandWhatsapp className="w-4 h-4" />
                          Test envoi notifs (config enregistrée)
                        </>
                      )}
                    </button>
                    {testWhatsAppResult && (
                      <span
                        className={`font-mono !text-xs ${testWhatsAppResult.success ? '!text-success' : '!text-danger'}`}
                      >
                        {testWhatsAppResult.success ? '✓ Message envoyé' : `✗ ${testWhatsAppResult.error}`}
                      </span>
                    )}
                  </div>
                  <details className="p-4 border-t border-default bg-muted/20">
                    <summary className="cursor-pointer font-mono !text-[11px] !text-muted hover:!text-primary">
                      {whatsappConfig.provider === 'twilio'
                        ? 'Comment obtenir mes credentials Twilio ?'
                        : 'Comment obtenir mes credentials Meta ?'}
                    </summary>
                    {whatsappConfig.provider === 'twilio' ? (
                      <ol className="mt-3 font-mono !text-[11px] !text-muted space-y-1 list-decimal list-inside">
                        <li>Créer un compte sur twilio.com</li>
                        <li>Activer WhatsApp Sandbox ou un numéro WhatsApp Business</li>
                        <li>Copier Account SID et Auth Token depuis la console</li>
                        <li>From number : format whatsapp:+14155238886</li>
                        <li>To number : votre numéro sans + (ex: 33612345678)</li>
                      </ol>
                    ) : (
                      <ol className="mt-3 font-mono !text-[11px] !text-muted space-y-1 list-decimal list-inside">
                        <li>Aller sur developers.facebook.com</li>
                        <li>Créer une app de type &quot;Business&quot;</li>
                        <li>Ajouter le produit &quot;WhatsApp&quot;</li>
                        <li>Dans &quot;Getting Started&quot; : copier le Phone Number ID</li>
                        <li>Générer un token permanent dans &quot;System Users&quot; (Meta Business Suite)</li>
                        <li>Coller les deux valeurs ci-dessus</li>
                        <li>Entrer votre numéro WhatsApp sans + ni espaces</li>
                        <li>Cliquer &quot;Tester la connexion&quot;</li>
                      </ol>
                    )}
                  </details>
                </>
              )}
            </div>
          </section>
        )}

        <div className="h-12" />
      </main>

    </>
  );
}
