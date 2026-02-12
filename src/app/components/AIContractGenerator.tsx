'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconLoader2,
  IconX,
  IconSparkles,
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
  IconBulb,
  IconUser,
  IconFolder,
  IconMapPin,
  IconCalendar,
  IconSignature,
  IconTrash,
  IconDownload,
  IconChevronDown,
  IconMail,
  IconLink,
  IconSend,
  IconEdit,
  IconEye,
  IconLanguage,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useUserPreferences } from '@/app/context/UserPreferencesContext';
import { fetchClientsUser, fetchAllUserProjects, createContract, sendContractToClient, type Contract } from '@/lib/api';
import { pdf } from '@react-pdf/renderer';
import ContractPDF from './ContractPDF';
import RichTextEditor from './RichTextEditor';
import type { Client, Project, Company } from '@/types';

interface AIContractGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  project?: Project;
  company?: Company | null;
  onContractGenerated?: (contract: GeneratedContract) => void;
  manualMode?: boolean; // Skip AI generation and go directly to editing
}

type ContractType = 'service' | 'nda' | 'maintenance' | 'cgv' | 'custom';

interface ContractArticle {
  number: number;
  title: string;
  content: string;
}

interface GeneratedContract {
  title: string;
  parties: {
    provider: { name: string; details: string };
    client: { name: string; details: string };
  };
  preamble: string;
  articles: ContractArticle[];
  signatures: {
    date: string;
    location: string;
  };
  tips?: string[];
  warnings?: string[];
}

interface SignatureData {
  provider: string | null;
  client: string | null;
}

// Helper to strip HTML tags from text
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

