import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { fetchUserSales, mapSale } from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Number(searchParams.get('limit') || 40));
    const rows = await fetchUserSales(userId, limit);
    return corsJson({ ok: true, sales: rows.map(mapSale) });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
