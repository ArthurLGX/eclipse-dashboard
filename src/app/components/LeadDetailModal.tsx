'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconSend,
  IconChevronRight,
  IconLoader2,
  IconActivity,
  IconAlertTriangle,
  IconUser,
  IconBrandLinkedin,
  IconMail,
  IconBrandWhatsapp,
  IconClock,
  IconArchive,
} from '@tabler/icons-react';
import { usePopup } from '@/app/context/PopupContext';
import { useModalFocus, useModalScroll } from '@/hooks/useModalFocus';
import { getToken } from '@/lib/api';
import {
  fetchSfuLeadDetail,
  sfuLeadToAutomationAction,
  sendWhatsAppNotification,
  archiveSfuLead,
  snoozeSfuLeadTomorrow,
} from '@/lib/smart-follow-up-api';
import { extractWalegoLeadName, isWalegoPlainTextContent } from '@/utils/walego-lead-status';
import { extractWalegoLead } from '@/utils/extract-walego-lead';
import { getDefaultContactAvatar } from '@/lib/jazz-avatar';
import { greetingFirstName } from '@/lib/lead-greeting';
import {
  mergeLeadProfileForModal,
  type ExtendedTaskAIAnalysis,
} from '@/lib/parse-walego-content';
import type { AutomationAction } from '@/types/smart-follow-up';

export interface ParsedAnalysis {
  signal?: string;
  score?: 'hot' | 'warm' | 'neutral' | 'cold';
  scoreLabel?: string;
  fogRisk?: boolean;
  fogExplanation?: string;
  profil?: string;
  action?: string;
  actionTiming?: string;
  draft?: string;
}

function parseMailScannerOutput(reasoning: string, suggestion: string): ParsedAnalysis {
  const result: ParsedAnalysis = {};
  const text = (reasoning || '') + '\n' + (suggestion || '');

  const signalMatch = text.match(/🎯\s*SIGNAL\s*:?\s*([^\n📊⚠️✅💬]+)/i) || text.match(/SIGNAL\s*:?\s*([^\n]+)/i);
  if (signalMatch) result.signal = signalMatch[1].trim();

  const scoreMatch = text.match(/📊\s*SCORE\s*:?\s*([🔴🟠🟡⚫]\s*)?(CHAUD|TIÈDE|NEUTRE|FROID|chaud|tiède|neutre|froid)[^\n]*/i);
  if (scoreMatch) {
    const s = scoreMatch[0].toLowerCase();
    if (s.includes('chaud') || s.includes('🔴')) result.score = 'hot';
    else if (s.includes('tiède') || s.includes('tiède') || s.includes('🟠')) result.score = 'warm';
    else if (s.includes('froid') || s.includes('⚫')) result.score = 'cold';
    else result.score = 'neutral';
    result.scoreLabel = scoreMatch[0].replace(/^[^\w]*/, '').trim();
  }

  const fogMatch = text.match(/⚠️\s*RISQUE\s*FOG\s*:?\s*(Oui|Non)[^\n]*[-—]\s*([^\n]+)/i);
  if (fogMatch) {
    result.fogRisk = fogMatch[1].toLowerCase() === 'oui';
    result.fogExplanation = fogMatch[2].trim();
  }

  const actionMatch = text.match(/✅\s*ACTION\s*(?:IMMÉDIATE\s*)?:?\s*([^\n💬]+)/i);
  if (actionMatch) result.action = actionMatch[1].trim();

  const draftMatch = text.match(/💬\s*DRAFT\s*:?\s*([\s\S]+?)(?=\n\n|$)/i);
  if (draftMatch) result.draft = draftMatch[1].trim();

  // Profil souvent dans le reasoning
  const profilMatch = text.match(/(?:profil|Profil)\s*:?\s*([^\n]+)/i);
  if (profilMatch) result.profil = profilMatch[1].trim();

  return result;
}

