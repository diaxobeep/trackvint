import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv, siteUrl } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();

    if (!email || !email.includes('@') || password.length < 6) {
      return corsJson(
        { ok: false, error: 'Email et mot de passe (6+ caractères) requis' },
        { status: 400 },
      );
    }

    const { url, anon } = requireSupabaseEnv();
    const admin = createAdminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createErr) {
      if (/already|registered|exists/i.test(createErr.message)) {
        return corsJson(
          { ok: false, error: 'Compte déjà existant — connecte-toi' },
          { status: 400 },
        );
      }
      return corsJson({ ok: false, error: createErr.message }, { status: 400 });
    }

    const supabase = createClient(url, anon);
    const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signErr || !signed.session) {
      return corsJson({
        ok: true,
        user: created.user,
        token: null,
        message: 'Compte créé — connecte-toi',
      });
    }

    return corsJson({
      ok: true,
      token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
      session: signed.session,
      user: {
        id: signed.user.id,
        email: signed.user.email,
        name: fullName || email.split('@')[0],
      },
      message: 'Compte créé',
      emailRedirectTo: `${siteUrl()}/auth`,
    });
  } catch (err) {
    return corsJson(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur inscription',
      },
      { status: 500 },
    );
  }
}
