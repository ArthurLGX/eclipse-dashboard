'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalFocus } from '@/hooks/useModalFocus';
import { useTheme } from '@/app/context/ThemeContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Charger Stripe avec la clé publique
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: number;
    name: string;
    price_monthly: number;
    price_yearly: number;
    description: string;
  };
  billingType: 'monthly' | 'yearly';
  onSuccess: () => void;
}

// Composant de formulaire de paiement Stripe
const CheckoutForm: React.FC<{
  plan: PaymentModalProps['plan'];
  billingType: 'monthly' | 'yearly';
  onSuccess: () => void;
  onClose: () => void;
}> = ({ plan, billingType, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Couleurs adaptées au thème
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: theme === 'dark' ? '#e4e4e7' : '#18181b',
        backgroundColor: 'transparent',
        '::placeholder': {
          color: theme === 'dark' ? '#71717a' : '#a1a1aa',
        },
        iconColor: theme === 'dark' ? '#a1a1aa' : '#71717a',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculer le montant correct (Stripe utilise les centimes)
      // price_yearly = montant mensuel pour un abonnement annuel
      const amount = Math.round(
        billingType === 'yearly'
          ? plan.price_yearly * 100 * 12 // Montant mensuel × 12 mois
          : plan.price_monthly * 100 // Montant mensuel
      );

      // Vérifier que le montant est suffisant
      if (amount < 50) {
        setError('Le montant minimum est de 0.50€');
        setLoading(false);
        return;
      }


      // Créer l'intention de paiement côté serveur
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          billingType,
          amount: amount, // Stripe utilise les centimes
        }),
      });

      const { clientSecret } = await response.json();

      // Confirmer le paiement
      const { error: paymentError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        }
      );

      if (paymentError) {
        setError(paymentError.message || 'Erreur de paiement');
      } else {
        onSuccess();
      }
    } catch {
      setError('Erreur lors du traitement du paiement');
    } finally {
      setLoading(false);
    }
  };

  const price =
    billingType === 'yearly' ? plan.price_yearly * 12 : plan.price_monthly;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="bg-hover/50 p-4 rounded-lg border border-default">
          <h3 className="!text-lg font-semibold text-primary mb-2">
            {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan
          </h3>
          <p className="text-secondary !text-sm mb-3">{plan.description}</p>
          <div className="flex items-center justify-between">
            <span className="!text-2xl font-bold text-accent">
              {language === 'fr' ? '' : '€'}
              {billingType === 'yearly'
                ? (plan.price_yearly * 12).toFixed(2)
                : plan.price_monthly.toFixed(2)}
              {language === 'fr' ? '€' : ''}
            </span>
            <span className="text-secondary !text-sm">
              {billingType === 'yearly' ? t('per_year') : t('per_month')}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-secondary !text-sm font-medium">
            {t('card_information')}
          </label>
          <div className="bg-page border border-default rounded-lg p-4 min-h-[50px]">
            <CardElement options={cardElementOptions} />
          </div>
        </div>

        {error && (
          <div className="bg-danger-light border border-danger/30 rounded-lg p-3">
            <p className="text-danger !text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-hover text-secondary px-4 py-3 rounded-lg hover:bg-card transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-accent text-white px-4 py-3 rounded-lg hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {loading
            ? t('processing')
            : `${t('pay')} ${language === 'fr' ? '€' : '$'}${price}`}
        </button>
      </div>
    </form>
  );
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingType,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const modalRef = useModalFocus(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Overlay avec blur et opacity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-card rounded-xl border border-default p-6 w-full max-w-md outline-none"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="!text-xl font-bold text-primary">
                {t('payment_details')}
              </h2>
              <button
                onClick={onClose}
                className="text-secondary hover:text-primary transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {!stripePublishableKey ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-primary font-medium mb-2">
                  {t('stripe_not_configured') || 'Stripe non configuré'}
                </p>
                <p className="text-secondary text-sm">
                  {t('stripe_config_message') || 'La clé Stripe n\'est pas définie. Contactez l\'administrateur.'}
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 bg-hover text-secondary px-4 py-2 rounded-lg hover:bg-card transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  plan={plan}
                  billingType={billingType}
                  onSuccess={onSuccess}
                  onClose={onClose}
                />
              </Elements>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
