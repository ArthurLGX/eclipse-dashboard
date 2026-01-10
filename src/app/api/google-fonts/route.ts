import { NextResponse } from 'next/server';

// Types pour l'API Google Fonts
interface GoogleFontVariant {
  family: string;
  variants: string[];
  subsets: string[];
  version: string;
  lastModified: string;
  files: Record<string, string>;
  category: string;
  kind: string;
  menu: string;
}

interface GoogleFontsResponse {
  kind: string;
  items: GoogleFontVariant[];
}

// Cache en mémoire pour éviter les appels répétés
let cachedFonts: GoogleFontVariant[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'popularity';
    const category = searchParams.get('category'); // serif, sans-serif, display, handwriting, monospace
    const limit = parseInt(searchParams.get('limit') || '200');

    // Vérifier le cache
    const now = Date.now();
    if (cachedFonts && (now - cacheTimestamp) < CACHE_DURATION) {
      let fonts = [...cachedFonts];
      
      // Filtrer par catégorie si demandé
      if (category) {
        fonts = fonts.filter(f => f.category === category);
      }
      
      // Limiter le nombre de résultats
      fonts = fonts.slice(0, limit);
      
      return NextResponse.json({
        success: true,
        fonts: formatFonts(fonts),
        fromCache: true,
        totalCount: cachedFonts.length,
      });
    }

    // Clé API Google Fonts
    const apiKey = process.env.GOOGLE_FONT_API_KEY;
    
    if (!apiKey) {
      console.error('GOOGLE_FONT_API_KEY not configured');
      // Retourner une liste statique de fallback
      return NextResponse.json({
        success: true,
        fonts: getFallbackFonts(),
        fromCache: false,
        totalCount: getFallbackFonts().length,
        warning: 'Using fallback fonts - API key not configured'
      });
    }

    // Appeler l'API Google Fonts
    const apiUrl = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=${sort}`;
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 86400 } // Revalidate every 24 hours
    });

    if (!response.ok) {
      throw new Error(`Google Fonts API error: ${response.status}`);
    }

    const data: GoogleFontsResponse = await response.json();
    
    // Mettre en cache
    cachedFonts = data.items;
    cacheTimestamp = now;

    let fonts = [...data.items];
    
    // Filtrer par catégorie si demandé
    if (category) {
      fonts = fonts.filter(f => f.category === category);
    }
    
    // Limiter le nombre de résultats
    fonts = fonts.slice(0, limit);

    return NextResponse.json({
      success: true,
      fonts: formatFonts(fonts),
      fromCache: false,
      totalCount: data.items.length,
    });

  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    
    // Retourner les fonts en cache si disponibles, sinon fallback
    if (cachedFonts) {
      return NextResponse.json({
        success: true,
        fonts: formatFonts(cachedFonts.slice(0, 200)),
        fromCache: true,
        totalCount: cachedFonts.length,
        warning: 'Using cached fonts due to API error'
      });
    }
    
    return NextResponse.json({
      success: true,
      fonts: getFallbackFonts(),
      fromCache: false,
      totalCount: getFallbackFonts().length,
      warning: 'Using fallback fonts due to API error'
    });
  }
}

// Formater les polices pour le frontend
function formatFonts(fonts: GoogleFontVariant[]) {
  return fonts.map(font => ({
    id: font.family.toLowerCase().replace(/\s+/g, '-'),
    name: font.family,
    family: `'${font.family}', ${getCategoryFallback(font.category)}`,
    googleName: font.family.replace(/\s+/g, '+'),
    category: font.category,
    variants: font.variants,
    subsets: font.subsets,
    // Déterminer les graisses disponibles
    weights: getAvailableWeights(font.variants),
  }));
}

function getCategoryFallback(category: string): string {
  switch (category) {
    case 'serif': return 'serif';
    case 'sans-serif': return 'sans-serif';
    case 'display': return 'sans-serif';
    case 'handwriting': return 'cursive';
    case 'monospace': return 'monospace';
    default: return 'sans-serif';
  }
}

function getAvailableWeights(variants: string[]): number[] {
  const weights = new Set<number>();
  
  variants.forEach(variant => {
    if (variant === 'regular' || variant === 'italic') {
      weights.add(400);
    } else {
      const match = variant.match(/^(\d+)/);
      if (match) {
        weights.add(parseInt(match[1]));
      }
    }
  });
  
  return Array.from(weights).sort((a, b) => a - b);
}

// Liste de fallback si l'API n'est pas disponible
function getFallbackFonts() {
  const fallbackList = [
    // Sans-serif populaires
    { family: 'Inter', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'Roboto', category: 'sans-serif', variants: ['100', '300', 'regular', '500', '700', '900'] },
    { family: 'Open Sans', category: 'sans-serif', variants: ['300', 'regular', '500', '600', '700', '800'] },
    { family: 'Montserrat', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'Lato', category: 'sans-serif', variants: ['100', '300', 'regular', '700', '900'] },
    { family: 'Poppins', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'Manrope', category: 'sans-serif', variants: ['200', '300', 'regular', '500', '600', '700', '800'] },
    { family: 'Nunito', category: 'sans-serif', variants: ['200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'Work Sans', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'DM Sans', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'Space Grotesk', category: 'sans-serif', variants: ['300', 'regular', '500', '600', '700'] },
    { family: 'Outfit', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'] },
    { family: 'Plus Jakarta Sans', category: 'sans-serif', variants: ['200', '300', 'regular', '500', '600', '700', '800'] },
    { family: 'Sora', category: 'sans-serif', variants: ['100', '200', '300', 'regular', '500', '600', '700', '800'] },
    { family: 'Figtree', category: 'sans-serif', variants: ['300', 'regular', '500', '600', '700', '800', '900'] },
    // Serif populaires
    { family: 'Playfair Display', category: 'serif', variants: ['regular', '500', '600', '700', '800', '900'] },
    { family: 'Cormorant', category: 'serif', variants: ['300', 'regular', '500', '600', '700'] },
    { family: 'Lora', category: 'serif', variants: ['regular', '500', '600', '700'] },
    { family: 'Merriweather', category: 'serif', variants: ['300', 'regular', '700', '900'] },
    { family: 'Source Serif 4', category: 'serif', variants: ['200', '300', 'regular', '500', '600', '700', '800', '900'] },
    // Display
    { family: 'Bebas Neue', category: 'display', variants: ['regular'] },
    { family: 'Oswald', category: 'display', variants: ['200', '300', 'regular', '500', '600', '700'] },
    { family: 'Anton', category: 'display', variants: ['regular'] },
    { family: 'Abril Fatface', category: 'display', variants: ['regular'] },
    // Handwriting
    { family: 'Dancing Script', category: 'handwriting', variants: ['regular', '500', '600', '700'] },
    { family: 'Pacifico', category: 'handwriting', variants: ['regular'] },
    { family: 'Caveat', category: 'handwriting', variants: ['regular', '500', '600', '700'] },
    { family: 'Great Vibes', category: 'handwriting', variants: ['regular'] },
  ];

  return fallbackList.map(font => ({
    id: font.family.toLowerCase().replace(/\s+/g, '-'),
    name: font.family,
    family: `'${font.family}', ${getCategoryFallback(font.category)}`,
    googleName: font.family.replace(/\s+/g, '+'),
    category: font.category,
    variants: font.variants,
    subsets: ['latin'],
    weights: getAvailableWeights(font.variants),
  }));
}

