import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import {
  fetchUserCategories,
  fetchUserTrackers,
} from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const [{ sellers, searches, all }, categories] = await Promise.all([
      fetchUserTrackers(userId),
      fetchUserCategories(userId),
    ]);
    return corsJson({
      ok: true,
      categories,
      trackers: all,
      sellers,
      searches,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
