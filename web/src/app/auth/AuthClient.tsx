'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { loginAccount, pushJwtToExtension, registerAccount } from '@/lib/api';
import { SiteHeader } from '@/components/SiteHeader';
import './auth.css';

export default function AuthClient() {
  const router = useRouter();
  const params = useSearchParams();
  const ext = params.get('ext');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  function goApp(token?: string) {
    if (token) {
      localStorage.setItem('tv_web_jwt', token);
      void pushJwtToExtension(token);
    }
    router.push(ext ? `/app?ext=${encodeURIComponent(ext)}` : '/app');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (ext) localStorage.setItem('tv_ext_id', ext);

      if (mode === 'register') {
        const data = await registerAccount({ email, password, fullName });
        if (data.token) {
          if (supabase && data.session) {
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
          }
          goApp(data.token);
          return;
        }
        setInfo(data.message || 'Compte créé — connecte-toi');
        setMode('login');
        return;
      }

      const data = await loginAccount(email, password);
      if (supabase) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => null);
      }
      goApp(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <SiteHeader />
      <main className="auth-main">
        <form className="auth-card" onSubmit={onSubmit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => setMode('login')}
            >
              Connexion
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => setMode('register')}
            >
              Inscription
            </button>
          </div>
          <h1>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
          <p>Auth sécurisée via Supabase</p>
          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-info">{info}</div> : null}
          {mode === 'register' ? (
            <>
              <label htmlFor="name">Nom</label>
              <input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ton pseudo"
              />
            </>
          ) : null}
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@email.com"
            required
            autoComplete="email"
          />
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'login' ? '••••••••' : '6 caractères min.'}
            required
            minLength={mode === 'register' ? 6 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading
              ? '…'
              : mode === 'login'
                ? 'Se connecter'
                : "S'inscrire"}
          </button>
          <Link href="/pricing">Voir les offres Pro →</Link>
        </form>
      </main>
    </div>
  );
}
