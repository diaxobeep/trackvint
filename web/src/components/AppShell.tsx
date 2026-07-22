'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  DashboardOverview,
  fetchOverview,
  pushJwtToExtension,
} from '@/lib/api';
import './app-shell.css';

const NAV = [
  { href: '/app', label: 'Dashboard', exact: true },
  { href: '/app/setup', label: 'Setup' },
  { href: '/app/tracker', label: 'Tracker' },
];

type Ctx = {
  data: DashboardOverview | null;
  err: string;
  refresh: () => Promise<void>;
  onLinkExt: () => Promise<void>;
  extStatus: string;
};

const DashboardCtx = createContext<Ctx | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardCtx);
  if (!ctx) throw new Error('useDashboard hors AppShell');
  return ctx;
}

export function euro(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
}

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [err, setErr] = useState('');
  const [extStatus, setExtStatus] = useState('Extension · —');
  const [folderQ, setFolderQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const ext = search.get('ext');
    if (ext) localStorage.setItem('tv_ext_id', ext);
  }, [search]);

  const refresh = useCallback(async () => {
    try {
      setErr('');
      if (!localStorage.getItem('tv_web_jwt')) {
        setData(null);
        setErr('Connecte-toi pour charger tes données Supabase.');
        return;
      }
      setData(await fetchOverview());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur chargement');
      setData(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const onLinkExt = useCallback(async () => {
    const token = localStorage.getItem('tv_web_jwt');
    if (!token) {
      router.push('/auth');
      return;
    }
    const linked = await pushJwtToExtension(token);
    setExtStatus(linked.ok ? 'Extension · liée ✓' : 'Extension · ID manquant (?ext=)');
  }, [router]);

  const folders = [
    ...(data?.folders || []).map((f) => ({
      key: f.id,
      label: f.name,
      count: f.itemCount || 0,
      warn: false,
    })),
    ...(data?.sellers || []).map((s) => ({
      key: s.id,
      label: `@${s.login}`,
      count: s.salesCount || 0,
      warn: !(s.salesCount || 0),
    })),
  ].filter((f) => f.label.toLowerCase().includes(folderQ.toLowerCase()));

  return (
    <DashboardCtx.Provider value={{ data, err, refresh, onLinkExt, extStatus }}>
      <div className={`app-shell ${menuOpen ? 'is-open' : ''}`}>
        <aside className="app-sidebar">
          <div className="app-logo">
            <span className="brand-mark">TV</span>
            TrackVint
          </div>
          <div className="nav-label">Plateforme</div>
          <nav className="app-nav">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="nav-label">Favoris</div>
          <input
            className="folder-search"
            placeholder="Rechercher un dossier"
            value={folderQ}
            onChange={(e) => setFolderQ(e.target.value)}
          />
          <div className="folder-list">
            {folders.map((f) => (
              <div key={f.key} className="folder">
                <span>
                  <i className={`dot ${f.warn ? 'warn' : ''}`} />
                  {f.label}
                </span>
                <em>{f.count}</em>
              </div>
            ))}
            {!folders.length ? (
              <p className="empty">Aucun favori — ajoute un tracker.</p>
            ) : null}
          </div>
          <div className="sidebar-foot">
            <div className="chip">{extStatus}</div>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-topbar">
            <div className="top-left">
              <button
                type="button"
                className="menu-btn"
                aria-label="Menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                ☰
              </button>
              <div className="crumb">{title}</div>
            </div>
            <div className="top-actions">
              <span className="chip">{(data?.plan || 'free').toUpperCase()}</span>
              <button type="button" className="btn btn-ghost" onClick={() => void onLinkExt()}>
                Lier extension
              </button>
              <Link href="/auth" className="btn btn-primary">
                Connexion
              </Link>
              <Link href="/pricing" className="btn btn-ghost">
                Upgrade
              </Link>
            </div>
          </header>
          <div className="app-content">
            {err ? <p className="err">{err}</p> : null}
            {children}
          </div>
        </div>
        {menuOpen ? (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
      </div>
    </DashboardCtx.Provider>
  );
}
