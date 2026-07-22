/**
 * Panneau Radar — layout type ResellTrack (sidebar + home vendeur + feed).
 */

const ICONS = {
  radar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1.6" opacity=".55"/><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.4" opacity=".28"/></svg>`,
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19h16M7 16V9m5 7V5m5 11v-4"/></svg>`,
  star: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z"/></svg>`,
  starFill: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.9 6.3l1.6 1.5M17.5 16.2l1.6 1.5M3 12h2.2M18.8 12H21M4.9 17.7l1.6-1.5M17.5 7.8l1.6-1.5"/></svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  list: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/></svg>`,
  grid: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`,
  photo: `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 3.5A1.5 1.5 0 1 0 7 11a1.5 1.5 0 0 0 0-3.5zM4 17l5-5 3 3 4-4 4 4v2H4z"/></svg>`,
  heart: `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.2-4.5-9.5-8.2C.7 9.7 2.2 6 6 6c2 0 3.3 1.1 4 2.1C10.7 7.1 12 6 14 6c3.8 0 5.3 3.7 3.5 6.8C19.2 16.5 12 21 12 21z"/></svg>`,
};

/** @type {{ days: number, sortBy: 'recent'|'price', view: 'list'|'grid' }} */
const uiState = { days: 30, sortBy: 'recent', view: 'list' };

/**
 * @param {HTMLElement} mount
 * @param {{ onClose?: () => void, onLogin?: () => void, onRefresh?: (opts: object) => void, onFavoriteSeller?: (seller: object) => void }} [opts]
 */
export function createPanel(mount, opts = {}) {
  let panel = mount.querySelector('.tv-panel');
  if (panel) return getPanelApi(panel, opts);

  panel = document.createElement('aside');
  panel.className = 'tv-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'TrackVint Radar');
  panel.innerHTML = `
    <div class="tv-shell">
      <nav class="tv-sidebar" aria-label="Navigation" data-tv-nav>
        <div class="tv-sidebar-logo" aria-hidden="true">${ICONS.radar}</div>
        <button type="button" class="tv-side-btn is-active" data-tv-tab="home" title="Accueil">${ICONS.home}</button>
        <button type="button" class="tv-side-btn" data-tv-tab="charts" title="Statistiques">${ICONS.chart}</button>
        <button type="button" class="tv-side-btn" data-tv-tab="favorites" title="Favoris">${ICONS.star}</button>
        <button type="button" class="tv-side-btn" data-tv-tab="settings" title="Réglages">${ICONS.settings}</button>
      </nav>
      <div class="tv-main">
        <header class="tv-chrome" data-tv-drag>
          <div class="tv-chrome-brand">
            <strong>TrackVint</strong>
            <span>BETA v0.3.2</span>
          </div>
          <button type="button" class="tv-icon-btn" data-tv-close aria-label="Fermer">${ICONS.close}</button>
        </header>
        <div class="tv-body">
          <section class="tv-page is-active" data-tv-page="home"></section>
          <section class="tv-page" data-tv-page="charts"></section>
          <section class="tv-page" data-tv-page="favorites"></section>
          <section class="tv-page" data-tv-page="settings"></section>
        </div>
      </div>
    </div>
  `;

  mount.appendChild(panel);
  wirePanelChrome(panel, opts);
  return getPanelApi(panel, opts);
}

