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
  const config = sizeConfig[size];
  
  // URL du favicon si disponible
  const faviconUrl = website && !faviconError ? getFaviconUrl(website) : null;
  
  // Initiale du nom
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  // Cas 1: Image du client
  if (imageUrl) {
    return (
      <div className={`${config.container} rounded-full overflow-hidden flex-shrink-0 relative ${className}`}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  // Cas 2: Favicon du site web
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

  // Cas 3: Initiale
  return (
    <div className={`${config.container} rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`text-zinc-300 font-medium ${config.text}`}>
        {initial}
      </span>
    </div>
  );
}

