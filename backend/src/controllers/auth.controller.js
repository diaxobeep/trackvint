import { store } from '../data/store.js';

/**
 * POST /api/auth/login
 * L'auth produit est sur Next/Supabase (trackvint.vercel.app).
 * Express crawler n'émet plus de JWT démo.
 */
export function login(_req, res) {
  return res.status(501).json({
    error: 'auth_via_web',
    message: 'Connecte-toi sur https://trackvint.vercel.app/auth',
  });
}

export function getSession(req, res) {
  if (!req.user) return res.json({});
  return res.json({ user: req.user });
}

export function signOut(_req, res) {
  return res.json({ ok: true });
}

export function extensionInit(_req, res) {
  return res.status(501).json({
    error: 'auth_via_web',
    message: 'Ouvre le site web pour te connecter, puis lie l’extension.',
  });
}

export function extensionCallback(_req, res) {
  return res.redirect(302, 'https://trackvint.vercel.app/auth');
}

// Compat store plan
void store;
