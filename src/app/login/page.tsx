'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import { useTheme } from '@/app/context/ThemeContext';
import {
  requestLoginCode,
  verifyLoginCode,
  fetchCreateAccount,
  fetchSubscriptionsUser,
} from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';

interface SubscriptionData {
  subscription_status: string;
}

type Step = 'email' | 'code';

function LoginContent() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const emailParam = searchParams.get('email') || '';
  const type = (searchParams.get('type') as 'login' | 'register') || 'login';

  const [step, setStep] = useState<Step>(stepParam === 'code' && emailParam ? 'code' : 'email');
  const [email, setEmail] = useState(decodeURIComponent(emailParam || ''));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [isLogin, setIsLogin] = useState(type === 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { authenticated, hasHydrated, login, user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { setThemeMode, resolvedMode } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    if (stepParam === 'code' && emailParam) {
      setStep('code');
      setEmail(decodeURIComponent(emailParam));
    }
  }, [stepParam, emailParam]);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      const msg = urlError === 'email_send_failed' ? (language === 'fr' ? 'Impossible d\'envoyer l\'email.' : 'Failed to send email.') : urlError;
      setError(msg);
      showGlobalPopup(msg, 'error');
    }
  }, [searchParams, showGlobalPopup, language]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(language === 'fr' ? 'Email invalide' : 'Invalid email');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestLoginCode(email, language as 'fr' | 'en');
      setStep('code');
      showGlobalPopup(language === 'fr' ? 'Code envoyé ! Vérifiez votre boîte mail.' : 'Code sent! Check your inbox.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : (t('error_occurred') || 'Une erreur est survenue');
      setError(msg);
      showGlobalPopup(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      setError(language === 'fr' ? 'Code invalide (6 chiffres)' : 'Invalid code (6 digits)');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await verifyLoginCode(email, code);
      if (data.jwt && data.user) {
        await login(data.user, data.jwt);
        showGlobalPopup(t('login_successful') || 'Connexion réussie', 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : (t('error_occurred') || 'Une erreur est survenue');
      setError(msg);
      showGlobalPopup(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated || !authenticated || !user) return;
    const checkSubscriptionAndRedirect = async () => {
      try {
        const subscription = await fetchSubscriptionsUser(user.id) as { data?: SubscriptionData[] };
        if (subscription?.data?.length && (subscription.data[0].subscription_status === 'active' || subscription.data[0].subscription_status === 'trial')) {
          router.push('/dashboard');
        } else {
          router.push('/pricing');
        }
      } catch {
        router.push('/pricing');
      }
    };
    checkSubscriptionAndRedirect();
  }, [authenticated, hasHydrated, user, router]);

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    window.location.href = `${strapiUrl}/api/connect/google`;
  };

  const backToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  const validatePassword = (pwd: string) => {
    const requirements = {
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumbers: /\d/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      isLongEnough: pwd.length >= 8,
    };
    if (Object.values(requirements).every(Boolean)) return '';
    const missing = [];
    if (!requirements.hasUpperCase) missing.push(t('uppercase') || 'majuscule');
    if (!requirements.hasLowerCase) missing.push(t('lowercase') || 'minuscule');
    if (!requirements.hasNumbers) missing.push(t('digit') || 'chiffre');
    if (!requirements.hasSpecialChar) missing.push(t('special_char') || 'caractère spécial');
    if (!requirements.isLongEnough) missing.push(t('min_8_chars') || '8 caractères minimum');
    return (t('password_requirements') || 'Le mot de passe doit contenir') + ' : ' + missing.join(', ');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = await fetchCreateAccount(username, email, password);
      if (!data.error) {
        router.push('/login');
        showGlobalPopup(t('register_success_login') || 'Inscription réussie, connectez-vous pour continuer', 'success');
      } else {
        setError(t('register_failed') || 'Erreur lors de l\'inscription');
        showGlobalPopup(t('register_failed') || 'Erreur lors de l\'inscription', 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : (t('error_occurred') || 'Une erreur est survenue');
      setError(msg);
      showGlobalPopup(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFr = language === 'fr';

  return (
    <div className="login-page min-h-screen w-full flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[420px]">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button type="button" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className="px-2.5 py-1.5 border text-xs font-medium transition-colors" style={{ background: 'var(--login-surface)', borderColor: 'var(--login-border)', color: 'var(--login-text-muted)' }}>
            {language === 'fr' ? 'EN' : 'FR'}
          </button>
          <button type="button" onClick={() => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')} className="p-2 border transition-colors" style={{ background: 'var(--login-surface)', borderColor: 'var(--login-border)', color: 'var(--login-text-muted)' }}>
            {resolvedMode === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="login-fade-up mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <Image src="/images/logo/eclipse-logo.png" alt="Eclipse Studio" width={36} height={36} className="w-9 h-9 object-contain flex-shrink-0" />
            <span className="text-sm font-bold" style={{ color: 'var(--login-text)' }}>Eclipse Studio Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: 'var(--login-text)' }}>
            {isLogin ? (step === 'code' ? (isFr ? 'Entrez votre code' : 'Enter your code') : (t('welcome_back') || 'Bon retour 👋')) : (t('create_account') || 'Créer un compte')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--login-text-muted)' }}>
            {isLogin ? (step === 'code' ? (isFr ? `Un code à 6 chiffres a été envoyé à ${email}` : `A 6-digit code was sent to ${email}`) : (t('connect_to_eclipse') || 'Entrez votre email ou connectez-vous avec Google')) : (t('join_eclipse_studio') || 'Rejoignez Eclipse Studio')}
          </p>
        </div>

        {isLogin ? (
          step === 'email' ? (
            <>
              <div className="login-fade-up mb-5">
                <button type="button" onClick={handleGoogleLogin} disabled={isGoogleLoading} className="login-btn-google w-full">
                  {isGoogleLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {isGoogleLoading ? (t('loading') || 'Chargement...') : (t('continue_with_google') || 'Continuer avec Google')}
                </button>
              </div>
              <div className="login-fade-up mb-5"><div className="login-divider">{t('or_by_email') || 'ou par email'}</div></div>
              <form onSubmit={handleRequestCode} className="login-fade-up">
                {error && <div className="mb-4 p-3" style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}><p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p></div>}
                <div className="mb-4">
                  <label className="login-label">{t('email') || 'Email'}</label>
                  <input className="login-input" type="email" placeholder="arthur@eclipsestudio.fr" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <button type="submit" disabled={isSubmitting} className="login-btn w-full mb-4">
                  {isSubmitting ? (t('loading') || 'Chargement...') : (isFr ? 'Recevoir le code' : 'Receive code')}
                </button>
                <p className="text-xs text-center" style={{ color: 'var(--login-text-muted)' }}>
                  {isFr ? 'Un code à 6 chiffres sera envoyé à cette adresse.' : 'A 6-digit code will be sent to this address.'}
                </p>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyCode} className="login-fade-up">
              {error && <div className="mb-4 p-3" style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}><p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p></div>}
              <div className="mb-4">
                <label className="login-label">{isFr ? 'Code à 6 chiffres' : '6-digit code'}</label>
                <input className="login-input text-center text-2xl tracking-[0.5em] font-mono" type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus />
              </div>
              <button type="submit" disabled={isSubmitting || code.length !== 6} className="login-btn w-full mb-4">
                {isSubmitting ? (t('loading') || 'Chargement...') : (t('sign_in') || 'Se connecter')}
              </button>
              <button type="button" onClick={backToEmail} className="w-full text-sm font-medium" style={{ color: 'var(--login-link)' }}>
                {isFr ? '← Changer d\'email' : '← Change email'}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-fade-up">
            {error && <div className="mb-4 p-3" style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}><p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p></div>}
            <div className="flex flex-col gap-4 mb-5">
              <div><label className="login-label">{t('username') || 'Nom d\'utilisateur'}</label><input className="login-input" type="text" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" /></div>
              <div><label className="login-label">{t('email') || 'Email'}</label><input className="login-input" type="email" placeholder="arthur@eclipsestudio.fr" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
              <div>
                <label className="login-label">{t('password') || 'Mot de passe'}</label>
                <div className="relative">
                  <input className="login-input !pr-12" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(validatePassword(e.target.value)); }} required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--login-text-muted)' }}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {passwordError && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{passwordError}</p>}
              </div>
              <div>
                <label className="login-label">{t('confirm_password') || 'Confirmer le mot de passe'}</label>
                <div className="relative">
                  <input className="login-input !pr-12" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(e.target.value !== password ? (t('passwords_do_not_match') || 'Les mots de passe ne correspondent pas') : ''); }} required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--login-text-muted)' }}>{showConfirmPassword ? '🙈' : '👁️'}</button>
                </div>
                {confirmPasswordError && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{confirmPasswordError}</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="login-btn w-full mb-4">{isSubmitting ? (t('loading') || 'Chargement...') : (t('sign_up') || 'Créer un compte')}</button>
          </form>
        )}

        <div className="login-fade-up text-center mt-6">
          <span className="text-sm" style={{ color: 'var(--login-text-muted)' }}>
            {isLogin ? (t('don_t_have_an_account') || 'Pas encore de compte ? ') : (t('already_have_an_account') || 'Déjà un compte ? ')}
          </span>
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setStep('email'); setCode(''); }} className="font-semibold ml-1 bg-transparent border-none cursor-pointer hover:underline" style={{ color: 'var(--login-link)' }}>
            {isLogin ? (t('sign_up') || 'Créer un compte') : (t('login') || 'Se connecter')}
          </button>
        </div>

        {isLogin && (
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot-password" style={{ color: 'var(--login-link)' }}>{t('forgot_password') || 'Mot de passe oublié ?'}</Link>
          </p>
        )}

        <div className="mt-10 text-center text-xs" style={{ color: 'var(--login-text-muted)' }}>
          <span>© 2026 Eclipse Studio Dashboard · </span>
          <Link href="/privacy" className="no-underline hover:underline">{t('confidentiality')}</Link>
          <span> · </span>
          <Link href="/terms" className="no-underline hover:underline">{t('terms_short')}</Link>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'var(--login-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--login-text-muted)' }}>{(t('loading') || 'Chargement')}...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
