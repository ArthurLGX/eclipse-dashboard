'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { updateClientById, assignProjectToClient, updateClientImage } from '@/lib/api';
import { useState, useRef, useMemo } from 'react';
import DataTable, { Column } from '@/app/components/DataTable';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import {
  IconMail,
  IconBuilding,
  IconWorld,
  IconMapPin,
  IconFileInvoice,
  IconEdit,
  IconRoute,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { generateSlug, generateClientSlug } from '@/utils/slug';
import { usePopup } from '@/app/context/PopupContext';
import TableFilters from '@/app/components/TableFilters';
import AssignProjectDropdown from './AssignProjectDropdown';
import { useAuth } from '@/app/context/AuthContext';
import { useClientBySlug, useUnassignedProjects, useFactures, useProjects, clearCache } from '@/hooks/useApi';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import ImageUpload from '@/app/components/ImageUpload';
import ProjectWorkflowView, { ProjectSelector } from '@/app/components/ProjectWorkflowView';
import type { Client, Project, Facture } from '@/types';

interface ProjectTableRow {
  id: string;
  documentId: string;
  title: string;
  description: string;
  project_status: string;
  type: string;
  start_date: string;
  end_date: string;
  client: { id: string; name: string };
  mentor: { id: string; name: string };
}

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const { showGlobalPopup } = usePopup();
  const searchParams = useSearchParams();
  
  const [searchValue, setSearchValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(searchParams.get('edit') === '1');
  // Support for tab URL param (e.g., from pipeline "view journey" link)
  const tabParam = searchParams.get('tab');
  const projectParam = searchParams.get('project');
  const [activeTab, setActiveTab] = useState<'projects' | 'workflow'>(
    tabParam === 'workflow' ? 'workflow' : 'projects'
  );
  // Selected project for workflow view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam || null);

  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;

  // Le slug est directement le nom du client slugifié
  const slug = params.slug as string;

  // Hook avec slug (basé sur le nom) - filtré par utilisateur
  const { data: clientData, loading: clientLoading, refetch: refetchClient } = useClientBySlug(slug, user?.id);
  const client = clientData as Client | null;

  
  // Mettre à jour le titre de l'onglet avec le nom du client
  useDocumentTitle(client?.name, { prefix: 'Client' });
  
  const { data: unassignedProjectsData, loading: loadingProjects, refetch: refetchUnassigned } = useUnassignedProjects(user?.id);
  const unassignedProjects = useMemo(() => 
    ((unassignedProjectsData as Project[]) || []).map(p => ({
      id: p.id,
      documentId: p.documentId,
      title: p.title,
      type: p.type,
      project_status: p.project_status,
    })),
    [unassignedProjectsData]
  );

  // Factures liées au client (filtrées par documentId ou id en fallback)
  const { data: allFactures } = useFactures(user?.id);
  const clientFactures = useMemo(() => {
    if (!client || !allFactures) return [];
    return (allFactures as Facture[]).filter(f => {
      const clientData = f.client || f.client_id;
      if (!clientData) return false;
      return clientData.documentId === client.documentId || 
             clientData.id === client.id;
    });
  }, [allFactures, client]);

  // Projets liés au client (filtrés par documentId ou id en fallback)
  const { data: allProjects } = useProjects(user?.id);
  const clientProjects = useMemo(() => {
    if (!client || !allProjects) return [];
    return ((allProjects as Project[]) || []).filter(p => {
      if (!p.client) return false;
      return p.client.documentId === client.documentId || 
             p.client.id === client.id;
    });
  }, [allProjects, client]);

  // Colonnes du tableau de projets
  const projectColumns: Column<ProjectTableRow>[] = [
    {
      key: 'title',
      label: 'Projet',
      render: (value, row) => (
        <div>
          <span className="font-semibold text-primary">{value as string}</span>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon type={row.type} className="w-4 h-4 text-muted" />
            <span className="text-muted !text-xs">{row.type}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'project_status',
      label: 'Statut',
      render: (value) => {
        const status = value as string;
        const config =
          status === 'completed' ? { label: t('completed') || 'Terminé', className: 'bg-success-light text-success' } :
          status === 'in_progress' ? { label: t('in_progress') || 'En cours', className: 'bg-warning-light text-warning' } :
          status === 'planning' ? { label: t('planning') || 'Planification', className: 'bg-info-light text-info' } :
          { label: status, className: 'bg-muted text-secondary' };

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Début',
      render: (value) => (
        <span className="text-primary">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
    {
      key: 'end_date',
      label: 'Fin',
      render: (value) => (
        <span className="text-primary">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
  ];

  // Données du tableau
  const projectsTableData = useMemo(() => {
    return (client?.projects || []).map(p => ({
      id: String(p.id),
      documentId: p.documentId,
      title: p.title,
      description: p.description,
      project_status: p.project_status,
      type: p.type,
      start_date: p.start_date,
      end_date: p.end_date || '',
      client: { id: String(client?.id), name: client?.name ?? '' },
      mentor: { id: '', name: '' },
    }));
  }, [client]);

  // Filtrage des projets
  const filteredProjects = useMemo(() => {
    if (!searchValue) return projectsTableData;
    return projectsTableData.filter(p => 
      p.title.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [projectsTableData, searchValue]);

  const handleUpdateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current || !client) return;

    const formData = new FormData(formRef.current);
    const newName = formData.get('name') as string;
    const updatedData = {
      name: newName,
      email: formData.get('email') as string,
      number: formData.get('number') as string,
      enterprise: formData.get('enterprise') as string,
      adress: formData.get('address') as string,
      website: formData.get('website') as string,
      processStatus: formData.get('processStatus') as string,
    };

    try {
      await updateClientById(client.documentId, updatedData);
      showGlobalPopup('Client modifié avec succès', 'success');
      clearCache('client');
      setIsEditMode(false);
      
      // Mettre à jour l'URL si le nom a changé (documentId reste le même)
      if (newName !== client.name) {
        const newSlug = generateClientSlug(newName, client.documentId);
        router.replace(`/dashboard/clients/${newSlug}`);
      } else {
        await refetchClient();
      }
    } catch {
      showGlobalPopup('Erreur lors de la mise à jour du client', 'error');
    }
  };

  const handleAssignExistingProject = async (projectId: number) => {
    if (!client?.id) {
      showGlobalPopup('Client non trouvé', 'error');
      throw new Error('Client not found');
    }

    try {
      await assignProjectToClient(projectId, client.id);
      showGlobalPopup(t('project_assigned_success') || 'Projet assigné avec succès', 'success');
      
      // Invalider le cache et recharger
      clearCache('client');
      clearCache('unassigned-projects');
      await Promise.all([refetchClient(), refetchUnassigned()]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showGlobalPopup(errorMessage, 'error');
      throw error;
    }
  };

  // Afficher le skeleton seulement lors du premier chargement (pas pendant les refetch)
  if (clientLoading && !client) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-card rounded-xl"></div>
          <div className="h-64 bg-card rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center text-secondary">
          {t('client_not_found') || 'Client non trouvé'}
        </div>
      </div>
    );
  }

  // Générer le slug actuel pour les liens (avec documentId pour fiabilité)
  const currentSlug = generateClientSlug(client.name, client.documentId);

  // Handler pour l'upload d'image client
  const handleClientImageUpload = async (imageId: number) => {
    if (!client?.documentId) return;
    try {
      await updateClientImage(client.documentId, imageId);
      showGlobalPopup(t('image_updated') || 'Image mise à jour', 'success');
      clearCache('client');
      await refetchClient();
    } catch (error) {
      console.error('Error updating client image:', error);
      showGlobalPopup(t('image_update_error') || 'Erreur lors de la mise à jour de l\'image', 'error');
    }
  };

  return (
    <div className="w-full mx-auto p-6 flex flex-col">
      {/* Header */}
      <div className="bg-card border border-default rounded-xl shadow-lg p-12 flex flex-col md:flex-row gap-16 items-center mb-8">
        <ImageUpload
          currentImageUrl={client.image?.url ? apiUrl + client.image.url : null}
          onUpload={handleClientImageUpload}
          size="lg"
          shape="circle"
          placeholder="user"
          disabled={!isEditMode}
          website={client.website}
          name={client.name}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-col-reverse md:flex-row gap-4 items-center justify-between">
            <h1 className="text-3xl font-extrabold text-primary mb-2 flex items-center gap-2">
              {client.name}
            </h1>
          </div>
          <div className="flex flex-wrap flex-col text-secondary mb-2">
            {client.email && (
              <span className="flex items-center gap-1">
                <IconMail className="w-4 h-4" stroke={1} /> {client.email}
              </span>
            )}
            {client.enterprise && (
              <span className="flex items-center gap-1">
                <IconBuilding className="w-4 h-4" stroke={1} /> {client.enterprise}
              </span>
            )}
            {client.adress && (
              <span className="flex items-center gap-1">
                <IconMapPin className="w-4 h-4 text-muted" stroke={1} />
                {client.adress}
              </span>
            )}
            {client.website && (
              <span
                onClick={() => window.open(client.website || '', '_blank')}
                className="flex items-center gap-1 cursor-pointer hover:underline"
              >
                <IconWorld className="w-4 h-4" stroke={1} />
                {client.website}
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="bg-accent-light flex items-center gap-2 !text-accent px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              {client.processStatus}
            </span>
            <span className="bg-muted px-3 flex items-center gap-2 py-1 rounded-full text-xs text-secondary">
              Créé le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex lg:w-fit w-full flex-col md:flex-row gap-2">
          {isEditMode ? (
            <div className="flex flex-col md:flex-row items-center gap-2 w-full justify-center text-center">
              <button
                className="btn-warning text-center w-full px-4 py-2 rounded-lg font-semibold hover:opacity-80 transition-colors cursor-pointer"
                onClick={() => setIsEditMode(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="edit-form"
                className="btn-success !text-center w-full items-center gap-2 px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all duration-300"
              >
                {t('save')}
              </button>
            </div>
          ) : (
            <button
              className="btn-ghost text-center capitalize cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold w-full transition-all duration-300"
              onClick={() => setIsEditMode(true)}
            >
              <IconEdit className="w-4 h-4" />
              {t('edit')}
            </button>
          )}

          <Link
            href={`/dashboard/clients/${currentSlug}/factures?name=${client.name || ''}`}
            className="btn-ghost text-center flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold w-full relative transition-all duration-300"
          >
            <IconFileInvoice className="w-4 h-4" />
            {t('invoices')}
            {(client.factures?.length || 0) > 0 && (
              <span className="absolute -top-2 -right-2 bg-success-light text-success text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {client.factures?.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Edit Form */}
      {isEditMode && (
        <div className="bg-card border border-default p-6 mb-8 rounded-xl">
          <h2 className="text-2xl capitalize font-bold text-primary mb-4">
            {t('edit')} {client.name}
          </h2>
          <form
            id="edit-form"
            ref={formRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={handleUpdateClient}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="capitalize text-primary font-medium">{t('name')}</label>
              <input id="name" name="name" defaultValue={client.name} required className="input px-3 py-2 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-primary font-medium">Email</label>
              <input id="email" name="email" type="email" defaultValue={client.email} required className="input px-3 py-2 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="enterprise" className="text-primary font-medium">{t('enterprise')}</label>
              <input id="enterprise" name="enterprise" defaultValue={client.enterprise} className="input px-3 py-2 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="address" className="text-primary font-medium">{t('address')}</label>
              <input id="address" name="address" defaultValue={client.adress || ''} className="input px-3 py-2 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="number" className="text-primary font-medium">{t('number')}</label>
              <input id="number" name="number" defaultValue={client.number} className="input px-3 py-2 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="website" className="text-primary font-medium">{t('website')}</label>
              <input id="website" name="website" defaultValue={client.website || ''} className="input px-3 py-2 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="processStatus" className="text-primary font-medium">{t('status')}</label>
              <select id="processStatus" name="processStatus" defaultValue={client.processStatus} className="input px-3 py-2 rounded-lg">
                <option value="client">Client</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>
          </form>
        </div>
      )}

      {/* Tabs with descriptive tooltips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'projects' ? 'bg-accent text-white' : 'bg-hover text-secondary hover:text-primary'
          }`}
        >
          {t('projects') || 'Projets'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'workflow' ? 'bg-accent text-white' : 'bg-hover text-secondary hover:text-primary'
          }`}
          title={t('client_journey_subtitle') || 'Qu\'est-ce qui existe et qu\'est-ce qui manque ?'}
        >
          <IconRoute size={14} />
          {t('workflow_tab') || 'Parcours client'}
        </button>
      </div>
      
      {/* Contextual description */}
      {activeTab === 'workflow' && (
        <p className="text-xs text-muted mb-4 -mt-2">
          {t('client_journey_description') || 'Vue détaillée des éléments liés à ce client'} — {t('workflow_explains_what') || 'Ce qui existe / manque'}
        </p>
      )}

      {activeTab === 'projects' && (
        <div className="bg-card border border-default p-6 rounded-xl">
          <h2 className="text-2xl font-bold text-primary mb-4">{t('projects')}</h2>
          <TableFilters
            searchPlaceholder={t('search_project') || 'Rechercher un projet'}
            statusOptions={[]}
            onSearchChangeAction={setSearchValue}
            onStatusChangeAction={() => {}}
            searchValue={searchValue}
            statusValue={''}
          />
          <div className="mb-4">
            <AssignProjectDropdown
              unassignedProjects={unassignedProjects}
              onAssign={handleAssignExistingProject}
              loading={loadingProjects}
              t={t}
            />
          </div>
          <DataTable
            columns={projectColumns}
            data={filteredProjects}
            emptyMessage="Aucun projet pour ce client."
            onRowClick={(row) => router.push(`/dashboard/projects/${generateSlug(row.title, row.documentId)}`)}
          />
        </div>
      )}

      {activeTab === 'workflow' && client && (
        <div className="bg-card border border-default rounded-xl overflow-hidden" style={{ minHeight: '80vh' }}>
          {/* Si plusieurs projets et aucun sélectionné → sélecteur */}
          {clientProjects.length > 1 && !selectedProjectId ? (
            <ProjectSelector
              client={client}
              projects={clientProjects}
              onSelectProject={(project) => {
                setSelectedProjectId(project.documentId);
                // Update URL
                router.replace(`${window.location.pathname}?tab=workflow&project=${project.documentId}`);
              }}
            />
          ) : clientProjects.length === 0 ? (
            /* Aucun projet → message */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <IconRoute size={32} className="text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                {t('no_projects_for_workflow') || 'Aucun projet pour ce client'}
              </h3>
              <p className="text-secondary text-sm max-w-md">
                {t('workflow_needs_project') || 'Le workflow représente l\'exécution concrète d\'un projet. Créez d\'abord un projet pour ce client.'}
              </p>
              <Link
                href={`/dashboard/projects/new?client=${client.documentId}`}
                className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
              >
                {t('create_project') || 'Créer un projet'}
              </Link>
            </div>
          ) : (
            /* Projet sélectionné ou unique → workflow */
            (() => {
              const projectToShow = selectedProjectId 
                ? clientProjects.find(p => p.documentId === selectedProjectId)
                : clientProjects[0];
              
              if (!projectToShow) return null;
              
              // Filter quotes and invoices for this project
              const projectQuotes = clientFactures.filter(f => 
                f.document_type === 'quote' && 
                (f.project?.documentId === projectToShow.documentId || !f.project)
              );
              const projectInvoices = clientFactures.filter(f => 
                f.document_type !== 'quote' && 
                (f.project?.documentId === projectToShow.documentId || !f.project)
              );
              
              return (
                <ProjectWorkflowView
                  client={client}
                  project={projectToShow}
                  quotes={projectQuotes}
                  invoices={projectInvoices}
                  contracts={[]}
                  onBack={clientProjects.length > 1 ? () => {
                    setSelectedProjectId(null);
                    router.replace(`${window.location.pathname}?tab=workflow`);
                  } : undefined}
                />
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
