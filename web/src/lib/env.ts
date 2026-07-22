export function isDemoMode() {
  // Forcer explicitement
  if (process.env.DEMO_MODE === '1') return true;
  if (process.env.DEMO_MODE === '0') return false;
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return !hasSupabase;
}

/**
 * Base URL API côté navigateur = always same-origin ('').
 * NEXT_PUBLIC_API_URL n'est utilisé que si c'est une URL publique non-localhost.
 * → Évite « Failed to fetch » vers 127.0.0.1 depuis Vercel.
 */
export function apiBaseUrl() {
  if (typeof window !== 'undefined') {
    const configured = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (!configured || configured === 'same-origin') return '';
    if (/127\.0\.0\.1|localhost/i.test(configured)) return '';
    // Ne jamais quitter le site pour l'auth/dashboard — same-origin Next
    return '';
  }

  // Serveur uniquement : proxy crawler Express si déployé
  const server =
    process.env.TRACKVINT_API_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://127.0.0.1:3001';
  if (/127\.0\.0\.1|localhost/i.test(server) && process.env.VERCEL) {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://trackvint.vercel.app';
  }
  return server.replace(/\/$/, '');
}

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3001'
  );
}
