'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { IconEye, IconEyeOff, IconPencil, IconCreditCard, IconShield, IconUser, IconTrash, IconCopy } from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import { updateUser, updateUserProfilePicture, updateUserAvatar, changePassword, fetchSubscriptionsUser } from '@/lib/api';
import { usePopup } from '@/app/context/PopupContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { usePreferences } from '@/app/context/PreferencesContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { useCurrentUser, clearCache } from '@/hooks/useApi';
import ImageUpload from '@/app/components/ImageUpload';
import { FALLBACK_AVATAR } from '@/lib/randomuser-avatar';

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateNumeric(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PersonalInformationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { preferences, updateNotifications } = usePreferences();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [subscription, setSubscription] = useState<{ plan?: { name: string; price_monthly: number }; start_date?: string } | null>(null);

  const { data: profileData, loading, refetch: refetchProfile } = useCurrentUser(user?.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any;

  useMemo(() => {
    if (profile) {
      setFormData({ username: profile.username || '', email: profile.email || '' });
    }
  }, [profile]);

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

  const profilePictureUrl = useMemo(() => {
    if (profile?.profile_picture?.url) {
      return process.env.NEXT_PUBLIC_STRAPI_URL + profile.profile_picture.url;
    }
    if (profile?.avatar) return profile.avatar;
    return FALLBACK_AVATAR;
  }, [profile]);

  const handleGenerateAvatar = async () => {
    if (!user?.id) return;
    setGeneratingAvatar(true);
    try {
      const gender = profile?.gender ?? undefined;
      const res = await fetch(`/api/avatar/generate?gender=${gender || ''}`);
      const { avatar } = await res.json();
      if (avatar) {
        await updateUserAvatar(user.id, avatar);
        showGlobalPopup('Photo de profil générée', 'success');
        clearCache('current-user');
        await refetchProfile();
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      showGlobalPopup('Erreur lors de la génération', 'error');
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const handleProfilePictureUpload = async (imageId: number) => {
    if (!user?.id) return;
    try {
      await updateUserProfilePicture(user.id, imageId);
      showGlobalPopup(t('image_updated') || 'Photo de profil mise à jour', 'success');
      clearCache('current-user');
      await refetchProfile();
    } catch (error) {
      console.error('Error updating profile picture:', error);
      showGlobalPopup(t('image_update_error') || 'Erreur lors de la mise à jour', 'error');
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await updateUser(user.id, { username: formData.username, email: formData.email });
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
    setFormData({ username: profile?.username || '', email: profile?.email || '' });
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
      showGlobalPopup(error instanceof Error ? error.message : (t('password_update_error') || 'Erreur'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showGlobalPopup('Copié', 'success')).catch(() => {});
  };

  const notifCount = [
    preferences.notifications.emailNewInvoice,
    preferences.notifications.emailInvoicePaid,
    preferences.notifications.emailCollaboration,
    preferences.notifications.emailNewsletter,
  ].filter(Boolean).length;

  const memberDays = profile?.createdAt
    ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6 space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="profile-hero">
            <div className="w-24 h-24 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-32 animate-pulse" />
              <div className="h-4 bg-muted rounded w-48 animate-pulse" />
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </div>
          </div>
          <div className="profile-grid">
            <div className="h-64 bg-muted rounded-2xl animate-pulse" />
            <div className="h-48 bg-muted rounded-2xl animate-pulse" />
          </div>
        </div>
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
            <span className="text-primary font-medium">{t('profile')}</span>
          </nav>
        </div>

        {/* Hero */}
        <div className="profile-hero">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-ring">
              <div className="w-[76px] h-[76px] rounded-full overflow-hidden flex items-center justify-center shrink-0 [&_button]:!w-[76px] [&_button]:!h-[76px] ">
                <ImageUpload
                  currentImageUrl={profilePictureUrl}
                  onUpload={handleProfilePictureUpload}
                  size="md"
                  shape="circle"
                  placeholder="user"
                  disabled={!editing}
                  menuPortal
                />
              </div>
            </div>
          </div>

          <div className="profile-hero-info">
            <div className="profile-hero-name">{profile?.username || profile?.email}</div>
            <div className="profile-hero-handle">@{profile?.username || profile?.email?.split('@')[0] || 'user'} · {profile?.email}</div>
            <div className="profile-hero-badges">
              <span className="profile-hero-badge">
                <span className={`profile-hero-badge-dot ${profile?.confirmed ? 'green' : ''}`} />
                {profile?.confirmed ? t('account_confirmed') : t('account_pending')}
              </span>
              {subscription?.plan && (
                <span className="profile-hero-badge">
                  <span className="profile-hero-badge-dot blue" />
                  Plan {subscription.plan.name.charAt(0).toUpperCase() + subscription.plan.name.slice(1)}
                </span>
              )}
              {profile?.createdAt && (
                <span className="profile-hero-badge">
                  Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {editing && !profile?.profile_picture?.url && (
              <button
                type="button"
                onClick={handleGenerateAvatar}
                disabled={generatingAvatar}
                className="text-sm text-accent hover:underline mt-2 disabled:opacity-50"
              >
                {generatingAvatar ? 'Génération...' : 'Générer une photo de profil'}
              </button>
            )}
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="profile-btn-hero-primary"
              onClick={() => setEditing(!editing)}
            >
              <IconPencil size={14} />
              {editing ? t('cancel') : t('edit_profile')}
            </button>
            <button
              type="button"
              className="profile-btn-hero-ghost"
              onClick={() => router.push('/dashboard/profile/your-subscription')}
            >
              <IconCreditCard size={14} />
              {t('your_subscription')}
            </button>
            <div className="profile-hero-since">
            Dernière connexion · {profile?.updatedAt ? formatDateNumeric(profile.updatedAt) : '—'}
          </div>
          </div>

          
        </div>

        <div className="profile-grid">
          {/* Colonne gauche */}
          <div>
            {/* Informations personnelles */}
            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">{t('personal_information')}</span>
                <button
                  type="button"
                  className="profile-btn-sm"
                  onClick={() => setEditing(!editing)}
                >
                  <IconPencil size={13} />
                  {editing ? t('cancel') : t('modify')}
                </button>
              </div>

              {editing ? (
                <div className="profile-card-body">
                  <div className="profile-form-row mb-4">
                    <div className="profile-form-group">
                      <label className="profile-form-label">{t('username')}</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        className="profile-form-input"
                      />
                    </div>
                    <div className="profile-form-group">
                      <label className="profile-form-label">{t('email')}</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="profile-form-input"
                      />
                    </div>
                  </div>
                  <div className="profile-form-actions">
                    <button type="button" className="profile-btn-cancel" onClick={handleCancel}>{t('cancel')}</button>
                    <button type="button" className="profile-btn-save" onClick={handleSave}>{t('save')}</button>
                  </div>
                </div>
              ) : (
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <div className="profile-info-label">{t('username')}</div>
                    <div className="profile-info-value mono">
                      {profile?.username}
                      <button type="button" className="profile-info-copy" onClick={() => copyToClipboard(profile?.username || '')} title="Copier">
                        <IconCopy size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-label">{t('email')}</div>
                    <div className="profile-info-value mono">
                      {profile?.email}
                      <button type="button" className="profile-info-copy" onClick={() => copyToClipboard(profile?.email || '')} title="Copier">
                        <IconCopy size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-label">{t('account_status')}</div>
                    <div className="profile-info-value">
                      <span className="profile-status-pill">
                        <span className="profile-status-pill-dot" />
                        {profile?.confirmed ? t('account_confirmed') : t('account_pending')}
                      </span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-label">{t('last_update')}</div>
                    <div className="profile-info-value mono">{profile?.updatedAt ? formatDateNumeric(profile.updatedAt) : '—'}</div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-label">{t('created_at')}</div>
                    <div className="profile-info-value mono">{profile?.createdAt ? formatDateNumeric(profile.createdAt) : '—'}</div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-label">ID utilisateur</div>
                    <div className="profile-info-value mono text-muted-foreground" style={{ fontSize: '12px' }}>
                      {profile?.documentId || profile?.id || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sécurité / Mot de passe */}
            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">{t('change_password')}</span>
                <button
                  type="button"
                  className="profile-btn-sm"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                >
                  {t('modify')}
                </button>
              </div>
              <div className="profile-pw-body">
                <div>
                  <div className="profile-pw-label">{t('current_password')}</div>
                  <div className="profile-pw-dots">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <span key={i} className="profile-pw-dot" />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Dernière modification : jamais</span>
              </div>
              <div className={`profile-pw-form ${showPasswordSection ? 'open' : ''}`}>
                <div className="profile-form-group">
                  <label className="profile-form-label">{t('current_password')}</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="profile-form-input !pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    >
                      {showCurrentPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label className="profile-form-label">{t('new_password')}</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="profile-form-input !pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showNewPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="profile-form-group">
                    <label className="profile-form-label">{t('confirm_password')}</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="profile-form-input !pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showConfirmPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="profile-form-actions">
                  <button type="button" className="profile-btn-cancel" onClick={() => { setShowPasswordSection(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    className="profile-btn-save"
                    onClick={handlePasswordChange}
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  >
                    {savingPassword ? t('saving') : t('save_password')}
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">{t('notifications')}</span>
                <span className="text-xs text-muted-foreground">{notifCount} active{notifCount > 1 ? 's' : ''}</span>
              </div>
              <div className="profile-notif-list">
                <div className="profile-notif-item">
                  <div>
                    <div className="profile-notif-title">Nouvelles factures</div>
                    <div className="profile-notif-desc">Recevoir un email à chaque nouvelle facture créée</div>
                  </div>
                  <label className="profile-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.emailNewInvoice}
                      onChange={e => updateNotifications({ emailNewInvoice: e.target.checked })}
                    />
                    <span className="profile-toggle-slider" />
                  </label>
                </div>
                <div className="profile-notif-item">
                  <div>
                    <div className="profile-notif-title">Facture payée</div>
                    <div className="profile-notif-desc">Notification lorsqu&apos;une facture est marquée payée</div>
                  </div>
                  <label className="profile-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.emailInvoicePaid}
                      onChange={e => updateNotifications({ emailInvoicePaid: e.target.checked })}
                    />
                    <span className="profile-toggle-slider" />
                  </label>
                </div>
                <div className="profile-notif-item">
                  <div>
                    <div className="profile-notif-title">Invitations collaboration</div>
                    <div className="profile-notif-desc">Projets partagés et invitations</div>
                  </div>
                  <label className="profile-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.emailCollaboration}
                      onChange={e => updateNotifications({ emailCollaboration: e.target.checked })}
                    />
                    <span className="profile-toggle-slider" />
                  </label>
                </div>
                <div className="profile-notif-item">
                  <div>
                    <div className="profile-notif-title">Actualités produit</div>
                    <div className="profile-notif-desc">Nouvelles fonctionnalités et mises à jour</div>
                  </div>
                  <label className="profile-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.emailNewsletter}
                      onChange={e => updateNotifications({ emailNewsletter: e.target.checked })}
                    />
                    <span className="profile-toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div>
            {/* Abonnement */}
            <div className="profile-side-card">
              <div className="profile-side-card-header">
                <span className="profile-side-card-title">Abonnement actif</span>
                {subscription?.plan && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success text-success">
                    {subscription.plan.name.charAt(0).toUpperCase() + subscription.plan.name.slice(1)}
                  </span>
                )}
              </div>
              <div className="profile-plan-block">
                <div className="profile-plan-tier">
                  <div className="profile-plan-name">
                    Plan {subscription?.plan?.name ? subscription.plan.name.charAt(0).toUpperCase() + subscription.plan.name.slice(1) : 'Free'}
                  </div>
                  <div className="profile-plan-price-small">
                    <div className="amount">{subscription?.plan?.price_monthly ?? 0} €</div>
                    <div className="period">/ mois</div>
                  </div>
                </div>
                <div className="profile-plan-features-mini">
                  <div className="profile-plan-feat">
                    <div className="profile-plan-feat-check">
                      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2 2 4-4" /></svg>
                    </div>
                    Newsletters incluses
                  </div>
                  <div className="profile-plan-feat">
                    <div className="profile-plan-feat-check">
                      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2 2 4-4" /></svg>
                    </div>
                    Support inclus
                  </div>
                  <div className="profile-plan-feat">
                    <div className="profile-plan-feat-check">
                      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2 2 4-4" /></svg>
                    </div>
                    Clients illimités
                  </div>
                </div>
                <button
                  type="button"
                  className="profile-btn-upgrade w-full"
                  onClick={() => router.push('/dashboard/profile/your-subscription')}
                >
                  Gérer l&apos;abonnement
                  <span>›</span>
                </button>
              </div>
              <div className="profile-stats-mini">
                <div className="profile-stat-mini">
                  <div className="profile-stat-mini-val">{memberDays}</div>
                  <div className="profile-stat-mini-label">Jours membre</div>
                </div>
                <div className="profile-stat-mini">
                  <div className="profile-stat-mini-val">
                    {subscription?.start_date ? formatDateShort(subscription.start_date).split(' ').slice(0, 2).join(' ') : '—'}
                  </div>
                  <div className="profile-stat-mini-label">Prochain paiement</div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="profile-side-card">
              <div className="profile-side-card-header">
                <span className="profile-side-card-title">Paramètres du compte</span>
              </div>
              <div className="profile-nav-list">
                <button type="button" className="profile-nav-item" onClick={() => router.push('/dashboard/profile/personal-information')}>
                  <div className="profile-nav-item-icon"><IconUser size={14} stroke={1.6} /></div>
                  <div className="profile-nav-item-text">
                    <div className="profile-nav-item-title">Informations personnelles</div>
                    <div className="profile-nav-item-sub">Nom, email, photo</div>
                  </div>
                  <span className="profile-nav-item-arrow">›</span>
                </button>
                <button type="button" className="profile-nav-item" onClick={() => router.push('/dashboard/profile/your-subscription')}>
                  <div className="profile-nav-item-icon"><IconCreditCard size={14} stroke={1.6} /></div>
                  <div className="profile-nav-item-text">
                    <div className="profile-nav-item-title">Abonnement & facturation</div>
                    <div className="profile-nav-item-sub">
                      Plan {subscription?.plan?.name || 'Free'} · {subscription?.plan?.price_monthly ?? 0} € / mois
                    </div>
                  </div>
                  <span className="profile-nav-item-arrow">›</span>
                </button>
                <button type="button" className="profile-nav-item" onClick={() => setShowPasswordSection(true)}>
                  <div className="profile-nav-item-icon"><IconShield size={14} stroke={1.6} /></div>
                  <div className="profile-nav-item-text">
                    <div className="profile-nav-item-title">Sécurité</div>
                    <div className="profile-nav-item-sub">Mot de passe, 2FA</div>
                  </div>
                  <span className="profile-nav-item-arrow">›</span>
                </button>
                <button
                  type="button"
                  className="profile-nav-item danger"
                  onClick={() => showGlobalPopup('Cette fonctionnalité sera bientôt disponible', 'info')}
                >
                  <div className="profile-nav-item-icon"><IconTrash size={14} stroke={1.6} /></div>
                  <div className="profile-nav-item-text">
                    <div className="profile-nav-item-title">Supprimer le compte</div>
                    <div className="profile-nav-item-sub" style={{ color: 'var(--color-danger)' }}>Action irréversible</div>
                  </div>
                  <span className="profile-nav-item-arrow">›</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
