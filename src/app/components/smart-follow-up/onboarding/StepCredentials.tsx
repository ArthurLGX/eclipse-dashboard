'use client';

import { IconChevronDown } from '@tabler/icons-react';

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
}) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Étape 4 · Connexions & clés API</p>
      <h1 className="text-3xl font-bold tracking-tight text-[#f0ede8] mb-2">Connectez vos outils</h1>
      <p className="text-sm text-[#888] mb-8 max-w-[560px] leading-relaxed">
        La boîte mail entrante (IMAP) est requise pour lire les réponses et notifications. Les secrets sont chiffrés côté
        serveur.
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
              <p className="text-xs text-[#888]">
                Utilisez un{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  mot de passe d&apos;application
                </a>{' '}
                pour Gmail.
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
