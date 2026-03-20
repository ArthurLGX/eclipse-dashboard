'use client';

import { useState, useEffect, useRef } from 'react';
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
} from '@tabler/icons-react';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import { updateAutomationSettings, createAutomationSettings, testWhatsAppConnection } from '@/lib/smart-follow-up-api';
import { useAuth } from '@/app/context/AuthContext';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import { usePopup } from '@/app/context/PopupContext';
import { useSettingsLayout } from './settings-context';
import type { AutomationSettings, FilterRule } from '@/types/smart-follow-up';

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
  });
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testWhatsAppResult, setTestWhatsAppResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAutoApprove(settings.auto_approve);
      setExcludedDomains(settings.excluded_domains || []);
      setPriorityKeywords(settings.priority_keywords || []);
      setDelaySettings(settings.delay_settings);
      setWorkHours(settings.work_hours);
      setNotificationPreferences(settings.notification_preferences);
      setCustomRules(settings.custom_rules || []);
      if (settings.icp_settings) setICPSettings(settings.icp_settings);
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
        });
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: Partial<AutomationSettings> = {
        enabled,
        auto_approve: autoApprove,
        excluded_domains: excludedDomains,
        priority_keywords: priorityKeywords,
        delay_settings: delaySettings,
        work_hours: workHours,
        notification_preferences: notificationPreferences,
        custom_rules: customRules,
        icp_settings: icpSettings,
        whatsapp_config: whatsappConfig,
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
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5  font-semibold !text-[13px] transition-all flex-shrink-0 ${
              saved
                ? 'bg-success !text-white'
                : 'bg-primary !text-white hover:opacity-90 disabled:opacity-50'
            }`}
          >
            {saved ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              <div className="w-8 h-8 rounded-md bg-success border border-success flex items-center justify-center !text-white">
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
                  <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Smart Follow-Up activé</h4>
                  <p className="font-mono !text-[11px] !text-muted">Activer ou désactiver le système de relances automatiques</p>
                </div>
                <SettingToggle checked={enabled} onChange={setEnabled} />
              </div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Approbation automatique</h4>
                  <p className="font-mono !text-[11px] !text-muted">Les actions à haute confiance (&gt;90%) seront approuvées automatiquement</p>
                </div>
                <SettingToggleOrange checked={autoApprove} onChange={setAutoApprove} />
              </div>
            </div>
          </section>
        )}

        {/* 2. DOMAINES EXCLUS */}
        {activeSection === 'domaines' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-md bg-accent border border-accent flex items-center justify-center !text-white">
                <IconBan className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Domaines exclus</div>
                <div className="font-mono !text-[11px] !text-muted">Ces emails ne déclencheront pas de relances automatiques</div>
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono !text-[11px] bg-muted border border-default !text-muted hover:border-danger hover:!text-danger transition-colors group"
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

        {/* 3. ICP */}
        {activeSection === 'icp' && (
          <section className="bg-card border border-default w-full w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-accent border border-accent flex items-center justify-center !text-white">
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
                  <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Activer le filtrage ICP</h4>
                  <p className="font-mono !text-[11px] !text-muted">Ne traiter que les emails qui correspondent à votre profil client idéal</p>
                </div>
                <SettingToggle checked={icpSettings.enabled} onChange={(v) => setICPSettings({ ...icpSettings, enabled: v })} />
              </div>

              {icpSettings.enabled && (
                <>
                  <div className={`${settingRow} flex-col items-stretch`}>
                    <div className={settingLabel}>
                      <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Score minimum de qualification</h4>
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
                    <div className={settingLabel}><h4 className="!text-[13px] font-medium !text-primary mb-1">Types de clients à cibler</h4></div>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {(['b2b', 'b2c', 'agence', 'freelance'] as const).map((type) => (
                        <label
                          key={type}
                          className={`flex items-center gap-2.5 p-2.5  cursor-pointer transition-all border ${
                            icpSettings.types_enabled[type] ? 'bg-success/10 border-success/20' : 'bg-muted border-default hover:border-[#ccc8c2]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                              icpSettings.types_enabled[type] ? 'bg-success' : 'border-[1.5px] border-[#ccc8c2] bg-white'
                            }`}
                          >
                            {icpSettings.types_enabled[type] && <span className="!text-white !text-[10px]">✓</span>}
                          </div>
                          <span className="!text-[13px] font-medium capitalize">{type}</span>
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
                        <h4 className="!text-[13px] font-medium !text-primary">Booster les réponses</h4>
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
                        <h4 className="!text-[13px] font-medium !text-primary">Uniquement les threads de réponses</h4>
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

                  {/* Mots-clés par type */}
                  {(['b2b', 'agence', 'freelance'] as const).map((type) => (
                    <div key={type} className={`${settingRow} flex-col items-stretch`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="font-mono !text-[10px] !text-muted uppercase tracking-wider">{type}</div>
                        <button
                          onClick={() => { setEditingICPType(editingICPType === type ? null : type); setNewICPKeyword(''); }}
                          className="px-2.5 py-1  bg-success !text-white !text-xs font-semibold hover:opacity-90 flex items-center gap-1"
                        >
                          <IconPlus className="w-3 h-3" />
                          Ajouter
                        </button>
                      </div>
                      {editingICPType === type && (
                        <div className="flex gap-2 w-full">
                          <input
                            value={newICPKeyword}
                            onChange={(e) => setNewICPKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddICPKeyword(type)}
                            placeholder={`Nouveau mot-clé ${type}`}
                            className={settingInput}
                            autoFocus
                          />
                          <button onClick={() => handleAddICPKeyword(type)} className="px-3 py-2 bg-primary !text-white  !text-xs font-semibold">
                            Ajouter
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 w-full">
                        {(icpSettings.keywords[type] || []).map((kw) => (
                          <span
                            key={kw}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono !text-[11px] font-medium ${
                              type === 'b2b'
                                ? 'bg-blue-500/10 border border-blue-500/20 !text-blue-600'
                                : type === 'agence'
                                  ? 'bg-accent/10 border border-accent/20 !text-accent'
                                  : 'bg-success/10 border border-success/20 !text-success'
                            }`}
                          >
                            {kw}
                            <button onClick={() => handleRemoveICPKeyword(type, kw)} className="opacity-50 hover:opacity-100">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Mots-clés prioritaires */}
                  <div className={`${settingRow} flex-col items-stretch bg-danger/5`}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="!text-[13px] font-semibold !text-primary">Mots-clés prioritaires</div>
                        <div className="font-mono !text-[11px] !text-muted">Domaine de l&apos;expéditeur + si ces mots apparaissent dans sujet/corps → lead chaud (ex: rfp, consultation, refonte, budget)</div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                          placeholder="ex: rfp, consultation, refonte, budget, walego"
                          className={`${settingInput} w-28`}
                        />
                        <button
                          onClick={handleAddKeyword}
                          className="px-2.5 py-1  bg-danger !text-white !text-xs font-semibold hover:opacity-90 flex items-center gap-1"
                        >
                          <IconPlus className="w-3 h-3" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 w-full">
                      {priorityKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono !text-[11px] font-medium bg-danger/10 border border-danger/20 !text-danger"
                        >
                          {kw}
                          <button onClick={() => handleRemoveKeyword(kw)} className="opacity-50 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* 4. MOTS-CLÉS (section dédiée si séparée) */}
        {activeSection === 'mots-cles' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-md bg-accent border border-accent flex items-center justify-center !text-white">
                <IconBolt className="w-4 h-4 !text-white" />
              </div>
              <div>
                <div className="!text-sm font-semibold !text-primary">Mots-clés de détection</div>
                <div className="font-mono !text-[11px] !text-muted">Classifient automatiquement les leads entrants</div>
              </div>
            </div>
            <div className="p-4">
              <p className="!text-sm !text-muted mb-4">Configurez les mots-clés dans la section Profil ICP.</p>
              <button onClick={() => setActiveSection('icp')} className="px-4 py-2 bg-accent !text-white  !text-sm font-medium hover:opacity-90">
                Aller au profil ICP
              </button>
            </div>
          </section>
        )}

        {/* 5. DÉLAIS */}
        {activeSection === 'delais' && (
          <section className="bg-card border border-default w-full   overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-md bg-accent border border-accent flex items-center justify-center !text-white">
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
              <div className="w-8 h-8 rounded-md bg-success border border-success flex items-center justify-center !text-white">
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

        {/* 7. RÈGLES */}
        {activeSection === 'regles' && (
          <section className="bg-card border border-default w-full overflow-hidden mb-5">
            <div className="p-4 border-b border-default bg-muted/30 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-accent border border-accent flex items-center justify-center !text-white">
                  <IconShieldCheck className="w-4 h-4 !text-white" />
                </div>
                <div>
                  <div className="!text-sm font-semibold !text-primary">Règles de filtrage personnalisées</div>
                  <div className="font-mono !text-[11px] !text-muted">
                    {customRules.length} règle{customRules.length > 1 ? 's' : ''} configurée{customRules.length > 1 ? 's' : ''} · {customRules.filter((r) => r.enabled).length} active{customRules.filter((r) => r.enabled).length > 1 ? 's' : ''} sur {customRules.length}
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
                      <span className="flex-1 !text-[13px] font-medium !text-primary">{rule.name}</span>
                      <span className="font-mono !text-[10px] px-2 py-0.5 rounded bg-success/10 !text-success border border-success/20">
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
              <div className="w-8 h-8 rounded-md bg-accent border border-accent flex items-center justify-center !text-white">
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
                  <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Notifications email</h4>
                  <p className="font-mono !text-[11px] !text-muted">Recevoir un email pour chaque action</p>
                </div>
                <SettingToggle checked={notificationPreferences.email} onChange={(v) => setNotificationPreferences({ ...notificationPreferences, email: v })} />
              </div>
              <div className={settingRow}>
                <div className={settingLabel}>
                  <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Notifications dashboard</h4>
                  <p className="font-mono !text-[11px] !text-muted">Afficher les notifications dans l&apos;interface</p>
                </div>
                <SettingToggle checked={notificationPreferences.dashboard} onChange={(v) => setNotificationPreferences({ ...notificationPreferences, dashboard: v })} />
              </div>
              <div className={`${settingRow} flex-col items-stretch`}>
                <div className={settingLabel}><h4 className="!text-[13px] font-medium !text-primary mb-1">Fréquence des notifications</h4></div>
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
              <div className="w-8 h-8 rounded-md bg-[#25D366] border border-[#25D366] flex items-center justify-center !text-white">
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
                  <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Activer les notifications</h4>
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
                      <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Provider</h4>
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
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Account SID</h4>
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
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Auth Token</h4>
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
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">From number</h4>
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
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">To number</h4>
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
                      <div className={settingRow}>
                        <div className={settingLabel}>
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Phone Number ID</h4>
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
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Access Token</h4>
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
                          <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Votre numéro WhatsApp</h4>
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
                      <h4 className="!text-[13px] font-medium !text-primary mb-0.5">Template du message</h4>
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
                        <pre className="font-sans !text-[13px] !text-primary whitespace-pre-wrap break-words m-0 leading-relaxed">
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
