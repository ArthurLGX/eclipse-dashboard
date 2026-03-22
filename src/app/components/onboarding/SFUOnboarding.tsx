'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { IconX, IconArrowLeft, IconArrowRight, IconMail, IconBrandWhatsapp } from '@tabler/icons-react';
import { useAuth } from '@/app/context/AuthContext';
import { useClients } from '@/hooks/useApi';
import type { Client } from '@/types';

const FALLBACK_PERSONAS = [
  { name: 'Sophie Martin', title: 'Creative Project Manager · Freelance', source: 'Walego' },
  { name: 'Marc Dubois', title: 'Dirigeant · TPE', source: 'Email direct' },
  { name: 'Julie Bernard', title: 'Responsable Marketing · PME', source: 'Inbound' },
];

function buildPersonas(contacts: Client[]): typeof FALLBACK_PERSONAS {
  return FALLBACK_PERSONAS.map((fallback, i) => {
    const contact = Array.isArray(contacts) ? contacts[i] : null;
    if (!contact) return fallback;
    return {
      name: contact.name || fallback.name,
      title: contact.enterprise || contact.name || fallback.title,
      source: fallback.source,
    };
  });
}

const STEPS = (
  userName: string,
  personas: typeof FALLBACK_PERSONAS
) => [
  {
    title: 'Bienvenue dans Smart Follow-Up',
    content: (
      <>
        <p className="!text-sm !text-muted mb-4">
          Smart Follow-Up scanne automatiquement vos emails entrants, qualifie vos leads et vous propose des actions concrètes.
        </p>
        <p className="!text-sm font-medium !text-primary">
          Fini les leads perdus dans le brouillard.
        </p>
        <div className="flex justify-center gap-4 mt-6 text-muted">
          <span className="flex items-center gap-1.5">
            <IconMail className="w-5 h-5" />
            Email
          </span>
          <span>→</span>
          <span className="flex items-center gap-1.5">
            <span className="font-semibold !text-primary">IA</span>
          </span>
          <span>→</span>
          <span className="flex items-center gap-1.5">
            <IconBrandWhatsapp className="w-5 h-5" />
            WhatsApp
          </span>
        </div>
      </>
    ),
  },
  {
    title: '🔴 Cas 1 — Un lead Walego répond',
    content: (
      <>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Scénario</p>
        <p className="!text-sm !text-muted mb-4">
          {userName} prospecte sur LinkedIn via Walego. {personas[0].name} répond : &quot;Bonjour, comment travaillez-vous ?&quot;
        </p>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce qui se passe automatiquement</p>
        <ul className="!text-sm !text-muted space-y-1 mb-4 list-disc list-inside">
          <li>Le mail est détecté comme source Walego (bypass ICP)</li>
          <li>Le Mail Scanner analyse la réponse</li>
          <li>Score : 🟠 Tiède — intérêt exprimé, pas de RDV</li>
          <li>Action suggérée : &quot;Expliquer le process en 2 phrases et proposer un call&quot;</li>
          <li>Draft pré-rédigé prêt à envoyer</li>
          <li>Notification WhatsApp : &quot;🟠 Walego · {personas[0].name} — Demande comment vous travaillez&quot;</li>
        </ul>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce que {userName} fait</p>
        <p className="!text-sm !text-muted">Ouvre la notif, lit le draft, l&apos;envoie en 1 clic</p>
      </>
    ),
  },
  {
    title: '🔴 Cas 2 — Un prospect demande un devis',
    content: (
      <>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Scénario</p>
        <p className="!text-sm !text-muted mb-4">
          {personas[1].name} envoie un email : &quot;Bonjour, je cherche quelqu&apos;un pour refaire mon site. Budget : 3 000€. Pouvez-vous chiffrer ?&quot;
        </p>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce qui se passe automatiquement</p>
        <ul className="!text-sm !text-muted space-y-1 mb-4 list-disc list-inside">
          <li>Mots-clés détectés : &quot;refonte&quot;, &quot;budget&quot;, &quot;chiffrer&quot;</li>
          <li>Score ICP élevé → confidence_score : 0.88</li>
          <li>Score : 🔴 Chaud — budget défini, décideur identifié</li>
          <li>Action : &quot;Répondre sous 2h avec une trame de devis&quot;</li>
          <li>Draft : message de confirmation de réception + demande de RDV</li>
          <li>Notification WhatsApp immédiate</li>
        </ul>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce que {userName} fait</p>
        <p className="!text-sm !text-muted">Reçoit la notif, ouvre le panel, ajuste le draft, envoie</p>
      </>
    ),
  },
  {
    title: '⚫ Cas 3 — Un email sans intérêt est filtré',
    content: (
      <>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Scénario</p>
        <p className="!text-sm !text-muted mb-4">
          Une newsletter de &quot;MarketingTools Pro&quot; arrive dans la boîte.
        </p>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce qui se passe automatiquement</p>
        <ul className="!text-sm !text-muted space-y-1 mb-4 list-disc list-inside">
          <li>Domaine détecté comme marketing</li>
          <li>Rejeté à l&apos;étape 1 — jamais traité</li>
          <li>N&apos;apparaît pas dans le tableau</li>
          <li>Aucune notification</li>
        </ul>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce que {userName} fait</p>
        <p className="!text-sm !text-muted">Rien. L&apos;email n&apos;existe pas pour Smart Follow-Up.</p>
      </>
    ),
  },
  {
    title: '📅 Cas 4 — Un prospect confirme un rendez-vous',
    content: (
      <>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Scénario</p>
        <p className="!text-sm !text-muted mb-4">
          {personas[2].name} répond : &quot;Demain 14h c&apos;est parfait pour moi. Je vous laisse regarder mon site : marc-renaud.fr&quot;
        </p>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce qui se passe automatiquement</p>
        <ul className="!text-sm !text-muted space-y-1 mb-4 list-disc list-inside">
          <li>Détection : RDV confirmé</li>
          <li>Score : 🔴 Chaud</li>
          <li>Action : &quot;Visiter marc-renaud.fr avant le call&quot;</li>
          <li>Pas de draft de relance — action de préparation à la place</li>
          <li>Notification : &quot;📅 RDV demain 14h — {personas[2].name}&quot;</li>
        </ul>
        <p className="font-mono !text-[11px] !text-muted uppercase mb-2">Ce que {userName} fait</p>
        <p className="!text-sm !text-muted">Visite le site, prépare 3 questions, arrive prêt au call</p>
      </>
    ),
  },
  {
    title: '⚙️ Configurez votre Smart Follow-Up en 2 minutes',
    content: (
      <>
        <p className="!text-sm !text-muted mb-4">3 choses à faire maintenant :</p>
        <ol className="!text-sm !text-muted space-y-3 list-decimal list-inside">
          <li>
            <strong className="!text-primary">Instruction IA</strong> — Décrivez votre activité et vos priorités en quelques lignes. Plus c&apos;est précis, plus les suggestions sont pertinentes.
            <span className="block !text-[11px] mt-0.5 !text-muted">→ Paramètres → Instruction IA</span>
          </li>
          <li>
            <strong className="!text-primary">Mots-clés importants</strong> — Ajoutez les mots qui signalent un lead chaud : ex. &quot;devis&quot;, &quot;refonte&quot;, &quot;budget&quot;, &quot;urgent&quot;
            <span className="block !text-[11px] mt-0.5 !text-muted">→ Paramètres → Mots-clés</span>
          </li>
          <li>
            <strong className="!text-primary">Notification WhatsApp</strong> — Configurez votre numéro pour recevoir les alertes en temps réel.
            <span className="block !text-[11px] mt-0.5 !text-muted">→ Paramètres → WhatsApp</span>
          </li>
        </ol>
      </>
    ),
  },
];

