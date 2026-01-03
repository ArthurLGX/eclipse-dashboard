'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ClientAvatarProps {
  name: string;
  imageUrl?: string | null;
  website?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  xs: { container: 'w-6 h-6', text: 'text-xs', iconSize: 16 },
  sm: { container: 'w-8 h-8', text: 'text-sm', iconSize: 24 },
  md: { container: 'w-12 h-12', text: 'text-lg', iconSize: 32 },
  lg: { container: 'w-16 h-16', text: 'text-2xl', iconSize: 48 },
};

/**
 * Extrait le domaine d'une URL
 */
function extractDomain(url: string): string | null {
  try {
    // Ajouter le protocole si absent
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
function getFaviconUrl(website: string): string | null {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
}

export default function ClientAvatar({
  name,
  imageUrl,
  website,
  size = 'sm',
  className = '',
}: ClientAvatarProps) {
  const [faviconError, setFaviconError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const config = sizeConfig[size];
  
  // URL du favicon si disponible
  const faviconUrl = website && !faviconError ? getFaviconUrl(website) : null;
  
  // Initiale du nom
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  // Nettoyer l'URL de l'image (enlever les préfixes incorrects avant data:)
  const cleanImageUrl = imageUrl?.includes('data:image') 
    ? imageUrl.substring(imageUrl.indexOf('data:image'))
    : imageUrl;

  // Vérifier si c'est une image base64
  const isBase64 = cleanImageUrl?.startsWith('data:image');
  
  // Vérifier si c'est une URL interne (Strapi)
  const isInternalUrl = cleanImageUrl?.includes('api.dashboard.eclipsestudiodev.fr') || 
                        cleanImageUrl?.includes('localhost');

  // Cas 1: Image du client (base64 ou URL externe)
  // Utiliser <img> standard pour base64 et URLs externes (domaines non configurés)
  if (cleanImageUrl && (isBase64 || !isInternalUrl) && !imageError) {
    return (
      <div className={`${config.container} rounded-full overflow-hidden flex-shrink-0 relative ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cleanImageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Cas 2: Image du client (URL interne Strapi)
  if (cleanImageUrl && isInternalUrl && !imageError) {
    return (
      <div className={`${config.container} rounded-full overflow-hidden flex-shrink-0 relative ${className}`}>
        <Image
          src={cleanImageUrl}
          alt={name}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Cas 3: Favicon du site web
  if (faviconUrl) {
    return (
      <div className={`${config.container} rounded-full overflow-hidden flex-shrink-0 relative bg-white ${className}`}>
        <Image
          src={faviconUrl}
          alt={name}
          fill
          sizes="64px"
          className="object-contain p-1"
          onError={() => setFaviconError(true)}
          unoptimized
        />
      </div>
    );
  }

  // Cas 4: Initiale
  return (
    <div className={`${config.container} rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`text-zinc-300 font-medium ${config.text}`}>
        {initial}
      </span>
    </div>
  );
}

