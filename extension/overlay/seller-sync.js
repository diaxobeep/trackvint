/**
 * Sync vendeur — mode léger (anti-429).
 *
 * ResellTrack scrape surtout côté serveur. Ici :
 * - ouverture panneau : DOM seul + cache API TrackVint (0 appel Vinted)
 * - bouton Tracker : 1 profil + 1 dressing max, puis ingest API
 */

import {
  fetchSellerItems,
  fetchSellerProfile,
} from '../vinted-item/network/vinted-client.js';
import { api } from '../shared/api/client.js';

/** @type {Map<string, number>} */
const lastLiveSyncAt = new Map();
const LIVE_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Sync douce à l’ouverture du panneau : DOM + API locale, pas de fetch Vinted.
 * @param {string} memberId
 * @param {{ track?: boolean, domain?: string }} [opts]
 */
export async function syncSellerLight(memberId, opts = {}) {
  const domain =
    opts.domain ||
    (typeof location !== 'undefined'
      ? location.hostname.replace(/^www\./, '')
      : 'vinted.fr');

  const seller = {
    vintedId: String(memberId),
    login: loginFromUrl() || `vendeur-${String(memberId).slice(-4)}`,
    domain,
    photoUrl: null,
    city: null,
    country: null,
  };

  const fromDom = scrapeSellerItemsFromDom(domain);
  const sales = fromDom.filter((i) => i.status === 'sold');
  const activeItems = fromDom.filter((i) => i.status !== 'sold');

  const res = await api.post(
    '/api/extension/sellers/track',
    {
      track: opts.track === true,
      seller,
      sales,
      activeItems,
    },
    { auth: false },
  );

  return {
    seller,
    sales,
    activeItems,
    api: res,
    tracked: Boolean(res.data?.tracked || opts.track),
    mode: 'light',
  };
}

/**
 * Sync live Vinted (rare) — uniquement sur action explicite Tracker.
 * @param {string} memberId
 * @param {{ track?: boolean, domain?: string, force?: boolean }} [opts]
 */
export async function syncSellerToApi(memberId, opts = {}) {
  const domain =
    opts.domain ||
    (typeof location !== 'undefined'
      ? location.hostname.replace(/^www\./, '')
      : 'vinted.fr');

  const key = String(memberId);
  const last = lastLiveSyncAt.get(key) || 0;
  if (!opts.force && Date.now() - last < LIVE_COOLDOWN_MS) {
    return syncSellerLight(memberId, opts);
  }

  const live = await collectSellerLiveData(memberId, domain);
  lastLiveSyncAt.set(key, Date.now());

  const res = await api.post(
    '/api/extension/sellers/track',
    {
      track: opts.track === true,
      seller: live.seller,
      sales: live.sales,
      activeItems: live.activeItems,
    },
    { auth: false },
  );

  return {
    ...live,
    api: res,
    tracked: Boolean(res.data?.tracked || opts.track),
    mode: 'live',
  };
}

/**
 * @param {string} memberId
 * @param {string} domain
 */
async function collectSellerLiveData(memberId, domain = 'vinted.fr') {
  const seller = {
    vintedId: String(memberId),
    login: loginFromUrl(),
    domain,
    photoUrl: null,
    city: null,
    country: null,
    feedbackCount: null,
    feedbackReputation: null,
    itemCount: null,
    givenItemCount: null,
  };

  /** @type {object[]} */
  let activeItems = [];
  /** @type {object[]} */
  let sales = scrapeSellerItemsFromDom(domain).filter((i) => i.status === 'sold');

  // 1 seul appel profil
  try {
    const profileRes = await fetchSellerProfile(memberId);
    const user = profileRes?.user || profileRes?.data?.user || profileRes;
    if (user && typeof user === 'object') {
      seller.login = user.login || user.username || seller.login;
      seller.photoUrl =
        user.photo?.url ||
        user.photo?.thumbnails?.[0]?.url ||
        user.avatar ||
        null;
      seller.city = user.city || null;
      seller.country = user.country_title || user.country || null;
      seller.feedbackCount = user.feedback_count ?? null;
      seller.feedbackReputation = user.feedback_reputation ?? null;
      seller.itemCount = user.item_count ?? null;
      seller.givenItemCount = user.given_item_count ?? null;
    }
  } catch (err) {

  }

  // 1 seul appel dressing actif (pas 3 endpoints « sold »)
  try {
    const itemsRes = await fetchSellerItems(memberId);
    const items =
      itemsRes?.items || itemsRes?.data?.items || itemsRes?.wardrobe || [];
    activeItems = normalizeVintedItems(items, { domain, status: 'active' });
  } catch (err) {

    activeItems = scrapeSellerItemsFromDom(domain).filter(
      (i) => i.status !== 'sold',
    );
  }

  if (!seller.login) {
    seller.login = `vendeur-${String(memberId).slice(-4)}`;
  }

  return { seller, sales, activeItems };
}

