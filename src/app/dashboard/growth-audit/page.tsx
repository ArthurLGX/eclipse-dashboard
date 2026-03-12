'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSearch,
  IconLoader2,
  IconGlobe,
  IconFileText,
  IconCode,
  IconMessageCircle,
  IconListCheck,
  IconRefresh,
  IconCheck,
  IconX,
  IconLayoutDashboard,
  IconHome,
  IconShoppingCart,
  IconCamera,
  IconSeo,
  IconLayoutGrid,
  IconBulb,
  IconCircleCheck,
  IconPhoto,
  IconLink,
  IconExternalLink,
  IconBrandTwitter,
  IconDeviceDesktopAnalytics,
  IconLanguage,
  IconRobot,
  IconChevronRight,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  GlobalScoreDisplay,
  AuditScoreCard,
  AuditCategoryBlock,
  IssueList,
  RecommendationItem,
  ScreenshotViewer,
  WireframeComparison,
  RedesignWithClaude,
} from '@/app/components/audit';
import type { AuditResult } from '@/app/api/audit/route';

type PageType = 'landing' | 'homepage' | 'product' | 'article';

const PAGE_TYPES: { value: PageType; icon: React.ReactNode; labelKey: string }[] = [
  { value: 'landing', icon: <IconLayoutDashboard className="w-3.5 h-3.5" />, labelKey: 'landing_page' },
  { value: 'homepage', icon: <IconHome className="w-3.5 h-3.5" />, labelKey: 'homepage' },
  { value: 'product', icon: <IconShoppingCart className="w-3.5 h-3.5" />, labelKey: 'product_page' },
  { value: 'article', icon: <IconFileText className="w-3.5 h-3.5" />, labelKey: 'article_page' },
];

// Analysis steps configuration
const ANALYSIS_STEPS = [
  { id: 'connecting', icon: IconGlobe, labelKey: 'step_connecting', duration: 1500 },
  { id: 'screenshot', icon: IconCamera, labelKey: 'step_screenshot', duration: 4000 },
  { id: 'seo', icon: IconSeo, labelKey: 'step_seo', duration: 2000 },
  { id: 'structure', icon: IconLayoutGrid, labelKey: 'step_structure', duration: 2000 },
  { id: 'recommendations', icon: IconBulb, labelKey: 'step_recommendations', duration: 1500 },
  { id: 'complete', icon: IconCircleCheck, labelKey: 'step_complete', duration: 500 },
];

