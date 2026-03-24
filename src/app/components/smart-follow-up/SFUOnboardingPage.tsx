'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { IconLoader2 } from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { fetchSmtpConfig, saveSmtpConfig, testImapConnection, getToken } from '@/lib/api';
import { createAutomationSettings, updateAutomationSettings } from '@/lib/smart-follow-up-api';
import { mergeLeadSourcesWithDefaults } from '@/data/lead-sources-default';
import type { AutomationSettings } from '@/types/smart-follow-up';
import type { SmtpConfig } from '@/types';
import { getDefaultAutomationCreatePayload } from '@/app/components/smart-follow-up/onboarding/default-automation-payload';
import { buildLeadSourcesForOnboarding } from '@/app/components/smart-follow-up/onboarding/build-lead-sources-selection';
import { StepProfile } from '@/app/components/smart-follow-up/onboarding/StepProfile';
import { StepGoals } from '@/app/components/smart-follow-up/onboarding/StepGoals';
import { StepSources } from '@/app/components/smart-follow-up/onboarding/StepSources';
import { StepCredentials, type ImapFormState } from '@/app/components/smart-follow-up/onboarding/StepCredentials';
import { StepRecap } from '@/app/components/smart-follow-up/onboarding/StepRecap';

const STEPS = [
  { id: 1, label: 'Votre profil', sub: 'Déjà pré-rempli', req: true },
  { id: 2, label: 'Votre objectif', sub: 'Ce que vous voulez faire', req: true },
  { id: 3, label: 'Sources de leads', sub: 'Walego, Folk, Lemlist…', req: true },
  { id: 4, label: 'Connexions & clés', sub: 'Gmail, WhatsApp, IMAP', req: true },
  { id: 5, label: 'Récapitulatif', sub: 'Lancer le système', req: false },
] as const;

