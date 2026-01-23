'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { 
  IconTemplate, 
  IconPlus, 
  IconEdit, 
  IconTrash,
  IconCopy,
  IconSearch,
  IconX
} from '@tabler/icons-react';
import type { ProspectStatus } from '@/types';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.dashboard.eclipsestudiodev.fr';

// Types
interface EmailTemplate {
  id: number;
  documentId: string;
  name: string;
  subject: string;
  body: string;
  pipeline_stage: ProspectStatus | 'follow_up' | 'general';
  category: string;
  variables: string[];
  is_default: boolean;
  sort_order: number;
}

// Default templates for bootstrap
const DEFAULT_TEMPLATES: Partial<EmailTemplate>[] = [
  {
    name: 'Premier contact',
    subject: 'Développement web - {{company_name}}',
    body: `Bonjour {{prospect_name}},

Je me permets de vous contacter car j'ai découvert {{company_name}} et j'ai remarqué que votre présence digitale pourrait être améliorée.

En tant que développeur web freelance spécialisé dans la création de sites modernes et performants, je pourrais vous aider à :
- Créer un site vitrine professionnel
- Améliorer votre référencement (SEO)
- Optimiser la vitesse de chargement

Seriez-vous disponible pour un échange de 15 minutes cette semaine ?

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'new',
    category: 'prospect',
    variables: ['prospect_name', 'company_name', 'sender_name'],
  },
  {
    name: 'Envoi formulaire qualification',
    subject: 'Précisions sur votre projet - {{company_name}}',
    body: `Bonjour {{prospect_name}},

Suite à notre échange, j'ai préparé un court formulaire pour mieux comprendre vos besoins et vous proposer une solution adaptée.

👉 **Accédez au formulaire :** {{typeform_link}}

Cela ne prend que 5 minutes et me permettra de préparer une proposition sur-mesure pour {{company_name}}.

N'hésitez pas si vous avez des questions !

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'form_sent',
    category: 'prospect',
    variables: ['prospect_name', 'company_name', 'typeform_link', 'sender_name'],
  },
  {
    name: 'Accusé réception formulaire',
    subject: 'Merci pour votre réponse ! - {{company_name}}',
    body: `Bonjour {{prospect_name}},

Merci d'avoir pris le temps de remplir le formulaire de qualification !

J'ai bien reçu vos réponses et je prépare actuellement un devis personnalisé pour votre projet. Vous le recevrez d'ici 24-48h.

En attendant, n'hésitez pas à me faire part de toute question.

À très bientôt,
{{sender_name}}`,
    pipeline_stage: 'qualified',
    category: 'prospect',
    variables: ['prospect_name', 'company_name', 'sender_name'],
  },
  {
    name: 'Envoi devis',
    subject: 'Devis pour votre projet web - {{company_name}}',
    body: `Bonjour {{prospect_name}},

Comme convenu, voici le devis pour votre projet de développement web.

📄 **Devis n°{{quote_number}}**
💰 **Montant total : {{quote_amount}}**
📅 **Délai estimé : {{estimated_duration}}**

👉 **Consultez et validez le devis :** {{quote_link}}

Ce devis est valable 30 jours. N'hésitez pas à me contacter si vous avez des questions ou souhaitez ajuster certains éléments.

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'quote_sent',
    category: 'quote',
    variables: ['prospect_name', 'company_name', 'quote_number', 'quote_amount', 'estimated_duration', 'quote_link', 'sender_name'],
  },
  {
    name: 'Confirmation acceptation devis',
    subject: '🎉 Bienvenue ! Votre projet démarre - {{company_name}}',
    body: `Bonjour {{prospect_name}},

Je suis ravi de vous confirmer le démarrage de notre collaboration !

**Prochaines étapes :**
1. Réunion de lancement (à planifier)
2. Phase de maquettage
3. Développement
4. Tests et livraison

Je vous enverrai prochainement un lien pour choisir un créneau de réunion.

Merci pour votre confiance !
{{sender_name}}`,
    pipeline_stage: 'quote_accepted',
    category: 'client',
    variables: ['prospect_name', 'company_name', 'sender_name'],
  },
  {
    name: 'Envoi maquettes pour validation',
    subject: 'Maquettes prêtes pour validation - {{project_name}}',
    body: `Bonjour {{client_name}},

Les maquettes de votre projet {{project_name}} sont prêtes !

👉 **Accédez aux maquettes :** {{mockup_link}}

Merci de valider ou demander des modifications avant le {{deadline_date}}.

J'attends votre retour avec impatience !

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'in_progress',
    category: 'project',
    variables: ['client_name', 'project_name', 'mockup_link', 'deadline_date', 'sender_name'],
  },
  {
    name: 'Livraison projet',
    subject: '🚀 Votre site est en ligne ! - {{project_name}}',
    body: `Bonjour {{client_name}},

J'ai le plaisir de vous annoncer que votre site est maintenant en ligne !

🌐 **Votre site :** {{website_url}}

**Ce qui a été livré :**
{{deliverables}}

**Période de garantie :** Vous bénéficiez d'un mois de maintenance gratuite. N'hésitez pas à me signaler tout problème.

Merci pour votre confiance tout au long de ce projet !

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'delivered',
    category: 'project',
    variables: ['client_name', 'project_name', 'website_url', 'deliverables', 'sender_name'],
  },
  {
    name: 'Proposition maintenance',
    subject: 'Fin de garantie - Proposition accompagnement {{company_name}}',
    body: `Bonjour {{client_name}},

Votre période de garantie d'un mois touche à sa fin. J'espère que vous êtes satisfait de votre site !

Pour continuer à profiter d'un site performant et à jour, je vous propose un **accompagnement mensuel à 20€/mois** comprenant :
- Mises à jour de sécurité
- Corrections de bugs
- Optimisations SEO
- Support prioritaire

Souhaitez-vous en discuter ?

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'maintenance',
    category: 'follow_up',
    variables: ['client_name', 'company_name', 'sender_name'],
  },
  {
    name: 'Relance devis non répondu',
    subject: 'Relance - Votre projet web {{company_name}}',
    body: `Bonjour {{prospect_name}},

Je me permets de revenir vers vous concernant le devis envoyé le {{quote_date}}.

Avez-vous eu le temps de le consulter ? Je reste disponible pour en discuter ou l'ajuster selon vos besoins.

Le devis est valable jusqu'au {{expiry_date}}.

Cordialement,
{{sender_name}}`,
    pipeline_stage: 'follow_up',
    category: 'reminder',
    variables: ['prospect_name', 'company_name', 'quote_date', 'expiry_date', 'sender_name'],
  },
];