const STORAGE_KEY = 'sfu_onboarding_done';

export function hasSeenSFUOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return !!localStorage.getItem(STORAGE_KEY);
}

export function markSFUOnboardingDone(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, '1');
  }
}

export function resetSFUOnboarding(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}

interface SFUOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SFUOnboarding({ isOpen, onClose }: SFUOnboardingProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: clientsData } = useClients(user?.id);
  const [step, setStep] = useState(0);

  const userName = user?.username?.split(' ')[0] || user?.username || 'Vous';
  const clients = (clientsData as { data?: Client[] })?.data ?? [];
  const personas = buildPersonas(clients);
  const steps = STEPS(userName, personas);
  const isLastStep = step === steps.length - 1;

  const handleClose = () => {
    markSFUOnboardingDone();
    onClose();
  };

  const handleGoToSettings = () => {
    markSFUOnboardingDone();
    onClose();
    router.push('/dashboard/smart-follow-up/settings');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card border border-default w-full max-w-[600px] mx-4 rounded-lg shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-default bg-muted/30">
            <div className="font-mono !text-[10px] !text-muted uppercase tracking-wider">
              Étape {step + 1} / {steps.length}
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 !text-muted hover:!text-primary transition-colors"
              aria-label="Passer l'intro"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="!text-lg font-semibold !text-primary mb-4">
                  {steps[step].title}
                </h2>
                {steps[step].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-default bg-muted/20">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? 'bg-primary' : 'bg-default hover:bg-muted'
                  }`}
                  aria-label={`Aller à l'étape ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 !text-xs font-medium !text-muted hover:!text-primary border border-default hover:border-[#ccc8c2]"
                >
                  <IconArrowLeft className="w-3.5 h-3.5" />
                  Précédent
                </button>
              )}
              {isLastStep ? (
                <>
                  <button
                    onClick={handleGoToSettings}
                    className="px-4 py-2 !text-xs font-semibold border border-default !text-muted hover:!text-primary hover:border-[#ccc8c2]"
                  >
                    Voir les paramètres
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 !text-xs font-semibold bg-primary !text-white hover:opacity-90"
                  >
                    C&apos;est parti !
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 !text-xs font-semibold bg-primary !text-white hover:opacity-90"
                >
                  Suivant
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Passer - lien discret en bas */}
          <div className="text-center pb-2">
            <button
              onClick={handleClose}
              className="!text-[11px] !text-muted hover:!text-primary underline"
            >
              Passer l&apos;introduction
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
