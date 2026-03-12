'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSparkles,
  IconDownload,
  IconRefresh,
  IconPhoto,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

/** Limite 1 Mo pour l'API Claude */
const MAX_IMAGE_BYTES = 1024 * 1024;

const TOAST_KEYS = [
  'redesign_toast_1',
  'redesign_toast_2',
  'redesign_toast_3',
  'redesign_toast_4',
  'redesign_toast_5',
  'redesign_toast_6',
  'redesign_toast_7',
  'redesign_toast_8',
  'redesign_toast_9',
  'redesign_toast_10',
];

interface RedesignWithClaudeProps {
  /** Screenshot base64 from audit (viewport) - optional prefill */
  defaultScreenshot?: string;
}

export default function RedesignWithClaude({ defaultScreenshot }: RedesignWithClaudeProps) {
  const { t } = useLanguage();
  const [screenshot, setScreenshot] = useState<string | null>(defaultScreenshot ?? null);

  useEffect(() => {
    if (!defaultScreenshot) return;
    const base64Len = defaultScreenshot.includes('base64,')
      ? defaultScreenshot.split('base64,')[1]?.length ?? 0
      : defaultScreenshot.length;
    if (base64Len * 0.75 > MAX_IMAGE_BYTES) {
      setSizeError(t('redesign_image_too_large'));
      return;
    }
    setSizeError(null);
    setScreenshot(defaultScreenshot);
  }, [defaultScreenshot, t]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toastIndex, setToastIndex] = useState(0);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const processImage = useCallback(
    (dataUrl: string, onError?: (msg: string) => void) => {
      const base64Len = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1]?.length ?? 0 : dataUrl.length;
      const sizeKB = Math.round((base64Len * 3) / 4 / 1024);
      if (sizeKB > 1024) {
        onError?.(t('redesign_image_too_large'));
        return;
      }
      setSizeError(null);
      setScreenshot(dataUrl);
    },
    [t]
  );

  // Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            if (file.size > MAX_IMAGE_BYTES) {
              setSizeError(t('redesign_image_too_large'));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => processImage(reader.result as string, setSizeError);
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    },
    [t, processImage]
  );

  // Simulated progress + rotating toasts during generation
  useEffect(() => {
    if (!isGenerating) return;
    setProgress(0);
    setToastIndex(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        return p + Math.random() * 4 + 2;
      });
    }, 800);

    const toastInterval = setInterval(() => {
      setToastIndex((i) => (i + 1) % TOAST_KEYS.length);
    }, 3500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(toastInterval);
    };
  }, [isGenerating]);

  const generateHtml = async () => {
    if (!screenshot) return;
    setIsGenerating(true);
    setError(null);
    setHtml(null);

    try {
      const response = await fetch('/api/generate-redesign-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshot,
          prompt: prompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Generation failed');
      }

      const data = await response.json();
      setHtml(data.html);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refonte-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      <div className="px-4 py-3 bg-muted flex items-center justify-between border-b border-default">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent-light">
            <IconSparkles className="w-4 h-4 !text-accent-text" />
          </div>
          <div>
            <h4 className="font-semibold !text-primary !text-sm">{t('redesign_title')}</h4>
            <p className="!text-xs !text-muted">{t('redesign_desc')}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!html && !isGenerating && !error && (
          <div className="space-y-4">
            {/* Screenshot paste area */}
            <div>
              <label className="block !text-sm font-medium !text-primary mb-2">
                {t('redesign_paste_screenshot')}
              </label>
              <div
                tabIndex={0}
                onPaste={handlePaste}
                className="border-2 border-dashed border-default rounded-lg p-8 !text-center focus:outline-none focus:ring-2 focus:ring-accent min-h-[160px] flex flex-col items-center justify-center gap-2"
              >
                {screenshot ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL from paste, next/image doesn't support it */}
                    <img
                      src={screenshot}
                      alt="Screenshot"
                      className="max-h-32 rounded object-contain"
                    />
                    <p className="!text-xs !text-muted">{t('redesign_paste_screenshot')} · {t('redesign_max_size')}</p>
                  </>
                ) : (
                  <>
                    <IconPhoto className="w-12 h-12 !text-muted opacity-50" />
                    <p className="!text-sm !text-muted">{t('redesign_paste_screenshot')}</p>
                    <p className="!text-xs !text-muted font-mono">{t('redesign_max_size')}</p>
                  </>
                )}
              </div>
              {sizeError && (
                <p className="mt-2 !text-xs !text-danger flex items-center gap-1">
                  <IconAlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {sizeError}
                </p>
              )}
            </div>

            {/* Prompt */}
            <div>
              <label className="block !text-sm font-medium !text-primary mb-2">
                {t('redesign_prompt_label')}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('redesign_prompt_placeholder')}
                className="input w-full min-h-[80px] resize-y"
                rows={3}
              />
            </div>

            <button
              onClick={generateHtml}
              disabled={!screenshot}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <IconSparkles className="w-5 h-5" />
              {t('redesign_generate')}
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="!text-center py-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-accent opacity-20" />
              <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <IconSparkles className="absolute inset-0 m-auto w-8 h-8 !text-accent-text animate-pulse" />
            </div>
            <p className="!text-lg font-medium !text-primary mb-2">{t('redesign_generating')}</p>
            {/* Progress bar */}
            <div className="max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {/* Fun toast */}
            <AnimatePresence mode="wait">
              <motion.p
                key={toastIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="!text-sm !text-muted italic"
              >
                {t(TOAST_KEYS[toastIndex])}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {error && (
          <div className="!text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger-light flex items-center justify-center">
              <IconAlertTriangle className="w-8 h-8 !text-danger" />
            </div>
            <h4 className="!text-lg font-semibold !text-danger mb-2">{t('redesign_error')}</h4>
            <p className="!text-sm !text-muted mb-4">{error}</p>
            <button onClick={generateHtml} className="btn-ghost px-4 py-2 flex items-center gap-2 mx-auto">
              <IconRefresh className="w-4 h-4" />
              {t('redesign_retry')}
            </button>
          </div>
        )}

        {html && !isGenerating && (
          <div>
            <div className="p-4 bg-success-light rounded-lg mb-4 !text-center">
              <IconSparkles className="w-8 h-8 mx-auto mb-2 !text-success-text -text" />
              <p className="!text-sm font-medium !text-success-text -text">{t('redesign_download_html')}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownload} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                <IconDownload className="w-5 h-5" />
                {t('redesign_download_html')}
              </button>
              <button
                onClick={() => {
                  setHtml(null);
                  setProgress(0);
                }}
                className="btn-ghost px-4 py-3 flex items-center gap-2"
              >
                <IconRefresh className="w-5 h-5" />
                {t('redesign_retry')}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