// Pipeline stage labels
const PIPELINE_LABELS: Record<string, string> = {
  new: 'Nouveau contact',
  form_sent: 'Formulaire envoyé',
  qualified: 'Qualifié',
  quote_sent: 'Devis envoyé',
  quote_accepted: 'Devis accepté',
  in_progress: 'En cours',
  delivered: 'Livré',
  maintenance: 'Maintenance',
  lost: 'Perdu',
  follow_up: 'Relance',
  general: 'Général',
};

// Modal pour créer/éditer un template
function TemplateModal({
  isOpen,
  onClose,
  template,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  onSave: (data: Partial<EmailTemplate>) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    pipeline_stage: template?.pipeline_stage || 'general',
    category: template?.category || 'prospect',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-muted rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b border-muted p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {template ? t('edit_template') || 'Modifier le template' : t('new_template') || 'Nouveau template'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg">
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">{t('template_name') || 'Nom du template'}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">{t('pipeline_stage') || 'Étape pipeline'}</label>
              <select
                value={formData.pipeline_stage}
                onChange={(e) => setFormData({ ...formData, pipeline_stage: e.target.value as ProspectStatus })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              >
                {Object.entries(PIPELINE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('category') || 'Catégorie'}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
              >
                <option value="prospect">Prospect</option>
                <option value="client">Client</option>
                <option value="quote">Devis</option>
                <option value="project">Projet</option>
                <option value="invoice">Facture</option>
                <option value="follow_up">Relance</option>
                <option value="reminder">Rappel</option>
                <option value="thank_you">Remerciement</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">{t('email_subject') || 'Objet'}</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg"
                placeholder="Ex: Devis pour {{company_name}}"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">{t('email_body') || 'Corps du message'}</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-2 bg-page border border-muted rounded-lg font-mono text-sm"
                rows={15}
                placeholder="Utilisez {{variable}} pour les champs dynamiques"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Variables disponibles :</strong> {'{{prospect_name}}'}, {'{{company_name}}'}, {'{{sender_name}}'}, {'{{quote_number}}'}, {'{{quote_amount}}'}, {'{{quote_link}}'}, etc.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-muted">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-muted rounded-lg hover:bg-hover">
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent disabled:opacity-50"
            >
              {loading ? '...' : (template ? t('save') || 'Enregistrer' : t('create') || 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmailTemplatesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${strapiUrl}/api/email-templates?filters[users][id][$eq]=${user?.id}&populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && token) {
      fetchTemplates();
    }
  }, [user?.id, token]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (stageFilter && t.pipeline_stage !== stageFilter) return false;
      return true;
    });
  }, [templates, searchTerm, stageFilter]);

  // Create/Update template
  const handleSaveTemplate = async (data: Partial<EmailTemplate>) => {
    try {
      const url = editingTemplate
        ? `${strapiUrl}/api/email-templates/${editingTemplate.documentId}`
        : `${strapiUrl}/api/email-templates`;
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            ...data,
            users: [user?.id],
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      showGlobalPopup(
        editingTemplate 
          ? t('template_updated') || 'Template mis à jour'
          : t('template_created') || 'Template créé',
        'success'
      );
      
      fetchTemplates();
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      showGlobalPopup(t('error_saving') || 'Erreur', 'error');
      throw error;
    }
  };

  // Delete template
  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!confirm(t('confirm_delete') || 'Supprimer ce template ?')) return;
    
    try {
      await fetch(`${strapiUrl}/api/email-templates/${template.documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showGlobalPopup(t('template_deleted') || 'Template supprimé', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showGlobalPopup(t('error_deleting') || 'Erreur', 'error');
    }
  };

  // Copy template content
  const handleCopyTemplate = async (template: EmailTemplate) => {
    try {
      await navigator.clipboard.writeText(template.body);
      showGlobalPopup(t('copied_to_clipboard') || 'Copié !', 'success');
    } catch {
      showGlobalPopup(t('copy_failed') || 'Erreur', 'error');
    }
  };

  // Initialize with default templates
  const initializeDefaults = async () => {
    if (!confirm(t('init_default_templates') || 'Créer les templates par défaut ?')) return;
    
    setLoading(true);
    try {
      for (const template of DEFAULT_TEMPLATES) {
        await fetch(`${strapiUrl}/api/email-templates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: {
              ...template,
              users: [user?.id],
              is_default: true,
              publishedAt: new Date().toISOString(),
            },
          }),
        });
      }
      showGlobalPopup(t('templates_initialized') || 'Templates créés !', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error initializing templates:', error);
      showGlobalPopup(t('error') || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconTemplate size={28} className="!text-accent" />
          <div>
            <h1 className="text-2xl font-bold">{t('email_templates') || 'Templates d\'emails'}</h1>
            <p className="text-sm text-muted-foreground">
              {t('email_templates_desc') || 'Emails pré-écrits pour chaque étape du pipeline'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {templates.length === 0 && (
            <button
              onClick={initializeDefaults}
              className="flex items-center gap-2 px-4 py-2 border border-muted rounded-lg hover:bg-hover"
            >
              <IconTemplate size={18} />
              {t('init_defaults') || 'Créer les templates par défaut'}
            </button>
          )}
          <button
            onClick={() => { setEditingTemplate(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent"
          >
            <IconPlus size={18} />
            {t('new_template') || 'Nouveau template'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border border-muted">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search') || 'Rechercher...'}
            className="w-full !pl-9 !pr-3 py-2 bg-page border border-muted rounded-lg"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 bg-page border border-muted rounded-lg"
        >
          <option value="">{t('all_stages') || 'Toutes les étapes'}</option>
          {Object.entries(PIPELINE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <IconTemplate size={48} className="mx-auto mb-4 opacity-30" />
          <p>{t('no_templates') || 'Aucun template trouvé'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div 
              key={template.documentId} 
              className="bg-card border border-muted rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-light !text-accent">
                    {PIPELINE_LABELS[template.pipeline_stage] || template.pipeline_stage}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopyTemplate(template)}
                    className="p-1.5 hover:bg-hover rounded"
                    title={t('copy') || 'Copier'}
                  >
                    <IconCopy size={16} />
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(template); setModalOpen(true); }}
                    className="p-1.5 hover:bg-hover rounded"
                    title={t('edit') || 'Modifier'}
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template)}
                    className="p-1.5 hover:bg-hover rounded text-red-500"
                    title={t('delete') || 'Supprimer'}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                <strong>{t('subject') || 'Objet'}:</strong> {template.subject}
              </p>
              
              <p className="text-xs text-muted-foreground line-clamp-3">
                {template.body.substring(0, 150)}...
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TemplateModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}

