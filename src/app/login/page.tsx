'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchCreateAccount, fetchLogin } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import useLenis from '@/utils/useLenis';
import Image from 'next/image';
import { usePopup } from '@/app/context/PopupContext';

export default function Login() {
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
                    if (!isLogin) {
                      setPasswordError(validatePassword(e.target.value));
                    }
                  }}
                  className={`w-full p-3 pr-12 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                    passwordError && !isLogin ? '!border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && !isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <p className="!text-red-400 text-sm text-center">
                    {passwordError}
                  </p>
                </motion.div>
              )}
            </div>
            {confirmPasswordError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <p className="text-red-400 text-sm text-center">
                  {confirmPasswordError}
                </p>
              </motion.div>
            )}
            {!isLogin && (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    required
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      checkPassword(e.target.value);
                    }}
                    className="w-full p-3 pr-12 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              onClick={handleSubmit}
              className="w-full bg-green-500 text-black font-semibold py-3 px-4 rounded-lg hover:bg-green-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeInOut' }}
            className="mt-8 text-center"
          >
            <p className="text-zinc-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              onClick={toggleMode}
              className="mt-2 text-green-400 hover:text-green-300 font-medium transition-colors duration-200"
            >
              {isLogin ? 'Create one here' : 'Sign in here'}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Right side - Background Image */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="flex flex-col items-center justify-center w-11/12 h-11/12 border border-zinc-800 rounded-lg">
          <Image
            src="/images/background.jpg"
            alt="Background"
            width={1000}
            height={1000}
            className="object-cover opacity-50 w-full h-full"
          />
          <Image
            src={'/images/logo/eclipse-logo.png'}
            alt="Logo"
            width={100}
            height={100}
            className=" opacity-100 w-[50px] h-[50px]"
          />
        </div>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' }}
            className="text-center text-white p-8"
          ></motion.div>
        </div>
      </div>
    </div>
  );
}
