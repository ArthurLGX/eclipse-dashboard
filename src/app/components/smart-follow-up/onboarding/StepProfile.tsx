'use client';

import Image from 'next/image';

const ROLES: { id: string; emoji: string; name: string; desc: string }[] = [
  { id: 'dev', emoji: '💻', name: 'Développeur', desc: 'Dev web, freelance technique, agence dev' },
  { id: 'marketing', emoji: '📣', name: 'Marketing', desc: 'Growth, content, acquisition' },
  { id: 'sales', emoji: '🎯', name: 'Commercial', desc: 'BDR, SDR, Account Executive' },
  { id: 'founder', emoji: '🚀', name: 'Fondateur', desc: 'CEO, co-fondateur, solopreneur' },
  { id: 'consultant', emoji: '🧠', name: 'Consultant', desc: 'Freelance conseil, coach, formateur' },
  { id: 'other', emoji: '✦', name: 'Autre', desc: 'Autre activité ou combinaison' },
];

export function StepProfile({
  displayName,
  email,
  avatarUrl,
  selectedRole,
  onSelectRole,
}: {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  selectedRole: string | null;
  onSelectRole: (id: string) => void;
}) {
  const initial = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Étape 1 · Votre profil</p>
      <h1 className="text-3xl font-bold tracking-tight text-[#f0ede8] mb-2">Qui êtes-vous ?</h1>
      <p className="text-sm text-[#888] mb-8 max-w-[560px] leading-relaxed">
        Votre profil est déjà récupéré depuis votre compte. Confirmez votre rôle pour personnaliser les suggestions.
      </p>

      <div className="flex items-center gap-4 p-5 rounded-[14px] bg-[#161616] border border-[#2a2a2a] mb-8">
        <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#f0ede8] to-[#aaa] flex items-center justify-center text-[#0d0d0d] text-lg font-bold overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={52} height={52} className="w-full h-full object-cover" unoptimized />
          ) : (
            initial || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#f0ede8] truncate">{displayName}</div>
          <div className="font-mono text-[11px] text-[#888] truncate">{email}</div>
        </div>
        <span className="font-mono text-[9px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 flex-shrink-0">
          Compte vérifié
        </span>
      </div>

      <p className="text-xs text-[#888] mb-4">Sélectionnez votre rôle principal :</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRole(r.id)}
            className={`text-left p-4 rounded-[10px] border-[1.5px] transition-all flex flex-col gap-2 ${
              selectedRole === r.id
                ? 'border-[#f0ede8] bg-[#1e1e1e]'
                : 'border-[#2a2a2a] bg-[#161616] hover:border-[#3a3a3a]'
            }`}
          >
            <span className="text-[22px] leading-none">{r.emoji}</span>
            <span className="text-xs font-semibold text-[#f0ede8]">{r.name}</span>
            <span className="font-mono text-[10px] text-[#888] leading-snug">{r.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
