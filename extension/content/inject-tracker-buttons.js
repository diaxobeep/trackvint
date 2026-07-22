/**
 * Boutons injectés sur Vinted :
 * - /member/... → "Tracker ce vendeur"
 * - /catalog/... → "Tracker cette recherche"
 * Envoie window.location.href → POST /api/trackers/add
 */

(function injectTrackerButtons() {
  const BTN_ID = 'tv-page-tracker-btn';

  function apiBase() {
    return 'https://trackvint.vercel.app';
  }

  async function resolveApiBase() {
    try {
      const cfg = await chrome.storage.local.get(['tv_api_base']);
      return cfg.tv_api_base || apiBase();
    } catch {
      return apiBase();
    }
  }

  function detectKind(href) {
    try {
      const u = new URL(href);
      if (/\/member\/\d+/i.test(u.pathname)) return 'seller';
      if (/\/catalog/i.test(u.pathname) || u.searchParams.has('search_text')) return 'search';
    } catch {
      /* ignore */
    }
    return null;
  }

  function ensureButton() {
    const kind = detectKind(location.href);
    const existing = document.getElementById(BTN_ID);
    if (!kind) {
      existing?.remove();
      return;
    }

    const label =
      kind === 'seller' ? 'Tracker ce vendeur' : 'Tracker cette recherche';

    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      Object.assign(btn.style, {
        position: 'fixed',
        right: '18px',
        bottom: '160px',
        zIndex: '2147483645',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 14px',
        background: '#92ef4a',
        color: '#0b1702',
        fontWeight: '800',
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        fontFamily: 'system-ui,sans-serif',
      });
      document.documentElement.appendChild(btn);
      btn.addEventListener('click', onClick);
    }
    btn.textContent = label;
    btn.dataset.kind = kind;
  }

  async function onClick() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = '…';
    btn.disabled = true;
    try {
      const base = await resolveApiBase();
      const { tv_jwt } = await chrome.storage.local.get(['tv_jwt']).catch(() => ({}));
      const endpoints = [
        `${base.replace(/\/$/, '')}/api/trackers/add`,
        'https://trackvint.vercel.app/api/trackers/add',
        'http://127.0.0.1:3000/api/trackers/add',
      ];
      let lastErr = 'Erreur';
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              ...(tv_jwt ? { Authorization: `Bearer ${tv_jwt}` } : {}),
            },
            body: JSON.stringify({ url: location.href }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            btn.textContent = '✓ Tracké';
            setTimeout(() => {
              btn.textContent = prev;
              btn.disabled = false;
            }, 1600);
            return;
          }
          lastErr = data.error || lastErr;
        } catch (e) {
          lastErr = e?.message || lastErr;
        }
      }
      throw new Error(lastErr);
    } catch (err) {
      btn.textContent = 'Erreur';

      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, 1800);
    }
  }

  ensureButton();
  let last = location.href;
  setInterval(() => {
    if (location.href !== last) {
      last = location.href;
      ensureButton();
    }
  }, 800);
})();
