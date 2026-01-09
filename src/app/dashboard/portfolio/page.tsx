'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/app/context/LanguageContext';
import {
  IconPlus,
  IconSearch,
  IconX,
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconUpload,
  IconPhoto,
  IconLink,
  IconCalendar,
  IconTag,
  IconGridDots,
  IconLayoutList,
} from '@tabler/icons-react';

// ============================================================================
// TYPES
// ============================================================================

interface PortfolioProject {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
  tags: string[];
  clientName?: string;
  projectUrl?: string;
  date: string;
  featured: boolean;
  views: number;
  likes: number;
}

type ViewMode = 'masonry' | 'grid' | 'list';

// ============================================================================
// MOCK DATA (à remplacer par API Strapi)
// ============================================================================

const MOCK_PROJECTS: PortfolioProject[] = [
  {
    id: '1',
    title: 'ECLIPSE STUDIO',
    subtitle: 'Brand Identity & Web Design',
    description: 'Complete brand identity redesign including logo, color palette, typography and responsive website.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    category: 'branding',
    tags: ['Branding', 'UI/UX', 'Web Design'],
    clientName: 'Eclipse Studio',
    projectUrl: 'https://eclipsestudio.dev',
    date: '2024-01-15',
    featured: true,
    views: 1250,
    likes: 89,
  },
  {
    id: '2',
    title: 'FINTECH DASHBOARD',
    subtitle: 'Product Design & Development',
    description: 'Modern financial dashboard with real-time analytics and intuitive data visualization.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    category: 'product',
    tags: ['Dashboard', 'Fintech', 'Data Viz'],
    clientName: 'FinCorp',
    date: '2024-02-20',
    featured: true,
    views: 890,
    likes: 67,
  },
  {
    id: '3',
    title: 'ORGANIC MARKET',
    subtitle: 'E-commerce & Branding',
    description: 'Complete e-commerce solution for organic food marketplace with custom checkout flow.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    category: 'ecommerce',
    tags: ['E-commerce', 'Branding', 'UX'],
    clientName: 'Green Foods Co.',
    projectUrl: 'https://example.com',
    date: '2024-03-10',
    featured: false,
    views: 654,
    likes: 45,
  },
  {
    id: '4',
    title: 'TRAVEL APP',
    subtitle: 'Mobile UI/UX Design',
    description: 'Travel companion app with AI-powered itinerary suggestions and social features.',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    category: 'mobile',
    tags: ['Mobile', 'UI/UX', 'Travel'],
    date: '2024-04-05',
    featured: false,
    views: 432,
    likes: 38,
  },
  {
    id: '5',
    title: 'CREATIVE STUDIO',
    subtitle: 'Website Redesign',
    description: 'Bold and creative portfolio website for a design studio with immersive animations.',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
    category: 'web',
    tags: ['Web Design', 'Animation', 'Creative'],
    clientName: 'Artisan Studio',
    projectUrl: 'https://example.com',
    date: '2024-05-12',
    featured: true,
    views: 1100,
    likes: 92,
  },
  {
    id: '6',
    title: 'HEALTH TRACKER',
    subtitle: 'App Design & Prototype',
    description: 'Health and wellness tracking app with personalized insights and gamification.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    category: 'mobile',
    tags: ['Health', 'Mobile', 'Gamification'],
    date: '2024-06-18',
    featured: false,
    views: 567,
    likes: 51,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tous', labelEn: 'All' },
  { id: 'branding', label: 'Branding', labelEn: 'Branding' },
  { id: 'web', label: 'Web Design', labelEn: 'Web Design' },
  { id: 'product', label: 'Product', labelEn: 'Product' },
  { id: 'mobile', label: 'Mobile', labelEn: 'Mobile' },
  { id: 'ecommerce', label: 'E-commerce', labelEn: 'E-commerce' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

interface PortfolioCardProps {
  project: PortfolioProject;
  onView: (project: PortfolioProject) => void;
  onEdit: (project: PortfolioProject) => void;
  onDelete: (project: PortfolioProject) => void;
  viewMode: ViewMode;
}

function PortfolioCard({ project, onView, onEdit, onDelete, viewMode }: PortfolioCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group bg-card border border-default rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-300"
      >
        <div className="flex items-center gap-6 p-4">
          {/* Thumbnail */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
            <img
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-primary font-bold text-sm uppercase tracking-wider truncate">
              {project.title}
            </h3>
            <p className="text-secondary text-sm font-light mt-1 truncate">
              {project.subtitle}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-accent-light text-accent rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-muted text-sm">
            <span className="flex items-center gap-1">
              <IconEye size={16} /> {project.views}
            </span>
            <span className="flex items-center gap-1">
              <IconHeart size={16} /> {project.likes}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(project)}
              className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors"
            >
              <IconEye size={18} />
            </button>
            <button
              onClick={() => onEdit(project)}
              className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors"
            >
              <IconEdit size={18} />
            </button>
            <button
              onClick={() => onDelete(project)}
              className="p-2 rounded-lg bg-danger-bg text-danger hover:bg-danger hover:text-white transition-colors"
            >
              <IconTrash size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Masonry / Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="group relative rounded-2xl overflow-hidden bg-card border border-default hover:border-accent/30 transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={project.imageUrl}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Overlay on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-5"
            >
              {/* Quick Actions */}
              <div className="absolute top-4 right-4 flex gap-2">
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => onView(project)}
                  className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all"
                >
                  <IconEye size={18} />
                </motion.button>
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => onEdit(project)}
                  className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all"
                >
                  <IconEdit size={18} />
                </motion.button>
                {project.projectUrl && (
                  <motion.a
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    href={project.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all"
                  >
                    <IconExternalLink size={18} />
                  </motion.a>
                )}
              </div>

              {/* Like button */}
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25 }}
                onClick={() => setIsLiked(!isLiked)}
                className="absolute top-4 left-4 p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white hover:text-rose-500 transition-all"
              >
                {isLiked ? (
                  <IconHeartFilled size={18} className="text-rose-500" />
                ) : (
                  <IconHeart size={18} />
                )}
              </motion.button>

              {/* Description on hover */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/80 text-sm leading-relaxed line-clamp-2"
              >
                {project.description}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Featured Badge */}
        {project.featured && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full uppercase tracking-wider">
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title - Bold, Uppercase */}
        <h3 className="text-primary font-extrabold text-base uppercase tracking-wider leading-tight">
          {project.title}
        </h3>
        
        {/* Subtitle - Light */}
        <p className="text-secondary font-light text-sm mt-1.5 leading-relaxed">
          {project.subtitle}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-medium bg-accent-light text-accent rounded-full hover:bg-accent hover:text-white transition-colors cursor-pointer"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-default">
          <span className="flex items-center gap-1.5 text-muted text-sm">
            <IconEye size={16} className="text-secondary" />
            <span>{project.views.toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted text-sm">
            <IconHeart size={16} className="text-secondary" />
            <span>{project.likes}</span>
          </span>
          {project.clientName && (
            <span className="ml-auto text-muted text-xs font-medium uppercase tracking-wide">
              {project.clientName}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ADD/EDIT MODAL
// ============================================================================

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: PortfolioProject | null;
  onSave: (project: Partial<PortfolioProject>) => void;
}

function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: project?.title || '',
    subtitle: project?.subtitle || '',
    description: project?.description || '',
    imageUrl: project?.imageUrl || '',
    category: project?.category || 'web',
    tags: project?.tags?.join(', ') || '',
    clientName: project?.clientName || '',
    projectUrl: project?.projectUrl || '',
    featured: project?.featured || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
        className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-card border border-default rounded-2xl shadow-2xl m-4"
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border-2 border-dashed border-default hover:border-accent/50 transition-colors group cursor-pointer">
            {formData.imageUrl ? (
              <>
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <IconUpload size={32} className="text-white" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
                <IconPhoto size={48} className="mb-2" />
                <span className="text-sm">{t('portfolio_upload_image')}</span>
              </div>
            )}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('portfolio_image_url')}
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors"
              placeholder="https://..."
            />
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors uppercase font-bold tracking-wide"
                placeholder="PROJET NAME"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_subtitle')}
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors"
                placeholder="Brand Identity & Web Design"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('portfolio_description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors resize-none"
              placeholder={t('portfolio_description_placeholder')}
            />
          </div>

          {/* Category & Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary focus:outline-none focus:border-accent transition-colors"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('portfolio_client')}
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors"
                placeholder="Client Name"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              <IconTag size={16} className="inline mr-1" />
              {t('portfolio_tags')}
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors"
              placeholder="Branding, UI/UX, Web Design"
            />
            <p className="text-xs text-muted mt-1">{t('portfolio_tags_hint')}</p>
          </div>

          {/* Project URL */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              <IconLink size={16} className="inline mr-1" />
              {t('portfolio_project_url')}
            </label>
            <input
              type="url"
              value={formData.projectUrl}
              onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
              className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors"
              placeholder="https://..."
            />
          </div>

          {/* Featured */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-5 h-5 rounded border-input bg-input text-accent focus:ring-accent focus:ring-offset-0"
            />
            <span className="text-sm text-secondary">{t('portfolio_featured')}</span>
          </label>

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
// DETAIL MODAL
// ============================================================================

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: PortfolioProject | null;
}

function DetailModal({ isOpen, onClose, project }: DetailModalProps) {
  const { t } = useLanguage();

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden bg-card rounded-3xl shadow-2xl m-4"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <IconX size={24} />
        </button>

        <div className="flex flex-col lg:flex-row h-full max-h-[95vh]">
          {/* Image */}
          <div className="lg:w-3/5 relative">
            <img
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-64 lg:h-full object-cover"
            />
            {project.featured && (
              <div className="absolute top-4 left-4 px-4 py-1.5 bg-accent text-white text-sm font-semibold rounded-full uppercase tracking-wider">
                Featured
              </div>
            )}
          </div>

          {/* Content */}
          <div className="lg:w-2/5 p-8 overflow-y-auto">
            <h2 className="text-3xl font-black text-primary uppercase tracking-wider">
              {project.title}
            </h2>
            <p className="text-xl text-secondary font-light mt-2">
              {project.subtitle}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-6">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 text-sm font-medium bg-accent-light text-accent rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-secondary mt-6 leading-relaxed">
              {project.description}
            </p>

            {/* Meta */}
            <div className="mt-8 space-y-3">
              {project.clientName && (
                <div className="flex items-center gap-3 text-muted">
                  <span className="text-sm uppercase tracking-wide font-medium">{t('portfolio_client')}:</span>
                  <span className="text-primary">{project.clientName}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted">
                <IconCalendar size={18} />
                <span>{new Date(project.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-default">
              <span className="flex items-center gap-2 text-secondary">
                <IconEye size={20} />
                <span className="font-semibold">{project.views.toLocaleString()}</span>
                <span className="text-muted text-sm">views</span>
              </span>
              <span className="flex items-center gap-2 text-secondary">
                <IconHeart size={20} />
                <span className="font-semibold">{project.likes}</span>
                <span className="text-muted text-sm">likes</span>
              </span>
            </div>

            {/* Actions */}
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
              >
                <IconExternalLink size={20} />
                {t('portfolio_view_project')}
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PortfolioPage() {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<PortfolioProject[]>(MOCK_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [viewingProject, setViewingProject] = useState<PortfolioProject | null>(null);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [projects, searchQuery, selectedCategory]);

  // Handlers
  const handleView = (project: PortfolioProject) => setViewingProject(project);
  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project);
    setIsModalOpen(true);
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
        imageUrl: data.imageUrl || '',
        category: data.category || 'web',
        tags: data.tags || [],
        clientName: data.clientName,
        projectUrl: data.projectUrl,
        date: new Date().toISOString(),
        featured: data.featured || false,
        views: 0,
        likes: 0,
      };
      setProjects([newProject, ...projects]);
    }
    setIsModalOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t('portfolio')}</h1>
          <p className="text-secondary mt-1">{t('portfolio_subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors self-start sm:self-auto"
        >
          <IconPlus size={20} />
          {t('portfolio_add_project')}
        </button>
      </div>
      {/* Filters Bar */}
      <div className="mb-8 space-y-4">
        {/* Search & View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <IconSearch size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('portfolio_search')}
              className="w-full pl-12 pr-4 py-3 bg-card border border-default rounded-xl text-primary placeholder-placeholder focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-card border border-default rounded-xl">
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-2.5 rounded-lg transition-colors ${
                viewMode === 'masonry'
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-primary hover:bg-hover'
              }`}
              title="Masonry"
            >
              <IconGridDots size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-primary hover:bg-hover'
              }`}
              title="List"
            >
              <IconLayoutList size={20} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === cat.id
                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                  : 'bg-card border border-default text-secondary hover:border-accent/50 hover:text-primary'
              }`}
            >
              {language === 'en' ? cat.labelEn : cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center mb-4">
            <IconPhoto size={40} className="text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">{t('portfolio_empty')}</h3>
          <p className="text-secondary mb-6">{t('portfolio_empty_desc')}</p>
          <button
            onClick={() => {
              setEditingProject(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
          >
            <IconPlus size={20} />
            {t('portfolio_add_first')}
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <PortfolioCard
              key={project.id}
              project={project}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <PortfolioCard
              key={project.id}
              project={project}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <ProjectModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingProject(null);
            }}
            project={editingProject}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProject && (
          <DetailModal
            isOpen={!!viewingProject}
            onClose={() => setViewingProject(null)}
            project={viewingProject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

