'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconMail,
  IconSend,
  IconEye,
  IconLoader2,
  IconClipboardList,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { useModalScroll } from '@/hooks/useModalFocus';
import EmailPreviewModal from './EmailPreviewModal';

// Types
interface TaskInfo {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
}

interface RecipientWithTasks {
  email: string;
  username: string;
  documentId: string;
  tasks: TaskInfo[];
}

interface TaskNotificationEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (sendEmails: boolean) => Promise<void>;
  recipients: RecipientWithTasks[];
  projectName: string;
  projectUrl: string;
}

// Générer le HTML de l'email
function generateEmailHtml(
  recipient: RecipientWithTasks,
  subject: string,
  message: string,
  projectName: string,
  projectUrl: string,
  buttonColor: string = '#7C3AED'
): string {
  const taskListHtml = recipient.tasks.map(task => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
        <div style="font-weight: 600; color: #1F2937; margin-bottom: 4px;">${task.title}</div>
        ${task.description ? `<div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
        <div style="display: flex; gap: 12px; font-size: 12px; color: #9CA3AF;">
          ${task.priority ? `<span>Priorité: ${task.priority}</span>` : ''}
          ${task.due_date ? `<span>Échéance: ${new Date(task.due_date).toLocaleDateString('fr-FR')}</span>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${buttonColor} 0%, #5B21B6 100%); border-radius: 16px 16px 0 0; padding: 32px; !text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
        📋 Nouvelles tâches assignées
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
        Projet: ${projectName}
      </p>
    </div>
    
    <!-- Content -->
    <div style="background-color: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <!-- Greeting -->
      <p style="color: #1F2937; font-size: 16px; margin: 0 0 16px;">
        Bonjour <strong>${recipient.username}</strong>,
      </p>
      
      <!-- Custom message -->
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        ${message.replace(/\n/g, '<br>')}
      </p>
      
      <!-- Task count badge -->
      <div style="background-color: ${buttonColor}15; border: 1px solid ${buttonColor}30; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: inline-block;">
        <span style="color: ${buttonColor}; font-weight: 600; font-size: 14px;">
          ${recipient.tasks.length} tâche${recipient.tasks.length > 1 ? 's' : ''} ${recipient.tasks.length > 1 ? 'vous ont été assignées' : 'vous a été assignée'}
        </span>
      </div>
      
      <!-- Tasks list -->
      <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <thead>
          <tr>
            <th style="padding: 12px 16px; !text-align: left; background-color: #F3F4F6; color: #6B7280; font-size: 12px; font-weight: 600; !text-transform: uppercase; letter-spacing: 0.5px;">
              Vos tâches
            </th>
          </tr>
        </thead>
        <tbody>
          ${taskListHtml}
        </tbody>
      </table>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, ${buttonColor} 0%, #5B21B6 100%); color: white; !text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px ${buttonColor}40;">
          Voir mes tâches →
        </a>
      </div>
      
      <!-- Footer note -->
      <p style="color: #9CA3AF; font-size: 13px; !text-align: center; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Cet email a été envoyé automatiquement depuis Eclipse Dashboard.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export default function TaskNotificationEmailModal({
  isOpen,
  onClose,
  onSend,
  recipients,
  projectName,
  projectUrl,
}: TaskNotificationEmailModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // États
  const [subject, setSubject] = useState(`Nouvelles tâches assignées - ${projectName}`);
  const [message, setMessage] = useState(
    `Vous avez de nouvelles tâches assignées sur le projet "${projectName}". Veuillez consulter les détails ci-dessous.`
  );
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState<RecipientWithTasks | null>(null);
  
  // Bloquer le scroll
  useModalScroll(isOpen);
  
  // Nombre total de tâches
  const totalTasks = useMemo(() => 
    recipients.reduce((sum, r) => sum + r.tasks.length, 0), 
    [recipients]
  );
  
  // Générer le HTML pour la preview
  const previewHtml = useMemo(() => {
    if (!previewRecipient) return '';
    return generateEmailHtml(previewRecipient, subject, message, projectName, projectUrl);
  }, [previewRecipient, subject, message, projectName, projectUrl]);
  
  // Gérer l'envoi
  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(true);
      onClose();
    } catch (error) {
      console.error('Error sending emails:', error);
    } finally {
      setSending(false);
    }
  };
  
  // Ignorer l'envoi d'emails
  const handleSkip = async () => {
    setSending(true);
    try {
      await onSend(false);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
  };
  
  // Ouvrir la preview pour un destinataire
  const openPreview = (recipient: RecipientWithTasks) => {
    setPreviewRecipient(recipient);
    setShowPreview(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-default rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                  <IconMail className="w-5 h-5 !text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold !text-primary">
                    {t('email_notification_compose') || 'Notification par email'}
                  </h2>
                  <p className="text-sm !text-muted">
                    {recipients.length} {t('recipients') || 'destinataire(s)'} • {totalTasks} {t('tasks') || 'tâches'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={sending}
                className="p-2 !text-muted hover:!text-primary hover:bg-hover rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Subject */}
              <div>
                <label className="block !text-sm font-medium !text-secondary mb-2">
                  {t('email_subject') || 'Objet de l\'email'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-default rounded-lg !text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Objet..."
                />
              </div>

              {/* Message */}
              <div>
                <label className="block !text-sm font-medium !text-secondary mb-2">
                  {t('email_message') || 'Message personnalisé'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-muted border border-default rounded-lg !text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  placeholder="Votre message..."
                />
                <p className="!text-xs !text-muted mt-1">
                  {t('email_message_hint') || 'Ce message sera affiché avant la liste des tâches'}
                </p>
              </div>

              {/* Recipients list */}
              <div>
                <label className="block !text-sm font-medium !text-secondary mb-3">
                  {t('recipients_preview') || 'Destinataires et aperçu'}
                </label>
                <div className="bg-muted rounded-xl divide-y divide-default overflow-hidden">
                  {recipients.map((recipient, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center !text-accent font-medium">
                          {recipient.username?.charAt(0).toUpperCase() || recipient.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium !text-primary">{recipient.username}</p>
                          <p className="!text-xs !text-muted">{recipient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="!text-xs bg-accent-light !text-accent px-2 py-1 rounded-full flex items-center gap-1">
                          <IconClipboardList className="w-3 h-3" />
                          {recipient.tasks.length}
                        </span>
                        <button
                          onClick={() => openPreview(recipient)}
                          className="p-2 !text-muted hover:!text-accent hover:bg-accent-light rounded-lg transition-colors"
                          title={t('preview') || 'Aperçu'}
                        >
                          <IconEye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="p-4 bg-info-light border border-info rounded-lg">
                <p className="text-sm !text-primary">
                  <strong>{t('email_info_title') || 'Un seul email par personne'}</strong>
                </p>
                <p className="text-sm !text-muted mt-1">
                  {t('email_info_description') || 'Chaque collaborateur recevra un email unique contenant la liste de toutes ses tâches assignées.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-default bg-muted">
              <button
                onClick={handleSkip}
                disabled={sending}
                className="px-4 py-2 !text-muted hover:!text-primary transition-colors"
              >
                {t('skip_emails') || 'Ignorer les emails'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => recipients[0] && openPreview(recipients[0])}
                  disabled={sending || recipients.length === 0}
                  className="px-4 py-2 bg-muted border border-default !text-primary rounded-lg hover:bg-hover transition-colors flex items-center gap-2"
                >
                  <IconEye className="w-4 h-4" />
                  {t('preview') || 'Aperçu'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim()}
                  className="px-6 py-2 bg-accent !text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {sending ? (
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconSend className="w-4 h-4" />
                  )}
                  {t('send_emails') || 'Envoyer les emails'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Email Preview Modal */}
      {showPreview && previewRecipient && (
        <EmailPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          emailData={{
            subject,
            content: message,
            htmlContent: previewHtml,
          }}
          senderInfo={{
            firstName: user?.username?.split(' ')[0] || 'Eclipse',
            lastName: user?.username?.split(' ').slice(1).join(' ') || 'Dashboard',
            email: user?.email || 'noreply@eclipsestudiodev.fr',
            profilePicture: null,
          }}
          includeSignature={false}
          primaryColor="#7C3AED"
          translations={{
            mailbox_preview: t('mailbox_preview') || 'Aperçu boîte mail',
            inbox: t('inbox') || 'Boîte de réception',
            favorites: t('favorites') || 'Favoris',
            sent_folder: t('sent_folder') || 'Envoyés',
            archives: t('archives') || 'Archives',
            trash: t('trash') || 'Corbeille',
            search_placeholder: t('search_placeholder') || 'Rechercher...',
            now: t('now') || 'À l\'instant',
            to_me: t('to_me') || 'à moi',
          }}
        />
      )}
    </>
  );
}

export { generateEmailHtml };
export type { RecipientWithTasks, TaskInfo };

