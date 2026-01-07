'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useSidebar, CONFIGURABLE_LINKS, SidebarLinkId } from '@/app/context/SidebarContext';
import { usePreferences, DateFormat, Currency, NotificationFrequency } from '@/app/context/PreferencesContext';
import { useUserPreferences } from '@/app/context/UserPreferencesContext';
import { motion } from 'framer-motion';
import { 
  IconSun, 
  IconMoon, 
  IconDeviceDesktop,
  IconChartLine,
  IconUsers,
  IconMagnet,
  IconBuilding,
  IconBrain,
  IconMail,
  IconRefresh,
  IconBell,
  IconCalendar,
  IconFileInvoice,
  IconPhoto,
  IconSettings,
  IconActivity,
  IconUsersGroup,
  IconBriefcase,
  IconFolder,
  IconUserCog,
  IconPuzzle,
  IconCheck,
  IconPlugConnected,
  IconChevronRight,
} from '@tabler/icons-react';
import SmtpConfigSection from '@/app/components/SmtpConfigSection';
import EmailSignatureSection from '@/app/components/EmailSignatureSection';
import { BusinessTypeSelector, ModuleSelector } from '@/app/components/BusinessTypeSelector';
import { BusinessType, getDefaultModules } from '@/config/business-modules';
import { usePopup } from '@/app/context/PopupContext';
import Link from 'next/link';

