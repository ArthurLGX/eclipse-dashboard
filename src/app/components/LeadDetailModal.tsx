'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { fetchAutomationActionDetail } from '@/lib/smart-follow-up-api';
import {
  extractWalegoLeadName,
  extractWalegoLeadResponse,
} from '@/utils/walego-lead-status';
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

type Channel = 'linkedin' | 'email' | 'whatsapp';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: AutomationAction | null;
  onSuccess?: () => void;
}

export default function LeadDetailModal({
  isOpen,
  onClose,
  action,
  onSuccess,
}: LeadDetailModalProps) {
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
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [channel, setChannel] = useState<Channel>('linkedin');
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const emailBody =
    detail?.follow_up_task?.received_email?.content_text ||
    detail?.follow_up_task?.received_email?.content_html ||
    detail?.follow_up_task?.context?.email_body ||
    '';

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
    fetchAutomationActionDetail(currentAction.documentId)
      .then((data) => {
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

  useEffect(() => {
    if (!isOpen || !detail) return;
    if (detail.follow_up_task?.ai_analysis?.reasoning && detail.follow_up_task?.ai_analysis?.suggestion) {
      setAnalysis({
        reasoning: detail.follow_up_task.ai_analysis.reasoning,
        suggestion: detail.follow_up_task.ai_analysis.suggestion,
      });
      return;
    }
    if (!emailBody || !detail.follow_up_task) {
      setAnalysisLoading(false);
      return;
    }

    setAnalysisLoading(true);
    const task = {
      documentId: detail.follow_up_task.documentId,
      context: detail.follow_up_task.context || {},
      ai_analysis: detail.follow_up_task.ai_analysis || {},
      received_email: detail.follow_up_task.received_email,
    };

    fetch('/api/ai/task-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        email_body: emailBody,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.reasoning || data.suggestion) {
          setAnalysis({
            reasoning: data.reasoning || '',
            suggestion: data.suggestion || '',
          });
          if (data.draft && !draft) setDraft(data.draft);
        }
      })
      .catch(() => showGlobalPopup('Erreur analyse IA', 'error'))
      .finally(() => setAnalysisLoading(false));
  }, [isOpen, detail?.documentId, emailBody]);

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
      if (parsed.draft) return parsed.draft;
      if (analysis.suggestion && analysis.suggestion.length > 20 && analysis.suggestion.length < 500) {
        return analysis.suggestion;
      }
      return prev;
    });
  }, [analysis?.reasoning, analysis?.suggestion]);

  const displayName =
    detail?.client?.name ||
    extractWalegoLeadName(
      detail?.follow_up_task?.received_email?.subject ||
        detail?.proposed_content?.subject ||
        ''
    ) ||
    'Contact';
  const leadResponse = emailBody ? extractWalegoLeadResponse(emailBody) : null;
  const parsed = analysis ? parseMailScannerOutput(analysis.reasoning, analysis.suggestion) : {};
  const confScore = detail?.confidence_score ?? 0;
  const score = parsed.score || (confScore >= 0.8 ? 'hot' : confScore >= 0.6 ? 'warm' : 'neutral');
  const receivedEmail = detail?.follow_up_task?.received_email;
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
    const recipientEmail = detail.client?.email || detail.proposed_content?.to?.[0];
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
            to: [recipientEmail],
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

  if (!action) return null;

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/45 backdrop-blur-sm overflow-hidden overscroll-contain p-4"
          onClick={onClose}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-[720px] max-h-[92vh] overflow-hidden flex flex-col rounded-[20px] shadow-2xl border border-[#e2ddd8] bg-[#ffffff] outline-none overscroll-contain"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div
              ref={scrollRef}
              className="overflow-y-auto flex-1 outline-none overscroll-contain"
              style={{ paddingBottom: 24 }}
              tabIndex={-1}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-[#e2ddd8] px-7 pt-6 pb-5 rounded-t-[20px]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    {detail?.avatar_path ? (
                      <img
                        src={detail.avatar_path}
                        alt={displayName}
                        className="w-[52px] h-[52px] rounded-full object-cover border-2 border-[#e2ddd8] flex-shrink-0"
                      />
                    ) : (
                      <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#ff5c3a] to-[#e8441f] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 border-2 border-[#e2ddd8]">
                        {displayName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="font-[family-name:var(--font-instrument-serif)] text-[22px] font-normal text-[#1a1714] leading-tight">
                        {displayName}
                      </h2>
                      {detail?.lead_title && (
                        <p className="text-[13px] text-[#8a8178] mt-0.5">{detail.lead_title}</p>
                      )}
                      {detail?.linkedin_url && (
                        <a
                          href={detail.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1.5 font-mono text-[11px] text-[#0077b5] no-underline py-1 px-2 rounded bg-[#0077b5]/10 border border-[#0077b5]/20"
                        >
                          <IconBrandLinkedin className="w-3 h-3" />
                          Voir profil LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg border border-[#e2ddd8] flex items-center justify-center text-[#8a8178] hover:bg-[#f0ede8] hover:text-[#1a1714] transition-colors flex-shrink-0"
                  >
                    <IconX className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Signal bar */}
                {(loading || analysisLoading) ? (
                  <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#f0ede8] border border-[#e2ddd8]">
                    <IconLoader2 className="w-4 h-4 animate-spin text-[#8a8178]" />
                    <span className="text-[13px] text-[#8a8178]">Analyse en cours...</span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl border text-[13px] font-medium ${signalBarClass}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse flex-shrink-0" />
                    <span className="flex-1">
                      {parsed.signal || analysis?.suggestion || 'Signal en cours d\'analyse'}
                    </span>
                    <span className="font-mono text-[11px] opacity-70 ml-auto">
                      {score === 'hot' && '🔴 CHAUD'}
                      {score === 'warm' && '🟠 TIÈDE'}
                      {score === 'neutral' && '🟡 NEUTRE'}
                      {score === 'cold' && '⚫ FROID'}
                      {detail?.confidence_score != null && ` · ${Math.round(detail.confidence_score * 100)}/100`}
                    </span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="px-7 py-6 flex flex-col gap-5">
                {/* Réponse reçue */}
                <section>
                  <div className="flex items-center gap-2 mb-2.5 font-mono text-[10px] text-[#b5afa9] uppercase tracking-wider">
                    <span>Réponse reçue</span>
                    <div className="flex-1 h-px bg-[#e2ddd8]" />
                  </div>
                  <div className="bg-[#f0ede8] border border-[#e2ddd8] rounded-xl p-4">
                    {leadResponse ? (
                      <>
                        <blockquote className="font-[family-name:var(--font-instrument-serif)] italic text-[15px] text-[#1a1714] leading-relaxed pl-3.5 border-l-2 border-red-500 mb-2">
                          &ldquo;{leadResponse}&rdquo;
                        </blockquote>
                        <p className="font-mono text-[11px] text-[#b5afa9]">
                          {displayName} · via Email · {receivedAt || 'N/A'}
                        </p>
                      </>
                    ) : emailBody ? (
                      <>
                        <p className="text-[11px] text-[#b5afa9] mb-2 font-mono uppercase tracking-wider">Aperçu brut (extraction non reconnue)</p>
                        <blockquote className="text-[13px] text-[#1a1714] leading-relaxed pl-3.5 border-l-2 border-[#d0cbc4] max-h-32 overflow-y-auto">
                          {emailBody.slice(0, 600)}
                          {emailBody.length > 600 && '…'}
                        </blockquote>
                        <p className="font-mono text-[11px] text-[#b5afa9] mt-2">
                          {displayName} · via Email · {receivedAt || 'N/A'}
                        </p>
                      </>
                    ) : (
                      <p className="text-[13px] text-[#8a8178] italic">
                        Aucun contenu email disponible (content_text/html absent de l&apos;API)
                      </p>
                    )}
                  </div>
                </section>

                {/* Analyse IA */}
                <section>
                  <div className="flex items-center gap-2 mb-2.5 font-mono text-[10px] text-[#b5afa9] uppercase tracking-wider">
                    <span>Analyse</span>
                    <div className="flex-1 h-px bg-[#e2ddd8]" />
                  </div>
                  <div className="bg-[#f0ede8] border border-[#e2ddd8] rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-[#e2ddd8] last:border-b-0">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconActivity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1a1714] mb-0.5">Signal détecté</p>
                        <p className="text-[13px] text-[#8a8178] leading-relaxed">
                          {parsed.signal || analysis?.reasoning?.slice(0, 200) || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-[#e2ddd8] last:border-b-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconAlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1a1714] mb-0.5">Risque fog</p>
                        <p className="text-[13px] text-[#8a8178] leading-relaxed">
                          {parsed.fogExplanation || (parsed.fogRisk ? 'Oui' : 'Non')}
                        </p>
                        {parsed.fogRisk && (
                          <span className="inline-flex items-center gap-1 mt-1.5 font-mono text-[10px] py-1 px-2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            ⚠ Fog élevé · agir rapidement
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconUser className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1a1714] mb-0.5">Profil</p>
                        <p className="text-[13px] text-[#8a8178] leading-relaxed">
                          {parsed.profil || detail?.lead_title || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Actions */}
                <section>
                  <div className="flex items-center gap-2 mb-2.5 font-mono text-[10px] text-[#b5afa9] uppercase tracking-wider">
                    <span>Action recommandée</span>
                    <div className="flex-1 h-px bg-[#e2ddd8]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={scrollToDraft}
                      className="flex items-center gap-3 px-4 py-3.5 bg-primary  rounded-xl border-none cursor-pointer transition-all hover:bg-[#2d2924] hover:-translate-y-0.5 hover:shadow-lg w-full text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
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
                      <button className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] rounded-xl cursor-pointer transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <IconClock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#1a1714]">Relance auto J+2</p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Si pas de réponse</p>
                        </div>
                      </button>
                      <button className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] rounded-xl cursor-pointer transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left">
                        <div className="w-7 h-7 rounded-lg bg-[#25d366]/10 text-[#25d366] flex items-center justify-center flex-shrink-0">
                          <IconBrandWhatsapp className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#1a1714]">Notif WhatsApp</p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Alerter sur mobile</p>
                        </div>
                      </button>
                      <a
                        href={detail?.linkedin_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] rounded-xl transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left no-underline"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#0077b5]/10 text-[#0077b5] flex items-center justify-center flex-shrink-0">
                          <IconBrandLinkedin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#1a1714]">Voir profil LinkedIn</p>
                          <p className="font-mono text-[10px] text-[#8a8178]">Contexte avant call</p>
                        </div>
                      </a>
                      <button className="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-[#e2ddd8] rounded-xl cursor-pointer transition-colors hover:border-[#d0cbc4] hover:bg-[#f0ede8] text-left">
                        <div className="w-7 h-7 rounded-lg bg-gray-500/10 text-gray-500 flex items-center justify-center flex-shrink-0">
                          <IconArchive className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#1a1714]">Archiver</p>
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
                      return (
                        <button
                          key={ch}
                          onClick={() => setChannel(ch)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md border font-mono text-[11px] transition-colors ${
                            channel === ch
                              ? activeStyles
                              : 'border-[#e2ddd8] text-[#8a8178] hover:border-[#d0cbc4]'
                          }`}
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
                    className="w-full min-h-[110px] bg-[#f0ede8] border border-[#e2ddd8] rounded-xl px-4 py-3.5 text-[13px] text-[#1a1714] leading-relaxed resize-y outline-none focus:border-[#d0cbc4] transition-colors font-sans"
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
                        className="py-2 px-3.5 rounded-lg border border-[#e2ddd8] font-sans text-xs font-medium text-[#8a8178] hover:border-[#d0cbc4] hover:text-[#1a1714] hover:bg-[#f0ede8] transition-colors disabled:opacity-50"
                      >
                        {regenerating ? (
                          <IconLoader2 className="w-3.5 h-3.5 animate-spin inline" />
                        ) : (
                          '↻ Regénérer'
                        )}
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={sending || !draft.trim()}
                        className="py-2 px-4 rounded-lg bg-[#e5381a] text-white font-sans text-xs font-semibold flex items-center gap-1.5 hover:bg-[#cc2e12] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
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
      )}
    </AnimatePresence>
  );
}
