'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePopup } from '@/app/context/PopupContext';
import { resetPassword } from '@/lib/api';
import { BackBtn } from '@/app/components/buttons/backBtn';
import { IconLock, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const router = useRouter();
  const { showGlobalPopup } = usePopup();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const validatePassword = (pwd: string) => {
    const requirements = {
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumbers: /\d/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      isLongEnough: pwd.length >= 8,
    };

    const isStrong = Object.values(requirements).every(Boolean);

    if (!isStrong) {
      const missing = [];
      if (!requirements.hasUpperCase) missing.push('une majuscule');
      if (!requirements.hasLowerCase) missing.push('une minuscule');
      if (!requirements.hasNumbers) missing.push('un chiffre');
      if (!requirements.hasSpecialChar) missing.push('un caractère spécial');
      if (!requirements.isLongEnough) missing.push('au moins 8 caractères');
      return `Le mot de passe doit contenir ${missing.join(', ')}`;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const pwdError = validatePassword(password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!code) {
      showGlobalPopup('Code de réinitialisation manquant', 'error');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(code, password, confirmPassword);
      setIsSuccess(true);
      showGlobalPopup('Mot de passe réinitialisé avec succès !', 'success');
      // Rediriger vers login après 3 secondes
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      showGlobalPopup(
        error instanceof Error ? error.message : 'Une erreur est survenue',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Si pas de code, afficher un message d'erreur
  if (!code) {
    return (
      <div className="flex flex-col h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-900 to-black rounded-xl">
        <div className="bg-zinc-950 z-100 w-full">
          <BackBtn />
        </div>
        <div className="flex-1 flex items-center justify-center p-4 md:p-16 bg-gradient-to-b from-zinc-950 to-black">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="!text-center max-w-md"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <IconAlertTriangle size={40} className="text-red-400" />
            </div>
            <h2 className="!text-2xl font-bold text-zinc-200 mb-4">
              Lien invalide
            </h2>
            <p className="text-zinc-400 mb-6">
              Ce lien de réinitialisation est invalide ou a expiré.
              Veuillez demander un nouveau lien.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block bg-violet-500 hover:bg-violet-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Demander un nouveau lien
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-900 to-black rounded-xl">
      <div className="bg-zinc-950 z-100 w-full">
        <BackBtn />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 md:p-16 bg-gradient-to-b from-zinc-950 to-black">
        <div className="md:max-w-md max-w-full w-full">
          {!isSuccess ? (
            <>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="!text-center mb-8"
              >
                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconLock size={32} className="text-violet-400" />
                </div>
                <h1 className="!text-4xl font-bold text-zinc-200 mb-2">
                  Nouveau mot de passe
                </h1>
                <p className="text-zinc-400">
                  Créez un nouveau mot de passe sécurisé
                </p>
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeInOut' }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nouveau mot de passe"
                      value={password}
                      required
                      onChange={e => {
                        setPassword(e.target.value);
                        setPasswordError(validatePassword(e.target.value));
                      }}
                      className="w-full p-3 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
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
                    <p className="!text-red-400 !text-xs">{passwordError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      required
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        if (e.target.value !== password) {
                          setConfirmError('Les mots de passe ne correspondent pas');
                        } else {
                          setConfirmError('');
                        }
                      }}
                      className="w-full p-3 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {confirmError && (
                    <p className="!text-red-400 !text-xs">{confirmError}</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading || !!passwordError || !!confirmError}
                  className="w-full bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </motion.button>
              </motion.form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="!text-center"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconCheck size={40} className="text-green-400" />
              </div>
              <h2 className="!text-2xl font-bold text-zinc-200 mb-4">
                Mot de passe réinitialisé !
              </h2>
              <p className="text-zinc-400 mb-6">
                Votre mot de passe a été modifié avec succès.
                Vous allez être redirigé vers la page de connexion...
              </p>
              <Link
                href="/login"
                className="inline-block bg-violet-500 hover:bg-violet-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Se connecter maintenant
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordLoading() {
  return (
    <div className="flex h-fit md:w-3/4 w-full !my-32 border border-zinc-900 bg-gradient-to-b from-zinc-950 to-black rounded-xl">
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-full max-w-md">
          <div className="!text-center mb-8">
            <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto mb-4 animate-pulse"></div>
            <div className="h-8 bg-zinc-800 rounded w-48 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-zinc-800 rounded w-32 mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-6">
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-12 bg-zinc-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

