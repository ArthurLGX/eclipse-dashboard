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
    go_to_offers: 'Voir les offres',
    reset_password: 'Réinitialiser le mot de passe',
    dashboard: 'Tableau de bord',
    clients: 'Clients',
    prospects: 'Prospects',
    projects: 'Projets',
    mentors: 'Mentors',
    newsletters: 'Newsletters',
    profile: 'Profil',
    logout: 'Déconnexion',
    back: 'Retour',
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

    //Pricing_Page
    start_free_trial: "Commencer la version d'essai gratuite",
    premium_plan: 'Plan Premium',
    pro_plan: 'Plan Pro',
    pricing_page_title:
      'Choisissez la formule qui propulse votre succès freelance',
    choose_plan: 'Choisir ce plan',
    per_month: '/mois',
    per_year: '/an',
    save_20_percent: '(économisez 20%)',
    no_features_specified: 'Aucune fonctionnalité spécifiée',
    loading_plans: 'Chargement des plans...',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    billed_yearly: 'Facturé annuellement',
    most_popular: 'Le plus populaire',
    // Dashboard
    total_clients: 'Total Clients',
    new_clients_this_month: 'Nouveaux ce mois',
    new_prospects_this_month: 'Nouveaux prospects ce mois',
    completed_projects: 'Projets terminés',
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
    new_project: 'Nouveau projet',
    in_progress: 'En cours',
    completed: 'Terminés',
    search_project_placeholder: 'Rechercher par nom, client ou mentor...',
    no_project_found: 'Aucun projet trouvé',

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

    // Clients
    add_client: 'Ajouter un client',
    active_clients: 'Clients Actifs',
    no_client_found: 'Aucun client trouvé',

    // 404 Page
    page_not_found: 'Page introuvable',
    page_not_found_description:
      "Désolé, la page que vous recherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou utilisez les boutons ci-dessous pour naviguer.",
    go_home: "Retour à l'accueil",
    go_back: 'Retour en arrière',
    error_code: "Code d'erreur",
    contact_support_if_problem_persists:
      'Si le problème persiste, contactez notre support.',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    about: 'About',
    pricing: 'Pricing',
    contact: 'Contact',
    login: 'Login',
    register: 'Register',
    go_to_offers: 'Go to offers',
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
    back: 'Back',

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

    //Pricing_Page

    start_free_trial: 'Start Free Trial',
    premium_plan: 'Premium Plan',
    pro_plan: 'Pro Plan',
    pricing_page_title: 'Choose the Plan that Powers Your Freelance Success',
    choose_plan: 'Choose this plan',
    per_month: '/month',
    per_year: '/year',
    save_20_percent: '(save 20%)',
    no_features_specified: 'No features specified',
    loading_plans: 'Loading plans...',
    monthly: 'Monthly',
    yearly: 'Yearly',
    billed_yearly: 'Billed yearly',
    most_popular: 'Most Popular',
    // Dashboard
    total_clients: 'Total Clients',
    active_clients: 'Active Clients',
    new_clients_this_month: 'New Clients This Month',
    new_prospects_this_month: 'New Prospects This Month',
    completed_projects: 'Completed Projects',
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
    new_project: 'New Project',
    in_progress: 'In Progress',
    completed: 'Completed',
    search_project_placeholder: 'Search by name, client or mentor...',
    no_project_found: 'No project found',

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

    // Clients
    add_client: 'Add Client',
    search_placeholder_clients: 'Search by name, email or company...',
    status_options_clients: 'All statuses',
    status_value_clients: 'All statuses',
    no_client_found: 'No client found',

    // 404 Page
    page_not_found: 'Page Not Found',
    page_not_found_description:
      'Sorry, the page you are looking for does not exist or has been moved. Check the URL or use the buttons below to navigate.',
    go_home: 'Go Home',
    go_back: 'Go Back',
    error_code: 'Error Code',
    contact_support_if_problem_persists:
      'If the problem persists, contact our support.',
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
