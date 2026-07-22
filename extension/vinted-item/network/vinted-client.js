/**
 * Client HTTP Vinted « légitime ».
 *
 * Principes :
 * - credentials: 'include' → cookies de session du navigateur
 * - JAMAIS de User-Agent custom → le navigateur envoie le sien
 * - URLs relatives à location.origin quand on est sur Vinted (fr/be/de…)
 * - Headers proches d'une navigation réelle (Accept-Language = navigator)
 * - Passe par le rate-limiter + détection 429 / challenge
 */

import { extractAnonId, extractCsrfToken } from '../dom/auth-tokens.js';
import { classifyVintedResponse, VintedNetworkError } from './errors.js';
import { vintedLimiter } from './rate-limiter.js';

/** Événement UI : l'analyse est en pause. */
export const TV_VINTED_PAUSE_EVENT = 'tv:vinted-pause';

/**
 * @typedef {RequestInit & {
 *   priority?: import('./rate-limiter.js').RequestPriority,
 *   debounceKey?: string,
 *   debounceMs?: number,
 *   csrf?: boolean,
 *   parse?: 'json' | 'text' | 'blob' | 'raw',
 * }} VintedRequestOptions
 */

/**
 * Origine Vinted courante (ex: https://www.vinted.fr).
 * Fallback FR si hors page Vinted (ex: service worker via message).
 */
export function getVintedOrigin() {
  try {
    if (typeof location !== 'undefined' && /\.vinted\./i.test(location.hostname)) {
      return location.origin;
    }
  } catch {
    /* ignore */
  }
  return 'https://www.vinted.fr';
}

/**
 * Construit une URL absolue sur le domaine Vinted de l'utilisateur.
 * @param {string} pathOrUrl
 */
export function resolveVintedUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    // Réécrit www.vinted.fr → origin locale si même produit
    try {
      const u = new URL(pathOrUrl);
      if (/\.vinted\./i.test(u.hostname)) {
        const local = new URL(getVintedOrigin());
        u.protocol = local.protocol;
        u.hostname = local.hostname;
        return u.toString();
      }
    } catch {
      return pathOrUrl;
    }
    return pathOrUrl;
  }
  const base = getVintedOrigin();
  return new URL(pathOrUrl, base).toString();
}

/**
 * Headers « navigateur » — sans spoof UA.
 * @param {{ csrf?: boolean, json?: boolean, form?: boolean }} [opts]
 */
export function buildBrowserHeaders(opts = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: opts.json
      ? 'application/json, text/plain, */*'
      : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  // Langue réelle du navigateur
  if (typeof navigator !== 'undefined' && navigator.language) {
    headers['Accept-Language'] =
      navigator.languages?.join(',') || navigator.language;
  }

  // Ne PAS définir User-Agent / sec-ch-ua / Sec-Fetch-* :
  // Chrome les gère nativement selon le contexte (page vs extension).

  if (opts.csrf) {
    const csrf = extractCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
    const anonId = extractAnonId();
    if (anonId) headers['x-anon-id'] = anonId;
  }

  return headers;
}

/**
 * Fetch Vinted rate-limité + cookies session.
 * @param {string} pathOrUrl
 * @param {VintedRequestOptions} [options]
 */
export async function vintedFetch(pathOrUrl, options = {}) {
  const {
    priority = 'background',
    debounceKey,
    debounceMs,
    csrf = false,
    parse = 'raw',
    headers: extraHeaders,
    ...init
  } = options;

  const run = () => executeVintedFetch(pathOrUrl, {
    ...init,
    csrf,
    parse,
    headers: extraHeaders,
  });

  if (debounceKey) {
    return vintedLimiter.debounce(debounceKey, run, {
      waitMs: debounceMs,
      priority,
    });
  }

  return vintedLimiter.schedule(run, { priority });
}

/**
 * @param {string} pathOrUrl
 * @param {RequestInit & { csrf?: boolean, parse?: string, headers?: HeadersInit }} opts
 */
