'use client';

import { ONBOARDING_SOURCE_ITEMS } from '@/data/onboarding-sources';

const ROLE_LABEL: Record<string, string> = {
  dev: 'Développeur',
  marketing: 'Marketing',
  sales: 'Commercial',
  founder: 'Fondateur',
  consultant: 'Consultant',
  other: 'Autre',
};

function favicon(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export function StepRecap({
  role,
  goalsCount,
  selectedSourceIds,
  emailConnected,
  whatsappConfigured,
  userEmail,
  onLaunch,
  launching,
}: {
  role: string | null;
  goalsCount: number;
  selectedSourceIds: string[];
  emailConnected: boolean;
  whatsappConfigured: boolean;
  userEmail: string;
  onLaunch: () => void;
  launching: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Étape 5 · Récapitulatif</p>
      <h1 className="text-3xl font-bold tracking-tight text-[#f0ede8] mb-2">Votre espace est prêt 🎉</h1>
      <p className="text-sm text-[#888] mb-8 max-w-[560px] leading-relaxed">
        Voici ce qui a été configuré. Vous pouvez tout modifier depuis les paramètres à tout moment.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="rounded-[10px] border border-[#2a2a2a] bg-[#161616] p-4">
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-2">Profil</div>
          <div className="text-[13px] font-medium text-[#f0ede8]">{role ? ROLE_LABEL[role] || role : '—'}</div>
          <div className="font-mono text-[10px] text-[#888] mt-1">{userEmail}</div>
        </div>
        <div className="rounded-[10px] border border-[#2a2a2a] bg-[#161616] p-4">
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-2">Objectifs</div>
          <div className="text-[13px] font-medium text-[#f0ede8]">{goalsCount}</div>
          <div className="font-mono text-[10px] text-[#888] mt-1">sélectionné(s)</div>
        </div>
        <div className="rounded-[10px] border border-[#2a2a2a] bg-[#161616] p-4 sm:col-span-2">
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-2">Sources de leads</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSourceIds.length === 0 ? (
              <span className="font-mono text-[10px] text-[#555]">—</span>
            ) : (
              selectedSourceIds.map((id) => {
                const s = ONBOARDING_SOURCE_ITEMS.find((x) => x.id === id);
                if (!s) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e1e1e] border border-[#2a2a2a] text-[10px] text-[#f0ede8]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={favicon(s.domain)} alt="" className="w-3 h-3 rounded" />
                    {s.name}
                  </span>
                );
              })
            )}
          </div>
        </div>
        <div className="rounded-[10px] border border-[#2a2a2a] bg-[#161616] p-4">
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-2">Boîte email</div>
          <div className={`text-[13px] font-medium ${emailConnected ? 'text-emerald-400' : 'text-[#888]'}`}>
            {emailConnected ? '✓ Connectée (IMAP)' : 'Non configurée'}
          </div>
        </div>
        <div className="rounded-[10px] border border-[#2a2a2a] bg-[#161616] p-4">
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-2">WhatsApp</div>
          <div className={`text-[13px] font-medium ${whatsappConfigured ? 'text-emerald-400' : 'text-[#888]'}`}>
            {whatsappConfigured ? '✓ Configuré' : 'Non configuré'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onLaunch}
        disabled={launching}
        className="w-full py-4 rounded-xl bg-[#f0ede8] text-[#0d0d0d] text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50"
      >
        {launching ? '…' : '⚡ Lancer le Smart Follow-Up'}
      </button>
    </div>
  );
}
