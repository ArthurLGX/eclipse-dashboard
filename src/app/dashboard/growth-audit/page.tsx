'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconLoader2,
  IconGlobe,
  IconFileText,
  IconCode,
  IconMessageCircle,
  IconTarget,
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
  GeneratedMockup,
} from '@/app/components/audit';
import type { AuditResult } from '@/app/api/audit/route';

type PageType = 'landing' | 'homepage' | 'product';

const PAGE_TYPES: { value: PageType;  icon: React.ReactNode; labelKey: string }[] = [
  { value: 'landing', icon: <IconLayoutDashboard className="w-5 h-5 !text-accent" />, labelKey: 'landing_page' },
  { value: 'homepage', icon: <IconHome className="w-5 h-5 !text-accent" />, labelKey: 'homepage' },
  { value: 'product', icon: <IconShoppingCart className="w-5 h-5 !text-accent" />, labelKey: 'product_page' },
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

export default function GrowthAuditPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

  // Form state
  const [url, setUrl] = useState('');
  const [pageType, setPageType] = useState<PageType>('landing');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  // Results state
  const [result, setResult] = useState<AuditResult & { fromCache?: boolean } | null>(null);

  // Handle form submission
  const handleAnalyze = async (forceNew = false) => {
    if (!url.trim()) {
      showGlobalPopup(t('url_required'), 'error');
      return;
    }

    // Validate URL
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

    // Start progress simulation
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      setStepProgress(prev => {
        if (prev >= 100) {
          // Move to next step
          if (stepIndex < ANALYSIS_STEPS.length - 1) {
            stepIndex++;
            setCurrentStep(stepIndex);
            return 0;
          }
          return 100;
        }
        // Increment progress based on step duration
        const increment = 100 / (ANALYSIS_STEPS[stepIndex].duration / 100);
        return Math.min(prev + increment, 100);
      });
    }, 100);

    try {
      // If forcing new analysis, invalidate cache first
      if (forceNew) {
        await fetch(`/api/audit?url=${encodeURIComponent(normalizedUrl)}&pageType=${pageType}&invalidate=true`);
      }

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl, pageType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'analysis_error');
      }

      const data = await response.json();
      
      // Complete progress animation
      clearInterval(progressInterval);
      setCurrentStep(ANALYSIS_STEPS.length - 1);
      setStepProgress(100);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className='relative'>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <IconSearch className="w-7 h-7 !text-accent" />
            {t('growth_audit')}
          </h1>
          <p className="text-muted text-sm mt-1">
            {t('growth_audit_desc')}
          </p>
        </div>
      </div>

      {/* Analysis Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('url_to_analyze')}
            </label>
            <div className="relative">
              <IconGlobe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('url_placeholder')}
                className="input w-full !pl-10"
                disabled={isAnalyzing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyze();
                }}
              />
            </div>
          </div>

          {/* Page Type Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('page_type')}
            </label>
            <div className="flex flex-wrap gap-2">
              {PAGE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPageType(type.value)}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    pageType === type.value
                      ? 'border-accent bg-accent-light !text-accent'
                      : 'border-default bg-hover text-muted hover:text-primary hover:border-accent'
                  }`}
                >
                  {type.icon}
                  <span className="text-sm font-medium !text-accent">{t(type.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || !url.trim()}
              className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <IconLoader2 className="w-5 h-5 animate-spin" />
                  {t('analyzing')}
                </>
              ) : (
                <>
                  <IconSearch className="w-5 h-5" />
                  {t('start_analysis')}
                </>
              )}
            </button>

            {result && (
              <button
                onClick={() => handleAnalyze(true)}
                disabled={isAnalyzing}
                className="btn-ghost px-4 py-2.5 flex items-center gap-2"
              >
                <IconRefresh className="w-4 h-4" />
                {t('new_analysis')}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Loading State with Progress Steps */}
      <AnimatePresence mode="wait">
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-8"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-primary mb-2">
                {t('analysis_in_progress') || 'Analyse en cours'}
              </h3>
              <p className="text-sm text-muted">{url}</p>
            </div>

            {/* Progress Steps */}
            <div className="max-w-2xl mx-auto">
              {/* Step indicators */}
              <div className="flex items-center justify-between mb-6">
                {ANALYSIS_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const isPending = index > currentStep;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1">
                      {/* Step circle */}
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ 
                          scale: isActive ? 1.1 : 1,
                          opacity: isPending ? 0.4 : 1,
                        }}
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isCompleted ? 'bg-success' :
                          isActive ? 'bg-accent' :
                          'bg-hover border-2 border-default'
                        }`}
                      >
                        {isCompleted ? (
                          <IconCheck className="w-6 h-6 text-white" />
                        ) : (
                          <StepIcon className={`w-5 h-5 ${
                            isActive ? 'text-white' : 'text-muted'
                          }`} />
                        )}
                        
                        {/* Active step spinner */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                      </motion.div>
                      
                      {/* Step label */}
                      <motion.span 
                        className={`text-xs mt-2 text-center transition-colors ${
                          isActive ? 'text-accent font-medium' :
                          isCompleted ? 'text-success' :
                          'text-muted'
                        }`}
                        animate={{ opacity: isPending ? 0.5 : 1 }}
                      >
                        {t(step.labelKey) || step.id}
                      </motion.span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar connecting steps */}
              <div className="relative h-1 bg-hover rounded-full overflow-hidden mb-6">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: `${((currentStep + (stepProgress / 100)) / ANALYSIS_STEPS.length) * 100}%` 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Current step description */}
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-lg font-medium text-primary">
                  {t(ANALYSIS_STEPS[currentStep]?.labelKey) || 'Processing...'}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm text-muted">
                    {t('step_x_of_y')?.replace('{x}', String(currentStep + 1)).replace('{y}', String(ANALYSIS_STEPS.length)) || 
                     `Étape ${currentStep + 1} sur ${ANALYSIS_STEPS.length}`}
                  </span>
                </div>
              </motion.div>

              {/* Overall progress percentage */}
              <div className="mt-6 text-center">
                <span className="text-3xl font-bold !text-accent">
                  {Math.round(((currentStep + (stepProgress / 100)) / ANALYSIS_STEPS.length) * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Executive Summary + Screenshot */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <GlobalScoreDisplay
                score={result.globalScore}
                url={result.url}
                pageType={result.pageType}
                analyzedAt={result.analyzedAt}
                fromCache={result.fromCache}
                cachedUntil={result.cachedUntil}
              />
              
              {/* Screenshot Preview */}
              <ScreenshotViewer
                viewport={result.screenshots?.viewport}
                fullPage={result.screenshots?.fullPage}
                url={result.url}
                capturedAt={result.screenshots?.capturedAt}
              />
            </div>

            {/* Category Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AuditScoreCard
                label={t('technical_score')}
                score={Math.round((result.technical.performance + result.technical.seo + result.technical.accessibility) / 3)}
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

            {/* Wireframe Comparison */}
            {result.detectedSections && result.idealSections && (
              <WireframeComparison
                detectedSections={result.detectedSections}
                idealSections={result.idealSections}
                screenshotViewport={result.screenshots?.viewport}
                url={result.url}
              />
            )}

            {/* AI Generated Mockup */}
            <GeneratedMockup
              pageType={result.pageType as 'landing' | 'homepage' | 'product'}
              missingSections={result.structure.missingSections}
              existingSections={result.structure.detectedSections}
              currentScreenshot={result.screenshots?.viewport}
              url={result.url}
              styleAnalysis={result.styleAnalysis}
            />

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SEO Analysis */}
              <AuditCategoryBlock
                title={t('seo_score')}
                icon={<IconSearch className="w-4 h-4" />}
                score={result.technical.seo}
              >
                <div className="space-y-3">
                  {/* Title */}
                  <div className="flex items-center justify-between p-3 bg-hover rounded-lg">
                    <span className="text-sm text-secondary">Title</span>
                    <span className={`flex items-center gap-2 text-sm ${result.seo.title ? 'text-success' : 'text-danger'}`}>
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

                  {/* Meta Description */}
                  <div className="flex items-center justify-between p-3 bg-hover rounded-lg">
                    <span className="text-sm text-secondary">Meta Description</span>
                    <span className={`flex items-center gap-2 text-sm ${result.seo.metaDescription ? 'text-success' : 'text-danger'}`}>
                      {result.seo.metaDescription ? (
                        <>
                          <IconCheck className="w-4 h-4" />
                          {result.seo.metaDescriptionLength} {t('characters') || 'caractères'}
                        </>
                      ) : (
                        <>
                          <IconX className="w-4 h-4" />
                          {t('missing_meta_desc')}
                        </>
                      )}
                    </span>
                  </div>

                  {/* H1 */}
                  <div className="flex items-center justify-between p-3 bg-hover rounded-lg">
                    <span className="text-sm text-secondary">H1</span>
                    <span className={`flex items-center gap-2 text-sm ${
                      result.structure.hasH1 && result.structure.h1Count === 1 ? 'text-success' :
                      result.structure.h1Count > 1 ? 'text-warning' : 'text-danger'
                    }`}>
                      {result.structure.hasH1 ? (
                        <>
                          {result.structure.h1Count === 1 ? (
                            <IconCheck className="w-4 h-4" />
                          ) : (
                            <IconX className="w-4 h-4" />
                          )}
                          {result.structure.h1Count} H1 {result.structure.h1Count > 1 ? `(${t('multiple_h1')})` : ''}
                        </>
                      ) : (
                        <>
                          <IconX className="w-4 h-4" />
                          {t('no_h1')}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Canonical & OG */}
                  <div className="flex gap-3">
                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${result.seo.hasCanonical ? 'bg-success-light' : 'bg-danger-light'}`}>
                      {result.seo.hasCanonical ? <IconCheck className="w-4 h-4 text-success" /> : <IconX className="w-4 h-4 text-danger" />}
                      <span className="text-sm">Canonical</span>
                    </div>
                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${result.seo.hasOpenGraph ? 'bg-success-light' : 'bg-danger-light'}`}>
                      {result.seo.hasOpenGraph ? <IconCheck className="w-4 h-4 text-success" /> : <IconX className="w-4 h-4 text-danger" />}
                      <span className="text-sm">Open Graph</span>
                    </div>
                  </div>

                  {/* Twitter Cards & Structured Data */}
                  <div className="flex gap-3">
                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${result.seo.hasTwitterCards ? 'bg-success-light' : 'bg-danger-light'}`}>
                      {result.seo.hasTwitterCards ? <IconCheck className="w-4 h-4 text-success" /> : <IconX className="w-4 h-4 text-danger" />}
                      <IconBrandTwitter className="w-4 h-4" />
                      <span className="text-sm">Twitter Cards</span>
                    </div>
                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${result.seo.hasStructuredData ? 'bg-success-light' : 'bg-danger-light'}`}>
                      {result.seo.hasStructuredData ? <IconCheck className="w-4 h-4 text-success" /> : <IconX className="w-4 h-4 text-danger" />}
                      <IconDeviceDesktopAnalytics className="w-4 h-4" />
                      <span className="text-sm">Schema.org</span>
                    </div>
                  </div>

                  {/* Language & Viewport */}
                  <div className="flex gap-3">
                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${result.seo.language ? 'bg-success-light' : 'bg-warning-light'}`}>
                      {result.seo.language ? <IconCheck className="w-4 h-4 text-success" /> : <IconX className="w-4 h-4 text-warning" />}
                      <IconLanguage className="w-4 h-4" />
                      <span className="text-sm">{result.seo.language || t('missing_lang') || 'Lang manquant'}</span>
                    </div>
                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${result.seo.viewport ? 'bg-success-light' : 'bg-danger-light'}`}>
                      {result.seo.viewport ? <IconCheck className="w-4 h-4 text-success" /> : <IconX className="w-4 h-4 text-danger" />}
                      <span className="text-sm">Viewport</span>
                    </div>
                  </div>

                  {/* Images Analysis */}
                  {result.seo.images && (
                    <div className="p-3 bg-hover rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <IconPhoto className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-primary">{t('images_analysis') || 'Analyse des images'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-card rounded">
                          <p className="text-lg font-bold text-primary">{result.seo.images.total}</p>
                          <p className="text-xs text-muted">{t('total') || 'Total'}</p>
                        </div>
                        <div className="p-2 bg-success-light rounded">
                          <p className="text-lg font-bold text-success">{result.seo.images.withAlt}</p>
                          <p className="text-xs text-muted">{t('with_alt') || 'Avec alt'}</p>
                        </div>
                        <div className={`p-2 rounded ${result.seo.images.withoutAlt > 0 ? 'bg-danger-light' : 'bg-success-light'}`}>
                          <p className={`text-lg font-bold ${result.seo.images.withoutAlt > 0 ? 'text-danger' : 'text-success'}`}>
                            {result.seo.images.withoutAlt}
                          </p>
                          <p className="text-xs text-muted">{t('missing_alt') || 'Sans alt'}</p>
                        </div>
                      </div>
                      {result.seo.images.withoutAlt > 0 && result.seo.images.missingAltList?.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted cursor-pointer hover:text-primary">
                            {t('show_images_without_alt') || 'Voir les images sans alt'}
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted space-y-1">
                            {result.seo.images.missingAltList.map((src, i) => (
                              <div key={i} className="truncate">• {src}</div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Links Analysis */}
                  {result.seo.links && (
                    <div className="p-3 bg-hover rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <IconLink className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-primary">{t('links_analysis') || 'Analyse des liens'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-card rounded flex items-center justify-center gap-2">
                          <IconLink className="w-4 h-4 text-accent" />
                          <div>
                            <p className="text-lg font-bold text-primary">{result.seo.links.internal}</p>
                            <p className="text-xs text-muted">{t('internal_links') || 'Internes'}</p>
                          </div>
                        </div>
                        <div className="p-2 bg-card rounded flex items-center justify-center gap-2">
                          <IconExternalLink className="w-4 h-4 text-muted" />
                          <div>
                            <p className="text-lg font-bold text-primary">{result.seo.links.external}</p>
                            <p className="text-xs text-muted">{t('external_links') || 'Externes'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Structured Data Types */}
                  {result.seo.structuredDataTypes && result.seo.structuredDataTypes.length > 0 && (
                    <div className="p-3 bg-success-light rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <IconRobot className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success">{t('structured_data_found') || 'Données structurées trouvées'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.seo.structuredDataTypes.map((type, i) => (
                          <span key={i} className="px-2 py-0.5 bg-success text-white text-xs rounded">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Robots Meta */}
                  {result.seo.robotsMeta && (
                    <div className="p-3 bg-hover rounded-lg flex items-center justify-between">
                      <span className="text-sm text-secondary flex items-center gap-2">
                        <IconRobot className="w-4 h-4" /> Robots
                      </span>
                      <code className="text-xs bg-card px-2 py-1 rounded">{result.seo.robotsMeta}</code>
                    </div>
                  )}

                  {/* JS Rendering Status */}
                  {result.jsRendered !== undefined && (
                    <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${result.jsRendered ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
                      <IconCode className="w-4 h-4" />
                      {result.jsRendered 
                        ? (t('js_rendered') || 'DOM rendu avec JavaScript') 
                        : (t('js_not_rendered') || 'HTML statique (JS non exécuté)')}
                    </div>
                  )}
                </div>
              </AuditCategoryBlock>

              {/* Structure Analysis */}
              <AuditCategoryBlock
                title={t('structure_score')}
                icon={<IconFileText className="w-4 h-4" />}
                score={result.structure.structureScore}
              >
                <div className="space-y-4">
                  {/* Detected Sections */}
                  <div>
                    <h5 className="text-sm font-medium text-primary mb-2">{t('detected_sections')}</h5>
                    <div className="flex flex-wrap gap-2">
                      {['hero', 'problem', 'solution', 'proof', 'cta'].map((section) => {
                        const detected = result.structure.detectedSections.includes(section);
                        return (
                          <span
                            key={section}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                              detected
                                ? 'bg-success-light text-success'
                                : 'bg-danger-light text-danger'
                            }`}
                          >
                            {detected ? <IconCheck className="w-3 h-3" /> : <IconX className="w-3 h-3" />}
                            {t(`${section}_section`)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Missing Sections Alert */}
                  {result.structure.missingSections.length > 0 && (
                    <div className="p-3 bg-warning-light border border-warning rounded-lg">
                      <p className="text-sm text-warning">
                        <strong>{t('missing_sections')}:</strong>{' '}
                        {result.structure.missingSections.map(s => t(`${s}_section`)).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </AuditCategoryBlock>

              {/* Message Analysis */}
              <AuditCategoryBlock
                title={t('message_score')}
                icon={<IconMessageCircle className="w-4 h-4" />}
                score={result.message.messageScore}
              >
                <div className="space-y-3">
                  {/* Word counts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-hover rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">{result.message.benefitWordCount}</p>
                      <p className="text-xs text-muted">Mots bénéfices</p>
                    </div>
                    <div className="p-3 bg-hover rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">{result.message.featureWordCount}</p>
                      <p className="text-xs text-muted">Mots features</p>
                    </div>
                  </div>

                  {/* Average sentence length */}
                  <div className="p-3 bg-hover rounded-lg flex items-center justify-between">
                    <span className="text-sm text-secondary">Longueur moyenne des phrases</span>
                    <span className={`text-sm font-medium ${
                      result.message.avgSentenceLength <= 20 ? 'text-success' :
                      result.message.avgSentenceLength <= 30 ? 'text-warning' : 'text-danger'
                    }`}>
                      {result.message.avgSentenceLength} mots
                    </span>
                  </div>

                  {/* Jargon */}
                  {result.message.jargonWords.length > 0 && (
                    <div className="p-3 bg-warning-light border border-warning rounded-lg">
                      <p className="text-sm text-warning mb-2">
                        <strong>{t('technical_jargon')}:</strong>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.message.jargonWords.map((word, i) => (
                          <span key={i} className="px-2 py-0.5 bg-warning-light text-warning text-xs rounded">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {result.message.issues.length > 0 && (
                    <IssueList
                      issues={result.message.issues.map(issue => ({ text: issue, priority: 'medium' as const }))}
                    />
                  )}
                </div>
              </AuditCategoryBlock>

              {/* Recommendations */}
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
                      <p>Aucune recommandation majeure</p>
                    </div>
                  )}
                </div>
              </AuditCategoryBlock>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 flex flex-col items-center justify-center text-center"
        >
          <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center mb-4">
            <IconTarget className="w-10 h-10 !text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            {t('analyze_page')}
          </h3>
          <p className="text-muted max-w-md">
            Entrez l&apos;URL d&apos;une page pour obtenir un audit SEO et structure complet avec des recommandations actionnables.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

