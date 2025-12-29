'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { updateClientById, assignProjectToClient, updateClientImage } from '@/lib/api';
import { useState, useRef, useMemo } from 'react';
import DataTable, { Column } from '@/app/components/DataTable';
import ProjectTypeIcon from '@/app/components/ProjectTypeIcon';
import {
  IconMail,
  IconBuilding,
  IconUser,
  IconWorld,
  IconMapPin,
  IconFileInvoice,
  IconEdit,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { generateSlug, generateClientSlug } from '@/utils/slug';
import { usePopup } from '@/app/context/PopupContext';
import TableFilters from '@/app/components/TableFilters';
import AssignProjectDropdown from './AssignProjectDropdown';
import { useAuth } from '@/app/context/AuthContext';
import { useClientBySlug, useUnassignedProjects, clearCache } from '@/hooks/useApi';
import ImageUpload from '@/app/components/ImageUpload';
import type { Client, Project } from '@/types';

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

  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;

  // Le slug est directement le nom du client slugifié
  const slug = params.slug as string;

  // Hook avec slug (basé sur le nom)
  const { data: clientData, loading: clientLoading, refetch: refetchClient } = useClientBySlug(slug);
  const client = clientData as Client | null;
  
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

  // Colonnes du tableau de projets
  const projectColumns: Column<ProjectTableRow>[] = [
    {
      key: 'title',
      label: 'Projet',
      render: (value, row) => (
        <div>
          <span className="font-semibold text-zinc-200">{value as string}</span>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon type={row.type} className="w-4 h-4 !text-zinc-500" />
            <span className="!text-zinc-500 !text-xs">{row.type}</span>
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
          status === 'completed' ? { label: t('completed') || 'Terminé', className: 'bg-emerald-100 !text-emerald-800' } :
          status === 'in_progress' ? { label: t('in_progress') || 'En cours', className: 'bg-yellow-100 !text-yellow-800' } :
          status === 'planning' ? { label: t('planning') || 'Planification', className: 'bg-blue-100 !text-blue-800' } :
          { label: status, className: 'bg-gray-100 !text-gray-800' };

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
        <span className="!text-zinc-300">
          {value ? new Date(value as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
    {
      key: 'end_date',
      label: 'Fin',
      render: (value) => (
        <span className="!text-zinc-300">
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
      
      // Mettre à jour l'URL si le nom a changé
      if (newName !== client.name) {
        const newSlug = generateClientSlug(newName);
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
          <div className="h-48 bg-zinc-900 rounded-xl"></div>
          <div className="h-64 bg-zinc-900 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center text-zinc-400">
          {t('client_not_found') || 'Client non trouvé'}
        </div>
      </div>
    );
  }

  // Générer le slug actuel pour les liens
  const currentSlug = generateClientSlug(client.name);

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
    <div className="max-w-7xl mx-auto p-6 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl shadow-lg p-12 flex flex-col md:flex-row gap-16 items-center mb-8">
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
            <h1 className="text-3xl font-extrabold text-zinc-100 mb-2 flex items-center gap-2">
              <IconUser className="w-7 h-7 !text-emerald-400" />
              {client.name}
            </h1>
          </div>
          <div className="flex flex-wrap flex-col text-zinc-400 mb-2">
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
                <IconMapPin className="w-4 h-4 !text-zinc-500" stroke={1} />
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
            <span className="bg-emerald-500/10 flex items-center gap-2 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              {client.processStatus}
            </span>
            <span className="bg-zinc-800 px-3 flex items-center gap-2 py-1 rounded-full text-xs text-zinc-400">
              Créé le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex lg:w-fit w-full flex-col md:flex-row gap-2">
          {isEditMode ? (
            <div className="flex flex-col md:flex-row items-center gap-2 w-full justify-center text-center">
              <button
                className="bg-orange-500/20 text-center w-full text-orange-500 border border-orange-500 px-4 py-2 rounded-lg font-semibold hover:bg-orange-500/10 transition-colors cursor-pointer"
                onClick={() => setIsEditMode(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="edit-form"
                className="bg-emerald-300/20 !text-center w-full items-center gap-2 text-emerald-300 border border-emerald-300 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-300/10 transition-colors cursor-pointer"
              >
                {t('save')}
              </button>
            </div>
          ) : (
            <button
              className="bg-zinc-800/50 text-center capitalize cursor-pointer flex items-center justify-center gap-2 text-zinc-200 border border-zinc-800 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-800/20 hover:text-white transition-colors w-full"
              onClick={() => setIsEditMode(true)}
            >
              <IconEdit className="w-4 h-4" />
              {t('edit')}
            </button>
          )}

          <Link
            href={`/dashboard/clients/${currentSlug}/factures?name=${client.name || ''}`}
            className="bg-zinc-800/50 text-center flex items-center justify-center gap-2 text-zinc-200 border border-zinc-800 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-800/20 hover:text-white transition-colors w-full relative"
          >
            <IconFileInvoice className="w-4 h-4" />
            {t('invoices')}
            {(client.factures?.length || 0) > 0 && (
              <span className="absolute -top-2 -right-2 bg-emerald-300 text-zinc-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {client.factures?.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Edit Form */}
      {isEditMode && (
        <div className="bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 p-6 mb-8 rounded-xl">
          <h2 className="text-2xl capitalize font-bold text-zinc-100 mb-4">
            {t('edit')} {client.name}
          </h2>
          <form
            id="edit-form"
            ref={formRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={handleUpdateClient}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="capitalize text-zinc-300 font-medium">{t('name')}</label>
              <input id="name" name="name" defaultValue={client.name} required className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-zinc-300 font-medium">Email</label>
              <input id="email" name="email" type="email" defaultValue={client.email} required className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="enterprise" className="text-zinc-300 font-medium">{t('enterprise')}</label>
              <input id="enterprise" name="enterprise" defaultValue={client.enterprise} className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="address" className="text-zinc-300 font-medium">{t('address')}</label>
              <input id="address" name="address" defaultValue={client.adress || ''} className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="number" className="text-zinc-300 font-medium">{t('number')}</label>
              <input id="number" name="number" defaultValue={client.number} className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="website" className="text-zinc-300 font-medium">{t('website')}</label>
              <input id="website" name="website" defaultValue={client.website || ''} className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="processStatus" className="text-zinc-300 font-medium">{t('status')}</label>
              <select id="processStatus" name="processStatus" defaultValue={client.processStatus} className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100">
                <option value="client">Client</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>
          </form>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-zinc-100 mb-4">{t('projects')}</h2>
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
    </div>
  );
}

