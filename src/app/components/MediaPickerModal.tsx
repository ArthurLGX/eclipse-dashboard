'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useModalFocus } from '@/hooks/useModalFocus';
import {
  IconX,
  IconUpload,
  IconPhoto,
  IconLink,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
  IconVideo,
  IconFileTypePdf,
  IconFileText,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface MediaItem {
  id: number;
  url: string;
  name?: string;
  mime?: string;
  width?: number;
  height?: number;
}

export type MediaType = 'image' | 'video' | 'document' | 'all';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, mediaId?: number) => void;
  mediaType?: MediaType;
  title?: string;
}

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

/**
 * Modal réutilisable pour sélectionner un média depuis :
 * - L'ordinateur (upload)
 * - La bibliothèque (Strapi)
 * - Une URL externe
 */
export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  mediaType = 'image',
  title,
}: MediaPickerModalProps) {
  const { t } = useLanguage();
  const modalRef = useModalFocus(isOpen);
  const [activeTab, setActiveTab] = useState<'computer' | 'library' | 'url'>('computer');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryMedia, setLibraryMedia] = useState<MediaItem[]>([]);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<MediaItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les médias de la bibliothèque
  const loadLibraryMedia = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const token = localStorage.getItem('token');
      let mimeFilter = '';
      
      if (mediaType === 'image') {
        mimeFilter = '&filters[mime][$contains]=image';
      } else if (mediaType === 'video') {
        mimeFilter = '&filters[mime][$contains]=video';
      } else if (mediaType === 'document') {
        // Filtrer pour les documents (PDF, Word, etc.)
        mimeFilter = '&filters[$or][0][mime][$contains]=pdf&filters[$or][1][mime][$contains]=document&filters[$or][2][mime][$contains]=word&filters[$or][3][mime][$contains]=text';
      }
      // Pour 'all', pas de filtre = tous les fichiers
      
      const res = await fetch(
        `${API_URL}/api/upload/files?sort=createdAt:desc&pagination[pageSize]=50${mimeFilter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setLibraryMedia(data);
      }
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoadingLibrary(false);
    }
  }, [mediaType]);

  // Charger la bibliothèque quand on ouvre le modal ou change d'onglet
  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadLibraryMedia();
    }
  }, [isOpen, activeTab, loadLibraryMedia]);

  // Reset quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('computer');
      setUrlInput('');
      setUrlError('');
      setSelectedLibraryItem(null);
    }
  }, [isOpen]);

  // Handler pour l'upload depuis l'ordinateur
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isDocument = file.type === 'application/pdf' || 
                       file.type.includes('word') || 
                       file.type.includes('document') ||
                       file.type === 'text/plain';
    
    if (mediaType === 'image' && !isImage) {
      alert(t('please_select_image') || 'Veuillez sélectionner une image');
      return;
    }
    if (mediaType === 'video' && !isVideo) {
      alert(t('please_select_video') || 'Veuillez sélectionner une vidéo');
      return;
    }
    if (mediaType === 'document' && !isDocument) {
      alert(t('please_select_document') || 'Veuillez sélectionner un document (PDF, Word, etc.)');
      return;
    }
    if (mediaType === 'all' && !isImage && !isVideo && !isDocument) {
      alert(t('please_select_media') || 'Veuillez sélectionner un fichier valide');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('files', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const uploadedMedia = data[0];
      const fullUrl = uploadedMedia.url.startsWith('http')
        ? uploadedMedia.url
        : `${API_URL}${uploadedMedia.url}`;

      onSelect(fullUrl, uploadedMedia.id);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('upload_error') || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler pour la sélection depuis la bibliothèque
  const handleLibrarySelect = () => {
    if (!selectedLibraryItem) return;
    
    const fullUrl = selectedLibraryItem.url.startsWith('http')
      ? selectedLibraryItem.url
      : `${API_URL}${selectedLibraryItem.url}`;
    
    onSelect(fullUrl, selectedLibraryItem.id);
    onClose();
  };

  // Handler pour l'URL externe
  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setUrlError(t('url_required') || 'URL requise');
      return;
    }

    // Validation basique de l'URL
    try {
      new URL(urlInput);
    } catch {
      setUrlError(t('invalid_url') || 'URL invalide');
      return;
    }

    // Vérifier l'extension pour le type
    const lowerUrl = urlInput.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.jfif'];
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    
    const isImage = imageExtensions.some(ext => lowerUrl.includes(ext));
    const isVideo = videoExtensions.some(ext => lowerUrl.includes(ext));
    
    if (mediaType === 'image' && !isImage && !lowerUrl.includes('image')) {
      setUrlError(t('url_must_be_image') || 'L\'URL doit pointer vers une image');
      return;
    }
    if (mediaType === 'video' && !isVideo && !lowerUrl.includes('video')) {
      setUrlError(t('url_must_be_video') || 'L\'URL doit pointer vers une vidéo');
      return;
    }

    setUrlError('');
    onSelect(urlInput);
    onClose();
  };

  // Accepter les fichiers selon le type
  const getAcceptType = () => {
    if (mediaType === 'image') return 'image/*';
    if (mediaType === 'video') return 'video/*';
    if (mediaType === 'document') return '.pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'image/*,video/*,.pdf,.doc,.docx,application/pdf';
  };

  const getTitle = () => {
    if (title) return title;
    if (mediaType === 'image') return t('select_image') || 'Sélectionner une image';
    if (mediaType === 'video') return t('select_video') || 'Sélectionner une vidéo';
    if (mediaType === 'document') return t('select_document') || 'Sélectionner un document';
    return t('select_media') || 'Sélectionner un média';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-default rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-default">
            <h3 className="text-lg font-semibold !text-primary flex items-center gap-2">
              {mediaType === 'video' ? (
                <IconVideo className="w-5 h-5 !text-accent" />
              ) : mediaType === 'document' ? (
                <IconFileTypePdf className="w-5 h-5 !text-accent" />
              ) : (
                <IconPhoto className="w-5 h-5 !text-accent" />
              )}
              {getTitle()}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-hover transition-colors"
            >
                <IconX className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-default">
            <button
              onClick={() => setActiveTab('computer')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'computer'
                  ? '!text-accent border-b-2 border-accent bg-accent-light'
                  : '!text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              <IconUpload className="w-4 h-4" />
              {t('from_computer') || 'Ordinateur'}
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'library'
                  ? '!text-accent border-b-2 border-accent bg-accent-light'
                  : '!text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              <IconPhoto className="w-4 h-4" />
              {t('from_library') || 'Bibliothèque'}
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'url'
                  ? '!text-accent border-b-2 border-accent bg-accent-light'
                  : '!text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              <IconLink className="w-4 h-4" />
              {t('from_url') || 'URL'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {/* Tab: Ordinateur */}
            {activeTab === 'computer' && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptType()}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center w-full max-w-md p-8 border-2 border-dashed border-default rounded-xl hover:border-accent/50 hover:bg-hover/30 transition-all cursor-pointer group"
                >
                  {uploading ? (
                    <>
                      <IconLoader2 className="w-12 h-12 !text-accent animate-spin mb-4" />
                      <p className="text-primary font-medium">{t('uploading') || 'Upload en cours...'}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mb-4 group-hover:bg-accent-light transition-colors">
                        <IconUpload className="w-8 h-8 !text-accent" />
                      </div>
                      <p className="text-primary font-medium mb-2">
                        {t('click_to_upload') || 'Cliquez pour sélectionner'}
                      </p>
                      <p className="text-secondary text-sm text-center">
                        {mediaType === 'image' && (t('supported_image_formats') || 'JPG, PNG, GIF, WebP, AVIF (max 5MB)')}
                        {mediaType === 'video' && (t('supported_video_formats') || 'MP4, WebM, OGG (max 50MB)')}
                        {mediaType === 'document' && (t('supported_document_formats') || 'PDF, Word, TXT (max 10MB)')}
                        {mediaType === 'all' && (t('supported_all_formats') || 'Images, vidéos et documents supportés')}
                      </p>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab: Bibliothèque */}
            {activeTab === 'library' && (
              <div className="min-h-[300px] pb-16">
                {loadingLibrary ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <IconLoader2 className="w-8 h-8 !text-accent animate-spin" />
                  </div>
                ) : libraryMedia.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-secondary">
                    <IconPhoto className="w-12 h-12 mb-4 opacity-50" />
                    <p>{t('no_media_in_library') || 'Aucun média dans la bibliothèque'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {libraryMedia.map((media) => {
                      const isVideo = media.mime?.startsWith('video/');
                      const isImage = media.mime?.startsWith('image/');
                      const isPdf = media.mime === 'application/pdf';
                      const isDocument = !isImage && !isVideo;
                      const fullUrl = media.url.startsWith('http')
                        ? media.url
                        : `${API_URL}${media.url}`;
                      
                      return (
                        <button
                          key={media.id}
                          onClick={() => setSelectedLibraryItem(media)}
                          onDoubleClick={() => {
                            // Double-clic = sélection directe
                            const url = media.url.startsWith('http')
                              ? media.url
                              : `${API_URL}${media.url}`;
                            onSelect(url, media.id);
                            onClose();
                          }}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedLibraryItem?.id === media.id
                              ? 'border-accent border-2 border-accent'
                              : 'border-transparent hover:border-accent/50'
                          }`}
                        >
                          {isVideo ? (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <IconVideo className="w-8 h-8 text-zinc-400" />
                            </div>
                          ) : isDocument ? (
                            <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center gap-2 p-2">
                              {isPdf ? (
                                <IconFileTypePdf className="w-8 h-8 text-red-400" />
                              ) : (
                                <IconFileText className="w-8 h-8 text-blue-400" />
                              )}
                              <span className="text-xs text-zinc-400 text-center truncate w-full px-1">
                                {media.name || 'Document'}
                              </span>
                            </div>
                          ) : (
                            <Image
                              src={fullUrl}
                              alt={media.name || 'Media'}
                              fill
                              sizes="120px"
                              className="object-cover"
                            />
                          )}
                          
                          {selectedLibraryItem?.id === media.id && (
                            <div className="absolute inset-0 bg-accent-light flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                <IconCheck className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: URL */}
            {activeTab === 'url' && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="w-full max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-4">
                    <IconLink className="w-8 h-8 !text-accent" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {t('media_url') || 'URL du média'}
                    </label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setUrlError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                      placeholder={
                        mediaType === 'image'
                          ? 'https://example.com/image.jpg'
                          : mediaType === 'video'
                          ? 'https://example.com/video.mp4'
                          : 'https://example.com/media.jpg'
                      }
                      className="w-full px-4 py-3 bg-input border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent"
                    />
                    {urlError && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <IconAlertCircle className="w-4 h-4" />
                        {urlError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <IconCheck className="w-4 h-4" />
                    {t('insert') || 'Insérer'}
                  </button>

                  <p className="text-xs text-muted text-center">
                    {t('url_direct_link_hint') || 'Entrez l\'URL directe vers le fichier média'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer fixe avec bouton de sélection (pour la bibliothèque) */}
          {activeTab === 'library' && selectedLibraryItem && (
            <div className="border-t border-default bg-card p-4 flex items-center justify-between">
              <p className="text-sm text-muted">
                {t('selected') || 'Sélectionné'}: <span className="text-primary font-medium">{selectedLibraryItem.name || 'Media'}</span>
              </p>
              <button
                onClick={handleLibrarySelect}
                className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 font-medium"
              >
                <IconCheck className="w-4 h-4" />
                {t('confirm_selection') || 'Confirmer'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

