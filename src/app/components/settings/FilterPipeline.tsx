'use client';

interface StepProps {
  number: number;
  label: string;
  status: string;
  statusType?: 'reject' | 'qualified' | 'analyze';
}

function Step({ number, label, status, statusType = 'analyze' }: StepProps) {
  const statusColors = {
    reject: '!text-danger border-danger bg-danger',
    qualified: '!text-success border-success bg-success',
    analyze: '!text-info border-info bg-info',
  };
  const color = statusColors[statusType];

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono !text-[10px] font-bold bg-muted border border-default !text-primary flex-shrink-0">
        {number}
      </div>
      <div className="min-w-0">
        <div className="!text-[11px] font-medium !text-primary truncate">{label}</div>
        <div className={`font-mono !text-[10px] truncate px-1.5 py-0.5 rounded border inline-block ${color}`}>
          {status}
        </div>
      </div>
      {number < 6 && <div className="w-4 h-px bg-default flex-shrink-0" />}
    </div>
  );
}

export default function FilterPipeline() {
  return (
    <div className="bg-card border border-default p-4 mb-6">
      <div className="font-mono !text-[10px] !text-muted uppercase tracking-wider mb-3">Ordre d&apos;application des filtres</div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        <Step number={1} label="Emails à ignorer" status="rejet si liste noire" statusType="reject" />
        <Step number={2} label="Contacts existants" status="qualifié direct" statusType="qualified" />
        <Step number={3} label="Walego / Folk" status="qualifié direct" statusType="qualified" />
        <Step number={4} label="Client idéal (ICP)" status="scorer le contenu" statusType="analyze" />
        <Step number={5} label="Mots-clés" status="ajuster le score" statusType="analyze" />
        <Step number={6} label="Règles avancées" status="appliquer tes règles" statusType="analyze" />
      </div>
    </div>
  );
}
