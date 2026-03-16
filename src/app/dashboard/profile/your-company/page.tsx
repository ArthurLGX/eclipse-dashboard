'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  IconPencil,
  IconBuilding,
  IconCopy,
  IconExternalLink,
  IconUser,
  IconCreditCard,
  IconChevronRight,
} from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import { fetchCompanyUser, updateCompanyUser, fetchSubscriptionsUser } from '@/lib/api';
import { clearCache } from '@/hooks/useApi';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import ImageUpload from '@/app/components/ImageUpload';
import type { Company } from '@/types';

const DOMAINES = [
  'Agriculture et agroalimentaire',
  'Automobile et transport',
  'Banque et finance',
  'Bâtiment et BTP',
  'Commerce et distribution',
  'Communication et marketing',
  'Conseil et audit',
  'Culture et loisirs',
  'E-commerce',
  'Éducation et formation',
  'Énergie et environnement',
  'Hôtellerie et restauration',
  'Immobilier',
  'Industrie manufacturière',
  'Informatique et numérique',
  'Juridique',
  'Logistique et transport',
  'Luxe et mode',
  'Médias et édition',
  'Pharmacie et santé',
  'Recherche et développement',
  'Services aux entreprises',
  'Services aux particuliers',
  'Sport et fitness',
  'Télécommunication',
  'Tourisme et voyage',
  'Autre',
];

