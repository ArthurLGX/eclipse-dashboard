'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/context/AuthContext';
import { useCompany } from '@/hooks/useApi';

interface Company {
  name?: string;
  website?: string;
  logo?: string;
}

export default function SidebarLogo() {
  const { user } = useAuth();
  const { data: company } = useCompany(user?.id);
  const [faviconError, setFaviconError] = useState(false);
  
  // Cast pour avoir les propriétés typées
  const companyData = company as Company | null;

  // Réinitialiser l'erreur favicon quand l'URL change
  useEffect(() => {
    setFaviconError(false);
  }, [companyData?.website]);

  // Extraire le domaine de l'URL du site web
  const faviconUrl = useMemo(() => {
    if (!companyData?.website) return null;
    
    try {
      // Nettoyer l'URL
      let url = companyData.website.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const domain = new URL(url).hostname;
      // Utiliser le service Google pour récupérer le favicon
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  }, [companyData?.website]);

  // Générer les initiales du nom de l'entreprise
  const companyInitials = useMemo(() => {
    if (!companyData?.name) return null;
    
    const words = companyData.name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  }, [companyData?.name]);

  // Cas 1: Website existe et favicon disponible
  if (faviconUrl && !faviconError) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-card border border-default flex items-center justify-center">
        <Image
          src={faviconUrl}
          alt={companyData?.name || 'Company logo'}
          width={24}
          height={24}
          onError={() => setFaviconError(true)}
          unoptimized // Nécessaire pour les URLs externes
        />
      </div>
    );
  }

  // Cas 2: Pas de website valide mais nom d'entreprise existe → initiales
  if (companyInitials) {
    return (
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
        <span className="text-accent-text text-sm font-bold">
          {companyInitials}
        </span>
      </div>
    );
  }

  // Cas 3: Pas de fiche entreprise → logo Eclipse par défaut
  return (
    <Image
      src="/images/logo/eclipse-logo.png"
      alt="Eclipse Studio"
      width={32}
      height={32}
    />
  );
}

