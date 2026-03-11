'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/app/context/ThemeContext';

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { setThemeMode, resolvedMode } = useTheme();

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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    const els = document.querySelectorAll('.landing-reveal');
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page min-h-screen">
      <div className="landing-scroll-progress" style={{ width: `${scrollProgress}%` }} />

      <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`} id="landing-nav">
        <Link href="/" className="landing-nav-logo">
          <div className="landing-nav-logo-mark">ES</div>
          <span>Eclipse Studio</span>
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

      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid" />

        <div className="landing-eyebrow">
          <div className="landing-eyebrow-dot" />
          Nouveau — Smart Follow-Up IA disponible
        </div>

        <h1 className="landing-title">
          Le dashboard qui<br />fait <em>avancer</em> votre<br />business.
        </h1>

        <p className="landing-sub">
          Projets, clients, pipeline, factures — tout centralisé. Conçu pour les indépendants et studios qui veulent passer moins de temps sur l&apos;admin.
        </p>

        <div className="landing-actions">
          <Link href="/pricing" className="landing-btn-primary-lg">
            Démarrer gratuitement
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          <a href="#features" className="landing-btn-ghost-lg">Voir les fonctionnalités</a>
        </div>

        <div className="landing-proof">
          <div className="landing-avatars">
            <div className="landing-avatar" style={{ background: '#1e3a5f', color: '#7dd3fc' }}>JB</div>
            <div className="landing-avatar" style={{ background: '#1a2e1a', color: '#86efac' }}>EC</div>
            <div className="landing-avatar" style={{ background: '#2d1b69', color: '#c4b5fd' }}>NB</div>
            <div className="landing-avatar" style={{ background: '#3b1515', color: '#fca5a5' }}>AL</div>
            <div className="landing-avatar" style={{ fontSize: 9 }}>+120</div>
          </div>
          <div className="landing-proof-text">
            <div className="landing-stars">★★★★★</div>
            <strong>124 indépendants</strong> font confiance à Eclipse Studio
          </div>
        </div>

        <div className="mt-16 -mx-12 px-12 max-w-[900px] mx-auto">
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
        </div>
      </section>

      <div className="landing-logos-section">
        <div className="landing-logos-label">Utilisé par des freelances et studios partout en France</div>
        <div className="landing-logos-row">
          {['Quantior', 'Barbieri Économie', 'Subtil Event', 'LC Detailers', 'Cognix Systems', 'AMGM'].map((name) => (
            <div key={name} className="landing-logo-item">{name}</div>
          ))}
        </div>
      </div>

      <section className="landing-section" id="features">
        <div className="landing-section-label landing-reveal" ><span>●</span> Fonctionnalités</div>
        <h2 className="landing-section-title landing-reveal" >Tout ce dont vous avez <em>besoin</em>, rien de plus.</h2>
        <p className="landing-section-sub landing-reveal" >Un seul outil pour remplacer Notion, Trello, Pennylane et votre CRM. Pensé pour aller vite.</p>

        <div className="landing-features-grid landing-reveal" >
          {[
            { icon: '📋', title: 'Gestion de projets', desc: 'Tâches, sous-tâches, workflow Kanban, Gantt — tout pour livrer vos projets à temps sans chaos.', tag: 'Kanban · Gantt · Timeline', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent2) 10%, transparent)', color: '#818cf8' } },
            { icon: '🎯', title: 'Pipeline commercial', desc: 'Suivez chaque opportunité de la prospection à la signature. Score ICP, relances automatiques, KPIs live.', tag: 'CRM · Lead scoring', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent) 8%, transparent)', color: 'var(--landing-accent)' } },
            { icon: '🧾', title: 'Factures & Devis', desc: 'Créez et envoyez des factures professionnelles en 30 secondes. Suivi des paiements, relances auto.', tag: 'PDF · Relances · Stripe', tagStyle: { background: 'color-mix(in srgb, var(--landing-green) 8%, transparent)', color: 'var(--landing-green)' } },
            { icon: '🤖', title: 'Smart Follow-Up IA', desc: "L'IA analyse vos emails entrants, score les leads, et planifie les bonnes relances au bon moment.", tag: 'IA · Emails · Scoring', tagStyle: { background: 'color-mix(in srgb, #8b5cf6 12%, transparent)', color: '#a78bfa' } },
            { icon: '📊', title: 'Contacts & CRM', desc: 'Base de contacts unifiée. Clients, prospects, partenaires — avec historique, notes et statuts.', tag: 'CRM · Tags · Import CSV', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent) 8%, transparent)', color: 'var(--landing-accent)' } },
            { icon: '📧', title: 'Newsletters', desc: 'Créez et envoyez des newsletters à vos contacts depuis le dashboard. Statistiques d\'envoi incluses.', tag: 'SMTP · Planification', tagStyle: { background: 'color-mix(in srgb, var(--landing-accent2) 10%, transparent)', color: '#818cf8' } },
          ].map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feat-icon">{f.icon}</div>
              <div className="landing-feat-title">{f.title}</div>
              <div className="landing-feat-desc">{f.desc}</div>
              <div className="landing-feat-tag" style={f.tagStyle}>{f.tag}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section pt-0">
        <div className="landing-bento landing-reveal" >
          <div className="landing-bento-card">
            <div className="landing-bento-number accent-num">3h</div>
            <div className="landing-bento-title">économisées par semaine</div>
            <div className="landing-bento-desc">En moyenne sur la gestion admin</div>
          </div>
          <div className="landing-bento-card">
            <div className="landing-bento-number">124</div>
            <div className="landing-bento-title">indépendants actifs</div>
            <div className="landing-bento-desc">Freelances, studios, agences</div>
          </div>
          <div className="landing-bento-card">
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
          </div>
          <div className="landing-bento-card span2">
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
          </div>
          <div className="landing-bento-card">
            <div className="landing-bento-number">30s</div>
            <div className="landing-bento-title">pour créer une facture</div>
            <div className="landing-bento-desc">PDF, envoi email, suivi paiement inclus</div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <div className="text-center">
          <div className="landing-section-label justify-center landing-reveal" ><span>●</span> Tarifs</div>
          <h2 className="landing-section-title landing-reveal max-w-full text-center" >Simple. <em>Transparent.</em> Sans surprise.</h2>
          <p className="landing-section-sub landing-reveal text-center max-w-md mx-auto mb-0" >Commencez gratuitement. Passez au plan suivant quand vous en avez besoin.</p>
        </div>
        <div className="landing-pricing-grid landing-reveal" >
          <div className="landing-pricing-card">
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
          </div>
          <div className="landing-pricing-card featured">
            <div className="landing-pricing-badge">⚡ Le plus populaire</div>
            <div className="landing-pricing-name">Pro</div>
            <div className="landing-pricing-price">29 <span className="text-lg font-medium">€</span></div>
            <div className="landing-pricing-period">par mois, facturé annuellement</div>
            <div className="landing-pricing-divider" />
            {['50 projets actifs', '1 000 contacts', 'Factures illimitées', 'Pipeline complet', 'Smart Follow-Up IA', 'Newsletters (100/mois)'].map((f) => (
              <div key={f} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
            ))}
            <Link href="/pricing" className="landing-btn-pricing-dark">Essai gratuit 14 jours</Link>
          </div>
          <div className="landing-pricing-card">
            <div className="landing-pricing-name">Studio</div>
            <div className="landing-pricing-price">79 <span className="text-lg font-medium">€</span></div>
            <div className="landing-pricing-period">par mois, facturé annuellement</div>
            <div className="landing-pricing-divider" />
            {['Projets illimités', 'Contacts illimités', 'Multi-utilisateurs', 'API & intégrations', 'IA prioritaire', 'Support dédié'].map((f) => (
              <div key={f} className="landing-pricing-feature"><span className="landing-pricing-check">✓</span> {f}</div>
            ))}
            <Link href="/pricing" className="landing-btn-pricing-outline">Contacter l&apos;équipe</Link>
          </div>
        </div>
      </section>

      <section className="landing-section pt-0" id="testimonials">
        <div className="landing-section-label landing-reveal" ><span>●</span> Témoignages</div>
        <h2 className="landing-section-title landing-reveal" >Ils en parlent <em>mieux</em> que nous.</h2>
        <div className="landing-testimonials-grid landing-reveal" >
          {[
            { stars: '★★★★★', text: "Eclipse Studio m'a permis de sortir de l'enfer des spreadsheets. Mes devis partent en 30 secondes et je ne loupe plus aucune relance client.", name: 'Jérémie Bole Du Chaumont', role: 'Développeur indépendant', avatar: 'JB' },
            { stars: '★★★★★', text: 'Le Smart Follow-Up IA est bluffant. Il analyse mes emails entrants et me dit exactement quoi relancer et quand. J\'ai gagné 2 deals grâce à ça.', name: 'Arthur Le Goux', role: 'Eclipse Studio Development', avatar: 'EC', avatarBg: '#1a2e1a', avatarColor: '#86efac' },
            { stars: '★★★★★', text: "Interface propre, intuitive, et ça va vite. C'est rare pour un outil de gestion. Plus besoin de jongler entre 4 apps différentes.", name: 'Nicolas Barbieri', role: 'Barbieri Économie', avatar: 'NB', avatarBg: '#1e1e3f', avatarColor: '#c4b5fd' },
          ].map((t) => (
            <div key={t.name} className="landing-testimonial-card">
              <div className="landing-testimonial-stars">{t.stars}</div>
              <div className="landing-testimonial-text">{t.text}</div>
              <div className="flex items-center gap-2.5">
                <div className="landing-testimonial-avatar" style={t.avatarBg ? { background: t.avatarBg, color: t.avatarColor } : undefined}>{t.avatar}</div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--landing-text)' }}>{t.name}</div>
                  <div className="text-xs" style={{ color: 'var(--landing-text-sm)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section pt-0" id="faq">
        <div className="text-center">
          <div className="landing-section-label justify-center landing-reveal" ><span>●</span> FAQ</div>
          <h2 className="landing-section-title landing-reveal max-w-full text-center" >Questions <em>fréquentes</em></h2>
        </div>
        <div className="max-w-[680px] mx-auto mt-14">
          {[
            { q: "Puis-je essayer avant de payer ?", a: "Oui, le plan Starter est gratuit pour toujours. Le plan Pro inclut un essai gratuit de 14 jours sans carte bancaire requise." },
            { q: "Comment fonctionne le Smart Follow-Up IA ?", a: "En connectant votre boîte email (Gmail, Outlook), l'IA analyse chaque email entrant, lui attribue un score ICP, identifie le type de contact et planifie automatiquement la meilleure action de suivi." },
            { q: "Mes données sont-elles sécurisées ?", a: "Vos données sont hébergées en Europe (France), chiffrées en transit et au repos. Nous ne vendons ni ne partageons aucune donnée avec des tiers." },
            { q: "Puis-je importer mes données existantes ?", a: "Oui, Eclipse Studio supporte l'import CSV pour les contacts, et des intégrations directes avec Google Contacts, Notion, et d'autres outils sont en cours." },
            { q: "Y a-t-il une application mobile ?", a: "L'interface web est entièrement responsive et fonctionne parfaitement sur mobile. Une application native iOS/Android est en cours de développement." },
          ].map((faq, i) => (
            <div key={i} className={`landing-faq-item ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="landing-faq-question">
                {faq.q}
                <div className="landing-faq-icon">+</div>
              </div>
              <div className="landing-faq-answer">{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-bg" />
        <h2 className="landing-cta-title landing-reveal" >Prêt à reprendre<br /><em>le contrôle</em> ?</h2>
        <p className="landing-cta-sub landing-reveal" >Rejoignez 124 indépendants qui gèrent leur business sans friction.</p>
        <div className="flex gap-2 max-w-[400px] mx-auto landing-reveal" >
          <input type="email" className="landing-cta-input" placeholder="votre@email.fr" />
          <Link href="/pricing" className="landing-btn-primary" style={{ padding: '14px 20px', fontSize: 14, whiteSpace: 'nowrap' }}>Commencer →</Link>
        </div>
        <div className="text-xs mt-3" style={{ color: 'var(--landing-text-sm)' }}>Gratuit · Sans carte bancaire · Installation en 2 minutes</div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="landing-footer-logo">
            <div className="landing-footer-logo-mark">ES</div>
            <span className="font-bold text-[13px] tracking-tight" style={{ color: 'var(--landing-text)' }}>Eclipse Studio</span>
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
        <span>© 2026 Eclipse Studio. Tous droits réservés.</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--landing-text-sm)' }}>Made in France 🇫🇷</span>
      </div>
    </div>
  );
}
