'use client';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Modal from '@/app/components/Modal';
import FactureApercu from '@/app/components/FactureApercu';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import {
  fetchFacturesUserById,
  fetchCompanyUser,
  fetchClientsUser,
  fetchProjectsUser,
  updateFactureById,
  createFacture,
  fetchFactureFromDocumentId,
} from '@/lib/api';
import { clearCache } from '@/hooks/useApi';
import { extractIdFromSlug } from '@/utils/slug';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import {
  Facture,
  Company,
  Client,
  Project,
  InvoiceLine,
  User,
  Currency,
} from '@/app/models/Models';
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';
import {
  IconEdit,
  IconTrash,
  IconMail,
  IconDownload,
  IconCalculator,
  IconSparkles,
} from '@tabler/icons-react';
import AIInvoiceGenerator from '@/app/components/AIInvoiceGenerator';
import { useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import FacturePDF from '@/app/components/FacturePDF';

export default function FacturePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { showGlobalPopup } = usePopup();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  
  // Extraire l'ID du slug ou utiliser directement l'ID
  const rawId = params.id as string;
  const extractedId = extractIdFromSlug(rawId);
  const id = extractedId || rawId;
  const edit = params.edit;
  
  // Client prérempli depuis l'URL (quand on vient de la page client)
  const prefilledClientId = searchParams.get('clientId');
  const prefilledClientName = searchParams.get('clientName');
  // Type de document (quote ou invoice)
  const documentType = searchParams.get('type') === 'quote' ? 'quote' : 'invoice';

  const [showPreview, setShowPreview] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  
  // Déterminer si on est en mode création
  const isCreationMode = rawId.toLowerCase() === 'add' || rawId.toLowerCase() === 'ajouter' || rawId.toLowerCase() === 'new' || rawId.toLowerCase() === t('add').toLowerCase();
  
  // Mettre à jour le titre de l'onglet avec la référence de la facture
  useDocumentTitle(facture?.reference, { prefix: t('invoice') });
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Facture | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tvaApplicable, setTvaApplicable] = useState<boolean>(
    facture?.tva_applicable ?? true
  );
  // Calculs automatiques - utilise le taux de TVA des préférences
  const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0);
  const tvaRate = preferences.invoice.defaultTaxRate;
  const tvaAmount = subtotal * (tvaRate / 100);
  const total = tvaApplicable ? subtotal + tvaAmount : subtotal;

  const factureRef = useRef<HTMLDivElement>(null);

  // Facture vide pour création
  const emptyClient: Client = {
    id: 0,
    documentId: '',
    name: '',
    email: '',
    number: '',
    enterprise: '',
    adress: '',
    website: '',
    processStatus: '',
    client_id: '',
    createdAt: '',
    updatedAt: '',
    publishedAt: '',
    isActive: false,
    projects: [],
    factures: [],
  };
  const emptyProject: Project = {
    id: 0,
    documentId: '',
    title: '',
    description: '',
    project_status: 'planning',
    start_date: '',
    end_date: '',
    notes: '',
    type: 'development',
    createdAt: '',
    updatedAt: '',
    publishedAt: '',
  };
  const emptyUser: User = {
    id: 0,
    documentId: '',
    username: '',
    email: '',
    provider: '',
    confirmed: false,
    blocked: false,
    createdAt: '',
    updatedAt: '',
    publishedAt: '',
    max_ca: 0,
    profile_picture: { id: 0, url: '' },
    role: {
      id: 0,
      documentId: '',
      name: '',
      description: '',
      type: '',
      createdAt: '',
      updatedAt: '',
      publishedAt: '',
    },
  };
  // Calcul de la date d'échéance par défaut selon les préférences
  const today = new Date();
  const defaultDueDate = new Date(today);
  defaultDueDate.setDate(today.getDate() + preferences.invoice.defaultPaymentDays);
  
  const emptyFacture: Facture = {
    id: 0,
    documentId: '',
    document_type: documentType,
    reference: preferences.invoice.autoNumbering ? `${documentType === 'quote' ? preferences.invoice.quotePrefix || 'DEV-' : preferences.invoice.invoicePrefix}${Date.now().toString().slice(-6)}` : '',
    date: today.toISOString().split('T')[0],
    due_date: defaultDueDate.toISOString().split('T')[0],
    facture_status: 'draft',
    number: 0,
    currency: preferences.format.currency as Currency,
    description: '',
    notes: preferences.invoice.legalMentions || '',
    createdAt: '',
    updatedAt: '',
    publishedAt: '',
    client_id: emptyClient,
    project: emptyProject,
    pdf: [],
    user: emptyUser,
    invoice_lines: [],
    tva_applicable: preferences.invoice.defaultTaxRate > 0,
  };

  useEffect(() => {
    const fetchFacture = async () => {
   
      // Mode création - comparaison insensible à la casse
      const rawIdLower = rawId.toLowerCase();
      if (rawIdLower === 'add' || rawIdLower === 'ajouter' || rawIdLower === 'new' || rawIdLower === t('add').toLowerCase()) {
        setEditing(true);
        
        // Préremplir le client si fourni dans l'URL
        const factureWithClient = {
          ...emptyFacture,
          client_id: prefilledClientId ? {
            ...emptyClient,
            id: Number(prefilledClientId),
            name: prefilledClientName || '',
          } : emptyClient,
        };
        
        setFacture(factureWithClient);
        setFormData(factureWithClient);
        setInvoiceLines([]);
        setIsLoading(false);
        return;
      }
      
      try {
        // Utiliser le documentId extrait du slug
        const documentIdToFetch = extractedId || id;
        const factureData = await fetchFactureFromDocumentId(documentIdToFetch as string);
        
        const typedData = factureData as { data?: Facture[] };
      
        
        if (typedData?.data && typedData.data[0]) {
          setFacture(typedData.data[0]);
          setFormData(typedData.data[0]);
          if (edit === '1') {
            setEditing(true);
          }
          setInvoiceLines(typedData.data[0]?.invoice_lines || []);
        } else {
        }
        setIsLoading(false);
      } catch (error) {
        console.error('🔍 [FACTURE DEBUG] ❌ Erreur lors de la récupération de la facture:', error);
        showGlobalPopup(t('error_fetching_facture'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCompany = async () => {
      if (!user?.id) return;
      try {
        const companyResponse = await fetchCompanyUser(user.id) as { data?: Company[] };
        if (companyResponse?.data && companyResponse.data.length > 0) {
          setCompany(companyResponse.data[0]);
        }
      } catch {
        // Silencieux - les données de l'entreprise sont optionnelles
      }
    };

    const fetchClientsAndProjects = async () => {
      if (!user?.id) return;
      try {
        const clientsRes = await fetchClientsUser(user.id) as { data?: Client[] };
        setClients(clientsRes?.data || []);
        const projectsRes = await fetchProjectsUser(user.id) as { data?: Project[] };
        setProjects(projectsRes?.data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des clients/projets', error);
      }
    };

    fetchFacture();
    fetchCompany();
    fetchClientsAndProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawId, id, user?.id, prefilledClientId, prefilledClientName]);

  useEffect(() => {
    if (facture) setTvaApplicable(facture.tva_applicable ?? true);
  }, [facture]);

  const handleEdit = () => {
    setEditing(true);
    showGlobalPopup('Mode édition activé', 'info');
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData(facture);
    setInvoiceLines(facture?.invoice_lines || []);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Gestion des lignes de facture
  const handleLineChange = (
    index: number,
    field: keyof InvoiceLine,
    value: string | number
  ) => {
    const updatedLines = [...invoiceLines];
    if (field === 'quantity' || field === 'unit_price') {
      updatedLines[index][field] = Number(value) as never;
    } else {
      updatedLines[index][field] = value as never;
    }
    updatedLines[index].total =
      updatedLines[index].quantity * updatedLines[index].unit_price;
    setInvoiceLines(updatedLines);
  };

  const handleAddLine = () => {
    setInvoiceLines([
      ...invoiceLines,
      { id: Date.now(), description: '', quantity: 1, unit_price: 0, total: 0, unit: 'hour' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    const updatedLines = [...invoiceLines];
    updatedLines.splice(index, 1);
    setInvoiceLines(updatedLines);
  };

  const handleSave = async () => {
    try {
      const cleanLines = invoiceLines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total: line.total,
      }));

      const idLower = id.toLowerCase();
      if (idLower === 'add' || idLower === 'ajouter' || idLower === 'new' || idLower === t('add').toLowerCase()) {
        // Création d'une nouvelle facture - Strapi v5: utiliser documentId pour les relations
        await createFacture({
          reference: formData?.reference ?? '',
          number: total, // Montant total calculé automatiquement (avec ou sans TVA)
          date: formData?.date ?? '',
          due_date: formData?.due_date ?? '',
          facture_status: formData?.facture_status ?? '',
          currency: formData?.currency ?? '',
          description: formData?.description ?? '',
          notes: formData?.notes ?? '',
          client_id: formData?.client_id?.documentId ?? '',
          project: formData?.project?.documentId ?? '',
          user: user?.id ?? 0,
          tva_applicable: tvaApplicable,
          invoice_lines: cleanLines,
          pdf: facture?.pdf?.[0]?.url ?? '',
        });
        showGlobalPopup('Facture créée', 'success');
        setEditing(false);
        // Rediriger vers la liste ou la nouvelle facture si besoin
        return;
      }

      // Vérifier que la facture et formData existent avant de mettre à jour
      if (!facture?.documentId) {
        showGlobalPopup('Erreur: facture non trouvée', 'error');
        return;
      }
      
      if (!formData) {
        showGlobalPopup('Erreur: données du formulaire manquantes', 'error');
        return;
      }

      await updateFactureById(facture.documentId, {
        reference: formData.reference || facture.reference,
        number: total, // Montant total calculé automatiquement (avec ou sans TVA)
        date: formData.date || facture.date,
        due_date: formData.due_date || facture.due_date,
        facture_status: formData.facture_status || facture.facture_status,
        currency: formData.currency || facture.currency,
        description: formData.description ?? '',
        notes: formData.notes ?? '',
        // Strapi v5: utiliser documentId pour les relations
        client_id: formData.client_id?.documentId || '',
        project: formData.project?.documentId || '',
        user: user?.id ?? 0,
        tva_applicable: tvaApplicable,
        invoice_lines: cleanLines,
      });

      // Invalider le cache et recharger la facture
      clearCache('factures');
      
      const refreshed = await fetchFacturesUserById(
        user?.id ?? 0,
        facture?.documentId ?? ''
      ) as { data?: Facture[] };
      const refreshedFacture = refreshed?.data?.[0];
      if (refreshedFacture) {
        setFacture(refreshedFacture);
        setFormData(refreshedFacture);
        setInvoiceLines(refreshedFacture.invoice_lines || []);
      }
      showGlobalPopup('Facture mise à jour', 'success');
      setEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la facture:', error);
      showGlobalPopup('Erreur lors de la mise à jour de la facture', 'error');
    }
  };

  const handleDelete = () => {
    if (confirm('Êtes-vous s&apos;ur de vouloir supprimer cette facture ?')) {
      showGlobalPopup('Facture supprimée', 'success');
      // Logique de suppression à implémenter
    }
  };

  // Handler pour les données générées par l'IA
  const handleAIGenerated = (data: {
    clientName?: string;
    clientEnterprise?: string;
    clientEmail?: string;
    matchedClientId?: number;
    matchedClientDocumentId?: string;
    projectTitle?: string;
    projectDescription?: string;
    lines: InvoiceLine[];
    notes?: string;
    totalEstimate: number;
    suggestedDueDate?: string;
    tvaApplicable: boolean;
    tvaRate: number;
    currency: string;
    confidence: number;
  }) => {
    // Mettre à jour les lignes de facture
    setInvoiceLines(data.lines);
    
    // Mettre à jour la TVA
    setTvaApplicable(data.tvaApplicable);
    
    // Trouver le client correspondant si matchedClientId
    if (data.matchedClientId) {
      const matchedClient = clients.find(c => c.id === data.matchedClientId);
      if (matchedClient) {
        setFormData(prev => prev ? { ...prev, client_id: matchedClient } : prev);
      }
    }
    
    // Mettre à jour les notes si fournies
    if (data.notes) {
      setFormData(prev => prev ? { 
        ...prev, 
        notes: data.notes || prev.notes,
        description: data.projectTitle || prev.description,
      } : prev);
    }
    
    // Mettre à jour la date d'échéance si fournie
    if (data.suggestedDueDate) {
      setFormData(prev => prev ? { ...prev, due_date: data.suggestedDueDate! } : prev);
    }
    
    showGlobalPopup(t('ai_invoice_success'), 'success');
  };

  const handleSendEmail = () => {
    if (!facture) {
      showGlobalPopup('Erreur: facture non trouvée', 'error');
      return;
    }
    
    // Rediriger vers la page d'envoi d'email avec la facture pré-sélectionnée
    const params = new URLSearchParams({
      invoiceId: facture.documentId || facture.id.toString(),
    });
    
    window.location.href = `/dashboard/emails/invoice?${params.toString()}`;
  };

  const handleDownloadPDF = async () => {
    if (!facture) {
      showGlobalPopup('Erreur: facture non trouvée', 'error');
      return;
    }

    try {
      showGlobalPopup('Génération du PDF en cours...', 'info');

      // Générer le PDF avec @react-pdf/renderer
      const blob = await pdf(
        <FacturePDF
          facture={facture}
          company={company}
          invoiceLines={invoiceLines}
          tvaApplicable={tvaApplicable}
          tvaRate={tvaRate}
          tvaAmount={tvaAmount}
          subtotal={subtotal}
          total={total}
        />
      ).toBlob();

      // Créer le lien de téléchargement
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facture_${facture.reference || 'sans-reference'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showGlobalPopup('PDF téléchargé avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      showGlobalPopup('Erreur lors de la génération du PDF', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-6"
    >
      {/* Header avec actions */}
      <div className="max-w-4xl mx-auto rounded-lg flex flex-col gap-4 overflow-hidden  ">
        <div className="flex lg:flex-row flex-col gap-2 justify-end">
          {!editing ? (
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 bg-accent-light text-accent border border-accent px-4 py-2 rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
            >
              <IconEdit className="w-4 h-4" />
              {t('edit')}
            </button>
          ) : (
            <>
              {/* Bouton AI - uniquement en mode création */}
              {isCreationMode && (
                <button
                  onClick={() => setShowAIGenerator(true)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-500 border border-purple-500/20 px-4 py-2 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
                >
                  <IconSparkles className="w-4 h-4" />
                  {t('ai_invoice_button')}
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                {t('save')}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 bg-muted text-secondary border border-default px-4 py-2 rounded-lg hover:bg-card transition-colors"
              >
                {t('cancel')}
              </button>
            </>
          )}
          {!editing && (
            <>
              <button
                onClick={handleSendEmail}
                className="flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <IconMail className="w-4 h-4" />
                {t('send_email')}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <IconDownload className="w-4 h-4" />
                {t('download_pdf')}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <IconTrash className="w-4 h-4" />
                {t('delete')}
              </button>
            </>
          )}
        </div>

        {/* Contenu de la facture */}
        <div ref={factureRef} className="print-area">
          <div className="p-8 !bg-white rounded-lg flex flex-col gap-4 shadow-lg">
            {/* Champs principaux modifiables */}
            <div className="flex items-center gap-2 mb-4">
              <label className="font-medium">{t('vat_applicable')}</label>
              <input
                type="checkbox"
                checked={tvaApplicable}
                onChange={e => {
                  setTvaApplicable(e.target.checked);
                  setFormData({
                    ...formData!,
                    tva_applicable: e.target.checked,
                  });
                }}
                className="toggle toggle-success"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800 ">
                  {t('reference')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="reference"
                    value={formData?.reference || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.reference}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('status')}
                </label>
                {editing ? (
                  <select
                    name="facture_status"
                    value={formData?.facture_status || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  >
                    <option value="draft">{t('draft')}</option>
                    <option value="sent">{t('sent')}</option>
                    <option value="paid">{t('paid')}</option>
                  </select>
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {t(facture?.facture_status || '')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('emission_date')}
                </label>
                {editing ? (
                  <input
                    type="date"
                    name="date"
                    value={formData?.date ? formData.date.slice(0, 10) : ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.date
                      ? new Date(facture.date).toLocaleDateString('fr-FR')
                      : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('due_date')}
                </label>
                {editing ? (
                  <input
                    type="date"
                    name="due_date"
                    value={
                      formData?.due_date ? formData.due_date.slice(0, 10) : ''
                    }
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.due_date
                      ? new Date(facture.due_date).toLocaleDateString('fr-FR')
                      : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('currency')}
                </label>
                {editing ? (
                  <select
                    name="currency"
                    value={formData?.currency || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.currency}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('client')}
                </label>
                {editing ? (
                  <select
                    name="client_id"
                    value={formData?.client_id?.id || ''}
                    onChange={e => {
                      const client = clients.find(
                        c => c.id === Number(e.target.value)
                      );
                      setFormData({ ...formData!, client_id: client! });
                    }}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  >
                    <option value="">{t('select_client')}</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.client_id?.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('project')}
                </label>
                {editing ? (
                  <div className="flex gap-2">
                    <select
                      name="project"
                      value={formData?.project?.id || ''}
                      onChange={e => {
                        const project = projects.find(
                          p => p.id === Number(e.target.value)
                        );
                        setFormData({ ...formData!, project: project! });
                      }}
                        className="input border flex-1 rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                    >
                      <option value="">{t('select_project')}</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => window.open('/dashboard/projects?new=1', '_blank')}
                      className="px-3 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium whitespace-nowrap"
                      title={t('create_new_project') || 'Créer un nouveau projet'}
                    >
                      + {t('new_project') || 'Nouveau'}
                    </button>
                  </div>
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.project?.title || '-'}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 !text-zinc-800">
                  {t('notes')}
                </label>
                {editing ? (
                  <textarea
                    name="notes"
                    value={formData?.notes || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-800 text-sm font-semibold">
                    {facture?.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Lignes de facture modifiables */}
            <div className="bg-zinc-50 rounded-lg overflow-hidden mb-8 border border-zinc-100">
              <div className="bg-zinc-700/20 px-6 py-4 flex lg:flex-row flex-col items-center justify-between">
                <h3 className="!text-xl font-semibold !text-black">
                  {t('services')}
                </h3>
                {editing && (
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="bg-black !text-white border border-black px-3 py-1 rounded-lg hover:bg-black/80 transition-colors"
                  >
                    + {t('add_line')}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-700/10">
                    <tr>
                      <th className="!text-left !bg-zinc-200 p-4 !text-zinc-800 font-bold">
                        {t('description')}
                      </th>
                      <th className="!text-center !bg-zinc-200 p-4 !text-zinc-800 font-bold">
                        {t('unit_type')}
                      </th>
                      <th className="!text-right !bg-zinc-200 p-4 !text-zinc-800 font-bold">
                        {t('quantity')}
                      </th>
                      <th className="!text-right !bg-zinc-200 p-4 !text-zinc-800 font-bold">
                        {t('unit_price')}
                      </th>
                      <th className="!text-right !bg-zinc-200 p-4 !text-zinc-800 font-bold">
                        {t('total')}
                      </th>
                      {editing && <th className="!bg-zinc-200 p-4 !text-zinc-800 font-bold"></th>}
                    </tr>
                  </thead>
                  <tbody className="!bg-zinc-100">
                    {invoiceLines.map((line, index) => {
                      const getUnitLabel = (unit?: string) => {
                        switch (unit) {
                          case 'hour': return 'h';
                          case 'day': return 'j';
                          case 'fixed': return '';
                          case 'unit': return 'u';
                          default: return 'h';
                        }
                      };
                      const getUnitDisplay = (unit?: string) => {
                        switch (unit) {
                          case 'hour': return t('billing_hour');
                          case 'day': return t('billing_day');
                          case 'fixed': return t('billing_fixed');
                          case 'unit': return t('billing_unit');
                          default: return t('billing_hour');
                        }
                      };
                      return (
                      <tr
                        key={line.id}
                        className={
                          index % 2 === 0 ? '!bg-zinc-200/10' : '!bg-zinc-300/10'
                        }
                      >
                        <td className="!bg-zinc-100 p-4 !text-zinc-900">
                          {editing ? (
                            <input
                              type="text"
                              value={line.description}
                              onChange={e =>
                                handleLineChange(
                                  index,
                                  'description',
                                  e.target.value
                                )
                              }
                              className="input border w-full rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                            />
                          ) : (
                            line.description
                          )}
                        </td>
                        <td className="!bg-zinc-100 p-4 !text-center !text-zinc-900">
                          {editing ? (
                            <select
                              value={line.unit || 'hour'}
                              onChange={e =>
                                handleLineChange(
                                  index,
                                  'unit',
                                  e.target.value
                                )
                              }
                              className="input border rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                            >
                              <option value="hour">{t('billing_hour')}</option>
                              <option value="day">{t('billing_day')}</option>
                              <option value="fixed">{t('billing_fixed')}</option>
                              <option value="unit">{t('billing_unit')}</option>
                            </select>
                          ) : (
                            getUnitDisplay(line.unit)
                          )}
                        </td>
                        <td className="!bg-zinc-100 p-4 !text-right !text-zinc-900">
                          {editing ? (
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={e =>
                                handleLineChange(
                                  index,
                                  'quantity',
                                  e.target.value
                                )
                              }
                              className="input border w-20 text-right rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                            />
                          ) : (
                            line.unit === 'fixed' ? line.quantity : `${line.quantity}${getUnitLabel(line.unit)}`
                          )}
                        </td>
                        <td className="!bg-zinc-100 p-4 !text-right !text-zinc-900">
                          {editing ? (
                            <input
                              type="number"
                              min={0}
                              value={line.unit_price}
                              onChange={e =>
                                handleLineChange(
                                  index,
                                  'unit_price',
                                  e.target.value
                                )
                              }
                              className="input border w-24 text-right rounded-lg p-2 !bg-zinc-50 !border-zinc-200 !text-zinc-900"
                            />
                          ) : (
                            `${line.unit_price}€`
                          )}
                        </td>
                        <td className="!bg-zinc-100 p-4 !text-right !text-zinc-900 font-medium">
                          {line.total}€
                        </td>
                        {editing && (
                          <td className="!bg-zinc-100 p-4 !text-right !text-zinc-900">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="!text-red-500 hover:!text-red-700"
                            >
                              {t('delete')}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculs et total */}
            <div className="bg-zinc-50 rounded-lg p-6 border border-zinc-100">
              <div className="flex items-center gap-2 mb-4">
                <IconCalculator className="w-5 h-5 !text-orange-500" />
                <h3 className="!text-lg font-semibold !text-black">
                  {t('calculations')}
                </h3>
              </div>
              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between !text-zinc-400">
                    <span>{t('subtotal')}:</span>
                    <span>{subtotal}€</span>
                  </div>
                  {tvaApplicable && (
                    <div className="flex justify-between !text-zinc-400">
                      <span>
                        {t('vat_applicable')} ({tvaRate}%):
                      </span>
                      <span>{tvaAmount.toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-700 pt-3">
                    <div className="flex justify-between !text-lg font-bold !text-zinc-900">
                      <span>{t('total_ttc')}:</span>
                      <span>{total.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes et conditions */}
            {facture?.notes && (
              <div className="mt-8 bg-zinc-50 rounded-lg p-6 border border-zinc-100">
                <h3 className="!text-lg font-semibold !text-black mb-3">
                  {t('notes')}
                </h3>
                <p className="!text-zinc-300">{facture.notes}</p>
              </div>
            )}

            {/* Pied de page - Informations entreprise */}
            <div className="mt-8 pt-6 border-t border-zinc-200 !text-center !text-zinc-600 !text-sm">
              <div className="space-y-3 !text-zinc-600">
                {/* Logo et nom de l'entreprise */}
                <div className="flex flex-col items-center gap-2">
                  {company?.logo && (
                    <Image 
                      src={company.logo.startsWith('http') ? company.logo : `${process.env.NEXT_PUBLIC_STRAPI_URL}${company.logo}`}
                      alt={company.name || 'Logo'}
                      width={40}
                      height={40}
                      className="h-10 w-auto object-contain"
                      unoptimized
                    />
                  )}
                  {company?.name && (
                    <p className="font-bold !text-zinc-800 text-base">
                      {company.name}
                    </p>
                  )}
                  {company?.domaine && (
                    <p className="!text-zinc-500 !text-xs italic">
                      {company.domaine}
                    </p>
                  )}
                </div>

                {/* Coordonnées */}
                <div className="flex flex-wrap justify-center gap-4 !text-xs">
                  {company?.location && (
                    <span className="!text-zinc-600">{company.location}</span>
                  )}
                  {company?.phoneNumber && (
                    <span className="!text-zinc-600">
                      📞 {company.phoneNumber}
                    </span>
                  )}
                  {company?.email && (
                    <span className="!text-zinc-600">
                      ✉️ {company.email}
                    </span>
                  )}
                  {company?.website && (
                    <span className="!text-zinc-600">
                      🌐 {company.website}
                    </span>
                  )}
                </div>

                {/* Informations légales */}
                <div className="flex flex-wrap justify-center gap-4 !text-xs mt-2 pt-2 border-t border-zinc-200">
                  {company?.siret && (
                    <span className="!text-zinc-500">
                      SIRET: {company.siret}
                    </span>
                  )}
                  {company?.siren && (
                    <span className="!text-zinc-500">
                      SIREN: {company.siren}
                    </span>
                  )}
                  {company?.vat && (
                    <span className="!text-zinc-500">
                      TVA: {company.vat}
                    </span>
                  )}
                </div>

                {/* Mentions légales depuis les préférences */}
                {preferences.invoice.legalMentions && (
                  <div className="mt-3 pt-3 border-t border-zinc-200">
                    <p className="!text-zinc-500 !text-xs italic whitespace-pre-line">
                      {preferences.invoice.legalMentions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex lg:flex-row flex-col gap-2 justify-end">
          {editing && (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                {t('save')}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-muted text-secondary border border-default px-4 py-2 rounded-lg hover:bg-card transition-colors"
              >
                {t('cancel')}
              </button>
            </>
          )}
        </div>
      </div>
      <Modal open={showPreview} onClose={() => setShowPreview(false)}>
        <FactureApercu
          facture={facture as Facture}
          company={company as Company}
          invoiceLines={invoiceLines}
          tvaApplicable={tvaApplicable}
          tvaRate={tvaRate}
          tvaAmount={tvaAmount}
          subtotal={subtotal}
          total={total}
          t={t}
        />
      </Modal>

      {/* Modal AI Invoice Generator */}
      <AIInvoiceGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        documentType={documentType}
        onGenerated={handleAIGenerated}
      />
    </motion.div>
  );
}
