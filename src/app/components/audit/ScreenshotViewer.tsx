'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import {
  IconZoomIn,
  IconZoomOut,
  IconX,
  IconMaximize,
  IconDownload,
  IconPhoto,
  IconPhotoOff,
  IconLayoutRows,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface ScreenshotViewerProps {
  viewport?: string; // base64 image
  fullPage?: string; // base64 image
  url: string;
  capturedAt?: string;
}

export default function ScreenshotViewer({
  viewport,
  fullPage,
  url,
  capturedAt,
}: ScreenshotViewerProps) {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<'viewport' | 'fullPage'>('viewport');
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Block body scroll and setup Lenis when modal is open
  useEffect(() => {
    if (isFullscreen) {
      // Block body scroll
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      // Setup Lenis for modal scroll
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
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Cleanup Lenis
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

  const currentImage = activeView === 'viewport' ? viewport : fullPage;
  const hasImages = viewport || fullPage;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleDownload = () => {
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${currentImage}`;
    link.download = `screenshot-${new URL(url).hostname}-${activeView}-${Date.now()}.png`;
    link.click();
  };

  if (!hasImages) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center !text-center">
        <div className="w-16 h-16 rounded-full bg-warning-light flex items-center justify-center mb-4">
          <IconPhotoOff className="w-8 h-8 !text-warning" />
        </div>
        <h4 className="font-semibold !text-primary mb-2">
          {t('screenshot_unavailable') || 'Capture non disponible'}
        </h4>
        <p className="text-sm !text-muted max-w-sm">
          {t('screenshot_unavailable_desc') || 'La capture d\'écran n\'a pas pu être effectuée pour cette page.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-muted flex items-center justify-between border-b border-default">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-accent-light ">
              <IconPhoto className="w-4 h-4 !text-accent" />
            </div>
            <div>
              <h4 className="font-semibold !text-primary !text-sm">
                {t('page_screenshot') || 'Capture de la page'}
              </h4>
              {capturedAt && (
                <p className="!text-xs !text-muted">
                  {new Date(capturedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            {viewport && fullPage && (
              <div className="flex bg-card  p-1 border border-default">
                <button
                  onClick={() => setActiveView('viewport')}
                  className={`px-3 py-1.5 !text-xs font-medium  transition-colors ${
                    activeView === 'viewport'
                      ? 'bg-accent !text-white'
                      : 'text-muted hover:!text-primary'
                  }`}
                >
                  {t('viewport') || 'Viewport'}
                </button>
                <button
                  onClick={() => setActiveView('fullPage')}
                  className={`px-3 py-1.5 !text-xs font-medium  transition-colors flex items-center gap-1 ${
                    activeView === 'fullPage'
                      ? 'bg-accent !text-white'
                      : 'text-muted hover:!text-primary'
                  }`}
                >
                  <IconLayoutRows className="w-3 h-3" />
                  {t('full_page') || 'Page complète'}
                </button>
              </div>
            )}

            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 !text-muted hover:!text-accent hover:bg-accent-light  transition-colors"
              title={t('fullscreen') || 'Plein écran'}
            >
              <IconMaximize className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              className="p-2 !text-muted hover:!text-accent hover:bg-accent-light  transition-colors"
              title={t('download') || 'Télécharger'}
            >
              <IconDownload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-muted">
          <div 
            className="relative overflow-hidden  border border-default bg-card shadow-theme-sm cursor-pointer"
            onClick={() => setIsFullscreen(true)}
          >
            <img
              src={`data:image/png;base64,${currentImage}`}
              alt={`Screenshot of ${url}`}
              className="w-full h-auto max-h-[400px] object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
              <span className="px-3 py-1.5 bg-black/60 !text-white !text-sm rounded-full flex items-center gap-2">
                <IconZoomIn className="w-4 h-4" />
                {t('click_to_zoom') || 'Cliquer pour agrandir'}
              </span>
            </div>
          </div>
        </div>

        {/* URL info */}
        <div className="px-4 py-2 border-t border-default">
          <p className="!text-xs !text-muted truncate" title={url}>
            {url}
          </p>
        </div>
      </motion.div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between py-4 px-6 bg-black/50">
              <div className="flex items-center gap-4">
                {/* View Toggle */}
                {viewport && fullPage && (
                  <div className="flex bg-white/10  p-1">
                    <button
                      onClick={() => { setActiveView('viewport'); handleResetZoom(); }}
                      className={`px-3 py-1.5 !text-xs font-medium  transition-colors ${
                        activeView === 'viewport'
                          ? 'bg-accent !text-white'
                          : 'text-white/70 hover:!text-white'
                      }`}
                    >
                      Viewport
                    </button>
                    <button
                      onClick={() => { setActiveView('fullPage'); handleResetZoom(); }}
                      className={`px-3 py-1.5 !text-xs font-medium  transition-colors ${
                        activeView === 'fullPage'
                          ? 'bg-accent !text-white'
                          : 'text-white/70 hover:!text-white'
                      }`}
                    >
                      Page complète
                    </button>
                  </div>
                )}

                {/* Zoom controls */}
                <div className="flex items-center gap-2 bg-white/10  p-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-2 !text-white/70 hover:!text-white disabled:opacity-30 disabled:cursor-not-allowed  transition-colors"
                  >
                    <IconZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-white !text-sm w-16 !text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="p-2 !text-white/70 hover:!text-white disabled:opacity-30 disabled:cursor-not-allowed  transition-colors"
                  >
                    <IconZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 !text-white/70 hover:!text-white hover:bg-white/10  transition-colors"
                >
                  <IconDownload className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setIsFullscreen(false); handleResetZoom(); }}
                  className="p-2 !text-white/70 hover:!text-white hover:bg-white/10  transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Container with Lenis scroll */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-auto p-4"
              style={{ overscrollBehavior: 'contain' }}
            >
              <div 
                className="min-h-full flex items-start justify-center pb-8"
                style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              >
                <motion.img
                  src={`data:image/png;base64,${currentImage}`}
                  alt={`Screenshot of ${url}`}
                  className="max-w-none  shadow-2xl"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: zoom, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
            </div>

            {/* URL Bar */}
            <div className="p-3 bg-black/50 !text-center">
              <p className="text-sm !text-white/60 truncate">{url}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

