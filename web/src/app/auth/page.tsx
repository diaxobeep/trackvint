import { Suspense } from 'react';
import AuthClient from './AuthClient';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#9bb0a0' }}>Chargement…</div>}>
      <AuthClient />
    </Suspense>
  );
}
