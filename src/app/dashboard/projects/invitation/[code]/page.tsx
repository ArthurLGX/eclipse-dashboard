'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import Image from 'next/image';
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertTriangle,
  IconFolder,
  IconCalendar,
  IconUser,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { useAuth } from '@/app/context/AuthContext';
import { fetchInvitationByCode, acceptInvitation, rejectInvitation, fetchProjectsUser } from '@/lib/api';
import { clearCache } from '@/hooks/useApi';
import { generateSlug } from '@/utils/slug';
import type { ProjectInvitation, Project } from '@/types';

// Données fake de projets pour l'arrière-plan
const FAKE_PROJECTS = [
  { id: 1, title: 'Application Mobile', status: 'in_progress', progress: 75 },
  { id: 2, title: 'Site E-commerce', status: 'completed', progress: 100 },
  { id: 3, title: 'Dashboard Analytics', status: 'planning', progress: 20 },
  { id: 4, title: 'API REST', status: 'in_progress', progress: 60 },
  { id: 5, title: 'Landing Page', status: 'completed', progress: 100 },
  { id: 6, title: 'Système CRM', status: 'in_progress', progress: 45 },
  { id: 7, title: 'Refonte UI/UX', status: 'planning', progress: 10 },
  { id: 8, title: 'Intégration API', status: 'in_progress', progress: 85 },
  { id: 9, title: 'Application Desktop', status: 'planning', progress: 5 },
  { id: 10, title: 'Portail Client', status: 'completed', progress: 100 },
  { id: 11, title: 'Module Facturation', status: 'in_progress', progress: 55 },
  { id: 12, title: 'Système de Notifications', status: 'planning', progress: 15 },
];

// Composant pour l'arrière-plan avec projets floutés
function ProjectsBackground({ userProjects }: { userProjects: Project[] }) {
  const projectsToShow = useMemo(() => {
    // Si l'utilisateur a des projets, les utiliser, sinon utiliser les fake
    if (userProjects.length > 0) {
      return userProjects.slice(0, 12).map(p => ({
        id: p.id,
        title: p.title,
        status: p.project_status,
        progress: p.tasks?.length 
          ? Math.round(p.tasks.filter(t => t.task_status === 'completed').length / p.tasks.length * 100)
          : 50,
      }));
    }
    return FAKE_PROJECTS;
  }, [userProjects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in_progress': return 'bg-info';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Grille de projets */}
      <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-4 gap-4 p-8 opacity-30">
        {projectsToShow.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-default  p-4 h-32"
          >
            <div className="flex items-center gap-2 mb-3">
              <IconFolder className="w-4 h-4 !text-accent" />
              <span className="text-sm font-medium !text-primary truncate">{project.title}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full ${getStatusColor(project.status)} rounded-full`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="!text-xs !text-muted">{project.progress}%</span>
          </motion.div>
        ))}
      </div>
      
      {/* Overlay de blur */}
      <div className="absolute inset-0 backdrop-blur-md bg-page/70" />
      
      {/* Gradient radial pour focus central */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-page/50 to-page" />
    </div>
  );
}

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
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  // Charger les projets de l'utilisateur pour l'arrière-plan
  useEffect(() => {
    const loadUserProjects = async () => {
      if (user?.id) {
        try {
          const response = await fetchProjectsUser(user.id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const projects = (response as any).data || [];
          setUserProjects(projects);
        } catch (err) {
          console.error('Error loading user projects:', err);
        }
      }
    };
    loadUserProjects();
  }, [user?.id]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleAccept = async () => {
    if (!invitation || !user?.id) return;

    setProcessing(true);
    try {
      await acceptInvitation(invitation.documentId, user.id);
      
      // Invalider le cache des projets pour afficher le nouveau projet partagé
      clearCache('projects');
      
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
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <IconLoader2 className="w-12 h-12 !text-accent animate-spin mx-auto mb-4" />
          <p className="text-primary">{t('loading') || 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-page relative">
        <ProjectsBackground userProjects={userProjects} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-default  p-8 max-w-md w-full !text-center relative z-10 shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-6">
            <IconAlertTriangle className="w-8 h-8 !text-danger" />
          </div>
          <h1 className="text-xl font-semibold !text-primary mb-2">
            {t('invitation_error') || 'Erreur d\'invitation'}
          </h1>
          <p className="text-secondary mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="px-6 py-3 bg-muted hover:bg-muted !text-primary  transition-colors"
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

  // Extraire le texte brut de la description HTML
  const getDescriptionPreview = (html: string | undefined) => {
    if (!html) return t('no_description') || 'Aucune description';
    // Créer un élément temporaire pour extraire le texte
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.trim() || t('no_description') || 'Aucune description';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page relative">
      {/* Arrière-plan avec projets floutés */}
      <ProjectsBackground userProjects={userProjects} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-default  p-8 max-w-lg w-full relative z-10 shadow-xl"
      >
        {/* Logo Eclipse */}
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            <Image
              src="/images/logo/eclipse-logo.png"
              alt="Eclipse Studio"
              fill
              className="object-contain opacity-90"
              priority
            />
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold !text-accent !text-center mb-2">
          {t('project_invitation') || 'Invitation À Collaborer'}
        </h1>

        {/* Message */}
        <p className="text-secondary !text-center mb-6">
          <span className="text-accent font-medium">
            {invitation.sender?.username || 'Un utilisateur'}
          </span>{' '}
          {t('invites_you_to_collaborate') || 'vous invite à collaborer sur le projet'}
        </p>

        {/* Projet */}
        <div className="bg-muted  p-5 mb-6 border border-default">
          <h2 className="text-lg font-semibold !text-accent mb-1">
            {invitation.project?.title || 'Projet'}
          </h2>
          <p className="text-xl font-bold !text-primary mb-3 uppercase tracking-wide">
            {invitation.project?.type === 'development' ? t('development') : 
             invitation.project?.type === 'design' ? t('design') : 
             invitation.project?.type || 'DASHBOARD'}
          </p>
          
          {/* Description rendue proprement */}
          <p className="text-sm !text-secondary line-clamp-2 mb-4">
            {getDescriptionPreview(invitation.project?.description)}
          </p>
          
          <div className="flex items-center gap-4 !text-xs !text-muted">
            <span className="flex items-center gap-1">
              <IconUser className="w-3.5 h-3.5" />
              {t('permission') || 'Permission'}: {' '}
              <span className={invitation.permission === 'edit' ? 'text-accent font-medium' : 'text-info font-medium'}>
                {invitation.permission === 'edit' 
                  ? t('can_edit') || 'Peut modifier'
                  : t('view_only') || 'Lecture seule'}
              </span>
            </span>
            {invitation.project?.end_date && (
              <span className="flex items-center gap-1">
                <IconCalendar className="w-3.5 h-3.5" />
                {new Date(invitation.project.end_date).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        {/* Note */}
        <p className="!text-xs !text-muted !text-center mb-6">
          {t('collaborator_note') || 'En tant que collaborateur, vous ne pourrez pas supprimer ce projet.'}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 py-3 px-4 bg-muted hover:bg-muted disabled:opacity-50 !text-primary  transition-colors flex items-center justify-center gap-2"
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
            className="flex-1 py-3 px-4 bg-accent hover:bg-[var(--color-accent)] disabled:opacity-50 !text-white  transition-colors flex items-center justify-center gap-2"
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
        <p className="!text-xs !text-muted !text-center mt-4">
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
