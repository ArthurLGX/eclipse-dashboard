'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useLenis from '@/utils/useLenis';
import { useLanguage } from '@/app/context/LanguageContext';

import {
  IconBrandInstagram,
  IconBrandLinkedin,
  IconPlayerPlay,
  IconPhoto,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
} from '@tabler/icons-react';

// ============================================================================
// TYPES
// ============================================================================

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface PortfolioProject {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
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
  portfolioName: string;
  tagline: string;
  titleFont: string;
  titleFontWeight: number;
  titleColor: string;
  titleSize: string;
  titleLetterSpacing: string;
  titleTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  subtitleFont: string;
  subtitleFontWeight: number;
  subtitleColor: string;
  subtitleSize: string;
  projectTitleFont: string;
  projectTitleFontWeight: number;
  projectTitleColor: string;
  projectSubtitleColor: string;
  customFontName: string;
  customFontUrl: string;
  backgroundColor: string;
  accentColor: string;
  columns: 2 | 3 | 4;
  gap: 'tight' | 'normal' | 'wide';
  imageRatio: 'square' | 'landscape' | 'portrait';
  enableAnimations: boolean;
  animationType: 'fade' | 'slide' | 'scale';
  isPublic: boolean;
  shareSlug: string;
  showSocialLinks: boolean;
  instagramUrl: string;
  linkedinUrl: string;
  dribbbleUrl: string;
  emailAddress: string;
}

// ============================================================================
// GOOGLE FONTS
// ============================================================================

const GOOGLE_FONTS = {
  sans: [
    { id: 'inter', name: 'Inter', family: 'Inter' },
    { id: 'roboto', name: 'Roboto', family: 'Roboto' },
    { id: 'open-sans', name: 'Open Sans', family: 'Open Sans' },
    { id: 'manrope', name: 'Manrope', family: 'Manrope' },
    { id: 'poppins', name: 'Poppins', family: 'Poppins' },
    { id: 'montserrat', name: 'Montserrat', family: 'Montserrat' },
    { id: 'nunito', name: 'Nunito', family: 'Nunito' },
    { id: 'space-grotesk', name: 'Space Grotesk', family: 'Space Grotesk' },
    { id: 'dm-sans', name: 'DM Sans', family: 'DM Sans' },
  ],
  serif: [
    { id: 'playfair-display', name: 'Playfair Display', family: 'Playfair Display' },
    { id: 'lora', name: 'Lora', family: 'Lora' },
    { id: 'merriweather', name: 'Merriweather', family: 'Merriweather' },
    { id: 'cormorant', name: 'Cormorant', family: 'Cormorant' },
    { id: 'libre-baskerville', name: 'Libre Baskerville', family: 'Libre Baskerville' },
    { id: 'source-serif-pro', name: 'Source Serif Pro', family: 'Source Serif Pro' },
    { id: 'crimson-pro', name: 'Crimson Pro', family: 'Crimson Pro' },
  ],
  display: [
    { id: 'bebas-neue', name: 'Bebas Neue', family: 'Bebas Neue' },
    { id: 'oswald', name: 'Oswald', family: 'Oswald' },
    { id: 'archivo-black', name: 'Archivo Black', family: 'Archivo Black' },
    { id: 'anton', name: 'Anton', family: 'Anton' },
    { id: 'righteous', name: 'Righteous', family: 'Righteous' },
  ],
  handwriting: [
    { id: 'dancing-script', name: 'Dancing Script', family: 'Dancing Script' },
    { id: 'pacifico', name: 'Pacifico', family: 'Pacifico' },
    { id: 'caveat', name: 'Caveat', family: 'Caveat' },
  ],
};

const ALL_FONTS = [
  ...GOOGLE_FONTS.sans,
  ...GOOGLE_FONTS.serif,
  ...GOOGLE_FONTS.display,
  ...GOOGLE_FONTS.handwriting,
];

