'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';

function SetupBody() {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--display)', letterSpacing: '-0.04em', margin: '0 0 8px', color: '#141a16' }}>
        Setup
      </h1>
      <p style={{ color: '#6b776f', marginBottom: 20, maxWidth: '52ch' }}>
        Configure le lien extension ↔ web et ton API crawler.
      </p>
      <ol style={{ color: '#3f5f20', lineHeight: 1.8, paddingLeft: 18, marginBottom: 20 }}>
        <li>Charge l’extension Chrome (mode développeur → dossier <code>extension/</code>).</li>
        <li>Ouvre le popup → connecte-toi avec ton compte Supabase.</li>
        <li>Sur le web, clique <strong>Lier extension</strong> (URL avec <code>?ext=ID</code>).</li>
        <li>Optionnel : lance le crawler Express sur Railway / local.</li>
      </ol>
      <div style={{ background: '#fff', border: '1px solid #e3e8e3', borderRadius: 16, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Variables prod</h3>
        <p style={{ margin: 0, color: '#6b776f', fontSize: 13, lineHeight: 1.5 }}>
          Sur Vercel : Supabase + Stripe. Sur Railway : <code>TRACKVINT_API_URL</code> pointe vers ton crawler.
        </p>
      </div>
    </>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
      <AppShell title="Setup">
        <SetupBody />
      </AppShell>
    </Suspense>
  );
}
