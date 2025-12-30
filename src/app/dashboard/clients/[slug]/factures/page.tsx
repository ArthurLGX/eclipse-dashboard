'use client';

import { useMemo } from 'react';
import DataTable, { Column } from '@/app/components/DataTable';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { IconCheck, IconDownload, IconX, IconEye, IconArrowLeft, IconPlus } from '@tabler/icons-react';
import FloatingModal from '@/app/components/FloatingModal';
import Link from 'next/link';
import { generateSlug } from '@/utils/slug';
import { useFactures, useClientBySlug } from '@/hooks/useApi';
import { useState } from 'react';
import type { Facture } from '@/types';

export default function ClientFacturesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientNameFromUrl = searchParams.get('name') || '';
  const { user } = useAuth();

  // Le slug est directement le nom du client slugifié
  const slug = params.slug as string;

  // Récupérer le client pour avoir son id numérique (pour filtrer les factures)
  const { data: clientData } = useClientBySlug(slug);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = clientData as any;
  const clientId = client?.id;
  const clientName = client?.name || clientNameFromUrl;

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfToShow, setPdfToShow] = useState<string | null>(null);

  // Hook avec cache
  const { data: allFacturesData, loading } = useFactures(user?.id);

  // Filtrer les factures côté client
  const factures = useMemo(() => {
    const allFactures = (allFacturesData as Facture[]) || [];
    if (!clientId) return [];
    // Strapi peut retourner "client" ou "client_id" selon la config
    return allFactures.filter(f => {
      const clientData = f.client || f.client_id;
      return clientData?.id === clientId;
    });
  }, [allFacturesData, clientId]);

  // Générer le slug pour une facture
  const getFactureSlug = (facture: Facture) => {
    // Strapi peut retourner "client" ou "client_id"
    const clientData = facture.client || facture.client_id;
    const clientSlug = clientData?.name || 'client';
    return generateSlug(`${facture.reference}-${clientSlug}`, facture.documentId);
  };

  const columns: Column<Facture>[] = [
    {
      key: 'reference',
      label: t('reference'),
      render: (v, row) => (
        <span
          className="text-zinc-200 font-medium cursor-pointer hover:text-emerald-400 transition-colors"
          onClick={() => router.push(`/dashboard/factures/${getFactureSlug(row)}`)}
        >
          {v as string}
        </span>
      ),
    },
    {
      key: 'number',
      label: t('amount'),
      render: v => (
        <span className="text-zinc-300">
          {(v as number)?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || '-'}
        </span>
      ),
    },
    {
      key: 'facture_status',
      label: t('status'),
      render: v => (
        <span className="flex items-center gap-2 text-zinc-400">
          {v === 'paid' ? (
            <IconCheck className="w-4 h-4 !text-emerald-400" />
          ) : v === 'sent' ? (
            <IconCheck className="w-4 h-4 !text-blue-400" />
          ) : (
            <IconX className="w-4 h-4 !text-orange-400" />
          )}
          {v === 'paid' ? t('paid') : v === 'sent' ? t('sent') : t('draft')}
        </span>
      ),
    },
    {
      key: 'date',
      label: t('date'),
      render: v => (
        <span className="text-zinc-400">
          {v ? new Date(v as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
    {
      key: 'due_date',
      label: t('due_date'),
      render: v => (
        <span className="text-zinc-400">
          {v ? new Date(v as string).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('actions') || 'Actions',
      render: (_v, row) => {
        const pdfUrl =
          row.pdf && row.pdf[0]?.url
            ? (process.env.NEXT_PUBLIC_STRAPI_URL || '') + row.pdf[0].url
            : null;

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

  const handleAddInvoice = () => {
    router.push(`/dashboard/factures/${t('add')}?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link
          href={`/dashboard/clients/${params.slug}`}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
          <span>{t('back') || 'Retour'}</span>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">{t('invoices')}</h1>
          <p className="text-zinc-400 mt-1">
            {clientName} • {factures.length} {factures.length > 1 ? 'factures' : 'facture'}
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-500/30 transition-colors"
          onClick={handleAddInvoice}
          disabled={!clientId}
        >
          <IconPlus className="w-5 h-5" />
          {t('add_invoice')}
        </button>
      </div>

      {/* Table des factures */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={factures}
          loading={loading || !client}
          emptyMessage={t('no_invoice_found')}
          onRowClick={(row) => router.push(`/dashboard/factures/${getFactureSlug(row)}`)}
        />
      </div>

      {/* Modal PDF */}
      {showPdfModal && pdfToShow && (
        <FloatingModal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)}>
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

