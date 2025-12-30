'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { updateUser, updateUserProfilePicture } from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { useCurrentUser, clearCache } from '@/hooks/useApi';
import ImageUpload from '@/app/components/ImageUpload';

export default function PersonalInformationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });

  // Hook pour l'utilisateur courant
  const { data: profileData, loading, refetch: refetchProfile } = useCurrentUser(user?.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any;

  // Initialiser le formulaire quand le profil est chargé
  useMemo(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  // URL de la photo de profil
  const profilePictureUrl = useMemo(() => {
    if (profile?.profile_picture?.url) {
      return process.env.NEXT_PUBLIC_STRAPI_URL + profile.profile_picture.url;
    }
    return null;
  }, [profile]);

  // Handler pour l'upload de profile picture
  const handleProfilePictureUpload = async (imageId: number) => {
    if (!user?.id) return;
    try {
      await updateUserProfilePicture(user.id, imageId);
      showGlobalPopup(t('image_updated') || 'Photo de profil mise à jour', 'success');
      clearCache('current-user');
      await refetchProfile();
    } catch (error) {
      console.error('Error updating profile picture:', error);
      showGlobalPopup(t('image_update_error') || 'Erreur lors de la mise à jour de la photo', 'error');
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await updateUser(user.id, {
        username: formData.username,
        email: formData.email,
      });
      
      setEditing(false);
      showGlobalPopup('Profil mis à jour avec succès', 'success');
      clearCache('current-user');
      await refetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      showGlobalPopup('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: profile?.username || '',
      email: profile?.email || '',
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
        <h1 className="!text-3xl !uppercase font-extrabold !text-left text-zinc-200">
          {t('profile')}
        </h1>
        {!editing ? (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full gap-4">
            <button
              onClick={() => setEditing(true)}
              className="bg-emerald-400/20 lg:w-fit w-full text-zinc-200 border border-emerald-500/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 hover:!text-white transition-colors"
            >
              {t('edit_profile')}
            </button>
            <button
              onClick={() => router.push('/dashboard/profile/your-subscription')}
              className="bg-zinc-200 lg:w-fit w-full text-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-zinc-700/20 hover:!text-white transition-colors"
            >
              {t('your_subscription')}
            </button>
          </div>
        ) : (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full gap-4">
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
              <ImageUpload
                currentImageUrl={profilePictureUrl}
                onUpload={handleProfilePictureUpload}
                size="lg"
                shape="circle"
                placeholder="user"
                disabled={!editing}
              />
              {editing && (
                <p className="text-xs text-zinc-500 text-center">
                  {t('click_to_change_photo') || 'Cliquez pour changer la photo'}
                </p>
              )}
              <div className="!text-center">
                <h3 className="!text-lg font-semibold text-zinc-200">
                  {profile?.username}
                </h3>
                <p className="text-zinc-400 !text-sm">
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
            <h2 className="!text-xl font-semibold text-zinc-200 mb-4">
              {t('personal_information')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-zinc-400 !text-sm font-light">
                  {t('username')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                    {profile?.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 !text-sm font-light">
                  {t('email')}
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-zinc-200 p-3 bg-zinc-800 rounded-lg">
                    {profile?.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 !text-sm font-light">
                  {t('account_status')}
                </label>
                <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full ${profile?.confirmed ? 'bg-emerald-500' : 'bg-red-500'}`}
                  ></div>
                  <span className="text-zinc-200">
                    {profile?.confirmed ? t('account_confirmed') : t('account_pending')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 !text-sm font-light">
                  {t('last_update')}
                </label>
                <p className="text-zinc-200 p-3 bg-zinc-800 rounded-lg">
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
