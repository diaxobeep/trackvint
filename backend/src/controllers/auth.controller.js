import { store } from '../data/store.js';
import { signUserToken } from '../middlewares/auth.js';

const DEMO_USER = store.user;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * → { token, user }
 */
export function login(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  // Mock : accepte le user seed + n'importe quel email avec password "demo"
  const emailOk =
    email === DEMO_USER.email.toLowerCase() ||
    email === 'demo@trackvint.local' ||
    email.endsWith('@trackvint.local');

  if (!emailOk || password !== DEMO_PASSWORD) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const user = {
    ...DEMO_USER,
    email: email.includes('@') ? email : DEMO_USER.email,
  };

  const token = signUserToken(user);
  return res.json({ token, user });
}

/**
 * GET /api/auth/get-session
 */
export function getSession(req, res) {
  if (!req.user) {
    return res.json({});
  }
  return res.json({ user: req.user });
}

/**
 * POST /api/auth/sign-out
 * Côté client : suppression du JWT. Ici no-op serveur (stateless JWT).
 */
export function signOut(_req, res) {
  return res.json({ ok: true });
}

/**
 * GET /api/auth/extension-init?provider=
 * Pour compat : émet un JWT via page HTML que l'extension peut lire,
 * ou redirige avec token en query (mock).
 */
export function extensionInit(req, res) {
  const provider = String(req.query.provider || 'google');
  const allowed = new Set(['google', 'discord']);
  if (!allowed.has(provider)) {
    return res.status(400).json({ error: 'invalid_provider' });
  }

  const token = signUserToken(DEMO_USER);
  const callback = `/auth/extension-callback?done=1&provider=${encodeURIComponent(provider)}&token=${encodeURIComponent(token)}`;
  return res.redirect(302, callback);
}

export function extensionCallback(req, res) {
  const token = String(req.query.token || '');
  res.type('html').send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Auth OK</title></head>
<body style="background:#000;color:#92ef4a;font:16px system-ui;padding:24px">
  <h1>Connexion réussie</h1>
  <p>Tu peux fermer cet onglet et revenir à l'extension.</p>
  <p>Provider: ${String(req.query.provider || '')}</p>
  <script>
    // L'extension peut récupérer le token via tabs / content script si besoin
    window.__TRACKVINT_JWT__ = ${JSON.stringify(token)};
  </script>
</body></html>`);
}
