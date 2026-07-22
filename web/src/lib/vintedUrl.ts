export type TrackerKind = 'seller' | 'search';

export type ParsedVintedUrl = {
  kind: TrackerKind;
  domain: string;
  sourceUrl: string;
  vintedSellerId?: string;
  vintedUsername?: string;
  searchUrl?: string;
  label?: string;
  parsedFilters?: Record<string, string>;
};

export function parseVintedUrl(raw: string): ParsedVintedUrl {
  const input = String(raw || '').trim();
  if (!input) {
    const err = new Error('URL manquante') as Error & { code?: string };
    err.code = 'INVALID_URL';
    throw err;
  }

  let url: URL;
  try {
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    const err = new Error('URL Vinted invalide') as Error & { code?: string };
    err.code = 'INVALID_URL';
    throw err;
  }

  const host = url.hostname.replace(/^www\./, '');
  if (!/(^|\.)vinted\./i.test(host)) {
    const err = new Error('Seules les URLs Vinted sont acceptées') as Error & {
      code?: string;
    };
    err.code = 'INVALID_URL';
    throw err;
  }

  const path = url.pathname;
  const member = path.match(/\/member\/(\d+)(?:-([^/?#]+))?/i);
  if (member) {
    return {
      kind: 'seller',
      domain: host,
      sourceUrl: url.toString(),
      vintedSellerId: member[1],
      vintedUsername: decodeURIComponent(member[2] || member[1]),
    };
  }

  const isCatalog =
    /\/catalog(\/|$)/i.test(path) ||
    url.searchParams.has('search_text') ||
    url.searchParams.has('brand_ids') ||
    url.searchParams.has('catalog');

  if (isCatalog || path === '/' || path === '') {
    const parsedFilters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      parsedFilters[key] = value;
    });
    const label =
      parsedFilters.search_text || parsedFilters.brand_ids || 'Recherche Vinted';
    return {
      kind: 'search',
      domain: host,
      sourceUrl: url.toString(),
      searchUrl: url.toString(),
      label: String(label).slice(0, 120),
      parsedFilters,
    };
  }

  const err = new Error(
    'URL non reconnue. Colle un profil (/member/…) ou une recherche (/catalog/…).',
  ) as Error & { code?: string };
  err.code = 'UNSUPPORTED_URL';
  throw err;
}
