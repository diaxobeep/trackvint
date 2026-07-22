import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from '@/lib/env';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return corsJson(
        { ok: false, error: 'Email et mot de passe requis' },
        { status: 400 },
      );
    }

    const { url, anon } = requireSupabaseEnv();
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
      refresh_token: data.session.refresh_token,
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
      { ok: false, error: err instanceof Error ? err.message : 'Erreur login' },
      { status: 500 },
    );
  }
}
