/**
 * Client API Vinted — utilise cookies stealth + queue + retry session.
 *
 * Endpoints ciblés :
 * - GET /api/v2/catalog/items?search_text=
 * - GET /api/v2/users/:id
 * - GET /api/v2/items/:id
 * - GET /api/v2/users/:id/items (bonus dressing)
 */

import {
  getSessionDomain,
  getSessionOrigin,
  getVintedSession,
  invalidateVintedSession,
} from './vintedSession.js';
import { vintedQueue } from './vintedQueue.js';
import { proxyManager } from './proxyManager.js';

export class VintedHttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {any} [body]
   */
  constructor(status, message, body) {
    super(message);
    this.name = 'VintedHttpError';
    this.status = status;
    this.body = body;
    this.isRateLimited = status === 429;
    this.isForbidden = status === 403;
    this.isChallenge = status === 403 || status === 401;
  }
}

/**
 * Recherche catalogue.
 * @param {string} searchText
 * @param {{ page?: number, perPage?: number }} [opts]
 */
export function searchCatalogItems(searchText, opts = {}) {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 24;
  const q = new URLSearchParams({
    search_text: String(searchText || ''),
    page: String(page),
    per_page: String(perPage),
    order: 'relevance',
  });
  return queuedVintedGet(`/api/v2/catalog/items?${q}`, 'catalog');
}

/**
 * Profil vendeur.
 * @param {string|number} userId
 */
export function fetchUserProfile(userId) {
  return queuedVintedGet(`/api/v2/users/${userId}`, `user:${userId}`);
}

/**
 * Détail article.
 * @param {string|number} itemId
 */
export function fetchItemDetails(itemId) {
  return queuedVintedGet(`/api/v2/items/${itemId}`, `item:${itemId}`);
}

/**
 * Dressing actif d'un vendeur.
 * @param {string|number} userId
 * @param {{ page?: number, perPage?: number }} [opts]
 */
export function fetchUserItems(userId, opts = {}) {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 96;
  const q = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    order: 'newest_first',
  });
  return queuedVintedGet(
    `/api/v2/users/${userId}/items?${q}`,
    `user-items:${userId}`,
  );
}

/**
 * GET JSON Vinted avec queue + retry session sur 403/429.
 * @param {string} path
 * @param {string} [label]
 * @param {{ retries?: number }} [opts]
 */
export function queuedVintedGet(path, label = path, opts = {}) {
  const retries = opts.retries ?? 2;
  return vintedQueue.enqueue(
    () => vintedGetWithRetry(path, retries),
    { label },
  );
}

/**
 * @param {string} path
 * @param {number} retriesLeft
 */
async function vintedGetWithRetry(path, retriesLeft) {
  try {
    return await vintedGet(path);
  } catch (err) {
    if (!(err instanceof VintedHttpError)) throw err;

    // 429 = vrai rate-limit → pause file
    if (err.isRateLimited) {
      vintedQueue.pause(60_000, '429');
      invalidateVintedSession();
      if (retriesLeft > 0) {
        await sleep(2_000);
        await getVintedSession({ force: true });
        return vintedGetWithRetry(path, retriesLeft - 1);
      }
      throw err;
    }

    // 401/403 = cookies manquants / challenge → refresh session, pas de longue pause
    if (err.isChallenge && retriesLeft > 0) {
      console.warn(
        `[vintedApi] ${err.status} sur ${path} — refresh cookies publics (${retriesLeft})`,
      );
      invalidateVintedSession();
      await getVintedSession({ force: true });
      await sleep(400 + Math.random() * 400);
      return vintedGetWithRetry(path, retriesLeft - 1);
    }

    throw err;
  }
}

/**
 * Fetch brut vers l'API Vinted avec cookies de session.
 * @param {string} pathOrUrl
 */
export async function vintedGet(pathOrUrl) {
  const session = await getVintedSession();
  const origin = getSessionOrigin();
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': session.acceptLanguage,
    'User-Agent': session.userAgent,
    Referer: `${origin}/`,
    Origin: origin,
    'Cache-Control': 'no-cache',
  };

  if (session.cookieHeader) {
    headers.Cookie = session.cookieHeader;
  }
  if (session.csrfToken) {
    headers['X-CSRF-Token'] = session.csrfToken;
  }
  if (session.anonId) {
    headers['X-Anon-Id'] = session.anonId;
  }

  // Proxy : Node 18+ fetch n'a pas de proxy natif simple.
  // On utilise undici ProxyAgent si dispo + proxy sur la session.
  const fetchImpl = await getFetchWithProxy(session.proxy);

  const res = await fetchImpl(url, {
    method: 'GET',
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text?.slice(0, 400) };
  }

  if (res.status === 429) {
    if (session.proxy) proxyManager.markBad(session.proxy, 10 * 60 * 1000);
    throw new VintedHttpError(429, 'vinted_rate_limited', body);
  }

  if (res.status === 403 || res.status === 401) {
    if (session.proxy) proxyManager.markBad(session.proxy, 15 * 60 * 1000);
    throw new VintedHttpError(res.status, 'vinted_forbidden_or_challenge', body);
  }

  if (!res.ok) {
    throw new VintedHttpError(res.status, `vinted_${res.status}`, body);
  }

  return body;
}

/**
 * @param {import('./proxyManager.js').ParsedProxy|null} proxy
 */
async function getFetchWithProxy(proxy) {
  if (!proxy) return fetch;

  try {
    const undici = await import('undici');
    const proxyUrl = proxyManager.toUrl(proxy);
    if (!proxyUrl) return fetch;
    const agent = new undici.ProxyAgent(proxyUrl);
    return (url, init = {}) =>
      undici.fetch(url, { ...init, dispatcher: agent });
  } catch {
    // undici non installé → fetch direct (proxy uniquement actif pour Puppeteer session)
    return fetch;
  }
}

/**
 * Santé du stack scraper.
 */
export async function getScraperStatus() {
  if (!proxyManager.loaded) await proxyManager.load();
  return {
    domain: getSessionDomain(),
    origin: getSessionOrigin(),
    mode: process.env.VINTED_STEALTH === '1' ? 'stealth' : 'public',
    proxies: proxyManager.pool.length,
    queue: vintedQueue.getState(),
  };
}

/**
 * Snapshot session (warm-up public éventuel).
 */
export async function peekSession() {
  try {
    const s = await getVintedSession({ force: false });
    return {
      mode: s.mode,
      hasCookies: Boolean(s.cookieHeader),
      cookieCount: s.cookies.length,
      expiresAt: s.expiresAt,
      proxy: s.proxy?.server || null,
    };
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
