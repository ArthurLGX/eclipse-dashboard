'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/app/context/ThemeContext';
import useLenis from '@/utils/useLenis';
import { motion } from 'motion/react';
import { fetchPlans } from '@/lib/api';
import { useLanguage } from '@/app/context/LanguageContext';
import { formatFeatureDisplay } from '@/utils/formatFeatureDisplay';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };



export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [togglePlan, setTogglePlan] = useState(false);
  const [plans, setPlans] = useState<Array<{ name: string; description: string; price_monthly: number; price_yearly: number; features: string }>>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const { setThemeMode, resolvedMode } = useTheme();
  const { t } = useLanguage();
  useLenis();
  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      setScrollProgress(Math.min(100, pct));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchPlans() as { data?: Array<{ rank: number; name: string; description: string; price_monthly: number; price_yearly: number; features: string }> };
        const sorted = (res?.data || []).sort((a, b) => (a?.rank ?? 0) - (b?.rank ?? 0));
        setPlans(sorted);
      } catch {
        setPlans([
          { name: 'free', description: 'Pour démarrer', price_monthly: 0, price_yearly: 0, features: '{}' },
          { name: 'pro', description: 'Pour les indépendants actifs', price_monthly: 29, price_yearly: 29, features: '{}' },
          { name: 'studio', description: 'Pour les équipes', price_monthly: 79, price_yearly: 79, features: '{}' },
        ]);
      } finally {
        setPlansLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="landing-page min-h-screen ">
      <motion.div
        className="landing-scroll-progress"
        animate={{ width: `${scrollProgress}%` }}
        transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
      />

      <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`} id="landing-nav">
        <Link href="/" className="landing-nav-logo">
          <Image src="/images/logo/eclipse-logo.png" alt="Eclipse Studio" width={30} height={30} className="landing-nav-logo-mark object-contain" />
          <span>Eclipse Studio Dashboard</span>
        </Link>
        <ul className="landing-nav-links">
          <li><a href="#features">{t('landing_nav_features')}</a></li>
          <li><a href="#pricing">{t('landing_nav_pricing')}</a></li>
          <li><a href="#testimonials">{t('landing_nav_testimonials')}</a></li>
          <li><a href="#faq">{t('landing_nav_faq')}</a></li>
        </ul>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')}
            className="landing-btn-ghost"
            title={resolvedMode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {resolvedMode === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link href="/login" className="landing-btn-ghost">{t('landing_nav_login')}</Link>
          <Link href="/pricing" className="landing-btn-primary-lg">{t('landing_nav_free_trial')}</Link>
        </div>
      </nav>

      <section className={`landing-hero ${resolvedMode === 'dark' ? 'landing-hero-with-video' : ''}`}>
        {resolvedMode === 'dark' && (
          <>
            <div className="landing-hero-video-wrap">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="landing-hero-video"
              >
                <source src="/videos/background-video.mp4" type="video/mp4" />
              </video>
              <div className="landing-hero-video-overlay" />
              <div className="landing-hero-video-gradient-top" />
              <div className="landing-hero-video-gradient-bottom" />
            </div>
          </>
        )}
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid" />

        <div className="landing-hero-content relative z-10">
        <motion.div className="landing-eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="landing-eyebrow-dot" />
          {t('landing_hero_eyebrow')}
        </motion.div>

        <motion.h1 className="landing-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          {t('landing_hero_title_before')}<em>{t('landing_hero_title_em')}</em>{t('landing_hero_title_after')}
        </motion.h1>

        <motion.p className="landing-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          {t('landing_hero_sub')}
        </motion.p>

        <motion.div className="landing-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Link href="/pricing" className="landing-btn-primary-lg">
            {t('landing_hero_cta')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          <a href="#features" className="landing-btn-ghost-lg">{t('landing_hero_cta_secondary')}</a>
        </motion.div>

        <motion.div className="landing-proof" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <div className="landing-avatars">
            <div className="landing-avatar" style={{ background: '#1e3a5f', color: '#7dd3fc' }}>JB</div>
            <div className="landing-avatar" style={{ background: '#1a2e1a', color: '#86efac' }}>EC</div>
            <div className="landing-avatar" style={{ background: '#2d1b69', color: '#c4b5fd' }}>NB</div>
            <div className="landing-avatar" style={{ background: '#3b1515', color: '#fca5a5' }}>AL</div>
            <div className="landing-avatar" style={{ fontSize: 9 }}>+120</div>
          </div>
          <div className="landing-proof-text">
            <div className="landing-stars">★★★★★</div>
            <strong>{t('landing_proof_independents')}</strong> {t('landing_proof_text')}
          </div>
        </motion.div>

        <motion.div className="mt-16 -mx-12 px-12 max-w-[900px] mx-auto" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}>
          <div className="landing-dashboard-frame">
            <div className="landing-df-topbar">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <div className="landing-df-url">dashboard.eclipsestudiodev.fr</div>
            </div>
            <div className="landing-df-body">
              <div className="landing-df-sidebar">
                <div className="landing-df-icon active">▦</div>
                <div className="landing-df-icon opacity-40">◻</div>
                <div className="landing-df-icon opacity-40">◎</div>
                <div className="landing-df-icon opacity-40">⊞</div>
                <div className="landing-df-icon opacity-40">◈</div>
              </div>
              <div className="landing-df-main">
                <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--landing-text-sm)' }}>Tableau de bord</div>
                <div className="landing-df-kpis">
                  <div className="landing-df-kpi">
                    <div className="landing-df-kpi-label">CA ce mois</div>
                    <div className="landing-df-kpi-val accent">6 402 €</div>
                    <div className="landing-df-kpi-sub">+18% vs dernier mois</div>
                  </div>
                  <div className="landing-df-kpi">
                    <div className="landing-df-kpi-label">Clients</div>
                    <div className="landing-df-kpi-val green">37</div>
                    <div className="landing-df-kpi-sub">+26 nouveaux</div>
                  </div>
                  <div className="landing-df-kpi">
                    <div className="landing-df-kpi-label">Projets actifs</div>
                    <div className="landing-df-kpi-val">10</div>
                    <div className="landing-df-kpi-sub">4 en cours</div>
                  </div>
                  <div className="landing-df-kpi">
                    <div className="landing-df-kpi-label">Taux conv.</div>
                    <div className="landing-df-kpi-val">66.7%</div>
                    <div className="landing-df-kpi-sub">Devis → clients</div>
                  </div>
                </div>
                <div className="grid grid-cols-[1.5fr_1fr] gap-2.5">
                  <div className="landing-df-chart">
                    <div className="landing-df-kpi-label mb-2">Évolution CA — 6 mois</div>
                    <div className="landing-df-bars">
                      <div className="landing-df-bar" style={{ height: '20%' }} />
                      <div className="landing-df-bar" style={{ height: '35%' }} />
                      <div className="landing-df-bar hi" style={{ height: '55%' }} />
                      <div className="landing-df-bar" style={{ height: '40%' }} />
                      <div className="landing-df-bar accent" style={{ height: '90%' }} />
                      <div className="landing-df-bar accent" style={{ height: '100%' }} />
                      <div className="landing-df-bar opacity-40" style={{ height: '80%' }} />
                    </div>
                  </div>
                  <div className="landing-df-tasks">
                    <div className="landing-df-kpi-label mb-2">Tâches récentes</div>
                    <div className="landing-df-task-row">
                      <div className="landing-df-task-dot" style={{ background: '#6366f1' }} />
                      <div className="landing-df-task-text">API Meta Instagram</div>
                      <div className="landing-df-task-badge" style={{ background: 'color-mix(in srgb, var(--landing-accent) 12%, transparent)', color: 'var(--landing-accent)' }}>57%</div>
                    </div>
                    <div className="landing-df-task-row">
                      <div className="landing-df-task-dot" style={{ background: '#10b981' }} />
                      <div className="landing-df-task-text">VS Code Extension</div>
                      <div className="landing-df-task-badge" style={{ background: 'color-mix(in srgb, var(--landing-green) 12%, transparent)', color: 'var(--landing-green)' }}>✓</div>
                    </div>
                    <div className="landing-df-task-row">
                      <div className="landing-df-task-dot" style={{ background: '#f59e0b' }} />
                      <div className="landing-df-task-text">AI Quote Manager</div>
                      <div className="landing-df-task-badge" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#f59e0b' }}>—</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </section>

      <motion.div className="landing-logos-section" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
        <div className="landing-logos-label">{t('landing_logos_label')}</div>
        <div className="landing-logos-row">
          {['Quantior', 'Barbieri Économie', 'Subtil Event', 'LC Detailers', 'Cognix Systems', 'AMGM'].map((name, i) => (
            <motion.div key={name} className="landing-logo-item" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>{name}</motion.div>
          ))}
        </div>
      </motion.div>

      <section className="landing-section" id="features">
        <motion.div className="landing-section-label" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}><span>●</span> {t('landing_section_features')}</motion.div>
        <motion.h2 className="landing-section-title" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.05 }}>{t('landing_section_features_title_before')}<em>{t('landing_section_features_title_em')}</em>{t('landing_section_features_title_after')}</motion.h2>
        <motion.p className="landing-section-sub" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}>{t('landing_section_features_sub')}</motion.p>

        <motion.div className="landing-features-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} >
          {[
            { icon: '📋', titleKey: 'landing_feat_projects', descKey: 'landing_feat_projects_desc', tag: 'Kanban · Gantt · Timeline', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent2) 10%, transparent)', color: '#818cf8' } },
            { icon: '🎯', titleKey: 'landing_feat_pipeline', descKey: 'landing_feat_pipeline_desc', tag: 'CRM · Lead scoring', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent) 8%, transparent)', color: 'var(--landing-accent)' } },
            { icon: '🧾', titleKey: 'landing_feat_invoices', descKey: 'landing_feat_invoices_desc', tag: 'PDF · Relances · Stripe', tagStyle: { background: 'color-mix(in srgb, var(--landing-green) 8%, transparent)', color: 'var(--landing-green)' } },
            { icon: '🤖', titleKey: 'landing_feat_smart_followup', descKey: 'landing_feat_smart_followup_desc', tag: 'IA · Emails · Scoring', tagStyle: { background: 'color-mix(in srgb, #8b5cf6 12%, transparent)', color: '#a78bfa' } },
            { icon: '📊', titleKey: 'landing_feat_contacts', descKey: 'landing_feat_contacts_desc', tag: 'CRM · Tags · Import CSV', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent) 8%, transparent)', color: 'var(--landing-accent)' } },
            { icon: '📧', titleKey: 'landing_feat_newsletters', descKey: 'landing_feat_newsletters_desc', tag: 'SMTP · Planification', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent2) 10%, transparent)', color: '#818cf8' } },
          ].map((f) => (
            <motion.div key={f.titleKey} className="landing-feature-card" variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="landing-feat-icon">{f.icon}</div>
              <div className="landing-feat-title">{t(f.titleKey)}</div>
              <div className="landing-feat-desc">{t(f.descKey)}</div>
              <div className="landing-feat-tag" style={f.tagStyle}>{f.tag}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-section pt-0">
        <motion.div className="landing-bento" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          <motion.div className="landing-bento-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}>
            <div className="landing-bento-number accent-num">3h</div>
            <div className="landing-bento-title">économisées par semaine</div>
            <div className="landing-bento-desc">En moyenne sur la gestion admin</div>
          </motion.div>
          <motion.div className="landing-bento-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}>
            <div className="landing-bento-number">124</div>
            <div className="landing-bento-title">indépendants actifs</div>
            <div className="landing-bento-desc">Freelances, studios, agences</div>
          </motion.div>
          <motion.div className="landing-bento-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}>
            <div className="landing-df-kpi-label mb-3">Pipeline visuel</div>
            <div className="flex gap-1.5 mt-4 items-end">
              {[
                { h: 64, color: '#6366f1', label: 'Nouveau', val: '27' },
                { h: 40, color: '#f59e0b', label: 'Contacté', val: '12' },
                { h: 28, color: '#3b82f6', label: 'Qualifié', val: '8' },
                { h: 18, color: '#8b5cf6', label: 'Devis', val: '4' },
                { h: 12, color: '#10b981', label: 'Gagné', val: '2' },
              ].map((s) => (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-t bg-opacity-20 border-t-2" style={{ height: s.h, background: `${s.color}20`, borderColor: s.color }} />
                  <div className="landing-df-kpi-label text-center">{s.label}<br /><strong style={{ color: 'var(--landing-text-md)' }}>{s.val}</strong></div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div className="landing-bento-card span2" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}>
            <div className="grid grid-cols-2 gap-6 items-center">
              <div>
                <div className="landing-bento-number accent-num">66%</div>
                <div className="landing-bento-title">taux de conversion moyen</div>
                <div className="landing-bento-desc">Devis envoyés → clients signés chez nos utilisateurs</div>
              </div>
              <div className="flex flex-col gap-2">
                {['Formulaire envoyé', 'Score ICP calculé', 'Relance auto planifiée'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs" style={{ color: 'var(--landing-text-md)' }}><span style={{ color: 'var(--landing-green)' }}>✓</span>{t}</div>
                ))}
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--landing-text-md)' }}><span>★</span>Deal signé — 2 800 €</div>
              </div>
            </div>
          </motion.div>
          <motion.div className="landing-bento-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}>
            <div className="landing-bento-number">30s</div>
            <div className="landing-bento-title">pour créer une facture</div>
            <div className="landing-bento-desc">PDF, envoi email, suivi paiement inclus</div>
          </motion.div>
        </motion.div>
      </section>

      <section className="landing-section" id="pricing">
        <div className="text-center flex flex-col items-center">
          <motion.div className="landing-section-label justify-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}><span>●</span> {t('landing_pricing_label')}</motion.div>
          <motion.h2 className="landing-section-title max-w-full text-center" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>{t('landing_pricing_title')}</motion.h2>
          <motion.p className="landing-section-sub text-center max-w-md mx-auto mb-0" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>{t('landing_pricing_sub')}</motion.p>
        </div>

        {/* Toggle Mensuel / Annuel */}
        <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 mt-10">
          <span className={`text-sm font-medium transition-colors duration-200 ${!togglePlan ? 'text-accent' : 'opacity-60'}`} style={{ color: !togglePlan ? 'var(--landing-accent)' : undefined }}>
            {t('landing_pricing_monthly')}
          </span>
          <button
            type="button"
            onClick={() => setTogglePlan(!togglePlan)}
            className="relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ background: togglePlan ? 'var(--landing-accent)' : 'var(--landing-border)' }}
          >
            <span
              className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300"
              style={{ transform: togglePlan ? 'translateX(36px)' : 'translateX(4px)' }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors duration-200 ${togglePlan ? 'text-accent' : 'opacity-60'}`} style={{ color: togglePlan ? 'var(--landing-accent)' : undefined }}>
            {t('landing_pricing_yearly')}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: togglePlan ? 'color-mix(in srgb, var(--landing-accent) 15%, transparent)' : 'var(--landing-border)', color: togglePlan ? 'var(--landing-accent)' : 'var(--landing-text-sm)' }}
          >
            {t('landing_pricing_save')}
          </span>
        </div>

        <motion.div
          className="landing-pricing-grid"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {plansLoading ? (
            [1, 2, 3].map((idx) => (
              <div key={idx} className="landing-pricing-card animate-pulse">
                <div className="h-4 w-20 bg-muted rounded mb-4" style={{ background: 'var(--landing-border)' }} />
                <div className="h-10 w-16 rounded mb-4" style={{ background: 'var(--landing-border)' }} />
                <div className="h-3 w-28 rounded mb-6" style={{ background: 'var(--landing-border)' }} />
                <div className="landing-pricing-divider" />
                <div className="space-y-3 mt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 rounded" style={{ background: 'var(--landing-border)' }} />
                  ))}
                </div>
                <div className="h-12  mt-6" style={{ background: 'var(--landing-border)' }} />
              </div>
            ))
          ) : plans.length > 0 ? (
            plans.map((plan) => {
              const featured = plan.name === 'pro';
              const expert = plan.name === 'expert';
              const price = togglePlan ? plan.price_yearly : plan.price_monthly;
              let features: string[] = [];
              try {
                const f = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
                if (f && typeof f === 'object') {
                  features = Object.entries(f)
                    .filter(([, v]) => v !== false && v !== null && v !== undefined)
                    .slice(0, 8)
                    .map(([k, v]) => formatFeatureDisplay(k, v as boolean | number | string, t))
                    .filter(Boolean);
                }
              } catch { /* ignore */ }
              const fallbackFeatures: Record<string, string[]> = {
                free: [t('projects_active_format', { count: '5' }), t('clients_active_format', { count: '50' }), '3 factures / mois', 'Pipeline de base', t('email_support')],
                starter: [t('projects_active_format', { count: '5' }), t('clients_active_format', { count: '50' }), '3 factures / mois', 'Pipeline de base', t('email_support')],
                pro: [t('projects_active_format', { count: '50' }), t('clients_active_format', { count: '1000' }), 'Factures illimitées', 'Pipeline complet', 'Smart Follow-Up IA', 'Newsletters (100/mois)'],
                studio: [t('projects_active_format', { count: '∞' }), t('clients_active_format', { count: '∞' }), 'Multi-utilisateurs', 'API & intégrations', 'IA prioritaire', 'Support dédié'],
                expert: [t('projects_active_format', { count: '∞' }), t('clients_active_format', { count: '∞' }), 'Multi-utilisateurs', 'API & intégrations', 'IA prioritaire', 'Support dédié'],
              };
              const displayFeatures = features.length > 0 ? features : (fallbackFeatures[plan.name] ?? fallbackFeatures.pro);
              const displayName = plan.name.charAt(0).toUpperCase() + plan.name.slice(1);
              const period = price === 0 ? 'pour toujours' : togglePlan ? `par mois, facturé annuellement · -20%` : 'par mois';
              const ctaFree = plan.name === 'free' ? 'Commencer gratuitement' : null;
              const ctaPro = plan.name === 'pro' ? 'Essai gratuit 14 jours' : null;
              const cta = ctaFree ?? ctaPro ?? `Choisir ${displayName}`;
              const href = plan.name === 'free' ? '/login' : '/pricing';

              return (
                <motion.div
                  key={plan.name}
                  className={`landing-pricing-card ${featured ? 'featured' : ''} ${expert ? 'expert' : ''}`}
                  variants={cardVariants}
                  whileHover={featured || expert ? { y: -8, scale: 1.02, transition: { duration: 0.2 } } : { y: -6, transition: { duration: 0.2 } }}
                >
                  {featured && <div className="landing-pricing-badge">⚡ {t('most_popular')}</div>}
                  <div className="landing-pricing-name">{displayName}</div>
                  <div className="landing-pricing-price">{price} <span className="text-lg font-medium">€</span></div>
                  <div className="landing-pricing-period">{period}</div>
                  <div className="landing-pricing-divider" />
                  {displayFeatures.map((f, idx) => (
                    <div key={`${plan.name}-${idx}`} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
                  ))}
                  <Link
                    href={href}
                    className={expert ? 'landing-btn-pricing-expert' : featured ? 'landing-btn-pricing-dark' : 'landing-btn-pricing-outline'}
                  >
                    {cta}
                  </Link>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12" style={{ color: 'var(--landing-text-sm)' }}>
              {t('landing_no_plans')}
            </div>
          )}
        </motion.div>
      </section>

      <section className="landing-section flex flex-col items-center pt-0" id="testimonials">
        <motion.div className="landing-section-label" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}><span>●</span> {t('landing_testimonials_label')}</motion.div>
        <motion.h2 className="landing-section-title" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>{t('landing_testimonials_title_before')}<em>{t('landing_testimonials_title_em')}</em>{t('landing_testimonials_title_after')}</motion.h2>
        <motion.div className="landing-testimonials-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          {[
            { stars: '★★★★★', textKey: 'landing_testimonial_1', name: 'Jérémie Bole Du Chaumont', roleKey: 'landing_role_developer', avatar: 'JB' },
            { stars: '★★★★★', textKey: 'landing_testimonial_2', name: 'Arthur Le Goux', roleKey: 'landing_role_eclipse', avatar: 'EC', avatarBg: '#1a2e1a', avatarColor: '#86efac' },
            { stars: '★★★★★', textKey: 'landing_testimonial_3', name: 'Nicolas Barbieri', roleKey: 'landing_role_barbieri', avatar: 'NB', avatarBg: '#1e1e3f', avatarColor: '#c4b5fd' },
          ].map((item) => (
            <motion.div key={item.name} className="landing-testimonial-card" variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="landing-testimonial-stars">{item.stars}</div>
              <div className="landing-testimonial-text">{t(item.textKey)}</div>
              <div className="flex items-center gap-2.5">
                <div className="landing-testimonial-avatar" style={item.avatarBg ? { background: item.avatarBg, color: item.avatarColor } : undefined}>{item.avatar}</div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--landing-text)' }}>{item.name}</div>
                  <div className="text-xs" style={{ color: 'var(--landing-text-sm)' }}>{t(item.roleKey)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-section pt-0" id="faq">
        <div className="text-center flex flex-col items-center  ">
          <motion.div className="landing-section-label justify-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}><span>●</span> {t('landing_faq_label')}</motion.div>
          <motion.h2 className="landing-section-title max-w-full text-center" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>{t('landing_faq_title_before')}<em>{t('landing_faq_title_em')}</em></motion.h2>
        </div>
        <motion.div className="max-w-[680px] mx-auto mt-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}>
          {[
            { qKey: 'landing_faq_1_q', aKey: 'landing_faq_1_a' },
            { qKey: 'landing_faq_2_q', aKey: 'landing_faq_2_a' },
            { qKey: 'landing_faq_3_q', aKey: 'landing_faq_3_a' },
            { qKey: 'landing_faq_4_q', aKey: 'landing_faq_4_a' },
            { qKey: 'landing_faq_5_q', aKey: 'landing_faq_5_a' },
          ].map((faq, i) => (
            <motion.div key={i} className={`landing-faq-item ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)} variants={cardVariants} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <div className="landing-faq-question">
                {t(faq.qKey)}
                <div className="landing-faq-icon">+</div>
              </div>
              <div className="landing-faq-answer">{t(faq.aKey)}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-bg" />
        <motion.h2 className="landing-cta-title" initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>{t('landing_cta_title')}<br /><em>{t('landing_cta_title_em')}</em> ?</motion.h2>
        <motion.p className="landing-cta-sub" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>{t('landing_cta_sub')}</motion.p>
        <motion.div className="flex gap-2 max-w-[400px] mx-auto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <input type="email" className="landing-cta-input" placeholder={t('landing_cta_placeholder')} />
          <Link href="/pricing" className="landing-btn-primary-lg" style={{ padding: '14px 20px', fontSize: 14, whiteSpace: 'nowrap' }}>{t('landing_cta_button')}</Link>
        </motion.div>
        <motion.div className="text-xs mt-3" style={{ color: 'var(--landing-text-sm)' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>{t('landing_cta_badge')}</motion.div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="landing-footer-logo">
            <Image src="/images/logo/eclipse-logo.png" alt="Eclipse Studio" width={26} height={26} className="landing-footer-logo-mark object-contain" />
            <span className="font-bold text-[11px] tracking-tight" style={{ color: 'var(--landing-text)' }}>Eclipse Studio Dashboard</span>
          </div>
          <div className="landing-footer-tagline">{t('landing_footer_tagline')}</div>
        </div>
        <div>
          <div className="landing-footer-col-title">{t('landing_footer_product')}</div>
          <ul className="landing-footer-links">
            <li><a href="#features">{t('landing_nav_features')}</a></li>
            <li><a href="#">{t('landing_footer_pipeline')}</a></li>
            <li><a href="#">{t('landing_footer_smart_followup')}</a></li>
            <li><a href="#">{t('landing_footer_invoices')}</a></li>
            <li><a href="#pricing">{t('landing_nav_pricing')}</a></li>
          </ul>
        </div>
        <div>
          <div className="landing-footer-col-title">{t('landing_footer_resources')}</div>
          <ul className="landing-footer-links">
            <li><a href="#">{t('landing_footer_docs')}</a></li>
            <li><a href="#">{t('landing_footer_blog')}</a></li>
            <li><a href="#">{t('landing_footer_changelog')}</a></li>
            <li><a href="#">{t('landing_footer_status')}</a></li>
            <li><a href="#">{t('landing_footer_api')}</a></li>
          </ul>
        </div>
        <div>
          <div className="landing-footer-col-title">{t('landing_footer_company')}</div>
          <ul className="landing-footer-links">
            <li><a href="#">{t('landing_footer_about')}</a></li>
            <li><a href="#">{t('landing_footer_contact')}</a></li>
            <li><Link href="/privacy">{t('landing_footer_privacy')}</Link></li>
            <li><Link href="/terms">{t('landing_footer_terms')}</Link></li>
            <li><Link href="/cookies">{t('landing_footer_cookies')}</Link></li>
            <li><Link href="/delete-account">{t('landing_footer_delete_account')}</Link></li>
          </ul>
        </div>
      </footer>
      <div className="landing-footer-bottom">
        <span>{t('landing_footer_copyright')}</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--landing-text-sm)' }}>{t('landing_footer_made_in')}</span>
      </div>
    </div>
  );
}
