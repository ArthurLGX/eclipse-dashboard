'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconKey, IconArrowLeft, IconDeviceFloppy, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { getToken } from '@/lib/api';

export default function AIKeysSettingsPage() {
  const router = useRouter();
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [hasOpenAI, setHasOpenAI] = useState(false);
  const [hasAnthropic, setHasAnthropic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetch('/api/ai-keys', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setHasOpenAI(data.hasOpenAI ?? false);
        setHasAnthropic(data.hasAnthropic ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(openaiKey !== '' && { openaiApiKey: openaiKey }),
          ...(anthropicKey !== '' && { anthropicApiKey: anthropicKey }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setHasOpenAI(data.hasOpenAI ?? false);
      setHasAnthropic(data.hasAnthropic ?? false);
      setOpenaiKey('');
      setAnthropicKey('');
      alert('✓ Clés enregistrées avec succès !');
    } catch (err) {
      alert('❌ ' + (err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-secondary  transition-colors"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-3">
              <div className="w-9 h-9 bg-accent border border-accent flex items-center justify-center">
                <IconKey className="w-[18px] h-[18px] !text-white" />
              </div>
              Clés API IA
            </h1>
            <p className="text-muted text-sm">
              Connectez vos clés OpenAI et/ou Anthropic pour utiliser les fonctionnalités IA
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-default  p-6">
          <div className="flex items-start gap-3 mb-4">
            <IconLock className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary">Sécurité</h3>
              <p className="text-sm text-muted">
                Vos clés sont chiffrées (AES-256-GCM) avant stockage et ne sont jamais affichées en clair.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-default  p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Clé API OpenAI
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={hasOpenAI ? '•••••••••••• (laisser vide pour conserver)' : 'sk-...'}
              className="input w-full px-3 py-2.5"
              autoComplete="off"
            />
            <p className="text-xs text-muted mt-1">
              Utilisée pour GPT-4, génération de contrats, suggestions d&apos;emails, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Clé API Anthropic (Claude)
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={hasAnthropic ? '•••••••••••• (laisser vide pour conserver)' : 'sk-ant-...'}
              className="input w-full px-3 py-2.5"
              autoComplete="off"
            />
            <p className="text-xs text-muted mt-1">
              Utilisée comme repli si quota OpenAI dépassé (erreur 429).
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white  hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            <IconDeviceFloppy className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20  p-4 flex items-start gap-3">
          <IconAlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Schéma Strapi requis
            </h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
              Collection <code className="bg-amber-500/20 px-1 rounded">user-ai-keys</code> : user (relation) + <code>api_keys_encrypted</code> (JSON). 
              Structure extensible : <code>{'{"openai":"...","anthropic":"..."}'}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
