'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { loginDemo, pushJwtToExtension } from '@/lib/api';
import { SiteHeader } from '@/components/SiteHeader';
import './auth.css';

export default function AuthClient() {
  const router = useRouter();
  const params = useSearchParams();
  const ext = params.get('ext');
  const [email, setEmail] = useState('demo@trackvint.local');
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (ext) localStorage.setItem('tv_ext_id', ext);

      if (supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.push(ext ? `/app?ext=${encodeURIComponent(ext)}` : '/app');
        return;
      }

      const data = await loginDemo();
      await pushJwtToExtension(data.token);
      router.push(ext ? `/app?ext=${encodeURIComponent(ext)}` : '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <SiteHeader />
      <main className="auth-main">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>Connexion</h1>
          <p>
            {supabase
              ? 'Compte Supabase'
              : 'Mode démo — même session que l’extension'}
          </p>
          {error ? <div className="auth-error">{error}</div> : null}
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="auth-hint">
            Démo : <code>demo@trackvint.local</code> / <code>demo</code>
          </p>
          <Link href="/pricing">Voir les offres Pro →</Link>
        </form>
      </main>
    </div>
  );
}
