'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconSettings,
  IconSparkles,
  IconFlask,
  IconCheck,
  IconLoader2,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import {
  ALL_MODULES,
  DEFAULT_MODULE_STATUSES,
  ModuleStatusConfig,
  ModuleStatus,
} from '@/config/business-modules';

export default function AdminModulesPage() {
  const { language } = useLanguage();
  const [moduleStatuses, setModuleStatuses] = useState<ModuleStatusConfig[]>(DEFAULT_MODULE_STATUSES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved statuses from localStorage (in real app, this would be from API/DB)
  useEffect(() => {
    const saved = localStorage.getItem('module_statuses');
    if (saved) {
      try {
        setModuleStatuses(JSON.parse(saved));
      } catch {
        setModuleStatuses(DEFAULT_MODULE_STATUSES);
      }
    }
  }, []);

  const handleStatusChange = (moduleId: string, status: ModuleStatus) => {
    setModuleStatuses(prev => {
      const existing = prev.find(s => s.moduleId === moduleId);
      if (existing) {
        if (status === null) {
          // Remove the status
          return prev.filter(s => s.moduleId !== moduleId);
        }
        // Update existing
        return prev.map(s => s.moduleId === moduleId ? { ...s, status } : s);
      } else if (status !== null) {
        // Add new
        return [...prev, { moduleId, status }];
      }
      return prev;
    });
  };

  const getModuleStatus = (moduleId: string): ModuleStatus => {
    const config = moduleStatuses.find(s => s.moduleId === moduleId);
    return config?.status || null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Save to localStorage (in real app, save to API/DB)
      localStorage.setItem('module_statuses', JSON.stringify(moduleStatuses));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving module statuses:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
          <IconSettings className="w-7 h-7 !text-accent" />
          {language === 'fr' ? 'Gestion des Modules' : 'Module Management'}
        </h1>
        <p className="text-muted mt-2">
          {language === 'fr' 
            ? 'Définissez le statut des modules (Beta, New) visibles dans la sidebar'
            : 'Set module status (Beta, New) visible in the sidebar'}
        </p>
      </div>

      {/* Module List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex flex-col gap-2 p-4"
      >
        <div className="p-4 border-b border-default">
          <h2 className="font-semibold text-primary">
            {language === 'fr' ? 'Statut des modules' : 'Module Status'}
          </h2>
        </div>

        <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
          {Object.values(ALL_MODULES).map(module => {
            const currentStatus = getModuleStatus(module.id);
            
            return (
              <div
                key={module.id}
                className="p-4 flex-1 bg-page flex min-h-[100px] flex-col gap-4 items-center justify-between transition-colors border border-default rounded-lg"
              >
                <div className="flex items-center justify-start w-full  gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                    <span className="text-accent text-lg">
                      {module.icon === 'IconTargetArrow' ? '🎯' : '📦'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">
                      {language === 'fr' ? module.label : module.labelEn}
                    </p>
                    <p className="text-sm text-muted">
                      {module.path}
                    </p>
                  </div>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(module.id, null)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      currentStatus === null
                        ? 'bg-accent border border-accent text-white font-medium'
                        : 'text-muted bg-muted'
                    }`}
                  >
                    {language === 'fr' ? 'Aucun' : 'None'}
                  </button>
                  <button
                    onClick={() => handleStatusChange(module.id, 'beta')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentStatus === 'beta'
                        ? 'bg-warning-light text-warning-text font-medium border border-warning'
                        : 'text-muted bg-muted'
                    }`}
                  >
                    <IconFlask className="w-4 h-4" />
                    Beta
                  </button>
                  <button
                    onClick={() => handleStatusChange(module.id, 'new')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentStatus === 'new'
                        ? 'bg-success-light !text-success-text font-medium border border-success'
                        : 'text-muted hover:bg-hover'
                    }`}
                  >
                    <IconSparkles className="w-4 h-4" />
                    New
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-default bg-hover flex items-center justify-between">
          <p className="text-sm text-muted">
            {language === 'fr' 
              ? 'Les changements seront visibles après rechargement de la page'
              : 'Changes will be visible after page reload'}
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-4 py-2 flex items-center gap-2"
          >
            {isSaving ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <IconCheck className="w-4 h-4" />
            ) : null}
            {saveSuccess 
              ? (language === 'fr' ? 'Enregistré !' : 'Saved!')
              : (language === 'fr' ? 'Enregistrer' : 'Save')}
          </button>
        </div>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mt-6 p-4 bg-accent-light border-accent"
      >
        <h3 className="font-semibold !text-accent mb-2">
          {language === 'fr' ? 'Comment ça marche ?' : 'How does it work?'}
        </h3>
        <ul className="text-sm text-primary space-y-1">
          <li className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-warning-light text-warning-text border border-warning rounded-full">Beta</span>
            {language === 'fr' 
              ? 'Module en cours de développement, peut contenir des bugs'
              : 'Module under development, may contain bugs'}
          </li>
          <li className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-success-light !text-success-text -text border border-success rounded-full">New</span>
            {language === 'fr' 
              ? 'Nouveau module récemment ajouté'
              : 'New module recently added'}
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

