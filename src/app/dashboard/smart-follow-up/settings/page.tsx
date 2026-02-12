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
} from '@tabler/icons-react';
import { useAutomationSettings } from '@/hooks/useSmartFollowUp';
import { updateAutomationSettings, createAutomationSettings } from '@/lib/smart-follow-up-api';
import { useAuth } from '@/app/context/AuthContext';
import type { AutomationSettings } from '@/types/smart-follow-up';

export default function SmartFollowUpSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: settings, mutate } = useAutomationSettings();
  
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  
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
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
              <IconSettings className="w-8 h-8 text-accent" />
              Paramètres Smart Follow-Up
            </h1>
            <p className="text-muted">Configurez les règles d&apos;automatisation des relances</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <IconDeviceFloppy className="w-5 h-5" />
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Section Activation */}
      <div className="bg-card border border-default rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <IconShieldCheck className="w-6 h-6 text-accent" />
          Activation du système
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <h3 className="font-semibold text-primary">Smart Follow-Up activé</h3>
              <p className="text-sm text-muted">Activer ou désactiver le système de relances automatiques</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <h3 className="font-semibold text-primary">Approbation automatique</h3>
              <p className="text-sm text-muted">Les actions à haute confiance (&gt;80%) seront approuvées automatiquement</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Section Domaines exclus */}
      <div className="bg-card border border-default rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4">Domaines exclus</h2>
        <p className="text-sm text-muted mb-4">
          Les emails provenant de ces domaines ne déclencheront pas de relances automatiques
        </p>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
            placeholder="ex: noreply.com, spam.com"
            className="flex-1 px-4 py-2 bg-secondary border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleAddDomain}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <IconPlus className="w-5 h-5" />
            Ajouter
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {excludedDomains.map((domain) => (
            <div
              key={domain}
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-default rounded-lg"
            >
              <span className="text-sm text-primary">{domain}</span>
              <button
                onClick={() => handleRemoveDomain(domain)}
                className="text-error hover:text-error-dark transition-colors"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {excludedDomains.length === 0 && (
            <p className="text-sm text-muted italic">Aucun domaine exclu</p>
          )}
        </div>
      </div>

      {/* Section Mots-clés prioritaires */}
      <div className="bg-card border border-default rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4">Mots-clés prioritaires</h2>
        <p className="text-sm text-muted mb-4">
          Les emails contenant ces mots-clés seront traités en priorité
        </p>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
            placeholder="ex: urgent, important, deadline"
            className="flex-1 px-4 py-2 bg-secondary border border-default rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleAddKeyword}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <IconPlus className="w-5 h-5" />
            Ajouter
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {priorityKeywords.map((keyword) => (
            <div
              key={keyword}
              className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg"
            >
              <span className="text-sm text-accent font-medium">{keyword}</span>
              <button
                onClick={() => handleRemoveKeyword(keyword)}
                className="text-error hover:text-error-dark transition-colors"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {priorityKeywords.length === 0 && (
            <p className="text-sm text-muted italic">Aucun mot-clé prioritaire</p>
          )}
        </div>
      </div>

      {/* Section Délais de relance */}
      <div className="bg-card border border-default rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <IconClock className="w-6 h-6 text-accent" />
          Délais de relance (en jours)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
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
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
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
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
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
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
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
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
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
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Section Heures de travail */}
      <div className="bg-card border border-default rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4">Heures de travail</h2>
        <p className="text-sm text-muted mb-4">
          Les emails ne seront envoyés que pendant ces horaires
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Heure de début
            </label>
            <input
              type="time"
              value={workHours.start}
              onChange={(e) => setWorkHours({ ...workHours, start: e.target.value })}
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Heure de fin
            </label>
            <input
              type="time"
              value={workHours.end}
              onChange={(e) => setWorkHours({ ...workHours, end: e.target.value })}
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Jours ouvrés
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.value}
                onClick={() => handleDayToggle(day.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  workHours.days.includes(day.value)
                    ? 'bg-accent text-white'
                    : 'bg-secondary text-muted hover:bg-hover'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Notifications */}
      <div className="bg-card border border-default rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <IconBell className="w-6 h-6 text-accent" />
          Préférences de notification
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <h3 className="font-semibold text-primary">Notifications email</h3>
              <p className="text-sm text-muted">Recevoir un email pour chaque action</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPreferences.email}
                onChange={(e) => setNotificationPreferences({
                  ...notificationPreferences,
                  email: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <h3 className="font-semibold text-primary">Notifications dashboard</h3>
              <p className="text-sm text-muted">Afficher les notifications dans l&apos;interface</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPreferences.dashboard}
                onChange={(e) => setNotificationPreferences({
                  ...notificationPreferences,
                  dashboard: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Fréquence des notifications
            </label>
            <select
              value={notificationPreferences.frequency}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                frequency: e.target.value
              })}
              className="w-full px-4 py-2 bg-secondary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="immediate">Immédiate</option>
              <option value="hourly">Toutes les heures</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
