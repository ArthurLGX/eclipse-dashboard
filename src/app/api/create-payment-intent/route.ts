import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Vérifier que la clé secrète Stripe est définie
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request: NextRequest) {
  // Vérifier la configuration Stripe
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not defined');
    return NextResponse.json(
      { error: 'Stripe n\'est pas configuré. Contactez l\'administrateur.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil',
  });

  try {
    const { planId, billingType, amount } = await request.json();


    // Vérifier que le montant est suffisant (minimum 50 centimes pour EUR)
    if (amount < 50) {
      console.error('Montant trop faible:', amount, 'centimes (minimum 50)');
      return NextResponse.json(
        {
          error: 'Le montant minimum est de 0.50€',
          receivedAmount: amount,
          minimumAmount: 50,
        },
        { status: 400 }
      );
    }

    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Montant en centimes
      currency: 'eur',
      metadata: {
        planId: planId.toString(),
        billingType,
      },
      // En mode test, vous pouvez utiliser ces cartes de test :
      // 4242 4242 4242 4242 (Visa)
      // 4000 0000 0000 0002 (Visa déclinée)
      // 4000 0000 0000 9995 (Visa avec 3D Secure)
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
