'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  IconCheck,
  IconX,
  IconUsers,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import { fetchInvitationByCode, acceptInvitation, rejectInvitation } from '@/lib/api';
import { generateSlug } from '@/utils/slug';
import type { ProjectInvitation } from '@/types';

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!code) {
        setError('Code d\'invitation invalide');
        setLoading(false);
        return;
      }

      try {
        const response = await fetchInvitationByCode(code);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invitations = (response as any).data || [];
        
        if (invitations.length === 0) {
          setError('Invitation non trouvée ou expirée');
          setLoading(false);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inv = invitations[0] as any;
        
        // Vérifier si l'invitation est encore valide
        if (inv.invitation_status !== 'pending') {
          if (inv.invitation_status === 'accepted') {
            setError(t('invitation_already_accepted') || 'Cette invitation a déjà été acceptée');
          } else if (inv.invitation_status === 'rejected') {
            setError(t('invitation_already_rejected') || 'Cette invitation a été refusée');
          } else {
            setError(t('invitation_expired') || 'Cette invitation a expiré');
          }
          setLoading(false);
          return;
        }

        // Vérifier la date d'expiration
        if (new Date(inv.expires_at) < new Date()) {
          setError('Cette invitation a expiré');
          setLoading(false);
          return;
        }

        setInvitation(inv);
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Erreur lors du chargement de l\'invitation');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [code]);

  const handleAccept = async () => {
    if (!invitation || !user?.id) return;

    setProcessing(true);
    try {
      await acceptInvitation(invitation.documentId, user.id);
      showGlobalPopup(
        t('invitation_accepted') || 'Invitation acceptée ! Le projet a été ajouté à votre liste.',
        'success'
      );
      
      // Rediriger vers le projet
      if (invitation.project) {
        const projectSlug = generateSlug(invitation.project.title, invitation.project.documentId);
        router.push(`/dashboard/projects/${projectSlug}`);
      } else {
        router.push('/dashboard/projects');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      await rejectInvitation(invitation.documentId);
      showGlobalPopup(t('invitation_rejected') || 'Invitation refusée', 'success');
      router.push('/dashboard/projects');
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      showGlobalPopup(t('error_generic') || 'Erreur', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">{t('loading') || 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <IconAlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-200 mb-2">
            {t('invitation_error') || 'Erreur d\'invitation'}
          </h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors"
          >
            {t('back_to_projects') || 'Retour aux projets'}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg w-full"
      >
        {/* Icône */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <IconUsers className="w-10 h-10 text-emerald-400" />
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-zinc-100 text-center mb-2">
          {t('project_invitation') || 'Invitation à collaborer'}
        </h1>

        {/* Message */}
        <p className="text-zinc-400 text-center mb-6">
          <span className="text-emerald-400 font-medium">
            {invitation.sender?.username || 'Un utilisateur'}
          </span>{' '}
          {t('invites_you_to_collaborate') || 'vous invite à collaborer sur le projet'}
        </p>

        {/* Projet */}
        <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-1">
            {invitation.project?.title || 'Projet'}
          </h2>
          <p className="text-sm text-zinc-500 line-clamp-2">
            {invitation.project?.description || 'Aucune description'}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            <span>
              {t('permission') || 'Permission'}: {' '}
              <span className={invitation.permission === 'edit' ? 'text-emerald-400' : 'text-blue-400'}>
                {invitation.permission === 'edit' 
                  ? t('can_edit') || 'Peut modifier'
                  : t('view_only') || 'Lecture seule'}
              </span>
            </span>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-zinc-500 text-center mb-6">
          {t('collaborator_note') || 'En tant que collaborateur, vous ne pourrez pas supprimer ce projet.'}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <IconLoader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <IconX className="w-5 h-5" />
                {t('reject') || 'Refuser'}
              </>
            )}
          </button>
          <button
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <IconLoader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <IconCheck className="w-5 h-5" />
                {t('accept') || 'Accepter'}
              </>
            )}
          </button>
        </div>

        {/* Expiration */}
        <p className="text-xs text-zinc-600 text-center mt-4">
          {t('expires_on') || 'Expire le'}: {' '}
          {new Date(invitation.expires_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </motion.div>
    </div>
  );
}

