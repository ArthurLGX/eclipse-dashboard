'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/context/AuthContext';
import { useCompany } from '@/hooks/useApi';
import { getFaviconUrl } from '@/lib/favicon';

interface Company {
  name?: string;
  website?: string;
  logo?: string;
}

export default function SidebarLogo() {
  const { user } = useAuth();
  const { data: company } = useCompany(user?.id);
  const [faviconError, setFaviconError] = useState(false);
  const [currentService, setCurrentService] = useState<'duckduckgo' | 'google'>('duckduckgo');
  
  // Cast pour avoir les propriétés typées
  const companyData = company as Company | null;

  // Réinitialiser l'erreur favicon quand l'URL change
  useEffect(() => {
    setFaviconError(false);
    setCurrentService('duckduckgo');
  }, [companyData?.website]);

  // Extraire le domaine de l'URL du site web
  const faviconUrl = useMemo(() => {
    if (!companyData?.website) return null;
    
    try {
      // Utiliser DuckDuckGo par défaut (plus fiable)
      return getFaviconUrl(companyData.website, currentService);
    } catch {
      return null;
    }
  }, [companyData?.website, currentService]);

  // Gestion du fallback en cas d'erreur
  const handleFaviconError = () => {
    if (currentService === 'duckduckgo') {
      // Essayer Google en fallback
      setCurrentService('google');
    } else {
      // Toutes les sources ont échoué
      setFaviconError(true);
    }
  };

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
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-card flex items-center justify-center">
        <Image
          src={faviconUrl}
          alt={companyData?.name || 'Company logo'}
          width={24}
          height={24}
          onError={handleFaviconError}
          unoptimized // Nécessaire pour les URLs externes
        />
      </div>
    );
  }

  // Cas 2: Pas de website valide mais nom d'entreprise existe → initiales
  if (companyInitials) {
    return (
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
        <span className="text-accent !text-sm font-bold">
          {companyInitials}
        </span>
      </div>
    );
  }

  // Cas 3: Pas de fiche entreprise → logo Eclipse par défaut
  return (
    <div className="w-8 h-8 rounded-lg overflow-hidden bg-card  flex items-center justify-center">
      <Image
        src="/images/logo/eclipse-logo.png"
        alt="Eclipse Studio"
        width={24}
        height={24}
      />
    </div>
  );
}

