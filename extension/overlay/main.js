/**
 * Overlay TrackVint — sync vendeur Vinted + panneau type ResellTrack.
 */

import { ensureOverlayHost } from './inject-host.js';
import { createFab } from './fab.js';
import { createPanel } from './panel.js';
import { startFeedBadges } from './feed-badges.js';
import { createPauseToaster } from './pause-toast.js';
import { syncSellerLight, syncSellerToApi } from './seller-sync.js';
import { API_BASE_URL } from '../shared/config.js';
import { api } from '../shared/api/client.js';
import { TV_VINTED_PAUSE_EVENT } from '../vinted-item/network/vinted-client.js';
import { vintedLimiter } from '../vinted-item/network/rate-limiter.js';

const DEFAULT_FOLDER_ID = 'folder_niches';
const ICON_PLUS_FALLBACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;

const extensionApi =
  globalThis.browser?.runtime?.id != null
    ? globalThis.browser
    : globalThis.chrome;

export function bootOverlay() {
  if (window.__TV_OVERLAY_BOOTED__) return;
  window.__TV_OVERLAY_BOOTED__ = true;

  const { mount } = ensureOverlayHost();
  const toaster = createPauseToaster(mount);

  /** @type {ReturnType<typeof createFab> | null} */
  let fab = null;

  const panel = createPanel(mount, {
    onClose: () => fab?.setOpen(false),
    onLogin: () => openAuthPage(),
    onRefresh: (opts) => refreshPanelData(panel, toaster, opts),
    onFavoriteSeller: (seller) => toggleTrackSeller(seller, panel, toaster),
  });

  panel.el.addEventListener('click', (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.matches('[data-tv-retry]')) {
      refreshPanelData(panel, toaster);
    }
    if (t instanceof HTMLElement && t.matches('[data-tv-track-now]')) {
      const seller = panel.el.__tvData?.seller;
      toggleTrackSeller(seller, panel, toaster, true);
    }
  });

  fab = createFab(mount, {
    onToggle: async () => {
      panel.toggle();
      fab?.setOpen(panel.isOpen());
      if (panel.isOpen()) await refreshPanelData(panel, toaster);
    },
  });

  window.addEventListener(TV_VINTED_PAUSE_EVENT, (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail || {};
    toaster.show(detail);
  });

  vintedLimiter.subscribe((state) => {
    if (!state.paused) toaster.hide();
  });

  startFeedBadges({
    onSave: (itemId, btn) => {
      extensionApi?.runtime
        ?.sendMessage?.({
          type: 'SAVE_VINTED_ITEM',
          folderId: DEFAULT_FOLDER_ID,
          item: {
            vintedId: itemId,
            title: `Article ${itemId}`,
            url: `https://${location.hostname}/items/${itemId}`,
            domain: location.hostname.replace(/^www\./, ''),
          },
        })
        .then((res) => {
          if (!res || res.__status >= 400 || res.__error) {
            btn?.classList.remove('is-saved');
            if (btn) btn.innerHTML = ICON_PLUS_FALLBACK;
            toaster.show({ message: 'Impossible de sauvegarder l’article.' });
          }
        })
        .catch(() => {
          btn?.classList.remove('is-saved');
          toaster.show({ message: 'Impossible de sauvegarder l’article.' });
        });
    },
  });

  extensionApi?.runtime?.onMessage?.addListener((message, _s, sendResponse) => {
    if (
      message?.type === 'TOGGLE_RESELLTRACK_PANEL' ||
      message?.type === 'TOGGLE_TV_PANEL'
    ) {
      panel.toggle();
      fab?.setOpen(panel.isOpen());
      if (panel.isOpen()) refreshPanelData(panel, toaster);
      sendResponse?.({ ok: true });
      return true;
    }
    if (
      message?.type === 'AUTH_COMPLETE' ||
      message?.type === 'TV_SESSION_UPDATED'
    ) {
      if (panel.isOpen()) refreshPanelData(panel, toaster);
    }
    return false;
  });

  console.info(`[TrackVint] overlay ready → ${API_BASE_URL}`);
}

