'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useModalScroll } from '@/hooks/useModalFocus';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  IconX,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconLoader2,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
  IconTable,
  IconLink,
  IconFileImport,
  IconMail,
  IconEye,
  IconSend,
  IconClipboardList,
} from '@tabler/icons-react';
import EmailPreviewModal from './EmailPreviewModal';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import type { TaskStatus, TaskPriority } from '@/types';
import * as XLSX from 'xlsx';

// Callback de progression pour l'import
export interface ImportProgressCallback {
  (current: number, total: number, taskTitle: string): void;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tasks: ImportedTask[], options: { 
    sendNotificationEmails: boolean;
    emailSubject?: string;
    emailMessage?: string;
  }, onProgress?: ImportProgressCallback) => Promise<void>;
  projectDocumentId: string;
  projectName?: string;
  projectUrl?: string;
  collaborators?: { id: number; documentId: string; username: string; email: string }[];
}

export interface ImportedTask {
  title: string;
  description: string;
  task_status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  progress: number;
  assigned_to: string | null; // documentId de l'utilisateur
  assigned_to_email: string | null; // Email de l'utilisateur assigné (pour notification)
  assigned_to_name: string | null; // Nom affiché de l'utilisateur assigné
  color: string | null;
  tags: string[];
}

// Colonnes de la table project-task qui peuvent être mappées
const TASK_FIELDS = [
  { key: 'title', label: 'title_field', required: true },
  { key: 'description', label: 'description_field', required: false },
  { key: 'task_status', label: 'status_field', required: false },
  { key: 'priority', label: 'priority_field', required: false },
  { key: 'progress', label: 'progress_field', required: false },
  { key: 'start_date', label: 'start_date_field', required: false },
  { key: 'due_date', label: 'due_date_field', required: false },
  { key: 'estimated_hours', label: 'estimated_hours_field', required: false },
  { key: 'actual_hours', label: 'actual_hours_field', required: false },
  { key: 'assigned_to', label: 'assigned_to_field', required: false },
  { key: 'tags', label: 'tags_field', required: false },
  { key: 'color', label: 'color_field', required: false },
] as const;

type TaskFieldKey = typeof TASK_FIELDS[number]['key'];

// Synonymes pour le mapping automatique
const FIELD_SYNONYMS: Record<TaskFieldKey, string[]> = {
  title: ['title', 'titre', 'nom', 'name', 'tâche', 'tache', 'task', 'intitulé', 'intitule', 'libellé', 'libelle', 'sujet', 'subject'],
  description: ['description', 'desc', 'détails', 'details', 'notes', 'note', 'commentaire', 'commentaires', 'comment', 'comments', 'remarques', 'remarque'],
  task_status: ['status', 'statut', 'état', 'etat', 'state', 'avancement', 'progression'],
  priority: ['priority', 'priorité', 'priorite', 'urgence', 'importance', 'niveau'],
  progress: ['progress', 'progression', '%', 'pourcentage', 'percent', 'completion', 'completé', 'complete'],
  start_date: ['start_date', 'start', 'début', 'debut', 'date_début', 'date_debut', 'date_de_début', 'date_de_debut', 'commence', 'begin', 'from', 'démarrage', 'demarrage'],
  due_date: ['due_date', 'end_date', 'end', 'fin', 'date_fin', 'date_de_fin', 'échéance', 'echeance', 'deadline', 'to', 'due', 'livraison', 'delivery'],
  estimated_hours: ['estimated_hours', 'estimated', 'heures_estimées', 'heures_estimees', 'estimation', 'estimate', 'temps_prévu', 'temps_prevu', 'heures_prévues', 'heures_prevues'],
  actual_hours: ['actual_hours', 'actual', 'heures_réelles', 'heures_reelles', 'heures_passées', 'heures_passees', 'temps_réel', 'temps_reel', 'spent', 'worked', 'temps_passé', 'temps_passe'],
  assigned_to: ['assigned_to', 'assigné', 'assigne', 'responsable', 'owner', 'user', 'utilisateur', 'membre', 'member', 'propriétaire', 'proprietaire', 'affecté', 'affecte', 'attribué', 'attribue'],
  tags: ['tags', 'tag', 'étiquettes', 'etiquettes', 'labels', 'label', 'catégories', 'categories', 'category', 'type', 'types'],
  color: ['color', 'couleur', 'colour', 'hex', 'code_couleur'],
};

// Mapping des valeurs de statut
const STATUS_MAPPING: Record<string, TaskStatus> = {
  'todo': 'todo',
  'à faire': 'todo',
  'a faire': 'todo',
  'not started': 'todo',
  'pending': 'todo',
  'en attente': 'todo',
  'in_progress': 'in_progress',
  'in progress': 'in_progress',
  'en cours': 'in_progress',
  'started': 'in_progress',
  'ongoing': 'in_progress',
  'completed': 'completed',
  'done': 'completed',
  'terminé': 'completed',
  'termine': 'completed',
  'fini': 'completed',
  'finished': 'completed',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'annulé': 'cancelled',
  'annule': 'cancelled',
};

// Mapping des valeurs de priorité
const PRIORITY_MAPPING: Record<string, TaskPriority> = {
  'low': 'low',
  'basse': 'low',
  'faible': 'low',
  'minor': 'low',
  'medium': 'medium',
  'moyenne': 'medium',
  'normal': 'medium',
  'moderate': 'medium',
  'high': 'high',
  'haute': 'high',
  'élevée': 'high',
  'elevee': 'high',
  'important': 'high',
  'urgent': 'urgent',
  'urgente': 'urgent',
  'critical': 'urgent',
  'critique': 'urgent',
};

