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

async function apiFetch(path: string, init?: RequestInit) {
  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
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
  } catch {
    throw new Error('Impossible de joindre le serveur. Recharge la page.');
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
  const res = await apiFetch('/api/dashboard/overview');
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new Error('Connecte-toi pour voir ton dashboard');
  }
  if (!res.ok) throw new Error(data.error || 'Overview indisponible');
  return data;
}

export async function addTracker(url: string, categoryId?: string) {
  const res = await apiFetch('/api/trackers/add', {
    method: 'POST',
    body: JSON.stringify({ url, categoryId: categoryId || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Impossible d’ajouter le tracker');
  return data;
}

export async function fetchCategories() {
  const res = await apiFetch('/api/categories');
  if (res.status === 401) throw new Error('Authentification requise');
  if (!res.ok) throw new Error('Catégories indisponibles');
  return res.json();
}

export async function fetchSales(limit = 40) {
  const res = await apiFetch(`/api/trackers/sales?limit=${limit}`);
  if (res.status === 401) throw new Error('Authentification requise');
  if (!res.ok) throw new Error('Sales indisponibles');
  return res.json();
}

export async function fetchNiches() {
  const res = await apiFetch('/api/trackers/niches');
  if (res.status === 401) throw new Error('Authentification requise');
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
