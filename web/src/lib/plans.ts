export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceLabel: '19 €/mois',
    features: ['10 trackers', 'Crawler 6h', 'Dashboard web', 'Sync extension'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceLabel: '39 €/mois',
    features: [
      'Trackers illimités',
      'Crawler 5 min',
      'Top vendeurs',
      'Lens visuelle',
      'Support prioritaire',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
