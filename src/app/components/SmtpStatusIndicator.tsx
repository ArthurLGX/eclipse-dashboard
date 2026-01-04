'use client';

import { useState, useEffect } from 'react';
import { IconCheck, IconX, IconLoader2, IconAlertTriangle, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSmtpConfig } from '@/lib/api';
import type { SmtpConfig } from '@/types';

interface SmtpStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Indicateur compact du statut SMTP
 * Affiche un badge vert/rouge selon la configuration
 */
export default function SmtpStatusIndicator({ className = '', showLabel = true }: SmtpStatusIndicatorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id) return;
      
      try {
        const config = await fetchSmtpConfig(user.id);
        setSmtpConfig(config);
      } catch (error) {
        console.error('Error loading SMTP config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user?.id]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <IconLoader2 className="w-4 h-4 animate-spin text-muted" />
        {showLabel && <span className="text-sm text-muted">Vérification...</span>}
      </div>
    );
  }

  const isConfigured = smtpConfig && smtpConfig.smtp_host && smtpConfig.smtp_user;
  const isVerified = smtpConfig?.is_verified;

  if (isConfigured && isVerified) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
          <IconCheck className="w-3 h-3 text-green-500" />
        </div>
        {showLabel && <span className="text-sm text-green-500">SMTP configuré</span>}
      </div>
    );
  }

  if (isConfigured && !isVerified) {
    return (
      <Link 
        href="/dashboard/settings?tab=email"
        className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
      >
        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
          <IconAlertTriangle className="w-3 h-3 text-amber-500" />
        </div>
        {showLabel && <span className="text-sm text-amber-500">SMTP non vérifié</span>}
      </Link>
    );
  }

  return (
    <Link 
      href="/dashboard/settings?tab=email"
      className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
    >
      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
        <IconX className="w-3 h-3 text-red-500" />
      </div>
      {showLabel && <span className="text-sm text-red-500">SMTP non configuré</span>}
    </Link>
  );
}

interface SmtpWarningBannerProps {
  className?: string;
}

/**
 * Bannière d'avertissement SMTP
 * Affiche un message si le SMTP n'est pas configuré ou vérifié
 */
export function SmtpWarningBanner({ className = '' }: SmtpWarningBannerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id) return;
      
      try {
        const config = await fetchSmtpConfig(user.id);
        setSmtpConfig(config);
      } catch (error) {
        console.error('Error loading SMTP config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user?.id]);

  if (loading) return null;

  const isConfigured = smtpConfig && smtpConfig.smtp_host && smtpConfig.smtp_user;
  const isVerified = smtpConfig?.is_verified;

  // Tout est OK, pas de bannière
  if (isConfigured && isVerified) return null;

  if (isConfigured && !isVerified) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <IconAlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-amber-400">Configuration SMTP non vérifiée</h4>
          <p className="text-sm text-amber-300/80">
            Votre configuration SMTP n&apos;a pas été testée. Les emails pourraient ne pas être envoyés.
          </p>
        </div>
        <Link
          href="/dashboard/settings?tab=email"
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
        >
          <IconSettings className="w-4 h-4" />
          Vérifier
        </Link>
      </div>
    );
  }

  // Non configuré
  return (
    <div className={`flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
        <IconAlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-red-400">Configuration SMTP requise</h4>
        <p className="text-sm text-red-300/80">
          Vous devez configurer votre serveur SMTP pour pouvoir envoyer des emails.
        </p>
      </div>
      <Link
        href="/dashboard/settings?tab=email"
        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
      >
        <IconSettings className="w-4 h-4" />
        Configurer
      </Link>
    </div>
  );
}

