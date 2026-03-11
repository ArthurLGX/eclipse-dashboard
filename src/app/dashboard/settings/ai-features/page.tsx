'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconBrain, 
  IconArrowLeft, 
  IconDeviceFloppy,
  IconSparkles,
  IconChartBar,
  IconBulb,
  IconCheckbox,
  IconFileText,
  IconFileInvoice,
  IconCalculator,
  IconMail,
  IconPalette,
  IconRobot,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAIFeatures, type AIFeaturesConfig } from '@/app/context/AIFeaturesContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { Switch } from '@/components/ui/switch';

type FeatureCategory = 'productivity' | 'automation' | 'generation';

interface AIFeatureInfo {
  key: keyof AIFeaturesConfig;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tokenCost: string;
  category: FeatureCategory;
}

export default function AIFeaturesSettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { features, updateFeatures, loading } = useAIFeatures();
  const [saving, setSaving] = useState(false);
  const [localFeatures, setLocalFeatures] = useState(features);

  // Sync localFeatures with features when they change
  useEffect(() => {
    setLocalFeatures(features);
  }, [features]);

  const aiFeatures: AIFeatureInfo[] = [
    {
      key: 'daily_suggestions',
      label: 'Suggestions quotidiennes',
      description: 'Modale IA qui suggère les tâches prioritaires du jour',
      icon: IconSparkles,
      tokenCost: '~500 tokens/jour',
      category: 'productivity',
    },
    {
      key: 'project_profitability',
      label: 'Calcul de rentabilité IA',
      description: 'Analyse automatique de la rentabilité des projets',
      icon: IconChartBar,
      tokenCost: '~300 tokens/projet',
      category: 'productivity',
    },
    {
      key: 'project_insights',
      label: 'Insights projets',
      description: 'Suggestions IA pour optimiser vos projets',
      icon: IconBulb,
      tokenCost: '~400 tokens/projet',
      category: 'productivity',
    },
    {
      key: 'task_generation',
      label: 'Génération de tâches',
      description: 'Créer automatiquement des tâches avec l\'IA',
      icon: IconCheckbox,
      tokenCost: '~200 tokens/génération',
      category: 'generation',
    },
    {
      key: 'contract_generation',
      label: 'Génération de contrats',
      description: 'Générer des contrats personnalisés avec l\'IA',
      icon: IconFileText,
      tokenCost: '~1000 tokens/contrat',
      category: 'generation',
    },
    {
      key: 'quote_generation',
      label: 'Génération de devis',
      description: 'Créer des devis détaillés automatiquement',
      icon: IconFileInvoice,
      tokenCost: '~800 tokens/devis',
      category: 'generation',
    },
    {
      key: 'invoice_generation',
      label: 'Génération de factures',
      description: 'Générer des factures avec descriptions IA',
      icon: IconFileInvoice,
      tokenCost: '~600 tokens/facture',
      category: 'generation',
    },
    {
      key: 'price_estimation',
      label: 'Estimation de prix IA',
      description: 'Calculer automatiquement les prix des prestations',
      icon: IconCalculator,
      tokenCost: '~300 tokens/estimation',
      category: 'productivity',
    },
    {
      key: 'email_suggestions',
      label: 'Suggestions d\'emails',
      description: 'Améliorer vos emails avec des suggestions IA',
      icon: IconMail,
      tokenCost: '~200 tokens/email',
      category: 'productivity',
    },
    {
      key: 'mockup_generation',
      label: 'Génération de mockups',
      description: 'Créer des mockups visuels avec l\'IA',
      icon: IconPalette,
      tokenCost: '~1500 tokens/mockup',
      category: 'generation',
    },
    {
      key: 'smart_follow_up',
      label: 'Smart Follow-Up',
      description: 'Système de relances automatiques avec analyse IA',
      icon: IconRobot,
      tokenCost: '~400 tokens/email analysé',
      category: 'automation',
    },
    {
      key: 'ai_assistant',
      label: 'Assistant IA',
      description: 'Chat assistant pour vous aider dans vos tâches',
      icon: IconBrain,
      tokenCost: '~300 tokens/message',
      category: 'productivity',
    },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      updateFeatures(localFeatures);
      alert('✓ Paramètres IA enregistrés avec succès !');
      router.back();
    } catch (error) {
      console.error('Error saving AI features:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (category: FeatureCategory, enabled: boolean) => {
    const updates: AIFeaturesConfig = { ...localFeatures };
    aiFeatures
      .filter(f => f.category === category)
      .forEach(f => {
        updates[f.key] = enabled;
      });
    setLocalFeatures(updates);
  };

  const getCategoryLabel = (category: FeatureCategory) => {
    const labels: Record<FeatureCategory, string> = {
      productivity: 'Productivité',
      automation: 'Automatisation',
      generation: 'Génération de contenu',
    };
    return labels[category];
  };

  const getCategoryCount = (category: FeatureCategory) => {
    return aiFeatures.filter(f => f.category === category && localFeatures[f.key]).length;
  };

  const categoryGroups = {
    productivity: aiFeatures.filter(f => f.category === 'productivity'),
    automation: aiFeatures.filter(f => f.category === 'automation'),
    generation: aiFeatures.filter(f => f.category === 'generation'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <IconBrain className="w-12 h-12 text-accent mx-auto mb-4 animate-pulse" />
          <p className="text-muted">Chargement des paramètres IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
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
              <IconBrain className="w-8 h-8 text-accent" />
              Gestion des fonctionnalités IA
            </h1>
            <p className="text-muted">Activez/désactivez les features IA pour économiser vos tokens OpenAI</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
        >
          <IconDeviceFloppy className="w-5 h-5" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Warning */}
      <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-3">
        <IconAlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-warning mb-1">Optimisez votre consommation de tokens</h3>
          <p className="text-sm text-warning/80">
            Désactivez les fonctionnalités IA que vous n&apos;utilisez pas régulièrement pour économiser vos crédits OpenAI.
            Les paramètres sont sauvegardés localement dans votre navigateur.
          </p>
        </div>
      </div>

      {/* Categories */}
      {(Object.entries(categoryGroups) as Array<[FeatureCategory, AIFeatureInfo[]]>).map(([category, categoryFeatures]) => (
        <div key={category} className="bg-card border border-default rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-primary">
              {getCategoryLabel(category)}
              <span className="ml-3 text-sm font-normal text-muted">
                ({getCategoryCount(category)}/{categoryFeatures.length} activées)
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(category, true)}
                className="px-3 py-1.5 text-xs bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors"
              >
                Tout activer
              </button>
              <button
                onClick={() => toggleAll(category, false)}
                className="px-3 py-1.5 text-xs bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors"
              >
                Tout désactiver
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryFeatures.map((feature) => {
              const FeatureIcon = feature.icon;
              const isEnabled = localFeatures[feature.key];

              return (
                <div
                  key={feature.key}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-accent/5 border-accent/30'
                      : 'bg-secondary border-default hover:border-accent/20'
                  }`}
                  onClick={() => setLocalFeatures({ ...localFeatures, [feature.key]: !isEnabled })}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isEnabled ? 'bg-accent/20' : 'bg-muted'
                    }`}>
                      <FeatureIcon className={`w-5 h-5 ${isEnabled ? 'text-accent' : 'text-muted'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-primary">{feature.label}</h3>
                        <span onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              setLocalFeatures({ ...localFeatures, [feature.key]: checked });
                            }}
                          />
                        </span>
                      </div>
                      <p className="text-sm text-muted mb-2">{feature.description}</p>
                      <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                        {feature.tokenCost}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
          <IconBrain className="w-5 h-5" />
          {t('ai_how_it_works') || 'Comment ça fonctionne ?'}
        </h3>
        <ul className="text-sm text-blue-600/80 space-y-2">
          <li>• {t('ai_features_info_1')}</li>
          <li>• {t('ai_features_info_2')}</li>
          <li>• {t('ai_features_info_3')}</li>
          <li>• {t('ai_features_info_4')}</li>
        </ul>
      </div>
    </div>
  );
}