export function SFUOnboardingPage({
  settings,
  smtpConfig,
  mutateSettings,
  onSmtpRefresh,
}: {
  settings: AutomationSettings | null;
  smtpConfig: SmtpConfig | null;
  mutateSettings: () => Promise<unknown>;
  onSmtpRefresh: () => Promise<void>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [credSection, setCredSection] = useState<'gmail' | 'whatsapp'>('gmail');
  const [imapMsg, setImapMsg] = useState<string | null>(null);
  const [testingImap, setTestingImap] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [imapVerified, setImapVerified] = useState(
    () => !!(smtpConfig?.imap_verified && smtpConfig?.imap_enabled)
  );

  const [selectedRole, setSelectedRole] = useState<string | null>(settings?.user_profile?.role ?? null);
  const [goals, setGoals] = useState<string[]>(settings?.user_profile?.goals ?? []);
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    if (!settings?.lead_sources?.length) {
      return ['walego', 'folk', 'whatsapp'];
    }
    return mergeLeadSourcesWithDefaults(settings.lead_sources)
      .filter((s) => s.enabled)
      .map((s) => s.id);
  });

  const [imap, setImap] = useState<ImapFormState>(() => ({
    imap_host: smtpConfig?.imap_host || 'imap.gmail.com',
    imap_port: smtpConfig?.imap_port || 993,
    imap_user: smtpConfig?.imap_user || user?.email || '',
    imap_password: '',
    imap_secure: smtpConfig?.imap_secure !== false,
  }));

  const wcMeta = settings?.whatsapp_config?.meta;
  const [whatsappMeta, setWhatsappMeta] = useState({
    phone_number_id: wcMeta?.phone_number_id || settings?.whatsapp_config?.phone_number_id || '',
    access_token: wcMeta?.access_token || settings?.whatsapp_config?.access_token || '',
    recipient_number: wcMeta?.recipient_number || settings?.whatsapp_config?.recipient_number || '',
  });

  useEffect(() => {
    setImapVerified(!!(smtpConfig?.imap_verified && smtpConfig?.imap_enabled));
  }, [smtpConfig?.imap_verified, smtpConfig?.imap_enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const st = sp.get('step');
    const gmail = sp.get('gmail');
    if (st === '4' || gmail === 'connected' || gmail === 'error') {
      setStep(4);
      setMaxReached((m) => Math.max(m, 4));
      if (gmail === 'connected' || gmail === 'error') {
        if (gmail === 'connected') {
          const email = sp.get('email');
          showGlobalPopup(
            email ? `Gmail connecté (${decodeURIComponent(email)})` : 'Gmail connecté',
            'success'
          );
        } else {
          showGlobalPopup('Connexion Gmail échouée. Réessayez ou utilisez IMAP.', 'error');
        }
        void mutateSettings();
        router.replace('/dashboard/smart-follow-up', { scroll: false });
      }
    }
  }, [mutateSettings, router, showGlobalPopup]);

  const displayName = useMemo(() => {
    const fn = user?.firstname?.trim();
    const ln = user?.lastname?.trim();
    if (fn || ln) return [fn, ln].filter(Boolean).join(' ');
    return user?.username || 'Utilisateur';
  }, [user]);

  const avatarUrl = user?.profile_picture?.url
    ? user.profile_picture.url.startsWith('http')
      ? user.profile_picture.url
      : `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${user.profile_picture.url}`
    : null;

  const ensureSettings = useCallback(async (): Promise<AutomationSettings> => {
    if (settings?.documentId) return settings;
    const created = await createAutomationSettings(getDefaultAutomationCreatePayload());
    await mutateSettings();
    return created;
  }, [settings, mutateSettings]);

  const persistUserProfile = async (patch: NonNullable<AutomationSettings['user_profile']>) => {
    const s = await ensureSettings();
    const prev = s.user_profile || {};
    await updateAutomationSettings(s.documentId, {
      user_profile: {
        ...prev,
        ...patch,
        name: displayName,
        email: user?.email || prev.email,
      },
    });
    await mutateSettings();
  };

  const handleStep1Next = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await persistUserProfile({ role: selectedRole });
      setMaxReached((m) => Math.max(m, 2));
      setStep(2);
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    if (goals.length === 0) return;
    setSaving(true);
    try {
      await persistUserProfile({ goals });
      setMaxReached((m) => Math.max(m, 3));
      setStep(3);
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStep3Next = async () => {
    if (selectedSources.length === 0) return;
    setSaving(true);
    try {
      const s = await ensureSettings();
      await updateAutomationSettings(s.documentId, {
        lead_sources: buildLeadSourcesForOnboarding(selectedSources),
      });
      await mutateSettings();
      setMaxReached((m) => Math.max(m, 4));
      setStep(4);
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    const token = getToken();
    if (!token) {
      showGlobalPopup('Session requise pour connecter Gmail.', 'error');
      return;
    }
    setGmailConnecting(true);
    try {
      const res = await fetch('/api/auth/gmail', {
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

  const handleTestImap = async () => {
    if (!imap.imap_host || !imap.imap_user || !imap.imap_password) {
      setImapMsg('Remplissez serveur, email et mot de passe.');
      return;
    }
    setTestingImap(true);
    setImapMsg(null);
    try {
      const r = await testImapConnection({
        imap_host: imap.imap_host,
        imap_port: imap.imap_port,
        imap_user: imap.imap_user,
        imap_password: imap.imap_password,
        imap_secure: imap.imap_secure,
      });
      setImapMsg(r.message || (r.success ? 'Connexion OK' : 'Échec'));
      if (r.success) {
        setImapVerified(true);
        if (!user?.id) return;
        const existing = await fetchSmtpConfig(user.id);
        await saveSmtpConfig(
          user.id,
          {
            smtp_host: existing?.smtp_host || 'smtp.gmail.com',
            smtp_port: existing?.smtp_port ?? 587,
            smtp_user: existing?.smtp_user || imap.imap_user,
            smtp_password: imap.imap_password,
            smtp_secure: existing?.smtp_secure ?? false,
            imap_enabled: true,
            imap_host: imap.imap_host,
            imap_port: imap.imap_port,
            imap_user: imap.imap_user,
            imap_password: imap.imap_password,
            imap_secure: imap.imap_secure,
          },
          true,
          true
        );
        const s = await ensureSettings();
        await updateAutomationSettings(s.documentId, { imap_configured: true });
        await mutateSettings();
        await onSmtpRefresh();
        showGlobalPopup('✓ Boîte IMAP connectée', 'success');
      }
    } catch (e) {
      setImapMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setTestingImap(false);
    }
  };

  const handleStep4Next = async () => {
    const ok =
      imapVerified ||
      settings?.imap_configured ||
      !!(smtpConfig?.imap_verified && smtpConfig?.imap_enabled) ||
      !!settings?.gmail_configured;
    if (!ok) {
      showGlobalPopup('Connectez Gmail (OAuth) ou testez la connexion IMAP avant de continuer.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const s = await ensureSettings();
      const hasWa =
        whatsappMeta.phone_number_id.trim() &&
        whatsappMeta.access_token.trim() &&
        whatsappMeta.recipient_number.trim();
      await updateAutomationSettings(s.documentId, {
        whatsapp_config: {
          enabled: !!hasWa,
          provider: 'meta',
          meta: {
            phone_number_id: whatsappMeta.phone_number_id,
            access_token: whatsappMeta.access_token,
            recipient_number: whatsappMeta.recipient_number,
          },
        },
      });
      await mutateSettings();
      setMaxReached((m) => Math.max(m, 5));
      setStep(5);
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const s = await ensureSettings();
      await updateAutomationSettings(s.documentId, { onboarding_completed: true });
      await mutateSettings();
      showGlobalPopup('Smart Follow-Up prêt', 'success');
      router.replace('/dashboard/smart-follow-up');
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setLaunching(false);
    }
  };

  const canProceed = (n: number): boolean => {
    if (n === 1) return selectedRole !== null;
    if (n === 2) return goals.length > 0;
    if (n === 3) return selectedSources.length > 0;
    if (n === 4) {
      return (
        imapVerified ||
        !!settings?.imap_configured ||
        !!(smtpConfig?.imap_verified && smtpConfig?.imap_enabled) ||
        !!settings?.gmail_configured
      );
    }
    return true;
  };

  const goNext = () => {
    if (step === 1) void handleStep1Next();
    else if (step === 2) void handleStep2Next();
    else if (step === 3) void handleStep3Next();
    else if (step === 4) void handleStep4Next();
  };

  const skipStep = () => {
    if (step === 1 || step === 4) return;
    setMaxReached((m) => Math.max(m, step + 1));
    setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => {
    if (step <= 1) return;
    setStep(step - 1);
  };

  const goToStep = (n: number) => {
    if (n > maxReached) return;
    setStep(n);
  };

  const toggleGoal = (id: string) => {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  };

  const toggleSource = (id: string) => {
    setSelectedSources((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const progressPct = Math.round((step / 5) * 100);
  const headerLabel = `Étape ${step} — ${STEPS[step - 1].label}`;

  const emailConnected =
    !!settings?.imap_configured ||
    !!(smtpConfig?.imap_verified && smtpConfig?.imap_enabled) ||
    imapVerified ||
    !!settings?.gmail_configured;

  const whatsappOk =
    !!(whatsappMeta.phone_number_id && whatsappMeta.access_token && whatsappMeta.recipient_number) ||
    settings?.whatsapp_config?.enabled;

  const showSkip = step !== 1 && step !== 4;

  return (
    <div className="fixed inset-0 z-[100] flex bg-[#0d0d0d] text-[#f0ede8]">
      <aside className="w-[320px] shrink-0 border-r border-[#2a2a2a] bg-[#161616] flex flex-col p-6 overflow-hidden">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f0ede8] to-[#aaa] flex items-center justify-center text-[#0d0d0d] text-xs font-bold">
            ◎
          </div>
          <span className="font-bold text-sm tracking-tight">Smart Follow-Up</span>
        </div>
        <h2 className="text-[22px] font-bold tracking-tight leading-tight mb-2">Configurez votre espace en 5 étapes</h2>
        <p className="text-xs text-[#888] leading-relaxed mb-9">
          Une fois configuré, vos leads sont qualifiés et relancés automatiquement.
        </p>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {STEPS.map((st, i) => {
            const n = st.id;
            const locked = n > maxReached;
            const isDone = n < step;
            const active = step === n;
            return (
              <div key={st.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => goToStep(n)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[10px] border text-left transition-all ${
                    locked
                      ? 'opacity-35 cursor-not-allowed border-transparent'
                      : active
                        ? 'bg-[#1e1e1e] border-[#3a3a3a]'
                        : 'border-transparent hover:bg-[#1e1e1e] hover:border-[#2a2a2a]'
                  }`}
                >
                  <div
                    className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center font-mono text-[11px] shrink-0 ${
                      isDone && !active
                        ? 'bg-emerald-500 border-emerald-500 text-[#0d0d0d]'
                        : active
                          ? 'border-[#f0ede8] text-[#f0ede8]'
                          : 'border-[#3a3a3a] text-[#888]'
                    }`}
                  >
                    {isDone && !active ? '✓' : n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${active ? 'text-[#f0ede8]' : 'text-[#888]'}`}>{st.label}</div>
                    <div className="font-mono text-[10px] text-[#555] truncate">{st.sub}</div>
                  </div>
                  {st.req ? (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                      Requis
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#555] shrink-0">
                      Fin
                    </span>
                  )}
                </button>
                {i < STEPS.length - 1 && <div className="h-2.5 w-px bg-[#2a2a2a] ml-[24px]" />}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-5 border-t border-[#2a2a2a]">
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-2.5">Progression</div>
          <div className="h-[3px] bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] text-[#888]">
            <span>
              Étape {step} sur 5
            </span>
            <span>{progressPct}%</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
        <header className="flex items-center justify-between px-10 py-5 border-b border-[#2a2a2a] shrink-0">
          <span className="font-mono text-[10px] text-[#888]">{headerLabel}</span>
          <button
            type="button"
            onClick={() => setShowSkipConfirm(true)}
            className="font-mono text-[11px] text-[#888] hover:text-[#f0ede8] px-2 py-1 rounded-md hover:bg-[#161616] transition-colors"
          >
            Configurer plus tard →
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-12">
          {step === 1 && (
            <StepProfile
              displayName={displayName}
              email={user?.email || ''}
              avatarUrl={avatarUrl}
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
            />
          )}
          {step === 2 && <StepGoals selected={goals} onToggle={toggleGoal} />}
          {step === 3 && (
            <StepSources
              query={sourceQuery}
              onQueryChange={setSourceQuery}
              selectedIds={selectedSources}
              onToggle={toggleSource}
              onRemove={toggleSource}
            />
          )}
          {step === 4 && !user?.id && (
            <p className="text-sm text-[#888]">Session requise pour configurer les connexions.</p>
          )}
          {step === 4 && user?.id && (
            <Suspense
              fallback={<p className="text-sm text-[#888] font-mono text-[11px]">Chargement des connexions…</p>}
            >
              <StepCredentials
                openSection={credSection}
                onOpenSection={setCredSection}
                imap={imap}
                onImapChange={(p) => setImap((prev) => ({ ...prev, ...p }))}
                onTestImap={handleTestImap}
                testingImap={testingImap}
                imapMessage={imapMsg}
                whatsappMeta={whatsappMeta}
                onWhatsappMetaChange={(p) => setWhatsappMeta((prev) => ({ ...prev, ...p }))}
                gmailConfigured={!!settings?.gmail_configured}
                gmailEmailFromSettings={settings?.gmail_config?.email ?? null}
                onConnectGmail={handleConnectGmail}
                gmailConnecting={gmailConnecting}
              />
            </Suspense>
          )}
          {step === 5 && (
            <StepRecap
              role={selectedRole}
              goalsCount={goals.length}
              selectedSourceIds={selectedSources}
              emailConnected={emailConnected}
              whatsappConfigured={!!whatsappOk}
              userEmail={user?.email || ''}
              onLaunch={handleLaunch}
              launching={launching}
            />
          )}
        </div>

        <footer className="flex items-center justify-between px-10 py-5 border-t border-[#2a2a2a] shrink-0">
          <button
            type="button"
            onClick={goBack}
            disabled={step <= 1}
            className="px-4 py-2.5 rounded-lg border border-[#2a2a2a] text-xs font-medium text-[#888] hover:text-[#f0ede8] hover:border-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-2.5">
            {showSkip && step < 5 && (
              <button type="button" onClick={skipStep} className="font-mono text-[11px] text-[#888] hover:text-[#f0ede8] px-2 py-1 rounded-md">
                Passer cette étape
              </button>
            )}
            {step < 5 && (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed(step) || saving}
                className="px-5 py-2.5 rounded-lg bg-[#f0ede8] text-[#0d0d0d] text-xs font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? <IconLoader2 className="w-4 h-4 animate-spin" /> : null}
                {step === 4 ? 'Voir le récapitulatif →' : 'Continuer →'}
              </button>
            )}
          </div>
        </footer>
      </div>

      {showSkipConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSkipConfirm(false)}
        >
          <div
            className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[#f0ede8] mb-4">
              Configurer plus tard ? Le Smart Follow-Up ne sera pas pleinement actif tant que la configuration n&apos;est pas
              complète.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="px-3 py-2 rounded-lg border border-[#2a2a2a] text-xs text-[#888]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSkipConfirm(false);
                  router.push('/dashboard');
                }}
                className="px-3 py-2 rounded-lg bg-[#f0ede8] text-[#0d0d0d] text-xs font-semibold"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SFUOnboardingPage;
