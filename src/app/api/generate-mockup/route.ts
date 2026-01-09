/**
 * @file route.ts
 * @description API route for generating ideal wireframe mockups using Pollinations.ai (free, no API key required)
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

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

interface MockupRequest {
  pageType: 'landing' | 'homepage' | 'product';
  industry?: string;
  missingSections: string[];
  existingSections: string[];
  siteName?: string;
  style?: 'modern' | 'minimal' | 'corporate' | 'creative';
  styleAnalysis?: StyleAnalysis;
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
  const styleKey = request.styleAnalysis?.primaryColor || request.style || 'modern';
  return `mockup::${request.pageType}::${request.missingSections.sort().join(',')}::${styleKey}`;
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
  const { pageType, missingSections, existingSections, style = 'modern', styleAnalysis } = request;
  
  // Combine all sections (existing + missing) for the ideal structure
  const allSections = [...new Set([...existingSections, ...missingSections])];
  
  // Build detailed section descriptions
  const sectionDescriptions = allSections
    .filter(s => SECTION_DESCRIPTIONS[s])
    .map(s => `- ${s.toUpperCase()}: ${SECTION_DESCRIPTIONS[s]}`)
    .join('\n');
  
  // Page type context
  const pageContext = PAGE_TYPE_CONTEXT[pageType] || PAGE_TYPE_CONTEXT.landing;
  
  // Use detected style or fallback
  const detectedStyle = styleAnalysis?.styleType || style;
  const styleDesc = STYLE_DESCRIPTIONS[detectedStyle] || STYLE_DESCRIPTIONS.modern;
  
  // Build color and style info from analysis
  let colorInfo = '';
  let backgroundInfo = 'Clean white background with subtle gray accents';
  let accentInfo = 'Single accent color (purple or blue) for CTAs and highlights';
  let fontInfo = 'Modern sans-serif typography (like Inter or SF Pro)';
  let cornerInfo = 'Soft shadows and rounded corners (8-16px radius)';
  
  if (styleAnalysis) {
    // Primary and secondary colors
    if (styleAnalysis.primaryColor) {
      accentInfo = `Primary accent color: ${styleAnalysis.primaryColor} for CTAs, buttons, and highlights`;
      if (styleAnalysis.secondaryColor) {
        accentInfo += `, secondary color: ${styleAnalysis.secondaryColor} for accents`;
      }
    }
    
    // Background based on dark/light mode
    if (styleAnalysis.isDarkMode) {
      backgroundInfo = `Dark theme with background color ${styleAnalysis.backgroundColor || '#0F172A'} and text color ${styleAnalysis.textColor || '#F8FAFC'}`;
    } else {
      backgroundInfo = `Light theme with clean ${styleAnalysis.backgroundColor || 'white'} background and ${styleAnalysis.textColor || 'dark'} text`;
    }
    
    // Font style
    if (styleAnalysis.fontStyle === 'serif') {
      fontInfo = 'Elegant serif typography (like Playfair Display or Merriweather)';
    } else if (styleAnalysis.fontStyle === 'mixed') {
      fontInfo = 'Mixed typography with serif headings and sans-serif body text';
    }
    
    // Corners and gradients
    if (styleAnalysis.roundedCorners) {
      cornerInfo = 'Rounded corners (12-16px radius) on cards and buttons';
    }
    if (styleAnalysis.hasGradients) {
      cornerInfo += ', subtle gradients for depth';
    }
    
    // Build color palette description
    if (styleAnalysis.dominantColors && styleAnalysis.dominantColors.length > 0) {
      colorInfo = `\nCOLOR PALETTE (from original site): ${styleAnalysis.dominantColors.slice(0, 4).join(', ')}`;
    }
  }
  
  // Optimized prompt for Stable Diffusion / FLUX image generation
  const prompt = `A stunning high-fidelity website mockup design, ${pageContext}.

STYLE: ${styleDesc}, premium quality design, trending on Dribbble and Behance.
${colorInfo}

PAGE LAYOUT from top to bottom:
${sectionDescriptions}

VISUAL REQUIREMENTS:
- Full desktop browser view at 1440px width
- ${backgroundInfo}
- ${accentInfo}
- ${fontInfo}
- Realistic placeholder images and icons
- ${cornerInfo}
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
  
  // Build the Pollinations.ai URL with optimal parameters
  // - model=flux : Best quality model for UI/UX mockups
  // - enhance=true : Auto-enhance the prompt for better results
  // - nologo=true : Remove watermark
  const params = new URLSearchParams({
    width: '1792',
    height: '1024',
    seed: seed.toString(),
    nologo: 'true',
    model: 'flux',      // Best quality model
    enhance: 'true',    // Auto-enhance prompt
  });
  
  // Add token if API key is available
  if (apiKey) {
    params.append('token', apiKey);
  }
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
  
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