async function executeVintedFetch(pathOrUrl, opts) {
  const url = resolveVintedUrl(pathOrUrl);
  const method = (opts.method || 'GET').toUpperCase();
  const wantsJson =
    opts.parse === 'json' ||
    (typeof opts.headers === 'object' &&
      opts.headers &&
      String(/** @type {any} */ (opts.headers)['Accept'] || '').includes('json'));

  const baseHeaders = buildBrowserHeaders({
    csrf: Boolean(opts.csrf) || method !== 'GET',
    json: wantsJson || opts.parse === 'json',
    form: opts.body instanceof FormData,
  });

  /** @type {Record<string, string>} */
  const merged = { ...baseHeaders };
  if (opts.headers && typeof opts.headers === 'object' && !(opts.headers instanceof Headers)) {
    Object.assign(merged, opts.headers);
  }

  // FormData : laisser le navigateur poser le boundary (ne pas forcer Content-Type)
  if (opts.body instanceof FormData) {
    delete merged['Content-Type'];
  }

  const response = await fetch(url, {
    ...opts,
    method,
    headers: merged,
    // Cookies de session Vinted de l'utilisateur
    credentials: 'include',
    // Évite le cache agressif sur les endpoints API
    cache: opts.cache ?? (method === 'GET' ? 'no-cache' : 'no-store'),
  });

  // Lire le body une fois pour classification + parse
  const parseMode = opts.parse || 'raw';
  let bodyText = '';
  let bodyJson = null;
  let bodyBlob = null;

  if (parseMode === 'blob') {
    bodyBlob = await response.blob();
  } else if (parseMode === 'json') {
    bodyText = await response.text();
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      bodyJson = null;
    }
  } else if (parseMode === 'text') {
    bodyText = await response.text();
  } else {
    // raw : clone text pour analyse d'erreur si besoin
    bodyText = await response.text();
  }

  const problem = classifyVintedResponse(response, bodyText);
  if (problem) {
    handleTransportProblem(problem, bodyText);
    throw new VintedNetworkError(problem.code, {
      status: response.status,
      isRateLimited: problem.isRateLimited,
      isChallenge: problem.isChallenge,
      retryAfterMs: problem.retryAfterMs,
      bodySnippet: bodyText.slice(0, 240),
    });
  }

  if (parseMode === 'json') return bodyJson;
  if (parseMode === 'text' || parseMode === 'raw') return bodyText;
  if (parseMode === 'blob') return bodyBlob;
  return response;
}

/**
 * @param {{ isRateLimited: boolean, isChallenge: boolean, retryAfterMs?: number, code: string }} problem
 * @param {string} bodyText
 */
function handleTransportProblem(problem, bodyText) {
  const duration =
    problem.retryAfterMs ??
    (problem.isChallenge ? 120_000 : 60_000);

  const reason = problem.isChallenge
    ? 'security_challenge'
    : 'rate_limited';

  vintedLimiter.pause(duration, reason);

  const detail = {
    reason,
    code: problem.code,
    until: Date.now() + duration,
    message: problem.isChallenge
      ? 'Vinted demande une vérification de sécurité. Analyse en pause.'
      : 'Trop de requêtes Vinted (429). Analyse en pause temporairement.',
  };

  // Broadcast UI (overlay / page)
  try {
    window.dispatchEvent(
      new CustomEvent(TV_VINTED_PAUSE_EVENT, { detail }),
    );
  } catch {
    /* hors fenêtre */
  }

  // Message extension si dispo
  try {
    const api =
      globalThis.browser?.runtime?.id != null
        ? globalThis.browser
        : globalThis.chrome;
    api?.runtime?.sendMessage?.({
      type: 'TV_VINTED_PAUSED',
      ...detail,
    });
  } catch {
    /* ignore */
  }

}

/** Helpers métier */

export function fetchVintedJson(path, opts = {}) {
  return vintedFetch(path, {
    ...opts,
    parse: 'json',
    headers: {
      Accept: 'application/json, text/plain, */*',
      ...(opts.headers || {}),
    },
  });
}

export function fetchVintedHtml(path, opts = {}) {
  return vintedFetch(path, {
    ...opts,
    parse: 'text',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(opts.headers || {}),
    },
  });
}

/**
 * Profil vendeur — debounce + background (scraping auto).
 * @param {string} memberId
 */
export function fetchSellerProfile(memberId) {
  const origin = getVintedOrigin();
  return fetchVintedJson(`${origin}/api/v2/users/${memberId}`, {
    priority: 'background',
    debounceKey: `seller-profile:${memberId}`,
  });
}

/**
 * Articles d'un vendeur — debounce.
 * @param {string} memberId
 */
export function fetchSellerItems(memberId) {
  const origin = getVintedOrigin();
  const path = `${origin}/api/v2/users/${memberId}/items?page=1&per_page=20&order=newest_first`;
  return fetchVintedJson(path, {
    priority: 'background',
    debounceKey: `seller-items:${memberId}`,
  });
}

/**
 * Upload photo recherche visuelle — priorité interactive (geste user).
 * @param {FormData} formData
 */
export function uploadVintedPhoto(formData) {
  const origin = getVintedOrigin();
  return vintedFetch(`${origin}/api/v2/photos`, {
    method: 'POST',
    body: formData,
    csrf: true,
    priority: 'interactive',
    parse: 'json',
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });
}
