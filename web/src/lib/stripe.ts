import Stripe from 'stripe';
import type { PlanId } from './plans';

let stripe: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function stripePriceId(plan: PlanId) {
  if (plan === 'starter') return process.env.STRIPE_PRICE_STARTER || '';
  return process.env.STRIPE_PRICE_PRO || '';
}
