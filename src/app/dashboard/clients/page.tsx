'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchClients } from '@/lib/api';
import useLenis from '@/utils/useLenis';
import DataTable, { Column } from '@/app/components/DataTable';
import TableActions from '@/app/components/TableActions';
import TableFilters, { FilterOption } from '@/app/components/TableFilters';
import { usePopup } from '@/app/context/PopupContext';

interface Client {
  id: number;
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
}

export default function ClientsPage() {
  const { showGlobalPopup } = usePopup();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useLenis();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchClients();
        setClients(response.data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statusOptions: FilterOption[] = [
    {
      value: 'client',
      label: 'Client',
      count: clients.filter(client => client.processStatus === 'client').length,
    },
  ];

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      searchTerm === '' ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.enterprise.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === '' || client.processStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: Column<Client>[] = [
    {
      key: 'name',
      label: 'Nom',
      render: value => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
            <span className="!text-zinc-300 font-medium text-sm">
              {(value as string).charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="!text-zinc-200 font-medium">{value as string}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: value => <p className="!text-zinc-300">{value as string}</p>,
    },
    {
      key: 'enterprise',
      label: 'Entreprise',
      render: value => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'website',
      label: 'Site web',
      render: value => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'processStatus',
      label: 'Statut',
      render: value => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'client':
              return {
                label: 'Client',
                className: 'bg-green-100 !text-green-800',
              };
            case 'prospect':
              return {
                label: 'Prospect',
                className: 'bg-blue-100 !text-blue-800',
              };
            default:
              return { label: status, className: 'bg-gray-100 !text-gray-800' };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date de création',
      render: value => (
        <p className="!text-zinc-300">
          {new Date(value as string).toLocaleDateString('fr-FR')}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <TableActions
          onEdit={() => {
            console.log('Edit client:', (row as Client).id);
            showGlobalPopup('Client modifié avec succès', 'success');
          }}
          onDelete={() => {
            console.log('Delete client:', (row as Client).id);
            showGlobalPopup('Client supprimé avec succès', 'success');
          }}
        />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="!text-3xl font-bold !text-zinc-200">Clients</h1>
        <button className="bg-green-500 !text-black px-4 py-2 rounded-lg hover:bg-green-400 transition-colors">
          Ajouter un client
        </button>
      </div>
      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
              <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
              <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
              <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
              <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
              <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
              <div className="h-8 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <div className="h-6 bg-zinc-800 rounded w-1/3 animate-pulse"></div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800"
                  >
                    <div className="h-6 bg-zinc-800 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-zinc-800 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : clients.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50   p-6 rounded-lg border border-zinc-800">
              <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                Total Clients
              </h3>
              <p className="!text-3xl font-bold !text-green-400">
                {clients.length}
              </p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
              <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                Clients Actifs
              </h3>
              <p className="!text-3xl font-bold !text-blue-400">
                {
                  clients.filter(client => client.processStatus === 'client')
                    .length
                }
              </p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
              <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
                Nouveaux ce mois
              </h3>
              <p className="!text-3xl font-bold !text-purple-400">
                {
                  clients.filter(
                    client =>
                      client.createdAt >= new Date().toISOString().split('T')[0]
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="!text-xl font-semibold !text-zinc-200">
                Liste des clients
              </h2>
            </div>
            <div className="p-6">
              <TableFilters
                searchPlaceholder="Rechercher par nom, email ou entreprise..."
                statusOptions={statusOptions}
                onSearchChange={setSearchTerm}
                onStatusChange={setStatusFilter}
                searchValue={searchTerm}
                statusValue={statusFilter}
              />
              <DataTable<Client>
                columns={columns}
                data={filteredClients}
                loading={loading}
                emptyMessage="Aucun client trouvé"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="!text-zinc-400">Aucun client trouvé</p>
        </div>
      )}
    </motion.div>
  );
}
