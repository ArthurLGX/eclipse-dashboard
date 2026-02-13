'use client';

import { useState } from 'react';
import { 
  IconCheck, 
  IconX,
  IconFilter,
  IconSettings,
} from '@tabler/icons-react';
import type { FilterRule, FilterCondition, FilterAction } from '@/types/smart-follow-up';

interface RuleBuilderProps {
  rule: FilterRule;
  onSave: (rule: FilterRule) => void;
  onCancel: () => void;
}

export default function RuleBuilder({ rule: initialRule, onSave, onCancel }: RuleBuilderProps) {
  const [rule, setRule] = useState<FilterRule>(initialRule);

  const updateCondition = (field: keyof FilterCondition, value: unknown) => {
    setRule({
      ...rule,
      conditions: {
        ...rule.conditions,
        [field]: value,
      },
    });
  };

  const removeCondition = (field: keyof FilterCondition) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [field]: _removed, ...rest } = rule.conditions;
    setRule({
      ...rule,
      conditions: rest,
    });
  };

  const updateAction = (field: keyof FilterAction, value: unknown) => {
    setRule({
      ...rule,
      actions: {
        ...rule.actions,
        [field]: value,
      },
    });
  };

  const removeAction = (field: keyof FilterAction) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [field]: _removed, ...rest } = rule.actions;
    setRule({
      ...rule,
      actions: rest,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <label className="block !text-sm font-medium !text-primary mb-2">
            Nom de la règle *
          </label>
          <input
            type="text"
            value={rule.name}
            onChange={(e) => setRule({ ...rule, name: e.target.value })}
            className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Ex: Ignorer les emails marketing"
          />
        </div>

        <div>
          <label className="block !text-sm font-medium !text-primary mb-2">
            Description
          </label>
          <textarea
            value={rule.description || ''}
            onChange={(e) => setRule({ ...rule, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Description de la règle..."
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium !text-primary">Priorité :</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rule.priority}
              onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) || 1 })}
              className="w-20 px-3 py-1 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="text-xs !text-muted">(1-10)</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => setRule({ ...rule, enabled: e.target.checked })}
              className="w-4 h-4 !text-accent bg-secondary border-default rounded focus:ring-accent"
            />
            <span className="text-sm font-medium !text-primary">Règle activée</span>
          </label>
        </div>
      </div>

      {/* Conditions */}
      <div className="border border-default  p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold !text-primary flex items-center gap-2">
            <IconFilter className="w-5 h-5 !text-accent" />
            Conditions (toutes doivent être vraies)
          </h3>
        </div>

        <div className="space-y-4">
          {/* Sender Condition */}
          {rule.conditions.sender ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeCondition('sender')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="block !text-sm font-medium !text-primary mb-2">Expéditeur</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rule.conditions.sender.type}
                  onChange={(e) => updateCondition('sender', { ...rule.conditions.sender, type: e.target.value })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                >
                  <option value="contains">Contient</option>
                  <option value="equals">Égal à</option>
                  <option value="starts_with">Commence par</option>
                  <option value="ends_with">Finit par</option>
                  <option value="regex">Regex</option>
                </select>
                <input
                  type="text"
                  value={rule.conditions.sender.value}
                  onChange={(e) => updateCondition('sender', { ...rule.conditions.sender, value: e.target.value })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                  placeholder="valeur..."
                />
              </div>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={rule.conditions.sender.case_sensitive || false}
                  onChange={(e) => updateCondition('sender', { ...rule.conditions.sender, case_sensitive: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-xs !text-muted">Sensible à la casse</span>
              </label>
            </div>
          ) : (
            <button
              onClick={() => updateCondition('sender', { type: 'contains', value: '', case_sensitive: false })}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Ajouter condition sur l&apos;expéditeur
            </button>
          )}

          {/* Domain Condition */}
          {rule.conditions.domain ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeCondition('domain')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="block !text-sm font-medium !text-primary mb-2">Domaine</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rule.conditions.domain.type}
                  onChange={(e) => updateCondition('domain', { ...rule.conditions.domain, type: e.target.value })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                >
                  <option value="is">Est</option>
                  <option value="is_not">N&apos;est pas</option>
                  <option value="in_list">Dans la liste</option>
                  <option value="not_in_list">Pas dans la liste</option>
                </select>
                <input
                  type="text"
                  value={Array.isArray(rule.conditions.domain.value) ? rule.conditions.domain.value.join(', ') : rule.conditions.domain.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    const value = (rule.conditions.domain!.type === 'in_list' || rule.conditions.domain!.type === 'not_in_list')
                      ? val.split(',').map(v => v.trim())
                      : val;
                    updateCondition('domain', { ...rule.conditions.domain, value });
                  }}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                  placeholder={rule.conditions.domain.type === 'in_list' || rule.conditions.domain.type === 'not_in_list' ? "domain1.com, domain2.com" : "domain.com"}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => updateCondition('domain', { type: 'is', value: '' })}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Ajouter condition sur le domaine
            </button>
          )}

          {/* Subject Condition */}
          {rule.conditions.subject ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeCondition('subject')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="block !text-sm font-medium !text-primary mb-2">Sujet</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rule.conditions.subject.type}
                  onChange={(e) => updateCondition('subject', { ...rule.conditions.subject, type: e.target.value })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                >
                  <option value="contains">Contient</option>
                  <option value="equals">Égal à</option>
                  <option value="starts_with">Commence par</option>
                  <option value="ends_with">Finit par</option>
                  <option value="regex">Regex</option>
                </select>
                <input
                  type="text"
                  value={rule.conditions.subject.value}
                  onChange={(e) => updateCondition('subject', { ...rule.conditions.subject, value: e.target.value })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                  placeholder="valeur..."
                />
              </div>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={rule.conditions.subject.case_sensitive || false}
                  onChange={(e) => updateCondition('subject', { ...rule.conditions.subject, case_sensitive: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-xs !text-muted">Sensible à la casse</span>
              </label>
            </div>
          ) : (
            <button
              onClick={() => updateCondition('subject', { type: 'contains', value: '', case_sensitive: false })}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Ajouter condition sur le sujet
            </button>
          )}

          {/* Keywords Condition */}
          {rule.conditions.keywords ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeCondition('keywords')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="block !text-sm font-medium !text-primary mb-2">Mots-clés</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rule.conditions.keywords.type}
                  onChange={(e) => updateCondition('keywords', { ...rule.conditions.keywords, type: e.target.value })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                >
                  <option value="contains_any">Contient au moins un</option>
                  <option value="contains_all">Contient tous</option>
                  <option value="contains_none">Ne contient aucun</option>
                </select>
                <input
                  type="text"
                  value={rule.conditions.keywords.value.join(', ')}
                  onChange={(e) => updateCondition('keywords', { ...rule.conditions.keywords, value: e.target.value.split(',').map(v => v.trim()) })}
                  className="px-3 py-2 bg-card border border-default  !text-primary !text-sm"
                  placeholder="mot1, mot2, mot3"
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => updateCondition('keywords', { type: 'contains_any', value: [] })}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Ajouter condition sur les mots-clés
            </button>
          )}

          {/* Has Contact Condition */}
          {rule.conditions.has_contact !== undefined ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeCondition('has_contact')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rule.conditions.has_contact}
                  onChange={(e) => updateCondition('has_contact', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium !text-primary">A un contact associé</span>
              </label>
            </div>
          ) : (
            <button
              onClick={() => updateCondition('has_contact', true)}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Ajouter condition sur le contact
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border border-default  p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold !text-primary flex items-center gap-2">
            <IconSettings className="w-5 h-5 !text-accent" />
            Actions
          </h3>
        </div>

        <div className="space-y-4">
          {/* Skip Automation */}
          <label className="flex items-center gap-2 p-4 bg-secondary  cursor-pointer">
            <input
              type="checkbox"
              checked={rule.actions.skip_automation || false}
              onChange={(e) => updateAction('skip_automation', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium !text-primary">Ignorer l&apos;automatisation (ne pas créer de follow-up)</span>
          </label>

          {/* Set Priority */}
          {rule.actions.set_priority ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeAction('set_priority')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="block !text-sm font-medium !text-primary mb-2">Définir la priorité</label>
              <select
                value={rule.actions.set_priority}
                onChange={(e) => updateAction('set_priority', e.target.value as FilterAction['set_priority'])}
                className="w-full px-3 py-2 bg-card border border-default  !text-primary !text-sm"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          ) : (
            <button
              onClick={() => updateAction('set_priority', 'medium')}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Définir une priorité
            </button>
          )}

          {/* Custom Delay */}
          {rule.actions.custom_delay !== undefined ? (
            <div className="p-4 bg-secondary  relative">
              <button
                onClick={() => removeAction('custom_delay')}
                className="absolute top-2 right-2 !text-error hover:!text-error-dark"
              >
                <IconX className="w-4 h-4" />
              </button>
              <label className="block !text-sm font-medium !text-primary mb-2">Délai personnalisé (jours)</label>
              <input
                type="number"
                min="1"
                value={rule.actions.custom_delay}
                onChange={(e) => updateAction('custom_delay', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-card border border-default  !text-primary !text-sm"
              />
            </div>
          ) : (
            <button
              onClick={() => updateAction('custom_delay', 7)}
              className="w-full p-3 border-2 border-dashed border-default  !text-muted hover:border-accent hover:!text-accent transition-colors !text-sm"
            >
              + Définir un délai personnalisé
            </button>
          )}

          {/* Auto Approve */}
          <label className="flex items-center gap-2 p-4 bg-secondary  cursor-pointer">
            <input
              type="checkbox"
              checked={rule.actions.auto_approve || false}
              onChange={(e) => updateAction('auto_approve', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium !text-primary">Approuver automatiquement</span>
          </label>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-6 py-2 !text-muted hover:!text-primary transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(rule)}
          disabled={!rule.name}
          className="px-6 py-2 bg-accent !text-white  hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <IconCheck className="w-5 h-5" />
          Enregistrer la règle
        </button>
      </div>
    </div>
  );
}