const getFontFamily = (fontId: string, settings: PortfolioSettings): string => {
  if (fontId === 'custom' && settings.customFontName) {
    return `'${settings.customFontName}', sans-serif`;
  }
  const font = ALL_FONTS.find(f => f.id === fontId);
  return font ? `'${font.family}', sans-serif` : "'Inter', sans-serif";
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: PortfolioSettings = {
  portfolioName: 'The portfolio',
  tagline: 'Digital + print.\nConcept to production.',
  titleFont: 'playfair-display',
  titleFontWeight: 700,
  titleColor: '',
  titleSize: '5rem',
  titleLetterSpacing: '-0.02em',
  titleTransform: 'none',
  subtitleFont: 'inter',
  subtitleFontWeight: 400,
  subtitleColor: '',
  subtitleSize: '1rem',
  projectTitleFont: 'inter',
  projectTitleFontWeight: 400,
  projectTitleColor: '',
  projectSubtitleColor: '',
  customFontName: '',
  customFontUrl: '',
  backgroundColor: '',
  accentColor: '',
  columns: 3,
  gap: 'normal',
  imageRatio: 'square',
  enableAnimations: true,
  animationType: 'fade',
  isPublic: true,
  shareSlug: '',
  showSocialLinks: true,
  instagramUrl: '',
  linkedinUrl: '',
  dribbbleUrl: '',
  emailAddress: '',
};

// ============================================================================
// MOCK DATA (Will be replaced by API data)
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
];

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

interface ProjectCardProps {
  project: PortfolioProject;
  settings: PortfolioSettings;
  onClick: () => void;
  index: number;
}

