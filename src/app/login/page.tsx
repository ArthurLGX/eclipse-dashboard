'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { fetchCreateAccount, fetchLogin } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import useLenis from '@/utils/useLenis';
import Image from 'next/image';
import { usePopup } from '@/app/context/PopupContext';

function LoginContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as 'login' | 'register') || 'login';
  const [isLogin, setIsLogin] = useState(type === 'login');
  const [username, setUsername] = React.useState('');

  // Mettre à jour le mode quand l'URL change
  useEffect(() => {
    const newType =
      (searchParams.get('type') as 'login' | 'register') || 'login';
    setIsLogin(newType === 'login');
  }, [searchParams]);
  const [password, setPassword] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const router = useRouter();
  const { authenticated, hasHydrated, login } = useAuth();

  useLenis();

  const { showGlobalPopup } = usePopup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const data = await fetchLogin(username, password);
        if (!data.error) {
          console.log('Login successful');
          localStorage.removeItem('token');
          localStorage.setItem('token', data.jwt);
          localStorage.removeItem('user');
          localStorage.setItem('user', JSON.stringify(data.user));
          login(data.user, data.jwt);
          router.push('/dashboard');
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
    if (!hasHydrated) return;
    if (authenticated) {
      router.push('/dashboard');
    }
  });

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
    <div className="flex h-fit w-3/4 !my-32 border border-zinc-900  bg-gradient-to-b from-zinc-950 to-black rounded-xl">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-16 bg-gradient-to-b from-zinc-950 to-black">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-zinc-200 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-zinc-400">
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
                <p className="text-red-400 text-sm text-center">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Username"
                value={username}
                required
                onChange={e => setUsername(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
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
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
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
                  className="w-full p-3 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-400 text-xs">{passwordError}</p>
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
                    className="w-full p-3 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="text-red-400 text-xs">{confirmPasswordError}</p>
                )}
              </motion.div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-green-500 text-black font-semibold py-3 px-6 rounded-lg hover:bg-green-400 transition-colors duration-200"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-6"
          >
            <p className="text-zinc-400">
              {isLogin
                ? "Don't have an account? "
                : 'Already have an account? '}
              <button
                onClick={toggleMode}
                className="text-green-500 hover:text-green-400 transition-colors duration-200"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Video Background */}
      <div className="flex-1 relative overflow-hidden rounded-r-xl">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/flamme.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center text-white">
            <Image
              src="/images/logo/eclipse-logo.png"
              alt="Eclipse Studio Logo"
              width={120}
              height={120}
              className="mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold mb-2">Eclipse Studio</h2>
            <p className="text-lg opacity-90">
              {isLogin
                ? 'Welcome back to your creative space'
                : 'Join our creative community'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="flex h-fit w-3/4 !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-950 to-black rounded-xl">
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
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
