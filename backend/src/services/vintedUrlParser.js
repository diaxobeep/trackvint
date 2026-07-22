/**
 * Parse une URL Vinted → type tracker (seller | search) + données.
 */

/**
 * @typedef {'seller' | 'search'} TrackerKind
 * @typedef {{
 *   kind: TrackerKind,
 *   domain: string,
 *   sourceUrl: string,
 *   vintedSellerId?: string,
 *   vintedUsername?: string,
 *   searchUrl?: string,
 *   label?: string,
 *   parsedFilters?: Record<string, string>,
 * }} ParsedVintedUrl
 */

/**
 * @param {string} raw
 * @returns {ParsedVintedUrl}
 */
export function parseVintedUrl(raw) {
  const input = String(raw || '').trim();
  if (!input) {
    const err = new Error('URL manquante');
    err.code = 'INVALID_URL';
    throw err;
  }

  let url;
  try {
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    const err = new Error('URL Vinted invalide');
    err.code = 'INVALID_URL';
    throw err;
  }

  const host = url.hostname.replace(/^www\./, '');
  if (!/(^|\.)vinted\./i.test(host)) {
    const err = new Error('Seules les URLs Vinted sont acceptées');
    err.code = 'INVALID_URL';
    throw err;
  }

  const domain = host;
  const path = url.pathname;

  // /member/123-login ou /member/123
  const member = path.match(/\/member\/(\d+)(?:-([^/?#]+))?/i);
  if (member) {
    return {
      kind: 'seller',
      domain,
      sourceUrl: url.toString(),
      vintedSellerId: member[1],
      vintedUsername: decodeURIComponent(member[2] || member[1]),
    };
  }

  // /catalog /catalog?...  ou recherche avec search_text
  const isCatalog =
    /\/catalog(\/|$)/i.test(path) ||
    url.searchParams.has('search_text') ||
    url.searchParams.has('brand_ids') ||
    url.searchParams.has('catalog');

  if (isCatalog || path === '/' || path === '') {
    /** @type {Record<string, string>} */
    const parsedFilters = {};
    url.searchParams.forEach((value, key) => {
      parsedFilters[key] = value;
    });

    const label =
      parsedFilters.search_text ||
      parsedFilters.brand_ids ||
      'Recherche Vinted';

    // Normalise search URL
    const searchUrl = url.toString();

    return {
      kind: 'search',
      domain,
      sourceUrl: searchUrl,
      searchUrl,
      label: String(label).slice(0, 120),
      parsedFilters,
    };
  }

  const err = new Error(
    'URL non reconnue. Colle un profil (/member/…) ou une recherche (/catalog/…).',
  );
  err.code = 'UNSUPPORTED_URL';
  throw err;
}
