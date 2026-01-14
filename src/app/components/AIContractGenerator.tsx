'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconBrain,
  IconLoader2,
  IconX,
  IconSparkles,
  IconFileText,
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconDownload,
  IconAlertTriangle,
  IconBulb,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import type { Client, Project, Company } from '@/types';

interface AIContractGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  project?: Project;
  company?: Company | null;
  onContractGenerated?: (contract: GeneratedContract) => void;
}

type ContractType = 'service' | 'nda' | 'maintenance' | 'cgv' | 'custom';

interface ContractArticle {
  number: number;
  title: string;
  content: string;
}

interface GeneratedContract {
  title: string;
  parties: {
    provider: { name: string; details: string };
    client: { name: string; details: string };
  };
  preamble: string;
  articles: ContractArticle[];
  signatures: {
    date: string;
    location: string;
  };
  tips?: string[];
  warnings?: string[];
}

export default function AIContractGenerator({
  isOpen,
  onClose,
  client,
  project,
  company,
  onContractGenerated,
}: AIContractGeneratorProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const [contractType, setContractType] = useState<ContractType>('service');
  const [customClauses, setCustomClauses] = useState<string[]>([]);
  const [newClause, setNewClause] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [step, setStep] = useState<'config' | 'review'>('config');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContractType('service');
      setCustomClauses([]);
      setNewClause('');
      setError(null);
      setGeneratedContract(null);
      setStep('config');
    }
  }, [isOpen]);

  const contractTypes: { id: ContractType; label: string; description: string }[] = [
    { 
      id: 'service', 
      label: t('contract_service') || 'Contrat de prestation',
      description: t('contract_service_desc') || 'Pour une mission de développement spécifique'
    },
    { 
      id: 'nda', 
      label: t('contract_nda') || 'Accord de confidentialité (NDA)',
      description: t('contract_nda_desc') || 'Protection des informations sensibles'
    },
    { 
      id: 'maintenance', 
      label: t('contract_maintenance') || 'Contrat de maintenance',
      description: t('contract_maintenance_desc') || 'Maintenance récurrente d\'un site/app'
    },
    { 
      id: 'cgv', 
      label: t('contract_cgv') || 'CGV - Conditions Générales',
      description: t('contract_cgv_desc') || 'Conditions générales de vente'
    },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const userProfile = {
        name: user?.username || 'Freelance',
        company: company?.name,
        siret: company?.siret,
        address: company?.location ? `${company.location}` : undefined,
        email: user?.email,
        activity: 'Développement web et applications',
      };

      const response = await fetch('/api/ai/contract-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType,
          userProfile,
          client: client ? {
            name: client.name,
            enterprise: client.enterprise,
            email: client.email,
            address: client.adress ? `${client.adress}` : undefined,
          } : undefined,
          project: project ? {
            title: project.title,
            description: project.description,
            budget: project.budget,
            start_date: project.start_date,
            end_date: project.end_date,
          } : undefined,
          customClauses: customClauses.length > 0 ? customClauses : undefined,
          language: 'fr',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('ai_generation_error'));
      }

      const data: GeneratedContract = await response.json();
      setGeneratedContract(data);
      setStep('review');
    } catch (err) {
      console.error('AI contract generation error:', err);
      setError(err instanceof Error ? err.message : t('ai_generation_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddClause = () => {
    if (newClause.trim()) {
      setCustomClauses(prev => [...prev, newClause.trim()]);
      setNewClause('');
    }
  };

  const handleRemoveClause = (index: number) => {
    setCustomClauses(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyContract = () => {
    if (!generatedContract) return;
    
    const text = formatContractAsText(generatedContract);
    navigator.clipboard.writeText(text);
    showGlobalPopup(t('contract_copied') || 'Contrat copié dans le presse-papier', 'success');
  };

  const formatContractAsText = (contract: GeneratedContract): string => {
    let text = `${contract.title}\n\n`;
    text += `ENTRE LES SOUSSIGNÉS:\n\n`;
    text += `${contract.parties.provider.name}\n${contract.parties.provider.details}\n\n`;
    text += `ET\n\n`;
    text += `${contract.parties.client.name}\n${contract.parties.client.details}\n\n`;
    text += `PRÉAMBULE\n${contract.preamble}\n\n`;
    text += `IL A ÉTÉ CONVENU CE QUI SUIT:\n\n`;
    
    contract.articles.forEach(article => {
      text += `ARTICLE ${article.number} - ${article.title}\n`;
      text += `${article.content}\n\n`;
    });
    
    text += `\nFait à ${contract.signatures.location}, le ${contract.signatures.date}\n\n`;
    text += `Le Prestataire:\t\t\t\t\tLe Client:\n`;
    text += `(signature)\t\t\t\t\t(signature)`;
    
    return text;
  };

  const handleConfirm = () => {
    if (generatedContract && onContractGenerated) {
      onContractGenerated(generatedContract);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <IconBrain className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  {t('ai_generate_contract') || 'Générer un contrat avec l\'IA'}
                </h2>
                <p className="text-sm text-muted">
                  {t('ai_contract_description') || 'Documents juridiques personnalisés'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover rounded-lg transition-colors"
            >
              <IconX className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 'config' && (
              <div className="space-y-6">
                {/* Contract type selection */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">
                    {t('contract_type') || 'Type de contrat'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {contractTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setContractType(type.id)}
                        className={`p-4 text-left rounded-xl border-2 transition-colors ${
                          contractType === type.id
                            ? 'border-accent bg-accent/5'
                            : 'border-default hover:border-accent/50'
                        }`}
                      >
                        <p className="font-medium text-primary">{type.label}</p>
                        <p className="text-xs text-muted mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context info */}
                {(client || project) && (
                  <div className="p-4 bg-info-light rounded-xl space-y-2">
                    <p className="text-sm font-medium text-info flex items-center gap-2">
                      <IconSparkles className="w-4 h-4" />
                      {t('context_detected') || 'Contexte détecté'}
                    </p>
                    {client && (
                      <p className="text-sm text-info/80">
                        Client: {client.name} {client.enterprise && `(${client.enterprise})`}
                      </p>
                    )}
                    {project && (
                      <p className="text-sm text-info/80">
                        Projet: {project.title}
                      </p>
                    )}
                  </div>
                )}

                {/* Custom clauses */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">
                    {t('custom_clauses') || 'Clauses personnalisées (optionnel)'}
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newClause}
                      onChange={e => setNewClause(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddClause()}
                      placeholder={t('add_clause_placeholder') || 'Ex: Clause de non-concurrence sur 6 mois...'}
                      className="flex-1 px-4 py-2 bg-muted/30 border border-default rounded-lg focus:ring-2 focus:ring-accent"
                    />
                    <button
                      onClick={handleAddClause}
                      disabled={!newClause.trim()}
                      className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      {t('add') || 'Ajouter'}
                    </button>
                  </div>
                  {customClauses.length > 0 && (
                    <div className="space-y-2">
                      {customClauses.map((clause, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg"
                        >
                          <span className="flex-1 text-sm text-secondary">{clause}</span>
                          <button
                            onClick={() => handleRemoveClause(index)}
                            className="text-danger hover:text-danger/80"
                          >
                            <IconX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Warning */}
                <div className="p-4 bg-warning-light rounded-xl flex items-start gap-3">
                  <IconAlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      {t('contract_warning_title') || 'Important'}
                    </p>
                    <p className="text-xs text-warning/80 mt-1">
                      {t('contract_warning_text') || 'Ce contrat est généré à titre indicatif. Faites-le relire par un professionnel du droit avant utilisation.'}
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-danger-light rounded-xl flex items-center gap-3">
                    <IconAlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                    <p className="text-sm text-danger">{error}</p>
                  </div>
                )}
              </div>
            )}

            {step === 'review' && generatedContract && (
              <div className="space-y-6">
                {/* Contract preview */}
                <div className="p-6 bg-white dark:bg-muted/20 rounded-xl border border-default">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-center text-primary mb-6 uppercase">
                    {generatedContract.title}
                  </h3>

                  {/* Parties */}
                  <div className="mb-6 text-sm">
                    <p className="font-semibold text-primary">ENTRE LES SOUSSIGNÉS :</p>
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                      <p className="font-medium text-primary">{generatedContract.parties.provider.name}</p>
                      <p className="text-secondary whitespace-pre-line">{generatedContract.parties.provider.details}</p>
                    </div>
                    <p className="text-center my-2 text-muted">ET</p>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="font-medium text-primary">{generatedContract.parties.client.name}</p>
                      <p className="text-secondary whitespace-pre-line">{generatedContract.parties.client.details}</p>
                    </div>
                  </div>

                  {/* Preamble */}
                  <div className="mb-6 text-sm">
                    <p className="font-semibold text-primary mb-2">PRÉAMBULE</p>
                    <p className="text-secondary whitespace-pre-line">{generatedContract.preamble}</p>
                  </div>

                  {/* Articles */}
                  <div className="space-y-4">
                    <p className="font-semibold text-primary text-sm">IL A ÉTÉ CONVENU CE QUI SUIT :</p>
                    {generatedContract.articles.map(article => (
                      <div key={article.number} className="text-sm">
                        <p className="font-semibold text-primary">
                          Article {article.number} - {article.title}
                        </p>
                        <p className="text-secondary whitespace-pre-line mt-1">{article.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Signatures */}
                  <div className="mt-8 pt-4 border-t border-default text-sm">
                    <p className="text-center text-muted mb-4">
                      Fait à {generatedContract.signatures.location}, le {generatedContract.signatures.date}
                    </p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="text-center">
                        <p className="font-medium text-primary">Le Prestataire</p>
                        <div className="mt-8 border-b border-default" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-primary">Le Client</p>
                        <div className="mt-8 border-b border-default" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips & Warnings */}
                {generatedContract.tips && generatedContract.tips.length > 0 && (
                  <div className="p-4 bg-info-light rounded-xl">
                    <p className="text-sm font-medium text-info flex items-center gap-2 mb-2">
                      <IconBulb className="w-4 h-4" />
                      {t('tips') || 'Conseils'}
                    </p>
                    <ul className="text-xs text-info/80 space-y-1">
                      {generatedContract.tips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedContract.warnings && generatedContract.warnings.length > 0 && (
                  <div className="p-4 bg-warning-light rounded-xl">
                    <p className="text-sm font-medium text-warning flex items-center gap-2 mb-2">
                      <IconAlertTriangle className="w-4 h-4" />
                      {t('warnings') || 'Points d\'attention'}
                    </p>
                    <ul className="text-xs text-warning/80 space-y-1">
                      {generatedContract.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-default bg-muted/30">
            {step === 'config' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      {t('generating') || 'Génération...'}
                    </>
                  ) : (
                    <>
                      <IconSparkles className="w-4 h-4" />
                      {t('generate_contract') || 'Générer le contrat'}
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('config')}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyContract}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-primary rounded-lg hover:bg-hover transition-colors"
                  >
                    <IconCopy className="w-4 h-4" />
                    {t('copy') || 'Copier'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-2 px-6 py-2.5 bg-success text-white rounded-xl hover:bg-success/90 transition-colors"
                  >
                    <IconCheck className="w-4 h-4" />
                    {t('use_contract') || 'Utiliser ce contrat'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

