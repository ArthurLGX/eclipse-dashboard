/**
 * @file route.ts
 * @description API route for SEO & structure audit analysis
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface AuditRequest {
  url: string;
  pageType: 'landing' | 'homepage' | 'product';
}

interface TechnicalScore {
  performance: number;
  seo: number;
  accessibility: number;
  lcp?: number;
  cls?: number;
  ttfb?: number;
}

interface StructureAnalysis {
  structureScore: number;
  missingSections: string[];
  detectedSections: string[];
  hasH1: boolean;
  h1Count: number;
  headingHierarchy: { level: number; text: string }[];
  sectionsCount: number;
  longBlocksWithoutHeadings: number;
  hasCta: boolean;
}

interface MessageAnalysis {
  messageScore: number;
  issues: string[];
  featureWordCount: number;
  benefitWordCount: number;
  avgSentenceLength: number;
  jargonWords: string[];
}

interface SeoAnalysis {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
  issues: string[];
}

export interface ScreenshotData {
  viewport?: string; // base64 encoded image
  fullPage?: string; // base64 encoded image
  capturedAt?: string;
}

// Section detected with position info for wireframe mapping
export interface DetectedSection {
  id: string;
  name: string;
  type: 'hero' | 'problem' | 'solution' | 'proof' | 'cta' | 'features' | 'pricing' | 'faq' | 'footer' | 'navigation' | 'unknown';
  detected: boolean;
  position?: {
    top: number; // percentage from top
    height: number; // percentage of viewport
  };
  issues: string[];
  suggestions: string[];
}

// Ideal wireframe section for comparison
export interface IdealSection {
  id: string;
  name: string;
  type: string;
  description: string;
  importance: 'critical' | 'important' | 'optional';
  idealPosition: number; // order in ideal layout
}

export interface AuditResult {
  url: string;
  pageType: string;
  analyzedAt: string;
  cachedUntil?: string;
  globalScore: number;
  technical: TechnicalScore;
  structure: StructureAnalysis;
  message: MessageAnalysis;
  seo: SeoAnalysis;
  recommendations: { text: string; priority: 'high' | 'medium' | 'low' }[];
  screenshots?: ScreenshotData;
  detectedSections?: DetectedSection[];
  idealSections?: IdealSection[];
}

// ============================================================================
// CACHE (Simple in-memory, TTL 1 hour)
// ============================================================================

interface CacheEntry {
  result: AuditResult;
  expiresAt: number;
}

const auditCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(url: string, pageType: string): string {
  return `${url}::${pageType}`;
}

function getCachedResult(url: string, pageType: string): AuditResult | null {
  const key = getCacheKey(url, pageType);
  const entry = auditCache.get(key);
  
  if (entry && Date.now() < entry.expiresAt) {
    return {
      ...entry.result,
      cachedUntil: new Date(entry.expiresAt).toISOString(),
    };
  }
  
  auditCache.delete(key);
  return null;
}

function setCachedResult(url: string, pageType: string, result: AuditResult): void {
  const key = getCacheKey(url, pageType);
  auditCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// ============================================================================
// ANALYSIS HELPERS
// ============================================================================

// Feature-oriented words (to detect)
const FEATURE_WORDS = [
  'feature', 'function', 'tool', 'integration', 'api', 'dashboard',
  'analytics', 'automation', 'workflow', 'platform', 'system',
  'fonctionnalité', 'outil', 'intégration', 'tableau de bord',
  'automatisation', 'plateforme', 'système',
];

// Benefit-oriented words (positive)
const BENEFIT_WORDS = [
  'save', 'grow', 'increase', 'boost', 'improve', 'gain', 'achieve',
  'success', 'result', 'revenue', 'profit', 'time', 'money', 'easy',
  'simple', 'fast', 'quick', 'free', 'guaranteed',
  'économiser', 'croissance', 'augmenter', 'améliorer', 'gagner',
  'succès', 'résultat', 'revenu', 'profit', 'temps', 'argent',
  'facile', 'simple', 'rapide', 'gratuit', 'garanti',
];

// Technical jargon to detect
const JARGON_WORDS = [
  'synergy', 'leverage', 'paradigm', 'scalable', 'disrupt', 'pivot',
  'blockchain', 'ai-powered', 'machine learning', 'cloud-native',
  'microservices', 'devops', 'agile', 'sprint', 'mvp',
  'synergie', 'levier', 'paradigme', 'évolutif', 'disruptif',
];

// Ideal page structure sections
const IDEAL_SECTIONS = ['hero', 'problem', 'solution', 'proof', 'cta'];

// Ideal sections configuration with detailed info
const IDEAL_SECTIONS_CONFIG: IdealSection[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    type: 'navigation',
    description: 'Menu clair avec CTA visible',
    importance: 'critical',
    idealPosition: 0,
  },
  {
    id: 'hero',
    name: 'Hero Section',
    type: 'hero',
    description: 'Titre accrocheur + sous-titre + CTA principal + visuel',
    importance: 'critical',
    idealPosition: 1,
  },
  {
    id: 'proof',
    name: 'Preuve Sociale',
    type: 'proof',
    description: 'Logos clients, chiffres clés ou badges de confiance',
    importance: 'important',
    idealPosition: 2,
  },
  {
    id: 'problem',
    name: 'Problème',
    type: 'problem',
    description: 'Description du problème que vous résolvez',
    importance: 'important',
    idealPosition: 3,
  },
  {
    id: 'solution',
    name: 'Solution',
    type: 'solution',
    description: 'Comment votre produit/service résout le problème',
    importance: 'critical',
    idealPosition: 4,
  },
  {
    id: 'features',
    name: 'Fonctionnalités',
    type: 'features',
    description: '3-5 bénéfices clés avec icônes',
    importance: 'important',
    idealPosition: 5,
  },
  {
    id: 'cta',
    name: 'CTA Final',
    type: 'cta',
    description: 'Appel à l\'action clair et répété',
    importance: 'critical',
    idealPosition: 6,
  },
  {
    id: 'footer',
    name: 'Footer',
    type: 'footer',
    description: 'Liens utiles et informations de contact',
    importance: 'optional',
    idealPosition: 7,
  },
];

// Section detection patterns
const SECTION_PATTERNS: Record<string, { keywords: string[]; cssPatterns: string[] }> = {
  navigation: {
    keywords: ['nav', 'menu', 'header'],
    cssPatterns: ['nav', 'header', 'navbar', 'navigation', 'menu'],
  },
  hero: {
    keywords: ['hero', 'banner', 'jumbotron', 'masthead'],
    cssPatterns: ['hero', 'banner', 'jumbotron', 'landing', 'intro', 'masthead'],
  },
  problem: {
    keywords: ['problem', 'challenge', 'pain', 'struggle', 'frustrat', 'problème', 'défi'],
    cssPatterns: ['problem', 'challenge', 'pain-point'],
  },
  solution: {
    keywords: ['solution', 'how it works', 'our approach', 'comment ça marche', 'notre approche'],
    cssPatterns: ['solution', 'how-it-works', 'approach', 'method'],
  },
  proof: {
    keywords: ['testimonial', 'review', 'client', 'trust', 'logo', 'partner', 'témoignage', 'avis'],
    cssPatterns: ['testimonial', 'review', 'client', 'trust', 'logo', 'partner', 'social-proof'],
  },
  features: {
    keywords: ['feature', 'benefit', 'advantage', 'why', 'fonctionnalité', 'avantage'],
    cssPatterns: ['feature', 'benefit', 'advantage', 'why-us'],
  },
  cta: {
    keywords: ['cta', 'call-to-action', 'get started', 'sign up', 'try', 'contact', 'demo', 'commencer'],
    cssPatterns: ['cta', 'call-to-action', 'signup', 'contact', 'demo'],
  },
  pricing: {
    keywords: ['pricing', 'price', 'plan', 'tarif', 'prix'],
    cssPatterns: ['pricing', 'price', 'plan', 'tarif'],
  },
  faq: {
    keywords: ['faq', 'question', 'frequently asked'],
    cssPatterns: ['faq', 'question', 'accordion'],
  },
  footer: {
    keywords: ['footer', 'bottom'],
    cssPatterns: ['footer', 'site-footer'],
  },
};

function countWords(text: string, wordList: string[]): number {
  const lowerText = text.toLowerCase();
  return wordList.filter(word => lowerText.includes(word.toLowerCase())).length;
}

function findJargon(text: string): string[] {
  const lowerText = text.toLowerCase();
  return JARGON_WORDS.filter(word => lowerText.includes(word.toLowerCase()));
}

function getAvgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  
  const totalWords = sentences.reduce((acc, sentence) => {
    return acc + sentence.trim().split(/\s+/).length;
  }, 0);
  
  return Math.round(totalWords / sentences.length);
}

function detectSections(html: string): { detected: string[]; missing: string[] } {
  const lowerHtml = html.toLowerCase();
  const detected: string[] = [];
  
  // Hero detection (usually first section with h1 or large text)
  if (lowerHtml.includes('hero') || lowerHtml.includes('<h1') || lowerHtml.includes('class="header"')) {
    detected.push('hero');
  }
  
  // Problem detection
  if (lowerHtml.includes('problem') || lowerHtml.includes('challenge') || 
      lowerHtml.includes('pain') || lowerHtml.includes('struggle') ||
      lowerHtml.includes('problème') || lowerHtml.includes('défi')) {
    detected.push('problem');
  }
  
  // Solution detection
  if (lowerHtml.includes('solution') || lowerHtml.includes('how it works') ||
      lowerHtml.includes('our approach') || lowerHtml.includes('comment ça marche') ||
      lowerHtml.includes('notre approche')) {
    detected.push('solution');
  }
  
  // Proof/Social proof detection
  if (lowerHtml.includes('testimonial') || lowerHtml.includes('review') ||
      lowerHtml.includes('client') || lowerHtml.includes('trust') ||
      lowerHtml.includes('logo') || lowerHtml.includes('partner') ||
      lowerHtml.includes('témoignage') || lowerHtml.includes('avis') ||
      lowerHtml.includes('confiance') || lowerHtml.includes('partenaire')) {
    detected.push('proof');
  }
  
  // CTA detection
  const ctaPatterns = [
    'cta', 'call-to-action', 'get started', 'sign up', 'try free',
    'contact', 'demo', 'buy now', 'subscribe', 'commencer',
    'inscription', 'essai gratuit', 'acheter', 'contacter',
  ];
  if (ctaPatterns.some(p => lowerHtml.includes(p))) {
    detected.push('cta');
  }
  
  const missing = IDEAL_SECTIONS.filter(s => !detected.includes(s));
  
  return { detected, missing };
}

function analyzeHeadings(html: string): { hasH1: boolean; h1Count: number; hierarchy: { level: number; text: string }[] } {
  const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const headingMatches = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
  
  const hierarchy = headingMatches.map(h => {
    const levelMatch = h.match(/<h([1-6])/i);
    const textMatch = h.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    return {
      level: levelMatch ? parseInt(levelMatch[1]) : 1,
      text: textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '',
    };
  }).slice(0, 10); // Limit to first 10
  
  return {
    hasH1: h1Matches.length > 0,
    h1Count: h1Matches.length,
    hierarchy,
  };
}

function extractTextContent(html: string): string {
  // Remove scripts, styles, and tags
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSeoData(html: string): SeoAnalysis {
  const issues: string[] = [];
  
  // Title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const titleLength = title?.length || 0;
  
  if (!title) {
    issues.push('missing_title');
  } else if (titleLength < 30) {
    issues.push('title_too_short');
  } else if (titleLength > 60) {
    issues.push('title_too_long');
  }
  
  // Meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;
  const metaDescriptionLength = metaDescription?.length || 0;
  
  if (!metaDescription) {
    issues.push('missing_meta_desc');
  } else if (metaDescriptionLength < 120) {
    issues.push('meta_desc_too_short');
  } else if (metaDescriptionLength > 160) {
    issues.push('meta_desc_too_long');
  }
  
  // Canonical
  const hasCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
  
  // OpenGraph
  const hasOpenGraph = /<meta[^>]*property=["']og:/i.test(html);
  
  return {
    title,
    titleLength,
    metaDescription,
    metaDescriptionLength,
    hasCanonical,
    hasOpenGraph,
    issues,
  };
}

function generateRecommendations(
  seo: SeoAnalysis,
  structure: StructureAnalysis,
  message: MessageAnalysis
): { text: string; priority: 'high' | 'medium' | 'low' }[] {
  const recommendations: { text: string; priority: 'high' | 'medium' | 'low' }[] = [];
  
  // SEO recommendations
  if (!seo.title) {
    recommendations.push({ text: 'add_page_title', priority: 'high' });
  }
  if (!seo.metaDescription) {
    recommendations.push({ text: 'add_meta_description', priority: 'high' });
  }
  if (!seo.hasCanonical) {
    recommendations.push({ text: 'add_canonical_url', priority: 'medium' });
  }
  if (!seo.hasOpenGraph) {
    recommendations.push({ text: 'add_open_graph_tags', priority: 'low' });
  }
  
  // Structure recommendations
  if (!structure.hasH1) {
    recommendations.push({ text: 'add_h1_heading', priority: 'high' });
  } else if (structure.h1Count > 1) {
    recommendations.push({ text: 'use_single_h1', priority: 'medium' });
  }
  if (structure.missingSections.includes('proof')) {
    recommendations.push({ text: 'add_social_proof_section', priority: 'high' });
  }
  if (structure.missingSections.includes('cta')) {
    recommendations.push({ text: 'add_clear_cta', priority: 'high' });
  }
  if (structure.missingSections.includes('problem')) {
    recommendations.push({ text: 'add_problem_statement', priority: 'medium' });
  }
  
  // Message recommendations
  if (message.featureWordCount > message.benefitWordCount * 2) {
    recommendations.push({ text: 'focus_on_benefits_not_features', priority: 'high' });
  }
  if (message.avgSentenceLength > 25) {
    recommendations.push({ text: 'shorten_sentences', priority: 'medium' });
  }
  if (message.jargonWords.length > 3) {
    recommendations.push({ text: 'reduce_technical_jargon', priority: 'medium' });
  }
  
  return recommendations;
}

function calculateScores(
  seo: SeoAnalysis,
  structure: StructureAnalysis,
  message: MessageAnalysis
): { technical: TechnicalScore; globalScore: number } {
  // SEO Score (0-100)
  let seoScore = 100;
  if (!seo.title) seoScore -= 25;
  else if (seo.titleLength < 30 || seo.titleLength > 60) seoScore -= 10;
  if (!seo.metaDescription) seoScore -= 25;
  else if (seo.metaDescriptionLength < 120 || seo.metaDescriptionLength > 160) seoScore -= 10;
  if (!seo.hasCanonical) seoScore -= 10;
  if (!seo.hasOpenGraph) seoScore -= 5;
  
  // Performance estimate (simplified - would need real metrics)
  const performanceScore = 70; // Default estimate
  
  // Accessibility estimate (simplified)
  let accessibilityScore = 80;
  if (!structure.hasH1) accessibilityScore -= 20;
  if (structure.h1Count > 1) accessibilityScore -= 10;
  
  // Global score (weighted average)
  const globalScore = Math.round(
    (seoScore * 0.3) +
    (structure.structureScore * 0.35) +
    (message.messageScore * 0.25) +
    (performanceScore * 0.1)
  );
  
  return {
    technical: {
      performance: performanceScore,
      seo: Math.max(0, seoScore),
      accessibility: Math.max(0, accessibilityScore),
    },
    globalScore: Math.max(0, Math.min(100, globalScore)),
  };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

interface CaptureResult {
  screenshots: ScreenshotData;
  detectedSections: DetectedSection[];
}

async function captureScreenshots(url: string): Promise<CaptureResult | undefined> {
  try {
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
      await page.setViewport({ width: 1440, height: 900 });
      
      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      
      // Initial wait for page to render
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      // Try to close cookie banners first
      try {
        await page.evaluate(() => {
          const selectors = [
            '[class*="cookie"] button',
            '[class*="consent"] button',
            '[id*="cookie"] button',
            'button[class*="accept"]',
            'button[class*="agree"]',
            '.cc-dismiss',
            '#onetrust-accept-btn-handler',
            '[class*="gdpr"] button',
            '[aria-label*="cookie"] button',
            '[aria-label*="consent"] button',
          ];
          
          for (const selector of selectors) {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach((btn) => {
              const button = btn as HTMLButtonElement;
              if (button && button.offsetParent !== null) {
                button.click();
              }
            });
          }
        });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
      } catch {
        // Ignore cookie banner errors
      }
      
      // Scroll down the page to trigger lazy-load and scroll-based animations
      await page.evaluate(async () => {
        const scrollStep = window.innerHeight;
        const scrollDelay = 200; // ms between scrolls
        const maxScrolls = 10;
        
        for (let i = 0; i < maxScrolls; i++) {
          window.scrollBy(0, scrollStep);
          await new Promise(resolve => setTimeout(resolve, scrollDelay));
          
          // Stop if we've reached the bottom
          if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
            break;
          }
        }
        
        // Wait for animations triggered by scroll
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        // Wait for any scroll-to-top animations
        await new Promise(resolve => setTimeout(resolve, 300));
      });
      
      // Wait for CSS animations to complete
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          // Get all animated elements
          const animatedElements = document.querySelectorAll('*');
          let animationsRunning = 0;
          
          animatedElements.forEach((el) => {
            const style = window.getComputedStyle(el);
            const animationDuration = parseFloat(style.animationDuration) || 0;
            const transitionDuration = parseFloat(style.transitionDuration) || 0;
            
            if (animationDuration > 0 || transitionDuration > 0) {
              animationsRunning++;
            }
          });
          
          // Wait a reasonable time for animations (max 3s)
          const waitTime = Math.min(animationsRunning > 0 ? 2000 : 500, 3000);
          setTimeout(resolve, waitTime);
        });
      });
      
      // Final wait to ensure everything is rendered
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
      
      // Capture viewport screenshot
      const viewportScreenshot = await page.screenshot({
        encoding: 'base64',
        type: 'png',
      });
      
      // Capture full page screenshot
      const fullPageScreenshot = await page.screenshot({
        encoding: 'base64',
        type: 'png',
        fullPage: true,
      });
      
      // Detect sections with their positions using Puppeteer
      const detectedSections = await page.evaluate((patterns: typeof SECTION_PATTERNS) => {
        const sections: Array<{
          id: string;
          name: string;
          type: string;
          detected: boolean;
          position?: { top: number; height: number };
          issues: string[];
          suggestions: string[];
        }> = [];
        
        const pageHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        // Section names mapping
        const sectionNames: Record<string, string> = {
          navigation: 'Navigation',
          hero: 'Hero Section',
          problem: 'Problème',
          solution: 'Solution',
          proof: 'Preuve Sociale',
          features: 'Fonctionnalités',
          cta: 'Call-to-Action',
          pricing: 'Tarification',
          faq: 'FAQ',
          footer: 'Footer',
        };
        
        // Detect each section type
        Object.entries(patterns).forEach(([sectionType, { keywords, cssPatterns }]) => {
          let found = false;
          let element: Element | null = null;
          
          // Search by CSS class/id patterns
          for (const pattern of cssPatterns) {
            const el = document.querySelector(
              `[class*="${pattern}"], [id*="${pattern}"], section[data-section="${pattern}"]`
            );
            if (el) {
              found = true;
              element = el;
              break;
            }
          }
          
          // Search by text content if not found
          if (!found) {
            const allElements = document.querySelectorAll('section, div, header, footer, nav');
            for (const el of allElements) {
              const text = el.textContent?.toLowerCase() || '';
              for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                  found = true;
                  element = el;
                  break;
                }
              }
              if (found) break;
            }
          }
          
          // Calculate position
          let position: { top: number; height: number } | undefined;
          if (element) {
            const rect = element.getBoundingClientRect();
            const scrollTop = window.scrollY;
            position = {
              top: Math.round(((rect.top + scrollTop) / pageHeight) * 100),
              height: Math.round((rect.height / viewportHeight) * 100),
            };
          }
          
          // Generate issues and suggestions
          const issues: string[] = [];
          const suggestions: string[] = [];
          
          if (!found) {
            if (['hero', 'cta', 'solution'].includes(sectionType)) {
              issues.push(`Section ${sectionNames[sectionType]} manquante`);
              suggestions.push(`Ajouter une section ${sectionNames[sectionType]} claire`);
            }
          }
          
          sections.push({
            id: sectionType,
            name: sectionNames[sectionType] || sectionType,
            type: sectionType,
            detected: found,
            position,
            issues,
            suggestions,
          });
        });
        
        return sections;
      }, SECTION_PATTERNS);
      
      return {
        screenshots: {
          viewport: viewportScreenshot as string,
          fullPage: fullPageScreenshot as string,
          capturedAt: new Date().toISOString(),
        },
        detectedSections: detectedSections as DetectedSection[],
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return undefined;
  }
}

async function analyzeUrl(url: string, pageType: string, captureScreenshot = true): Promise<AuditResult> {
  // Start screenshot capture in parallel with HTML fetch
  const screenshotPromise = captureScreenshot ? captureScreenshots(url) : Promise.resolve(undefined);
  
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EclipseAuditBot/1.0)',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }
  
  const html = await response.text();
  const textContent = extractTextContent(html);
  
  // Analyze SEO
  const seo = extractSeoData(html);
  
  // Analyze headings
  const headings = analyzeHeadings(html);
  
  // Analyze sections
  const sections = detectSections(html);
  
  // Structure analysis
  const structure: StructureAnalysis = {
    structureScore: Math.max(0, 100 - (sections.missing.length * 15) - (headings.h1Count > 1 ? 10 : 0) - (!headings.hasH1 ? 20 : 0)),
    missingSections: sections.missing,
    detectedSections: sections.detected,
    hasH1: headings.hasH1,
    h1Count: headings.h1Count,
    headingHierarchy: headings.hierarchy,
    sectionsCount: sections.detected.length,
    longBlocksWithoutHeadings: 0, // Simplified
    hasCta: sections.detected.includes('cta'),
  };
  
  // Message analysis
  const featureWordCount = countWords(textContent, FEATURE_WORDS);
  const benefitWordCount = countWords(textContent, BENEFIT_WORDS);
  const avgSentenceLength = getAvgSentenceLength(textContent);
  const jargonWords = findJargon(textContent);
  
  const messageIssues: string[] = [];
  if (featureWordCount > benefitWordCount * 1.5) {
    messageIssues.push('too_feature_oriented');
  }
  if (benefitWordCount < 3) {
    messageIssues.push('low_benefit_focus');
  }
  if (avgSentenceLength > 25) {
    messageIssues.push('long_sentences');
  }
  if (jargonWords.length > 2) {
    messageIssues.push('technical_jargon');
  }
  
  const message: MessageAnalysis = {
    messageScore: Math.max(0, 100 - (messageIssues.length * 15) - Math.max(0, avgSentenceLength - 20)),
    issues: messageIssues,
    featureWordCount,
    benefitWordCount,
    avgSentenceLength,
    jargonWords,
  };
  
  // Calculate scores
  const { technical, globalScore } = calculateScores(seo, structure, message);
  
  // Generate recommendations
  const recommendations = generateRecommendations(seo, structure, message);
  
  // Wait for screenshots and section detection
  const captureResult = await screenshotPromise;
  
  return {
    url,
    pageType,
    analyzedAt: new Date().toISOString(),
    globalScore,
    technical,
    structure,
    message,
    seo,
    recommendations,
    screenshots: captureResult?.screenshots,
    detectedSections: captureResult?.detectedSections,
    idealSections: IDEAL_SECTIONS_CONFIG,
  };
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: AuditRequest = await request.json();
    
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
    
    const pageType = body.pageType || 'landing';
    
    // Check cache first
    const cached = getCachedResult(normalizedUrl, pageType);
    if (cached) {
      return NextResponse.json({
        ...cached,
        fromCache: true,
      });
    }
    
    // Perform analysis
    const result = await analyzeUrl(normalizedUrl, pageType);
    
    // Cache the result
    setCachedResult(normalizedUrl, pageType, result);
    
    return NextResponse.json({
      ...result,
      fromCache: false,
    });
    
  } catch (error) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: 'analysis_error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check cache status or invalidate
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const pageType = searchParams.get('pageType') || 'landing';
  const invalidate = searchParams.get('invalidate') === 'true';
  
  if (!url) {
    return NextResponse.json(
      { error: 'url_required' },
      { status: 400 }
    );
  }
  
  const key = getCacheKey(url, pageType);
  
  if (invalidate) {
    auditCache.delete(key);
    return NextResponse.json({ success: true, message: 'Cache invalidated' });
  }
  
  const cached = getCachedResult(url, pageType);
  return NextResponse.json({
    cached: !!cached,
    cachedUntil: cached?.cachedUntil || null,
  });
}

