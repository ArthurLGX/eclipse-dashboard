'use client';

const GOALS: {
  id: string;
  title: string;
  sub: string;
  tag: string;
  tagClass: string;
}[] = [
  {
    id: 'qualify',
    title: 'Ne jamais manquer un lead chaud',
    sub: 'Notification immédiate quand un prospect répond',
    tag: '🔴 Urgent',
    tagClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
  },
  {
    id: 'score',
    title: 'Scorer et prioriser mes leads automatiquement',
    sub: 'Filtrer les prospects selon votre profil client idéal',
    tag: '🧠 IA',
    tagClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
  {
    id: 'draft',
    title: 'Générer des drafts de réponse personnalisés',
    sub: "L'IA propose un message adapté à chaque prospect",
    tag: '🧠 IA',
    tagClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
  {
    id: 'followup',
    title: 'Automatiser les relances J+2, J+7',
    sub: 'Relances planifiées sans effort manuel',
    tag: '⚡ Auto',
    tagClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  {
    id: 'whatsapp',
    title: 'Recevoir mes alertes sur WhatsApp',
    sub: 'Notification mobile instantanée pour chaque lead qualifié',
    tag: '📱 Mobile',
    tagClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
];

export function StepGoals({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Étape 2 · Votre objectif</p>
      <h1 className="text-3xl font-bold tracking-tight text-[#f0ede8] mb-2">Qu&apos;est-ce que vous voulez faire ?</h1>
      <p className="text-sm text-[#888] mb-8 max-w-[560px] leading-relaxed">
        Sélectionnez un ou plusieurs objectifs. Le système s&apos;adapte en fonction.
      </p>

      <div className="flex flex-col gap-2">
        {GOALS.map((g) => {
          const isOn = selected.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onToggle(g.id)}
              className={`flex items-center gap-3.5 px-4 py-4 rounded-[10px] border-[1.5px] text-left transition-all ${
                isOn
                  ? 'border-[#f0ede8] bg-[#1e1e1e]'
                  : 'border-[#2a2a2a] bg-[#161616] hover:border-[#3a3a3a]'
              }`}
            >
              <div
                className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                  isOn ? 'bg-[#f0ede8] border-[#f0ede8]' : 'border-[#3a3a3a]'
                }`}
              >
                {isOn && <span className="w-[7px] h-[7px] rounded-full bg-[#0d0d0d]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#f0ede8]">{g.title}</div>
                <div className="font-mono text-[10px] text-[#888] mt-0.5">{g.sub}</div>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded flex-shrink-0 ${g.tagClass}`}>{g.tag}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