function loginFromUrl() {
  if (typeof location === 'undefined') return null;
  const m = location.pathname.match(/\/member\/\d+-([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * @param {any[]} items
 * @param {{ domain: string, status: string }} meta
 */
function normalizeVintedItems(items, meta) {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const vintedId = String(it.id ?? it.item_id ?? '');
      if (!vintedId) return null;
      const priceAmount =
        it.price_numeric ?? it.price?.amount ?? it.price ?? null;
      const euros =
        priceAmount != null ? Number(String(priceAmount).replace(',', '.')) : 0;
      const photos = [];
      if (it.photo?.url) photos.push(it.photo.url);
      if (Array.isArray(it.photos)) {
        for (const p of it.photos) {
          if (p?.url) photos.push(p.url);
        }
      }
      return {
        vintedId,
        title: it.title || `Article ${vintedId}`,
        brandName: it.brand_title || it.brand?.title || null,
        price: euros,
        priceIsEuros: true,
        domain: meta.domain,
        photos,
        favouriteCount: it.favourite_count ?? 0,
        state: 'VERY_GOOD',
        status: meta.status,
        soldAt: meta.status === 'sold' ? new Date().toISOString() : null,
        url: it.url || `https://www.${meta.domain}/items/${vintedId}`,
      };
    })
    .filter(Boolean);
}

/**
 * Scrape DOM uniquement — aucun réseau.
 * @param {string} domain
 */
export function scrapeSellerItemsFromDom(domain = 'vinted.fr') {
  if (typeof document === 'undefined') return [];
  const onSoldTab = /sold|vendu/i.test(
    `${location.pathname}${location.search}${location.hash}${document.title}`,
  );

  /** @type {Map<string, object>} */
  const map = new Map();
  for (const link of document.querySelectorAll('a[href*="/items/"]')) {
    const href = link.getAttribute('href') || '';
    const m = href.match(/\/items\/(\d+)/);
    if (!m) continue;
    const vintedId = m[1];
    if (map.has(vintedId)) continue;

    const card =
      link.closest('[data-testid*="item"]') ||
      link.closest('div[class*="item"]') ||
      link.parentElement;
    const text = (card?.textContent || link.textContent || '').replace(
      /\s+/g,
      ' ',
    );
    const title =
      card?.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() ||
      link.getAttribute('title') ||
      text.slice(0, 80) ||
      `Article ${vintedId}`;
    const priceMatch = text.match(/(\d+[.,]\d{2}|\d+)\s*€/);
    const euros = priceMatch ? Number(priceMatch[1].replace(',', '.')) : 0;
    const img =
      card?.querySelector('img')?.src || link.querySelector('img')?.src || null;
    const status = onSoldTab ? 'sold' : 'active';

    map.set(vintedId, {
      vintedId,
      title: title.slice(0, 200),
      brandName: null,
      price: euros,
      priceIsEuros: true,
      domain,
      photos: img ? [img] : [],
      favouriteCount: 0,
      state: 'VERY_GOOD',
      status,
      soldAt: status === 'sold' ? new Date().toISOString() : null,
      url: href.startsWith('http') ? href : `https://www.${domain}${href}`,
    });
  }
  return [...map.values()];
}
