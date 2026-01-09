'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconMail,
  IconSend,
  IconEye,
  IconListCheck,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalScroll } from '@/hooks/useModalFocus';
import EmailPreviewModal from './EmailPreviewModal';
import type { ImportedTask } from './ExcelImportModal';

interface AssignedUser {
  email: string;
  username: string;
  documentId: string;
  tasks: ImportedTask[];
}

interface TaskAssignmentEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (options: {
    users: AssignedUser[];
    subject: string;
    message: string;
    includeTaskList: boolean;
  }) => Promise<void>;
  assignedUsers: AssignedUser[];
  projectName: string;
  projectUrl: string;
  senderInfo: {
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  };
}

export default function TaskAssignmentEmailModal({
  isOpen,
  onClose,
  onSend,
  assignedUsers,
  projectName,
  projectUrl,
  senderInfo,
}: TaskAssignmentEmailModalProps) {
  const { t } = useLanguage();
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeTaskList, setIncludeTaskList] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUser, setPreviewUser] = useState<AssignedUser | null>(null);

  // Bloquer le scroll du body
  useModalScroll(isOpen);

  // Générer le sujet par défaut
  const defaultSubject = useMemo(() => {
    const totalTasks = assignedUsers.reduce((sum, u) => sum + u.tasks.length, 0);
    return t('task_assignment_email_subject') || 
      `${totalTasks} nouvelle${totalTasks > 1 ? 's' : ''} tâche${totalTasks > 1 ? 's' : ''} vous ${totalTasks > 1 ? 'ont été assignées' : 'a été assignée'} sur ${projectName}`;
  }, [assignedUsers, projectName, t]);

  // Générer le message par défaut
  const defaultMessage = useMemo(() => {
    return t('task_assignment_email_message') || 
      `Bonjour,\n\nDe nouvelles tâches vous ont été assignées sur le projet "${projectName}".\n\nMerci de les consulter et de les traiter dès que possible.`;
  }, [projectName, t]);

  // Utiliser les valeurs par défaut si vides
  const effectiveSubject = subject || defaultSubject;
  const effectiveMessage = message || defaultMessage;

  // Générer le HTML de l'email pour un utilisateur
  const generateEmailHtml = (user: AssignedUser) => {
    const taskListHtml = user.tasks.map(task => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${task.title}</div>
          ${task.description ? `<div style="font-size: 13px; color: #6b7280;">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; 
            background-color: ${task.priority === 'urgent' ? '#fef2f2' : task.priority === 'high' ? '#fef3c7' : '#f3f4f6'}; 
            color: ${task.priority === 'urgent' ? '#dc2626' : task.priority === 'high' ? '#d97706' : '#6b7280'};">
            ${task.priority === 'urgent' ? '🔴 Urgent' : task.priority === 'high' ? '🟠 Haute' : task.priority === 'medium' ? '🟡 Moyenne' : '🟢 Basse'}
          </span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; white-space: nowrap;">
          ${task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : '-'}
        </td>
      </tr>
    `).join('');

    return `
      <div style="font-family: 'Inter', Arial, sans-serif; color: #374151; line-height: 1.6;">
        <p style="margin: 0 0 16px;">Bonjour <strong>${user.username.split(' ')[0]}</strong>,</p>
        
        ${effectiveMessage.split('\n').map(line => `<p style="margin: 0 0 12px;">${line || '&nbsp;'}</p>`).join('')}
        
        ${includeTaskList ? `
          <div style="margin: 24px 0;">
            <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1f2937;">
              📋 ${user.tasks.length > 1 ? 'Vos tâches assignées' : 'Votre tâche assignée'} (${user.tasks.length})
            </h3>
            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Tâche</th>
                  <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Priorité</th>
                  <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Échéance</th>
                </tr>
              </thead>
              <tbody>
                ${taskListHtml}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        <div style="margin: 32px 0; text-align: center;">
          <a href="${projectUrl}" 
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
            Voir le projet →
          </a>
        </div>
        
        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
          Cordialement,<br/>
          <strong>${senderInfo.firstName} ${senderInfo.lastName}</strong>
        </p>
      </div>
    `;
  };

  // Gérer l'envoi
  const handleSend = async () => {
    setSending(true);
    try {
      await onSend({
        users: assignedUsers,
        subject: effectiveSubject,
        message: effectiveMessage,
        includeTaskList,
      });
      onClose();
    } catch (error) {
      console.error('Error sending emails:', error);
    } finally {
      setSending(false);
    }
  };

  // Ouvrir la prévisualisation pour un utilisateur
  const openPreview = (user: AssignedUser) => {
    setPreviewUser(user);
    setShowPreview(true);
  };

  if (!isOpen) return null;

  const totalTasks = assignedUsers.reduce((sum, u) => sum + u.tasks.length, 0);

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
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-default rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                  <IconMail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    {t('compose_notification_email') || 'Rédiger l\'email de notification'}
                  </h2>
                  <p className="text-sm text-muted">
                    {assignedUsers.length} {assignedUsers.length > 1 ? 'destinataires' : 'destinataire'} • {totalTasks} {totalTasks > 1 ? 'tâches' : 'tâche'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('recipients') || 'Destinataires'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {assignedUsers.map((user, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent-light flex items-center justify-center text-accent text-xs font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-primary">{user.username}</span>
                      <span className="text-xs text-muted">({user.tasks.length})</span>
                      <button
                        onClick={() => openPreview(user)}
                        className="p-1 hover:bg-hover rounded text-muted hover:text-accent"
                        title={t('preview') || 'Prévisualiser'}
                      >
                        <IconEye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('email_subject') || 'Objet'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={defaultSubject}
                  className="w-full px-4 py-2.5 bg-muted border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('email_message') || 'Message'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={defaultMessage}
                  rows={5}
                  className="w-full px-4 py-3 bg-muted border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              {/* Options */}
              <div className="p-4 bg-muted rounded-lg">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <IconListCheck className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {t('include_task_list') || 'Inclure la liste des tâches'}
                      </p>
                      <p className="text-xs text-muted">
                        {t('include_task_list_hint') || 'Afficher le tableau des tâches assignées dans l\'email'}
                      </p>
                    </div>
                  </div>
                  <div 
                    onClick={() => setIncludeTaskList(!includeTaskList)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      includeTaskList ? 'bg-accent' : 'bg-hover'
                    }`}
                  >
                    <div 
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        includeTaskList ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Info */}
              <div className="p-4 bg-info-light border border-info rounded-lg flex items-start gap-3">
                <IconMail className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                <div className="text-sm text-primary">
                  <p className="font-medium mb-1">
                    {t('one_email_per_user') || 'Un email par utilisateur'}
                  </p>
                  <p className="text-muted">
                    {t('one_email_per_user_hint') || 'Chaque collaborateur recevra un seul email récapitulatif avec toutes ses tâches assignées.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-default">
              <button
                onClick={() => openPreview(assignedUsers[0])}
                className="px-4 py-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors flex items-center gap-2"
              >
                <IconEye className="w-4 h-4" />
                {t('preview') || 'Prévisualiser'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('sending') || 'Envoi...'}
                    </>
                  ) : (
                    <>
                      <IconSend className="w-4 h-4" />
                      {t('send_emails') || 'Envoyer les emails'}
                      ({assignedUsers.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Email Preview Modal */}
      {previewUser && (
        <EmailPreviewModal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewUser(null);
          }}
          emailData={{
            subject: effectiveSubject,
            content: effectiveMessage,
            htmlContent: generateEmailHtml(previewUser),
          }}
          senderInfo={senderInfo}
          primaryColor="#7c3aed"
          translations={{
            mailbox_preview: t('mailbox_preview') || 'Aperçu boîte mail',
            inbox: t('inbox') || 'Boîte de réception',
            favorites: t('favorites') || 'Favoris',
            sent_folder: t('sent_folder') || 'Envoyés',
            archives: t('archives') || 'Archives',
            trash: t('trash') || 'Corbeille',
            search_placeholder: t('search_placeholder') || 'Rechercher...',
            now: t('now') || 'Maintenant',
            to_me: t('to_me') || 'à moi',
          }}
        />
      )}
    </>
  );
}


