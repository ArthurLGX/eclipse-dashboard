'use client';

import { useState, useEffect, useMemo } from 'react';

// Types for Google Fonts
export interface GoogleFontItem {
  id: string;
  name: string;
  family: string;
  googleName: string;
  category: string;
  variants?: string[];
  weights?: number[];
}

export interface GoogleFontsCategories {
  'sans-serif': GoogleFontItem[];
  serif: GoogleFontItem[];
  display: GoogleFontItem[];
  handwriting: GoogleFontItem[];
  monospace: GoogleFontItem[];
}

// Simple font format (for backward compatibility with existing components)
export interface SimpleFontOption {
  name: string;
  family: string;
  value?: string; // For select inputs
  label?: string; // For display
  category?: string;
}

// Default fallback fonts
const DEFAULT_FONTS: SimpleFontOption[] = [
  { name: 'Inter', family: 'Inter, sans-serif', value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { name: 'Roboto', family: 'Roboto, sans-serif', value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { name: 'Open Sans', family: "'Open Sans', sans-serif", value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { name: 'Lato', family: 'Lato, sans-serif', value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif', value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { name: 'Poppins', family: 'Poppins, sans-serif', value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { name: 'Nunito', family: 'Nunito, sans-serif', value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  { name: 'Raleway', family: 'Raleway, sans-serif', value: 'Raleway', label: 'Raleway', category: 'Sans-serif' },
  { name: 'Work Sans', family: "'Work Sans', sans-serif", value: 'Work Sans', label: 'Work Sans', category: 'Sans-serif' },
  { name: 'DM Sans', family: "'DM Sans', sans-serif", value: 'DM Sans', label: 'DM Sans', category: 'Sans-serif' },
  { name: 'Manrope', family: 'Manrope, sans-serif', value: 'Manrope', label: 'Manrope', category: 'Sans-serif' },
  { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans-serif' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { name: 'Merriweather', family: 'Merriweather, serif', value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { name: 'Lora', family: 'Lora, serif', value: 'Lora', label: 'Lora', category: 'Serif' },
];

// Cache for fonts (shared across all hook instances)
let cachedFonts: GoogleFontItem[] | null = null;
let cachePromise: Promise<GoogleFontItem[]> | null = null;

async function fetchGoogleFonts(): Promise<GoogleFontItem[]> {
  // Return cached if available
  if (cachedFonts) return cachedFonts;
  
  // Return existing promise if fetch is in progress
  if (cachePromise) return cachePromise;
  
  // Start new fetch
  cachePromise = (async () => {
    try {
      const response = await fetch('/api/google-fonts?sort=popularity&limit=300');
      
      if (!response.ok) {
        throw new Error('Failed to fetch fonts');
      }
      
      const data = await response.json();
      
      if (data.fonts && data.fonts.length > 0) {
        cachedFonts = data.fonts;
        return data.fonts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching Google Fonts:', error);
      return [];
    }
  })();
  
  return cachePromise;
}

export function useGoogleFonts() {
  const [fonts, setFonts] = useState<GoogleFontItem[]>(cachedFonts || []);
  const [loading, setLoading] = useState(!cachedFonts);

  useEffect(() => {
    if (cachedFonts) {
      setFonts(cachedFonts);
      setLoading(false);
      return;
    }

    fetchGoogleFonts().then(fetchedFonts => {
      setFonts(fetchedFonts);
      setLoading(false);
    });
  }, []);

  // Organize fonts by category
  const fontsByCategory = useMemo((): GoogleFontsCategories => {
    const categories: GoogleFontsCategories = {
      'sans-serif': [],
      serif: [],
      display: [],
      handwriting: [],
      monospace: [],
    };

    fonts.forEach(font => {
      const category = font.category as keyof GoogleFontsCategories;
      if (categories[category]) {
        categories[category].push(font);
      }
    });

    return categories;
  }, [fonts]);

  // Convert to simple format (for existing components that expect { name, family })
  const simpleFonts = useMemo((): SimpleFontOption[] => {
    if (fonts.length === 0) return DEFAULT_FONTS;
    
    return fonts.map(font => ({
      name: font.name,
      family: font.family,
      value: font.name,
      label: font.name,
      category: getCategoryLabel(font.category),
    }));
  }, [fonts]);

  // Get fonts organized by display category (for selects with optgroups)
  const fontsByDisplayCategory = useMemo(() => {
    const categories: Record<string, SimpleFontOption[]> = {
      'Sans-serif': [],
      'Serif': [],
      'Display': [],
      'Handwriting': [],
      'Monospace': [],
    };

    simpleFonts.forEach(font => {
      const cat = font.category || 'Sans-serif';
      if (categories[cat]) {
        categories[cat].push(font);
      }
    });

    return categories;
  }, [simpleFonts]);

  return {
    fonts,              // Full GoogleFontItem[]
    fontsByCategory,    // Organized by API category
    simpleFonts,        // Simple { name, family }[] format
    fontsByDisplayCategory, // For optgroup selects
    loading,
    totalCount: fonts.length,
  };
}

// Helper to get display category label
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'sans-serif': return 'Sans-serif';
    case 'serif': return 'Serif';
    case 'display': return 'Display';
    case 'handwriting': return 'Handwriting';
    case 'monospace': return 'Monospace';
    default: return 'Sans-serif';
  }
}

// Hook to preload fonts in the document head
export function usePreloadFonts(fontNames: string[]) {
  useEffect(() => {
    fontNames.forEach(fontName => {
      if (!fontName) return;
      
      const googleName = fontName.replace(/\s+/g, '+');
      const linkId = `google-font-${googleName}`;
      
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${googleName}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [fontNames]);
}

// Utility to get Google Font URL
export function getGoogleFontUrl(fontName: string): string {
  if (!fontName) return '';
  const googleName = fontName.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${googleName}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
}

// Check if a font needs Google Fonts loading (vs web-safe)
export function needsGoogleFontLoad(fontFamily: string): boolean {
  const webSafeFonts = [
    'Arial', 'Helvetica', 'Georgia', 'Verdana', 
    'Times New Roman', 'Tahoma', 'Trebuchet MS',
    'Courier New', 'Courier', 'sans-serif', 'serif', 'monospace'
  ];
  return !webSafeFonts.some(wsf => fontFamily.toLowerCase().includes(wsf.toLowerCase()));
}

