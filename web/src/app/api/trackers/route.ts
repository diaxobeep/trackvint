import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { fetchUserTrackers } from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { sellers, searches } = await fetchUserTrackers(userId);
    return corsJson({ ok: true, sellers, searches });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
