'use client';

import React from 'react';
import Image from 'next/image';
import { Company, Facture, InvoiceLine } from '../models/Models';

function getLogoUrl(company: Company | null, userProfileUrl?: string | null): string | null {
  if (company?.logo) {
    return company.logo.startsWith('http') ? company.logo : `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${company.logo}`;
  }
  if (userProfileUrl) {
    return userProfileUrl.startsWith('http') ? userProfileUrl : `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${userProfileUrl}`;
  }
  return null;
}

function getInitials(company: Company | null): string {
  if (!company?.name) return '?';
  const parts = company.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return company.name.slice(0, 2).toUpperCase();
}

export default function FactureApercu({
  facture,
  company,
  invoiceLines,
  tvaApplicable,
  tvaRate,
  tvaAmount,
  subtotal,
  total,
  t,
  userProfilePictureUrl,
}: {
  facture: Facture;
  company: Company;
  invoiceLines: InvoiceLine[];
  tvaApplicable: boolean;
  tvaRate: number;
  tvaAmount: number;
  subtotal: number;
  total: number;
  t: (key: string) => string;
  userProfilePictureUrl?: string | null;
}) {
  const isQuote = facture.document_type === 'quote';
  const docLabel = isQuote ? (t('quote') || 'Devis') : (t('invoice') || 'Facture');
  const status = isQuote ? (facture.quote_status || 'draft') : (facture.facture_status || 'draft');
  const logoUrl = getLogoUrl(company, userProfilePictureUrl);
  const initials = getInitials(company);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: facture.currency || 'EUR',
    }).format(amount);
  };

  const getUnitDisplay = (unit?: string) => {
    switch (unit) {
      case 'hour': return 'Heure';
      case 'day': return 'Jour';
      case 'fixed': return 'Forfait';
      case 'unit': return 'Unité';
      default: return 'Heure';
    }
  };

  const formatQuantity = (line: InvoiceLine) => {
    if (line.unit === 'fixed') return `${line.quantity}`;
    const suffix = line.unit === 'hour' ? 'h' : line.unit === 'day' ? 'j' : line.unit === 'unit' ? 'u' : 'h';
    return `${line.quantity} ${suffix}`;
  };

  const statusConfig =
    status === 'paid' || status === 'accepted'
      ? { bg: 'bg-[#e6f4ee]', color: 'text-[#166534]', border: 'border-[#bbf7d0]', dot: 'bg-[#16a34a]' }
      : status === 'sent'
        ? { bg: 'bg-[#fef9c3]', color: 'text-[#854d0e]', border: 'border-[#fde68a]', dot: 'bg-[#ca8a04]' }
        : { bg: 'bg-[var(--fd-pale)]', color: 'text-[var(--fd-ink3)]', border: 'border-cell-facture', dot: 'bg-[var(--fd-ink3)]' };

  return (
    <div className="facture-doc w-full max-w-[794px] mx-auto shadow-lg rounded-none overflow-hidden">
      {/* Barre accent - facture-pdf.html */}
      <div className="fd-accent-bar" />

      {/* Doc header - brand-block + invoice-id-block */}
      <div className="flex items-start justify-between py-9 px-12 pb-8 border-b border-cell-facture gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <div className="fd-brand-logo-mark flex-shrink-0 overflow-hidden">
                <Image
                  src={logoUrl}
                  alt={company?.name || 'Logo'}
                  width={38}
                  height={38}
                  className="w-full h-full object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="fd-brand-logo-mark flex-shrink-0 font-bold text-sm">
                {initials}
              </div>
            )}
            <div>
              <div className="text-[15px] font-bold tracking-tight leading-tight" style={{ color: 'var(--fd-ink)' }}>
                {company?.name || t('company') || 'Entreprise'}
              </div>
              {company?.domaine && (
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--fd-ink3)' }}>{company.domaine}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {company?.email && (
              <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--fd-ink2)' }}>
                <span>✉</span> {company.email}
              </div>
            )}
            {company?.website && (
              <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--fd-ink2)' }}>
                <span>🌐</span> {company.website}
              </div>
            )}
            {company?.phoneNumber && (
              <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--fd-ink2)' }}>
                <span>📞</span> {company.phoneNumber}
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--fd-ink3)' }}>
            {docLabel}
          </div>
          <div className="fd-inv-num" style={{ color: 'var(--fd-ink)' }}>
            #{facture.reference || '-'}
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {t(status) || status}
          </span>
        </div>
      </div>

      {/* Meta grid - 4 colonnes facture-pdf.html */}
      <div className="grid grid-cols-4 border-b border-cell-facture">
        <div className="py-4 px-6 !pl-12 border-r border-cell-facture">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--fd-ink3)' }}>
            {t('reference') || 'Référence'}
          </div>
          <div className="font-mono text-[13px] font-medium" style={{ color: 'var(--fd-ink)' }}>{facture.reference || '-'}</div>
        </div>
        <div className="py-4 px-6 border-r border-cell-facture">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--fd-ink3)' }}>
            {t('emission_date') || 'Date d\'émission'}
          </div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--fd-ink)' }}>
            {facture.date ? formatDate(facture.date) : '-'}
          </div>
        </div>
        <div className="py-4 px-6 border-r border-cell-facture">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--fd-ink3)' }}>
            {isQuote ? (t('valid_until') || 'Valide jusqu\'au') : (t('due_date') || 'Date d\'échéance')}
          </div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--fd-ink)' }}>
            {(isQuote ? facture.valid_until : facture.due_date) ? formatDate((isQuote ? facture.valid_until : facture.due_date) || '') : '-'}
          </div>
        </div>
        <div className="py-4 px-6 !pl-6">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--fd-ink3)' }}>
            {t('currency') || 'Devise'}
          </div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--fd-ink)' }}>
            {facture.currency || 'EUR'} — {facture.currency === 'EUR' ? 'Euro' : facture.currency}
          </div>
        </div>
      </div>

      {/* Parties Émetteur / Destinataire - facture-pdf.html */}
      <div className="grid grid-cols-2 border-b border-cell-facture" style={{ background: 'var(--fd-pale)' }}>
        <div className="py-5 px-12 border-r border-cell-facture">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'var(--fd-ink3)' }}>
            {t('emitter') || 'Émetteur'}
          </div>
          <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--fd-ink)' }}>{company?.name}</div>
          <div className="text-[12px] leading-relaxed" style={{ color: 'var(--fd-ink2)' }}>
            {company?.email && <>{company.email}<br /></>}
            {company?.siret && <>SIRET : {company.siret}<br /></>}
            {company?.siren && <>SIREN : {company.siren}<br /></>}
            {company?.location && <>{company.location}</>}
          </div>
        </div>
        <div className="py-5 px-12">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'var(--fd-ink3)' }}>
            {t('recipient') || 'Destinataire'}
          </div>
          <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--fd-ink)' }}>
            {facture.client_id?.name || (t('client') || 'Client')}
          </div>
          <div className="text-[12px] leading-relaxed" style={{ color: 'var(--fd-ink2)' }}>
            {facture.client_id?.email && <>{facture.client_id.email}<br /></>}
            {facture.client_id?.enterprise && <>{facture.client_id.enterprise}<br /></>}
            {facture.client_id?.website && <>{facture.client_id.website}<br /></>}
            {facture.client_id?.adress && <>{facture.client_id.adress}</>}
          </div>
        </div>
      </div>

      {/* Section Prestations - facture-pdf.html */}
      <div className="flex items-center py-4 px-12 pb-3.5 border-b border-cell-facture gap-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--fd-ink3)' }}>
          {t('services') || 'Prestations'}
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--fd-bdr)' }} />
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-cell-facture" style={{ background: 'var(--fd-pale)' }}>
            <th className="text-left py-2 px-4 !pl-12 text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--fd-ink3)' }}>
              {t('description') || 'Description'}
            </th>
            <th className="text-left py-2 px-4 text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--fd-ink3)' }}>
              {t('type') || 'Type'}
            </th>
            <th className="text-right py-2 px-4 text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--fd-ink3)' }}>
              Qté
            </th>
            <th className="text-right py-2 px-4 text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--fd-ink3)' }}>
              {t('unit_price') || 'Prix unitaire'}
            </th>
            <th className="text-right py-2 px-4 !pr-12 text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--fd-ink3)' }}>
              {t('total') || 'Total HT'}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoiceLines.map((line, index) => (
            <tr key={line.id || index} className="border-b border-cell-facture last:border-b-0">
              <td className="py-3.5 px-4 !pl-12 text-[13px] align-top" style={{ color: 'var(--fd-ink)' }}>
                <div className="font-semibold">{line.description || '-'}</div>
              </td>
              <td className="py-3.5 px-4">
                <span className="fd-td-type">
                  {getUnitDisplay(line.unit)}
                </span>
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-[12.5px]" style={{ color: 'var(--fd-ink)' }}>{formatQuantity(line)}</td>
              <td className="py-3.5 px-4 text-right font-mono text-[12.5px]" style={{ color: 'var(--fd-ink)' }}>
                {line.unit === 'fixed' ? '—' : formatCurrency(line.unit_price)}
              </td>
              <td className="py-3.5 px-4 !pr-12 text-right font-semibold font-mono text-[12.5px]" style={{ color: 'var(--fd-ink)' }}>
                {line.total === 0 ? 'Offert' : formatCurrency(line.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux - facture-pdf.html */}
      <div className="flex justify-end py-6 px-12 pt-6 pb-7 border-t border-cell-facture" style={{ background: 'var(--fd-pale)' }}>
        <div className="w-[280px]">
          <div className="flex justify-between items-center py-1 text-[12.5px]" style={{ color: 'var(--fd-ink2)' }}>
            <span>{t('subtotal') || 'Sous-total HT'}</span>
            <span className="fd-tot-val text-xs">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center py-1 text-[12.5px]" style={{ color: 'var(--fd-ink2)' }}>
            <span>
              TVA ({tvaApplicable ? `${tvaRate}%` : '0%'} — {tvaApplicable ? 'applicable' : 'non applicable'})
            </span>
            <span className={`fd-tot-val text-xs ${tvaApplicable ? '' : ''}`} style={{ color: tvaApplicable ? 'var(--fd-ink2)' : 'var(--fd-ink4)' }}>
              {tvaApplicable ? formatCurrency(tvaAmount) : '—'}
            </span>
          </div>
          <div className="h-px my-3" style={{ background: 'var(--fd-bdr)' }} />
          <div className="flex justify-between items-baseline pt-2.5">
            <span className="text-[13px] font-bold" style={{ color: 'var(--fd-ink)' }}>{t('total_ttc') || 'Total TTC'}</span>
            <span className="fd-tot-final-val" style={{ color: 'var(--fd-ink)' }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes - facture-pdf.html (toujours affichées) */}
      <div className="py-5 px-12 border-t border-cell-facture">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--fd-ink3)' }}>
          {t('conditions') || 'Conditions de règlement'}
        </div>
        <div className="text-[12px] leading-relaxed italic whitespace-pre-line" style={{ color: 'var(--fd-ink2)' }}>
          {facture.notes || 'Paiement à réception de facture. En cas de retard, des pénalités de 3× le taux d\'intérêt légal seront appliquées, ainsi qu\'une indemnité forfaitaire de recouvrement de 40 €. TVA non applicable — article 293 B du CGI.'}
        </div>
      </div>

      {/* Footer - facture-pdf.html */}
      <div className="border-t-[3px] px-12 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderTopColor: 'var(--fd-accent)', background: 'var(--fd-pale)' }}>
        <div className="text-[10.5px] leading-relaxed" style={{ color: 'var(--fd-ink2)' }}>
          <strong className="font-semibold" style={{ color: 'var(--fd-ink)' }}>{company?.name}</strong><br />
          {company?.siret && <>SIRET {company.siret} · </>}
          {company?.siren && <>SIREN {company.siren}<br /></>}
          {company?.email && <>{company.email} · </>}
          {company?.phoneNumber && <>{company.phoneNumber}</>}
        </div>
        <div className="text-right text-[10.5px] leading-relaxed" style={{ color: 'var(--fd-ink3)' }}>
          {docLabel} <strong className="font-semibold" style={{ color: 'var(--fd-ink)' }}>#{facture.reference}</strong><br />
          Émise le {facture.date ? formatDate(facture.date) : '-'}<br />
          Page 1 / 1
        </div>
      </div>
    </div>
  );
}
