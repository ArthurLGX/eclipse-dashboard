'use client';

import type { DailyDigest, DailyDigestItem } from '@/types/smart-follow-up';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface DigestItemRowProps {
  item: DailyDigestItem;
  showTime?: boolean;
  onClick?: () => void;
}

function DigestItemRow({ item, showTime, onClick }: DigestItemRowProps) {
  const timeStr = showTime && item.scheduledAt
    ? new Date(item.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const delayLabel = item.daysOld > 0 ? ` (J+${item.daysOld})` : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border border-transparent hover:border-default hover:bg-muted/50 ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[13px] !text-primary truncate">
          {item.name}
        </span>
        {timeStr && (
          <span className="text-[12px] !text-muted font-mono shrink-0">
            {timeStr}
          </span>
        )}
      </div>
      <p className="text-[12px] !text-muted truncate mt-0.5">
        {item.signal}{delayLabel}
      </p>
    </button>
  );
}

interface DailyDigestCardProps {
  digest: DailyDigest;
  userName?: string;
  onOpenLead?: (id: string) => void;
}

export function DailyDigestCard({ digest, userName, onOpenLead }: DailyDigestCardProps) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totalActionable = digest.totalActionable ?? 
    (digest.hotLeads?.length || 0) + (digest.todayRdvs?.length || 0);

  if (totalActionable === 0 && (digest.stalledLeads?.length || 0) === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-default bg-card p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[15px] font-semibold !text-primary block">
            {greeting} {userName || ''}
          </span>
          <span className="text-[12px] !text-muted font-medium">
            {capitalize(dateStr)}
          </span>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary/10 !text-primary shrink-0">
          {totalActionable} action{totalActionable > 1 ? 's' : ''} aujourd&apos;hui
        </span>
      </div>

      {/* Leads chauds */}
      {digest.hotLeads && digest.hotLeads.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] font-semibold !text-muted mb-2 flex items-center gap-1.5">
            <span>🔴</span>
            {digest.hotLeads.length} lead{digest.hotLeads.length > 1 ? 's' : ''} à traiter
          </div>
          <div className="flex flex-col gap-1">
            {digest.hotLeads.slice(0, 3).map((item) => (
              <DigestItemRow
                key={item.id}
                item={item}
                onClick={onOpenLead ? () => onOpenLead(item.id) : undefined}
              />
            ))}
            {digest.hotLeads.length > 3 && (
              <p className="text-[11px] !text-muted px-3 py-1">
                +{digest.hotLeads.length - 3} autres
              </p>
            )}
          </div>
        </div>
      )}

      {/* RDV du jour */}
      {digest.todayRdvs && digest.todayRdvs.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] font-semibold !text-muted mb-2 flex items-center gap-1.5">
            <span>📅</span>
            {digest.todayRdvs.length} RDV aujourd&apos;hui
          </div>
          <div className="flex flex-col gap-1">
            {digest.todayRdvs.map((item) => (
              <DigestItemRow
                key={item.id}
                item={item}
                showTime
                onClick={onOpenLead ? () => onOpenLead(item.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leads tièdes */}
      {digest.stalledLeads && digest.stalledLeads.length > 0 && (
        <div className="opacity-90">
          <div className="text-[12px] font-semibold !text-muted mb-2 flex items-center gap-1.5">
            <span>🟠</span>
            {digest.stalledLeads.length} lead{digest.stalledLeads.length > 1 ? 's' : ''} sans réponse depuis 5+ jours
          </div>
          <div className="flex flex-col gap-1">
            {digest.stalledLeads.slice(0, 2).map((item) => (
              <DigestItemRow
                key={item.id}
                item={item}
                onClick={onOpenLead ? () => onOpenLead(item.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
