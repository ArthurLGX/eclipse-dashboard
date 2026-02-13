'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { fetchCompanyUser, updateCompanyUser } from '@/lib/api';
import { clearCache } from '@/hooks/useApi';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { Company } from '@/app/models/Models';

export default function YourCompanyPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
  const [emailError, setEmailError] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const data = await fetchCompanyUser(user.id) as { data?: Company[] };

        if (!data?.data || data.data.length === 0) {
          setCompanyProfile(null);
          return;
        }
        setCompanyProfile(data.data[0]);
      } catch (error) {
        console.error('Error fetching profile:', error);
        showGlobalPopup('Erreur lors du chargement du profil', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const validateEmail = (email: string) => {
    // Regex email simple et robuste
    return /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const handleSave = async () => {
    // Contrôle email avant envoi
    if (!validateEmail(formData.email)) {
      setEmailError('Adresse email invalide');
      return;
    } else {
      setEmailError('');
    }
    try {
      const companyId = companyProfile?.documentId || '';
      
      // Assurer une valeur par défaut pour le domaine
      const dataToSend = {
        ...formData,
        domaine: formData.domaine || 'Autre'
      };
      const response = await updateCompanyUser(
        user?.id || 0,
        companyId,
        dataToSend
      ) as { data?: Company };
      
      if (!response) {
        throw new Error("Erreur lors de la mise à jour de l'entreprise");
      }

      // Mettre à jour companyProfile avec les nouvelles données
      if (response?.data) {
        setCompanyProfile(response.data);
      }

      // Invalider le cache pour rafraîchir le logo de la sidebar
      clearCache('company');

      setEditing(false);
      showGlobalPopup('Profil mis à jour avec succès', 'success');
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
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
            <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-24 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="card p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 bg-muted rounded-full animate-pulse"></div>
                  <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="card p-6 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </ProtectedRoute>
    );
  }

  // Liste des domaines d'activité
  const domaines = [
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-primary">
          {t('your_enterprise')}
        </h1>
        {!editing ? (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full gap-4">
            {companyProfile ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-primary lg:w-fit w-full px-4 py-2 rounded-lg transition-all ease-in-out duration-300"
              >
                {t('edit_enterprise')}
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditing(true);
                  setFormData({
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
                }}
                className="btn-primary px-4 py-2 rounded-lg transition-all ease-in-out duration-300"
              >
                {t('create_your_enterprise')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full gap-4">
            <button
              onClick={handleCancel}
              className="bg-warning-light lg:w-fit w-full !text-warning-text border border-warning px-4 py-2 hover:opacity-80 rounded-lg cursor-pointer transition-colors ease-in-out duration-300"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="btn-primary px-4 py-2 rounded-lg transition-all ease-in-out duration-300 "
            >
              {t('save')}
            </button>
          </div>
        )}
      </div>

      {companyProfile || editing ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Section Informations */}
          <div className="lg:col-span-2">
            <div className="card p-6 space-y-6">
              <h2 className="!text-xl font-semibold !text-primary mb-4">
                {t('personal_information')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section générale */}
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('enterprise_name')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name}
                      placeholder={t('enterprise_name')}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    Email
                  </label>
                  {editing ? (
                    <>
                      <input
                        type="email"
                        value={formData.email}
                        placeholder={t('enterprise_email')}
                        onChange={e => {
                          setFormData({ ...formData, email: e.target.value });
                          if (emailError) setEmailError('');
                        }}
                        className={`input w-full p-3 ${emailError ? '!border-danger' : ''}`}
                      />
                      {emailError && (
                        <p className="text-danger !text-xs mt-1">
                          {emailError}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.email}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('enterprise_description')}
                  </label>
                  {editing ? (
                    <textarea
                      value={formData.description}
                      placeholder={t('enterprise_description')}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.description}
                    </p>
                  )}
                </div>
                {/* Section légale */}
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('siret')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.siret}
                      placeholder={t('siret')}
                      onChange={e =>
                        setFormData({ ...formData, siret: e.target.value })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.siret}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('siren')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.siren}
                      placeholder={t('siren')}
                      onChange={e =>
                        setFormData({ ...formData, siren: e.target.value })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.siren}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('vat')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.vat}
                      placeholder={t('vat')}
                      onChange={e =>
                        setFormData({ ...formData, vat: e.target.value })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.vat}
                    </p>
                  )}
                </div>
                {/* Section contact */}
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('phone_number')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.phoneNumber}
                      placeholder={t('phone_number')}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          phoneNumber: e.target.value,
                        })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.phoneNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('address')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.location}
                      placeholder={t('address')}
                      onChange={e =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.location}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('activity_domain')}
                  </label>
                  {editing ? (
                    <select
                      value={formData.domaine}
                      onChange={e =>
                        setFormData({ ...formData, domaine: e.target.value })
                      }
                      className="input w-full p-3"
                    >
                      <option value="">{t('select_activity_domain')}</option>
                      {domaines.map(domaine => (
                        <option key={domaine} value={domaine}>
                          {domaine}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-primary p-3 bg-muted rounded-lg">
                      {companyProfile?.domaine}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-secondary !text-sm font-light">
                    {t('website')}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.website}
                      placeholder={t('website')}
                      onChange={e =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      className="input w-full p-3"
                    />
                  ) : (
                    <a
                      href={companyProfile?.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="!text-accent underline p-3 bg-muted rounded-lg block"
                    >
                      {companyProfile?.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] !my-10">
          <p className="text-primary">{t('no_enterprise_profile')}</p>
        </div>
      )}
    </motion.div>
  );
}
