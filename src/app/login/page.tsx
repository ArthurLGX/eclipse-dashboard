'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchLogin,
  fetchCreateAccount,
  fetchSubscriptionsUser,
} from '@/lib/api';
import { BackBtn } from '@/app/components/buttons/backBtn';
import useLenis from '@/utils/useLenis';

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
  const router = useRouter();
  const { authenticated, hasHydrated, login, user } = useAuth();
  const { showGlobalPopup } = usePopup();

  useLenis();

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
          console.log('Login successful');
          console.log('data.user', data.user);

          // Utiliser la fonction login du contexte qui gère tout
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
          console.log('Register successful');
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
        // Vérifier si l'utilisateur a un abonnement
        const subscription = await fetchSubscriptionsUser(user.id) as { data?: SubscriptionData[] };
        console.log('subscription', subscription);

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
        // En cas d'erreur, rediriger vers pricing par défaut
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

  return (
    <div className="flex flex-col h-fit md:w-3/4 w-full !my-32 border border-zinc-900  bg-gradient-to-b from-zinc-900 to-black rounded-xl">
      {/* Left side - Form */}
      <div className=" bg-zinc-950 z-100 w-full">
        <BackBtn />
      </div>
      <div className=" flex-1 flex items-center justify-center p-4 md:p-16 bg-gradient-to-b from-zinc-950 to-black">
        <div className="md:max-w-md max-w-full">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="!text-center mb-8"
          >
            <h1 className="!text-4xl font-bold !text-zinc-200 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="!text-zinc-400">
              {isLogin
                ? 'Sign in to your account'
                : 'Join us today to start your journey'}
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeInOut' }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
              >
                <p className="!text-red-400 !text-sm !text-center">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Username"
                value={username}
                required
                onChange={e => setUsername(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg !text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  required={!isLogin}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg !text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                />
              </motion.div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  required
                  onChange={e => {
                    setPassword(e.target.value);
                    setPasswordError(validatePassword(e.target.value));
                  }}
                  className="w-full p-3 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg !text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 !text-zinc-400 hover:!text-zinc-200"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {passwordError && (
                <p className="!text-red-400 !text-xs">{passwordError}</p>
              )}
            </div>

            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    required={!isLogin}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      checkPassword(e.target.value);
                    }}
                    className="w-full p-3 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg !text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 !text-zinc-400 hover:!text-zinc-200"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="!text-red-400 !text-xs">
                    {confirmPasswordError}
                  </p>
                )}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="w-full bg-emerald-300 
               hover:!text-emerald-300 border border-emerald-300 cursor-pointer hover:bg-emerald-300/20 !text-black hover:!text-emerald-300 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="!text-center mt-6"
          >
            <p className="!text-zinc-400">
              {isLogin
                ? "Don't have an account? "
                : 'Already have an account? '}
              <button
                onClick={toggleMode}
                className="!text-emerald-300 cursor-pointer hover:!text-emerald-400  transition-colors duration-200"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="flex h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-950 to-black rounded-xl">
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-full max-w-md">
          <div className="!text-center mb-8">
            <div className="h-8 bg-zinc-800 rounded w-48 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-zinc-800 rounded w-32 mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-6">
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-zinc-900 rounded-r-xl"></div>
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
