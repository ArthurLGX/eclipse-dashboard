'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/app/context/LanguageContext';
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
  IconEyeOff,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconUpload,
  IconGripVertical,
  IconWorld,
  IconLock,
  IconInfoCircle,
  IconMail,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandDribbble,
} from '@tabler/icons-react';

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
  // Style
  primaryFont: string;
  secondaryFont: string;
  titleColor: string;
  subtitleColor: string;
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

const FONTS = [
  { id: 'manrope', name: 'Manrope', family: "'Manrope', sans-serif" },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'geist', name: 'Geist', family: "'Geist', sans-serif" },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif" },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'cormorant', name: 'Cormorant', family: "'Cormorant Garamond', serif" },
  { id: 'space-grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { id: 'dm-sans', name: 'DM Sans', family: "'DM Sans', sans-serif" },
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
  portfolioName: 'Mon Portfolio',
  tagline: 'Créations visuelles & digitales',
  primaryFont: 'manrope',
  secondaryFont: 'manrope',
  titleColor: '#1a1a1a',
  subtitleColor: '#888888',
  backgroundColor: '#ffffff',
  accentColor: '#c9a962',
  columns: 3,
  gap: 'normal',
  imageRatio: 'landscape',
  enableAnimations: true,
  animationType: 'fade',
  isPublic: false,
  shareSlug: '',
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
    title: 'QUICK PORTFOLIO',
    subtitle: 'Overview of my work',
    description: 'A comprehensive overview showcasing various projects and creative explorations.',
    category: 'photography',
    tags: ['Portfolio', 'Creative'],
    media: [
      { id: 'm1', type: 'image', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80' },
      { id: 'm2', type: 'image', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' },
    ],
    coverIndex: 0,
    date: '2024-01-15',
    sortOrder: 0,
  },
  {
    id: '2',
    title: 'ARCTIC SILENCE',
    subtitle: 'Greenland',
    description: 'Capturing the pristine beauty and haunting silence of Greenland\'s Arctic landscapes.',
    category: 'photography',
    tags: ['Nature', 'Arctic', 'Landscape'],
    media: [
      { id: 'm3', type: 'image', url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=800&q=80' },
    ],
    coverIndex: 0,
    date: '2024-02-20',
    sortOrder: 1,
  },
  {
    id: '3',
    title: 'CONCRETE MONUMENTS',
    subtitle: 'Greenland',
    description: 'Modern architecture meets raw nature in this exploration of Greenland\'s built environment.',
    category: 'photography',
    tags: ['Architecture', 'Minimal'],
    media: [
      { id: 'm4', type: 'image', url: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&q=80' },
    ],
    coverIndex: 0,
    date: '2024-03-10',
    sortOrder: 2,
  },
  {
    id: '4',
    title: 'THE VIKING VILLAGE',
    subtitle: 'Iceland',
    description: 'Journey through Iceland\'s historic Viking settlements and dramatic landscapes.',
    category: 'photography',
    tags: ['History', 'Iceland'],
    clientName: 'Iceland Tourism',
    media: [
      { id: 'm5', type: 'image', url: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80' },
    ],
    coverIndex: 0,
    date: '2024-04-05',
    sortOrder: 3,
  },
  {
    id: '5',
    title: 'LOW CLOUDS',
    subtitle: 'Iceland',
    description: 'Misty mountain peaks and ethereal cloud formations over Iceland\'s highlands.',
    category: 'photography',
    tags: ['Landscape', 'Atmosphere'],
    media: [
      { id: 'm6', type: 'image', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80' },
    ],
    coverIndex: 0,
    date: '2024-05-12',
    sortOrder: 4,
  },
  {
    id: '6',
    title: 'REMNANTS',
    subtitle: 'Iceland',
    description: 'The lasting beauty of glacial remnants in a changing climate.',
    category: 'photography',
    tags: ['Climate', 'Glaciers'],
    media: [
      { id: 'm7', type: 'image', url: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80' },
    ],
    coverIndex: 0,
    date: '2024-06-18',
    sortOrder: 5,
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
}

function SettingsPanel({ isOpen, onClose, settings, onSettingsChange }: SettingsPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'style' | 'layout' | 'share'>('style');

  const updateSetting = <K extends keyof PortfolioSettings>(key: K, value: PortfolioSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-96 bg-card border-l border-default z-50 overflow-y-auto shadow-2xl"
    >
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-default p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <IconSettings size={20} />
          {t('portfolio_settings')}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg transition-colors">
          <IconX size={20} className="text-muted" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-default">
        {[
          { id: 'style', icon: IconPalette, label: 'Style' },
          { id: 'layout', icon: IconTypography, label: 'Layout' },
          { id: 'share', icon: IconShare, label: 'Partage' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted hover:text-primary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Style Tab */}
        {activeTab === 'style' && (
          <>
            {/* Portfolio Name */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_name')}
              </label>
              <input
                type="text"
                value={settings.portfolioName}
                onChange={(e) => updateSetting('portfolioName', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_tagline')}
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => updateSetting('tagline', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Primary Font */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_primary_font')}
              </label>
              <select
                value={settings.primaryFont}
                onChange={(e) => updateSetting('primaryFont', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('portfolio_title_color')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.titleColor}
                    onChange={(e) => updateSetting('titleColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.titleColor}
                    onChange={(e) => updateSetting('titleColor', e.target.value)}
                    className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('portfolio_accent_color')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_bg_color')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                />
              </div>
            </div>

            {/* Animations */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAnimations}
                  onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                  className="w-5 h-5 rounded border-input bg-input text-accent focus:ring-accent"
                />
                <span className="text-sm text-secondary flex items-center gap-2">
                  <IconSparkles size={16} />
                  {t('portfolio_enable_animations')}
                </span>
              </label>
            </div>

            {settings.enableAnimations && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('portfolio_animation_type')}
                </label>
                <select
                  value={settings.animationType}
                  onChange={(e) => updateSetting('animationType', e.target.value as PortfolioSettings['animationType'])}
                  className="w-full px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="scale">Scale</option>
                </select>
              </div>
            )}
          </>
        )}

        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <>
            {/* Columns */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_columns')}
              </label>
              <div className="flex gap-2">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateSetting('columns', num as 2 | 3 | 4)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.columns === num
                        ? 'bg-accent text-white'
                        : 'bg-muted text-secondary hover:bg-hover'
                    }`}
                  >
                    {num} col.
                  </button>
                ))}
              </div>
            </div>

            {/* Gap */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_gap')}
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'tight', label: 'Serré' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'wide', label: 'Large' },
                ].map((gap) => (
                  <button
                    key={gap.id}
                    onClick={() => updateSetting('gap', gap.id as PortfolioSettings['gap'])}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.gap === gap.id
                        ? 'bg-accent text-white'
                        : 'bg-muted text-secondary hover:bg-hover'
                    }`}
                  >
                    {gap.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Ratio */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_image_ratio')}
              </label>
              <select
                value={settings.imageRatio}
                onChange={(e) => updateSetting('imageRatio', e.target.value as PortfolioSettings['imageRatio'])}
                className="w-full px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
              >
                <option value="auto">Auto</option>
                <option value="square">Carré (1:1)</option>
                <option value="landscape">Paysage (4:3)</option>
                <option value="portrait">Portrait (3:4)</option>
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
                  className="w-5 h-5 rounded border-input bg-input text-accent focus:ring-accent"
                />
                <span className="text-sm text-secondary flex items-center gap-2">
                  {settings.isPublic ? <IconWorld size={16} /> : <IconLock size={16} />}
                  {t('portfolio_public')}
                </span>
              </label>
              <p className="text-xs text-muted mt-1 ml-8">
                {settings.isPublic
                  ? t('portfolio_public_desc')
                  : t('portfolio_private_desc')}
              </p>
            </div>

            {settings.isPublic && (
              <>
                {/* Share Link */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('portfolio_share_link')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/${settings.shareSlug || 'mon-portfolio'}`}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted border border-input rounded-lg text-primary text-sm"
                    />
                    <button className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                      <IconCopy size={18} />
                    </button>
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('portfolio_custom_slug')}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-sm">/portfolio/</span>
                    <input
                      type="text"
                      value={settings.shareSlug}
                      onChange={(e) => updateSetting('shareSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="mon-portfolio"
                      className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
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
                      className="w-5 h-5 rounded border-input bg-input text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-secondary">
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
                          className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBrandLinkedin size={18} className="text-muted" />
                        <input
                          type="text"
                          value={settings.linkedinUrl}
                          onChange={(e) => updateSetting('linkedinUrl', e.target.value)}
                          placeholder="URL LinkedIn"
                          className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBrandDribbble size={18} className="text-muted" />
                        <input
                          type="text"
                          value={settings.dribbbleUrl}
                          onChange={(e) => updateSetting('dribbbleUrl', e.target.value)}
                          placeholder="URL Dribbble"
                          className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <IconMail size={18} className="text-muted" />
                        <input
                          type="email"
                          value={settings.emailAddress}
                          onChange={(e) => updateSetting('emailAddress', e.target.value)}
                          placeholder="Email de contact"
                          className="flex-1 px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
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
}

function ProjectCard({ project, settings, onClick, onEdit, onDelete, index }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const coverMedia = project.media[project.coverIndex] || project.media[0];

  const getAspectRatio = () => {
    switch (settings.imageRatio) {
      case 'square': return 'aspect-square';
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': return 'aspect-[4/3]';
      default: return 'aspect-[4/3]';
    }
  };

  const getAnimation = () => {
    if (!settings.enableAnimations) return {};
    switch (settings.animationType) {
      case 'fade': return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: index * 0.1 } };
      case 'slide': return { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.1 } };
      case 'scale': return { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { delay: index * 0.1 } };
      default: return {};
    }
  };

  const primaryFont = FONTS.find(f => f.id === settings.primaryFont)?.family || "'Manrope', sans-serif";

  return (
    <motion.div
      {...getAnimation()}
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div
        className={`relative ${getAspectRatio()} overflow-hidden bg-muted`}
        onClick={onClick}
      >
        {coverMedia ? (
          <>
            <img
              src={coverMedia.url}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {coverMedia.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                  <IconPlayerPlay size={32} className="text-white ml-1" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconPhoto size={48} className="text-muted" />
          </div>
        )}

        {/* Hover overlay with actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 right-3 flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onEdit}
                className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition-colors shadow-lg"
              >
                <IconEdit size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded-full bg-white/90 text-red-500 hover:bg-white transition-colors shadow-lg"
              >
                <IconTrash size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media count badge */}
        {project.media.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1">
            <IconPhoto size={12} />
            {project.media.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-4" onClick={onClick}>
        <h3
          className="font-bold text-sm tracking-wider uppercase"
          style={{ color: settings.titleColor, fontFamily: primaryFont }}
        >
          {project.title}
        </h3>
        <p
          className="text-sm mt-1 font-light"
          style={{ color: settings.subtitleColor }}
        >
          {project.subtitle && (
            <>
              <span style={{ color: settings.accentColor }}>—</span> {project.subtitle}
            </>
          )}
        </p>
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

  if (!project) return null;

  const currentMedia = project.media[currentMediaIndex];
  const primaryFont = FONTS.find(f => f.id === settings.primaryFont)?.family || "'Manrope', sans-serif";

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
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
                className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <IconChevronLeft size={24} />
              </button>
              <button
                onClick={() => setCurrentMediaIndex((i) => (i < project.media.length - 1 ? i + 1 : 0))}
                className="absolute right-4 lg:right-auto lg:left-[calc(100%-4rem)] p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
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
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            ) : (
              <img
                src={currentMedia?.url}
                alt={project.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
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
                    idx === currentMediaIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-75'
                  }`}
                >
                  {media.type === 'video' ? (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <IconVideo size={16} className="text-white" />
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
        <div className="lg:w-96 bg-white p-8 overflow-y-auto" style={{ backgroundColor: settings.backgroundColor }}>
          <h2
            className="text-2xl font-bold tracking-wider uppercase"
            style={{ color: settings.titleColor, fontFamily: primaryFont }}
          >
            {project.title}
          </h2>
          <p className="text-lg mt-2" style={{ color: settings.subtitleColor }}>
            {project.subtitle}
          </p>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium rounded-full"
                  style={{ backgroundColor: `${settings.accentColor}20`, color: settings.accentColor }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div
            className="mt-6 leading-relaxed"
            style={{ color: settings.titleColor }}
            dangerouslySetInnerHTML={{ __html: project.descriptionHtml || project.description }}
          />

          {/* Meta */}
          {project.clientName && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: `${settings.subtitleColor}30` }}>
              <p className="text-sm" style={{ color: settings.subtitleColor }}>
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
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: settings.accentColor }}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      media,
      coverIndex: 0,
    });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-card border border-default rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-default px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">
            {project ? t('portfolio_edit_project') : t('portfolio_add_project')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Media Gallery */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-3">
              {t('portfolio_media')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {media.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                  {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <IconVideo size={24} className="text-white" />
                    </div>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
              
              {/* Add buttons */}
              <button
                type="button"
                onClick={() => addMediaUrl('image')}
                className="aspect-square rounded-lg border-2 border-dashed border-default flex flex-col items-center justify-center text-muted hover:text-primary hover:border-accent/50 transition-colors"
              >
                <IconPhoto size={24} />
                <span className="text-xs mt-1">Image</span>
              </button>
              <button
                type="button"
                onClick={() => addMediaUrl('video')}
                className="aspect-square rounded-lg border-2 border-dashed border-default flex flex-col items-center justify-center text-muted hover:text-primary hover:border-accent/50 transition-colors"
              >
                <IconVideo size={24} />
                <span className="text-xs mt-1">Vidéo</span>
              </button>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_title')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent uppercase font-bold tracking-wide"
                placeholder="TITRE DU PROJET"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_subtitle_field')}
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="Lieu ou description courte"
              />
            </div>
          </div>

          {/* Description with Rich Text (simplified for now) */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('portfolio_description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent resize-none"
              placeholder="Décrivez votre projet..."
            />
            <p className="text-xs text-muted mt-1">
              💡 L&apos;éditeur de texte riche sera bientôt disponible
            </p>
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary focus:outline-none focus:border-accent"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'en' ? cat.labelEn : cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_tags')}
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="Nature, Arctic, Landscape"
              />
            </div>
          </div>

          {/* Client & URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_client')}
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="Nom du client (optionnel)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_project_url')}
              </label>
              <input
                type="url"
                value={formData.projectUrl}
                onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-default text-secondary hover:bg-hover transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
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
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-24 h-24 rounded-full bg-accent-light flex items-center justify-center mb-6">
        <IconPhoto size={48} className="text-accent" />
      </div>
      <h2 className="text-2xl font-bold text-primary mb-2">
        {t('portfolio_empty')}
      </h2>
      <p className="text-secondary max-w-md mb-8">
        {t('portfolio_empty_desc')}
      </p>
      <button
        onClick={onAddProject}
        className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
      >
        <IconPlus size={20} />
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
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [viewingProject, setViewingProject] = useState<PortfolioProject | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [linkCopied, setLinkCopied] = useState(false);

  // Load demo data on first visit (to be replaced with API)
  useEffect(() => {
    const hasSeenDemo = localStorage.getItem('portfolio_demo_shown');
    if (!hasSeenDemo) {
      setProjects(MOCK_PROJECTS);
      localStorage.setItem('portfolio_demo_shown', 'true');
    }
  }, []);

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

  const primaryFont = FONTS.find(f => f.id === settings.primaryFont)?.family || "'Manrope', sans-serif";

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {/* Header - NorthLandscapes style */}
      <header className="px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          {/* Left - Logo & Tagline */}
          <div>
            <h1
              className="text-xl font-light tracking-[0.3em] uppercase"
              style={{ color: settings.titleColor, fontFamily: primaryFont }}
            >
              {settings.portfolioName}
            </h1>
            <p
              className="text-sm mt-2 max-w-sm font-light"
              style={{ color: settings.subtitleColor }}
            >
              {settings.tagline}
            </p>
          </div>

          {/* Right - Navigation & Actions */}
          <div className="flex items-center gap-6">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm tracking-wider">
              <span
                className="font-medium cursor-pointer"
                style={{ color: settings.titleColor }}
              >
                PORTFOLIO
              </span>
              <span
                className="cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: settings.subtitleColor }}
              >
                INFO
              </span>
              <span
                className="cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: settings.subtitleColor }}
              >
                CONTACT
              </span>
            </nav>

            {/* Social Icons */}
            {settings.showSocialLinks && (
              <div className="flex items-center gap-3">
                {settings.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                    <IconBrandInstagram size={18} style={{ color: settings.subtitleColor }} />
                  </a>
                )}
                {settings.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <IconBrandLinkedin size={18} style={{ color: settings.subtitleColor }} />
                  </a>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Share button */}
              {settings.isPublic && (
                <button
                  onClick={copyShareLink}
                  className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                  title="Copier le lien"
                >
                  {linkCopied ? (
                    <IconCheck size={20} style={{ color: settings.accentColor }} />
                  ) : (
                    <IconShare size={20} style={{ color: settings.subtitleColor }} />
                  )}
                </button>
              )}

              {/* Preview button */}
              <button
                onClick={() => window.open(`/portfolio/${settings.shareSlug || 'preview'}`, '_blank')}
                className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                title="Prévisualiser"
              >
                <IconEye size={20} style={{ color: settings.subtitleColor }} />
              </button>

              {/* Settings button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                title="Paramètres"
              >
                <IconSettings size={20} style={{ color: settings.subtitleColor }} />
              </button>

              {/* Add project button */}
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsFormModalOpen(true);
                }}
                className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: settings.accentColor }}
              >
                <IconPlus size={18} />
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      {projects.length > 0 && (
        <div className="px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="text-sm tracking-wider transition-all duration-200"
                style={{
                  color: selectedCategory === cat.id ? settings.titleColor : settings.subtitleColor,
                  fontWeight: selectedCategory === cat.id ? 600 : 400,
                  borderBottom: selectedCategory === cat.id ? `2px solid ${settings.accentColor}` : '2px solid transparent',
                  paddingBottom: '4px',
                }}
              >
                {language === 'en' ? cat.labelEn : cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {projects.length === 0 ? (
            <EmptyState onAddProject={() => setIsFormModalOpen(true)} />
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <p style={{ color: settings.subtitleColor }}>
                Aucun projet dans cette catégorie
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
                />
              ))}
            </div>
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
    </div>
  );
}
