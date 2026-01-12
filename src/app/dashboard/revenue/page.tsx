'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useTheme } from '@/app/context/ThemeContext';
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
  IconChartPie,
  IconChartBar,
  IconChartLine,
} from '@tabler/icons-react';
import FloatingModal from '@/app/components/FloatingModal';
import { useRouter } from 'next/navigation';
import { Facture } from '@/app/models/Models';
import { generateClientSlug } from '@/utils/slug';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Configuration globale des fonts Chart.js
ChartJS.defaults.font.family = "'Manrope', sans-serif";

// Hook pour récupérer les couleurs du thème CSS
function useThemeColors() {
  const { resolvedMode } = useTheme();
  const [colors, setColors] = useState({
    textPrimary: '#E8E4F0',
    textSecondary: '#A89EC8',
    textMuted: '#7B6F9E',
    accent: '#7C3AED',
    success: '#34D399',
    info: '#60A5FA',
    warning: '#FBBF24',
    danger: '#F87171',
    bgCard: '#1A1428',
    borderDefault: '#2E2648',
  });

  const updateColors = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    
    setColors({
      textPrimary: styles.getPropertyValue('--text-primary').trim() || '#E8E4F0',
      textSecondary: styles.getPropertyValue('--text-secondary').trim() || '#A89EC8',
      textMuted: styles.getPropertyValue('--text-muted').trim() || '#7B6F9E',
      accent: styles.getPropertyValue('--color-accent').trim() || '#7C3AED',
      success: styles.getPropertyValue('--color-success').trim() || '#34D399',
      info: styles.getPropertyValue('--color-info').trim() || '#60A5FA',
      warning: styles.getPropertyValue('--color-warning').trim() || '#FBBF24',
      danger: styles.getPropertyValue('--color-danger').trim() || '#F87171',
      bgCard: styles.getPropertyValue('--bg-card').trim() || '#1A1428',
      borderDefault: styles.getPropertyValue('--border-default').trim() || '#2E2648',
    });
  }, []);

  useEffect(() => {
    updateColors();
  }, [resolvedMode, updateColors]);

  return colors;
}

