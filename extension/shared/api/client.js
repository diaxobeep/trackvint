/**
 * Client HTTP vers l'API TrackVint.
 * Depuis popup / content scripts : proxy via service worker (host_permissions).
 * Dans le SW : fetch direct.
 */

import { API_BASE_URL, apiUrl } from '../config.js';
import {
  clearSession,
  getAccessToken,
  getAuthHeaders,
  getStoredUser,
  setSession,
} from '../auth/session.js';

/**
 * @typedef {object} ApiResult
 * @property {number} __status
 * @property {any} [data]
 * @property {string} [__error]
 */

function isServiceWorkerContext() {
  try {
    return (
      typeof ServiceWorkerGlobalScope !== 'undefined' &&
      typeof self !== 'undefined' &&
      // eslint-disable-next-line no-undef
      self instanceof ServiceWorkerGlobalScope
    );
  } catch {
    return false;
  }
}

function getExtensionRuntime() {
  if (globalThis.chrome?.runtime?.id) return globalThis.chrome;
  if (globalThis.browser?.runtime?.id) return globalThis.browser;
  return null;
}

/**
 * Fetch direct (utilisé par le service worker).
 * @param {string} path
 * @param {RequestInit & { query?: Record<string, string|number|undefined|null>, auth?: boolean }} [options]
 * @returns {Promise<ApiResult>}
 */
export async function directApiRequest(path, options = {}) {
  const { query, auth = true, headers: extraHeaders, ...init } = options;
  const url = apiUrl(path, query);

  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
    ...(extraHeaders && typeof extraHeaders === 'object'
      ? /** @type {Record<string, string>} */ (extraHeaders)
      : {}),
  };

  if (auth) {
    Object.assign(headers, await getAuthHeaders());
  }

  if (init.body && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'omit',
    });

    if (response.status === 401) {
      await clearSession();
      return { __status: 401, __error: 'unauthenticated' };
    }

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text();

    if (!response.ok) {
      return {
        __status: response.status,
        __error:
          (data && typeof data === 'object' && data.error) ||
          `Erreur ${response.status}`,
        data,
      };
    }

    return { __status: response.status, data };
  } catch (error) {
    return {
      __status: 0,
      __error:
        error instanceof Error ? error.message : 'errors.backendUnreachable',
    };
  }
}

/**
 * @param {string} path
 * @param {RequestInit & { query?: Record<string, string|number|undefined|null>, auth?: boolean }} [options]
 * @returns {Promise<ApiResult>}
 */
export async function apiRequest(path, options = {}) {
  const runtime = getExtensionRuntime();
  if (runtime && !isServiceWorkerContext()) {
    try {
      const result = await runtime.runtime.sendMessage({
        type: 'TV_API_REQUEST',
        path,
        options: {
          method: options.method || 'GET',
          query: options.query,
          auth: options.auth !== false,
          body: options.body,
          headers: options.headers,
        },
      });
      if (result && typeof result === 'object' && '__status' in result) {
        return /** @type {ApiResult} */ (result);
      }
      return {
        __status: 0,
        __error: result?.__error || 'service_worker_no_response',
      };
    } catch (error) {
      // Fallback fetch direct si le SW ne répond pas

    }
  }

  return directApiRequest(path, options);
}

export const api = {
  get: (path, query, opts) =>
    apiRequest(path, { ...opts, method: 'GET', query }),

  post: (path, body, opts) =>
    apiRequest(path, {
      ...opts,
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  patch: (path, body, opts) =>
    apiRequest(path, {
      ...opts,
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  delete: (path, query, opts) =>
    apiRequest(path, { ...opts, method: 'DELETE', query }),
};

/**
 * Login email/password → stocke le JWT.
 * @param {{ email: string, password: string }} credentials
 */
export async function loginWithPassword(credentials) {
  const result = await api.post('/api/auth/login', credentials, { auth: false });
  if (result.__status !== 200 || !result.data?.token) {
    throw new Error(result.__error || 'login_failed');
  }

  await setSession(result.data.token, result.data.user);
  return result.data;
}

/**
 * Vérifie le JWT auprès de /api/auth/get-session.
 * @returns {Promise<{ user: object, fetchedAt: number }|null>}
 */
export async function fetchSession() {
  const token = await getAccessToken();
  if (!token) return null;

  const result = await api.get('/api/auth/get-session');
  if (result.__status !== 200 || !result.data?.user) {
    await clearSession();
    return null;
  }

  await setSession(token, result.data.user);
  return { user: result.data.user, fetchedAt: Date.now() };
}

/**
 * Session locale sans round-trip (UI rapide).
 */
export async function getCachedSession() {
  const [token, user] = await Promise.all([getAccessToken(), getStoredUser()]);
  if (!token || !user) return null;
  return { user, fetchedAt: Date.now() };
}

/**
 * Déconnexion locale + appel API (best-effort).
 */
export async function signOut() {
  try {
    await api.post('/api/auth/sign-out', {});
  } catch {
    /* ignore */
  }
  await clearSession();
}

/**
 * Relais compatible avec l'ancien message `GET_RADAR_ANALYSIS`.
 * @param {string} urlOrPath
 */
export async function getRadarAnalysis(urlOrPath) {
  let path = urlOrPath;
  try {
    if (/^https?:\/\//i.test(urlOrPath)) {
      const u = new URL(urlOrPath);
      path = `${u.pathname}${u.search}`;
    }
  } catch {
    /* keep path */
  }

  path = path
    .replace(/^https?:\/\/app\.reselltrack\.fr/i, '')
    .replace(/^https?:\/\/cdn\.reselltrack\.io/i, '');

  return api.get(path);
}

export { API_BASE_URL, apiUrl };
