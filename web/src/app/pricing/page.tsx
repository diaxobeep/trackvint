'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { PLANS } from '@/lib/plans';
import './pricing.css';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function checkout(plan: 'starter' | 'pro') {
    setLoading(plan);
    setMsg('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.message || 'Stripe non configuré — ajoute STRIPE_* dans Vercel.');
    } catch {
      setMsg('Impossible de démarrer le checkout.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="pricing-page">
      <SiteHeader />
      <main className="container pricing-main">
        <h1>Tarifs simples</h1>
        <p className="lead">Passe Pro quand tu trackes plus de niches. Annulable à tout moment.</p>
        {msg ? <p className="pricing-msg">{msg}</p> : null}
        <div className="pricing-grid">
          <article className="plan">
            <h2>Free</h2>
            <p className="price">0 €</p>
            <ul>
              <li>2 trackers</li>
              <li>Dashboard web</li>
              <li>Sync extension</li>
            </ul>
            <Link href="/auth" className="btn btn-ghost">
              Commencer
            </Link>
          </article>
          {(['starter', 'pro'] as const).map((key) => {
            const plan = PLANS[key];
            return (
              <article key={key} className={`plan ${key === 'pro' ? 'plan-hot' : ''}`}>
                <h2>{plan.name}</h2>
                <p className="price">{plan.priceLabel}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading === key}
                  onClick={() => checkout(key)}
                >
                  {loading === key ? 'Redirection…' : `Choisir ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
