import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconCheck,
   IconAlertTriangle,
  IconExternalLink,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import type { Client, Project, Facture } from '@/types';
import type { Contract } from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';

type NodeStatus = 'done' | 'current' | 'blocked' | 'pending';

interface WorkflowNode {
  id: string;
  title: string;
  status: NodeStatus;
  summary: string;
  date?: string | null;
  alerts?: string[];
  links?: { label: string; href: string }[];
  cta?: { label: string; href: string };
}

const formatDate = (date?: string | null) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusClasses = (status: NodeStatus) => {
  switch (status) {
    case 'done':
      return {
        badge: 'bg-success-light text-success',
        border: 'border-success',
          dot: 'bg-success',
        background: 'bg-success-light',
      };
    case 'current':
      return {
        badge: 'bg-info-light text-info',
        border: 'border-info    ',
        dot: 'bg-info',
        background: 'bg-info-light',
      };
    case 'blocked':
      return {
        badge: 'bg-danger-light text-danger',
        border: 'border-danger',
        dot: 'bg-danger',
        background: 'bg-danger-light',
      };
    default:
      return {
        badge: 'bg-muted text-secondary',
        border: 'border-default',
        dot: 'bg-muted',
        background: 'bg-muted',
      };
  }
};

export default function ClientWorkflowView({
  client,
  projects,
  factures,
  contracts,
}: {
  client: Client;
  projects: Project[];
  factures: Facture[];
  contracts: Contract[];
}) {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);

  const nodes = useMemo<WorkflowNode[]>(() => {
    const quotes = factures.filter(f => f.document_type === 'quote');
    const invoices = factures.filter(f => f.document_type === 'invoice');

    const acceptedQuotes = quotes.filter(q => q.quote_status === 'accepted');
    const rejectedQuotes = quotes.filter(q => q.quote_status === 'rejected' || q.quote_status === 'expired');

    const signedContracts = contracts.filter(c => c.status === 'signed');
    const pendingContracts = contracts.filter(c => c.status === 'pending_client' || c.status === 'pending_provider');

    const inProgressProjects = projects.filter(p => p.project_status === 'in_progress');
    const completedProjects = projects.filter(p => p.project_status === 'completed');
    const plannedProjects = projects.filter(p => p.project_status === 'planning');

    const sentInvoices = invoices.filter(i => i.facture_status === 'sent');
    const paidInvoices = invoices.filter(i => i.facture_status === 'paid');
    const overdueInvoices = invoices.filter(i => i.facture_status === 'overdue');

    const nodeBase: Omit<WorkflowNode, 'status'>[] = [
      {
        id: 'contact',
        title: t('workflow_step_contact') || 'Contact créé',
        summary: t('workflow_contact_summary') || 'Le contact est bien enregistré.',
        date: client.createdAt,
        links: [{ label: t('open_contact') || 'Voir la fiche', href: `/dashboard/clients/${client.documentId}` }],
      },
      {
        id: 'quote',
        title: t('workflow_step_quote') || 'Devis généré',
        summary: quotes.length > 0
          ? `${quotes.length} ${t('quotes') || 'devis'}`
          : t('workflow_quote_empty') || 'Aucun devis généré',
        date: quotes[0]?.date || quotes[0]?.createdAt || null,
        links: [{ label: t('open_quotes') || 'Voir les devis', href: '/dashboard/factures' }],
        cta: quotes.length === 0
          ? { label: t('cta_create_quote') || 'Créer un devis', href: '/dashboard/factures' }
          : undefined,
      },
      {
        id: 'quote_accepted',
        title: t('workflow_step_quote_accepted') || 'Devis accepté',
        summary: acceptedQuotes.length > 0
          ? `${acceptedQuotes.length} ${t('quotes_accepted') || 'accepté(s)'}`
          : t('workflow_quote_not_accepted') || 'En attente d’acceptation',
        date: acceptedQuotes[0]?.signed_at || acceptedQuotes[0]?.updatedAt || null,
        alerts: rejectedQuotes.length > 0
          ? [t('workflow_quote_rejected') || 'Devis rejeté/expiré détecté']
          : [],
        links: [{ label: t('open_quotes') || 'Voir les devis', href: '/dashboard/factures' }],
        cta: acceptedQuotes.length === 0
          ? { label: t('cta_follow_quote') || 'Relancer le devis', href: '/dashboard/factures' }
          : undefined,
      },
      {
        id: 'contract',
        title: t('workflow_step_contract') || 'Contrat signé',
        summary: signedContracts.length > 0
          ? `${signedContracts.length} ${t('contracts_signed') || 'signé(s)'}`
          : t('workflow_contract_missing') || 'Contrat en attente',
        date: signedContracts[0]?.client_signed_at || signedContracts[0]?.updatedAt || null,
        alerts: pendingContracts.length > 0
          ? [t('workflow_contract_pending') || 'Signature en attente']
          : [],
        links: [{ label: t('open_contracts') || 'Voir les contrats', href: '/dashboard/contracts' }],
        cta: signedContracts.length === 0
          ? { label: t('cta_create_contract') || 'Créer un contrat', href: '/dashboard/contracts' }
          : undefined,
      },
      {
        id: 'project',
        title: t('workflow_step_project') || 'Projet en cours',
        summary: inProgressProjects.length > 0
          ? `${inProgressProjects.length} ${t('projects_in_progress') || 'en cours'}`
          : completedProjects.length > 0
            ? `${completedProjects.length} ${t('projects_completed') || 'terminé(s)'}`
            : plannedProjects.length > 0
              ? `${plannedProjects.length} ${t('projects_planned') || 'planifié(s)'}`
              : t('workflow_project_missing') || 'Aucun projet associé',
        date: inProgressProjects[0]?.start_date || plannedProjects[0]?.start_date || null,
        links: [{ label: t('open_projects') || 'Voir les projets', href: '/dashboard/projects' }],
        cta: projects.length === 0
          ? { label: t('cta_create_project') || 'Créer un projet', href: '/dashboard/projects' }
          : undefined,
      },
      {
        id: 'invoice',
        title: t('workflow_step_invoice') || 'Facture envoyée',
        summary: invoices.length > 0
          ? `${sentInvoices.length + paidInvoices.length + overdueInvoices.length} ${t('invoices_sent') || 'envoyée(s)'}`
          : t('workflow_invoice_missing') || 'Aucune facture envoyée',
        date: invoices[0]?.date || invoices[0]?.createdAt || null,
        alerts: overdueInvoices.length > 0
          ? [t('workflow_invoice_overdue') || 'Facture(s) en retard']
          : [],
        links: [{ label: t('open_invoices') || 'Voir les factures', href: '/dashboard/factures' }],
        cta: invoices.length === 0
          ? { label: t('cta_create_invoice') || 'Créer une facture', href: '/dashboard/factures' }
          : undefined,
      },
      {
        id: 'payment',
        title: t('workflow_step_payment') || 'Paiement reçu',
        summary: paidInvoices.length > 0
          ? `${paidInvoices.length} ${t('payments_received') || 'paiement(s) reçu(s)'}`
          : t('workflow_payment_missing') || 'Aucun paiement reçu',
        date: paidInvoices[0]?.updatedAt || null,
        alerts: overdueInvoices.length > 0
          ? [t('workflow_payment_blocked') || 'Paiement en retard']
          : [],
        links: [{ label: t('open_invoices') || 'Voir les factures', href: '/dashboard/factures' }],
        cta: overdueInvoices.length > 0
          ? { label: t('cta_follow_payment') || 'Relancer paiement', href: '/dashboard/factures' }
          : undefined,
      },
    ];

    const statuses: NodeStatus[] = [];
    let previousDone = true;
    nodeBase.forEach((node) => {
      const isDone = node.id === 'contact'
        ? true
        : node.id === 'quote'
          ? quotes.length > 0
          : node.id === 'quote_accepted'
            ? acceptedQuotes.length > 0
            : node.id === 'contract'
              ? signedContracts.length > 0
              : node.id === 'project'
                ? projects.length > 0 && (inProgressProjects.length > 0 || completedProjects.length > 0)
                : node.id === 'invoice'
                  ? invoices.length > 0 && (sentInvoices.length > 0 || paidInvoices.length > 0 || overdueInvoices.length > 0)
                  : paidInvoices.length > 0;

      const isBlocked = node.id === 'quote_accepted' ? rejectedQuotes.length > 0 && acceptedQuotes.length === 0
        : node.id === 'contract' ? pendingContracts.length > 0 && signedContracts.length === 0
        : node.id === 'payment' ? overdueInvoices.length > 0
        : node.id === 'invoice' ? overdueInvoices.length > 0
        : false;

      let status: NodeStatus = 'pending';
      if (isBlocked) status = 'blocked';
      else if (isDone) status = 'done';
      else if (previousDone) status = 'current';

      statuses.push(status);
      if (!isDone) previousDone = false;
    });

    return nodeBase.map((node, index) => ({
      ...node,
      status: statuses[index],
    }));
  }, [client, projects, factures, contracts, t]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            {t('workflow_title') || 'Workflow Client'}
          </h2>
          <p className="text-sm text-muted">
            {t('workflow_description') || 'Vision chronologique de l’état réel du client'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10))}
            className="p-2 rounded-lg border border-default hover:bg-hover"
            title={t('zoom_out') || 'Zoom arrière'}
          >
            <IconZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(1.4, Math.round((prev + 0.1) * 10) / 10))}
            className="p-2 rounded-lg border border-default hover:bg-hover"
            title={t('zoom_in') || 'Zoom avant'}
          >
            <IconZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-default rounded-xl p-4 overflow-x-auto">
        <div
          className="flex items-start gap-6 min-w-max py-2"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'left top' }}
        >
          {nodes.map((node, index) => {
            const status = getStatusClasses(node.status);
            return (
              <div key={node.id} className="relative flex items-start gap-6">
                <div className={`w-80 bg-card border rounded-2xl p-4 shadow-sm ${status.border} ${status.background}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.badge}`}>
                      {node.status === 'done'
                        ? (t('workflow_done') || 'Terminé')
                        : node.status === 'current'
                          ? (t('workflow_current') || 'En cours')
                          : node.status === 'blocked'
                            ? (t('workflow_blocked') || 'Bloqué')
                            : (t('workflow_pending') || 'À faire')
                      }
                    </span>
                    {node.date && (
                      <span className="text-xs text-muted ml-auto">{formatDate(node.date)}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-primary mb-1">{node.title}</h3>
                  <p className="text-sm text-secondary mb-3">{node.summary}</p>

                  {node.alerts && node.alerts.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {node.alerts.map((alert, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-danger">
                          <IconAlertTriangle className="w-4 h-4" />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {node.links && node.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {node.links.map(link => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex items-center gap-1 text-xs !text-accent hover:underline"
                        >
                          <IconExternalLink className="w-3 h-3" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {node.cta && (
                    <Link
                      href={node.cta.href}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-90 transition"
                    >
                      <IconCheck className="w-3.5 h-3.5" />
                      {node.cta.label}
                    </Link>
                  )}
                </div>

                {index < nodes.length - 1 && (
                  <div className="flex items-center h-full mt-8">
                    <div className="w-10 h-0.5 bg-muted" />
                    <div className="w-2 h-2 rounded-full bg-muted" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

