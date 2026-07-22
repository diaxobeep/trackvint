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
  }>;
  crawler?: { enabled: boolean };
  user?: { name?: string; email?: string };
};

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tv_web_jwt') || '';
}

export async function loginDemo() {
  const res = await fetch(`${apiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@trackvint.local',
      password: 'demo',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.error || 'Login impossible');
  localStorage.setItem('tv_web_jwt', data.token);
  return data as { token: string; user: { name: string; email: string } };
}

export async function fetchOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${apiBaseUrl()}/api/dashboard/overview`, {
    headers: {
      Accept: 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Dashboard indisponible');
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
