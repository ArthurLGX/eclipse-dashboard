'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import {
  IconSparkles,
  IconRefresh,
  IconDownload,
  IconMaximize,
  IconX,
  IconArrowsHorizontal,
  IconPhoto,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface StyleAnalysis {
  dominantColors?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  isDarkMode?: boolean;
  styleType?: 'modern' | 'minimal' | 'corporate' | 'creative' | 'classic';
  fontStyle?: 'sans-serif' | 'serif' | 'mixed';
  hasGradients?: boolean;
  roundedCorners?: boolean;
}

interface GeneratedMockupProps {
  pageType: 'landing' | 'homepage' | 'product';
  missingSections: string[];
  existingSections: string[];
  currentScreenshot?: string;
  url: string;
  styleAnalysis?: StyleAnalysis;
}

interface MockupResult {
  imageUrl: string;
  prompt: string;
  generatedAt: string;
  fromCache?: boolean;
}

export default function GeneratedMockup({
  pageType,
  missingSections,
  existingSections,
  currentScreenshot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  url: _url,
  styleAnalysis,
}: GeneratedMockupProps) {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [mockup, setMockup] = useState<MockupResult | null>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Block body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      if (scrollContainerRef.current) {
        lenisRef.current = new Lenis({
          wrapper: scrollContainerRef.current,
          content: scrollContainerRef.current.firstElementChild as HTMLElement,
          smoothWheel: true,
          wheelMultiplier: 1,
        });

        const animate = (time: number) => {
          lenisRef.current?.raf(time);
          if (isFullscreen) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    };
  }, [isFullscreen]);

  // Preload image from URL
  const preloadImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(imageUrl);
      img.onerror = () => reject(new Error('image_load_failed'));
      img.src = imageUrl;
    });
  };

  const generateMockup = async () => {
    setIsGenerating(true);
    setIsImageLoading(false);
    setLoadedImageUrl(null);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          missingSections,
          existingSections,
          style: styleAnalysis?.styleType || 'modern',
          styleAnalysis,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }
      
      const data = await response.json();
      setMockup(data);
      
      // Now preload the image (Pollinations generates on-the-fly)
      setIsGenerating(false);
      setIsImageLoading(true);
      
      try {
        const loadedUrl = await preloadImage(data.imageUrl);
        setLoadedImageUrl(loadedUrl);
      } catch {
        // If preload fails, still show the URL (might work with img tag)
        setLoadedImageUrl(data.imageUrl);
      } finally {
        setIsImageLoading(false);
      }
    } catch (err) {
      console.error('Mockup generation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
      setIsImageLoading(false);
    }
  };

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleDownload = async () => {
    if (!loadedImageUrl) return;
    
    try {
      // Handle both data URLs and regular URLs
      if (loadedImageUrl.startsWith('data:')) {
        // Data URL - create blob from base64
        const response = await fetch(loadedImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mockup-ideal-${pageType}-${Date.now()}.png`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Regular URL
        const response = await fetch(loadedImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mockup-ideal-${pageType}-${Date.now()}.png`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback: open in new tab
      window.open(loadedImageUrl, '_blank');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-muted flex items-center justify-between border-b border-default">
          <div className="flex items-center gap-3 relative">
            <div className="p-1.5 bg-accent-light rounded-lg">
              <IconSparkles className="w-4 h-4 !text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-primary text-sm">
                {t('ai_mockup') || 'Maquette IA'}
              </h4>
              <p className="!text-xs text-muted">
                {t('ai_mockup_desc') || 'Généré par DALL-E 3'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loadedImageUrl && (
              <>
                <button
                  onClick={() => setComparisonMode(comparisonMode === 'side-by-side' ? 'slider' : 'side-by-side')}
                  className="p-2 text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors"
                  title={t('toggle_comparison') || 'Changer le mode'}
                >
                  <IconArrowsHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors"
                  title={t('fullscreen') || 'Plein écran'}
                >
                  <IconMaximize className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors"
                  title={t('download') || 'Télécharger'}
                >
                  <IconDownload className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {!mockup && !isGenerating && !error && (
            /* Initial State - Generate Button */
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent-light flex items-center justify-center">
                <IconSparkles className="w-10 h-10 !text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-primary mb-2">
                {t('generate_ideal_mockup') || 'Générer la maquette idéale'}
              </h4>
              <p className="text-sm text-muted max-w-md mx-auto mb-6">
                {t('mockup_explanation') || 'L\'IA va créer une maquette optimisée basée sur les sections manquantes et les meilleures pratiques.'}
              </p>
              <button
                onClick={generateMockup}
                className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
              >
                <IconSparkles className="w-5 h-5" />
                {t('generate_with_ai') || 'Générer avec l\'IA'}
              </button>
              <p className="!text-xs text-muted mt-3">
                {t('generation_time') || 'Génération en ~15-20 secondes'}
              </p>
            </div>
          )}

          {(isGenerating || isImageLoading) && (
            /* Loading State */
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-accent opacity-20" />
                <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                <IconSparkles className="absolute inset-0 m-auto w-8 h-8 !text-accent animate-pulse" />
              </div>
              <p className="text-lg font-medium text-primary">
                {isImageLoading 
                  ? (t('loading_image') || 'Chargement de l\'image...')
                  : (t('generating_mockup') || 'Génération en cours...')
                }
              </p>
              <p className="text-sm text-muted mt-2">
                {isImageLoading
                  ? (t('image_being_created') || 'L\'image est en cours de création')
                  : (t('ai_creating_design') || 'L\'IA crée votre maquette optimisée')
                }
              </p>
            </div>
          )}

          {error && (
            /* Error State */
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-light flex items-center justify-center">
                <IconAlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <h4 className="text-lg font-semibold text-warning-text mb-2">
                {error === 'rate_limit'
                  ? (t('rate_limit_title') || 'Limite de requêtes atteinte')
                  : (t('generation_error') || 'Erreur de génération')}
              </h4>
              <p className="text-sm text-muted max-w-md mx-auto mb-4">
                {error === 'rate_limit'
                  ? (t('rate_limit_desc') || 'Trop de requêtes. Veuillez patienter quelques instants.')
                  : error}
              </p>
              
              {error === 'rate_limit' && (
                <div className="mb-4">
                  <a
                    href="https://pollinations.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    → {t('check_pollinations') || 'Voir le statut de Pollinations.ai'}
                  </a>
                </div>
              )}
              
              <button
                onClick={generateMockup}
                className="btn-ghost px-4 py-2 flex items-center gap-2 mx-auto"
              >
                <IconRefresh className="w-4 h-4" />
                {t('retry') || 'Réessayer'}
              </button>
            </div>
          )}

          {loadedImageUrl && !isGenerating && !isImageLoading && (
            /* Mockup Display */
            <div>
              {comparisonMode === 'side-by-side' ? (
                /* Side by Side View */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Current */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-danger-light text-danger !text-xs font-medium rounded-full">
                        {t('current') || 'Actuel'}
                      </span>
                    </div>
                    {currentScreenshot ? (
                      <div className="rounded-lg overflow-hidden border border-default">
                        <img
                          src={`data:image/png;base64,${currentScreenshot}`}
                          alt="Current page"
                          className="w-full h-auto"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-default bg-muted p-12 text-center">
                        <IconPhoto className="w-8 h-8 mx-auto mb-2 text-muted opacity-50" />
                        <p className="text-sm text-muted">{t('no_screenshot') || 'Pas de capture'}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Ideal */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-success-light !text-success-text -text !text-xs font-medium rounded-full">
                        {t('ideal') || 'Idéal'}
                      </span>
                      {mockup?.fromCache && (
                        <span className="!text-xs text-muted">({t('cached') || 'cache'})</span>
                      )}
                    </div>
                    <div className="rounded-lg overflow-hidden border border-success">
                      <img
                        src={loadedImageUrl}
                        alt="Ideal mockup"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Slider View */
                <div
                  ref={sliderRef}
                  className="relative rounded-lg overflow-hidden cursor-col-resize select-none border border-default"
                  onMouseMove={handleSliderMove}
                  style={{ minHeight: '300px' }}
                >
                  {/* Ideal (background) */}
                  <img
                    src={loadedImageUrl}
                    alt="Ideal mockup"
                    className="w-full h-auto"
                  />
                  
                  {/* Current (overlay with clip) */}
                  {currentScreenshot && (
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    >
                      <img
                        src={`data:image/png;base64,${currentScreenshot}`}
                        alt="Current page"
                        className="w-full h-auto object-cover"
                        style={{ minHeight: '300px' }}
                      />
                    </div>
                  )}
                  
                  {/* Slider line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-accent">
                      <IconArrowsHorizontal className="w-5 h-5 !text-accent" />
                    </div>
                  </div>
                  
                  {/* Labels */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-danger text-white !text-xs font-medium rounded z-10">
                    {t('current') || 'Actuel'}
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 bg-success text-white !text-xs font-medium rounded z-10">
                    {t('ideal') || 'Idéal'}
                  </div>
                </div>
              )}

              {/* Regenerate button */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={generateMockup}
                  className="btn-ghost px-4 py-2 flex items-center gap-2"
                >
                  <IconRefresh className="w-4 h-4" />
                  {t('regenerate') || 'Régénérer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && loadedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between py-4 px-6 bg-black/50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setComparisonMode(comparisonMode === 'side-by-side' ? 'slider' : 'side-by-side')}
                  className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg flex items-center gap-2 hover:bg-white/20"
                >
                  <IconArrowsHorizontal className="w-4 h-4" />
                  {comparisonMode === 'side-by-side' ? 'Mode slider' : 'Côte à côte'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <IconDownload className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-auto p-6"
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="max-w-7xl mx-auto">
                {comparisonMode === 'side-by-side' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <p className="text-white/60 text-sm mb-2 text-center">{t('current') || 'Actuel'}</p>
                      {currentScreenshot ? (
                        <img
                          src={`data:image/png;base64,${currentScreenshot}`}
                          alt="Current"
                          className="w-full rounded-lg"
                        />
                      ) : (
                        <div className="bg-white/10 rounded-lg p-20 text-center">
                          <p className="text-white/40">{t('no_screenshot') || 'Pas de capture'}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white/60 text-sm mb-2 text-center">{t('ideal') || 'Idéal'}</p>
                      <img
                        src={loadedImageUrl}
                        alt="Ideal"
                        className="w-full rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    ref={sliderRef}
                    className="relative rounded-lg overflow-hidden cursor-col-resize"
                    onMouseMove={handleSliderMove}
                  >
                    <img src={loadedImageUrl} alt="Ideal" className="w-full" />
                    {currentScreenshot && (
                      <div
                        className="absolute inset-0"
                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                      >
                        <img src={`data:image/png;base64,${currentScreenshot}`} alt="Current" className="w-full" />
                      </div>
                    )}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
                      style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-accent">
                        <IconArrowsHorizontal className="w-5 h-5 !text-accent" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