function wirePanelChrome(panel, opts) {
  panel.querySelector('[data-tv-close]')?.addEventListener('click', () => {
    panel.hidden = true;
    opts.onClose?.();
  });

  panel.querySelectorAll('[data-tv-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tv-tab');
      panel.querySelectorAll('[data-tv-tab]').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      panel.querySelectorAll('[data-tv-page]').forEach((page) => {
        page.classList.toggle('is-active', page.getAttribute('data-tv-page') === tab);
      });
    });
  });

  panel.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    const daysBtn = t.closest('[data-tv-days]');
    if (daysBtn) {
      uiState.days = Number(daysBtn.getAttribute('data-tv-days')) || 30;
      opts.onRefresh?.({ ...uiState });
      return;
    }

    const sortBtn = t.closest('[data-tv-sort]');
    if (sortBtn) {
      uiState.sortBy = /** @type {'recent'|'price'} */ (
        sortBtn.getAttribute('data-tv-sort') || 'recent'
      );
      opts.onRefresh?.({ ...uiState });
      return;
    }

    const viewBtn = t.closest('[data-tv-view]');
    if (viewBtn) {
      uiState.view = /** @type {'list'|'grid'} */ (
        viewBtn.getAttribute('data-tv-view') || 'list'
      );
      const page = panel.querySelector('[data-tv-page="home"]');
      const data = panel.__tvData;
      if (page && data) renderHome(panel, data);
      return;
    }

    if (t.closest('[data-tv-fav-seller]')) {
      opts.onFavoriteSeller?.(panel.__tvData?.seller);
      return;
    }

    if (t.closest('[data-tv-dismiss-notice]')) {
      const banner = panel.querySelector('[data-tv-notice]');
      if (banner) banner.hidden = true;
      try {
        localStorage.setItem('tv_notice_dismissed', '1');
      } catch {
        /* ignore */
      }
    }
  });

  enableDrag(panel, panel.querySelector('[data-tv-drag]'));
}

function getPanelApi(panel, opts) {
  return {
    el: panel,
    getUiState: () => ({ ...uiState }),
    open() {
      panel.hidden = false;
    },
    close() {
      panel.hidden = true;
      opts.onClose?.();
    },
    toggle() {
      panel.hidden = !panel.hidden;
      if (panel.hidden) opts.onClose?.();
    },
    isOpen() {
      return !panel.hidden;
    },

    showLoading() {
      setNavVisible(panel, true);
      const skel = `
        <div class="tv-skeleton">
          <div class="tv-skel tv-skel--banner"></div>
          <div class="tv-skel tv-skel--seller"></div>
          <div class="tv-skel-row"><div class="tv-skel"></div><div class="tv-skel"></div><div class="tv-skel"></div></div>
          <div class="tv-skel"></div>
          <div class="tv-skel"></div>
        </div>`;
      panel.querySelector('[data-tv-page="home"]').innerHTML = skel;
      panel.querySelector('[data-tv-page="charts"]').innerHTML =
        `<div class="tv-empty"><div class="tv-spinner"></div>Chargement…</div>`;
      panel.querySelector('[data-tv-page="favorites"]').innerHTML = '';
      panel.querySelector('[data-tv-page="settings"]').innerHTML = '';
    },

    showLoggedOut() {
      setNavVisible(panel, false);
      const html = `
        <div class="tv-gate">
          <div class="tv-gate-mark">${ICONS.radar}</div>
          <h3>Bienvenue sur TrackVint</h3>
          <p>Connecte-toi pour le radar vendeur, les ventes trackées et les stats.</p>
          <button type="button" class="tv-btn" data-tv-login>Se connecter</button>
        </div>`;
      for (const page of panel.querySelectorAll('[data-tv-page]')) {
        page.innerHTML = page.getAttribute('data-tv-page') === 'home' ? html : '';
        page.classList.toggle(
          'is-active',
          page.getAttribute('data-tv-page') === 'home',
        );
      }
      panel.querySelector('[data-tv-login]')?.addEventListener('click', () =>
        opts.onLogin?.(),
      );
    },

    showError(message) {
      setNavVisible(panel, true);
      const html = `
        <div class="tv-error">
          <strong>Impossible de contacter le serveur</strong>
          ${escapeHtml(message || 'Lance l’API : cd backend && npm start')}
          <div><button type="button" class="tv-btn tv-btn--ghost" data-tv-retry>Réessayer</button></div>
        </div>`;
      panel.querySelector('[data-tv-page="home"]').innerHTML = html;
      panel.querySelector('[data-tv-page="charts"]').innerHTML = '';
      panel.querySelector('[data-tv-page="favorites"]').innerHTML = '';
      panel.querySelector('[data-tv-page="settings"]').innerHTML = '';
      panel.querySelector('[data-tv-page="home"]')?.classList.add('is-active');
    },

    /**
     * @param {object} data
     */
    render(data) {
      setNavVisible(panel, true);
      panel.__tvData = data;
      if (data.days) uiState.days = Number(data.days) || uiState.days;
      if (data.sortBy) uiState.sortBy = data.sortBy === 'price' ? 'price' : 'recent';
      renderHome(panel, data);
      renderCharts(panel, data);
      renderFavorites(panel, data);
      renderSettings(panel, data);
    },
  };
}

