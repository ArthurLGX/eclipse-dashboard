'use client';

import React, { useMemo } from 'react';
import { IconX, IconUser, IconPhoto, IconLink, IconMessageCircle, IconCheck } from '@tabler/icons-react';
import {
  extractWalegoLeadNameFromBody,
  extractWalegoLeadTitleFromBody,
  extractWalegoAvatarFromBody,
  extractWalegoLinkedInFromBody,
  extractWalegoLeadResponse,
  parseWalegoLeadStatus,
} from '@/utils/walego-lead-status';
import { WALEGO_SAMPLE_EMAIL_HTML } from '@/data/walego-sample-email';
import type { AutomationAction } from '@/types/smart-follow-up';

interface WalegoSimulationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAsLead: (simulatedDetail: AutomationAction) => void;
}

export default function WalegoSimulationDrawer({ isOpen, onClose, onOpenAsLead }: WalegoSimulationDrawerProps) {
  const extracted = useMemo(() => {
    const html = WALEGO_SAMPLE_EMAIL_HTML;
    const name = extractWalegoLeadNameFromBody(html);
    const title = extractWalegoLeadTitleFromBody(html);
    const avatar = extractWalegoAvatarFromBody(html);
    const linkedin = extractWalegoLinkedInFromBody(html);
    const response = extractWalegoLeadResponse(html);
    const leadStatus = parseWalegoLeadStatus(html);
    return { name, title, avatar, linkedin, response, leadStatus };
  }, []);

  const handleOpenAsLead = () => {
    const html = WALEGO_SAMPLE_EMAIL_HTML;
    const mockDetail: AutomationAction = {
      id: 0,
      documentId: 'simulated-walego',
      user: { id: 0, username: 'simulation' },
      client: {
        id: 0,
        documentId: 'sim-cl',
        name: extracted.name || 'Rosa BELLEI',
        email: '',
      },
      avatar_path: extracted.avatar || undefined,
      lead_title: extracted.title || undefined,
      linkedin_url: extracted.linkedin || undefined,
      follow_up_task: {
        id: 0,
        documentId: 'sim-task',
        task_type: 'custom',
        context: {},
        received_email: {
          id: 0,
          subject: 'New Lead Identified!',
          content_html: html,
          content_text: '',
          received_at: new Date().toISOString(),
        },
      },
      approved_by: null,
      action_type: 'send_email',
      proposed_content: {
        subject: 'Re: Rosa BELLEI',
        body: '',
        to: [],
        cc: [],
        attachments: [],
      },
      status_automation_action: 'pending',
      edited_content: null,
      execution_result: null,
      approved_at: null,
      executed_at: null,
      rejection_reason: null,
      confidence_score: 0.85,
      requires_approval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onOpenAsLead(mockDetail);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-default shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b border-default">
          <h3 className="!text-base font-semibold !text-primary">Simulation email Walego</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary  transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="!text-sm !text-muted">
            Vérifiez que l&apos;extraction du lead fonctionne correctement avant d&apos;ouvrir en mode simulation.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3  bg-secondary/50 border border-default">
              <IconUser className="w-4 h-4 mt-0.5 flex-shrink-0 !text-muted" />
              <div>
                <p className="!text-[10px] font-mono uppercase !text-muted mb-1">Nom</p>
                <p className="!text-sm font-medium !text-primary">
                  {extracted.name ? (
                    <span className="inline-flex items-center gap-1.5">
                      {extracted.name}
                      <IconCheck className="w-3.5 h-3.5 !text-emerald-600" />
                    </span>
                  ) : (
                    <span className="!text-rose-600">Non extrait</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3  bg-secondary/50 border border-default">
              <IconUser className="w-4 h-4 mt-0.5 flex-shrink-0 !text-muted" />
              <div>
                <p className="!text-[10px] font-mono uppercase !text-muted mb-1">Titre / Poste</p>
                <p className="!text-sm !text-primary">
                  {extracted.title ? (
                    <span className="inline-flex items-center gap-1.5">
                      {extracted.title.slice(0, 60)}{extracted.title.length > 60 ? '…' : ''}
                      <IconCheck className="w-3.5 h-3.5 !text-emerald-600 flex-shrink-0" />
                    </span>
                  ) : (
                    <span className="!text-rose-600">Non extrait</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3  bg-secondary/50 border border-default">
              <IconPhoto className="w-4 h-4 mt-0.5 flex-shrink-0 !text-muted" />
              <div className="min-w-0 flex-1">
                <p className="!text-[10px] font-mono uppercase !text-muted mb-1">Avatar</p>
                {extracted.avatar ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={extracted.avatar}
                      alt="Avatar lead"
                      className="w-10 h-10 rounded-full object-cover border border-default"
                    />
                    <span className="!text-xs !text-muted truncate flex-1">{extracted.avatar.slice(0, 40)}…</span>
                    <IconCheck className="w-3.5 h-3.5 !text-emerald-600 flex-shrink-0" />
                  </div>
                ) : (
                  <p className="!text-sm !text-rose-600">Non extrait</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3  bg-secondary/50 border border-default">
              <IconLink className="w-4 h-4 mt-0.5 flex-shrink-0 !text-muted" />
              <div>
                <p className="!text-[10px] font-mono uppercase !text-muted mb-1">LinkedIn</p>
                <p className="!text-sm !text-primary">
                  {extracted.linkedin ? (
                    <span className="inline-flex items-center gap-1.5">
                      <a href={extracted.linkedin} target="_blank" rel="noopener noreferrer" className="!text-accent underline truncate max-w-[200px] inline-block">
                        {extracted.linkedin.slice(0, 35)}…
                      </a>
                      <IconCheck className="w-3.5 h-3.5 !text-emerald-600" />
                    </span>
                  ) : (
                    <span className="!text-rose-600">Non extrait</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3  bg-secondary/50 border border-default">
              <IconMessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0 !text-muted" />
              <div>
                <p className="!text-[10px] font-mono uppercase !text-muted mb-1">Réponse du lead</p>
                <p className="!text-sm font-[family-name:var(--font-instrument-serif)] italic !text-primary">
                  {extracted.response ? (
                    <span className="inline-flex items-center gap-1.5">
                      &ldquo;{extracted.response}&rdquo;
                      <IconCheck className="w-3.5 h-3.5 !text-emerald-600" />
                    </span>
                  ) : (
                    <span className="!text-rose-600">Non extrait</span>
                  )}
                </p>
              </div>
            </div>

            {extracted.leadStatus && (
              <div className="p-3  bg-secondary/50 border border-default">
                <p className="!text-[10px] font-mono uppercase !text-muted mb-2">Lead Status</p>
                <p className="!text-xs !text-primary">
                  <strong>Status:</strong> {extracted.leadStatus.status || '—'}
                </p>
                {extracted.leadStatus.reasoning && (
                  <p className="!text-xs !text-muted mt-1 line-clamp-3">{extracted.leadStatus.reasoning}</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleOpenAsLead}
            className="w-full py-3 rounded-xl font-medium !text-white bg-primary hover:opacity-90 transition-opacity"
          >
            Ouvrir comme lead (simulation)
          </button>
        </div>
      </div>
    </div>
  );
}
