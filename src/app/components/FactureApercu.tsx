import React from 'react';
import { Company, Facture, InvoiceLine } from '../models/Models';

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
}) {
  return (
    <div className="p-8 bg-white rounded-lg flex flex-col gap-4">
      {/* Champs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('reference')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.reference}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('status')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {t(facture?.facture_status || '')}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('emission_date')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.date
              ? new Date(facture.date).toLocaleDateString('fr-FR')
              : ''}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('due_date')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.due_date
              ? new Date(facture.due_date).toLocaleDateString('fr-FR')
              : ''}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('currency')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.currency}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('client')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.client_id?.name}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('project')}
          </label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.project?.title}
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">{t('notes')}</label>
          <p className="!text-zinc-700 !text-sm font-semibold">
            {facture?.notes}
          </p>
        </div>
      </div>
      {/* Lignes de facture */}
      <div className="bg-zinc-50 rounded-lg overflow-hidden mb-8 border border-zinc-100">
        <div className="bg-zinc-700/20 prestation-header px-6 py-4 flex items-center justify-between">
          <h3 className="!text-xl font-semibold !text-black">
            {t('services')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-700/10">
              <tr>
                <th className="!text-left p-4 !text-zinc-800 font-bold">
                  {t('description')}
                </th>
                <th className="!text-right p-4 !text-zinc-800 font-bold">
                  {t('quantity')}
                </th>
                <th className="!text-right p-4 !text-zinc-800 font-bold">
                  {t('unit_price')}
                </th>
                <th className="!text-right p-4 !text-zinc-800 font-bold">
                  {t('total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoiceLines.map((line: InvoiceLine, index: number) => (
                <tr
                  key={line.id}
                  className={
                    index % 2 === 0 ? 'bg-zinc-300/10' : 'bg-zinc-600/10'
                  }
                >
                  <td className="p-4 !text-zinc-900">{line.description}</td>
                  <td className="p-4 !text-right !text-zinc-900">
                    {line.quantity}h
                  </td>
                  <td className="p-4 !text-right !text-zinc-900">
                    {line.unit_price}€
                  </td>
                  <td className="p-4 !text-right !text-zinc-900 font-medium">
                    {line.total}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Calculs et total */}
      <div className="bg-zinc-50 rounded-lg p-6 border border-zinc-100">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="!text-lg font-semibold !text-black">
            {t('calculations')}
          </h3>
        </div>
        <div className="flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between !text-zinc-400">
              <span>{t('subtotal')}:</span>
              <span>{subtotal}€</span>
            </div>
            {tvaApplicable && (
              <div className="flex justify-between !text-zinc-400">
                <span>
                  {t('vat_applicable')} ({tvaRate}%):
                </span>
                <span>{tvaAmount.toFixed(2)}€</span>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-3">
              <div className="flex justify-between !text-lg font-bold !text-zinc-900">
                <span>{t('total_ttc')}:</span>
                <span>{total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Pied de page */}
      <div className="mt-8 pt-6 border-t border-zinc-200 !text-center !text-zinc-600 !text-sm">
        <div className="space-y-1 !text-zinc-600">
          {company?.name && (
            <p className="font-semibold !text-zinc-800 !text-xs">
              {company.name}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4 !text-xs">
            {company?.location && (
              <span className="!text-xs">{company.location}</span>
            )}
            {company?.phoneNumber && (
              <span className="!text-xs">
                {t('phone_number')} {company.phoneNumber}
              </span>
            )}
            {company?.email && (
              <span className="!text-xs">
                {t('email')} {company.email}
              </span>
            )}
            {company?.website && (
              <span className="!text-xs">
                {t('website')} {company.website}
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 !text-xs mt-2 pt-2 border-t border-zinc-200">
            {company?.siret && (
              <span className="!text-xs">
                {t('siret')} {company.siret}
              </span>
            )}
            {company?.siren && (
              <span className="!text-xs">
                {t('siren')} {company.siren}
              </span>
            )}
            {company?.vat && (
              <span className="!text-xs">
                {t('vat')} {company.vat}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