function setNavVisible(panel, visible) {
  const nav = panel.querySelector('[data-tv-nav]');
  if (nav) nav.style.display = visible ? 'flex' : 'none';
}

function renderHome(panel, data) {
  const page = panel.querySelector('[data-tv-page="home"]');
  if (!page) return;
  const seller = data.seller || {};
  const sales = data.recentSold || data.sales || [];
  const lockedAvg = Boolean(data.locked?.avgSoldPrice);
  let noticeHidden = false;
  try {
    noticeHidden = localStorage.getItem('tv_notice_dismissed') === '1';
  } catch {
    /* ignore */
  }

  if (!seller.vintedId) {
    page.innerHTML = `
      <div class="tv-empty">
        <p>Ouvre un profil vendeur Vinted (<code>/member/…</code>) pour voir ses ventes et le tracker.</p>
        ${
          (data.trackedSellers || []).length
            ? `<p class="tv-seller-domain" style="margin-top:12px">Ou choisis un favori dans l’onglet ★</p>`
            : ''
        }
      </div>`;
    return;
  }

  page.innerHTML = `
    ${
      data.notice && !noticeHidden
        ? `<div class="tv-banner" data-tv-notice>
            <span>${escapeHtml(data.notice)}</span>
            <button type="button" class="tv-banner-x" data-tv-dismiss-notice aria-label="Fermer">×</button>
          </div>`
        : ''
    }

    <section class="tv-seller">
      <div class="tv-seller-left">
        <div class="tv-avatar">
          ${
            seller.photoUrl
              ? `<img src="${escapeAttr(seller.photoUrl)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
              : `<span>${escapeHtml((seller.login || '?').slice(0, 1).toUpperCase())}</span>`
          }
        </div>
        <div class="tv-seller-meta">
          <div class="tv-seller-name-row">
            <strong>${escapeHtml(seller.login || 'vendeur')}</strong>
            <button type="button" class="tv-fav-btn ${seller.isFavorite || seller.tracked ? 'is-on' : ''}" data-tv-fav-seller title="${seller.isFavorite || seller.tracked ? 'Retirer des favoris' : 'Tracker ce vendeur'}">
              ${ICONS.starFill}
            </button>
          </div>
          <span class="tv-seller-domain">${escapeHtml(seller.domain || 'vinted.fr')}${seller.tracked ? ' · tracké' : ''}</span>
        </div>
      </div>
      ${
        !(seller.isFavorite || seller.tracked)
          ? `<button type="button" class="tv-chip is-active" data-tv-track-now>Tracker</button>`
          : ''
      }
    </section>

    ${
      data.needsTrack || (!(seller.tracked || seller.isFavorite) && !sales.length)
        ? `<div class="tv-banner tv-banner--warn">
            <span>Ajoute ce vendeur aux favoris pour enregistrer ses ventes et suivre ses prix.</span>
            <button type="button" class="tv-chip is-active" data-tv-track-now>Ajouter</button>
          </div>`
        : ''
    }

    <section class="tv-metrics">
      <article class="tv-metric">
        <span>Articles trackés</span>
        <strong>${data.trackedItems ?? seller.trackedItems ?? '—'}</strong>
      </article>
      <article class="tv-metric">
        <span>Ventes traquées</span>
        <strong>${data.soldCount ?? '—'}</strong>
      </article>
      <article class="tv-metric ${lockedAvg ? 'is-locked' : ''}">
        <span>Prix moyen vendu</span>
        <strong class="${lockedAvg ? '' : 'is-accent'}">
          ${
            lockedAvg
              ? `<span class="tv-blur">46 €</span><i>${ICONS.lock}</i>`
              : escapeHtml(fmtEuro(data.avgPrice))
          }
        </strong>
      </article>
    </section>

    <section class="tv-toolbar">
      <div class="tv-chips" role="group" aria-label="Période">
        ${[7, 14, 30]
          .map(
            (d) => `
          <button type="button" class="tv-chip ${uiState.days === d ? 'is-active' : ''}" data-tv-days="${d}">${d}j</button>`,
          )
          .join('')}
      </div>
      <button type="button" class="tv-chip tv-chip--icon" title="Graphiques" data-tv-tab-jump="charts">${ICONS.chart}</button>
    </section>

    <section class="tv-sales-head">
      <h3>Dernières ventes trackées</h3>
      <div class="tv-sales-actions">
        <button type="button" class="tv-icon-mini ${uiState.view === 'list' ? 'is-active' : ''}" data-tv-view="list" title="Liste">${ICONS.list}</button>
        <button type="button" class="tv-icon-mini ${uiState.view === 'grid' ? 'is-active' : ''}" data-tv-view="grid" title="Grille">${ICONS.grid}</button>
        <button type="button" class="tv-chip ${uiState.sortBy === 'recent' ? 'is-active' : ''}" data-tv-sort="recent">Récentes</button>
        <button type="button" class="tv-chip ${uiState.sortBy === 'price' ? 'is-active' : ''}" data-tv-sort="price">Prix ↑</button>
      </div>
    </section>

    ${
      sales.length
        ? `<ul class="tv-sales ${uiState.view === 'grid' ? 'is-grid' : ''}">${sales
            .slice(0, 20)
            .map((s) => saleCard(s))
            .join('')}</ul>`
        : `<div class="tv-empty">Aucune vente sur cette période.</div>`
    }
  `;

  page.querySelector('[data-tv-tab-jump="charts"]')?.addEventListener('click', () => {
    panel.querySelector('[data-tv-tab="charts"]')?.click();
  });
}

function saleCard(s) {
  return `
    <li class="tv-sale">
      <div class="tv-sale-thumb">
        ${
          s.photo
            ? `<img src="${escapeAttr(s.photo)}" alt="" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('is-empty')" />`
            : ''
        }
        <div class="tv-sale-badges">
          ${s.photoCount ? `<span>${ICONS.photo} ${s.photoCount}</span>` : ''}
          ${s.favouriteCount ? `<span>${ICONS.heart} ${s.favouriteCount}</span>` : ''}
        </div>
      </div>
      <div class="tv-sale-meta">
        <p class="tv-sale-title">${escapeHtml(s.title || '')}</p>
        <div class="tv-sale-row">
          <span>${escapeHtml(s.state || '')}</span>
          <strong class="tv-sale-price">${fmtEuro(s.price)}</strong>
        </div>
        <div class="tv-sale-foot">
          <span>${escapeHtml(s.soldAtLabel || '')}</span>
          ${
            s.url
              ? `<a class="tv-sale-link" href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">Voir l'article →</a>`
              : ''
          }
        </div>
      </div>
    </li>`;
}

function renderCharts(panel, data) {
  const page = panel.querySelector('[data-tv-page="charts"]');
  if (!page) return;
  page.innerHTML = `
    <div class="tv-page-title">
      <h3>Statistiques</h3>
      <p>${escapeHtml(data.category || 'Radar')}</p>
    </div>
    <div class="tv-stat-grid">
      <div class="tv-stat">
        <span class="tv-stat-label">Prix moyen</span>
        <span class="tv-stat-value is-accent">${data.locked?.avgSoldPrice ? 'Pro' : fmtEuro(data.avgPrice)}</span>
      </div>
      <div class="tv-stat">
        <span class="tv-stat-label">Ventes</span>
        <span class="tv-stat-value">${data.soldCount ?? '—'}</span>
      </div>
      <div class="tv-stat">
        <span class="tv-stat-label">Min</span>
        <span class="tv-stat-value">${fmtEuro(data.minPrice)}</span>
      </div>
      <div class="tv-stat">
        <span class="tv-stat-label">Max</span>
        <span class="tv-stat-value">${fmtEuro(data.maxPrice)}</span>
      </div>
    </div>
    <div class="tv-card">
      <h3>État fréquent</h3>
      <p>${escapeHtml(data.commonState || '—')}</p>
    </div>
  `;
}

function renderFavorites(panel, data) {
  const page = panel.querySelector('[data-tv-page="favorites"]');
  if (!page) return;
  const sellers = data.trackedSellers || [];
  const seller = data.seller;
  page.innerHTML = `
    <div class="tv-page-title">
      <h3>Vendeurs trackés</h3>
      <p>Favoris dont les ventes sont enregistrées.</p>
    </div>
    ${
      seller?.login && !(seller.isFavorite || seller.tracked)
        ? `<div class="tv-card tv-fav-card">
            <div class="tv-seller-left">
              <div class="tv-avatar tv-avatar--sm">
                ${seller.photoUrl ? `<img src="${escapeAttr(seller.photoUrl)}" alt="" />` : ''}
              </div>
              <div>
                <strong>${escapeHtml(seller.login)}</strong>
                <p>Profil ouvert — pas encore tracké</p>
              </div>
            </div>
            <button type="button" class="tv-chip is-active" data-tv-track-now>Tracker</button>
          </div>`
        : ''
    }
    ${
      sellers.length
        ? `<ul class="tv-sales">${sellers
            .map(
              (s) => `
          <li class="tv-sale">
            <div class="tv-avatar tv-avatar--sm">
              ${s.photoUrl ? `<img src="${escapeAttr(s.photoUrl)}" alt="" />` : `<span>${escapeHtml((s.login || '?')[0])}</span>`}
            </div>
            <div class="tv-sale-meta">
              <p class="tv-sale-title">${escapeHtml(s.login || s.vintedId)}</p>
              <div class="tv-sale-row">
                <span>${escapeHtml(s.domain || '')}</span>
                <strong class="tv-sale-price">${s.salesCount ?? 0} ventes</strong>
              </div>
              <div class="tv-sale-foot">
                <a class="tv-sale-link" href="https://www.${escapeAttr(s.domain || 'vinted.fr')}/member/${escapeAttr(s.vintedId)}" target="_blank" rel="noopener noreferrer">Ouvrir le profil →</a>
              </div>
            </div>
          </li>`,
            )
            .join('')}</ul>`
        : `<div class="tv-empty">Aucun vendeur tracké. Ouvre un /member/… et clique ★ Tracker.</div>`
    }
  `;
}

function renderSettings(panel, data) {
  const page = panel.querySelector('[data-tv-page="settings"]');
  if (!page) return;
  page.innerHTML = `
    <div class="tv-page-title">
      <h3>Réglages</h3>
      <p>Extension locale TrackVint</p>
    </div>
    <div class="tv-card">
      <h3>Plan</h3>
      <p>${escapeHtml(String(data.plan || 'free').toUpperCase())} — passe Pro pour débloquer le prix moyen.</p>
    </div>
    <div class="tv-card">
      <h3>API</h3>
      <p>127.0.0.1:3000</p>
    </div>
  `;
}

function enableDrag(panel, handle) {
  if (!handle) return;
  let dragging = false;
  let ox = 0;
  let oy = 0;
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const x = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, e.clientX - ox));
    const y = Math.max(8, Math.min(window.innerHeight - 80, e.clientY - oy));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
  });
  handle.addEventListener('pointerup', () => {
    dragging = false;
  });
}

function fmtEuro(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(0)} €`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", '&#39;');
}
