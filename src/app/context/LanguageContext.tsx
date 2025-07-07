'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

// Dictionnaire de traductions
const translations = {
  fr: {
    // Navigation
    about: 'À propos',
    pricing: 'Tarifs',
    contact: 'Contact',
    login: 'Connexion',
    register: 'Inscription',
    reset_password: 'Réinitialiser le mot de passe',
    dashboard: 'Tableau de bord',
    clients: 'Clients',
    prospects: 'Prospects',
    projects: 'Projets',
    mentors: 'Mentors',
    newsletters: 'Newsletters',
    profile: 'Profil',
    logout: 'Déconnexion',

    // Auth
    welcome_back: 'Bon retour',
    create_account: 'Créer un compte',
    sign_in: 'Se connecter',
    sign_up: "S'inscrire",
    username: "Nom d'utilisateur",
    email: 'Email',
    password: 'Mot de passe',
    confirm_password: 'Confirmer le mot de passe',
    forgot_password: 'Mot de passe oublié ?',
    verify_email: "Vérifier l'email",

    // Profile
    edit_profile: 'Modifier le profil',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    personal_info: 'Informations personnelles',
    account_status: 'Statut du compte',
    confirmed_account: 'Compte confirmé',
    pending_account: 'Compte en attente',
    last_update: 'Dernière mise à jour',
    member_since: 'Membre depuis',

    // Messages
    error_loading_profile: 'Erreur lors du chargement du profil',
    error_updating_user: "Erreur lors de la mise à jour de l'utilisateur",
    profile_updated_success: 'Profil mis à jour avec succès',
    error_updating: 'Erreur lors de la mise à jour',
    login_success: 'Connexion réussie',
    invalid_credentials: 'Identifiants invalides',
    register_success: 'Inscription réussie, veuillez vous connecter',
    register_failed: "Échec de l'inscription",

    // Dashboard
    total_clients: 'Total Clients',
    active_clients: 'Clients Actifs',
    total_prospects: 'Total Prospects',
    total_projects: 'Total Projets',
    total_mentors: 'Total Mentors',
    clients_list: 'Liste des clients',
    prospects_list: 'Liste des prospects',
    projects_list: 'Liste des projets',
    mentors_list: 'Liste des mentors',
    recent_activity: 'Activité récente',
    statistics: 'Statistiques',
    conversion_rate: 'Taux de conversion',
    projects_in_progress: 'Projets en cours',
    no_recent_activity: 'Aucune activité récente',

    // Table Filters - Clients
    search_placeholder_clients: 'Rechercher par nom, email ou entreprise...',
    status_options_clients: 'Tous les statuts',
    status_value_clients: 'Tous les statuts',

    // Table Filters - Prospects
    search_placeholder_prospects: 'Rechercher par nom, email ou entreprise...',
    status_options_prospects: 'Tous les statuts',
    search_value_prospects: 'Rechercher...',
    status_value_prospects: 'Tous les statuts',

    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    warning: 'Attention',
    info: 'Information',
    hero_subtitle_top: 'Gérez votre freelancing',
    hero_title_main: 'Maîtrisez vos projets',
    hero_subtitle_bottom: 'Sans effort',
    try_for_free: 'Essayer gratuitement',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    about: 'About',
    pricing: 'Pricing',
    contact: 'Contact',
    login: 'Login',
    register: 'Register',
    forgot_password: 'Forgot Password?',
    reset_password: 'Reset Password',
    verify_email: 'Verify Email',
    clients: 'Clients',
    prospects: 'Prospects',
    projects: 'Projects',
    mentors: 'Mentors',
    newsletters: 'Newsletters',
    profile: 'Profile',
    logout: 'Logout',

    // Auth
    welcome_back: 'Welcome Back',
    create_account: 'Create Account',
    sign_in: 'Sign In',
    sign_up: 'Sign Up',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm Password',

    // Profile
    edit_profile: 'Edit Profile',
    save: 'Save',
    cancel: 'Cancel',
    personal_info: 'Personal Information',
    account_status: 'Account Status',
    confirmed_account: 'Confirmed Account',
    pending_account: 'Pending Account',
    last_update: 'Last Update',
    member_since: 'Member since',

    // Messages
    error_loading_profile: 'Error loading profile',
    error_updating_user: 'Error updating user',
    profile_updated_success: 'Profile updated successfully',
    error_updating: 'Error updating',
    login_success: 'Login successful',
    invalid_credentials: 'Invalid credentials',
    register_success: 'Register successful, please login',
    register_failed: 'Register failed',

    // Dashboard
    total_clients: 'Total Clients',
    active_clients: 'Active Clients',
    total_prospects: 'Total Prospects',
    total_projects: 'Total Projects',
    total_mentors: 'Total Mentors',
    clients_list: 'Clients List',
    prospects_list: 'Prospects List',
    projects_list: 'Projects List',
    mentors_list: 'Mentors List',
    recent_activity: 'Recent Activity',
    statistics: 'Statistics',
    conversion_rate: 'Conversion Rate',
    projects_in_progress: 'Projects in Progress',
    no_recent_activity: 'No Recent Activity',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    hero_subtitle_top: 'Manage your freelancing',
    hero_title_main: 'Master your projects',
    hero_subtitle_bottom: 'With ease',
    try_for_free: 'Try for free',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    // Récupérer la langue depuis localStorage au chargement
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return (translations[language] as Record<string, string>)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
