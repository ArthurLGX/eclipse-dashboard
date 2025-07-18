'use client';
import { useParams } from 'next/navigation';
import Modal from '@/app/components/Modal';
import FactureApercu from '@/app/components/FactureApercu';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchFacturesUserById,
  fetchCompanyUser,
  fetchClientsUser,
  fetchProjectsUser,
  updateFactureById,
  createFacture,
} from '@/lib/api';
import {
  Facture,
  Company,
  Client,
  Project,
  InvoiceLine,
  User,
} from '@/app/models/Models';
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';
import {
  IconEdit,
  IconTrash,
  IconMail,
  IconDownload,
  IconCalculator,
} from '@tabler/icons-react';
import { useRef } from 'react';

export default function FacturePage() {
  const { id, edit } = useParams();
  const { showGlobalPopup } = usePopup();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();

  const [showPreview, setShowPreview] = useState(false);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Facture | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tvaApplicable, setTvaApplicable] = useState<boolean>(
    facture?.tva_applicable ?? true
  );
  // Calculs automatiques
  const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0);
  const tvaRate = 20; // 20% TVA
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
    project_status: 'draft',
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
    profile_picture: { url: '' },
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
    projects: [],
    factures: [],
    technologies: [],
  };
  const emptyFacture: Facture = {
    id: 0,
    documentId: '',
    reference: '',
    date: '',
    due_date: '',
    facture_status: 'draft',
    number: 0,
    currency: 'EUR',
    description: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
    publishedAt: '',
    client_id: emptyClient,
    project: emptyProject,
    pdf: [],
    user: emptyUser,
    invoice_lines: [],
    tva_applicable: true,
  };

  useEffect(() => {
    const fetchFacture = async () => {
      if (id === t('add')) {
        setEditing(true);
        setFacture(emptyFacture);
        setFormData(emptyFacture);
        setInvoiceLines([]);
        setIsLoading(false);
        return;
      }
      try {
        const facture = await fetchFacturesUserById(
          user?.id ?? 0,
          id as string
        );
        setFacture(facture.data[0]);
        setFormData(facture.data[0]);
        if (edit === '1') {
          setEditing(true);
        }
        setInvoiceLines(facture.data[0]?.lines || []);
        console.log('facture', facture.data[0]);

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération de la facture:', error);
        showGlobalPopup(t('error_fetching_facture'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCompany = async () => {
      try {
        const companyResponse = await fetchCompanyUser(user?.id ?? 0);
        if (companyResponse.data && companyResponse.data.length > 0) {
          setCompany(companyResponse.data[0]);
          console.log('company', companyResponse.data[0]);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des données de l'entreprise:",
          error
        );
      }
    };

    const fetchClientsAndProjects = async () => {
      if (!user?.id) return;
      try {
        const clientsRes = await fetchClientsUser(user.id);
        setClients(clientsRes.data || []);
        const projectsRes = await fetchProjectsUser(user.id);
        setProjects(projectsRes.data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des clients/projets', error);
      }
    };

    fetchFacture();
    fetchCompany();
    fetchClientsAndProjects();
  }, [id, user?.id]);

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
      { id: Date.now(), description: '', quantity: 1, unit_price: 0, total: 0 },
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

      if (id === t('create')) {
        // Création d'une nouvelle facture
        await createFacture({
          reference: formData?.reference ?? '',
          number: formData?.number ?? 0,
          date: formData?.date ?? '',
          due_date: formData?.due_date ?? '',
          facture_status: formData?.facture_status ?? '',
          currency: formData?.currency ?? '',
          description: formData?.description ?? '',
          notes: formData?.notes ?? '',
          client_id: formData?.client_id?.id ?? 0,
          project: formData?.project?.id ?? 0,
          user: formData?.user?.id ?? 0,
          tva_applicable: tvaApplicable,
          invoice_lines: cleanLines,
          pdf: facture?.pdf[0]?.url ?? '',
        });
        showGlobalPopup('Facture créée', 'success');
        setEditing(false);
        // Rediriger vers la liste ou la nouvelle facture si besoin
        return;
      }

      await updateFactureById(facture?.documentId ?? '', {
        reference: formData?.reference ?? '',
        number: formData?.number ?? 0,
        date: formData?.date ?? '',
        due_date: formData?.due_date ?? '',
        facture_status: formData?.facture_status ?? '',
        currency: formData?.currency ?? '',
        description: formData?.description ?? '',
        notes: formData?.notes ?? '',
        client_id: formData?.client_id?.id ?? 0,
        project: formData?.project?.id ?? 0,
        user: formData?.user?.id ?? 0,
        tva_applicable: tvaApplicable,
        invoice_lines: cleanLines,
      });

      // Recharge la facture complète avec les relations
      const refreshed = await fetchFacturesUserById(
        user?.id ?? 0,
        facture?.documentId ?? ''
      );
      const refreshedFacture = refreshed.data[0];
      setFacture(refreshedFacture);
      setFormData(refreshedFacture);
      setInvoiceLines(refreshedFacture.invoice_lines || []);
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

  const handleSendEmail = () => {
    showGlobalPopup('Facture envoyée par email', 'success');
    // Logique d'envoi email à implémenter
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
      <div className="max-w-4xl mx-auto rounded-lg flex flex-col gap-4 overflow-hidden shadow-xl ">
        <div className="flex lg:flex-row flex-col gap-2 justify-end">
          {!editing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 bg-blue-500/20 !text-blue-400 border border-blue-500/20 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <IconEdit className="w-4 h-4" />
              {t('edit')}
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-emerald-500/20 !text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                {t('save')}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-orange-500/20 !text-orange-400 border border-orange-500/20 px-4 py-2 rounded-lg hover:bg-orange-500/30 transition-colors"
              >
                {t('cancel')}
              </button>
            </>
          )}
          {!editing && (
            <>
              <button
                onClick={handleSendEmail}
                className="flex items-center gap-2 bg-emerald-500/20 !text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                <IconMail className="w-4 h-4" />
                {t('send_email')}
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 bg-purple-500/20 !text-purple-400 border border-purple-500/20 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-colors"
              >
                <IconDownload className="w-4 h-4" />
                {t('download')}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-500/20 !text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <IconTrash className="w-4 h-4" />
                {t('delete')}
              </button>
            </>
          )}
        </div>

        {/* Contenu de la facture */}
        <div ref={factureRef} className="print-area">
          <div className="p-8 bg-white rounded-lg flex flex-col gap-4">
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
                <label className="block text-sm font-medium mb-1">
                  {t('reference')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="reference"
                    value={formData?.reference || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {facture?.reference}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('status')}
                </label>
                {editing ? (
                  <select
                    name="facture_status"
                    value={formData?.facture_status || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  >
                    <option value="draft">{t('draft')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="paid">{t('paid')}</option>
                    <option value="overdue">{t('overdue')}</option>
                  </select>
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {t(facture?.facture_status || '')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('emission_date')}
                </label>
                {editing ? (
                  <input
                    type="date"
                    name="date"
                    value={formData?.date ? formData.date.slice(0, 10) : ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {facture?.date
                      ? new Date(facture.date).toLocaleDateString('fr-FR')
                      : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {facture?.due_date
                      ? new Date(facture.due_date).toLocaleDateString('fr-FR')
                      : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('currency')}
                </label>
                {editing ? (
                  <select
                    name="currency"
                    value={formData?.currency || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {facture?.currency}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  >
                    <option value="">{t('select_client')}</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {facture?.client_id?.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('project')}
                </label>
                {editing ? (
                  <select
                    name="project"
                    value={formData?.project?.id || ''}
                    onChange={e => {
                      const project = projects.find(
                        p => p.id === Number(e.target.value)
                      );
                      setFormData({ ...formData!, project: project! });
                    }}
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  >
                    <option value="">{t('select_project')}</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
                    {facture?.project?.title}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  {t('notes')}
                </label>
                {editing ? (
                  <textarea
                    name="notes"
                    value={formData?.notes || ''}
                    onChange={handleInputChange}
                    className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                  />
                ) : (
                  <p className="!text-zinc-700 !text-sm font-semibold">
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
                      <th className="!text-left p-4 !text-zinc-800 font-bold">
                        {t('description')}
                      </th>
                      <th className="!text-right p-4 !text-zinc-800 font-bold">
                        {t('quantity')}
                      </th>
                      <th className="!text-right p-4 !text-zinc-800 font-bold">
                        {t('unit_price')}
                      </th>
                      <th className="!text-right p-4 !text-zinc-800 font-bold">
                        {t('total')}
                      </th>
                      {editing && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((line, index) => (
                      <tr
                        key={line.id}
                        className={
                          index % 2 === 0 ? 'bg-zinc-300/10' : 'bg-zinc-600/10'
                        }
                      >
                        <td className="p-4 !text-zinc-900">
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
                              className="input border w-full rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                            />
                          ) : (
                            line.description
                          )}
                        </td>
                        <td className="p-4 !text-right !text-zinc-900">
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
                              className="input border w-20 text-right rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                            />
                          ) : (
                            `${line.quantity}h`
                          )}
                        </td>
                        <td className="p-4 !text-right !text-zinc-900">
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
                              className="input border w-24 text-right rounded-lg p-2 bg-zinc-50 border-zinc-300 !text-zinc-900"
                            />
                          ) : (
                            `${line.unit_price}€`
                          )}
                        </td>
                        <td className="p-4 !text-right !text-zinc-900 font-medium">
                          {line.total}€
                        </td>
                        {editing && (
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              {t('delete')}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
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

            {/* Pied de page */}
            <div className="mt-8 pt-6 border-t border-zinc-200 !text-center !text-zinc-600 !text-sm">
              <div className="space-y-1 !text-zinc-600">
                {company?.name && (
                  <p className="font-semibold !text-zinc-800 !text-xs">
                    {company.name}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-4 !text-xs">
                  {company?.location && (
                    <span className="!text-xs">{company.location}</span>
                  )}
                  {company?.phoneNumber && (
                    <span className="!text-xs">
                      {t('phone_number')} {company.phoneNumber}
                    </span>
                  )}
                  {company?.email && (
                    <span className="!text-xs">
                      {t('email')} {company.email}
                    </span>
                  )}
                  {company?.website && (
                    <span className="!text-xs">
                      {t('website')} {company.website}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-4 !text-xs mt-2 pt-2 border-t border-zinc-200">
                  {company?.siret && (
                    <span className="!text-xs">
                      {t('siret')} {company.siret}
                    </span>
                  )}
                  {company?.siren && (
                    <span className="!text-xs">
                      {t('siren')} {company.siren}
                    </span>
                  )}
                  {company?.vat && (
                    <span className="!text-xs">
                      {t('vat')} {company.vat}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex lg:flex-row flex-col gap-2 justify-end">
          {editing && (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-emerald-500/20 !text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                {t('save')}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-orange-500/20 !text-orange-400 border border-orange-500/20 px-4 py-2 rounded-lg hover:bg-orange-500/30 transition-colors"
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
    </motion.div>
  );
}
