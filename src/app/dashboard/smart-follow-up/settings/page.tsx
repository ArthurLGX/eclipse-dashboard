'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconSettings, 
  IconBell, 
  IconClock, 
  IconShieldCheck,
  IconTrash,
  IconPlus,
  IconArrowLeft,
  IconDeviceFloppy,
  IconFilter,
} from '@tabler/icons-react';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import { updateAutomationSettings, createAutomationSettings } from '@/lib/smart-follow-up-api';
import { useAuth } from '@/app/context/AuthContext';
import RuleManagementModal from '@/app/components/RuleManagementModal';
import { Switch } from '@/components/ui/switch';
import type { AutomationSettings, FilterRule } from '@/types/smart-follow-up';

export default function SmartFollowUpSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: settings, mutate } = useAutomationSettings();
  
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [customRules, setCustomRules] = useState<FilterRule[]>([]);
  
  // États pour ICP
  const [icpSettings, setICPSettings] = useState({
    enabled: true,
    min_score_threshold: 3,
    types_enabled: {
      freelance: true,
      agence: true,
      b2b: true,
      b2c: true,
    },
    keywords: {
      freelance: ['freelance', 'indépendant', 'auto-entrepreneur', 'consultant'],
      agence: ['agence', 'agency', 'studio', 'équipe', 'team'],
      b2b: ['entreprise', 'société', 'business', 'b2b', 'partenariat', 'collaboration'],
      b2c: ['client', 'consommateur', 'b2c', 'particulier'],
      professional: ['projet', 'devis', 'prestation', 'service', 'mission', 'collaboration', 'proposition'],
    },
    require_response_thread: false,
    boost_responses: true,
  });
  const [editingICPType, setEditingICPType] = useState<string | null>(null);
  const [newICPKeyword, setNewICPKeyword] = useState('');
  
  // États pour les paramètres modifiables
  const [enabled, setEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);
  const [priorityKeywords, setPriorityKeywords] = useState<string[]>([]);
  const [delaySettings, setDelaySettings] = useState({
    payment_reminder: 7,
    proposal_follow_up: 3,
    meeting_follow_up: 1,
    thank_you: 1,
    check_in: 30,
  });
  const [workHours, setWorkHours] = useState({
    start: '09:00',
    end: '18:00',
    timezone: 'Europe/Paris',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    dashboard: true,
    frequency: 'immediate',
  });

  // Charger les paramètres existants
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAutoApprove(settings.auto_approve);
      setExcludedDomains(settings.excluded_domains || []);
      setPriorityKeywords(settings.priority_keywords || []);
      setDelaySettings(settings.delay_settings);
      setWorkHours(settings.work_hours);
      setNotificationPreferences(settings.notification_preferences);
      setCustomRules(settings.custom_rules || []);
      
      // Charger ICP settings
      if (settings.icp_settings) {
        setICPSettings(settings.icp_settings);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data: Partial<AutomationSettings> = {
        enabled,
        auto_approve: autoApprove,
        excluded_domains: excludedDomains,
        priority_keywords: priorityKeywords,
        delay_settings: delaySettings,
        work_hours: workHours,
        notification_preferences: notificationPreferences,
        custom_rules: customRules,
        icp_settings: icpSettings,
      };

      if (settings?.documentId) {
        await updateAutomationSettings(settings.documentId, data);
      } else {
        await createAutomationSettings(data);
      }

      mutate();
      alert('✓ Paramètres enregistrés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('❌ Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (domain && !excludedDomains.includes(domain)) {
      setExcludedDomains([...excludedDomains, domain]);
      setNewDomain('');
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setExcludedDomains(excludedDomains.filter(d => d !== domain));
  };

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (keyword && !priorityKeywords.includes(keyword)) {
      setPriorityKeywords([...priorityKeywords, keyword]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setPriorityKeywords(priorityKeywords.filter(k => k !== keyword));
  };

  const handleDayToggle = (day: string) => {
    if (workHours.days.includes(day)) {
      setWorkHours({
        ...workHours,
        days: workHours.days.filter(d => d !== day),
      });
    } else {
      setWorkHours({
        ...workHours,
        days: [...workHours.days, day],
      });
    }
  };

  const daysOfWeek = [
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-secondary  transition-colors"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="!text-3xl font-bold !text-primary mb-2 flex items-center gap-3">
              <IconSettings className="w-8 h-8 !text-accent-text" />
              Paramètres Smart Follow-Up
            </h1>
            <p className="!text-muted">Configurez les règles d&apos;automatisation des relances</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-accent !text-white  hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <IconDeviceFloppy className="w-5 h-5" />
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Section Activation */}
      <div className="bg-card border border-default  p-6 mb-6">
        <h2 className="!text-xl font-bold !text-primary mb-4 flex items-center gap-2">
          <IconShieldCheck className="w-6 h-6 !text-accent-text" />
          Activation du système
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary ">
            <div>
              <h3 className="font-semibold !text-primary">Smart Follow-Up activé</h3>
              <p className="!text-sm !text-muted">Activer ou désactiver le système de relances automatiques</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary ">
            <div>
              <h3 className="font-semibold !text-primary">Approbation automatique</h3>
              <p className="!text-sm !text-muted">Les actions à haute confiance (&gt;80%) seront approuvées automatiquement</p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
          </div>
        </div>
      </div>

      {/* Section Domaines exclus */}
      <div className="bg-card border border-default  p-6 mb-6">
        <h2 className="!text-xl font-bold !text-primary mb-4">Domaines exclus</h2>
        <p className="!text-sm !text-muted mb-4">
          Les emails provenant de ces domaines ne déclencheront pas de relances automatiques
        </p>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
            placeholder="ex: noreply.com, spam.com"
            className="flex-1 px-4 py-2 bg-secondary border border-default  !text-primary placeholder:!text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleAddDomain}
            className="px-4 py-2 bg-accent !text-white  hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <IconPlus className="w-5 h-5" />
            Ajouter
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {excludedDomains.map((domain) => (
            <div
              key={domain}
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-default "
            >
              <span className="!text-sm !text-primary">{domain}</span>
              <button
                onClick={() => handleRemoveDomain(domain)}
                className="!text-error hover:!text-error-dark transition-colors"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {excludedDomains.length === 0 && (
            <p className="!text-sm !text-muted italic">Aucun domaine exclu</p>
          )}
        </div>
      </div>

      {/* Section Configuration ICP */}
      <div id="icp" className="bg-card border border-default p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <IconFilter className="w-6 h-6 text-accent-text" />
          Configuration Ideal Client Profile (ICP)
        </h2>
        <p className="text-sm text-muted mb-6">
          Définissez les critères pour filtrer automatiquement les leads pertinents
        </p>

        {/* Toggle ICP */}
        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg mb-6">
          <div>
            <h3 className="font-semibold text-primary">Activer le filtrage ICP</h3>
            <p className="text-sm text-muted">Ne traiter que les emails correspondant à votre profil client idéal</p>
          </div>
          <Switch
            checked={icpSettings.enabled}
            onCheckedChange={(checked) => setICPSettings({ ...icpSettings, enabled: checked })}
          />
        </div>

        {icpSettings.enabled && (
          <>
            {/* Seuil de score minimum */}
            <div className="mb-6 p-4 bg-secondary rounded-lg">
              <label className="block text-sm font-medium text-primary mb-2">
                Score minimum pour qualification
              </label>
              <p className="text-xs text-muted mb-3">
                Un email doit atteindre ce score pour être considéré comme un lead (1-15 points)
              </p>
              <input
                type="number"
                min={1}
                max={15}
                value={icpSettings.min_score_threshold}
                onChange={(e) => setICPSettings({ ...icpSettings, min_score_threshold: parseInt(e.target.value) || 3 })}
                className="w-32 px-4 py-2 bg-card border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="ml-2 text-sm text-muted">/ 15 points</span>
            </div>

            {/* Types de clients acceptés */}
            <div className="mb-6">
              <h3 className="font-semibold text-primary mb-3">Types de clients à cibler</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(icpSettings.types_enabled).map(([type, enabled]) => (
                  <label key={type} className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-hover transition-colors">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setICPSettings({
                        ...icpSettings,
                        types_enabled: { ...icpSettings.types_enabled, [type]: e.target.checked }
                      })}
                      className="w-5 h-5 accent-accent"
                    />
                    <span className="capitalize text-primary font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options avancées */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={icpSettings.require_response_thread}
                  onChange={(e) => setICPSettings({ ...icpSettings, require_response_thread: e.target.checked })}
                  className="w-5 h-5 accent-accent"
                />
                <div>
                  <span className="text-primary font-medium">Uniquement les threads de réponses</span>
                  <p className="text-xs text-muted">Ne traiter que les emails qui sont des réponses (Re:, in_reply_to)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={icpSettings.boost_responses}
                  onChange={(e) => setICPSettings({ ...icpSettings, boost_responses: e.target.checked })}
                  className="w-5 h-5 accent-accent"
                />
                <div>
                  <span className="text-primary font-medium">Booster les réponses</span>
                  <p className="text-xs text-muted">Augmenter automatiquement le score des emails de réponse (+3 points)</p>
                </div>
              </label>
            </div>

            {/* Mots-clés par type */}
            <div>
              <h3 className="font-semibold text-primary mb-3">Mots-clés de détection par type</h3>
              <div className="space-y-4">
                {Object.entries(icpSettings.keywords).map(([type, keywords]) => (
                  <div key={type} className="border border-default rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="capitalize font-medium text-primary">{type}</h4>
                      <button
                        onClick={() => {
                          setEditingICPType(type);
                          setNewICPKeyword('');
                        }}
                        className="text-xs px-3 py-1 bg-accent text-white rounded hover:opacity-90"
                      >
                        <IconPlus className="w-3 h-3 inline mr-1" />
                        Ajouter
                      </button>
                    </div>

                    {editingICPType === type && (
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newICPKeyword}
                          onChange={(e) => setNewICPKeyword(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newICPKeyword.trim()) {
                              const keyword = newICPKeyword.trim().toLowerCase();
                              if (!keywords.includes(keyword)) {
                                setICPSettings({
                                  ...icpSettings,
                                  keywords: {
                                    ...icpSettings.keywords,
                                    [type]: [...keywords, keyword],
                                  },
                                });
                              }
                              setNewICPKeyword('');
                              setEditingICPType(null);
                            }
                          }}
                          placeholder="Nouveau mot-clé..."
                          className="flex-1 px-3 py-1.5 text-sm bg-card border border-default text-primary focus:outline-none focus:ring-2 focus:ring-accent rounded"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingICPType(null)}
                          className="px-3 py-1.5 text-sm bg-secondary text-primary rounded hover:bg-hover"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-xs"
                        >
                          <span className="text-purple-600 font-medium">{keyword}</span>
                          <button
                            onClick={() => {
                              setICPSettings({
                                ...icpSettings,
                                keywords: {
                                  ...icpSettings.keywords,
                                  [type]: keywords.filter((_, i) => i !== idx),
                                },
                              });
                            }}
                            className="text-error hover:text-error-dark"
                          >
                            <IconTrash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section Mots-clés prioritaires */}
      <div className="bg-card border border-default  p-6 mb-6">
        <h2 className="!text-xl font-bold !text-primary mb-4">Mots-clés prioritaires</h2>
        <p className="!text-sm !text-muted mb-4">
          Les emails contenant ces mots-clés seront traités en priorité
        </p>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
            placeholder="ex: urgent, important, deadline"
            className="flex-1 px-4 py-2 bg-secondary border border-default  !text-primary placeholder:!text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleAddKeyword}
            className="px-4 py-2 bg-accent !text-white  hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <IconPlus className="w-5 h-5" />
            Ajouter
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {priorityKeywords.map((keyword) => (
            <div
              key={keyword}
              className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 "
            >
              <span className="!text-sm !text-accent-text font-medium">{keyword}</span>
              <button
                onClick={() => handleRemoveKeyword(keyword)}
                className="!text-error hover:!text-error-dark transition-colors"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {priorityKeywords.length === 0 && (
            <p className="!text-sm !text-muted italic">Aucun mot-clé prioritaire</p>
          )}
        </div>
      </div>

      {/* Section Délais de relance */}
      <div className="bg-card border border-default  p-6 mb-6">
        <h2 className="!text-xl font-bold !text-primary mb-4 flex items-center gap-2">
          <IconClock className="w-6 h-6 !text-accent-text" />
          Délais de relance (en jours)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Rappel de paiement
            </label>
            <input
              type="number"
              min="1"
              value={delaySettings.payment_reminder}
              onChange={(e) => setDelaySettings({
                ...delaySettings,
                payment_reminder: parseInt(e.target.value) || 1
              })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Suivi de devis
            </label>
            <input
              type="number"
              min="1"
              value={delaySettings.proposal_follow_up}
              onChange={(e) => setDelaySettings({
                ...delaySettings,
                proposal_follow_up: parseInt(e.target.value) || 1
              })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Suivi de réunion
            </label>
            <input
              type="number"
              min="1"
              value={delaySettings.meeting_follow_up}
              onChange={(e) => setDelaySettings({
                ...delaySettings,
                meeting_follow_up: parseInt(e.target.value) || 1
              })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Email de remerciement
            </label>
            <input
              type="number"
              min="1"
              value={delaySettings.thank_you}
              onChange={(e) => setDelaySettings({
                ...delaySettings,
                thank_you: parseInt(e.target.value) || 1
              })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Prise de contact
            </label>
            <input
              type="number"
              min="1"
              value={delaySettings.check_in}
              onChange={(e) => setDelaySettings({
                ...delaySettings,
                check_in: parseInt(e.target.value) || 1
              })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Section Heures de travail */}
      <div className="bg-card border border-default  p-6 mb-6">
        <h2 className="!text-xl font-bold !text-primary mb-4">Heures de travail</h2>
        <p className="!text-sm !text-muted mb-4">
          Les emails ne seront envoyés que pendant ces horaires
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Heure de début
            </label>
            <input
              type="time"
              value={workHours.start}
              onChange={(e) => setWorkHours({ ...workHours, start: e.target.value })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Heure de fin
            </label>
            <input
              type="time"
              value={workHours.end}
              onChange={(e) => setWorkHours({ ...workHours, end: e.target.value })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label className="block !text-sm font-medium !text-primary mb-2">
            Jours ouvrés
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.value}
                onClick={() => handleDayToggle(day.value)}
                className={`px-4 py-2  font-medium transition-colors ${
                  workHours.days.includes(day.value)
                    ? 'bg-accent !text-white'
                    : 'bg-secondary !text-muted hover:bg-hover'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Règles personnalisées */}
      <div className="bg-card border border-default  p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="!text-xl font-bold !text-primary flex items-center gap-2">
              <IconFilter className="w-6 h-6 !text-accent-text" />
              Règles de filtrage personnalisées
            </h2>
            <p className="!text-sm !text-muted mt-2">
              Définissez des règles avancées pour contrôler précisément comment les emails sont traités
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary ">
            <div>
              <h3 className="font-semibold !text-primary">
                {customRules.length} règle{customRules.length > 1 ? 's' : ''} configurée{customRules.length > 1 ? 's' : ''}
              </h3>
              <p className="!text-sm !text-muted">
                {customRules.filter(r => r.enabled).length} active{customRules.filter(r => r.enabled).length > 1 ? 's' : ''} sur {customRules.length}
              </p>
            </div>
            <button
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2 bg-accent !text-white  hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <IconFilter className="w-5 h-5" />
              Gérer les règles
            </button>
          </div>

          {customRules.length > 0 && (
            <div className="space-y-2">
              <h4 className="!text-sm font-medium !text-muted">Règles actives :</h4>
              {customRules.filter(r => r.enabled).map(rule => (
                <div key={rule.id} className="flex items-center gap-2 p-3 bg-secondary/50 ">
                  <span className="!text-sm !text-primary font-medium">{rule.name}</span>
                  <span className="px-2 py-1 !text-xs bg-accent/10 !text-accent-text rounded">
                    Priorité {rule.priority}
                  </span>
                </div>
              ))}
              {customRules.filter(r => r.enabled).length === 0 && (
                <p className="!text-sm !text-muted italic">Aucune règle active</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section Notifications */}
      <div className="bg-card border border-default  p-6 mb-6">
        <h2 className="!text-xl font-bold !text-primary mb-4 flex items-center gap-2">
          <IconBell className="w-6 h-6 !text-accent-text" />
          Préférences de notification
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary ">
            <div>
              <h3 className="font-semibold !text-primary">Notifications email</h3>
              <p className="!text-sm !text-muted">Recevoir un email pour chaque action</p>
            </div>
            <Switch
              checked={notificationPreferences.email}
              onCheckedChange={(checked) => setNotificationPreferences({
                ...notificationPreferences,
                email: checked
              })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary ">
            <div>
              <h3 className="font-semibold !text-primary">Notifications dashboard</h3>
              <p className="!text-sm !text-muted">Afficher les notifications dans l&apos;interface</p>
            </div>
            <Switch
              checked={notificationPreferences.dashboard}
              onCheckedChange={(checked) => setNotificationPreferences({
                ...notificationPreferences,
                dashboard: checked
              })}
            />
          </div>

          <div>
            <label className="block !text-sm font-medium !text-primary mb-2">
              Fréquence des notifications
            </label>
            <select
              value={notificationPreferences.frequency}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                frequency: e.target.value
              })}
              className="w-full px-4 py-2 bg-secondary border border-default  !text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="immediate">Immédiate</option>
              <option value="hourly">Toutes les heures</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rule Management Modal */}
      <RuleManagementModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        rules={customRules}
        onSaveRules={(newRules) => {
          setCustomRules(newRules);
          setShowRulesModal(false);
        }}
      />
    </div>
  );
}
