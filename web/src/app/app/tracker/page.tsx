'use client';

import { Suspense } from 'react';
import { AppShell, euro, useDashboard } from '@/components/AppShell';

function TrackerBody() {
  const { data } = useDashboard();
  const sellers = data?.sellers || [];
  const trackers = data?.trackers || [];

  return (
    <>
      <h1 style={{ fontFamily: 'var(--display)', letterSpacing: '-0.04em', margin: '0 0 8px', color: '#141a16' }}>
        Tracker
      </h1>
      <p style={{ color: '#6b776f', marginBottom: 20, maxWidth: '52ch' }}>
        Vendeurs et niches suivis — alimentés par l’extension et le crawler serveur.
      </p>

      <section style={{ background: '#fff', border: '1px solid #e3e8e3', borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Vendeurs trackés</h3>
        {sellers.length ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {sellers.map((s) => (
              <li
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #eef1ee',
                  fontSize: 13,
                }}
              >
                <strong>@{s.login}</strong>
                <span style={{ color: '#6b776f' }}>
                  {s.salesCount || 0} ventes · {euro(data?.avgPrice)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#9aa59c', fontSize: 13, margin: 0 }}>
            Aucun vendeur. Sur Vinted, ouvre un profil → Tracker dans l’overlay.
          </p>
        )}
      </section>

      <section style={{ background: '#fff', border: '1px solid #e3e8e3', borderRadius: 16, padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Tous les trackers</h3>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {trackers.map((t) => (
            <li
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #eef1ee',
                fontSize: 13,
              }}
            >
              <strong>{t.name}</strong>
              <span style={{ color: '#6b776f' }}>{t.salesVolume ?? 0} ventes</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function TrackerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
      <AppShell title="Tracker">
        <TrackerBody />
      </AppShell>
    </Suspense>
  );
}
