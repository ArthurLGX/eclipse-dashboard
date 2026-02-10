'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchLogin,
  fetchCreateAccount,
  fetchSubscriptionsUser,
} from '@/lib/api';
import { IconBrandGithub, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import ProgressiveTimeline from '@/app/components/ProgressiveTimeline';

interface SubscriptionData {
  subscription_status: string;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as 'login' | 'register') || 'login';
  const [isLogin, setIsLogin] = useState(type === 'login');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const router = useRouter();
  const { authenticated, hasHydrated, login, user } = useAuth();
  const { showGlobalPopup } = usePopup();

  const { t } = useLanguage();

  // Check for OAuth error in URL
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(urlError);
      showGlobalPopup(urlError, 'error');
    }
  }, [searchParams, showGlobalPopup]);

  // Mettre à jour le mode quand l'URL change
  useEffect(() => {
    const newType =
      (searchParams.get('type') as 'login' | 'register') || 'login';
    setIsLogin(newType === 'login');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const data = await fetchLogin(username, password);
        if (data.jwt && data.user) {
          login(data.user, data.jwt);
          showGlobalPopup('Login successful', 'success');
        } else {
          console.error('Login failed');
          setError('Invalid username or password');
          showGlobalPopup('Invalid username or password', 'error');
        }
      } else {
        const data = await fetchCreateAccount(username, email, password);
        if (!data.error) {
          router.push('/login');
          showGlobalPopup(
            'Register successful, please login to continue',
            'success'
          );
        } else {
          console.error('Register failed');
          setError('Register failed');
          showGlobalPopup('Register failed', 'error');
        }
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      showGlobalPopup(
        error instanceof Error ? error.message : 'An error occurred',
        'error'
      );
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
      } catch (error) {
        console.error('Error checking subscription:', error);
        router.push('/pricing');
      }
    };

    checkSubscriptionAndRedirect();
  }, [authenticated, hasHydrated, user, router]);

  const toggleMode = () => {
    const newMode = !isLogin;
    router.push(`/login?type=${newMode ? 'login' : 'register'}`);
    setError('');
    setUsername('');
    setPassword('');
    setEmail('');
    setConfirmPassword('');
    setConfirmPasswordError('');
  };

  const checkPassword = (value: string) => {
    if (value !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const validatePassword = (password: string) => {
    const requirements = {
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isLongEnough: password.length >= 8,
    };

    const isStrong = Object.values(requirements).every(Boolean);

    if (!isStrong) {
      const missingRequirements = [];
      if (!requirements.hasUpperCase)
        missingRequirements.push('uppercase letter');
      if (!requirements.hasLowerCase)
        missingRequirements.push('lowercase letter');
      if (!requirements.hasNumbers) missingRequirements.push('number');
      if (!requirements.hasSpecialChar)
        missingRequirements.push('special character');
      if (!requirements.isLongEnough)
        missingRequirements.push('at least 8 characters');
      return `Password must contain ${missingRequirements.join(', ')}`;
    }
    return '';
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    window.location.href = `${strapiUrl}/api/connect/google`;
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center py-32">
      {/* Background avec grille subtile qui s'estompe */}
      <div className="absolute inset-0 bg-page">
        {/* Grille fine avec masque radial */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--border-muted) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border-muted) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Container principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4"
      >
        <div className="backdrop-blur-2xl bg-card/50 rounded-3xl border border-default shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2 grid-cols-1 min-h-[650px]">
            {/* Côté gauche - Formulaire */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              {/* Logo */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mb-8"
              >
               
                <div>
                  <h1 className=" uppercase text-primary mb-2 !text-right">
                    {isLogin ? t('welcome_to_eclipse') : t('join_eclipse')}
                  </h1>
                  <p className="text-xs text-muted !text-right">
                    {isLogin ? t('better_project_reviews_for_developers') : t('create_your_account')}
                  </p>
                </div>
              </motion.div>

              {/* Lien "Already have an account" / "Don't have an account" */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 mb-6"
              >
                <span className="text-sm text-muted">
                  {isLogin ? t("don_t_have_an_account") : t("already_have_an_account")}
                </span>
                <button
                  onClick={toggleMode}
                  className="text-sm text-accent hover:text-accent/80 font-medium transition-colors underline"
                >
                  {isLogin ? t('sign_up') : t('login')}
                </button>
              </motion.div>

              {/* OAuth Buttons */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="!text-left text-xs text-muted mb-3"
              >
                {isLogin 
                  ? t('continue_with_oauth') || 'Continuez avec votre compte' 
                  : t('signup_with_oauth') || 'Inscrivez-vous en un clic'}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 gap-3 mb-6"
              >
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-card hover:bg-hover border border-default rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-secondary">Loading...</span>
                    </>
                  ) : (
                    <>
                      <Image 
                        src="/images/google-icon.png" 
                        alt="Google" 
                        width={20} 
                        height={20}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium text-secondary group-hover:text-primary">{t('google')}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-card hover:bg-hover border border-default rounded-xl transition-all duration-200 group opacity-50 cursor-not-allowed"
                  disabled
                  title={t('coming_soon') || 'Prochainement'}
                >
                  <IconBrandGithub className="w-5 h-5 text-secondary" />
                  <span className="text-sm font-medium text-secondary">{t('github')}</span>
                </button>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="relative my-6"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-default"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted">{t('or')}</span>
                </div>
              </motion.div>

              {/* Formulaire */}
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-danger-bg border border-danger rounded-xl"
                  >
                    <p className="text-sm text-danger text-center">{error}</p>
                  </motion.div>
                )}

                {/* Email/Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">
                    {isLogin ? t('username') : t('email')}
                  </label>
                  <input
                    type={isLogin ? 'text' : 'email'}
                    placeholder={isLogin ? t('enter_your_username') : t('name@example.com')}
                    value={isLogin ? username : email}
                    required
                    autoComplete={isLogin ? 'username' : 'email'}
                    onChange={e => isLogin ? setUsername(e.target.value) : setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />
                </div>

                {/* Username pour register */}
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-secondary">{t('username')}</label>
                    <input
                      type="text"
                      placeholder={t('choose_a_username')}
                      value={username}
                      required={!isLogin}
                      autoComplete="username"
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-input border border-input rounded-xl text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    />
                  </motion.div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-secondary">{t('password')}</label>
                    {isLogin && (
                      <a
                        href="/forgot-password"
                        className="text-xs text-muted hover:text-accent transition-colors"
                      >
                        {t('forgot_password')}
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('enter_your_password')}
                      value={password}
                      required
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (!isLogin) setPasswordError(validatePassword(e.target.value));
                      }}
                      className="w-full px-4 py-3 pr-12 bg-input border border-input rounded-xl text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    >
                      {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                    </button>
                  </div>
                  {passwordError && !isLogin && (
                    <p className="text-danger text-xs">{passwordError}</p>
                  )}
                </div>

                {/* Confirm Password */}
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-secondary">{t('confirm_password')}</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('confirm_your_password')}
                        value={confirmPassword}
                        required={!isLogin}
                        autoComplete="new-password"
                        onChange={e => {
                          setConfirmPassword(e.target.value);
                          checkPassword(e.target.value);
                        }}
                        className="w-full px-4 py-3 pr-12 bg-input border border-input rounded-xl text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                      </button>
                    </div>
                    {confirmPasswordError && (
                      <p className="text-danger text-xs">{confirmPasswordError}</p>
                    )}
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-highlight hover:bg-highlight-hover text-highlight-text font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLogin ? t('sign_in') : t('sign_up')}
                </button>

                {/* Terms */}
                {!isLogin && (
                  <p className="text-xs text-center text-muted">
                    {t('by_signing_up_you_agree_to_eclipse_s_terms_of_service')}
                    <a href="#" className="text-accent hover:underline">
                      {t('terms_of_service')}
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-accent hover:underline">
                      {t('privacy_policy')}
                    </a>
                  </p>
                )}
              </motion.form>
            </div>

            {/* Côté droit - Animation progressive timeline */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative lg:flex hidden flex-col items-center justify-center p-12 border-l border-default overflow-hidden"
            >
              <ProgressiveTimeline />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function LoginLoading() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted">{t('loading')}...</p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
