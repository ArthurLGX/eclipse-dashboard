'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconCheck,
  IconX,
  IconFolder,
  IconListCheck,
  IconCalendar,
  IconLoader2,
  IconReceipt,
  IconArrowRight,
  IconClock,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { createProject, createProjectTask } from '@/lib/api';
import type { Facture, Client } from '@/types';

interface QuoteToProjectModalProps {
  isOpen: boolean;
  quote: Facture;
  onClose: () => void;
  onSuccess?: () => void;
}

interface InvoiceLine {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  unit?: string;
}

export default function QuoteToProjectModal({
  isOpen,
  quote,
  onClose,
  onSuccess,
}: QuoteToProjectModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  
  const [step, setStep] = useState<'options' | 'configure' | 'creating' | 'success'>('options');
  const [createProjectOption, setCreateProjectOption] = useState(true);
  const [importTasksOption, setImportTasksOption] = useState(true);
  const [createInvoiceOption, setCreateInvoiceOption] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState(30);
  const [projectStartDate, setProjectStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [timingMode, setTimingMode] = useState<'duration' | 'endDate'>('duration');
  const [durationOption, setDurationOption] = useState('1m');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const durationOptions = useMemo(() => ([
    { value: '1w', days: 7, label: t('duration_1w') || '1 semaine' },
    { value: '1m', days: 30, label: t('duration_1m') || '1 mois' },
    { value: '2m', days: 60, label: t('duration_2m') || '2 mois' },
    { value: '3m', days: 90, label: t('duration_3m') || '3 mois' },
    { value: '6m', days: 180, label: t('duration_6m') || '6 mois' },
    { value: '1y', days: 365, label: t('duration_1y') || '1 an' },
  ]), [t]);

  const getDurationDays = (option: string) => durationOptions.find(o => o.value === option)?.days || 30;

  const computedEndDate = useMemo(() => {
    if (!projectStartDate || timingMode !== 'duration') return '';
    const start = new Date(projectStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + getDurationDays(durationOption));
    return end.toISOString().split('T')[0];
  }, [projectStartDate, durationOption, timingMode, durationOptions]);

  const isTimingValid = timingMode === 'duration'
    ? Boolean(durationOption && computedEndDate)
    : Boolean(projectEndDate);
  
  // Extraire les lignes de prestation du devis
  const invoiceLines = useMemo<InvoiceLine[]>(() => {
    if (!quote.invoice_lines) return [];
    if (typeof quote.invoice_lines === 'string') {
      try {
        return JSON.parse(quote.invoice_lines);
      } catch {
        return [];
      }
    }
    return quote.invoice_lines as InvoiceLine[];
  }, [quote.invoice_lines]);

  // Client du devis
  const clientData = quote.client || quote.client_id;
  const clientName = clientData && typeof clientData === 'object' 
    ? (clientData as Client).name 
    : 'Client';

  // Titre du projet par défaut
  const defaultProjectTitle = useMemo(() => {
    return `Projet ${clientName} - ${quote.reference}`;
  }, [clientName, quote.reference]);

  // Initialiser le titre du projet
  React.useEffect(() => {
    if (!projectTitle) {
      setProjectTitle(defaultProjectTitle);
    }
  }, [defaultProjectTitle, projectTitle]);

  // Calculer la durée estimée en heures basée sur les quantités
  const estimateHours = (line: InvoiceLine): number => {
    switch (line.unit) {
      case 'hour':
        return line.quantity;
      case 'day':
        return line.quantity * 8; // 8h par jour
      case 'project':
      case 'fixed':
        return 0; // Forfait, pas de durée estimée
      default:
        return line.quantity; // Par défaut, quantité = heures
    }
  };

  // Créer le projet et les tâches
  const handleCreate = async () => {
    if (!user?.id) return;
    
    setStep('creating');
    
    try {
      if (createProjectOption) {
        // Créer le projet
        const clientId = clientData && typeof clientData === 'object' 
          ? (clientData as Client).id 
          : undefined;

        const endDateValue = timingMode === 'duration' ? computedEndDate : projectEndDate;
        if (!endDateValue) {
          setStep('configure');
          return;
        }

        const projectData = {
          title: projectTitle || defaultProjectTitle,
          description: quote.description || `Projet créé depuis le devis ${quote.reference}`,
          project_status: 'planned',
          start_date: projectStartDate,
          end_date: endDateValue,
          type: 'client',
          client: clientId,
          user: user.id,
        };

        const createdProject = await createProject(projectData) as { id: number; documentId: string };
        setCreatedProjectId(createdProject.documentId);

        // Créer les tâches à partir des lignes de prestation
        if (importTasksOption && invoiceLines.length > 0) {
          for (let i = 0; i < invoiceLines.length; i++) {
            const line = invoiceLines[i];
            const taskData = {
              title: line.description || `Prestation ${i + 1}`,
              description: `Prix: ${line.total?.toLocaleString('fr-FR', { style: 'currency', currency: quote.currency || 'EUR' })} (${line.quantity} × ${line.unit_price?.toLocaleString('fr-FR', { style: 'currency', currency: quote.currency || 'EUR' })})`,
              task_status: 'todo' as const,
              priority: 'medium' as const,
              progress: 0,
              order: i,
              estimated_hours: estimateHours(line) || null,
              project: createdProject.documentId, // documentId, pas id
              created_user: user.id,
            };

            await createProjectTask(taskData);
          }
        }

        // TODO: Créer une facture d'acompte si l'option est cochée
        if (createInvoiceOption) {
          // Pour l'instant, rediriger vers la page de création de facture
          // avec les paramètres pré-remplis
        }
      }

      setStep('success');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating project from quote:', error);
      setStep('options');
    }
  };

  // Aller au projet créé
  const handleGoToProject = () => {
    if (createdProjectId) {
      router.push(`/dashboard/projects/${createdProjectId}`);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overscroll-contain"
          onClick={onClose}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden overscroll-contain"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <IconCheck className="w-7 h-7 text-green-500" stroke={1} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {t('quote_accepted_title') || 'Devis accepté !'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {quote.reference} • {clientName}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'options' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <p className="text-secondary text-center mb-6">
                    {t('quote_accepted_description') || 'Félicitations ! Que souhaitez-vous faire maintenant ?'}
                  </p>

                  {/* Option: Créer le projet */}
                  <label
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      createProjectOption
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-default hover:border-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={createProjectOption}
                      onChange={(e) => setCreateProjectOption(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      createProjectOption ? 'bg-violet-500 border-violet-500' : 'border-muted'
                    }`}>
                      {createProjectOption && <IconCheck className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <IconFolder className="w-5 h-5 text-violet-500" />
                        {t('create_project_automatically') || 'Créer le projet automatiquement'}
                      </div>
                      <p className="text-sm text-muted mt-1">
                        {t('project_from_quote_desc') || 'Un nouveau projet sera créé et lié à ce devis'}
                      </p>
                    </div>
                  </label>

                  {/* Sous-option: Importer les prestations comme tâches */}
                  {createProjectOption && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="ml-8"
                    >
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          importTasksOption
                            ? 'border-violet-300 bg-violet-50/50 dark:bg-violet-900/10'
                            : 'border-default hover:border-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={importTasksOption}
                          onChange={(e) => setImportTasksOption(e.target.checked)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          importTasksOption ? 'bg-violet-500 border-violet-500' : 'border-muted'
                        }`}>
                          {importTasksOption && <IconCheck className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <IconListCheck className="w-4 h-4 text-violet-400" />
                            {t('import_tasks_from_lines') || 'Importer les prestations comme tâches'}
                          </div>
                          <p className="!text-xs text-muted mt-0.5">
                            {invoiceLines.length} {t('tasks_will_be_created') || 'tâches seront créées'}
                          </p>
                        </div>
                      </label>
                    </motion.div>
                  )}

                  {/* Option: Générer une facture d'acompte */}
                  <label
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      createInvoiceOption
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-default hover:border-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={createInvoiceOption}
                      onChange={(e) => setCreateInvoiceOption(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      createInvoiceOption ? 'bg-amber-500 border-amber-500' : 'border-muted'
                    }`}>
                      {createInvoiceOption && <IconCheck className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <IconReceipt className="w-5 h-5 text-amber-500" />
                        {t('create_deposit_invoice') || 'Générer une facture d\'acompte'}
                      </div>
                      <p className="text-sm text-muted mt-1">
                        {t('deposit_invoice_desc') || 'Créer automatiquement une facture d\'acompte'}
                      </p>
                    </div>
                  </label>

                  {/* Pourcentage d'acompte */}
                  {createInvoiceOption && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="ml-8 flex items-center gap-3"
                    >
                      <span className="text-sm text-muted">{t('deposit_percentage') || 'Pourcentage'} :</span>
                      <div className="flex gap-2">
                        {[30, 50, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setDepositPercentage(pct)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              depositPercentage === pct
                                ? 'bg-amber-500 text-white'
                                : 'bg-hover text-secondary hover:bg-amber-100 dark:hover:bg-amber-900/30'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-default">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 border border-default text-secondary rounded-xl hover:bg-hover transition-colors"
                    >
                      {t('later') || 'Plus tard'}
                    </button>
                    <button
                      onClick={() => setStep('configure')}
                      disabled={!createProjectOption && !createInvoiceOption}
                      className="flex-1 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {t('next') || 'Suivant'}
                      <IconArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'configure' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold text-primary">
                    {t('configure_project') || 'Configurer le projet'}
                  </h3>

                  {/* Titre du projet */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('project_title') || 'Titre du projet'}
                    </label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="input w-full"
                      placeholder={defaultProjectTitle}
                    />
                  </div>

                  {/* Date de début */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      <IconCalendar className="w-4 h-4 inline mr-1" />
                      {t('project_start_date') || 'Date de début du projet'}
                    </label>
                    <input
                      type="date"
                      value={projectStartDate}
                      onChange={(e) => setProjectStartDate(e.target.value)}
                      className="input w-full"
                    />
                  </div>

                  {/* Timing scope */}
                  <div className="p-3 rounded-lg border border-default bg-muted space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                      <IconClock className="w-4 h-4" />
                      {t('timing_scope') || 'Périmètre temporel'} *
                    </div>
                    <p className="!text-xs text-muted">
                      {t('timing_scope_desc') || 'Définissez la durée ou la date de fin pour éviter de compléter les dates manuellement.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${timingMode === 'duration' ? 'border-violet-500/60 bg-violet-100/50 dark:bg-violet-900/20 text-violet-600' : 'border-default text-secondary'}`}>
                        <input
                          type="radio"
                          name="timing_mode_quote"
                          checked={timingMode === 'duration'}
                          onChange={() => setTimingMode('duration')}
                          className="accent-[var(--color-accent)]"
                        />
                        {t('timing_scope_duration') || 'Durée'}
                      </label>
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${timingMode === 'endDate' ? 'border-violet-500/60 bg-violet-100/50 dark:bg-violet-900/20 text-violet-600' : 'border-default text-secondary'}`}>
                        <input
                          type="radio"
                          name="timing_mode_quote"
                          checked={timingMode === 'endDate'}
                          onChange={() => setTimingMode('endDate')}
                          className="accent-[var(--color-accent)]"
                        />
                        {t('timing_scope_end_date') || 'Date de fin'}
                      </label>
                    </div>

                    {timingMode === 'duration' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block !text-xs text-muted mb-1">
                            {t('duration') || 'Durée'}
                          </label>
                          <select
                            value={durationOption}
                            onChange={(e) => setDurationOption(e.target.value)}
                            className="input w-full"
                          >
                            {durationOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block !text-xs text-muted mb-1">
                            {t('end_date_preview') || 'Date de fin estimée'}
                          </label>
                          <div className="input w-full bg-muted/50 text-secondary">
                            {computedEndDate || '—'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block !text-xs text-muted mb-1">
                          {t('end_date') || 'Date de fin'}
                        </label>
                        <input
                          type="date"
                          value={projectEndDate}
                          onChange={(e) => setProjectEndDate(e.target.value)}
                          className="input w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Aperçu des tâches */}
                  {importTasksOption && invoiceLines.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        <IconListCheck className="w-4 h-4 inline mr-1" />
                        {t('tasks_preview') || 'Aperçu des tâches'} ({invoiceLines.length})
                      </label>
                      <div className="bg-hover rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                        {invoiceLines.map((line, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-5 h-5 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center !text-xs font-medium text-violet-600">
                              {index + 1}
                            </div>
                            <span className="flex-1 text-primary truncate">{line.description}</span>
                            {estimateHours(line) > 0 && (
                              <span className="flex items-center gap-1 !text-xs text-muted">
                                <IconClock className="w-3 h-3" />
                                {estimateHours(line)}h
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-default">
                    <button
                      onClick={() => setStep('options')}
                      className="flex-1 py-3 border border-default text-secondary rounded-xl hover:bg-hover transition-colors"
                    >
                      {t('back') || 'Retour'}
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!projectStartDate || !isTimingValid}
                      className="flex-1 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <IconCheck className="w-4 h-4" />
                      {t('create') || 'Créer'}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'creating' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center"
                >
                  <IconLoader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                  <p className="text-primary">
                    {t('creating_project') || 'Création du projet en cours...'}
                  </p>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconCheck className="w-8 h-8 text-green-500" stroke={1} />
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {t('project_created_success') || 'Projet créé avec succès !'}
                  </h3>
                  <p className="text-secondary text-sm mb-6">
                    {importTasksOption && invoiceLines.length > 0
                      ? `${invoiceLines.length} ${t('tasks_created') || 'tâches ont été créées'}`
                      : t('project_ready') || 'Le projet est prêt'}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 border border-default text-secondary rounded-xl hover:bg-hover transition-colors"
                    >
                      {t('close') || 'Fermer'}
                    </button>
                    <button
                      onClick={handleGoToProject}
                      className="flex-1 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <IconFolder className="w-4 h-4" />
                      {t('view_project') || 'Voir le projet'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

