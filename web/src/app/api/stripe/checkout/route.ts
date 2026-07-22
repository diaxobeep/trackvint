import { NextRequest, NextResponse } from 'next/server';
import { getStripe, stripePriceId } from '@/lib/stripe';
import { siteUrl } from '@/lib/env';
import type { PlanId } from '@/lib/plans';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const plan = (body.plan === 'starter' ? 'starter' : 'pro') as PlanId;
  const stripe = getStripe();
  const priceId = stripePriceId(plan);

  if (!stripe || !priceId) {
    return NextResponse.json({
      ok: false,
      message:
        'Stripe non configuré. Ajoute STRIPE_SECRET_KEY + STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO sur Vercel.',
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl()}/app?checkout=success`,
    cancel_url: `${siteUrl()}/pricing?checkout=cancel`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
