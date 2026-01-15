'use client';

import React from 'react';
import { IconMail, IconHeading } from '@tabler/icons-react';

export interface EmailContentFormData {
  title: string;
  subject: string;
  message: string;
}

interface EmailContentFormProps {
  data: EmailContentFormData;
  onChange: (data: Partial<EmailContentFormData>) => void;
  /** Show title field (for newsletters) */
  showTitle?: boolean;
  /** Custom labels */
  labels?: {
    title?: string;
    titlePlaceholder?: string;
    titleHint?: string;
    subject?: string;
    subjectPlaceholder?: string;
    subjectHint?: string;
    message?: string;
    messagePlaceholder?: string;
  };
  /** Custom message editor (for rich text) */
  messageEditor?: React.ReactNode;
  /** Additional class for the container */
  className?: string;
}

/**
 * Composant réutilisable pour le formulaire de contenu email
 * Utilisé par les pages d'envoi d'email et de newsletters
 */
export default function EmailContentForm({
  data,
  onChange,
  showTitle = true,
  labels = {},
  messageEditor,
  className = '',
}: EmailContentFormProps) {
  const defaultLabels = {
    title: 'Titre de l\'email',
    titlePlaceholder: 'Ex: Bienvenue dans notre newsletter',
    titleHint: 'Affiché en en-tête de l\'email',
    subject: 'Objet de l\'email',
    subjectPlaceholder: 'Ex: Découvrez nos nouvelles fonctionnalités',
    subjectHint: 'visible dans la boîte de réception',
    message: 'Message',
    messagePlaceholder: 'Rédigez votre message ici...',
  };

  const l = { ...defaultLabels, ...labels };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Title & Subject in same card */}
      <div className="bg-card border border-default rounded-xl p-6 space-y-4">
        {/* Title field */}
        {showTitle && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              <IconHeading className="w-4 h-4 inline mr-1.5 !text-accent" />
              {l.title} *
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={l.titlePlaceholder}
              className="input w-full text-lg"
            />
            {l.titleHint && (
              <p className="text-xs text-muted mt-1">{l.titleHint}</p>
            )}
          </div>
        )}

        {/* Subject field */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            <IconMail className="w-4 h-4 inline mr-1.5 !text-accent" />
            {l.subject} *
            {l.subjectHint && (
              <span className="text-muted font-normal ml-2">({l.subjectHint})</span>
            )}
          </label>
          <input
            type="text"
            value={data.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder={l.subjectPlaceholder}
            className="input w-full"
          />
        </div>
      </div>

      {/* Message field */}
      <div className="bg-card border border-default rounded-xl p-6">
        <label className="block text-sm font-medium text-secondary mb-3">
          {l.message} *
        </label>
        
        {messageEditor ? (
          messageEditor
        ) : (
          <textarea
            value={data.message}
            onChange={(e) => onChange({ message: e.target.value })}
            placeholder={l.messagePlaceholder}
            rows={12}
            className="input w-full resize-y"
          />
        )}
      </div>
    </div>
  );
}

export { EmailContentForm };