export default function AIContractGenerator({
  isOpen,
  onClose,
  client: initialClient,
  project: initialProject,
  company,
  onContractGenerated,
  manualMode = false,
}: AIContractGeneratorProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { businessType, businessConfig } = useUserPreferences();

  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Selection states
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClient?.documentId || null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProject?.documentId || null);

  // Contract config states
  const [contractType, setContractType] = useState<ContractType>('service');
  const [customClauses, setCustomClauses] = useState<string[]>([]);
  const [newClause, setNewClause] = useState('');
  const [contractLanguage, setContractLanguage] = useState<'fr' | 'en'>('fr');
  
  // Signature fields
  const [signatureLocation, setSignatureLocation] = useState(company?.location || '');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatures, setSignatures] = useState<SignatureData>({ provider: null, client: null });
  const [activeSignature, setActiveSignature] = useState<'provider' | 'client' | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [step, setStep] = useState<'config' | 'review' | 'sign' | 'send'>('config');
  
  // Edit mode for contract
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContractHtml, setEditedContractHtml] = useState<string>('');
  
  // Saved contract state
  const [savedContract, setSavedContract] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [signatureLink, setSignatureLink] = useState<string | null>(null);
  const [emailContent, setEmailContent] = useState<string>('');
  
  // Date validation warnings
  const [dateWarnings, setDateWarnings] = useState<string[]>([]);
  const [validatingDates, setValidatingDates] = useState(false);

  // Signature canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSavingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Get selected client and project objects
  const selectedClient = clients.find(c => c.documentId === selectedClientId) || initialClient;
  const selectedProject = projects.find(p => p.documentId === selectedProjectId) || initialProject;

  // Filter projects by selected client
  const filteredProjects = selectedClientId 
    ? projects.filter(p => p.client?.documentId === selectedClientId)
    : projects;

  // Load clients and projects when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContractType('service');
      setCustomClauses([]);
      setNewClause('');
      setError(null);
      setGeneratedContract(null);
      setStep('config');
      setSignatureLocation(company?.location || '');
      setSignatureDate(new Date().toISOString().split('T')[0]);
      setSignatures({ provider: null, client: null });
      setSelectedClientId(initialClient?.documentId || null);
      setSelectedProjectId(initialProject?.documentId || null);
      setSavedContract(null);
      setSignatureLink(null);
      setEmailContent('');
      setIsEditMode(false);
      setEditedContractHtml('');
      isSavingRef.current = false; // Reset flag de protection
    }
  }, [isOpen, company?.location, initialClient?.documentId, initialProject?.documentId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Scroll isolation handler - prevents scroll from propagating to body
  const handleScrollIsolation = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isScrollable = scrollHeight > clientHeight;
    
    if (!isScrollable) return;
    
    // Check if we're at the boundaries
    const isAtTop = scrollTop === 0 && e.deltaY < 0;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1 && e.deltaY > 0;
    
    // Only prevent default if not at boundaries or if scrollable
    if (!isAtTop && !isAtBottom) {
      e.stopPropagation();
    }
  }, []);

  // Convert contract structure to HTML for editing
  const contractToHtml = useCallback((contract: GeneratedContract): string => {
    let html = `<h1 style="text-align: center; text-transform: uppercase;">${contract.title}</h1>\n\n`;
    
    html += `<h2>ENTRE LES SOUSSIGNÉS :</h2>\n`;
    html += `<p><strong>${contract.parties.provider.name}</strong></p>\n`;
    html += `<p>${contract.parties.provider.details.replace(/\n/g, '<br>')}</p>\n`;
    html += `<p style="text-align: center;"><em>ET</em></p>\n`;
    html += `<p><strong>${contract.parties.client.name}</strong></p>\n`;
    html += `<p>${contract.parties.client.details.replace(/\n/g, '<br>')}</p>\n\n`;
    
    html += `<h2>PRÉAMBULE</h2>\n`;
    html += `<p>${contract.preamble.replace(/\n/g, '<br>')}</p>\n\n`;
    
    html += `<h2>IL A ÉTÉ CONVENU CE QUI SUIT :</h2>\n`;
    contract.articles.forEach(article => {
      html += `<h3>Article ${article.number} - ${article.title}</h3>\n`;
      html += `<p>${article.content.replace(/\n/g, '<br>')}</p>\n`;
    });
    
    html += `\n<hr>\n`;
    html += `<p style="text-align: center;">Fait à ${contract.signatures.location}, le ${contract.signatures.date}</p>\n`;
    html += `<div style="display: flex; justify-content: space-between; margin-top: 20px;">\n`;
    html += `  <div style="text-align: center;"><strong>Le Prestataire</strong><br><br><br>____________________</div>\n`;
    html += `  <div style="text-align: center;"><strong>Le Client</strong><br><br><br>____________________</div>\n`;
    html += `</div>`;
    
    return html;
  }, []);

  // Initialize edit HTML when contract is generated
  useEffect(() => {
    if (generatedContract && !editedContractHtml) {
      setEditedContractHtml(contractToHtml(generatedContract));
    }
  }, [generatedContract, editedContractHtml, contractToHtml]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoadingData(true);
    try {
      const [clientsResponse, projectsResponse] = await Promise.all([
        fetchClientsUser(user.id),
        fetchAllUserProjects(user.id),
      ]);
      setClients((clientsResponse?.data as Client[]) || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectsData = (projectsResponse as any)?.data || projectsResponse || [];
      setProjects(projectsData as Project[]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Canvas drawing functions
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setLastPos(coords);
  }, [getCanvasCoords]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const coords = getCanvasCoords(e);
    
    ctx.beginPath();
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    setLastPos(coords);
  }, [isDrawing, lastPos, getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeSignature) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    setSignatures(prev => ({ ...prev, [activeSignature]: dataUrl }));
    setActiveSignature(null);
    clearCanvas();
  }, [activeSignature, clearCanvas]);

  const contractTypes: { id: ContractType; label: string; description: string }[] = [
    { 
      id: 'service', 
      label: t('contract_service') || 'Contrat de prestation',
      description: t('contract_service_desc') || 'Pour une mission de développement spécifique'
    },
    { 
      id: 'nda', 
      label: t('contract_nda') || 'Accord de confidentialité (NDA)',
      description: t('contract_nda_desc') || 'Protection des informations sensibles'
    },
    { 
      id: 'maintenance', 
      label: t('contract_maintenance') || 'Contrat de maintenance',
      description: t('contract_maintenance_desc') || 'Maintenance récurrente d\'un site/app'
    },
    { 
      id: 'cgv', 
      label: t('contract_cgv') || 'CGV - Conditions Générales',
      description: t('contract_cgv_desc') || 'Conditions générales de vente'
    },
  ];

  // Validate contract dates using AI
  const validateContractDates = async (contract: GeneratedContract) => {
    setValidatingDates(true);
    setDateWarnings([]);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const contractText = contract.articles.map(a => `${a.title}: ${a.content}`).join('\n');
      
      const response = await fetch('/api/ai/validate-contract-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractContent: contractText,
          contractType,
          today,
          signatureDate,
          language: contractLanguage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.warnings && data.warnings.length > 0) {
          setDateWarnings(data.warnings);
        }
      }
    } catch (err) {
      console.error('Date validation error:', err);
      // Don't block the flow if validation fails
    } finally {
      setValidatingDates(false);
    }
  };

  // Create a blank template for manual mode
  const createManualTemplate = (): GeneratedContract => {
    const contractTypeLabels: Record<ContractType, { fr: string; en: string }> = {
      service: { fr: 'CONTRAT DE PRESTATION DE SERVICES', en: 'SERVICE AGREEMENT' },
      nda: { fr: 'ACCORD DE CONFIDENTIALITÉ', en: 'NON-DISCLOSURE AGREEMENT' },
      maintenance: { fr: 'CONTRAT DE MAINTENANCE', en: 'MAINTENANCE CONTRACT' },
      cgv: { fr: 'CONDITIONS GÉNÉRALES DE VENTE', en: 'GENERAL TERMS AND CONDITIONS' },
      custom: { fr: 'CONTRAT', en: 'CONTRACT' },
    };

    const formattedDate = signatureDate 
      ? new Date(signatureDate).toLocaleDateString(contractLanguage === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : new Date().toLocaleDateString(contractLanguage === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

    return {
      title: contractTypeLabels[contractType][contractLanguage],
      parties: {
        provider: {
          name: company?.name || user?.username || (contractLanguage === 'fr' ? 'Le Prestataire' : 'The Provider'),
          details: [
            company?.siret ? `SIRET: ${company.siret}` : '',
            company?.location || '',
            user?.email || '',
          ].filter(Boolean).join('\n') || (contractLanguage === 'fr' ? 'Adresse et informations à compléter' : 'Address and information to complete'),
        },
        client: {
          name: selectedClient?.name || selectedClient?.enterprise || (contractLanguage === 'fr' ? 'Le Client' : 'The Client'),
          details: selectedClient ? [
            selectedClient.enterprise || '',
            selectedClient.adress || '',
            selectedClient.email || '',
          ].filter(Boolean).join('\n') : (contractLanguage === 'fr' ? 'Informations du client à compléter' : 'Client information to complete'),
        },
      },
      preamble: contractLanguage === 'fr' 
        ? 'Le présent contrat définit les termes et conditions de la prestation de services entre les parties ci-dessus désignées.'
        : 'This contract defines the terms and conditions of the service provision between the parties designated above.',
      articles: [
        {
          number: 1,
          title: contractLanguage === 'fr' ? 'Objet du contrat' : 'Purpose of the contract',
          content: contractLanguage === 'fr' 
            ? 'Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s\'engage à fournir ses services au Client.\n\n[Décrivez ici l\'objet précis de la prestation]'
            : 'This contract aims to define the conditions under which the Provider commits to provide services to the Client.\n\n[Describe here the precise purpose of the service]',
        },
        {
          number: 2,
          title: contractLanguage === 'fr' ? 'Durée' : 'Duration',
          content: contractLanguage === 'fr'
            ? 'Le présent contrat prend effet à compter du [DATE DE DÉBUT] et se terminera le [DATE DE FIN].\n\n[Précisez les modalités de renouvellement si applicable]'
            : 'This contract takes effect from [START DATE] and will end on [END DATE].\n\n[Specify renewal terms if applicable]',
        },
        {
          number: 3,
          title: contractLanguage === 'fr' ? 'Conditions financières' : 'Financial terms',
          content: contractLanguage === 'fr'
            ? 'En contrepartie des services fournis, le Client s\'engage à verser au Prestataire la somme de [MONTANT] €.\n\nModalités de paiement : [À COMPLÉTER]'
            : 'In exchange for the services provided, the Client agrees to pay the Provider the sum of [AMOUNT] €.\n\nPayment terms: [TO COMPLETE]',
        },
        {
          number: 4,
          title: contractLanguage === 'fr' ? 'Obligations des parties' : 'Obligations of the parties',
          content: contractLanguage === 'fr'
            ? 'Le Prestataire s\'engage à :\n- [Obligation 1]\n- [Obligation 2]\n\nLe Client s\'engage à :\n- [Obligation 1]\n- [Obligation 2]'
            : 'The Provider agrees to:\n- [Obligation 1]\n- [Obligation 2]\n\nThe Client agrees to:\n- [Obligation 1]\n- [Obligation 2]',
        },
      ],
      signatures: {
        location: signatureLocation || (contractLanguage === 'fr' ? 'Paris' : 'Paris'),
        date: formattedDate,
      },
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setDateWarnings([]);

    // Manual mode: create a blank template
    if (manualMode) {
      try {
        const template = createManualTemplate();
        setGeneratedContract(template);
        setStep('review');
        setIsEditMode(true); // Enable edit mode by default for manual creation
      } catch (err) {
        console.error('Manual template creation error:', err);
        setError(err instanceof Error ? err.message : t('error'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // AI mode: call the API
    try {
      const userProfile = {
        name: user?.username || 'Freelance',
        company: company?.name,
        siret: company?.siret,
        address: company?.location ? `${company.location}` : undefined,
        email: user?.email,
        activity: businessConfig?.label || 'Freelance',
        businessType: businessType,
      };

      const response = await fetch('/api/ai/contract-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType,
          userProfile,
          client: selectedClient ? {
            name: selectedClient.name,
            enterprise: selectedClient.enterprise,
            email: selectedClient.email,
            address: selectedClient.adress ? `${selectedClient.adress}` : undefined,
          } : undefined,
          project: selectedProject ? {
            title: selectedProject.title,
            description: stripHtml(selectedProject.description || ''),
            budget: selectedProject.budget,
            start_date: selectedProject.start_date,
            end_date: selectedProject.end_date,
            billing_type: selectedProject.billing_type,
          } : undefined,
          customClauses: customClauses.length > 0 ? customClauses : undefined,
          signatureLocation,
          signatureDate,
          language: contractLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('ai_generation_error'));
      }

      const data: GeneratedContract = await response.json();
      // Override signatures with user-provided values
      data.signatures = {
        location: signatureLocation || data.signatures.location,
        date: signatureDate ? new Date(signatureDate).toLocaleDateString(contractLanguage === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) : data.signatures.date,
      };
      setGeneratedContract(data);
      setStep('review');
      
      // Validate dates in background
      validateContractDates(data);
    } catch (err) {
      console.error('AI contract generation error:', err);
      setError(err instanceof Error ? err.message : t('ai_generation_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddClause = () => {
    if (newClause.trim()) {
      setCustomClauses(prev => [...prev, newClause.trim()]);
      setNewClause('');
    }
  };

  const handleRemoveClause = (index: number) => {
    setCustomClauses(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyContract = () => {
    if (!generatedContract) return;
    
    const text = formatContractAsText(generatedContract);
    navigator.clipboard.writeText(text);
    showGlobalPopup(t('contract_copied') || 'Contrat copié dans le presse-papier', 'success');
  };

  const formatContractAsText = (contract: GeneratedContract): string => {
    let text = `${contract.title}\n\n`;
    text += `ENTRE LES SOUSSIGNÉS:\n\n`;
    text += `${contract.parties.provider.name}\n${contract.parties.provider.details}\n\n`;
    text += `ET\n\n`;
    text += `${contract.parties.client.name}\n${contract.parties.client.details}\n\n`;
    text += `PRÉAMBULE\n${contract.preamble}\n\n`;
    text += `IL A ÉTÉ CONVENU CE QUI SUIT:\n\n`;
    
    contract.articles.forEach(article => {
      text += `ARTICLE ${article.number} - ${article.title}\n`;
      text += `${article.content}\n\n`;
    });
    
    text += `\nFait à ${contract.signatures.location}, le ${contract.signatures.date}\n\n`;
    text += `Le Prestataire:\t\t\t\t\tLe Client:\n`;
    text += `(signature)\t\t\t\t\t(signature)`;
    
    return text;
  };

  // Save contract to database
  const handleSaveContract = async (): Promise<Contract | null> => {
    if (!generatedContract || !user?.id) return null;
    
    // Si déjà sauvegardé, retourner le contrat existant
    if (savedContract) {
       return savedContract;
    }
    
    // Empêcher les doubles soumissions
    if (isSavingRef.current) {
       return null;
    }
    
    isSavingRef.current = true;
    setSaving(true);
    setError(null);
    
    try {
      // Include edited HTML content if in edit mode
      const contentToSave = {
        ...generatedContract,
        editedHtml: isEditMode && editedContractHtml ? editedContractHtml : undefined,
      };
      
      const contract = await createContract({
        title: generatedContract.title,
        contract_type: contractType,
        status: signatures.provider ? 'pending_client' : 'draft',
        content: contentToSave,
        signature_location: signatureLocation,
        signature_date: signatureDate,
        provider_signature: signatures.provider || undefined,
        client: selectedClient?.documentId,
        project: selectedProject?.documentId,
        user: user.id,
      });
      
      setSavedContract(contract);
      return contract;
    } catch (err) {
      console.error('Error saving contract:', err);
      setError(t('contract_save_error') || 'Erreur lors de la sauvegarde du contrat');
      return null;
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  // Save and proceed to send step
  const handleProceedToSend = async () => {
    const contract = await handleSaveContract();
    if (contract) {
      // Generate signature link
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${baseUrl}/sign/contract/${contract.signature_token}`;
      setSignatureLink(link);
      
      // Generate default email content
      const defaultEmail = `Bonjour,

Veuillez trouver ci-joint le contrat "${generatedContract?.title}" pour votre signature.

Cliquez sur le lien ci-dessous pour consulter et signer le contrat :
${link}

Ce lien est valide pendant 30 jours.

Cordialement,
${user?.username || 'L\'équipe'}`;
      
      setEmailContent(defaultEmail);
      setStep('send');
    }
  };

  // Send contract to client
  const handleSendToClient = async () => {
    if (!savedContract?.documentId || !selectedClient?.email) return;
    
    setSaving(true);
    try {
      // Update contract status to pending_client
      await sendContractToClient(savedContract.documentId);
      
      showGlobalPopup(
        t('contract_sent') || 'Contrat envoyé au client avec succès !',
        'success'
      );
      
      if (onContractGenerated && generatedContract) {
         onContractGenerated(generatedContract);
      }
      onClose();
    } catch (err) {
      console.error('Error sending contract:', err);
      setError(t('contract_send_error') || 'Erreur lors de l\'envoi du contrat');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    // Empêcher les doubles clics
    if (isSavingRef.current) {
       return;
    }
    
    // Save contract first if not already saved
    if (!savedContract) {
      const contract = await handleSaveContract();
      if (!contract) return;
    }
    
    // Appeler le callback de rafraîchissement une seule fois
    if (generatedContract && onContractGenerated) {
       onContractGenerated(generatedContract);
    }
    onClose();
  };

  const handleDownloadPDF = async () => {
    if (!generatedContract || !savedContract) return;
    
    try {
      const blob = await pdf(
        <ContractPDF 
          contract={savedContract} 
          companyName={company?.name}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedContract.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showGlobalPopup(t('pdf_downloaded') || 'PDF téléchargé', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showGlobalPopup(t('pdf_error') || 'Erreur lors de la génération du PDF', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overscroll-contain"
        onClick={onClose}
        onWheel={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-page rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col overscroll-contain"
          onClick={e => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-muted">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${manualMode ? 'bg-info-light' : 'bg-accent-light'}`}>
                {manualMode ? (
                  <IconEdit className="w-6 h-6 text-info" />
                ) : (
                  <Image 
                    src="/images/logo/eclipse-logo.png" 
                    alt="Eclipse Assistant" 
                    width={24} 
                    height={24}
                    className="w-6 h-6"
                  />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  {manualMode 
                    ? (t('manual_contract_creation') || 'Création manuelle')
                    : 'Eclipse Assistant'
                  }
                </h2>
                <p className="text-sm text-muted">
                  {manualMode
                    ? (t('manual_contract_description') || 'Créez votre contrat de A à Z')
                    : (t('ai_contract_description') || 'Documents juridiques personnalisés')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover rounded-lg transition-colors"
            >
              <IconX className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Error display in header */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-danger-light rounded-xl flex items-center gap-3 border border-danger">
              <IconAlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-danger hover:opacity-70">
                <IconX className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Progress Steps */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {['config', 'review', 'sign', 'send'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-2 ${
                    step === s ? 'text-secondary' : 
                    ['config', 'review', 'sign', 'send'].indexOf(step) > i ? 'text-success' : 'text-muted'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center !text-xs font-medium ${
                      step === s ? 'bg-secondary text-white' : 
                      ['config', 'review', 'sign', 'send'].indexOf(step) > i ? 'bg-success text-white' : 'bg-hover'
                    }`}>
                      {['config', 'review', 'sign', 'send'].indexOf(step) > i ? <IconCheck className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      {s === 'config' ? (t('configuration') || 'Configuration') :
                       s === 'review' ? (t('review') || 'Révision') :
                       s === 'sign' ? (t('signature') || 'Signature') :
                       (t('send') || 'Envoi')}
                    </span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-0.5 ${
                    ['config', 'review', 'sign', 'send'].indexOf(step) > i ? 'bg-success' : 'bg-hover'
                  }`} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div 
            className="flex-1 overflow-y-auto p-6"
            onWheel={handleScrollIsolation}
            onMouseEnter={(e) => e.currentTarget.focus()}
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            {step === 'config' && (
              <div className="space-y-6">
                {/* Client & Project Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Select */}
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <IconUser className="w-4 h-4 text-muted" />
                      {t('client') || 'Client'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedClientId || ''}
                        onChange={(e) => {
                          setSelectedClientId(e.target.value || null);
                          setSelectedProjectId(null); // Reset project when client changes
                        }}
                        className="w-full px-4 py-2.5 bg-muted border border-muted rounded-lg appearance-none focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none text-primary"
                        disabled={loadingData}
                      >
                        <option value="">{t('select_client') || 'Sélectionner un client'}</option>
                        {clients.map(c => (
                          <option key={c.documentId} value={c.documentId}>
                            {c.name} {c.enterprise && `(${c.enterprise})`}
                          </option>
                        ))}
                      </select>
                      <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Project Select */}
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <IconFolder className="w-4 h-4 text-muted" />
                      {t('project') || 'Projet'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value || null)}
                        className="w-full px-4 py-2.5 bg-muted border border-muted rounded-lg appearance-none focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none text-primary"
                        disabled={loadingData || !selectedClientId}
                      >
                        <option value="">{t('select_project') || 'Sélectionner un projet'}</option>
                        {filteredProjects.map(p => (
                          <option key={p.documentId} value={p.documentId}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>
                    {!selectedClientId && (
                      <p className="!text-xs text-muted mt-1">{t('select_client_first') || 'Sélectionnez d\'abord un client'}</p>
                    )}
                  </div>
                </div>

                {/* Contract type selection */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">
                    {t('contract_type') || 'Type de contrat'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {contractTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setContractType(type.id)}
                        className={`p-4 text-left rounded-xl border transition-colors ${
                          contractType === type.id
                            ? 'border-accent bg-accent-light'
                            : 'border-muted hover:border-accent'
                        }`}
                      >
                        <p className="font-medium text-primary">{type.label}</p>
                        <p className="!text-xs text-muted mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signature Location, Date & Language */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <IconMapPin className="w-4 h-4 text-muted" />
                      {t('signature_location') || 'Lieu de signature'}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={signatureLocation}
                      onChange={(e) => setSignatureLocation(e.target.value)}
                      placeholder="Paris, France"
                      required
                      className={`w-full px-4 py-2.5 bg-muted border rounded-lg focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none text-primary ${
                        !signatureLocation ? 'border-warning' : 'border-muted'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <IconCalendar className="w-4 h-4 text-muted" />
                      {t('signature_date') || 'Date de signature'}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={signatureDate}
                      onChange={(e) => setSignatureDate(e.target.value)}
                      required
                      className={`w-full px-4 py-2.5 bg-muted border rounded-lg focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none text-primary ${
                        !signatureDate ? 'border-warning' : 'border-muted'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <IconLanguage className="w-4 h-4 text-muted" />
                      {t('contract_language') || 'Langue du contrat'}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setContractLanguage('fr')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                          contractLanguage === 'fr'
                            ? 'border-accent bg-accent-light !text-accent'
                            : 'border-muted bg-muted text-primary hover:text-primary'
                        }`}
                      >
                        🇫🇷 Français
                      </button>
                      <button
                        type="button"
                        onClick={() => setContractLanguage('en')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                          contractLanguage === 'en'
                            ? 'border-accent bg-accent-light !text-accent'
                            : 'border-muted bg-muted text-primary hover:text-primary'
                        }`}
                      >
                        🇬🇧 English
                      </button>
                    </div>
                  </div>
                </div>

                {/* Context info when project selected */}
                {selectedProject && (
                  <div className="p-4 bg-info-light rounded-xl space-y-2">
                    <p className="text-sm font-medium text-info flex items-center gap-2">
                      <IconSparkles className="w-4 h-4" />
                      {t('project_context') || 'L\'IA adaptera le contrat selon ce projet'}
                    </p>
                    <div className="text-sm text-info-light space-y-1">
                      <p><strong>Projet:</strong> {selectedProject.title}</p>
                      {selectedProject.description && (
                        <div 
                          className="!text-xs line-clamp-2 prose prose-sm prose-slate max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedProject.description }}
                        />
                      )}
                      {selectedProject.budget && (
                        <p><strong>Budget:</strong> {selectedProject.budget.toLocaleString()}€</p>
                      )}
                      {selectedProject.billing_type && (
                        <p><strong>Type:</strong> {selectedProject.billing_type === 'fixed' ? 'Forfait' : 'Régie'}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom clauses */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">
                    {t('custom_clauses') || 'Clauses personnalisées (optionnel)'}
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newClause}
                      onChange={e => setNewClause(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddClause()}
                      placeholder={t('add_clause_placeholder') || 'Ex: Clause de non-concurrence sur 6 mois...'}
                      className="flex-1 px-4 py-2 bg-muted border border-muted rounded-lg focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                    />
                    <button
                      onClick={handleAddClause}
                      disabled={!newClause.trim()}
                      className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                      {t('add') || 'Ajouter'}
                    </button>
                  </div>
                  {customClauses.length > 0 && (
                    <div className="space-y-2">
                      {customClauses.map((clause, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                        >
                          <span className="flex-1 text-sm text-primary">{clause}</span>
                          <button
                            onClick={() => handleRemoveClause(index)}
                            className="text-danger hover:opacity-80"
                          >
                            <IconX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Warning */}
                <div className="p-4 bg-warning-light rounded-xl flex items-start gap-3">
                  <IconAlertTriangle className="w-5 h-5 text-warning-text flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      {t('contract_warning_title') || 'Important'}
                    </p>
                    <p className="!text-xs text-warning-light mt-1">
                      {t('contract_warning_text') || 'Ce contrat est généré à titre indicatif. Faites-le relire par un professionnel du droit avant utilisation.'}
                    </p>
                  </div>
                </div>

              </div>
            )}

            {step === 'review' && generatedContract && (
              <div className="space-y-6">
                {/* Date validation warnings */}
                {validatingDates && (
                  <div className="p-4 bg-info-light rounded-xl flex items-center gap-3">
                    <IconLoader2 className="w-5 h-5 text-info animate-spin" />
                    <p className="text-sm text-info">
                      {contractLanguage === 'fr' 
                        ? 'Vérification des dates du contrat...' 
                        : 'Validating contract dates...'}
                    </p>
                  </div>
                )}
                
                {dateWarnings.length > 0 && (
                  <div className="p-4 bg-accent-light rounded-xl border border-warning">
                    <div className="flex items-start gap-3">
                      <IconAlertTriangle className="w-5 h-5 text-warning-text flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent mb-2">
                          {contractLanguage === 'fr' 
                            ? 'Attention aux dates du contrat' 
                            : 'Contract date warnings'}
                        </p>
                        <ul className="space-y-1">
                          {dateWarnings.map((warning, index) => (
                            <li key={index} className="text-sm text-warning-light flex items-start gap-2">
                              <span className="text-warning">•</span>
                              {warning}
                            </li>
                          ))}
                        </ul>
                        <p className="!text-xs text-muted mt-3">
                          {contractLanguage === 'fr' 
                            ? 'Vous pouvez modifier les dates en passant en mode Édition.' 
                            : 'You can modify dates by switching to Edit mode.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Toggle Edit/Preview mode */}
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <button
                      onClick={() => setIsEditMode(false)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        !isEditMode 
                          ? 'bg-card text-primary shadow-sm' 
                          : 'text-muted hover:text-primary'
                      }`}
                    >
                      <IconEye className="w-4 h-4" />
                      {t('preview') || 'Aperçu'}
                    </button>
                    <button
                      onClick={() => setIsEditMode(true)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isEditMode 
                          ? 'bg-card text-primary shadow-sm' 
                          : 'text-muted hover:text-primary'
                      }`}
                    >
                      <IconEdit className="w-4 h-4" />
                      {t('edit') || 'Éditer'}
                    </button>
                  </div>
                </div>

                {/* Contract preview OR edit mode */}
                {!isEditMode ? (
                  <div 
                    className="p-6 bg-card rounded-xl border border-muted max-h-[60vh] overflow-y-auto"
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {/* Title */}
                    <h3 className="text-xl font-bold text-center text-primary mb-6 uppercase">
                      {generatedContract.title}
                    </h3>

                    {/* Parties */}
                    <div className="mb-6 text-sm">
                      <p className="font-semibold text-primary">ENTRE LES SOUSSIGNÉS :</p>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="font-medium text-primary">{generatedContract.parties.provider.name}</p>
                        <p className="text-primary whitespace-pre-line">{generatedContract.parties.provider.details}</p>
                      </div>
                      <p className="text-center my-2 text-muted">ET</p>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium text-primary">{generatedContract.parties.client.name}</p>
                        <p className="text-primary whitespace-pre-line">{generatedContract.parties.client.details}</p>
                      </div>
                    </div>

                    {/* Preamble */}
                    <div className="mb-6 text-sm">
                      <p className="font-semibold text-primary mb-2">PRÉAMBULE</p>
                      <p className="text-primary whitespace-pre-line">{generatedContract.preamble}</p>
                    </div>

                    {/* Articles */}
                    <div className="space-y-4">
                      <p className="font-semibold text-primary text-sm">IL A ÉTÉ CONVENU CE QUI SUIT :</p>
                      {generatedContract.articles.map(article => (
                        <div key={article.number} className="text-sm">
                          <p className="font-semibold text-primary">
                            Article {article.number} - {article.title}
                          </p>
                          <p className="text-primary whitespace-pre-line mt-1">{article.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Signatures preview */}
                    <div className="mt-8 pt-4 border-t border-muted text-sm">
                      <p className="text-center text-muted mb-4">
                        Fait à {generatedContract.signatures.location}, le {generatedContract.signatures.date}
                      </p>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="text-center">
                          <p className="font-medium text-primary">Le Prestataire</p>
                          <div className="mt-4 h-20 border border-dashed border-muted rounded-lg flex items-center justify-center">
                            {signatures.provider ? (
                              <Image src={signatures.provider} alt="Signature prestataire" width={150} height={60} className="max-h-16 object-contain" />
                            ) : (
                              <span className="!text-xs text-muted">{t('signature_pending') || 'En attente'}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-primary">Le Client</p>
                          <div className="mt-4 h-20 border border-dashed border-muted rounded-lg flex items-center justify-center">
                            {signatures.client ? (
                              <Image src={signatures.client} alt="Signature client" width={150} height={60} className="max-h-16 object-contain" />
                            ) : (
                              <span className="!text-xs text-muted">{t('signature_pending') || 'En attente'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode - Rich Text Editor */
                  <div className="space-y-4">
                    <div className="p-4 bg-info-light rounded-xl">
                      <p className="text-sm text-info flex items-center gap-2">
                        <IconEdit className="w-4 h-4" />
                        {t('edit_contract_info') || 'Vous pouvez modifier librement le contenu du contrat ci-dessous.'}
                      </p>
                    </div>
                    <div 
                      className="bg-card rounded-xl border border-muted overflow-hidden"
                      onWheel={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <RichTextEditor
                        value={editedContractHtml}
                        onChange={setEditedContractHtml}
                        placeholder={t('contract_content_placeholder') || 'Contenu du contrat...'}
                        minHeight="400px"
                        maxHeight="600px"
                        showMediaOptions={false}
                      />
                    </div>
                  </div>
                )}

                {/* Tips & Warnings */}
                {generatedContract.tips && generatedContract.tips.length > 0 && (
                  <div className="p-4 bg-info-light rounded-xl">
                    <p className="text-sm font-medium text-info flex items-center gap-2 mb-2">
                      <IconBulb className="w-4 h-4" />
                      {t('tips') || 'Conseils'}
                    </p>
                    <ul className="!text-xs text-info-light space-y-1">
                      {generatedContract.tips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedContract.warnings && generatedContract.warnings.length > 0 && (
                  <div className="p-4 bg-accent-light rounded-xl">
                    <p className="text-sm font-medium text-accent flex items-center gap-2 mb-2">
                      <IconAlertTriangle className="w-4 h-4" />
                      {t('warnings') || 'Points d\'attention'}
                    </p>
                    <ul className="!text-xs text-accent space-y-1">
                      {generatedContract.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === 'sign' && generatedContract && (
              <div className="space-y-6">
                {/* Signature areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Provider Signature */}
                  <div className="p-4 bg-card rounded-xl border border-muted">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-primary flex items-center gap-2">
                        <IconSignature className="w-4 h-4" />
                        {t('provider_signature') || 'Signature Prestataire'}
                      </p>
                      {signatures.provider && (
                        <button
                          onClick={() => setSignatures(prev => ({ ...prev, provider: null }))}
                          className="text-danger hover:opacity-80 !text-xs flex items-center gap-1"
                        >
                          <IconTrash className="w-3 h-3" />
                          {t('delete') || 'Supprimer'}
                        </button>
                      )}
                    </div>
                    {signatures.provider ? (
                      <div className="h-32 border border-muted rounded-lg bg-white flex items-center justify-center">
                        <Image src={signatures.provider} alt="Signature" width={200} height={100} className="max-h-28 object-contain" />
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveSignature('provider')}
                        className="w-full h-32 border-2 border-dashed border-muted rounded-lg hover:border-accent transition-colors flex flex-col items-center justify-center gap-2 text-muted hover:text-accent"
                      >
                        <IconSignature className="w-8 h-8" />
                        <span className="text-sm">{t('click_to_sign') || 'Cliquer pour signer'}</span>
                      </button>
                    )}
                  </div>

                  {/* Client Signature - Read only for provider */}
                  <div className="p-4 bg-card rounded-xl border border-muted opacity-60">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-primary flex items-center gap-2">
                        <IconSignature className="w-4 h-4" />
                        {t('client_signature') || 'Signature Client'}
                      </p>
                    </div>
                    <div className="w-full h-32 border-2 border-dashed border-muted rounded-lg bg-muted flex flex-col items-center justify-center gap-2 text-muted">
                      <IconSignature className="w-8 h-8" />
                      <span className="text-sm text-center px-4">
                        {t('client_will_sign_here') || 'Le client signera ici après réception du contrat'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signature Pad Modal */}
                {activeSignature && (
                  <div className="p-6 bg-card rounded-xl border border-accent">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-medium text-primary">
                        {activeSignature === 'provider' 
                          ? (t('sign_as_provider') || 'Signer en tant que Prestataire')
                          : (t('sign_as_client') || 'Signer en tant que Client')}
                      </p>
                      <button
                        onClick={() => { setActiveSignature(null); clearCanvas(); }}
                        className="text-muted hover:text-primary"
                      >
                        <IconX className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="bg-white rounded-lg border border-muted overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={200}
                        className="w-full cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={clearCanvas}
                        className="px-4 py-2 text-sm text-muted hover:text-primary flex items-center gap-2"
                      >
                        <IconTrash className="w-4 h-4" />
                        {t('clear') || 'Effacer'}
                      </button>
                      <button
                        onClick={saveSignature}
                        className="px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                      >
                        <IconCheck className="w-4 h-4" />
                        {t('validate_signature') || 'Valider la signature'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Alert for missing date/location */}
                {(!signatureLocation || !signatureDate) && (
                  <div className="p-4 bg-accent-light rounded-xl border border-warning">
                    <p className="text-sm text-warning-text flex items-center gap-2">
                      <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {t('missing_signature_info') || 'Veuillez renseigner le lieu et la date de signature dans l\'étape de configuration.'}
                      </span>
                    </p>
                  </div>
                )}

                {/* Contract Summary */}
                <div className="p-4 bg-muted rounded-xl text-sm">
                  <p className="text-muted mb-2">{t('contract_summary') || 'Récapitulatif'}</p>
                  <div className="space-y-1 text-primary">
                    <p><strong className="text-primary">Contrat:</strong> {generatedContract.title}</p>
                    <p>
                      <strong className="text-primary">Lieu:</strong>{' '}
                      <span className={!signatureLocation ? 'text-warning' : ''}>
                        {generatedContract.signatures.location || t('not_specified') || '[Non renseigné]'}
                      </span>
                    </p>
                    <p>
                      <strong className="text-primary">Date:</strong>{' '}
                      <span className={!signatureDate ? 'text-warning' : ''}>
                        {generatedContract.signatures.date || t('not_specified') || '[Non renseigné]'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Send to Client */}
            {step === 'send' && generatedContract && savedContract && (
              <div className="space-y-6">
                {/* Success message */}
                <div className="p-4 bg-success-light rounded-xl border border-success">
                  <div className="flex items-start gap-3">
                    <IconCheck className="w-6 h-6 !text-success-text -text flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium !text-success-text -text">
                        {t('contract_saved') || 'Contrat sauvegardé avec succès !'}
                      </p>
                      <p className="text-sm !text-success-text -text mt-1">
                        {t('contract_ready_to_send') || 'Le contrat est prêt à être envoyé au client pour signature.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client info */}
                <div className="p-4 bg-card rounded-xl border border-muted">
                  <p className="font-medium text-primary mb-3 flex items-center gap-2">
                    <IconUser className="w-4 h-4" />
                    {t('recipient') || 'Destinataire'}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-light rounded-full flex items-center justify-center">
                      <span className="text-accent font-medium">
                        {selectedClient?.name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-primary">{selectedClient?.name}</p>
                      <p className="text-sm text-muted">{selectedClient?.email || t('no_email') || 'Pas d\'email'}</p>
                    </div>
                  </div>
                  {!selectedClient?.email && (
                    <div className="mt-3 p-3 bg-accent-light rounded-lg">
                      <p className="text-sm text-accent flex items-center gap-2">
                        <IconAlertTriangle className="w-4 h-4" />
                        {t('client_no_email_warning') || 'Ce client n\'a pas d\'email. Ajoutez-en un pour pouvoir envoyer le contrat.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Signature link */}
                {signatureLink && (
                  <div className="p-4 bg-card rounded-xl border border-muted">
                    <p className="font-medium text-primary mb-3 flex items-center gap-2">
                      <IconLink className="w-4 h-4" />
                      {t('signature_link') || 'Lien de signature'}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={signatureLink}
                        readOnly
                        className="flex-1 p-3 bg-muted rounded-lg text-sm text-primary border border-muted"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(signatureLink);
                          showGlobalPopup(t('link_copied') || 'Lien copié', 'success');
                        }}
                        className="p-3 bg-accent text-white rounded-lg hover:opacity-90"
                      >
                        <IconCopy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="!text-xs text-muted mt-2">
                      {t('link_valid_30_days') || 'Ce lien est valide pendant 30 jours.'}
                    </p>
                  </div>
                )}

                {/* Email preview */}
                <div className="p-4 bg-card rounded-xl border border-muted">
                  <p className="font-medium text-primary mb-3 flex items-center gap-2">
                    <IconMail className="w-4 h-4" />
                    {t('email_preview') || 'Aperçu de l\'email'}
                  </p>
                  
                  {/* Email preview box */}
                  <div className="border border-muted rounded-lg overflow-hidden bg-white">
                    {/* Email header */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2 !text-xs text-slate-500 mb-1">
                        <span className="font-medium">À:</span>
                        <span className="text-slate-700">{selectedClient?.email || 'client@email.com'}</span>
                      </div>
                      <div className="flex items-center gap-2 !text-xs text-slate-500">
                        <span className="font-medium">Objet:</span>
                        <span className="text-slate-700">Contrat à signer - {generatedContract?.title}</span>
                      </div>
                    </div>
                    
                    {/* Email body */}
                    <div className="p-4">
                      <textarea
                        value={emailContent}
                        onChange={(e) => setEmailContent(e.target.value)}
                        className="w-full p-0 text-sm text-slate-700 border-0 focus:outline-none focus:ring-0 resize-none bg-transparent"
                        rows={6}
                        placeholder={t('email_placeholder') || 'Rédigez votre message...'}
                      />
                      
                      {/* Automatic signature link info */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="!text-xs text-slate-500 italic">
                          {t('email_auto_link_info') || '↳ Un bouton "Signer le contrat" sera automatiquement ajouté à l\'email.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-info-light rounded-xl">
                  <p className="text-sm text-info flex items-start gap-2">
                    <IconBulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t('send_contract_info') || 'Une fois l\'email envoyé, le client pourra signer le contrat en ligne. Vous serez notifié dès qu\'il aura signé.'}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-muted bg-muted">
            {step === 'config' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-primary hover:text-primary transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedClientId || !signatureLocation || !signatureDate}
                  className={`flex items-center gap-2 px-6 py-2.5 text-primary btn-primary rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    manualMode ? 'bg-info' : 'bg-accent'
                  }`}
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      {manualMode 
                        ? (t('creating') || 'Création...')
                        : (t('generating') || 'Génération...')
                      }
                    </>
                  ) : (
                    <>
                      {manualMode ? (
                        <IconEdit className="w-4 h-4" color="white" />
                      ) : (
                        <IconSparkles className="w-4 h-4" color="white" />
                      )}
                      {manualMode
                        ? (t('create_contract') || 'Créer le contrat')
                        : (t('generate_contract') || 'Générer le contrat')
                      }
                    </>
                  )}
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button
                  onClick={() => setStep('config')}
                  className="px-4 py-2 text-sm text-primary hover:text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyContract}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-primary rounded-lg hover:bg-card transition-colors"
                  >
                    <IconCopy className="w-4 h-4" />
                    {t('copy') || 'Copier'}
                  </button>
                  <button
                    onClick={() => {
                      if (!signatureLocation || !signatureDate) {
                        showGlobalPopup(
                          t('missing_signature_fields') || 'Veuillez renseigner le lieu et la date de signature.',
                          'error'
                        );
                        return;
                      }
                      setStep('sign');
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 btn-primary text-white rounded-xl hover:opacity-90 transition-colors"
                  >
                    <IconSignature className="w-4 h-4" color="white" />
                    {t('proceed_to_sign') || 'Passer à la signature'}
                  </button>
                </div>
              </>
            )}

            {step === 'sign' && (
              <>
                <button
                  onClick={() => setStep('review')}
                  className="px-4 py-2 text-sm text-primary hover:text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleConfirm}
                    disabled={!signatures.provider || saving || savedContract !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-primary rounded-lg hover:bg-card transition-colors disabled:opacity-50"
                  >
                    {savedContract ? (
                      <>
                        <IconCheck className="w-4 h-4" />
                        {t('saved') || 'Sauvegardé'}
                      </>
                    ) : (
                      <>
                        <IconCheck className="w-4 h-4" />
                        {t('save_only') || 'Sauvegarder'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleProceedToSend}
                    disabled={!signatures.provider || saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        {t('saving') || 'Sauvegarde...'}
                      </>
                    ) : (
                      <>
                        <IconMail className="w-4 h-4" />
                        {t('send_to_client') || 'Envoyer au client'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'send' && (
              <>
                <button
                  onClick={() => setStep('sign')}
                  className="px-4 py-2 text-sm text-primary hover:text-primary transition-colors"
                >
                  {t('back') || 'Retour'}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!savedContract}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-primary rounded-lg hover:bg-card transition-colors disabled:opacity-50"
                  >
                    <IconDownload className="w-4 h-4" />
                    {t('download_pdf') || 'PDF'}
                  </button>
                  <button
                    onClick={handleSendToClient}
                    disabled={saving || !selectedClient?.email}
                    className="flex items-center gap-2 px-6 py-2.5 bg-success text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        {t('sending') || 'Envoi...'}
                      </>
                    ) : (
                      <>
                        <IconSend className="w-4 h-4" />
                        {t('send_email') || 'Envoyer l\'email'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
