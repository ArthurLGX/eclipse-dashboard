'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fetchFacturesUser, createFacture, fetchProjectsUser } from '@/lib/api';
import useLenis from '@/utils/useLenis';
import TableActions from '@/app/components/TableActions';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardPageTemplate from '@/app/components/DashboardPageTemplate';
import { Column } from '@/app/components/DataTable';
import { FilterOption } from '@/app/components/TableFilters';
import {
  IconCheck,
  IconClock,
  IconUsers,
  IconUserCheck,
  IconUserPlus,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { Client, Facture, Project } from '@/app/models/Models';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';

export default function FacturesPage() {
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  useLenis();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetchFacturesUser(user.id);
        setFactures(response.data || []);
        const projectsResponse = await fetchProjectsUser(user.id);
        setProjects(projectsResponse.data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formRef.current!));
    console.log('Data', data);
    const response = await createFacture({
      reference: data.reference as string,
      number: Number(data.number),
      date: data.date as string,
      due_date: data.due_date as string,
      facture_status: data.facture_status as string,
      currency: data.currency as string,
      pdf: data.pdf as string,
      client_id: Number(data.client_id),
      description: data.description as string,
      notes: data.notes as string,
      project: Number(data.project),
      user: user?.id as number,
      tva_applicable: false,
      invoice_lines: [],
    });
    console.log('Nouvelle facture :', response);
    showGlobalPopup(t('invoice_created'), 'success');
    setShowCreateModal(false);
  };

  const statusOptions: FilterOption[] = [
    {
      value: 'client',
      label: 'Client',
      count: factures.filter(facture => facture.facture_status === 'paid')
        .length,
    },
  ];

  const filteredFactures = factures.filter(facture => {
    const matchesSearch =
      searchTerm === '' ||
      facture.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facture.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facture.due_date.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === '' || facture.facture_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'reference',
      label: t('reference'),
      render: (value: string, row: Facture) => (
        <div
          className="flex items-center gap-3 cursor-pointer  transition-colors"
          onClick={() => router.push(`/dashboard/factures/${row.documentId}`)}
        >
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
            <span className="!text-zinc-300 font-medium !text-sm">
              {value.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="!text-zinc-200 font-medium">{value}</p>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (value: string) => (
        <p className="!text-zinc-300">{value as string}</p>
      ),
    },
    {
      key: 'due_date',
      label: "Date d'échéance",
      render: (value: string) => (
        <p className="!text-zinc-300">{(value as string) || 'N/A'}</p>
      ),
    },
    {
      key: 'facture_status',
      label: 'Statut',
      render: (value: string) => (
        <div
          className={` ${value === 'paid' ? '!text-green-500' : value === 'pending' ? '!text-yellow-500' : '!text-orange-500'}`}
        >
          {value === 'paid' ? (
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 !text-green-500 bg-green-500/10 p-1 rounded-full" />{' '}
              {t('paid')}
            </div>
          ) : value === 'pending' ? (
            <div className="flex items-center gap-2">
              <IconClock className="w-4 h-4 !text-yellow-500 bg-yellow-500/10 p-1 rounded-full" />{' '}
              {t('pending')}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IconClock className="w-4 h-4 !text-orange-500 bg-orange-500/10 p-1 rounded-full" />{' '}
              {t('draft')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'currency',
      label: 'Devise',
      render: (value: string) => {
        const status = value as string;
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'EUR':
              return {
                label: 'EUR',
                className: 'bg-green-100 !text-green-800',
              };
            case 'USD':
              return {
                label: 'USD',
                className: 'bg-blue-100 !text-blue-800',
              };
            default:
              return {
                label: status,
                className: 'bg-gray-100 !text-gray-800',
              };
          }
        };
        const config = getStatusConfig(status);
        return (
          <p
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full !text-xs font-medium ${config.className}`}
          >
            {config.label}
          </p>
        );
      },
    },
    {
      key: 'project',
      label: 'Projet',
      render: (value: Project) => (
        <p className="!text-zinc-300">
          {value && typeof value === 'object' ? value.title : value || 'N/A'}
        </p>
      ),
    },
    {
      key: 'client_id',
      label: 'Client',
      render: (value: Client) => (
        <p className="!text-zinc-300">
          {value && typeof value === 'object' ? value.name : value || 'N/A'}
        </p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: string, row: Facture) => (
        <TableActions
          onEdit={() => {
            router.push(
              `/dashboard/factures/${row.documentId}?edit=1&name=${row.reference}`
            );
          }}
          onDelete={() => {
            console.log('Delete facture:', (row as Facture).id);
            showGlobalPopup('Facture supprimée avec succès', 'success');
          }}
        />
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardPageTemplate<Facture>
        title={t('invoices')}
        onRowClick={row => router.push(`/dashboard/factures/${row.documentId}`)}
        actionButtonLabel={t('create_facture')}
        onActionButtonClick={() => {
          router.push(`/dashboard/factures/${t('add')}`);
        }}
        stats={[
          {
            label: t('total_invoices'),
            value: factures.length,
            colorClass: '!text-green-400',
            icon: <IconUsers className="w-6 h-6 !text-green-400" />,
          },
          {
            label: t('active_factures'),
            value: factures.filter(facture => facture.facture_status === 'paid')
              .length,
            colorClass: '!text-blue-400',
            icon: <IconUserCheck className="w-6 h-6 !text-blue-400" />,
          },
          {
            label: t('new_factures_this_month'),
            value: factures.filter(facture => {
              const created = new Date(facture.createdAt);
              const now = new Date();
              return (
                created.getMonth() === now.getMonth() &&
                created.getFullYear() === now.getFullYear()
              );
            }).length,
            colorClass: '!text-purple-400',
            icon: <IconUserPlus className="w-6 h-6 !text-purple-400" />,
          },
        ]}
        loading={loading}
        filterOptions={statusOptions}
        searchPlaceholder={t('search_placeholder_factures')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        columns={columns as unknown as Column<Facture>[]}
        data={filteredFactures}
        emptyMessage={t('no_facture_found')}
      />
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            key="create-invoice-form"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="w-full bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 rounded-lg mb-8"
          >
            <form
              ref={formRef}
              className="flex flex-row flex-wrap gap-4 p-6 min-w-[320px] w-full"
              onSubmit={e => handleCreateInvoice(e)}
            >
              <div className="flex flex-col gap-1 w-full flex-1">
                <label
                  htmlFor="reference"
                  className="text-zinc-300 font-medium"
                >
                  {t('reference')}
                </label>
                <input
                  id="reference"
                  name="reference"
                  placeholder={t('reference')}
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label htmlFor="number" className="text-zinc-300 font-medium">
                  {t('amount')}
                </label>
                <input
                  id="number"
                  name="number"
                  type="number"
                  step="0.01"
                  placeholder={t('amount')}
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label htmlFor="date" className="text-zinc-300 font-medium">
                  {t('date')}
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label htmlFor="due_date" className="text-zinc-300 font-medium">
                  {t('due_date')}
                </label>
                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 !text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label
                  htmlFor="facture_status"
                  className="text-zinc-300 font-medium"
                >
                  {t('status')}
                </label>
                <select
                  id="facture_status"
                  name="facture_status"
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                >
                  <option value="paid">{t('paid')}</option>
                  <option value="pending">{t('pending')}</option>
                  <option value="draft">{t('draft')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label htmlFor="currency" className="text-zinc-300 font-medium">
                  {t('currency')}
                </label>
                <select
                  id="currency"
                  name="currency"
                  required
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label
                  htmlFor="description"
                  className="text-zinc-300 font-medium"
                >
                  {t('description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label htmlFor="notes" className="text-zinc-300 font-medium">
                  {t('note')}
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label
                  htmlFor="project_id"
                  className="text-zinc-300 font-medium"
                >
                  {t('project')}
                </label>
                <select
                  id="project_id"
                  name="project_id"
                  className="px-3 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                >
                  <option value="">{t('no_project')}</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <label htmlFor="pdf" className="text-zinc-300 font-medium">
                  PDF
                </label>
                <input
                  id="pdf"
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  className="px-3 cursor-pointer hover:bg-zinc-900 py-2 rounded border border-zinc-700 bg-zinc-900/50 text-zinc-100"
                  required
                />
              </div>
              <div className="flex justify-center gap-2 mt-4 w-full flex-1 flex-row">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
