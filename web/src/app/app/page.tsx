'use client';

import { Suspense, useState } from 'react';
import { AppShell, euro, useDashboard } from '@/components/AppShell';
import { AddTrackerModal } from '@/components/AddTrackerModal';
import { SalesFeed } from '@/components/SalesFeed';
import { NichePerformance } from '@/components/NichePerformance';
import { SellerDetailView } from '@/components/SellerDetailView';
import './dashboard.css';

function DashboardBody() {
  const { data, refresh } = useDashboard();
  const [openAdd, setOpenAdd] = useState(false);
  const [tab, setTab] = useState<'overview' | 'sales' | 'niches' | 'seller'>('overview');
  const p = data?.progress;
  const trackers = data?.trackers || [];
  const firstSellerId = data?.sellers?.[0]?.vintedId || '';

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-lead">
            Trackers vendeurs + niches, ventes live, mêmes données que l’extension.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-[#92ef4a] px-4 py-2.5 text-sm font-bold text-[#0b1702] shadow-sm"
          onClick={() => setOpenAdd(true)}
        >
          + Ajouter un tracker
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['overview', 'Vue d’ensemble'],
            ['sales', 'Sales Feed'],
            ['niches', 'Niches'],
            ['seller', 'Fiche vendeur'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              tab === id ? 'bg-[#92ef4a] text-[#0b1702]' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <>
          <div className="banner">
            <span>Crawler serveur + extension → une seule API /api/trackers/add</span>
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
                      <span>Niches</span>
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
                            ((p?.catalog?.current || 0) /
                              Math.max(1, p?.catalog?.target || 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="bar-label">
                      <span>Vendeurs</span>
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
                            ((p?.profile?.current || 0) /
                              Math.max(1, p?.profile?.target || 1)) *
                              100,
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
                  ? `Vitesse moy. ${data.topCategory.avgSaleSpeedDays} j`
                  : 'Ajoute un tracker URL'}
              </p>
            </section>
            <section className="card">
              <h3>Vitesse de vente moy.</h3>
              <div className="hero-metric">
                {data?.avgSaleSpeedDays != null ? `${data.avgSaleSpeedDays}j` : '—'}
              </div>
              <p className="sub">avg {euro(data?.avgPrice)}</p>
            </section>
          </div>

          <section className="card section">
            <div className="section-head">
              <h2>Performances clés</h2>
              <p>Top trackers (vendeurs + recherches).</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
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
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'sales' ? <SalesFeed /> : null}
      {tab === 'niches' ? <NichePerformance /> : null}
      {tab === 'seller' ? (
        firstSellerId ? (
          <SellerDetailView vintedId={String(firstSellerId)} />
        ) : (
          <p className="text-sm text-slate-500">
            Aucun vendeur tracké — ajoute une URL /member/… pour afficher la fiche.
          </p>
        )
      ) : null}

      <AddTrackerModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onAdded={() => void refresh()}
      />
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