type Step = 'upload' | 'mapping' | 'preview' | 'confirm_emails' | 'importing';

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImport,
  projectName = 'Projet',
  projectUrl = '',
  collaborators = [],
}: ExcelImportModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  const [step, setStep] = useState<Step>('upload');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewRecipientEmail, setPreviewRecipientEmail] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<TaskFieldKey, number | null>>({
    title: null,
    description: null,
    task_status: null,
    priority: null,
    progress: null,
    start_date: null,
    due_date: null,
    estimated_hours: null,
    actual_hours: null,
    assigned_to: null,
    tags: null,
    color: null,
  });
  const [previewTasks, setPreviewTasks] = useState<ImportedTask[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, taskTitle: '' });
  const [error, setError] = useState<string | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [loadingGoogleSheet, setLoadingGoogleSheet] = useState(false);
  const [availableTabs, setAvailableTabs] = useState<{ gid: string; name: string; rowCount: number }[]>([]);
  const [selectedTabGid, setSelectedTabGid] = useState<string | null>(null);
  const [detectingTabs, setDetectingTabs] = useState(false);
  const [sendNotificationEmails, setSendNotificationEmails] = useState(true);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Bloquer le scroll du body quand la modale est ouverte
  useModalScroll(isOpen, modalContentRef);

  // Reset modal state
  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setExcelData([]);
    setHeaders([]);
    setColumnMapping({
      title: null,
      description: null,
      task_status: null,
      priority: null,
      progress: null,
      start_date: null,
      due_date: null,
      estimated_hours: null,
      actual_hours: null,
      assigned_to: null,
      tags: null,
      color: null,
    });
    setPreviewTasks([]);
    setError(null);
    setGoogleSheetUrl('');
    setLoadingGoogleSheet(false);
    setAvailableTabs([]);
    setSelectedTabGid(null);
    setDetectingTabs(false);
    setFullWorkbook(null);
    setSheetIdForWorkbook(null);
    setSendNotificationEmails(true);
    setEmailSubject('');
    setEmailMessage('');
    setShowEmailPreview(false);
    setPreviewRecipientEmail(null);
    setImportProgress({ current: 0, total: 0, taskTitle: '' });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Auto-mapping des colonnes basé sur les noms de headers
  const autoMapColumns = useCallback((headerRow: string[]) => {
    const newMapping: Record<TaskFieldKey, number | null> = {
      title: null,
      description: null,
      task_status: null,
      priority: null,
      progress: null,
      start_date: null,
      due_date: null,
      estimated_hours: null,
      actual_hours: null,
      assigned_to: null,
      tags: null,
      color: null,
    };

    headerRow.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim().replace(/[_\s-]+/g, '_');
      
      for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
        if (newMapping[field as TaskFieldKey] !== null) continue;
        
        for (const synonym of synonyms) {
          if (normalizedHeader === synonym || 
              normalizedHeader.includes(synonym) || 
              synonym.includes(normalizedHeader)) {
            newMapping[field as TaskFieldKey] = index;
            break;
          }
        }
      }
    });

    setColumnMapping(newMapping);
  }, []);

  // Lecture du fichier Excel
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setError(null);
    setFile(uploadedFile);
    
    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir en array 2D
      const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { 
        header: 1,
        defval: '',
      });
      
      if (jsonData.length < 2) {
        setError(t('excel_no_data') || 'Le fichier ne contient pas assez de données');
        return;
      }

      const headerRow = jsonData[0].map(h => String(h || '').trim());
      const dataRows = jsonData.slice(1).filter(row => 
        row.some(cell => cell !== '' && cell !== null && cell !== undefined)
      );
      
      setHeaders(headerRow);
      setExcelData(dataRows.map(row => row.map(cell => String(cell || ''))));
      
      // Auto-mapping
      autoMapColumns(headerRow);
      
      setStep('mapping');
    } catch (err) {
      console.error('Error reading Excel file:', err);
      setError(t('excel_read_error') || 'Erreur lors de la lecture du fichier Excel');
    }
  }, [t, autoMapColumns]);

  // Gestion du drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (
      droppedFile.name.endsWith('.xlsx') || 
      droppedFile.name.endsWith('.xls') ||
      droppedFile.name.endsWith('.csv')
    )) {
      handleFileUpload(droppedFile);
    } else {
      setError(t('excel_invalid_format') || 'Format invalide. Utilisez .xlsx, .xls ou .csv');
    }
  }, [handleFileUpload, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Extraire l'ID et le gid (onglet) du Google Sheet depuis l'URL
  const extractGoogleSheetInfo = (url: string): { sheetId: string; gid: string | null } | null => {
    // Formats supportés:
    // https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=123456
    // https://docs.google.com/spreadsheets/d/SHEET_ID/edit?gid=123456
    // https://docs.google.com/spreadsheets/d/SHEET_ID/
    // https://docs.google.com/spreadsheets/d/SHEET_ID
    const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) return null;
    
    // Extraire le gid (ID de l'onglet) s'il existe
    const gidMatch = url.match(/[#?&]gid=(\d+)/);
    
    return {
      sheetId: sheetMatch[1],
      gid: gidMatch ? gidMatch[1] : null,
    };
  };

  // Stocker le workbook complet pour éviter de le re-télécharger
  const [fullWorkbook, setFullWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetIdForWorkbook, setSheetIdForWorkbook] = useState<string | null>(null);

  // Détecter les onglets disponibles dans un Google Sheet en téléchargeant le fichier XLSX complet
  const detectGoogleSheetTabs = useCallback(async (sheetId: string): Promise<{ gid: string; name: string; rowCount: number }[]> => {
    const tabs: { gid: string; name: string; rowCount: number }[] = [];
    
    try {
      // Télécharger le fichier XLSX complet (contient tous les onglets)
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      const response = await fetch(xlsxUrl, { redirect: 'follow' });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t('google_sheet_not_found') || 'Google Sheet non trouvé');
        }
        throw new Error(t('google_sheet_access_denied') || 'Accès refusé');
      }
      
      // Vérifier si on a été redirigé vers une page de connexion
      const finalUrl = response.url;
      if (finalUrl.includes('accounts.google.com') || finalUrl.includes('ServiceLogin')) {
        throw new Error(t('google_sheet_must_be_public') || 'Le Google Sheet doit être partagé publiquement');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Stocker le workbook pour ne pas avoir à le retélécharger
      setFullWorkbook(workbook);
      setSheetIdForWorkbook(sheetId);
      
      // Parcourir tous les onglets (sheets)
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
        
        // Compter les lignes non vides
        const nonEmptyRows = jsonData.filter(row => 
          row.some(cell => cell !== '' && cell !== null && cell !== undefined)
        );
        
        tabs.push({
          gid: String(index), // On utilise l'index comme identifiant
          name: sheetName,
          rowCount: Math.max(0, nonEmptyRows.length - 1), // -1 pour l'en-tête
        });
      });
      
    } catch (error) {
      console.error('Error detecting tabs:', error);
      throw error;
    }
    
    return tabs;
  }, [t]);

  // Charger un Google Sheet via son URL
  const handleGoogleSheetImport = useCallback(async (forceTabIndex?: string) => {
    if (!googleSheetUrl.trim()) {
      setError(t('google_sheet_url_required') || 'Veuillez coller un lien Google Sheets');
      return;
    }

    const sheetInfo = extractGoogleSheetInfo(googleSheetUrl);
    if (!sheetInfo) {
      setError(t('google_sheet_invalid_url') || 'Lien Google Sheets invalide');
      return;
    }

    // Utiliser l'index d'onglet forcé, ou celui sélectionné
    const tabIndexToUse = forceTabIndex || selectedTabGid;

    // Si pas d'index et pas encore d'onglets détectés, détecter les onglets
    if (!tabIndexToUse && availableTabs.length === 0 && !sheetInfo.gid) {
      setDetectingTabs(true);
      setError(null);
      
      try {
        const tabs = await detectGoogleSheetTabs(sheetInfo.sheetId);
        
        if (tabs.length === 0) {
          setError(t('google_sheet_access_denied') || 'Accès refusé. Vérifiez que le fichier est partagé publiquement.');
          return;
        }
        
        if (tabs.length === 1) {
          // Un seul onglet, charger directement
          setSelectedTabGid(tabs[0].gid);
          handleGoogleSheetImport(tabs[0].gid);
          return;
        }
        
        // Plusieurs onglets, afficher la sélection
        setAvailableTabs(tabs);
        return;
      } catch (err) {
        console.error('Error detecting tabs:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : (t('google_sheet_error') || 'Erreur lors du chargement du Google Sheet')
        );
        return;
      } finally {
        setDetectingTabs(false);
      }
    }

    setLoadingGoogleSheet(true);
    setError(null);

    try {
      let jsonData: string[][] = [];
      let sheetName = '';
      
      // Si on a déjà le workbook en mémoire, l'utiliser directement
      if (fullWorkbook && sheetIdForWorkbook === sheetInfo.sheetId && tabIndexToUse) {
        const tabIndex = parseInt(tabIndexToUse);
        sheetName = fullWorkbook.SheetNames[tabIndex] || fullWorkbook.SheetNames[0];
        const worksheet = fullWorkbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
      } else {
        // Sinon, télécharger le CSV de l'onglet spécifique ou le fichier XLSX complet
        if (sheetInfo.gid || tabIndexToUse === '0') {
          // Si on a un gid dans l'URL, utiliser l'export CSV
          let exportUrl = `https://docs.google.com/spreadsheets/d/${sheetInfo.sheetId}/export?format=csv`;
          if (sheetInfo.gid) {
            exportUrl += `&gid=${sheetInfo.gid}`;
          }
          
          const response = await fetch(exportUrl, { redirect: 'follow' });
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error(t('google_sheet_not_found') || 'Google Sheet non trouvé');
            }
            throw new Error(t('google_sheet_access_denied') || 'Accès refusé');
          }
          
          const finalUrl = response.url;
          if (finalUrl.includes('accounts.google.com') || finalUrl.includes('ServiceLogin')) {
            throw new Error(t('google_sheet_must_be_public') || 'Le Google Sheet doit être partagé publiquement');
          }
          
          const csvText = await response.text();
          if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
            throw new Error(t('google_sheet_must_be_public') || 'Le Google Sheet doit être partagé publiquement');
          }
          
          const workbook = XLSX.read(csvText, { type: 'string' });
          sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
        } else {
          // Télécharger le fichier XLSX complet
          const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetInfo.sheetId}/export?format=xlsx`;
          const response = await fetch(xlsxUrl, { redirect: 'follow' });
          
          if (!response.ok) {
            throw new Error(t('google_sheet_access_denied') || 'Accès refusé');
          }
          
          const finalUrl = response.url;
          if (finalUrl.includes('accounts.google.com') || finalUrl.includes('ServiceLogin')) {
            throw new Error(t('google_sheet_must_be_public') || 'Le Google Sheet doit être partagé publiquement');
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer);
          
          setFullWorkbook(workbook);
          setSheetIdForWorkbook(sheetInfo.sheetId);
          
          const tabIndex = tabIndexToUse ? parseInt(tabIndexToUse) : 0;
          sheetName = workbook.SheetNames[tabIndex] || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
        }
      }
      
      if (jsonData.length < 2) {
        setError(t('excel_no_data') || 'Le fichier ne contient pas assez de données');
        return;
      }

      const headerRow = jsonData[0].map(h => String(h || '').trim());
      const dataRows = jsonData.slice(1).filter(row => 
        row.some(cell => cell !== '' && cell !== null && cell !== undefined)
      );
      
      if (dataRows.length === 0) {
        setError(t('google_sheet_only_header') || 'Le fichier ne contient que des en-têtes, aucune donnée à importer');
        return;
      }
      
      // Créer un "fake file" pour l'affichage
      const selectedTab = availableTabs.find(tab => tab.gid === tabIndexToUse);
      const tabInfo = selectedTab ? ` - ${selectedTab.name}` : (sheetName ? ` - ${sheetName}` : '');
      setFile({ name: `Google Sheet${tabInfo}` } as File);
      setHeaders(headerRow);
      setExcelData(dataRows.map(row => row.map(cell => String(cell || ''))));
      
      // Auto-mapping
      autoMapColumns(headerRow);
      
      // Reset tab selection
      setAvailableTabs([]);
      setSelectedTabGid(null);
      setFullWorkbook(null);
      setSheetIdForWorkbook(null);
      
      setStep('mapping');
    } catch (err) {
      console.error('Error loading Google Sheet:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : (t('google_sheet_error') || 'Erreur lors du chargement du Google Sheet')
      );
    } finally {
      setLoadingGoogleSheet(false);
    }
  }, [googleSheetUrl, t, autoMapColumns, selectedTabGid, availableTabs, detectGoogleSheetTabs, fullWorkbook, sheetIdForWorkbook]);

  // Parse une date depuis différents formats
  const parseDate = (value: string): string | null => {
    if (!value || value.trim() === '') return null;
    
    // Si c'est un nombre Excel (serial date)
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
      // Convertir serial Excel en date
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Essayer de parser comme date
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Ignorer l'erreur
    }
    
    // Essayer format DD/MM/YYYY
    const frMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (frMatch) {
      const [, day, month, year] = frMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  };

  // Générer les initiales à partir d'un nom
  const getInitials = (name: string): string => {
    return name
      .split(/[\s.-]+/)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  };

  // Trouver un collaborateur par nom, email ou initiales
  // Retourne { documentId, email, name } ou null
  const findCollaborator = (value: string): { documentId: string; email: string; name: string } | null => {
    if (!value || value.trim() === '') return null;
    
    const normalizedValue = value.toLowerCase().trim();
    const isEmail = normalizedValue.includes('@');
    
    // 1. Recherche par email exact (priorité haute)
    if (isEmail) {
      for (const collab of collaborators) {
        if (collab.email?.toLowerCase() === normalizedValue) {
          return { documentId: collab.documentId, email: collab.email, name: collab.username };
        }
      }
    }
    
    // 2. Recherche par username exact
    for (const collab of collaborators) {
      if (collab.username?.toLowerCase() === normalizedValue) {
        return { documentId: collab.documentId, email: collab.email, name: collab.username };
      }
    }
    
    // 3. Recherche par initiales (ex: "ALG" pour "Arthur Le Goux")
    const searchInitials = normalizedValue.toUpperCase().replace(/[^A-Z]/g, '');
    if (searchInitials.length >= 2 && searchInitials.length <= 4) {
      for (const collab of collaborators) {
        const collabInitials = getInitials(collab.username || '');
        if (collabInitials === searchInitials) {
          return { documentId: collab.documentId, email: collab.email, name: collab.username };
        }
      }
    }
    
    // 4. Recherche partielle (nom contient ou est contenu)
    for (const collab of collaborators) {
      const collabName = collab.username?.toLowerCase() || '';
      // Le nom du collaborateur contient la valeur recherchée
      if (collabName.includes(normalizedValue) || normalizedValue.includes(collabName)) {
        return { documentId: collab.documentId, email: collab.email, name: collab.username };
      }
      // Comparaison des parties du nom (prénom ou nom de famille)
      const collabParts = collabName.split(/[\s.-]+/);
      const searchParts = normalizedValue.split(/[\s.-]+/);
      for (const searchPart of searchParts) {
        if (searchPart.length >= 3) {
          for (const collabPart of collabParts) {
            if (collabPart.includes(searchPart) || searchPart.includes(collabPart)) {
              return { documentId: collab.documentId, email: collab.email, name: collab.username };
            }
          }
        }
      }
    }
    
    return null;
  };

  // Générer l'aperçu des tâches
  const generatePreview = useCallback(() => {
    if (columnMapping.title === null) {
      setError(t('excel_title_required') || 'Le champ "Titre" est requis');
      return;
    }

    const tasks: ImportedTask[] = excelData.map((row) => {
      const getValue = (field: TaskFieldKey): string => {
        const colIndex = columnMapping[field];
        if (colIndex === null || colIndex === undefined) return '';
        return row[colIndex] || '';
      };

      // Parser le statut
      let status: TaskStatus = 'todo';
      const statusValue = getValue('task_status').toLowerCase().trim();
      if (statusValue && STATUS_MAPPING[statusValue]) {
        status = STATUS_MAPPING[statusValue];
      }

      // Parser la priorité
      let priority: TaskPriority = 'medium';
      const priorityValue = getValue('priority').toLowerCase().trim();
      if (priorityValue && PRIORITY_MAPPING[priorityValue]) {
        priority = PRIORITY_MAPPING[priorityValue];
      }

      // Parser les heures estimées
      let estimatedHours: number | null = null;
      const hoursValue = getValue('estimated_hours');
      if (hoursValue) {
        const parsed = parseFloat(hoursValue);
        if (!isNaN(parsed)) estimatedHours = parsed;
      }

      // Parser les heures réelles
      let actualHours: number | null = null;
      const actualHoursValue = getValue('actual_hours');
      if (actualHoursValue) {
        const parsed = parseFloat(actualHoursValue);
        if (!isNaN(parsed)) actualHours = parsed;
      }

      // Parser le progress (0-100)
      let progress = 0;
      const progressValue = getValue('progress');
      if (progressValue) {
        const parsed = parseFloat(progressValue.replace('%', ''));
        if (!isNaN(parsed)) {
          progress = Math.min(100, Math.max(0, parsed));
        }
      }

      // Parser les tags (séparés par virgule ou point-virgule)
      let tags: string[] = [];
      const tagsValue = getValue('tags');
      if (tagsValue) {
        tags = tagsValue.split(/[,;]/).map(t => t.trim()).filter(Boolean);
      }

      // Parser la couleur (format hex)
      let color: string | null = null;
      const colorValue = getValue('color');
      if (colorValue) {
        const hexMatch = colorValue.match(/#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/);
        if (hexMatch) {
          color = colorValue.startsWith('#') ? colorValue : `#${hexMatch[1]}`;
        }
      }

      // Trouver le collaborateur assigné
      const assignedValue = getValue('assigned_to');
      const collaboratorMatch = findCollaborator(assignedValue);

      return {
        title: getValue('title') || 'Sans titre',
        description: getValue('description'),
        task_status: status,
        priority,
        progress,
        start_date: parseDate(getValue('start_date')),
        due_date: parseDate(getValue('due_date')),
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
        assigned_to: collaboratorMatch?.documentId || null,
        assigned_to_email: collaboratorMatch?.email || null,
        assigned_to_name: collaboratorMatch?.name || assignedValue || null,
        tags,
        color,
      };
    }).filter(task => task.title && task.title !== 'Sans titre');

    if (tasks.length === 0) {
      // Debug: afficher les infos pour aider l'utilisateur
      const titleColIndex = columnMapping.title;
      
      if (titleColIndex === null) {
        setError(t('excel_title_not_mapped') || 'Veuillez mapper la colonne "Titre" dans les options de mapping ci-dessus');
      } else {
        setError(
          (t('excel_no_valid_tasks') || 'Aucune tâche valide trouvée') + 
          `. ${t('excel_title_column_empty') || 'La colonne titre semble vide. Vérifiez le mapping.'}`
        );
      }
      return;
    }

    setPreviewTasks(tasks);
    setStep('preview');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnMapping, excelData, collaborators, t]);

  // Vérifier si des tâches ont des assignations avec email
  // Exclure les tâches terminées ou annulées
  const EXCLUDED_STATUSES: TaskStatus[] = ['completed', 'cancelled'];
  const tasksWithAssignedEmails = previewTasks.filter(
    task => task.assigned_to && task.assigned_to_email && !EXCLUDED_STATUSES.includes(task.task_status)
  );
  const uniqueAssignedEmails = [...new Set(tasksWithAssignedEmails.map(t => t.assigned_to_email))];

  // Passer à l'étape de confirmation d'emails ou directement à l'import
  const handleProceedToImport = useCallback(() => {
    if (uniqueAssignedEmails.length > 0) {
      // Initialiser les valeurs d'email
      if (!emailSubject) {
        setEmailSubject(`Nouvelles tâches assignées - ${projectName}`);
      }
      if (!emailMessage) {
        setEmailMessage(`Vous avez de nouvelles tâches assignées sur le projet "${projectName}". Veuillez consulter les détails ci-dessous.`);
      }
      setStep('confirm_emails');
    } else {
      handleImportFinal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueAssignedEmails.length, projectName, emailSubject, emailMessage]);

  // Importer les tâches
  const handleImportFinal = useCallback(async () => {
    setImporting(true);
    setStep('importing');
    setImportProgress({ current: 0, total: previewTasks.length, taskTitle: '' });
    
    // Callback pour mettre à jour la progression
    const onProgress: ImportProgressCallback = (current, total, taskTitle) => {
      setImportProgress({ current, total, taskTitle });
    };
    
    try {
      await onImport(previewTasks, { 
        sendNotificationEmails,
        emailSubject: sendNotificationEmails ? emailSubject : undefined,
        emailMessage: sendNotificationEmails ? emailMessage : undefined,
      }, onProgress);
      handleClose();
    } catch (err) {
      console.error('Error importing tasks:', err);
      setError(t('excel_import_error') || 'Erreur lors de l\'import des tâches');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  }, [previewTasks, onImport, handleClose, t, sendNotificationEmails, emailSubject, emailMessage]);

  // Générer le HTML de l'email pour un destinataire spécifique
  const generateEmailPreviewHtml = (recipientEmail: string): string => {
    const collaborator = collaborators.find(c => c.email === recipientEmail);
    const recipientTasks = tasksWithAssignedEmails.filter(t => t.assigned_to_email === recipientEmail);
    const username = collaborator?.username || recipientEmail;
    
    const taskListHtml = recipientTasks.map(task => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
          <div style="font-weight: 600; color: #1F2937; margin-bottom: 4px;">${task.title}</div>
          ${task.description ? `<div style="font-size: 13px; color: #6B7280; margin-bottom: 4px;">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
          <div style="font-size: 12px; color: #9CA3AF;">
            ${task.priority ? `Priorité: ${task.priority} • ` : ''}
            ${task.due_date ? `Échéance: ${new Date(task.due_date).toLocaleDateString('fr-FR')}` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
        📋 Nouvelles tâches assignées
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
        Projet: ${projectName}
      </p>
    </div>
    
    <!-- Content -->
    <div style="background-color: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <p style="color: #1F2937; font-size: 16px; margin: 0 0 16px;">
        Bonjour <strong>${username}</strong>,
      </p>
      
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        ${emailMessage.replace(/\n/g, '<br>')}
      </p>
      
      <div style="background-color: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: inline-block;">
        <span style="color: #7C3AED; font-weight: 600; font-size: 14px;">
          ${recipientTasks.length} tâche${recipientTasks.length > 1 ? 's' : ''} ${recipientTasks.length > 1 ? 'vous ont été assignées' : 'vous a été assignée'}
        </span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <thead>
          <tr>
            <th style="padding: 12px 16px; text-align: left; background-color: #F3F4F6; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Vos tâches
            </th>
          </tr>
        </thead>
        <tbody>
          ${taskListHtml}
        </tbody>
      </table>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${projectUrl || '#'}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
          Voir mes tâches →
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Cet email a été envoyé automatiquement depuis Eclipse Dashboard.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
        onClick={handleClose}
        onWheel={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className="bg-card border border-default rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center z-10">
                  <IconFileImport className="w-5 h-5 !text-success-text -text" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  {t('import_spreadsheet') || 'Importer depuis Excel / Google Sheets'}
                </h2>
                <p className="text-sm text-muted">
                  {step === 'upload' && (t('excel_step_upload') || 'Étape 1: Sélectionnez votre fichier')}
                  {step === 'mapping' && (t('excel_step_mapping') || 'Étape 2: Mappez les colonnes')}
                  {step === 'preview' && (t('excel_step_preview') || 'Étape 3: Vérifiez l\'aperçu')}
                  {step === 'confirm_emails' && (t('excel_step_confirm_emails') || 'Étape 4: Notifications')}
                  {step === 'importing' && (t('excel_step_importing') || 'Import en cours...')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div 
            ref={modalContentRef}
            tabIndex={-1}
            className="flex-1 overflow-auto p-6 focus:outline-none"
          >
            {/* Error Modal Overlay */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-6"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-accent"
                  >
                    {/* Header */}
                    <div className="bg-danger-light p-5 flex items-center gap-4 border-b border-danger">
                      <div className="w-12 h-12 rounded-full bg-danger-light flex items-center justify-center">
                        <IconAlertCircle className="w-6 h-6 text-danger" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-danger">
                          {t('import_error') || 'Erreur d\'import'}
                        </h3>
                        <p className="text-sm text-muted">
                          {t('check_instructions') || 'Veuillez vérifier les instructions ci-dessous'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 space-y-4">
                      <p className="text-primary text-sm">{error}</p>
                      
                      {/* Instructions for Google Sheets */}
                      {error.includes('publiquement') && (
                        <div className="bg-muted rounded-lg p-4 space-y-3">
                          <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                            <Image
                              src="/images/google-sheets-icon.png"
                              alt="Google Sheets"
                              width={18}
                              height={18}
                            />
                            {t('how_to_share') || 'Comment partager votre Google Sheet :'}
                          </h4>
                          <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
                            <li>{t('share_step_1') || 'Ouvrez votre Google Sheet'}</li>
                            <li>{t('share_step_2') || 'Cliquez sur le bouton "Partager" (en haut à droite)'}</li>
                            <li>{t('share_step_3') || 'Cliquez sur "Modifier" à côté de "Accès limité"'}</li>
                            <li>{t('share_step_4') || 'Sélectionnez "Tous ceux disposant du lien"'}</li>
                            <li>{t('share_step_5') || 'Assurez-vous que le rôle est "Lecteur"'}</li>
                            <li>{t('share_step_6') || 'Cliquez sur "Copier le lien" puis "OK"'}</li>
                          </ol>
                        </div>
                      )}
                    </div>
                    
                    {/* Footer */}
                    <div className="p-5 pt-0 flex justify-end">
                      <button
                        onClick={() => setError(null)}
                        className="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2"
                      >
                        <IconCheck className="w-4 h-4" />
                        {t('understood') || 'Compris'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Option 1: Upload de fichier */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-default hover:border-accent rounded-xl p-8 text-center transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileUpload(selectedFile);
                    }}
                  />
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center">
                      <Image
                        src="/images/excel-icon.png"
                        alt="Excel"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <h3 className="text-base font-medium text-primary mb-2">
                    {t('spreadsheet_drop_file') || 'Glissez-déposez votre fichier'}
                  </h3>
                  <p className="text-sm text-muted mb-3">
                    {t('excel_or_click') || 'ou cliquez pour sélectionner'}
                  </p>
                  <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors inline-flex items-center gap-2 text-sm">
                    <IconUpload className="w-4 h-4" />
                    {t('excel_select_file') || 'Sélectionner un fichier'}
                  </button>
                  <p className="!text-xs text-muted mt-3">
                    {t('spreadsheet_formats') || 'Formats: .xlsx, .xls, .csv'}
                  </p>
                </div>

                {/* Séparateur "ou" */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-default" />
                  <span className="text-sm text-muted font-medium">{t('or') || 'ou'}</span>
                  <div className="flex-1 h-px bg-default" />
                </div>

                {/* Option 2: Lien Google Sheets */}
                <div className="border border-default rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                      <Image
                        src="/images/google-sheets-icon.png"
                        alt="Google Sheets"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-primary">
                        {t('google_sheet_link') || 'Lien Google Sheets'}
                      </h3>
                      <p className="!text-xs text-muted">
                        {t('google_sheet_must_be_public') || 'Le fichier doit être partagé publiquement'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="url"
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full !pl-10 !pr-4 py-2.5 bg-muted border border-default rounded-lg text-primary text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoogleSheetImport();
                      }}
                      disabled={loadingGoogleSheet || !googleSheetUrl.trim()}
                      className="px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {loadingGoogleSheet ? (
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <IconArrowRight className="w-4 h-4" />
                      )}
                      {t('load') || 'Charger'}
                    </button>
                  </div>
                  
                  {/* Détection des onglets en cours */}
                  {detectingTabs && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconLoader2 className="w-5 h-5 !text-accent animate-spin" />
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {t('detecting_tabs') || 'Détection des onglets...'}
                          </p>
                          <p className="!text-xs text-muted">
                            {t('detecting_tabs_hint') || 'Recherche des onglets disponibles dans le fichier'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sélection d'onglet si plusieurs détectés */}
                  {availableTabs.length > 1 && (
                    <div className="mt-4 p-4 bg-accent-light border border-accent rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <IconTable className="w-5 h-5 !text-accent" />
                        <h4 className="text-sm font-medium text-primary">
                          {t('select_tab') || 'Sélectionnez un onglet'}
                        </h4>
                      </div>
                      <p className="!text-xs text-muted mb-3">
                        {t('multiple_tabs_found') || 'Plusieurs onglets ont été détectés dans ce fichier'}
                      </p>
                      <div className="space-y-2">
                        {availableTabs.map((tab) => (
                          <button
                            key={tab.gid}
                            onClick={() => {
                              setSelectedTabGid(tab.gid);
                              handleGoogleSheetImport(tab.gid);
                            }}
                            disabled={loadingGoogleSheet}
                            className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between ${
                              selectedTabGid === tab.gid
                                ? 'border-accent bg-accent text-white'
                                : 'border-default bg-card hover:border-accent hover:bg-hover'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                selectedTabGid === tab.gid ? 'bg-white/20' : 'bg-muted'
                              }`}>
                                <IconTable className={`w-4 h-4 ${
                                  selectedTabGid === tab.gid ? 'text-white' : 'text-accent'
                                }`} />
                              </div>
                              <div className="text-left">
                                <p className={`text-sm font-medium ${
                                  selectedTabGid === tab.gid ? 'text-white' : 'text-primary'
                                }`}>
                                  {tab.name}
                                </p>
                                <p className={`text-xs ${
                                  selectedTabGid === tab.gid ? 'text-white/70' : 'text-muted'
                                }`}>
                                  {tab.rowCount} {t('rows') || 'lignes'}
                                </p>
                              </div>
                            </div>
                            {loadingGoogleSheet && selectedTabGid === tab.gid && (
                              <IconLoader2 className="w-4 h-4 animate-spin text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTabs.length === 0 && !detectingTabs && (
                    <p className="!text-xs text-muted mt-3 flex items-start gap-1">
                      <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {t('google_sheet_share_hint') || 'Fichier > Partager > "Tous ceux disposant du lien peuvent consulter"'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Mapping */}
            {step === 'mapping' && (
              <div className="space-y-6">
                {/* File info */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center -space-x-1">
                    <Image
                      src="/images/excel-icon.png"
                      alt="Excel"
                      width={20}
                      height={20}
                    />
                    <Image
                      src="/images/google-sheets-icon.png"
                      alt="Google Sheets"
                      width={20}
                      height={20}
                    />
                  </div>
                  <span className="text-sm text-primary font-medium">{file?.name}</span>
                  <span className="!text-xs text-muted">
                    ({excelData.length} {t('rows') || 'lignes'})
                  </span>
                </div>

                {/* Mapping grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TASK_FIELDS.map((field) => (
                    <div key={field.key} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-primary flex items-center gap-1">
                          {t(field.label) || field.key}
                          {field.required && <span className="text-danger">*</span>}
                        </label>
                        {columnMapping[field.key] !== null && (
                          <IconCheck className="w-4 h-4 !text-success-text -text" />
                        )}
                      </div>
                      <select
                        value={columnMapping[field.key] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setColumnMapping(prev => ({
                            ...prev,
                            [field.key]: value === '' ? null : parseInt(value),
                          }));
                        }}
                        className="w-full px-3 py-2 bg-card border border-default rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">{t('excel_not_mapped') || '-- Non mappé --'}</option>
                        {headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header || `Colonne ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview of first row */}
                {excelData.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                      <IconTable className="w-4 h-4" />
                      {t('excel_preview_first') || 'Aperçu de la première ligne'}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>
                            {headers.map((header, i) => (
                              <th key={i} className="px-3 py-2 text-left text-muted bg-muted font-medium">
                                {header || `Col ${i + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {excelData[0]?.map((cell, i) => (
                              <td key={i} className="px-3 py-2 text-primary border-t border-default">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-secondary">
                    {previewTasks.length} {t('tasks_to_import') || 'tâches à importer'}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left text-primary font-medium">{t('title') || 'Titre'}</th>
                        <th className="px-3 py-2 text-left text-primary font-medium">{t('status') || 'Statut'}</th>
                        <th className="px-3 py-2 text-left text-primary font-medium">{t('priority') || 'Priorité'}</th>
                        <th className="px-3 py-2 text-left text-primary font-medium">{t('due_date') || 'Échéance'}</th>
                        <th className="px-3 py-2 text-left text-primary font-medium">{t('assigned') || 'Assigné'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTasks.slice(0, 10).map((task, index) => (
                        <tr key={index} className="border-t border-default hover:bg-hover">
                          <td className="px-3 py-2 text-primary">{task.title}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded !text-xs font-medium ${
                              task.task_status === 'completed' ? 'bg-success-light !text-success-text ' :
                              task.task_status === 'in_progress' ? 'bg-info-light text-info' :
                              task.task_status === 'cancelled' ? 'bg-danger-light text-danger' :
                              'bg-muted text-secondary'
                            }`}>
                              {t(task.task_status) || task.task_status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded !text-xs font-medium ${
                              task.priority === 'urgent' ? 'bg-danger-light text-danger' :
                              task.priority === 'high' ? 'bg-warning-light text-warning' :
                              task.priority === 'medium' ? 'bg-info-light text-info' :
                              'bg-muted text-secondary'
                            }`}>
                              {t(task.priority) || task.priority}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-secondary">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="px-3 py-2 text-secondary">
                            {task.assigned_to 
                              ? collaborators.find(c => c.documentId === task.assigned_to)?.username || '-'
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewTasks.length > 10 && (
                  <p className="!text-xs text-muted text-center">
                    {t('excel_and_more') || 'et'} {previewTasks.length - 10} {t('excel_more_tasks') || 'autres tâches...'}
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Confirm Emails */}
            {step === 'confirm_emails' && (
              <div className="space-y-6">
                {/* Toggle pour l'envoi d'emails */}
                <div className="p-4 bg-card border border-default rounded-lg">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <IconMail className="w-5 h-5 !text-accent" />
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {t('send_notification_emails') || 'Envoyer des notifications par email'}
                        </p>
                        <p className="!text-xs text-muted">
                          {uniqueAssignedEmails.length} {t('recipients') || 'destinataire(s)'} • {tasksWithAssignedEmails.length} {t('tasks') || 'tâches'}
                        </p>
                      </div>
                    </div>
                    <div 
                      onClick={() => setSendNotificationEmails(!sendNotificationEmails)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        sendNotificationEmails ? 'bg-accent' : 'bg-muted'
                      }`}
                    >
                      <div 
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          sendNotificationEmails ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {sendNotificationEmails && (
                  <>
                    {/* Formulaire d'email */}
                    <div className="space-y-4">
                      {/* Objet */}
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          {t('email_subject') || 'Objet de l\'email'}
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-4 py-2 bg-muted border border-default rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="Nouvelles tâches assignées..."
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          {t('email_message') || 'Message personnalisé'}
                        </label>
                        <textarea
                          value={emailMessage}
                          onChange={(e) => setEmailMessage(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 bg-muted border border-default rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                          placeholder="Votre message..."
                        />
                        <p className="!text-xs text-muted mt-1">
                          {t('email_message_hint') || 'Ce message sera affiché avant la liste des tâches'}
                        </p>
                      </div>
                    </div>

                    {/* Liste des destinataires */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-primary">
                          {t('recipients_preview') || 'Destinataires'}
                        </h4>
                        <p className="!text-xs text-muted">
                          {t('one_email_per_person') || 'Un seul email par personne avec toutes ses tâches'}
                        </p>
                      </div>
                      <div className="bg-muted rounded-xl divide-y divide-default overflow-hidden max-h-48 overflow-y-auto">
                        {uniqueAssignedEmails.map((email, idx) => {
                          const tasks = tasksWithAssignedEmails.filter(t => t.assigned_to_email === email);
                          const collaborator = collaborators.find(c => c.email === email);
                          return (
                            <div key={idx} className="p-3 flex items-center justify-between hover:bg-hover transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center !text-accent font-medium text-sm">
                                  {collaborator?.username?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-primary">{collaborator?.username || email}</p>
                                  <p className="!text-xs text-muted">{email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="!text-xs bg-accent-light !text-accent px-2 py-1 rounded-full flex items-center gap-1">
                                  <IconClipboardList className="w-3 h-3" />
                                  {tasks.length}
                                </span>
                                <button
                                  onClick={() => {
                                    setPreviewRecipientEmail(email || null);
                                    setShowEmailPreview(true);
                                  }}
                                  className="p-1.5 text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors"
                                  title={t('preview') || 'Aperçu'}
                                >
                                  <IconEye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Info box */}
                    <div className="p-3 bg-info-light border border-info rounded-lg flex items-start gap-2">
                      <IconMail className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                      <p className="!text-xs text-primary">
                        {t('email_info_consolidated') || 'Chaque collaborateur recevra UN SEUL email contenant la liste de toutes ses tâches avec un bouton pour accéder au projet.'}
                      </p>
                    </div>
                  </>
                )}

                {/* Message si emails désactivés */}
                {!sendNotificationEmails && (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <IconMail className="w-8 h-8 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">
                      {t('no_emails_will_be_sent') || 'Aucun email ne sera envoyé. Les collaborateurs ne seront pas notifiés.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Importing */}
            {step === 'importing' && (
              <div className="py-8 space-y-6">
                {/* Animation et compteur */}
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <IconLoader2 className="w-12 h-12 !text-accent animate-spin" />
                    <span className="absolute !text-xs font-bold !text-accent">
                      {importProgress.current}/{importProgress.total}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-primary mb-1">
                    {t('excel_importing') || 'Import en cours...'}
                  </h3>
                  <p className="text-sm text-muted">
                    {importProgress.current} / {importProgress.total} {t('tasks') || 'tâches'}
                  </p>
                </div>

                {/* Barre de progression */}
                <div className="max-w-md mx-auto">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: importProgress.total > 0 
                          ? `${(importProgress.current / importProgress.total) * 100}%` 
                          : '0%' 
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 !text-xs text-muted">
                    <span>0%</span>
                    <span className="font-medium !text-accent">
                      {importProgress.total > 0 
                        ? Math.round((importProgress.current / importProgress.total) * 100) 
                        : 0}%
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Tâche en cours */}
                {importProgress.taskTitle && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md mx-auto"
                  >
                    <div className="p-4 bg-muted rounded-xl border border-default">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                          <IconCheck className="w-4 h-4 !text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="!text-xs text-muted mb-0.5">
                            {t('current_task') || 'Tâche en cours'}
                          </p>
                          <p className="text-sm font-medium text-primary truncate">
                            {importProgress.taskTitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <p className="!text-xs text-muted text-center">
                  {t('excel_please_wait') || 'Veuillez patienter pendant la création des tâches'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-default bg-muted-light">
            <div>
              {step !== 'upload' && step !== 'importing' && (
                <button
                  onClick={() => {
                    if (step === 'mapping') {
                      resetState();
                    } else if (step === 'preview') {
                      setStep('mapping');
                    } else if (step === 'confirm_emails') {
                      setStep('preview');
                    }
                  }}
                  className="px-4 py-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors flex items-center gap-2"
                >
                  <IconArrowLeft className="w-4 h-4" />
                  {t('back') || 'Retour'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'mapping' && (
                <>
                  <button
                    onClick={() => autoMapColumns(headers)}
                    className="px-4 py-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors flex items-center gap-2"
                  >
                    <IconRefresh className="w-4 h-4" />
                    {t('excel_auto_map') || 'Auto-mapper'}
                  </button>
                  <button
                    onClick={generatePreview}
                    disabled={columnMapping.title === null}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('continue') || 'Continuer'}
                    <IconArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
              {step === 'preview' && (
                <button
                  onClick={handleProceedToImport}
                  disabled={importing || previewTasks.length === 0}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <IconArrowRight className="w-4 h-4" />
                  {uniqueAssignedEmails.length > 0 
                    ? (t('next') || 'Suivant')
                    : (t('excel_import_tasks') || 'Importer les tâches')}
                  {uniqueAssignedEmails.length === 0 && ` (${previewTasks.length})`}
                </button>
              )}
              {step === 'confirm_emails' && (
                <button
                  onClick={handleImportFinal}
                  disabled={importing || (sendNotificationEmails && !emailSubject.trim())}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {sendNotificationEmails ? (
                    <IconSend className="w-4 h-4" />
                  ) : (
                    <IconCheck className="w-4 h-4" />
                  )}
                  {sendNotificationEmails 
                    ? (t('import_and_send') || 'Importer et envoyer')
                    : (t('excel_import_tasks') || 'Importer les tâches')}
                  ({previewTasks.length})
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Email Preview Modal */}
      {showEmailPreview && previewRecipientEmail && (
        <EmailPreviewModal
          isOpen={showEmailPreview}
          onClose={() => {
            setShowEmailPreview(false);
            setPreviewRecipientEmail(null);
          }}
          emailData={{
            subject: emailSubject,
            content: emailMessage,
            htmlContent: generateEmailPreviewHtml(previewRecipientEmail),
          }}
          senderInfo={{
            firstName: user?.username?.split(' ')[0] || 'Eclipse',
            lastName: user?.username?.split(' ').slice(1).join(' ') || 'Dashboard',
            email: user?.email || 'noreply@eclipsestudiodev.fr',
            profilePicture: null,
          }}
          includeSignature={false}
          primaryColor="#7C3AED"
          translations={{
            mailbox_preview: t('mailbox_preview') || 'Aperçu boîte mail',
            inbox: t('inbox') || 'Boîte de réception',
            favorites: t('favorites') || 'Favoris',
            sent_folder: t('sent_folder') || 'Envoyés',
            archives: t('archives') || 'Archives',
            trash: t('trash') || 'Corbeille',
            search_placeholder: t('search_placeholder') || 'Rechercher...',
            now: t('now') || 'À l\'instant',
            to_me: t('to_me') || 'à moi',
          }}
        />
      )}
    </AnimatePresence>
  );
}

