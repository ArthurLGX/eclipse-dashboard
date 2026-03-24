'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBell,
  IconClock,
  IconShieldCheck,
  IconPlus,
  IconDeviceFloppy,
  IconFilter,
  IconUsers,
  IconCircleDot,
  IconBan,
  IconBolt,
  IconCalendar,
  IconSparkles,
  IconPlug,
  IconMail,
} from '@tabler/icons-react';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import { updateAutomationSettings, createAutomationSettings, testWhatsAppConnection } from '@/lib/smart-follow-up-api';
import { useAuth } from '@/app/context/AuthContext';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import { usePopup } from '@/app/context/PopupContext';
import { useSettingsLayout } from './settings-context';
import FilterPipeline from '@/app/components/settings/FilterPipeline';
import FilterSummary from '@/app/components/settings/FilterSummary';
import { resetSFUOnboarding } from '@/app/components/onboarding/SFUOnboarding';
import type { AutomationSettings, FilterRule } from '@/types/smart-follow-up';
import { SourcesManager } from '@/app/components/smart-follow-up/SourcesManager';
import { GoogleGlyph } from '@/app/components/smart-follow-up/onboarding/StepCredentials';
import { getToken } from '@/lib/api';

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
  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [customRules, setCustomRules] = useState<FilterRule[]>([]);

  const [icpSettings, setICPSettings] = useState({
    enabled: true,
    min_score_threshold: 8,
    types_enabled: { freelance: true, agence: true, b2b: true, b2c: false },
    keywords: {
      freelance: ['freelance', 'indépendant', 'auto-entrepreneur', 'consultant'],
      agence: ['agence', 'agency', 'studio', 'équipe', 'team'],
      b2b: ['entreprise', 'société', 'business', 'b2b', 'partenariat', 'collaboration'],
      b2c: ['client', 'consommateur', 'b2c', 'particulier'],
      professional: ['projet', 'devis', 'prestation', 'service', 'mission', 'collaboration', 'proposition'],
    },
    require_response_thread: false,
    boost_responses: true,
  });
  const [editingICPType, setEditingICPType] = useState<string | null>(null);
  const [newICPKeyword, setNewICPKeyword] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  /** 70–99, affiché comme pourcentage ; persisté en auto_approve_threshold 0–1 */
  const [autoApproveThresholdPct, setAutoApproveThresholdPct] = useState(92);
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);
  const [priorityKeywords, setPriorityKeywords] = useState<string[]>([]);
  const [delaySettings, setDelaySettings] = useState({
    payment_reminder: 7,
    proposal_follow_up: 3,
    meeting_follow_up: 1,
    thank_you: 3,
    check_in: 30,
  });
  const [workHours, setWorkHours] = useState({
    start: '09:00',
    end: '18:00',
    timezone: 'Europe/Paris',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });
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
      setExcludedDomains(settings.excluded_domains || []);
      setPriorityKeywords(settings.priority_keywords || []);
      setDelaySettings(settings.delay_settings);
      setWorkHours(settings.work_hours);
      setNotificationPreferences(settings.notification_preferences);
      setCustomRules(settings.custom_rules || []);
      if (settings.icp_settings) setICPSettings(settings.icp_settings);
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
        showGlobalPopup('La connexion Gmail a échoué ou a été annulée.', 'error');
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
        excluded_domains: excludedDomains,
        priority_keywords: priorityKeywords,
        delay_settings: delaySettings,
        work_hours: workHours,
        notification_preferences: notificationPreferences,
        custom_rules: customRules,
        icp_settings: icpSettings,
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

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (domain && !excludedDomains.includes(domain)) {
      setExcludedDomains([...excludedDomains, domain]);
      setNewDomain('');
    }
  };

  const handleRemoveDomain = (d: string) => setExcludedDomains(excludedDomains.filter((x) => x !== d));

  const handleAddKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !priorityKeywords.includes(kw)) {
      setPriorityKeywords([...priorityKeywords, kw]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => setPriorityKeywords(priorityKeywords.filter((k) => k !== kw));

  const handleAddICPKeyword = (type: string) => {
    const kw = newICPKeyword.trim().toLowerCase();
    const kws = icpSettings.keywords[type as keyof typeof icpSettings.keywords];
    if (kw && Array.isArray(kws) && !kws.includes(kw)) {
      setICPSettings({
        ...icpSettings,
        keywords: { ...icpSettings.keywords, [type]: [...kws, kw] },
      });
      setNewICPKeyword('');
      setEditingICPType(null);
    }
  };

  const handleRemoveICPKeyword = (type: string, keyword: string) => {
    const kws = icpSettings.keywords[type as keyof typeof icpSettings.keywords];
    if (Array.isArray(kws)) {
      setICPSettings({
        ...icpSettings,
        keywords: { ...icpSettings.keywords, [type]: kws.filter((k) => k !== keyword) },
      });
    }
  };

  const handleDayToggle = (day: string) => {
    if (workHours.days.includes(day)) {
      setWorkHours({ ...workHours, days: workHours.days.filter((d) => d !== day) });
    } else {
      setWorkHours({ ...workHours, days: [...workHours.days, day] });
    }
  };

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

  const daysOfWeek = [
    { value: 'monday', label: 'Lun' },
    { value: 'tuesday', label: 'Mar' },
    { value: 'wednesday', label: 'Mer' },
    { value: 'thursday', label: 'Jeu' },
    { value: 'friday', label: 'Ven' },
    { value: 'saturday', label: 'Sam' },
    { value: 'sunday', label: 'Dim' },
  ];

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

        <FilterPipeline />
        <FilterSummary
          excludedDomainsCount={excludedDomains.length}
          minScoreThreshold={icpSettings.min_score_threshold}
          totalKeywords={
            Object.values(icpSettings.keywords).flat().length + priorityKeywords.length
          }
          activeRules={customRules.filter((r) => r.enabled).length}
          totalRules={customRules.length}
        />

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

        {/* 2. EMAILS À IGNORER (ex-domaines exclus) */}
        {activeSection === 'domaines' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconBan className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Emails à ignorer</div>
                <div className="font-mono !text-[11px] !text-muted">
                  Les emails provenant de ces domaines sont automatiquement ignorés. Ex : noreply.com, newsletter.fr
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text" 
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  placeholder="ex: noreply.com, spam.com"
                  className={`${settingInput} flex-1`}
                />
                <button
                  onClick={handleAddDomain}
                  className="px-3.5 py-2 bg-primary !text-white  !text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 flex-shrink-0"
                >
                  <IconPlus className="w-3 h-3" />
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {excludedDomains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono !text-[11px] bg-muted border border-default !text-muted hover:border-danger hover:!text-danger transition-colors group"
                  >
                    {d}
                    <button
                      onClick={() => handleRemoveDomain(d)}
                      className="w-3.5 h-3.5 rounded flex items-center justify-center opacity-50 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {excludedDomains.length === 0 && (
                  <span className="font-mono !text-[11px] !text-muted">Aucun domaine exclu</span>
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
                  Outils de prospection dont les notifications sont qualifiées automatiquement (bypass ICP, WhatsApp)
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Outils connectés</h4>
                <p className="font-mono !text-[11px] !text-muted mb-3">
                  Recherchez un outil pour l’ajouter. Les emails correspondants contournent le filtre ICP et peuvent
                  déclencher une notification WhatsApp selon la configuration.
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

        {/* 3. ICP */}
        {activeSection === 'icp' && (
          <section className="bg-card border border-default w-full w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconUsers className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Configuration Ideal Client Profile (ICP)</div>
                <div className="font-mono !text-[11px] !text-muted">Filtre automatique des leads pertinents</div>
              </div>
            </div>
            <div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Activer le filtrage ICP</h4>
                  <p className="font-mono !text-[11px] !text-muted">Ne traiter que les emails qui correspondent à votre profil client idéal</p>
                </div>
                <SettingToggle checked={icpSettings.enabled} onChange={(v) => setICPSettings({ ...icpSettings, enabled: v })} />
              </div>

              {icpSettings.enabled && (
                <>
                  <div className={`${settingRow} flex-col items-stretch`}>
                    <div className={settingLabel}>
                      <h4 className="!text-[11px] font-medium !text-primary mb-0.5">Score minimum de qualification</h4>
                      <p className="font-mono !text-[11px] !text-muted">Un email doit atteindre ce score pour être considéré comme un lead</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={icpSettings.min_score_threshold}
                        onChange={(e) => setICPSettings({ ...icpSettings, min_score_threshold: parseInt(e.target.value) || 8 })}
                        className="w-20 px-3 py-2 font-mono !text-sm font-semibold !text-primary bg-muted border border-default  text-center focus:border-primary outline-none"
                      />
                      <span className="font-mono !text-xs !text-muted">/ 15 points</span>
                    </div>
                  </div>

                  <div className={`${settingRow} flex-col items-stretch`}>
                    <div className={settingLabel}><h4 className="!text-[11px] font-medium !text-primary mb-1">Types de clients à cibler</h4></div>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {(['b2b', 'b2c', 'agence', 'freelance'] as const).map((type) => (
                        <label
                          key={type}
                          className={`flex items-center gap-2.5 p-2.5  cursor-pointer transition-all border ${
                            icpSettings.types_enabled[type] ? 'bg-success border-success/20' : 'bg-muted border-default hover:border-[#ccc8c2]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                              icpSettings.types_enabled[type] ? 'bg-success' : 'border-[1.5px] border-[#ccc8c2] bg-white'
                            }`}
                          >
                            {icpSettings.types_enabled[type] && <span className="!text-white !text-[10px]">✓</span>}
                          </div>
                          <span className="!text-[11px] font-medium capitalize">{type}</span>
                          <input
                            type="checkbox"
                            checked={icpSettings.types_enabled[type]}
                            onChange={(e) =>
                              setICPSettings({
                                ...icpSettings,
                                types_enabled: { ...icpSettings.types_enabled, [type]: e.target.checked },
                              })
                            }
                            className="sr-only"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={settingRow}>
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          icpSettings.boost_responses ? 'bg-success' : 'border-[1.5px] border-[#ccc8c2] bg-white'
                        }`}
                      >
                        {icpSettings.boost_responses && <span className="!text-white !text-[10px]">✓</span>}
                      </div>
                      <div>
                        <h4 className="!text-[11px] font-medium !text-primary">Booster les réponses</h4>
                        <p className="font-mono !text-[11px] !text-muted">Augmenter automatiquement le score des emails de réponse (+9 points)</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={icpSettings.boost_responses}
                        onChange={(e) => setICPSettings({ ...icpSettings, boost_responses: e.target.checked })}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className={settingRow}>
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          icpSettings.require_response_thread ? 'bg-success' : 'border-[1.5px] border-[#ccc8c2] bg-white'
                        }`}
                      >
                        {icpSettings.require_response_thread && <span className="!text-white !text-[10px]">✓</span>}
                      </div>
                      <div>
                        <h4 className="!text-[11px] font-medium !text-primary">Uniquement les threads de réponses</h4>
                        <p className="font-mono !text-[11px] !text-muted">Ne traiter que les emails qui sont des réponses (Re:, rtr:, ftr:)</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={icpSettings.require_response_thread}
                        onChange={(e) => setICPSettings({ ...icpSettings, require_response_thread: e.target.checked })}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className={settingRow}>
                    <div className={settingLabel}>
                      <p className="font-mono !text-[11px] !text-muted">
                        Les mots-clés profil et priorité sont configurés dans la section Mots-clés importants.
                      </p>
                      <button onClick={() => setActiveSection('mots-cles')} className="mt-2 px-3 py-1.5 border border-default !text-xs font-medium !text-muted hover:!text-primary hover:border-[#ccc8c2]">
                        Gérer les mots-clés
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* 4. MOTS-CLÉS IMPORTANTS (fusion profil + priorité) */}
        {activeSection === 'mots-cles' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconBolt className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Mots-clés importants</div>
                <div className="font-mono !text-[11px] !text-muted">
                  Si un email contient ces mots, il est traité en priorité. Ex : urgent, devis, rfp, projet
                </div>
              </div>
            </div>
            <div className="p-4 space-y-6">
              {/* Profil client (ICP keywords) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="!text-base">🎯</span>
                  <h4 className="!text-[11px] font-semibold !text-primary">Profil client</h4>
                </div>
                <p className="font-mono !text-[11px] !text-muted mb-3">Ces mots identifient le type de prospect</p>
                <div className="space-y-2 mb-3">
                  {(['b2b', 'agence', 'freelance'] as const).map((type) => (
                    <div key={type} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono !text-[10px] !text-muted uppercase w-14">{type}</span>
                      {(icpSettings.keywords[type] || []).map((kw) => (
                        <span
                          key={`${type}-${kw}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-mono !text-[11px] font-medium ${
                            type === 'b2b'
                              ? 'bg-blue-500/10 border border-blue-500/20 !text-blue-600'
                              : type === 'agence'
                                ? 'bg-accent/10 border border-accent/20 !text-accent'
                                : 'bg-success border border-success/20 !text-success'
                          }`}
                        >
                          {kw}
                          <button onClick={() => handleRemoveICPKeyword(type, kw)} className="opacity-50 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={editingICPType || ''}
                    onChange={(e) => {
                      setEditingICPType(e.target.value || null);
                      setNewICPKeyword('');
                    }}
                    className={`${settingInput} max-w-[140px]`}
                  >
                    <option value="">Choisir un type</option>
                    {(['b2b', 'agence', 'freelance'] as const).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {editingICPType && (
                    <>
                      <input
                        value={newICPKeyword}
                        onChange={(e) => setNewICPKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddICPKeyword(editingICPType)}
                        placeholder="Nouveau mot-clé"
                        className={`${settingInput} flex-1 max-w-[200px]`}
                      />
                      <button onClick={() => handleAddICPKeyword(editingICPType)} className="px-3 py-2 bg-success !text-white !text-xs font-semibold hover:opacity-90">
                        Ajouter
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Priorité haute (priority keywords) */}
              <div className="pt-4 border-t border-default">
                <div className="flex items-center gap-2 mb-2">
                  <span className="!text-base">⚡</span>
                  <h4 className="!text-[11px] font-semibold !text-primary">Priorité haute</h4>
                </div>
                <p className="font-mono !text-[11px] !text-muted mb-3">Ces mots font remonter l&apos;email en tête de liste</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="ex: urgent, rfp, devis"
                    className={`${settingInput} flex-1 max-w-[220px]`}
                  />
                  <button onClick={handleAddKeyword} className="px-3 py-2 bg-danger !text-white !text-xs font-semibold hover:opacity-90 flex items-center gap-1">
                    <IconPlus className="w-3 h-3" />
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {priorityKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-mono !text-[11px] font-medium bg-danger border border-danger/20 !text-danger"
                    >
                      {kw}
                      <button onClick={() => handleRemoveKeyword(kw)} className="opacity-50 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4b. INSTRUCTION IA (par source + saisonnier) */}
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

        {/* 5. DÉLAIS */}
        {activeSection === 'delais' && (
          <section className="bg-card border border-default w-full   overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                <IconClock className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Délais de relance</div>
                <div className="font-mono !text-[11px] !text-muted">Nombre de jours avant chaque type de relance</div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'payment_reminder', label: 'Rappel de paiement' },
                  { key: 'proposal_follow_up', label: 'Suivi de devis' },
                  { key: 'meeting_follow_up', label: 'Suivi de réunion' },
                  { key: 'thank_you', label: 'Email de remerciement' },
                  { key: 'check_in', label: 'Prise de contact' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="font-mono !text-[10px] !text-muted uppercase tracking-wider block mb-1.5">{label}</label>
                    <input
                      type="number"
                      min={1}
                      value={delaySettings[key as keyof typeof delaySettings]}
                      onChange={(e) => setDelaySettings({ ...delaySettings, [key]: parseInt(e.target.value) || 1 })}
                      className={settingInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. HEURES */}
        {activeSection === 'heures' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-success border border-success flex items-center justify-center !text-white">
                <IconCalendar className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Heures de travail</div>
                <div className="font-mono !text-[11px] !text-muted">Les emails ne seront envoyés que pendant ces horaires</div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="font-mono !text-[10px] !text-muted uppercase tracking-wider block mb-1.5">Heure de début</label>
                  <input type="time" value={workHours.start} onChange={(e) => setWorkHours({ ...workHours, start: e.target.value })} className={settingInput} />
                </div>
                <div>
                  <label className="font-mono !text-[10px] !text-muted uppercase tracking-wider block mb-1.5">Heure de fin</label>
                  <input type="time" value={workHours.end} onChange={(e) => setWorkHours({ ...workHours, end: e.target.value })} className={settingInput} />
                </div>
              </div>
              <div>
                <div className="font-mono !text-[10px] !text-muted uppercase tracking-wider mb-2">Jours ouvrés</div>
                <div className="flex flex-wrap gap-1.5">
                  {daysOfWeek.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => handleDayToggle(d.value)}
                      className={`px-3 py-1.5  font-mono !text-[11px] transition-all ${
                        workHours.days.includes(d.value)
                          ? 'bg-primary !text-white border border-primary'
                          : 'bg-muted border border-default !text-muted hover:border-[#ccc8c2]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 7. RÈGLES AVANCÉES */}
        {activeSection === 'regles' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent border border-accent flex items-center justify-center !text-white">
                  <IconShieldCheck className="w-4 h-4 !text-white" />
                </div>
                <div>
                  <div className="!text-sm font-semibold !text-primary">Règles avancées</div>
                  <div className="font-mono !text-[11px] !text-muted">
                    Règles personnalisées pour les cas particuliers. Ex : si expéditeur = concurrent.com → ignorer
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-default  !text-xs font-medium !text-muted hover:!text-primary hover:border-[#ccc8c2] transition-colors"
              >
                <IconFilter className="w-3 h-3" />
                Gérer les règles
              </button>
            </div>
            <div className="p-4">
              {customRules.length > 0 ? (
                <div className="space-y-2">
                  {customRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-3 p-3 bg-muted border border-default  hover:border-[#ccc8c2] transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                      <span className="flex-1 !text-[11px] font-medium !text-primary">{rule.name}</span>
                      <span className="font-mono !text-[10px] px-2 py-0.5 rounded bg-success !text-success border border-success/20">
                        Priorité {rule.priority}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="!text-sm !text-muted">Aucune règle configurée</p>
              )}
            </div>
          </section>
        )}

        {/* 8. NOTIFICATIONS */}
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

                  <div className="p-4 border-t border-default flex items-center gap-3">
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
                          Tester la connexion
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

      <RuleManagementModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        rules={customRules}
        onSaveRules={(newRules) => {
          setCustomRules(newRules);
          setShowRulesModal(false);
        }}
      />
    </>
  );
}
