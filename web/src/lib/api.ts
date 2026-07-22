import { apiBaseUrl } from './env';

export type DashboardOverview = {
  ok: boolean;
  plan?: string;
  progress?: {
    percent: number;
    catalog?: { current: number; target: number };
    profile?: { current: number; target: number };
  };
  topCategory?: { name: string; avgSaleSpeedDays: number; weekLabel?: string } | null;
  avgSaleSpeedDays?: number | null;
  avgPrice?: number | null;
  soldCount?: number;
  trackers?: Array<{
    id: string;
    name: string;
    salesVolume?: number;
    avgPrice?: number | null;
    saleSpeedDays?: number | null;
    status?: string;
  }>;
  folders?: Array<{ id: string; name: string; itemCount?: number }>;
  sellers?: Array<{
    id: string;
    login: string;
    salesCount?: number;
    photoUrl?: string;
    vintedId?: string;
  }>;
  crawler?: { enabled: boolean };
  user?: { name?: string; email?: string };
};

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tv_web_jwt') || '';
}

/** Toujours same-origin côté client. */
function base() {
  return apiBaseUrl();
}

async function apiFetch(path: string, init?: RequestInit) {
  const url = `${base()}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (err) {
    // Network / Failed to fetch → erreur lisible
    const msg =
      err instanceof Error && /fetch/i.test(err.message)
        ? 'Impossible de joindre le serveur. Recharge la page.'
        : err instanceof Error
          ? err.message
          : 'Erreur réseau';
    throw new Error(msg);
  }
}

export async function loginAccount(email: string, password: string) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Identifiants invalides');
  }
  localStorage.setItem('tv_web_jwt', data.token);
  return data as { token: string; user: { name: string; email: string } };
}

/** @deprecated utiliser loginAccount */
export async function loginDemo() {
  return loginAccount('demo@trackvint.local', 'demo');
}

export async function registerAccount(input: {
  email: string;
  password: string;
  fullName?: string;
}) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Inscription impossible');
  if (data.token) localStorage.setItem('tv_web_jwt', data.token);
  if (data.session?.access_token) {
    localStorage.setItem('tv_web_jwt', data.session.access_token);
  }
  return data;
}

export async function fetchOverview(): Promise<DashboardOverview> {
  try {
    const res = await apiFetch('/api/dashboard/overview');
    if (res.ok) return res.json();
  } catch {
    /* fallback agrégé */
  }

  const [trackersRes, salesRes] = await Promise.all([
    apiFetch('/api/trackers'),
    apiFetch('/api/trackers/sales'),
  ]);
  const trackers = trackersRes.ok ? await trackersRes.json() : { sellers: [], searches: [] };
  const sales = salesRes.ok ? await salesRes.json() : { sales: [] };
  const sellerList = trackers.sellers || [];
  const searchList = trackers.searches || [];
  const saleList = sales.sales || [];

  return {
    ok: true,
    plan: 'free',
    progress: {
      percent: Math.min(100, (sellerList.length + searchList.length) * 15),
      catalog: { current: searchList.length, target: 10 },
      profile: { current: sellerList.length, target: 5 },
    },
    topCategory: saleList[0]
      ? {
          name: saleList[0].brand || 'Niche',
          avgSaleSpeedDays: Number(
            ((saleList[0].saleSpeedHours || 24) / 24).toFixed(2),
          ),
          weekLabel: 'cette semaine',
        }
      : null,
    avgSaleSpeedDays: saleList.length
      ? Number(
          (
            saleList.reduce(
              (a: number, s: { saleSpeedHours?: number }) =>
                a + (s.saleSpeedHours || 24) / 24,
              0,
            ) / saleList.length
          ).toFixed(2),
        )
      : null,
    avgPrice: saleList.length
      ? Number(
          (
            saleList.reduce(
              (a: number, s: { priceCents?: number }) => a + (s.priceCents || 0) / 100,
              0,
            ) / saleList.length
          ).toFixed(2),
        )
      : null,
    soldCount: saleList.length,
    trackers: [
      ...sellerList.map((s: { id: string; vintedUsername?: string; vinted_username?: string }) => ({
        id: s.id,
        name: s.vintedUsername || s.vinted_username || 'Vendeur',
        salesVolume: saleList.filter(
          (x: { sellerLogin?: string; seller_login?: string }) =>
            (x.sellerLogin || x.seller_login) ===
            (s.vintedUsername || s.vinted_username),
        ).length,
        status: 'ok',
      })),
      ...searchList.map((s: { id: string; label?: string }) => ({
        id: s.id,
        name: s.label || 'Recherche',
        salesVolume: 0,
        status: 'ok',
      })),
    ],
    sellers: sellerList.map(
      (s: {
        id: string;
        vintedUsername?: string;
        vinted_username?: string;
        photoUrl?: string;
        photo_url?: string;
        vintedSellerId?: string;
        vinted_seller_id?: string;
      }) => ({
        id: s.id,
        login: s.vintedUsername || s.vinted_username || '',
        photoUrl: s.photoUrl || s.photo_url,
        vintedId: s.vintedSellerId || s.vinted_seller_id,
        salesCount: saleList.filter(
          (x: { sellerLogin?: string; seller_login?: string }) =>
            (x.sellerLogin || x.seller_login) ===
            (s.vintedUsername || s.vinted_username),
        ).length,
      }),
    ),
    folders: searchList.map((s: { id: string; label?: string }) => ({
      id: s.id,
      name: s.label || 'Recherche',
      itemCount: 0,
    })),
    crawler: { enabled: true },
  };
}

export async function addTracker(url: string) {
  const res = await apiFetch('/api/trackers/add', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Impossible d’ajouter le tracker');
  return data;
}

export async function fetchSales(limit = 40) {
  const res = await apiFetch(`/api/trackers/sales?limit=${limit}`);
  if (!res.ok) throw new Error('Sales indisponibles');
  return res.json();
}

export async function fetchNiches() {
  const res = await apiFetch('/api/trackers/niches');
  if (!res.ok) throw new Error('Niches indisponibles');
  return res.json();
}

export async function fetchSellerDetail(vintedId: string) {
  const res = await apiFetch(`/api/trackers/sellers/${encodeURIComponent(vintedId)}`);
  if (!res.ok) throw new Error('Vendeur introuvable');
  return res.json();
}

export async function pushJwtToExtension(jwt: string) {
  const extId =
    localStorage.getItem('tv_ext_id') ||
    new URLSearchParams(window.location.search).get('ext');
  if (!extId) return { ok: false as const, reason: 'no-ext' };
  localStorage.setItem('tv_ext_id', extId);
  try {
    // @ts-expect-error chrome may be undefined
    await chrome?.runtime?.sendMessage?.(extId, { type: 'SET_JWT', token: jwt });
    return { ok: true as const };
  } catch {
    window.postMessage(
      { source: 'trackvint-web', type: 'SET_JWT', token: jwt, extId },
      '*',
    );
    return { ok: true as const, via: 'postMessage' };
  }
}
