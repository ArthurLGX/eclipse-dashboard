'use client';

import React, { useState, useEffect, use } from 'react';
import { 
  IconFileInvoice, 
  IconCheck, 
  IconX, 
  IconBuilding,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconCurrencyEuro,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconDownload,
  IconSignature
} from '@tabler/icons-react';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.dashboard.eclipsestudiodev.fr';

interface QuoteData {
  reference: string;
  date: string;
  valid_until: string;
  status: string;
  description: string;
  notes: string;
  terms: string;
  currency: string;
  tva_applicable: boolean;
  already_signed?: boolean;
  expired?: boolean;
  signed_at?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    unit?: string;
  }>;
  totals: {
    subtotal: number;
    tva_rate: number;
    tva_amount: number;
    total: number;
  };
  client: {
    name: string;
    company: string;
  } | null;
  provider: {
    name: string;
    email: string;
    address: string;
    phone: string;
    siret: string;
    logo?: string;
  } | null;
}

function formatCurrency(amount: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureModal, setSignatureModal] = useState<'accept' | 'reject' | null>(null);
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState<string | null>(null);
  
  // Form data
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`${strapiUrl}/api/quotes/public/${token}`);
        const data = await response.json();
        
        if (data.success) {
          setQuote(data.quote);
        } else {
          setError(data.error || 'Devis introuvable');
        }
      } catch {
        setError('Erreur lors du chargement du devis');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchQuote();
    }
  }, [token]);

  const handleSign = async (action: 'accept' | 'reject') => {
    if (action === 'accept' && !acceptTerms) {
      return;
    }

    setSigning(true);
    try {
      const response = await fetch(`${strapiUrl}/api/quotes/public/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          client_name: clientName,
          client_email: clientEmail,
          rejection_reason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSignSuccess(action === 'accept' ? 'accepted' : 'rejected');
        setSignatureModal(null);
      } else {
        setError(data.message || 'Erreur lors de la signature');
      }
    } catch {
      setError('Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <IconAlertTriangle size={64} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Devis introuvable</h1>
          <p className="text-slate-600">{error || 'Ce lien de devis est invalide ou a expiré.'}</p>
        </div>
      </div>
    );
  }

  if (signSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          {signSuccess === 'accepted' ? (
            <>
              <IconCircleCheck size={64} className="mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Devis accepté !</h1>
              <p className="text-slate-600 mb-4">
                Merci pour votre confiance. Nous avons bien enregistré votre acceptation et nous vous contacterons très prochainement.
              </p>
              <p className="text-sm text-slate-500">
                Devis n°{quote.reference}
              </p>
            </>
          ) : (
            <>
              <IconCircleX size={64} className="mx-auto text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Devis refusé</h1>
              <p className="text-slate-600 mb-4">
                Nous avons bien pris note de votre décision. N'hésitez pas à nous recontacter si vous changez d'avis.
              </p>
              <p className="text-sm text-slate-500">
                Devis n°{quote.reference}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (quote.already_signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <IconCircleCheck size={64} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Devis déjà signé</h1>
          <p className="text-slate-600 mb-4">
            Ce devis a déjà été {quote.status === 'accepted' ? 'accepté' : 'traité'}.
          </p>
          <p className="text-sm text-slate-500">
            Signé le {formatDate(quote.signed_at || '')}
          </p>
        </div>
      </div>
    );
  }

  if (quote.expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <IconAlertTriangle size={64} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Devis expiré</h1>
          <p className="text-slate-600 mb-4">
            Ce devis a expiré le {formatDate(quote.valid_until)}. Veuillez nous contacter pour obtenir un nouveau devis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconFileInvoice size={32} />
                <div>
                  <h1 className="text-2xl font-bold">Devis n°{quote.reference}</h1>
                  <p className="text-violet-200">Signature électronique</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{formatCurrency(quote.totals.total, quote.currency)}</p>
                <p className="text-violet-200 text-sm">TTC</p>
              </div>
            </div>
          </div>

          {/* Provider & Client */}
          <div className="p-6 grid md:grid-cols-2 gap-6 border-b border-slate-200">
            {quote.provider && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Émetteur</h3>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">{quote.provider.name}</p>
                  {quote.provider.address && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <IconMapPin size={14} /> {quote.provider.address}
                    </p>
                  )}
                  {quote.provider.email && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <IconMail size={14} /> {quote.provider.email}
                    </p>
                  )}
                  {quote.provider.phone && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <IconPhone size={14} /> {quote.provider.phone}
                    </p>
                  )}
                  {quote.provider.siret && (
                    <p className="text-xs text-slate-500">SIRET: {quote.provider.siret}</p>
                  )}
                </div>
              </div>
            )}
            {quote.client && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Client</h3>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">{quote.client.name}</p>
                  {quote.client.company && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <IconBuilding size={14} /> {quote.client.company}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="p-6 bg-slate-50 flex flex-wrap gap-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <IconCalendar size={18} className="text-slate-400" />
              <span className="text-sm text-slate-600">
                Date: <strong>{formatDate(quote.date)}</strong>
              </span>
            </div>
            {quote.valid_until && (
              <div className="flex items-center gap-2">
                <IconCalendar size={18} className="text-amber-500" />
                <span className="text-sm text-slate-600">
                  Valable jusqu'au: <strong>{formatDate(quote.valid_until)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {quote.description && (
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Description</h3>
              <p className="text-slate-600 whitespace-pre-wrap">{quote.description}</p>
            </div>
          )}

          {/* Lines */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Détail des prestations</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 text-sm font-semibold text-slate-600">Description</th>
                    <th className="text-center py-3 text-sm font-semibold text-slate-600 w-24">Qté</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-600 w-32">Prix unit.</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-600 w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines?.map((line, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3 text-slate-800">{line.description}</td>
                      <td className="py-3 text-center text-slate-600">
                        {line.quantity} {line.unit || ''}
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        {formatCurrency(line.unit_price, quote.currency)}
                      </td>
                      <td className="py-3 text-right font-medium text-slate-800">
                        {formatCurrency(line.total, quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total HT</span>
                  <span>{formatCurrency(quote.totals.subtotal, quote.currency)}</span>
                </div>
                {quote.tva_applicable && (
                  <div className="flex justify-between text-slate-600">
                    <span>TVA ({quote.totals.tva_rate}%)</span>
                    <span>{formatCurrency(quote.totals.tva_amount, quote.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>Total TTC</span>
                  <span>{formatCurrency(quote.totals.total, quote.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          {quote.terms && (
            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Conditions</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <IconSignature size={24} className="text-violet-600" />
            Valider votre décision
          </h3>
          <p className="text-slate-600 mb-6">
            Après avoir lu attentivement ce devis, vous pouvez l'accepter ou le refuser en cliquant sur l'un des boutons ci-dessous.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setSignatureModal('accept')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              <IconCheck size={20} />
              Accepter le devis
            </button>
            <button
              onClick={() => setSignatureModal('reject')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              <IconX size={20} />
              Refuser le devis
            </button>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {signatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSignatureModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {signatureModal === 'accept' ? 'Accepter le devis' : 'Refuser le devis'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Votre nom complet *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Votre email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="jean@example.com"
                  required
                />
              </div>

              {signatureModal === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Raison du refus (optionnel)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    rows={3}
                    placeholder="Dites-nous pourquoi..."
                  />
                </div>
              )}

              {signatureModal === 'accept' && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-600">
                    J'accepte ce devis et les conditions mentionnées. Je comprends que cette acceptation a valeur contractuelle.
                  </span>
                </label>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSignatureModal(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleSign(signatureModal)}
                  disabled={signing || !clientName || !clientEmail || (signatureModal === 'accept' && !acceptTerms)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                    signatureModal === 'accept'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {signing ? '...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

