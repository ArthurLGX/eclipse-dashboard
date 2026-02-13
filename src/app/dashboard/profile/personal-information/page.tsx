'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import { updateUser, updateUserProfilePicture, changePassword } from '@/lib/api';
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
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handlePasswordChange = async () => {
    if (!user?.id) return;
    
    if (!currentPassword) {
      showGlobalPopup(t('current_password_required') || 'Veuillez entrer votre mot de passe actuel', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showGlobalPopup(t('password_min_length') || 'Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showGlobalPopup(t('passwords_not_match') || 'Les mots de passe ne correspondent pas', 'error');
      return;
    }
    
    try {
      setSavingPassword(true);
      await changePassword(currentPassword, newPassword, confirmPassword);
      showGlobalPopup(t('password_updated') || 'Mot de passe mis à jour avec succès', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage = error instanceof Error ? error.message : (t('password_update_error') || 'Erreur lors de la mise à jour du mot de passe');
      showGlobalPopup(errorMessage, 'error');
    } finally {
      setSavingPassword(false);
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex lg:flex-row flex-col gap-4 items-center justify-between">
        <h1 className="!text-3xl !uppercase font-extrabold !text-left !text-primary">
          {t('profile')}
        </h1>
        {!editing ? (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full gap-4">
            <button
              onClick={() => setEditing(true)}
              className="btn-primary lg:w-fit w-full px-4 py-2 rounded-lg"
            >
              {t('edit_profile')}
            </button>
            <button
              onClick={() => router.push('/dashboard/profile/your-subscription')}
              className="btn-ghost lg:w-fit w-full px-4 py-2"
            >
              {t('your_subscription')}
            </button>
          </div>
        ) : (
          <div className="flex lg:flex-row flex-col lg:w-fit w-full gap-4">
            <button
              onClick={handleCancel}
              className="bg-warning-light lg:w-fit w-full !text-warning-text border border-warning px-4 py-2 hover:opacity-80 rounded-lg cursor-pointer transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="btn-primary px-4 py-2"
            >
              {t('save')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Photo de profil */}
        <div className="lg:col-span-1">
          <div className="card lg:!p-6 !p-4">
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
                <p className="!text-xs !text-muted !text-center">
                  {t('click_to_change_photo') || 'Cliquez pour changer la photo'}
                </p>
              )}
              <div className="!text-center">
                <h3 className="!text-lg font-semibold !text-primary">
                  {profile?.username}
                </h3>
                <p className="text-secondary !text-sm">
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
          <div className="card p-6 space-y-6">
            <h2 className="!text-xl font-semibold !text-primary mb-4">
              {t('personal_information')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-secondary !text-sm font-light">
                  {t('username')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="input w-full p-3"
                  />
                ) : (
                  <p className="text-primary p-3 bg-muted rounded-lg">
                    {profile?.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-secondary !text-sm font-light">
                  {t('email')}
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full p-3"
                  />
                ) : (
                  <p className="text-primary p-3 bg-muted rounded-lg">
                    {profile?.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-secondary !text-sm font-light">
                  {t('account_status')}
                </label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full ${profile?.confirmed ? 'bg-success' : 'bg-danger'}`}
                  ></div>
                  <span className="text-primary">
                    {profile?.confirmed ? t('account_confirmed') : t('account_pending')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-secondary !text-sm font-light">
                  {t('last_update')}
                </label>
                <p className="text-primary p-3 bg-muted rounded-lg">
                  {profile?.updatedAt
                    ? new Date(profile.updatedAt).toLocaleDateString('fr-FR')
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Mot de passe */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="!text-xl font-semibold !text-primary">
            {t('change_password')}
          </h2>
          {!showPasswordSection && (
            <button
              onClick={() => setShowPasswordSection(true)}
              className="btn-ghost px-4 py-2 !text-sm"
            >
              {t('modify')}
            </button>
          )}
        </div>

        {showPasswordSection && (
          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-secondary !text-sm font-light">
                {t('current_password')}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input w-full p-3 !pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 !text-muted hover:!text-primary transition-colors"
                >
                  {showCurrentPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-secondary !text-sm font-light">
                {t('new_password')}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input w-full p-3 !pr-12"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 !text-muted hover:!text-primary transition-colors"
                >
                  {showNewPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
              <p className="!text-xs !text-muted">{t('password_min_chars')}</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-secondary !text-sm font-light">
                {t('confirm_password')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input w-full p-3 !pr-12"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 !text-muted hover:!text-primary transition-colors"
                >
                  {showConfirmPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-danger !text-sm">{t('passwords_not_match')}</p>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => {
                  setShowPasswordSection(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn-ghost px-4 py-2"
                disabled={savingPassword}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="btn-primary px-4 py-2 disabled:opacity-50"
              >
                {savingPassword ? t('saving') : t('save_password')}
              </button>
            </div>
          </div>
        )}

        {!showPasswordSection && (
          <p className="text-muted !text-sm">
            {t('password_hint')}
          </p>
        )}
      </div>
    </motion.div>
  );
}
