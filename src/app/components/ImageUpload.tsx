'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  IconCamera, 
  IconLoader2, 
  IconUser, 
  IconCheck, 
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconCrop,
  IconWorld,
  IconUpload,
  IconPhoto,
  IconLink,
  IconAlertCircle,
} from '@tabler/icons-react';
import { uploadImage } from '@/lib/api';
import { motion, AnimatePresence } from 'motion/react';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (imageId: number, imageUrl: string) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  placeholder?: 'user' | 'logo';
  className?: string;
  disabled?: boolean;
  aspectRatio?: number;
  website?: string | null;
  name?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

/**
 * Extrait le domaine d'une URL pour le favicon
 */
function extractDomain(url: string): string | null {
  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }
    const urlObj = new URL(fullUrl);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Génère l'URL du favicon via Google S2 (nouveau format)
 */
function getFaviconUrl(website: string, size: number = 128): string | null {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${domain}`;
}

// Fonction pour créer un crop centré avec ratio
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

// Fonction pour générer l'image croppée
async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  scale: number = 1,
  rotation: number = 0,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const rotateRads = (rotation * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();

  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      'image/jpeg',
      0.95,
    );
  });
}

export default function ImageUpload({
  currentImageUrl,
  onUpload,
  size = 'md',
  shape = 'circle',
  placeholder = 'user',
  className = '',
  disabled = false,
  aspectRatio = 1,
  website,
  name,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [faviconError, setFaviconError] = useState(false);
  
  // États pour la bibliothèque et URL
  const [showLibrary, setShowLibrary] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [libraryImages, setLibraryImages] = useState<Array<{ id: number; url: string }>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // URL du favicon si disponible
  const faviconUrl = website && !faviconError ? getFaviconUrl(website) : null;
  
  // Initiale du nom
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleAvatarClick = () => {
    if (uploading) return;
    
    // Si on a un site web OU qu'on n'est pas désactivé, afficher le menu de choix
    if (website || !disabled) {
      setShowMenu(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowEditor(true);
      setShowMenu(false);
      setScale(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseFavicon = async () => {
    if (!website || disabled) return;
    
    setShowMenu(false);
    setUploading(true);
    
    try {
      const domain = extractDomain(website);
      if (!domain) {
        throw new Error('Impossible d\'extraire le domaine');
      }

      // Utiliser notre API proxy pour éviter les problèmes CORS
      const proxyUrl = `/api/favicon?domain=${encodeURIComponent(domain)}&size=256`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Échec de la récupération du favicon');
      }
      
      const blob = await response.blob();
      
      // Créer un fichier à partir du blob
      const file = new File([blob], 'favicon.png', { type: blob.type || 'image/png' });
      
      // Upload vers Strapi
      const result = await uploadImage(file);
      const fullUrl = process.env.NEXT_PUBLIC_STRAPI_URL + result.url;
      await onUpload(result.id, fullUrl);
      
    } catch (error) {
      console.error('Favicon upload error:', error);
      alert('Erreur lors de la récupération du favicon. Essayez d\'importer une image manuellement.');
    } finally {
      setUploading(false);
    }
  };

  const handleChooseFile = () => {
    if (disabled) return;
    setShowMenu(false);
    fileInputRef.current?.click();
  };

  // Handler pour ouvrir la bibliothèque (utilise user-medias pour la bibliothèque privée)
  const handleOpenLibrary = async () => {
    if (disabled) return;
    setShowMenu(false);
    setShowLibrary(true);
    setLoadingLibrary(true);
    
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
      // Utiliser l'API user-medias pour récupérer uniquement les médias de l'utilisateur
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
        setLibraryImages(userMedias.map((item: { file: { id: number; url: string } }) => ({
          id: item.file?.id,
          url: item.file?.url?.startsWith('http') ? item.file.url : `${API_URL}${item.file?.url}`,
        })).filter((img: { id: number; url: string }) => img.id && img.url));
      }
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Handler pour sélectionner une image de la bibliothèque
  const handleSelectFromLibrary = async (image: { id: number; url: string }) => {
    setUploading(true);
    try {
      await onUpload(image.id, image.url);
      setShowLibrary(false);
    } catch (error) {
      console.error('Library select error:', error);
      alert('Erreur lors de la sélection de l\'image');
    } finally {
      setUploading(false);
    }
  };

  // Handler pour ouvrir l'input URL
  const handleOpenUrlInput = () => {
    if (disabled) return;
    setShowMenu(false);
    setShowUrlInput(true);
    setUrlInput('');
    setUrlError('');
  };

  // Handler pour valider l'URL
  const handleSubmitUrl = async () => {
    if (!urlInput.trim()) {
      setUrlError('URL requise');
      return;
    }

    try {
      new URL(urlInput);
    } catch {
      setUrlError('URL invalide');
      return;
    }

    const lowerUrl = urlInput.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.jfif'];
    const isImage = imageExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('image');
    
    if (!isImage) {
      setUrlError('L\'URL doit pointer vers une image');
      return;
    }

    setUploading(true);
    try {
      // Télécharger l'image depuis l'URL et l'uploader sur Strapi
      const response = await fetch(urlInput);
      const blob = await response.blob();
      const file = new File([blob], 'image-from-url.jpg', { type: blob.type || 'image/jpeg' });
      
      const result = await uploadImage(file);
      const fullUrl = process.env.NEXT_PUBLIC_STRAPI_URL + result.url;
      await onUpload(result.id, fullUrl);
      
      setShowUrlInput(false);
      setUrlInput('');
    } catch (error) {
      console.error('URL upload error:', error);
      setUrlError('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  const handleConfirmCrop = async () => {
    if (!imgRef.current || !completedCrop) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        scale,
        rotation,
      );

      const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });

      const result = await uploadImage(file);
      const fullUrl = process.env.NEXT_PUBLIC_STRAPI_URL + result.url;
      await onUpload(result.id, fullUrl);

      setShowEditor(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setRotation(0);
  };

  const displayUrl = currentImageUrl;

  // Rendu du contenu de l'avatar
  const renderAvatarContent = () => {
    if (displayUrl) {
      return (
        <Image
          src={displayUrl}
          alt="Image"
          fill
          sizes="128px"
          style={{ objectFit: 'cover' }}
          className={uploading ? 'opacity-50' : ''}
        />
      );
    }
    
    if (faviconUrl) {
      return (
        <Image
          src={faviconUrl}
          alt="Favicon"
          fill
          sizes="128px"
          style={{ objectFit: 'contain', padding: '8px' }}
          className={` ${uploading ? 'opacity-50' : ''}`}
          onError={() => setFaviconError(true)}
          unoptimized
        />
      );
    }
    
    if (name) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <span className={`text-secondary font-bold ${size === 'sm' ? 'text-xl' : size === 'md' ? 'text-2xl' : 'text-4xl'}`}>
            {initial}
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center w-full h-full text-muted">
        {placeholder === 'user' ? (
          <IconUser size={size === 'sm' ? 24 : size === 'md' ? 32 : 48} stroke={1} />
        ) : (
          <span className="text-xs text-center px-2">Logo</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`relative group ${className}`} ref={menuRef}>
        <div
          className={`
            ${sizeClasses[size]}
            ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}
            relative overflow-hidden
            bg-card border-2 border-default
            transition-all duration-200
            cursor-pointer hover:border-accent/50
          `}
          onClick={handleAvatarClick}
        >
          {renderAvatarContent()}

          {/* Overlay on hover */}
          {!disabled && !uploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <IconCamera className="text-white" size={size === 'sm' ? 16 : 24} />
            </div>
          )}

          {/* Loading spinner */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <IconLoader2 className="text-white animate-spin" size={24} />
            </div>
          )}
        </div>

        {/* Menu de choix */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-64 bg-card border border-default rounded-xl shadow-xl shadow-black/50 z-50 overflow-hidden"
            >
              {/* Message si mode lecture */}
              {disabled && (
                <div className="px-4 py-3 bg-hover border-b border-default text-center">
                  <p className="text-warning text-xs font-medium">
                    ⚠️ Passez en mode édition pour modifier l&apos;image
                  </p>
                </div>
              )}
              
              {/* Option Favicon */}
              {website && (
                <button
                  onClick={handleUseFavicon}
                  disabled={disabled}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b border-default ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-info-light border border-info/30 flex items-center justify-center overflow-hidden">
                    {faviconUrl ? (
                      <Image
                        src={faviconUrl}
                        alt="Favicon"
                        width={24}
                        height={24}
                        className="object-contain"
                        unoptimized
                        onError={() => setFaviconError(true)}
                      />
                    ) : (
                      <IconWorld size={18} className="text-info" />
                    )}
                  </div>
                  <div>
                    <p className="text-primary font-medium text-sm">Utiliser le favicon</p>
                    <p className="text-muted text-xs truncate max-w-[160px]">
                      {extractDomain(website)}
                    </p>
                  </div>
                </button>
              )}
              
              {/* Option Importer depuis l'ordinateur */}
              <button
                onClick={handleChooseFile}
                disabled={disabled}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b border-default ${
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-accent-light border border-accent-light flex items-center justify-center">
                  <IconUpload size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-primary font-medium text-sm">Depuis l&apos;ordinateur</p>
                  <p className="text-muted text-xs">Importer un fichier</p>
                </div>
              </button>

              {/* Option Bibliothèque */}
              <button
                onClick={handleOpenLibrary}
                disabled={disabled}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b border-default ${
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <IconPhoto size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-primary font-medium text-sm">Depuis la bibliothèque</p>
                  <p className="text-muted text-xs">Images déjà uploadées</p>
                </div>
              </button>

              {/* Option URL */}
              <button
                onClick={handleOpenUrlInput}
                disabled={disabled}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-info-light border border-info/30 flex items-center justify-center">
                  <IconLink size={18} className="text-info" />
                </div>
                <div>
                  <p className="text-primary font-medium text-sm">Depuis une URL</p>
                  <p className="text-muted text-xs">Lien vers une image</p>
                </div>
              </button>
              
              {/* Bouton fermer */}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-4 py-2 text-muted text-xs hover:bg-hover transition-colors text-center border-t border-default"
              >
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {/* Modal d'édition */}
      <AnimatePresence>
        {showEditor && imageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-default shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-default">
                <div className="flex items-center gap-2">
                  <IconCrop className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-semibold text-primary">Éditer l&apos;image</h3>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-lg hover:bg-hover transition-colors"
                >
                  <IconX className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Image Editor */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-page/50">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  circularCrop={shape === 'circle'}
                  className="max-h-[50vh]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    alt="Crop"
                    src={imageSrc}
                    style={{
                      transform: `scale(${scale}) rotate(${rotation}deg)`,
                      maxHeight: '50vh',
                      maxWidth: '100%',
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-default space-y-4">
                {/* Zoom */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-secondary">
                    <IconZoomOut className="w-4 h-4" />
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="flex-1 h-2 bg-hover rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex items-center gap-2 text-secondary">
                    <IconZoomIn className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-muted w-12 text-right">{Math.round(scale * 100)}%</span>
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-secondary">
                    <IconRotate className="w-4 h-4" />
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 h-2 bg-hover rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <span className="text-sm text-muted w-12 text-right">{rotation}°</span>
                  <button
                    onClick={() => setRotation(0)}
                    className="px-2 py-1 text-xs text-secondary hover:text-primary border border-default rounded hover:bg-hover transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Quick rotation buttons */}
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setRotation(r => r - 90)}
                    className="px-3 py-1.5 text-sm bg-hover text-secondary rounded-lg hover:bg-card transition-colors flex items-center gap-1"
                  >
                    <IconRotate className="w-4 h-4 -scale-x-100" />
                    -90°
                  </button>
                  <button
                    onClick={() => setRotation(r => r + 90)}
                    className="px-3 py-1.5 text-sm bg-hover text-secondary rounded-lg hover:bg-card transition-colors flex items-center gap-1"
                  >
                    <IconRotate className="w-4 h-4" />
                    +90°
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-default">
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className="px-4 py-2 text-secondary bg-hover rounded-lg hover:bg-card transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmCrop}
                  disabled={uploading || !completedCrop}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Bibliothèque */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowLibrary(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-default rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-default">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <IconPhoto className="w-5 h-5 text-purple-400" />
                  Bibliothèque d&apos;images
                </h3>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="p-2 rounded-lg hover:bg-hover transition-colors"
                >
                  <IconX className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4">
                {loadingLibrary ? (
                  <div className="flex items-center justify-center h-48">
                    <IconLoader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : libraryImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted">
                    <IconPhoto className="w-12 h-12 mb-4 opacity-50" />
                    <p>Aucune image dans la bibliothèque</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {libraryImages.map((image) => (
                      <button
                        key={image.id}
                        onClick={() => handleSelectFromLibrary(image)}
                        disabled={uploading}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all group"
                      >
                        <Image
                          src={image.url}
                          alt="Library image"
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <IconCheck className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Modal URL */}
      <AnimatePresence>
        {showUrlInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowUrlInput(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-default rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-default">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <IconLink className="w-5 h-5 text-info" />
                  Image depuis URL
                </h3>
                <button
                  onClick={() => setShowUrlInput(false)}
                  className="p-2 rounded-lg hover:bg-hover transition-colors"
                >
                  <IconX className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    URL de l&apos;image
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitUrl()}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 bg-hover border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-info/50 focus:border-info"
                  />
                  {urlError && (
                    <p className="mt-2 text-sm text-danger flex items-center gap-1">
                      <IconAlertCircle className="w-4 h-4" />
                      {urlError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSubmitUrl}
                  disabled={!urlInput.trim() || uploading}
                  className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4" />
                      Utiliser cette image
                    </>
                  )}
                </button>

                <p className="text-xs text-muted text-center">
                  L&apos;image sera téléchargée et uploadée sur le serveur
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
