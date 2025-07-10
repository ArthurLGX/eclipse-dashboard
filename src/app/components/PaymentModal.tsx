'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/context/LanguageContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Charger Stripe avec la clé publique
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Créer l'intention de paiement côté serveur
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          billingType,
          amount:
            billingType === 'yearly'
              ? plan.price_yearly * 100
              : plan.price_monthly * 100, // Stripe utilise les centimes
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
    billingType === 'yearly' ? plan.price_yearly : plan.price_monthly;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">
            {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan
          </h3>
          <p className="text-zinc-400 text-sm mb-3">{plan.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-400">
              {language === 'fr' ? '' : '€'}
              {billingType === 'yearly'
                ? (plan.price_yearly * 12).toFixed(2)
                : plan.price_monthly.toFixed(2)}
              {language === 'fr' ? '€' : ''}
            </span>
            <span className="text-zinc-400 text-sm">
              {billingType === 'yearly' ? t('per_year') : t('per_month')}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-zinc-300 text-sm font-medium">
            {t('card_information')}
          </label>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#e4e4e7',
                    '::placeholder': {
                      color: '#71717a',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-zinc-800 text-zinc-300 px-4 py-3 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-emerald-500 text-black px-4 py-3 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-200">
                {t('payment_details')}
              </h2>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
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

            <Elements stripe={stripePromise}>
              <CheckoutForm
                plan={plan}
                billingType={billingType}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            </Elements>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