function formatDateNumeric(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getLogoUrl(logo?: string | null): string | null {
  if (!logo) return null;
  return logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${logo}`;
}

const CHECKLIST_ITEMS = [
  { key: 'name', label: "Nom de l'entreprise" },
  { key: 'email', label: 'Email de contact' },
  { key: 'siret', label: 'Numéro SIRET' },
  { key: 'location', label: 'Adresse postale' },
  { key: 'description', label: 'Description' },
] as const;

function computeCompleteness(c: Company | null): number {
  if (!c) return 0;
  let filled = 0;
  if (c.name?.trim()) filled++;
  if (c.email?.trim()) filled++;
  if (c.siret?.trim()) filled++;
  if (c.location?.trim()) filled++;
  if (c.description?.trim()) filled++;
  return Math.round((filled / 5) * 100);
}

export default function YourCompanyPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { showGlobalPopup } = usePopup();
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<{ plan?: { name: string; price_monthly: number }; start_date?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    siret: '',
    siren: '',
    vat: '',
    logo: '',
    phoneNumber: '',
    location: '',
    domaine: '',
    website: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await fetchCompanyUser(user.id) as { data?: Company[] };
        setCompanyProfile(data?.data?.[0] || null);
      } catch (error) {
        console.error('Error fetching profile:', error);
        showGlobalPopup('Erreur lors du chargement du profil', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id, showGlobalPopup]);

  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.id) return;
      try {
        const res = await fetchSubscriptionsUser(user.id) as { data?: Array<{ plan: { name: string; price_monthly: number }; start_date: string }> };
        if (res?.data?.[0]) setSubscription(res.data[0]);
      } catch { /* ignore */ }
    };
    loadSubscription();
  }, [user?.id]);

  useEffect(() => {
    if (companyProfile && !editing) {
      setFormData({
        name: companyProfile.name || '',
        email: companyProfile.email || '',
        description: companyProfile.description || '',
        siret: companyProfile.siret || '',
        siren: companyProfile.siren || '',
        vat: companyProfile.vat || '',
        logo: companyProfile.logo || '',
        phoneNumber: companyProfile.phoneNumber || '',
        location: companyProfile.location || '',
        domaine: companyProfile.domaine || '',
        website: companyProfile.website || '',
      });
    }
  }, [companyProfile, editing]);

  const validateEmail = (email: string) => /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!validateEmail(formData.email)) {
      setEmailError('Adresse email invalide');
      return;
    }
    setEmailError('');
    try {
      const companyId = companyProfile?.documentId || '';
      const dataToSend = { ...formData, domaine: formData.domaine || 'Autre' };
      const response = await updateCompanyUser(user.id, companyId, dataToSend) as { data?: Company };
      if (response?.data) setCompanyProfile(response.data);
      clearCache('company');
      setEditing(false);
      showGlobalPopup('Profil entreprise mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showGlobalPopup('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: companyProfile?.name || '',
      email: companyProfile?.email || '',
      description: companyProfile?.description || '',
      siret: companyProfile?.siret || '',
      siren: companyProfile?.siren || '',
      vat: companyProfile?.vat || '',
      logo: companyProfile?.logo || '',
      phoneNumber: companyProfile?.phoneNumber || '',
      location: companyProfile?.location || '',
      domaine: companyProfile?.domaine || '',
      website: companyProfile?.website || '',
    });
    setEditing(false);
    setEmailError('');
  };

  const handleLogoUpload = async (imageId: number, imageUrl: string) => {
    if (!user?.id) return;
    const logoPath = imageUrl.includes(process.env.NEXT_PUBLIC_STRAPI_URL || '')
      ? imageUrl.replace(process.env.NEXT_PUBLIC_STRAPI_URL || '', '')
      : imageUrl;
    const dataWithLogo = { ...formData, logo: logoPath, domaine: formData.domaine || 'Autre' };
    setFormData(prev => ({ ...prev, logo: logoPath }));
    try {
      const companyId = companyProfile?.documentId || '';
      const response = await updateCompanyUser(user.id, companyId, dataWithLogo) as { data?: Company };
      if (response?.data) setCompanyProfile(response.data);
      clearCache('company');
      showGlobalPopup('Logo mis à jour', 'success');
    } catch (error) {
      console.error('Error updating logo:', error);
      showGlobalPopup('Erreur lors de la mise à jour du logo', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showGlobalPopup('Copié !', 'success')).catch(() => {});
  };

  const logoUrl = getLogoUrl(formData.logo || companyProfile?.logo);
  const completeness = computeCompleteness(companyProfile);
  const checklistDone = CHECKLIST_ITEMS.filter(({ key }) => {
    const v = companyProfile?.[key as keyof Company];
    return v && String(v).trim();
  }).length;

  const isCheckDone = (key: string) => {
    const v = companyProfile?.[key as keyof Company];
    return v && String(v).trim();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6 lg:p-8 space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="company-hero-banner animate-pulse">
            <div className="company-logo-wrap">
              <div className="company-logo w-[72px] h-[72px] bg-white/10" />
            </div>
            <div className="company-hero-info flex-1 space-y-2">
              <div className="h-7 bg-white/20 rounded w-40" />
              <div className="h-4 bg-white/10 rounded w-56" />
            </div>
          </div>
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      </ProtectedRoute>
    );
  }

  // Pas de profil et pas en édition : état vide
  if (!companyProfile && !editing) {
    return (
      <ProtectedRoute>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 lg:p-8"
        >
          <div className="mb-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/dashboard" className="hover:text-primary transition-colors">Tableau de bord</Link>
              <span>›</span>
              <Link href="/dashboard/profile/personal-information" className="hover:text-primary transition-colors">Profil</Link>
              <span>›</span>
              <span className="text-primary font-medium">{t('your_enterprise')}</span>
            </nav>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[50vh] py-16">
            <div className="profile-card max-w-md w-full text-center p-12">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-6">
                <IconBuilding size={32} className="text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t('no_enterprise_profile')}</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Créez le profil de votre entreprise pour les factures et documents.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setFormData({
                    name: '', email: '', description: '', siret: '', siren: '', vat: '',
                    logo: '', phoneNumber: '', location: '', domaine: '', website: '',
                  });
                }}
                className="company-btn-hero-primary"
              >
                <IconPencil size={14} />
                {t('create_your_enterprise')}
              </button>
            </div>
          </div>
        </motion.div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 lg:p-8"
      >
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Tableau de bord</Link>
            <span>›</span>
            <Link href="/dashboard/profile/personal-information" className="hover:text-primary transition-colors">Profil</Link>
            <span>›</span>
            <span className="text-primary font-medium">{t('your_enterprise')}</span>
          </nav>
        </div>

        {/* Hero banner dark */}
        <div className="company-hero-banner">
          <div className="company-logo-wrap">
            {editing ? (
              <div className="company-logo p-0 w-[72px] h-[72px] min-w-[72px] min-h-[72px] shrink-0 flex items-center justify-center cursor-pointer [&>div]:!w-[72px] [&>div]:!min-w-[72px] [&>div>div]:!w-[72px] [&>div>div]:!min-w-[72px] [&>div>div]:!h-[72px] [&>div>div]:!min-h-[72px]">
                <ImageUpload
                  currentImageUrl={logoUrl || undefined}
                  onUpload={handleLogoUpload}
                  size="sm"
                  shape="square"
                  placeholder="logo"
                  disabled={false}
                  menuPortal
                />
              </div>
            ) : logoUrl ? (
              <>
                <div className="company-logo overflow-hidden p-0">
                  <Image
                    src={logoUrl}
                    alt={companyProfile?.name || 'Logo'}
                    width={72}
                    height={72}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  className="company-logo-edit-hint"
                  onClick={() => setEditing(true)}
                  title="Changer le logo"
                >
                  <IconPencil size={10} />
                </button>
              </>
            ) : (
              <div className="company-logo">
                {companyProfile?.name ? companyProfile.name.slice(0, 2).toUpperCase() : '?'}
              </div>
            )}
          </div>

          <div className="company-hero-info">
            <div className="company-hero-name">
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('enterprise_name')}
                  className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 text-[22px] font-bold focus:outline-none focus:border-white/40"
                />
              ) : (
                companyProfile?.name || t('your_enterprise')
              )}
            </div>
            <div className="company-hero-domain">
              {formData.domaine && `${formData.domaine}`}
              {formData.domaine && formData.website && ' · '}
              {formData.website ? formData.website.replace(/^https?:\/\//, '') : (editing ? '—' : '')}
            </div>
            <div className="company-hero-badges">
              <span className="company-hero-badge">
                <span className="company-hb-dot green" />
                Profil actif
              </span>
              {subscription?.plan && (
                <span className="company-hero-badge">
                  <span className="company-hb-dot blue" />
                  Plan {subscription.plan.name.charAt(0).toUpperCase() + subscription.plan.name.slice(1)}
                </span>
              )}
              {companyProfile?.createdAt && (
                <span className="company-hero-badge">
                  Créé le {formatDateNumeric(companyProfile.createdAt)}
                </span>
              )}
            </div>
          </div>

          <div className="company-hero-actions">
            <button
              type="button"
              className="company-btn-hero-primary"
              onClick={() => (editing ? handleSave() : setEditing(true))}
            >
              <IconPencil size={14} />
              {editing ? t('save') : t('edit_enterprise')}
            </button>
            {editing && (
              <button type="button" className="company-btn-hero-ghost" onClick={handleCancel}>
                {t('cancel')}
              </button>
              
            )}
             {companyProfile?.updatedAt && (
            <div className="company-hero-since">
              Dernière mise à jour · {formatDateNumeric(companyProfile.updatedAt)}
            </div>
          )}
          </div>

         
        </div>

        {/* Content grid */}
        <div className="company-content-grid">
          <div>
            {/* Carte Informations de l'entreprise */}
            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">Informations de l&apos;entreprise</span>
                <button
                  type="button"
                  className="profile-btn-sm"
                  onClick={() => (editing ? handleCancel() : setEditing(true))}
                >
                  <IconPencil size={13} />
                  {editing ? t('cancel') : t('modify')}
                </button>
              </div>

              {!editing && (
                <div className="company-completeness-bar">
                  <span className="company-comp-label">Complétion du profil</span>
                  <div className="company-comp-track">
                    <div className="company-comp-fill" style={{ width: `${completeness}%` }} />
                  </div>
                  <span className="company-comp-pct">{completeness}%</span>
                </div>
              )}

              {/* Mode lecture */}
              {!editing && (
                <div className="company-info-grid">
                  <div className="company-info-item">
                    <div className="company-info-label">{t('enterprise_name')}</div>
                    <div className="company-info-value">{companyProfile?.name || '—'}</div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">Email</div>
                    <div className="company-info-value mono">
                      {companyProfile?.email || '—'}
                      {companyProfile?.email && (
                        <button
                          type="button"
                          className="company-info-copy"
                          onClick={() => copyToClipboard(companyProfile.email!)}
                          title="Copier"
                        >
                          <IconCopy size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">{t('activity_domain')}</div>
                    <div className="company-info-value">
                      {companyProfile?.domaine ? (
                        <span className="company-tag company-tag-sector">{companyProfile.domaine}</span>
                      ) : (
                        <span className="company-info-value muted">Non renseigné</span>
                      )}
                    </div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">{t('phone_number')}</div>
                    <div className={`company-info-value ${!companyProfile?.phoneNumber ? 'muted' : ''}`}>
                      {companyProfile?.phoneNumber || 'Non renseigné'}
                    </div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">{t('siret')}</div>
                    <div className={`company-info-value ${!companyProfile?.siret ? 'muted' : ''}`}>
                      {companyProfile?.siret || 'Non renseigné'}
                    </div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">{t('siren')}</div>
                    <div className={`company-info-value ${!companyProfile?.siren ? 'muted' : ''}`}>
                      {companyProfile?.siren || 'Non renseigné'}
                    </div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">{t('vat')}</div>
                    <div className={`company-info-value ${!companyProfile?.vat ? 'muted' : ''}`}>
                      {companyProfile?.vat || 'Non renseigné'}
                    </div>
                  </div>
                  <div className="company-info-item">
                    <div className="company-info-label">{t('address')}</div>
                    <div className={`company-info-value ${!companyProfile?.location ? 'muted' : ''}`}>
                      {companyProfile?.location || 'Non renseignée'}
                    </div>
                  </div>
                  <div className="company-info-item full no-bottom">
                    <div className="company-info-label">{t('website')}</div>
                    <div className="company-info-value">
                      {companyProfile?.website ? (
                        <>
                          <a href={companyProfile.website.startsWith('http') ? companyProfile.website : `https://${companyProfile.website}`} target="_blank" rel="noopener noreferrer">
                            {companyProfile.website}
                          </a>
                          <a href={companyProfile.website.startsWith('http') ? companyProfile.website : `https://${companyProfile.website}`} target="_blank" rel="noopener noreferrer" className="company-info-ext" title="Ouvrir">
                            <IconExternalLink size={11} />
                          </a>
                        </>
                      ) : (
                        <span className="company-info-value muted">Non renseigné</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulaire d'édition inline */}
              {editing && (
                <div className="company-edit-form open">
                  <div className="company-form-section-title">Identité</div>
                  <div className="company-edit-grid" style={{ marginBottom: 12 }}>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('enterprise_name')}</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="company-edit-input"
                      />
                    </div>
                    <div className="company-edit-group">
                      <label className="company-edit-label">Email de contact</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => { setFormData({ ...formData, email: e.target.value }); setEmailError(''); }}
                        className={`company-edit-input ${emailError ? 'border-red-500' : ''}`}
                      />
                      {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                    </div>
                  </div>
                  <div className="company-edit-grid cols-1" style={{ marginBottom: 12 }}>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('enterprise_description')}</label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t('enterprise_description')}
                        className="company-edit-textarea"
                      />
                    </div>
                  </div>

                  <div className="company-form-section-title">Coordonnées</div>
                  <div className="company-edit-grid" style={{ marginBottom: 12 }}>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('phone_number')}</label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="+33 6 00 00 00 00"
                        className="company-edit-input"
                      />
                    </div>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('website')}</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://..."
                        className="company-edit-input"
                      />
                    </div>
                  </div>
                  <div className="company-edit-grid cols-1" style={{ marginBottom: 12 }}>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('address')}</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                        placeholder="12 rue de la Paix, 75001 Paris"
                        className="company-edit-input"
                      />
                    </div>
                  </div>

                  <div className="company-form-section-title">Informations légales</div>
                  <div className="company-edit-grid" style={{ marginBottom: 12 }}>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('siret')}</label>
                      <input
                        type="text"
                        value={formData.siret}
                        onChange={e => setFormData({ ...formData, siret: e.target.value })}
                        placeholder="000 000 000 00000"
                        className="company-edit-input"
                      />
                    </div>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('siren')}</label>
                      <input
                        type="text"
                        value={formData.siren}
                        onChange={e => setFormData({ ...formData, siren: e.target.value })}
                        placeholder="000 000 000"
                        className="company-edit-input"
                      />
                    </div>
                  </div>
                  <div className="company-edit-grid" style={{ marginBottom: 0 }}>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('vat')}</label>
                      <input
                        type="text"
                        value={formData.vat}
                        onChange={e => setFormData({ ...formData, vat: e.target.value })}
                        placeholder="FR00 000000000"
                        className="company-edit-input"
                      />
                    </div>
                    <div className="company-edit-group">
                      <label className="company-edit-label">{t('activity_domain')}</label>
                      <select
                        value={formData.domaine}
                        onChange={e => setFormData({ ...formData, domaine: e.target.value })}
                        className="company-edit-input"
                      >
                        <option value="">{t('select_activity_domain')}</option>
                        {DOMAINES.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="company-form-actions">
                    <button type="button" className="company-btn-cancel" onClick={handleCancel}>
                      {t('cancel')}
                    </button>
                    <button type="button" className="company-btn-save" onClick={handleSave}>
                      Enregistrer les modifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Carte Description */}
            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">Description</span>
                <button type="button" className="profile-btn-sm" onClick={() => setEditing(true)}>
                  <IconPencil size={13} />
                  {companyProfile?.description ? t('modify') : 'Ajouter'}
                </button>
              </div>
              <div className="p-5">
                {companyProfile?.description ? (
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{companyProfile.description}</p>
                ) : (
                  <p className="text-[14px] text-muted-foreground italic leading-relaxed">
                    Aucune description renseignée pour le moment.<br />
                    <span className="text-muted-foreground/80 not-italic">
                      Ajoutez une présentation de votre entreprise pour l&apos;afficher sur vos documents clients.
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="company-side-card">
              <div className="company-side-card-header">
                <span className="company-side-card-title">Compléter votre profil</span>
                <span className="text-[12px] text-muted-foreground font-mono">{checklistDone} / 5</span>
              </div>
              <div className="company-checklist">
                {CHECKLIST_ITEMS.map(({ key, label }) => (
                  <div key={key} className="company-check-item">
                    <div className={`company-check-icon ${isCheckDone(key) ? 'done' : 'todo'}`}>
                      {isCheckDone(key) && (
                        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M2 5l2 2 4-4" />
                        </svg>
                      )}
                    </div>
                    <span className={`company-check-text ${isCheckDone(key) ? 'done-text' : ''}`}>{label}</span>
                    {!isCheckDone(key) && (
                      <button type="button" className="company-check-btn" onClick={() => setEditing(true)}>
                        Ajouter
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="company-side-card">
              <div className="company-side-card-header">
                <span className="company-side-card-title">Pourquoi compléter ?</span>
              </div>
              <div className="company-tip-card">
                <p className="company-tip-text">
                  Un profil complet permet de préremplir automatiquement vos <strong>factures et devis</strong> et d&apos;être reconnu par vos clients.
                </p>
                <button type="button" className="company-btn-tip" onClick={() => setEditing(true)}>
                  Compléter maintenant
                  <IconChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="company-side-card">
              <div className="company-side-card-header">
                <span className="company-side-card-title">Mon compte</span>
              </div>
              <div className="company-nav-list">
                <button type="button" className="company-nav-item" onClick={() => router.push('/dashboard/profile/personal-information')}>
                  <div className="company-nav-item-icon">
                    <IconUser size={14} stroke={1.6} />
                  </div>
                  <div className="company-nav-item-text">
                    <div className="company-nav-item-title">Profil personnel</div>
                    <div className="company-nav-item-sub">
                      {user?.username || '—'} · {user?.email || '—'}
                    </div>
                  </div>
                  <span className="company-nav-item-arrow">›</span>
                </button>
                <button type="button" className="company-nav-item" onClick={() => router.push('/dashboard/profile/your-subscription')}>
                  <div className="company-nav-item-icon">
                    <IconCreditCard size={14} stroke={1.6} />
                  </div>
                  <div className="company-nav-item-text">
                    <div className="company-nav-item-title">Abonnement</div>
                    <div className="company-nav-item-sub">
                      Plan {subscription?.plan?.name || 'Free'} · {subscription?.plan?.price_monthly ?? 0} € / mois
                    </div>
                  </div>
                  <span className="company-nav-item-arrow">›</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
