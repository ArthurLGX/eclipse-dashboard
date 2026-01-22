'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalFocus } from '@/hooks/useModalFocus';
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
  IconPhoto,
  IconPalette,
} from '@tabler/icons-react';
import MediaPickerModal from './MediaPickerModal';
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
  fetchEmailSignature,
  type ProjectShareLink,
} from '@/lib/api';
import type { ProjectInvitation, ProjectCollaborator, InvitationPermission, EmailSignature } from '@/types';

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
  const modalRef = useModalFocus(isOpen);

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
  
  // État pour la signature et la bannière
  const [emailSignature, setEmailSignature] = useState<EmailSignature | null>(null);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeBanner, setIncludeBanner] = useState(true);
  const [emailSubject, setEmailSubject] = useState('');
  const [showBannerTitle, setShowBannerTitle] = useState(true);
  const [customBannerTitle, setCustomBannerTitle] = useState('');
  
  // Personnalisation avancée de la bannière
  const [bannerType, setBannerType] = useState<'color' | 'image'>('color');
  const [bannerBackgroundColor, setBannerBackgroundColor] = useState('#7c3aed');
  const [bannerTitleColor, setBannerTitleColor] = useState('#ffffff');
  const [customBannerImage, setCustomBannerImage] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);

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
  const handleOpenEmailModal = async (token: string) => {
    setCurrentShareToken(token);
    setEmailRecipient('');
    setEmailMessage(t('default_share_message') || `Bonjour,\n\nVoici le lien pour suivre l'avancement du projet "${projectTitle}".\n\nCordialement`);
    setEmailSubject(`${t('project_progress') || 'Suivi du projet'} : ${projectTitle}`);
    setCustomBannerTitle(projectTitle);
    setIncludeSignature(true);
    setIncludeBanner(true);
    setShowBannerTitle(true);
    
    // Charger la signature de l'utilisateur
    try {
      const signature = await fetchEmailSignature(userId);
      setEmailSignature(signature);
    } catch (error) {
      console.error('Error loading signature:', error);
      setEmailSignature(null);
    }
    
    setShowEmailModal(true);
  };

  // Générer le HTML de la signature
  const generateSignatureHTML = () => {
    if (!emailSignature) return '';
    
    const sig = emailSignature;
    const primaryColor = sig.primary_color || '#10b981';
    const textColor = sig.text_color || '#333333';
    const secondaryColor = sig.secondary_color || '#666666';
    const fontFamily = sig.font_family ? `'${sig.font_family}', Arial, sans-serif` : 'Arial, sans-serif';
    const logoSize = sig.logo_size || 80;
    
    let signatureHTML = `
      <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 20px; font-family: ${fontFamily};">
        <tbody>
          <tr>
    `;
    
    // Logo
    if (sig.logo_url) {
      signatureHTML += `
        <td style="padding-right: 12px; vertical-align: top;">
          <img src="${sig.logo_url}" alt="Logo" style="width: ${logoSize}px; height: ${logoSize}px; object-fit: contain; border-radius: 8px; display: block;" />
        </td>
      `;
    }
    
    // Info
    signatureHTML += `<td style="vertical-align: top;">`;
    
    if (sig.sender_name) {
      signatureHTML += `<div style="font-weight: bold; font-size: 16px; color: ${textColor};">${sig.sender_name}</div>`;
    }
    if (sig.sender_title) {
      signatureHTML += `<div style="color: ${secondaryColor}; margin-bottom: 6px; font-size: 14px;">${sig.sender_title}</div>`;
    }
    if (sig.company_name) {
      signatureHTML += `<div style="font-weight: 600; color: ${primaryColor}; margin-bottom: 4px;">${sig.company_name}</div>`;
    }
    
    signatureHTML += `<div style="font-size: 13px; color: ${secondaryColor};">`;
    if (sig.phone) signatureHTML += `<div>📞 ${sig.phone}</div>`;
    if (sig.website) signatureHTML += `<div>🌐 <a href="${sig.website}" style="color: ${primaryColor}; text-decoration: none;">${sig.website.replace(/^https?:\/\//, '')}</a></div>`;
    if (sig.address) signatureHTML += `<div>📍 ${sig.address}</div>`;
    signatureHTML += `</div>`;
    
    // Social links
    if (sig.social_links && sig.social_links.length > 0) {
      signatureHTML += `<div style="margin-top: 10px;">`;
      sig.social_links.forEach(link => {
        const color = link.color || primaryColor;
        const label = link.label || link.platform;
        signatureHTML += `<a href="${link.url}" style="color: ${color}; margin-right: 8px; text-decoration: none; font-weight: 500;">${label}</a>`;
      });
      signatureHTML += `</div>`;
    }
    
    signatureHTML += `</td></tr></tbody></table>`;
    
    return signatureHTML;
  };

  // Générer le HTML de la bannière avec titre
  const generateBannerHTML = () => {
    let bannerHTML = '';
    
    if (bannerType === 'color') {
      // Bannière avec couleur de fond
      if (showBannerTitle && customBannerTitle) {
        bannerHTML += `
          <div style="background: ${bannerBackgroundColor}; border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; color: ${bannerTitleColor}; font-size: 24px; font-weight: 700;">${customBannerTitle}</h1>
            <p style="margin: 8px 0 0 0; color: ${bannerTitleColor}; opacity: 0.9; font-size: 14px;">${t('project_progress') || 'Suivi du projet'}</p>
          </div>
        `;
      }
    } else if (bannerType === 'image') {
      // Bannière avec image personnalisée ou de la signature
      const imageUrl = customBannerImage || emailSignature?.banner_url;
      
      if (imageUrl) {
        // Si on a un titre, on le superpose sur l'image
        if (showBannerTitle && customBannerTitle) {
          bannerHTML += `
            <div style="position: relative; border-radius: 12px 12px 0 0; overflow: hidden;">
              <img src="${imageUrl}" alt="Banner" style="width: 100%; height: auto; display: block;" />
              <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6)); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px;">
                <h1 style="margin: 0; color: ${bannerTitleColor}; font-size: 24px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${customBannerTitle}</h1>
                <p style="margin: 8px 0 0 0; color: ${bannerTitleColor}; opacity: 0.9; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${t('project_progress') || 'Suivi du projet'}</p>
              </div>
            </div>
          `;
        } else {
          bannerHTML += `
            <div style="border-radius: 12px 12px 0 0; overflow: hidden;">
              <img src="${imageUrl}" alt="Banner" style="width: 100%; height: auto; display: block;" />
            </div>
          `;
        }
      } else if (showBannerTitle && customBannerTitle) {
        // Pas d'image mais un titre, on utilise la couleur de fond par défaut
        bannerHTML += `
          <div style="background: ${bannerBackgroundColor}; border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; color: ${bannerTitleColor}; font-size: 24px; font-weight: 700;">${customBannerTitle}</h1>
            <p style="margin: 8px 0 0 0; color: ${bannerTitleColor}; opacity: 0.9; font-size: 14px;">${t('project_progress') || 'Suivi du projet'}</p>
          </div>
        `;
      }
    }
    
    return bannerHTML;
  };

  // Envoyer le lien par email via SMTP
  const handleSendPublicLinkByEmail = async () => {
    if (!emailRecipient.trim() || !currentShareToken) return;
    
    setSendingEmail(true);
    try {
      const shareUrl = `${window.location.origin}/share/project/${currentShareToken}`;
      const token = localStorage.getItem('token');
      
      if (!token) {
        showGlobalPopup(t('not_authenticated') || 'Vous devez être connecté', 'error');
        return;
      }
      
      // Construire le HTML de l'email avec bannière et signature
      const bannerHTML = includeBanner ? generateBannerHTML() : '';
      const signatureHTML = includeSignature ? generateSignatureHTML() : '';
      const hasBanner = bannerHTML.length > 0;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          ${bannerHTML}
          <div style="padding: 24px; ${hasBanner ? 'border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;' : ''}">
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
            ${signatureHTML}
          </div>
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
          subject: emailSubject || `${t('project_progress') || 'Suivi du projet'} : ${projectTitle}`,
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
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-card border border-default rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div>
              <h2 className="text-xl font-semibold text-primary">
                {t('share_project') || 'Partager le projet'}
              </h2>
              <p className="text-sm text-muted mt-1">
                {projectTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-default">
            <button
              onClick={() => setActiveTab('invite')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'invite'
                  ? 'text-success border-b-2 border-success'
                  : 'text-muted hover:text-secondary'
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
                  ? 'text-success border-b-2 border-success'
                  : 'text-muted hover:text-secondary'
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
                  ? 'text-success border-b-2 border-success'
                  : 'text-muted hover:text-secondary'
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
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('invite_by_email') || 'Inviter par email'}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@exemple.com"
                          className="w-full !pl-10 !pr-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-muted focus:outline-none focus:border-success transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="px-4 py-3 bg-success hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
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
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('permission') || 'Permission'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPermission('view')}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          permission === 'view'
                            ? 'bg-info-light border-info text-info'
                            : 'border-default text-secondary hover:border-input'
                        }`}
                      >
                        {t('view_only') || 'Lecture seule'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermission('edit')}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          permission === 'edit'
                            ? 'bg-success-light border-success !text-success-text '
                            : 'border-default text-secondary hover:border-input'
                        }`}
                      >
                        {t('can_edit') || 'Peut modifier'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Séparateur */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-hover" />
                  <span className="text-xs text-muted uppercase">{t('or') || 'ou'}</span>
                  <div className="flex-1 h-px bg-hover" />
                </div>

                {/* Partage par lien */}
                <button
                  onClick={handleCopyLink}
                  className="w-full py-3 px-4 bg-hover hover:bg-card-hover border border-default rounded-xl text-primary transition-colors flex items-center justify-center gap-3"
                >
                  {linkCopied ? (
                    <>
                      <IconCheck className="w-5 h-5 !text-success-text -text" />
                      <span className="text-success-text">{t('link_copied') || 'Lien copié !'}</span>
                    </>
                  ) : (
                    <>
                      <IconLink className="w-5 h-5" />
                      <span>{t('copy_share_link') || 'Copier le lien de partage'}</span>
                      <IconCopy className="w-4 h-4 text-muted" />
                    </>
                  )}
                </button>

                {/* Invitations en attente */}
                {pendingInvitations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-secondary mb-3">
                      {t('pending_invitations') || 'Invitations en attente'}
                    </h4>
                    <div className="space-y-2">
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.documentId}
                          className="flex items-center justify-between p-3 bg-hover rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-warning-light flex items-center justify-center">
                              <IconMail className="w-4 h-4 text-warning" />
                            </div>
                            <div>
                              <p className="text-sm text-primary">{invitation.recipient_email}</p>
                              <p className="text-xs text-muted">
                                {invitation.permission === 'edit' 
                                  ? t('can_edit') || 'Peut modifier' 
                                  : t('view_only') || 'Lecture seule'}
                              </p>
                            </div>
                          </div>
                          {isOwner && (
                            <button
                              onClick={() => handleCancelInvitation(invitation.documentId)}
                              className="p-2 text-muted hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
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
                <div className="flex items-center justify-between p-3 bg-warning-light border border-warning rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning-light flex items-center justify-center">
                      <span className="text-warning-text font-medium">
                        {ownerName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-primary">
                        {ownerName || ownerEmail || 'Propriétaire'}
                      </p>
                      <p className="text-xs text-warning-text font-medium">
                        {t('owner') || 'Propriétaire'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collaborateurs */}
                {collaborators.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted text-sm">
                      {t('no_collaborators_yet') || 'Aucun collaborateur pour le moment'}
                    </p>
                  </div>
                ) : (
                  collaborators.map((collab) => (
                    <div
                      key={collab.documentId}
                      className="flex items-center justify-between p-3 bg-hover rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success-light flex items-center justify-center">
                          <span className="text-success font-medium">
                            {collab.user?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-primary">
                            {collab.user?.username || collab.user?.email}
                          </p>
                          <p className="text-xs text-muted">
                            {collab.permission === 'edit' 
                              ? t('can_edit') || 'Peut modifier' 
                              : t('view_only') || 'Lecture seule'}
                          </p>
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveCollaborator(collab.documentId)}
                          className="p-2 text-muted hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
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
                <div className="bg-primary-light border border-primary rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <IconTimeline className="w-5 h-5 !text-accent-light mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-primary mb-1">
                        {t('public_share_title') || 'Partage public avec vos clients'}
                      </h4>
                      <p className="text-xs text-secondary">
                        {t('public_share_description') || 'Générez un lien accessible sans connexion pour partager l\'avancement du projet (diagramme de Gantt, progression, tâches).'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration du nouveau lien */}
                {showPublicLinkConfig ? (
                  <div className="bg-hover border border-default rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-medium text-primary">
                      {t('configure_public_link') || 'Configurer le lien public'}
                    </h4>

                    {/* Options d'affichage */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={publicLinkConfig.show_gantt}
                          onChange={(e) => setPublicLinkConfig({ ...publicLinkConfig, show_gantt: e.target.checked })}
                          className="w-4 h-4 rounded border-input bg-input !text-success-text -text focus:ring-success/50"
                        />
                        <div className="flex items-center gap-2">
                          <IconTimeline className="w-4 h-4 !text-accent-light" />
                          <span className="text-sm text-secondary group-hover:text-primary">
                            {t('show_gantt') || 'Afficher le diagramme de Gantt'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={publicLinkConfig.show_progress}
                          onChange={(e) => setPublicLinkConfig({ ...publicLinkConfig, show_progress: e.target.checked })}
                          className="w-4 h-4 rounded border-input bg-input !text-success-text -text focus:ring-success/50"
                        />
                        <div className="flex items-center gap-2">
                          <IconChartBar className="w-4 h-4 !text-success-text -text" />
                          <span className="text-sm text-secondary group-hover:text-primary">
                            {t('show_progress') || 'Afficher les statistiques de progression'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={publicLinkConfig.show_tasks}
                          onChange={(e) => setPublicLinkConfig({ ...publicLinkConfig, show_tasks: e.target.checked })}
                          className="w-4 h-4 rounded border-input bg-input !text-success-text -text focus:ring-success/50"
                        />
                        <div className="flex items-center gap-2">
                          <IconEye className="w-4 h-4 text-info" />
                          <span className="text-sm text-secondary group-hover:text-primary">
                            {t('show_tasks_list') || 'Afficher la liste des tâches'}
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Expiration */}
                    <div>
                      <label className="block text-sm text-secondary mb-2">
                        {t('link_expiration') || 'Expiration du lien'}
                      </label>
                      <select
                        value={publicLinkConfig.expires_in_days || ''}
                        onChange={(e) => setPublicLinkConfig({ 
                          ...publicLinkConfig, 
                          expires_in_days: e.target.value ? parseInt(e.target.value) : null 
                        })}
                        className="w-full px-3 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-success"
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
                        className="flex-1 py-2 px-4 text-secondary hover:text-primary transition-colors"
                      >
                        {t('cancel') || 'Annuler'}
                      </button>
                      <button
                        onClick={handleCreatePublicLink}
                        disabled={creatingPublicLink}
                        className="flex-1 py-2 px-4 bg-success hover:opacity-90 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
                    className="w-full py-3 px-4 bg-success hover:opacity-90 text-white rounded-xl transition-colors flex items-center justify-center gap-3"
                  >
                    <IconLink className="w-5 h-5" />
                    {t('create_public_link') || 'Créer un lien public'}
                  </button>
                )}

                {/* Liens existants */}
                {publicLinks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-secondary mb-3">
                      {t('active_links') || 'Liens actifs'}
                    </h4>
                    <div className="space-y-2">
                      {publicLinks.map((link) => (
                        <div
                          key={link.documentId}
                          className="flex items-center justify-between p-3 bg-hover border border-default rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                              <IconLink className="w-5 h-5 !text-accent-light" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-primary truncate">
                                /share/project/{link.share_token.substring(0, 8)}...
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted">
                                {link.show_gantt && <span className="px-1.5 py-0.5 bg-primary-light !text-accent-light rounded">Gantt</span>}
                                {link.show_progress && <span className="px-1.5 py-0.5 bg-success-light !text-success-text -text rounded">Stats</span>}
                                {link.show_tasks && <span className="px-1.5 py-0.5 bg-info-light text-info rounded">Tâches</span>}
                                {link.expires_at && (
                                  <span className="text-muted">
                                    Expire {new Date(link.expires_at).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleCopyPublicLink(link.share_token)}
                              className="p-2 text-muted hover:text-success hover:bg-success-light rounded-lg transition-colors"
                              title={t('copy_link') || 'Copier le lien'}
                            >
                              {publicLinkCopied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleOpenEmailModal(link.share_token)}
                              className="p-2 text-muted hover:text-info hover:bg-info-light rounded-lg transition-colors"
                              title={t('send_by_email') || 'Envoyer par email'}
                            >
                              <IconMail className="w-4 h-4" />
                            </button>
                            <a
                              href={`/share/project/${link.share_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-muted hover:text-accent-light hover:bg-primary-light rounded-lg transition-colors"
                              title={t('preview') || 'Aperçu'}
                            >
                              <IconExternalLink className="w-4 h-4" />
                            </a>
                            {isOwner && (
                              <button
                                onClick={() => handleDeactivateLink(link.documentId)}
                                className="p-2 text-muted hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
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
          <div className="p-4 border-t border-default bg-muted">
            <p className="text-xs text-muted text-center">
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
              className="bg-card border border-default rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-default">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <IconMail className="w-5 h-5 !text-accent-light" />
                  {t('send_link_by_email') || 'Envoyer le lien par email'}
                </h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Email destinataire */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('recipient_email') || 'Email du destinataire'}
                  </label>
                  <div className="relative">
                    <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 !text-accent" />
                    <input
                      type="email"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="client@exemple.com"
                      className="w-full !pl-10 !pr-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Objet de l'email */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('email_subject') || 'Objet'}
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`${t('project_progress') || 'Suivi du projet'} : ${projectTitle}`}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Options bannière et signature */}
                <div className="space-y-4">
                  {/* Option bannière */}
                  <div className="bg-hover rounded-xl p-4 border border-default">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-primary">
                        {t('include_banner') || 'Inclure une bannière'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIncludeBanner(!includeBanner)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          includeBanner ? 'bg-accent' : 'bg-muted'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          includeBanner ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    
                    {includeBanner && (
                      <div className="space-y-4">
                        {/* Type de bannière */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBannerType('color')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                              bannerType === 'color' 
                                ? 'border-accent bg-accent-light !text-accent' 
                                : 'border-default bg-muted text-secondary hover:border-accent'
                            }`}
                          >
                            <IconPalette className="w-4 h-4" />
                            <span className="text-sm">{t('color') || 'Couleur'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBannerType('image')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                              bannerType === 'image' 
                                ? 'border-accent bg-accent-light !text-accent' 
                                : 'border-default bg-muted text-secondary hover:border-accent'
                            }`}
                          >
                            <IconPhoto className="w-4 h-4" />
                            <span className="text-sm">{t('image') || 'Image'}</span>
                          </button>
                        </div>

                        {/* Options selon le type */}
                        {bannerType === 'color' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-secondary mb-1">
                                {t('background_color') || 'Couleur de fond'}
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={bannerBackgroundColor}
                                  onChange={(e) => setBannerBackgroundColor(e.target.value)}
                                  className="w-8 h-8 rounded cursor-pointer border-0"
                                />
                                <input
                                  type="text"
                                  value={bannerBackgroundColor}
                                  onChange={(e) => setBannerBackgroundColor(e.target.value)}
                                  className="flex-1 px-2 py-1.5 text-xs bg-input border border-input rounded text-primary"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-secondary mb-1">
                                {t('title_color') || 'Couleur du titre'}
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={bannerTitleColor}
                                  onChange={(e) => setBannerTitleColor(e.target.value)}
                                  className="w-8 h-8 rounded cursor-pointer border-0"
                                />
                                <input
                                  type="text"
                                  value={bannerTitleColor}
                                  onChange={(e) => setBannerTitleColor(e.target.value)}
                                  className="flex-1 px-2 py-1.5 text-xs bg-input border border-input rounded text-primary"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {bannerType === 'image' && (
                          <div className="space-y-2">
                            {customBannerImage ? (
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={customBannerImage} 
                                  alt="Banner preview" 
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCustomBannerImage('')}
                                  className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full hover:bg-[var(--color-danger)]"
                                >
                                  <IconX className="w-3 h-3" />
                                </button>
                              </div>
                            ) : emailSignature?.banner_url ? (
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={emailSignature.banner_url} 
                                  alt="Signature banner" 
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                                  {t('from_signature') || 'De votre signature'}
                                </div>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setShowMediaPicker(true)}
                              className="w-full py-2 px-3 border-2 border-dashed border-default rounded-lg text-sm text-secondary hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
                            >
                              <IconPhoto className="w-4 h-4" />
                              {customBannerImage 
                                ? (t('change_image') || 'Changer l\'image')
                                : (t('select_image') || 'Sélectionner une image')
                              }
                            </button>
                            {bannerType === 'image' && (
                              <div>
                                <label className="block text-xs text-secondary mb-1">
                                  {t('title_color') || 'Couleur du titre'}
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={bannerTitleColor}
                                    onChange={(e) => setBannerTitleColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <input
                                    type="text"
                                    value={bannerTitleColor}
                                    onChange={(e) => setBannerTitleColor(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-xs bg-input border border-input rounded text-primary"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Titre */}
                        <div className="border-t border-default pt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id="showBannerTitle"
                              checked={showBannerTitle}
                              onChange={(e) => setShowBannerTitle(e.target.checked)}
                              className="w-4 h-4 !text-accent border-default rounded focus:ring-accent"
                            />
                            <label htmlFor="showBannerTitle" className="text-sm text-secondary">
                              {t('show_banner_title') || 'Afficher un titre'}
                            </label>
                          </div>
                          
                          {showBannerTitle && (
                            <input
                              type="text"
                              value={customBannerTitle}
                              onChange={(e) => setCustomBannerTitle(e.target.value)}
                              placeholder={projectTitle}
                              className="w-full px-3 py-2 text-sm bg-input border border-input rounded-lg text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
                            />
                          )}
                        </div>

                        {/* Aperçu de la bannière */}
                        {(showBannerTitle || customBannerImage || (bannerType === 'image' && emailSignature?.banner_url)) && (
                          <div className="border-t border-default pt-3">
                            <p className="text-xs text-secondary mb-2">{t('preview') || 'Aperçu'}</p>
                            <div 
                              className="rounded-lg overflow-hidden"
                              style={{ 
                                background: bannerType === 'color' ? bannerBackgroundColor : undefined,
                              }}
                            >
                              {bannerType === 'image' && (customBannerImage || emailSignature?.banner_url) ? (
                                <div className="relative h-20">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img 
                                    src={customBannerImage || emailSignature?.banner_url} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                  />
                                  {showBannerTitle && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span style={{ color: bannerTitleColor }} className="font-bold text-lg">
                                        {customBannerTitle || projectTitle}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : showBannerTitle && (
                                <div className="py-4 px-3 text-center">
                                  <span style={{ color: bannerTitleColor }} className="font-bold text-lg">
                                    {customBannerTitle || projectTitle}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Option signature */}
                  <div className="bg-hover rounded-xl p-4 border border-default">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-primary">
                        {t('include_signature') || 'Inclure ma signature'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIncludeSignature(!includeSignature)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          includeSignature ? 'bg-accent' : 'bg-muted'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          includeSignature ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    
                    {includeSignature && (
                      <div>
                        {emailSignature ? (
                          <div className="flex items-center gap-2 text-xs !text-success-text -text !text-success-text">
                            <IconCheck className="w-4 h-4" />
                            {emailSignature.sender_name || emailSignature.company_name || t('signature_loaded') || 'Signature chargée'}
                          </div>
                        ) : (
                          <p className="text-xs text-warning-text !text-warning">
                            {t('no_signature_configured') || 'Aucune signature configurée'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message personnalisé */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('custom_message') || 'Message personnalisé'}
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors resize-y"
                  />
                </div>

                {/* Aperçu du lien */}
                <div className="bg-primary-light border border-primary rounded-lg p-3">
                  <p className="text-xs text-secondary mb-1">{t('link_included') || 'Le lien suivant sera inclus :'}</p>
                  <p className="text-sm !text-accent-light truncate">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/share/project/{currentShareToken?.substring(0, 12)}...
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-4 border-t border-default">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-2.5 px-4 text-secondary hover:text-primary transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleSendPublicLinkByEmail}
                  disabled={sendingEmail || !emailRecipient.trim()}
                  className="flex-1 py-2.5 px-4 bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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

        {/* Media Picker Modal pour la bannière */}
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => {
            setCustomBannerImage(url);
            setShowMediaPicker(false);
          }}
          mediaType="image"
          title={t('select_banner_image') || 'Sélectionner une image de bannière'}
        />
      </motion.div>
    </AnimatePresence>
  );
}
