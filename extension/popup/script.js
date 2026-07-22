/**
 * Popup TrackVint — auth JWT + dashboard stats + favoris.
 */

import {
  api,
  fetchSession,
  getCachedSession,
  loginWithPassword,
  signOut as apiSignOut,
} from '../shared/api/client.js';
import { API_BASE_URL, WEB_APP_URL } from '../shared/config.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  user: null,
  plan: 'free',
  folders: [],
  brandFilter: '',
  invStatus: 'all',
};

const els = {
  app: $('#app'),
  loading: $('#view-loading'),
  auth: $('#view-auth'),
  appView: $('#view-app'),
  btnLogin: $('#btn-login'),
  btnLogout: $('#btn-logout'),
  authError: $('#auth-error'),
  greeting: $('#user-greeting'),
  planBadge: $('#plan-badge'),
  btnUpgrade: $('#btn-upgrade'),
  dashLoading: $('#dash-loading'),
  dashError: $('#dash-error'),
  dashErrorMsg: $('#dash-error-msg'),
  dashContent: $('#dash-content'),
  btnRetry: $('#btn-retry'),
  statsTitle: $('#stats-title'),
  statsCategory: $('#stats-category'),
  statAvg: $('#stat-avg'),
  statSales: $('#stat-sales'),
  statMin: $('#stat-min'),
  statMax: $('#stat-max'),
  statState: $('#stat-state'),
  soldList: $('#sold-list'),
  soldEmpty: $('#sold-empty'),
  favList: $('#fav-list'),
  favEmpty: $('#fav-empty'),
  favLoading: $('#fav-loading'),
  btnFavRefresh: $('#btn-fav-refresh'),
  formFolder: $('#form-create-folder'),
  inputFolder: $('#input-folder-name'),
  invList: $('#inv-list'),
  invEmpty: $('#inv-empty'),
  invProfit: $('#inv-profit'),
  invStock: $('#inv-stock'),
  invListed: $('#inv-listed'),
  formInv: $('#form-inventory'),
  inputInvTitle: $('#input-inv-title'),
  inputInvBuy: $('#input-inv-buy'),
  inputInvBrand: $('#input-inv-brand'),
  formBrand: $('#form-brand'),
  inputBrand: $('#input-brand'),
  btnInvExport: $('#btn-inv-export'),
  invStatusFilter: $('#inv-status-filter'),
  btnOpenApp: $('#btn-open-app'),
  navBtns: [...document.querySelectorAll('.nav-btn')],
  panels: [...document.querySelectorAll('[data-page-panel]')],
};

function setView(view) {
  els.app.dataset.state = view;
  els.loading.classList.toggle('hidden', view !== 'loading');
  els.auth.classList.toggle('hidden', view !== 'auth');
  els.appView.classList.toggle('hidden', view !== 'app');
}

