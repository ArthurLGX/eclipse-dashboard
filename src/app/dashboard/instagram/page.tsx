'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlus,
  IconCalendar,
  IconPhoto,
  IconVideo,
  IconClock,
  IconHeart,
  IconMessageCircle,
  IconSend,
  IconBookmark,
  IconDots,
  IconX,
  IconMusic,
  IconHash,
  IconTrash,
  IconEdit,
  IconGrid3x3,
  IconLayoutList,
  IconPlayerPlay,
  IconCamera,
  IconSparkles,
  IconCheck,
  IconUpload,
  IconGripVertical,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconRefresh,
  IconBrandInstagram,
  IconLink,
  IconLinkOff,
  IconRocket,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import MediaPickerModal from '@/app/components/MediaPickerModal';
import {
  fetchInstagramPosts,
  createInstagramPost,
  updateInstagramPost,
  deleteInstagramPost,
  publishInstagramPost,
  getInstagramConfig,
  getInstagramAuthUrl,
  instagramOAuthCallback,
  disconnectInstagram,
  syncInstagramStats,
  type InstagramConfig,
} from '@/lib/api';
import type { 
  InstagramPost as ApiInstagramPost, 
  InstagramPostType, 
  InstagramPostStatus,
  CreateInstagramPostData,
} from '@/types';

// Type local pour le composant (mapping depuis l'API)
interface LocalInstagramPost {
  id: string;
  documentId: string;
  type: InstagramPostType;
  mediaUrls: string[];
  caption: string;
  hashtags: string[];
  music?: {
    title: string;
    artist: string;
  };
  scheduledAt?: Date;
  status: InstagramPostStatus;
  likes?: number;
  comments?: number;
  createdAt: Date;
}

// Fonction pour convertir un post API en post local
const apiToLocalPost = (post: ApiInstagramPost): LocalInstagramPost => ({
  id: String(post.id),
  documentId: post.documentId,
  type: post.post_type,
  mediaUrls: post.media_urls || [],
  caption: post.caption || '',
  hashtags: post.hashtags || [],
  music: post.music,
  scheduledAt: post.scheduled_at ? new Date(post.scheduled_at) : undefined,
  status: post.post_status,
  likes: post.likes_count,
  comments: post.comments_count,
  createdAt: new Date(post.createdAt),
});

// Fonction pour convertir un post local en données de création API
const localToApiData = (post: Partial<LocalInstagramPost>): CreateInstagramPostData => ({
  post_type: post.type || 'post',
  media_urls: post.mediaUrls,
  caption: post.caption,
  hashtags: post.hashtags,
  music: post.music,
  scheduled_at: post.scheduledAt?.toISOString(),
  post_status: post.status || 'draft',
});

// Hashtags populaires suggérés
const SUGGESTED_HASHTAGS = [
  'design', 'webdesign', 'uidesign', 'uxdesign', 'graphicdesign',
  'freelance', 'creative', 'branding', 'logo', 'illustration',
  'photography', 'art', 'digital', 'inspiration', 'portfolio',
  'entrepreneur', 'smallbusiness', 'startup', 'motivation', 'work',
];

// Musiques populaires (simulation)
const POPULAR_MUSIC = [
  { title: 'Blinding Lights', artist: 'The Weeknd' },
  { title: 'Levitating', artist: 'Dua Lipa' },
  { title: 'Flowers', artist: 'Miley Cyrus' },
  { title: 'As It Was', artist: 'Harry Styles' },
  { title: 'Anti-Hero', artist: 'Taylor Swift' },
  { title: 'Vampire', artist: 'Olivia Rodrigo' },
  { title: 'Unholy', artist: 'Sam Smith' },
  { title: 'Kill Bill', artist: 'SZA' },
];

export default function InstagramPlannerPage() {
  return (
    <ProtectedRoute>
      <InstagramPlanner />
    </ProtectedRoute>
  );
}