type SettingsTab = 'appearance' | 'notifications' | 'format' | 'invoice' | 'sidebar' | 'email' | 'modules' | 'integrations';

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { visibleLinks, toggleLink, resetToDefault } = useSidebar();
  const { preferences, updateNotifications, updateInvoice, updateFormat } = usePreferences();
  const { 
    businessType, 
    enabledModules, 
    updateBusinessType, 
    updateEnabledModules,
    loading: loadingPrefs 
  } = useUserPreferences();
  const { showGlobalPopup } = usePopup();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [localBusinessType, setLocalBusinessType] = useState<BusinessType | null>(null);
  const [localModules, setLocalModules] = useState<string[]>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);
  
  // Initialiser les valeurs locales depuis les préférences
  useEffect(() => {
    if (!loadingPrefs) {
      setLocalBusinessType(businessType);
      setLocalModules(enabledModules);
    }
  }, [businessType, enabledModules, loadingPrefs]);
  
  // Set active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['appearance', 'notifications', 'format', 'invoice', 'email', 'sidebar', 'modules', 'integrations'].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [searchParams]);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: t('appearance') || 'Apparence', icon: <IconSun className="w-4 h-4" /> },
    { id: 'modules', label: t('modules') || 'Modules', icon: <IconPuzzle className="w-4 h-4" /> },
    { id: 'integrations', label: t('integrations') || 'Intégrations', icon: <IconPlugConnected className="w-4 h-4" /> },
    { id: 'notifications', label: t('notifications') || 'Notifications', icon: <IconBell className="w-4 h-4" /> },
    { id: 'format', label: t('format') || 'Format', icon: <IconCalendar className="w-4 h-4" /> },
    { id: 'invoice', label: t('invoicing') || 'Facturation', icon: <IconFileInvoice className="w-4 h-4" /> },
    { id: 'email', label: t('email_config') || 'Email', icon: <IconMail className="w-4 h-4" /> },
    { id: 'sidebar', label: t('navigation') || 'Navigation', icon: <IconBuilding className="w-4 h-4" /> },
  ];
  
  // Handlers pour les modules
  const handleBusinessTypeChange = (type: BusinessType) => {
    setLocalBusinessType(type);
    // Mettre à jour les modules par défaut pour ce type
    setLocalModules(getDefaultModules(type));
  };
  
  const handleToggleModule = (moduleId: string) => {
    setLocalModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };
  
  const handleSaveModules = async () => {
    if (!localBusinessType) return;
    
    setIsSavingModules(true);
    try {
      await updateBusinessType(localBusinessType);
      await updateEnabledModules(localModules);
      showGlobalPopup(t('modules_saved') || 'Préférences enregistrées avec succès !', 'success');
    } catch (error) {
      console.error('Error saving modules:', error);
      showGlobalPopup(t('modules_save_error') || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setIsSavingModules(false);
    }
  };
  
  const hasModulesChanges = localBusinessType !== businessType || 
    JSON.stringify(localModules.sort()) !== JSON.stringify(enabledModules.sort());

  // Organisation des liens par catégories
  const sidebarCategories: { 
    id: string; 
    label: string; 
    icon: React.ReactNode;
    links: { id: SidebarLinkId; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      id: 'category_activity',
      label: t('category_activity') || 'Activité',
      icon: <IconActivity className="w-4 h-4" />,
      links: [
        { id: 'revenue', label: t('revenue') || 'Statistiques & Factures', icon: <IconChartLine className="w-4 h-4" /> },
      ],
    },
    {
      id: 'category_relations',
      label: t('category_relations') || 'Relations',
      icon: <IconUsersGroup className="w-4 h-4" />,
      links: [
        { id: 'clients', label: t('clients') || 'Clients', icon: <IconUsers className="w-4 h-4" /> },
        { id: 'prospects', label: t('prospects') || 'Prospects', icon: <IconMagnet className="w-4 h-4" /> },
        { id: 'mentors', label: t('mentors') || 'Mentors', icon: <IconBrain className="w-4 h-4" /> },
      ],
    },
    {
      id: 'category_management',
      label: t('category_management') || 'Gestion',
      icon: <IconBriefcase className="w-4 h-4" />,
      links: [
        { id: 'projects', label: t('projects') || 'Projets', icon: <IconBuilding className="w-4 h-4" /> },
        { id: 'newsletters', label: t('newsletters') || 'Newsletters', icon: <IconMail className="w-4 h-4" /> },
        { id: 'emails', label: t('emails') || 'Emails', icon: <IconMail className="w-4 h-4" /> },
      ],
    },
    {
      id: 'category_resources',
      label: t('category_resources') || 'Ressources',
      icon: <IconFolder className="w-4 h-4" />,
      links: [
        { id: 'media_library', label: t('media_library') || 'Bibliothèque', icon: <IconPhoto className="w-4 h-4" /> },
      ],
    },
    {
      id: 'category_account',
      label: t('category_account') || 'Compte',
      icon: <IconUserCog className="w-4 h-4" />,
      links: [
        { id: 'settings', label: t('settings') || 'Paramètres', icon: <IconSettings className="w-4 h-4" /> },
      ],
    },
  ];

  const dateFormats: { value: DateFormat; label: string; example: string }[] = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  ];

  const currencies: { value: Currency; label: string; symbol: string }[] = [
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'USD', label: 'Dollar US', symbol: '$' },
    { value: 'GBP', label: 'Livre Sterling', symbol: '£' },
    { value: 'CHF', label: 'Franc Suisse', symbol: 'CHF' },
  ];

  const frequencies: { value: NotificationFrequency; label: string }[] = [
    { value: 'instant', label: t('instant') || 'Instantané' },
    { value: 'daily', label: t('daily') || 'Quotidien' },
    { value: 'weekly', label: t('weekly') || 'Hebdomadaire' },
    { value: 'never', label: t('never') || 'Jamais' },
  ];

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-secondary group-hover:text-primary transition-colors">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-7xl mx-auto pb-16"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">
          {t('settings') || 'Paramètres'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {t('settings_description') || 'Gérez vos préférences et personnalisez votre expérience'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-default">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-accent text-accent-text'
                : 'bg-muted text-secondary hover:text-primary hover:bg-hover'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* APPARENCE */}
        {activeTab === 'appearance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SettingsRow 
              title={t('theme') || 'Thème'} 
              description={t('appearance_desc') || 'Choisissez le mode d\'affichage'}
            >
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'light', icon: <IconSun className="w-4 h-4" />, label: t('theme_light') || 'Clair' },
                  { value: 'dark', icon: <IconMoon className="w-4 h-4" />, label: t('theme_dark') || 'Sombre' },
                  { value: 'system', icon: <IconDeviceDesktop className="w-4 h-4" />, label: t('theme_system') || 'Système' },
                ].map((opt) => (
                  <OptionButton key={opt.value} selected={theme === opt.value} onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}>
                    {opt.icon} {opt.label}
                  </OptionButton>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">
                {t('current_theme') || 'Actuel'}: {resolvedTheme === 'dark' ? (t('theme_dark') || 'Sombre') : (t('theme_light') || 'Clair')}
              </p>
            </SettingsRow>

            <SettingsRow title={t('language') || 'Langue'} description={t('language_desc') || 'Langue de l\'interface'}>
              <div className="flex gap-2">
                <OptionButton selected={language === 'fr'} onClick={() => setLanguage('fr')}>🇫🇷 Français</OptionButton>
                <OptionButton selected={language === 'en'} onClick={() => setLanguage('en')}>🇬🇧 English</OptionButton>
              </div>
            </SettingsRow>
          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SettingsRow 
              title={t('email_notifications') || 'Notifications email'} 
              description={t('email_notifications_desc') || 'Choisissez les emails que vous souhaitez recevoir'}
            >
              <div className="space-y-3 w-full max-w-md">
                <Toggle 
                  checked={preferences.notifications.emailNewProject} 
                  onChange={(v) => updateNotifications({ emailNewProject: v })}
                  label={t('notif_new_project') || 'Nouveau projet'}
                />
                <Toggle 
                  checked={preferences.notifications.emailNewInvoice} 
                  onChange={(v) => updateNotifications({ emailNewInvoice: v })}
                  label={t('notif_new_invoice') || 'Nouvelle facture créée'}
                />
                <Toggle 
                  checked={preferences.notifications.emailInvoicePaid} 
                  onChange={(v) => updateNotifications({ emailInvoicePaid: v })}
                  label={t('notif_invoice_paid') || 'Facture payée'}
                />
                <Toggle 
                  checked={preferences.notifications.emailCollaboration} 
                  onChange={(v) => updateNotifications({ emailCollaboration: v })}
                  label={t('notif_collaboration') || 'Invitation de collaboration'}
                />
                <Toggle 
                  checked={preferences.notifications.emailNewsletter} 
                  onChange={(v) => updateNotifications({ emailNewsletter: v })}
                  label={t('notif_newsletter') || 'Newsletter et actualités'}
                />
              </div>
            </SettingsRow>

            <SettingsRow 
              title={t('notification_frequency') || 'Fréquence'} 
              description={t('notification_frequency_desc') || 'À quelle fréquence recevoir les emails'}
            >
              <div className="flex flex-wrap gap-2">
                {frequencies.map((freq) => (
                  <OptionButton 
                    key={freq.value} 
                    selected={preferences.notifications.frequency === freq.value}
                    onClick={() => updateNotifications({ frequency: freq.value })}
                  >
                    {freq.label}
                  </OptionButton>
                ))}
              </div>
            </SettingsRow>
          </motion.div>
        )}

        {/* FORMAT */}
        {activeTab === 'format' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SettingsRow 
              title={t('date_format') || 'Format de date'} 
              description={t('date_format_desc') || 'Comment afficher les dates'}
            >
              <div className="flex flex-wrap gap-2">
                {dateFormats.map((fmt) => (
                  <OptionButton 
                    key={fmt.value} 
                    selected={preferences.format.dateFormat === fmt.value}
                    onClick={() => updateFormat({ dateFormat: fmt.value })}
                  >
                    <span>{fmt.label}</span>
                    <span className="text-muted text-xs ml-1">({fmt.example})</span>
                  </OptionButton>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow 
              title={t('currency') || 'Devise'} 
              description={t('currency_desc') || 'Devise par défaut pour les montants'}
            >
              <div className="flex flex-wrap gap-2">
                {currencies.map((cur) => (
                  <OptionButton 
                    key={cur.value} 
                    selected={preferences.format.currency === cur.value}
                    onClick={() => updateFormat({ currency: cur.value })}
                  >
                    <span className="font-mono">{cur.symbol}</span>
                    <span className="ml-1">{cur.label}</span>
                  </OptionButton>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow 
              title={t('timezone') || 'Fuseau horaire'} 
              description={t('timezone_desc') || 'Votre fuseau horaire actuel'}
            >
              <p className="text-sm text-primary bg-muted px-3 py-2 rounded-lg inline-block">
                🌍 {preferences.format.timezone}
              </p>
            </SettingsRow>
          </motion.div>
        )}

        {/* FACTURATION */}
        {activeTab === 'invoice' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SettingsRow 
              title={t('payment_delay') || 'Délai de paiement'} 
              description={t('payment_delay_desc') || 'Délai par défaut sur les nouvelles factures'}
            >
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 45, 60].map((days) => (
                  <OptionButton 
                    key={days} 
                    selected={preferences.invoice.defaultPaymentDays === days}
                    onClick={() => updateInvoice({ defaultPaymentDays: days })}
                  >
                    {days} {t('days') || 'jours'}
                  </OptionButton>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow 
              title={t('default_tax_rate') || 'Taux de TVA par défaut'} 
              description={t('default_tax_rate_desc') || 'TVA appliquée automatiquement'}
            >
              <div className="flex flex-wrap gap-2">
                {[0, 5.5, 10, 20].map((rate) => (
                  <OptionButton 
                    key={rate} 
                    selected={preferences.invoice.defaultTaxRate === rate}
                    onClick={() => updateInvoice({ defaultTaxRate: rate })}
                  >
                    {rate}%
                  </OptionButton>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow 
              title={t('invoice_prefix') || 'Préfixe de numérotation'} 
              description={t('invoice_prefix_desc') || 'Préfixe des numéros de facture'}
            >
              <input
                type="text"
                value={preferences.invoice.invoicePrefix}
                onChange={(e) => updateInvoice({ invoicePrefix: e.target.value })}
                className="input px-3 py-2 text-sm w-32"
                placeholder="FAC-"
              />
              <p className="text-xs text-muted mt-1">
                {t('example') || 'Exemple'}: {preferences.invoice.invoicePrefix}001
              </p>
            </SettingsRow>

            <SettingsRow 
              title={t('auto_numbering') || 'Numérotation automatique'} 
              description={t('auto_numbering_desc') || 'Générer automatiquement les numéros'}
            >
              <Toggle 
                checked={preferences.invoice.autoNumbering} 
                onChange={(v) => updateInvoice({ autoNumbering: v })}
                label={preferences.invoice.autoNumbering ? (t('enabled') || 'Activé') : (t('disabled') || 'Désactivé')}
              />
            </SettingsRow>

            <SettingsRow 
              title={t('legal_mentions') || 'Mentions légales'} 
              description={t('legal_mentions_desc') || 'Texte affiché en bas des factures'}
            >
              <textarea
                value={preferences.invoice.legalMentions}
                onChange={(e) => updateInvoice({ legalMentions: e.target.value })}
                className="input w-full px-3 py-2 text-sm resize-y"
                rows={6}
                placeholder={t('legal_mentions_placeholder') || 'Ex: TVA non applicable, art. 293 B du CGI...'}
              />
            </SettingsRow>
          </motion.div>
        )}

        {/* EMAIL / SMTP */}
        {activeTab === 'email' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SmtpConfigSection />
            <EmailSignatureSection />
          </motion.div>
        )}

        {/* MODULES */}
        {activeTab === 'modules' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {loadingPrefs ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Section : Type de métier */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {t('your_business') || 'Votre métier'}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {t('business_type_desc') || 'Nous adapterons votre interface en conséquence'}
                    </p>
                  </div>
                  <BusinessTypeSelector
                    selectedType={localBusinessType}
                    onSelect={handleBusinessTypeChange}
                  />
                </div>

                {/* Section : Modules activés */}
                {localBusinessType && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">
                        {t('enabled_modules') || 'Modules activés'}
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {t('modules_desc') || 'Sélectionnez les fonctionnalités que vous souhaitez utiliser'}
                      </p>
                    </div>
                    <ModuleSelector
                      businessType={localBusinessType}
                      selectedModules={localModules}
                      onToggle={handleToggleModule}
                    />
                  </div>
                )}

                {/* Bouton de sauvegarde */}
                {hasModulesChanges && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-end gap-4 pt-4 border-t border-default"
                  >
                    <button
                      onClick={() => {
                        setLocalBusinessType(businessType);
                        setLocalModules(enabledModules);
                      }}
                      className="btn-ghost px-4 py-2"
                    >
                      {t('cancel') || 'Annuler'}
                    </button>
                    <button
                      onClick={handleSaveModules}
                      disabled={isSavingModules}
                      className="btn-primary px-6 py-2 flex items-center gap-2 rounded-lg"
                    >
                      {isSavingModules ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <IconCheck className="w-4 h-4" />
                      )}
                      {t('save_changes') || 'Enregistrer'}
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* NAVIGATION / SIDEBAR */}
        {activeTab === 'sidebar' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SettingsRow 
              title={t('visible_links') || 'Liens visibles'} 
              description={t('sidebar_management_desc') || 'Sélectionnez les éléments à afficher dans la sidebar'}
            >
              <div className="space-y-4">
                {sidebarCategories.map((category) => (
                  <div key={category.id} className="space-y-2">
                    {/* Titre de catégorie */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                      {category.icon}
                      <span>{category.label}</span>
                    </div>
                    {/* Liens de la catégorie */}
                    <div className="flex flex-wrap gap-2 ml-6">
                      {category.links.map((link) => {
                        const isVisible = visibleLinks.includes(link.id);
                        return (
                          <OptionButton key={link.id} selected={isVisible} onClick={() => toggleLink(link.id)}>
                            {link.icon} {link.label}
                          </OptionButton>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-4">
                {visibleLinks.length}/{CONFIGURABLE_LINKS.length} {t('links_visible') || 'liens affichés'}
              </p>
            </SettingsRow>

            <SettingsRow title={t('reset') || 'Réinitialiser'} description={t('reset_desc') || 'Restaurer les valeurs par défaut'}>
              <button
                onClick={resetToDefault}
                className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
              >
                <IconRefresh className="w-4 h-4" />
                {t('reset_sidebar') || 'Afficher tous les liens'}
              </button>
            </SettingsRow>
          </motion.div>
        )}

        {/* INTÉGRATIONS */}
        {activeTab === 'integrations' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-sm text-muted mb-4">
              {t('integrations_desc') || 'Connectez des services externes pour automatiser votre workflow.'}
            </div>
            
            {/* Fathom AI */}
            <Link
              href="/dashboard/settings/meeting-integrations"
              className="block p-4 rounded-xl border border-default hover:border-accent/50 hover:bg-accent/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-default">
                  <Image
                    src="https://icons.duckduckgo.com/ip3/fathom.video.ico"
                    alt="Fathom AI"
                    width={32}
                    height={32}
                    className="rounded"
                    unoptimized
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary group-hover:text-accent transition-colors">
                    Fathom AI
                  </h3>
                  <p className="text-sm text-muted">
                    {t('fathom_integration_desc') || 'Notes de réunion automatiques - Transcriptions, résumés et actions'}
                  </p>
                </div>
                <IconChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
              </div>
            </Link>

            {/* Future integrations placeholder */}
            <div className="p-4 rounded-xl border border-dashed border-default text-center">
              <p className="text-sm text-muted">
                {t('more_integrations_soon') || 'D\'autres intégrations arrivent bientôt...'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Footer info */}
        <div className="pt-4 border-t border-default text-xs text-muted flex items-center gap-2">
          <span className="text-info">💡</span>
          {t('settings_saved_locally') || 'Vos préférences sont enregistrées automatiquement.'}
        </div>
      </div>
    </motion.div>
  );
}

// Composant réutilisable pour une ligne de paramètre
function SettingsRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 pb-6 border-b border-default last:border-0">
      <div className="md:w-48 flex-shrink-0">
        <h3 className="text-sm font-medium text-primary">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Bouton d'option réutilisable
function OptionButton({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
        ${selected
          ? 'border-accent bg-accent text-accent-text'
          : 'border-default text-secondary hover:border-muted hover:text-primary'
        }
      `}
    >
      {children}
    </button>
  );
}