function setPage(page) {
  els.navBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  els.panels.forEach((panel) => {
    const active = panel.dataset.pagePanel === page;
    panel.classList.toggle('hidden', !active);
  });
  if (page === 'favorites') loadFavorites();
  if (page === 'inventory') loadInventory();
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

function showAuthError(msg) {
  if (!els.authError) return;
  els.authError.textContent = msg;
  els.authError.classList.remove('hidden');
}

async function boot() {
  setView('loading');
  checkApiStatus();
  try {
    const cached = await getCachedSession();
    if (cached?.user) {
      await enterApp(cached);
      return;
    }
    const session = await fetchSession();
    if (session?.user) {
      await enterApp(session);
      return;
    }
  } catch {
    /* → auth */
  }
  setView('auth');
}

async function checkApiStatus() {
  const el = $('#api-status');
  if (!el) return;
  try {
    const res = await api.get('/api/health', {}, { auth: false });
    if (res.__status === 200 && res.data?.ok) {
      el.textContent = 'API OK';
      el.classList.add('is-ok');
      el.classList.remove('is-down');
    } else {
      el.textContent = 'API indisponible';
      el.classList.add('is-down');
      el.classList.remove('is-ok');
    }
  } catch {
    el.textContent = 'API hors ligne';
    el.classList.add('is-down');
    el.classList.remove('is-ok');
  }
}

async function enterApp(session) {
  state.user = session?.user ?? state.user;
  setView('app');
  setPage('home');
  els.greeting.textContent = `Bonjour${state.user?.name ? `, ${state.user.name.split(' ')[0]}` : ''}`;
  if (els.btnLogout) els.btnLogout.classList.remove('hidden');
  await loadSubscription();
  await loadStats();
}

async function login() {
  showAuthError('');
  els.authError?.classList.add('hidden');
  if (els.btnLogin) els.btnLogin.disabled = true;
  try {
    const email = ($('#email')?.value || '').trim();
    const password = $('#password')?.value || '';
    if (!email || !password) throw new Error('Email et mot de passe requis');
    const data = await loginWithPassword({ email, password });
    await enterApp({ user: data.user });
  } catch (err) {
    showAuthError(err?.message || 'Connexion impossible');
  } finally {
    if (els.btnLogin) els.btnLogin.disabled = false;
  }
}

async function logout() {
  await apiSignOut();
  state.user = null;
  state.folders = [];
  setView('auth');
}

async function loadSubscription() {
  const res = await api.get('/api/extension/subscription');
  if (res.__status === 200 && res.data) {
    state.plan = res.data.plan || 'free';
    if (els.planBadge) {
      els.planBadge.textContent = state.plan.toUpperCase();
      els.planBadge.dataset.plan = state.plan;
    }
    if (els.btnUpgrade) {
      els.btnUpgrade.classList.toggle(
        'hidden',
        state.plan === 'pro' || state.plan === 'starter',
      );
    }
  }

  const notice = await api.get('/api/extension/notice', { locale: 'fr' });
  const banner = $('#notice-banner');
  const noticeText = $('#notice-text');
  if (banner && notice.__status === 200 && notice.data?.enabled) {
    const message = notice.data.message || '';
    const dismissed = await getDismissedNotice();
    const hide = !message || dismissed === message;
    if (noticeText) noticeText.textContent = message;
    else banner.textContent = message;
    banner.classList.toggle('hidden', hide);
  }
}

async function getDismissedNotice() {
  try {
    const api =
      globalThis.chrome?.storage?.local || globalThis.browser?.storage?.local;
    if (!api) return null;
    const data = await api.get('tv_notice_dismissed');
    return data?.tv_notice_dismissed || null;
  } catch {
    return null;
  }
}

async function dismissNotice(message) {
  try {
    const storage =
      globalThis.chrome?.storage?.local || globalThis.browser?.storage?.local;
    if (storage) await storage.set({ tv_notice_dismissed: message });
  } catch {
    /* ignore */
  }
  $('#notice-banner')?.classList.add('hidden');
}

async function upgradePlan() {
  if (els.btnUpgrade) els.btnUpgrade.disabled = true;
  const res = await api.post('/api/extension/subscription/upgrade', {
    plan: 'pro',
  });
  if (els.btnUpgrade) els.btnUpgrade.disabled = false;
  if (res.__status === 200) {
    await loadSubscription();
    await loadStats();
  }
}

async function loadStats() {
  els.dashLoading.classList.remove('hidden');
  els.dashError.classList.add('hidden');
  els.dashContent.classList.add('hidden');

  const query = {};
  if (state.brandFilter) query.brand = state.brandFilter;

  const res = await api.get('/api/stats', query, { auth: false });

  els.dashLoading.classList.add('hidden');

  if (res.__status === 0) {
    els.dashError.classList.remove('hidden');
    els.dashErrorMsg.textContent =
      res.__error
        ? `${res.__error} — lance cd backend && npm start`
        : 'Lance l’API : cd backend && npm start (127.0.0.1:3000)';
    return;
  }

  if (res.__status !== 200 || !res.data) {
    els.dashError.classList.remove('hidden');
    els.dashErrorMsg.textContent =
      res.__error || `Erreur serveur (${res.__status}).`;
    return;
  }

  renderStats(res.data);
  els.dashContent.classList.remove('hidden');

  const stamp = $('#stats-fetched');
  if (stamp && res.data.fetchedAt) {
    const d = new Date(res.data.fetchedAt);
    stamp.textContent = Number.isNaN(d.getTime())
      ? ''
      : `Maj ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function renderStats(data) {
  els.statsTitle.textContent = data.title || data.brand || 'Statistiques';
  els.statsCategory.textContent = data.category || 'Radar';
  els.statAvg.textContent = fmtEuro(data.avgPrice);
  els.statSales.textContent = data.soldCount ?? '—';
  els.statMin.textContent = fmtEuro(data.minPrice);
  els.statMax.textContent = fmtEuro(data.maxPrice);
  els.statState.textContent = data.commonState || '—';

  const sales = Array.isArray(data.recentSold) ? data.recentSold : [];
  els.soldList.innerHTML = '';
  els.soldEmpty.classList.toggle('hidden', sales.length > 0);

  for (const item of sales.slice(0, 8)) {
    const li = document.createElement('li');
    li.className = 'sold-item';
    const link = item.url
      ? `<a class="sold-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Vinted →</a>`
      : '';
    li.innerHTML = `
      <div>
        <p class="sold-title">${escapeHtml(item.title || '')}</p>
        <p class="sold-meta">${escapeHtml(item.state || '')}${link ? ` · ${link}` : ''}</p>
      </div>
      <span class="sold-price">${fmtEuro(item.price)}</span>
    `;
    els.soldList.appendChild(li);
  }
}

async function loadFavorites() {
  if (!els.favList) return;
  els.favLoading?.classList.remove('hidden');
  els.favEmpty?.classList.add('hidden');
  els.favList.innerHTML = '';

  const res = await api.get('/api/extension/favorites');
  els.favLoading?.classList.add('hidden');

  state.folders = res?.data?.folders ?? [];
  if (!state.folders.length) {
    els.favEmpty?.classList.remove('hidden');
    return;
  }

  for (const folder of state.folders) {
    const li = document.createElement('li');
    li.className = 'fav-item';
    li.innerHTML = `
      <span class="fav-name">${escapeHtml(folder.name)}</span>
      <div class="fav-right">
        <span class="fav-count">${folder.itemCount ?? 0}</span>
        <button type="button" class="btn-ghost fav-del" data-folder-del="${escapeHtml(folder.id)}" aria-label="Supprimer le dossier">×</button>
      </div>
    `;
    els.favList.appendChild(li);
  }
}

async function createFolder(name) {
  const res = await api.post('/api/extension/folders', {
    name,
    parentId: null,
  });
  if (res.__status === 201 || res.__status === 200) {
    await loadFavorites();
  }
}

async function deleteFolder(folderId) {
  if (!folderId) return;
  await api.delete(`/api/extension/folders/${folderId}`);
  await loadFavorites();
}

els.favList?.addEventListener('click', (e) => {
  const btn =
    e.target instanceof HTMLElement
      ? e.target.closest('[data-folder-del]')
      : null;
  if (!btn) return;
  deleteFolder(btn.getAttribute('data-folder-del'));
});

async function loadInventory() {
  if (!els.invList) return;
  els.invList.innerHTML = '';
  els.invEmpty?.classList.add('hidden');

  const res = await api.get('/api/inventory', {
    status: state.invStatus === 'all' ? undefined : state.invStatus,
  });
  if (res.__status !== 200 || !res.data) {
    els.invEmpty?.classList.remove('hidden');
    if (els.invEmpty) els.invEmpty.textContent = 'Impossible de charger l’inventaire.';
    return;
  }

  const { items = [], summary } = res.data;
  if (els.invProfit) els.invProfit.textContent = fmtEuro(summary?.profit);
  if (els.invStock) els.invStock.textContent = summary?.counts?.stock ?? '—';
  if (els.invListed) els.invListed.textContent = summary?.counts?.listed ?? '—';

  const roiEl = $('#inv-roi');
  if (roiEl && summary?.invested > 0 && summary?.profit != null) {
    const costSold =
      (summary.revenue || 0) - (summary.profit || 0);
    const denom = costSold > 0 ? costSold : summary.invested;
    roiEl.textContent = `${Math.round((summary.profit / denom) * 100)}%`;
  } else if (roiEl) {
    roiEl.textContent = '—';
  }

  if (!items.length) {
    els.invEmpty?.classList.remove('hidden');
    if (els.invEmpty) els.invEmpty.textContent = 'Inventaire vide.';
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'fav-item inv-row';
    const margin =
      item.margin != null ? ` · marge ${fmtEuro(item.margin)}` : '';
    const roi =
      item.margin != null && item.buyPrice > 0
        ? ` · ROI ${Math.round((item.margin / item.buyPrice) * 100)}%`
        : '';
    li.innerHTML = `
      <div class="inv-main">
        <span class="fav-name">${escapeHtml(item.title)}</span>
        <p class="sold-meta">${escapeHtml(item.brand ? `${item.brand} · ` : '')}${escapeHtml(item.status)}${margin}${roi}</p>
        <div class="inv-actions">
          ${
            item.status === 'stock'
              ? `<button type="button" class="btn-ghost inv-act" data-inv-act="listed" data-id="${escapeHtml(item.id)}">Mettre en ligne</button>`
              : ''
          }
          ${
            item.status === 'listed'
              ? `<button type="button" class="btn-ghost inv-act" data-inv-act="sold" data-id="${escapeHtml(item.id)}">Marquer vendu</button>`
              : ''
          }
          <button type="button" class="btn-ghost inv-act inv-act-danger" data-inv-act="delete" data-id="${escapeHtml(item.id)}">Suppr.</button>
        </div>
      </div>
      <span class="fav-count">${fmtEuro(item.buyPrice)}</span>
    `;
    els.invList.appendChild(li);
  }
}

async function addInventoryItem(title, buyPrice, brand) {
  const res = await api.post('/api/inventory', {
    title,
    buyPrice: Number(buyPrice) || 0,
    brand: brand || null,
    status: 'stock',
  });
  if (res.__status === 201 || res.__status === 200) {
    await loadInventory();
  }
}

async function exportInventoryJson() {
  const res = await api.get('/api/inventory');
  if (res.__status !== 200 || !res.data) return;
  const blob = new Blob([JSON.stringify(res.data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trackvint-inventory-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleInventoryAction(action, id) {
  if (!id) return;
  if (action === 'delete') {
    await api.delete(`/api/inventory/${id}`);
  } else if (action === 'listed') {
    await api.patch(`/api/inventory/${id}`, { status: 'listed' });
  } else if (action === 'sold') {
    const raw = window.prompt('Prix de vente (€) ?', '');
    if (raw == null) return;
    const sellPrice = Number(String(raw).replace(',', '.'));
    const patch = { status: 'sold' };
    if (!Number.isNaN(sellPrice) && sellPrice >= 0) patch.sellPrice = sellPrice;
    await api.patch(`/api/inventory/${id}`, patch);
  }
  await loadInventory();
}

els.invList?.addEventListener('click', (e) => {
  const btn = e.target instanceof HTMLElement ? e.target.closest('[data-inv-act]') : null;
  if (!btn) return;
  handleInventoryAction(btn.getAttribute('data-inv-act'), btn.getAttribute('data-id'));
});

els.btnLogin?.addEventListener('click', login);
els.btnLogout?.addEventListener('click', logout);
els.btnRetry?.addEventListener('click', loadStats);
els.btnUpgrade?.addEventListener('click', upgradePlan);
els.btnFavRefresh?.addEventListener('click', loadFavorites);
els.btnInvExport?.addEventListener('click', exportInventoryJson);
els.invStatusFilter?.addEventListener('change', () => {
  state.invStatus = els.invStatusFilter.value || 'all';
  loadInventory();
});

els.navBtns.forEach((btn) => {
  btn.addEventListener('click', () => setPage(btn.dataset.page));
});

els.formFolder?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = els.inputFolder?.value?.trim();
  if (!name) return;
  await createFolder(name);
  if (els.inputFolder) els.inputFolder.value = '';
});

els.formInv?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.inputInvTitle?.value?.trim();
  if (!title) return;
  await addInventoryItem(
    title,
    els.inputInvBuy?.value,
    els.inputInvBrand?.value?.trim(),
  );
  if (els.inputInvTitle) els.inputInvTitle.value = '';
  if (els.inputInvBuy) els.inputInvBuy.value = '';
  if (els.inputInvBrand) els.inputInvBrand.value = '';
});

els.formBrand?.addEventListener('submit', async (e) => {
  e.preventDefault();
  state.brandFilter = els.inputBrand?.value?.trim() || '';
  await loadStats();
});

$('#btn-brand-clear')?.addEventListener('click', async () => {
  state.brandFilter = '';
  if (els.inputBrand) els.inputBrand.value = '';
  await loadStats();
});

$('#btn-notice-dismiss')?.addEventListener('click', () => {
  const text = $('#notice-text')?.textContent || '';
  dismissNotice(text);
});

if (els.btnOpenApp) {
  const extId = globalThis.chrome?.runtime?.id || '';
  els.btnOpenApp.href = `${WEB_APP_URL}/app${extId ? `?ext=${encodeURIComponent(extId)}` : ''}`;
}

boot();
