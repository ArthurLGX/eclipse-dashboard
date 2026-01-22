import React, { useState, useEffect, useRef } from 'react';
import FloatingModal from '@/app/components/FloatingModal';
import {
  IconFolder,
  IconFileDescription,
  IconCalendar,
  IconCode,
  IconCheck,
  IconLoader2,
  IconFolderPlus,
  IconNote,
  IconUsers,
} from '@tabler/icons-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (project: CreateProjectData) => Promise<void>;
  clients: { id: number; name: string }[];
  t: (key: string) => string;
}

export interface CreateProjectData {
  title: string;
  description: string;
  project_status: 'planning' | 'in_progress' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  notes?: string;
  type: 'design' | 'development' | 'marketing' | 'consulting' | 'other';
  technologies?: string[];
  client?: number; // Optionnel - peut être assigné plus tard
}

const PROJECT_TYPES = [
  { value: 'development', label: '💻 Développement' },
  { value: 'design', label: '🎨 Design' },
  { value: 'maintenance', label: '🔧 Maintenance' },
];

const PROJECT_STATUS = [
  { value: 'planning', label: '📋 Planification' },
  { value: 'in_progress', label: '🚀 En cours' },
  { value: 'completed', label: '✅ Terminé' },
];

const TECHNOLOGIES = [
  'React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 
  'TypeScript', 'Python', 'PHP', 'Laravel', 'WordPress',
  'Figma', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'AWS'
];

export default function NewProjectModal({
  isOpen,
  onClose,
  onAdd,
  clients,
  t,
}: NewProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<CreateProjectData['project_status']>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<CreateProjectData['type']>('development');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus sur le premier champ à l'ouverture
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset du formulaire à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setProjectStatus('planning');
        setStartDate('');
        setEndDate('');
        setNotes('');
        setType('development');
        setTechnologies([]);
        setSelectedClient(undefined);
        setSuccess(false);
        setError(null);
      }, 300);
    }
  }, [isOpen]);

  // Date par défaut : aujourd'hui
  useEffect(() => {
    if (isOpen && !startDate) {
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onAdd({
        title,
        description,
        project_status: projectStatus,
        start_date: startDate,
        end_date: endDate,
        notes: notes || undefined,
        type,
        technologies: technologies.length > 0 ? technologies : undefined,
        client: selectedClient,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const toggleTechnology = (tech: string) => {
    setTechnologies(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  return (
    <FloatingModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      {/* Header compact */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-accent-light rounded-lg border border-accent">
          <IconFolderPlus size={22} className="!text-accent" />
        </div>
        <h2 className="text-xl font-bold text-primary">
          {t('new_project') || 'Nouveau projet'}
        </h2>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-3 p-2.5 bg-danger-light border border-danger rounded-lg text-danger text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Titre, Type et Client - 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconFolder size={14} className="text-muted" />
              {t('title') || 'Titre'} <span className="!text-accent">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              placeholder="Nom du projet..."
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconCode size={14} className="text-muted" />
              {t('type') || 'Type'} <span className="!text-accent">*</span>
            </label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value as CreateProjectData['type'])}
              className="input w-full px-3 py-2 text-sm cursor-pointer"
            >
              {PROJECT_TYPES.map(pt => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
              <IconUsers size={14} className="text-muted" />
              {t('client') || 'Client'} <span className="text-muted">(optionnel)</span>
            </label>
            <select
              value={selectedClient || ''}
              onChange={(e) => setSelectedClient(e.target.value ? Number(e.target.value) : undefined)}
              className="input w-full px-3 py-2 text-sm cursor-pointer"
            >
              <option value="">Non assigné</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description - compact */}
        <div>
          <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
            <IconFileDescription size={14} className="text-muted" />
            {t('description') || 'Description'} <span className="!text-accent">*</span>
          </label>
          <textarea
            placeholder="Objectifs, périmètre du projet..."
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full px-3 py-2 text-sm resize-y"
          />
        </div>

        {/* Statut et Dates - 3 colonnes compact */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-secondary text-xs mb-1.5 font-medium block">
              {t('status') || 'Statut'} <span className="!text-accent">*</span>
            </label>
            <select
              required
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value as CreateProjectData['project_status'])}
              className="input w-full px-3 py-2 text-sm cursor-pointer"
            >
              {PROJECT_STATUS.map(ps => (
                <option key={ps.value} value={ps.value}>{ps.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-secondary text-xs mb-1.5 font-medium">
              <IconCalendar size={12} className="text-muted" />
              Début <span className="!text-accent">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-secondary text-xs mb-1.5 font-medium">
              <IconCalendar size={12} className="text-muted" />
              Fin <span className="!text-accent">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Technologies - compact */}
        <div className="p-3 bg-muted rounded-lg border border-default">
          <label className="flex items-center gap-1.5 text-secondary text-xs mb-2 font-medium">
            <IconCode size={14} className="text-muted" />
            {t('technologies') || 'Technologies'} 
            <span className="text-muted">(optionnel)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TECHNOLOGIES.map(tech => (
              <button
                key={tech}
                type="button"
                onClick={() => toggleTechnology(tech)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors
                  ${technologies.includes(tech)
                    ? 'bg-accent text-accent'
                    : 'bg-hover text-secondary hover:bg-card hover:text-primary'
                  }`}
              >
                {tech}
              </button>
            ))}
          </div>
        </div>

        {/* Notes - compact */}
        <div>
          <label className="flex items-center gap-1.5 text-secondary text-xs mb-1.5 font-medium">
            <IconNote size={14} className="text-muted" />
            {t('notes') || 'Notes'} <span className="text-muted">(optionnel)</span>
          </label>
          <input
            type="text"
            placeholder="Notes internes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full px-3 py-2 text-sm"
          />
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-ghost flex-1 px-4 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel') || 'Annuler'}
          </button>
          <button
            type="submit"
            disabled={loading || !title || !description || !startDate || !endDate}
            className="btn-primary flex-1 px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                <span>Création...</span>
              </>
            ) : success ? (
              <>
                <IconCheck size={16} />
                <span>Créé !</span>
              </>
            ) : (
              <>
                <IconFolderPlus size={16} />
                <span>Créer le projet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </FloatingModal>
  );
}