function InstagramPlanner() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State
  const [posts, setPosts] = useState<LocalInstagramPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<LocalInstagramPost | null>(null);
  const [editingPost, setEditingPost] = useState<Partial<LocalInstagramPost> | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [previewType, setPreviewType] = useState<'feed' | 'story' | 'reel'>('feed');
  
  // Instagram connection state
  const [instagramConfig, setInstagramConfig] = useState<InstagramConfig | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      router.replace('/dashboard/instagram');
      return;
    }

    if (code && !isProcessingCallback) {
      setIsProcessingCallback(true);
      setIsConnecting(true);
      
      // Get stored state from sessionStorage for CSRF protection
      const storedState = sessionStorage.getItem('instagram_oauth_state');
      
      instagramOAuthCallback(code, state || storedState || '')
        .then((response) => {
          // Refresh config to get full data
          loadInstagramConfig();
          setSuccess(`Compte Instagram @${response.data.instagram_username} connecté avec succès !`);
          setTimeout(() => setSuccess(null), 5000);
          // Clean stored state
          sessionStorage.removeItem('instagram_oauth_state');
        })
        .catch((err) => {
          console.error('Error handling Instagram callback:', err);
          setError('Erreur lors de la connexion à Instagram. Veuillez réessayer.');
        })
        .finally(() => {
          setIsConnecting(false);
          setIsProcessingCallback(false);
          // Clean URL
          router.replace('/dashboard/instagram');
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, isProcessingCallback]);

  // Charger les posts depuis Strapi
  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiPosts = await fetchInstagramPosts();
      setPosts(apiPosts.map(apiToLocalPost));
    } catch (err: unknown) {
      console.error('Error loading posts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        setError('API Instagram non accessible. Vérifiez les permissions Strapi (Settings > Roles > Authenticated > instagram-post)');
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        setError('Non autorisé. Veuillez vous reconnecter.');
      } else {
        setError(`Erreur: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger la config Instagram
  const loadInstagramConfig = useCallback(async () => {
    try {
      const response = await getInstagramConfig();
      setInstagramConfig(response.data);
    } catch (err) {
      console.error('Error loading Instagram config:', err);
    }
  }, []);

  // Charger les posts et la config au montage
  useEffect(() => {
    loadPosts();
    loadInstagramConfig();
  }, [loadPosts, loadInstagramConfig]);

  // Connecter Instagram
  const handleConnectInstagram = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { authUrl, state } = await getInstagramAuthUrl();
      // Store state for CSRF protection
      sessionStorage.setItem('instagram_oauth_state', state);
      // Redirect to Facebook OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error getting auth URL:', err);
      setError('Erreur lors de la connexion à Instagram. Vérifiez que l\'API Strapi est configurée.');
      setIsConnecting(false);
    }
  }, []);

  // Déconnecter Instagram
  const handleDisconnectInstagram = useCallback(async () => {
    if (!confirm('Voulez-vous vraiment déconnecter votre compte Instagram ?')) return;
    
    try {
      await disconnectInstagram();
      setInstagramConfig(null);
    } catch (err) {
      console.error('Error disconnecting Instagram:', err);
      setError('Erreur lors de la déconnexion');
    }
  }, []);

  // Synchroniser les stats
  const handleSyncStats = useCallback(async () => {
    try {
      const response = await syncInstagramStats();
      if (instagramConfig) {
        setInstagramConfig({
          ...instagramConfig,
          followers_count: response.data.followers_count,
          following_count: response.data.following_count,
          media_count: response.data.media_count,
        });
      }
    } catch (err) {
      console.error('Error syncing stats:', err);
      setError('Erreur lors de la synchronisation');
    }
  }, [instagramConfig]);

  // Publier un post sur Instagram
  const handlePublishPost = useCallback(async (documentId: string) => {
    if (!instagramConfig?.is_connected) {
      setError('Veuillez connecter votre compte Instagram d\'abord');
      return;
    }

    if (!confirm('Publier ce post sur Instagram maintenant ?')) return;

    setIsPublishing(true);
    try {
      const result = await publishInstagramPost(documentId);
      
      // Mettre à jour le post localement
      setPosts(prev => prev.map(p => 
        p.documentId === documentId 
          ? { ...p, status: 'published' as const }
          : p
      ));
      
      // Ouvrir le lien Instagram
      if (result.permalink) {
        window.open(result.permalink, '_blank');
      }
    } catch (err: unknown) {
      console.error('Error publishing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur: ${errorMessage}`);
    } finally {
      setIsPublishing(false);
    }
  }, [instagramConfig]);

  // Filtrer les posts
  const filteredPosts = useMemo(() => {
    if (filterStatus === 'all') return posts;
    return posts.filter(p => p.status === filterStatus);
  }, [posts, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: posts.length,
    drafts: posts.filter(p => p.status === 'draft').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    totalLikes: posts.reduce((sum, p) => sum + (p.likes || 0), 0),
    totalComments: posts.reduce((sum, p) => sum + (p.comments || 0), 0),
  }), [posts]);

  // Ouvrir le modal de création
  const openCreateModal = useCallback((type: InstagramPostType = 'post') => {
    setEditingPost({
      type,
      mediaUrls: [],
      caption: '',
      hashtags: [],
      status: 'draft',
    });
    setShowCreateModal(true);
  }, []);

  // Ouvrir le modal d'édition
  const openEditModal = useCallback((post: LocalInstagramPost) => {
    setEditingPost({ ...post });
    setShowCreateModal(true);
  }, []);

  // Ouvrir le preview
  const openPreview = useCallback((post: LocalInstagramPost) => {
    setSelectedPost(post);
    setPreviewType(post.type === 'story' ? 'story' : post.type === 'reel' ? 'reel' : 'feed');
    setShowPreviewModal(true);
  }, []);

  // Sauvegarder un post (création ou mise à jour via API)
  const savePost = useCallback(async () => {
    if (!editingPost) return;

    setIsSaving(true);
    setError(null);

    try {
      const apiData = localToApiData(editingPost);

      if (editingPost.documentId) {
        // Mise à jour
        const updatedPost = await updateInstagramPost(editingPost.documentId, apiData);
        setPosts(prev => prev.map(p => 
          p.documentId === editingPost.documentId ? apiToLocalPost(updatedPost) : p
        ));
      } else {
        // Création
        const newPost = await createInstagramPost(apiData);
        setPosts(prev => [apiToLocalPost(newPost), ...prev]);
      }

      setShowCreateModal(false);
      setEditingPost(null);
    } catch (err: unknown) {
      console.error('Error saving post:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        setError('API non accessible. Vérifiez les permissions Strapi pour instagram-post (create/update)');
      } else {
        setError(`Erreur: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editingPost]);

  // Supprimer un post via API
  const handleDeletePost = useCallback(async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) return;

    try {
      await deleteInstagramPost(documentId);
      setPosts(prev => prev.filter(p => p.documentId !== documentId));
      setShowCreateModal(false);
      setEditingPost(null);
    } catch (err: unknown) {
      console.error('Error deleting post:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur: ${errorMessage}`);
    }
  }, []);

  // Ajouter un média
  const handleMediaSelect = useCallback((url: string) => {
    if (editingPost) {
      setEditingPost((prev) => ({
        ...prev,
        mediaUrls: [...(prev?.mediaUrls || []), url],
      }));
    }
    setShowMediaPicker(false);
  }, [editingPost]);

  // Supprimer un média
  const removeMedia = useCallback((index: number) => {
    if (editingPost) {
      setEditingPost(prev => ({
        ...prev,
        mediaUrls: prev?.mediaUrls?.filter((_, i) => i !== index) || [],
      }));
    }
  }, [editingPost]);

  // Ajouter un hashtag
  const addHashtag = useCallback((tag: string) => {
    if (!editingPost) return;
    const cleanTag = tag.replace(/^#/, '').toLowerCase();
    if (!editingPost.hashtags?.includes(cleanTag)) {
      setEditingPost(prev => ({
        ...prev,
        hashtags: [...(prev?.hashtags || []), cleanTag],
      }));
    }
  }, [editingPost]);

  // Supprimer un hashtag
  const removeHashtag = useCallback((tag: string) => {
    if (editingPost) {
      setEditingPost(prev => ({
        ...prev,
        hashtags: prev?.hashtags?.filter(t => t !== tag) || [],
      }));
    }
  }, [editingPost]);

  // Affichage du chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 className="w-12 h-12 !text-accent animate-spin mx-auto mb-4" />
          <p className="text-muted">Chargement des posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-6">
      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-danger-light border border-danger !text-danger px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-danger hover:!text-danger/80">
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-success-light border border-success !text-success-text -text px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <IconCheck className="w-5 h-5" />
              {success}
            </span>
            <button onClick={() => setSuccess(null)} className="text-success hover:!text-success/80">
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Connecting Overlay */}
      {isConnecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4">
            <IconLoader2 className="w-12 h-12 !text-accent animate-spin" />
            <p className="text-primary font-medium">Connexion à Instagram en cours...</p>
            <p className="text-secondary !text-sm">Vous allez être redirigé vers Facebook</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold !text-primary flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl">
                <IconCamera className="w-6 h-6 !text-white" />
              </div>
              {t('instagram_planner') || 'Instagram Planner'}
            </h1>
            <p className="text-secondary mt-1">
              {t('instagram_planner_desc') || 'Planifiez et prévisualisez vos posts Instagram'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Refresh button */}
            <button
              onClick={loadPosts}
              disabled={isLoading}
              className="p-2 !text-muted hover:!text-primary hover:bg-hover rounded-lg transition-colors"
              title="Rafraîchir"
            >
              <IconRefresh className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Filtres */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 bg-card border border-default rounded-lg !text-sm"
            >
              <option value="all">{t('all') || 'Tous'} ({stats.total})</option>
              <option value="draft">{t('drafts') || 'Brouillons'} ({stats.drafts})</option>
              <option value="scheduled">{t('scheduled') || 'Planifiés'} ({stats.scheduled})</option>
              <option value="published">{t('published') || 'Publiés'} ({stats.published})</option>
            </select>

            {/* Vue */}
            <div className="flex items-center bg-card border border-default rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-accent !text-white' : 'text-muted hover:!text-primary'}`}
              >
                <IconGrid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-accent !text-white' : 'text-muted hover:!text-primary'}`}
              >
                <IconLayoutList className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 transition-colors ${viewMode === 'calendar' ? 'bg-accent !text-white' : 'text-muted hover:!text-primary'}`}
              >
                <IconCalendar className="w-5 h-5" />
              </button>
            </div>

            {/* Nouveau post */}
            <div className="relative group">
              <button
                onClick={() => openCreateModal('post')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 !text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <IconPlus className="w-5 h-5" />
                <span className="hidden sm:inline">{t('new_post') || 'Nouveau post'}</span>
              </button>
              
              {/* Dropdown pour types */}
              <div className="absolute right-0 top-full mt-2 bg-card border border-default rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[180px]">
                <button
                  onClick={() => openCreateModal('post')}
                  className="w-full flex items-center gap-3 px-4 py-3 !text-left hover:bg-hover transition-colors"
                >
                  <IconPhoto className="w-5 h-5 !text-accent" />
                  <span>Post</span>
                </button>
                <button
                  onClick={() => openCreateModal('carousel')}
                  className="w-full flex items-center gap-3 px-4 py-3 !text-left hover:bg-hover transition-colors"
                >
                  <IconGrid3x3 className="w-5 h-5 !text-blue-500" />
                  <span>Carousel</span>
                </button>
                <button
                  onClick={() => openCreateModal('reel')}
                  className="w-full flex items-center gap-3 px-4 py-3 !text-left hover:bg-hover transition-colors"
                >
                  <IconVideo className="w-5 h-5 !text-pink-500" />
                  <span>Reel</span>
                </button>
                <button
                  onClick={() => openCreateModal('story')}
                  className="w-full flex items-center gap-3 px-4 py-3 !text-left hover:bg-hover transition-colors"
                >
                  <IconPlayerPlay className="w-5 h-5 !text-orange-500" />
                  <span>Story</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-card border border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-light rounded-lg">
                <IconPhoto className="w-5 h-5 !text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold !text-primary">{stats.total}</p>
                <p className="!text-xs !text-muted">{t('total_posts') || 'Posts total'}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-light rounded-lg">
                <IconClock className="w-5 h-5 !text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold !text-primary">{stats.scheduled}</p>
                <p className="!text-xs !text-muted">{t('scheduled') || 'Planifiés'}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-danger-light rounded-lg">
                <IconHeart className="w-5 h-5 !text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold !text-primary">{stats.totalLikes}</p>
                <p className="!text-xs !text-muted">{t('total_likes') || 'Likes total'}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-light rounded-lg">
                <IconMessageCircle className="w-5 h-5 !text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold !text-primary">{stats.totalComments}</p>
                <p className="!text-xs !text-muted">{t('total_comments') || 'Commentaires'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feed Preview (Instagram Grid) */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-default rounded-2xl overflow-hidden">
              {/* Instagram Profile Header */}
              <div className="p-4 border-b border-default">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                      <span className="text-2xl font-bold !text-primary">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold !text-primary !text-lg">
                      @{user?.username || 'votre_compte'}
                    </h2>
                    <div className="flex items-center gap-6 mt-2 !text-sm">
                      <div>
                        <span className="font-semibold !text-primary">{stats.published}</span>
                        <span className="text-muted ml-1">posts</span>
                      </div>
                      <div>
                        <span className="font-semibold !text-primary">1.2k</span>
                        <span className="text-muted ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-semibold !text-primary">350</span>
                        <span className="text-muted ml-1">following</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instagram Grid */}
              <div className="grid grid-cols-3 gap-0.5 bg-default">
                {filteredPosts.slice(0, 9).map((post, index) => (
                  <motion.div
                    key={post.documentId || post.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative aspect-square bg-card group cursor-pointer overflow-hidden"
                    onClick={() => openPreview(post)}
                  >
                    {post.mediaUrls[0] ? (
                      <img
                        src={post.mediaUrls[0]}
                        alt={post.caption}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <IconPhoto className="w-8 h-8 !text-muted" />
                      </div>
                    )}

                    {/* Type indicator */}
                    {post.type === 'reel' && (
                      <div className="absolute top-2 right-2">
                        <IconVideo className="w-5 h-5 !text-white drop-shadow-lg" />
                      </div>
                    )}
                    {post.type === 'carousel' && (
                      <div className="absolute top-2 right-2">
                        <IconGrid3x3 className="w-5 h-5 !text-white drop-shadow-lg" />
                      </div>
                    )}

                    {/* Status badge */}
                    {post.status !== 'published' && (
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded !text-xs font-medium ${
                        post.status === 'draft' ? 'bg-gray-500 !text-white' : 'bg-amber-500 !text-white'
                      }`}>
                        {post.status === 'draft' ? 'Brouillon' : 'Planifié'}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      {post.likes !== undefined && (
                        <div className="flex items-center gap-1 !text-white">
                          <IconHeart className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.likes}</span>
                        </div>
                      )}
                      {post.comments !== undefined && (
                        <div className="flex items-center gap-1 !text-white">
                          <IconMessageCircle className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.comments}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Placeholder pour ajouter des posts */}
                {filteredPosts.length < 9 && Array.from({ length: Math.min(9 - filteredPosts.length, 9) }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="aspect-square bg-card border-2 border-dashed border-default flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
                    onClick={() => openCreateModal('post')}
                  >
                    <IconPlus className="w-8 h-8 !text-muted" />
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {posts.length === 0 && (
                <div className="p-12 !text-center">
                  <IconPhoto className="w-16 h-16 !text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold !text-primary mb-2">Aucun post</h3>
                  <p className="text-muted mb-4">Commencez à créer vos posts Instagram</p>
                  <button
                    onClick={() => openCreateModal('post')}
                    className="px-4 py-2 bg-accent !text-white rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Créer un post
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Stories & Scheduled */}
          <div className="space-y-6">
            {/* Stories Preview */}
            <div className="bg-card border border-default rounded-2xl p-4">
              <h3 className="font-semibold !text-primary mb-4 flex items-center gap-2">
                <IconPlayerPlay className="w-5 h-5 !text-orange-500" />
                {t('stories') || 'Stories'}
              </h3>
              
              <div className="flex gap-3 overflow-x-auto pb-2">
                {/* Add story button */}
                <button
                  onClick={() => openCreateModal('story')}
                  className="flex-shrink-0 flex flex-col items-center gap-1"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent flex items-center justify-center">
                    <IconPlus className="w-6 h-6 !text-accent" />
                  </div>
                  <span className="!text-xs !text-muted">Ajouter</span>
                </button>

                {/* Story items */}
                {posts.filter(p => p.type === 'story').slice(0, 5).map((story) => (
                  <button
                    key={story.documentId || story.id}
                    onClick={() => openPreview(story)}
                    className="flex-shrink-0 flex flex-col items-center gap-1"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
                      {story.mediaUrls[0] ? (
                        <img
                          src={story.mediaUrls[0]}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-muted" />
                      )}
                    </div>
                    <span className="!text-xs !text-muted truncate max-w-[64px]">
                      {story.status === 'scheduled' ? 'Planifié' : 'Story'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduled Posts */}
            <div className="bg-card border border-default rounded-2xl p-4">
              <h3 className="font-semibold !text-primary mb-4 flex items-center gap-2">
                <IconClock className="w-5 h-5 !text-amber-500" />
                {t('upcoming_posts') || 'Posts à venir'}
              </h3>

              <div className="space-y-3">
                {posts.filter(p => p.status === 'scheduled').slice(0, 5).map((post) => (
                  <div
                    key={post.documentId || post.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => openPreview(post)}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {post.mediaUrls[0] ? (
                        <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <IconPhoto className="w-5 h-5 !text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm !text-primary truncate">{post.caption || 'Sans légende'}</p>
                      <p className="!text-xs !text-muted flex items-center gap-1">
                        <IconCalendar className="w-3 h-3" />
                        {post.scheduledAt?.toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(post);
                      }}
                      className="p-1 !text-muted hover:!text-primary"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {posts.filter(p => p.status === 'scheduled').length === 0 && (
                  <p className="text-sm !text-muted !text-center py-4">
                    Aucun post planifié
                  </p>
                )}
              </div>
            </div>

            {/* Instagram Connection Card */}
            <div className="bg-card border border-default rounded-2xl p-4">
              <h3 className="font-semibold !text-primary mb-4 flex items-center gap-2">
                <IconBrandInstagram className="w-5 h-5 !text-pink-500" />
                Compte Instagram
              </h3>

              {instagramConfig?.is_connected ? (
                <div className="space-y-4">
                  {/* Connected account info */}
                  <div className="flex items-center gap-3">
                    {instagramConfig.profile_picture_url ? (
                      <img 
                        src={instagramConfig.profile_picture_url} 
                        alt={instagramConfig.instagram_username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {instagramConfig.instagram_username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium !text-primary truncate">
                        @{instagramConfig.instagram_username}
                      </p>
                      <p className="!text-xs !text-muted">
                        {instagramConfig.instagram_account_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-success-light !text-success-text -text !text-xs rounded-full">
                      <IconCheck className="w-3 h-3" />
                      Connecté
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 !text-center">
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold !text-primary">{instagramConfig.media_count}</p>
                      <p className="!text-xs !text-muted">Posts</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold !text-primary">
                        {instagramConfig.followers_count >= 1000 
                          ? `${(instagramConfig.followers_count / 1000).toFixed(1)}k` 
                          : instagramConfig.followers_count}
                      </p>
                      <p className="!text-xs !text-muted">Followers</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold !text-primary">{instagramConfig.following_count}</p>
                      <p className="!text-xs !text-muted">Suivis</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSyncStats}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 !text-sm !text-muted hover:!text-primary border border-default rounded-lg hover:bg-hover transition-colors"
                    >
                      <IconRefresh className="w-4 h-4" />
                      Sync
                    </button>
                    <button
                      onClick={handleDisconnectInstagram}
                      className="flex items-center justify-center gap-2 px-3 py-2 !text-sm !text-danger hover:bg-danger-light border border-default rounded-lg transition-colors"
                    >
                      <IconLinkOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm !text-muted">
                    Connectez votre compte Instagram Business pour publier directement depuis Eclipse.
                  </p>
                  
                  <button
                    onClick={handleConnectInstagram}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 !text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <IconLoader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <IconLink className="w-5 h-5" />
                    )}
                    Connecter Instagram
                  </button>

                  <div className="!text-xs !text-muted space-y-1">
                    <p>⚠️ Prérequis :</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>Compte Instagram Business ou Creator</li>
                      <li>Page Facebook liée au compte</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-400/10 border border-accent rounded-2xl p-4">
              <h3 className="font-semibold !text-primary mb-3 flex items-center gap-2">
                <IconSparkles className="w-5 h-5 !text-accent" />
                Conseils
              </h3>
              <ul className="space-y-2 !text-sm !text-secondary">
                <li className="flex items-start gap-2">
                  <IconCheck className="w-4 h-4 !text-success-text -text flex-shrink-0 mt-0.5" />
                  Publiez entre 18h et 21h pour plus d&apos;engagement
                </li>
                <li className="flex items-start gap-2">
                  <IconCheck className="w-4 h-4 !text-success-text -text flex-shrink-0 mt-0.5" />
                  Utilisez 5-10 hashtags pertinents
                </li>
                <li className="flex items-start gap-2">
                  <IconCheck className="w-4 h-4 !text-success-text -text flex-shrink-0 mt-0.5" />
                  Alternez entre posts, reels et stories
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && editingPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-default rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-default">
                <h2 className="text-lg font-semibold !text-primary">
                  {editingPost.documentId ? 'Modifier le post' : `Nouveau ${editingPost.type}`}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 !text-muted hover:!text-primary rounded-lg hover:bg-hover"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 max-h-[calc(90vh-140px)] overflow-y-auto">
                {/* Left - Media */}
                <div className="p-4 border-r border-default">
                  <label className="block !text-sm font-medium !text-secondary mb-3">
                    Médias ({editingPost.mediaUrls?.length || 0}/10)
                  </label>

                  {/* Media Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {editingPost.mediaUrls?.map((url, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeMedia(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 !text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <IconX className="w-3 h-3" />
                        </button>
                        <div className="absolute top-1 left-1 p-1 bg-black/50 !text-white rounded cursor-grab">
                          <IconGripVertical className="w-3 h-3" />
                        </div>
                      </div>
                    ))}

                    {/* Add media button */}
                    {(editingPost.mediaUrls?.length || 0) < 10 && (
                      <button
                        onClick={() => setShowMediaPicker(true)}
                        className="aspect-square border-2 border-dashed border-default rounded-lg flex flex-col items-center justify-center gap-1 !text-muted hover:border-accent hover:!text-accent transition-colors"
                      >
                        <IconUpload className="w-6 h-6" />
                        <span className="!text-xs">Ajouter</span>
                      </button>
                    )}
                  </div>

                  {/* Preview Phone */}
                  <div className="bg-black rounded-[32px] p-3 max-w-[280px] mx-auto">
                    <div className="bg-card rounded-[24px] overflow-hidden">
                      {/* Post header */}
                      <div className="flex items-center gap-2 p-3 border-b border-default">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                        <span className="text-sm font-medium !text-primary">@{user?.username || 'vous'}</span>
                      </div>
                      
                      {/* Media */}
                      <div className="aspect-square bg-muted">
                        {editingPost.mediaUrls?.[0] ? (
                          <img src={editingPost.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconPhoto className="w-12 h-12 !text-muted" />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <IconHeart className="w-6 h-6" />
                            <IconMessageCircle className="w-6 h-6" />
                            <IconSend className="w-6 h-6" />
                          </div>
                          <IconBookmark className="w-6 h-6" />
                        </div>
                        
                        {/* Caption preview */}
                        {editingPost.caption && (
                          <p className="text-sm">
                            <span className="font-medium">{user?.username || 'vous'}</span>{' '}
                            <span className="text-primary">
                              {editingPost.caption.substring(0, 100)}
                              {editingPost.caption.length > 100 && '...'}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right - Details */}
                <div className="p-4 space-y-4">
                  {/* Caption */}
                  <div>
                    <label className="block !text-sm font-medium !text-secondary mb-2">
                      Légende
                    </label>
                    <textarea
                      value={editingPost.caption || ''}
                      onChange={(e) => setEditingPost(prev => ({ ...prev, caption: e.target.value }))}
                      placeholder="Écrivez votre légende..."
                      className="input w-full h-32 resize-none"
                      maxLength={2200}
                    />
                    <p className="!text-xs !text-muted mt-1 !text-right">
                      {editingPost.caption?.length || 0}/2200
                    </p>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="block !text-sm font-medium !text-secondary mb-2">
                      <IconHash className="w-4 h-4 inline mr-1" />
                      Hashtags
                    </label>
                    
                    {/* Selected hashtags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {editingPost.hashtags?.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-accent-light !text-accent !text-sm rounded-full"
                        >
                          #{tag}
                          <button onClick={() => removeHashtag(tag)}>
                            <IconX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Suggested hashtags */}
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTED_HASHTAGS.filter(t => !editingPost.hashtags?.includes(t)).slice(0, 10).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addHashtag(tag)}
                          className="px-2 py-1 !text-xs !text-muted bg-muted rounded-full hover:bg-accent-light hover:!text-accent transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Music (for Reels) */}
                  {(editingPost.type === 'reel' || editingPost.type === 'story') && (
                    <div>
                      <label className="block !text-sm font-medium !text-secondary mb-2">
                        <IconMusic className="w-4 h-4 inline mr-1" />
                        Musique
                      </label>
                      
                      {editingPost.music ? (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <IconMusic className="w-5 h-5 !text-white" />
                            </div>
                            <div>
                              <p className="font-medium !text-primary !text-sm">{editingPost.music.title}</p>
                              <p className="!text-xs !text-muted">{editingPost.music.artist}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingPost(prev => ({ ...prev, music: undefined }))}
                            className="p-1 !text-muted hover:!text-danger"
                          >
                            <IconX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {POPULAR_MUSIC.slice(0, 4).map((music) => (
                            <button
                              key={music.title}
                              onClick={() => setEditingPost(prev => ({ ...prev, music }))}
                              className="flex items-center gap-2 p-2 !text-left bg-muted rounded-lg hover:bg-accent-light transition-colors"
                            >
                              <IconMusic className="w-4 h-4 !text-accent" />
                              <div className="min-w-0">
                                <p className="!text-xs font-medium !text-primary truncate">{music.title}</p>
                                <p className="!text-xs !text-muted truncate">{music.artist}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scheduling */}
                  <div>
                    <label className="block !text-sm font-medium !text-secondary mb-2">
                      <IconCalendar className="w-4 h-4 inline mr-1" />
                      Planification
                    </label>
                    <input
                      type="datetime-local"
                      value={editingPost.scheduledAt ? new Date(editingPost.scheduledAt).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingPost(prev => ({ 
                        ...prev, 
                        scheduledAt: e.target.value ? new Date(e.target.value) : undefined,
                        status: e.target.value ? 'scheduled' : 'draft'
                      }))}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-default">
                <div className="flex items-center gap-2">
                  {editingPost.documentId && (
                    <button
                      onClick={() => handleDeletePost(editingPost.documentId!)}
                      className="px-4 py-2 !text-danger hover:bg-danger-light rounded-lg transition-colors"
                    >
                      <IconTrash className="w-4 h-4 inline mr-1" />
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 !text-muted hover:!text-primary"
                  >
                    Annuler
                  </button>
                  
                  {/* Publish button (only for saved posts with Instagram connected) */}
                  {editingPost.documentId && editingPost.status !== 'published' && instagramConfig?.is_connected && (
                    <button
                      onClick={() => {
                        handlePublishPost(editingPost.documentId!);
                        setShowCreateModal(false);
                      }}
                      disabled={isPublishing || !editingPost.mediaUrls?.length}
                      className="px-4 py-2 bg-success !text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isPublishing ? (
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <IconRocket className="w-4 h-4" />
                      )}
                      Publier
                    </button>
                  )}
                  
                  <button
                    onClick={savePost}
                    disabled={!editingPost.mediaUrls?.length || isSaving}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 !text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <IconLoader2 className="w-4 h-4 animate-spin" />}
                    {editingPost.scheduledAt ? 'Planifier' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedPost && (
          <PostPreviewModal
            post={selectedPost}
            previewType={previewType}
            onClose={() => setShowPreviewModal(false)}
            onEdit={() => {
              setShowPreviewModal(false);
              openEditModal(selectedPost);
            }}
            username={user?.username || 'vous'}
          />
        )}
      </AnimatePresence>

      {/* Media Picker */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        mediaType="image"
        title="Sélectionner une image"
      />

      {/* Calendar View */}
      <AnimatePresence>
        {viewMode === 'calendar' && (
          <CalendarView
            posts={filteredPosts}
            onSelectPost={openPreview}
            onCreatePost={(date) => {
              setEditingPost({
                type: 'post',
                mediaUrls: [],
                caption: '',
                hashtags: [],
                status: 'scheduled',
                scheduledAt: date,
              });
              setShowCreateModal(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant Calendrier
function CalendarView({ 
  posts, 
  onSelectPost, 
  onCreatePost 
}: { 
  posts: LocalInstagramPost[];
  onSelectPost: (post: LocalInstagramPost) => void;
  onCreatePost: (date: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Générer les jours du mois
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lundi = 0
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Jours du mois précédent
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Jours du mois suivant pour compléter la grille
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentMonth]);

  // Posts par jour
  const postsByDate = useMemo(() => {
    const map = new Map<string, LocalInstagramPost[]>();
    posts.forEach(post => {
      const date = post.scheduledAt || post.createdAt;
      const key = date.toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    return map;
  }, [posts]);

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="bg-card border border-default rounded-2xl overflow-hidden mt-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-default">
        <button
          onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
          className="p-2 hover:bg-hover rounded-lg transition-colors"
        >
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold !text-primary">
          {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
          className="p-2 hover:bg-hover rounded-lg transition-colors"
        >
          <IconChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b border-default">
        {weekDays.map(day => (
          <div key={day} className="p-2 !text-center !text-xs font-medium !text-muted">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {daysInMonth.map(({ date, isCurrentMonth }, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const dayPosts = postsByDate.get(dateKey) || [];
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div
              key={index}
              className={`min-h-[100px] border-b border-r border-default p-1 ${
                !isCurrentMonth ? 'bg-hover' : ''
              } ${isToday ? 'bg-accent/5' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${
                  isCurrentMonth ? 'text-primary' : 'text-muted'
                } ${isToday ? 'bg-accent !text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                  {date.getDate()}
                </span>
                {isCurrentMonth && (
                  <button
                    onClick={() => onCreatePost(date)}
                    className="p-0.5 !text-muted hover:!text-accent opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <IconPlus className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              {/* Posts for this day */}
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map(post => (
                  <button
                    key={post.documentId || post.id}
                    onClick={() => onSelectPost(post)}
                    className={`w-full flex items-center gap-1 p-1 rounded !text-xs truncate ${
                      post.status === 'published' 
                        ? 'bg-success-light !text-success-text ' 
                        : post.status === 'scheduled'
                        ? 'bg-warning-light dark !text-warning'
                        : 'bg-muted !text-primary'
                    }`}
                  >
                    {post.type === 'reel' ? (
                      <IconVideo className="w-3 h-3 flex-shrink-0" />
                    ) : post.type === 'story' ? (
                      <IconPlayerPlay className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <IconPhoto className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{post.caption?.substring(0, 15) || 'Sans titre'}</span>
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <span className="!text-xs !text-muted">+{dayPosts.length - 3} autres</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant de prévisualisation
function PostPreviewModal({ 
  post, 
  previewType, 
  onClose, 
  onEdit,
  username 
}: { 
  post: LocalInstagramPost; 
  previewType: 'feed' | 'story' | 'reel';
  onClose: () => void;
  onEdit: () => void;
  username: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 !text-white/70 hover:!text-white"
        >
          <IconX className="w-6 h-6" />
        </button>

        {/* Phone frame */}
        <div className={`bg-black rounded-[40px] p-3 ${
          previewType === 'story' || previewType === 'reel' ? 'w-[320px]' : 'w-[380px]'
        }`}>
          <div className="bg-card rounded-[32px] overflow-hidden">
            {previewType === 'story' || previewType === 'reel' ? (
              // Story/Reel Preview (Full screen)
              <div className="relative aspect-[9/16] bg-black">
                {post.mediaUrls[0] && (
                  <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                )}
                
                {/* Story header */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
                  {/* Progress bars */}
                  <div className="flex gap-1 mb-3">
                    <div className="flex-1 h-0.5 bg-white rounded-full" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    <span className="text-white !text-sm font-medium">{username}</span>
                    <span className="text-white/60 !text-xs">2h</span>
                  </div>
                </div>

                {/* Music */}
                {post.music && (
                  <div className="absolute bottom-20 left-4 flex items-center gap-2 bg-black/30 backdrop-blur px-3 py-2 rounded-full">
                    <IconMusic className="w-4 h-4 !text-white" />
                    <span className="text-white !text-xs">{post.music.title} - {post.music.artist}</span>
                  </div>
                )}

                {/* Caption */}
                {post.caption && (
                  <div className="absolute bottom-4 left-4 right-4 !text-white !text-sm">
                    {post.caption}
                  </div>
                )}
              </div>
            ) : (
              // Feed Preview
              <>
                {/* Post header */}
                <div className="flex items-center justify-between p-3 border-b border-default">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    <span className="text-sm font-medium !text-primary">{username}</span>
                  </div>
                  <IconDots className="w-5 h-5 !text-muted" />
                </div>
                
                {/* Media */}
                <div className="aspect-square bg-muted">
                  {post.mediaUrls[0] && (
                    <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <IconHeart className={`w-6 h-6 ${post.likes ? 'text-red-500 fill-red-500' : ''}`} />
                      <IconMessageCircle className="w-6 h-6" />
                      <IconSend className="w-6 h-6" />
                    </div>
                    <IconBookmark className="w-6 h-6" />
                  </div>

                  {post.likes !== undefined && (
                    <p className="font-semibold !text-sm">{post.likes.toLocaleString()} J&apos;aime</p>
                  )}
                  
                  {post.caption && (
                    <p className="text-sm">
                      <span className="font-medium">{username}</span>{' '}
                      <span className="text-primary">{post.caption}</span>
                    </p>
                  )}

                  {post.hashtags.length > 0 && (
                    <p className="text-sm !text-accent">
                      {post.hashtags.map(t => `#${t}`).join(' ')}
                    </p>
                  )}

                  {post.comments !== undefined && post.comments > 0 && (
                    <p className="text-sm !text-muted">
                      Voir les {post.comments} commentaires
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white !text-black rounded-full hover:bg-white/90 transition-colors"
        >
          <IconEdit className="w-4 h-4" />
          Modifier
        </button>
      </motion.div>
    </motion.div>
  );
}
