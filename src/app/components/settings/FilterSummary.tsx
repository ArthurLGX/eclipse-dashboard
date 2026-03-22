'use client';

interface StatProps {
  label: string;
  value: string | number;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted/30 border border-default min-w-[100px]">
      <span className="font-mono !text-[10px] !text-muted uppercase tracking-wider">{label}</span>
      <span className="font-semibold !text-primary !text-base">{value}</span>
    </div>
  );
}

interface FilterSummaryProps {
  excludedDomainsCount: number;
  minScoreThreshold: number;
  totalKeywords: number;
  activeRules: number;
  totalRules: number;
}

export default function FilterSummary({
  excludedDomainsCount,
  minScoreThreshold,
  totalKeywords,
  activeRules,
  totalRules,
}: FilterSummaryProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Stat label="Domaines exclus" value={excludedDomainsCount} />
      <Stat label="Score ICP minimum" value={`${minScoreThreshold}/15`} />
      <Stat label="Mots-clés actifs" value={totalKeywords} />
      <Stat label="Règles actives" value={`${activeRules}/${totalRules}`} />
    </div>
  );
}
