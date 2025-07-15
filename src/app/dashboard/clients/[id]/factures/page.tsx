'use client';

import { useEffect, useState } from 'react';
import DataTable, { Column } from '@/app/components/DataTable';
import { useLanguage } from '@/app/context/LanguageContext';
import {
  fetchFacturesUserByClientId,
  createFacture,
  fetchProjectsUser,
} from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import { useParams, useSearchParams } from 'next/navigation';
import { IconCheck, IconDownload, IconX, IconEye } from '@tabler/icons-react';
import FloatingModal from '@/app/components/FloatingModal';
import { useRef } from 'react';
import { usePopup } from '@/app/context/PopupContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Facture {
  id: string;
  documentId: string;
  reference: string;
  date: string;
  due_date: string;
  facture_status: string;
  number: number;
  currency: string;
  description: string;
  notes: string;
  project: {
    id: number;
    title: string;
  };
  pdf: {
    url: string;
  }[];
}

interface Project {
  id: number;
  title: string;
}

export default function FacturesPage() {
  const { t } = useLanguage();
  const { showGlobalPopup } = usePopup();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientName = searchParams.get('name') || '';
  const clientId = Number(params.id);
  const { user } = useAuth();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfToShow, setPdfToShow] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const response = await fetchFacturesUserByClientId(
          user.id,
          Number(clientId)
        );
        setFactures(response.data || []);
        console.log('Factures', response.data);
        const projectsResponse = await fetchProjectsUser(user.id);
        setProjects(projectsResponse.data || []);
      } catch {
        setFactures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, clientId]);

  const columns: Column<Facture>[] = [
    {
      key: 'reference',
      label: t('reference'),
      render: v => <span>{v as string}</span>,
    },
    {
      key: 'number',
      label: t('amount'),
      render: v => <span>{v as number} €</span>,
    },
    {
      key: 'facture_status',
      label: t('status'),
      render: v => (
        <span className="flex items-center gap-2 !text-zinc-400">
          {v === 'paid' ? (
            <IconCheck className="w-4 h-4 !text-emerald-400" />
          ) : (
            <IconX className="w-4 h-4 !text-red-400" />
          )}{' '}
          {v as string}
        </span>
      ),
    },

    {
      key: 'date',
      label: t('date'),
      render: v => (
        <span>{new Date(v as string).toLocaleDateString('fr-FR')}</span>
      ),
    },
    {
      key: 'due_date',
      label: t('due_date'),
      render: v => (
        <span>{new Date(v as string).toLocaleDateString('fr-FR')}</span>
      ),
    },
    {
      key: 'actions',
      label: t('actions') || 'Actions',
      render: (_v, row: Facture) => {
        const pdfUrl =
          row.pdf && row.pdf[0]?.url
            ? (process.env.NEXT_PUBLIC_STRAPI_URL || '') + row.pdf[0].url
            : null;

        console.log('pdfUrl', pdfUrl);
        return (
          <div className="flex gap-2 items-center">
            {pdfUrl && (
              <>
                <button
                  type="button"
                  title={t('view_invoice') || 'Voir la facture'}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-blue-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors text-xs font-semibold"
                  onClick={() => {
                    setPdfToShow(pdfUrl);
                    setShowPdfModal(true);
                  }}
                >
                  <IconEye className="w-4 h-4" />
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-white transition-colors text-xs font-semibold"
                  download
                >
                  <IconDownload className="w-4 h-4" />
                </a>
              </>
            )}
            {!pdfUrl && <span className="text-zinc-500 text-xs">-</span>}
          </div>
        );
      },
    },
  ];

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
      client_id: clientId,
      description: data.description as string,
      notes: data.notes as string,
      project: Number(data.project),
      user: user?.id as number,
    });
    console.log('Nouvelle facture :', response);
    showGlobalPopup(t('invoice_created'), 'success');
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row items-center justify-between my-8 gap-4">
        <h1 className="text-3xl !text-left font-bold text-zinc-100">
          {clientName} - {t('invoices')}
        </h1>
        <button
          className="bg-emerald-400/20 lg:w-auto w-full text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-500/20 hover:text-white transition-colors"
          onClick={() => setShowCreateModal(true)}
        >
          {t('add_invoice')}
        </button>
      </div>
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
      <DataTable
        columns={columns}
        data={factures}
        loading={loading}
        emptyMessage={t('no_invoice_found')}
      />
      {showPdfModal && pdfToShow && (
        <FloatingModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
        >
          <div className="w-[90vw] max-w-4xl h-[80vh] flex flex-col">
            <iframe
              src={pdfToShow}
              title={t('invoice_pdf')}
              className="flex-1 w-full h-full rounded-lg border border-zinc-800 bg-white"
            />
          </div>
        </FloatingModal>
      )}
    </div>
  );
}
