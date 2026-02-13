'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IconX, 
  IconPlus, 
  IconEdit, 
  IconTrash,
  IconFilter,
  IconToggleLeft,
  IconToggleRight,
} from '@tabler/icons-react';
import type { FilterRule } from '@/types/smart-follow-up';
import RuleBuilder from './RuleBuilder';

interface RuleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: FilterRule[];
  onSaveRules: (rules: FilterRule[]) => void;
}

export default function RuleManagementModal({ isOpen, onClose, rules: initialRules, onSaveRules }: RuleManagementModalProps) {
  const [rules, setRules] = useState<FilterRule[]>(initialRules);
  const [editingRule, setEditingRule] = useState<FilterRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = () => {
    const newRule: FilterRule = {
      id: Date.now().toString(),
      name: '',
      description: '',
      enabled: true,
      priority: 5,
      conditions: {},
      actions: {},
    };
    setEditingRule(newRule);
    setIsCreating(true);
  };

  const handleSaveRule = (rule: FilterRule) => {
    if (isCreating) {
      setRules([...rules, rule]);
    } else {
      setRules(rules.map(r => r.id === rule.id ? rule : r));
    }
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  const handleToggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleSaveAll = () => {
    onSaveRules(rules);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={!editingRule ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-default p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold !text-primary flex items-center gap-2">
                  <IconFilter className="w-7 h-7 !text-accent" />
                  Règles de filtrage
                </h2>
                <p className="text-sm !text-muted mt-1">
                  Définissez des règles personnalisées pour automatiser le traitement des emails
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <IconX className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {editingRule ? (
              // Rule Builder
              <RuleBuilder
                rule={editingRule}
                onSave={handleSaveRule}
                onCancel={() => {
                  setEditingRule(null);
                  setIsCreating(false);
                }}
              />
            ) : (
              // Rules List
              <div className="space-y-4">
                <button
                  onClick={handleCreateNew}
                  className="w-full p-4 border-2 border-dashed border-accent rounded-xl !text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <IconPlus className="w-5 h-5" />
                  Créer une nouvelle règle
                </button>

                {rules.length === 0 ? (
                  <div className="text-center py-12">
                    <IconFilter className="w-16 h-16 !text-muted mx-auto mb-4 opacity-50" />
                    <p className="text-muted">
                      Aucune règle définie. Créez votre première règle pour commencer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.sort((a, b) => b.priority - a.priority).map((rule) => (
                      <div
                        key={rule.id}
                        className={`p-4 border rounded-xl transition-colors ${
                          rule.enabled
                            ? 'border-default bg-secondary'
                            : 'border-default bg-secondary/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold !text-primary">{rule.name}</h3>
                              <span className="px-2 py-1 !text-xs font-medium rounded-full bg-accent/10 !text-accent">
                                Priorité {rule.priority}
                              </span>
                              {rule.enabled ? (
                                <span className="px-2 py-1 !text-xs font-medium rounded-full bg-success-light !text-success-text">
                                  Activée
                                </span>
                              ) : (
                                <span className="px-2 py-1 !text-xs font-medium rounded-full bg-muted !text-muted">
                                  Désactivée
                                </span>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-sm !text-muted mb-2">{rule.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 !text-xs">
                              {Object.keys(rule.conditions).length > 0 && (
                                <span className="px-2 py-1 bg-info-light !text-info-text rounded">
                                  {Object.keys(rule.conditions).length} condition(s)
                                </span>
                              )}
                              {Object.keys(rule.actions).length > 0 && (
                                <span className="px-2 py-1 bg-purple-100 !text-purple-700 rounded">
                                  {Object.keys(rule.actions).length} action(s)
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleRule(rule.id)}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                              title={rule.enabled ? 'Désactiver' : 'Activer'}
                            >
                              {rule.enabled ? (
                                <IconToggleRight className="w-5 h-5 !text-success" />
                              ) : (
                                <IconToggleLeft className="w-5 h-5 !text-muted" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingRule(rule)}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <IconEdit className="w-5 h-5 !text-accent" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <IconTrash className="w-5 h-5 !text-error" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!editingRule && (
            <div className="sticky bottom-0 bg-card border-t border-default p-6">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 !text-muted hover:!text-primary transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAll}
                  className="px-6 py-2 bg-accent !text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Enregistrer toutes les règles
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
