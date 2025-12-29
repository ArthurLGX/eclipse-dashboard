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
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  createProjectInvitation,
  fetchProjectInvitations,
  fetchProjectCollaborators,
  cancelInvitation,
  removeProjectCollaborator,
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
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');

  // Nombre total de membres (propriétaire + collaborateurs)
  const totalMembers = 1 + collaborators.length;

  // Charger les invitations et collaborateurs
  useEffect(() => {
    if (isOpen && projectDocumentId) {
      loadData();
    }
  }, [isOpen, projectDocumentId]);

  const loadData = async () => {
    try {
      const [invitationsRes, collaboratorsRes] = await Promise.all([
        fetchProjectInvitations(projectDocumentId).catch(() => ({ data: [] })),
        fetchProjectCollaborators(projectDocumentId).catch(() => ({ data: [] })),
      ]);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invitations = (invitationsRes as any).data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPendingInvitations(invitations.filter((inv: any) => inv.invitation_status === 'pending'));
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCollaborators((collaboratorsRes as any).data || []);
    } catch {
      // Collections n'existent peut-être pas encore dans Strapi
      setPendingInvitations([]);
      setCollaborators([]);
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
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 3000);
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
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
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
                          className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
            ) : (
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
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <p className="text-xs text-zinc-500 text-center">
              {t('share_note') || 'Les collaborateurs invités ne peuvent pas supprimer ce projet.'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

