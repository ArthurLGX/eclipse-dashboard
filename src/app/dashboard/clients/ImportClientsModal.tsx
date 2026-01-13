'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconX, 
  IconUpload, 
  IconCheck, 
  IconAlertCircle,
  IconTrash,
  IconUser,
  IconMail,
  IconBuilding,
  IconWorld,
  IconInfoCircle,
  IconFileTypeCsv,
  IconBraces,
  IconListDetails,
  IconReload
} from '@tabler/icons-react';
import ClientAvatar from '@/app/components/ClientAvatar';
import { useModalScroll } from '@/hooks/useModalFocus';
import type { DuplicateCheckMode } from '@/lib/api';

export interface ImportedClient {
  name: string;
  email: string;
  company?: string;
  enterprise?: string;
  website?: string;
  image?: string;
  processStatus?: string;
  number?: string;
  adress?: string;
  isValid: boolean;
  error?: string;
}

export type DuplicateAction = 'skip' | 'error';
export type ImportMode = 'json' | 'csv' | 'email_list';

interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (clients: ImportedClient[], duplicateCheckMode: DuplicateCheckMode, duplicateAction: DuplicateAction) => Promise<void>;
  t: (key: string) => string;
}

export default function ImportClientsModal({ isOpen, onClose, onImport, t }: ImportClientsModalProps) {
  const [importedClients, setImportedClients] = useState<ImportedClient[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Bloquer le scroll du body quand la modale est ouverte
  useModalScroll(isOpen);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCheckMode, setDuplicateCheckMode] = useState<DuplicateCheckMode>('email_only');
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'error'>('error');
  const [importMode, setImportMode] = useState<ImportMode>('json');
  const [emailListText, setEmailListText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import mode options
  const importModeOptions: { value: ImportMode; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: 'json',
      label: 'JSON',
      icon: <IconBraces className="w-5 h-5" />,
      description: t('import_mode_json_desc') || 'Fichier JSON structuré'
    },
    {
      value: 'csv',
      label: 'CSV',
      icon: <IconFileTypeCsv className="w-5 h-5" />,
      description: t('import_mode_csv_desc') || 'Fichier CSV (Excel, Mailchimp...)'
    },
    {
      value: 'email_list',
      label: t('import_mode_email_list') || 'Liste d\'emails',
      icon: <IconListDetails className="w-5 h-5" />,
      description: t('import_mode_email_list_desc') || 'Coller une liste d\'emails'
    },
  ];

  const duplicateActionOptions: { value: 'skip' | 'error'; label: string; description: string }[] = [
    { 
      value: 'skip', 
      label: t('duplicate_action_skip') || 'Ignorer les doublons',
      description: t('duplicate_action_skip_desc') || 'Les clients existants seront ignorés, seuls les nouveaux seront ajoutés'
    },
    { 
      value: 'error', 
      label: t('duplicate_action_error') || 'Signaler en erreur',
      description: t('duplicate_action_error_desc') || 'Les doublons seront marqués comme erreurs dans le rapport'
    },
  ];

  const duplicateCheckOptions: { value: DuplicateCheckMode; label: string; description: string }[] = [
    { 
      value: 'email_only', 
      label: t('duplicate_email_only') || 'Email uniquement',
      description: t('duplicate_email_only_desc') || 'Bloque si l\'email existe déjà (recommandé)'
    },
    { 
      value: 'name_only', 
      label: t('duplicate_name_only') || 'Nom uniquement',
      description: t('duplicate_name_only_desc') || 'Bloque si le nom existe déjà'
    },
    { 
      value: 'name_and_email', 
      label: t('duplicate_name_and_email') || 'Nom ET Email',
      description: t('duplicate_name_and_email_desc') || 'Bloque uniquement si les deux correspondent'
    },
    { 
      value: 'name_or_email', 
      label: t('duplicate_name_or_email') || 'Nom OU Email',
      description: t('duplicate_name_or_email_desc') || 'Bloque si l\'un ou l\'autre existe (restrictif)'
    },
  ];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Generate name from email (jean.dupont@gmail.com -> Jean Dupont)
  const generateNameFromEmail = (email: string): string => {
    const localPart = email.split('@')[0];
    // Replace common separators with spaces
    const nameParts = localPart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    return nameParts.join(' ') || email;
  };

  // Process email list (comma, semicolon, or newline separated)
  const processEmailList = useCallback((text: string) => {
    setError(null);
    
    // Split by common separators: comma, semicolon, newline, space
    const emails = text
      .split(/[,;\n\s]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      setError(t('import_error_no_emails') || 'Aucun email trouvé');
      return;
    }

    const processedClients: ImportedClient[] = emails.map(email => {
      const isValid = validateEmail(email);
      const name = generateNameFromEmail(email);
      
      return {
        name,
        email,
        enterprise: '',
        website: '',
        processStatus: 'client',
        number: '',
        adress: '',
        isValid,
        error: isValid ? '' : (t('import_error_invalid_email') || 'Email invalide'),
      };
    });

    setImportedClients(processedClients);
  }, [t]);

  // Process CSV data
  const processCsvData = useCallback((text: string) => {
    setError(null);
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      setError(t('import_error_empty_file') || 'Fichier vide');
      return;
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(/[,;]/).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indices
    const emailIndex = headers.findIndex(h => 
      h === 'email' || h === 'e-mail' || h === 'mail' || h === 'email address' || h === 'adresse email'
    );
    const nameIndex = headers.findIndex(h => 
      h === 'name' || h === 'nom' || h === 'full name' || h === 'nom complet' || h === 'first name' || h === 'prénom'
    );
    const lastNameIndex = headers.findIndex(h => 
      h === 'last name' || h === 'nom de famille' || h === 'surname' || h === 'nom'
    );
    const companyIndex = headers.findIndex(h => 
      h === 'company' || h === 'entreprise' || h === 'enterprise' || h === 'société' || h === 'organization'
    );
    const websiteIndex = headers.findIndex(h => 
      h === 'website' || h === 'site web' || h === 'site' || h === 'url' || h === 'web'
    );
    const phoneIndex = headers.findIndex(h => 
      h === 'phone' || h === 'téléphone' || h === 'tel' || h === 'mobile' || h === 'numéro'
    );

    if (emailIndex === -1) {
      setError(t('import_error_no_email_column') || 'Colonne "email" non trouvée dans le fichier CSV');
      return;
    }

    // Parse data rows
    const processedClients: ImportedClient[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parse CSV line (handle quoted values)
      const values = line.match(/("([^"]*)"|[^,;]+)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
      
      if (values.length === 0) continue;

      const email = values[emailIndex] || '';
      let name = '';
      
      if (nameIndex !== -1) {
        name = values[nameIndex] || '';
        if (lastNameIndex !== -1 && lastNameIndex !== nameIndex && values[lastNameIndex]) {
          name = `${name} ${values[lastNameIndex]}`.trim();
        }
      } else if (lastNameIndex !== -1) {
        name = values[lastNameIndex] || '';
      }
      
      // If no name found, generate from email
      if (!name && email) {
        name = generateNameFromEmail(email);
      }

      const company = companyIndex !== -1 ? (values[companyIndex] || '') : '';
      const website = websiteIndex !== -1 ? (values[websiteIndex] || '') : '';
      const phone = phoneIndex !== -1 ? (values[phoneIndex] || '') : '';

      let isValid = true;
      let errorMsg = '';

      if (!email.trim()) {
        isValid = false;
        errorMsg = t('import_error_email_required') || 'Email requis';
      } else if (!validateEmail(email)) {
        isValid = false;
        errorMsg = t('import_error_invalid_email') || 'Email invalide';
      }

      processedClients.push({
        name: name || email,
        email,
        enterprise: company,
        website,
        processStatus: 'client',
        number: phone,
        adress: '',
        isValid,
        error: errorMsg,
      });
    }

    if (processedClients.length === 0) {
      setError(t('import_error_no_valid_rows') || 'Aucune ligne valide trouvée');
      return;
    }

    setImportedClients(processedClients);
  }, [t]);

  const processJsonData = useCallback((data: unknown) => {
    setError(null);
    
    // Ensure data is an array
    const clientsArray = Array.isArray(data) ? data : [data];
    
    if (clientsArray.length === 0) {
      setError(t('import_no_clients') || 'Aucun client trouvé dans le fichier');
      return;
    }

    const processedClients: ImportedClient[] = clientsArray.map((client: Record<string, unknown>) => {
      const name = (client.name as string) || '';
      const email = (client.email as string) || '';
      const company = (client.company as string) || (client.enterprise as string) || '';
      const website = (client.website as string) || '';
      const image = (client.image as string) || '';
      const processStatus = (client.processStatus as string) || 'client';
      
      let isValid = true;
      let errorMsg = '';

      if (!name.trim()) {
        isValid = false;
        errorMsg = t('import_error_name_required') || 'Nom requis';
      } else if (!email.trim()) {
        isValid = false;
        errorMsg = t('import_error_email_required') || 'Email requis';
      } else if (!validateEmail(email)) {
        isValid = false;
        errorMsg = t('import_error_invalid_email') || 'Email invalide';
      }

      return {
        name,
        email,
        enterprise: company,
        website,
        image,
        processStatus,
        number: '',
        adress: '',
        isValid,
        error: errorMsg,
      };
    });

    setImportedClients(processedClients);
  }, [t]);

  const handleFileUpload = useCallback((file: File) => {
    const fileName = file.name.toLowerCase();
    
    // Determine file type
    if (fileName.endsWith('.json')) {
      setImportMode('json');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          processJsonData(data);
        } catch {
          setError(t('import_error_invalid_json') || 'Fichier JSON invalide');
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.csv')) {
      setImportMode('csv');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          processCsvData(text);
        } catch {
          setError(t('import_error_invalid_csv') || 'Fichier CSV invalide');
        }
      };
      reader.readAsText(file);
    } else {
      setError(t('import_error_unsupported_format') || 'Format non supporté. Utilisez JSON ou CSV.');
    }
  }, [processJsonData, processCsvData, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const removeClient = useCallback((index: number) => {
    setImportedClients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleImport = async () => {
    const validClients = importedClients.filter(c => c.isValid);
    if (validClients.length === 0) {
      setError(t('import_error_no_valid_clients') || 'Aucun client valide à importer');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(validClients, duplicateCheckMode, duplicateAction);
      setImportedClients([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportedClients([]);
    setError(null);
    setEmailListText('');
    setImportMode('json');
    onClose();
  };

  const validCount = importedClients.filter(c => c.isValid).length;
  const invalidCount = importedClients.filter(c => !c.isValid).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-default rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-primary">
                  {t('import_clients') || 'Importer des clients'}
                </h2>
                <p className="text-sm text-secondary">
                  {t('import_clients_subtitle_new') || 'Importez vos clients depuis JSON, CSV ou une liste d\'emails'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-card-hover transition-colors"
            >
              <IconX className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-danger-light border border-danger/20">
                <IconAlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            {/* Import mode selector */}
            {importedClients.length === 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-primary">
                  {t('import_mode_title') || 'Choisir le mode d\'import'}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {importModeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setImportMode(option.value)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
                        ${importMode === option.value 
                          ? 'bg-accent-light border-accent text-accent' 
                          : 'bg-card border-default hover:border-accent/50 text-secondary hover:text-primary'
                        }
                      `}
                    >
                      {option.icon}
                      <span className="font-medium text-sm">{option.label}</span>
                      <span className="text-xs opacity-70">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload zone for JSON/CSV */}
            {importedClients.length === 0 && (importMode === 'json' || importMode === 'csv') && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-accent bg-accent/5 scale-[1.02]' 
                    : 'border-default hover:border-accent/50 hover:bg-card-hover'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importMode === 'json' ? '.json' : '.csv'}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-2xl ${isDragging ? 'bg-accent-light' : 'bg-card-hover'}`}>
                    <IconUpload className={`w-8 h-8 ${isDragging ? 'text-accent' : 'text-secondary'}`} />
                  </div>
                  <div>
                    <p className="text-primary font-medium mb-1">
                      {importMode === 'json' 
                        ? (t('import_drop_json') || 'Glissez votre fichier JSON ici')
                        : (t('import_drop_csv') || 'Glissez votre fichier CSV ici')
                      }
                    </p>
                    <p className="text-secondary text-sm">
                      {t('import_or_click') || 'ou cliquez pour parcourir'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email list input */}
            {importedClients.length === 0 && importMode === 'email_list' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary">
                    {t('import_paste_emails') || 'Collez votre liste d\'emails'}
                  </label>
                  <textarea
                    value={emailListText}
                    onChange={(e) => setEmailListText(e.target.value)}
                    placeholder={t('import_email_placeholder') || 'jean@example.com, marie@example.com\nou un email par ligne...'}
                    className="w-full h-40 p-4 rounded-xl bg-page border border-default focus:border-accent focus:outline-none resize-none text-primary placeholder:text-secondary/50"
                  />
                  <p className="text-xs text-secondary">
                    {t('import_email_hint') || 'Séparez les emails par des virgules, points-virgules ou retours à la ligne'}
                  </p>
                </div>
                <button
                  onClick={() => processEmailList(emailListText)}
                  disabled={!emailListText.trim()}
                  className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('import_parse_emails') || 'Analyser les emails'}
                </button>
              </div>
            )}

            {/* Format hints */}
            {importedClients.length === 0 && importMode === 'json' && (
              <div className="p-4 rounded-xl bg-info-light border border-info/20">
                <p className="text-sm text-secondary mb-2">
                  {t('import_list') || 'Format JSON attendu :'}
                </p>
                <pre className="text-xs text-secondary bg-page p-3 rounded-lg overflow-x-auto">
{`[
  {
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Inc",
    "website": "www.acme.com"
  }
]`}
                </pre>
              </div>
            )}

            {importedClients.length === 0 && importMode === 'csv' && (
              <div className="p-4 rounded-xl bg-info-light border border-info/20">
                <p className="text-sm text-secondary mb-2">
                  {t('import_csv_format') || 'Format CSV attendu :'}
                </p>
                <pre className="text-xs text-secondary bg-page p-3 rounded-lg overflow-x-auto">
{`email,name,company,website
john@example.com,John Doe,Acme Inc,www.acme.com
marie@example.com,Marie Dupont,Tech Corp,tech.com`}
                </pre>
                <p className="text-xs text-secondary mt-2">
                  {t('import_csv_compatible') || 'Compatible avec les exports Mailchimp, HubSpot, Gmail, etc.'}
                </p>
              </div>
            )}

            {/* Preview table */}
            {importedClients.length > 0 && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-light text-success text-sm">
                    <IconCheck className="w-4 h-4" />
                    {validCount} {t('import_valid') || 'valide(s)'}
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-light text-danger text-sm">
                      <IconAlertCircle className="w-4 h-4" />
                      {invalidCount} {t('import_invalid') || 'invalide(s)'}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setImportedClients([]);
                      setError(null);
                    }}
                    className="ml-auto flex items-center gap-2 text-sm text-secondary btn-secondary px-4 py-2 rounded-lg hover:text-primary transition-colors"
                  >
                    <IconReload
                      className="w-4 h-4"
                    />
                    {t('import_change_file') || 'Changer de fichier'}
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-default">
                  <table className="w-full">
                    <thead className="bg-card-hover">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <IconUser className="w-4 h-4" />
                            {t('name')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <IconMail className="w-4 h-4" />
                            {t('email')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <IconBuilding className="w-4 h-4" />
                            {t('enterprise')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <IconWorld className="w-4 h-4" />
                            {t('website')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                          {t('status')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider w-20">
                          {t('actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody >
                      {importedClients.map((client, index) => (
                        <tr 
                          key={index} 
                          className={`${!client.isValid ? 'bg-danger-light' : 'hover:bg-card-hover'} transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ClientAvatar 
                                name={client.name}
                                imageUrl={client.image || null}
                                website={client.website || null}
                                size="sm"
                              />
                              <div className="flex items-center gap-2">
                                {!client.isValid && (
                                  <IconAlertCircle className="w-4 h-4 text-danger flex-shrink-0" title={client.error} />
                                )}
                                <span className={`text-sm font-medium ${client.isValid ? 'text-primary' : 'text-danger'}`}>
                                  {client.name || '-'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm ${client.isValid ? 'text-secondary' : 'text-danger'}`}>
                              {client.email || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-secondary">
                              {client.enterprise || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-secondary">
                              {client.website || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge badge-success text-xs">
                              {client.processStatus || 'client'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeClient(index)}
                              className="p-1.5 rounded-lg hover:bg-danger-light text-secondary hover:text-danger transition-colors"
                              title={t('remove') || 'Supprimer'}
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Error list */}
                {invalidCount > 0 && (
                  <div className="p-4 rounded-xl bg-warning-light border border-warning/20">
                    <p className="text-sm text-warning font-medium mb-2">
                      {t('import_errors_found') || 'Erreurs détectées :'}
                    </p>
                    <ul className="text-sm text-secondary space-y-1">
                      {importedClients
                        .filter(c => !c.isValid)
                        .map((client, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="text-warning">•</span>
                            <span className="font-medium">{client.name || client.email || `Ligne ${idx + 1}`}:</span>
                            {client.error}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                )}

                {/* Duplicate action selector */}
                <div className="p-4 rounded-xl bg-card-hover border border-default">
                  <div className="flex items-center gap-2 mb-3">
                    <IconAlertCircle className="w-5 h-5 text-warning" />
                    <p className="text-sm font-medium text-primary">
                      {t('duplicate_action_title') || 'Action en cas de doublon'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {duplicateActionOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border
                          ${duplicateAction === option.value 
                            ? 'bg-warning-light border-warning' 
                            : 'bg-card border-default hover:border-warning/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="duplicateAction"
                          value={option.value}
                          checked={duplicateAction === option.value}
                          onChange={() => setDuplicateAction(option.value)}
                          className="mt-1 accent-warning"
                        />
                        <div>
                          <p className={`text-sm font-medium ${
                            duplicateAction === option.value ? 'text-warning' : 'text-primary'
                          }`}>
                            {option.label}
                            {option.value === 'skip' && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-success-light text-success">
                                {t('recommended') || 'Recommandé'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-secondary mt-0.5">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Duplicate check mode selector */}
                <div className="p-4 rounded-xl bg-card-hover border border-default">
                  <div className="flex items-center gap-2 mb-3">
                    <IconInfoCircle className="w-5 h-5 text-accent" />
                    <p className="text-sm font-medium text-primary">
                      {t('duplicate_check_mode') || 'Vérification des doublons'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {duplicateCheckOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border
                          ${duplicateCheckMode === option.value 
                            ? 'bg-accent-light border-accent' 
                            : 'bg-card border-default hover:border-accent/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="duplicateCheckMode"
                          value={option.value}
                          checked={duplicateCheckMode === option.value}
                          onChange={() => setDuplicateCheckMode(option.value)}
                          className="mt-1 accent-accent"
                        />
                        <div>
                          <p className={`text-sm font-medium ${
                            duplicateCheckMode === option.value ? 'text-accent' : 'text-primary'
                          }`}>
                            {option.label}
                            {option.value === 'email_only' && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-success-light text-success">
                                {t('recommended') || 'Recommandé'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-secondary mt-0.5">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-default bg-card-hover">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-secondary hover:text-primary hover:bg-card-hover transition-colors"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
              className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('importing') || 'Import en cours...'}
                </>
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  {t('import_button') || 'Importer'} {validCount > 0 && `(${validCount})`}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

