/**
 * Page /auth — connexion web pour l'extension TrackVint.
 */
export function authPage(req, res) {
  const extId = String(req.query.ext || '');
  res.type('html').send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connexion · TrackVint</title>
  <style>
    :root {
      --bg: #f4f6f3;
      --card: #ffffff;
      --text: #14201a;
      --muted: #5c6b63;
      --accent: #92ef4a;
      --on-accent: #0b1702;
      --border: #e2e8e4;
      --danger: #dc2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: radial-gradient(1200px 600px at 50% -10%, #e8f9d8 0%, var(--bg) 55%);
      color: var(--text);
    }
    .card {
      width: min(400px, calc(100vw - 32px));
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 18px 40px rgba(20, 32, 26, 0.08);
    }
    h1 { margin: 0 0 6px; font-size: 1.35rem; letter-spacing: -0.02em; }
    p { margin: 0 0 20px; color: var(--muted); font-size: 0.92rem; line-height: 1.45; }
    label { display: block; font-size: 0.78rem; font-weight: 600; margin: 0 0 6px; color: var(--muted); }
    input {
      width: 100%; padding: 11px 12px; margin-bottom: 14px;
      border: 1px solid var(--border); border-radius: 10px;
      font: inherit; color: var(--text); background: #fafcfb;
    }
    input:focus { outline: 2px solid rgba(146,239,74,0.45); border-color: var(--accent); }
    button {
      width: 100%; margin-top: 6px; padding: 12px;
      border: none; border-radius: 10px; cursor: pointer;
      background: var(--accent); color: var(--on-accent);
      font: inherit; font-weight: 700;
    }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .error { color: var(--danger); font-size: 0.85rem; min-height: 1.2em; margin-bottom: 8px; }
    .ok { display: none; text-align: center; }
    .ok.show { display: block; }
    .form.hide { display: none; }
    .hint { font-size: 0.8rem; color: var(--muted); margin-top: 14px; }
  </style>
</head>
<body>
  <main class="card">
    <div class="form" id="form-wrap">
      <h1>TrackVint</h1>
      <p>Connecte-toi pour charger tes stats Vinted dans l’extension.</p>
      <div class="error" id="error"></div>
      <form id="form">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" value="" placeholder="toi@email.com" required />
        <label for="password">Mot de passe</label>
        <input id="password" name="password" type="password" value="demo" required />
        <button type="submit" id="submit">Se connecter</button>
      </form>
      <p class="hint">Auth via <a href="https://trackvint.vercel.app/auth">le site web</a></p>
    </div>
    <div class="ok" id="ok">
      <h1>Connecté ✓</h1>
      <p>Tu peux fermer cet onglet et revenir à l’extension TrackVint.</p>
    </div>
  </main>
  <script>
    const EXT_ID = ${JSON.stringify(extId)};
    const form = document.getElementById('form');
    const errorEl = document.getElementById('error');
    const submitBtn = document.getElementById('submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      submitBtn.disabled = true;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token) {
          throw new Error(data.error || 'Connexion impossible');
        }

        // Stockage partagé dashboard web
        try {
          localStorage.setItem('tv_web_jwt', data.token);
          if (EXT_ID) localStorage.setItem('tv_ext_id', EXT_ID);
        } catch (_) {}

        if (EXT_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            await chrome.runtime.sendMessage(EXT_ID, {
              type: 'SET_JWT',
              token: data.token,
              user: data.user,
            });
          } catch (_) { /* extension absente */ }
        }

        document.getElementById('form-wrap').classList.add('hide');
        document.getElementById('ok').classList.add('show');
        // Redirige vers le dashboard lié à l'extension
        setTimeout(() => {
          location.href = '/app' + (EXT_ID ? ('?ext=' + encodeURIComponent(EXT_ID)) : '');
        }, 600);
      } catch (err) {
        errorEl.textContent = err.message || 'Erreur de connexion';
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
}
