'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconSparkles,
  IconLoader2,
  IconAlertCircle,
  IconCheck,
  IconCurrencyEuro,
  IconClock,
  IconCalendar,
  IconReceipt,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import { useAuth } from '@/app/context/AuthContext';
import { fetchClientsUser, fetchCompanyUser } from '@/lib/api';
import { Client, Company, InvoiceLine } from '@/types';

interface AIInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'invoice' | 'quote';
  onGenerated: (data: GeneratedInvoiceResult) => void;
}

interface GeneratedInvoiceResult {
  clientName?: string;
  clientEnterprise?: string;
  clientEmail?: string;
  matchedClientId?: number;
  matchedClientDocumentId?: string;
  projectTitle?: string;
  projectDescription?: string;
  lines: InvoiceLine[];
  notes?: string;
  totalEstimate: number;
  suggestedDueDate?: string;
  tvaApplicable: boolean;
  tvaRate: number;
  currency: string;
  confidence: number;
  reasoning?: string;
}

interface UserBillingSettings {
  hourlyRate: number;
  dailyRate: number;
  defaultBillingType: 'hour' | 'day' | 'fixed' | 'unit';
  tvaApplicable: boolean;
  tvaRate: number;
  currency: string;
  defaultPaymentDays: number;
}

export default function AIInvoiceGenerator({
  isOpen,
  onClose,
  documentType,
  onGenerated,
}: AIInvoiceGeneratorProps) {
  const { t } = useLanguage();
  const { preferences } = usePreferences();
  const { user } = useAuth();

  // State
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedInvoiceResult | null>(null);
  const [step, setStep] = useState<'input' | 'settings' | 'result'>('input');

  // User settings
  const [billingSettings, setBillingSettings] = useState<UserBillingSettings>({
    hourlyRate: 0,
    dailyRate: 0,
    defaultBillingType: 'hour',
    tvaApplicable: preferences.invoice.defaultTaxRate > 0,
    tvaRate: preferences.invoice.defaultTaxRate,
    currency: preferences.format.currency,
    defaultPaymentDays: preferences.invoice.defaultPaymentDays,
  });

  // Clients list for matching
  const [clients, setClients] = useState<Client[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load clients and company settings
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const loadData = async () => {
      try {
        const [clientsRes, companyRes] = await Promise.all([
          fetchClientsUser(user.id),
          fetchCompanyUser(user.id),
        ]);

        if (clientsRes?.data) {
          setClients(clientsRes.data as Client[]);
        }

        if (companyRes?.data && companyRes.data.length > 0) {
          setCompany(companyRes.data[0] as Company);
        }

        setSettingsLoaded(true);
      } catch (err) {
        console.error('Error loading data:', err);
        setSettingsLoaded(true);
      }
    };

    loadData();
  }, [isOpen, user?.id]);

  // Check if settings are complete
  const hasCompleteSettings = billingSettings.hourlyRate > 0 || billingSettings.dailyRate > 0;

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setInputText('');
      setError(null);
      setResult(null);
      setStep('input');
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError(t('ai_invoice_error_empty_text'));
      return;
    }

    // Check if we have minimum settings
    if (!hasCompleteSettings) {
      setStep('settings');
      return;
    }

    await generateInvoice();
  };

  const generateInvoice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          documentType,
          userSettings: {
            hourlyRate: billingSettings.hourlyRate,
            dailyRate: billingSettings.dailyRate,
            defaultBillingType: billingSettings.defaultBillingType,
            tvaApplicable: billingSettings.tvaApplicable,
            tvaRate: billingSettings.tvaRate,
            currency: billingSettings.currency,
            companyName: company?.name,
            defaultPaymentDays: billingSettings.defaultPaymentDays,
          },
          existingClients: clients.map(c => ({
            id: c.id,
            documentId: c.documentId,
            name: c.name,
            enterprise: c.enterprise,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      // Transform lines to match InvoiceLine type
      const transformedData: GeneratedInvoiceResult = {
        ...data.data,
        lines: data.data.lines.map((line: { description: string; quantity: number; unit_price: number; unit: string }, idx: number) => ({
          id: Date.now() + idx,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.quantity * line.unit_price,
          unit: line.unit,
        })),
      };

      setResult(transformedData);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (result) {
      onGenerated(result);
      onClose();
    }
  };

  const documentLabel = documentType === 'quote' ? t('quote') : t('invoice');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <IconSparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    {t('ai_invoice_title')} {documentLabel}
                  </h2>
                  <p className="text-sm text-muted">
                    {t('ai_invoice_subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-hover transition-colors"
              >
                <IconX size={20} className="text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {step === 'input' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('ai_invoice_paste_text')}
                    </label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('ai_invoice_placeholder')}
                      className="w-full h-64 px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder:text-muted resize-none focus:outline-none focus:border-accent"
                    />
                    <p className="text-xs text-muted mt-2">
                      {t('ai_invoice_hint')}
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-danger-light border border-danger rounded-lg text-danger text-sm">
                      <IconAlertCircle size={18} />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {step === 'settings' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 p-4 bg-warning-light border border-warning rounded-lg">
                    <IconInfoCircle size={20} className="text-warning flex-shrink-0" />
                    <p className="text-sm text-secondary">
                      {t('ai_invoice_settings_required')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        <IconClock size={16} className="inline mr-1" />
                        {t('ai_invoice_hourly_rate')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={billingSettings.hourlyRate || ''}
                          onChange={(e) => setBillingSettings(s => ({
                            ...s,
                            hourlyRate: parseFloat(e.target.value) || 0,
                          }))}
                          placeholder="0"
                          className="w-full px-4 py-2 !pr-8 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">€/h</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        <IconCalendar size={16} className="inline mr-1" />
                        {t('ai_invoice_daily_rate')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={billingSettings.dailyRate || ''}
                          onChange={(e) => setBillingSettings(s => ({
                            ...s,
                            dailyRate: parseFloat(e.target.value) || 0,
                          }))}
                          placeholder="0"
                          className="w-full px-4 py-2 !pr-10 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">€/j</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('ai_invoice_billing_type')}
                    </label>
                    <select
                      value={billingSettings.defaultBillingType}
                      onChange={(e) => setBillingSettings(s => ({
                        ...s,
                        defaultBillingType: e.target.value as 'hour' | 'day' | 'fixed' | 'unit',
                      }))}
                      className="w-full px-4 py-2 bg-input border border-input rounded-lg text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="hour">{t('billing_hour')}</option>
                      <option value="day">{t('billing_day')}</option>
                      <option value="fixed">{t('billing_fixed')}</option>
                      <option value="unit">{t('billing_unit')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billingSettings.tvaApplicable}
                        onChange={(e) => setBillingSettings(s => ({
                          ...s,
                          tvaApplicable: e.target.checked,
                        }))}
                        className="w-4 h-4 rounded border-input bg-input text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-secondary">{t('vat_applicable')}</span>
                    </label>

                    {billingSettings.tvaApplicable && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={billingSettings.tvaRate}
                          onChange={(e) => setBillingSettings(s => ({
                            ...s,
                            tvaRate: parseFloat(e.target.value) || 0,
                          }))}
                          className="w-20 px-3 py-1 bg-input border border-input rounded-lg text-primary text-center focus:outline-none focus:border-accent"
                        />
                        <span className="text-sm text-muted">%</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-danger-light border border-danger rounded-lg text-danger text-sm">
                      <IconAlertCircle size={18} />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {step === 'result' && result && (
                <div className="space-y-6">
                  {/* Confidence indicator */}
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    result.confidence >= 70 
                      ? 'bg-success-light border border-success' 
                      : result.confidence >= 40 
                        ? 'bg-warning-light border border-warning'
                        : 'bg-danger-light border border-danger'
                  }`}>
                    <IconCheck size={18} className={
                      result.confidence >= 70 ? 'text-success' : 
                      result.confidence >= 40 ? 'text-warning' : 'text-danger'
                    } />
                    <span className="text-sm text-secondary">
                      {t('ai_invoice_confidence')}: {result.confidence}%
                    </span>
                  </div>

                  {result.reasoning && (
                    <p className="text-sm text-muted italic">
                      {result.reasoning}
                    </p>
                  )}

                  {/* Client info */}
                  {(result.clientName || result.clientEnterprise) && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium text-secondary mb-2">{t('client')}</h4>
                      <p className="text-primary font-medium">
                        {result.clientName}
                        {result.clientEnterprise && (
                          <span className="text-muted font-normal"> - {result.clientEnterprise}</span>
                        )}
                      </p>
                      {result.matchedClientId && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-success-light text-success text-xs rounded-full">
                          <IconCheck size={12} />
                          {t('ai_invoice_client_matched')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Project info */}
                  {result.projectTitle && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium text-secondary mb-2">{t('project')}</h4>
                      <p className="text-primary font-medium">{result.projectTitle}</p>
                      {result.projectDescription && (
                        <p className="text-sm text-muted mt-1">{result.projectDescription}</p>
                      )}
                    </div>
                  )}

                  {/* Lines preview */}
                  <div>
                    <h4 className="text-sm font-medium text-secondary mb-3">
                      {t('services')} ({result.lines.length})
                    </h4>
                    <div className="space-y-2">
                      {result.lines.map((line, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-input rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-primary truncate">{line.description}</p>
                            <p className="text-xs text-muted">
                              {line.quantity} × {line.unit_price}€
                            </p>
                          </div>
                          <span className="font-medium text-primary ml-4">
                            {line.total.toFixed(2)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between p-4 bg-accent-light rounded-lg">
                    <span className="font-medium text-secondary">{t('total')} HT</span>
                    <span className="text-xl font-bold text-accent">
                      <IconCurrencyEuro size={20} className="inline" />
                      {result.totalEstimate.toFixed(2)}
                    </span>
                  </div>

                  {/* Notes */}
                  {result.notes && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium text-secondary mb-2">{t('notes')}</h4>
                      <p className="text-sm text-muted">{result.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-default bg-muted">
              {step !== 'input' && (
                <button
                  onClick={() => setStep(step === 'result' ? 'input' : 'input')}
                  className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                  disabled={isLoading}
                >
                  {t('back')}
                </button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                  disabled={isLoading}
                >
                  {t('cancel')}
                </button>

                {step === 'input' && (
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !inputText.trim() || !settingsLoaded}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? (
                      <IconLoader2 size={18} className="animate-spin" />
                    ) : (
                      <IconSparkles size={18} />
                    )}
                    {t('ai_invoice_analyze')}
                  </button>
                )}

                {step === 'settings' && (
                  <button
                    onClick={generateInvoice}
                    disabled={isLoading || !hasCompleteSettings}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? (
                      <IconLoader2 size={18} className="animate-spin" />
                    ) : (
                      <IconSparkles size={18} />
                    )}
                    {t('ai_invoice_generate')}
                  </button>
                )}

                {step === 'result' && (
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-2 px-6 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
                  >
                    <IconReceipt size={18} />
                    {t('ai_invoice_use_this')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

