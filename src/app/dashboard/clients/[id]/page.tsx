'use client';

import { useParams } from 'next/navigation';
import { fetchClientById } from '@/lib/api';
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
} from '@tabler/icons-react';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import Link from 'next/link';

interface Client {
  id: number;
  documentId: string;
  name: string;
  email: string;
  enterprise: string;
  address: string;
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

  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;

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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-zinc-100 mb-2 flex items-center gap-2">
              <IconUser className="w-7 h-7 !text-emerald-400" />
              {client?.name}
            </h1>
            <Link
              href={`/dashboard/clients/${params.id}/factures?name=${client?.name || ''}`}
              className="bg-zinc-800/50 flex items-center gap-2 text-zinc-400 border border-zinc-800 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-800/20 hover:text-white transition-colors"
            >
              <IconFileInvoice className="w-4 h-4" />
              {t('invoices')}
            </Link>
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
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              {client?.processStatus}
            </span>
            <span className="bg-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-400">
              Créé le{' '}
              {client?.createdAt &&
                new Date(client.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 p-6">
        <h2 className="text-2xl font-bold text-zinc-100 mb-4">
          {t('projects')}
        </h2>
        <DataTable
          columns={projectColumns}
          data={(client?.projects || []).map(p => ({
            ...p,
            id: String(p.id),
            client: { id: String(client?.id), name: client?.name ?? '' },
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
