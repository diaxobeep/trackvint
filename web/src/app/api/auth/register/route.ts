import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from '@/lib/env';
import { corsJson, corsOptions } from '@/lib/cors';

function demoToken(email: string, name?: string) {
  const token = Buffer.from(
    JSON.stringify({
      sub: `demo:${email}`,
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

    if (isDemoMode()) {
      const token = demoToken(email, fullName);
      return corsJson({
        ok: true,
        demo: true,
        token,
        message: 'Compte démo créé',
        user: { email, name: fullName || email.split('@')[0] },
      });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Création admin = session immédiate (pas d'attente email)
    if (serviceKey) {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr) {
        // Compte déjà existant → tenter login
        if (/already|registered|exists/i.test(createErr.message)) {
          const anonClient = createClient(url, anon);
          const { data: signed, error: signErr } =
            await anonClient.auth.signInWithPassword({ email, password });
          if (signErr || !signed.session) {
            return corsJson(
              { ok: false, error: 'Compte déjà existant — connecte-toi' },
              { status: 400 },
            );
          }
          return corsJson({
            ok: true,
            token: signed.session.access_token,
            user: {
              id: signed.user.id,
              email: signed.user.email,
              name: fullName || email.split('@')[0],
            },
            message: 'Connecté',
          });
        }
        return corsJson({ ok: false, error: createErr.message }, { status: 400 });
      }

      // Générer une session via login
      const anonClient = createClient(url, anon);
      const { data: signed, error: signErr } = await anonClient.auth.signInWithPassword({
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
        session: signed.session,
        user: {
          id: signed.user.id,
          email: signed.user.email,
          name: fullName || email.split('@')[0],
        },
        message: 'Compte créé',
      });
    }

    const supabase = createClient(url, anon);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://trackvint.vercel.app'}/auth`,
      },
    });
    if (error) {
      return corsJson({ ok: false, error: error.message }, { status: 400 });
    }
    return corsJson({
      ok: true,
      user: data.user,
      session: data.session,
      token: data.session?.access_token || null,
      message: data.session
        ? 'Compte créé'
        : 'Compte créé — vérifie ton email si demandé',
    });
  } catch (err) {
    return corsJson(
      { ok: false, error: err instanceof Error ? err.message : 'Erreur inscription' },
      { status: 500 },
    );
  }
}