function QuickStatsPanel({ result }: { result: AuditResult }) {
  const { t } = useLanguage();
  const wordEstimate = result.message.benefitWordCount + result.message.featureWordCount;
  const totalWords = wordEstimate > 0 ? Math.round(wordEstimate * 8) : '—';
  const internalLinks = result.seo.links?.internal ?? 0;
  const imagesTotal = result.seo.images?.total ?? 0;
  const imagesWithoutAlt = result.seo.images?.withoutAlt ?? 0;
  const lcpSec = result.technical?.lcp ? (result.technical.lcp / 1000).toFixed(1) + 's' : '—';

  return (
    <div className="bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-default">
        <h3 className="font-bold text-sm text-primary">{t('quick_stats')}</h3>
      </div>
      <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: 'var(--border-muted)' }}>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{t('words_on_page')}</span>
          <span className="text-xl font-extrabold text-primary">{totalWords}</span>
          <span className={`text-xs font-mono ${wordEstimate > 100 ? 'text-success' : 'text-muted'}`}>
            {wordEstimate > 100 ? `↑ ${t('good_volume')}` : '—'}
          </span>
        </div>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{t('internal_links')}</span>
          <span className="text-xl font-extrabold text-primary">{internalLinks}</span>
          <span className={`text-xs font-mono ${internalLinks < 5 ? 'text-danger' : 'text-muted'}`}>
            {internalLinks < 5 ? `↓ ${t('too_few')}` : '—'}
          </span>
        </div>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted font-mono">Images</span>
          <span className="text-xl font-extrabold text-primary">{imagesTotal}</span>
          <span className={`text-xs font-mono ${imagesWithoutAlt > 0 ? 'text-danger' : 'text-muted'}`}>
            {imagesWithoutAlt > 0 ? `${imagesWithoutAlt} ${t('missing_alt')}` : '—'}
          </span>
        </div>
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{t('load_time')}</span>
          <span className="text-xl font-extrabold text-primary">{lcpSec}</span>
          <span className={`text-xs font-mono ${result.technical?.lcp && result.technical.lcp > 4000 ? 'text-danger' : 'text-muted'}`}>
            {result.technical?.lcp && result.technical.lcp > 4000 ? `↓ ${t('too_slow')}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickActionsPanel() {
  const { t } = useLanguage();
  const actions = [
    { icon: '📋', iconBg: 'bg-success/15', iconColor: 'text-success', titleKey: 'export_pdf_report', subKey: 'audit_complete_shareable' },
    { icon: '🔗', iconBg: 'bg-teal-500/15', iconColor: 'text-teal-400', titleKey: 'analyze_backlinks', subKey: 'referent_domains' },
    { icon: '⚡', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400', titleKey: 'competitor_audit', subKey: 'compare_competitors' },
    { icon: '📅', iconBg: 'bg-accent/15', iconColor: 'text-accent', titleKey: 'schedule_followup', subKey: 'weekly_auto_audit' },
  ];
  return (
    <div className="bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-default">
        <h3 className="font-bold text-sm text-primary">{t('quick_actions')}</h3>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {actions.map((a, i) => (
          <button
            key={i}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted border border-muted hover:border-default hover:bg-hover transition-all text-left"
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0 ${a.iconBg} ${a.iconColor}`}>{a.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-primary">{t(a.titleKey)}</div>
              <div className="text-[10px] text-muted font-mono truncate">{t(a.subKey)}</div>
            </div>
            <IconChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GrowthAuditPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

  const [url, setUrl] = useState('');
  const [pageType, setPageType] = useState<PageType>('landing');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [result, setResult] = useState<AuditResult & { fromCache?: boolean } | null>(null);

  const handleAnalyze = async (forceNew = false) => {
    if (!url.trim()) {
      showGlobalPopup(t('url_required'), 'error');
      return;
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      showGlobalPopup(t('invalid_url'), 'error');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setCurrentStep(0);
    setStepProgress(0);

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          if (stepIndex < ANALYSIS_STEPS.length - 1) {
            stepIndex++;
            setCurrentStep(stepIndex);
            return 0;
          }
          return 100;
        }
        const increment = 100 / (ANALYSIS_STEPS[stepIndex].duration / 100);
        return Math.min(prev + increment, 100);
      });
    }, 100);

    try {
      if (forceNew) {
        await fetch(`/api/audit?url=${encodeURIComponent(normalizedUrl)}&pageType=${pageType}&invalidate=true`);
      }

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl, pageType }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as { error?: string })?.error || 'analysis_error');
      }

      const data = await response.json();

      clearInterval(progressInterval);
      setCurrentStep(ANALYSIS_STEPS.length - 1);
      setStepProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setResult(data);

      if (data.fromCache) {
        showGlobalPopup(t('audit_cached'), 'info');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Audit error:', error);
      showGlobalPopup(
        error instanceof Error ? t(error.message) || error.message : t('analysis_error'),
        'error'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-5"
    >
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-px bg-accent" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-accent font-mono">
            {t('growth_audit_tool_tag')}
          </span>
        </div>
        <h1 className="text-2xl md:text-[28px] font-extrabold text-primary tracking-tight flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/40 flex items-center justify-center text-accent">
            <IconSearch className="w-[18px] h-[18px]" />
          </div>
          {t('growth_audit')}
        </h1>
        <p className="text-sm text-muted mt-1.5 ml-12">
          {t('growth_audit_desc')}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-5 flex-1">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Audit panel */}
          <div className="bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-default flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
                <IconSearch className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm text-primary">{t('analyze_page')}</h3>
              <span className="ml-auto text-[10px] text-muted font-mono">{t('seo_structure_perf')}</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-muted font-mono mb-2">
                  {t('url_to_analyze')}
                </label>
                <div className="flex overflow-hidden rounded-md bg-input border border-input focus-within:border-accent transition-colors">
                  <div className="px-3.5 h-[42px] flex items-center border-r border-default shrink-0">
                    <IconGlobe className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('url_placeholder')}
                    className="flex-1 bg-transparent border-none outline-none text-primary font-mono text-sm px-3.5 h-[42px] placeholder:text-muted"
                    disabled={isAnalyzing}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-muted font-mono mb-2">
                  {t('page_type')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setPageType(type.value)}
                      disabled={isAnalyzing}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                        pageType === type.value
                          ? 'border border-accent text-primary bg-accent-light'
                          : 'border border-input text-muted bg-input hover:text-primary hover:bg-hover'
                      }`}
                    >
                      {type.icon}
                      {t(type.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-[10px] text-muted font-mono cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  {t('audit_seo')}
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-muted font-mono cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  {t('structure_html')}
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-muted font-mono cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  {t('core_web_vitals')}
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-muted font-mono cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  {t('backlinks')}
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || !url.trim()}
                  className="btn-primary px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      {t('analyzing')}
                    </>
                  ) : (
                    <>
                      <IconSearch className="w-4 h-4" />
                      {t('start_analysis')}
                    </>
                  )}
                </button>
                {result && (
                  <button
                    onClick={() => handleAnalyze(true)}
                    disabled={isAnalyzing}
                    className="btn-ghost px-4 py-3 flex items-center gap-2"
                  >
                    <IconRefresh className="w-4 h-4" />
                    {t('new_analysis')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div className="bg-card overflow-hidden min-h-[280px]">
            {/* Loading state */}
            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-8"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-lg font-bold text-primary mb-2">{t('analysis_in_progress')}</h3>
                    <p className="text-sm text-muted truncate max-w-full">{url}</p>
                  </div>
                  <div className="max-w-2xl mx-auto">
                    <div className="flex justify-between mb-6">
                      {ANALYSIS_STEPS.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;
                        const isPending = index > currentStep;
                        return (
                          <div key={step.id} className="flex flex-col items-center flex-1">
                            <motion.div
                              animate={{
                                scale: isActive ? 1.1 : 1,
                                opacity: isPending ? 0.4 : 1,
                              }}
                              className={`relative w-12 h-12 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-success' : isActive ? 'bg-accent' : 'bg-hover border-2 border-default'
                              }`}
                            >
                              {isCompleted ? (
                                <IconCheck className="w-6 h-6 text-white" />
                              ) : (
                                <StepIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-muted'}`} />
                              )}
                              {isActive && (
                                <motion.div
                                  className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                              )}
                            </motion.div>
                            <span
                              className={`text-xs mt-2 text-center ${
                                isActive ? 'text-accent font-medium' : isCompleted ? 'text-success' : 'text-muted'
                              }`}
                            >
                              {t(step.labelKey)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden mb-6">
                      <motion.div
                        className="h-full bg-accent rounded-full"
                        initial={{ width: '0%' }}
                        animate={{
                          width: `${((currentStep + stepProgress / 100) / ANALYSIS_STEPS.length) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">{t(ANALYSIS_STEPS[currentStep]?.labelKey)}</p>
                      <span className="text-sm text-muted mt-2 inline-block">
                        {t('step_x_of_y')?.replace('{x}', String(currentStep + 1)).replace('{y}', String(ANALYSIS_STEPS.length))}
                      </span>
                    </div>
                    <div className="mt-6 text-center">
                      <span className="text-3xl font-bold text-accent">
                        {Math.round(((currentStep + stepProgress / 100) / ANALYSIS_STEPS.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!result && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 px-5 text-center"
              >
                <div className="px-5 py-4 border-b border-default w-full flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
                    <IconCircleCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-primary">{t('audit_results')}</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                  <div className="w-14 h-14 rounded-full bg-muted border border-default flex items-center justify-center text-muted">
                    <IconSearch className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-primary">{t('analyze_page')}</h3>
                  <p className="text-xs text-muted max-w-[240px] leading-relaxed">
                    {t('empty_state_audit_desc')}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Results */}
            <AnimatePresence mode="wait">
              {result && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="px-5 py-4 border-b border-default flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-success/15 text-success flex items-center justify-center">
                      <IconCheck className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-sm text-primary">{t('audit_results')}</h3>
                    {result.fromCache && (
                      <span className="ml-auto text-[10px] text-muted font-mono">
                        {t('audit_cached')}
                      </span>
                    )}
                  </div>
                  <div className="p-5 space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <GlobalScoreDisplay
                        score={result.globalScore}
                        url={result.url}
                        pageType={result.pageType}
                        analyzedAt={result.analyzedAt}
                        fromCache={result.fromCache}
                        cachedUntil={result.cachedUntil}
                      />
                      <ScreenshotViewer
                        viewport={result.screenshots?.viewport}
                        fullPage={result.screenshots?.fullPage}
                        url={result.url}
                        capturedAt={result.screenshots?.capturedAt}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <AuditScoreCard
                        label={t('technical_score')}
                        score={Math.round(
                          (result.technical.performance + result.technical.seo + result.technical.accessibility) / 3
                        )}
                        icon={<IconCode className="w-4 h-4" />}
                      />
                      <AuditScoreCard
                        label={t('seo_score')}
                        score={result.technical.seo}
                        icon={<IconSearch className="w-4 h-4" />}
                      />
                      <AuditScoreCard
                        label={t('structure_score')}
                        score={result.structure.structureScore}
                        icon={<IconFileText className="w-4 h-4" />}
                      />
                      <AuditScoreCard
                        label={t('message_score')}
                        score={result.message.messageScore}
                        icon={<IconMessageCircle className="w-4 h-4" />}
                      />
                    </div>

                    {result.detectedSections && result.idealSections && (
                      <WireframeComparison
                        detectedSections={result.detectedSections}
                        idealSections={result.idealSections}
                        screenshotViewport={result.screenshots?.viewport}
                        url={result.url}
                      />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AuditCategoryBlock
                        title={t('seo_score')}
                        icon={<IconSearch className="w-4 h-4" />}
                        score={result.technical.seo}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm text-primary">Title</span>
                            <span
                              className={`flex items-center gap-2 text-sm ${result.seo.title ? 'text-success' : 'text-danger'}`}
                            >
                              {result.seo.title ? (
                                <>
                                  <IconCheck className="w-4 h-4" />
                                  <span className="truncate max-w-[200px]">{result.seo.title}</span>
                                </>
                              ) : (
                                <>
                                  <IconX className="w-4 h-4" />
                                  {t('missing_title')}
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm text-primary">Meta Description</span>
                            <span
                              className={`flex items-center gap-2 text-sm ${result.seo.metaDescription ? 'text-success' : 'text-danger'}`}
                            >
                              {result.seo.metaDescription ? (
                                <>
                                  <IconCheck className="w-4 h-4" />
                                  {result.seo.metaDescriptionLength} {t('characters')}
                                </>
                              ) : (
                                <>
                                  <IconX className="w-4 h-4" />
                                  {t('missing_meta_desc')}
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="text-sm text-primary">H1</span>
                            <span
                              className={`flex items-center gap-2 text-sm ${
                                result.structure.hasH1 && result.structure.h1Count === 1
                                  ? 'text-success'
                                  : result.structure.h1Count > 1
                                    ? 'text-warning'
                                    : 'text-danger'
                              }`}
                            >
                              {result.structure.hasH1 ? (
                                <>
                                  {result.structure.h1Count === 1 ? (
                                    <IconCheck className="w-4 h-4" />
                                  ) : (
                                    <IconX className="w-4 h-4" />
                                  )}
                                  {result.structure.h1Count} H1{' '}
                                  {result.structure.h1Count > 1 ? `(${t('multiple_h1')})` : ''}
                                </>
                              ) : (
                                <>
                                  <IconX className="w-4 h-4" />
                                  {t('no_h1')}
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <div
                              className={`flex-1 flex items-center gap-2 p-3 rounded ${
                                result.seo.hasCanonical ? 'bg-success/15' : 'bg-danger/15'
                              }`}
                            >
                              {result.seo.hasCanonical ? (
                                <IconCheck className="w-4 h-4 text-success" />
                              ) : (
                                <IconX className="w-4 h-4 text-danger" />
                              )}
                              <span className="text-sm">{t('canonical_label')}</span>
                            </div>
                            <div
                              className={`flex-1 flex items-center gap-2 p-3 rounded ${
                                result.seo.hasOpenGraph ? 'bg-success/15' : 'bg-danger/15'
                              }`}
                            >
                              {result.seo.hasOpenGraph ? (
                                <IconCheck className="w-4 h-4 text-success" />
                              ) : (
                                <IconX className="w-4 h-4 text-danger" />
                              )}
                              <span className="text-sm">{t('open_graph_label')}</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div
                              className={`flex-1 flex items-center gap-2 p-3 rounded ${
                                result.seo.hasTwitterCards ? 'bg-success/15' : 'bg-danger/15'
                              }`}
                            >
                              {result.seo.hasTwitterCards ? (
                                <IconCheck className="w-4 h-4 text-success" />
                              ) : (
                                <IconX className="w-4 h-4 text-danger" />
                              )}
                              <IconBrandTwitter className="w-4 h-4" />
                              <span className="text-sm">{t('twitter_cards_label')}</span>
                            </div>
                            <div
                              className={`flex-1 flex items-center gap-2 p-3 rounded ${
                                result.seo.hasStructuredData ? 'bg-success/15' : 'bg-danger/15'
                              }`}
                            >
                              {result.seo.hasStructuredData ? (
                                <IconCheck className="w-4 h-4 text-success" />
                              ) : (
                                <IconX className="w-4 h-4 text-danger" />
                              )}
                              <IconDeviceDesktopAnalytics className="w-4 h-4" />
                              <span className="text-sm">{t('schema_org_label')}</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div
                              className={`flex-1 flex items-center gap-2 p-3 rounded ${
                                result.seo.language ? 'bg-success/15' : 'bg-warning/15'
                              }`}
                            >
                              {result.seo.language ? (
                                <IconCheck className="w-4 h-4 text-success" />
                              ) : (
                                <IconX className="w-4 h-4 text-warning" />
                              )}
                              <IconLanguage className="w-4 h-4" />
                              <span className="text-sm">{result.seo.language || t('missing_lang')}</span>
                            </div>
                            <div
                              className={`flex-1 flex items-center gap-2 p-3 rounded ${
                                result.seo.viewport ? 'bg-success/15' : 'bg-danger/15'
                              }`}
                            >
                              {result.seo.viewport ? (
                                <IconCheck className="w-4 h-4 text-success" />
                              ) : (
                                <IconX className="w-4 h-4 text-danger" />
                              )}
                              <span className="text-sm">{t('viewport_label')}</span>
                            </div>
                          </div>
                          {result.seo.images && (
                            <div className="p-3 bg-muted rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <IconPhoto className="w-4 h-4 text-muted" />
                                <span className="text-sm font-medium text-primary">{t('images_analysis')}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 bg-card rounded">
                                  <p className="text-lg font-bold text-primary">{result.seo.images.total}</p>
                                  <p className="text-xs text-muted">{t('total')}</p>
                                </div>
                                <div className="p-2 bg-success/15 rounded">
                                  <p className="text-lg font-bold text-success">{result.seo.images.withAlt}</p>
                                  <p className="text-xs text-muted">{t('with_alt')}</p>
                                </div>
                                <div
                                  className={`p-2 rounded ${
                                    result.seo.images.withoutAlt > 0 ? 'bg-danger/15' : 'bg-success/15'
                                  }`}
                                >
                                  <p
                                    className={`text-lg font-bold ${
                                      result.seo.images.withoutAlt > 0 ? 'text-danger' : 'text-success'
                                    }`}
                                  >
                                    {result.seo.images.withoutAlt}
                                  </p>
                                  <p className="text-xs text-muted">{t('missing_alt')}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {result.seo.links && (
                            <div className="p-3 bg-muted rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <IconLink className="w-4 h-4 text-muted" />
                                <span className="text-sm font-medium text-primary">{t('links_analysis')}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-2 bg-card rounded flex items-center justify-center gap-2">
                                  <IconLink className="w-4 h-4 text-accent" />
                                  <div>
                                    <p className="text-lg font-bold text-primary">{result.seo.links.internal}</p>
                                    <p className="text-xs text-muted">{t('internal_links')}</p>
                                  </div>
                                </div>
                                <div className="p-2 bg-card rounded flex items-center justify-center gap-2">
                                  <IconExternalLink className="w-4 h-4 text-muted" />
                                  <div>
                                    <p className="text-lg font-bold text-primary">{result.seo.links.external}</p>
                                    <p className="text-xs text-muted">{t('external_links')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </AuditCategoryBlock>

                      <AuditCategoryBlock
                        title={t('structure_score')}
                        icon={<IconFileText className="w-4 h-4" />}
                        score={result.structure.structureScore}
                      >
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-primary mb-2">{t('detected_sections')}</h5>
                            <div className="flex flex-wrap gap-2">
                              {['hero', 'problem', 'solution', 'proof', 'cta'].map((section) => {
                                const detected = result.structure.detectedSections.includes(section);
                                return (
                                  <span
                                    key={section}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                      detected ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                                    }`}
                                  >
                                    {detected ? <IconCheck className="w-3 h-3" /> : <IconX className="w-3 h-3" />}
                                    {t(`${section}_section`)}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          {result.structure.missingSections.length > 0 && (
                            <div className="p-3 bg-warning/15 border border-warning rounded">
                              <p className="text-sm text-warning">
                                <strong>{t('missing_sections')}:</strong>{' '}
                                {result.structure.missingSections.map((s) => t(`${s}_section`)).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </AuditCategoryBlock>

                      <AuditCategoryBlock
                        title={t('message_score')}
                        icon={<IconMessageCircle className="w-4 h-4" />}
                        score={result.message.messageScore}
                      >
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-muted rounded text-center">
                              <p className="text-2xl font-bold text-primary">{result.message.benefitWordCount}</p>
                              <p className="text-xs text-muted">{t('benefit_words')}</p>
                            </div>
                            <div className="p-3 bg-muted rounded text-center">
                              <p className="text-2xl font-bold text-primary">{result.message.featureWordCount}</p>
                              <p className="text-xs text-muted">{t('feature_words')}</p>
                            </div>
                          </div>
                          <div className="p-3 bg-muted rounded flex items-center justify-between">
                            <span className="text-sm text-primary">{t('average_sentence_length')}</span>
                            <span
                              className={`text-sm font-medium ${
                                result.message.avgSentenceLength <= 20
                                  ? 'text-success'
                                  : result.message.avgSentenceLength <= 30
                                    ? 'text-warning'
                                    : 'text-danger'
                              }`}
                            >
                              {result.message.avgSentenceLength} {t('words_count')}
                            </span>
                          </div>
                          {result.message.jargonWords.length > 0 && (
                            <div className="p-3 bg-warning/15 border border-warning rounded">
                              <p className="text-sm text-warning mb-2">
                                <strong>{t('technical_jargon')}:</strong>
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {result.message.jargonWords.map((word, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-warning/15 text-warning text-xs rounded"
                                  >
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.message.issues.length > 0 && (
                            <IssueList
                              issues={result.message.issues.map((issue) => ({ text: issue, priority: 'medium' as const }))}
                            />
                          )}
                        </div>
                      </AuditCategoryBlock>

                      <AuditCategoryBlock
                        title={t('recommendations')}
                        icon={<IconListCheck className="w-4 h-4" />}
                        defaultOpen={true}
                      >
                        <div className="space-y-2">
                          {result.recommendations.length > 0 ? (
                            result.recommendations.map((rec, index) => (
                              <RecommendationItem
                                key={index}
                                text={rec.text}
                                priority={rec.priority}
                                index={index}
                              />
                            ))
                          ) : (
                            <div className="text-center py-6 text-muted">
                              <IconCheck className="w-8 h-8 mx-auto mb-2 text-success" />
                              <p>{t('no_recommendation')}</p>
                            </div>
                          )}
                        </div>
                      </AuditCategoryBlock>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <RedesignWithClaude
            defaultScreenshot={
              result?.screenshots?.viewport ? `data:image/png;base64,${result.screenshots.viewport}` : undefined
            }
          />
          {result && <QuickStatsPanel result={result} />}
          <QuickActionsPanel />
        </div>
      </div>
    </motion.div>
  );
}
