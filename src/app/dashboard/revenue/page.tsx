'use client';
import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { fetchFacturesUser, fetchUserById } from '@/lib/api';
import { useAuth } from '../../context/AuthContext';
import DataTable, { Column } from '@/app/components/DataTable';
import {
  IconTrendingUp,
  IconReceipt,
  IconUser,
  IconFileInvoice,
  IconDownload,
  IconEye,
} from '@tabler/icons-react';
import FloatingModal from '@/app/components/FloatingModal';
import { useRouter } from 'next/navigation';
import { Facture } from '@/app/models/Models';
import { generateClientSlug } from '@/utils/slug';

export default function RevenuePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = usePreferences();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [maxCA, setMaxCA] = useState<number>(10000);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfToShow, setPdfToShow] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Récupère les factures
        const response = await fetchFacturesUser(user.id) as { data?: Facture[] };
        setFactures(response?.data || []);
        // Récupère le user pour max_ca
        const userData = await fetchUserById(user.id) as { max_ca?: number };
        setMaxCA(Number(userData?.max_ca) || 10000);
      } catch {
        setFactures([]);
        setMaxCA(10000);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  // KPIs
  const totalCA = factures
    .filter(f => f.facture_status === 'paid')
    .reduce((acc, f) => acc + (Number(f.number) || 0), 0);
  const nbFactures = factures.length;
  const avgFacture = nbFactures > 0 ? totalCA / nbFactures : 0;
  const progress = maxCA > 0 ? Math.min((totalCA / maxCA) * 100, 100) : 0;

  // Projet top CA
  const projectCA: Record<string, { title: string; ca: number }> = {};
  factures.forEach(f => {
    if (f.project?.id) {
      if (!projectCA[f.project.id])
        projectCA[f.project.id] = { title: f.project.title, ca: 0 };
      projectCA[f.project.id].ca += Number(f.number) || 0;
    }
  });

  // const topProject = Object.values(projectCA).sort((a, b) => b.ca - a.ca)[0];

  // Client top CA
  const clientCA: Record<string, { name: string; ca: number }> = {};
  factures.forEach(f => {
    if (f.client_id?.id) {
      if (!clientCA[f.client_id.id])
        clientCA[f.client_id.id] = { name: f.client_id.name, ca: 0 };
      clientCA[f.client_id.id].ca += Number(f.number) || 0;
    }
  });
  const topClient = Object.values(clientCA).sort((a, b) => b.ca - a.ca)[0];

  const columns: Column<Facture>[] = [
    {
      key: 'reference',
      label: t('reference') || 'Référence',
      render: v => <span>{v as string}</span>,
    },
    {
      key: 'number',
      label: t('amount') || 'Montant',
      render: v => <span>{formatCurrency(v as number)}</span>,
    },
    {
      key: 'facture_status',
      label: t('status') || 'Statut',
      render: v => (
        <span
          className={`${
            (v as string) === 'paid'
              ? 'text-emerald-400'
              : (v as string) === 'draft'
                ? 'text-yellow-400'
                : 'text-zinc-500'
          }`}
        >
          {v as string}
        </span>
      ),
    },
    {
      key: 'date',
      label: t('date') || 'Date',
      render: v => (
        <span>{v ? formatDate(v as string) : '-'}</span>
      ),
    },
    {
      key: 'due_date',
      label: t('due_date') || 'Échéance',
      render: v => (
        <span>{v ? formatDate(v as string) : '-'}</span>
      ),
    },
    {
      key: 'project',
      label: t('project') || 'Projet',
      render: (_v, row) => <span>{row.project?.title || '-'}</span>,
    },
    {
      key: 'client_id',
      label: t('client') || 'Client',
      render: (_v, row) => {
        const client = row.client_id;
        if (!client?.name) {
          return <span>-</span>;
        }
        return (
          <span
            className="cursor-pointer hover:underline"
            onClick={() => {
              router.push(`/dashboard/clients/${generateClientSlug(client.name)}`);
            }}
          >
            {client.name}
          </span>
        );
      },
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

  return (
    <div className="w-full mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-3xl font-bold mb-8 text-zinc-100 flex items-center gap-2">
        {t('revenue')}
      </h1>
      <div className="mb-8 flex flex-col lg:flex-row md:items-center md:gap-8 gap-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (inputRef.current) {
              const val = Number(inputRef.current.value);
              if (!isNaN(val) && val > 0) setMaxCA(val);
            }
          }}
          className="flex flex-col lg:flex-row items-center gap-4"
        >
          <label htmlFor="ca-target" className="text-zinc-200 font-semibold">
            {t('target_revenue') || 'Objectif CA'}
          </label>
          <input
            id="ca-target"
            ref={inputRef}
            type="number"
            min={1}
            step={100}
            value={maxCA}
            onChange={e => setMaxCA(Number(e.target.value))}
            className="px-3 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-100 w-32"
          />
          <button
            type="submit"
            className="px-4 py-1 rounded bg-emerald-300/20 border border-emerald-300/20 text-emerald-400 font-semibold hover:bg-emerald-300/30 hover:text-emerald-300 transition-colors"
          >
            {t('save') || 'Enregistrer'}
          </button>
        </form>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 text-sm">
              {t('progress_to_target') || "Progression vers l'objectif"}
            </span>
            <span className="text-zinc-200 text-sm font-semibold">
              {formatCurrency(totalCA)} / {formatCurrency(maxCA)}
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-emerald-300 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between">
          <h3 className="!text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
            <IconTrendingUp className="w-5 h-5 text-emerald-400" />
            {t('revenue')}
          </h3>
          <p className="!text-3xl font-bold !text-emerald-400">
            {formatCurrency(totalCA)}
          </p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between">
          <h3 className="!text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
            <IconReceipt className="w-5 h-5 text-blue-400" />
            {t('invoices')}
          </h3>
          <p className="!text-3xl font-bold !text-blue-400">{nbFactures}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between">
          <h3 className="!text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
            <IconFileInvoice className="w-5 h-5 text-purple-400" />
            {t('average_invoice')}
          </h3>
          <p className="!text-3xl font-bold !text-purple-400">
            {formatCurrency(avgFacture)}
          </p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between">
          <h3 className="!text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
            <IconUser className="w-5 h-5 text-orange-400" />
            {t('top_client')}
          </h3>
          <p className="!text-lg font-bold !text-orange-400">
            {topClient
              ? `${topClient.name} (${formatCurrency(topClient.ca)})`
              : '-'}
          </p>
        </div>
      </div>
      <div className="bg-zinc-950 border border-zinc-900 shadow-zinc-900/50 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <IconReceipt className="w-6 h-6 text-blue-400" />
          {t('invoices')}
        </h2>
        <DataTable
          columns={columns}
          data={factures}
          loading={loading}
          emptyMessage={t('no_invoice_found')}
          onRowClick={row =>
            router.push(`/dashboard/factures/${row.documentId}`)
          }
        />
      </div>
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
