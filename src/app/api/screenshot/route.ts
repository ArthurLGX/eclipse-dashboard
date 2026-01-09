/**
 * @file route.ts
 * @description API route for capturing website screenshots using Puppeteer
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface ScreenshotRequest {
  url: string;
  fullPage?: boolean;
  viewport?: { width: number; height: number };
}

interface ScreenshotResult {
  url: string;
  viewport: string; // base64 encoded image
  fullPage?: string; // base64 encoded image
  capturedAt: string;
}

// ============================================================================
// CACHE (Simple in-memory, TTL 1 hour)
// ============================================================================

interface CacheEntry {
  result: ScreenshotResult;
  expiresAt: number;
}

const screenshotCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(url: string, fullPage: boolean): string {
  return `screenshot::${url}::${fullPage}`;
}

function getCachedResult(url: string, fullPage: boolean): ScreenshotResult | null {
  const key = getCacheKey(url, fullPage);
  const entry = screenshotCache.get(key);
  
  if (entry && Date.now() < entry.expiresAt) {
    return entry.result;
  }
  
  screenshotCache.delete(key);
  return null;
}

function setCachedResult(url: string, fullPage: boolean, result: ScreenshotResult): void {
  const key = getCacheKey(url, fullPage);
  screenshotCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// ============================================================================
// SCREENSHOT FUNCTION
// ============================================================================

async function captureScreenshot(
  url: string,
  options: { fullPage?: boolean; viewport?: { width: number; height: number } }
): Promise<ScreenshotResult> {
  // Dynamic import to avoid loading puppeteer on every request
  const puppeteer = await import('puppeteer');
  
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    const viewport = options.viewport || { width: 1440, height: 900 };
    await page.setViewport(viewport);
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    // Wait a bit for any lazy-loaded content
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    // Close any cookie banners or popups
    try {
      await page.evaluate(() => {
        // Common cookie consent selectors
        const selectors = [
          '[class*="cookie"] button',
          '[class*="consent"] button',
          '[id*="cookie"] button',
          '[id*="consent"] button',
          'button[class*="accept"]',
          'button[class*="agree"]',
          '.cc-dismiss',
          '#onetrust-accept-btn-handler',
        ];
        
        for (const selector of selectors) {
          const button = document.querySelector(selector) as HTMLButtonElement;
          if (button) {
            button.click();
            break;
          }
        }
      });
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
    } catch {
      // Ignore cookie banner errors
    }
    
    // Capture viewport screenshot
    const viewportScreenshot = await page.screenshot({
      encoding: 'base64',
      type: 'png',
    });
    
    // Capture full page if requested
    let fullPageScreenshot: string | undefined;
    if (options.fullPage) {
      fullPageScreenshot = await page.screenshot({
        encoding: 'base64',
        type: 'png',
        fullPage: true,
      }) as string;
    }
    
    return {
      url,
      viewport: viewportScreenshot as string,
      fullPage: fullPageScreenshot,
      capturedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ScreenshotRequest = await request.json();
    
    // Validate input
    if (!body.url) {
      return NextResponse.json(
        { error: 'url_required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    let normalizedUrl: string;
    try {
      const urlObj = new URL(body.url);
      normalizedUrl = urlObj.toString();
    } catch {
      return NextResponse.json(
        { error: 'invalid_url' },
        { status: 400 }
      );
    }
    
    const fullPage = body.fullPage ?? true;
    
    // Check cache first
    const cached = getCachedResult(normalizedUrl, fullPage);
    if (cached) {
      return NextResponse.json({
        ...cached,
        fromCache: true,
      });
    }
    
    // Capture screenshot
    const result = await captureScreenshot(normalizedUrl, {
      fullPage,
      viewport: body.viewport,
    });
    
    // Cache the result
    setCachedResult(normalizedUrl, fullPage, result);
    
    return NextResponse.json({
      ...result,
      fromCache: false,
    });
    
  } catch (error) {
    console.error('Screenshot error:', error);
    return NextResponse.json(
      { 
        error: 'screenshot_error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

