/**
 * Dashboard web TrackVint — UI type ResellTrack, données = même API que l'extension.
 */
export function appDashboard(_req, res) {
  res.type('html').send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TrackVint · Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #f6f7f5; --sidebar: #fff; --card: #fff; --text: #141a16;
      --muted: #6b776f; --dim: #9aa59c; --border: #e3e8e3;
      --accent: #92ef4a; --accent-strong: #6bc922; --on: #0b1702;
      --soft: rgba(146,239,74,0.14); --warn: #f59e0b; --ok: #22c55e;
      --sidebar-w: 260px; --font: "DM Sans", system-ui, sans-serif;
      --display: Syne, "DM Sans", sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font); color: var(--text); background: var(--bg);
      min-height: 100vh; display: flex;
    }
    a { color: inherit; text-decoration: none; }
    .sidebar {
      width: var(--sidebar-w); flex-shrink: 0; background: var(--sidebar);
      border-right: 1px solid var(--border); display: flex; flex-direction: column;
      height: 100vh; position: sticky; top: 0;
    }
    .logo {
      display: flex; align-items: center; gap: 10px; padding: 18px 16px;
      font-family: var(--display); font-weight: 800; letter-spacing: -0.03em;
    }
    .logo-mark {
      width: 32px; height: 32px; border-radius: 9px; background: var(--accent);
      color: var(--on); display: grid; place-items: center; font-size: 12px; font-weight: 800;
    }
    .nav-section { padding: 8px 12px; }
    .nav-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--dim); padding: 8px 8px 6px;
    }
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px;
      color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; border: none;
      background: transparent; width: 100%; text-align: left; font-family: inherit;
    }
    .nav-item:hover { background: #f3f5f2; color: var(--text); }
    .nav-item.active { background: var(--soft); color: #3f8f14; }
    .nav-item .soon {
      margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.04em;
      color: var(--dim); background: #eef1ee; padding: 3px 6px; border-radius: 999px;
    }
    .folder-search {
      margin: 0 12px 8px; width: calc(100% - 24px); border: 1px solid var(--border);
      border-radius: 9px; padding: 8px 10px; font: inherit; font-size: 12px; background: #fafbfa;
    }
    .folder-list { flex: 1; overflow: auto; padding: 0 12px 16px; }
    .folder {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 8px 10px; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: var(--text);
    }
    .folder:hover { background: #f3f5f2; }
    .folder span { color: var(--dim); font-size: 11px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); flex-shrink: 0; }
    .dot.warn { background: var(--warn); }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      height: 56px; display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; border-bottom: 1px solid var(--border); background: rgba(246,247,245,0.9);
      backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 2;
    }
    .crumb { color: var(--muted); font-size: 13px; font-weight: 600; }
    .top-actions { display: flex; gap: 8px; align-items: center; }
    .chip {
      border: 1px solid var(--border); background: #fff; border-radius: 9px;
      padding: 7px 10px; font-size: 12px; font-weight: 600; color: var(--muted);
    }
    .btn {
      border: none; background: var(--accent); color: var(--on); font-weight: 700;
      padding: 9px 12px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12.5px;
    }
    .btn.ghost { background: #fff; border: 1px solid var(--border); color: var(--text); }
    .content { padding: 24px 28px 48px; max-width: 1100px; }
    h1 { font-family: var(--display); font-size: 1.7rem; letter-spacing: -0.04em; margin-bottom: 6px; }
    .lead { color: var(--muted); font-size: 0.92rem; margin-bottom: 22px; max-width: 52ch; }
    .cards { display: grid; grid-template-columns: 1.1fr 1.2fr 0.9fr; gap: 14px; margin-bottom: 18px; }
    .card {
      background: var(--card); border: 1px solid var(--border); border-radius: 16px;
      padding: 16px 18px; box-shadow: 0 8px 24px rgba(20,32,26,0.04);
    }
    .card h3 { font-size: 13px; font-weight: 700; margin-bottom: 12px; }
    .card .sub { color: var(--muted); font-size: 12px; margin-top: 4px; }
    .progress-row { display: flex; gap: 16px; align-items: center; }
    .ring {
      width: 84px; height: 84px; border-radius: 50%;
      background: conic-gradient(var(--accent-strong) calc(var(--p) * 1%), #e8ece8 0);
      display: grid; place-items: center; flex-shrink: 0;
    }
    .ring-inner {
      width: 64px; height: 64px; border-radius: 50%; background: #fff;
      display: grid; place-items: center; font-weight: 800; font-size: 14px;
    }
    .bars { flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .bar-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
    .bar-track { height: 8px; background: #eef1ee; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--accent-strong); border-radius: 999px; }
    .hero-metric { font-family: var(--display); font-size: 1.8rem; font-weight: 800; letter-spacing: -0.04em; }
    .link-more { color: #3f8f14; font-size: 12px; font-weight: 700; margin-top: 10px; display: inline-block; }
    .section { margin-top: 8px; }
    .section-head { margin: 8px 0 12px; }
    .section-head h2 { font-size: 1.05rem; font-weight: 750; }
    .section-head p { color: var(--muted); font-size: 12.5px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--border); font-size: 13px; }
    th { color: var(--dim); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .status { display: inline-flex; align-items: center; gap: 6px; }
    .charts {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px;
    }
    .chart-box {
      min-height: 160px; border: 1px dashed var(--border); border-radius: 12px;
      display: grid; place-items: center; color: var(--dim); font-size: 12px; background: #fafbfa;
    }
    .banner {
      display: flex; gap: 10px; align-items: center; justify-content: space-between;
      padding: 10px 12px; border-radius: 12px; background: var(--soft); border: 1px solid rgba(146,239,74,0.35);
      font-size: 12.5px; margin-bottom: 16px; color: #3f5f20;
    }
    .err { color: #dc2626; font-size: 13px; }
    @media (max-width: 960px) {
      .menu-btn { display: inline-grid; place-items: center; }
      .sidebar {
        position: fixed; left: 0; top: 0; height: 100vh; width: min(280px, 88vw);
        z-index: 40; transform: translateX(-105%); transition: transform .2s ease;
        box-shadow: 12px 0 40px rgba(0,0,0,.18);
      }
      body.nav-open .sidebar { transform: translateX(0); }
      .sidebar-backdrop {
        display: none; position: fixed; inset: 0; border: 0; background: rgba(0,0,0,.35); z-index: 35;
      }
      body.nav-open .sidebar-backdrop { display: block; }
      .cards, .charts { grid-template-columns: 1fr; }
    }
    .menu-btn {
      display: none; border: 1px solid var(--border); background: #fff; border-radius: 8px;
      width: 36px; height: 36px; cursor: pointer;
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; }
    .view { display: none; }
    .view.is-active { display: block; }
  </style>
</head>
<body>
  <button class="sidebar-backdrop" id="sidebar-backdrop" type="button" aria-label="Fermer"></button>
  <aside class="sidebar">
    <div class="logo"><div class="logo-mark">TV</div>TrackVint</div>
    <div class="nav-section">
      <div class="nav-label">Plateforme</div>
      <button class="nav-item active" data-view="dashboard">Dashboard</button>
      <button class="nav-item" data-view="setup">Setup</button>
      <button class="nav-item" data-view="tracker">Tracker</button>
      <button class="nav-item" disabled>Top vendeurs <span class="soon">BIENTÔT</span></button>
      <button class="nav-item" disabled>Lens <span class="soon">BIENTÔT</span></button>
    </div>
    <div class="nav-section" style="flex:1;display:flex;flex-direction:column;min-height:0">
      <div class="nav-label">Favoris</div>
      <input class="folder-search" id="folder-search" placeholder="Rechercher un dossier" />
      <div class="folder-list" id="folder-list"></div>
    </div>
    <div style="padding:12px;border-top:1px solid var(--border)">
      <div class="chip" id="ext-status" style="width:100%;text-align:center">Extension · —</div>
    </div>
  </aside>

  <div class="main">
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" id="menu-btn" type="button" aria-label="Menu">☰</button>
        <div class="crumb" id="crumb">Dashboard</div>
      </div>
      <div class="top-actions">
        <span class="chip" id="plan-chip">FREE</span>
        <button class="btn ghost" type="button" id="btn-sync-ext">Lier extension</button>
        <button class="btn" type="button" id="btn-login">Connexion démo</button>
      </div>
    </header>

    <div class="content view is-active" id="view-dashboard" data-view-panel="dashboard">
      <h1>Dashboard</h1>
      <p class="lead">Suivez vos performances : trackers, marques et produits — synchronisés avec l’extension. Le serveur analyse les ventes en arrière-plan.</p>
      <div class="banner" id="crawler-banner">
        <span>Serveur crawler : détection des ventes des vendeurs / articles trackés.</span>
        <strong id="crawler-state">…</strong>
      </div>
      <p class="err" id="status"></p>

      <div class="cards">
        <section class="card">
          <h3>Progression</h3>
          <div class="progress-row">
            <div class="ring" id="ring" style="--p:0"><div class="ring-inner" id="ring-text">0%</div></div>
            <div class="bars">
              <div>
                <div class="bar-label"><span>Catalogue</span><span id="cat-label">0/0</span></div>
                <div class="bar-track"><div class="bar-fill" id="cat-bar" style="width:0%"></div></div>
              </div>
              <div>
                <div class="bar-label"><span>Profils</span><span id="prof-label">0/0</span></div>
                <div class="bar-track"><div class="bar-fill" id="prof-bar" style="width:0%"></div></div>
              </div>
            </div>
          </div>
        </section>
        <section class="card">
          <h3>Catégorie la plus vendue</h3>
          <div class="hero-metric" id="top-name">—</div>
          <p class="sub" id="top-sub">—</p>
          <a class="link-more" href="#perf">+ voir plus</a>
        </section>
        <section class="card">
          <h3>Vitesse de vente moy.</h3>
          <div class="hero-metric" id="avg-speed">—</div>
          <p class="sub">Basée sur le volume tracké</p>
        </section>
      </div>

      <section class="card section" id="perf">
        <div class="section-head">
          <h2>Performances clés</h2>
          <p>Top trackers qui génèrent le plus de résultats (même data que l’extension).</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nom du tracker</th>
              <th>Volume de ventes</th>
              <th>Prix moyen</th>
              <th>Vitesse</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody id="tracker-rows"></tbody>
        </table>
      </section>

      <div class="charts">
        <section class="card">
          <h3>Répartition CA / tracker</h3>
          <div class="chart-box" id="chart-ca">Données live dès qu’un vendeur est tracké</div>
        </section>
        <section class="card">
          <h3>Ventes par tracker</h3>
          <div class="chart-box" id="chart-sales">Le crawler serveur alimente ce graphique</div>
        </section>
      </div>
    </div>

    <div class="content view" id="view-setup" data-view-panel="setup">
      <h1>Setup</h1>
      <p class="lead">Configure le lien extension ↔ web et ton API crawler.</p>
      <ol style="line-height:1.8;color:var(--muted);padding-left:18px">
        <li>Charge l’extension (dossier <code>extension/</code>).</li>
        <li>Popup → Web (ajoute <code>?ext=</code>).</li>
        <li>Clique <strong>Lier extension</strong> puis connexion.</li>
        <li>Site Next : <code>cd web && npm run dev</code> → port 3001</li>
      </ol>
    </div>

    <div class="content view" id="view-tracker" data-view-panel="tracker">
      <h1>Tracker</h1>
      <p class="lead">Vendeurs et niches suivis (même data que l’extension).</p>
      <section class="card"><div id="tracker-list" class="chart-box">Chargement…</div></section>
    </div>
  </div>

  <script>
    const TOKEN_KEY = 'tv_web_jwt';
    const EXT_ID_KEY = 'tv_ext_id';
    const $ = (id) => document.getElementById(id);
    const statusEl = $('status');

    function authHeaders() {
      const t = localStorage.getItem(TOKEN_KEY);
      return t ? { Authorization: 'Bearer ' + t } : {};
    }

    async function login() {
      statusEl.textContent = 'Connexion…';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@trackvint.local', password: 'demo' }),
      });
      const data = await res.json();
      if (!res.ok) { statusEl.textContent = data.error || 'Erreur login'; return; }
      localStorage.setItem(TOKEN_KEY, data.token);
      statusEl.textContent = '';
      await pushJwtToExtension(data.token);
      await load();
    }

    async function pushJwtToExtension(token) {
      const extId = localStorage.getItem(EXT_ID_KEY) || new URLSearchParams(location.search).get('ext');
      if (!extId || !token) {
        $('ext-status').textContent = 'Extension · ouvre /auth?ext=ID';
        return;
      }
      localStorage.setItem(EXT_ID_KEY, extId);
      try {
        await chrome.runtime.sendMessage(extId, { type: 'SET_JWT', token });
        $('ext-status').textContent = 'Extension · liée ✓';
      } catch {
        // Fallback postMessage page
        window.postMessage({ source: 'trackvint-web', type: 'SET_JWT', token, extId }, '*');
        $('ext-status').textContent = 'Extension · JWT prêt';
      }
    }

    function euro(n) {
      if (n == null || Number.isNaN(Number(n))) return '—';
      return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' €';
    }

    async function load() {
      const res = await fetch('/api/dashboard/overview', { headers: authHeaders() });
      if (!res.ok) {
        statusEl.textContent = 'Impossible de charger le dashboard (lance npm start).';
        return;
      }
      const d = await res.json();
      $('plan-chip').textContent = String(d.plan || 'free').toUpperCase();
      $('crawler-state').textContent = d.crawler?.enabled ? 'ACTIF' : 'OFF';

      const p = d.progress || {};
      $('ring').style.setProperty('--p', p.percent || 0);
      $('ring-text').textContent = (p.percent || 0) + '%';
      $('cat-label').textContent = (p.catalog?.current || 0) + '/' + (p.catalog?.target || 0);
      $('prof-label').textContent = (p.profile?.current || 0) + '/' + (p.profile?.target || 0);
      $('cat-bar').style.width = Math.min(100, ((p.catalog?.current || 0) / Math.max(1, p.catalog?.target || 1)) * 100) + '%';
      $('prof-bar').style.width = Math.min(100, ((p.profile?.current || 0) / Math.max(1, p.profile?.target || 1)) * 100) + '%';

      $('top-name').textContent = d.topCategory?.name || 'Aucun tracker';
      $('top-sub').textContent = d.topCategory
        ? ('Vitesse moy. ' + d.topCategory.avgSaleSpeedDays + ' j · ' + (d.topCategory.weekLabel || ''))
        : 'Tracke un vendeur depuis l’extension';
      $('avg-speed').textContent = d.avgSaleSpeedDays != null ? d.avgSaleSpeedDays + 'j' : '—';

      const rows = $('tracker-rows');
      rows.innerHTML = '';
      (d.trackers || []).forEach((t) => {
        const tr = document.createElement('tr');
        const speed = t.saleSpeedDays != null ? t.saleSpeedDays + ' j' : '—';
        const st = t.status === 'ok' ? 'OK' : 'En cours';
        const dot = t.status === 'ok' ? '' : ' warn';
        tr.innerHTML = '<td><strong>' + escapeHtml(t.name) + '</strong></td>'
          + '<td>' + (t.salesVolume ?? 0) + '</td>'
          + '<td>' + euro(t.avgPrice) + '</td>'
          + '<td>' + speed + '</td>'
          + '<td><span class="status"><i class="dot' + dot + '"></i>' + st + '</span></td>';
        rows.appendChild(tr);
      });
      if (!(d.trackers || []).length) {
        rows.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">Aucun tracker — ajoute un favori vendeur dans l’extension.</td></tr>';
      }

      const list = $('folder-list');
      list.innerHTML = '';
      (d.folders || []).forEach((f) => {
        const el = document.createElement('div');
        el.className = 'folder';
        el.innerHTML = '<div style="display:flex;gap:8px;align-items:center"><i class="dot"></i>' + escapeHtml(f.name) + '</div><span>' + (f.itemCount || 0) + '</span>';
        list.appendChild(el);
      });
      (d.sellers || []).forEach((s) => {
        const el = document.createElement('div');
        el.className = 'folder';
        el.innerHTML = '<div style="display:flex;gap:8px;align-items:center"><i class="dot' + (s.salesCount ? '' : ' warn') + '"></i>@' + escapeHtml(s.login) + '</div><span>' + (s.salesCount || 0) + '</span>';
        list.appendChild(el);
      });

      const ca = (d.trackers || []).slice(0, 5).map((t) => t.name + ' · ' + (t.salesVolume || 0)).join(' · ');
      $('chart-ca').textContent = ca || 'Pas encore de CA tracké';
      $('chart-sales').textContent = (d.soldCount || 0) + ' ventes en base · avg ' + euro(d.avgPrice);

      const tl = $('tracker-list');
      if (tl) {
        const sellers = (d.sellers || []).map((s) => '@' + s.login + ' · ' + (s.salesCount || 0) + ' ventes').join('<br/>');
        tl.innerHTML = sellers || 'Aucun vendeur — tracke depuis l’extension.';
      }
    }

    function setView(name) {
      document.querySelectorAll('[data-view-panel]').forEach((el) => {
        el.classList.toggle('is-active', el.getAttribute('data-view-panel') === name);
      });
      document.querySelectorAll('[data-view]').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-view') === name);
      });
      const crumb = $('crumb');
      if (crumb) crumb.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      document.body.classList.remove('nav-open');
    }

    document.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => setView(btn.getAttribute('data-view')));
    });
    $('menu-btn')?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $('sidebar-backdrop')?.addEventListener('click', () => document.body.classList.remove('nav-open'));

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    $('btn-login').addEventListener('click', login);
    $('btn-sync-ext').addEventListener('click', async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return login();
      await pushJwtToExtension(token);
    });
    $('folder-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.folder').forEach((el) => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    // Capture ext id depuis /app?ext=
    const ext = new URLSearchParams(location.search).get('ext');
    if (ext) localStorage.setItem(EXT_ID_KEY, ext);

    load();
    setInterval(load, 30000);
  </script>
</body>
</html>`);
}
