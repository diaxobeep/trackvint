'use client';

import { Suspense } from 'react';
import { AppShell, euro, useDashboard } from '@/components/AppShell';
import './dashboard.css';

function DashboardBody() {
  const { data } = useDashboard();
  const p = data?.progress;
  const trackers = data?.trackers || [];

  return (
    <>
      <h1 className="dash-title">Dashboard</h1>
      <p className="dash-lead">
        Suivez vos performances : trackers, marques et produits — synchronisés avec
        l’extension. Le serveur analyse les ventes en arrière-plan.
      </p>
      <div className="banner">
        <span>Serveur crawler : détection des ventes des vendeurs / articles trackés.</span>
        <strong>{data?.crawler?.enabled ? 'ACTIF' : '…'}</strong>
      </div>

      <div className="cards">
        <section className="card">
          <h3>Progression</h3>
          <div className="progress-row">
            <div className="ring" style={{ ['--p' as string]: String(p?.percent || 0) }}>
              <div className="ring-inner">{p?.percent || 0}%</div>
            </div>
            <div className="bars">
              <div>
                <div className="bar-label">
                  <span>Catalogue</span>
                  <span>
                    {p?.catalog?.current || 0}/{p?.catalog?.target || 0}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        ((p?.catalog?.current || 0) / Math.max(1, p?.catalog?.target || 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="bar-label">
                  <span>Profils</span>
                  <span>
                    {p?.profile?.current || 0}/{p?.profile?.target || 0}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        ((p?.profile?.current || 0) / Math.max(1, p?.profile?.target || 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="card">
          <h3>Catégorie la plus vendue</h3>
          <div className="hero-metric">{data?.topCategory?.name || 'Aucun tracker'}</div>
          <p className="sub">
            {data?.topCategory
              ? `Vitesse moy. ${data.topCategory.avgSaleSpeedDays} j · ${data.topCategory.weekLabel || ''}`
              : 'Tracke un vendeur depuis l’extension'}
          </p>
        </section>
        <section className="card">
          <h3>Vitesse de vente moy.</h3>
          <div className="hero-metric">
            {data?.avgSaleSpeedDays != null ? `${data.avgSaleSpeedDays}j` : '—'}
          </div>
          <p className="sub">Basée sur le volume tracké</p>
        </section>
      </div>

      <section className="card section">
        <div className="section-head">
          <h2>Performances clés</h2>
          <p>Top trackers (même data que l’extension).</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nom du tracker</th>
              <th>Volume</th>
              <th>Prix moyen</th>
              <th>Vitesse</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {trackers.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.name}</strong>
                </td>
                <td>{t.salesVolume ?? 0}</td>
                <td>{euro(t.avgPrice)}</td>
                <td>{t.saleSpeedDays != null ? `${t.saleSpeedDays} j` : '—'}</td>
                <td>
                  <span className="status">
                    <i className={`dot ${t.status === 'ok' ? '' : 'warn'}`} />
                    {t.status === 'ok' ? 'OK' : 'En cours'}
                  </span>
                </td>
              </tr>
            ))}
            {!trackers.length ? (
              <tr>
                <td colSpan={5} style={{ color: '#6b776f' }}>
                  Aucun tracker — ajoute un favori vendeur dans l’extension.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="charts">
        <section className="card">
          <h3>Répartition CA / tracker</h3>
          <div className="chart-box">
            {trackers.slice(0, 5).map((t) => `${t.name} · ${t.salesVolume || 0}`).join(' · ') ||
              'Pas encore de CA tracké'}
          </div>
        </section>
        <section className="card">
          <h3>Ventes par tracker</h3>
          <div className="chart-box">
            {data?.soldCount || 0} ventes · avg {euro(data?.avgPrice)}
          </div>
        </section>
      </div>
    </>
  );
}

export default function AppDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
      <AppShell title="Dashboard">
        <DashboardBody />
      </AppShell>
    </Suspense>
  );
}
