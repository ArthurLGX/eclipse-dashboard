'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalLenis } from '@/app/context/LenisContext';
import Image from 'next/image';
import {
  IconPlus,
  IconX,
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconPhoto,
  IconVideo,
  IconLink,
  IconShare,
  IconCopy,
  IconCheck,
  IconSettings,
  IconPalette,
  IconTypography,
  IconSparkles,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconUpload,
  IconWorld,
  IconLock,
  IconMail,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandDribbble,
  IconBold,
  IconLoader2,
  IconCloudUpload,
  IconDownload,
  IconSearch,
} from '@tabler/icons-react';
import { uploadImage } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
}

interface PortfolioProject {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  descriptionHtml?: string;
  category: string;
  tags: string[];
  clientName?: string;
  projectUrl?: string;
  media: MediaItem[];
  coverIndex: number;
  date: string;
  sortOrder: number;
}

interface PortfolioSettings {
  // Branding
  portfolioName: string;
  tagline: string;
  // Typography - Title
  titleFont: string;
  titleFontWeight: number;
  titleColor: string;
  titleSize: string;
  titleLetterSpacing: string;
  titleTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Typography - Subtitle
  subtitleFont: string;
  subtitleFontWeight: number;
  subtitleColor: string;
  subtitleSize: string;
  // Typography - Project Cards
  projectTitleFont: string;
  projectTitleFontWeight: number;
  projectTitleColor: string;
  projectSubtitleColor: string;
  // Custom Font
  customFontName?: string;
  customFontUrl?: string;
  // Colors
  backgroundColor: string;
  accentColor: string;
  // Layout
  columns: 2 | 3 | 4;
  gap: 'tight' | 'normal' | 'wide';
  imageRatio: 'square' | 'landscape' | 'portrait' | 'auto';
  // Animations
  enableAnimations: boolean;
  animationType: 'fade' | 'slide' | 'scale' | 'none';
  // Visibility
  isPublic: boolean;
  shareSlug: string;
  // Social Links
  showSocialLinks: boolean;
  instagramUrl?: string;
  linkedinUrl?: string;
  dribbbleUrl?: string;
  emailAddress?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Type for Google Font from API
interface GoogleFontItem {
  id: string;
  name: string;
  family: string;
  googleName: string;
  category: string;
  variants?: string[];
  weights?: number[];
}

// Organized fonts by category (loaded from API)
interface GoogleFontsCategories {
  'sans-serif': GoogleFontItem[];
  serif: GoogleFontItem[];
  display: GoogleFontItem[];
  handwriting: GoogleFontItem[];
  monospace: GoogleFontItem[];
}

// Default fallback fonts (used while API loads or if it fails)
const DEFAULT_GOOGLE_FONTS: GoogleFontsCategories = {
  'sans-serif': [
    { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", googleName: 'Inter', category: 'sans-serif' },
    { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif", googleName: 'Roboto', category: 'sans-serif' },
    { id: 'open-sans', name: 'Open Sans', family: "'Open Sans', sans-serif", googleName: 'Open+Sans', category: 'sans-serif' },
    { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", googleName: 'Montserrat', category: 'sans-serif' },
    { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif", googleName: 'Poppins', category: 'sans-serif' },
  ],
  serif: [
    { id: 'playfair-display', name: 'Playfair Display', family: "'Playfair Display', serif", googleName: 'Playfair+Display', category: 'serif' },
    { id: 'lora', name: 'Lora', family: "'Lora', serif", googleName: 'Lora', category: 'serif' },
    { id: 'merriweather', name: 'Merriweather', family: "'Merriweather', serif", googleName: 'Merriweather', category: 'serif' },
  ],
  display: [
    { id: 'bebas-neue', name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", googleName: 'Bebas+Neue', category: 'display' },
    { id: 'oswald', name: 'Oswald', family: "'Oswald', sans-serif", googleName: 'Oswald', category: 'display' },
  ],
  handwriting: [
    { id: 'dancing-script', name: 'Dancing Script', family: "'Dancing Script', cursive", googleName: 'Dancing+Script', category: 'handwriting' },
    { id: 'pacifico', name: 'Pacifico', family: "'Pacifico', cursive", googleName: 'Pacifico', category: 'handwriting' },
  ],
  monospace: [
    { id: 'fira-code', name: 'Fira Code', family: "'Fira Code', monospace", googleName: 'Fira+Code', category: 'monospace' },
    { id: 'jetbrains-mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", googleName: 'JetBrains+Mono', category: 'monospace' },
  ],
};

// Flatten fonts for easy access (will be updated with API data)
const getDefaultAllFonts = (): GoogleFontItem[] => [
  ...DEFAULT_GOOGLE_FONTS['sans-serif'],
  ...DEFAULT_GOOGLE_FONTS.serif,
  ...DEFAULT_GOOGLE_FONTS.display,
  ...DEFAULT_GOOGLE_FONTS.handwriting,
  ...DEFAULT_GOOGLE_FONTS.monospace,
];

// Font weights available
const FONT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'Extra Light' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
];

// Font sizes
const FONT_SIZES = [
  { value: '0.75rem', label: 'XS' },
  { value: '0.875rem', label: 'S' },
  { value: '1rem', label: 'M' },
  { value: '1.125rem', label: 'L' },
  { value: '1.25rem', label: 'XL' },
  { value: '1.5rem', label: '2XL' },
  { value: '1.875rem', label: '3XL' },
  { value: '2.25rem', label: '4XL' },
];

// Letter spacing options
const LETTER_SPACINGS = [
  { value: '-0.05em', label: 'Très serré' },
  { value: '-0.025em', label: 'Serré' },
  { value: '0', label: 'Normal' },
  { value: '0.025em', label: 'Espacé' },
  { value: '0.05em', label: 'Très espacé' },
  { value: '0.1em', label: 'Large' },
  { value: '0.2em', label: 'Très large' },
  { value: '0.3em', label: 'Ultra large' },
];

const CATEGORIES = [
  { id: 'all', label: 'Tous', labelEn: 'All' },
  { id: 'branding', label: 'Branding', labelEn: 'Branding' },
  { id: 'web', label: 'Web Design', labelEn: 'Web Design' },
  { id: 'photography', label: 'Photographie', labelEn: 'Photography' },
  { id: 'video', label: 'Vidéo', labelEn: 'Video' },
  { id: 'illustration', label: 'Illustration', labelEn: 'Illustration' },
  { id: 'other', label: 'Autre', labelEn: 'Other' },
];

const DEFAULT_SETTINGS: PortfolioSettings = {
  // Branding
  portfolioName: 'The portfolio',
  tagline: 'Digital + print.\nConcept to production.',
  // Typography - Title
  titleFont: 'playfair-display',
  titleFontWeight: 700,
  titleColor: '',  // Empty = use theme
  titleSize: '5rem',
  titleLetterSpacing: '-0.02em',
  titleTransform: 'none',
  // Typography - Subtitle
  subtitleFont: 'inter',
  subtitleFontWeight: 400,
  subtitleColor: '',  // Empty = use theme
  subtitleSize: '1rem',
  // Typography - Project Cards
  projectTitleFont: 'inter',
  projectTitleFontWeight: 400,
  projectTitleColor: '',  // Empty = use theme
  projectSubtitleColor: '',  // Empty = use theme
  // Custom Font
  customFontName: '',
  customFontUrl: '',
  // Colors
  backgroundColor: '',  // Empty = use theme (transparent)
  accentColor: '',  // Empty = use theme
  // Layout
  columns: 3,
  gap: 'normal',
  imageRatio: 'square',
  // Animations
  enableAnimations: true,
  animationType: 'fade',
  // Visibility
  isPublic: false,
  shareSlug: `portfolio-${Date.now()}`,
  // Social Links
  showSocialLinks: true,
  instagramUrl: '',
  linkedinUrl: '',
  dribbbleUrl: '',
  emailAddress: '',
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_PROJECTS: PortfolioProject[] = [
  {
    id: '1',
    title: 'Campaign',
    subtitle: 'Campaign',
    description: 'Creative campaign showcasing brand identity and visual storytelling.',
    category: 'design',
    tags: ['Campaign', 'Creative'],
    media: [
      { id: 'm1', type: 'image', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
      { id: 'm2', type: 'image', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-01-15',
    sortOrder: 0,
  },
  {
    id: '2',
    title: '360° Campaign',
    subtitle: '360° Campaign',
    description: 'Full-scope creative campaign including print, digital, and experiential elements.',
    category: 'design',
    tags: ['Branding', '360°'],
    media: [
      { id: 'm3', type: 'image', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-02-20',
    sortOrder: 1,
  },
  {
    id: '3',
    title: 'Branding + identity',
    subtitle: 'Branding + identity',
    description: 'Complete brand identity design including logo, typography, and visual system.',
    category: 'design',
    tags: ['Branding', 'Identity'],
    media: [
      { id: 'm4', type: 'image', url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-03-10',
    sortOrder: 2,
  },
  {
    id: '4',
    title: 'Video + digital',
    subtitle: 'Video + digital',
    description: 'Digital content creation including video production and motion graphics.',
    category: 'video',
    tags: ['Video', 'Digital'],
    clientName: 'Tech Client',
    media: [
      { id: 'm5', type: 'image', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-04-05',
    sortOrder: 3,
  },
  {
    id: '5',
    title: 'Environments',
    subtitle: 'Environments',
    description: 'Environmental design and spatial branding for retail and hospitality.',
    category: 'photography',
    tags: ['Environment', 'Spatial'],
    media: [
      { id: 'm6', type: 'image', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-05-12',
    sortOrder: 4,
  },
  {
    id: '6',
    title: 'Editorial',
    subtitle: 'Editorial',
    description: 'Editorial design and art direction for print and digital publications.',
    category: 'design',
    tags: ['Editorial', 'Print'],
    media: [
      { id: 'm7', type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-06-18',
    sortOrder: 5,
  },
  {
    id: '7',
    title: 'Packaging',
    subtitle: 'Packaging',
    description: 'Product packaging design that stands out on shelves.',
    category: 'design',
    tags: ['Packaging', 'Product'],
    media: [
      { id: 'm8', type: 'image', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-07-01',
    sortOrder: 6,
  },
  {
    id: '8',
    title: 'Magazine',
    subtitle: 'Magazine',
    description: 'Magazine layout and editorial design.',
    category: 'design',
    tags: ['Magazine', 'Print'],
    media: [
      { id: 'm9', type: 'image', url: 'https://images.unsplash.com/photo-1585241645927-c7a8e5840c42?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-07-15',
    sortOrder: 7,
  },
  {
    id: '9',
    title: 'Branding + packaging',
    subtitle: 'Branding + packaging',
    description: 'Integrated branding and packaging solutions.',
    category: 'design',
    tags: ['Branding', 'Packaging'],
    media: [
      { id: 'm10', type: 'image', url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600&q=80' },
    ],
    coverIndex: 0,
    date: '2024-08-01',
    sortOrder: 8,
  },
];

// ============================================================================
// SETTINGS PANEL COMPONENT
// ============================================================================

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PortfolioSettings;
  onSettingsChange: (settings: PortfolioSettings) => void;
  googleFonts: GoogleFontsCategories;
  fontsLoading?: boolean;
  allFonts: GoogleFontItem[];
}

function SettingsPanel({ isOpen, onClose, settings, onSettingsChange, googleFonts, fontsLoading, allFonts }: SettingsPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'branding' | 'typography' | 'layout' | 'share'>('branding');
  const [fontSearch, setFontSearch] = useState('');

  // Lock Lenis scroll when panel is open
  useModalLenis(isOpen);

  const updateSetting = <K extends keyof PortfolioSettings>(key: K, value: PortfolioSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  // Filter fonts by search query
  const filterFonts = (fonts: GoogleFontItem[]) => {
    if (!fontSearch) return fonts;
    return fonts.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()));
  };

  // Render font selector with categories and search
  const renderFontSelector = (value: string, onChange: (fontId: string) => void, label: string) => (
    <div>
      <label className="block !text-sm font-medium !text-secondary mb-2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
        >
          {settings.customFontName && settings.customFontUrl && (
            <optgroup label="🎨 Police personnalisée">
              <option value="custom">{settings.customFontName}</option>
            </optgroup>
          )}
          <optgroup label="Sans Serif">
            {filterFonts(googleFonts['sans-serif']).map((font) => (
              <option key={font.id} value={font.id}>{font.name}</option>
            ))}
          </optgroup>
          <optgroup label="Serif">
            {filterFonts(googleFonts.serif).map((font) => (
              <option key={font.id} value={font.id}>{font.name}</option>
            ))}
          </optgroup>
          <optgroup label="Display">
            {filterFonts(googleFonts.display).map((font) => (
              <option key={font.id} value={font.id}>{font.name}</option>
            ))}
          </optgroup>
          <optgroup label="Handwriting">
            {filterFonts(googleFonts.handwriting).map((font) => (
              <option key={font.id} value={font.id}>{font.name}</option>
            ))}
          </optgroup>
          <optgroup label="Monospace">
            {filterFonts(googleFonts.monospace).map((font) => (
              <option key={font.id} value={font.id}>{font.name}</option>
            ))}
          </optgroup>
        </select>
        {fontsLoading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <IconLoader2 size={16} className="animate-spin !text-muted" />
          </div>
        )}
      </div>
    </div>
  );

  // Render color picker with reset button
  const renderColorPicker = (value: string, onChange: (color: string) => void, label: string) => (
    <div>
      <label className="block !text-sm font-medium !text-secondary mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#7C3AED'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10  border border-input cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Thème par défaut"
          className="flex-1 px-3 py-2 bg-input border border-input  !text-primary !text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 py-2 !text-xs !text-muted hover:!text-primary border border-default  hover:bg-hover transition-colors"
            title="Utiliser le thème par défaut"
          >
            Reset
          </button>
        )}
      </div>
      {!value && (
        <p className="!text-xs !text-muted mt-1">✓ Utilise la couleur du thème</p>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Modal from top */}
      <motion.div
        initial={{ y: '-100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '-100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed left-4 right-4 top-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl bg-card border border-default z-[101] shadow-2xl  flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-card border-b border-default p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold !text-primary flex items-center gap-2">
            <IconSettings size={15} />
            {t('portfolio_settings')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-hover  transition-colors">
            <IconX size={15} className="text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-default">
          {[
            { id: 'branding', icon: IconPalette, label: t('portfolio_tab_branding') },
            { id: 'typography', icon: IconTypography, label: t('portfolio_tab_typography') },
            { id: 'layout', icon: IconSparkles, label: t('portfolio_tab_layout') },
            { id: 'share', icon: IconShare, label: t('portfolio_tab_share') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 px-4 !text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'text-accent border-b-2 border-accent bg-accent-light'
                  : 'text-muted hover:!text-primary hover:bg-hover'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 scrollbar-visible"
          style={{ overscrollBehavior: 'contain' }}
        >
        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <>
            {/* Portfolio Name */}
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_name')}
              </label>
              <input
                type="text"
                value={settings.portfolioName}
                onChange={(e) => updateSetting('portfolioName', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_tagline')}
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => updateSetting('tagline', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Background Color */}
            {renderColorPicker(settings.backgroundColor, (c) => updateSetting('backgroundColor', c), t('portfolio_bg_color'))}

            {/* Accent Color */}
            {renderColorPicker(settings.accentColor, (c) => updateSetting('accentColor', c), t('portfolio_accent_color'))}

            {/* Custom Font Import */}
            <div className="border-t border-default pt-4">
              <h4 className="text-sm font-semibold !text-primary mb-3 flex items-center gap-2">
                <IconCloudUpload size={16} />
                {t('portfolio_import_custom_font')}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">
                    Nom de la police
                  </label>
                  <input
                    type="text"
                    value={settings.customFontName || ''}
                    onChange={(e) => updateSetting('customFontName', e.target.value)}
                    placeholder="Ma Police"
                    className="w-full px-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">
                    URL du fichier (Google Fonts ou @font-face)
                  </label>
                  <input
                    type="text"
                    value={settings.customFontUrl || ''}
                    onChange={(e) => updateSetting('customFontUrl', e.target.value)}
                    placeholder="https://fonts.googleapis.com/css2?family=..."
                    className="w-full px-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <p className="!text-xs !text-muted">
                  💡 Collez l&apos;URL d&apos;import Google Fonts ou le lien vers un fichier .woff2
                </p>
              </div>
            </div>

            {/* Animations */}
            <div className="border-t border-default pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAnimations}
                  onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                  className="w-5 h-5 rounded border-input bg-input !text-accent focus:ring-accent"
                />
                <span className="text-sm !text-secondary flex items-center gap-2">
                  <IconSparkles size={16} />
                  {t('portfolio_enable_animations')}
                </span>
              </label>
              
              {settings.enableAnimations && (
                <div className="mt-3">
                  <select
                    value={settings.animationType}
                    onChange={(e) => updateSetting('animationType', e.target.value as PortfolioSettings['animationType'])}
                    className="w-full px-3 py-2 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="scale">Scale</option>
                  </select>
                </div>
              )}
            </div>
          </>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <>
            {/* Font Search */}
            <div className="bg-muted/30  p-3 border border-default">
              <label className="block !text-xs font-medium !text-secondary mb-2">{t('portfolio_search_font')}</label>
              <div className="relative">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 !text-muted" />
                <input
                  type="text"
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  placeholder={t('portfolio_search_font_placeholder')}
                  className="w-full !pl-9 !pr-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                />
                {fontSearch && (
                  <button
                    onClick={() => setFontSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 !text-muted hover:!text-primary"
                  >
                    <IconX size={14} />
                  </button>
                )}
              </div>
              <p className="!text-xs !text-muted mt-2">
                {fontsLoading ? t('portfolio_loading_fonts') : `${allFonts.length} ${t('portfolio_fonts_available')}`}
              </p>
            </div>

            {/* Title Typography */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold !text-primary flex items-center gap-2 border-b border-default pb-2">
                <IconBold size={16} />
                {t('portfolio_title_typography')}
              </h4>
              
              {renderFontSelector(settings.titleFont, (f) => updateSetting('titleFont', f), t('portfolio_font'))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_font_weight')}</label>
                  <select
                    value={settings.titleFontWeight}
                    onChange={(e) => updateSetting('titleFontWeight', Number(e.target.value))}
                    className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  >
                    {FONT_WEIGHTS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_font_size')}</label>
                  <select
                    value={settings.titleSize}
                    onChange={(e) => updateSetting('titleSize', e.target.value)}
                    className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  >
                    {FONT_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_letter_spacing')}</label>
                  <select
                    value={settings.titleLetterSpacing}
                    onChange={(e) => updateSetting('titleLetterSpacing', e.target.value)}
                    className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  >
                    {LETTER_SPACINGS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_case')}</label>
                  <select
                    value={settings.titleTransform}
                    onChange={(e) => updateSetting('titleTransform', e.target.value as PortfolioSettings['titleTransform'])}
                    className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="none">{t('portfolio_case_normal')}</option>
                    <option value="uppercase">{t('portfolio_case_uppercase')}</option>
                    <option value="lowercase">{t('portfolio_case_lowercase')}</option>
                    <option value="capitalize">{t('portfolio_case_capitalize')}</option>
                  </select>
                </div>
              </div>

              {renderColorPicker(settings.titleColor, (c) => updateSetting('titleColor', c), t('portfolio_title_color_label'))}
            </div>

            {/* Subtitle Typography */}
            <div className="space-y-4 border-t border-default pt-4">
              <h4 className="text-sm font-semibold !text-primary flex items-center gap-2 border-b border-default pb-2">
                <IconBold size={16} />
                {t('portfolio_subtitle_typography')}
              </h4>
              
              {renderFontSelector(settings.subtitleFont, (f) => updateSetting('subtitleFont', f), t('portfolio_font'))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_font_weight')}</label>
                  <select
                    value={settings.subtitleFontWeight}
                    onChange={(e) => updateSetting('subtitleFontWeight', Number(e.target.value))}
                    className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  >
                    {FONT_WEIGHTS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_font_size')}</label>
                  <select
                    value={settings.subtitleSize}
                    onChange={(e) => updateSetting('subtitleSize', e.target.value)}
                    className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                  >
                    {FONT_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {renderColorPicker(settings.subtitleColor, (c) => updateSetting('subtitleColor', c), t('portfolio_subtitle_color_label'))}
            </div>

            {/* Project Card Typography */}
            <div className="space-y-4 border-t border-default pt-4">
              <h4 className="text-sm font-semibold !text-primary flex items-center gap-2 border-b border-default pb-2">
                <IconBold size={16} />
                {t('portfolio_card_typography')}
              </h4>
              
              {renderFontSelector(settings.projectTitleFont, (f) => updateSetting('projectTitleFont', f), t('portfolio_font'))}

              <div>
                <label className="block !text-xs font-medium !text-secondary mb-1">{t('portfolio_font_weight')}</label>
                <select
                  value={settings.projectTitleFontWeight}
                  onChange={(e) => updateSetting('projectTitleFontWeight', Number(e.target.value))}
                  className="w-full px-2 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                >
                  {FONT_WEIGHTS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {renderColorPicker(settings.projectTitleColor, (c) => updateSetting('projectTitleColor', c), t('portfolio_project_title_color'))}
                {renderColorPicker(settings.projectSubtitleColor, (c) => updateSetting('projectSubtitleColor', c), t('portfolio_project_subtitle_color'))}
              </div>
            </div>
          </>
        )}

        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <>
            {/* Columns */}
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_columns')}
              </label>
              <div className="flex gap-2">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateSetting('columns', num as 2 | 3 | 4)}
                    className={`flex-1 py-2  !text-sm font-medium transition-colors ${
                      settings.columns === num
                        ? 'bg-accent !text-accent'
                        : 'bg-muted !text-secondary hover:bg-hover'
                    }`}
                  >
                    {num} {t('portfolio_columns_label')}
                  </button>
                ))}
              </div>
            </div>

            {/* Gap */}
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_gap')}
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'tight', label: t('portfolio_gap_tight') },
                  { id: 'normal', label: t('portfolio_gap_normal') },
                  { id: 'wide', label: t('portfolio_gap_wide') },
                ].map((gap) => (
                  <button
                    key={gap.id}
                    onClick={() => updateSetting('gap', gap.id as PortfolioSettings['gap'])}
                    className={`flex-1 py-2  !text-sm font-medium transition-colors ${
                      settings.gap === gap.id
                        ? 'bg-accent !text-accent'
                        : 'bg-muted !text-secondary hover:bg-hover'
                    }`}
                  >
                    {gap.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Ratio */}
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_image_ratio')}
              </label>
              <select
                value={settings.imageRatio}
                onChange={(e) => updateSetting('imageRatio', e.target.value as PortfolioSettings['imageRatio'])}
                className="w-full px-3 py-2 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
              >
                <option value="auto">{t('portfolio_ratio_auto')}</option>
                <option value="square">{t('portfolio_ratio_square')}</option>
                <option value="landscape">{t('portfolio_ratio_landscape')}</option>
                <option value="portrait">{t('portfolio_ratio_portrait')}</option>
              </select>
            </div>
          </>
        )}

        {/* Share Tab */}
        {activeTab === 'share' && (
          <>
            {/* Visibility */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isPublic}
                  onChange={(e) => updateSetting('isPublic', e.target.checked)}
                  className="w-5 h-5 rounded border-input bg-input !text-accent focus:ring-accent"
                />
                <span className="text-sm !text-secondary flex items-center gap-2">
                  {settings.isPublic ? <IconWorld size={16} /> : <IconLock size={16} />}
                  {t('portfolio_public')}
                </span>
              </label>
              <p className="!text-xs !text-muted mt-1 ml-8">
                {settings.isPublic
                  ? t('portfolio_public_desc')
                  : t('portfolio_private_desc')}
              </p>
            </div>

            {settings.isPublic && (
              <>
                {/* Share Link */}
                <div>
                  <label className="block !text-sm font-medium !text-secondary mb-2">
                    {t('portfolio_share_link')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/${settings.shareSlug || 'mon-portfolio'}`}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted border border-input  !text-primary !text-sm"
                    />
                    <button className="px-3 py-2 bg-accent !text-accent  hover:bg-accent transition-colors">
                      <IconCopy size={18} />
                    </button>
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className="block !text-sm font-medium !text-secondary mb-2">
                    {t('portfolio_custom_slug')}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted !text-sm">/portfolio/</span>
                    <input
                      type="text"
                      value={settings.shareSlug}
                      onChange={(e) => updateSetting('shareSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="mon-portfolio"
                      className="flex-1 px-3 py-2 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={settings.showSocialLinks}
                      onChange={(e) => updateSetting('showSocialLinks', e.target.checked)}
                      className="w-5 h-5 rounded border-input bg-input !text-accent focus:ring-accent"
                    />
                    <span className="text-sm !text-secondary">
                      {t('portfolio_show_social')}
                    </span>
                  </label>

                  {settings.showSocialLinks && (
                    <div className="space-y-3 ml-8">
                      <div className="flex items-center gap-2">
                        <IconBrandInstagram size={18} className="text-muted" />
                        <input
                          type="text"
                          value={settings.instagramUrl}
                          onChange={(e) => updateSetting('instagramUrl', e.target.value)}
                          placeholder="URL Instagram"
                          className="flex-1 px-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBrandLinkedin size={18} className="text-muted" />
                        <input
                          type="text"
                          value={settings.linkedinUrl}
                          onChange={(e) => updateSetting('linkedinUrl', e.target.value)}
                          placeholder="URL LinkedIn"
                          className="flex-1 px-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBrandDribbble size={18} className="text-muted" />
                        <input
                          type="text"
                          value={settings.dribbbleUrl}
                          onChange={(e) => updateSetting('dribbbleUrl', e.target.value)}
                          placeholder="URL Dribbble"
                          className="flex-1 px-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <IconMail size={18} className="text-muted" />
                        <input
                          type="email"
                          value={settings.emailAddress}
                          onChange={(e) => updateSetting('emailAddress', e.target.value)}
                          placeholder="Email de contact"
                          className="flex-1 px-3 py-2 bg-input border border-input  !text-primary !text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        </div>
      </motion.div>
    </>
  );
}

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

// ============================================================================
// IMPORT FROM URL MODAL
// ============================================================================

interface ScrapedProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  category?: string;
  selected?: boolean;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (projects: PortfolioProject[]) => void;
}

function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [scrapedProjects, setScrapedProjects] = useState<ScrapedProject[]>([]);
  const [siteName, setSiteName] = useState<string>('');
  const [step, setStep] = useState<'url' | 'select'>('url');

  // Lock Lenis scroll when modal is open
  useModalLenis(isOpen);

  const handleScrape = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setDebugInfo([]);

    try {
      const response = await fetch('/api/portfolio/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      // Store debug info
      if (data.debug) {
        setDebugInfo(data.debug);
      }

      if (!data.success) {
        setError(data.error || 'Erreur lors du scraping');
        return;
      }

      if (data.projects.length === 0) {
        setError(t('portfolio_import_no_projects'));
        return;
      }

      setScrapedProjects(data.projects.map((p: ScrapedProject) => ({ ...p, selected: true })));
      setSiteName(data.siteName || '');
      setStep('select');
    } catch (err) {
      setError('Erreur de connexion: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (id: string) => {
    setScrapedProjects(prev => 
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  const toggleAll = () => {
    const allSelected = scrapedProjects.every(p => p.selected);
    setScrapedProjects(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const handleImport = () => {
    const selectedProjects = scrapedProjects
      .filter(p => p.selected)
      .map((p, index) => ({
        id: `imported-${Date.now()}-${index}`,
        title: p.title,
        subtitle: p.category || '',
        description: p.description,
        category: 'other' as const,
        tags: p.category ? [p.category] : [],
        projectUrl: p.link,
        media: p.imageUrl ? [{
          id: `media-${Date.now()}-${index}`,
          type: 'image' as const,
          url: p.imageUrl,
        }] : [],
        coverIndex: 0,
        date: new Date().toISOString().split('T')[0],
        sortOrder: index,
      }));

    onImport(selectedProjects);
    handleClose();
  };

  const handleClose = () => {
    setUrl('');
    setError(null);
    setDebugInfo([]);
    setShowDebug(false);
    setScrapedProjects([]);
    setSiteName('');
    setStep('url');
    onClose();
  };

  const selectedCount = scrapedProjects.filter(p => p.selected).length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-page/80 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card  shadow-2xl border border-default w-full max-w-4xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <div className="flex items-center gap-3">
            <div className="p-2  bg-accent-light">
              <IconDownload size={15} className="!text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold !text-primary">
                {step === 'url' ? t('portfolio_import_title') : t('portfolio_import_select')}
              </h2>
              {siteName && step === 'select' && (
                <p className="text-sm !text-secondary">{t('portfolio_import_from')} {siteName}</p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-hover  transition-colors">
            <IconX size={15} className="text-primary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]" style={{ overscrollBehavior: 'contain' }}>
          {step === 'url' ? (
            <div className="space-y-6">
              <div>
                <label className="block !text-sm font-medium !text-secondary mb-2">
                  {t('portfolio_import_url_label')}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <IconWorld size={18} className="absolute left-3 top-1/2 -translate-y-1/2 !text-muted" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://monportfolio.com/projets"
                      className="w-full !pl-10 !pr-4 py-3 bg-input border border-input  !text-primary placeholder:!text-muted focus:outline-none focus:border-accent"
                      onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                    />
                  </div>
                  <button
                    onClick={handleScrape}
                    disabled={loading || !url.trim()}
                    className="px-6 py-3 bg-accent !text-accent  font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <IconLoader2 size={18} className="animate-spin" />
                        {t('portfolio_import_analyzing')}
                      </>
                    ) : (
                      <>
                        <IconSearch size={18} />
                        {t('portfolio_import_analyze')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-danger-light border border-danger  space-y-3">
                  <p className="text-danger !text-sm font-medium">{error}</p>
                  <div className="!text-xs !text-secondary space-y-1">
                    <p>Conseils :</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>{t('portfolio_tips_url')}</li>
                      <li>{t('portfolio_tips_direct')}</li>
                      <li>{t('portfolio_tips_js')}</li>
                    </ul>
                  </div>
                  {debugInfo.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="!text-xs !text-accent hover:underline"
                      >
                        {showDebug ? t('portfolio_hide_debug') : t('portfolio_show_debug')}
                      </button>
                      {showDebug && (
                        <pre className="mt-2 p-2 bg-card rounded !text-xs !text-muted overflow-auto max-h-32">
                          {debugInfo.join('\n')}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-muted  p-4">
                <h3 className="text-sm font-medium !text-primary mb-2">💡 {t('portfolio_import_how_title')}</h3>
                <ul className="text-sm !text-secondary space-y-1">
                  <li>• {t('portfolio_import_how_1')}</li>
                  <li>• {t('portfolio_import_how_2')}</li>
                  <li>• {t('portfolio_import_how_3')}</li>
                  <li>• {t('portfolio_import_how_4')}</li>
                </ul>
              </div>

              <div className="bg-muted  p-4">
                <h3 className="text-sm font-medium !text-primary mb-2">🔗 {t('portfolio_import_supported_title')}</h3>
                <p className="text-sm !text-secondary">
                  {t('portfolio_import_supported_desc')}
                </p>
                <p className="!text-xs !text-muted mt-2">
                  {t('portfolio_import_js_note')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selection controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-sm !text-accent hover:underline"
                >
                  {scrapedProjects.every(p => p.selected) ? t('portfolio_import_deselect_all') : t('portfolio_import_select_all')}
                </button>
                <span className="text-sm !text-secondary">
                  {selectedCount} / {scrapedProjects.length} {t('portfolio_import_selected')}
                </span>
              </div>

              {/* Projects grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {scrapedProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`relative cursor-pointer  overflow-hidden border-2 transition-all ${
                      project.selected 
                        ? 'border-accent ring-1 ring-accent/20' 
                        : 'border-transparent hover:border-default'
                    }`}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-muted">
                      {project.imageUrl ? (
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconPhoto size={32} className="text-muted" />
                        </div>
                      )}
                    </div>

                    {/* Selection indicator */}
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      project.selected ? 'bg-accent' : 'bg-card/80'
                    }`}>
                      {project.selected && <IconCheck size={14} className="!text-accent" />}
                    </div>

                    {/* Title */}
                    <div className="p-2 bg-card">
                      <p className="!text-xs font-medium !text-primary truncate">{project.title}</p>
                      {project.category && (
                        <p className="!text-xs !text-secondary truncate">{project.category}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Back button */}
              <button
                onClick={() => setStep('url')}
                className="text-sm !text-secondary hover:!text-primary flex items-center gap-1"
              >
                <IconChevronLeft size={16} />
                {t('portfolio_import_back')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-default bg-muted/30">
            <button
              onClick={handleClose}
              className="px-4 py-2 !text-secondary hover:!text-primary transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-6 py-2 bg-accent !text-accent  font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <IconDownload size={18} />
              {t('portfolio_import_btn')} {selectedCount} {t('portfolio_import_projects')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

interface ProjectCardProps {
  project: PortfolioProject;
  settings: PortfolioSettings;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  index: number;
  allFonts: GoogleFontItem[];
}

// Helper function to get font family
function getFontFamily(fontId: string, settings: PortfolioSettings, allFonts: GoogleFontItem[] = getDefaultAllFonts()): string {
  if (fontId === 'custom' && settings.customFontName) {
    return `'${settings.customFontName}', sans-serif`;
  }
  const font = allFonts.find(f => f.id === fontId);
  return font?.family || "'Manrope', sans-serif";
}

function ProjectCard({ project, settings, onClick, onEdit, onDelete, index, allFonts }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const coverMedia = project.media[project.coverIndex] || project.media[0];

  const getAspectRatio = () => {
    switch (settings.imageRatio) {
      case 'square': return 'aspect-square';
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': return 'aspect-[4/3]';
      default: return 'aspect-square';
    }
  };

  const getAnimation = () => {
    if (!settings.enableAnimations) return {};
    switch (settings.animationType) {
      case 'fade': return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: index * 0.05, duration: 0.4 } };
      case 'slide': return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.05, duration: 0.4 } };
      case 'scale': return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { delay: index * 0.05, duration: 0.4 } };
      default: return {};
    }
  };

  const projectTitleFont = getFontFamily(settings.projectTitleFont, settings, allFonts);

  return (
    <motion.div
      {...getAnimation()}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div
        className={`relative ${getAspectRatio()} overflow-hidden cursor-pointer`}
        onClick={onClick}
      >
        {coverMedia ? (
          <>
            <img
              src={coverMedia.url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            {coverMedia.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                  <IconPlayerPlay size={24} className="text-page ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <IconPhoto size={32} className="text-secondary/40" />
          </div>
        )}

        {/* Hover Actions - Simple overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-primary/60 flex items-center justify-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onEdit}
                className="p-2.5 rounded-full bg-page !text-primary hover:bg-muted transition-colors"
              >
                <IconEdit size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-2.5 rounded-full bg-page !text-danger hover:bg-muted transition-colors"
              >
                <IconTrash size={16} />
              </button>
              {project.media.length > 1 && (
                <span className="px-2.5 py-1.5 rounded-full bg-page !text-primary !text-xs flex items-center gap-1">
                  <IconPhoto size={12} />
                  {project.media.length}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title - Simple, below image */}
      <div className="mt-3 cursor-pointer" onClick={onClick}>
        <h3
          className={`text-sm font-normal ${!settings.projectTitleColor ? 'text-primary' : ''}`}
          style={{ 
            color: settings.projectTitleColor || undefined, 
            fontFamily: projectTitleFont,
            fontWeight: settings.projectTitleFontWeight || 400,
          }}
        >
          {project.subtitle || project.title}
        </h3>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PROJECT DETAIL MODAL
// ============================================================================

interface ProjectDetailModalProps {
  project: PortfolioProject | null;
  settings: PortfolioSettings;
  onClose: () => void;
}

function ProjectDetailModal({ project, settings, onClose }: ProjectDetailModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Lock Lenis scroll when modal is open
  useModalLenis(!!project);

  if (!project) return null;

  const currentMedia = project.media[currentMediaIndex];
  const titleFont = getFontFamily(settings.titleFont, settings);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-page/95 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-muted !text-primary hover:bg-accent hover:!text-accent transition-colors"
      >
        <IconX size={24} />
      </button>

      {/* Content */}
      <div className="relative h-full flex flex-col lg:flex-row">
        {/* Media Section */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* Navigation arrows */}
          {project.media.length > 1 && (
            <>
              <button
                onClick={() => setCurrentMediaIndex((i) => (i > 0 ? i - 1 : project.media.length - 1))}
                className="absolute left-4 p-3 rounded-full bg-muted !text-primary hover:bg-accent hover:!text-accent transition-colors"
              >
                <IconChevronLeft size={24} />
              </button>
              <button
                onClick={() => setCurrentMediaIndex((i) => (i < project.media.length - 1 ? i + 1 : 0))}
                className="absolute right-4 lg:right-auto lg:left-[calc(100%-4rem)] p-3 rounded-full bg-muted !text-primary hover:bg-accent hover:!text-accent transition-colors"
              >
                <IconChevronRight size={24} />
              </button>
            </>
          )}

          {/* Current media */}
          <motion.div
            key={currentMediaIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-full max-h-[80vh]"
          >
            {currentMedia?.type === 'video' ? (
              <video
                src={currentMedia.url}
                controls
                className="max-w-full max-h-[80vh] "
              />
            ) : (
              <img
                src={currentMedia?.url}
                alt={project.title}
                className="max-w-full max-h-[80vh] object-contain "
              />
            )}
          </motion.div>

          {/* Thumbnails */}
          {project.media.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {project.media.map((media, idx) => (
                  <button
                    key={media.id}
                    onClick={() => setCurrentMediaIndex(idx)}
                    className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                      idx === currentMediaIndex ? 'border-accent' : 'border-transparent opacity-50 hover:opacity-75'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <IconVideo size={16} className="text-primary" />
                      </div>
                    ) : (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="lg:w-96 bg-card p-8 overflow-y-auto border-l border-default" style={{ overscrollBehavior: 'contain' }}>
          <h2
            className="text-2xl tracking-wider !text-primary"
            style={{ 
              fontFamily: titleFont,
              fontWeight: settings.projectTitleFontWeight,
              textTransform: 'uppercase',
            }}
          >
            {project.title}
          </h2>
          <p className="text-lg mt-2 !text-secondary">
            {project.subtitle}
          </p>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 !text-xs font-medium rounded-full bg-accent-light !text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div
            className="mt-6 leading-relaxed !text-primary"
            dangerouslySetInnerHTML={{ __html: project.descriptionHtml || project.description }}
          />

          {/* Meta */}
          {project.clientName && (
            <div className="mt-6 pt-6 border-t border-default">
              <p className="text-sm !text-secondary">
                <span className="font-medium">Client:</span> {project.clientName}
              </p>
            </div>
          )}

          {/* Project Link */}
          {project.projectUrl && (
            <a
              href={project.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3  bg-accent !text-accent font-medium transition-opacity hover:opacity-90"
            >
              <IconExternalLink size={18} />
              Voir le projet
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADD/EDIT PROJECT MODAL
// ============================================================================

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: PortfolioProject | null;
  onSave: (project: Partial<PortfolioProject>) => void;
}

function ProjectFormModal({ isOpen, onClose, project, onSave }: ProjectFormModalProps) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    title: project?.title || '',
    subtitle: project?.subtitle || '',
    description: project?.description || '',
    category: project?.category || 'other',
    tags: project?.tags?.join(', ') || '',
    clientName: project?.clientName || '',
    projectUrl: project?.projectUrl || '',
  });
  const [media, setMedia] = useState<MediaItem[]>(project?.media || []);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [libraryImages, setLibraryImages] = useState<Array<{ id: number; url: string; name: string }>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock Lenis scroll when modal is open
  useModalLenis(isOpen);

  // Load library when modal opens
  useEffect(() => {
    if (showMediaPicker) {
      loadLibrary();
    }
  }, [showMediaPicker]);

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
      const res = await fetch(
        `${API_URL}/api/user-medias?sort=createdAt:desc&populate=file&filters[type][$eq]=image`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (res.ok) {
        const result = await res.json();
        const userMedias = result.data || [];
        setLibraryImages(userMedias.map((item: { id: number; name: string; file: { id: number; url: string } }) => ({
          id: item.file?.id,
          url: item.file?.url?.startsWith('http') ? item.file.url : `${API_URL}${item.file?.url}`,
          name: item.name,
        })).filter((img: { id: number; url: string }) => img.id && img.url));
      }
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Veuillez sélectionner une image ou une vidéo');
      return;
    }

    setUploading(true);
    try {
      // Upload to Strapi
      const result = await uploadImage(file);
      const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
      const fullUrl = result.url.startsWith('http') ? result.url : `${API_URL}${result.url}`;

      // Create user-media entry
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/user-medias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            name: file.name,
            file: result.id,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            folder: 'portfolio',
          },
        }),
      });

      // Add to media list
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      setMedia([...media, { id: result.id.toString(), type: mediaType, url: fullUrl }]);
      
      // Reload library
      loadLibrary();
      setShowMediaPicker(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectFromLibrary = (image: { id: number; url: string }) => {
    setMedia([...media, { id: image.id.toString(), type: 'image', url: image.url }]);
    setShowMediaPicker(false);
  };

  const addMediaUrl = (type: 'image' | 'video') => {
    const url = prompt(`URL de ${type === 'image' ? "l'image" : 'la vidéo'}:`);
    if (url) {
      setMedia([...media, { id: Date.now().toString(), type, url }]);
    }
  };

  const removeMedia = (id: string) => {
    setMedia(media.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      media,
      coverIndex: 0,
    });
    onClose(); // Close modal after saving
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-page/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-default  shadow-2xl"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-default px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold !text-primary">
            {project ? t('portfolio_edit_project') : t('portfolio_add_project')}
          </h2>
          <button
            onClick={onClose}
            className="p-2  hover:bg-hover !text-muted hover:!text-primary transition-colors"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Media Gallery */}
          <div>
            <label className="block !text-sm font-medium !text-secondary mb-3">
              {t('portfolio_media')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {media.map((item) => (
                <div key={item.id} className="relative aspect-square  overflow-hidden bg-muted group">
                  {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <IconVideo size={24} className="text-primary" />
                    </div>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-dangertext-accent opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
              
              {/* Add button - opens picker */}
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="aspect-square  border-2 border-dashed border-default flex flex-col items-center justify-center !text-muted hover:!text-accent hover:border-accent transition-colors"
              >
                <IconPlus size={24} />
                <span className="!text-xs mt-1">Ajouter</span>
              </button>
            </div>
          </div>

          {/* Media Picker Modal */}
          <AnimatePresence>
            {showMediaPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-page/80 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && setShowMediaPicker(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-card border border-default  shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-default">
                    <h3 className="text-lg font-semibold !text-primary flex items-center gap-2">
                      <IconPhoto className="w-5 h-5 !text-accent" />
                      Ajouter un média
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(false)}
                      className="p-2  hover:bg-hover transition-colors"
                    >
                      <IconX className="w-5 h-5 !text-secondary" />
                    </button>
                  </div>

                  {/* Upload Options */}
                  <div className="p-4 border-b border-default">
                    <div className="flex gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-accent !text-accent  hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <IconLoader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <IconUpload className="w-5 h-5" />
                        )}
                        {uploading ? 'Upload...' : 'Importer un fichier'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addMediaUrl('image');
                          setShowMediaPicker(false);
                        }}
                        className="flex items-center gap-2 py-3 px-4 bg-muted !text-primary  hover:bg-muted transition-colors"
                      >
                        <IconLink className="w-5 h-5" />
                        URL
                      </button>
                    </div>
                  </div>

                  {/* Library */}
                  <div className="flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
                    <h4 className="text-sm font-medium !text-secondary mb-3">Ma bibliothèque</h4>
                    {loadingLibrary ? (
                      <div className="flex items-center justify-center h-48">
                        <IconLoader2 className="w-8 h-8 !text-accent animate-spin" />
                      </div>
                    ) : libraryImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 !text-muted">
                        <IconPhoto className="w-12 h-12 mb-4 opacity-50" />
                        <p>Aucune image dans la bibliothèque</p>
                        <p className="!text-xs mt-1">Importez votre première image ci-dessus</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3">
                        {libraryImages.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => handleSelectFromLibrary(image)}
                            className="relative aspect-square  overflow-hidden border-2 border-transparent hover:border-accent transition-all group"
                          >
                            <Image
                              src={image.url}
                              alt={image.name}
                              fill
                              sizes="120px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-accent-light group-hover:bg-accent-light transition-colors flex items-center justify-center">
                              <IconCheck className="w-8 h-8 !text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_title')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-input border border-input  !text-primary placeholder-placeholder focus:outline-none focus:border-accent uppercase font-bold tracking-wide"
                placeholder="TITRE DU PROJET"
                required
              />
            </div>
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_subtitle_field')}
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input  !text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="Lieu ou description courte"
              />
            </div>
          </div>

          {/* Description with Rich Text (simplified for now) */}
          <div>
            <label className="block !text-sm font-medium !text-secondary mb-2">
              {t('portfolio_description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-input border border-input  !text-primary placeholder-placeholder focus:outline-none focus:border-accent resize-none"
              placeholder="Décrivez votre projet..."
            />
            <p className="!text-xs !text-muted mt-1">
              💡 L&apos;éditeur de texte riche sera bientôt disponible
            </p>
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input  !text-primary focus:outline-none focus:border-accent"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'en' ? cat.labelEn : cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_tags')}
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input  !text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="Nature, Arctic, Landscape"
              />
            </div>
          </div>

          {/* Client & URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_client')}
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input  !text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="Nom du client (optionnel)"
              />
            </div>
            <div>
              <label className="block !text-sm font-medium !text-secondary mb-2">
                {t('portfolio_project_url')}
              </label>
              <input
                type="url"
                value={formData.projectUrl}
                onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input  !text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5  border border-default !text-secondary hover:bg-hover transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5  bg-accent !text-accent font-medium hover:bg-accent transition-colors"
            >
              {project ? t('save') : t('portfolio_create')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState({ onAddProject }: { onAddProject: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center py-32 !text-center">
      <div className="w-24 h-24 rounded-full bg-accent-light flex items-center justify-center mb-6">
        <IconPhoto size={48} className="!text-accent" />
      </div>
      <h2 className="text-2xl font-bold !text-primary mb-2">
        {t('portfolio_empty')}
      </h2>
      <p className="text-secondary max-w-md mb-8">
        {t('portfolio_empty_desc')}
      </p>
      <button
        onClick={onAddProject}
        className="flex items-center gap-2 px-6 py-3 bg-accent !text-accent font-medium  hover:bg-accent transition-colors"
      >
        <IconPlus size={15} />
        {t('portfolio_add_first')}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PortfolioPage() {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [viewingProject, setViewingProject] = useState<PortfolioProject | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Google Fonts state
  const [googleFonts, setGoogleFonts] = useState<GoogleFontsCategories>(DEFAULT_GOOGLE_FONTS);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [allFonts, setAllFonts] = useState<GoogleFontItem[]>(getDefaultAllFonts());

  // Load portfolio data from API
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/portfolio', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          }
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects);
          } else {
            // Show demo projects for first visit
            const hasSeenDemo = localStorage.getItem('portfolio_demo_shown');
            if (!hasSeenDemo) {
              setProjects(MOCK_PROJECTS);
              localStorage.setItem('portfolio_demo_shown', 'true');
            }
          }
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  // Load Google Fonts from API
  useEffect(() => {
    const loadGoogleFonts = async () => {
      try {
        setFontsLoading(true);
        const response = await fetch('/api/google-fonts?sort=popularity&limit=300');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.fonts && data.fonts.length > 0) {
            // Organize fonts by category
            const organized: GoogleFontsCategories = {
              'sans-serif': [],
              serif: [],
              display: [],
              handwriting: [],
              monospace: [],
            };
            
            data.fonts.forEach((font: GoogleFontItem) => {
              const category = font.category as keyof GoogleFontsCategories;
              if (organized[category]) {
                organized[category].push(font);
              }
            });
            
            setGoogleFonts(organized);
            setAllFonts(data.fonts);
          }
        }
      } catch (error) {
        console.error('Error loading Google Fonts:', error);
        // Keep using default fonts on error
      } finally {
        setFontsLoading(false);
      }
    };

    loadGoogleFonts();
  }, []);

  // Auto-save settings with debounce
  const savePortfolio = useCallback(async (newSettings: PortfolioSettings, newProjects: PortfolioProject[]) => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('/api/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: newSettings,
          projects: newProjects,
        }),
      });
    } catch (error) {
      console.error('Error saving portfolio:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Debounced auto-save when settings or projects change
  useEffect(() => {
    if (isLoading) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      savePortfolio(settings, projects);
    }, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings, projects, isLoading, savePortfolio]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') return projects;
    return projects.filter((p) => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  // Get grid classes
  const getGridClasses = () => {
    const cols = {
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    }[settings.columns];
    
    const gaps = {
      tight: 'gap-4',
      normal: 'gap-6',
      wide: 'gap-10',
    }[settings.gap];

    return `grid ${cols} ${gaps}`;
  };

  // Handlers
  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project);
    setIsFormModalOpen(true);
  };

  const handleDelete = (project: PortfolioProject) => {
    if (confirm(t('portfolio_confirm_delete'))) {
      setProjects(projects.filter((p) => p.id !== project.id));
    }
  };

  const handleSave = (data: Partial<PortfolioProject>) => {
    if (editingProject) {
      setProjects(projects.map((p) => (p.id === editingProject.id ? { ...p, ...data } : p)));
    } else {
      const newProject: PortfolioProject = {
        id: Date.now().toString(),
        title: data.title || '',
        subtitle: data.subtitle || '',
        description: data.description || '',
        category: data.category || 'other',
        tags: data.tags || [],
        clientName: data.clientName,
        projectUrl: data.projectUrl,
        media: data.media || [],
        coverIndex: data.coverIndex || 0,
        date: new Date().toISOString(),
        sortOrder: projects.length,
      };
      setProjects([...projects, newProject]);
    }
    setIsFormModalOpen(false);
    setEditingProject(null);
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/portfolio/${settings.shareSlug || 'mon-portfolio'}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleImportProjects = (importedProjects: PortfolioProject[]) => {
    setProjects(prev => [...prev, ...importedProjects]);
  };

  // Get font families
  const titleFont = getFontFamily(settings.titleFont, settings, allFonts);
  const subtitleFont = getFontFamily(settings.subtitleFont, settings, allFonts);

  // Preload Google Fonts when allFonts changes
  useEffect(() => {
    if (allFonts.length === 0) return;
    
    allFonts.forEach(font => {
      const fontName = font.googleName;
      const linkId = `portfolio-font-${font.id}`;
      
      // Only add if not already loaded
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        // Use standard weights syntax (works for all fonts, not just variable fonts)
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [allFonts]); // Re-run when fonts are loaded from API

  // Load custom font if specified
  useEffect(() => {
    if (settings.customFontUrl && settings.customFontName) {
      const customLinkId = 'portfolio-custom-font';
      const existingLink = document.getElementById(customLinkId);
      
      // Check if it's a Google Fonts URL or a direct font file
      if (settings.customFontUrl.includes('fonts.googleapis.com')) {
        if (existingLink) {
          (existingLink as HTMLLinkElement).href = settings.customFontUrl;
        } else {
          const customLink = document.createElement('link');
          customLink.id = customLinkId;
          customLink.rel = 'stylesheet';
          customLink.href = settings.customFontUrl;
          document.head.appendChild(customLink);
        }
      } else {
        // Direct font file - create @font-face
        if (existingLink) {
          existingLink.remove();
        }
        const customStyle = document.createElement('style');
        customStyle.id = customLinkId;
        customStyle.textContent = `
          @font-face {
            font-family: '${settings.customFontName}';
            src: url('${settings.customFontUrl}') format('woff2');
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
        `;
        document.head.appendChild(customStyle);
      }
    }
  }, [settings.customFontUrl, settings.customFontName]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 size={32} className="animate-spin !text-accent" />
          <p className="text-primary">{t('portfolio_loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300 bg-page"
      style={settings.backgroundColor ? { backgroundColor: settings.backgroundColor } : undefined}
    >
      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-card  shadow-lg border border-default">
          <IconLoader2 size={16} className="animate-spin !text-accent" />
          <span className="text-sm !text-secondary">{t('portfolio_saving')}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="px-6 lg:px-12 py-4 border border-default ">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left - Site Name */}
          <span className="text-sm !text-secondary font-medium tracking-wide">
            {settings.portfolioName.toLowerCase().replace(/\s+/g, '-')}.com
          </span>

          {/* Right - Navigation & Actions */}
          <div className="flex items-center gap-6">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 !text-sm">
              <span className="text-secondary hover:!text-primary cursor-pointer transition-colors">
                {t('portfolio_nav_home')}
              </span>
              <span className="text-secondary hover:!text-primary cursor-pointer transition-colors">
                {t('portfolio_nav_about')}
              </span>
              <span className="text-primary font-medium cursor-pointer border-b border-primary pb-0.5">
                {t('portfolio_nav_portfolio')}
              </span>
              <span className="text-secondary hover:!text-primary cursor-pointer transition-colors">
                {t('portfolio_nav_blog')}
              </span>
              <span className="text-secondary hover:!text-primary cursor-pointer transition-colors">
                {t('portfolio_nav_contact')}
              </span>
            </nav>

            {/* Social Icons */}
            {settings.showSocialLinks && (
              <div className="flex items-center gap-2">
                {settings.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" 
                     className="w-8 h-8 rounded-full bg-primary !text-page flex items-center justify-center hover:opacity-80 transition-opacity">
                    <IconBrandInstagram size={14} />
                  </a>
                )}
                {settings.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer"
                     className="w-8 h-8 rounded-full bg-primary !text-page flex items-center justify-center hover:opacity-80 transition-opacity">
                    <IconBrandLinkedin size={14} />
                  </a>
                )}
              </div>
            )}

            {/* Admin Actions - Floating */}
            <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
              {settings.isPublic && (
                <button
                  onClick={copyShareLink}
                  className="p-3 rounded-full bg-card shadow-lg border border-default hover:bg-hover transition-colors"
                  title={t('portfolio_copy_link')}
                >
                  {linkCopied ? (
                    <IconCheck size={18} className="!text-accent" />
                  ) : (
                    <IconShare size={18} className="text-primary" />
                  )}
                </button>
              )}
              <button
                onClick={() => window.open(`/portfolio/${settings.shareSlug || 'preview'}`, '_blank')}
                className="p-3 rounded-full bg-card shadow-lg border border-default hover:bg-hover transition-colors"
                title={t('portfolio_preview')}
              >
                <IconEye size={18} className="text-primary" />
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="p-3 rounded-full bg-card shadow-lg border border-default hover:bg-hover transition-colors"
                title={t('portfolio_import_from_site')}
              >
                <IconDownload size={18} className="text-primary" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-full bg-card shadow-lg border border-default hover:bg-hover transition-colors"
                title={t('portfolio_settings')}
              >
                <IconSettings size={18} className="text-primary" />
              </button>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsFormModalOpen(true);
                }}
                className="p-3 rounded-full bg-accent shadow-lg hover:opacity-90 transition-opacity"
                title={t('portfolio_add_project')}
              >
                <IconPlus size={18} className="!text-accent" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          {/* Left - Big Title */}
          <div>
            <h1
              className={`leading-[0.9] flex flex-row gap-2 !text-left ${!settings.titleColor ? 'text-primary' : ''}`}
              style={{ 
                color: settings.titleColor || undefined, 
                fontFamily: titleFont,
                fontWeight: settings.titleFontWeight || 700,
                fontSize: 'clamp(3rem, 10vw, 6rem)',
                letterSpacing: '-0.02em',
              }}
            >
              {settings.portfolioName.split(' ').map((word, i) => (
                <span key={i} className="block">{word}</span>
              ))}
              <span className="inline-block">.</span>
            </h1>
            <p
              className={`mt-6 max-w-md !text-lg ${!settings.subtitleColor ? 'text-secondary' : ''}`}
              style={{ 
                color: settings.subtitleColor || undefined,
                fontFamily: subtitleFont,
                fontWeight: settings.subtitleFontWeight,
              }}
            >
              {settings.tagline}
            </p>
          </div>

          {/* Right - Connect Button */}
          <div className="flex items-center gap-4">
            {settings.emailAddress && (
              <a
                href={`mailto:${settings.emailAddress}`}
                className="px-6 py-2.5 rounded-full border border-primary !text-primary !text-sm font-medium hover:bg-primary hover:!text-page transition-colors"
              >
                {t('portfolio_connect')}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <main className="px-6 lg:px-12 pb-24">
        <div className="max-w-7xl mx-auto">
          {projects.length === 0 ? (
            <EmptyState onAddProject={() => setIsFormModalOpen(true)} />
          ) : (
            <>
              {/* Category Filter - Minimal */}
              <div className="mb-8 flex flex-wrap gap-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-sm transition-all duration-200 ${
                      selectedCategory === cat.id 
                        ? 'text-primary font-medium' 
                        : 'text-muted hover:!text-secondary'
                    }`}
                  >
                    {language === 'en' ? cat.labelEn : cat.label}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {filteredProjects.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-primary">
                    {t('portfolio_no_category')}
                  </p>
                </div>
              ) : (
                <div className={getGridClasses()}>
                  {filteredProjects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      settings={settings}
                      onClick={() => setViewingProject(project)}
                      onEdit={() => handleEdit(project)}
                      onDelete={() => handleDelete(project)}
                      index={index}
                      allFonts={allFonts}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSettingsChange={setSettings}
            googleFonts={googleFonts}
            fontsLoading={fontsLoading}
            allFonts={allFonts}
          />
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isFormModalOpen && (
          <ProjectFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingProject(null);
            }}
            project={editingProject}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingProject && (
          <ProjectDetailModal
            project={viewingProject}
            settings={settings}
            onClose={() => setViewingProject(null)}
          />
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImportProjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