function openAuthPage() {
  const extId = extensionApi?.runtime?.id || '';
  const url = `${API_BASE_URL}/auth${extId ? `?ext=${encodeURIComponent(extId)}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function currentMemberId() {
  const m = location.pathname.match(/\/member\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * @param {ReturnType<typeof createPanel>} panel
 * @param {ReturnType<typeof createPauseToaster>} [toaster]
 * @param {{ days?: number, sortBy?: string }} [opts]
 */
async function refreshPanelData(panel, toaster, opts = {}) {
  const paused = vintedLimiter.isPaused();
  if (paused) {
    const pause = vintedLimiter.getPauseState();
    toaster?.show({
      message:
        pause.reason === 'security_challenge'
          ? 'Vinted demande une vérif. On affiche le cache TrackVint.'
          : 'Vinted rate-limit (429). Cache local + crawler serveur.',
      until: pause.until,
      reason: pause.reason || undefined,
    });
    // Ne bloque plus le panneau : on lit l’API TrackVint (données déjà trackées)
  }

  panel.showLoading();

  const ui = panel.getUiState?.() || {};
  const domain = location.hostname.replace(/^www\./, '');
  const memberId = currentMemberId();
  const itemMatch = location.pathname.match(/\/items\/(\d+)/);

  // Sync légère uniquement (DOM + cache API) — pas de rafale d’appels Vinted
  if (memberId && !paused) {
    try {
      await syncSellerLight(memberId, { track: false, domain });
    } catch (err) {
      console.warn('[TrackVint] light sync failed', err);
    }
  }

  const query = {
    domain,
    days: opts.days ?? ui.days ?? 30,
    sortBy: opts.sortBy ?? ui.sortBy ?? 'recent',
  };
  if (memberId) query.sellerId = memberId;
  if (itemMatch) query.itemId = itemMatch[1];

  // Hors profil : afficher le premier vendeur tracké s’il y en a
  if (!query.sellerId) {
    const tracked = await api.get('/api/extension/sellers/tracked', {}, { auth: false });
    const first = tracked.data?.sellers?.[0];
    if (first?.vintedId) query.sellerId = first.vintedId;
  }

  const res = await api.get('/api/stats', query, { auth: false });

  if (res.__status === 0) {
    panel.showError('Impossible de contacter le serveur');
    return;
  }
  if (res.__status !== 200 || !res.data) {
    panel.showError(res.__error || `Erreur ${res.__status}`);
    return;
  }

  panel.render({
    ...res.data,
    title: res.data.title || 'Radar',
    pageMemberId: memberId,
  });
}

/**
 * Ajoute / retire le tracking (favori) + sync ventes.
 * @param {object|undefined} seller
 * @param {ReturnType<typeof createPanel>} panel
 * @param {ReturnType<typeof createPauseToaster>} toaster
 * @param {boolean} [forceTrack]
 */
async function toggleTrackSeller(seller, panel, toaster, forceTrack = false) {
  const memberId = seller?.vintedId || currentMemberId();
  if (!memberId) {
    toaster?.show({ message: 'Ouvre un profil vendeur Vinted (/member/…).' });
    return;
  }

  const domain = location.hostname.replace(/^www\./, '');
  const already = Boolean(seller?.isFavorite || seller?.tracked);

  if (already && !forceTrack) {
    const res = await api.delete(
      '/api/extension/sellers/favorite',
      { vintedId: memberId },
      { auth: false },
    );
    if (res.__status >= 400 && res.__status !== 0) {
      toaster?.show({ message: res.__error || 'Retrait favori impossible.' });
      return;
    }
    toaster?.show({ message: 'Vendeur retiré des favoris.' });
    await refreshPanelData(panel, toaster);
    return;
  }

  try {
    // Live Vinted seulement si pas en pause 429 — sinon DOM + crawler serveur
    const sync = vintedLimiter.isPaused()
      ? await syncSellerLight(memberId, { track: true, domain })
      : await syncSellerToApi(memberId, { track: true, domain, force: true });
    const sales = sync.sales?.length || 0;
    const active = sync.activeItems?.length || 0;
    toaster?.show({
      message: `Vendeur tracké · ${sales} vente(s) connues, ${active} en ligne. Le serveur continue de scrapper.`,
    });
  } catch (err) {
    console.warn('[TrackVint] track failed', err);
    toaster?.show({ message: 'Tracking impossible (API / Vinted).' });
  }
  await refreshPanelData(panel, toaster);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootOverlay, { once: true });
} else {
  bootOverlay();
}
