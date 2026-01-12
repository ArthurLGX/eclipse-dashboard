'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconCopy,
  IconTemplate,
  IconFolderPlus,
  IconChevronRight,
  IconClock,
  IconListCheck,
  IconCheck,
  IconLoader2,
  IconUser,
  IconBriefcase,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useProjects, useClients, clearCache } from '@/hooks/useApi';
import { useModalFocus } from '@/hooks/useModalFocus';
import { createProject, createProjectTask, fetchProjectTasks } from '@/lib/api';
import type { Client, Project, ProjectTask } from '@/types';

interface QuickProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
  defaultSourceProject?: Project; // Pour le bouton "Dupliquer depuis ce projet"
}

// Templates simplifiés
const QUICK_TEMPLATES = [
  {
    id: 'website',
    name: 'Site Web',
    nameEn: 'Website',
    icon: '🌐',
    duration: 21,
    tasks: [
      { title: 'Brief & maquettes', estimated_hours: 12, phase: 'Design' },
      { title: 'Développement', estimated_hours: 20, phase: 'Dev' },
      { title: 'Tests & livraison', estimated_hours: 6, phase: 'Livraison' },
    ],
  },
  {
    id: 'webapp',
    name: 'Application Web',
    nameEn: 'Web App',
    icon: '💻',
    duration: 45,
    tasks: [
      { title: 'Specs & UX', estimated_hours: 16, phase: 'Conception' },
      { title: 'Backend', estimated_hours: 24, phase: 'Dev' },
      { title: 'Frontend', estimated_hours: 24, phase: 'Dev' },
      { title: 'Tests & déploiement', estimated_hours: 8, phase: 'Livraison' },
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    nameEn: 'Maintenance',
    icon: '🔧',
    duration: 30,
    tasks: [
      { title: 'Audit initial', estimated_hours: 4, phase: 'Démarrage' },
      { title: 'Maintenance mensuelle', estimated_hours: 8, phase: 'Suivi' },
    ],
  },
];

type Step = 'choice' | 'duplicate' | 'template' | 'empty' | 'confirm';

export default function QuickProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
  defaultSourceProject,
}: QuickProjectModalProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const modalRef = useModalFocus(isOpen);
  
  // Data
  const { data: projectsData } = useProjects(user?.id);
  const { data: clientsData } = useClients(user?.id);
  const projects = useMemo(() => (projectsData as Project[]) || [], [projectsData]);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);
  
  // State
  const [step, setStep] = useState<Step>('choice');
  const [selectedSourceProject, setSelectedSourceProject] = useState<Project | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof QUICK_TEMPLATES[0] | null>(null);
  const [sourceTasks, setSourceTasks] = useState<ProjectTask[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Form
  const [projectName, setProjectName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Dernier projet utilisé (le plus récent)
  const lastProject = useMemo(() => {
    if (defaultSourceProject) return defaultSourceProject;
    return projects.sort((a, b) => 
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    )[0];
  }, [projects, defaultSourceProject]);

  // Reset on close/open
  useEffect(() => {
    if (isOpen) {
      setStep(defaultSourceProject ? 'duplicate' : 'choice');
      setSelectedSourceProject(defaultSourceProject || null);
      setProjectName(defaultSourceProject ? `${defaultSourceProject.title} (copie)` : '');
      setSelectedClientId(defaultSourceProject?.client?.documentId || '');
      setStartDate(new Date().toISOString().split('T')[0]);
      setSourceTasks([]);
      
      // Charger les tâches si projet source par défaut
      if (defaultSourceProject?.documentId) {
        loadProjectTasks(defaultSourceProject.documentId);
      }
    } else {
      setTimeout(() => {
        setStep('choice');
        setSelectedSourceProject(null);
        setSelectedTemplate(null);
        setProjectName('');
        setSelectedClientId('');
        setSourceTasks([]);
      }, 300);
    }
  }, [isOpen, defaultSourceProject]);

  // Charger les tâches d'un projet
  const loadProjectTasks = async (projectDocumentId: string) => {
    setLoadingTasks(true);
    try {
      const response = await fetchProjectTasks(projectDocumentId);
      setSourceTasks(response.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Sélectionner un projet source
  const handleSelectSourceProject = async (project: Project) => {
    setSelectedSourceProject(project);
    setProjectName(`${project.title} (copie)`);
    // Pré-remplir le client si même projet
    if (project.client?.documentId) {
      setSelectedClientId(project.client.documentId);
    }
    await loadProjectTasks(project.documentId);
    setStep('confirm');
  };

  // Sélectionner un template
  const handleSelectTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setProjectName('');
    setStep('confirm');
  };

  // Projet vide
  const handleEmptyProject = () => {
    setSelectedSourceProject(null);
    setSelectedTemplate(null);
    setProjectName('');
    setStep('confirm');
  };

  // Créer le projet
  const handleCreateProject = async () => {
    if (!user?.id || !projectName.trim()) return;
    
    setIsSaving(true);
    try {
      // Calculer la date de fin
      let durationDays = 14;
      if (selectedSourceProject?.start_date && selectedSourceProject?.end_date) {
        const start = new Date(selectedSourceProject.start_date);
        const end = new Date(selectedSourceProject.end_date);
        durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      } else if (selectedTemplate) {
        durationDays = selectedTemplate.duration;
      }
      
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + durationDays);
      
      // Trouver l'ID numérique du client
      let clientId: number | undefined;
      if (selectedClientId) {
        const client = clients.find(c => c.documentId === selectedClientId);
        if (client?.id) clientId = client.id;
      }
      
      // Créer le projet
      const projectResponse = await createProject({
        title: projectName,
        description: selectedSourceProject?.description || selectedTemplate?.name || '',
        project_status: 'planning',
        type: selectedSourceProject?.type || 'development',
        start_date: startDate,
        end_date: end.toISOString().split('T')[0],
        user: user.id,
        client: clientId,
      });
      
      const project = (projectResponse as { data?: Project }).data || projectResponse as Project;
      
      if (!project?.documentId) {
        throw new Error('Invalid project response');
      }
      
      // Créer les tâches
      let tasksToCreate: { title: string; description?: string; estimated_hours?: number; phase?: string; priority?: string }[] = [];
      
      if (selectedSourceProject && sourceTasks.length > 0) {
        // Dupliquer les tâches du projet source (sans le temps réel)
        tasksToCreate = sourceTasks.map(task => ({
          title: task.title,
          description: task.description || '',
          estimated_hours: task.estimated_hours || undefined,
          phase: task.tags?.[0] || '',
          priority: task.priority || 'medium',
        }));
      } else if (selectedTemplate) {
        // Utiliser les tâches du template
        tasksToCreate = selectedTemplate.tasks.map(task => ({
          title: task.title,
          estimated_hours: task.estimated_hours,
          phase: task.phase,
          priority: 'medium',
        }));
      }
      
      if (tasksToCreate.length > 0) {
        await Promise.all(tasksToCreate.map((task, index) =>
          createProjectTask({
            project: project.documentId,
            title: task.title,
            description: task.description || '',
            task_status: 'todo',
            priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
            estimated_hours: task.estimated_hours || null,
            order: index,
            created_user: user.id,
            tags: task.phase ? [task.phase] : [],
          })
        ));
      }
      
      clearCache('projects');
      showGlobalPopup(t('project_created') || 'Projet créé !', 'success');
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
        className="w-full max-w-2xl bg-card border border-default rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-default flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-primary">
              {step === 'choice' && (t('how_to_start') || 'Comment veux-tu démarrer ce projet ?')}
              {step === 'duplicate' && (t('duplicate_project') || 'Dupliquer un projet')}
              {step === 'template' && (t('use_template') || 'Utiliser un template')}
              {step === 'empty' && (t('empty_project') || 'Projet vide')}
              {step === 'confirm' && (t('finalize_project') || 'Finaliser le projet')}
            </h2>
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
          className="flex-1 overflow-y-auto p-5"
          style={{ overscrollBehavior: 'contain' }}
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Choix initial */}
            {step === 'choice' && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Option 1: Dupliquer (mise en avant) */}
                <button
                  onClick={() => setStep('duplicate')}
                  className="w-full p-4 rounded-xl border-2 border-accent bg-accent/5 hover:bg-accent/10 text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-accent text-white">
                      <IconCopy className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-primary">
                          {t('duplicate_existing') || 'Repartir d\'un projet existant'}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-accent text-white rounded-full">
                          {t('recommended') || 'Recommandé'}
                        </span>
                      </div>
                      <p className="text-sm text-muted mt-0.5">
                        {t('duplicate_desc') || 'Dupliquer phases, tâches et estimations'}
                      </p>
                    </div>
                    <IconChevronRight className="w-5 h-5 text-accent" />
                  </div>
                  {lastProject && (
                    <div className="mt-3 pt-3 border-t border-accent/20 flex items-center gap-2 text-sm text-accent">
                      <IconBriefcase className="w-4 h-4" />
                      <span>{t('last_used') || 'Dernier utilisé'} : <strong>{lastProject.title}</strong></span>
                    </div>
                  )}
                </button>

                {/* Option 2: Template */}
                <button
                  onClick={() => setStep('template')}
                  className="w-full p-4 rounded-xl border border-default hover:border-accent bg-card hover:bg-hover text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted text-secondary group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                      <IconTemplate className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">
                        {t('use_template') || 'Utiliser un template'}
                      </h3>
                      <p className="text-sm text-muted mt-0.5">
                        {t('template_desc') || 'Démarrer avec un modèle prédéfini'}
                      </p>
                    </div>
                    <IconChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                  </div>
                </button>

                {/* Option 3: Vide */}
                <button
                  onClick={handleEmptyProject}
                  className="w-full p-4 rounded-xl border border-default hover:border-accent bg-card hover:bg-hover text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted text-secondary group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                      <IconFolderPlus className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">
                        {t('empty_project') || 'Projet vide'}
                      </h3>
                      <p className="text-sm text-muted mt-0.5">
                        {t('empty_project_desc') || 'Commencer de zéro'}
                      </p>
                    </div>
                    <IconChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                  </div>
                </button>
              </motion.div>
            )}

            {/* Step: Sélection projet à dupliquer */}
            {step === 'duplicate' && (
              <motion.div
                key="duplicate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <button
                  onClick={() => setStep('choice')}
                  className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-2"
                >
                  ← {t('back') || 'Retour'}
                </button>
                
                <p className="text-sm text-muted mb-3">
                  {t('select_project_to_duplicate') || 'Sélectionne le projet à dupliquer :'}
                </p>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {projects.map((project) => {
                    const isLast = project.documentId === lastProject?.documentId;
                    return (
                      <button
                        key={project.documentId}
                        onClick={() => handleSelectSourceProject(project)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          isLast 
                            ? 'border-accent bg-accent/5 hover:bg-accent/10' 
                            : 'border-default hover:border-accent bg-card hover:bg-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary">{project.title}</span>
                              {isLast && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent text-white rounded">
                                  {t('recent') || 'Récent'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted mt-1">
                              {project.client?.name && (
                                <span className="flex items-center gap-1">
                                  <IconUser className="w-3 h-3" />
                                  {project.client.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <IconListCheck className="w-3 h-3" />
                                {project.tasks?.length || 0} tâches
                              </span>
                            </div>
                          </div>
                          <IconChevronRight className="w-4 h-4 text-muted" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step: Sélection template */}
            {step === 'template' && (
              <motion.div
                key="template"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <button
                  onClick={() => setStep('choice')}
                  className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-2"
                >
                  ← {t('back') || 'Retour'}
                </button>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {QUICK_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="p-4 rounded-xl border border-default hover:border-accent bg-card hover:bg-hover text-left transition-all group"
                    >
                      <div className="text-2xl mb-2">{template.icon}</div>
                      <h3 className="font-semibold text-primary text-sm">
                        {language === 'en' ? template.nameEn : template.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted mt-2">
                        <span className="flex items-center gap-1">
                          <IconClock className="w-3 h-3" />
                          {template.duration}j
                        </span>
                        <span className="flex items-center gap-1">
                          <IconListCheck className="w-3 h-3" />
                          {template.tasks.length} tâches
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step: Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setStep(selectedSourceProject ? 'duplicate' : selectedTemplate ? 'template' : 'choice')}
                  className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-2"
                >
                  ← {t('back') || 'Retour'}
                </button>

                {/* Résumé de la source */}
                {selectedSourceProject && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 text-sm">
                      <IconCopy className="w-4 h-4 text-accent" />
                      <span className="text-accent font-medium">
                        {t('duplicating_from') || 'Duplication de'} : {selectedSourceProject.title}
                      </span>
                    </div>
                    {loadingTasks ? (
                      <div className="flex items-center gap-2 text-xs text-muted mt-2">
                        <IconLoader2 className="w-3 h-3 animate-spin" />
                        {t('loading_tasks') || 'Chargement des tâches...'}
                      </div>
                    ) : (
                      <div className="text-xs text-muted mt-2">
                        {sourceTasks.length} {t('tasks_will_be_copied') || 'tâches seront copiées (sans temps réel)'}
                      </div>
                    )}
                  </div>
                )}

                {selectedTemplate && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 text-sm">
                      <IconTemplate className="w-4 h-4 text-accent" />
                      <span className="text-accent font-medium">
                        {t('template') || 'Template'} : {language === 'en' ? selectedTemplate.nameEn : selectedTemplate.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-2">
                      {selectedTemplate.tasks.length} {t('tasks_included') || 'tâches incluses'}
                    </div>
                  </div>
                )}

                {/* Formulaire */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      {t('project_name') || 'Nom du projet'} *
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={t('project_name_placeholder') || 'Mon nouveau projet'}
                      className="input w-full"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">
                        {t('client') || 'Client'}
                      </label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="input w-full"
                      >
                        <option value="">{t('no_client') || 'Sans client'}</option>
                        {clients.map(client => (
                          <option key={client.documentId} value={client.documentId}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">
                        {t('start_date') || 'Date de début'}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer - uniquement sur l'étape de confirmation */}
        {step === 'confirm' && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-default bg-card">
            <button
              onClick={onClose}
              className="btn-ghost px-4 py-2"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isSaving || !projectName.trim()}
              className="btn-primary px-5 py-2 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                  {t('creating') || 'Création...'}
                </>
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  {t('create_project') || 'Créer le projet'}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

