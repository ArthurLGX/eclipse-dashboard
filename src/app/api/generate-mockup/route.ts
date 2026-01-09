/**
 * @file route.ts
 * @description API route for generating ideal wireframe mockups using Pollinations.ai (free, no API key required)
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface MockupRequest {
  pageType: 'landing' | 'homepage' | 'product';
  industry?: string;
  missingSections: string[];
  existingSections: string[];
  siteName?: string;
  style?: 'modern' | 'minimal' | 'corporate' | 'creative';
}

interface MockupResult {
  imageUrl: string;
  prompt: string;
  generatedAt: string;
}

// ============================================================================
// CACHE (Simple in-memory, TTL 24 hours for generated images)
// ============================================================================

interface CacheEntry {
  result: MockupResult;
  expiresAt: number;
}

const mockupCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(request: MockupRequest): string {
  return `mockup::${request.pageType}::${request.missingSections.sort().join(',')}::${request.style || 'modern'}`;
}

function getCachedResult(request: MockupRequest): MockupResult | null {
  const key = getCacheKey(request);
  const entry = mockupCache.get(key);
  
  if (entry && Date.now() < entry.expiresAt) {
    return entry.result;
  }
  
  mockupCache.delete(key);
  return null;
}

function setCachedResult(request: MockupRequest, result: MockupResult): void {
  const key = getCacheKey(request);
  mockupCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

// Section descriptions for prompt generation
const SECTION_DESCRIPTIONS: Record<string, string> = {
  navigation: 'clean navigation bar with logo on left, menu links in center, and prominent CTA button on right',
  hero: 'bold hero section with large headline, supporting subheadline, primary CTA button, and hero image or illustration on the side',
  proof: 'social proof bar showing trusted company logos or trust badges in a horizontal row',
  problem: 'problem statement section with pain points illustrated with icons and short descriptions',
  solution: 'solution section showing how the product solves the problem with clear visuals',
  features: 'features grid with 3-4 key benefits, each with an icon, title and short description',
  cta: 'final call-to-action section with compelling headline and prominent button',
  pricing: 'pricing table with 2-3 plan options in card format',
  faq: 'FAQ section with accordion-style questions and answers',
  footer: 'footer with links, contact info and social media icons',
  testimonials: 'testimonial section with customer quotes, photos and company names',
};

// Page type specific additions
const PAGE_TYPE_CONTEXT: Record<string, string> = {
  landing: 'high-converting landing page focused on a single product or service, optimized for conversions',
  homepage: 'company homepage that showcases brand identity and provides navigation to key sections',
  product: 'product page highlighting features, benefits, pricing and purchase options',
};

// Style descriptions
const STYLE_DESCRIPTIONS: Record<string, string> = {
  modern: 'modern, clean design with subtle gradients, rounded corners, and ample white space',
  minimal: 'minimalist design with lots of white space, simple typography, and subtle accents',
  corporate: 'professional corporate design with structured layout and business-appropriate colors',
  creative: 'creative, bold design with unique layouts and eye-catching visual elements',
};

function generatePrompt(request: MockupRequest): string {
  const { pageType, missingSections, existingSections, style = 'modern' } = request;
  
  // Combine all sections (existing + missing) for the ideal structure
  const allSections = [...new Set([...existingSections, ...missingSections])];
  
  // Build detailed section descriptions
  const sectionDescriptions = allSections
    .filter(s => SECTION_DESCRIPTIONS[s])
    .map(s => `- ${s.toUpperCase()}: ${SECTION_DESCRIPTIONS[s]}`)
    .join('\n');
  
  // Page type context
  const pageContext = PAGE_TYPE_CONTEXT[pageType] || PAGE_TYPE_CONTEXT.landing;
  const styleDesc = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.modern;
  
  // Optimized prompt for Stable Diffusion / FLUX image generation
  const prompt = `A stunning high-fidelity website mockup design, ${pageContext}.

STYLE: ${styleDesc}, premium quality design, trending on Dribbble and Behance.

PAGE LAYOUT from top to bottom:
${sectionDescriptions}

VISUAL REQUIREMENTS:
- Full desktop browser view at 1440px width
- Clean white background with subtle gray accents
- Single accent color (purple or blue) for CTAs and highlights
- Modern sans-serif typography (like Inter or SF Pro)
- Realistic placeholder images and icons
- Soft shadows and rounded corners (8-16px radius)
- Generous white space and breathing room
- Professional SaaS/B2B aesthetic
- Figma or Sketch mockup quality
- Sharp, crisp UI elements
- No watermarks or logos

QUALITY: Ultra detailed, 8K quality, photorealistic UI mockup, professional web design, award-winning design`;

  return prompt;
}

// ============================================================================
// POLLINATIONS.AI GENERATION (WITH API KEY)
// ============================================================================

async function generateMockupImage(prompt: string): Promise<string> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  
  // Build the Pollinations.ai URL
  let imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1792&height=1024&seed=${seed}&nologo=true`;
  
  // Add token parameter if API key is available
  if (apiKey) {
    imageUrl += `&token=${apiKey}`;
  }
  
  // Fetch the image from Pollinations and convert to base64
  // This keeps the API key server-side and ensures the image is ready
  try {
    const response = await fetch(imageUrl, {
      headers: apiKey ? {
        'Authorization': `Bearer ${apiKey}`,
      } : {},
    });
    
    if (!response.ok) {
      throw new Error(`Pollinations API returned status ${response.status}`);
    }
    
    // Get the image as buffer and convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Return as data URL
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Pollinations fetch error:', error);
    throw new Error('Failed to generate image from Pollinations.ai');
  }
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: MockupRequest = await request.json();
    
    // Validate input
    if (!body.pageType) {
      return NextResponse.json(
        { error: 'pageType is required' },
        { status: 400 }
      );
    }
    
    // Check cache first
    const cached = getCachedResult(body);
    if (cached) {
      return NextResponse.json({
        ...cached,
        fromCache: true,
      });
    }
    
    // Generate prompt
    const prompt = generatePrompt(body);
    
    // Generate image URL with Pollinations.ai
    const imageUrl = await generateMockupImage(prompt);
    
    const result: MockupResult = {
      imageUrl,
      prompt,
      generatedAt: new Date().toISOString(),
    };
    
    // Cache the result
    setCachedResult(body, result);
    
    return NextResponse.json({
      ...result,
      fromCache: false,
    });
    
  } catch (error) {
    console.error('Mockup generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'mockup_generation_error', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
