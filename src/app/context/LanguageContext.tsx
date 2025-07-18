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
    project: 'Projet',
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
    last_updated: 'Dernière mise à jour',
    member_since: 'Membre depuis',

    //Your Subscription
    your_subscription: 'Votre abonnement',
    edit_subscription: 'Modifier mon abonnement',
    trial_subscription: "Version d'essai gratuite",
    no_subscription_found: 'Aucun abonnement',
    subscription_details: "Détails de l'abonnement",
    active_subscription: 'Abonnement actif',
    quick_actions: 'Actions rapides',
    view_all_plans: 'Voir tous les plans',
    back_to_profile: 'Retour au profil',
    need_help: "Besoin d'aide ?",
    contact_support_message:
      "Contactez notre équipe de support pour obtenir de l'aide.",
    contact_support: 'Contacter le support',
    upgrade_plan: 'Mettre à niveau',
    cancel_subscription: "Annuler l'abonnement",
    //Prospects
    new_prospect: 'Nouveau prospect',
    new_prospects_this_month: 'Nouveaux prospects ce mois',
    answers: 'Réponses',
    contacted: 'Contactés',
    list_of_prospects: 'Liste des prospects',
    search_by_name_or_email: 'Rechercher par nom ou email...',
    no_prospects_found: 'Aucun prospect trouvé',
    to_be_contacted: 'À contacter',
    answer: 'Réponse',
    status: 'Statut',
    creation_date: 'Date de création',

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
    plans_associated: 'Plans associés',
    start_free_trial: "Commencer la version d'essai gratuite",
    premium_plan: 'Plan Premium',
    pro_plan: 'Plan Pro',
    pricing_page_title:
      'Choisissez la formule qui propulse votre succès freelance',
    choose_plan: 'Choisir un abonnement',
    per_month: '/mois',
    per_year: '/an',
    save_20_percent: '(économisez 20%)',
    no_features_specified: 'Aucune fonctionnalité spécifiée',
    loading_plans: 'Chargement des plans...',
    no_plans_available: 'Aucun plan disponible',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    billed_yearly: 'Facturé annuellement',
    most_popular: 'Le plus populaire',
    compare_plans: 'Comparer les plans',
    features: 'Fonctionnalités',
    storage: 'Stockage',
    based_newsletters: 'Newsletters de base',
    advanced_newsletters: 'Newsletters avancées',
    personalized_newsletters: 'Newsletters personnalisées',
    priority_support: 'Support prioritaire',
    all_time_support: 'Support 24/7',
    phone_support: 'Support téléphonique',
    email_support: 'Support email',
    personalized_integrations: 'Intégrations personnalisées',
    anticipated_features: 'Accès anticipé aux nouvelles fonctionnalités',
    data_export: 'Export des données',
    advanced_reports: 'Rapports avancés',
    auto_save: 'Sauvegarde automatique',
    max_active_projects: 'Projets actifs',
    max_active_clients: 'Clients actifs',
    max_prospects_active: 'Prospects actifs',
    max_handle_mentors: 'Mentors gérés',
    max_newsletters: 'Newsletters max. par mois',
    free: 'Gratuit',
    starter: 'Starter',
    pro: 'Pro',
    expert: 'Expert',
    your_current_plan: 'Votre plan actuel',
    trial_period: "Période d'essai",
    free_trial_description:
      "Vous avez 30 jours d'essai gratuit pour tester notre application.",
    billing_type: 'Type de facturation',
    trial: 'Essai',
    active: 'Actif',

    // Projects
    new_project: 'Nouveau projet',
    activate_free_plan: 'Activer le plan gratuit',
    free_plan_confirmation_message:
      'Voulez-vous vraiment activer le plan gratuit ?',
    trial_progress_description:
      "Vous pourrez accéder à toutes les fonctionnalités de l'application pendant 30 jours.",
    free_plan_confirmation_message_button: 'Activer le plan gratuit',
    free_plan_confirmation_message_button_cancel: 'Annuler',
    activate_plan: 'Activer le plan',
    cancel_plan: 'Annuler le plan',
    cancel_plan_confirmation_message:
      'Voulez-vous vraiment annuler votre abonnement ?',
    cancel_plan_confirmation_message_description:
      "Vous perdrez accès à toutes les fonctionnalités de l'application.",
    cancel_plan_confirmation_message_button: 'Annuler le plan',

    // Dashboard
    total_clients: 'Total Clients',
    new_clients_this_month: 'Nouveaux clients ce mois',
    dashboard_description:
      'Gérez vos clients, prospects et projets en temps réel avec une interface intuitive et puissante',
    ready_to_transform: 'Prêt à transformer votre gestion de projet ?',
    new_clients: 'Nouveaux clients',
    new_prospects: 'Nouveaux prospects',
    completed_projects: 'Projets terminés',
    active_clients: 'Clients actifs',
    projects_in_progress: 'Projets en cours',
    conversion_rate: 'Taux de conversion',
    total_prospects: 'Total Prospects',
    total_projects: 'Total Projets',
    total_mentors: 'Total Mentors',
    clients_list: 'Liste des clients',
    prospects_list: 'Liste des prospects',
    projects_list: 'projets',
    mentors_list: 'Liste des mentors',
    recent_activity: 'Activité récente',
    statistics: 'Statistiques',
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

    // Table Filters - Mentors
    search_placeholder_mentors: 'Rechercher par nom ou email...',
    status_options_mentors: 'Tous les statuts',
    status_value_mentors: 'Tous les statuts',

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
    all_statuses: 'Tous les statuts',
    no_recent_activity: 'Aucune activité récente',
    all: 'Tous',
    // Clients
    add_client: 'Nouveau client',
    no_client_found: 'Aucun client trouvé',
    name: 'Nom',
    assign_project: 'Assigner un projet',
    search_project: 'Rechercher un projet',
    // 404 Page
    page_not_found: 'Page introuvable',
    page_not_found_description:
      "Désolé, la page que vous recherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou utilisez les boutons ci-dessous pour naviguer.",
    go_home: "Retour à l'accueil",
    go_back: 'Retour en arrière',
    error_code: "Code d'erreur",
    contact_support_if_problem_persists:
      'Si le problème persiste, contactez notre support.',

    // Mentors
    contact_mentor: 'Contacter un mentor',
    available: 'Disponibles',
    sessions: 'Sessions',
    list_of_mentors: 'Liste des mentors',
    list_of_mentors_available_to_implement:
      'Liste des mentors disponibles à implémenter...',
    search_mentor_placeholder: 'Rechercher par nom ou email...',
    no_mentor_found: 'Aucun mentor trouvé',
    first_name: 'Prénom',
    last_name: 'Nom',
    expertises: 'Expertises',
    created_at: 'Créé le',
    updated_at: 'Mis à jour le',

    // Profile
    account_confirmed: 'Compte confirmé',
    account_pending: 'Compte en attente',
    personal_information: 'Informations personnelles',
    add_mentor: 'Nouveau mentor',

    // Payment
    payment_details: 'Détails de paiement',
    card_number: 'Numéro de carte',
    expiry_date: "Date d'expiration",
    pay: 'Payer',
    processing: 'Traitement...',
    card_information: 'Informations de la carte',

    // Usage Progress Bar
    active_projects: 'Projets actifs',
    active_prospects: 'Prospects actifs',
    active_mentors: 'Mentors actifs',
    managed_mentors: 'Mentors gérés',
    usage_progress_bar_description: 'Vous voulez augmenter vos limites ?',
    upgrade_now: 'Mettre à niveau',

    // Free Plan Limits
    free_plan_trial: 'Plan gratuit - Essai de 30 jours',
    trial_days_remaining: 'Jours restants',
    trial_expired: 'Essai expiré',
    trial_progress: "Progression de l'essai",
    trial_expired_description: "Votre période d'essai a expiré",
    trial_expired_title: "Période d'essai expirée",
    trial_expired_message:
      "Votre période d'essai gratuit de 30 jours a expiré. Pour continuer à utiliser l'application, veuillez choisir un plan.",
    choose_plan_to_continue: 'Choisissez un plan pour continuer',
    select_plan: 'Sélectionner ce plan',
    go_to_pricing: 'Aller aux tarifs',
    redirecting: 'Redirection...',
    checking_subscription: 'Vérification de votre abonnement...',
    days: 'jours',
    remaining: 'restants',
    started_at: 'Commencée le',

    // Support Options
    eclipse_chatbot_support: 'Assistant Eclipse',
    eclipse_chatbot_support_description: 'Assistant IA Eclipse disponible 24/7',
    email_support_description: 'Réponse sous 24h',
    phone_support_description: 'Support direct par téléphone',
    priority_phone_support: 'Support Téléphonique Prioritaire',
    priority_phone_support_description: 'Support prioritaire 24/7',
    priority_email_support: 'Support Email Prioritaire',
    priority_email_support_description: 'Réponse prioritaire sous 4h',

    // Upgrade Dropdown
    choose_upgrade_plan: 'Choisir un plan de mise à niveau',
    current_plan: 'Plan actuel',
    upgrade_to: 'Mettre à niveau vers',
    no_upgrade_available: 'Aucune mise à niveau disponible',

    // Newsletters
    add_newsletter: 'Nouvelle newsletter',
    total_newsletters: 'Total des newsletters',
    no_newsletter_found: 'Aucune newsletter trouvée',
    sent: 'Envoyées',
    open_rate: "Taux d'ouverture",
    newsletters_list: 'Liste des newsletters',
    newsletters_list_description:
      'Liste des newsletters envoyées à implémenter...',

    // Clients
    invoices: 'Factures',
    no_invoice_found: 'Aucune facture trouvée.',
    number: 'Téléphone',
    amount: 'Montant',
    revenue: "Chiffre d'affaires",
    enterprise: 'Entreprise',
    address: 'Adresse',
    website: 'Site web',
    process_status: 'Statut du processus',
    is_active: 'Actif',
    edit: 'Modifier',
    your_enterprise: 'Votre entreprise',
    edit_enterprise: 'Modifier votre entreprise',
    // Revenue
    top_project: 'Projet le plus rentable',
    top_client: 'Client le plus rentable',
    average_invoice: 'Moyenne des factures',
    due_date: "Date d'échéance",
    view_invoice: 'Voir la facture',
    add_invoice: 'Créer une facture',
    // Factures
    select_project: 'Sélectionner un projet',
    search_placeholder_factures:
      'Rechercher par référence, client ou projet...',
    select_client: 'Sélectionner un client',
    total_invoices: 'Nombre de factures',
    active_factures: 'Factures payées',
    new_factures_this_month: 'Nouvelles factures ce mois',
    download: 'Télécharger',
    invoice_pdf: 'Facture PDF',
    target_revenue: "Chiffre d'affaires cible",
    progress_to_target: "Progression vers le chiffre d'affaires cible",
    no_project: 'Sans projet',
    reference: 'Référence',
    currency: 'Devise',
    description: 'Description',
    note: 'Note',
    date: 'Date',
    date_due: "Date d'échéance",
    facture_status: 'Statut de la facture',
    paid: 'Payé',
    pending: 'En attente',
    draft: 'Brouillon',
    send_email: 'Envoyer un email',
    print: 'Imprimer',
    delete: 'Supprimer',
    invoice_details: 'Détails de la facture',
    services: 'Prestations',
    calculations: 'Calculs',
    subtotal: 'Sous-total',
    total_ttc: 'Total TTC',
    notes: 'Notes',
    client: 'Client',
    unit_price: 'Prix unitaire',
    total: 'Total',
    add_line: 'Ajouter une ligne',
    quantity: 'Quantité',
    emission_date: "Date d'émission",
    overdue: 'En retard',

    // Enterprise

    create_your_enterprise: 'Créer votre entreprise',
    enterprise_name: "Nom de l'entreprise",
    enterprise_email: "Email de l'entreprise",
    enterprise_description: "Description de l'entreprise",
    siret: 'Numéro SIRET',
    siren: 'Numéro SIREN',
    vat: 'Numéro de TVA',
    vat_applicable: 'TVA applicable',
    phone_number: 'Téléphone',
    activity_domain: "Domaine d'activité",
    select_activity_domain: 'Sélectionner un domaine',
    no_enterprise_profile: "Vous n'avez pas encore de profil d'entreprise.",
    create: 'Créer',
    create_facture: 'Créer une facture',
    add: 'ajouter',
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
    project: 'Project',
    mentors: 'Mentors',
    newsletters: 'Newsletters',
    profile: 'Profile',
    logout: 'Logout',
    back: 'Back',
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
    last_updated: 'Last Updated',
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
    plans_associated: 'Plans associated',
    features_details: 'Features Details',
    features_details_description: 'Features Details Description',
    start_free_trial: 'Start Free Trial',
    premium_plan: 'Premium Plan',
    pro_plan: 'Pro Plan',
    pricing_page_title: 'Choose the Plan that Powers Your Freelance Success',
    choose_plan: 'Choose a plan',
    per_month: '/month',
    per_year: '/year',
    save_20_percent: '(save 20%)',
    no_features_specified: 'No features specified',
    loading_plans: 'Loading plans...',
    no_plans_available: 'No plans available',
    monthly: 'Monthly',
    yearly: 'Yearly',
    billed_yearly: 'Billed yearly',
    most_popular: 'Most Popular',
    compare_plans: 'Compare Plans',
    features: 'Features',
    storage: 'Storage',
    based_newsletters: 'Based Newsletters',
    advanced_newsletters: 'Advanced Newsletters',
    personalized_newsletters: 'Personalized Newsletters',
    priority_support: 'Priority Support',
    all_time_support: 'All Time Support',
    phone_support: 'Phone Support',
    email_support: 'Email Support',
    personalized_integrations: 'Personalized Integrations',
    anticipated_features: 'Anticipated Features',
    data_export: 'Data Export',
    advanced_reports: 'Advanced Reports',
    auto_save: 'Auto Save',
    max_active_projects: 'Max Active Projects',
    max_active_clients: 'Max Active Clients',
    max_prospects_active: 'Max Prospects Active',
    max_handle_mentors: 'Max Handle Mentors',
    max_newsletters: 'Max Newsletters per month',
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    expert: 'Expert',
    your_current_plan: 'Your Current Plan',
    trial_period: 'Trial Period',
    free_trial_description: 'You have a 30-day free trial to test our app.',
    billing_type: 'Billing Type',
    trial: 'Trial',
    active: 'Active',
    create: 'Create',
    // Dashboard
    total_clients: 'Total Clients',
    new_clients_this_month: 'Nouveaux clients ce mois',
    new_prospects_this_month: 'New Prospects This Month',
    completed_projects: 'Completed Projects',
    total_prospects: 'Total Prospects',
    total_projects: 'Total Projects',
    total_mentors: 'Total Mentors',
    clients_list: 'Clients List',
    prospects_list: 'Prospects List',
    projects_list: 'projects',
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

    // Mentors
    contact_mentor: 'Contact a mentor',
    available: 'Available',
    sessions: 'Sessions',
    list_of_mentors: 'List of Mentors',
    list_of_mentors_available_to_implement:
      'List of Mentors Available to Implement',
    search_mentor_placeholder: 'Search by name or email...',
    no_mentor_found: 'No mentor found',
    first_name: 'First Name',
    last_name: 'Last Name',
    expertises: 'Expertises',
    created_at: 'Created At',
    updated_at: 'Updated At',
    actions: 'Actions',

    // Profile
    account_confirmed: 'Account Confirmed',
    account_pending: 'Account Pending',
    personal_information: 'Personal Information',
    add_mentor: 'Add Mentor',

    // Newsletters
    add_newsletter: 'Add Newsletter',
    total_newsletters: 'Total Newsletters',
    search_placeholder_newsletters: 'Search by title or status...',
    no_newsletter_found: 'No newsletter found',
    sent: 'Sent',
    open_rate: 'Open Rate',
    newsletter_list: 'Newsletter List',
    newsletter_list_description: 'Newsletter List Description',

    // Table Filters - Newsletters
    status_options_newsletters: 'Tous les statuts',
    status_value_newsletters: 'Tous les statuts',

    // Payment
    payment_details: 'Payment Details',
    card_number: 'Card Number',
    expiry_date: 'Expiry Date',
    pay: 'Pay',
    processing: 'Processing...',
    card_information: 'Card Information',
    // Prospects
    new_prospect: 'New Prospect',
    answers: 'Answers',
    contacted: 'Contacted',
    list_of_prospects: 'List of Prospects',
    search_by_name_or_email: 'Search by name or email...',
    no_prospects_found: 'No prospects found',
    to_be_contacted: 'To be contacted',
    answer: 'Answer',
    status: 'Status',
    creation_date: 'Creation Date',

    //Your Subscription
    your_subscription: 'Your subscription',
    edit_subscription: 'Edit subscription',
    trial_subscription: 'Free trial',
    no_subscription_found: 'No subscription found',
    subscription_details: 'Subscription Details',
    active_subscription: 'Active Subscription',
    quick_actions: 'Quick Actions',
    view_all_plans: 'View All Plans',
    back_to_profile: 'Back to Profile',
    need_help: 'Need Help?',
    contact_support_message: 'Contact our support team for assistance.',
    contact_support: 'Contact Support',
    upgrade_plan: 'Upgrade Plan',
    cancel_subscription: 'Cancel Subscription',
    // Usage Progress Bar
    active_projects: 'Active Projects',
    active_clients: 'Active Clients',
    active_prospects: 'Active Prospects',
    active_mentors: 'Active Mentors',
    managed_mentors: 'Managed Mentors',
    usage_progress_bar_description: 'You want to increase your limits?',
    upgrade_now: 'Upgrade now',

    // Free Plan Limits
    free_plan_trial: 'Free Plan - 30 Day Trial',
    trial_days_remaining: 'Days remaining',
    trial_expired: 'Trial expired',
    trial_progress: 'Trial progress',
    trial_progress_description: 'Your trial period is progressing',
    trial_expired_description: 'Your trial period has expired',
    trial_expired_title: 'Trial Period Expired',
    trial_expired_message:
      'Your 30-day free trial has expired. To continue using the application, please choose a plan.',
    choose_plan_to_continue: 'Choose a plan to continue',
    select_plan: 'Select this plan',
    go_to_pricing: 'Go to pricing',
    redirecting: 'Redirecting...',
    checking_subscription: 'Checking your subscription...',
    days: 'days',
    remaining: 'remaining',
    started_at: 'Started at',
    // Support Options
    chatbot_support: 'Chatbot Support',
    chatbot_support_description: 'AI assistant available 24/7',
    phone_support_description: 'Direct phone support',
    priority_phone_support: 'Priority Phone Support',
    priority_phone_support_description: 'Priority support 24/7',
    priority_email_support: 'Priority Email Support',
    priority_email_support_description: 'Priority response within 4h',

    // Upgrade Dropdown
    choose_upgrade_plan: 'Choose upgrade plan',
    current_plan: 'Current plan',
    upgrade_to: 'Upgrade to',
    no_upgrade_available: 'No upgrade available',
    // Common
    add: 'add',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    hero_subtitle_top: 'Manage your freelancing',
    hero_title_main: 'Master your projects',
    hero_subtitle_bottom: 'With ease',
    try_for_free: 'Try for free',
    all_statuses: 'All statuses',
    all: 'All',
    // Clients
    add_client: 'Add Client',
    search_placeholder_clients: 'Search by name, email or company...',
    status_options_clients: 'All statuses',
    status_value_clients: 'All statuses',
    no_client_found: 'No client found',
    name: 'Name',
    assign_project: 'Assign Project',
    search_project: 'Search Project',
    // 404 Page
    page_not_found: 'Page Not Found',
    page_not_found_description:
      'Sorry, the page you are looking for does not exist or has been moved. Check the URL or use the buttons below to navigate.',
    go_home: 'Go Home',
    go_back: 'Go Back',
    error_code: 'Error Code',
    contact_support_if_problem_persists:
      'If the problem persists, contact our support.',

    // Eclipse Chatbot
    eclipse_chatbot_support: 'Eclipse Chatbot Support',
    eclipse_chatbot_support_description: 'AI assistant available 24/7',

    // Clients
    invoices: 'Invoices',
    no_invoice_found: 'No invoice found.',
    number: 'Phone',
    amount: 'Amount',
    revenue: 'Revenue',
    enterprise: 'Enterprise',
    address: 'Address',
    website: 'Website',
    process_status: 'Process Status',
    is_active: 'Active',
    edit: 'Edit',
    your_enterprise: 'Your Enterprise',
    edit_enterprise: 'Edit your enterprise',
    // Factures
    select_project: 'Select Project',
    search_placeholder_factures: 'Search by reference, client or project...',
    select_client: 'Select Client',
    total_invoices: 'Number of invoices',
    active_factures: 'Paid invoices',
    new_factures_this_month: 'New invoices this month',
    download: 'Download',
    invoice_pdf: 'Invoice PDF',
    add_invoice: 'Add Invoice',
    add_line: 'Add Line',
    quantity: 'Quantity',
    vat_applicable: 'VAT applicable',
    overdue: 'Overdue',
    create_facture: 'Create Facture',
    // Revenue
    top_project: 'Top Project',
    top_client: 'Top Client',
    average_invoice: 'Average Invoice',
    due_date: 'Due Date',
    view_invoice: 'View Invoice',
    target_revenue: 'Target Revenue',
    progress_to_target: 'Progress to target revenue',
    no_project: 'No project',
    reference: 'Reference',
    currency: 'Currency',
    description: 'Description',
    note: 'Note',
    date: 'Date',
    date_due: 'Due Date',
    draft: 'Draft',
    send_email: 'Send Email',
    print: 'Print',
    delete: 'Delete',
    invoice_details: 'Invoice Details',
    calculations: 'Calculations',
    subtotal: 'Subtotal',
    vat: 'VAT',
    total_ttc: 'Total TTC',
    notes: 'Notes',
    client: 'Client',
    unit_price: 'Unit Price',
    total: 'Total',
    emission_date: 'Emission Date',
    paid: 'Paid',
    pending: 'Pending',
    phone: 'Phone',
    siret: 'SIRET',
    siren: 'SIREN',
    services: 'Services',
    // Enterprise
    create_your_enterprise: 'Create your enterprise',
    enterprise_name: 'Enterprise Name',
    enterprise_email: 'Enterprise Email',
    enterprise_description: 'Enterprise Description',
    phone_number: 'Phone Number',
    activity_domain: 'Activity Domain',
    select_activity_domain: 'Select Activity Domain',
    no_enterprise_profile: "You don't have an enterprise profile yet.",
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
