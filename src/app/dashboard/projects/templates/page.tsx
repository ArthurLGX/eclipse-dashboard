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
  IconClock,
  IconCheck,
  IconArrowLeft
} from '@tabler/icons-react';
import Link from 'next/link';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.dashboard.eclipsestudiodev.fr';

// Types
interface TemplateTask {
  title: string;
  description?: string;
  estimated_hours?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phase: string;
  order: number;
}

interface ProjectTemplate {
  id: number;
  documentId: string;
  name: string;
  description: string;
  project_type: string;
  estimated_duration_days: number;
  tasks: TemplateTask[];
  is_default: boolean;
}

// Default templates based on user's workflow
const DEFAULT_TEMPLATES: Partial<ProjectTemplate>[] = [
  {
    name: 'Site Vitrine Complet',
    description: 'Template complet pour la création d\'un site vitrine professionnel',
    project_type: 'website_vitrine',
    estimated_duration_days: 21,
    tasks: [
      // Phase 1: Maquettage
      { title: 'Brief créatif et recherche', description: 'Analyse des besoins, benchmark concurrence, définition de la direction artistique', estimated_hours: 4, priority: 'high', phase: 'Maquettage', order: 1 },
      { title: 'Maquette page d\'accueil', description: 'Design Figma de la homepage avec toutes les sections', estimated_hours: 8, priority: 'high', phase: 'Maquettage', order: 2 },
      { title: 'Maquettes pages secondaires', description: 'Design des pages À propos, Services, Contact, etc.', estimated_hours: 6, priority: 'medium', phase: 'Maquettage', order: 3 },
      { title: 'Design responsive (mobile/tablet)', description: 'Adaptation des maquettes pour tous les écrans', estimated_hours: 4, priority: 'medium', phase: 'Maquettage', order: 4 },
      { title: 'Validation maquettes client', description: 'Présentation et itérations avec le client', estimated_hours: 2, priority: 'high', phase: 'Maquettage', order: 5 },
      
      // Phase 2: Développement
      { title: 'Setup projet et environnement', description: 'Installation Next.js, configuration, hébergement de dev', estimated_hours: 2, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Intégration header/footer', description: 'Composants de navigation globaux', estimated_hours: 3, priority: 'high', phase: 'Développement', order: 7 },
      { title: 'Intégration page d\'accueil', description: 'Développement de toutes les sections de la homepage', estimated_hours: 8, priority: 'high', phase: 'Développement', order: 8 },
      { title: 'Intégration pages secondaires', description: 'Développement des autres pages', estimated_hours: 6, priority: 'medium', phase: 'Développement', order: 9 },
      { title: 'Formulaire de contact', description: 'Formulaire avec validation et envoi email', estimated_hours: 3, priority: 'medium', phase: 'Développement', order: 10 },
      { title: 'Animations et interactions', description: 'Micro-interactions, transitions, effets scroll', estimated_hours: 4, priority: 'low', phase: 'Développement', order: 11 },
      
      // Phase 3: SEO & Performance
      { title: 'Optimisation SEO technique', description: 'Meta tags, sitemap, robots.txt, structured data', estimated_hours: 3, priority: 'high', phase: 'SEO & Performance', order: 12 },
      { title: 'Optimisation images', description: 'Compression, lazy loading, formats modernes (WebP)', estimated_hours: 2, priority: 'medium', phase: 'SEO & Performance', order: 13 },
      { title: 'Test PageSpeed Insights', description: 'Audit et corrections pour score > 90', estimated_hours: 3, priority: 'medium', phase: 'SEO & Performance', order: 14 },
      { title: 'Configuration Google Analytics', description: 'GA4 + Google Search Console', estimated_hours: 1, priority: 'medium', phase: 'SEO & Performance', order: 15 },
      
      // Phase 4: Livraison
      { title: 'Tests cross-browser', description: 'Tests Chrome, Firefox, Safari, Edge', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 16 },
      { title: 'Tests responsives', description: 'Vérification sur différents appareils', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 17 },
      { title: 'Déploiement production', description: 'Mise en ligne, configuration DNS, SSL', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 18 },
      { title: 'Formation client', description: 'Documentation et formation à l\'utilisation', estimated_hours: 2, priority: 'medium', phase: 'Livraison', order: 19 },
      { title: 'Livraison finale', description: 'Remise des accès et documentation', estimated_hours: 1, priority: 'high', phase: 'Livraison', order: 20 },
    ],
  },
  {
    name: 'E-commerce Complet',
    description: 'Template pour la création d\'une boutique en ligne',
    project_type: 'website_ecommerce',
    estimated_duration_days: 45,
    tasks: [
      // Phase 1: Stratégie
      { title: 'Analyse catalogue produits', description: 'Structure des catégories, attributs, variantes', estimated_hours: 4, priority: 'high', phase: 'Stratégie', order: 1 },
      { title: 'Choix et configuration CMS', description: 'Shopify/WooCommerce/Medusa setup', estimated_hours: 4, priority: 'high', phase: 'Stratégie', order: 2 },
      
      // Phase 2: Design
      { title: 'Maquette homepage', estimated_hours: 8, priority: 'high', phase: 'Design', order: 3 },
      { title: 'Maquette page catégorie', estimated_hours: 4, priority: 'high', phase: 'Design', order: 4 },
      { title: 'Maquette fiche produit', estimated_hours: 6, priority: 'high', phase: 'Design', order: 5 },
      { title: 'Maquette panier/checkout', estimated_hours: 6, priority: 'high', phase: 'Design', order: 6 },
      { title: 'Maquette compte client', estimated_hours: 4, priority: 'medium', phase: 'Design', order: 7 },
      
      // Phase 3: Développement
      { title: 'Setup projet e-commerce', estimated_hours: 4, priority: 'high', phase: 'Développement', order: 8 },
      { title: 'Intégration catalogue', estimated_hours: 12, priority: 'high', phase: 'Développement', order: 9 },
      { title: 'Système de panier', estimated_hours: 8, priority: 'high', phase: 'Développement', order: 10 },
      { title: 'Intégration paiement (Stripe)', estimated_hours: 6, priority: 'high', phase: 'Développement', order: 11 },
      { title: 'Gestion des commandes', estimated_hours: 6, priority: 'high', phase: 'Développement', order: 12 },
      { title: 'Emails transactionnels', estimated_hours: 4, priority: 'medium', phase: 'Développement', order: 13 },
      
      // Phase 4: Optimisation
      { title: 'SEO e-commerce', estimated_hours: 4, priority: 'high', phase: 'Optimisation', order: 14 },
      { title: 'Configuration tracking e-commerce', estimated_hours: 3, priority: 'medium', phase: 'Optimisation', order: 15 },
      { title: 'Tests de paiement', estimated_hours: 3, priority: 'high', phase: 'Optimisation', order: 16 },
      
      // Phase 5: Livraison
      { title: 'Import produits', estimated_hours: 4, priority: 'high', phase: 'Livraison', order: 17 },
      { title: 'Formation back-office', estimated_hours: 4, priority: 'high', phase: 'Livraison', order: 18 },
      { title: 'Mise en production', estimated_hours: 3, priority: 'high', phase: 'Livraison', order: 19 },
    ],
  },
  {
    name: 'Refonte de site',
    description: 'Template pour la refonte d\'un site existant',
    project_type: 'redesign',
    estimated_duration_days: 28,
    tasks: [
      { title: 'Audit site existant', description: 'Analyse UX, technique, SEO du site actuel', estimated_hours: 4, priority: 'high', phase: 'Audit', order: 1 },
      { title: 'Analyse trafic et comportement', description: 'Étude Analytics, heatmaps, user flow', estimated_hours: 3, priority: 'high', phase: 'Audit', order: 2 },
      { title: 'Recommandations et plan d\'action', description: 'Document de préconisations', estimated_hours: 4, priority: 'high', phase: 'Audit', order: 3 },
      { title: 'Nouvelles maquettes', estimated_hours: 12, priority: 'high', phase: 'Design', order: 4 },
      { title: 'Migration contenu', description: 'Export/import du contenu existant', estimated_hours: 6, priority: 'medium', phase: 'Développement', order: 5 },
      { title: 'Développement nouveau site', estimated_hours: 24, priority: 'high', phase: 'Développement', order: 6 },
      { title: 'Redirections 301', description: 'Mapping anciennes vers nouvelles URLs', estimated_hours: 3, priority: 'high', phase: 'SEO', order: 7 },
      { title: 'Tests de non-régression', estimated_hours: 4, priority: 'high', phase: 'Tests', order: 8 },
      { title: 'Bascule production', estimated_hours: 2, priority: 'high', phase: 'Livraison', order: 9 },
    ],
  },
  {
    name: 'Audit SEO & Performance',
    description: 'Template pour un audit technique complet',
    project_type: 'seo_audit',
    estimated_duration_days: 7,
    tasks: [
      { title: 'Crawl technique du site', description: 'Screaming Frog, analyse structure', estimated_hours: 2, priority: 'high', phase: 'Audit technique', order: 1 },
      { title: 'Audit Core Web Vitals', description: 'LCP, FID, CLS sur toutes les pages clés', estimated_hours: 2, priority: 'high', phase: 'Audit technique', order: 2 },
      { title: 'Analyse SEO on-page', description: 'Titles, metas, H1, contenu', estimated_hours: 3, priority: 'high', phase: 'Audit SEO', order: 3 },
      { title: 'Audit backlinks', description: 'Ahrefs/Semrush, qualité des liens', estimated_hours: 2, priority: 'medium', phase: 'Audit SEO', order: 4 },
      { title: 'Analyse concurrentielle', description: 'Positionnement vs concurrents', estimated_hours: 3, priority: 'medium', phase: 'Audit SEO', order: 5 },
      { title: 'Rapport d\'audit', description: 'Document complet avec recommandations', estimated_hours: 4, priority: 'high', phase: 'Livrable', order: 6 },
      { title: 'Plan d\'action priorité', description: 'Roadmap d\'optimisations', estimated_hours: 2, priority: 'high', phase: 'Livrable', order: 7 },
    ],
  },
  {
    name: 'Maintenance mensuelle',
    description: 'Template pour le suivi maintenance récurrent',
    project_type: 'maintenance',
    estimated_duration_days: 30,
    tasks: [
      { title: 'Mises à jour CMS/plugins', description: 'MAJ sécurité et fonctionnelles', estimated_hours: 1, priority: 'high', phase: 'Maintenance', order: 1 },
      { title: 'Backup mensuel', description: 'Sauvegarde complète site + BDD', estimated_hours: 0.5, priority: 'high', phase: 'Maintenance', order: 2 },
      { title: 'Vérification sécurité', description: 'Scan malware, vérification SSL', estimated_hours: 0.5, priority: 'high', phase: 'Maintenance', order: 3 },
      { title: 'Monitoring uptime', description: 'Vérification disponibilité', estimated_hours: 0.5, priority: 'medium', phase: 'Monitoring', order: 4 },
      { title: 'Rapport performance', description: 'Evolution PageSpeed, Core Web Vitals', estimated_hours: 1, priority: 'medium', phase: 'Reporting', order: 5 },
      { title: 'Corrections mineures', description: 'Bug fixes et ajustements', estimated_hours: 2, priority: 'medium', phase: 'Support', order: 6 },
    ],
  },
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  website_vitrine: 'Site Vitrine',
  website_ecommerce: 'E-commerce',
  web_app: 'Application Web',
  mobile_app: 'Application Mobile',
  redesign: 'Refonte',
  maintenance: 'Maintenance',
  seo_audit: 'Audit SEO',
  custom: 'Personnalisé',
};

export default function ProjectTemplatesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [_modalOpen, setModalOpen] = useState(false);
  const [_editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${strapiUrl}/api/project-templates?filters[users][id][$eq]=${user?.id}&populate=*`, {
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
      return true;
    });
  }, [templates, searchTerm]);

  // Initialize with default templates
  const initializeDefaults = async () => {
    if (!confirm('Créer les templates de projet par défaut ?')) return;
    
    setLoading(true);
    try {
      for (const template of DEFAULT_TEMPLATES) {
        await fetch(`${strapiUrl}/api/project-templates`, {
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
      showGlobalPopup('Templates créés avec succès !', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error initializing templates:', error);
      showGlobalPopup('Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (template: ProjectTemplate) => {
    if (!confirm(`Supprimer le template "${template.name}" ?`)) return;
    
    try {
      await fetch(`${strapiUrl}/api/project-templates/${template.documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showGlobalPopup('Template supprimé', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showGlobalPopup('Erreur', 'error');
    }
  };

  // Duplicate template
  const handleDuplicateTemplate = async (template: ProjectTemplate) => {
    try {
      await fetch(`${strapiUrl}/api/project-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            name: `${template.name} (copie)`,
            description: template.description,
            project_type: template.project_type,
            estimated_duration_days: template.estimated_duration_days,
            tasks: template.tasks,
            users: [user?.id],
            publishedAt: new Date().toISOString(),
          },
        }),
      });
      showGlobalPopup('Template dupliqué', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      showGlobalPopup('Erreur', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/projects"
            className="p-2 hover:bg-hover rounded-lg transition-colors"
          >
            <IconArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <IconTemplate size={28} className="text-accent" />
            <div>
              <h1 className="text-2xl font-bold">{t('project_templates') || 'Templates de projet'}</h1>
              <p className="text-sm text-muted-foreground">
                {t('project_templates_desc') || 'Tâches pré-définies pour démarrer rapidement vos projets'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {templates.length === 0 && (
            <button
              onClick={initializeDefaults}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-hover"
            >
              <IconTemplate size={18} />
              Créer templates par défaut
            </button>
          )}
          <button
            onClick={() => { setEditingTemplate(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
          >
            <IconPlus size={18} />
            {t('new_template') || 'Nouveau template'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 p-4 bg-card rounded-lg border border-border">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search') || 'Rechercher...'}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg"
          />
        </div>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <IconTemplate size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun template trouvé</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div 
              key={template.documentId} 
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {PROJECT_TYPE_LABELS[template.project_type] || template.project_type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-1.5 hover:bg-hover rounded"
                      title="Dupliquer"
                    >
                      <IconCopy size={16} />
                    </button>
                    <button
                      onClick={() => { setEditingTemplate(template); setModalOpen(true); }}
                      className="p-1.5 hover:bg-hover rounded"
                      title="Modifier"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="p-1.5 hover:bg-hover rounded text-red-500"
                      title="Supprimer"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
                
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {template.description}
                  </p>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconClock size={14} />
                    {template.estimated_duration_days}j
                  </span>
                  <span className="flex items-center gap-1">
                    <IconCheck size={14} />
                    {template.tasks?.length || 0} tâches
                  </span>
                </div>
              </div>
              
              {/* Tasks preview */}
              <div className="p-3 bg-hover/30 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Aperçu des tâches</p>
                <div className="space-y-1">
                  {(template.tasks || []).slice(0, 5).map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="w-4 h-4 rounded bg-accent/10 flex items-center justify-center text-accent font-medium">
                        {idx + 1}
                      </div>
                      <span className="truncate text-foreground">{task.title}</span>
                      {task.estimated_hours && (
                        <span className="text-muted-foreground ml-auto">{task.estimated_hours}h</span>
                      )}
                    </div>
                  ))}
                  {(template.tasks?.length || 0) > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{(template.tasks?.length || 0) - 5} autres tâches...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

