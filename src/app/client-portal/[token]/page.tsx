'use client';

import React, { useState, useEffect, use } from 'react';
import { 
  IconCheck,
  IconMessageCircle,
  IconPhoto,
  IconProgress,
  IconAlertTriangle,
  IconCircleCheck,
  IconArrowLeft,
  IconArrowRight
} from '@tabler/icons-react';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.dashboard.eclipsestudiodev.fr';

interface Mockup {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  status: 'pending' | 'approved' | 'changes_requested';
  comments?: Array<{
    id: string;
    text: string;
    author: string;
    created_at: string;
    x?: number;
    y?: number;
  }>;
}

interface ProjectShareData {
  share_token: string;
  link_type: 'view_only' | 'mockup_review' | 'deliverable_validation';
  validation_status: 'pending' | 'approved' | 'changes_requested';
  validated_at?: string;
  validated_by_name?: string;
  show_progress: boolean;
  show_tasks: boolean;
  show_mockups: boolean;
  allow_comments: boolean;
  allow_validation: boolean;
  mockups: Mockup[];
  project: {
    title: string;
    description?: string;
    progress?: number;
    client?: {
      name: string;
    };
    tasks?: Array<{
      title: string;
      status: string;
      progress: number;
    }>;
  };
  provider?: {
    name: string;
    logo?: string;
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  
  const [data, setData] = useState<ProjectShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMockupIndex, setCurrentMockupIndex] = useState(0);
  const [validationModal, setValidationModal] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  
  // Form
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [validationAction, setValidationAction] = useState<'approve' | 'request_changes'>('approve');
  const [comments, setComments] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${strapiUrl}/api/project-share-links/public/${token}`);
        const result = await response.json();
        
        if (result.data) {
          setData(result.data);
        } else {
          setError('Lien invalide ou expiré');
        }
      } catch {
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const handleValidation = async () => {
    if (!clientName || !clientEmail) return;
    
    setValidating(true);
    try {
      const response = await fetch(`${strapiUrl}/api/project-share-links/public/${token}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: validationAction,
          client_name: clientName,
          client_email: clientEmail,
          comments: comments,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setValidationSuccess(true);
        setValidationModal(false);
      } else {
        setError(result.message || 'Erreur lors de la validation');
      }
    } catch {
      setError('Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <IconAlertTriangle size={64} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Lien invalide</h1>
          <p className="text-slate-600">{error || 'Ce lien de partage est invalide ou a expiré.'}</p>
        </div>
      </div>
    );
  }

  if (validationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <IconCircleCheck size={64} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {validationAction === 'approve' ? 'Maquettes validées !' : 'Modifications demandées'}
          </h1>
          <p className="text-slate-600 mb-4">
            {validationAction === 'approve' 
              ? 'Merci pour votre validation. Nous allons poursuivre le développement.'
              : 'Nous avons bien reçu vos retours et allons procéder aux modifications.'}
          </p>
        </div>
      </div>
    );
  }

  const currentMockup = data.mockups?.[currentMockupIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{data.project.title}</h1>
            {data.project.client && (
              <p className="text-sm text-slate-600">Client: {data.project.client.name}</p>
            )}
          </div>
          {data.provider?.logo && (
            <img src={data.provider.logo} alt={data.provider.name} className="h-10" />
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress */}
        {data.show_progress && data.project.progress !== undefined && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <IconProgress size={20} className="text-violet-500" />
                Progression du projet
              </span>
              <span className="text-lg font-bold text-violet-600">{data.project.progress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${data.project.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tasks */}
        {data.show_tasks && data.project.tasks && data.project.tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <IconCheck size={20} className="text-green-500" />
              Avancement des tâches
            </h2>
            <div className="space-y-3">
              {data.project.tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    task.status === 'completed' 
                      ? 'bg-green-100 text-green-600' 
                      : task.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {task.status === 'completed' ? <IconCheck size={14} /> : <span className="text-xs">{idx + 1}</span>}
                  </div>
                  <span className={`flex-1 ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mockups Gallery */}
        {data.show_mockups && data.mockups && data.mockups.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <IconPhoto size={20} className="text-violet-500" />
                Maquettes à valider ({data.mockups.length})
              </h2>
              {data.validation_status !== 'pending' && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.validation_status === 'approved' 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {data.validation_status === 'approved' ? 'Validé' : 'Modifications demandées'}
                </span>
              )}
            </div>

            {currentMockup && (
              <div className="relative">
                {/* Image viewer */}
                <div className="aspect-video bg-slate-900 flex items-center justify-center relative group">
                  <img 
                    src={currentMockup.url} 
                    alt={currentMockup.title}
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  {/* Navigation */}
                  {data.mockups.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentMockupIndex(Math.max(0, currentMockupIndex - 1))}
                        disabled={currentMockupIndex === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white disabled:opacity-30"
                      >
                        <IconArrowLeft size={20} />
                      </button>
                      <button
                        onClick={() => setCurrentMockupIndex(Math.min(data.mockups.length - 1, currentMockupIndex + 1))}
                        disabled={currentMockupIndex === data.mockups.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white disabled:opacity-30"
                      >
                        <IconArrowRight size={20} />
                      </button>
                    </>
                  )}
                </div>

                {/* Mockup info */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800">{currentMockup.title}</h3>
                      {currentMockup.description && (
                        <p className="text-sm text-slate-600">{currentMockup.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">
                      {currentMockupIndex + 1} / {data.mockups.length}
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                {data.mockups.length > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto">
                    {data.mockups.map((mockup, idx) => (
                      <button
                        key={mockup.id}
                        onClick={() => setCurrentMockupIndex(idx)}
                        className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentMockupIndex 
                            ? 'border-violet-500 ring-2 ring-violet-200' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={mockup.thumbnail || mockup.url} 
                          alt={mockup.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Validation buttons */}
        {data.allow_validation && data.validation_status === 'pending' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Votre décision</h2>
            <p className="text-slate-600 mb-6">
              Après avoir examiné les maquettes, veuillez valider ou demander des modifications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => { setValidationAction('approve'); setValidationModal(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                <IconCheck size={20} />
                Valider les maquettes
              </button>
              <button
                onClick={() => { setValidationAction('request_changes'); setValidationModal(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-100 text-amber-800 rounded-xl font-semibold hover:bg-amber-200 transition-colors"
              >
                <IconMessageCircle size={20} />
                Demander des modifications
              </button>
            </div>
          </div>
        )}

        {/* Already validated */}
        {data.validation_status !== 'pending' && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <IconCircleCheck size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              {data.validation_status === 'approved' ? 'Maquettes validées' : 'Modifications demandées'}
            </h2>
            {data.validated_by_name && (
              <p className="text-slate-600">
                Par {data.validated_by_name} le {data.validated_at ? formatDate(data.validated_at) : ''}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Validation Modal */}
      {validationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setValidationModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {validationAction === 'approve' ? 'Valider les maquettes' : 'Demander des modifications'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Votre nom *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Votre email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
              
              {validationAction === 'request_changes' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vos retours et demandes</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                    rows={4}
                    placeholder="Décrivez les modifications souhaitées..."
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setValidationModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidation}
                  disabled={validating || !clientName || !clientEmail}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                    validationAction === 'approve'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {validating ? '...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

