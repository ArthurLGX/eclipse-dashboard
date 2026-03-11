'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/app/context/ThemeContext';
import useLenis from '@/utils/useLenis';
import { motion } from 'motion/react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };



export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { setThemeMode, resolvedMode } = useTheme();
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

  return (
    <div className="landing-page min-h-screen ">
      <div className="landing-scroll-progress " style={{ width: `${scrollProgress}%` }} />

      <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`} id="landing-nav">
        <Link href="/" className="landing-nav-logo">
          <div className="landing-nav-logo-mark">ES</div>
          <span>Eclipse Studio Dashboard</span>
        </Link>
        <ul className="landing-nav-links">
          <li><a href="#features">Fonctionnalités</a></li>
          <li><a href="#pricing">Tarifs</a></li>
          <li><a href="#testimonials">Témoignages</a></li>
          <li><a href="#faq">FAQ</a></li>
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
          <Link href="/login" className="landing-btn-ghost">Se connecter</Link>
          <Link href="/pricing" className="landing-btn-primary">Essai gratuit →</Link>
        </div>
      </nav>

      <section className="landing-hero ">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid" />

        <motion.div className="landing-eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="landing-eyebrow-dot" />
          Nouveau — Smart Follow-Up IA disponible
        </motion.div>

        <motion.h1 className="landing-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          Le dashboard qui<br />fait <em>avancer</em> votre<br />business.
        </motion.h1>

        <motion.p className="landing-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          Projets, clients, pipeline, factures — tout centralisé. Conçu pour les indépendants et studios qui veulent passer moins de temps sur l&apos;admin.
        </motion.p>

        <motion.div className="landing-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Link href="/pricing" className="landing-btn-primary-lg">
            Démarrer gratuitement
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          <a href="#features" className="landing-btn-ghost-lg">Voir les fonctionnalités</a>
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
            <strong>124 indépendants</strong> font confiance à Eclipse Studio Dashboard
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
      </section>

      <motion.div className="landing-logos-section" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
        <div className="landing-logos-label">Utilisé par des freelances et studios partout en France</div>
        <div className="landing-logos-row">
          {['Quantior', 'Barbieri Économie', 'Subtil Event', 'LC Detailers', 'Cognix Systems', 'AMGM'].map((name, i) => (
            <motion.div key={name} className="landing-logo-item" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>{name}</motion.div>
          ))}
        </div>
      </motion.div>

      <section className="landing-section" id="features">
        <motion.div className="landing-section-label" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}><span>●</span> Fonctionnalités</motion.div>
        <motion.h2 className="landing-section-title" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.05 }}>Tout ce dont vous avez <em>besoin</em>, rien de plus.</motion.h2>
        <motion.p className="landing-section-sub" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}>Un seul outil pour remplacer Notion, Trello, Pennylane et votre CRM. Pensé pour aller vite.</motion.p>

        <motion.div className="landing-features-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} >
          {[
            { icon: '📋', title: 'Gestion de projets', desc: 'Tâches, sous-tâches, workflow Kanban, Gantt — tout pour livrer vos projets à temps sans chaos.', tag: 'Kanban · Gantt · Timeline', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent2) 10%, transparent)', color: '#818cf8' } },
            { icon: '🎯', title: 'Pipeline commercial', desc: 'Suivez chaque opportunité de la prospection à la signature. Score ICP, relances automatiques, KPIs live.', tag: 'CRM · Lead scoring', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent) 8%, transparent)', color: 'var(--landing-accent)' } },
            { icon: '🧾', title: 'Factures & Devis', desc: 'Créez et envoyez des factures professionnelles en 30 secondes. Suivi des paiements, relances auto.', tag: 'PDF · Relances · Stripe', tagStyle: { background: 'color-mix(in srgb, var(--landing-green) 8%, transparent)', color: 'var(--landing-green)' } },
            { icon: '🤖', title: 'Smart Follow-Up IA', desc: "L'IA analyse vos emails entrants, score les leads, et planifie les bonnes relances au bon moment.", tag: 'IA · Emails · Scoring', tagStyle: { background: 'color-mix(in srgb, #8b5cf6 12%, transparent)', color: '#a78bfa' } },
            { icon: '📊', title: 'Contacts & CRM', desc: 'Base de contacts unifiée. Clients, prospects, partenaires — avec historique, notes et statuts.', tag: 'CRM · Tags · Import CSV', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent) 8%, transparent)', color: 'var(--landing-accent)' } },
            { icon: '📧', title: 'Newsletters', desc: 'Créez et envoyez des newsletters à vos contacts depuis le dashboard. Statistiques d\'envoi incluses.', tag: 'SMTP · Planification', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent2) 10%, transparent)', color: '#818cf8' } },
          ].map((f) => (
            <motion.div key={f.title} className="landing-feature-card" variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="landing-feat-icon">{f.icon}</div>
              <div className="landing-feat-title">{f.title}</div>
              <div className="landing-feat-desc">{f.desc}</div>
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
          <motion.div className="landing-section-label justify-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}><span>●</span> Tarifs</motion.div>
          <motion.h2 className="landing-section-title max-w-full text-center" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>Simple. <em>Transparent.</em> Sans surprise.</motion.h2>
          <motion.p className="landing-section-sub text-center max-w-md mx-auto mb-0" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>Commencez gratuitement. Passez au plan suivant quand vous en avez besoin.</motion.p>
        </div>
        <motion.div className="landing-pricing-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          <motion.div className="landing-pricing-card" variants={cardVariants} whileHover={{ y: -6, transition: { duration: 0.2 } }}>
            <div className="landing-pricing-name">Starter</div>
            <div className="landing-pricing-price">0 <span className="text-lg font-medium">€</span></div>
            <div className="landing-pricing-period">pour toujours</div>
            <div className="landing-pricing-divider" />
            {['5 projets actifs', '50 contacts', '3 factures / mois', 'Pipeline de base'].map((f) => (
              <div key={f} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
            ))}
            <div className="landing-pricing-feature opacity-40"><span className="landing-pricing-check">✗</span> Smart Follow-Up IA</div>
            <div className="landing-pricing-feature opacity-40"><span className="landing-pricing-check">✗</span> Newsletters</div>
            <Link href="/pricing" className="landing-btn-pricing-outline">Commencer gratuitement</Link>
          </motion.div>
          <motion.div className="landing-pricing-card featured" variants={cardVariants} whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}>
            <div className="landing-pricing-badge">⚡ Le plus populaire</div>
            <div className="landing-pricing-name">Pro</div>
            <div className="landing-pricing-price">29 <span className="text-lg font-medium">€</span></div>
            <div className="landing-pricing-period">par mois, facturé annuellement</div>
            <div className="landing-pricing-divider" />
            {['50 projets actifs', '1 000 contacts', 'Factures illimitées', 'Pipeline complet', 'Smart Follow-Up IA', 'Newsletters (100/mois)'].map((f) => (
              <div key={f} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
            ))}
            <Link href="/pricing" className="landing-btn-pricing-dark">Essai gratuit 14 jours</Link>
          </motion.div>
          <motion.div className="landing-pricing-card" variants={cardVariants} whileHover={{ y: -6, transition: { duration: 0.2 } }}>
            <div className="landing-pricing-name">Studio</div>
            <div className="landing-pricing-price">79 <span className="text-lg font-medium">€</span></div>
            <div className="landing-pricing-period">par mois, facturé annuellement</div>
            <div className="landing-pricing-divider" />
            {['Projets illimités', 'Contacts illimités', 'Multi-utilisateurs', 'API & intégrations', 'IA prioritaire', 'Support dédié'].map((f) => (
              <div key={f} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
            ))}
            <Link href="/pricing" className="landing-btn-pricing-outline">Contacter l&apos;équipe</Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="landing-section flex flex-col items-center pt-0" id="testimonials">
        <motion.div className="landing-section-label" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}><span>●</span> Témoignages</motion.div>
        <motion.h2 className="landing-section-title" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>Ils en parlent <em>mieux</em> que nous.</motion.h2>
        <motion.div className="landing-testimonials-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          {[
            { stars: '★★★★★', text: "Eclipse Studio Dashboard m'a permis de sortir de l'enfer des spreadsheets. Mes devis partent en 30 secondes et je ne loupe plus aucune relance client.", name: 'Jérémie Bole Du Chaumont', role: 'Développeur indépendant', avatar: 'JB' },
            { stars: '★★★★★', text: 'Le Smart Follow-Up IA est bluffant. Il analyse mes emails entrants et me dit exactement quoi relancer et quand. J\'ai gagné 2 deals grâce à ça.', name: 'Arthur Le Goux', role: 'Eclipse Studio Development', avatar: 'EC', avatarBg: '#1a2e1a', avatarColor: '#86efac' },
            { stars: '★★★★★', text: "Interface propre, intuitive, et ça va vite. C'est rare pour un outil de gestion. Plus besoin de jongler entre 4 apps différentes.", name: 'Nicolas Barbieri', role: 'Barbieri Économie', avatar: 'NB', avatarBg: '#1e1e3f', avatarColor: '#c4b5fd' },
          ].map((t) => (
            <motion.div key={t.name} className="landing-testimonial-card" variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="landing-testimonial-stars">{t.stars}</div>
              <div className="landing-testimonial-text">{t.text}</div>
              <div className="flex items-center gap-2.5">
                <div className="landing-testimonial-avatar" style={t.avatarBg ? { background: t.avatarBg, color: t.avatarColor } : undefined}>{t.avatar}</div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--landing-text)' }}>{t.name}</div>
                  <div className="text-xs" style={{ color: 'var(--landing-text-sm)' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-section pt-0" id="faq">
        <div className="text-center flex flex-col items-center  ">
          <motion.div className="landing-section-label justify-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}><span>●</span> FAQ</motion.div>
          <motion.h2 className="landing-section-title max-w-full text-center" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>Questions <em>fréquentes</em></motion.h2>
        </div>
        <motion.div className="max-w-[680px] mx-auto mt-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}>
          {[
            { q: "Puis-je essayer avant de payer ?", a: "Oui, le plan Starter est gratuit pour toujours. Le plan Pro inclut un essai gratuit de 14 jours sans carte bancaire requise." },
            { q: "Comment fonctionne le Smart Follow-Up IA ?", a: "En connectant votre boîte email (Gmail, Outlook), l'IA analyse chaque email entrant, lui attribue un score ICP, identifie le type de contact et planifie automatiquement la meilleure action de suivi." },
            { q: "Mes données sont-elles sécurisées ?", a: "Vos données sont hébergées en Europe (France), chiffrées en transit et au repos. Nous ne vendons ni ne partageons aucune donnée avec des tiers." },
            { q: "Puis-je importer mes données existantes ?", a: "Oui, Eclipse Studio Dashboard supporte l'import CSV pour les contacts, et des intégrations directes avec Google Contacts, Notion, et d'autres outils sont en cours." },
            { q: "Y a-t-il une application mobile ?", a: "L'interface web est entièrement responsive et fonctionne parfaitement sur mobile. Une application native iOS/Android est en cours de développement." },
          ].map((faq, i) => (
            <motion.div key={i} className={`landing-faq-item ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)} variants={cardVariants} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <div className="landing-faq-question">
                {faq.q}
                <div className="landing-faq-icon">+</div>
              </div>
              <div className="landing-faq-answer">{faq.a}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-bg" />
        <motion.h2 className="landing-cta-title" initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>Prêt à reprendre<br /><em>le contrôle</em> ?</motion.h2>
        <motion.p className="landing-cta-sub" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>Rejoignez 124 indépendants qui gèrent leur business sans friction.</motion.p>
        <motion.div className="flex gap-2 max-w-[400px] mx-auto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <input type="email" className="landing-cta-input" placeholder="votre@email.fr" />
          <Link href="/pricing" className="landing-btn-primary" style={{ padding: '14px 20px', fontSize: 14, whiteSpace: 'nowrap' }}>Commencer →</Link>
        </motion.div>
        <motion.div className="text-xs mt-3" style={{ color: 'var(--landing-text-sm)' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>Gratuit · Sans carte bancaire · Installation en 2 minutes</motion.div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="landing-footer-logo">
            <div className="landing-footer-logo-mark">ES</div>
            <span className="font-bold text-[13px] tracking-tight" style={{ color: 'var(--landing-text)' }}>Eclipse Studio Dashboard</span>
          </div>
          <div className="landing-footer-tagline">Le dashboard des indépendants qui avancent vite.</div>
        </div>
        <div>
          <div className="landing-footer-col-title">Produit</div>
          <ul className="landing-footer-links">
            <li><a href="#features">Fonctionnalités</a></li>
            <li><a href="#">Pipeline commercial</a></li>
            <li><a href="#">Smart Follow-Up</a></li>
            <li><a href="#">Factures & Devis</a></li>
            <li><a href="#pricing">Tarifs</a></li>
          </ul>
        </div>
        <div>
          <div className="landing-footer-col-title">Ressources</div>
          <ul className="landing-footer-links">
            <li><a href="#">Documentation</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Changelog</a></li>
            <li><a href="#">Status</a></li>
            <li><a href="#">API</a></li>
          </ul>
        </div>
        <div>
          <div className="landing-footer-col-title">Entreprise</div>
          <ul className="landing-footer-links">
            <li><a href="#">À propos</a></li>
            <li><a href="#">Contact</a></li>
            <li><Link href="/privacy">Confidentialité</Link></li>
            <li><Link href="/terms">CGU</Link></li>
            <li><a href="#">Mentions légales</a></li>
          </ul>
        </div>
      </footer>
      <div className="landing-footer-bottom">
        <span>© 2026 Eclipse Studio Dashboard. Tous droits réservés.</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--landing-text-sm)' }}>Made in France 🇫🇷</span>
      </div>
    </div>
  );
}
