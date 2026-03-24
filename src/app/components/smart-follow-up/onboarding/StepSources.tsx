'use client';

import { ONBOARDING_SOURCE_ITEMS } from '@/data/onboarding-sources';

function favicon(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export function StepSources({
  query,
  onQueryChange,
  selectedIds,
  onToggle,
  onRemove,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = ONBOARDING_SOURCE_ITEMS.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.domain.toLowerCase().includes(q) ||
      s.id.includes(q)
  );

  return (
    <div>
      <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Étape 3 · Sources de leads</p>
      <h1 className="text-3xl font-bold tracking-tight text-[#f0ede8] mb-2">D&apos;où viennent vos prospects ?</h1>
      <p className="text-sm text-[#888] mb-6 max-w-[560px] leading-relaxed">
        Sélectionnez les outils que vous utilisez. Le système détectera automatiquement leurs notifications et qualifiera les
        leads.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Rechercher un outil… ex: Apollo, Instantly"
        className="w-full px-4 py-3 rounded-[10px] bg-[#161616] border-[1.5px] border-[#2a2a2a] text-sm text-[#f0ede8] placeholder:text-[#555] outline-none focus:border-[#3a3a3a] mb-5"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {filtered.map((s) => {
          const sel = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-[10px] border-[1.5px] transition-all text-center ${
                sel
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-[#2a2a2a] bg-[#161616] hover:border-[#3a3a3a]'
              }`}
            >
              <div className="w-7 h-7 rounded-[7px] bg-[#1e1e1e] overflow-hidden flex items-center justify-center text-xs font-bold text-[#888]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={favicon(s.domain)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <span className={`text-[11px] font-medium ${sel ? 'text-emerald-400' : 'text-[#f0ede8]'}`}>{s.name}</span>
              <span className="font-mono text-[9px] text-[#555]">{s.domain}</span>
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[10px] text-[#555] mb-2">SÉLECTIONNÉS</p>
      <div className="flex flex-wrap gap-1.5 min-h-[42px] p-3 rounded-lg bg-[#161616] border border-[#2a2a2a]">
        {selectedIds.length === 0 ? (
          <span className="font-mono text-[10px] text-[#555]">Aucune source sélectionnée</span>
        ) : (
          selectedIds.map((id) => {
            const s = ONBOARDING_SOURCE_ITEMS.find((x) => x.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-[#1e1e1e] border border-[#3a3a3a] text-[11px] font-medium text-[#f0ede8]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={favicon(s.domain)} alt="" className="w-3.5 h-3.5 rounded" />
                {s.name}
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="text-[#888] hover:text-[#f0ede8] px-1"
                  aria-label={`Retirer ${s.name}`}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