function ProjectCard({ project, settings, onClick, index }: ProjectCardProps) {
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

  const projectTitleFont = getFontFamily(settings.projectTitleFont, settings);

  return (
    <motion.div
      {...getAnimation()}
      className="group cursor-pointer"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className={`relative ${getAspectRatio()} overflow-hidden`}>
        {coverMedia ? (
          <>
            <img
              src={coverMedia.url}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {coverMedia.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <IconPlayerPlay size={24} className="text-gray-900 ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <IconPhoto size={32} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mt-3">
        <h3
          className="text-sm"
          style={{ 
            color: settings.projectTitleColor || '#1a1a1a', 
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
  project: PortfolioProject;
  settings: PortfolioSettings;
  onClose: () => void;
}

function ProjectDetailModal({ project, onClose }: Omit<ProjectDetailModalProps, 'settings'>) {
  const { t } = useLanguage();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % project.media.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + project.media.length) % project.media.length);
  };

  const currentMedia = project.media[currentMediaIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
        >
          <IconX size={20} />
        </button>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Media Section */}
          <div className="relative flex-1 bg-gray-100 flex items-center justify-center min-h-[300px] lg:min-h-[500px]">
            {currentMedia?.type === 'video' ? (
              <video
                src={currentMedia.url}
                controls
                className="max-w-full max-h-full"
              />
            ) : (
              <img
                src={currentMedia?.url}
                alt={project.title}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Navigation arrows */}
            {project.media.length > 1 && (
              <>
                <button
                  onClick={prevMedia}
                  className="absolute left-4 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                >
                  <IconChevronLeft size={20} />
                </button>
                <button
                  onClick={nextMedia}
                  className="absolute right-4 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                >
                  <IconChevronRight size={20} />
                </button>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {project.media.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMediaIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentMediaIndex ? 'bg-gray-900' : 'bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info Section */}
          <div className="lg:w-96 p-6 lg:p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {project.title}
            </h2>
            {project.subtitle && (
              <p className="text-gray-600 mb-4">{project.subtitle}</p>
            )}
            {project.description && (
              <p className="text-gray-700 mb-6 leading-relaxed">
                {project.description}
              </p>
            )}
            {project.clientName && (
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-medium">Client:</span> {project.clientName}
              </p>
            )}
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                {t('portfolio_view')} <IconExternalLink size={14} />
              </a>
            )}
            {project.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PublicPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLanguage();
  const [settings, setSettings] = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [projects, setProjects] = useState<PortfolioProject[]>(MOCK_PROJECTS);
  const [viewingProject, setViewingProject] = useState<PortfolioProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useLenis();
  // Load portfolio data from API
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetch(`/api/portfolio/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Portfolio non trouvé ou non public');
          } else {
            setError('Erreur lors du chargement');
          }
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
        if (data.projects) {
          setProjects(data.projects);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading portfolio:', err);
        setError('Erreur lors du chargement du portfolio');
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [slug]);

  // Load Google Fonts - dynamically when settings change
  useEffect(() => {
    const fontsToLoad = new Set<string>();
    
    [settings.titleFont, settings.subtitleFont, settings.projectTitleFont].forEach(fontId => {
      if (fontId && fontId !== 'custom') {
        const font = ALL_FONTS.find(f => f.id === fontId);
        if (font) fontsToLoad.add(font.family);
      }
    });

    // Remove old font links and add new ones
    const linkId = 'portfolio-google-fonts';
    const existingLink = document.getElementById(linkId);
    if (existingLink) {
      existingLink.remove();
    }

    if (fontsToLoad.size > 0) {
      const link = document.createElement('link');
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?${Array.from(fontsToLoad).map(f => `family=${f.replace(/\s+/g, '+')}:wght@100;200;300;400;500;600;700;800;900`).join('&')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Custom font
    if (settings.customFontUrl && settings.customFontName) {
      const styleId = 'portfolio-custom-font';
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // Check if it's a Google Fonts URL or a direct font file
      if (settings.customFontUrl.includes('fonts.googleapis.com')) {
        const customLink = document.createElement('link');
        customLink.id = styleId;
        customLink.rel = 'stylesheet';
        customLink.href = settings.customFontUrl;
        document.head.appendChild(customLink);
      } else {
        // Direct font file - create @font-face
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${settings.customFontName}';
            src: url('${settings.customFontUrl}') format('woff2');
            font-weight: 100 900;
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [settings.titleFont, settings.subtitleFont, settings.projectTitleFont, settings.customFontUrl, settings.customFontName]);

  const titleFont = getFontFamily(settings.titleFont, settings);
  const subtitleFont = getFontFamily(settings.subtitleFont, settings);

  const getGridClasses = () => {
    const colClasses = {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    };
    const gapClasses = {
      tight: 'gap-3',
      normal: 'gap-6',
      wide: 'gap-10',
    };
    return `grid ${colClasses[settings.columns]} ${gapClasses[settings.gap]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('portfolio_not_found')}</h1>
          <p className="text-gray-600">{t('portfolio_not_found_desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={settings.backgroundColor ? { backgroundColor: settings.backgroundColor } : undefined}
    >
      {/* Top Navigation Bar */}
      <header className="px-6 lg:px-12 py-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left - Site Name */}
          <span className="text-sm text-gray-500 font-medium tracking-wide">
            {settings.portfolioName.toLowerCase().replace(/\s+/g, '-')}.com
          </span>

          {/* Right - Navigation & Social */}
          <div className="flex items-center gap-6">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <span className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
                {t('portfolio_nav_home')}
              </span>
              <span className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
                {t('portfolio_nav_about')}
              </span>
              <span className="text-gray-900 font-medium cursor-pointer border-b border-gray-900 pb-0.5">
                {t('portfolio_nav_portfolio')}
              </span>
              <span className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
                {t('portfolio_nav_contact')}
              </span>
            </nav>

            {/* Social Icons */}
            {settings.showSocialLinks && (
              <div className="flex items-center gap-2">
                {settings.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" 
                     className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                    <IconBrandInstagram size={14} />
                  </a>
                )}
                {settings.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer"
                     className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                    <IconBrandLinkedin size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          {/* Left - Big Title */}
          <div>
            <h1
              className="leading-[0.9] !text-left !flex flex-row gap-2"
              style={{ 
                color: settings.titleColor || '#1a1a1a', 
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
              className="mt-6 max-w-md text-lg whitespace-pre-line"
              style={{ 
                color: settings.subtitleColor || '#666666',
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
                className="px-6 py-2.5 rounded-full border border-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-900 hover:text-white transition-colors"
              >
                {t('portfolio_connect')}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <main className="px-6 lg:px-12 pb-24 !bg-white">
        <div className="max-w-7xl mx-auto">
          {projects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">{t('portfolio_no_projects')}</p>
            </div>
          ) : (
            <div className={getGridClasses()}>
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  settings={settings}
                  onClick={() => setViewingProject(project)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingProject && (
          <ProjectDetailModal
            project={viewingProject}
            onClose={() => setViewingProject(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

