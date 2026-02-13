'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconLoader2,
  IconX,
  IconSparkles,
  IconFileInvoice,
  IconUser,
  IconAlertCircle,
  IconCheck,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import type { Client, InvoiceLine } from '@/types';
import { useClients } from '@/hooks/useApi';

interface AIInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'invoice' | 'quote';
  onGenerated: (data: GeneratedInvoiceData) => void;
  existingClient?: Client;
  existingProjectTitle?: string;
}

interface GeneratedInvoiceData {
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
}

interface AIResponse {
  client?: {
    name: string;
    enterprise?: string;
    email?: string;
  };
  project?: {
    title: string;
    description?: string;
  };
  lines: {
    description: string;
    quantity: number;
    unit_price: number;
    unit?: string;
  }[];
  notes?: string;
  tva_applicable: boolean;
  tva_rate: number;
  currency: string;
  due_days: number;
  confidence: number;
  reasoning?: string;
}

export default function AIInvoiceGenerator({
  isOpen,
  onClose,
  documentType,
  onGenerated,
  existingClient,
  existingProjectTitle,
}: AIInvoiceGeneratorProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: clientsData } = useClients(user?.id);
  const clients = (clientsData as Client[]) || [];

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<AIResponse | null>(null);
  const [editedLines, setEditedLines] = useState<AIResponse['lines']>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setError(null);
      setGeneratedData(null);
      setEditedLines([]);
      setStep('input');
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(t('ai_quote_prompt_required') || 'Veuillez décrire le projet ou la prestation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/quote-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          documentType,
          existingClient: existingClient ? {
            name: existingClient.name,
            enterprise: existingClient.enterprise,
            email: existingClient.email,
          } : undefined,
          existingProjectTitle,
          clients: clients.map(c => ({
            id: c.id,
            documentId: c.documentId,
            name: c.name,
            enterprise: c.enterprise,
            email: c.email,
          })),
          userContext: {
            defaultTvaRate: 20, // TODO: get from user preferences
            defaultCurrency: 'EUR',
            defaultPaymentDays: 30,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('ai_generation_error'));
      }

      const data: AIResponse = await response.json();
      setGeneratedData(data);
      setEditedLines(data.lines);
      setStep('review');
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : t('ai_generation_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!generatedData) return;

    // Try to match client from the list
    let matchedClient: Client | undefined;
    if (generatedData.client?.name) {
      matchedClient = clients.find(c => 
        c.name.toLowerCase().includes(generatedData.client!.name.toLowerCase()) ||
        c.enterprise?.toLowerCase().includes(generatedData.client!.enterprise?.toLowerCase() || '')
      );
    }

    // Calculate total
    const total = editedLines.reduce((sum, line) => 
      sum + (line.quantity * line.unit_price), 0
    );

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (generatedData.due_days || 30));

    const result: GeneratedInvoiceData = {
      clientName: generatedData.client?.name,
      clientEnterprise: generatedData.client?.enterprise,
      clientEmail: generatedData.client?.email,
      matchedClientId: matchedClient?.id,
      matchedClientDocumentId: matchedClient?.documentId,
      projectTitle: generatedData.project?.title,
      projectDescription: generatedData.project?.description,
      lines: editedLines.map((line, index) => {
        // Mapper l'unité libre vers BillingUnit
        const mapUnit = (unit?: string): 'hour' | 'day' | 'fixed' | 'unit' | 'project' => {
          if (!unit) return 'unit';
          const lower = unit.toLowerCase();
          if (lower.includes('heure') || lower.includes('hour') || lower === 'h') return 'hour';
          if (lower.includes('jour') || lower.includes('day') || lower === 'j') return 'day';
          if (lower.includes('forfait') || lower.includes('fixed')) return 'fixed';
          if (lower.includes('projet') || lower.includes('project')) return 'project';
          return 'unit';
        };
        return {
          id: Date.now() + index,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.quantity * line.unit_price,
          unit: mapUnit(line.unit),
        };
      }),
      notes: generatedData.notes,
      totalEstimate: total,
      suggestedDueDate: dueDate.toISOString().split('T')[0],
      tvaApplicable: generatedData.tva_applicable,
      tvaRate: generatedData.tva_rate,
      currency: generatedData.currency,
      confidence: generatedData.confidence,
    };

    onGenerated(result);
    onClose();
  };

  const updateLine = (index: number, field: keyof AIResponse['lines'][0], value: string | number) => {
    setEditedLines(prev => prev.map((line, i) => 
      i === index ? { ...line, [field]: value } : line
    ));
  };

  const addLine = () => {
    setEditedLines(prev => [...prev, {
      description: '',
      quantity: 1,
      unit_price: 0,
      unit: 'unité',
    }]);
  };

  const removeLine = (index: number) => {
    setEditedLines(prev => prev.filter((_, i) => i !== index));
  };

  const totalHT = editedLines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  const totalTVA = generatedData?.tva_applicable ? totalHT * (generatedData.tva_rate / 100) : 0;
  const totalTTC = totalHT + totalTVA;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overscroll-contain"
        onClick={onClose}
        onWheel={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-page  shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col overscroll-contain"
          onClick={e => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted ">
                <Image 
                  src="/images/logo/eclipse-logo.png" 
                  alt="Eclipse Assistant" 
                  width={24} 
                  height={24}
                  className="w-6 h-6"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold !text-primary">
                  Eclipse Assistant
                </h2>
                <p className="text-sm !text-muted">
                  {documentType === 'quote' 
                    ? (t('ai_quote_description') || 'Génération de devis intelligente')
                    : (t('ai_invoice_description') || 'Génération de facture intelligente')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover  transition-colors"
            >
              <IconX className="w-5 h-5 !text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 'input' && (
              <div className="space-y-4">
                {/* Prompt input */}
                <div>
                  <label className="block !text-sm font-medium !text-primary mb-2">
                    {t('ai_describe_project') || 'Décrivez le projet ou la prestation'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={
                      documentType === 'quote'
                        ? (t('ai_quote_placeholder') || 'Ex: Site vitrine pour un restaurant avec 5 pages, formulaire de réservation, intégration Google Maps...')
                        : (t('ai_invoice_placeholder') || 'Ex: Développement d\'une application mobile de livraison avec backend API...')
                    }
                    className="w-full h-40 p-4 bg-muted border border-default  resize-none focus:ring-1 focus:ring-accent focus:border-transparent"
                  />
                </div>

                {/* Context info */}
                {(existingClient || existingProjectTitle) && (
                  <div className="p-4 bg-info-light  space-y-2">
                    <p className="text-sm font-medium !text-info flex items-center gap-2">
                      <IconSparkles className="w-4 h-4" />
                      {t('ai_context_info') || 'Contexte détecté'}
                    </p>
                    {existingClient && (
                      <p className="text-sm !text-info-light flex items-center gap-2">
                        <IconUser className="w-4 h-4" />
                        {existingClient.name} {existingClient.enterprise && `(${existingClient.enterprise})`}
                      </p>
                    )}
                    {existingProjectTitle && (
                      <p className="text-sm !text-info-light flex items-center gap-2">
                        <IconFileInvoice className="w-4 h-4" />
                        {existingProjectTitle}
                      </p>
                    )}
                  </div>
                )}

                {/* Examples */}
                <div className="space-y-2">
                  <p className="!text-xs !text-muted font-medium uppercase tracking-wider">
                    {t('ai_examples') || 'Exemples de prompts'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Site e-commerce Shopify avec 50 produits',
                      'Application mobile React Native',
                      'Refonte complète d\'un site WordPress',
                      'Audit SEO et optimisation performance',
                      'Maintenance mensuelle (10h)',
                    ].map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(example)}
                        className="px-3 py-1.5 !text-xs bg-muted !text-secondary  hover:bg-accent-light hover:!text-accent transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-danger-light  flex items-center gap-3">
                    <IconAlertCircle className="w-5 h-5 !text-danger flex-shrink-0" />
                    <p className="text-sm !text-danger">{error}</p>
                  </div>
                )}
              </div>
            )}

            {step === 'review' && generatedData && (
              <div className="space-y-6">
                {/* Confidence indicator */}
                <div className="flex items-center gap-3 p-4 bg-muted ">
                  <div className={`p-2  ${
                    generatedData.confidence >= 0.8 ? 'bg-success-light' :
                    generatedData.confidence >= 0.5 ? 'bg-warning-light' : 'bg-danger-light'
                  }`}>
                    <Image 
                      src="/images/logo/eclipse-logo.png" 
                      alt="Eclipse Assistant" 
                      width={20} 
                      height={20}
                      className="w-5 h-5"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium !text-primary">
                      {t('ai_confidence') || 'Confiance IA'}: {Math.round(generatedData.confidence * 100)}%
                    </p>
                    {generatedData.reasoning && (
                      <p className="!text-xs !text-muted">{generatedData.reasoning}</p>
                    )}
                  </div>
                </div>

                {/* Client & Project info */}
                {(generatedData.client || generatedData.project) && (
                  <div className="grid grid-cols-2 gap-4">
                    {generatedData.client && (
                      <div className="p-4 bg-muted ">
                        <p className="!text-xs !text-muted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                          <IconUser className="w-3.5 h-3.5" />
                          {t('client') || 'Client'}
                        </p>
                        <p className="text-sm font-medium !text-primary">{generatedData.client.name}</p>
                        {generatedData.client.enterprise && (
                          <p className="!text-xs !text-secondary">{generatedData.client.enterprise}</p>
                        )}
                      </div>
                    )}
                    {generatedData.project && (
                      <div className="p-4 bg-muted ">
                        <p className="!text-xs !text-muted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                          <IconFileInvoice className="w-3.5 h-3.5" />
                          {t('project') || 'Projet'}
                        </p>
                        <p className="text-sm font-medium !text-primary">{generatedData.project.title}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Invoice lines */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium !text-primary">
                      {t('invoice_lines') || 'Lignes de facturation'}
                    </p>
                    <button
                      onClick={addLine}
                      className="flex items-center gap-1.5 px-3 py-1.5 !text-xs bg-accent-light !text-accent  hover:bg-accent hover:!text-white transition-colors"
                    >
                      <IconPlus className="w-3.5 h-3.5" color="white" />
                      {t('add_line') || 'Ajouter'}
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {editedLines.map((line, index) => (
                      <div key={index} className="p-4 bg-muted  space-y-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="text"
                            value={line.description}
                            onChange={e => updateLine(index, 'description', e.target.value)}
                            placeholder={t('description') || 'Description'}
                            className="flex-1 px-3 py-2 bg-input border border-input  !text-sm"
                          />
                          <button
                            onClick={() => removeLine(index)}
                            className="p-2 !text-danger hover:bg-danger-light  transition-colors"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button> 
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="!text-xs !text-muted">{t('quantity') || 'Qté'}</label>
                            <input
                              type="number"
                              value={line.quantity}
                              onChange={e => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-input border border-input  !text-sm"
                              min="0"
                              step="0.5"
                            />
                          </div>
                          <div>
                            <label className="!text-xs !text-muted">{t('unit') || 'Unité'}</label>
                            <input
                              type="text"
                              value={line.unit || 'unité'}
                              onChange={e => updateLine(index, 'unit', e.target.value)}
                              className="w-full px-3 py-2 bg-input border border-input  !text-sm"
                            />
                          </div>
                          <div>
                            <label className="!text-xs !text-muted">{t('unit_price') || 'P.U. HT'}</label>
                            <input
                              type="number"
                              value={line.unit_price}
                              onChange={e => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-input border border-input  !text-sm"
                              min="0"
                              step="10"
                            />
                          </div>
                          <div>
                            <label className="!text-xs !text-muted">{t('total') || 'Total HT'}</label>
                            <p className="px-3 py-2 bg-input  !text-sm font-medium !text-primary">
                              {(line.quantity * line.unit_price).toLocaleString('fr-FR')} €
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="p-4 bg-accent-light  space-y-2">
                  <div className="flex justify-between !text-sm">
                    <span className="text-primary">{t('total_ht') || 'Total HT'}</span>
                    <span className="font-medium !text-primary">{totalHT.toLocaleString('fr-FR')} €</span>
                  </div>
                  {generatedData.tva_applicable && (
                    <div className="flex justify-between !text-sm">
                      <span className="text-primary">TVA ({generatedData.tva_rate}%)</span>
                      <span className="font-medium !text-primary">{totalTVA.toLocaleString('fr-FR')} €</span>
                    </div>
                  )}
                  <div className="flex justify-between !text-base pt-2 border-t border-default">
                    <span className="font-medium !text-primary">{t('total_ttc') || 'Total TTC'}</span>
                    <span className="font-bold !text-accent">{totalTTC.toLocaleString('fr-FR')} €</span>
                  </div>
                </div>

                {/* Notes */}
                {generatedData.notes && (
                  <div className="p-4 bg-muted ">
                    <p className="!text-xs !text-muted font-medium uppercase tracking-wider mb-2">
                      {t('notes') || 'Notes'}
                    </p>
                    <p className="text-sm !text-secondary">{generatedData.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-default bg-muted">
            {step === 'input' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 !text-sm !text-secondary hover:!text-primary transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent !text-white  hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      {t('generating') || 'Génération...'}
                    </>
                  ) : (
                    <>
                      <IconSparkles className="w-4 h-4" />
                      {t('generate') || 'Générer'}
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('input')}
                  className="px-4 py-2 !text-sm !text-secondary hover:!text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-success !text-white  hover:bg-success-light transition-colors"
                >
                  <IconCheck className="w-4 h-4" />
                  {t('apply_to_document') || 'Appliquer au document'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
