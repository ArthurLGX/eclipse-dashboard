'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { fetchUserById } from '@/lib/api';
import useLenis from '@/utils/useLenis';
import Image from 'next/image';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  profile_picture: {
    id: number;
    url: string;
    formats?: {
      thumbnail: { url: string };
      small: { url: string };
      medium: { url: string };
      large: { url: string };
    };
  } | null;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PersonalInformationPage() {
  const { t } = useLanguage();
  useLenis();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    profile_picture: {
      url: '',
    },
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const data = await fetchUserById(user.id);
        setProfile(data);
        console.log('Réponse :', data);
        setFormData({
          username: data.username,
          email: data.email,
          profile_picture: {
            url: data.profile_picture?.url || '',
          },
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        showGlobalPopup('Erreur lors du chargement du profil', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]); // Retirer showGlobalPopup des dépendances

  const handleSave = async () => {
    try {
      // Si une nouvelle image a été sélectionnée, l'uploader d'abord
      // Mettre à jour les autres données du profil
      const updateFormData = new FormData();
      updateFormData.append('username', formData.username);
      updateFormData.append('email', formData.email);

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${user?.id || 0}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: updateFormData,
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de l'utilisateur");
      }

      const updatedData = await response.json();
      setEditing(false);
      showGlobalPopup('Profil mis à jour avec succès', 'success');
      //on affiche dynamiquement le nouveau profil
      setProfile(updatedData);
    } catch (error) {
      console.error('Error updating profile:', error);
      showGlobalPopup('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: profile?.username || '',
      email: profile?.email || '',
      profile_picture: {
        url: profile?.profile_picture?.url || '',
      },
    });
    setPreviewUrl('');
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
          <div className="flex lg:flex-row flex-col gap-4   items-center justify-between">
            <div className="h-8 bg-zinc-800 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-zinc-800 rounded w-24 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 bg-zinc-800 rounded-full animate-pulse"></div>
                  <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse"></div>
                    <div className="h-10 bg-zinc-800 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </ProtectedRoute>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-zinc-200">
          {t('profile')}
        </h1>
        {!editing ? (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full  gap-4">
            <button
              onClick={() => setEditing(true)}
              className="bg-emerald-400/20 lg:w-fit w-full !text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:!text-white    transition-colors"
            >
              {t('edit_profile')}
            </button>
            <button
              onClick={() =>
                router.push('/dashboard/profile/your-subscription')
              }
              className="bg-zinc-200 lg:w-fit w-full !text-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-zinc-700/20 hover:!text-white    transition-colors"
            >
              {t('your_subscription')}
            </button>
          </div>
        ) : (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full  gap-4">
            <button
              onClick={handleCancel}
              className="bg-orange-500/20 lg:w-fit w-full !text-orange-500 border border-orange-500/20 px-4 py-2 hover:bg-orange-500/10 hover:!text-white rounded-lg cursor-pointer transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="bg-emerald-500 !text-black px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors"
            >
              {t('save')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Photo de profil */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 lg:!p-6 !p-4 rounded-lg border border-zinc-800">
            <div className="flex flex-col items-center space-y-4">
              <div
                onClick={() => {
                  router.push('/dashboard/profile');
                }}
                className={
                  'flex w-32 h-32 cursor-pointer hover:scale-[1.05] hover:border-green-200 transition-all ease-in-out duration-300 border-orange-300 border-2 rounded-full relative overflow-hidden'
                }
              >
                <Image
                  alt={'user profile picture'}
                  src={
                    previewUrl ||
                    (profile?.profile_picture?.formats?.thumbnail?.url
                      ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${profile.profile_picture.formats.thumbnail.url}`
                      : profile?.profile_picture?.url
                        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${profile.profile_picture.url}`
                        : '/images/logo/eclipse-logo.png')
                  }
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="!text-center">
                <h3 className="!text-lg font-semibold !text-zinc-200">
                  {profile?.username}
                </h3>
                <p className="!text-zinc-400 !text-sm">
                  Membre depuis{' '}
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('fr-FR')
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Informations */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-6">
            <h2 className="!text-xl font-semibold !text-zinc-200 mb-4">
              {t('personal_information')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="!text-zinc-400 !text-sm font-light">
                  {t('username')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg !text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="!text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                    {profile?.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="!text-zinc-400 !text-sm font-light">
                  {t('email')}
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg !text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="!text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                    {profile?.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="!text-zinc-400 !text-sm font-light">
                  {t('account_status')}
                </label>
                <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full ${profile?.confirmed ? 'bg-emerald-500' : 'bg-red-500'}`}
                  ></div>
                  <span className="!text-zinc-200">
                    {profile?.confirmed
                      ? t('account_confirmed')
                      : t('account_pending')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="!text-zinc-400 !text-sm font-light">
                  {t('last_update')}
                </label>
                <p className="!text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                  {profile?.updatedAt
                    ? new Date(profile.updatedAt).toLocaleDateString('fr-FR')
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
