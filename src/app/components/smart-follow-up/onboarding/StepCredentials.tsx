'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

function GoogleGlyph() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export type ImapFormState = {
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  imap_secure: boolean;
};

export function StepCredentials({
  openSection,
  onOpenSection,
  imap,
  onImapChange,
  onTestImap,
  testingImap,
  imapMessage,
  whatsappMeta,
  onWhatsappMetaChange,
  gmailConfigured,
  gmailEmailFromSettings,
  onConnectGmail,
  gmailConnecting,
}: {
  openSection: 'gmail' | 'whatsapp';
  onOpenSection: (s: 'gmail' | 'whatsapp') => void;
  imap: ImapFormState;
  onImapChange: (p: Partial<ImapFormState>) => void;
  onTestImap: () => void;
  testingImap: boolean;
  imapMessage: string | null;
  whatsappMeta: { phone_number_id: string; access_token: string; recipient_number: string };
  onWhatsappMetaChange: (p: Partial<typeof whatsappMeta>) => void;
  gmailConfigured?: boolean;
  gmailEmailFromSettings?: string | null;
  onConnectGmail: () => void;
  gmailConnecting?: boolean;
}) {
  const searchParams = useSearchParams();
  const [gmailReturn, setGmailReturn] = useState<'idle' | 'connected' | 'error'>('idle');
  const [gmailReturnEmail, setGmailReturnEmail] = useState<string | null>(null);

  useEffect(() => {
    const g = searchParams.get('gmail');
    const email = searchParams.get('email');
    if (g === 'connected') {
      setGmailReturn('connected');
      setGmailReturnEmail(email ? decodeURIComponent(email) : null);
    } else if (g === 'error') {
      setGmailReturn('error');
    }
  }, [searchParams]);

  const oauthConnected = !!(gmailConfigured || gmailReturn === 'connected');
  const oauthEmail = gmailEmailFromSettings || gmailReturnEmail;
  const oauthError = gmailReturn === 'error';

  return (
    <div>
      <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Étape 4 · Connexions & clés API</p>
      <h1 className="text-3xl font-bold tracking-tight text-[#f0ede8] mb-2">Connectez vos outils</h1>
      <p className="text-sm text-[#888] mb-8 max-w-[560px] leading-relaxed">
        Connectez Gmail en OAuth (recommandé) ou configurez IMAP manuellement. Les secrets sont chiffrés côté serveur.
      </p>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] overflow-hidden">
          <button
            type="button"
            onClick={() => onOpenSection('gmail')}
            className="w-full flex items-center gap-3 px-[18px] py-3.5 border-b border-[#2a2a2a] text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-lg">📧</div>
            <span className="text-[13px] font-semibold text-[#f0ede8] flex-1">Boîte email — Gmail ou IMAP</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
              Requis
            </span>
            <IconChevronDown
              className={`w-4 h-4 text-[#888] transition-transform ${openSection === 'gmail' ? 'rotate-180' : ''}`}
            />
          </button>
          {openSection === 'gmail' && (
            <div className="p-[18px] space-y-3">
              <div className="space-y-2.5">
                {oauthConnected ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3">
                    <span className="text-emerald-400 text-lg leading-none">✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#f0ede8]">Gmail connecté</div>
                      {oauthEmail ? (
                        <div className="font-mono text-[11px] text-[#888] truncate">{oauthEmail}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={onConnectGmail}
                      disabled={gmailConnecting}
                      className="font-mono text-[10px] px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[#888] hover:text-[#f0ede8] hover:border-[#3a3a3a] disabled:opacity-50"
                    >
                      Reconnecter
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onConnectGmail}
                      disabled={gmailConnecting}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#f0ede8] text-[#0d0d0d] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {gmailConnecting ? '…' : <GoogleGlyph />}
                      {gmailConnecting ? 'Redirection…' : 'Connecter avec Gmail OAuth'}
                    </button>
                    {oauthError ? (
                      <p className="text-xs text-amber-400/90">
                        Connexion échouée. Réessayez ou utilisez IMAP ci-dessous.
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-[#2a2a2a]" />
                <span className="font-mono text-[10px] text-[#555] uppercase tracking-wider">ou IMAP manuel</span>
                <div className="h-px flex-1 bg-[#2a2a2a]" />
              </div>

              <p className="text-xs text-[#888]">
                Pour IMAP sans OAuth, utilisez un{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  mot de passe d&apos;application
                </a>{' '}
                Gmail.
              </p>
              <div>
                <label className="text-[11px] font-medium text-[#888] block mb-1.5">Serveur IMAP</label>
                <input
                  value={imap.imap_host}
                  onChange={(e) => onImapChange({ imap_host: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                  placeholder="imap.gmail.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-[#888] block mb-1.5">Port</label>
                  <input
                    type="number"
                    value={imap.imap_port}
                    onChange={(e) => onImapChange({ imap_port: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-[#888] mt-7">
                  <input
                    type="checkbox"
                    checked={imap.imap_secure}
                    onChange={(e) => onImapChange({ imap_secure: e.target.checked })}
                  />
                  TLS
                </label>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#888] block mb-1.5">Email</label>
                <input
                  type="email"
                  value={imap.imap_user}
                  onChange={(e) => onImapChange({ imap_user: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                  placeholder="vous@gmail.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#888] block mb-1.5">Mot de passe d&apos;application</label>
                <input
                  type="password"
                  value={imap.imap_password}
                  onChange={(e) => onImapChange({ imap_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                onClick={onTestImap}
                disabled={testingImap}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#2a2a2a] font-mono text-[10px] text-[#888] hover:text-[#f0ede8] hover:border-[#3a3a3a] disabled:opacity-50"
              >
                {testingImap ? '…' : '⚡'} Tester la connexion IMAP
              </button>
              {imapMessage && <p className="text-xs text-[#888] font-mono">{imapMessage}</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] overflow-hidden">
          <button
            type="button"
            onClick={() => onOpenSection('whatsapp')}
            className="w-full flex items-center gap-3 px-[18px] py-3.5 border-b border-[#2a2a2a] text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-lg">💬</div>
            <span className="text-[13px] font-semibold text-[#f0ede8] flex-1">Notifications WhatsApp</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#555]">
              Optionnel
            </span>
            <IconChevronDown
              className={`w-4 h-4 text-[#888] transition-transform ${openSection === 'whatsapp' ? 'rotate-180' : ''}`}
            />
          </button>
          {openSection === 'whatsapp' && (
            <div className="p-[18px] space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#888] block mb-1.5">Phone Number ID</label>
                <input
                  value={whatsappMeta.phone_number_id}
                  onChange={(e) => onWhatsappMetaChange({ phone_number_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#888] block mb-1.5">Access Token</label>
                <input
                  type="password"
                  value={whatsappMeta.access_token}
                  onChange={(e) => onWhatsappMetaChange({ access_token: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#888] block mb-1.5">Numéro destinataire (336…)</label>
                <input
                  value={whatsappMeta.recipient_number}
                  onChange={(e) => onWhatsappMetaChange({ recipient_number: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] font-mono text-xs text-[#f0ede8] outline-none focus:border-[#3a3a3a]"
                  placeholder="33612345678"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
