'use client';

import { useState, useEffect, useRef } from 'react';
import { KNOWN_SOURCES } from '@/data/known-sources';
import { mergeLeadSourcesWithDefaults, NATIVE_SOURCE_IDS } from '@/data/lead-sources-default';
import { updateAutomationSettings } from '@/lib/smart-follow-up-api';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import type { LeadSource } from '@/types/lead-source';
import type { KnownSourceTemplate } from '@/data/known-sources';

function getFaviconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

function toLeadSource(known: KnownSourceTemplate): LeadSource {
  return {
    id: known.id,
    name: known.name,
    domain: known.domain,
    favicon_url: getFaviconUrl(known.domain),
    enabled: true,
    detection: known.detection,
    bypass_icp: true,
    base_confidence: 0.7,
    whatsapp_notify: true,
    hide_email_proposal: false,
    added_at: new Date().toISOString(),
  };
}

export function SourcesManager({
  settingsId,
  initialSources,
}: {
  settingsId: string;
  initialSources: LeadSource[] | null | undefined;
}) {
  const { mutate } = useAutomationSettings();
  const mergedInitial = mergeLeadSourcesWithDefaults(initialSources);
  const [sources, setSources] = useState<LeadSource[]>(mergedInitial);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const repairDoneRef = useRef(false);

  useEffect(() => {
    setSources(mergeLeadSourcesWithDefaults(initialSources));
  }, [initialSources]);

  /** Restaure une source native manquante en base (ex. WhatsApp) et persiste une fois */
  useEffect(() => {
    if (!settingsId || repairDoneRef.current) return;
    const api = initialSources ?? [];
    const apiIds = new Set(api.map((s) => s.id));
    const missingNative = NATIVE_SOURCE_IDS.some((id) => !apiIds.has(id));
    if (!missingNative) return;
    repairDoneRef.current = true;
    const merged = mergeLeadSourcesWithDefaults(initialSources);
    setSources(merged);
    void (async () => {
      try {
        await updateAutomationSettings(settingsId, { lead_sources: merged });
        await mutate();
      } catch (e) {
        console.error('[SourcesManager] Réparation lead_sources:', e);
        repairDoneRef.current = false;
      }
    })();
  }, [settingsId, initialSources, mutate]);

  const suggestions =
    query.length >= 1
      ? KNOWN_SOURCES.filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) &&
            !sources.find((existing) => existing.id === s.id)
        )
      : [];

  async function save(updated: LeadSource[]) {
    setSaving(true);
    try {
      await updateAutomationSettings(settingsId, { lead_sources: updated });
      await mutate();
    } catch (err) {
      console.error('[SourcesManager] Erreur sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  async function addSource(known: KnownSourceTemplate) {
    const newSource = toLeadSource(known);
    const updated = [...sources, newSource];
    setSources(updated);
    setQuery('');
    setShowDropdown(false);
    await save(updated);
  }

  async function addCustomSource() {
    const raw = query.trim();
    const domain = raw.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!domain) return;
    const newSource: LeadSource = {
      id: domain.replace(/\./g, '_'),
      name: raw,
      favicon_url: getFaviconUrl(domain),
      domain,
      enabled: true,
      detection: { from_email_contains: [domain] },
      bypass_icp: true,
      base_confidence: 0.7,
      whatsapp_notify: true,
      hide_email_proposal: false,
      added_at: new Date().toISOString(),
    };
    const updated = [...sources, newSource];
    setSources(updated);
    setQuery('');
    setShowDropdown(false);
    await save(updated);
  }

  async function toggleSource(id: string) {
    const updated = sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSources(updated);
    await save(updated);
  }

  async function removeSource(id: string) {
    if (NATIVE_SOURCE_IDS.includes(id as (typeof NATIVE_SOURCE_IDS)[number])) return;
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
    await save(updated);
  }

  const settingInput =
    'w-full px-3 py-2 rounded-lg border border-default bg-card !text-sm !text-primary placeholder:!text-muted focus:outline-none focus:ring-1 focus:ring-success';

  return (
    <div className="flex flex-col gap-3 w-full overflow-visible">
      <div className="relative z-[100] flex items-center gap-2 overflow-visible">
        <input
          type="text"
          className={settingInput}
          placeholder="Ajouter un outil… ex: Lemlist, Apollo, Instantly"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {saving && (
          <span className="font-mono !text-[10px] !text-muted whitespace-nowrap flex-shrink-0">
            Sauvegarde…
          </span>
        )}

        {showDropdown && query.length >= 1 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-default rounded-lg shadow-xl max-h-[min(280px,70vh)] overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left border-b border-default last:border-0 hover:bg-muted/50 transition-colors"
                  onMouseDown={() => addSource(s)}
                >
                  <img
                    src={getFaviconUrl(s.domain)}
                    alt=""
                    className="w-[18px] h-[18px] rounded flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="!text-xs font-medium !text-primary flex-1">{s.name}</span>
                  <span className="font-mono !text-[10px] !text-muted">{s.domain}</span>
                </button>
              ))
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2.5 !text-xs !text-muted italic hover:bg-muted/50"
                onMouseDown={addCustomSource}
              >
                <span className="w-[18px] h-[18px] rounded bg-muted flex items-center justify-center font-bold !text-primary">
                  +
                </span>
                Ajouter « {query} » comme source personnalisée
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-default bg-card ${
              !source.enabled ? 'opacity-45' : ''
            }`}
          >
            <img
              src={source.favicon_url}
              alt=""
              className="w-[18px] h-[18px] rounded flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="!text-xs font-medium !text-primary truncate">{source.name}</span>
              <span className="font-mono !text-[10px] !text-muted truncate">{source.domain}</span>
            </div>
            {NATIVE_SOURCE_IDS.includes(source.id as (typeof NATIVE_SOURCE_IDS)[number]) && (
              <span className="font-mono !text-[9px] px-1.5 py-0.5 rounded bg-muted border border-default !text-muted flex-shrink-0">
                Natif
              </span>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={source.enabled}
              aria-label={source.enabled ? 'Désactiver' : 'Activer'}
              onClick={() => toggleSource(source.id)}
              className={`w-[34px] h-[18px] rounded-full border-none cursor-pointer flex-shrink-0 relative transition-colors ${
                source.enabled ? 'bg-success' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
                  source.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            {!NATIVE_SOURCE_IDS.includes(source.id as (typeof NATIVE_SOURCE_IDS)[number]) && (
              <button
                type="button"
                className="w-6 h-6 rounded-full flex items-center justify-center !text-muted hover:!text-primary hover:bg-muted"
                aria-label="Supprimer"
                onClick={() => removeSource(source.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {sources.length === 0 && (
        <p className="font-mono !text-[11px] !text-muted text-center py-4">
          Aucune source configurée. Tapez le nom de votre outil de prospection.
        </p>
      )}
    </div>
  );
}
