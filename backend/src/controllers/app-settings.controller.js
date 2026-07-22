/**
 * Page réglages SaaS TrackVint.
 */
export function appSettings(_req, res) {
  res.type('html').send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TrackVint · Réglages</title>
  <style>
    :root {
      --bg: #f4f6f3; --card: #fff; --text: #14201a; --muted: #5c6b63;
      --accent: #92ef4a; --on: #0b1702; --border: #dde5df;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(900px 420px at 10% -10%, #e7f8d4 0%, transparent 55%),
        var(--bg);
    }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 28px; border-bottom: 1px solid var(--border);
      background: rgba(244,246,243,0.85); position: sticky; top: 0;
    }
    .brand { font-weight: 800; letter-spacing: -0.03em; font-size: 1.2rem; }
    .brand span { color: #3f8f14; }
    a { color: var(--muted); text-decoration: none; font-weight: 600; font-size: 0.85rem; }
    a:hover { color: var(--text); }
    main { max-width: 560px; margin: 0 auto; padding: 28px 20px 64px; }
    h1 { font-size: 1.45rem; letter-spacing: -0.03em; margin: 0 0 8px; }
    .lead { color: var(--muted); margin: 0 0 22px; }
    .card {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px; margin-bottom: 14px; box-shadow: 0 8px 24px rgba(20,32,26,0.05);
    }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 10px 0; }
    .label { font-size: 0.78rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-weight: 750; }
    .btn {
      border: none; background: var(--accent); color: var(--on); font-weight: 700;
      padding: 10px 14px; border-radius: 10px; cursor: pointer; font: inherit;
    }
    .btn.ghost { background: var(--card); border: 1px solid var(--border); color: var(--text); }
    .msg { font-size: 0.85rem; color: var(--muted); min-height: 1.2em; margin-top: 8px; }
    .ok { color: #2f6f0f; }
    .err { color: #dc2626; }
  </style>
</head>
<body>
  <header>
    <div class="brand">Track<span>Vint</span></div>
    <a href="/app">← Dashboard</a>
  </header>
  <main>
    <h1>Réglages</h1>
    <p class="lead">Compte démo, plan et préférences locales.</p>

    <div class="card">
      <div class="label">Session</div>
      <div class="row"><span>Email</span><span class="value" id="email">—</span></div>
      <div class="row"><span>Plan</span><span class="value" id="plan">—</span></div>
      <div class="row">
        <button class="btn" type="button" id="btn-login">Connexion démo</button>
        <button class="btn ghost" type="button" id="btn-upgrade">Passer Pro</button>
      </div>
      <p class="msg" id="msg"></p>
    </div>

    <div class="card">
      <div class="label">API</div>
      <div class="row"><span>Base</span><span class="value">localhost:3000</span></div>
      <div class="row"><span>Health</span><span class="value" id="health">…</span></div>
    </div>
  </main>
  <script>
    const tokenKey = 'tv_web_jwt';
    const msg = document.getElementById('msg');

    function setMsg(text, ok) {
      msg.textContent = text || '';
      msg.className = 'msg ' + (ok ? 'ok' : 'err');
    }

    async function login() {
      setMsg('Connexion…');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@trackvint.local', password: 'demo' }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error || 'Erreur', false);
      localStorage.setItem(tokenKey, data.token);
      document.getElementById('email').textContent = data.user?.email || '—';
      setMsg('Connecté', true);
      await loadSub();
    }

    async function loadSub() {
      const token = localStorage.getItem(tokenKey);
      if (!token) return;
      const res = await fetch('/api/extension/subscription', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) return;
      const data = await res.json();
      document.getElementById('plan').textContent = (data.plan || 'free').toUpperCase();
    }

    async function upgrade() {
      const token = localStorage.getItem(tokenKey);
      if (!token) return setMsg('Connecte-toi d’abord', false);
      const res = await fetch('/api/extension/subscription/upgrade', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: 'pro' }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error || 'Échec', false);
      document.getElementById('plan').textContent = (data.plan || 'pro').toUpperCase();
      setMsg('Plan Pro activé (mock)', true);
    }

    async function health() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        document.getElementById('health').textContent = data.ok ? 'OK · ' + data.version : 'KO';
      } catch {
        document.getElementById('health').textContent = 'Hors ligne';
      }
    }

    document.getElementById('btn-login').addEventListener('click', login);
    document.getElementById('btn-upgrade').addEventListener('click', upgrade);
    health();
    if (localStorage.getItem(tokenKey)) {
      document.getElementById('email').textContent = 'demo@trackvint.local';
      loadSub();
    }
  </script>
</body>
</html>`);
}
