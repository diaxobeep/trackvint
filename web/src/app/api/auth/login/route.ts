import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from '@/lib/env';
import { corsJson, corsOptions } from '@/lib/cors';

function demoToken(email: string, name?: string) {
  const token = Buffer.from(
    JSON.stringify({
      sub: email === 'demo@trackvint.local' ? 'demo' : `demo:${email}`,
      email,
      name: name || email.split('@')[0],
      exp: Date.now() + 7 * 864e5,
    }),
  ).toString('base64url');
  return `demo.${token}`;
}

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return corsJson(
      { ok: false, error: 'Email et mot de passe requis' },
      { status: 400 },
    );
  }

  // Mode démo local (pas de Supabase)
  if (isDemoMode()) {
    const ok =
      (email === 'demo@trackvint.local' && password === 'demo') ||
      email.endsWith('@trackvint.local') ||
      password.length >= 1;
    if (!ok) {
      return corsJson(
        { ok: false, error: 'Identifiants invalides' },
        { status: 401 },
      );
    }
    const token = demoToken(email);
    return corsJson({
      ok: true,
      token,
      user: {
        id: email === 'demo@trackvint.local' ? 'demo' : `demo:${email}`,
        name: email.split('@')[0],
        email,
      },
    });
  }

  // Supabase password login (API route — fallback si client direct échoue)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, anon);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      return corsJson(
        { ok: false, error: error?.message || 'Identifiants invalides' },
        { status: 401 },
      );
    }
    return corsJson({
      ok: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name:
          (data.user.user_metadata?.full_name as string) ||
          email.split('@')[0],
        email: data.user.email,
      },
    });
  } catch (err) {
    return corsJson(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur login',
      },
      { status: 500 },
    );
  }
}
