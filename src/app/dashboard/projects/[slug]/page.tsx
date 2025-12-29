'use client';

import { useParams, useRouter } from 'next/navigation';
import { updateProject, fetchFacturesByProject } from '@/lib/api';
import { useEffect, useState, useRef, useMemo } from 'react';
import {
  IconCalendar,
  IconBuilding,
  IconEdit,
  IconArrowLeft,
  IconCode,
  IconFileText,
  IconCheck,
  IconProgress,
  IconClockPause,
  IconFileInvoice,
  IconPlus,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { usePopup } from '@/app/context/PopupContext';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import { extractIdFromSlug, generateSlug, generateClientSlug } from '@/utils/slug';
import { motion } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { useProject, useClients, clearCache } from '@/hooks/useApi';
import type { Project, Client, Facture } from '@/types';

const PROJECT_STATUS = [
  { value: 'planning', label: 'Planification' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
];

const PROJECT_TYPES = [
  { value: 'development', label: 'Développement' },
  { value: 'design', label: 'Design' },
  { value: 'maintenance', label: 'Maintenance' },
];

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const { showGlobalPopup } = usePopup();

  // Extraire l'ID du slug
  const slug = params.slug as string;
  const projectId = extractIdFromSlug(slug);

  // Hooks avec cache
  const { data: projectData, loading, refetch: refetchProject } = useProject(projectId ? Number(projectId) : undefined);
  const project = projectData as Project | null;
  
  const { data: clientsData } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);

  // État local pour l'édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loadingFactures, setLoadingFactures] = useState(false);

  // Initialiser les valeurs d'édition quand le projet change
  useEffect(() => {
    if (project) {
      setSelectedClientId(project.client?.documentId || '');
      setSelectedStatus(project.project_status || 'planning');
      setSelectedType(project.type || 'development');
      setStartDate(project.start_date?.split('T')[0] || '');
      setEndDate(project.end_date?.split('T')[0] || '');

      // Rediriger vers le bon slug si nécessaire
      const correctSlug = generateSlug(project.title, project.id);
      if (slug !== correctSlug) {
        router.replace(`/dashboard/projects/${correctSlug}`, { scroll: false });
      }
    }
  }, [project, slug, router]);

  // Charger les factures du projet
  useEffect(() => {
    const loadFactures = async () => {
      if (!user?.id || !project?.id) return;
      try {
        setLoadingFactures(true);
        const response = await fetchFacturesByProject(user.id, project.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFactures((response as any).data || []);
      } catch (error) {
        console.error('Error fetching factures:', error);
      } finally {
        setLoadingFactures(false);
      }
    };
    loadFactures();
  }, [user?.id, project?.id]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: t('completed') || 'Terminé',
          className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          icon: <IconCheck className="w-4 h-4" />,
        };
      case 'in_progress':
        return {
          label: t('in_progress') || 'En cours',
          className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          icon: <IconProgress className="w-4 h-4" />,
        };
      case 'planning':
      default:
        return {
          label: t('planning') || 'Planification',
          className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          icon: <IconClockPause className="w-4 h-4" />,
        };
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;

    const formData = new FormData(e.currentTarget);

    try {
      await updateProject(project.documentId, {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        notes: formData.get('notes') as string,
        project_status: selectedStatus,
        type: selectedType,
        start_date: startDate,
        end_date: endDate,
        client: selectedClientId || null,
      });

      showGlobalPopup(t('project_updated_success') || 'Projet mis à jour avec succès', 'success');
      setIsEditMode(false);

      // Invalider le cache et recharger
      clearCache('project');
      await refetchProject();
    } catch (error) {
      console.error('Error updating project:', error);
      showGlobalPopup('Erreur lors de la mise à jour', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl text-zinc-200">Projet non trouvé</h1>
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
          Retour aux projets
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.project_status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 md:p-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
          <span>{t('back') || 'Retour'}</span>
        </Link>

        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
        >
          <IconEdit className="w-4 h-4" />
          {t('edit') || 'Modifier'}
        </button>
      </div>

      {/* Titre et statut */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <ProjectTypeIcon type={isEditMode ? selectedType : project.type} className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            {isEditMode ? (
              <form ref={formRef} onSubmit={handleSave} id="edit-form">
                <input
                  type="text"
                  name="title"
                  defaultValue={project.title}
                  className="text-2xl md:text-3xl font-bold bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </form>
            ) : (
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">{project.title}</h1>
            )}
            {isEditMode ? (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="mt-2 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 text-sm focus:outline-none focus:border-emerald-500"
              >
                {PROJECT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-zinc-500 flex items-center gap-2 mt-1">
                <ProjectTypeIcon type={project.type} className="w-4 h-4" />
                {project.type}
              </p>
            )}
          </div>
        </div>
        <div className="md:ml-auto">
          {isEditMode ? (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              {PROJECT_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          ) : (
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig.className}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          )}
        </div>
      </div>

      {/* Grille d'informations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <IconFileText className="w-5 h-5 text-emerald-400" />
              {t('description') || 'Description'}
            </h2>
            {isEditMode ? (
              <textarea
                name="description"
                form="edit-form"
                defaultValue={project.description}
                rows={4}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 focus:outline-none focus:border-emerald-500 resize-none"
              />
            ) : (
              <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {project.description || 'Aucune description'}
              </p>
            )}
          </div>

          {/* Notes */}
          {(project.notes || isEditMode) && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <IconCode className="w-5 h-5 text-blue-400" />
                {t('notes') || 'Notes'}
              </h2>
              {isEditMode ? (
                <textarea
                  name="notes"
                  form="edit-form"
                  defaultValue={project.notes || ''}
                  rows={3}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 focus:outline-none focus:border-emerald-500 resize-none"
                />
              ) : (
                <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {project.notes}
                </p>
              )}
            </div>
          )}

          {/* Factures associées */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <IconFileInvoice className="w-5 h-5 text-amber-400" />
                {t('invoices') || 'Factures'}
              </h2>
              <Link
                href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                {t('add') || 'Ajouter'}
              </Link>
            </div>
            {loadingFactures ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : factures.length > 0 ? (
              <div className="space-y-3">
                {factures.map((facture) => (
                  <Link
                    key={facture.documentId}
                    href={`/dashboard/factures/${generateSlug(`${facture.reference}-${facture.client_id?.name || 'facture'}`, facture.id)}`}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <IconFileInvoice className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-zinc-200 group-hover:text-emerald-400 transition-colors font-medium">
                          {facture.reference}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {facture.client_id?.name || t('no_client') || 'Aucun client'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-200 font-medium">
                        {facture.total_ttc?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || '-'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        facture.facture_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        facture.facture_status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {facture.facture_status === 'paid' ? t('paid') || 'Payée' :
                         facture.facture_status === 'sent' ? t('sent') || 'Envoyée' :
                         t('draft') || 'Brouillon'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-zinc-500 text-sm mb-3">
                  {t('no_invoices_for_project') || 'Aucune facture associée à ce projet'}
                </p>
                <Link
                  href={`/dashboard/factures/ajouter?projectId=${project.id}&projectTitle=${encodeURIComponent(project.title)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors text-sm"
                >
                  <IconPlus className="w-4 h-4" />
                  {t('create_first_invoice') || 'Créer une facture'}
                </Link>
              </div>
            )}
          </div>

          {/* Boutons en mode édition */}
          {isEditMode && (
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                type="submit"
                form="edit-form"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                {t('save') || 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              {t('dates') || 'Dates'}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <IconCalendar className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-zinc-500">{t('start_date') || 'Date de début'}</p>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <p className="text-zinc-200">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }) : '-'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IconCalendar className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-zinc-500">{t('end_date') || 'Date de fin'}</p>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <p className="text-zinc-200">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }) : '-'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              {t('client') || 'Client'}
            </h3>
            {isEditMode ? (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">{t('no_client') || 'Aucun client'}</option>
                {clients.map(client => (
                  <option key={client.documentId} value={client.documentId}>
                    {client.name}
                  </option>
                ))}
              </select>
            ) : project.client ? (
              <Link
                href={`/dashboard/clients/${generateClientSlug(project.client.name)}`}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <IconBuilding className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-zinc-200 group-hover:text-emerald-400 transition-colors">
                    {project.client.name}
                  </p>
                  <p className="text-xs text-zinc-500">{project.client.email}</p>
                </div>
              </Link>
            ) : (
              <p className="text-zinc-500 text-sm">{t('no_client_assigned') || 'Aucun client assigné'}</p>
            )}
          </div>

          {/* Technologies */}
          {project.technologies && project.technologies.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
                {t('technologies') || 'Technologies'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.technologies.map(tech => (
                  <span
                    key={tech.id}
                    className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                  >
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Métadonnées */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              {t('info') || 'Informations'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('created_at') || 'Créé le'}</span>
                <span className="text-zinc-300">
                  {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('updated_at') || 'Mis à jour le'}</span>
                <span className="text-zinc-300">
                  {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