function sanitizeDraftGreeting(
  draft: string,
  leadDisplayName: string,
  fromName?: string | null
): string {
  const first = greetingFirstName(fromName, leadDisplayName);
  let out = draft.replace(/^Hi\s+Walego\b[,]?\s*/i, `Hi ${first}, `);
  out = out.replace(/^Bonjour\s+La\b[,]?\s*/i, `Bonjour ${first}, `);
  out = out.replace(/^Bonjour\s+Le\b[,]?\s*/i, `Bonjour ${first}, `);
  return out;
}

type Channel = 'linkedin' | 'email' | 'whatsapp';
type LeadTab = 'response' | 'context';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: AutomationAction | null;
  /** Mots-clés qui, s'ils apparaissent dans le sujet/corps, signent un lead chaud */
  hotLeadKeywords?: string[];
  onSuccess?: () => void;
  /** Panneau latéral droit (Linear/Notion) au lieu d’une modale centrée */
  variant?: 'modal' | 'drawer';
}

export default function LeadDetailModal({
  isOpen,
  onClose,
  action,
  onSuccess,
  variant = 'modal',
}: LeadDetailModalProps) {
  const isDrawer = variant === 'drawer';
  const { showGlobalPopup } = usePopup();
  const modalRef = useModalFocus(isOpen);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  useModalScroll(isOpen, scrollRef);

  const [detail, setDetail] = useState<AutomationAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{ reasoning: string; suggestion: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [channel, setChannel] = useState<Channel>('linkedin');
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [snoozing, setSnoozing] = useState(false);
  const [leadTab, setLeadTab] = useState<LeadTab>('response');

  const leadSource = detail ?? action;
  const receivedEmail = leadSource?.follow_up_task?.received_email;
  const emailBody =
    receivedEmail?.content_text ||
    receivedEmail?.content_html ||
    leadSource?.follow_up_task?.context?.email_body ||
    '';

  const isWalegoMail = useMemo(() => {
    const t = receivedEmail?.content_text ?? '';
    const h = receivedEmail?.content_html ?? '';
    if (isWalegoPlainTextContent(t)) return true;
    if (h && /<[a-z]/i.test(h) && /NEW\s+LEAD|Profile\s+Picture|Lead\s+Status|walego/i.test(h)) {
      return true;
    }
    return false;
  }, [receivedEmail?.content_text, receivedEmail?.content_html]);

  const profile = useMemo(() => {
    if (!leadSource) return null;
    const re = leadSource.follow_up_task?.received_email;
    return mergeLeadProfileForModal({
      contentText: re?.content_text,
      contentHtml: re?.content_html,
      clientName: leadSource.client?.name,
      leadTitle: leadSource.lead_title,
      linkedinUrl: leadSource.linkedin_url,
      avatarPath: leadSource.avatar_path,
      aiAnalysis: leadSource.follow_up_task?.ai_analysis as ExtendedTaskAIAnalysis | undefined,
      receivedAt: re?.received_at,
      rawEmailSubject: re?.subject,
      fromEmail: re?.from_email,
      fromName: re?.from_name,
      snippet: re?.snippet,
    });
  }, [leadSource]);

  useEffect(() => {
    const currentAction = actionRef.current;
    if (!isOpen || !currentAction?.documentId) return;
    if (currentAction.documentId === 'simulated-walego') {
      setDetail(currentAction);
      setDraft(currentAction.proposed_content?.body || '');
      setLoading(false);
      return;
    }
    setLoading(true);
    setDetail(null);
    setAnalysis(null);
    fetchSfuLeadDetail(currentAction.documentId)
      .then((lead) => {
        const data = lead ? sfuLeadToAutomationAction(lead) : null;
        setDetail(data || currentAction);
        if (data?.proposed_content?.body) {
          setDraft(data.proposed_content.body);
        } else {
          setDraft('');
        }
      })
      .catch(() => {
        setDetail(currentAction);
        setDraft(currentAction.proposed_content?.body || '');
      })
      .finally(() => setLoading(false));
  }, [isOpen, action?.documentId]);

  // Aucune génération IA à l'ouverture : on affiche uniquement l'analyse déjà présente (créée lors de la lecture du mail)
  useEffect(() => {
    if (!isOpen || !detail) return;
    if (detail.follow_up_task?.ai_analysis?.reasoning && detail.follow_up_task?.ai_analysis?.suggestion) {
      setAnalysis({
        reasoning: detail.follow_up_task.ai_analysis.reasoning,
        suggestion: detail.follow_up_task.ai_analysis.suggestion,
      });
    } else {
      setAnalysis(null);
    }
  }, [isOpen, detail?.documentId, detail?.follow_up_task?.ai_analysis]);

  useEffect(() => {
    if (isOpen) setLeadTab('response');
  }, [isOpen, action?.documentId]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo(0, 0);
        const modalEl = modalRef.current;
        if (modalEl) {
          const focusable = modalEl.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const first = focusable[0];
          (first || modalEl).focus({ preventScroll: true });
        }
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!analysis) return;
    setDraft((prev) => {
      if (prev) return prev;
      const parsed = parseMailScannerOutput(analysis.reasoning, analysis.suggestion);
      const nameForGreeting =
        detail?.client?.name ||
        extractWalegoLeadName(
          detail?.follow_up_task?.received_email?.subject || detail?.proposed_content?.subject || ''
        ) ||
        'Contact';
      if (parsed.draft) {
        return sanitizeDraftGreeting(parsed.draft, nameForGreeting, detail?.follow_up_task?.received_email?.from_name);
      }
      if (analysis.suggestion && analysis.suggestion.length > 20 && analysis.suggestion.length < 500) {
        return sanitizeDraftGreeting(
          analysis.suggestion,
          nameForGreeting,
          detail?.follow_up_task?.received_email?.from_name
        );
      }
      return prev;
    });
  }, [analysis?.reasoning, analysis?.suggestion]);

  const displayName =
    detail?.client?.name ||
    receivedEmail?.from_name?.trim() ||
    (profile && profile.name !== 'Contact' ? profile.name : null) ||
    extractWalegoLeadName(
      detail?.follow_up_task?.received_email?.subject || detail?.proposed_content?.subject || ''
    ) ||
    profile?.name ||
    'Contact';
  const extractedLead = useMemo(() => {
    if (!emailBody || !isWalegoMail) return null;
    return extractWalegoLead(emailBody, {
      receivedAt: receivedEmail?.received_at,
      rawEmailSubject: receivedEmail?.subject,
    });
  }, [emailBody, isWalegoMail, receivedEmail?.received_at, receivedEmail?.subject]);
  const leadResponse =
    (profile?.lead_response?.trim() ? profile.lead_response : null) ||
    (isWalegoMail ? extractedLead?.leadResponse?.trim() || null : null);
  const parsed = analysis ? parseMailScannerOutput(analysis.reasoning, analysis.suggestion) : {};
  const confScore = detail?.confidence_score ?? 0;
  const score = parsed.score || (confScore >= 0.8 ? 'hot' : confScore >= 0.6 ? 'warm' : 'neutral');
  const scoreNum = Math.round(confScore * 100);
  const scoreRingColor =
    scoreNum >= 80 ? '#dc2626' : scoreNum >= 60 ? '#ea580c' : scoreNum >= 40 ? '#ca8a04' : '#6b7280';
  const scoreLabelFr =
    scoreNum >= 80 ? 'CHAUD' : scoreNum >= 60 ? 'TIÈDE' : scoreNum >= 40 ? 'NEUTRE' : 'FROID';
  const extendedAi = detail?.follow_up_task?.ai_analysis as ExtendedTaskAIAnalysis | undefined;
  const receivedAt = receivedEmail?.received_at
    ? new Date(receivedEmail.received_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const scrollToDraft = () => {
    draftRef.current?.focus();
    draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const recipientEmail =
    detail?.client?.email?.trim() ||
    receivedEmail?.from_email?.trim() ||
    detail?.proposed_content?.to?.[0]?.trim() ||
    '';

  const handleRegenerate = async () => {
    if (!detail || !leadResponse) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/ai/lead-draft-regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: displayName,
          leadTitle: detail.lead_title,
          leadResponse,
          channel,
          analysis: parsed,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      if (data.draft) setDraft(data.draft);
      showGlobalPopup('Draft régénéré', 'success');
    } catch {
      showGlobalPopup('Erreur régénération', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !detail) return;
    if (!recipientEmail && channel === 'email') {
      showGlobalPopup('Email du destinataire non trouvé', 'error');
      return;
    }

    setSending(true);
    try {
      if (channel === 'email') {
        const token = getToken();
        const res = await fetch('/api/emails/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            to: [recipientEmail!],
            subject: `Re: ${detail.proposed_content?.subject || 'Votre message'}`,
            html: draft.replace(/\n/g, '<br>'),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erreur envoi');
        }
      }
      showGlobalPopup('✓ Message envoyé', 'success');
      onSuccess?.();
      onClose();
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur envoi', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleWhatsAppNotify = async () => {
    if (!detail?.documentId) return;
    setWhatsappSending(true);
    try {
      const result = await sendWhatsAppNotification(detail.documentId);
      if (result.error) throw new Error(result.error);
      showGlobalPopup(`Notif WhatsApp envoyée pour ${displayName}`, 'success');
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur envoi notif WhatsApp', 'error');
    } finally {
      setWhatsappSending(false);
    }
  };

  const handleArchive = async () => {
    if (!detail?.documentId) return;
    setArchiving(true);
    try {
      await archiveSfuLead(detail.documentId);
      showGlobalPopup(`${displayName} archivé`, 'success');
      onSuccess?.();
      onClose();
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur archivage', 'error');
    } finally {
      setArchiving(false);
    }
  };

  const handleSnoozeJ2 = async () => {
    const leadId = detail?.documentId;
    if (!leadId) {
      showGlobalPopup('Lead introuvable', 'error');
      return;
    }
    setSnoozing(true);
    try {
      await snoozeSfuLeadTomorrow(leadId);
      showGlobalPopup(`${displayName} reporté à demain 9h`, 'success');
      onSuccess?.();
      onClose();
    } catch (e) {
      showGlobalPopup(e instanceof Error ? e.message : 'Erreur report', 'error');
    } finally {
      setSnoozing(false);
    }
  };

  if (!action) return null;

  const docForAvatar = detail ?? action;
  const avatarDisplayUrl =
    profile?.avatar_url ||
    docForAvatar?.avatar_path ||
    (docForAvatar
      ? getDefaultContactAvatar(docForAvatar.client?.documentId ?? docForAvatar.documentId).avatarUrl
      : '');
  const linkedinHref = profile?.linkedin_url || detail?.linkedin_url || '';
  const titleLine = profile?.title || detail?.lead_title;

  const signalBarClass =
    score === 'hot'
      ? 'bg-red-500/10 border-red-500/20 text-red-600'
      : score === 'warm'
        ? 'bg-orange-500/10 border-orange-500/20 text-orange-600'
        : score === 'cold'
          ? 'bg-gray-700/10 border-gray-700/20 text-gray-600'
          : 'bg-gray-500/10 border-gray-500/20 text-gray-600';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isDrawer && (
            <motion.div
              key="sfu-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/35 backdrop-blur-[2px]"
              onClick={onClose}
            />
          )}
          <motion.div
            key={isDrawer ? 'sfu-drawer-wrap' : 'sfu-modal-wrap'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
              isDrawer
                ? 'fixed inset-0 z-[9999] pointer-events-none flex justify-end'
                : 'fixed inset-0 z-[9998] flex items-center justify-center bg-black/45 backdrop-blur-sm overflow-hidden overscroll-contain p-4'
            }
            onClick={isDrawer ? undefined : onClose}
            onWheel={(e) => e.stopPropagation()}
          >
            <motion.div
              ref={modalRef}
              tabIndex={-1}
              initial={isDrawer ? { x: '100%' } : { opacity: 0, y: 20, scale: 0.98 }}
              animate={isDrawer ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isDrawer ? { x: '100%' } : { opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={
                isDrawer
                  ? 'pointer-events-auto h-full w-full max-w-[min(780px,100vw)] overflow-hidden flex flex-col shadow-2xl border-l border-[#e2ddd8] bg-[#ffffff] outline-none overscroll-contain'
                  : 'w-full max-w-[780px] max-h-[92vh] overflow-hidden flex flex-col rounded-[20px] shadow-2xl border border-[#e2ddd8] bg-[#ffffff] outline-none overscroll-contain'
              }
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
            <div
              ref={scrollRef}
              className="overflow-y-auto flex-1 outline-none overscroll-contain"
              style={{ paddingBottom: 24 }}
              tabIndex={-1}
            >
              {/* Sticky header : hero + signal */}
              <div
                className={`sticky top-0 z-10 bg-white border-b border-[#e2ddd8] ${isDrawer ? '' : 'rounded-t-[20px]'}`}
              >
                <div className="relative px-7 pt-6 pb-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-5 top-5 w-8 h-8 rounded-full border border-[#e2ddd8] flex items-center justify-center text-[#8a8178] hover:bg-[#f0ede8] hover:text-[#1a1714] transition-colors z-10"
                    aria-label="Fermer"
                  >
                    <IconX className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start justify-between gap-4 pr-10">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <img
                          src={avatarDisplayUrl}
                          alt={displayName}
                          className="absolute inset-0 w-full h-full rounded-full object-cover border-2 border-[#e2ddd8]"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement?.querySelector('[data-avatar-fallback]');
                            if (fb) (fb as HTMLElement).style.display = 'flex';
                          }}
                        />
                        <div
                          data-avatar-fallback
                          className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-br from-[#1a1714] to-[#3d3530] flex items-center justify-center text-white font-bold text-base border-2 border-[#e2ddd8]"
                          style={{ display: 'none' }}
                        >
                          {displayName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white ${
                            isWalegoMail ? 'bg-[#0a66c2]' : 'bg-[#1a1714]'
                          }`}
                          title={isWalegoMail ? 'Source Walego' : 'Email'}
                        >
                          {isWalegoMail ? 'W' : '✉'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-[family-name:var(--font-instrument-serif)] text-[22px] font-normal text-[#1a1714] leading-tight">
                          {displayName}
                        </h2>
                        {titleLine && (
                          <p className="text-[13px] text-[#8a8178] mt-0.5 leading-snug">{titleLine}</p>
                        )}
                        {profile?.campaign && (
                          <p className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-[#b5afa9]">
                            <span className="text-emerald-600">●</span>
                            {profile.campaign}
                          </p>
                        )}
                        {detail?.follow_up_task?.context?.source === 'contact' && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            <IconUser className="w-3 h-3" />
                            Contact existant
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {linkedinHref ? (
                            <a
                              href={linkedinHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white no-underline py-1.5 px-3 rounded-lg bg-[#0a66c2] hover:bg-[#084fa1] transition-colors"
                            >
                              <IconBrandLinkedin className="w-3 h-3" />
                              Voir profil LinkedIn
                            </a>
                          ) : null}
                          {(profile?.email || receivedEmail?.from_email) && (
                            <span className="font-mono text-[10px] text-[#8a8178] bg-[#f0ede8] border border-[#e2ddd8] px-2 py-1 rounded-md">
                              {profile?.email || receivedEmail?.from_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                      <div
                        className="w-14 h-14 rounded-full border-[3px] flex flex-col items-center justify-center"
                        style={{ borderColor: scoreRingColor }}
                      >
                        <span className="text-base font-bold text-[#1a1714] leading-none">{scoreNum}</span>
                        <span className="font-mono text-[8px] text-[#b5afa9]">/100</span>
                      </div>
                      <span className="font-mono text-[10px] font-semibold" style={{ color: scoreRingColor }}>
                        {scoreLabelFr}
                      </span>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 py-2.5 px-7 mx-0 mb-4 bg-[#f0ede8] border-y border-[#e2ddd8]">
                    <IconLoader2 className="w-4 h-4 animate-spin text-[#8a8178]" />
                    <span className="text-[11px] text-[#8a8178]">Chargement...</span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-2 py-2.5 px-7 mx-0 mb-0 border-t border-[#e2ddd8] text-[11px] font-medium ${signalBarClass}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      {parsed.signal || analysis?.suggestion || "Analyse en attente — traitement automatique en cours (cron ~1 min)"}
                    </span>
                    <span className="font-mono text-[11px] opacity-70 flex-shrink-0">
                      {score === 'hot' && '🔴 CHAUD'}
                      {score === 'warm' && '🟠 TIÈDE'}
                      {score === 'neutral' && '🟡 NEUTRE'}
                      {score === 'cold' && '⚫ FROID'}
                      {detail?.confidence_score != null && ` · ${scoreNum}/100`}
                    </span>
                  </div>
                )}
              </div>

              {/* Onglets + grille 2 colonnes */}
              <div className="border-b border-[#e2ddd8] px-7 flex gap-0">
                <button
                  type="button"
                  onClick={() => setLeadTab('response')}
                  className={`py-3 px-4 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                    leadTab === 'response'
                      ? 'text-[#1a1714] border-[#1a1714]'
                      : 'text-[#8a8178] border-transparent hover:text-[#1a1714]'
                  }`}
                >
                  Réponse reçue
                </button>
                <button
                  type="button"
                  onClick={() => setLeadTab('context')}
                  className={`py-3 px-4 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                    leadTab === 'context'
                      ? 'text-[#1a1714] border-[#1a1714]'
                      : 'text-[#8a8178] border-transparent hover:text-[#1a1714]'
                  }`}
                >
                  {isWalegoMail ? 'Contexte Walego' : 'Contexte email'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] min-h-[200px]">
                <div className="border-b md:border-b-0 md:border-r border-[#e2ddd8] px-7 py-5">
                  {leadTab === 'response' ? (
                    <>
                      <div className="mb-5">
                        <div className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-2">
                          Message du lead
                        </div>
                        {leadResponse ? (
                          <>
                            <blockquote className="bg-[#f0ede8] border-l-[3px] border-[#1a1714] rounded-r-lg py-3 px-4 text-[13px] leading-relaxed text-[#1a1714] italic m-0">
                              &ldquo;{leadResponse}&rdquo;
                            </blockquote>
                            <p className="font-mono text-[11px] text-[#b5afa9] mt-2">
                              {displayName} · via Email · {receivedAt || 'N/A'}
                            </p>
                          </>
                        ) : emailBody ? (
                          <>
                            <p className="text-[11px] text-[#b5afa9] mb-2 font-mono uppercase tracking-wider">
                              Aperçu brut (extraction non reconnue)
                            </p>
                            <blockquote className="text-[11px] text-[#1a1714] leading-relaxed pl-3 border-l-2 border-[#d0cbc4] max-h-40 overflow-y-auto">
                              {emailBody.slice(0, 600)}
                              {emailBody.length > 600 && '…'}
                            </blockquote>
                            <p className="font-mono text-[11px] text-[#b5afa9] mt-2">
                              {displayName} · via Email · {receivedAt || 'N/A'}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-[#8a8178] italic">
                            Aucun message — signal non verbal ou contenu email indisponible
                          </p>
                        )}
                      </div>
                      {(profile?.lead_reasoning || extendedAi?.signal) && (
                        <div>
                          <div className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-2">
                            Pourquoi c&apos;est un lead
                          </div>
                          <p className="text-[12px] text-[#8a8178] leading-relaxed m-0">
                            {extendedAi?.signal || profile?.lead_reasoning || '—'}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {profile?.persona && (
                        <div className="mb-5">
                          <div className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-2">
                            Persona Walego
                          </div>
                          <span className="inline-flex px-2.5 py-1.5 rounded-md border border-[#e2ddd8] bg-white text-[11px] font-medium text-[#1a1714]">
                            {profile.persona}
                          </span>
                        </div>
                      )}
                      {profile?.persona_reasoning && (
                        <div className="mb-5">
                          <div className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-2">
                            Analyse du profil
                          </div>
                          <p className="text-[12px] text-[#8a8178] leading-relaxed m-0 line-clamp-4">
                            {profile.persona_reasoning}
                          </p>
                        </div>
                      )}
                      {!profile?.persona?.trim() && !profile?.persona_reasoning?.trim() && (
                        <p className="text-[11px] text-[#8a8178] italic">
                          Aucun contexte persona extrait du mail.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-[#f0ede8]/80 px-5 py-5 md:px-5">
                  <div className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-3">
                    Analyse IA
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm flex-shrink-0" aria-hidden>
                        🎯
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-0.5">
                          Signal détecté
                        </p>
                        <p className="text-[12px] text-[#1a1714] leading-snug">
                          {extendedAi?.signal ||
                            parsed.signal ||
                            profile?.lead_reasoning?.slice(0, 200) ||
                            analysis?.reasoning?.slice(0, 200) ||
                            '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm flex-shrink-0" aria-hidden>
                        👤
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-0.5">
                          Profil
                        </p>
                        <p className="text-[12px] text-[#1a1714] leading-snug">
                          {parsed.profil || profile?.persona || profile?.title || detail?.lead_title || '—'}
                        </p>
                      </div>
                    </div>
                    {profile?.lead_tips ? (
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm flex-shrink-0" aria-hidden>
                          ⚡
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-0.5">
                            Conseil Walego
                          </p>
                          <p className="text-[12px] text-[#1a1714] leading-snug line-clamp-4">
                            {profile.lead_tips}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm flex-shrink-0" aria-hidden>
                        🌡️
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] text-[#b5afa9] uppercase tracking-wider mb-0.5">
                          Risque fog
                        </p>
                        <p className="text-[12px] text-[#1a1714] leading-snug">
                          {parsed.fogExplanation || (parsed.fogRisk ? 'Oui' : 'Non')}
                          {extendedAi?.fog_risk === true && ' · ⚠'}
                        </p>
                        {parsed.fogRisk && (
                          <span className="inline-flex items-center gap-1 mt-1.5 font-mono text-[10px] py-1 px-2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Fog élevé · agir rapidement
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body : actions + draft */}
              <div className="px-7 py-6 flex flex-col gap-5 border-t border-[#e2ddd8]">
                {/* Actions */}
                <section>
                  <div className="flex items-center gap-2 mb-2.5 font-mono text-[10px] text-[#b5afa9] uppercase tracking-wider">
                    <span>Action recommandée</span>
                    <div className="flex-1 h-px bg-[#e2ddd8]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={scrollToDraft}
                      className="flex items-center gap-3 px-4 py-3.5 bg-primary   border-none cursor-pointer transition-all hover:bg-[#2d2924] hover:-translate-y-0.5 hover:shadow-lg w-full text-left"
                    >
                      <div className="w-9 h-9  bg-white/10 flex items-center justify-center flex-shrink-0">
                        <IconSend className="w-4 h-4 !text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold !text-white">
                          {parsed.action || 'Rédiger et envoyer le message'}
                        </p>
                        <p className="font-mono text-[11px] !text-white/80 mt-0.5">
                          {parsed.actionTiming || 'Dans les 2h'} · message pré-rédigé ci-dessous
                        </p>
                      </div>
                      <IconChevronRight className="w-4 h-4 text-white/40" />
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSnoozeJ2}
                        disabled={snoozing || !detail?.follow_up_task?.documentId}
                        className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] cursor-pointer transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {snoozing ? (
                          <IconLoader2 className="w-7 h-7 animate-spin text-amber-600" />
                        ) : (
                          <div className="w-7 h-7 bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <IconClock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1a1714]">
                            Reporter {displayName} à J+2
                          </p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Si pas de réponse</p>
                        </div>
                      </button>
                      <button
                        onClick={handleWhatsAppNotify}
                        disabled={whatsappSending || !detail?.documentId}
                        className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] cursor-pointer transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {whatsappSending ? (
                          <IconLoader2 className="w-7 h-7 animate-spin text-[#25d366]" />
                        ) : (
                          <div className="w-7 h-7 bg-[#25d366]/10 text-[#25d366] flex items-center justify-center flex-shrink-0">
                            <IconBrandWhatsapp className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1a1714]">
                            Notifier {displayName} sur WhatsApp
                          </p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Alerter sur mobile</p>
                        </div>
                      </button>
                      <a
                        href={linkedinHref || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left no-underline"
                      >
                        <div className="w-7 h-7 bg-[#0077b5]/10 text-[#0077b5] flex items-center justify-center flex-shrink-0">
                          <IconBrandLinkedin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#1a1714]">
                            Voir profil LinkedIn de {displayName}
                          </p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Contexte avant call</p>
                        </div>
                      </a>
                      <button
                        onClick={handleArchive}
                        disabled={archiving || !detail?.documentId}
                        className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] cursor-pointer transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {archiving ? (
                          <IconLoader2 className="w-7 h-7 animate-spin text-gray-500" />
                        ) : (
                          <div className="w-7 h-7 bg-gray-500/10 text-gray-500 flex items-center justify-center flex-shrink-0">
                            <IconArchive className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-[#1a1714]">
                            Archiver {displayName}
                          </p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Pas pertinent</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Draft */}
                <section>
                  <div className="flex items-center gap-2 mb-2.5 font-mono text-[10px] text-[#b5afa9] uppercase tracking-wider">
                    <span>Message à envoyer</span>
                    <div className="flex-1 h-px bg-[#e2ddd8]" />
                  </div>

                  <div className="flex gap-1.5 mb-2.5">
                    {(['linkedin', 'email', 'whatsapp'] as const).map((ch) => {
                      const activeStyles =
                        ch === 'linkedin'
                          ? 'bg-[#0077b5] border-[#0077b5] text-white'
                          : ch === 'whatsapp'
                            ? 'bg-[#25d366] border-[#25d366] text-white'
                            : 'bg-[#1a1714] border-[#1a1714] text-white';
                      const disabledChannel =
                        (ch === 'email' && !recipientEmail) ||
                        (ch === 'linkedin' && !linkedinHref);
                      return (
                        <button
                          key={ch}
                          type="button"
                          disabled={disabledChannel}
                          onClick={() => setChannel(ch)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border font-mono text-[11px] transition-colors ${
                            channel === ch
                              ? activeStyles
                              : 'border-[#e2ddd8] text-[#8a8178] hover:border-[#d0cbc4]'
                          } ${disabledChannel ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {ch === 'linkedin' && <IconBrandLinkedin className="w-3 h-3" />}
                          {ch === 'email' && <IconMail className="w-3 h-3" />}
                          {ch === 'whatsapp' && <IconBrandWhatsapp className="w-3 h-3" />}
                          {ch === 'linkedin' ? 'LinkedIn' : ch === 'email' ? 'Email' : 'WhatsApp'}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    ref={draftRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message adressé au lead..."
                    className="w-full min-h-[110px] bg-[#f0ede8] border border-[#e2ddd8]  px-4 py-3.5 text-[11px] text-[#1a1714] leading-relaxed resize-y outline-none focus:border-[#d0cbc4] transition-colors font-sans"
                    rows={5}
                  />

                  <div className="flex items-center justify-between mt-2.5">
                    <span className="font-mono text-[11px] text-[#b5afa9]">
                      {draft.length} caractères
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="py-2 px-3.5  border border-[#e2ddd8] font-sans text-xs font-medium text-[#8a8178] hover:border-[#d0cbc4] hover:text-[#1a1714] hover:bg-[#f0ede8] transition-colors disabled:opacity-50"
                      >
                        {regenerating ? (
                          <IconLoader2 className="w-3.5 h-3.5 animate-spin inline" />
                        ) : (
                          '↻ Regénérer'
                        )}
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={sending || !draft.trim() || (channel === 'email' && !recipientEmail)}
                        className="py-2 px-4 btn-primary font-sans text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {sending ? (
                          <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <IconSend className="w-3.5 h-3.5" />
                        )}
                        Envoyer
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
