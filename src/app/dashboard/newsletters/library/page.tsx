'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPhoto,
  IconVideo,
  IconTrash,
  IconDownload,
  IconCopy,
  IconCheck,
  IconSearch,
  IconFilter,
  IconLoader2,
  IconEye,
  IconX,
  IconFileUnknown,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { fetchUserMedia, deleteMedia, type MediaFile } from '@/lib/api';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type MediaType = 'all' | 'image' | 'video';

export default function MediaLibraryPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MediaType>('all');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Charger les médias
  useEffect(() => {
    const loadMedia = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const files = await fetchUserMedia();
        setMedia(files);
      } catch (error) {
        console.error('Error loading media:', error);
        showGlobalPopup(t('error_loading_media') || 'Erreur lors du chargement des médias', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, [user, showGlobalPopup, t]);

  // Filtrer les médias
  const filteredMedia = useMemo(() => {
    return media.filter(file => {
      // Filtre par type
      if (filterType === 'image' && !file.mime.startsWith('image/')) return false;
      if (filterType === 'video' && !file.mime.startsWith('video/')) return false;
      
      // Filtre par recherche
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
  }, [media, filterType, searchQuery]);

  // Statistiques
  const stats = useMemo(() => {
    const images = media.filter(f => f.mime.startsWith('image/')).length;
    const videos = media.filter(f => f.mime.startsWith('video/')).length;
    const totalSize = media.reduce((acc, f) => acc + f.size, 0);
    
    return { images, videos, total: media.length, totalSize };
  }, [media]);

  // Copier l'URL
  const handleCopyUrl = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedId(file.id);
      showGlobalPopup(t('url_copied') || 'URL copiée !', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showGlobalPopup(t('copy_error') || 'Erreur lors de la copie', 'error');
    }
  };

  // Supprimer un média
  const handleDelete = async (file: MediaFile) => {
    if (!confirm(t('confirm_delete_media') || 'Êtes-vous sûr de vouloir supprimer ce média ?')) {
      return;
    }

    // Utiliser userMediaDocumentId pour la suppression via user-media
    if (!file.userMediaDocumentId) {
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
      return;
    }

    setDeletingId(file.id);
    try {
      await deleteMedia(file.userMediaDocumentId);
      setMedia(prev => prev.filter(m => m.id !== file.id));
      showGlobalPopup(t('media_deleted') || 'Média supprimé', 'success');
      if (selectedMedia?.id === file.id) {
        setSelectedMedia(null);
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Télécharger un média
  const handleDownload = (file: MediaFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formater la taille
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Formater la date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Obtenir l'icône du type
  const getMediaIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <IconPhoto className="w-6 h-6" />;
    if (mime.startsWith('video/')) return <IconVideo className="w-6 h-6" />;
    return <IconFileUnknown className="w-6 h-6" />;
  };

  if (!user) return null;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {t('media_library') || 'Bibliothèque de médias'}
            </h1>
            <p className="text-secondary mt-1">
              {t('media_library_desc') || 'Gérez les images et vidéos utilisées dans vos newsletters'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-light rounded-lg">
                <IconPhoto className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.images}</p>
                <p className="text-sm text-secondary">{t('images') || 'Images'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-light rounded-lg">
                <IconVideo className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.videos}</p>
                <p className="text-sm text-secondary">{t('videos') || 'Vidéos'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-light rounded-lg">
                <IconPhoto className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-sm text-secondary">{t('total_files') || 'Total fichiers'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info-light rounded-lg">
                <IconDownload className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatSize(stats.totalSize)}</p>
                <p className="text-sm text-secondary">{t('storage_used') || 'Espace utilisé'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_media') || 'Rechercher un média...'}
              className="input w-full !pl-10"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <IconFilter className="w-5 h-5 text-secondary" />
            <div className="flex rounded-lg overflow-hidden border border-default">
              {(['all', 'image', 'video'] as MediaType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filterType === type
                      ? 'bg-accent text-white'
                      : 'bg-card text-secondary hover:bg-muted'
                  }`}
                >
                  {type === 'all' && (t('all') || 'Tous')}
                  {type === 'image' && (t('images') || 'Images')}
                  {type === 'video' && (t('videos') || 'Vidéos')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <IconLoader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-default">
            <IconPhoto className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              {t('no_media') || 'Aucun média'}
            </h3>
            <p className="text-secondary">
              {searchQuery || filterType !== 'all'
                ? (t('no_media_filter') || 'Aucun média ne correspond à vos critères')
                : (t('no_media_yet') || 'Vous n\'avez pas encore uploadé de médias')
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-card rounded-xl border border-default overflow-hidden hover:border-accent-light transition-colors"
              >
                {/* Preview */}
                <div 
                  className="aspect-square bg-muted cursor-pointer"
                  onClick={() => setSelectedMedia(file)}
                >
                  {file.mime.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.mime.startsWith('video/') ? (
                    <video
                      src={file.url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      {getMediaIcon(file.mime)}
                    </div>
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMedia(file);
                      }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <IconEye className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(file);
                      }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      {copiedId === file.id ? (
                        <IconCheck className="w-5 h-5 text-success" />
                      ) : (
                        <IconCopy className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                      }}
                      disabled={deletingId === file.id}
                      className="p-2 bg-danger/80 rounded-full hover:bg-[var(--color-danger)] transition-colors"
                    >
                      {deletingId === file.id ? (
                        <IconLoader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <IconTrash className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-primary truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted">{formatSize(file.size)}</span>
                    <span className="text-xs text-muted">{formatDate(file.createdAt)}</span>
                  </div>
                </div>

                {/* Type Badge */}
                <div className="absolute top-2 left-2">
                  <div className={`p-1.5 rounded-lg ${
                    file.mime.startsWith('image/') ? 'bg-accent/90' : 'bg-warning/90'
                  }`}>
                    {file.mime.startsWith('image/') ? (
                      <IconPhoto className="w-4 h-4 text-white" />
                    ) : (
                      <IconVideo className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        <AnimatePresence>
          {selectedMedia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
              onClick={() => setSelectedMedia(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-default">
                  <div className="flex items-center gap-3">
                    {getMediaIcon(selectedMedia.mime)}
                    <div>
                      <h3 className="font-semibold text-primary">{selectedMedia.name}</h3>
                      <p className="text-sm text-secondary">
                        {formatSize(selectedMedia.size)} • {formatDate(selectedMedia.createdAt)}
                        {selectedMedia.width && selectedMedia.height && (
                          <> • {selectedMedia.width}x{selectedMedia.height}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMedia(null)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Preview */}
                <div className="p-4 max-h-[60vh] overflow-auto flex items-center justify-center bg-muted">
                  {selectedMedia.mime.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedMedia.url}
                      alt={selectedMedia.name}
                      className="max-w-full max-h-[55vh] object-contain"
                    />
                  ) : selectedMedia.mime.startsWith('video/') ? (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="max-w-full max-h-[55vh]"
                    />
                  ) : (
                    <div className="text-center text-muted py-20">
                      {getMediaIcon(selectedMedia.mime)}
                      <p className="mt-2">{t('preview_not_available') || 'Aperçu non disponible'}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between p-4 border-t border-default bg-card">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedMedia.url}
                      readOnly
                      className="input text-sm w-64 md:w-96"
                    />
                    <button
                      onClick={() => handleCopyUrl(selectedMedia)}
                      className="btn-secondary px-4 py-2"
                    >
                      {copiedId === selectedMedia.id ? (
                        <IconCheck className="w-4 h-4" />
                      ) : (
                        <IconCopy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(selectedMedia)}
                      className="btn-secondary px-4 py-2 flex items-center gap-2"
                    >
                      <IconDownload className="w-4 h-4" />
                      <span className="hidden md:inline">{t('download') || 'Télécharger'}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedMedia)}
                      disabled={deletingId === selectedMedia.id}
                      className="btn-danger px-4 py-2 flex items-center gap-2"
                    >
                      {deletingId === selectedMedia.id ? (
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <IconTrash className="w-4 h-4" />
                      )}
                      <span className="hidden md:inline">{t('delete') || 'Supprimer'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

