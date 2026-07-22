/** Supabase obligatoire — plus de mode démo. */
export function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase non configuré (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)');
  }
  return { url, anon };
}

export function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Base URL API côté navigateur = always same-origin.
 */
export function apiBaseUrl() {
  if (typeof window !== 'undefined') return '';
  const server =
    process.env.TRACKVINT_API_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://127.0.0.1:3001';
  return server.replace(/\/$/, '');
}

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3001'
  );
}
