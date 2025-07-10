import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { planId, billingType, amount } = await request.json();

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
