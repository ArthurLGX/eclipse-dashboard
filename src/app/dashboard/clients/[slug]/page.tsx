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
  IconSearch,
  IconEye,
  IconPencil,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { generateSlug, generateClientSlug } from '@/utils/slug';
import { usePopup } from '@/app/context/PopupContext';
import AssignProjectDropdown from './AssignProjectDropdown';
import { useAuth } from '@/app/context/AuthContext';
import { useClientBySlug, useUnassignedProjects, useFactures, useProjects, clearCache } from '@/hooks/useApi';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import ImageUpload from '@/app/components/ImageUpload';
import ProjectWorkflowView, { ProjectSelector } from '@/app/components/ProjectWorkflowView';
import ProtectedRoute from '@/app/components/ProtectedRoute';
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

type TabId = 'projects' | 'workflow' | 'factures';

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
  const tabParam = searchParams.get('tab');
  const projectParam = searchParams.get('project');
  const [activeTab, setActiveTab] = useState<TabId>(
    (tabParam === 'workflow' ? 'workflow' : tabParam === 'factures' ? 'factures' : 'projects') as TabId
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam || null);

  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
  const slug = params.slug as string;

  const { data: clientData, loading: clientLoading, refetch: refetchClient } = useClientBySlug(slug, user?.id);
  const client = clientData as Client | null;

  useDocumentTitle(client?.name, { prefix: 'Client' });

  const { data: unassignedProjectsData, loading: loadingProjects, refetch: refetchUnassigned } = useUnassignedProjects(user?.id);
  const unassignedProjects = useMemo(
    () =>
      ((unassignedProjectsData as Project[]) || []).map((p) => ({
        id: p.id,
        documentId: p.documentId,
        title: p.title,
        type: p.type,
        project_status: p.project_status,
      })),
    [unassignedProjectsData]
  );

  const { data: allFactures } = useFactures(user?.id);
  const clientFactures = useMemo(() => {
    if (!client || !allFactures) return [];
    return (allFactures as Facture[]).filter((f) => {
      const clientData = f.client || f.client_id;
      if (!clientData) return false;
      return clientData.documentId === client.documentId || clientData.id === client.id;
    });
  }, [allFactures, client]);

  const { data: allProjects } = useProjects(user?.id);
  const clientProjects = useMemo(() => {
    if (!client || !allProjects) return [];
    return ((allProjects as Project[]) || []).filter((p) => {
      if (!p.client) return false;
      return p.client.documentId === client.documentId || p.client.id === client.id;
    });
  }, [allProjects, client]);

  // Stats
  const stats = useMemo(() => {
    const inProgress = clientProjects.filter((p) => p.project_status === 'in_progress').length;
    const completed = clientProjects.filter((p) => p.project_status === 'completed').length;
    const paidFactures = clientFactures.filter((f) => f.facture_status === 'paid');
    const totalCA = paidFactures.reduce((acc, f) => acc + (Number(f.number) || 0), 0);
    const pendingFactures = clientFactures.filter((f) => f.facture_status === 'sent');
    const pendingAmount = pendingFactures.reduce((acc, f) => acc + (Number(f.number) || 0), 0);
    const lastActivity = [
      ...clientFactures.map((f) => f.updatedAt),
      ...clientProjects.map((p) => p.updatedAt),
      client?.updatedAt,
    ]
      .filter(Boolean)
      .sort()
      .pop();
    return {
      activeCount: inProgress,
      completedCount: completed,
      totalCA,
      pendingCount: pendingFactures.length,
      pendingAmount,
      lastActivity: lastActivity ? new Date(lastActivity as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
    };
  }, [clientProjects, clientFactures, client]);

  // Colonnes projets
  const projectColumns: Column<ProjectTableRow>[] = [
    {
      key: 'title',
      label: t('projects') || 'Projet',
      render: (value, row) => (
        <div>
          <span className="font-semibold !text-primary">{value as string}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <ProjectTypeIcon type={row.type} className="w-4 h-4 !text-muted" />
            <span className="!text-muted !text-xs">{row.type}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'project_status',
      label: t('status') || 'Statut',
      render: (value) => {
        const status = value as string;
        const config =
          status === 'completed'
            ? { label: t('completed') || 'Terminé', className: 'badge-success' }
            : status === 'in_progress'
              ? { label: t('in_progress') || 'En cours', className: 'badge-warning' }
              : status === 'planning'
                ? { label: t('planning') || 'Planification', className: 'badge-info' }
                : { label: status, className: 'badge-primary' };
        return (
          <span className={`badge ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'start_date',
      label: t('start_date') || 'Début',
      render: (value) => (
        <span className="!text-muted !text-sm">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
    {
      key: 'end_date',
      label: t('end_date') || 'Fin',
      render: (value) => (
        <span className="!text-muted !text-sm">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
  ];

  const projectsTableData = useMemo(() => {
    return (client?.projects || []).map((p) => ({
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

  const filteredProjects = useMemo(() => {
    if (!searchValue) return projectsTableData;
    return projectsTableData.filter((p) => p.title.toLowerCase().includes(searchValue.toLowerCase()));
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
      showGlobalPopup(t('client_updated') || 'Client modifié avec succès', 'success');
      clearCache('client');
      setIsEditMode(false);

      if (newName !== client.name) {
        const newSlug = generateClientSlug(newName, client.documentId);
        router.replace(`/dashboard/clients/${newSlug}`);
      } else {
        await refetchClient();
      }
    } catch {
      showGlobalPopup(t('error') || 'Erreur lors de la mise à jour du client', 'error');
    }
  };

  const handleAssignExistingProject = async (projectDocumentId: string) => {
    if (!client?.documentId) {
      showGlobalPopup(t('client_not_found') || 'Client non trouvé', 'error');
      throw new Error('Client not found');
    }

    try {
      await assignProjectToClient(projectDocumentId, client.documentId);
      showGlobalPopup(t('project_assigned_success') || 'Projet assigné avec succès', 'success');
      clearCache('client');
      clearCache('unassigned-projects');
      await Promise.all([refetchClient(), refetchUnassigned()]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showGlobalPopup(errorMessage, 'error');
      throw error;
    }
  };

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search);
  };

  if (clientLoading && !client) {
    return (
      <ProtectedRoute>
        <div className=" mx-auto px-6 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-card  border border-default" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-card  border border-default" />
              ))}
            </div>
            <div className="h-96 bg-card  border border-default" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <div className=" mx-auto px-6 py-6">
          <p className="!text-center !text-secondary !text-lg">
            {t('client_not_found') || 'Client non trouvé'}
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  const currentSlug = generateClientSlug(client.name, client.documentId);

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

  const getImageUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return apiUrl ? `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}` : url;
  };

  const statusLabel = client.processStatus === 'client' ? 'CLIENT' : 'PROSPECT';

  return (
    <ProtectedRoute>
      <div className=" mx-auto px-6 py-6 flex flex-col gap-5">
        {/* Hero */}
        <div className="bg-card border border-default  p-6 md:p-8 flex flex-col md:flex-row items-start gap-6">
          <div className="w-32 h-32 flex-shrink-0 rounded-full overflow-hidden border border-default bg-muted">
            <ImageUpload
              currentImageUrl={getImageUrl(client.image?.url) ?? null}
              onUpload={handleClientImageUpload}
              size="lg"
              shape="circle"
              placeholder="user"
              disabled={!isEditMode}
              website={client.website}
              name={client.name}
              objectFit="contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="!text-xl md:!text-2xl font-extrabold !text-primary tracking-tight uppercase mb-3">
              {client.name}
            </h1>
            <div className="flex flex-col gap-1">
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 !text-sm !text-muted hover:!text-accent transition-colors"
                >
                  <IconMail className="w-3.5 h-3.5 flex-shrink-0" stroke={1.5} />
                  {client.email}
                </a>
              )}
              {client.enterprise && (
                <div className="flex items-center gap-2 !text-sm !text-muted">
                  <IconBuilding className="w-3.5 h-3.5 flex-shrink-0" stroke={1.5} />
                  {client.enterprise}
                </div>
              )}
              {client.website && (
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 !text-sm !text-accent hover:underline"
                >
                  <IconWorld className="w-3.5 h-3.5 flex-shrink-0" stroke={1.5} />
                  {client.website}
                </a>
              )}
              {client.adress && (
                <div className="flex items-center gap-2 !text-sm !text-muted">
                  <IconMapPin className="w-3.5 h-3.5 flex-shrink-0" stroke={1.5} />
                  {client.adress}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <span className="badge badge-success !text-[10px] !font-bold !uppercase !tracking-wider">
                {statusLabel}
              </span>
              <span className="!text-xs !text-muted px-3 py-1 bg-muted border border-default">
                Créé le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full md:w-auto">
            {isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="btn-ghost px-4 py-2 !text-sm font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  form="edit-form"
                  className="btn-primary px-4 py-2 !text-sm font-medium"
                >
                  {t('save')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="btn-ghost flex items-center gap-2 px-4 py-2 !text-sm font-medium"
              >
                <IconEdit className="w-4 h-4" />
                {t('edit')}
              </button>
            )}
            <Link
              href={`/dashboard/clients/${currentSlug}/factures?name=${encodeURIComponent(client.name || '')}`}
              className="btn-ghost flex items-center justify-center gap-2 px-4 py-2 !text-sm font-medium relative"
            >
              <IconFileInvoice className="w-4 h-4" />
              {t('invoices')}
              {(client.factures?.length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full !text-[10px] font-bold bg-accent !text-accent-text">
                  {client.factures?.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-default  p-4">
            <div className="!text-[10px] font-semibold uppercase tracking-wider !text-muted mb-1">
              Projets actifs
            </div>
            <div className="!text-xl font-extrabold !text-primary">{stats.activeCount}</div>
            <div className="!text-xs !text-muted mt-0.5">
              {stats.completedCount} terminé{stats.completedCount > 1 ? 's' : ''}
            </div>
          </div>
          <div className="bg-card border border-default  p-4">
            <div className="!text-[10px] font-semibold uppercase tracking-wider !text-muted mb-1">
              CA total
            </div>
            <div className="!text-xl font-extrabold !text-success-text">{stats.totalCA.toLocaleString('fr-FR')} €</div>
            <div className="!text-xs !text-muted mt-0.5">depuis le début</div>
          </div>
          <div className="bg-card border border-default  p-4">
            <div className="!text-[10px] font-semibold uppercase tracking-wider !text-muted mb-1">
              Factures en attente
            </div>
            <div className="!text-xl font-extrabold !text-accent">{stats.pendingCount}</div>
            <div className="!text-xs !text-muted mt-0.5">
              {stats.pendingAmount > 0 ? `${stats.pendingAmount.toLocaleString('fr-FR')} € à encaisser` : '-'}
            </div>
          </div>
          <div className="bg-card border border-default  p-4">
            <div className="!text-[10px] font-semibold uppercase tracking-wider !text-muted mb-1">
              Dernière activité
            </div>
            <div className="!text-base font-bold !text-primary">{stats.lastActivity || '-'}</div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditMode && (
          <div className="bg-card border border-default  p-6">
            <h2 className="!text-lg font-bold !text-primary mb-4">
              {t('edit')} — {client.name}
            </h2>
            <form
              id="edit-form"
              ref={formRef}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={handleUpdateClient}
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className="!text-sm font-medium !text-primary">
                  {t('name')}
                </label>
                <input id="name" name="name" defaultValue={client.name} required className="input px-3 py-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="!text-sm font-medium !text-primary">
                  Email
                </label>
                <input id="email" name="email" type="email" defaultValue={client.email} required className="input px-3 py-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="enterprise" className="!text-sm font-medium !text-primary">
                  {t('enterprise')}
                </label>
                <input id="enterprise" name="enterprise" defaultValue={client.enterprise} className="input px-3 py-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="address" className="!text-sm font-medium !text-primary">
                  {t('address')}
                </label>
                <input id="address" name="address" defaultValue={client.adress || ''} className="input px-3 py-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="number" className="!text-sm font-medium !text-primary">
                  {t('number')}
                </label>
                <input id="number" name="number" defaultValue={client.number} className="input px-3 py-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="website" className="!text-sm font-medium !text-primary">
                  {t('website')}
                </label>
                <input id="website" name="website" defaultValue={client.website || ''} className="input px-3 py-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="processStatus" className="!text-sm font-medium !text-primary">
                  {t('status')}
                </label>
                <select id="processStatus" name="processStatus" defaultValue={client.processStatus} className="input px-3 py-2">
                  <option value="client">Client</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </form>
          </div>
        )}

        {/* Section card with tabs */}
        <div className="bg-card border border-default  overflow-hidden">
          {/* Tabs bar - underline style */}
          <div className="flex items-center border-b border-default">
            <button
              type="button"
              onClick={() => switchTab('projects')}
              className={`flex items-center gap-2 px-5 py-3 !text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'projects'
                  ? 'border-primary !text-primary'
                  : 'border-transparent !text-muted hover:!text-primary'
              }`}
            >
              {t('projects') || 'Projets'}
              <span
                className={`!text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'projects' ? 'bg-accent !text-white' : 'bg-muted !text-muted'
                }`}
              >
                {clientProjects.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('workflow')}
              className={`flex items-center gap-2 px-5 py-3 !text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'workflow'
                  ? 'border-primary !text-primary'
                  : 'border-transparent !text-muted hover:!text-primary'
              }`}
              title={t('client_journey_subtitle') || 'Qu\'est-ce qui existe et qu\'est-ce qui manque ?'}
            >
              <IconRoute className="w-4 h-4" />
              {t('workflow_tab') || 'Parcours client'}
            </button>
            <button
              type="button"
              onClick={() => switchTab('factures')}
              className={`flex items-center gap-2 px-5 py-3 !text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'factures'
                  ? 'border-primary !text-primary'
                  : 'border-transparent !text-muted hover:!text-primary'
              }`}
            >
              {t('invoices') || 'Factures'}
              <span
                className={`!text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'factures' ? 'bg-accent !text-white' : 'bg-muted !text-muted'
                }`}
              >
                {clientFactures.length}
              </span>
            </button>
          </div>

          {/* Panel: Projets */}
          {activeTab === 'projects' && (
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 w-full sm:w-[220px]">
                    <IconSearch className="w-4 h-4 !text-muted flex-shrink-0" />
                    <input
                      type="text"
                      placeholder={t('search_project') || 'Rechercher un projet…'}
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="flex-1 bg-transparent !text-sm !text-primary outline-none min-w-0"
                    />
                  </div>
                  <AssignProjectDropdown
                    unassignedProjects={unassignedProjects}
                    onAssign={handleAssignExistingProject}
                    loading={loadingProjects}
                    t={t}
                  />
                </div>
              </div>
              <DataTable
                columns={projectColumns}
                data={filteredProjects}
                emptyMessage={t('no_project_for_client') || 'Aucun projet pour ce client.'}
                onRowClick={(row) => router.push(`/dashboard/projects/${generateSlug(row.title, row.documentId)}`)}
                viewMode="table"
                onViewModeChange={() => {}}
              />
            </div>
          )}

          {/* Panel: Parcours client */}
          {activeTab === 'workflow' && (
            <div className="min-h-[60vh]">
              {clientProjects.length > 1 && !selectedProjectId ? (
                <ProjectSelector
                  client={client}
                  projects={clientProjects}
                  onSelectProject={(project) => {
                    setSelectedProjectId(project.documentId);
                    router.replace(`${window.location.pathname}?tab=workflow&project=${project.documentId}`);
                  }}
                />
              ) : clientProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 !text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <IconRoute size={28} className="!text-muted" />
                  </div>
                  <h3 className="!text-lg font-semibold !text-primary mb-2">
                    {t('no_projects_for_workflow') || 'Aucun projet pour ce client'}
                  </h3>
                  <p className="!text-muted !text-sm max-w-md mb-4">
                    {t('workflow_needs_project') || 'Le workflow représente l\'exécution concrète d\'un projet. Créez d\'abord un projet pour ce client.'}
                  </p>
                  <Link
                    href={`/dashboard/projects/new?client=${client.documentId}`}
                    className="btn-primary px-4 py-2 !text-sm"
                  >
                    {t('create_project') || 'Créer un projet'}
                  </Link>
                </div>
              ) : (
                (() => {
                  const projectToShow = selectedProjectId
                    ? clientProjects.find((p) => p.documentId === selectedProjectId)
                    : clientProjects[0];

                  if (!projectToShow) return null;

                  const projectQuotes = clientFactures.filter(
                    (f) =>
                      f.document_type === 'quote' &&
                      (f.project?.documentId === projectToShow.documentId || !f.project)
                  );
                  const projectInvoices = clientFactures.filter(
                    (f) =>
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
                      onBack={
                        clientProjects.length > 1
                          ? () => {
                              setSelectedProjectId(null);
                              router.replace(`${window.location.pathname}?tab=workflow`);
                            }
                          : undefined
                    }
                    />
                  );
                })()
              )}
            </div>
          )}

          {/* Panel: Factures */}
          {activeTab === 'factures' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="!text-base font-bold !text-primary">{t('invoices') || 'Factures'}</h3>
                <Link
                  href={`/dashboard/clients/${currentSlug}/factures?name=${encodeURIComponent(client.name || '')}`}
                  className="btn-primary flex items-center gap-2 px-4 py-2 !text-sm"
                >
                  {(t('view_all_invoices') !== 'view_all_invoices' ? t('view_all_invoices') : null) || 'Voir toutes les factures'}
                </Link>
              </div>
              {clientFactures.length === 0 ? (
                <p className="!text-muted !text-sm py-8 !text-center">
                  Aucune facture pour ce client.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted border-b border-default">
                        <th className="text-left py-3 px-4 !text-[10px] font-bold uppercase tracking-wider !text-muted">
                          N° Facture
                        </th>
                        <th className="text-left py-3 px-4 !text-[10px] font-bold uppercase tracking-wider !text-muted">
                          Projet
                        </th>
                        <th className="text-left py-3 px-4 !text-[10px] font-bold uppercase tracking-wider !text-muted">
                          Montant
                        </th>
                        <th className="text-left py-3 px-4 !text-[10px] font-bold uppercase tracking-wider !text-muted">
                          Statut
                        </th>
                        <th className="text-left py-3 px-4 !text-[10px] font-bold uppercase tracking-wider !text-muted">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 !text-[10px] font-bold uppercase tracking-wider !text-muted">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientFactures.map((f) => {
                        const statusConfig =
                          f.facture_status === 'paid'
                            ? { label: t('paid') || 'Payée', className: 'badge-success' }
                            : f.facture_status === 'sent'
                              ? { label: t('sent') || 'Envoyée', className: 'badge-info' }
                              : f.facture_status === 'overdue'
                                ? { label: t('overdue') || 'En retard', className: 'badge-danger' }
                                : { label: f.facture_status, className: 'badge-primary' };
                        return (
                          <tr
                            key={f.documentId}
                            className="border-b border-default hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold !text-accent">
                              #{f.reference}
                            </td>
                            <td className="py-3 px-4 !text-sm !text-primary">
                              {f.project?.title || '-'}
                            </td>
                            <td className="py-3 px-4 font-semibold !text-primary">
                              {(f.number || 0).toLocaleString('fr-FR')} €
                            </td>
                            <td className="py-3 px-4">
                              <span className={`badge ${statusConfig.className}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 !text-sm !text-muted">
                              {new Date(f.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1">
                                <Link
                                  href={`/dashboard/factures/${generateSlug(`${f.reference}-${client.name || 'client'}`, f.documentId)}`}
                                  className="w-8 h-8 rounded-md bg-accent !text-accent-text flex items-center justify-center hover:opacity-90 transition-opacity"
                                  title={t('view') || 'Voir'}
                                >
                                  <IconEye className="w-4 h-4 shrink-0" stroke={2} />
                                </Link>
                                <Link
                                  href={`/dashboard/factures/${generateSlug(`${f.reference}-${client.name || 'client'}`, f.documentId)}?edit=1`}
                                  className="w-8 h-8 rounded-md bg-accent !text-accent-text flex items-center justify-center hover:opacity-90 transition-opacity"
                                  title={t('edit') || 'Éditer'}
                                >
                                  <IconPencil className="w-4 h-4 shrink-0" stroke={2} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