export default function RevenuePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = usePreferences();
  const themeColors = useThemeColors();
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
        const response = await fetchFacturesUser(user.id) as { data?: Facture[] };
        setFactures(response?.data || []);
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

  // Client top CA (mémoïsé pour éviter les recalculs)
  const clientCA = useMemo(() => {
    const result: Record<string, { name: string; ca: number }> = {};
    factures.forEach(f => {
      if (f.client_id?.id) {
        if (!result[f.client_id.id])
          result[f.client_id.id] = { name: f.client_id.name, ca: 0 };
        result[f.client_id.id].ca += Number(f.number) || 0;
      }
    });
    return result;
  }, [factures]);
  const topClient = Object.values(clientCA).sort((a, b) => b.ca - a.ca)[0];

  // Données pour les graphiques
  const monthlyData = useMemo(() => {
    const months: Record<string, { revenue: number; invoices: number; paid: number }> = {};
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { revenue: 0, invoices: 0, paid: 0 };
    }
    
    factures.forEach(f => {
      if (f.date) {
        const date = new Date(f.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (months[key]) {
          months[key].invoices += 1;
          if (f.facture_status === 'paid') {
            months[key].revenue += Number(f.number) || 0;
            months[key].paid += 1;
          }
        }
      }
    });
    
    return months;
  }, [factures]);

  const monthLabels = useMemo(() => {
    return Object.keys(monthlyData).map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('fr-FR', { month: 'short' });
    });
  }, [monthlyData]);

  const revenueValues = useMemo(() => {
    return Object.values(monthlyData).map(d => d.revenue);
  }, [monthlyData]);

  const invoiceValues = useMemo(() => {
    return Object.values(monthlyData).map(d => d.invoices);
  }, [monthlyData]);

  // Données pour le camembert
  const clientChartData = useMemo(() => {
    const sortedClients = Object.values(clientCA).sort((a, b) => b.ca - a.ca).slice(0, 5);
    const others = Object.values(clientCA).slice(5).reduce((sum, c) => sum + c.ca, 0);
    
    const labels = sortedClients.map(c => c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name);
    const data = sortedClients.map(c => c.ca);
    
    if (others > 0) {
      labels.push('Autres');
      data.push(others);
    }
    
    return { labels, data };
  }, [clientCA]);

  // Options communes pour grilles légères (utilise les couleurs du thème)
  const lightGridColor = `${themeColors.borderDefault}33`; // 20% opacity
  const tickColor = themeColors.textMuted;

  const lineChartData = useMemo(() => ({
    labels: monthLabels,
    datasets: [
      {
        label: 'CA (€)',
        data: revenueValues,
        borderColor: themeColors.accent,
        backgroundColor: `${themeColors.accent}14`, // 8% opacity
        fill: true,
        tension: 0.4,
        pointBackgroundColor: themeColors.accent,
        pointBorderColor: 'transparent',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  }), [monthLabels, revenueValues, themeColors.accent]);

  const lineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: `${themeColors.bgCard}F2`, // 95% opacity
        titleColor: themeColors.textPrimary,
        bodyColor: themeColors.textSecondary,
        borderColor: themeColors.borderDefault,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        titleFont: { family: 'Manrope', size: 12 },
        bodyFont: { family: 'Manrope', size: 11 },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => `${(context.parsed?.y ?? 0).toLocaleString('fr-FR')} €`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 10 } },
        border: { display: false },
      },
      y: {
        grid: { color: lightGridColor, drawBorder: false },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value: number | string) => `${(Number(value) / 1000).toFixed(0)}k`,
          maxTicksLimit: 5,
        },
        border: { display: false },
      },
    },
  }), [themeColors, tickColor, lightGridColor]);

  const barChartData = useMemo(() => ({
    labels: monthLabels,
    datasets: [
      {
        label: 'Émises',
        data: invoiceValues,
        backgroundColor: `${themeColors.info}99`, // 60% opacity
        borderRadius: 3,
        barThickness: 8,
      },
      {
        label: 'Payées',
        data: Object.values(monthlyData).map(d => d.paid),
        backgroundColor: `${themeColors.success}99`, // 60% opacity
        borderRadius: 3,
        barThickness: 8,
      },
    ],
  }), [monthLabels, invoiceValues, monthlyData, themeColors.info, themeColors.success]);

  const barChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' as const },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: tickColor,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 12,
          font: { size: 10, family: 'Manrope' },
        },
      },
      tooltip: {
        backgroundColor: `${themeColors.bgCard}F2`,
        titleColor: themeColors.textPrimary,
        bodyColor: themeColors.textSecondary,
        borderColor: themeColors.borderDefault,
        borderWidth: 1,
        padding: 10,
        titleFont: { family: 'Manrope', size: 12 },
        bodyFont: { family: 'Manrope', size: 11 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 10 } },
        border: { display: false },
      },
      y: {
        grid: { color: lightGridColor, drawBorder: false },
        ticks: { color: tickColor, font: { size: 10 }, stepSize: 1, maxTicksLimit: 5 },
        border: { display: false },
      },
    },
  }), [themeColors, tickColor, lightGridColor]);

  const doughnutChartData = useMemo(() => ({
    labels: clientChartData.labels,
    datasets: [
      {
        data: clientChartData.data,
        backgroundColor: [
          `${themeColors.accent}CC`, // 80% opacity
          `${themeColors.info}CC`,
          `${themeColors.success}CC`,
          `${themeColors.warning}CC`,
          `${themeColors.danger}CC`,
          `${themeColors.textMuted}99`, // 60% opacity
        ],
        borderColor: 'transparent',
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }), [clientChartData, themeColors]);

  const doughnutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { animateRotate: true, animateScale: true, duration: 1200, easing: 'easeOutQuart' as const },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: tickColor,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 8,
          font: { size: 10, family: 'Manrope' },
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: `${themeColors.bgCard}F2`,
        titleColor: themeColors.textPrimary,
        bodyColor: themeColors.textSecondary,
        borderColor: themeColors.borderDefault,
        borderWidth: 1,
        padding: 10,
        titleFont: { family: 'Manrope', size: 12 },
        bodyFont: { family: 'Manrope', size: 11 },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const value = context.parsed ?? 0;
            const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
            return `${value.toLocaleString('fr-FR')} € (${pct}%)`;
          },
        },
      },
    },
    cutout: '65%',
  }), [themeColors, tickColor]);

  const columns: Column<Facture>[] = [
    {
      key: 'reference',
      label: t('reference') || 'Réf.',
      render: v => <span className="text-sm">{v as string}</span>,
    },
    {
      key: 'number',
      label: t('amount') || 'Montant',
      render: v => <span className="text-sm font-medium">{formatCurrency(v as number)}</span>,
    },
    {
      key: 'facture_status',
      label: t('status') || 'Statut',
      render: (v, row) => {
        // Déterminer le statut à afficher (facture ou devis)
        const isQuote = row.document_type === 'quote';
        const status = isQuote ? row.quote_status : (v as string);
        
        // Configuration des statuts
        const statusConfig: Record<string, { label: string; className: string }> = {
          // Statuts facture
          paid: { label: t('paid') || 'Payée', className: 'bg-success-light text-success' },
          sent: { label: t('sent') || 'Envoyée', className: 'bg-accent/10 text-accent' },
          draft: { label: t('draft') || 'Brouillon', className: 'bg-warning-light text-warning' },
          overdue: { label: t('overdue') || 'En retard', className: 'bg-danger/10 text-danger' },
          cancelled: { label: t('cancelled') || 'Annulée', className: 'bg-muted/20 text-muted' },
          // Statuts devis
          accepted: { label: t('accepted') || 'Accepté', className: 'bg-success-light text-success' },
          rejected: { label: t('rejected') || 'Refusé', className: 'bg-danger/10 text-danger' },
          negotiation: { label: t('negotiation') || 'Négociation', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
        };
        
        const config = statusConfig[status || ''] || { label: status || '-', className: 'bg-muted/20 text-muted' };
        
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'date',
      label: t('date') || 'Date',
      render: v => <span className="text-sm text-muted">{v ? formatDate(v as string) : '-'}</span>,
    },
    {
      key: 'client_id',
      label: t('client') || 'Client',
      render: (_v, row) => {
        const client = row.client_id;
        if (!client?.name) return <span className="text-sm">-</span>;
        return (
          <span
            className="text-sm cursor-pointer hover:text-accent transition-colors"
            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${generateClientSlug(client.name)}`); }}
          >
            {client.name}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (_v, row: Facture) => {
        const pdfUrl = row.pdf?.[0]?.url ? (process.env.NEXT_PUBLIC_STRAPI_URL || '') + row.pdf[0].url : null;
        return (
          <div className="flex gap-1 items-center">
            {pdfUrl && (
              <>
                <button
                  type="button"
                  className="p-1 text-info hover:bg-hover rounded transition-colors"
                  onClick={(e) => { e.stopPropagation(); setPdfToShow(pdfUrl); setShowPdfModal(true); }}
                >
                  <IconEye className="w-4 h-4" />
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-success hover:bg-hover rounded transition-colors"
                  download
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDownload className="w-4 h-4" />
                </a>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full mx-auto flex flex-col gap-4">
      {/* Header + Objectif */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary !uppercase">{t('global_revenue_stats')}</h1>
        <form
          onSubmit={e => { e.preventDefault(); if (inputRef.current) { const val = Number(inputRef.current.value); if (!isNaN(val) && val > 0) setMaxCA(val); } }}
          className="flex items-center gap-2"
        >
          <span className="text-sm text-muted">{t('target_revenue') || 'Objectif'}:</span>
          <input
            ref={inputRef}
            type="number"
            min={1}
            step={100}
            value={maxCA}
            onChange={e => setMaxCA(Number(e.target.value))}
            className="input px-2 py-1 w-24 text-sm"
          />
          <button type="submit" className="btn-primary px-3 py-1 text-sm rounded">
            {t('save') || 'OK'}
          </button>
        </form>
      </div>

      {/* Barre de progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-primary-light rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-2 bg-primary rounded-full"
          />
        </div>
        <span className="text-xs text-muted whitespace-nowrap">
          {formatCurrency(totalCA)} / {formatCurrency(maxCA)} ({progress.toFixed(0)}%)
        </span>
      </div>

      {/* KPIs - Grille compacte */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: IconTrendingUp, label: t('revenue'), value: formatCurrency(totalCA), color: 'text-success' },
          { icon: IconReceipt, label: t('invoices'), value: nbFactures.toString(), color: 'text-info' },
          { icon: IconFileInvoice, label: t('average_invoice'), value: formatCurrency(avgFacture), color: 'text-accent' },
          { icon: IconUser, label: t('top_client'), value: topClient?.name || '-', subvalue: topClient ? formatCurrency(topClient.ca) : '', color: 'text-warning' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-muted">{kpi.label}</span>
            </div>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            {kpi.subvalue && <p className="text-xs text-muted">{kpi.subvalue}</p>}
          </motion.div>
        ))}
      </div>

      {/* Graphiques - Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Courbe CA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconChartLine className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-primary">{t('revenue_evolution') || 'Évolution CA'}</span>
          </div>
          <div className="h-40">
            {!loading && <Line data={lineChartData} options={lineChartOptions} />}
          </div>
        </motion.div>

        {/* Barres factures */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconChartBar className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-primary">{t('invoices_by_month') || 'Factures/mois'}</span>
          </div>
          <div className="h-40">
            {!loading && <Bar data={barChartData} options={barChartOptions} />}
          </div>
        </motion.div>

        {/* Camembert clients */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="card p-4 md:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-2 mb-3">
            <IconChartPie className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-primary">{t('revenue_by_client') || 'CA/client'}</span>
          </div>
          <div className="h-40">
            {!loading && clientChartData.data.length > 0 ? (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted text-sm">
                {t('no_data') || 'Aucune donnée'}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Liste des factures */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <IconReceipt className="w-4 h-4 text-info" />
          <span className="text-sm font-medium text-primary">{t('invoices')}</span>
          <span className="text-xs text-muted">({factures.length})</span>
        </div>
        <DataTable
          columns={columns}
          data={factures}
          loading={loading}
          emptyMessage={t('no_invoice_found')}
          onRowClick={row => router.push(`/dashboard/factures/${row.documentId}`)}
        />
      </motion.div>

      {showPdfModal && pdfToShow && (
        <FloatingModal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)}>
          <div className="w-[90vw] max-w-4xl h-[80vh] flex flex-col">
            <iframe
              src={pdfToShow}
              title={t('invoice_pdf')}
              className="flex-1 w-full h-full rounded-lg border border-default bg-white"
            />
          </div>
        </FloatingModal>
      )}
    </div>
  );
}
