'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchLogin,
  fetchCreateAccount,
  fetchSubscriptionsUser,
} from '@/lib/api';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';

interface SubscriptionData {
  subscription_status: string;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as 'login' | 'register') || 'login';
  const [isLogin, setIsLogin] = useState(type === 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { authenticated, hasHydrated, login, user } = useAuth();
  const { showGlobalPopup } = usePopup();
  const { t } = useLanguage();

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(urlError);
      showGlobalPopup(urlError, 'error');
    }
  }, [searchParams, showGlobalPopup]);

  useEffect(() => {
    const newType = (searchParams.get('type') as 'login' | 'register') || 'login';
    setIsLogin(newType === 'login');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsSubmitting(true);
    try {
      if (isLogin) {
        const identifier = isLogin ? username : email;
        const data = await fetchLogin(identifier, password);
        if (data.jwt && data.user) {
          login(data.user, data.jwt);
          showGlobalPopup(t('login_successful') || 'Connexion réussie', 'success');
        } else {
          setError(t('invalid_credentials') || 'Identifiants invalides');
          showGlobalPopup(t('invalid_credentials') || 'Identifiants invalides', 'error');
        }
      } else {
        const data = await fetchCreateAccount(username, email, password);
        if (!data.error) {
          router.push('/login');
          showGlobalPopup(t('register_success_login') || 'Inscription réussie, connectez-vous pour continuer', 'success');
        } else {
          setError(t('register_failed') || 'Erreur lors de l\'inscription');
          showGlobalPopup(t('register_failed') || 'Erreur lors de l\'inscription', 'error');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (t('error_occurred') || 'Une erreur est survenue');
      setError(message);
      showGlobalPopup(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated || !authenticated || !user) return;

    const checkSubscriptionAndRedirect = async () => {
      try {
        const subscription = await fetchSubscriptionsUser(user.id) as { data?: SubscriptionData[] };
        if (
          subscription?.data &&
          subscription.data.length > 0 &&
          (subscription.data[0].subscription_status === 'active' ||
            subscription.data[0].subscription_status === 'trial')
        ) {
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

  const toggleMode = () => {
    const newMode = !isLogin;
    router.push(`/login?type=${newMode ? 'register' : 'login'}`);
    setError('');
    setUsername('');
    setPassword('');
    setEmail('');
    setConfirmPassword('');
    setPasswordError('');
    setConfirmPasswordError('');
  };

  const checkPassword = (value: string) => {
    setConfirmPasswordError(value !== password ? (t('passwords_do_not_match') || 'Les mots de passe ne correspondent pas') : '');
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
    if (!requirements.hasNumbers) missing.push(t('number') || 'chiffre');
    if (!requirements.hasSpecialChar) missing.push(t('special_char') || 'caractère spécial');
    if (!requirements.isLongEnough) missing.push(t('min_8_chars') || '8 caractères minimum');
    return (t('password_requirements') || 'Le mot de passe doit contenir') + ' : ' + missing.join(', ');
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    window.location.href = `${strapiUrl}/api/connect/google`;
  };

  const features = [
    t('feature_projects') || 'Gestion de projets & tâches',
    t('feature_pipeline') || 'Pipeline commercial & CRM',
    t('feature_invoices') || 'Factures & devis en 1 clic',
    t('feature_smart_followup') || 'Smart Follow-Up par email',
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#f9fafb',
      }}
    >
      <style>{`
        .login-input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 9px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: white;
        }
        .login-input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17,24,39,0.06);
        }
        .login-input::placeholder { color: #9ca3af; }
        .login-btn {
          width: 100%;
          padding: 12px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s, transform 0.1s;
          letter-spacing: -0.01em;
        }
        .login-btn:hover:not(:disabled) { background: #1f2937; }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-btn-google {
          width: 100%;
          padding: 11px;
          background: white;
          color: #374151;
          border: 1.5px solid #e5e7eb;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }
        .login-btn-google:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
        .login-btn-google:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-link {
          color: #111827;
          font-weight: 600;
          text-decoration: none;
          font-size: 13px;
        }
        .login-link:hover { text-decoration: underline; }
        .login-label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
          display: block;
        }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9ca3af;
          font-size: 12px;
        }
        .login-divider::before, .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-fade-up { animation: loginFadeUp 0.4s ease both; }
        .login-fade-up-1 { animation-delay: 0.05s; }
        .login-fade-up-2 { animation-delay: 0.1s; }
        .login-fade-up-3 { animation-delay: 0.15s; }
        .login-fade-up-4 { animation-delay: 0.2s; }
        .login-fade-up-5 { animation-delay: 0.25s; }
      `}</style>

      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between flex-shrink-0 relative overflow-hidden"
        style={{ width: 440, background: '#111827', padding: '48px 44px' }}
      >
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.08)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-14">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/15" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <span className="text-white text-sm font-extrabold">ES</span>
            </div>
            <span className="text-white text-sm font-bold tracking-tight">Eclipse Studio</span>
          </div>

          <div className="mb-7">
            <h2 className="text-[28px] font-bold text-white leading-tight tracking-tight mb-3">
              {isLogin ? (t('all_your_business') || 'Tout votre business,') : (t('join_eclipse') || 'Rejoignez Eclipse')}
              {isLogin && <br />}
              {isLogin && (t('in_one_place') || 'au même endroit.')}
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              {isLogin
                ? (t('login_tagline') || 'Clients, projets, factures, pipeline — gérez tout depuis un dashboard pensé pour les indépendants.')
                : (t('create_your_account') || 'Créez votre compte et commencez à gérer votre activité en quelques minutes.')}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.25)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(165,180,252,1)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm text-white/65">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/8">
          <p className="text-sm text-white/40 leading-relaxed italic">
            &quot;{t('login_quote') || "Le dashboard qui m'a fait gagner 3h par semaine sur l'admin."}&quot;
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.1)' }}>
              AL
            </div>
            <span className="text-xs text-white/40">Arthur Le Goux — Eclipse Studio</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-[380px]">
          <div className="login-fade-up mb-8">
            <h1 className="text-[22px] font-bold text-[#111827] tracking-tight mb-1.5">
              {isLogin ? (t('welcome_back') || 'Bon retour 👋') : (t('create_account') || 'Créer un compte')}
            </h1>
            <p className="text-sm text-[#6b7280]">
              {isLogin
                ? (t('connect_to_eclipse') || 'Connectez-vous à votre espace Eclipse Studio')
                : (t('join_eclipse_studio') || 'Rejoignez Eclipse Studio en quelques clics')}
            </p>
          </div>

          {/* Google */}
          <div className="login-fade-up login-fade-up-1 mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="login-btn-google"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-[#374151] border-t-transparent rounded-full animate-spin" />
              ) : (
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

          <div className="login-fade-up login-fade-up-2 mb-5">
            <div className="login-divider">{t('or_by_email') || 'ou par email'}</div>
          </div>

          <form onSubmit={handleSubmit} className="login-fade-up login-fade-up-3">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4 mb-5">
              {!isLogin && (
                <div>
                  <label className="login-label">{t('username') || 'Nom d\'utilisateur'}</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                    autoComplete="username"
                  />
                </div>
              )}
              <div>
                <label className="login-label">{isLogin ? (t('email_or_username') || 'Email ou nom d\'utilisateur') : (t('email') || 'Email')}</label>
                <input
                  className="login-input"
                  type={isLogin ? 'text' : 'email'}
                  placeholder="arthur@eclipsestudio.fr"
                  value={isLogin ? username : email}
                  onChange={(e) => (isLogin ? setUsername(e.target.value) : setEmail(e.target.value))}
                  required
                  autoComplete={isLogin ? 'username' : 'email'}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="login-label !mb-0">{t('password') || 'Mot de passe'}</label>
                  {isLogin && (
                    <Link href="/forgot-password" className="login-link !font-medium !text-[#6b7280]">
                      {t('forgot_password') || 'Mot de passe oublié ?'}
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="login-input pr-12"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (!isLogin) setPasswordError(validatePassword(e.target.value));
                    }}
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] transition-colors"
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
                {passwordError && !isLogin && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
              </div>
              {!isLogin && (
                <div>
                  <label className="login-label">{t('confirm_password') || 'Confirmer le mot de passe'}</label>
                  <div className="relative">
                    <input
                      className="login-input pr-12"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        checkPassword(e.target.value);
                      }}
                      required={!isLogin}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] transition-colors"
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                  {confirmPasswordError && <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>}
                </div>
              )}
            </div>

            <div className="login-fade-up login-fade-up-4 mb-6">
              <button type="submit" disabled={isSubmitting} className="login-btn">
                {isSubmitting ? (t('loading') || 'Chargement...') : (isLogin ? (t('sign_in') || 'Se connecter') : (t('sign_up') || 'Créer un compte'))}
              </button>
            </div>

            {!isLogin && (
              <p className="text-xs text-center text-[#6b7280] mb-4">
                {t('by_signing_up_you_agree_to_eclipse_s_terms_of_service')}
                <Link href="/terms" className="login-link"> {t('terms_of_service')} </Link>
                {t('and')}{' '}
                <Link href="/privacy" className="login-link"> {t('privacy_policy')}</Link>
              </p>
            )}

            <div className="login-fade-up login-fade-up-5 text-center">
              <span className="text-sm text-[#9ca3af]">
                {isLogin ? (t('don_t_have_an_account') || 'Pas encore de compte ? ') : (t('already_have_an_account') || 'Déjà un compte ? ')}
              </span>
              <button type="button" onClick={toggleMode} className="login-link ml-1 bg-transparent border-none cursor-pointer">
                {isLogin ? (t('sign_up') || 'Créer un compte') : (t('login') || 'Se connecter')}
              </button>
            </div>
          </form>

          <div className="mt-10 text-center">
            <span className="text-[11px] text-[#d1d5db]">© 2026 Eclipse Studio · </span>
            <Link href="/privacy" className="text-[11px] text-[#d1d5db] no-underline hover:underline">
              Confidentialité
            </Link>
            <span className="text-[11px] text-[#d1d5db]"> · </span>
            <Link href="/terms" className="text-[11px] text-[#d1d5db] no-underline hover:underline">
              CGU
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#f9fafb' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#111827] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6b7280]">{(t('loading') || 'Chargement')}...</p>
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
