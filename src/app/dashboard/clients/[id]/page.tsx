'use client';

import { useParams } from 'next/navigation';
import { createProject, fetchClientById, updateClientById } from '@/lib/api';
import { useEffect, useState } from 'react';
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
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { usePopup } from '@/app/context/PopupContext';
import TableFilters from '@/app/components/TableFilters';
interface Client {
  id: number;
  documentId: string;
  name: string;
  email: string;
  enterprise: string;
  address: string;
  number: string;
  website: string;
  processStatus: string;
  image: {
    url: string;
  };
  createdAt: string;
  updatedAt: string;
  projects: {
    id: number;
    documentId: string;
    title: string;
    description: string;
    type: string;
    project_status: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
  }[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  project_status: string;
  client: {
    id: string;
    name: string;
  };
  mentor: {
    id: string;
    name: string;
  };
  type: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export default function ClientDetailsPage() {
  const params = useParams();
  const { t } = useLanguage();
  const [client, setClient] = useState<Client | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { showGlobalPopup } = usePopup();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(
    searchParams.get('edit') === '1' || false
  );
  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectFormLoading, setProjectFormLoading] = useState(false);
  const [technologies, setTechnologies] = useState<string[]>([]); // Pour la multi-sélection

  useEffect(() => {
    const fetchClientData = async () => {
      const clientData = await fetchClientById(Number(params.id));
      setClient(clientData.data[0]);
      console.log(clientData.data[0]);
    };

    fetchClientData();
  }, [params.id]);

  const projectColumns: Column<Project>[] = [
    {
      key: 'title',
      label: 'Projet',
      render: (value, row) => (
        <div>
          <span className="font-semibold text-zinc-200">{value as string}</span>
          <div className="flex items-center gap-2 mt-1">
            <ProjectTypeIcon
              type={row.type}
              className="w-4 h-4 !text-zinc-500"
            />
            <span className="!text-zinc-500 !text-xs">{row.type}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'project_status',
      label: 'Statut',
      render: value => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'completed':
              return {
                label: 'Terminé',
                className: 'bg-green-100 !text-green-800',
              };
            case 'in_progress':
              return {
                label: 'En cours',
                className: 'bg-yellow-100 !text-yellow-800',
              };
            case 'pending':
              return {
                label: 'En attente',
                className: 'bg-blue-100 !text-blue-800',
              };
            default:
              return { label: status, className: 'bg-gray-100 !text-gray-800' };
          }
        };
        const config = getStatusConfig(status);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Début',
      render: value => (
        <span className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'end_date',
      label: 'Fin',
      render: value => (
        <span className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
  ];

  const handleUpdateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(formRef.current!);
    const updatedClient = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      number: formData.get('number') as string, // or get from form if you have it
      enterprise: formData.get('enterprise') as string,
      adress: formData.get('address') as string, // note: 'adress'
      website: formData.get('website') as string,
      processStatus: formData.get('processStatus') as string,
    };
    try {
      await updateClientById(client?.documentId as string, updatedClient);
      showGlobalPopup('Client modifié avec succès', 'success');
      setClient(prev => (prev ? { ...prev, ...updatedClient } : prev));
      setIsEditMode(false);
    } catch {
      showGlobalPopup('Erreur lors de la mise à jour du client', 'error');
    }
  };

  // Fonction pour créer un projet (appelée à la soumission du formulaire)
  async function handleAssignProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProjectFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const newProject = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      project_status: formData.get('project_status') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      notes: formData.get('notes') as string,
      type: formData.get('type') as string,
      technologies: technologies, // tableau d'ids ou de noms
      client: client!.id, // ou documentId selon backend
      // document: à gérer si tu veux l'upload
    };
    try {
      await createProject(newProject); // This line was commented out in the original file, so it's commented out here.
      showGlobalPopup('Projet assigné avec succès', 'success');
      setShowProjectForm(false);
      // Recharge les projets du client (refetch ou reload page)
      // ...
    } catch {
      showGlobalPopup('Erreur lors de la création du projet', 'error');
    } finally {
      setProjectFormLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col ">
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl shadow-lg p-12 flex flex-col md:flex-row gap-16 items-center mb-8">
        {client?.image?.url && (
          <Image
            src={apiUrl + client.image.url}
            alt={client.name}
            width={128}
            height={128}
          />
        )}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-col-reverse md:flex-row gap-4 items-center justify-between">
            <h1 className="text-3xl font-extrabold text-zinc-100 mb-2 flex items-center gap-2">
              <IconUser className="w-7 h-7 !text-emerald-400" />
              {client?.name}
            </h1>
          </div>
          <div className="flex flex-wrap flex-col  text-zinc-400 mb-2">
            {client?.email && (
              <span className="flex items-center gap-1">
                <IconMail className="w-4 h-4" stroke={1} /> {client?.email}
              </span>
            )}
            {client?.enterprise && (
              <span className="flex items-center gap-1">
                <IconBuilding className="w-4 h-4" stroke={1} />{' '}
                {client?.enterprise}
              </span>
            )}
            {client?.address && (
              <span className="flex items-center gap-1">
                <IconMapPin className="w-4 h-4 !text-zinc-500" stroke={1} />
                {client?.address}
              </span>
            )}
            {client?.website && (
              <span
                onClick={() => window.open(client?.website, '_blank')}
                className="flex items-center gap-1 cursor-pointer hover:underline"
              >
                <IconWorld className="w-4 h-4" stroke={1} />
                {client?.website}
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="bg-emerald-500/10 flex items-center gap-2 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              {client?.processStatus}
            </span>
            <span className="bg-zinc-800 px-3 flex items-center gap-2 py-1 rounded-full text-xs text-zinc-400">
              Créé le{' '}
              {client?.createdAt &&
                new Date(client.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        <div className="flex lg:w-fit w-full flex-col md:flex-row gap-2">
          {isEditMode ? (
            <div className="flex flex-col md:flex-row items-center gap-2 w-full justify-center text-center">
              <button
                className="bg-orange-500/20 text-center w-full text-orange-500 border border-orange-500 px-4 py-2 rounded-lg font-semibold hover:bg-orange-500/10 transition-colors cursor-pointer"
                onClick={() => {
                  setIsEditMode(false);
                }}
              >
                {t('cancel')}
              </button>
              <button
                className="bg-emerald-300/20 !text-center w-full  items-center gap-2 text-emerald-300 border border-emerald-300 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-300/10 transition-colors cursor-pointer"
                onClick={() => {}}
              >
                {t('save')}
              </button>
            </div>
          ) : (
            <button
              className="bg-zinc-800/50 text-center capitalize cursor-pointer flex items-center justify-center gap-2 text-zinc-200 border border-zinc-800 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-800/20 hover:text-white transition-colors w-full"
              onClick={() => {
                setIsEditMode(true);
              }}
            >
              <IconEdit className="w-4 h-4" />
              {t('edit')}
            </button>
          )}

          <Link
            href={`/dashboard/clients/${params.id}/factures?name=${client?.name || ''}`}
            className="bg-zinc-800/50 text-center flex items-center justify-center gap-2 text-zinc-200 border border-zinc-800 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-800/20 hover:text-white transition-colors w-full"
          >
            <IconFileInvoice className="w-4 h-4" />
            {t('invoices')}
          </Link>
        </div>
      </div>

      {isEditMode && client && (
        <div className="bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 p-6 mb-8">
          <h2 className="text-2xl capitalize font-bold text-zinc-100  mb-4">
            {t('edit')} {client.name}
          </h2>
          <form
            ref={formRef}
            className="grid grid-cols-1 gap-6"
            onSubmit={handleUpdateClient}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="name"
                  className="capitalize text-zinc-300 font-medium"
                >
                  {t('name')}
                </label>
                <input
                  id="name"
                  name="name"
                  defaultValue={client.name}
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-zinc-300 font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={client.email}
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="enterprise"
                  className="text-zinc-300 font-medium"
                >
                  {t('enterprise')}
                </label>
                <input
                  id="enterprise"
                  name="enterprise"
                  defaultValue={client.enterprise}
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="address" className="text-zinc-300 font-medium">
                  {t('address')}
                </label>
                <input
                  id="address"
                  name="address"
                  defaultValue={client.address}
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="number" className="text-zinc-300 font-medium">
                  {t('number')}
                </label>
                <input
                  id="number"
                  name="number"
                  defaultValue={client.number}
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="website" className="text-zinc-300 font-medium">
                  {t('website')}
                </label>
                <input
                  id="website"
                  name="website"
                  defaultValue={client.website}
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="processStatus"
                  className="text-zinc-300 font-medium"
                >
                  {t('status')}
                </label>
                <select
                  id="processStatus"
                  name="processStatus"
                  defaultValue={client.processStatus}
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                >
                  <option value="client">Client</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 w-full justify-center text-center">
              <button
                className="bg-orange-500/20 text-center w-full text-orange-500 border border-orange-500 px-4 py-2 rounded-lg font-semibold hover:bg-orange-500/10 transition-colors cursor-pointer"
                onClick={() => {
                  setIsEditMode(false);
                }}
              >
                {t('cancel')}
              </button>
              <button
                className="bg-emerald-300/20 !text-center w-full  items-center gap-2 text-emerald-300 border border-emerald-300 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-300/10 transition-colors cursor-pointer"
                onClick={() => {}}
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 p-6">
        <h2 className="text-2xl font-bold text-zinc-100 mb-4">
          {t('projects')}
        </h2>
        <TableFilters
          searchPlaceholder={t('search_project') || 'Rechercher un projet'}
          statusOptions={[]}
          onSearchChangeAction={setSearchValue}
          onStatusChangeAction={() => {}}
          searchValue={searchValue}
          statusValue={''}
        />
        <div className="mb-4">
          <button
            className="bg-emerald-500 text-white px-4 py-2 rounded"
            onClick={() => setShowProjectForm(true)}
          >
            Assigner un projet
          </button>
        </div>
        {showProjectForm && (
          <form
            onSubmit={handleAssignProject}
            className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900 p-6 rounded-lg"
          >
            <input
              name="title"
              placeholder="Titre"
              required
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
            />
            <input
              name="type"
              placeholder="Type"
              required
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
            />
            <textarea
              name="description"
              placeholder="Description"
              required
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100 md:col-span-2"
            />
            <select
              name="project_status"
              required
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
            >
              <option value="completed">Terminé</option>
              <option value="in_progress">En cours</option>
              <option value="pending">En attente</option>
            </select>
            <input
              name="start_date"
              type="date"
              required
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
            />
            <input
              name="end_date"
              type="date"
              required
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
            />
            <input
              name="notes"
              placeholder="Notes"
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100 md:col-span-2"
            />
            {/* Technologies multi-select (à adapter selon tes données) */}
            <select
              name="technologies"
              multiple
              value={technologies}
              onChange={e =>
                setTechnologies(
                  Array.from(e.target.selectedOptions, opt => opt.value)
                )
              }
              className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100 md:col-span-2"
            >
              {/* Remplis dynamiquement avec tes technos */}
              <option value="NextJS">NextJS</option>
              <option value="React">React</option>
              <option value="NodeJS">NodeJS</option>
            </select>
            {/* Document upload (optionnel) */}
            <input name="document" type="file" className="md:col-span-2" />
            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="px-4 py-2 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                disabled={projectFormLoading}
              >
                {projectFormLoading ? 'Enregistrement...' : 'Assigner'}
              </button>
            </div>
          </form>
        )}
        <DataTable
          columns={projectColumns}
          data={(client?.projects || []).map(p => ({
            ...p,
            id: String(p.id),
            client: {
              id: String(client?.id),
              name: client?.name ?? '',
            },
            mentor: { id: '', name: '' },
            created_at: p.created_at,
            updated_at: p.updated_at,
          }))}
          emptyMessage="Aucun projet pour ce client."
        />
      </div>
    </div>
  );
}
