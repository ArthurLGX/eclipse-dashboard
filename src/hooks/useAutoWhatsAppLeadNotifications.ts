'use client';

/**
 * Pour chaque lead affiché dans le tableau SFU (hors archivé / répondu), déclenche une fois
 * l’API d’envoi WhatsApp (Meta/Twilio selon les paramètres).
 * Déduplication par documentId (localStorage) pour éviter les doublons au rechargement.
 * Pour un envoi dès création côté Strapi sans ouvrir cette page, utiliser le webhook serveur
 * `POST /api/smart-follow-up/webhooks/lead-created` et désactiver l’auto client via
 * `NEXT_PUBLIC_SFU_DISABLE_AUTO_WA_ON_CLIENT=1`.
 */

import { useEffect, useRef } from 'react';
import type { AutomationSettings, SfuLead } from '@/types/smart-follow-up';
import { sendWhatsAppNotification } from '@/lib/smart-follow-up-api';

const storageKey = (userId: number) => `sfu-wa-auto-sent:${userId}`;
const MAX_STORED = 800;

function loadSent(userId: number): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function persistSent(userId: number, ids: Set<string>) {
  const arr = [...ids];
  const trimmed = arr.length > MAX_STORED ? arr.slice(-MAX_STORED) : arr;
  localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
}

/** Toute ligne hors onglet Archivés (le tableau SFU affiche ces statuts). */
function leadEligibleForAutoWa(l: SfuLead): boolean {
  return l.status !== 'archived';
}

export function useAutoWhatsAppLeadNotifications(
  leads: SfuLead[] | undefined,
  settings: AutomationSettings | null | undefined,
  userId: number | undefined,
  options: { enabled: boolean }
) {
  const inFlightRef = useRef(new Set<string>());

  useEffect(() => {
    if (!options.enabled || !userId || !leads?.length || !settings) return;

    const wc = settings.whatsapp_config;
    if (!wc?.enabled) return;

    const channel = settings.notification_preferences?.channel ?? 'both';
    if (channel === 'email') return;

    let cancelled = false;

    const run = async () => {
      const sent = loadSent(userId);
      const toNotify = leads.filter(
        (l) => l.documentId && leadEligibleForAutoWa(l) && !sent.has(l.documentId)
      );
      if (toNotify.length === 0) return;

      for (const lead of toNotify) {
        if (cancelled) return;
        const id = lead.documentId;
        if (inFlightRef.current.has(id)) continue;
        inFlightRef.current.add(id);
        try {
          const result = await sendWhatsAppNotification(id);
          if (!result.error) {
            sent.add(id);
            persistSent(userId, sent);
          } else {
            console.warn('[SFU] Notification WhatsApp auto —', id, result.error);
          }
        } catch (e) {
          console.warn('[SFU] Notification WhatsApp auto erreur', id, e);
        } finally {
          inFlightRef.current.delete(id);
        }
        await new Promise((r) => setTimeout(r, 450));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [leads, settings, userId, options.enabled]);
}
