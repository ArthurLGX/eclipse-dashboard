'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconX,
  IconMail,
  IconCopy,
  IconCheck,
  IconLink,
  IconUsers,
  IconTrash,
  IconSend,
  IconChartBar,
  IconEye,
  IconTimeline,
  IconExternalLink,
  IconLoader2,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  createProjectInvitation,
  fetchProjectInvitations,
  fetchProjectCollaborators,
  cancelInvitation,
  removeProjectCollaborator,
  createProjectShareLink,
  fetchProjectShareLinks,
  deactivateShareLink,
  type ProjectShareLink,
} from '@/lib/api';
import type { ProjectInvitation, ProjectCollaborator, InvitationPermission } from '@/types';

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectDocumentId: string;
  projectTitle: string;
  userId: number;
  isOwner: boolean;
  ownerName?: string;
  ownerEmail?: string;
}

export default function ShareProjectModal({
  isOpen,
  onClose,
  projectDocumentId,
  projectTitle,
  userId,
  isOwner,
  ownerName,
  ownerEmail,
}: ShareProjectModalProps) {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();

  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<InvitationPermission>('edit');
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [activeTab, setActiveTab] = useState<'invite' | 'members' | 'public'>('invite');
  
  // État pour le partage public
  const [publicLinks, setPublicLinks] = useState<ProjectShareLink[]>([]);
  const [creatingPublicLink, setCreatingPublicLink] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [showPublicLinkConfig, setShowPublicLinkConfig] = useState(false);
  const [publicLinkConfig, setPublicLinkConfig] = useState({
    show_gantt: true,
    show_progress: true,
    show_tasks: true,
    expires_in_days: null as number | null,
  });
  
  // État pour l'envoi d'email du lien public
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentShareToken, setCurrentShareToken] = useState<string | null>(null);

  // Nombre total de membres (propriétaire + collaborateurs)
  const totalMembers = 1 + collaborators.length;

  // Charger les invitations et collaborateurs
  useEffect(() => {
    if (isOpen && projectDocumentId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectDocumentId]);

  const loadData = async () => {
    try {
      const [invitationsRes, collaboratorsRes, publicLinksRes] = await Promise.all([
        fetchProjectInvitations(projectDocumentId).catch(() => ({ data: [] })),
        fetchProjectCollaborators(projectDocumentId).catch(() => ({ data: [] })),
        fetchProjectShareLinks(projectDocumentId).catch(() => ({ data: [] })),
      ]);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invitations = (invitationsRes as any).data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPendingInvitations(invitations.filter((inv: any) => inv.invitation_status === 'pending'));
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCollaborators((collaboratorsRes as any).data || []);
      
      // Charger les liens publics
      setPublicLinks(publicLinksRes.data || []);
    } catch {
      // Collections n'existent peut-être pas encore dans Strapi
      setPendingInvitations([]);
      setCollaborators([]);
      setPublicLinks([]);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const result = await createProjectInvitation({
        project: projectDocumentId,
        sender: userId,
        recipient_email: email.trim(),
        permission,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invitationCode = (result as any).invitation_code;
      
      showGlobalPopup(
        t('invitation_sent_success') || `Invitation envoyée à ${email}`,
        'success'
      );
      
      setEmail('');
      loadData();

      // Si on veut afficher le code généré
      if (invitationCode) {
        navigator.clipboard.writeText(invitationCode);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      showGlobalPopup(
        t('invitation_error') || 'Erreur lors de l\'envoi de l\'invitation',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      // Créer une invitation sans email (lien partageable public)
      const result = await createProjectInvitation({
        project: projectDocumentId,
        sender: userId,
        recipient_email: '', // Pas d'email pour les liens publics
        permission,
        isPublicLink: true, // Flag pour indiquer que c'est un lien public
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invitationCode = (result as any).invitation_code;
      const shareUrl = `${window.location.origin}/dashboard/projects/invitation/${invitationCode}`;
      
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
      
      showGlobalPopup(
        t('link_copied') || 'Lien copié dans le presse-papiers',
        'success'
      );
      
      loadData();
    } catch (error) {
      console.error('Error creating share link:', error);
      showGlobalPopup(
        t('copy_error') || 'Erreur lors de la copie',
        'error'
      );
    }
  };

  const handleCancelInvitation = async (invitationDocumentId: string) => {
    try {
      await cancelInvitation(invitationDocumentId);
      showGlobalPopup(t('invitation_cancelled') || 'Invitation annulée', 'success');
      loadData();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  const handleRemoveCollaborator = async (collaboratorDocumentId: string) => {
    try {
      await removeProjectCollaborator(collaboratorDocumentId);
      showGlobalPopup(t('collaborator_removed') || 'Collaborateur retiré', 'success');
      loadData();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  // Créer un lien de partage public
  const handleCreatePublicLink = async () => {
    setCreatingPublicLink(true);
    try {
      const newLink = await createProjectShareLink(userId, {
        project: projectDocumentId,
        show_gantt: publicLinkConfig.show_gantt,
        show_progress: publicLinkConfig.show_progress,
        show_tasks: publicLinkConfig.show_tasks,
        expires_in_days: publicLinkConfig.expires_in_days,
      });
      
      const shareUrl = `${window.location.origin}/share/project/${newLink.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setPublicLinkCopied(true);
      setTimeout(() => setPublicLinkCopied(false), 3000);
      
      showGlobalPopup(
        t('public_link_created') || 'Lien public créé et copié !',
        'success'
      );
      
      setShowPublicLinkConfig(false);
      loadData();
    } catch (error) {
      console.error('Error creating public link:', error);
      showGlobalPopup(
        t('error_creating_link') || 'Erreur lors de la création du lien',
        'error'
      );
    } finally {
      setCreatingPublicLink(false);
    }
  };

  // Désactiver un lien public
  const handleDeactivateLink = async (linkDocumentId: string) => {
    try {
      await deactivateShareLink(linkDocumentId);
      showGlobalPopup(t('link_deactivated') || 'Lien désactivé', 'success');
      loadData();
    } catch (error) {
      console.error('Error deactivating link:', error);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    }
  };

  // Copier un lien existant
  const handleCopyPublicLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/share/project/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setPublicLinkCopied(true);
    setTimeout(() => setPublicLinkCopied(false), 2000);
    showGlobalPopup(t('link_copied') || 'Lien copié !', 'success');
  };

  // Ouvrir le modal d'envoi d'email
  const handleOpenEmailModal = (token: string) => {
    setCurrentShareToken(token);
    setEmailRecipient('');
    setEmailMessage(t('default_share_message') || `Bonjour,\n\nVoici le lien pour suivre l'avancement du projet "${projectTitle}".\n\nCordialement`);
    setShowEmailModal(true);
  };

  // Envoyer le lien par email via SMTP
  const handleSendPublicLinkByEmail = async () => {
    if (!emailRecipient.trim() || !currentShareToken) return;
    
    setSendingEmail(true);
    try {
      const shareUrl = `${window.location.origin}/share/project/${currentShareToken}`;
      const token = localStorage.getItem('jwt');
      
      if (!token) {
        throw new Error('Non authentifié');
      }
      
      // Construire le HTML de l'email
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">${t('project_progress') || 'Suivi du projet'} : ${projectTitle}</h2>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="white-space: pre-wrap; margin: 0; color: #374151; line-height: 1.6;">${emailMessage}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              ${t('view_project_progress') || 'Voir l\'avancement du projet'}
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
            ${t('link_valid_info') || 'Ce lien vous permet de consulter l\'avancement du projet à tout moment.'}
          </p>
        </div>
      `;
      
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: [emailRecipient.trim()],
          subject: `${t('project_progress') || 'Suivi du projet'} : ${projectTitle}`,
          html: htmlContent,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }
      
      showGlobalPopup(
        t('email_sent_success') || `Email envoyé à ${emailRecipient}`,
        'success'
      );
      setShowEmailModal(false);
      setEmailRecipient('');
      setCurrentShareToken(null);
    } catch (error) {
      console.error('Error sending email:', error);
      showGlobalPopup(
        t('email_send_error') || 'Erreur lors de l\'envoi de l\'email',
        'error'
      );
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                {t('share_project') || 'Partager le projet'}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {projectTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab('invite')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'invite'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <IconSend className="w-4 h-4" />
                {t('invite') || 'Inviter'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <IconUsers className="w-4 h-4" />
                {t('members') || 'Membres'} ({totalMembers})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'public'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <IconEye className="w-4 h-4" />
                {t('public_share') || 'Public'}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'invite' ? (
              <div className="space-y-6">
                {/* Invitation par email */}
                <form onSubmit={handleSendInvitation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      {t('invite_by_email') || 'Inviter par email'}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@exemple.com"
                          className="w-full !pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <IconSend className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Permission */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      {t('permission') || 'Permission'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPermission('view')}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          permission === 'view'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {t('view_only') || 'Lecture seule'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermission('edit')}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          permission === 'edit'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {t('can_edit') || 'Peut modifier'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Séparateur */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-500 uppercase">{t('or') || 'ou'}</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* Partage par lien */}
                <button
                  onClick={handleCopyLink}
                  className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 transition-colors flex items-center justify-center gap-3"
                >
                  {linkCopied ? (
                    <>
                      <IconCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400">{t('link_copied') || 'Lien copié !'}</span>
                    </>
                  ) : (
                    <>
                      <IconLink className="w-5 h-5" />
                      <span>{t('copy_share_link') || 'Copier le lien de partage'}</span>
                      <IconCopy className="w-4 h-4 text-zinc-500" />
                    </>
                  )}
                </button>

                {/* Invitations en attente */}
                {pendingInvitations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">
                      {t('pending_invitations') || 'Invitations en attente'}
                    </h4>
                    <div className="space-y-2">
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.documentId}
                          className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <IconMail className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm text-zinc-200">{invitation.recipient_email}</p>
                              <p className="text-xs text-zinc-500">
                                {invitation.permission === 'edit' 
                                  ? t('can_edit') || 'Peut modifier' 
                                  : t('view_only') || 'Lecture seule'}
                              </p>
                            </div>
                          </div>
                          {isOwner && (
                            <button
                              onClick={() => handleCancelInvitation(invitation.documentId)}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'members' ? (
              /* Onglet Membres */
              <div className="space-y-3">
                {/* Propriétaire du projet - toujours affiché en premier */}
                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-400 font-medium">
                        {ownerName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200">
                        {ownerName || ownerEmail || 'Propriétaire'}
                      </p>
                      <p className="text-xs text-amber-400 font-medium">
                        {t('owner') || 'Propriétaire'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collaborateurs */}
                {collaborators.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-zinc-500 text-sm">
                      {t('no_collaborators_yet') || 'Aucun collaborateur pour le moment'}
                    </p>
                  </div>
                ) : (
                  collaborators.map((collab) => (
                    <div
                      key={collab.documentId}
                      className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-emerald-400 font-medium">
                            {collab.user?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-200">
                            {collab.user?.username || collab.user?.email}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {collab.permission === 'edit' 
                              ? t('can_edit') || 'Peut modifier' 
                              : t('view_only') || 'Lecture seule'}
                          </p>
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveCollaborator(collab.documentId)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Onglet Partage Public */
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <IconTimeline className="w-5 h-5 text-violet-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 mb-1">
                        {t('public_share_title') || 'Partage public avec vos clients'}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {t('public_share_description') || 'Générez un lien accessible sans connexion pour partager l\'avancement du projet (diagramme de Gantt, progression, tâches).'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration du nouveau lien */}
                {showPublicLinkConfig ? (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-medium text-zinc-200">
                      {t('configure_public_link') || 'Configurer le lien public'}
                    </h4>

                    {/* Options d'affichage */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={publicLinkConfig.show_gantt}
                          onChange={(e) => setPublicLinkConfig({ ...publicLinkConfig, show_gantt: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <div className="flex items-center gap-2">
                          <IconTimeline className="w-4 h-4 text-violet-400" />
                          <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                            {t('show_gantt') || 'Afficher le diagramme de Gantt'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={publicLinkConfig.show_progress}
                          onChange={(e) => setPublicLinkConfig({ ...publicLinkConfig, show_progress: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <div className="flex items-center gap-2">
                          <IconChartBar className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                            {t('show_progress') || 'Afficher les statistiques de progression'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={publicLinkConfig.show_tasks}
                          onChange={(e) => setPublicLinkConfig({ ...publicLinkConfig, show_tasks: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <div className="flex items-center gap-2">
                          <IconEye className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                            {t('show_tasks_list') || 'Afficher la liste des tâches'}
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Expiration */}
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">
                        {t('link_expiration') || 'Expiration du lien'}
                      </label>
                      <select
                        value={publicLinkConfig.expires_in_days || ''}
                        onChange={(e) => setPublicLinkConfig({ 
                          ...publicLinkConfig, 
                          expires_in_days: e.target.value ? parseInt(e.target.value) : null 
                        })}
                        className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">{t('no_expiration') || 'Jamais'}</option>
                        <option value="7">{t('7_days') || '7 jours'}</option>
                        <option value="30">{t('30_days') || '30 jours'}</option>
                        <option value="90">{t('90_days') || '90 jours'}</option>
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowPublicLinkConfig(false)}
                        className="flex-1 py-2 px-4 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {t('cancel') || 'Annuler'}
                      </button>
                      <button
                        onClick={handleCreatePublicLink}
                        disabled={creatingPublicLink}
                        className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {creatingPublicLink ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <IconLink className="w-4 h-4" />
                            {t('create_link') || 'Créer le lien'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPublicLinkConfig(true)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors flex items-center justify-center gap-3"
                  >
                    <IconLink className="w-5 h-5" />
                    {t('create_public_link') || 'Créer un lien public'}
                  </button>
                )}

                {/* Liens existants */}
                {publicLinks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">
                      {t('active_links') || 'Liens actifs'}
                    </h4>
                    <div className="space-y-2">
                      {publicLinks.map((link) => (
                        <div
                          key={link.documentId}
                          className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <IconLink className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-zinc-200 truncate">
                                /share/project/{link.share_token.substring(0, 8)}...
                              </p>
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                {link.show_gantt && <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded">Gantt</span>}
                                {link.show_progress && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Stats</span>}
                                {link.show_tasks && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Tâches</span>}
                                {link.expires_at && (
                                  <span className="text-zinc-500">
                                    Expire {new Date(link.expires_at).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleCopyPublicLink(link.share_token)}
                              className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title={t('copy_link') || 'Copier le lien'}
                            >
                              {publicLinkCopied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleOpenEmailModal(link.share_token)}
                              className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title={t('send_by_email') || 'Envoyer par email'}
                            >
                              <IconMail className="w-4 h-4" />
                            </button>
                            <a
                              href={`/share/project/${link.share_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                              title={t('preview') || 'Aperçu'}
                            >
                              <IconExternalLink className="w-4 h-4" />
                            </a>
                            {isOwner && (
                              <button
                                onClick={() => handleDeactivateLink(link.documentId)}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title={t('deactivate') || 'Désactiver'}
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <p className="text-xs text-zinc-500 text-center">
              {t('share_note') || 'Les collaborateurs invités ne peuvent pas supprimer ce projet.'}
            </p>
          </div>
        </motion.div>

        {/* Modal d'envoi d'email */}
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <IconMail className="w-5 h-5 text-violet-400" />
                  {t('send_link_by_email') || 'Envoyer le lien par email'}
                </h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Email destinataire */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    {t('recipient_email') || 'Email du destinataire'}
                  </label>
                  <div className="relative">
                    <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-accent" />
                    <input
                      type="email"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="client@exemple.com"
                      className="w-full !pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Message personnalisé */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    {t('custom_message') || 'Message personnalisé'}
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                </div>

                {/* Aperçu du lien */}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 mb-1">{t('link_included') || 'Le lien suivant sera inclus :'}</p>
                  <p className="text-sm text-violet-400 truncate">
                    {window.location.origin}/share/project/{currentShareToken?.substring(0, 12)}...
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-4 border-t border-zinc-800">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-2.5 px-4 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleSendPublicLinkByEmail}
                  disabled={sendingEmail || !emailRecipient.trim()}
                  className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      {t('sending') || 'Envoi...'}
                    </>
                  ) : (
                    <>
                      <IconSend className="w-4 h-4" />
                      {t('send') || 'Envoyer'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

