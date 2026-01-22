'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FAVICON_SERVICES, extractDomain } from '@/lib/favicon';

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

export default function ClientAvatar({
  name,
  imageUrl,
  website,
  size = 'sm',
  className = '',
}: ClientAvatarProps) {
  const [faviconService, setFaviconService] = useState<'duckduckgo' | 'google' | 'direct' | 'failed'>('duckduckgo');
  const [imageError, setImageError] = useState(false);
  const config = sizeConfig[size];
  
  // URL du favicon si disponible, avec fallback chain
  const domain = website ? extractDomain(website) : null;
  const faviconUrl = website && domain && faviconService !== 'failed' 
    ? FAVICON_SERVICES[faviconService](domain)
    : null;
  
  // Gère le fallback des favicons
  const handleFaviconError = () => {
    if (faviconService === 'duckduckgo') {
      setFaviconService('google');
    } else if (faviconService === 'google') {
      setFaviconService('direct');
    } else {
      setFaviconService('failed');
    }
  };
  
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
      <div className={`${config.container} rounded-full overflow-hidden flex-shrink-0 relative bg-elevated ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconUrl}
          alt={name}
          className="w-full h-full object-contain p-1"
          onError={handleFaviconError}
        />
      </div>
    );
  }

  // Cas 4: Initiale
  return (
    <div className={`${config.container} rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`!text-primary font-medium ${config.text}`}>
        {initial}
      </span>
    </div>
  );
}

