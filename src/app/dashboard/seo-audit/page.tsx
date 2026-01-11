'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { 
  IconSearch, 
  IconRocket, 
  IconDeviceDesktop,
  IconDeviceMobile,
  IconAlertTriangle,
  IconRefresh,
  IconExternalLink,
  IconClock,
  IconBrandGoogle
} from '@tabler/icons-react';

interface AuditResult {
  url: string;
  fetchTime: string;
  strategy: 'mobile' | 'desktop';
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    fcp: { value: number; displayValue: string; score: number };
    lcp: { value: number; displayValue: string; score: number };
    cls: { value: number; displayValue: string; score: number };
    tbt: { value: number; displayValue: string; score: number };
    si: { value: number; displayValue: string; score: number };
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savings?: string;
    score: number;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    score: number;
  }>;
}

const SCORE_COLORS = {
  good: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', ring: 'ring-green-500' },
  average: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-500' },
  poor: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-500' },
};

function getScoreColor(score: number) {
  if (score >= 90) return SCORE_COLORS.good;
  if (score >= 50) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}

function ScoreCircle({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = getScoreColor(score);
  const sizes = {
    sm: { outer: 'w-16 h-16', inner: 'text-lg' },
    md: { outer: 'w-24 h-24', inner: 'text-2xl' },
    lg: { outer: 'w-32 h-32', inner: 'text-4xl' },
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizes[size].outer} rounded-full ${color.bg} flex items-center justify-center ring-4 ${color.ring}`}>
        <span className={`${sizes[size].inner} font-bold ${color.text}`}>{score}</span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function MetricCard({ title, displayValue, score }: { title: string; displayValue: string; score: number }) {
  const color = getScoreColor(score * 100);
  
  return (
    <div className={`p-4 rounded-lg ${color.bg} border border-border`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{title}</span>
        <div className={`w-3 h-3 rounded-full ${score >= 0.9 ? 'bg-green-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`} />
      </div>
      <p className={`text-xl font-bold ${color.text}`}>{displayValue}</p>
    </div>
  );
}

export default function SEOAuditPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  const runAudit = async () => {
    if (!url) return;
    
    // Validate URL
    let normalizedUrl = url;
    if (!url.startsWith('http')) {
      normalizedUrl = `https://${url}`;
    }

    setLoading(true);
    setResult(null);

    try {
      // Use Google PageSpeed Insights API
      const apiKey = process.env.NEXT_PUBLIC_PAGESPEED_API_KEY || '';
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo${apiKey ? `&key=${apiKey}` : ''}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const lighthouse = data.lighthouseResult;
      const categories = lighthouse.categories;
      const audits = lighthouse.audits;

      // Extract opportunities
      const opportunities = Object.values(lighthouse.audits)
        .filter((audit: unknown) => {
          const a = audit as { details?: { type?: string }; score?: number };
          return a.details?.type === 'opportunity' && a.score !== null && a.score !== undefined && a.score < 1;
        })
        .map((audit: unknown) => {
          const a = audit as { id: string; title: string; description: string; displayValue?: string; score: number };
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            savings: a.displayValue,
            score: a.score,
          };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);

      // Extract diagnostics
      const diagnostics = Object.values(lighthouse.audits)
        .filter((audit: unknown) => {
          const a = audit as { details?: { type?: string }; score?: number };
          return a.details?.type === 'table' && a.score !== null && a.score !== undefined && a.score < 1;
        })
        .map((audit: unknown) => {
          const a = audit as { id: string; title: string; description: string; score: number };
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            score: a.score,
          };
        })
        .slice(0, 10);

      const auditResult: AuditResult = {
        url: normalizedUrl,
        fetchTime: new Date().toISOString(),
        strategy,
        scores: {
          performance: Math.round(categories.performance.score * 100),
          accessibility: Math.round(categories.accessibility.score * 100),
          bestPractices: Math.round(categories['best-practices'].score * 100),
          seo: Math.round(categories.seo.score * 100),
        },
        metrics: {
          fcp: {
            value: audits['first-contentful-paint'].numericValue,
            displayValue: audits['first-contentful-paint'].displayValue,
            score: audits['first-contentful-paint'].score,
          },
          lcp: {
            value: audits['largest-contentful-paint'].numericValue,
            displayValue: audits['largest-contentful-paint'].displayValue,
            score: audits['largest-contentful-paint'].score,
          },
          cls: {
            value: audits['cumulative-layout-shift'].numericValue,
            displayValue: audits['cumulative-layout-shift'].displayValue,
            score: audits['cumulative-layout-shift'].score,
          },
          tbt: {
            value: audits['total-blocking-time'].numericValue,
            displayValue: audits['total-blocking-time'].displayValue,
            score: audits['total-blocking-time'].score,
          },
          si: {
            value: audits['speed-index'].numericValue,
            displayValue: audits['speed-index'].displayValue,
            score: audits['speed-index'].score,
          },
        },
        opportunities,
        diagnostics,
      };

      setResult(auditResult);
    } catch (error) {
      console.error('Audit error:', error);
      showGlobalPopup(error instanceof Error ? error.message : 'Erreur lors de l\'audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconRocket size={28} className="text-accent" />
        <div>
          <h1 className="text-2xl font-bold">{t('seo_audit') || 'Audit SEO & Performance'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('seo_audit_desc') || 'Analysez les performances de n&apos;importe quel site web'}
          </p>
        </div>
      </div>

      {/* Search form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">{t('website_url') || 'URL du site'}</label>
            <div className="relative">
              <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent"
                onKeyDown={(e) => e.key === 'Enter' && runAudit()}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">{t('device') || 'Appareil'}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStrategy('mobile')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  strategy === 'mobile' 
                    ? 'bg-accent text-white border-accent' 
                    : 'border-border hover:bg-hover'
                }`}
              >
                <IconDeviceMobile size={18} />
                Mobile
              </button>
              <button
                onClick={() => setStrategy('desktop')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  strategy === 'desktop' 
                    ? 'bg-accent text-white border-accent' 
                    : 'border-border hover:bg-hover'
                }`}
              >
                <IconDeviceDesktop size={18} />
                Desktop
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={runAudit}
              disabled={!url || loading}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <IconRefresh size={18} className="animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <IconRocket size={18} />
                  Analyser
                </>
              )}
            </button>
          </div>
        </div>
        
        <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
          <IconBrandGoogle size={14} />
          Propulsé par Google PageSpeed Insights API
        </p>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Scores overview */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">{result.url}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <IconClock size={14} />
                  {new Date(result.fetchTime).toLocaleString('fr-FR')}
                  <span>•</span>
                  {result.strategy === 'mobile' ? <IconDeviceMobile size={14} /> : <IconDeviceDesktop size={14} />}
                  {result.strategy === 'mobile' ? 'Mobile' : 'Desktop'}
                </p>
              </div>
              <a
                href={`https://pagespeed.web.dev/report?url=${encodeURIComponent(result.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-accent hover:underline"
              >
                Voir sur PageSpeed <IconExternalLink size={14} />
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              <ScoreCircle score={result.scores.performance} label="Performance" size="lg" />
              <ScoreCircle score={result.scores.accessibility} label="Accessibilité" />
              <ScoreCircle score={result.scores.bestPractices} label="Bonnes pratiques" />
              <ScoreCircle score={result.scores.seo} label="SEO" />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Core Web Vitals</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard 
                title="FCP (First Contentful Paint)"
                displayValue={result.metrics.fcp.displayValue}
                score={result.metrics.fcp.score}
              />
              <MetricCard 
                title="LCP (Largest Contentful Paint)"
                displayValue={result.metrics.lcp.displayValue}
                score={result.metrics.lcp.score}
              />
              <MetricCard 
                title="CLS (Cumulative Layout Shift)"
                displayValue={result.metrics.cls.displayValue}
                score={result.metrics.cls.score}
              />
              <MetricCard 
                title="TBT (Total Blocking Time)"
                displayValue={result.metrics.tbt.displayValue}
                score={result.metrics.tbt.score}
              />
              <MetricCard 
                title="SI (Speed Index)"
                displayValue={result.metrics.si.displayValue}
                score={result.metrics.si.score}
              />
            </div>
          </div>

          {/* Opportunities */}
          {result.opportunities.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <IconRocket size={20} className="text-amber-500" />
                Opportunités d&apos;amélioration
              </h2>
              <div className="space-y-3">
                {result.opportunities.map((opp) => (
                  <div key={opp.id} className="flex items-start gap-3 p-3 bg-hover/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      opp.score >= 0.9 ? 'bg-green-500' : opp.score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{opp.title}</p>
                      {opp.savings && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Économie potentielle : {opp.savings}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostics */}
          {result.diagnostics.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <IconAlertTriangle size={20} className="text-amber-500" />
                Diagnostics
              </h2>
              <div className="space-y-3">
                {result.diagnostics.map((diag) => (
                  <div key={diag.id} className="flex items-start gap-3 p-3 bg-hover/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      diag.score >= 0.9 ? 'bg-green-500' : diag.score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{diag.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

