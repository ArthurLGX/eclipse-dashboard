'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconCheck,
  IconChevronRight,
  IconBriefcase,
  IconClock,
  IconListCheck,
  IconPlus,
  IconUser,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useClients } from '@/hooks/useApi';
import { useModalFocus } from '@/hooks/useModalFocus';
import { addClientUser, createProject, createProjectTask } from '@/lib/api';
import type { Client, Project } from '@/types';

// Types
interface TemplateTask {
  title: string;
  description?: string;
  estimated_hours?: number;
  priority: 'low' | 'medium' | 'high';
  phase: string;
  order: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  estimated_duration_days: number;
  tasks: TemplateTask[];
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
  defaultClientId?: string;
}

// Templates de projet
const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'website_vitrine',
    name: 'Site Vitrine',
    nameEn: 'Showcase Website',
    description: 'Template pour site vitrine professionnel',
    descriptionEn: 'Template for professional showcase website',
    estimated_duration_days: 21,
    tasks: [
      { title: 'Brief créatif', description: 'Analyse des besoins et direction artistique', estimated_hours: 4, priority: 'high', phase: 'Maquettage', order: 1 },
      { title: 'Maquette page d\'accueil', description: 'Design Figma de la homepage', estimated_hours: 8, priority: 'high', phase: 'Maquettage', order: 2 },
      { title: 'Maquettes pages secondaires', description: 'Design des autres pages', estimated_hours: 6, priority: 'medium', phase: 'Maquettage', order: 3 },
      { title: 'Validation maquettes', description: 'Présentation et ajustements client', estimated_hours: 2, priority: 'high', phase: 'Maquettage', order: 4 },
      { title: 'Setup projet', description: 'Installation et configuration', estimated_hours: 2, priority: 'high', phase: 'Développement', order: 5 },
      { title: 'Intégration header/footer', description: 'Composants de navigation', estimated_hours: 3, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Intégration page d\'accueil', description: 'Développement homepage', estimated_hours: 8, priority: 'high', phase: 'Développement', order: 7 },
      { title: 'Intégration pages secondaires', description: 'Autres pages', estimated_hours: 6, priority: 'medium', phase: 'Développement', order: 8 },
      { title: 'Tests et corrections', description: 'QA et debug', estimated_hours: 4, priority: 'high', phase: 'Tests', order: 9 },
      { title: 'Mise en ligne', description: 'Déploiement production', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 10 },
    ],
  },
  {
    id: 'ecommerce',
    name: 'Site E-commerce',
    nameEn: 'E-commerce Website',
    description: 'Template pour boutique en ligne',
    descriptionEn: 'Template for online store',
    estimated_duration_days: 45,
    tasks: [
      { title: 'Analyse besoins e-commerce', description: 'Catalogue, paiement, livraison', estimated_hours: 4, priority: 'high', phase: 'Analyse', order: 1 },
      { title: 'Architecture technique', description: 'Choix stack et intégrations', estimated_hours: 4, priority: 'high', phase: 'Analyse', order: 2 },
      { title: 'Design pages catalogue', description: 'Liste produits, catégories', estimated_hours: 8, priority: 'high', phase: 'Design', order: 3 },
      { title: 'Design page produit', description: 'Fiche produit détaillée', estimated_hours: 6, priority: 'high', phase: 'Design', order: 4 },
      { title: 'Design tunnel d\'achat', description: 'Panier, checkout', estimated_hours: 8, priority: 'high', phase: 'Design', order: 5 },
      { title: 'Setup e-commerce', description: 'Configuration Stripe/Shopify', estimated_hours: 8, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Développement catalogue', description: 'Pages produits et catégories', estimated_hours: 16, priority: 'high', phase: 'Développement', order: 7 },
      { title: 'Intégration paiement', description: 'Stripe/PayPal', estimated_hours: 8, priority: 'high', phase: 'Développement', order: 8 },
      { title: 'Tests transactions', description: 'Tests paiement et livraison', estimated_hours: 6, priority: 'high', phase: 'Tests', order: 9 },
      { title: 'Formation client', description: 'Utilisation back-office', estimated_hours: 2, priority: 'medium', phase: 'Livraison', order: 10 },
    ],
  },
  {
    id: 'webapp',
    name: 'Application Web',
    nameEn: 'Web Application',
    description: 'Template pour application web métier',
    descriptionEn: 'Template for business web application',
    estimated_duration_days: 60,
    tasks: [
      { title: 'Spécifications fonctionnelles', description: 'Document de spec', estimated_hours: 8, priority: 'high', phase: 'Conception', order: 1 },
      { title: 'Wireframes', description: 'Maquettes fil de fer', estimated_hours: 6, priority: 'high', phase: 'Conception', order: 2 },
      { title: 'Design UI/UX', description: 'Design haute fidélité', estimated_hours: 12, priority: 'high', phase: 'Design', order: 3 },
      { title: 'Setup architecture', description: 'Configuration projet', estimated_hours: 4, priority: 'high', phase: 'Développement', order: 4 },
      { title: 'Développement backend', description: 'API et base de données', estimated_hours: 24, priority: 'high', phase: 'Développement', order: 5 },
      { title: 'Développement frontend', description: 'Interface utilisateur', estimated_hours: 24, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Tests unitaires', description: 'Tests automatisés', estimated_hours: 8, priority: 'high', phase: 'Tests', order: 7 },
      { title: 'Tests utilisateurs', description: 'Tests UAT', estimated_hours: 4, priority: 'high', phase: 'Tests', order: 8 },
      { title: 'Documentation', description: 'Doc technique et utilisateur', estimated_hours: 4, priority: 'medium', phase: 'Livraison', order: 9 },
      { title: 'Déploiement', description: 'Mise en production', estimated_hours: 4, priority: 'high', phase: 'Livraison', order: 10 },
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    nameEn: 'Maintenance',
    description: 'Template pour contrat de maintenance',
    descriptionEn: 'Template for maintenance contract',
    estimated_duration_days: 30,
    tasks: [
      { title: 'Audit initial', description: 'État des lieux', estimated_hours: 4, priority: 'high', phase: 'Démarrage', order: 1 },
      { title: 'Mises à jour sécurité', description: 'Updates critiques', estimated_hours: 4, priority: 'high', phase: 'Maintenance', order: 2 },
      { title: 'Corrections bugs', description: 'Résolution anomalies', estimated_hours: 8, priority: 'medium', phase: 'Maintenance', order: 3 },
      { title: 'Optimisations', description: 'Performance et SEO', estimated_hours: 4, priority: 'medium', phase: 'Maintenance', order: 4 },
      { title: 'Rapport mensuel', description: 'Compte-rendu activité', estimated_hours: 2, priority: 'low', phase: 'Suivi', order: 5 },
    ],
  },
  {
    id: 'custom',
    name: 'Projet personnalisé',
    nameEn: 'Custom Project',
    description: 'Créer un projet vide',
    descriptionEn: 'Create an empty project',
    estimated_duration_days: 14,
    tasks: [],
  },
];

// Helper
function calculateTemplateTotals(template: ProjectTemplate) {
  const totalHours = template.tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const phases = [...new Set(template.tasks.map(t => t.phase))];
  return { totalHours, phases, taskCount: template.tasks.length };
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
  defaultClientId,
}: CreateProjectModalProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const modalRef = useModalFocus(isOpen);
  
  // Data
  const { data: clientsData } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);
  
  // State
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || '');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('template');
      setSelectedTemplate(null);
      setProjectName('');
      setSelectedClientId(defaultClientId || '');
      setNewClientName('');
      setNewClientEmail('');
      setShowNewClientForm(false);
    }
  }, [isOpen, defaultClientId]);

  // Handle template selection
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setStep('details');
  };

  // Create project
  const handleCreateProject = async () => {
    if (!user?.id || !selectedTemplate) return;
    
    setIsSaving(true);
    try {
      // 1. Create or get client ID (numeric)
      let clientId: number | undefined;
      
      if (showNewClientForm && newClientName) {
        const clientResponse = await addClientUser(user.id, {
          name: newClientName,
          email: newClientEmail || `${newClientName.toLowerCase().replace(/\s+/g, '.')}@client.local`,
          enterprise: newClientName,
          processStatus: 'client',
        });
        const newClient = (clientResponse as { data?: { id: number; documentId: string } }).data;
        if (newClient?.id) {
          clientId = newClient.id;
        }
      } else if (selectedClientId) {
        // Find the numeric ID from the selected client documentId
        const selectedClient = clients.find(c => c.documentId === selectedClientId);
        if (selectedClient?.id) {
          clientId = selectedClient.id;
        }
      }
      
      // 2. Calculate end date
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + selectedTemplate.estimated_duration_days);
      
      // 3. Create project
      const projectResponse = await createProject({
        title: projectName,
        description: selectedTemplate.description,
        project_status: 'planning',
        type: 'development',
        start_date: startDate,
        end_date: end.toISOString().split('T')[0],
        user: user.id,
        client: clientId,
      });
      
      const project = (projectResponse as { data?: Project }).data || projectResponse as Project;
      
      if (!project?.documentId) {
        throw new Error('Invalid project response');
      }
      
      // 4. Create tasks
      if (selectedTemplate.tasks.length > 0) {
        const taskPromises = selectedTemplate.tasks.map((task, index) =>
          createProjectTask({
            project: project.documentId,
            title: task.title,
            description: task.description || '',
            task_status: 'todo',
            priority: task.priority,
            estimated_hours: task.estimated_hours || null,
            order: task.order || index,
            created_user: user.id,
            tags: [task.phase],
          })
        );
        await Promise.all(taskPromises);
      }
      
      showGlobalPopup(t('project_created') || 'Projet créé avec succès !', 'success');
      onProjectCreated?.(project);
      onClose();
      
    } catch (error) {
      console.error('Error creating project:', error);
      showGlobalPopup(t('error') || 'Erreur', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-card border border-default rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-default flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-primary">
              {step === 'template' 
                ? (t('choose_template') || 'Choisir un template')
                : (t('project_details') || 'Détails du projet')}
            </h2>
            <p className="text-sm text-muted mt-1">
              {step === 'template'
                ? (t('choose_template_desc') || 'Sélectionnez un template pour démarrer rapidement')
                : (t('project_details_desc') || 'Personnalisez votre projet')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-hover transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{ overscrollBehavior: 'contain' }}
        >
          <AnimatePresence mode="wait">
            {step === 'template' ? (
              <motion.div
                key="template"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {PROJECT_TEMPLATES.map((template) => {
                  const { totalHours, phases, taskCount } = calculateTemplateTotals(template);
                  const isCustom = template.id === 'custom';
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="p-4 rounded-xl border border-default hover:border-accent bg-card hover:bg-hover text-left transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                          <IconBriefcase className="w-5 h-5" />
                        </div>
                        <IconChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                      </div>
                      
                      <h3 className="font-semibold text-primary mb-1">
                        {language === 'en' ? template.nameEn : template.name}
                      </h3>
                      <p className="text-sm text-muted mb-3">
                        {language === 'en' ? template.descriptionEn : template.description}
                      </p>
                      
                      {!isCustom && (
                        <div className="flex flex-wrap gap-3 text-xs text-secondary">
                          <span className="flex items-center gap-1">
                            <IconClock className="w-3 h-3" />
                            {template.estimated_duration_days} {t('days') || 'jours'}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconListCheck className="w-3 h-3" />
                            {taskCount} {t('tasks') || 'tâches'}
                          </span>
                          <span className="flex items-center gap-1">
                            ~{totalHours}h
                          </span>
                        </div>
                      )}
                      
                      {!isCustom && phases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {phases.slice(0, 4).map((phase) => (
                            <span
                              key={phase}
                              className="px-2 py-0.5 text-xs rounded-full bg-muted text-secondary"
                            >
                              {phase}
                            </span>
                          ))}
                          {phases.length > 4 && (
                            <span className="px-2 py-0.5 text-xs text-muted">
                              +{phases.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Template summary */}
                {selectedTemplate && selectedTemplate.id !== 'custom' && (
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent-light">
                    <div className="flex items-center gap-3 mb-2">
                      <IconCheck className="w-5 h-5 text-accent" />
                      <span className="font-medium text-primary">
                        {language === 'en' ? selectedTemplate.nameEn : selectedTemplate.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-secondary">
                      <span>{selectedTemplate.estimated_duration_days} {t('days') || 'jours'}</span>
                      <span>{selectedTemplate.tasks.length} {t('tasks') || 'tâches'}</span>
                      <span>~{calculateTemplateTotals(selectedTemplate).totalHours}h</span>
                    </div>
                  </div>
                )}

                {/* Project name */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('project_name') || 'Nom du projet'} *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="input w-full"
                    placeholder={t('project_name_placeholder') || 'Ex: Site web Entreprise ABC'}
                    autoFocus
                  />
                </div>

                {/* Client selection */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('client') || 'Client'}
                  </label>
                  
                  {!showNewClientForm ? (
                    <div className="space-y-3">
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="input w-full"
                      >
                        <option value="">{t('select_client') || 'Sélectionner un client'}</option>
                        {clients.map((client) => (
                          <option key={client.documentId} value={client.documentId}>
                            {client.name} {client.enterprise && `(${client.enterprise})`}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => setShowNewClientForm(true)}
                        className="flex items-center gap-2 text-sm text-accent hover:underline"
                      >
                        <IconPlus className="w-4 h-4" />
                        {t('create_new_client') || 'Créer un nouveau client'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 rounded-xl bg-muted border border-default">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary flex items-center gap-2">
                          <IconUser className="w-4 h-4" />
                          {t('new_client') || 'Nouveau client'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewClientForm(false);
                            setNewClientName('');
                            setNewClientEmail('');
                          }}
                          className="text-sm text-secondary hover:text-primary"
                        >
                          {t('cancel') || 'Annuler'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            {t('name') || 'Nom'} *
                          </label>
                          <input
                            type="text"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="input w-full"
                            placeholder="Entreprise ABC"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            {t('email') || 'Email'}
                          </label>
                          <input
                            type="email"
                            value={newClientEmail}
                            onChange={(e) => setNewClientEmail(e.target.value)}
                            className="input w-full"
                            placeholder="contact@entreprise.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('start_date') || 'Date de début'}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('hourly_rate') || 'Taux horaire'} (€/h)
                    </label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="input w-full"
                      min={0}
                    />
                  </div>
                </div>

                {/* Estimated value */}
                {selectedTemplate && selectedTemplate.tasks.length > 0 && (
                  <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary">
                        {t('estimated_value') || 'Valeur estimée'}
                      </span>
                      <span className="text-lg font-bold text-success">
                        {(calculateTemplateTotals(selectedTemplate).totalHours * hourlyRate).toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-default bg-muted/30 flex-shrink-0">
          {step === 'details' ? (
            <>
              <button
                onClick={() => setStep('template')}
                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
              >
                {t('back') || 'Retour'}
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isSaving || !projectName}
                className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('creating') || 'Création...'}
                  </>
                ) : (
                  <>
                    <IconCheck className="w-4 h-4" />
                    {t('create_project') || 'Créer le projet'}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <span className="text-sm text-muted">
                {t('select_template_hint') || 'Sélectionnez un template pour continuer'}
              </span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

