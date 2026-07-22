/**
 * Configuration centrale de l'API TrackVint.
 *
 * Change `ENV` pour basculer local ↔ production.
 * Aucune URL ResellTrack ne doit rester en dur ailleurs.
 */

/** @typedef {'local' | 'production'} ApiEnv */

/** @type {ApiEnv} */
export const ENV = 'local';

const ENDPOINTS = {
  local: {
    // 127.0.0.1 évite certains blocages Chrome « private network » sur localhost
    apiBaseUrl: 'http://127.0.0.1:3000',
    cdnBaseUrl: 'http://127.0.0.1:3000',
    // Site Next.js (LP + dashboard)
    webAppUrl: 'http://127.0.0.1:3001',
  },
  production: {
    // Remplace par ton domaine prod
    apiBaseUrl: 'https://api.ton-domaine.com',
    cdnBaseUrl: 'https://cdn.ton-domaine.com',
    webAppUrl: 'https://ton-domaine.com',
  },
};

const selected = ENDPOINTS[ENV] ?? ENDPOINTS.local;

/** Base URL de l'API (sans slash final). */
export const API_BASE_URL = selected.apiBaseUrl.replace(/\/$/, '');

/** Base URL CDN / assets (sans slash final). */
export const CDN_BASE_URL = selected.cdnBaseUrl.replace(/\/$/, '');

/** Site web (LP + app) sans slash final. */
export const WEB_APP_URL = (selected.webAppUrl || API_BASE_URL).replace(/\/$/, '');

/** Clé de stockage du JWT (chrome.storage / localStorage). */
export const JWT_STORAGE_KEY = 'tv_jwt';

/** Clé de stockage du profil utilisateur associé au JWT. */
export const USER_STORAGE_KEY = 'tv_user';

/**
 * Construit une URL absolue vers l'API.
 * @param {string} path  ex: `/api/radar/seller-stats` ou `api/…`
 * @param {Record<string, string|number|undefined|null>} [query]
 */
export function apiUrl(path, query) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalized}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
}
